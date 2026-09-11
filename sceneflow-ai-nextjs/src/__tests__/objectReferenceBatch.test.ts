import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/gemini/geminiStudioImageClient', () => ({
  generateImageWithGeminiStudio: vi.fn(async () => ({
    imageBase64: 'aGVsbG8=',
    mimeType: 'image/png',
  })),
}))

vi.mock('@/lib/storage/referenceLibraryStorage', () => ({
  uploadReferenceLibraryBase64Image: vi.fn(async () => 'https://cdn.test/prop.png'),
}))

vi.mock('@/lib/credits/creditCosts', () => ({
  getCreditCost: () => 12,
  IMAGE_CREDITS: { CHARACTER_IDENTITY_WITH_ENHANCE: 24 },
}))

vi.mock('@/services/CreditService', () => ({
  CreditService: { charge: vi.fn(async () => undefined) },
}))

vi.mock('@/i18n/server/requestLocale', () => ({
  englishForModel: async (text: string) => text,
}))

import { generateImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { generateObjectReferenceImage } from '@/lib/vision/referenceExpress/generateReferenceImage'
import { CreditService } from '@/services/CreditService'
import {
  OBJECT_BATCH_CONCURRENCY,
  runObjectBatch,
} from '@/lib/vision/objectBatchGeneration'

const mockGenerateImage = vi.mocked(generateImageWithGeminiStudio)

beforeEach(() => {
  vi.clearAllMocks()
  mockGenerateImage.mockResolvedValue({ imageBase64: 'aGVsbG8=', mimeType: 'image/png' })
})

describe('object reference images generate on the flash tier', () => {
  const input = {
    userId: 'user-1',
    name: "Gideon's pocket watch",
    prompt: 'A tarnished silver pocket watch, chain looped',
    locale: { storyLocale: 'en', properNouns: [] as string[] },
  }

  it('asks for eco rather than leaving Vertex on its designer default', async () => {
    await generateObjectReferenceImage(input)

    expect(mockGenerateImage).toHaveBeenCalledOnce()
    expect(mockGenerateImage.mock.calls[0]![0]).toMatchObject({ modelTier: 'eco' })
  })

  it('keeps the 2K size, which is the eco tier ceiling', async () => {
    await generateObjectReferenceImage(input)

    expect(mockGenerateImage.mock.calls[0]![0]!.imageSize).toBe('2K')
  })

  it('charges ai_usage rather than the IMAGE_GENERATION cost key as a ledger reason', async () => {
    await generateObjectReferenceImage(input)

    expect(CreditService.charge).toHaveBeenCalledWith(
      'user-1',
      12,
      'ai_usage',
      null,
      expect.objectContaining({
        provider: 'gemini',
        category: 'images',
        operation: "Object reference: Gideon's pocket watch",
      })
    )
  })

  it('still runs on eco when the user attached a photo of the real object', async () => {
    // `escalateEcoRefusalToPro` covers a flash refusal on a referenced frame,
    // so there is no reason for this path to pre-emptively pay for pro.
    await generateObjectReferenceImage({
      ...input,
      referenceImageUrl: 'https://cdn.test/watch-photo.jpg',
    })

    const options = mockGenerateImage.mock.calls[0]![0]!
    expect(options.modelTier).toBe('eco')
    expect(options.referenceImages).toHaveLength(1)
  })
})

describe('a batch of objects generates a few at a time', () => {
  function targets(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `obj-${i}`,
      name: `Prop ${i}`,
    }))
  }

  /** Resolves only once released, so in-flight counts can be observed. */
  function gate() {
    let release = () => {}
    const opened = new Promise<void>((resolve) => {
      release = resolve
    })
    return { opened, release: () => release() }
  }

  it('never exceeds the concurrency cap, and does reach it', async () => {
    const { opened, release } = gate()
    let inFlight = 0
    let peak = 0

    const batch = runObjectBatch(targets(9), {
      generate: async () => {
        inFlight += 1
        peak = Math.max(peak, inFlight)
        await opened
        inFlight -= 1
      },
    })

    // Every task the processor is willing to start has started by now.
    await Promise.resolve()
    expect(inFlight).toBe(OBJECT_BATCH_CONCURRENCY)

    release()
    await batch

    expect(peak).toBe(OBJECT_BATCH_CONCURRENCY)
    expect(OBJECT_BATCH_CONCURRENCY).toBe(3)
  })

  it('generates every object rather than stopping at the first failure', async () => {
    const attempted: string[] = []

    const summary = await runObjectBatch(targets(5), {
      generate: async (target) => {
        attempted.push(target.id)
        if (target.id === 'obj-1') throw new Error('Prompt blocked by safety filters')
      },
    })

    expect(attempted).toHaveLength(5)
    expect(summary).toMatchObject({ total: 5, succeeded: 4, failed: 1 })
  })

  it('names a cause when the whole batch failed', async () => {
    const summary = await runObjectBatch(targets(3), {
      generate: async () => {
        throw new Error('Insufficient credits')
      },
    })

    expect(summary).toMatchObject({ total: 3, succeeded: 0, failed: 3 })
    expect(summary.firstError).toBe('Insufficient credits')
  })

  it('leaves a failed object to the user rather than retrying it', async () => {
    // `processWithConcurrency` retries failures by default, which would double
    // the wait on a batch that failed because the account ran out of credits.
    const attempts: string[] = []

    await runObjectBatch(targets(2), {
      generate: async (target) => {
        attempts.push(target.id)
        throw new Error('nope')
      },
    })

    expect(attempts).toEqual(['obj-0', 'obj-1'])
  })

  it('reaches 100% even when some objects fail', async () => {
    const progress: number[] = []

    await runObjectBatch(targets(4), {
      onProgress: (percent) => progress.push(percent),
      generate: async (target) => {
        if (target.id !== 'obj-0') throw new Error('nope')
      },
    })

    expect(progress).toEqual([25, 50, 75, 100])
  })

  it('reports the objects in flight and clears them as they settle', async () => {
    const { opened, release } = gate()
    const reported: string[][] = []

    const batch = runObjectBatch(targets(3), {
      onInFlightChange: (names) => reported.push(names),
      generate: async () => {
        await opened
      },
    })

    await Promise.resolve()
    expect(reported.at(-1)).toEqual(['Prop 0', 'Prop 1', 'Prop 2'])

    release()
    await batch
    expect(reported.at(-1)).toEqual([])
  })

  it('does nothing at all for an empty batch', async () => {
    const generate = vi.fn()

    expect(await runObjectBatch([], { generate })).toEqual({
      total: 0,
      succeeded: 0,
      failed: 0,
    })
    expect(generate).not.toHaveBeenCalled()
  })
})
