import { describe, expect, it } from 'vitest'
import {
  MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
  prioritizeReferenceImages,
  type PrioritizedReferenceImage,
} from '@/lib/vision/referenceLimits'

function ref(
  role: PrioritizedReferenceImage['role'],
  name: string,
  importance?: string
): PrioritizedReferenceImage {
  return {
    role,
    name,
    imageUrl: `https://example.com/${name.replace(/\s+/g, '-').toLowerCase()}.jpg`,
    importance,
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
})
