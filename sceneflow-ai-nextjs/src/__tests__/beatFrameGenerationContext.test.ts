import { describe, it, expect } from 'vitest'
import { resolveBeatFrameGenerationContext } from '@/lib/vision/beatFrameGenerationContext'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

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

  it('auto-selects location from sceneNumbers assignment over heading match', () => {
    const assignedLocations: LocationReference[] = [
      {
        id: 'loc-assigned',
        location: 'PODCAST STUDIO',
        locationDisplay: 'INT. PODCAST STUDIO - DAY',
        imageUrl: 'https://blob.example/studio.jpg',
        sourceSceneIndex: 2,
        sourceSceneHeading: 'INT. PODCAST STUDIO - DAY',
        pinnedAt: new Date().toISOString(),
        sceneNumbers: [3],
      },
      ...locations,
    ]
    const scene = { heading: 'INT. KITCHEN - DAY' }
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      sceneIndex: 2,
      beat: actionBeat(),
      projectCharacters: characters,
      locationReferences: assignedLocations,
      objectReferences: [],
    })

    expect(resolved.locationRefId).toBe('loc-assigned')
    expect(resolved.locationMatchConfidence).toBe('assigned')
    expect(resolved.locationName).toBe('PODCAST STUDIO')
  })

  it('warns when multiple locations are assigned to the same scene', () => {
    const assignedLocations: LocationReference[] = [
      {
        id: 'loc-a',
        location: 'STUDIO A',
        locationDisplay: 'INT. STUDIO A',
        imageUrl: 'https://blob.example/a.jpg',
        sourceSceneIndex: 0,
        sourceSceneHeading: 'INT. STUDIO A',
        pinnedAt: new Date().toISOString(),
        sceneNumbers: [1],
      },
      {
        id: 'loc-b',
        location: 'STUDIO B',
        locationDisplay: 'INT. STUDIO B',
        imageUrl: 'https://blob.example/b.jpg',
        sourceSceneIndex: 0,
        sourceSceneHeading: 'INT. STUDIO B',
        pinnedAt: new Date().toISOString(),
        sceneNumbers: [1],
      },
    ]
    const resolved = resolveBeatFrameGenerationContext({
      scene: { heading: 'INT. STUDIO - DAY' },
      sceneIndex: 0,
      beat: actionBeat(),
      projectCharacters: characters,
      locationReferences: assignedLocations,
      objectReferences: [],
    })

    expect(resolved.locationRefId).toBe('loc-a')
    expect(resolved.locationMatchConfidence).toBe('assigned')
    expect(resolved.warnings.some((w) => w.includes('Multiple location references'))).toBe(true)
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

  it('falls back to scene-cast when an action beat uses pronouns instead of names', () => {
    const scene = {
      heading: 'INT. LIVING ROOM - NIGHT',
      action: 'Someone moves through the dark apartment.',
      beats: [
        {
          beatId: 'beat-action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'He walks slowly through the living room, scanning every corner.',
        },
        {
          beatId: 'beat-dialogue',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'Elara Vance',
          characterId: 'c1',
          line: 'I know you are here.',
        },
      ],
    }
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      beat: scene.beats[0] as SceneBeat,
      projectCharacters: characters,
      locationReferences: [],
      objectReferences: [],
    })

    expect(resolved.characterIds).toContain('c1')
    expect(resolved.characterNames).toContain('Elara Vance')
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

  it('auto-selects only props named in beat text, not scene-tagged props from other beats', () => {
    const scene = {
      heading: 'INT. OFFICE - DAY',
      sceneNumber: 5,
      action:
        'Elara adjusts a tiny lapel camera. Marcus sips from a coffee mug while reviewing a transparent tablet.',
    }
    const objectReferences = [
      {
        id: 'prop-lapel',
        name: 'Tiny lapel camera',
        sceneNumbers: [5],
        importance: 'critical',
      },
      {
        id: 'prop-tablet',
        name: 'Transparent tablet',
        sceneNumbers: [5],
        importance: 'important',
      },
      {
        id: 'prop-mug',
        name: 'Coffee mug',
        sceneNumbers: [5],
        importance: 'background',
      },
      {
        id: 'prop-unrelated',
        name: 'Vintage typewriter',
        sceneNumbers: [5],
        importance: 'background',
      },
    ]
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      beat: actionBeat({
        actionDescription:
          'Close-up. Elara adjusts a tiny lapel camera clipped to her clothing.',
      }),
      projectCharacters: characters,
      locationReferences: [],
      objectReferences,
    })

    expect(resolved.objectRefIds).toEqual(['prop-lapel'])
    expect(resolved.objectNames).toEqual(['Tiny lapel camera'])
  })

  it('does not cast Dr. Arthur Pendelton when beat text only references his journal prop', () => {
    const cast = [
      { id: 'piper', name: 'Piper Hayes', referenceImage: 'https://blob.example/piper.jpg' },
      { id: 'gideon', name: 'Professor Gideon Croft', referenceImage: 'https://blob.example/gideon.jpg' },
      { id: 'arthur', name: 'Dr. Arthur Pendelton', referenceImage: 'https://blob.example/arthur.jpg' },
    ]
    const objectReferences = [
      {
        id: 'prop-journal',
        name: "Arthur Pendelton's 1893 Journal",
        importance: 'critical',
      },
    ]
    const scene = {
      heading: 'INT. CLANDESTINE STUDIO - NIGHT',
      sceneDirection: {
        sceneDescription:
          'Piper Hayes and Professor Gideon Croft race against a tactical breach. Piper grounds Gideon with a weathered journal.',
        scene: {
          keyProps: ['Water-damaged leather journal'],
        },
      },
    }
    const resolved = resolveBeatFrameGenerationContext({
      scene,
      beat: actionBeat({
        actionDescription:
          'Piper Hayes grips Arthur Pendelton\'s 1893 Journal tightly, making intense eye contact with Professor Gideon Croft.',
      }),
      projectCharacters: cast,
      locationReferences: [],
      objectReferences,
    })

    expect(resolved.characterIds).toEqual(expect.arrayContaining(['piper', 'gideon']))
    expect(resolved.characterIds).not.toContain('arthur')
    expect(resolved.objectRefIds).toContain('prop-journal')
  })

  describe('prop attachment is beat-scoped', () => {
    const spanner: VisualReference[] = [
      {
        id: 'prop-spanner',
        type: 'object',
        name: 'Thirty-Inch Iron Rail Spanner',
        description: 'A heavy iron rail spanner resting against the brass hatch collar.',
        importance: 'critical',
      },
    ]
    const hatchScene = {
      heading: 'INT. SUBMERSIBLE HATCH - NIGHT',
      sceneDirection: {
        scene: {
          keyProps: ['Thirty-Inch Iron Rail Spanner', 'Violet Ink Drafting Vellum'],
        },
      },
    }

    it('does not attach a spanner that only scene direction lists', () => {
      const resolved = resolveBeatFrameGenerationContext({
        scene: hatchScene,
        beat: actionBeat({
          actionDescription:
            'Brass pneumatic hatch collar flanked by three rusted locking dogs.',
        }),
        projectCharacters: characters,
        locationReferences: [],
        objectReferences: spanner,
      })

      expect(resolved.objectRefIds).toEqual([])
      expect(resolved.objectNames).toEqual([])
    })

    it('does not attach a prop matched only through the scene heading', () => {
      const resolved = resolveBeatFrameGenerationContext({
        scene: { heading: 'INT. IRON RAIL YARD - NIGHT' },
        beat: actionBeat({ actionDescription: 'Steam vents along the walkway.' }),
        projectCharacters: characters,
        locationReferences: [],
        objectReferences: spanner,
      })

      expect(resolved.objectRefIds).toEqual([])
    })

    it('does not attach a prop matched only through its own description text', () => {
      const resolved = resolveBeatFrameGenerationContext({
        scene: hatchScene,
        beat: actionBeat({
          actionDescription: 'The brass hatch collar hisses as pressure equalizes.',
        }),
        projectCharacters: characters,
        locationReferences: [],
        objectReferences: spanner,
      })

      expect(resolved.objectRefIds).toEqual([])
    })

    it('attaches a spanner the beat direction pins as a key prop', () => {
      const resolved = resolveBeatFrameGenerationContext({
        scene: hatchScene,
        beat: actionBeat({
          actionDescription: 'Brass pneumatic hatch collar flanked by three rusted locking dogs.',
          beatDirection: { keyProps: ['Thirty-Inch Iron Rail Spanner'] },
        }),
        projectCharacters: characters,
        locationReferences: [],
        objectReferences: spanner,
      })

      expect(resolved.objectRefIds).toEqual(['prop-spanner'])
    })

    it('attaches a spanner the beat direction has a character handle', () => {
      const resolved = resolveBeatFrameGenerationContext({
        scene: hatchScene,
        beat: actionBeat({
          actionDescription: 'She braces against the bulkhead.',
          beatDirection: {
            propInteraction: 'Elara swings the Thirty-Inch Iron Rail Spanner at the locking dogs.',
          },
        }),
        projectCharacters: characters,
        locationReferences: [],
        objectReferences: spanner,
      })

      expect(resolved.objectRefIds).toEqual(['prop-spanner'])
    })

    it('attaches a spanner the beat action names outright', () => {
      const resolved = resolveBeatFrameGenerationContext({
        scene: hatchScene,
        beat: actionBeat({
          actionDescription:
            'Elara hefts the Thirty-Inch Iron Rail Spanner over the locking dogs.',
        }),
        projectCharacters: characters,
        locationReferences: [],
        objectReferences: spanner,
      })

      expect(resolved.objectRefIds).toEqual(['prop-spanner'])
    })
  })
})
