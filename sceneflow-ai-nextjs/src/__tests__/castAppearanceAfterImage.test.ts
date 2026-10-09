import { describe, expect, it } from 'vitest'
import { castAppearanceAfterImage } from '@/lib/character/castAppearanceAfterImage'

describe('castAppearanceAfterImage', () => {
  it('keeps a saved body description and stores the vision analysis beside it', () => {
    expect(
      castAppearanceAfterImage({
        existingAppearance: 'Late 40s, sharp cheekbones',
        visionDescription: 'A woman in her twenties with a round face.',
      })
    ).toEqual({
      patch: {
        visionDescription: 'A woman in her twenties with a round face.',
      },
      briefAppearance: 'Late 40s, sharp cheekbones',
      appearanceChanged: false,
    })
  })

  it('fills an empty body description from the portrait analysis', () => {
    expect(
      castAppearanceAfterImage({
        existingAppearance: '  ',
        visionDescription: ' Late 40s African American woman, tall athletic build. ',
      })
    ).toEqual({
      patch: {
        visionDescription: 'Late 40s African American woman, tall athletic build.',
        appearanceDescription: 'Late 40s African American woman, tall athletic build.',
      },
      briefAppearance: 'Late 40s African American woman, tall athletic build.',
      appearanceChanged: true,
    })
  })

  it('leaves the character unchanged when vision analysis is empty', () => {
    expect(
      castAppearanceAfterImage({
        existingAppearance: 'Late 40s, sharp cheekbones',
        visionDescription: null,
      })
    ).toEqual({
      patch: {},
      appearanceChanged: false,
    })
  })
})
