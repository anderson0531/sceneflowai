import { describe, expect, it } from 'vitest'
import {
  AUDIO_WINDOW_LOOKAHEAD_SEC,
  MAX_LIVE_AUDIO_CLIPS,
  audioClipKey,
  isClipPlaybackActive,
  selectLiveAudioClips,
  type WindowedClip,
} from '@/lib/audio/audioClipWindow'

function clip(partial: Partial<WindowedClip> & Pick<WindowedClip, 'id' | 'startTime'>): WindowedClip {
  return {
    url: `https://example.com/${partial.id}.mp3`,
    duration: 2,
    trackType: 'dialogue',
    ...partial,
  }
}

function ids(clips: WindowedClip[]): string[] {
  return clips.map((c) => c.id)
}

describe('isClipPlaybackActive', () => {
  it('is false before the clip starts and after it ends', () => {
    const dialogue = clip({ id: 'd1', startTime: 4, duration: 2 })
    expect(isClipPlaybackActive(dialogue, 3.9, 30)).toBe(false)
    expect(isClipPlaybackActive(dialogue, 4, 30)).toBe(true)
    expect(isClipPlaybackActive(dialogue, 5.9, 30)).toBe(true)
    expect(isClipPlaybackActive(dialogue, 6, 30)).toBe(false)
  })

  it('keeps merged scene music looping for the whole scene', () => {
    const music = clip({
      id: 'music-scene',
      startTime: 0,
      duration: 8,
      trackType: 'music',
      loop: true,
    })
    expect(isClipPlaybackActive(music, 0, 40)).toBe(true)
    expect(isClipPlaybackActive(music, 20, 40)).toBe(true)
    expect(isClipPlaybackActive(music, 40, 40)).toBe(false)
  })
})

describe('selectLiveAudioClips', () => {
  const twentyTwoBeats: WindowedClip[] = [
    clip({ id: 'music-scene', startTime: 0, duration: 8, trackType: 'music', loop: true }),
    ...Array.from({ length: 22 }, (_, i) =>
      clip({ id: `dlg-${i}`, startTime: i * 3, duration: 2.5, trackType: 'dialogue' })
    ),
    ...Array.from({ length: 22 }, (_, i) =>
      clip({ id: `sfx-${i}`, startTime: i * 3, duration: 1.5, trackType: 'sfx' })
    ),
  ]

  it('caps the window well below a 22-beat scene', () => {
    const live = selectLiveAudioClips(twentyTwoBeats, 0, 70)
    expect(twentyTwoBeats.length).toBeGreaterThan(40)
    expect(live.length).toBeLessThanOrEqual(MAX_LIVE_AUDIO_CLIPS)
    expect(live.length).toBeGreaterThan(0)
    expect(live.length).toBeLessThan(twentyTwoBeats.length)
  })

  it('always keeps the clip that is playing and the looping score', () => {
    const live = selectLiveAudioClips(twentyTwoBeats, 18, 70)
    expect(ids(live)).toContain('music-scene')
    expect(ids(live)).toContain('dlg-6')
    expect(ids(live)).toContain('sfx-6')
  })

  it('trims lookahead to the cap when many clips start soon', () => {
    const soon = [
      clip({ id: 'music-scene', startTime: 0, duration: 8, trackType: 'music', loop: true }),
      ...Array.from({ length: 20 }, (_, i) =>
        clip({ id: `soon-${i}`, startTime: 0.5 + i * 0.2, duration: 1, trackType: 'dialogue' })
      ),
    ]
    const live = selectLiveAudioClips(soon, 0, 40)
    expect(live).toHaveLength(MAX_LIVE_AUDIO_CLIPS)
    expect(ids(live)).toContain('music-scene')
  })

  it('orders upcoming clips by start time within the lookahead', () => {
    const live = selectLiveAudioClips(twentyTwoBeats, 0, 70)
    const upcoming = live.filter((c) => c.id !== 'music-scene' && c.startTime > 0)
    const starts = upcoming.map((c) => c.startTime)
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
    expect(upcoming.every((c) => c.startTime <= AUDIO_WINDOW_LOOKAHEAD_SEC)).toBe(true)
  })

  it('survives a seek: the window follows the new playhead', () => {
    const before = selectLiveAudioClips(twentyTwoBeats, 0, 70)
    const after = selectLiveAudioClips(twentyTwoBeats, 48, 70)
    expect(ids(before)).toContain('dlg-0')
    expect(ids(after)).not.toContain('dlg-0')
    expect(ids(after)).toContain('dlg-16')
    expect(ids(after)).toContain('music-scene')
    expect(after.length).toBeLessThanOrEqual(MAX_LIVE_AUDIO_CLIPS)
  })

  it('keeps every overlapping active clip even if that exceeds the cap', () => {
    const stacked = Array.from({ length: 12 }, (_, i) =>
      clip({ id: `stack-${i}`, startTime: 0, duration: 5, trackType: 'sfx' })
    )
    const live = selectLiveAudioClips(stacked, 1, 20)
    expect(live).toHaveLength(12)
  })

  it('keys a clip by id and url together', () => {
    expect(audioClipKey({ id: 'dlg-0', url: 'https://a/x.mp3' })).toBe('dlg-0:https://a/x.mp3')
  })
})
