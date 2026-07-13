import { describe, expect, it } from 'vitest'
import {
  MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
  buildPropReferenceMappingLines,
  buildSubjectCountGuardrail,
  getMaxReferenceImagesForTier,
  prioritizeReferenceImages,
  remapReferenceNumbersInPrompt,
  resolveEffectiveImageTier,
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

  it('getMaxReferenceImagesForTier returns eco=3 and pro=14', () => {
    expect(getMaxReferenceImagesForTier('eco')).toBe(3)
    expect(getMaxReferenceImagesForTier('designer')).toBe(14)
    expect(getMaxReferenceImagesForTier('director')).toBe(14)
  })

  it('resolveEffectiveImageTier upgrades eco whenever any reference is wanted', () => {
    expect(
      resolveEffectiveImageTier({
        modelTier: 'eco',
        distinctCharacterCount: 2,
        totalWantedRefs: 4,
      })
    ).toBe('designer')
    expect(
      resolveEffectiveImageTier({
        modelTier: 'eco',
        distinctCharacterCount: 1,
        totalWantedRefs: 4,
      })
    ).toBe('designer')
    expect(
      resolveEffectiveImageTier({
        modelTier: 'eco',
        distinctCharacterCount: 1,
        totalWantedRefs: 3,
      })
    ).toBe('designer')
    expect(
      resolveEffectiveImageTier({
        modelTier: 'eco',
        distinctCharacterCount: 1,
        totalWantedRefs: 1,
      })
    ).toBe('designer')
    expect(
      resolveEffectiveImageTier({
        modelTier: 'eco',
        distinctCharacterCount: 0,
        totalWantedRefs: 0,
      })
    ).toBe('eco')
    expect(
      resolveEffectiveImageTier({
        modelTier: 'designer',
        distinctCharacterCount: 2,
        totalWantedRefs: 10,
      })
    ).toBe('designer')
  })

  it('buildSubjectCountGuardrail lists contiguous person tokens', () => {
    const guardrail = buildSubjectCountGuardrail([
      { characterName: 'Elara Vance', subjectOrdinal: 1 },
      { characterName: 'Marcus Thorne', subjectOrdinal: 2 },
    ])
    expect(guardrail).toMatch(/^SUBJECT COUNT: EXACTLY 2 people/)
    expect(guardrail).toContain('person [1] (Elara Vance)')
    expect(guardrail).toContain('person [2] (Marcus Thorne)')
    expect(guardrail).toContain('NOT additional people')
  })

  it('buildPropReferenceMappingLines emits one Ref Image line per prop with indices', () => {
    const mapping = buildPropReferenceMappingLines([
      { propName: 'Tiny lapel camera', sendIndex: 4 },
      { propName: 'Coffee mug', sendIndex: 5 },
    ])
    expect(mapping).toContain('PROP REFERENCES (2):')
    expect(mapping).toContain(
      '- PROP REFERENCE (Ref Image [4]): Tiny lapel camera — Extract shape, material, color, and design of the named prop only.'
    )
    expect(mapping).toContain(
      '- PROP REFERENCE (Ref Image [5]): Coffee mug — Extract shape, material, color, and design of the named prop only.'
    )
  })

  it('buildPropReferenceMappingLines returns empty string when no valid props', () => {
    expect(buildPropReferenceMappingLines([])).toBe('')
    expect(buildPropReferenceMappingLines([{ propName: 'Mug' }])).toBe('')
    expect(buildPropReferenceMappingLines([{ sendIndex: 3 }])).toBe('')
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

  it('selectReferenceImagesInOrder with groupByRole groups identities before wardrobes', () => {
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

    const { selected, indexMap } = selectReferenceImagesInOrder(refs, 8, { groupByRole: true })

    expect(selected.map((r) => r.refRole)).toEqual([
      'identity',
      'identity',
      'wardrobe',
      'wardrobe',
      undefined,
      undefined,
      undefined,
      undefined,
    ])
    expect(selected[0].characterName).toBe('Elara Vance')
    expect(selected[1].characterName).toBe('Marcus Thorne')
    expect(selected[0].sendIndex).toBe(1)
    expect(selected[1].sendIndex).toBe(2)
    expect(selected[2].sendIndex).toBe(3)
    expect(selected[3].sendIndex).toBe(4)

    expect(indexMap.get(1)).toBe(1)
    expect(indexMap.get(3)).toBe(2)
    expect(indexMap.get(2)).toBe(3)
    expect(indexMap.get(4)).toBe(4)
  })

  it('remapReferenceNumbersInPrompt preserves stable subject ordinals in person tokens', () => {
    const indexMap = new Map<number, number | null>([
      [1, 1],
      [2, 3],
      [3, 2],
      [4, 4],
    ])

    const output = remapReferenceNumbersInPrompt(
      'Wide shot with person [1] and person [2] in frame.',
      indexMap
    )

    expect(output).toContain('person [1]')
    expect(output).toContain('person [2]')
    expect(output).not.toContain('person [3]')
  })

  it('remapReferenceNumbersInPrompt removes lines for dropped reference indices', () => {
    const indexMap = new Map<number, number | null>([
      [1, 1],
      [2, 2],
      [16, null],
    ])

    const input = [
      '- SUBJECT REFERENCE (Ref Image [1]): Identity',
      '- WARDROBE REFERENCE (Ref Image [2]): Outfit',
      '- LOCATION REFERENCE (Ref Image [16]): Apartment establishing shot',
      'Medium shot with person [1] in the apartment.',
    ].join('\n')

    const output = remapReferenceNumbersInPrompt(input, indexMap)

    expect(output).toContain('Ref Image [1]')
    expect(output).toContain('Ref Image [2]')
    expect(output).not.toContain('Ref Image [16]')
    expect(output).not.toContain('LOCATION REFERENCE')
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
