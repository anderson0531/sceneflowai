import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  normalizeReferenceAdherenceBand,
  parseReferenceAdherenceResponse,
  referenceAdherenceIsBetter,
  selectReferenceAdherencePlates,
  shouldScoreReferenceAdherence,
} from '@/lib/imagen/referenceAdherence'

describe('selectReferenceAdherencePlates', () => {
  it('keeps the identity plate and a framed photograph, and drops the workbench', () => {
    const plates = selectReferenceAdherencePlates({
      identities: [
        { name: 'Gideon Croft', imageUrl: 'https://example.com/gideon.jpg' },
        { name: 'Piper Hayes', imageUrl: 'https://example.com/piper.jpg' },
      ],
      objects: [
        {
          name: 'Zinc workbench',
          description: 'Zinc workbench as handled in the script',
          imageUrl: 'https://example.com/bench.jpg',
        },
        {
          name: 'Framed Photo of Sarah',
          description: "Sarah is a beautiful white woman in her 50's",
          imageUrl: 'https://example.com/sarah.jpg',
        },
      ],
    })

    expect(plates).toEqual([
      { role: 'identity', name: 'Gideon Croft', imageUrl: 'https://example.com/gideon.jpg' },
      { role: 'picture', name: 'Framed Photo of Sarah', imageUrl: 'https://example.com/sarah.jpg' },
    ])
  })

  it('scores a handheld spanner and still drops the workbench', () => {
    const plates = selectReferenceAdherencePlates({
      identities: [{ name: 'Gideon Croft', imageUrl: 'https://example.com/gideon.jpg' }],
      objects: [
        {
          name: 'Zinc workbench',
          description: 'Zinc workbench as handled in the script',
          imageUrl: 'https://example.com/bench.jpg',
        },
        {
          name: 'Thirty-Inch Iron Rail Spanner',
          description: 'Thirty-Inch Iron Rail Spanner as handled in the script',
          imageUrl: 'https://example.com/spanner.jpg',
        },
      ],
    })

    expect(plates).toEqual([
      { role: 'identity', name: 'Gideon Croft', imageUrl: 'https://example.com/gideon.jpg' },
      {
        role: 'prop',
        name: 'Thirty-Inch Iron Rail Spanner',
        imageUrl: 'https://example.com/spanner.jpg',
      },
    ])
  })
})

describe('reference adherence bands', () => {
  it('ranks pass above drift above miss, and a tie is not better', () => {
    expect(referenceAdherenceIsBetter('pass', 'miss')).toBe(true)
    expect(referenceAdherenceIsBetter('pass', 'drift')).toBe(true)
    expect(referenceAdherenceIsBetter('drift', 'miss')).toBe(true)
    expect(referenceAdherenceIsBetter('miss', 'miss')).toBe(false)
    expect(referenceAdherenceIsBetter('drift', 'pass')).toBe(false)
  })

  it('scores Frame Agent finals and skips Express drafts', () => {
    expect(
      shouldScoreReferenceAdherence({ skipLikenessValidation: true, storyboardQuality: 'final' })
    ).toBe(true)
    expect(
      shouldScoreReferenceAdherence({ skipLikenessValidation: true, storyboardQuality: 'draft' })
    ).toBe(false)
    expect(shouldScoreReferenceAdherence({ skipLikenessValidation: false, storyboardQuality: 'draft' })).toBe(
      true
    )
  })
})

describe('parseReferenceAdherenceResponse', () => {
  it('accepts a miss and a drifted alias', () => {
    expect(normalizeReferenceAdherenceBand('MISS')).toBe('miss')
    expect(normalizeReferenceAdherenceBand('partial')).toBe('drift')
    expect(
      parseReferenceAdherenceResponse({
        band: 'miss',
        reason: 'Sarah is standing in the room.',
      })
    ).toEqual({ band: 'miss', reason: 'Sarah is standing in the room.' })
  })

  it('returns nothing when the band is missing', () => {
    expect(parseReferenceAdherenceResponse({ reason: 'unclear' })).toBeUndefined()
    expect(parseReferenceAdherenceResponse(null)).toBeUndefined()
  })
})

describe('reference adherence wiring', () => {
  it('scores finals that skip face likeness, and resamples a miss once', () => {
    const route = readFileSync(join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'), 'utf8')
    expect(route).toContain('shouldScoreReferenceAdherence')
    expect(route).toContain('Skipping reference adherence — Express draft')
    expect(route).toContain('Reference adherence ${referenceAdherence.band}; sampling once more')
    expect(route).toContain('referenceAdherenceIsBetter')
    expect(route).toContain('referenceResampleRound === 0')
    expect(route).toContain("referenceStatus: referenceAdherence?.band ?? 'unchecked'")
    expect(route).toContain('Skipping likeness validation — skipLikenessValidation')
  })
})
