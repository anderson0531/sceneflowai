import { describe, it, expect } from 'vitest'
import {
  resolveFrameEditCharacterReferences,
  resolveSegmentEditCharacterReferences,
  frameEditReferenceKeys,
  buildFrameEditReferenceImages,
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
})
