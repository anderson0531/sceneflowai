import { describe, it, expect } from 'vitest'
import { buildSceneRenderAudioClips, toSceneRenderVideoSegment } from '@/lib/video/renderTypes'

describe('toSceneRenderVideoSegment', () => {
  it('passes watermarkCropPercent through to the job spec segment', () => {
    const mapped = toSceneRenderVideoSegment({
      segmentId: 'seg-1',
      sequenceIndex: 0,
      videoUrl: 'https://example.com/beat.mp4',
      startTime: 0,
      endTime: 5,
      watermarkCropPercent: 5,
      videoTrimInSec: 0.5,
      videoTrimOutSec: 4.5,
    })

    expect(mapped.watermarkCropPercent).toBe(5)
    expect(mapped.videoTrimInSec).toBe(0.5)
    expect(mapped.videoTrimOutSec).toBe(4.5)
    expect(mapped.duration).toBe(5)
  })

  it('omits watermarkCropPercent when not set on the request segment', () => {
    const mapped = toSceneRenderVideoSegment({
      segmentId: 'seg-2',
      sequenceIndex: 1,
      videoUrl: 'https://example.com/beat2.mp4',
      startTime: 5,
      endTime: 10,
    })

    expect(mapped.watermarkCropPercent).toBeUndefined()
  })

  it('passes audioSource none and audioVolume through to the job spec segment', () => {
    const mapped = toSceneRenderVideoSegment({
      segmentId: 'seg-muted',
      sequenceIndex: 0,
      videoUrl: 'https://example.com/beat.mp4',
      startTime: 0,
      endTime: 5,
      audioSource: 'none',
      audioVolume: 0,
    })

    expect(mapped.audioSource).toBe('none')
    expect(mapped.audioVolume).toBe(0)
  })
})

describe('buildSceneRenderAudioClips', () => {
  it('preserves per-clip volume, trimStart, and playbackRate instead of overwriting with top-level track volumes', () => {
    const clips = buildSceneRenderAudioClips(
      {
        includeNarration: true,
        includeDialogue: true,
        includeMusic: true,
        includeSfx: true,
        includeSegmentAudio: true,
        language: 'en',
        narrationVolume: 0.8,
        dialogueVolume: 0.9,
        musicVolume: 0.4,
        sfxVolume: 0.5,
      },
      {
        narration: [{ url: 'https://example.com/narr.mp3', startTime: 0, duration: 6, volume: 0.35 }],
        dialogue: [
          {
            url: 'https://example.com/line1.mp3',
            startTime: 2,
            duration: 3,
            volume: 0.27,
            playbackRate: 1.1,
          },
        ],
        music: [
          {
            url: 'https://example.com/cue.wav',
            startTime: 0,
            duration: 5,
            volume: 0.08,
            loop: false,
            fadeInSec: 1,
          },
          {
            url: 'https://example.com/cue.wav',
            startTime: 5,
            duration: 5,
            trimStart: 5,
            volume: 0.2,
            loop: false,
            fadeOutSec: 2,
          },
        ],
        sfx: [
          {
            url: 'https://example.com/bg_stem.wav',
            startTime: 0,
            duration: 5,
            volume: 0.15,
            playbackRate: 1.05,
          },
        ],
      }
    )

    const narr = clips.find((c) => c.type === 'narration')!
    const dlg = clips.find((c) => c.type === 'dialogue')!
    const musicSlices = clips.filter((c) => c.type === 'music')
    const sfx = clips.find((c) => c.type === 'sfx')!

    expect(narr.volume).toBeCloseTo(0.35)
    expect(dlg.volume).toBeCloseTo(0.27)
    expect(dlg.playbackRate).toBeCloseTo(1.1)
    expect(musicSlices[0].volume).toBeCloseTo(0.08)
    expect(musicSlices[0].trimStart).toBeCloseTo(0.001)
    expect(musicSlices[1].volume).toBeCloseTo(0.2)
    expect(musicSlices[1].trimStart).toBeCloseTo(5)
    expect(sfx.volume).toBeCloseTo(0.15)
    expect(sfx.playbackRate).toBeCloseTo(1.05)
  })

  it('applies speech auto-ducking when callers omit per-clip music volume and enable autoDuckMusic', () => {
    const clips = buildSceneRenderAudioClips(
      {
        includeNarration: true,
        includeDialogue: false,
        includeMusic: true,
        includeSfx: false,
        includeSegmentAudio: false,
        language: 'en',
        narrationVolume: 0.8,
        musicVolume: 0.4,
        autoDuckMusic: true,
      },
      {
        narration: [{ url: 'https://example.com/narr.mp3', startTime: 0, duration: 5 }],
        music: [{ url: 'https://example.com/cue.wav', startTime: 0, duration: 5, loop: false }],
      }
    )

    const music = clips.find((c) => c.type === 'music')!
    expect(music.volume).toBeCloseTo(0.4 * 0.398, 4)
  })

  it('always sets trimStart >= 0.001 on single looping music clips and clamps audio to total video clip duration', () => {
    const videoSegments = [
      toSceneRenderVideoSegment({
        segmentId: 'seg-1',
        sequenceIndex: 0,
        videoUrl: 'https://example.com/beat1.mp4',
        startTime: 0,
        endTime: 8,
        audioSource: 'original',
        audioVolume: 1,
      }),
    ]

    const clips = buildSceneRenderAudioClips(
      {
        includeNarration: false,
        includeDialogue: false,
        includeMusic: true,
        includeSfx: false,
        includeSegmentAudio: true,
        language: 'en',
        musicVolume: 0.15,
        autoDuckMusic: true,
      },
      {
        music: [
          {
            url: 'https://example.com/music30s.wav',
            startTime: 0,
            duration: 30,
            loop: true,
          },
        ],
      },
      videoSegments
    )

    expect(clips).toHaveLength(1)
    expect(clips[0].duration).toBe(8)
    expect(clips[0].trimStart).toBeCloseTo(0.001)
    expect(clips[0].volume).toBeCloseTo(0.15 * 0.398, 4)
  })
})
