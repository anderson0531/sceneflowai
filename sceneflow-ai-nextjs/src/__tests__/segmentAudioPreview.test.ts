import { describe, expect, it } from 'vitest'
import {
  anySegmentEmbedAudioIncluded,
  isBeatEmbedAudioIncluded,
  resolveBeatPreviewVolume,
  resolveSegmentEmbedAudioForRender,
} from '@/lib/scene/segmentAudioPreview'

describe('resolveBeatPreviewVolume', () => {
  it('returns full volume when unmuted with defaults', () => {
    expect(resolveBeatPreviewVolume(undefined, 0.8, false)).toEqual({
      muted: false,
      volume: 0.8,
    })
  })

  it('applies per-beat volume multiplied by master', () => {
    expect(
      resolveBeatPreviewVolume({ includeAudio: true, volume: 0.5 }, 0.8, false)
    ).toEqual({
      muted: false,
      volume: 0.4,
    })
  })

  it('mutes when beat includeAudio is false', () => {
    expect(
      resolveBeatPreviewVolume({ includeAudio: false, volume: 1 }, 0.8, false)
    ).toEqual({
      muted: true,
      volume: 0,
    })
  })

  it('mutes when global preview mute is on', () => {
    expect(
      resolveBeatPreviewVolume({ includeAudio: true, volume: 1 }, 0.8, true)
    ).toEqual({
      muted: true,
      volume: 0,
    })
  })

  it('clamps combined volume to 0–1', () => {
    expect(
      resolveBeatPreviewVolume({ includeAudio: true, volume: 1 }, 1.5, false)
    ).toEqual({
      muted: false,
      volume: 1,
    })
    expect(
      resolveBeatPreviewVolume({ includeAudio: true, volume: 0 }, 0.8, false)
    ).toEqual({
      muted: false,
      volume: 0,
    })
  })
})

describe('resolveSegmentEmbedAudioForRender', () => {
  const stemOff = {
    useStemDubbingPolicy: false,
    includeSpeechStem: false,
    hasBackgroundStem: false,
  }

  it('returns none when beat is muted', () => {
    expect(
      resolveSegmentEmbedAudioForRender({ includeAudio: false, volume: 1 }, 0.8, stemOff)
    ).toEqual({
      audioSource: 'none',
      audioVolume: 0.8,
      includeVideoAudio: false,
    })
  })

  it('returns none when master volume yields zero effective volume', () => {
    expect(
      resolveSegmentEmbedAudioForRender({ includeAudio: true, volume: 1 }, 0, stemOff)
    ).toEqual({
      audioSource: 'none',
      audioVolume: 0,
      includeVideoAudio: false,
    })
  })

  it('applies per-beat and master multiplier for original source', () => {
    expect(
      resolveSegmentEmbedAudioForRender({ includeAudio: true, volume: 0.5 }, 0.8, stemOff)
    ).toEqual({
      audioSource: 'original',
      audioVolume: 0.4,
      includeVideoAudio: true,
    })
  })

  it('blocks original when stem dubbing policy replaces embed audio', () => {
    expect(
      resolveSegmentEmbedAudioForRender(
        { includeAudio: true, volume: 1 },
        1,
        { useStemDubbingPolicy: true, includeSpeechStem: false, hasBackgroundStem: true }
      )
    ).toEqual({
      audioSource: 'none',
      audioVolume: 1,
      includeVideoAudio: false,
    })
  })
})

describe('anySegmentEmbedAudioIncluded', () => {
  it('is false when all beats are muted', () => {
    const segments = [{ segmentId: 'a' }, { segmentId: 'b' }]
    const configs = {
      a: { includeAudio: false, volume: 1 },
      b: { includeAudio: false, volume: 1 },
    }
    expect(
      anySegmentEmbedAudioIncluded(segments, configs, 0.8, false, false)
    ).toBe(false)
  })

  it('is true when at least one beat has embed audio', () => {
    const segments = [{ segmentId: 'a' }, { segmentId: 'b' }]
    const configs = {
      a: { includeAudio: false, volume: 1 },
      b: { includeAudio: true, volume: 1 },
    }
    expect(
      anySegmentEmbedAudioIncluded(segments, configs, 0.8, false, false)
    ).toBe(true)
  })
})

describe('isBeatEmbedAudioIncluded', () => {
  it('defaults to true when config missing', () => {
    expect(isBeatEmbedAudioIncluded(undefined)).toBe(true)
  })

  it('returns false when explicitly muted', () => {
    expect(isBeatEmbedAudioIncluded({ includeAudio: false, volume: 1 })).toBe(false)
  })
})
