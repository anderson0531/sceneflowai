import { describe, expect, it } from 'vitest'
import { resolveBeatPreviewVolume } from '@/lib/scene/segmentAudioPreview'

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
