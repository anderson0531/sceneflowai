import { describe, it, expect } from 'vitest'
import { buildBeatFirstPlaybackTimeline } from '@/lib/storyboard/types'
import {
  buildBeatAlignedMusicClips,
  buildStoryboardMusicClips,
  isBeatMusicEnabled,
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
      },
      {
        beatId: 'bt_a1',
        kind: 'action',
        actionDescription: 'Sarah enters the room',
      },
      {
        beatId: 'bt_a2',
        kind: 'action',
        actionDescription: 'Sarah looks around',
      },
      {
        beatId: 'bt_d1',
        kind: 'dialogue',
        character: 'Sarah',
        line: 'Hello.',
        audioUrl: SARAH_URL,
        durationSeconds: 3,
      },
    ],
  }
}

describe('isBeatMusicEnabled', () => {
  it('defaults to enabled when musicEnabled is undefined', () => {
    expect(isBeatMusicEnabled({ beatId: 'x', sequenceIndex: 0, kind: 'action' })).toBe(true)
  })

  it('returns false only when explicitly disabled', () => {
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

describe('buildBeatAlignedMusicClips', () => {
  it('emits one music clip per visible beat frame when all beats default on', () => {
    const scene = buildBeatScene()
    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl: MUSIC_URL,
      sceneDuration: 20,
    })

    const framedBeats = visualFrames.filter((frame) => frame.beatId)
    expect(clips).toHaveLength(framedBeats.length)
    expect(clips.every((clip) => clip.url === MUSIC_URL)).toBe(true)
    expect(clips[0].id).toBe(`music-${visualFrames[0].beatId}`)
    expect(clips[0].startTime).toBe(visualFrames[0].startTime)
    expect(clips[0].trimStart).toBe(visualFrames[0].startTime)
    expect(clips[0].loop).toBe(false)
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
        },
      ],
    })

    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl: MUSIC_URL,
      sceneDuration: 12,
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
    })

    expect(clips).toHaveLength(0)
  })

  it('falls back to one full-scene looping clip for legacy scenes without beats', () => {
    const scene = { musicAudio: MUSIC_URL }

    const clips = buildBeatAlignedMusicClips(scene, [], {
      musicUrl: MUSIC_URL,
      sceneDuration: 30,
    })

    expect(clips).toHaveLength(1)
    expect(clips[0].startTime).toBe(0)
    expect(clips[0].duration).toBe(30)
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
