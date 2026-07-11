import { describe, it, expect } from 'vitest'
import { buildBeatFirstPlaybackTimeline } from '@/lib/storyboard/types'
import {
  buildBeatAlignedMusicClips,
  buildStoryboardMusicClips,
  isBeatMusicEnabled,
  resolveMusicTrimStart,
} from '@/lib/storyboard/musicPlayback'

const SARAH_URL = 'https://example.com/sarah.mp3'
const MUSIC_URL = 'https://example.com/music.mp3'

function buildBeatScene(overrides?: { beats?: Record<string, unknown>[] }) {
  return {
    imageUrl: 'https://example.com/est.jpg',
    musicAudio: MUSIC_URL,
    dialogue: [{ character: 'Sarah', line: 'Hello.' }],
    beats: overrides?.beats ?? [
      {
        beatId: 'bt_est',
        kind: 'action',
        actionDescription: 'Establishing shot',
        storyboardImageUrl: 'https://example.com/est.jpg',
        musicEnabled: true,
      },
      {
        beatId: 'bt_a1',
        kind: 'action',
        actionDescription: 'Sarah enters the room',
        musicEnabled: true,
      },
      {
        beatId: 'bt_a2',
        kind: 'action',
        actionDescription: 'Sarah looks around',
        musicEnabled: true,
      },
      {
        beatId: 'bt_d1',
        kind: 'dialogue',
        character: 'Sarah',
        line: 'Hello.',
        audioUrl: SARAH_URL,
        durationSeconds: 3,
        musicEnabled: true,
      },
    ],
  }
}

describe('isBeatMusicEnabled', () => {
  it('defaults to disabled when musicEnabled is undefined', () => {
    expect(isBeatMusicEnabled({ beatId: 'x', sequenceIndex: 0, kind: 'action' })).toBe(false)
  })

  it('returns true only when explicitly enabled', () => {
    expect(
      isBeatMusicEnabled({
        beatId: 'x',
        sequenceIndex: 0,
        kind: 'action',
        musicEnabled: true,
      })
    ).toBe(true)
  })

  it('returns false when explicitly disabled', () => {
    expect(
      isBeatMusicEnabled({
        beatId: 'x',
        sequenceIndex: 0,
        kind: 'action',
        musicEnabled: false,
      })
    ).toBe(false)
  })
})

describe('resolveMusicTrimStart', () => {
  it('wraps scene timeline offsets modulo file duration', () => {
    expect(resolveMusicTrimStart(45, 30)).toBe(15)
    expect(resolveMusicTrimStart(0, 30)).toBe(0)
  })
})

describe('buildBeatAlignedMusicClips', () => {
  it('merges contiguous music-enabled beats into one looping scene clip', () => {
    const scene = buildBeatScene()
    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl: MUSIC_URL,
      sceneDuration: 20,
      musicFileDuration: 30,
    })

    const enabledFrames = visualFrames.filter((frame) => frame.beatId)
    const firstFrame = enabledFrames[0]
    const lastFrame = enabledFrames[enabledFrames.length - 1]
    const expectedDuration = lastFrame.startTime + lastFrame.duration - firstFrame.startTime

    expect(clips).toHaveLength(1)
    expect(clips[0].id).toBe('music-scene')
    expect(clips[0].url).toBe(MUSIC_URL)
    expect(clips[0].startTime).toBe(firstFrame.startTime)
    expect(clips[0].duration).toBe(expectedDuration)
    expect(clips[0].trimStart).toBe(
      resolveMusicTrimStart(firstFrame.startTime, 30)
    )
    expect(clips[0].loop).toBe(true)
  })

  it('splits music into two clips when a middle beat disables music', () => {
    const scene = buildBeatScene({
      beats: [
        {
          beatId: 'bt_a1',
          kind: 'action',
          actionDescription: 'Sarah enters',
          musicEnabled: true,
        },
        {
          beatId: 'bt_a2',
          kind: 'action',
          actionDescription: 'Silent beat',
          musicEnabled: false,
        },
        {
          beatId: 'bt_d1',
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Hello.',
          audioUrl: SARAH_URL,
          durationSeconds: 3,
          musicEnabled: true,
        },
      ],
    })

    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl: MUSIC_URL,
      sceneDuration: 20,
      musicFileDuration: 30,
    })

    expect(clips).toHaveLength(2)
    expect(clips[0].id).toBe('music-bt_a1')
    expect(clips[1].id).toBe('music-bt_d1')
    expect(clips.some((clip) => clip.id === 'music-bt_a2')).toBe(false)
  })

  it('skips beats with musicEnabled false', () => {
    const scene = buildBeatScene({
      beats: [
        {
          beatId: 'bt_a1',
          kind: 'action',
          actionDescription: 'Sarah enters',
          musicEnabled: false,
        },
        {
          beatId: 'bt_d1',
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Hello.',
          audioUrl: SARAH_URL,
          durationSeconds: 3,
          musicEnabled: true,
        },
      ],
    })

    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl: MUSIC_URL,
      sceneDuration: 12,
      musicFileDuration: 30,
    })

    expect(clips).toHaveLength(1)
    expect(clips[0].id).toBe('music-bt_d1')
    expect(clips.some((clip) => clip.id === 'music-bt_a1')).toBe(false)
  })

  it('returns empty array when every beat disables music', () => {
    const scene = buildBeatScene({
      beats: [
        {
          beatId: 'bt_a1',
          kind: 'action',
          actionDescription: 'Silent action',
          musicEnabled: false,
        },
        {
          beatId: 'bt_d1',
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Hello.',
          audioUrl: SARAH_URL,
          durationSeconds: 3,
          musicEnabled: false,
        },
      ],
    })

    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl: MUSIC_URL,
      sceneDuration: 10,
      musicFileDuration: 30,
    })

    expect(clips).toHaveLength(0)
  })

  it('falls back to one full-scene looping clip for legacy scenes without beats', () => {
    const scene = { musicAudio: MUSIC_URL }

    const clips = buildBeatAlignedMusicClips(scene, [], {
      musicUrl: MUSIC_URL,
      sceneDuration: 30,
      musicFileDuration: 30,
    })

    expect(clips).toHaveLength(1)
    expect(clips[0].startTime).toBe(0)
    expect(clips[0].duration).toBe(30)
    expect(clips[0].loop).toBe(true)
  })

  it('wraps trimStart for a late beat beyond music file length', () => {
    const clips = buildBeatAlignedMusicClips(
      { beats: [{ beatId: 'bt_late', kind: 'action', musicEnabled: true }] },
      [
        {
          clipId: 'action-bt_late',
          beatId: 'bt_late',
          frameType: 'establishing',
          startTime: 45,
          duration: 8,
        },
      ],
      {
        musicUrl: MUSIC_URL,
        sceneDuration: 60,
        musicFileDuration: 30,
      }
    )

    expect(clips).toHaveLength(1)
    expect(clips[0].trimStart).toBe(15)
    expect(clips[0].loop).toBe(true)
  })
})

describe('buildStoryboardMusicClips', () => {
  it('returns empty when scene has no music URL', () => {
    const scene = buildBeatScene()
    delete (scene as { musicAudio?: string }).musicAudio

    const clips = buildStoryboardMusicClips(scene, [], 10)
    expect(clips).toHaveLength(0)
  })
})
