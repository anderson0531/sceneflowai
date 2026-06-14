import { describe, expect, it } from 'vitest'
import {
  beatActionNeedsHairCompositionLock,
  buildCharacterHairAnchor,
  buildHairCompositionLock,
  buildHairStyleNegativeTerms,
  extractHairStyleFromAppearance,
} from '@/lib/character/characterReferenceAssembly'

describe('buildCharacterHairAnchor', () => {
  it('builds anchor from structured hair fields', () => {
    expect(
      buildCharacterHairAnchor({
        hairStyle: 'swept back ponytail',
        hairColor: 'dark auburn',
      })
    ).toBe('dark auburn swept back ponytail hair matching identity reference')
  })

  it('extracts hair from appearance when structured fields are missing', () => {
    expect(
      buildCharacterHairAnchor({
        appearanceDescription:
          'A woman in her early 30s with dark auburn swept-back ponytail and intense gaze.',
      })
    ).toBe('dark auburn swept-back hair matching identity reference')
  })

  it('returns undefined when no hair metadata exists', () => {
    expect(buildCharacterHairAnchor({ appearanceDescription: 'Calm expression.' })).toBeUndefined()
  })
})

describe('extractHairStyleFromAppearance', () => {
  it('detects ponytail and loose waves', () => {
    expect(extractHairStyleFromAppearance('She wears her hair in a high ponytail.')).toBe(
      'high ponytail'
    )
    expect(extractHairStyleFromAppearance('Long loose waves frame her face.')).toBe('loose waves')
  })
})

describe('buildHairCompositionLock', () => {
  it('detects injury beats and returns a composition lock', () => {
    expect(
      beatActionNeedsHairCompositionLock(
        'Close-up of her face with a purplish bruise forming on her left temple.'
      )
    ).toBe(true)

    expect(
      buildHairCompositionLock(
        'purplish bruise forming on her left temple',
        ['person [1]']
      )
    ).toContain('do not pull hair back')
    expect(
      buildHairCompositionLock(
        'purplish bruise forming on her left temple',
        ['person [1]']
      )
    ).toContain('person [1]')
  })

  it('returns undefined for non-injury beats', () => {
    expect(buildHairCompositionLock('She smiles warmly at the detective.')).toBeUndefined()
  })
})

describe('buildHairStyleNegativeTerms', () => {
  it('adds pulled-back negatives for loose styles', () => {
    const terms = buildHairStyleNegativeTerms('loose waves', 'dark brown loose waves hair')
    expect(terms).toContain('different hairstyle')
    expect(terms).toContain('hair pulled back')
  })

  it('adds loose-hair negatives for pulled-back styles', () => {
    const terms = buildHairStyleNegativeTerms('swept back ponytail')
    expect(terms).toContain('loose hair covering forehead')
  })
})
