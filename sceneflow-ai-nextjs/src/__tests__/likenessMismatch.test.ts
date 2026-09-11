import { describe, expect, it } from 'vitest'
import {
  classifyShotScale,
  faceIsAssessableAtScale,
  isHardIdentityMismatch,
  normalizeMismatchKind,
  resolveLikenessMismatchKind,
} from '@/lib/imagen/likenessMismatch'

describe('classifyShotScale', () => {
  it('reads the common framing vocabulary', () => {
    expect(classifyShotScale('close-up')).toBe('close')
    expect(classifyShotScale('Extreme Close Up')).toBe('close')
    expect(classifyShotScale('medium shot')).toBe('medium')
    expect(classifyShotScale('over-the-shoulder')).toBe('medium')
    expect(classifyShotScale('wide establishing shot')).toBe('wide')
    expect(classifyShotScale('full-body')).toBe('wide')
    expect(classifyShotScale('')).toBe('unknown')
    expect(classifyShotScale(undefined)).toBe('unknown')
    expect(classifyShotScale('canted push-in')).toBe('unknown')
  })

  it('treats a medium close-up as close and a medium wide as wide', () => {
    expect(classifyShotScale('medium close-up')).toBe('close')
    expect(classifyShotScale('medium wide shot')).toBe('wide')
  })

  it('reports where facial structure carries evidence', () => {
    expect(faceIsAssessableAtScale('close')).toBe(true)
    expect(faceIsAssessableAtScale('medium')).toBe(true)
    expect(faceIsAssessableAtScale('unknown')).toBe(true)
    expect(faceIsAssessableAtScale('wide')).toBe(false)
  })
})

describe('normalizeMismatchKind', () => {
  it('accepts the canonical values and common phrasings', () => {
    expect(normalizeMismatchKind('identity')).toBe('identity')
    expect(normalizeMismatchKind('Different Person')).toBe('identity')
    expect(normalizeMismatchKind('soft')).toBe('surface')
    expect(normalizeMismatchKind('not assessable')).toBe('indeterminate')
    expect(normalizeMismatchKind('match')).toBe('none')
  })

  it('rejects anything it does not recognise', () => {
    expect(normalizeMismatchKind('')).toBeUndefined()
    expect(normalizeMismatchKind('mostly fine')).toBeUndefined()
    expect(normalizeMismatchKind(42)).toBeUndefined()
    expect(normalizeMismatchKind(null)).toBeUndefined()
  })
})

describe('resolveLikenessMismatchKind', () => {
  it('prefers the kind the validator reported', () => {
    expect(
      resolveLikenessMismatchKind({ matches: false, confidence: 10, mismatchKind: 'surface' })
    ).toBe('surface')
    expect(
      resolveLikenessMismatchKind({ matches: true, confidence: 95, mismatchKind: 'identity' })
    ).toBe('identity')
  })

  it('derives from confidence when no kind was reported', () => {
    expect(resolveLikenessMismatchKind({ matches: false, confidence: 30 })).toBe('identity')
    expect(resolveLikenessMismatchKind({ matches: false, confidence: 49 })).toBe('identity')
    expect(resolveLikenessMismatchKind({ matches: false, confidence: 50 })).toBe('surface')
    expect(resolveLikenessMismatchKind({ matches: false, confidence: 70 })).toBe('surface')
    expect(resolveLikenessMismatchKind({ matches: true, confidence: 90 })).toBe('none')
  })

  it('treats a skin-tone mismatch as a substitution at any distance', () => {
    expect(
      resolveLikenessMismatchKind({
        matches: false,
        confidence: 65,
        ethnicityMatch: false,
        shotScale: 'wide',
      })
    ).toBe('identity')
  })

  it('does not convict on facial structure the shot could not resolve', () => {
    expect(
      resolveLikenessMismatchKind({
        matches: false,
        confidence: 35,
        facialMatch: false,
        ethnicityMatch: true,
        shotScale: 'wide',
      })
    ).toBe('indeterminate')

    expect(
      resolveLikenessMismatchKind({
        matches: false,
        confidence: 35,
        facialMatch: false,
        ethnicityMatch: true,
        shotScale: 'close',
      })
    ).toBe('identity')
  })

  it('respects an explicit unassessable face', () => {
    expect(
      resolveLikenessMismatchKind({ matches: false, confidence: 20, faceAssessable: false })
    ).toBe('indeterminate')
    expect(
      resolveLikenessMismatchKind({
        matches: false,
        confidence: 20,
        faceAssessable: false,
        ethnicityMatch: false,
      })
    ).toBe('identity')
  })

  it('calls a missing confidence indeterminate rather than a failure', () => {
    expect(resolveLikenessMismatchKind({ matches: false })).toBe('indeterminate')
    expect(resolveLikenessMismatchKind({ matches: false, confidence: null })).toBe('indeterminate')
  })
})

describe('isHardIdentityMismatch', () => {
  it('is the only gate a regeneration passes through', () => {
    expect(isHardIdentityMismatch({ matches: false, confidence: 30, mismatchKind: 'identity' })).toBe(
      true
    )
    expect(isHardIdentityMismatch({ matches: false, confidence: 70, mismatchKind: 'surface' })).toBe(
      false
    )
    expect(
      isHardIdentityMismatch({ matches: false, confidence: 0, mismatchKind: 'indeterminate' })
    ).toBe(false)
    expect(isHardIdentityMismatch(undefined)).toBe(false)
  })
})
