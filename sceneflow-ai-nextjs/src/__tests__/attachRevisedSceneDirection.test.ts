import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateSceneDirection } from '@/lib/sceneGeneration/generateDirection'
import { attachCoGeneratedSceneDirection } from '@/lib/sceneGeneration/attachRevisedSceneDirection'
import { shouldRegenerateSceneDirection } from '@/lib/script/scenePreservation'

vi.mock('@/lib/sceneGeneration/generateDirection', () => ({
  generateSceneDirection: vi.fn(),
}))

const mockDirection = {
  camera: { shotType: 'medium' },
  scene: { lighting: 'natural' },
  talent: {},
  segmentPromptBundle: [],
}

describe('attachCoGeneratedSceneDirection', () => {
  beforeEach(() => {
    vi.mocked(generateSceneDirection).mockReset()
    vi.mocked(generateSceneDirection).mockResolvedValue({ sceneDirection: mockDirection })
  })

  it('skipDirection: true returns finalized scene without calling generateSceneDirection', async () => {
    const finalized = { heading: 'INT. ROOM', action: 'Alex walks.' }
    const currentScene = { sceneDirection: { camera: {}, scene: {} } }

    const result = await attachCoGeneratedSceneDirection({
      finalizedScene: finalized,
      currentScene,
      context: { characters: [] },
      sceneIndex: 0,
      preserveElements: [],
      skipDirection: true,
    })

    expect(result).toBe(finalized)
    expect(generateSceneDirection).not.toHaveBeenCalled()
  })

  it('preserved sceneDirection skips generation even when skipDirection is false', async () => {
    const finalized = { heading: 'INT. ROOM', action: 'Alex walks.' }
    const currentScene = { sceneDirection: mockDirection }

    const result = await attachCoGeneratedSceneDirection({
      finalizedScene: finalized,
      currentScene,
      context: { characters: [] },
      sceneIndex: 0,
      preserveElements: ['sceneDirection'],
      skipDirection: false,
    })

    expect(result).toBe(finalized)
    expect(generateSceneDirection).not.toHaveBeenCalled()
  })

  it('generates direction when not skipped and scene direction is not preserved', async () => {
    const finalized = {
      heading: 'INT. ROOM',
      action: 'Alex walks.',
      dialogue: [{ character: 'ALEX', line: 'Hello.' }],
    }

    const result = await attachCoGeneratedSceneDirection({
      finalizedScene: finalized,
      currentScene: {},
      context: { characters: [{ name: 'ALEX' }] },
      sceneIndex: 2,
      preserveElements: ['music'],
      skipDirection: false,
    })

    expect(generateSceneDirection).toHaveBeenCalledOnce()
    expect(result).toEqual({ ...finalized, sceneDirection: mockDirection })
  })
})

describe('apply-time direction regeneration gate', () => {
  it('shouldRegenerateSceneDirection is true when direction is not preserved', () => {
    expect(shouldRegenerateSceneDirection([])).toBe(true)
    expect(shouldRegenerateSceneDirection(['music'])).toBe(true)
    expect(shouldRegenerateSceneDirection(['dialogueBeats'])).toBe(true)
  })

  it('shouldRegenerateSceneDirection is false when scene direction is preserved', () => {
    expect(shouldRegenerateSceneDirection(['sceneDirection'])).toBe(false)
    expect(shouldRegenerateSceneDirection(['sceneDirection', 'music'])).toBe(false)
  })
})
