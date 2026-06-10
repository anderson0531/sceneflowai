import { describe, it, expect } from 'vitest'
import { isStoryboardNoCharacterScene } from '@/lib/script/sceneClassification'

describe('isStoryboardNoCharacterScene', () => {
  it('returns true for cinematicType title', () => {
    expect(
      isStoryboardNoCharacterScene(
        { cinematicType: 'title', heading: 'INT. OFFICE - DAY' },
        1,
        10
      )
    ).toBe(true)
  })

  it('returns true for title sequence heading', () => {
    expect(
      isStoryboardNoCharacterScene(
        { heading: 'INT. TITLE SEQUENCE - DAY', action: 'Digital title cards.' },
        1,
        10
      )
    ).toBe(true)
  })

  it('returns false for standard narrative scene', () => {
    expect(
      isStoryboardNoCharacterScene(
        { heading: 'INT. OFFICE - DAY', action: 'Marcus reviews documents.' },
        2,
        10
      )
    ).toBe(false)
  })
})
