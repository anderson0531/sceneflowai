import { describe, it, expect } from 'vitest'
import {
  computeMusicIntroFadeMultiplier,
  DEFAULT_MUSIC_INTRO_FADE,
  clampMusicIntroFadeConfig,
} from '@/lib/storyboard/musicIntroFade'

describe('musicIntroFade', () => {
  const config = { durationSec: 4, startLevel: 0.5 }

  it('returns startLevel at clip start', () => {
    expect(computeMusicIntroFadeMultiplier(0, config)).toBe(0.5)
  })

  it('returns 1.0 after fade duration', () => {
    expect(computeMusicIntroFadeMultiplier(4, config)).toBe(1)
    expect(computeMusicIntroFadeMultiplier(10, config)).toBe(1)
  })

  it('smoothsteps between start and full at midpoint', () => {
    const mid = computeMusicIntroFadeMultiplier(2, config)
    expect(mid).toBeGreaterThan(0.5)
    expect(mid).toBeLessThan(1)
  })

  it('clamps negative elapsed to startLevel', () => {
    expect(computeMusicIntroFadeMultiplier(-1, config)).toBe(0.5)
  })

  it('clampMusicIntroFadeConfig enforces bounds', () => {
    const clamped = clampMusicIntroFadeConfig({
      enabled: false,
      durationSec: 20,
      startLevel: 0.9,
    })
    expect(clamped.enabled).toBe(false)
    expect(clamped.durationSec).toBe(8)
    expect(clamped.startLevel).toBe(0.7)
  })

  it('DEFAULT_MUSIC_INTRO_FADE matches plan defaults', () => {
    expect(DEFAULT_MUSIC_INTRO_FADE.enabled).toBe(true)
    expect(DEFAULT_MUSIC_INTRO_FADE.durationSec).toBe(4)
    expect(DEFAULT_MUSIC_INTRO_FADE.startLevel).toBe(0.5)
  })
})
