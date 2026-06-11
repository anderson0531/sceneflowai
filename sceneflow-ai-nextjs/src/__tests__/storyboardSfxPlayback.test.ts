import { describe, it, expect } from 'vitest'
import { buildBeatFirstPlaybackTimeline } from '@/lib/storyboard/types'
import { buildBeatAlignedStoryboardSfxClips } from '@/lib/storyboard/sfxPlayback'

const SARAH_URL = 'https://example.com/sarah.mp3'
const SFX_A1 = 'https://example.com/sfx-a1.mp3'
const SFX_A2 = 'https://example.com/sfx-a2.mp3'

describe('buildBeatAlignedStoryboardSfxClips', () => {
  it('aligns beat-scoped SFX to visual frame start times when slot 0 is empty', () => {
    const scene = {
      imageUrl: 'https://example.com/est.jpg',
      dialogue: [{ character: 'Sarah', line: 'Hello.' }],
      beats: [
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
      sfx: [
        { description: 'Establishing ambient', sourceBeatId: 'bt_est' },
        { description: 'Footsteps', sourceBeatId: 'bt_a1' },
        { description: 'Room tone shift', sourceBeatId: 'bt_a2' },
      ],
      sfxAudio: [null, SFX_A1, SFX_A2],
      sfxSourceMeta: [
        null,
        { source: 'veo', clipDurationSeconds: 4, promptMode: 'actionBeat' },
        { source: 'veo', clipDurationSeconds: 4, promptMode: 'actionBeat' },
      ],
    }

    const { visualFrames, voiceClips } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedStoryboardSfxClips(scene, visualFrames, {
      voiceEndTime: voiceClips[0].startTime + voiceClips[0].duration,
    })

    expect(visualFrames[0].beatId).toBe('bt_a1')
    expect(clips).toHaveLength(2)
    expect(clips[0].id).toBe('sfx-beat-bt_a1')
    expect(clips[0].url).toBe(SFX_A1)
    expect(clips[0].startTime).toBe(visualFrames.find((f) => f.beatId === 'bt_a1')!.startTime)
    expect(clips[0].startTime).toBe(0)

    const frameA2 = visualFrames.find((f) => f.beatId === 'bt_a2')!
    expect(clips[1].startTime).toBeCloseTo(frameA2.startTime, 1)
    expect(clips[1].startTime).toBeGreaterThan(4)
  })

  it('aligns first audible SFX to first visible action beat when establishing is dropped', () => {
    const scene = {
      imageUrl: 'https://example.com/est.jpg',
      dialogue: [{ character: 'Sarah', line: 'Hello.' }],
      beats: [
        {
          beatId: 'bt_est',
          kind: 'action',
          actionDescription: 'Establishing shot',
          storyboardImageUrl: 'https://example.com/est.jpg',
        },
        {
          beatId: 'bt_a1',
          kind: 'action',
          actionDescription: 'Sarah enters',
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
      sfx: [
        { description: 'Establishing', sourceBeatId: 'bt_est' },
        { description: 'Footsteps', sourceBeatId: 'bt_a1' },
      ],
      sfxAudio: [null, SFX_A1],
    }

    const { visualFrames, voiceClips } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedStoryboardSfxClips(scene, visualFrames, {
      voiceEndTime: voiceClips[0].startTime + voiceClips[0].duration,
    })

    expect(visualFrames[0].beatId).toBe('bt_a1')
    expect(clips).toHaveLength(1)
    expect(clips[0].startTime).toBe(visualFrames[0].startTime)
    expect(clips[0].startTime).toBe(0)
  })

  it('falls back to legacy even-spread when cues lack sourceBeatId', () => {
    const scene = {
      sfx: [{ description: 'Wind' }, { description: 'Thunder' }],
      sfxAudio: ['https://example.com/wind.mp3', 'https://example.com/thunder.mp3'],
    }

    const clips = buildBeatAlignedStoryboardSfxClips(scene, [], {
      voiceEndTime: 9,
    })

    expect(clips).toHaveLength(2)
    expect(clips[0].startTime).toBe(0)
    expect(clips[1].startTime).toBeCloseTo(4.5, 1)
  })
})
