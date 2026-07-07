import { describe, expect, it } from 'vitest'
import {
  MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
  prioritizeReferenceImages,
  remapReferenceNumbersInPrompt,
  selectReferenceImagesInOrder,
  type PrioritizedReferenceImage,
} from '@/lib/vision/referenceLimits'

function ref(
  role: PrioritizedReferenceImage['role'],
  name: string,
  importance?: string,
  extra?: Partial<PrioritizedReferenceImage>
): PrioritizedReferenceImage {
  return {
    role,
    name,
    imageUrl: `https://example.com/${name.replace(/\s+/g, '-').toLowerCase()}.jpg`,
    importance,
    ...extra,
  }
}

describe('referenceLimits', () => {
  it('exports cap of 8 reference images', () => {
    expect(MAX_VERTEX_GEMINI_REFERENCE_IMAGES).toBe(8)
  })

  it('prioritizes identity, wardrobe, location, then props by importance', () => {
    const refs = [
      ref('prop-other', 'Prop D'),
      ref('prop-important', 'Prop B', 'important'),
      ref('location', 'Location A'),
      ref('wardrobe', 'Wardrobe Elara'),
      ref('prop-critical', 'Prop C', 'critical'),
      ref('identity', 'Identity Elara'),
      ref('prop-other', 'Prop E'),
      ref('prop-important', 'Prop F', 'important'),
      ref('prop-other', 'Prop G'),
    ]

    const { selected, dropped } = prioritizeReferenceImages(refs)

    expect(selected.map((r) => r.name)).toEqual([
      'Identity Elara',
      'Wardrobe Elara',
      'Location A',
      'Prop C',
      'Prop B',
      'Prop F',
      'Prop D',
      'Prop E',
    ])
    expect(dropped.map((r) => r.name)).toEqual(['Prop G'])
  })

  it('keeps all refs when under the cap', () => {
    const refs = [ref('identity', 'Identity A'), ref('location', 'Location B')]
    const { selected, dropped } = prioritizeReferenceImages(refs)
    expect(selected).toHaveLength(2)
    expect(dropped).toHaveLength(0)
  })

  it('respects custom max count', () => {
    const refs = [
      ref('identity', 'Identity A'),
      ref('wardrobe', 'Wardrobe A'),
      ref('location', 'Location A'),
      ref('prop-critical', 'Prop A', 'critical'),
    ]
    const { selected, dropped } = prioritizeReferenceImages(refs, 2)
    expect(selected.map((r) => r.role)).toEqual(['identity', 'wardrobe'])
    expect(dropped).toHaveLength(2)
  })

  it('selectReferenceImagesInOrder preserves assembly order for dual-character scene', () => {
    const refs = [
      ref('identity', 'Identity reference 1: Elara Vance', undefined, {
        provisionalIndex: 1,
        characterName: 'Elara Vance',
        refRole: 'identity',
        imageUrl: 'https://example.com/elara-identity.jpg',
      }),
      ref('wardrobe', 'Wardrobe reference 2: Elara Vance (full-body outfit)', undefined, {
        provisionalIndex: 2,
        characterName: 'Elara Vance',
        refRole: 'wardrobe',
        imageUrl: 'https://example.com/elara-wardrobe.jpg',
      }),
      ref('identity', 'Identity reference 3: Marcus Thorne', undefined, {
        provisionalIndex: 3,
        characterName: 'Marcus Thorne',
        refRole: 'identity',
        imageUrl: 'https://example.com/marcus-identity.jpg',
      }),
      ref('wardrobe', 'Wardrobe reference 4: Marcus Thorne (full-body outfit)', undefined, {
        provisionalIndex: 4,
        characterName: 'Marcus Thorne',
        refRole: 'wardrobe',
        imageUrl: 'https://example.com/marcus-wardrobe.jpg',
      }),
      ref('location', 'Location reference 10: Office', undefined, {
        provisionalIndex: 10,
        locationName: "MARCUS THORNE'S OFFICE",
        imageUrl: 'https://example.com/office.jpg',
      }),
      ref('prop-critical', 'Prop reference 5: EMP', 'critical', {
        provisionalIndex: 5,
        propName: "Elara's EMP / Hacking Device",
        imageUrl: 'https://example.com/emp.jpg',
      }),
      ref('prop-important', 'Prop reference 6: Chip', 'important', {
        provisionalIndex: 6,
        propName: 'OmniCorp Encrypted Data Chip',
        imageUrl: 'https://example.com/chip.jpg',
      }),
      ref('prop-important', 'Prop reference 7: Tablet', 'important', {
        provisionalIndex: 7,
        propName: 'Transparent Tablet',
        imageUrl: 'https://example.com/tablet.jpg',
      }),
      ref('prop-other', 'Prop reference 8: Scanner', undefined, {
        provisionalIndex: 8,
        propName: "Elara's Biometric Scanner",
        imageUrl: 'https://example.com/scanner.jpg',
      }),
      ref('prop-other', 'Prop reference 9: Folder', undefined, {
        provisionalIndex: 9,
        propName: 'False Evidence Folder',
        imageUrl: 'https://example.com/folder.jpg',
      }),
    ]

    const { selected, dropped, indexMap } = selectReferenceImagesInOrder(refs)

    expect(selected).toHaveLength(8)
    expect(dropped).toHaveLength(2)
    expect(dropped.map((r) => r.provisionalIndex)).toEqual([8, 9])

    expect(selected.map((r) => r.sendIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(selected.map((r) => r.characterName ?? r.propName ?? r.locationName)).toEqual([
      'Elara Vance',
      'Elara Vance',
      'Marcus Thorne',
      'Marcus Thorne',
      "MARCUS THORNE'S OFFICE",
      "Elara's EMP / Hacking Device",
      'OmniCorp Encrypted Data Chip',
      'Transparent Tablet',
    ])

    expect(indexMap.get(1)).toBe(1)
    expect(indexMap.get(2)).toBe(2)
    expect(indexMap.get(3)).toBe(3)
    expect(indexMap.get(4)).toBe(4)
    expect(indexMap.get(10)).toBe(5)
    expect(indexMap.get(5)).toBe(6)
    expect(indexMap.get(8)).toBeNull()
    expect(indexMap.get(9)).toBeNull()
  })

  it('remapReferenceNumbersInPrompt updates person and Refs tokens', () => {
    const indexMap = new Map<number, number | null>([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [10, 5],
      [8, null],
      [9, null],
    ])

    const input =
      'Wide shot with person [1] and person [3], using Refs 1-4, 10. Prop ref 8 omitted.'
    const output = remapReferenceNumbersInPrompt(input, indexMap)

    expect(output).toContain('person [1]')
    expect(output).toContain('person [3]')
    expect(output).toContain('Refs 1, 2, 3, 4, 5')
    expect(output).not.toContain('ref 8')
  })
})
