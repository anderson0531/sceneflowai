import { describe, expect, it } from 'vitest'
import {
  computeSceneStartFadeBlack,
  shouldSkipPosterToPrimaryCrossfade,
} from '@/lib/storyboard/animaticSceneFade'

describe('computeSceneStartFadeBlack', () => {
  it('fades from black over the window when armed', () => {
    expect(
      computeSceneStartFadeBlack(0, 1, { isSceneStart: true, skipFadeFromBlack: false })
    ).toBe(1)
    expect(
      computeSceneStartFadeBlack(0.5, 1, { isSceneStart: true, skipFadeFromBlack: false })
    ).toBe(0.5)
    expect(
      computeSceneStartFadeBlack(1, 1, { isSceneStart: true, skipFadeFromBlack: false })
    ).toBe(0)
  })

  it('skips fade when poster already showed the start frame', () => {
    expect(
      computeSceneStartFadeBlack(0, 1, { isSceneStart: true, skipFadeFromBlack: true })
    ).toBe(0)
  })

  it('is zero when not a scene-start frame', () => {
    expect(
      computeSceneStartFadeBlack(0, 1, { isSceneStart: false, skipFadeFromBlack: false })
    ).toBe(0)
  })
})

describe('shouldSkipPosterToPrimaryCrossfade', () => {
  it('skips when urls are equal', () => {
    expect(
      shouldSkipPosterToPrimaryCrossfade('https://a.jpg', 'https://a.jpg', 'https://a.jpg')
    ).toBe(true)
  })

  it('skips when previous was the poster and next equals poster', () => {
    expect(
      shouldSkipPosterToPrimaryCrossfade('https://poster.jpg', 'https://poster.jpg', 'https://poster.jpg')
    ).toBe(true)
  })

  it('allows crossfade between distinct beat frames', () => {
    expect(
      shouldSkipPosterToPrimaryCrossfade('https://a.jpg', 'https://b.jpg', 'https://poster.jpg')
    ).toBe(false)
  })
})
