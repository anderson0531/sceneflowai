import { describe, it, expect } from 'vitest'
import {
  validateConceptDescription,
  parseConceptRefineResult,
} from '@/lib/blueprint/refineConcept'
import { defaultFormatForIntent } from '@/lib/content/contentIntent'

describe('validateConceptDescription', () => {
  it('flags too-short descriptions', () => {
    const res = validateConceptDescription('a film')
    expect(res.valid).toBe(false)
    expect(res.issues.some((i) => i.code === 'too-short')).toBe(true)
  })

  it('flags vague filler phrases', () => {
    expect(validateConceptDescription('something').valid).toBe(false)
    expect(validateConceptDescription('a project').valid).toBe(false)
  })

  it('accepts a specific description', () => {
    const res = validateConceptDescription(
      'A documentary following three urban beekeepers through one honey season in Chicago.'
    )
    expect(res.valid).toBe(true)
    expect(res.issues).toHaveLength(0)
  })
})

describe('parseConceptRefineResult', () => {
  it('normalizes model output and preserves questions', () => {
    const parsed = {
      valid: false,
      issues: [{ code: 'missing-takeaway', message: 'What should viewers do next?' }],
      clarifyingQuestions: ['Who is the main subject?', 'What is the core message?'],
      enhancedDescription: 'An enhanced description.',
      summary: 'A short summary.',
    }
    const result = parseConceptRefineResult(parsed, 'original')
    expect(result.valid).toBe(false)
    expect(result.clarifyingQuestions).toHaveLength(2)
    expect(result.issues[0].code).toBe('missing-takeaway')
    expect(result.enhancedDescription).toBe('An enhanced description.')
  })

  it('falls back to the original description when output is unusable', () => {
    const result = parseConceptRefineResult(null, 'my original concept')
    expect(result.enhancedDescription).toBe('my original concept')
    expect(result.clarifyingQuestions).toEqual([])
  })

  it('coerces string issues to the other code', () => {
    const result = parseConceptRefineResult({ issues: ['be more specific'] }, 'x')
    expect(result.issues[0].code).toBe('other')
    expect(result.issues[0].message).toBe('be more specific')
  })
})

describe('defaultFormatForIntent', () => {
  it('keeps non-fiction intents out of the fiction short_film default', () => {
    expect(defaultFormatForIntent('fiction')).toBe('short_film')
    expect(defaultFormatForIntent('informational')).toBe('documentary')
    expect(defaultFormatForIntent('commercial')).toBe('explainer')
    expect(defaultFormatForIntent('conversational')).toBe('podcast')
  })
})
