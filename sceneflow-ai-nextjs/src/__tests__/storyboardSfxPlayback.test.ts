import { describe, it, expect } from 'vitest'
import { buildBeatFirstPlaybackTimeline } from '@/lib/storyboard/types'
import { buildBeatAlignedStoryboardSfxClips, isBeatSfxMuted } from '@/lib/storyboard/sfxPlayback'

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

    expect(visualFrames[0].beatId).toBe('bt_est')
    expect(clips).toHaveLength(2)
    expect(clips[0].id).toBe('sfx-beat-bt_a1')
    expect(clips[0].url).toBe(SFX_A1)
    expect(clips[0].startTime).toBe(visualFrames.find((f) => f.beatId === 'bt_a1')!.startTime)
    expect(clips[0].startTime).toBeGreaterThan(0)

    const frameA2 = visualFrames.find((f) => f.beatId === 'bt_a2')!
    expect(clips[1].startTime).toBeCloseTo(frameA2.startTime, 1)
    expect(clips[1].startTime).toBeGreaterThan(4)
  })

  it('aligns first audible SFX to its action beat when establishing remains in timeline', () => {
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

    expect(visualFrames[0].beatId).toBe('bt_est')
    expect(clips).toHaveLength(1)
    expect(clips[0].startTime).toBe(visualFrames.find((f) => f.beatId === 'bt_a1')!.startTime)
    expect(clips[0].startTime).toBeGreaterThan(0)
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

  it('skips SFX for excluded beats instead of legacy spread over dialogue', () => {
    const scene = {
      dialogue: [{ character: 'Sarah', line: 'Hello from beat five.' }],
      beats: [
        {
          beatId: 'bt_a1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Ignored action one',
          excluded: true,
        },
        {
          beatId: 'bt_d2',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Earlier line.',
          audioUrl: 'https://example.com/earlier.mp3',
          durationSeconds: 2,
          excluded: true,
        },
        {
          beatId: 'bt_a3',
          sequenceIndex: 2,
          kind: 'action',
          actionDescription: 'Ignored action three',
          excluded: true,
        },
        {
          beatId: 'bt_d4',
          sequenceIndex: 3,
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Another ignored line.',
          audioUrl: 'https://example.com/another.mp3',
          durationSeconds: 2,
          excluded: true,
        },
        {
          beatId: 'bt_a5',
          sequenceIndex: 4,
          kind: 'action',
          actionDescription: 'Ignored action five',
          excluded: true,
        },
        {
          beatId: 'bt_d5',
          sequenceIndex: 5,
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Hello from beat five.',
          audioUrl: SARAH_URL,
          durationSeconds: 3,
          excluded: true,
        },
        {
          beatId: 'bt_a7',
          sequenceIndex: 6,
          kind: 'action',
          actionDescription: 'Ignored action seven',
          excluded: true,
        },
      ],
      sfx: [
        { description: 'SFX one', sourceBeatId: 'bt_a1' },
        { description: 'SFX three', sourceBeatId: 'bt_a3' },
        { description: 'SFX five', sourceBeatId: 'bt_a5' },
        { description: 'SFX seven', sourceBeatId: 'bt_a7' },
      ],
      sfxAudio: [SFX_A1, SFX_A2, SFX_A1, SFX_A2],
    }

    const { visualFrames, voiceClips } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
      'https://example.com/earlier.mp3': 2,
      'https://example.com/another.mp3': 2,
    })

    expect(visualFrames).toHaveLength(0)
    expect(voiceClips.some((clip) => clip.beatId === 'bt_d5')).toBe(true)

    const dialogueClip = voiceClips.find((clip) => clip.beatId === 'bt_d5')!
    const clips = buildBeatAlignedStoryboardSfxClips(scene, visualFrames, {
      voiceEndTime: voiceClips[voiceClips.length - 1].startTime + voiceClips[voiceClips.length - 1].duration,
    })

    expect(clips).toHaveLength(0)
    expect(
      clips.some(
        (clip) =>
          clip.startTime >= dialogueClip.startTime &&
          clip.startTime < dialogueClip.startTime + dialogueClip.duration
      )
    ).toBe(false)
  })

  it('builds clips when sfxAudio slot is null but sfx cue has audioUrl (production crash regression)', () => {
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
        { description: 'Footsteps', sourceBeatId: 'bt_a1', audioUrl: SFX_A1 },
      ],
      sfxAudio: [null, null],
      sfxSourceMeta: [
        null,
        { source: 'veo', clipDurationSeconds: 4, promptMode: 'actionBeat' },
      ],
    }

    const { visualFrames, voiceClips } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedStoryboardSfxClips(scene, visualFrames, {
      voiceEndTime: voiceClips[0].startTime + voiceClips[0].duration,
    })

    expect(clips).toHaveLength(1)
    expect(clips[0].url).toBe(SFX_A1)
    expect(clips[0].label).toBe('Footsteps')
    expect(clips[0].duration).toBe(4)
    expect(clips[0].startTime).toBe(visualFrames.find((f) => f.beatId === 'bt_a1')!.startTime)
  })

  it('omits SFX clips for beats with sfxMuted true', () => {
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
          sfxMuted: true,
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

    expect(clips).toHaveLength(1)
    expect(clips[0].id).toBe('sfx-beat-bt_a2')
    expect(clips.find((c) => c.id === 'sfx-beat-bt_a1')).toBeUndefined()
  })
})

describe('isBeatSfxMuted', () => {
  it('defaults to not muted when sfxMuted is undefined', () => {
    expect(isBeatSfxMuted({ beatId: 'x', sequenceIndex: 0, kind: 'action' })).toBe(false)
  })

  it('returns true only when sfxMuted is explicitly true', () => {
    expect(
      isBeatSfxMuted({
        beatId: 'x',
        sequenceIndex: 0,
        kind: 'action',
        sfxMuted: true,
      })
    ).toBe(true)
    expect(
      isBeatSfxMuted({
        beatId: 'x',
        sequenceIndex: 0,
        kind: 'action',
        sfxMuted: false,
      })
    ).toBe(false)
  })
})
