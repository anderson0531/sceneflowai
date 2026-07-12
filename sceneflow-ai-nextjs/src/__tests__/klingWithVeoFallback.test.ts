import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { generateVideoWithKlingVeoFallback } from '@/lib/kling/klingWithVeoFallback'

vi.mock('@/lib/kling/klingDirectClient', () => ({
  runKlingVideo: vi.fn(),
  submitKlingVideo: vi.fn(),
}))

vi.mock('@/lib/kling/jobStore', () => ({
  saveKlingJob: vi.fn(),
}))

vi.mock('@/lib/gemini/productionVideoClient', () => ({
  generateProductionVideo: vi.fn(),
  waitForProductionVideoCompletion: vi.fn(),
  downloadProductionVideo: vi.fn(),
}))

vi.mock('@/lib/kling/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/kling/config')>()
  return {
    ...actual,
    isVeoFallbackEnabled: vi.fn(() => true),
  }
})

import { runKlingVideo } from '@/lib/kling/klingDirectClient'
import { generateProductionVideo } from '@/lib/gemini/productionVideoClient'

describe('generateVideoWithKlingVeoFallback', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.KLING_ASYNC = process.env.KLING_ASYNC
    envBackup.KLING_WEBHOOK_BASE_URL = process.env.KLING_WEBHOOK_BASE_URL
    process.env.KLING_ASYNC = 'true'
    process.env.KLING_WEBHOOK_BASE_URL = 'https://app.example.com'
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.KLING_ASYNC = envBackup.KLING_ASYNC
    process.env.KLING_WEBHOOK_BASE_URL = envBackup.KLING_WEBHOOK_BASE_URL
  })

  it('passes start frame to Kling for REF method', async () => {
    vi.mocked(runKlingVideo).mockResolvedValue(Buffer.from('ref-video'))

    await generateVideoWithKlingVeoFallback({
      prompt: 'Character walks forward',
      method: 'REF',
      videoOptions: {
        durationSeconds: 5,
        aspectRatio: '16:9',
        startFrame: 'https://cdn.example.com/beat-frame.png',
      },
    })

    expect(runKlingVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        startFrame: 'https://cdn.example.com/beat-frame.png',
      })
    )
  })

  it('downgrades REF to I2V on retry when a start frame exists', async () => {
    vi.mocked(runKlingVideo)
      .mockRejectedValueOnce(new Error('policy block 1'))
      .mockRejectedValueOnce(new Error('policy block 2'))
      .mockRejectedValueOnce(new Error('policy block 3'))
      .mockResolvedValueOnce(Buffer.from('i2v-after-ref'))

    await generateVideoWithKlingVeoFallback({
      prompt: 'Character walks forward',
      method: 'REF',
      referenceFallbackPrompt: 'A person walks in a neutral cinematic scene',
      videoOptions: {
        durationSeconds: 5,
        aspectRatio: '16:9',
        startFrame: 'https://cdn.example.com/beat-frame.png',
      },
    })

    const lastCall = vi.mocked(runKlingVideo).mock.calls.at(-1)?.[0]
    expect(lastCall?.startFrame).toBe('https://cdn.example.com/beat-frame.png')
    expect(lastCall?.prompt).toContain('Character walks forward')
  })

  it('does not duplicate guide prompt on Vertex fallback and sanitizes the full prompt', async () => {
    vi.mocked(runKlingVideo).mockRejectedValue(new Error('kling failed'))

    const guide =
      'Background music: subtle dread and eerie unsettling tones with distorted ambience'
    const prompt = `Scene action with mood.\n\n${guide}`

    vi.mocked(generateProductionVideo).mockResolvedValue({
      status: 'FAILED',
      error: 'blocked',
    })

    await generateVideoWithKlingVeoFallback({
      prompt,
      guidePrompt: guide,
      method: 'I2V',
      allowVeoFallback: true,
      videoOptions: {
        durationSeconds: 5,
        aspectRatio: '16:9',
        startFrame: 'https://cdn.example.com/frame.png',
      },
    })

    expect(generateProductionVideo).toHaveBeenCalledTimes(1)
    const vertexPrompt = vi.mocked(generateProductionVideo).mock.calls[0]?.[0] as string
    const guideOccurrences = vertexPrompt.split('Background music:').length - 1
    expect(guideOccurrences).toBe(1)
    expect(vertexPrompt.toLowerCase()).not.toContain('dread')
    expect(vertexPrompt.toLowerCase()).not.toContain('eerie')
    expect(vertexPrompt.toLowerCase()).not.toContain('unsettling')
  })
})
