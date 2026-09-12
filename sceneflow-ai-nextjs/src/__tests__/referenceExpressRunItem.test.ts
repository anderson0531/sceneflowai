import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReferenceExpressItem } from '@/lib/vision/referenceExpress/types'

vi.mock('@/models', () => ({}))
vi.mock('@/models/Project', () => ({ Project: { findByPk: vi.fn() } }))
vi.mock('@/config/database', () => ({
  sequelize: { transaction: vi.fn() },
}))

vi.mock('@/i18n/server/storyLocale', () => ({
  resolveStoryLocale: vi.fn(async () => ({ storyLocale: 'en', properNouns: [] })),
}))

vi.mock('@/lib/vision/referenceExpress/generateReferenceImage', () => ({
  generateCastReferenceImage: vi.fn(),
  generateLocationReferenceImage: vi.fn(),
  generateObjectReferenceImage: vi.fn(),
}))

vi.mock('@/lib/vision/referenceExpress/persistReferenceImage', () => ({
  persistReferenceImage: vi.fn(async () => ({ saved: true, staleSource: false })),
}))

vi.mock('@/lib/character/applyCastingBriefUpdate', () => ({
  refreshCastingBriefForAppearance: vi.fn(),
}))

vi.mock('@/lib/character/generateCastingBrief', () => ({
  generateCastingBrief: vi.fn(),
}))

const CHARACTER = vi.hoisted(() => ({
  id: 'c1',
  name: 'Mira',
  type: 'lead',
  appearanceDescription: 'weathered dockhand, short grey hair',
  age: 52,
}))

vi.mock('@/lib/vision/referenceExpress/planItems', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/vision/referenceExpress/planItems')>()),
  loadReferenceExpressContext: vi.fn(async () => ({
    characters: [CHARACTER],
    locations: [],
    props: [],
    scenes: [],
    screenplayContext: { genre: 'thriller' },
  })),
}))

import { castFingerprint } from '@/lib/vision/referenceExpress/planItems'
import { generateCastReferenceImage } from '@/lib/vision/referenceExpress/generateReferenceImage'
import { persistReferenceImage } from '@/lib/vision/referenceExpress/persistReferenceImage'
import { refreshCastingBriefForAppearance } from '@/lib/character/applyCastingBriefUpdate'
import { runReferenceExpressItem } from '@/lib/vision/referenceExpress/runItem'

const mockGenerate = vi.mocked(generateCastReferenceImage)
const mockPersist = vi.mocked(persistReferenceImage)
const mockBrief = vi.mocked(refreshCastingBriefForAppearance)

const CAST_ITEM: ReferenceExpressItem = {
  kind: 'cast',
  targetId: 'c1',
  label: 'Mira',
  sourceFingerprint: castFingerprint(CHARACTER as never),
}

const VISION_DESCRIPTION = 'grey-haired woman in a salt-stained canvas jacket'

const run = () =>
  runReferenceExpressItem({ userId: 'user-1', projectId: 'project-1', item: CAST_ITEM })

beforeEach(() => {
  vi.clearAllMocks()
  mockPersist.mockResolvedValue({ saved: true, staleSource: false })
  mockGenerate.mockResolvedValue({
    imageUrl: 'https://cdn/mira.png',
    visionDescription: VISION_DESCRIPTION,
    autoEnhanced: true,
    model: 'gemini-image',
    creditCost: 12,
  })
  mockBrief.mockResolvedValue({ voiceDescription: 'gravelly, unhurried' } as never)
})

describe('runReferenceExpressItem cast path', () => {
  /**
   * The portrait costs two designer-tier generations plus a vision pass. If the
   * Casting Brief's LLM call is still on the path when the isolate's budget
   * runs out, the whole item retries and pays for those again.
   */
  it('saves the portrait before asking for the Casting Brief', async () => {
    const order: string[] = []
    mockPersist.mockImplementation(async (input) => {
      order.push(input.patch.referenceImage ? 'image' : 'brief')
      return { saved: true, staleSource: false }
    })
    mockBrief.mockImplementation(async () => {
      order.push('brief-llm')
      return { voiceDescription: 'gravelly, unhurried' } as never
    })

    await run()

    expect(order).toEqual(['image', 'brief-llm', 'brief'])
  })

  it('compares the brief against the appearance the image write just stored', async () => {
    await run()

    expect(mockPersist).toHaveBeenCalledTimes(2)
    expect(mockPersist.mock.calls[0]![0]!.expectedFingerprint).toBe(
      CAST_ITEM.sourceFingerprint
    )
    // Comparing against the enqueue-time digest would flag every brief as stale
    // against our own appearanceDescription write.
    expect(mockPersist.mock.calls[1]![0]!.expectedFingerprint).toBe(
      castFingerprint({ ...CHARACTER, appearanceDescription: VISION_DESCRIPTION } as never)
    )
    expect(mockPersist.mock.calls[1]![0]!.patch).toEqual({
      voiceDescription: 'gravelly, unhurried',
    })
  })

  it('keeps the portrait when the Casting Brief cannot be produced', async () => {
    mockBrief.mockRejectedValue(new Error('LLM unavailable'))

    const result = await run()

    expect(result.status).toBe('succeeded')
    expect(result.imageUrl).toBe('https://cdn/mira.png')
    expect(mockPersist).toHaveBeenCalledOnce()
    expect(mockPersist.mock.calls[0]![0]!.patch).toMatchObject({
      referenceImage: 'https://cdn/mira.png',
      appearanceDescription: VISION_DESCRIPTION,
    })
  })

  it('skips the brief entirely when vision analysis produced no description', async () => {
    mockGenerate.mockResolvedValue({
      imageUrl: 'https://cdn/mira.png',
      visionDescription: null,
      autoEnhanced: false,
      model: 'gemini-image',
      creditCost: 12,
    })

    await run()

    expect(mockBrief).not.toHaveBeenCalled()
    expect(mockPersist).toHaveBeenCalledOnce()
  })

  it('reports a target that vanished mid-run without writing anything', async () => {
    mockPersist.mockResolvedValue({ saved: false, staleSource: false })

    const result = await run()

    expect(result).toMatchObject({ status: 'skipped', skippedReason: 'missing' })
    expect(mockBrief).not.toHaveBeenCalled()
  })
})
