import { describe, expect, it } from 'vitest'
import { refsToOmniReferenceImages } from '@/lib/gemini/buildOmniVideoReferencePrompt'
import {
  normalizeReferenceImages,
  shouldRelabelRefs,
  veoRefsToPrioritized,
  filterRefsForPolicyRetry,
} from '@/lib/video/normalizeReferenceImages'

describe('normalizeReferenceImages', () => {
  it('preserves name and role on structured refs', () => {
    const normalized = normalizeReferenceImages([
      {
        url: 'https://example.com/elara.jpg',
        type: 'character',
        name: 'Identity reference 1: Elara Vance',
        role: 'identity',
      },
    ])

    expect(normalized).toEqual([
      {
        url: 'https://example.com/elara.jpg',
        type: 'character',
        name: 'Identity reference 1: Elara Vance',
        role: 'identity',
      },
    ])
  })

  it('coerces bare string URLs without name or role', () => {
    const normalized = normalizeReferenceImages(['https://example.com/ref.jpg'])
    expect(normalized).toEqual([
      { url: 'https://example.com/ref.jpg', type: 'character' },
    ])
  })
})

describe('veoRefsToPrioritized', () => {
  it('preserves provided name and role', () => {
    const prioritized = veoRefsToPrioritized([
      {
        url: 'https://example.com/wardrobe.jpg',
        type: 'character',
        name: 'Elara Vance — Tech-Savvy Casual — Distressed',
        role: 'wardrobe',
      },
    ])

    expect(prioritized[0].name).toBe('Elara Vance — Tech-Savvy Casual — Distressed')
    expect(prioritized[0].role).toBe('wardrobe')
  })

  it('falls back to Reference N when name is absent', () => {
    const prioritized = veoRefsToPrioritized([
      { url: 'https://example.com/a.jpg', type: 'character' },
      { url: 'https://example.com/b.jpg', type: 'style' },
    ])

    expect(prioritized[0].name).toBe('Reference 1')
    expect(prioritized[1].name).toBe('Reference 2')
    expect(prioritized[0].role).toBe('identity')
    expect(prioritized[1].role).toBe('location')
  })
})

describe('shouldRelabelRefs', () => {
  it('returns true when refs are empty or undefined', () => {
    expect(shouldRelabelRefs(undefined)).toBe(true)
    expect(shouldRelabelRefs([])).toBe(true)
  })

  it('returns true when every ref is a bare URL or lacks name', () => {
    expect(shouldRelabelRefs(['https://example.com/a.jpg'])).toBe(true)
    expect(
      shouldRelabelRefs([
        { url: 'https://example.com/a.jpg', type: 'character' },
        { url: 'https://example.com/b.jpg', type: 'style', name: '   ' },
      ])
    ).toBe(true)
  })

  it('returns false when at least one ref has a non-empty name', () => {
    expect(
      shouldRelabelRefs([
        { url: 'https://example.com/a.jpg', type: 'character' },
        {
          url: 'https://example.com/b.jpg',
          type: 'character',
          name: 'Identity reference 1: Elara Vance',
        },
      ])
    ).toBe(false)
  })
})

describe('labeled refs reach Omni payloads', () => {
  it('maps client labeled refs to descriptive Omni labels, not Reference N', () => {
    const normalized = normalizeReferenceImages([
      {
        url: 'https://example.com/elara.jpg',
        type: 'character',
        name: 'Identity reference 1: Elara Vance',
        role: 'identity',
      },
      {
        url: 'https://example.com/wardrobe.jpg',
        type: 'character',
        name: 'Elara Vance — Tech-Savvy Casual — Distressed',
        role: 'wardrobe',
      },
      {
        url: 'https://example.com/station.jpg',
        type: 'style',
        name: 'Location reference 3: POLICE STATION',
        role: 'location',
      },
    ])
    const omniRefs = refsToOmniReferenceImages(veoRefsToPrioritized(normalized!))

    expect(omniRefs.map((r) => r.label)).toEqual([
      'Identity reference 1: Elara Vance',
      'Elara Vance — Tech-Savvy Casual — Distressed',
      'Location reference 3: POLICE STATION',
    ])
    expect(omniRefs.every((r) => !/^Reference \d+$/.test(r.label))).toBe(true)
  })
})

describe('filterRefsForPolicyRetry', () => {
  it('keeps identity and location refs and drops props in core mode', () => {
    const refs = [
      { url: 'https://example.com/id.png', label: 'Identity reference 1: Elara', role: 'identity' as const },
      { url: 'https://example.com/prop.png', label: 'Prop reference 2: Folder', role: 'prop-important' as const },
      { url: 'https://example.com/loc.png', label: 'Location reference 3: Kitchen', role: 'location' as const },
    ]
    const filtered = filterRefsForPolicyRetry(refs, 'core')
    expect(filtered?.map((r) => r.role)).toEqual(['identity', 'location'])
  })
})
