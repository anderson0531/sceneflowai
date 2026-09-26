import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  normalizeReferenceAdherenceBand,
  parseReferenceAdherenceResponse,
  selectReferenceAdherencePlates,
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
  it('skips the check for Express and records the band on success', () => {
    const route = readFileSync(join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'), 'utf8')
    expect(route).toContain('Skipping reference adherence — skipLikenessValidation')
    expect(route).toContain('referenceStatus: referenceAdherence?.band ?? \'unchecked\'')
    expect(route).toContain('Skipping likeness validation — skipLikenessValidation')
  })
})
