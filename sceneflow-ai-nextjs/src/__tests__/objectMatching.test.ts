import { describe, expect, it } from 'vitest'
import { libraryNamesFuzzyMatch, matchObjectsBySelectedNames } from '@/lib/character/matching'

describe('libraryNamesFuzzyMatch', () => {
  it('matches direction key prop labels to possessive library names', () => {
    expect(
      libraryNamesFuzzyMatch(
        'Water-damaged leather journal',
        "Arthur Pendelton's 1893 Journal"
      )
    ).toBe(true)
  })

  it('does not match unrelated prop names', () => {
    expect(libraryNamesFuzzyMatch('Rugged military laptop', "Arthur Pendelton's 1893 Journal")).toBe(
      false
    )
  })
})

describe('matchObjectsBySelectedNames', () => {
  it('resolves fuzzy direction prop labels to library rows', () => {
    const library = [
      { id: 'prop-journal', name: "Arthur Pendelton's 1893 Journal" },
      { id: 'prop-laptop', name: 'Rugged military laptop' },
    ]
    const matched = matchObjectsBySelectedNames(['Water-damaged leather journal'], library)
    expect(matched.map((obj) => obj.id)).toEqual(['prop-journal'])
  })
})
