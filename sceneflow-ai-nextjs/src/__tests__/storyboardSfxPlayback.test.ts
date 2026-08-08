import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { buildBeatFirstPlaybackTimeline } from '@/lib/storyboard/types'
import {
  buildBeatAlignedStoryboardSfxClips,
  capDurationToFrameWindow,
  findFrameContainingTime,
  isBeatSfxMuted,
} from '@/lib/storyboard/sfxPlayback'

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

  it('omits SFX when first beat is muted even without cue sourceBeatId', () => {
    const scene = {
      imageUrl: 'https://example.com/est.jpg',
      dialogue: [{ character: 'Sarah', line: 'Hello.' }],
      beats: [
        {
          beatId: 'bt_a1',
          kind: 'action',
          actionDescription: 'Sarah enters the room',
          storyboardImageUrl: 'https://example.com/a1.jpg',
          sfxMuted: true,
        },
        {
          beatId: 'bt_a2',
          kind: 'action',
          actionDescription: 'Sarah looks around',
          storyboardImageUrl: 'https://example.com/a2.jpg',
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
      // Legacy string cue — no sourceBeatId (would previously ignore mute).
      sfx: ['Footsteps', { description: 'Room tone', sourceBeatId: 'bt_a2' }],
      sfxAudio: [SFX_A1, SFX_A2],
      sfxSourceMeta: [
        { source: 'veo', clipDurationSeconds: 8, promptMode: 'actionBeat' },
        { source: 'veo', clipDurationSeconds: 4, promptMode: 'actionBeat' },
      ],
    }

    const { visualFrames, voiceClips } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedStoryboardSfxClips(scene, visualFrames, {
      voiceEndTime: voiceClips[0].startTime + voiceClips[0].duration,
    })

    expect(clips.find((c) => c.url === SFX_A1)).toBeUndefined()
    expect(clips.some((c) => c.url === SFX_A2)).toBe(true)
  })

  it('caps long SFX duration to the containing visual frame window', () => {
    const scene = {
      imageUrl: 'https://example.com/est.jpg',
      dialogue: [{ character: 'Sarah', line: 'Hello.' }],
      beats: [
        {
          beatId: 'bt_a1',
          kind: 'action',
          actionDescription: 'Sarah enters',
          storyboardImageUrl: 'https://example.com/a1.jpg',
        },
        {
          beatId: 'bt_a2',
          kind: 'action',
          actionDescription: 'Sarah looks',
          storyboardImageUrl: 'https://example.com/a2.jpg',
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
      sfx: [{ description: 'Footsteps', sourceBeatId: 'bt_a1' }],
      sfxAudio: [SFX_A1],
      sfxSourceMeta: [{ source: 'veo', clipDurationSeconds: 12, promptMode: 'actionBeat' }],
    }

    const { visualFrames, voiceClips } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })
    const a1 = visualFrames.find((f) => f.beatId === 'bt_a1')!
    const a2 = visualFrames.find((f) => f.beatId === 'bt_a2')!

    const clips = buildBeatAlignedStoryboardSfxClips(scene, visualFrames, {
      voiceEndTime: voiceClips[0].startTime + voiceClips[0].duration,
    })

    expect(clips).toHaveLength(1)
    expect(clips[0].startTime).toBe(a1.startTime)
    expect(clips[0].startTime + clips[0].duration).toBeLessThanOrEqual(a2.startTime + 0.001)
    expect(clips[0].duration).toBeLessThan(12)
  })

  it('caps duration via containing frame when cue lacks sourceBeatId', () => {
    const frames = [
      {
        clipId: 'f1',
        frameType: 'establishing' as const,
        startTime: 0,
        duration: 4,
        beatId: 'bt_a1',
        imageUrl: 'https://example.com/a1.jpg',
        label: 'A1',
      },
      {
        clipId: 'f2',
        frameType: 'establishing' as const,
        startTime: 4,
        duration: 4,
        beatId: 'bt_a2',
        imageUrl: 'https://example.com/a2.jpg',
        label: 'A2',
      },
    ]
    const containing = findFrameContainingTime(frames, 0)
    expect(containing?.beatId).toBe('bt_a1')
    expect(capDurationToFrameWindow(0, 10, containing)).toBe(4)
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

describe('timeline + flash source guards', () => {
  it('hardens inactive clip stop with volume 0 and play generation tokens', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'src/hooks/useTimelinePlayback.ts'),
      'utf8'
    )
    expect(src).toContain('playGenerationRef')
    expect(src).toMatch(/audio\.volume\s*=\s*0/)
    expect(src).toContain('playGenerationRef.current.get(key) !== thisGen')
  })

  it('skips scene-start fade when poster matches beat-1 start', () => {
    const player = readFileSync(
      path.join(process.cwd(), 'src/components/vision/AudioGalleryPlayer.tsx'),
      'utf8'
    )
    expect(player).toContain('computeSceneStartFadeBlack')
    expect(player).toContain('shouldSkipPosterToPrimaryCrossfade')
    expect(player).toContain('skipFadeFromBlack')
  })
})
