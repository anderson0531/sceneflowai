import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/intelligence/beat-sequence-planner', () => ({
  planBeatSequence: vi.fn(),
  applyBeatKeyframePlansToScene: vi.fn((scene: Record<string, unknown>) => scene),
  ensureSceneMusicFromDirection: vi.fn((scene: Record<string, unknown>) => scene),
  isTitleOrCinematicScene: () => false,
}))

vi.mock('@/lib/sceneGeneration/generateDirection', () => ({
  generateSceneDirection: vi.fn(),
}))

vi.mock('@/lib/sceneGeneration/generateAudio', () => ({
  generateSceneAudio: vi.fn(),
  applyAudioAssetsToScene: vi.fn(),
}))

vi.mock('@/lib/sceneGeneration/generateImage', () => ({
  generateSceneImage: vi.fn(),
}))

import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  resolveExpressBeatReferences,
  buildExpressBeatRefPayload,
} from '@/lib/sceneGeneration/expressOrchestrator'

const alice = {
  id: 'char-alice',
  name: 'ALICE',
  referenceImage: 'https://example.com/alice.png',
  wardrobes: [
    {
      id: 'wardrobe-alley',
      name: 'Alley',
      description: 'Leather jacket',
      isDefault: true,
      sceneNumbers: [1],
      fullBodyUrl: 'https://example.com/alice-wardrobe.png',
    },
  ],
}

const locationRef = {
  id: 'loc-alley',
  location: 'ALLEY',
  locationDisplay: 'Rainy Alley',
  imageUrl: 'https://example.com/alley.png',
  sceneNumbers: [1],
}

const lanternProp = {
  id: 'prop-lantern',
  name: 'lantern',
  description: 'Brass lantern',
  imageUrl: 'https://example.com/lantern.png',
}

function buildProject(overrides?: {
  beat?: Partial<SceneBeat>
  scene?: Record<string, unknown>
}) {
  const beat: SceneBeat = {
    beatId: 'bt_action',
    kind: 'action',
    actionDescription: 'ALICE lifts the lantern in the alley.',
    sequenceIndex: 0,
    ...overrides?.beat,
  }

  const scene = {
    heading: 'INT. ALLEY - NIGHT',
    action: 'Rain in the alley.',
    beats: [beat],
    ...overrides?.scene,
  }

  return {
    metadata: {
      title: 'Test Film',
      visionPhase: {
        characters: [alice],
        references: {
          locationReferences: [locationRef],
          objectReferences: [lanternProp],
        },
        script: { script: { scenes: [scene] } },
      },
    },
    title: 'Test Film',
  }
}

describe('resolveExpressBeatReferences', () => {
  it('auto-resolves characters, wardrobe, location, and props for a fresh beat', () => {
    const project = buildProject()
    const scene = project.metadata.visionPhase.script.script.scenes[0]
    const beat = scene.beats[0] as SceneBeat

    const refs = resolveExpressBeatReferences({
      beat,
      scene,
      sceneIndex: 0,
      beatIdx: 0,
      sceneNumber: 1,
      project,
    })

    expect(refs).not.toBeNull()
    expect(refs!.characterSelectionExplicit).toBe(true)
    expect(refs!.skipObjectAutoDetection).toBe(true)
    expect(refs!.selectedCharacters).toContain('char-alice')
    expect(refs!.locationReferences).toHaveLength(1)
    expect(refs!.locationReferences[0].id).toBe('loc-alley')
    expect(refs!.objectReferences.some((o) => o.id === 'prop-lantern')).toBe(true)
    expect(refs!.characterWardrobes).toEqual([
      { characterId: 'char-alice', wardrobeId: 'wardrobe-alley' },
    ])
  })

  it('prefers saved beat.referenceSelection over auto-resolve', () => {
    const project = buildProject({
      beat: {
        referenceSelection: {
          characterIds: ['char-alice'],
          locationRefId: 'loc-alley',
          objectRefIds: [],
          characterWardrobes: [{ characterId: 'char-alice', wardrobeId: 'wardrobe-alley' }],
          resolvedAt: '2026-07-13T00:00:00.000Z',
        },
      },
    })
    const scene = project.metadata.visionPhase.script.script.scenes[0]
    const beat = scene.beats[0] as SceneBeat

    const refs = resolveExpressBeatReferences({
      beat,
      scene,
      sceneIndex: 0,
      beatIdx: 0,
      sceneNumber: 1,
      project,
    })

    expect(refs!.objectReferences).toHaveLength(0)
    expect(refs!.selectedCharacters).toEqual(['char-alice'])
  })
})

describe('buildExpressBeatRefPayload', () => {
  it('omits characters and wardrobes when excludeCharacters is true', () => {
    const project = buildProject()
    const scene = project.metadata.visionPhase.script.script.scenes[0]
    const beat = scene.beats[0] as SceneBeat

    const refs = resolveExpressBeatReferences({
      beat,
      scene,
      sceneIndex: 0,
      beatIdx: 0,
      sceneNumber: 1,
      project,
    })!

    const payload = buildExpressBeatRefPayload(refs, true)

    expect(payload.selectedCharacters).toBeUndefined()
    expect(payload.characterWardrobes).toBeUndefined()
    expect(payload.locationReferences).toHaveLength(1)
    expect(payload.skipObjectAutoDetection).toBe(true)
    expect(payload.characterSelectionExplicit).toBe(true)
  })
})
