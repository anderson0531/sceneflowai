import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  normalizeReferenceAdherenceBand,
  parseReferenceAdherenceResponse,
  referenceAdherenceIsBetter,
  referenceResampleFailureKeepsFirst,
  selectReferenceAdherencePlates,
  shouldResampleReferenceAdherence,
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

describe('shouldResampleReferenceAdherence', () => {
  it('does not spend a second Vertex call on an Express fail-fast miss', () => {
    expect(
      shouldResampleReferenceAdherence({
        failFast: true,
        band: 'miss',
        resampleRound: 0,
        likenessRound: 0,
        canRetry: true,
      })
    ).toBe(false)
    expect(
      shouldResampleReferenceAdherence({
        failFast: false,
        band: 'miss',
        resampleRound: 0,
        likenessRound: 0,
        canRetry: true,
      })
    ).toBe(true)
    expect(
      shouldResampleReferenceAdherence({
        failFast: false,
        band: 'pass',
        resampleRound: 0,
        likenessRound: 0,
        canRetry: true,
      })
    ).toBe(false)
  })

  it('keeps the uploaded still when a resample throws and the client did not abort', () => {
    expect(
      referenceResampleFailureKeepsFirst({
        resampleRound: 1,
        hasFirstSample: true,
        aborted: false,
      })
    ).toBe(true)
    expect(
      referenceResampleFailureKeepsFirst({
        resampleRound: 1,
        hasFirstSample: true,
        aborted: true,
      })
    ).toBe(false)
    expect(
      referenceResampleFailureKeepsFirst({
        resampleRound: 0,
        hasFirstSample: false,
        aborted: false,
      })
    ).toBe(false)
  })
})

describe('reference adherence wiring', () => {
  it('does not score or resample a still after it has uploaded', () => {
    const route = readFileSync(join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'), 'utf8')
    expect(route).not.toContain('shouldScoreReferenceAdherence')
    expect(route).not.toContain('shouldResampleReferenceAdherence')
    expect(route).not.toContain('scoreReferenceAdherence')
    expect(route).not.toContain('validateCharacterLikeness')
    expect(route).not.toContain('referenceResampleFailureKeepsFirst')
    expect(route).toContain('skipLikenessValidation')
    expect(route).toContain('The uploaded still is the result')
  })

  it('threads the plate band from the image route through Express persist', () => {
    const client = readFileSync(join(process.cwd(), 'src/lib/sceneGeneration/generateImage.ts'), 'utf8')
    const orchestrator = readFileSync(
      join(process.cwd(), 'src/lib/sceneGeneration/expressOrchestrator.ts'),
      'utf8'
    )
    expect(client).toContain('referenceStatus')
    expect(client).toContain('referenceReason')
    expect(orchestrator).toContain('referenceStatus: result.referenceStatus')
    expect(orchestrator).toContain('referenceReason: result.referenceReason')
  })
})
