import { describe, it, expect } from 'vitest'
import {
  resolveFrameEditCharacterReferences,
  resolveSegmentEditCharacterReferences,
  frameEditReferenceKeys,
  buildFrameEditReferenceImages,
  appendUseTheseReferencesClause,
  listFrameEditLocationStills,
  listFrameEditCorrectionTargets,
  buildFrameEditCorrectionInstruction,
  buildFrameEditImagesForCorrectionTarget,
} from '@/lib/vision/resolveFrameEditCharacterReferences'

const marcus = {
  id: 'char-1',
  name: 'Marcus',
  referenceImage: 'https://example.com/marcus-portrait.jpg',
  wardrobes: [
    {
      id: 'w1',
      name: 'Office suit',
      description: 'Navy suit',
      isDefault: true,
      fullBodyUrl: 'https://example.com/marcus-turnaround.jpg',
    },
  ],
}

describe('resolveFrameEditCharacterReferences', () => {
  it('returns identity + wardrobe URLs for dialogue frame speaker', () => {
    const scene = {
      dialogue: [{ character: 'Marcus', line: 'Hello.' }],
    }
    const refs = resolveFrameEditCharacterReferences({
      editingFrame: {
        kind: 'dialogue',
        sceneIndex: 0,
        dialogueIndex: 0,
        imageUrl: 'https://example.com/frame.jpg',
      },
      scene,
      sceneIndex: 0,
      characters: [marcus],
    })
    expect(refs).toHaveLength(1)
    expect(refs[0].characterName).toBe('Marcus')
    expect(refs[0].identityImageUrl).toBe('https://example.com/marcus-portrait.jpg')
    expect(refs[0].wardrobeImageUrl).toBe('https://example.com/marcus-turnaround.jpg')
    expect(refs[0].wardrobeDiptychUrl).toBeUndefined()
  })

  it('uses saved wardrobe from beat referenceSelection', () => {
    const scene = {
      beats: [
        {
          beatId: 'beat-1',
          kind: 'action',
          actionDescription: 'Marcus enters.',
          referenceSelection: {
            resolvedAt: '2026-01-01T00:00:00Z',
            characterIds: ['char-1'],
            characterWardrobes: [{ characterId: 'char-1', wardrobeId: 'w-scene' }],
          },
        },
      ],
    }
    const character = {
      id: 'char-1',
      name: 'Marcus',
      referenceImage: 'https://example.com/marcus-portrait.jpg',
      wardrobes: [
        {
          id: 'w-scene',
          name: 'Lab coat',
          fullBodyUrl: 'https://example.com/lab-coat.jpg',
          isDefault: false,
        },
        {
          id: 'w-default',
          name: 'Casual',
          fullBodyUrl: 'https://example.com/casual.jpg',
          isDefault: true,
        },
      ],
    }
    const refs = resolveFrameEditCharacterReferences({
      editingFrame: {
        kind: 'beat',
        sceneIndex: 0,
        beatId: 'beat-1',
        imageUrl: 'https://example.com/beat.jpg',
      },
      scene,
      sceneIndex: 0,
      characters: [character],
    })
    expect(refs).toHaveLength(1)
    expect(refs[0].wardrobeImageUrl).toBe('https://example.com/lab-coat.jpg')
  })

  it('returns identity + wardrobe URLs for establishing frame via scene-wide detection', () => {
    const scene = {
      heading: 'INT. OFFICE - DAY',
      action: 'Marcus enters the office and looks around.',
    }
    const refs = resolveFrameEditCharacterReferences({
      editingFrame: {
        kind: 'establishing',
        sceneIndex: 0,
        imageUrl: 'https://example.com/scene.jpg',
      },
      scene,
      sceneIndex: 0,
      characters: [marcus],
    })
    expect(refs).toHaveLength(1)
    expect(refs[0].characterName).toBe('Marcus')
    expect(refs[0].identityImageUrl).toBe('https://example.com/marcus-portrait.jpg')
    expect(refs[0].wardrobeImageUrl).toBe('https://example.com/marcus-turnaround.jpg')
  })

  it('returns identity + wardrobe URLs for beat-first scene via beat text in fallback', () => {
    const scene = {
      heading: 'INT. LAB - DAY',
      beats: [
        {
          beatId: 'beat-1',
          kind: 'action',
          actionDescription: 'Marcus scans the equipment on the bench.',
        },
      ],
    }
    const refs = resolveFrameEditCharacterReferences({
      editingFrame: {
        kind: 'establishing',
        sceneIndex: 0,
        imageUrl: 'https://example.com/scene.jpg',
      },
      scene,
      sceneIndex: 0,
      characters: [marcus],
    })
    expect(refs).toHaveLength(1)
    expect(refs[0].characterName).toBe('Marcus')
    expect(refs[0].identityImageUrl).toBe('https://example.com/marcus-portrait.jpg')
  })

  it('falls back to all project characters with reference images when cast is undetectable', () => {
    const refs = resolveFrameEditCharacterReferences({
      editingFrame: {
        kind: 'establishing',
        sceneIndex: 0,
        imageUrl: 'https://example.com/scene.jpg',
      },
      scene: { heading: 'EXT. PARK - DAY', action: 'Birds chirp in the trees.' },
      sceneIndex: 0,
      characters: [marcus],
    })
    expect(refs).toHaveLength(1)
    expect(refs[0].characterName).toBe('Marcus')
    expect(refs[0].identityImageUrl).toBe('https://example.com/marcus-portrait.jpg')
  })

  it('returns empty array when establishing frame has no matching cast and no usable refs', () => {
    const characterWithoutRef = {
      id: 'char-2',
      name: 'Marcus',
      wardrobes: [],
    }
    const refs = resolveFrameEditCharacterReferences({
      editingFrame: {
        kind: 'establishing',
        sceneIndex: 0,
        imageUrl: 'https://example.com/scene.jpg',
      },
      scene: { heading: 'EXT. PARK - DAY', action: 'Birds chirp in the trees.' },
      sceneIndex: 0,
      characters: [characterWithoutRef],
    })
    expect(refs).toEqual([])
  })

  it('returns empty array when no characters resolve', () => {
    const refs = resolveFrameEditCharacterReferences({
      editingFrame: {
        kind: 'establishing',
        sceneIndex: 0,
        imageUrl: 'https://example.com/scene.jpg',
      },
      scene: { heading: 'EXT. PARK - DAY' },
      sceneIndex: 0,
      characters: [],
    })
    expect(refs).toEqual([])
  })
})

describe('resolveSegmentEditCharacterReferences', () => {
  it('resolves refs for all uncovered dialogue speakers in segment', () => {
    const refs = resolveSegmentEditCharacterReferences({
      segment: {
        dialogueLines: [
          { character: 'Marcus', covered: true },
          { character: 'Marcus', covered: false },
        ],
      },
      scene: {},
      sceneIndex: 0,
      characters: [marcus],
    })
    expect(refs).toHaveLength(1)
    expect(refs[0].identityImageUrl).toBe('https://example.com/marcus-portrait.jpg')
  })
})

describe('buildFrameEditReferenceImages', () => {
  it('builds prioritized character + prop refs from selection keys', () => {
    const characterReferences = [
      {
        characterName: 'Marcus',
        identityImageUrl: 'https://example.com/marcus-portrait.jpg',
        wardrobeImageUrl: 'https://example.com/marcus-turnaround.jpg',
      },
    ]
    const keys = new Set(frameEditReferenceKeys(characterReferences))
    const images = buildFrameEditReferenceImages({
      characterReferences,
      selectedKeys: keys,
      objectReferences: [{ id: 'p1', name: 'Briefcase', imageUrl: 'https://example.com/prop.jpg' }],
      selectedPropIds: ['p1'],
    })
    expect(images.length).toBeGreaterThanOrEqual(2)
    expect(images.some((i) => i.name?.toLowerCase().includes('identity'))).toBe(true)
    expect(images.some((i) => i.name?.toLowerCase().includes('wardrobe'))).toBe(true)
    expect(images.some((i) => i.propName === 'Briefcase')).toBe(true)
  })

  it('includes selected location stills', () => {
    const images = buildFrameEditReferenceImages({
      characterReferences: [],
      selectedKeys: new Set(),
      locationStills: [
        {
          id: 'loc-foyer',
          name: 'FOYER',
          imageUrl: 'https://example.com/foyer.png',
        },
        {
          id: 'loc-foyer::ver-door',
          name: 'FOYER — Exploded door',
          imageUrl: 'https://example.com/foyer-door.png',
        },
      ],
      selectedLocationIds: ['loc-foyer::ver-door'],
    })
    expect(images.some((i) => i.locationName?.includes('Exploded door'))).toBe(true)
    expect(images.some((i) => i.imageUrl === 'https://example.com/foyer-door.png')).toBe(true)
  })
})

describe('appendUseTheseReferencesClause', () => {
  it('names selected refs on the edit instruction', () => {
    const next = appendUseTheseReferencesClause('Make the lighting warmer', [
      { name: 'Identity reference 1: Marcus' },
      { name: 'Location reference 2: FOYER (extreme-wide establishing shot)' },
    ])
    expect(next).toContain('Make the lighting warmer')
    expect(next).toContain('Use these references:')
    expect(next).toContain('Marcus')
    expect(next).toContain('FOYER')
  })
})

describe('listFrameEditLocationStills', () => {
  it('lists base and version stills', () => {
    const stills = listFrameEditLocationStills([
      {
        id: 'loc-foyer',
        location: 'FOYER',
        locationDisplay: 'INT. FOYER - NIGHT',
        imageUrl: 'https://example.com/foyer.png',
        sourceSceneIndex: 0,
        sourceSceneHeading: 'INT. FOYER - NIGHT',
        pinnedAt: '2026-01-01T00:00:00.000Z',
        versions: [
          {
            id: 'ver-door',
            name: 'Exploded front door',
            stateNotes: 'Front door missing',
            imageUrl: 'https://example.com/door.png',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    ])
    expect(stills).toHaveLength(2)
    expect(stills.some((s) => s.kind === 'base' && s.id === 'loc-foyer')).toBe(true)
    expect(stills.some((s) => s.kind === 'version' && s.versionId === 'ver-door')).toBe(true)
  })
})

describe('listFrameEditCorrectionTargets', () => {
  const piper = {
    characterName: 'Piper Hayes',
    identityImageUrl: 'https://example.com/piper-id.jpg',
    wardrobeImageUrl: 'https://example.com/piper-wardrobe.jpg',
  }
  const gideon = {
    characterName: 'Gideon Croft',
    identityImageUrl: 'https://example.com/gideon-id.jpg',
    wardrobeImageUrl: 'https://example.com/gideon-wardrobe.jpg',
  }
  const locationStills = [
    { id: 'loc-tunnel', name: 'FREIGHT TUNNEL', imageUrl: 'https://example.com/tunnel.png' },
  ]
  const objectReferences = [
    { id: 'prop-spanner', name: 'iron spanner', imageUrl: 'https://example.com/spanner.png' },
  ]

  it('orders one target per character, then location, then prop', () => {
    const targets = listFrameEditCorrectionTargets({
      characterReferences: [piper, gideon],
      selectedKeys: [
        'identity:Piper Hayes',
        'wardrobe:Piper Hayes',
        'identity:Gideon Croft',
        'wardrobe:Gideon Croft',
      ],
      locationStills,
      selectedLocationIds: ['loc-tunnel'],
      objectReferences,
      selectedPropIds: ['prop-spanner'],
    })

    expect(targets.map((t) => `${t.kind}:${t.id}`)).toEqual([
      'character:Piper Hayes',
      'character:Gideon Croft',
      'location:loc-tunnel',
      'prop:prop-spanner',
    ])
  })

  it('names only that character in a character-step instruction', () => {
    const targets = listFrameEditCorrectionTargets({
      characterReferences: [piper, gideon],
      selectedKeys: ['identity:Piper Hayes', 'wardrobe:Piper Hayes'],
      locationStills,
      selectedLocationIds: ['loc-tunnel'],
    })
    const piperTarget = targets.find((t) => t.kind === 'character' && t.id === 'Piper Hayes')
    expect(piperTarget).toBeDefined()
    const instruction = buildFrameEditCorrectionInstruction(piperTarget!)
    expect(instruction).toContain('Piper Hayes')
    expect(instruction).not.toMatch(/FREIGHT TUNNEL|Gideon|location reference/i)
    expect(instruction).toMatch(/Leave every other person/i)
  })

  it('attaches only that character\'s images for a character step', () => {
    const targets = listFrameEditCorrectionTargets({
      characterReferences: [piper, gideon],
      selectedKeys: [
        'identity:Piper Hayes',
        'wardrobe:Piper Hayes',
        'identity:Gideon Croft',
        'wardrobe:Gideon Croft',
      ],
      locationStills,
      selectedLocationIds: ['loc-tunnel'],
      objectReferences,
      selectedPropIds: ['prop-spanner'],
    })
    const piperTarget = targets.find((t) => t.id === 'Piper Hayes')
    expect(piperTarget).toBeDefined()
    const images = buildFrameEditImagesForCorrectionTarget(piperTarget!, {
      characterReferences: [piper, gideon],
      objectReferences,
      locationStills,
    })
    expect(images.some((i) => i.characterName === 'Piper Hayes')).toBe(true)
    expect(images.some((i) => i.characterName === 'Gideon Croft')).toBe(false)
    expect(images.some((i) => i.locationName)).toBe(false)
    expect(images.some((i) => i.propName)).toBe(false)
  })
})
