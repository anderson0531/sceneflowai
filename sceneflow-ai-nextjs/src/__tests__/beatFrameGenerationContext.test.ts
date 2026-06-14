import { describe, it, expect } from 'vitest'
import { resolveBeatFrameGenerationContext } from '@/lib/vision/beatFrameGenerationContext'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { LocationReference } from '@/types/visionReferences'

const characters = [
  { id: 'c1', name: 'Elara Vance', referenceImage: 'https://blob.example/elara.jpg' },
  { id: 'c2', name: 'Marcus Thorne', referenceImage: 'https://blob.example/marcus.jpg' },
]

const locations: LocationReference[] = [
  {
    id: 'loc-kitchen',
    location: 'KITCHEN',
    imageUrl: 'https://blob.example/kitchen.jpg',
  },
  {
    id: 'loc-bedroom',
    location: 'BEDROOM',
    imageUrl: 'https://blob.example/bedroom.jpg',
  },
]

function actionBeat(overrides: Partial<SceneBeat> = {}): SceneBeat {
  return {
    beatId: 'beat-1',
    sequenceIndex: 0,
    kind: 'action',
    actionDescription: 'Elara opens the fridge',
    ...overrides,
  }
}

describe('resolveBeatFrameGenerationContext', () => {
  it('auto-selects location from scene heading', () => {
    const scene = {
      heading: 'INT. KITCHEN - DAY',
      action: 'Morning routine',
    }
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      beat: actionBeat(),
      projectCharacters: characters,
      locationReferences: locations,
      objectReferences: [],
    })

    expect(resolved.locationRefId).toBe('loc-kitchen')
    expect(resolved.locationMatchConfidence).toBe('heading')
    expect(resolved.characterIds).toContain('c1')
  })

  it('does not pick bedroom when heading is kitchen', () => {
    const scene = { heading: 'INT. KITCHEN - NIGHT' }
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      beat: actionBeat({ actionDescription: 'Steam rises from the kettle' }),
      projectCharacters: characters,
      locationReferences: locations,
      objectReferences: [],
    })

    expect(resolved.locationRefId).toBe('loc-kitchen')
    expect(resolved.locationRefId).not.toBe('loc-bedroom')
  })

  it('does not include characters from full scene action when beat only names one', () => {
    const scene = {
      heading: "INT. ELARA'S APARTMENT - NIGHT",
      action:
        'Marcus enters with Dr. Reed. Elara walks through the living room while they talk.',
    }
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      beat: actionBeat({
        actionDescription:
          'Elara walks slowly through her living room, her eyes scanning every detail.',
      }),
      projectCharacters: [
        ...characters,
        {
          id: 'c3',
          name: 'Dr. Benjamin Reed',
          referenceImage: 'https://blob.example/reed.jpg',
        },
      ],
      locationReferences: [],
      objectReferences: [],
    })

    expect(resolved.characterIds).toEqual(['c1'])
    expect(resolved.characterNames).toEqual(['Elara Vance'])
  })

  it('detects multiple characters on action beats', () => {
    const scene = { heading: 'INT. LAB - DAY' }
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      beat: actionBeat({
        actionDescription: 'Elara and Marcus examine the console',
      }),
      projectCharacters: characters,
      locationReferences: [],
      objectReferences: [],
    })

    expect(resolved.characterIds).toEqual(expect.arrayContaining(['c1', 'c2']))
    expect(resolved.characterNames).toEqual(
      expect.arrayContaining(['Elara Vance', 'Marcus Thorne'])
    )
  })

  it('warns when location match is weak', () => {
    const scene = { heading: 'EXT. UNKNOWN PLACE - DAY', action: 'Wind howls' }
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      beat: actionBeat(),
      projectCharacters: characters,
      locationReferences: locations,
      objectReferences: [],
    })

    expect(resolved.locationRefId).toBeNull()
    expect(resolved.warnings.some((w) => w.includes('No location auto-matched'))).toBe(true)
  })

  it('resolves dialogue beat speaker only', () => {
    const scene = { heading: 'INT. OFFICE - DAY' }
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      beat: {
        beatId: 'b2',
        sequenceIndex: 1,
        kind: 'dialogue',
        character: 'Marcus Thorne',
        characterId: 'c2',
        line: '[calm] We need to move.',
      },
      projectCharacters: characters,
      locationReferences: [],
      objectReferences: [],
    })

    expect(resolved.characterIds).toEqual(['c2'])
  })

  it('auto-selects wardrobe from scene.characterWardrobes', () => {
    const scene = {
      heading: 'INT. KITCHEN - DAY',
      characterWardrobes: [{ characterId: 'c1', wardrobeId: 'w-kitchen' }],
    }
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      sceneIndex: 0,
      beat: actionBeat(),
      projectCharacters: [
        {
          id: 'c1',
          name: 'Elara Vance',
          referenceImage: 'https://blob.example/elara.jpg',
          wardrobes: [
            { id: 'w-kitchen', name: 'Morning robe', isDefault: false },
            { id: 'w-default', name: 'Casual', isDefault: true },
          ],
        },
      ],
      locationReferences: [],
      objectReferences: [],
    })

    expect(resolved.characterWardrobes).toEqual([{ characterId: 'c1', wardrobeId: 'w-kitchen' }])
  })

  it('auto-selects wardrobe via sceneNumbers when no scene override', () => {
    const scene = { heading: 'INT. LAB - DAY' }
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      sceneIndex: 3,
      beat: actionBeat({ actionDescription: 'Elara scans the console' }),
      projectCharacters: [
        {
          id: 'c1',
          name: 'Elara Vance',
          referenceImage: 'https://blob.example/elara.jpg',
          wardrobes: [
            { id: 'w-scene4', name: 'Scene 4', sceneNumbers: [4], isDefault: false },
            { id: 'w-default', name: 'Default', isDefault: true },
          ],
        },
      ],
      locationReferences: [],
      objectReferences: [],
    })

    expect(resolved.characterWardrobes).toEqual([{ characterId: 'c1', wardrobeId: 'w-scene4' }])
  })
})
