import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  computeFrameFadeIn,
  computeFrameFadeOut,
  computeSceneStartFadeBlack,
  shouldSkipPosterToPrimaryCrossfade,
} from '@/lib/storyboard/animaticSceneFade'

describe('computeFrameFadeIn', () => {
  it('starts black and clears over the fade window', () => {
    expect(computeFrameFadeIn(0, 0.5)).toBe(1)
    expect(computeFrameFadeIn(0.25, 0.5)).toBe(0.5)
    expect(computeFrameFadeIn(0.5, 0.5)).toBe(0)
    expect(computeFrameFadeIn(2, 0.5)).toBe(0)
  })

  it('is transparent when the join is not a fade', () => {
    expect(computeFrameFadeIn(0, 0)).toBe(0)
  })
})

describe('computeFrameFadeOut', () => {
  it('stays clear until the fade window opens at the tail', () => {
    expect(computeFrameFadeOut(0, 6, 1)).toBe(0)
    expect(computeFrameFadeOut(5, 6, 1)).toBe(0)
    expect(computeFrameFadeOut(5.5, 6, 1)).toBe(0.5)
    expect(computeFrameFadeOut(6, 6, 1)).toBe(1)
  })

  it('is transparent when the join is not a fade', () => {
    expect(computeFrameFadeOut(6, 6, 0)).toBe(0)
  })

  it('covers the whole frame when the fade is longer than it is', () => {
    expect(computeFrameFadeOut(0, 1, 4)).toBe(0)
    expect(computeFrameFadeOut(1, 1, 4)).toBe(0.25)
  })
})

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

describe('AudioGalleryPlayer transition wiring', () => {
  const player = readFileSync(
    path.join(process.cwd(), 'src/components/vision/AudioGalleryPlayer.tsx'),
    'utf8'
  )

  it('fades through black on the frame that asked to, not only at scene edges', () => {
    expect(player).toContain("frame.transitionIn === 'fade'")
    expect(player).toContain("frame.transitionOut === 'fade'")
    expect(player).toContain('computeFrameFadeOut(t, frameDuration, fadeOutSec)')
  })

  it('dissolves on the frame that asked to, falling back to the viewer preference', () => {
    expect(player).toContain("transitionIn === 'dissolve'")
    expect(player).toContain('arrivingDissolveMs > 0')
    expect(player).toContain("imageEffectPrefs.mode === 'crossfade' ? CROSSFADE_DURATION_MS : 0")
  })

  it('tells the timeline how the previous scene handed over', () => {
    expect(player).toContain('sceneTransitionIn: scenes[currentSceneIndex - 1]?.transitionToNext')
  })
})
