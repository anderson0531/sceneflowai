import { describe, it, expect } from 'vitest'
import { resolveBeatVideoReferences } from '@/lib/vision/resolveBeatVideoReferences'
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
    expect(resolved.labeledRefs.some((r) => r.name.includes('Elara'))).toBe(true)
    expect(resolved.labeledRefs.some((r) => r.role === 'location')).toBe(true)
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
})
