import { describe, it, expect } from 'vitest'
import { sfxSearchQuery } from '@/lib/audio/sfxSearchQuery'

describe('sfxSearchQuery', () => {
  it('strips parenthetical notes', () => {
    expect(
      sfxSearchQuery('Sharp, electric crackle (for crimson flare)')
    ).toBe('Sharp, electric crackle')
  })

  it('handles object description', () => {
    expect(sfxSearchQuery({ description: '  Deep hum  ' })).toBe('Deep hum')
  })

  it('returns empty for empty input', () => {
    expect(sfxSearchQuery('')).toBe('')
    expect(sfxSearchQuery(null)).toBe('')
    expect(sfxSearchQuery(undefined)).toBe('')
  })

  it('collapses whitespace', () => {
    expect(sfxSearchQuery('a   b\t\nc')).toBe('a b c')
  })
})
