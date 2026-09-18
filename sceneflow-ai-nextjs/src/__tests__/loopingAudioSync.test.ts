import { describe, expect, it } from 'vitest'
import {
  computeCueMusicGain,
  computeMusicVolumeMultiplier,
  musicCueMixFields,
  MUSIC_FADE_MAX_SEC,
  resolveMusicCueFadeSec,
  resolveMusicCueVolume,
} from '@/lib/audio/loopingAudioSync'
import { computeEffectiveClipVolume, type AudioClip } from '@/hooks/useTimelinePlayback'

describe('music cue mix helpers', () => {
  it('defaults missing volume to unity and missing fades to 0', () => {
    expect(resolveMusicCueVolume(undefined)).toBe(1)
    expect(resolveMusicCueVolume(0)).toBe(0)
    expect(resolveMusicCueFadeSec(undefined)).toBe(0)
    expect(resolveMusicCueFadeSec(40)).toBe(MUSIC_FADE_MAX_SEC)
  })

  it('omits unity volume and zero fades from persisted mix', () => {
    expect(musicCueMixFields({})).toEqual({})
    expect(musicCueMixFields({ volume: 1, fadeInSec: 0, fadeOutSec: 0 })).toEqual({})
    expect(musicCueMixFields({ volume: 0, fadeInSec: 2 })).toEqual({
      volume: 0,
      fadeInSec: 2,
    })
  })

  it('applies volume × fade-in × fade-out over the clip window', () => {
    expect(
      computeCueMusicGain({
        localTimeSec: 5,
        playDurationSec: 10,
        volume: 0.5,
      })
    ).toBe(0.5)

    expect(
      computeCueMusicGain({
        localTimeSec: 1,
        playDurationSec: 10,
        volume: 1,
        fadeInSec: 2,
      })
    ).toBe(0.5)

    expect(
      computeCueMusicGain({
        localTimeSec: 9,
        playDurationSec: 10,
        volume: 1,
        fadeOutSec: 2,
      })
    ).toBe(0.5)

    expect(
      computeCueMusicGain({
        localTimeSec: 0,
        playDurationSec: 10,
        volume: 0.8,
        fadeInSec: 2,
        fadeOutSec: 2,
      })
    ).toBe(0)
  })

  it('matches computeMusicVolumeMultiplier at the envelope edges', () => {
    expect(computeMusicVolumeMultiplier(0, 10, 2, 0)).toBe(0)
    expect(computeMusicVolumeMultiplier(2, 10, 2, 0)).toBe(1)
    expect(computeMusicVolumeMultiplier(10, 10, 0, 2)).toBe(0)
  })
})

describe('computeEffectiveClipVolume', () => {
  const musicClip: AudioClip = {
    id: 'music-cue',
    url: 'https://example.com/cue.wav',
    startTime: 4,
    duration: 10,
    trackType: 'music',
    volume: 0.5,
    fadeInSec: 2,
    fadeOutSec: 2,
  }

  it('multiplies master/track volume by cue envelope and intro fade', () => {
    const mid = computeEffectiveClipVolume(musicClip, 9, 0.8, undefined, 1)
    expect(mid).toBeCloseTo(0.4, 6)

    const fadeIn = computeEffectiveClipVolume(musicClip, 5, 0.8, undefined, 1)
    expect(fadeIn).toBeCloseTo(0.2, 6)

    const withIntro = computeEffectiveClipVolume(
      musicClip,
      6,
      0.8,
      { enabled: true, durationSec: 4, startLevel: 0.5 },
      1
    )
    const withoutIntro = computeEffectiveClipVolume(musicClip, 6, 0.8, undefined, 1)
    expect(withIntro).toBeLessThan(withoutIntro)
    expect(withIntro).toBeGreaterThan(0)
  })

  it('leaves dialogue clips untouched by cue mix', () => {
    const dialogue: AudioClip = {
      id: 'line-1',
      url: 'https://example.com/line.mp3',
      startTime: 0,
      duration: 4,
      trackType: 'dialogue',
      volume: 0.1,
      fadeInSec: 2,
    }
    expect(computeEffectiveClipVolume(dialogue, 0, 0.9, undefined, 1)).toBeCloseTo(0.9, 6)
  })
})
