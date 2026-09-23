import { describe, it, expect } from 'vitest'
import { resolveBeatElementSelection, resolveBeatVideoReferences, shouldReplaceClientVideoReferences } from '@/lib/vision/resolveBeatVideoReferences'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { LocationReference } from '@/types/visionReferences'

const characters = [
  {
    id: 'c1',
    name: 'Elara Vance',
    referenceImage: 'https://blob.example/elara.jpg',
    wardrobes: [
      {
        id: 'w1',
        name: 'Casual',
        fullBodyUrl: 'https://blob.example/elara-wardrobe.jpg',
        isDefault: true,
      },
    ],
  },
]

const locations: LocationReference[] = [
  {
    id: 'loc-kitchen',
    location: 'KITCHEN',
    imageUrl: 'https://blob.example/kitchen.jpg',
  },
]

const objects = [
  {
    id: 'prop-mug',
    name: 'Coffee Mug',
    imageUrl: 'https://blob.example/mug.jpg',
    importance: 'important' as const,
    category: 'prop' as const,
  },
]

describe('resolveBeatVideoReferences', () => {
  it('resolves character, wardrobe, location, and prop refs for a dialogue beat', () => {
    const beat: SceneBeat = {
      beatId: 'beat-1',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: 'Elara Vance',
      line: 'This coffee is perfect.',
      lineId: 'line-1',
    }
    const scene = {
      heading: 'INT. KITCHEN - DAY',
      action: 'Elara sips from her coffee mug.',
      beats: [beat],
    }

    const resolved = resolveBeatVideoReferences({
      scene,
      beat,
      projectCharacters: characters,
      locationReferences: locations,
      objectReferences: objects,
    })

    expect(resolved.urlList.length).toBeGreaterThanOrEqual(2)
    expect(resolved.urlList).toContain('https://blob.example/elara.jpg')
    expect(resolved.urlList).toContain('https://blob.example/elara-wardrobe.jpg')
    expect(resolved.labeledRefs.some((r) => r.name.includes('Elara'))).toBe(true)
    expect(resolved.labeledRefs.some((r) => r.role === 'location')).toBe(true)

    const elements = resolveBeatElementSelection({
      scene,
      beat,
      projectCharacters: characters,
      locationReferences: locations,
      objectReferences: objects,
    })
    expect(elements.characterIds.length).toBeGreaterThan(0)
    expect(elements.locationRefId).toBe('loc-kitchen')
  })

  it('respects max reference cap', () => {
    const manyChars = Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`,
      name: `Character ${i}`,
      referenceImage: `https://blob.example/c${i}.jpg`,
    }))
    const beat: SceneBeat = {
      beatId: 'beat-2',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Character 0 and Character 1 talk while Character 2 enters.',
    }
    const scene = {
      heading: 'INT. KITCHEN - DAY',
      beats: [beat],
    }

    const resolved = resolveBeatVideoReferences({
      scene,
      beat,
      projectCharacters: manyChars,
      locationReferences: locations,
      objectReferences: objects,
    })

    expect(resolved.refs.length).toBeLessThanOrEqual(8)
  })

  it('keeps the identity image when a wardrobe sheet is also stored', () => {
    const beat: SceneBeat = {
      beatId: 'beat-sheet',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara Vance watches the engine.',
    }
    const resolved = resolveBeatVideoReferences({
      scene: { heading: 'INT. KITCHEN - DAY', beats: [beat] },
      beat,
      projectCharacters: [
        {
          ...characters[0],
          wardrobes: [
            {
              id: 'w-sheet',
              name: 'Sheet',
              combinedCharacterRefUrl: 'https://blob.example/elara-sheet.jpg',
              isDefault: true,
            },
          ],
        },
      ],
      locationReferences: locations,
      objectReferences: objects,
    })

    expect(resolved.urlList).toContain('https://blob.example/elara.jpg')
    expect(resolved.urlList).not.toContain('https://blob.example/elara-sheet.jpg')
  })

  it('sends the user reference selection instead of whoever the prose names', () => {
    const beat: SceneBeat = {
      beatId: 'beat-user-ref',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: 'Elara Vance',
      line: 'This coffee is perfect.',
      referenceSelection: {
        characterIds: ['c2'],
        objectRefIds: [],
        locationRefId: null,
        source: 'user',
        resolvedAt: '2026-09-23T00:00:00.000Z',
      },
    }
    const resolved = resolveBeatVideoReferences({
      scene: { heading: 'INT. KITCHEN - DAY', beats: [beat] },
      beat,
      projectCharacters: [
        ...characters,
        {
          id: 'c2',
          name: 'Marcus Hale',
          referenceImage: 'https://blob.example/marcus.jpg',
        },
      ],
      locationReferences: locations,
      objectReferences: objects,
    })

    expect(resolved.urlList).toContain('https://blob.example/marcus.jpg')
    expect(resolved.urlList).not.toContain('https://blob.example/elara.jpg')
    expect(
      shouldReplaceClientVideoReferences(beat, [
        {
          url: 'https://blob.example/elara-wardrobe.jpg',
          type: 'character',
          name: 'Elara wardrobe',
        },
      ])
    ).toBe(true)
    expect(
      shouldReplaceClientVideoReferences(
        { ...beat, referenceSelection: undefined },
        [
          {
            url: 'https://blob.example/elara.jpg',
            type: 'character',
            name: 'Elara Vance',
          },
        ]
      )
    ).toBe(false)
  })
})
