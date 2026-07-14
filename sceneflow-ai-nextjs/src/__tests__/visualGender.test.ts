import { describe, it, expect } from 'vitest'
import {
  resolveVisualGender,
  correctPronounsToGender,
  normalizeCharacterGender,
} from '@/lib/character/visualGender'

describe('visualGender', () => {
  it('normalizeCharacterGender maps common values', () => {
    expect(normalizeCharacterGender('Male')).toBe('male')
    expect(normalizeCharacterGender('woman')).toBe('female')
    expect(normalizeCharacterGender('non-binary')).toBe('non-binary')
    expect(normalizeCharacterGender('unspecified')).toBe('unspecified')
  })

  it('resolveVisualGender prefers user-set gender', () => {
    const result = resolveVisualGender({
      name: 'Vesper Thorne',
      gender: 'male',
      genderSource: 'user',
    })
    expect(result).toEqual({
      gender: 'male',
      source: 'user',
      isAuthoritative: true,
    })
  })

  it('resolveVisualGender treats AI gender as authoritative', () => {
    const result = resolveVisualGender({
      name: 'Vesper Thorne',
      gender: 'male',
      genderSource: 'ai',
    })
    expect(result.gender).toBe('male')
    expect(result.isAuthoritative).toBe(true)
  })

  it('correctPronounsToGender fixes female pronouns for male character', () => {
    const text = 'She adjusts her collar.'
    const corrected = correctPronounsToGender(text, 'male')
    expect(corrected).toMatch(/He adjusts/)
    expect(corrected).not.toMatch(/\bher\b/i)
  })

  it('correctPronounsToGender uses they for non-binary', () => {
    const text = 'She walks to her desk.'
    expect(correctPronounsToGender(text, 'non-binary')).toContain('They')
  })
})
