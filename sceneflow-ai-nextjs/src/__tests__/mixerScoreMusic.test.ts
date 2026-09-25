import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  foldScoreStemFades,
  mapMixerPlaybackSegments,
  mixerMusicClipsToRenderPayload,
  resolveMixerMusicClips,
  scoreStemEnvelopeGain,
} from '@/lib/scene/mixerScoreMusic'
import type { AudioTrackConfig } from '@/components/vision/scene-production/types'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import { buildProductionMusicCueClips } from '@/lib/scene/productionMusicCues'

const DREAD_URL = 'https://blob.example.com/dread.wav'
const VIOLENCE_URL = 'https://blob.example.com/violence.wav'
const LEGACY_URL = 'https://blob.example.com/scene-loop.wav'

const musicConfig = (): AudioTrackConfig => ({
  enabled: true,
  volume: 0.4,
  startOffset: 0,
  startSegment: 0,
  endSegment: -1,
  loop: true,
  fadeInSec: 1,
  fadeOutSec: 2,
  playbackRate: 1,
})

const seg = (id: string, duration: number): SceneSegment =>
  ({
    segmentId: id,
    sequenceIndex: 0,
    startTime: 0,
    endTime: duration,
    status: 'COMPLETE',
    assetType: 'video',
    takes: [],
    segmentDirection: null,
    transitionType: 'CUT',
    generationMethod: 'REF',
    references: {},
    action: '',
    beatId: id,
  }) as SceneSegment

function cueScene(overrides?: {
  cues?: Record<string, unknown>[]
  musicAudio?: string
}) {
  const scene: Record<string, unknown> = {
    beats: ['bt_a1', 'bt_a2', 'bt_a3', 'bt_a4'].map((beatId) => ({
      beatId,
      kind: 'action',
      actionDescription: beatId,
      durationSeconds: 4,
    })),
    sceneMusicCues:
      overrides?.cues ?? [
        {
          cueId: 'cue-0-1',
          beatStart: 0,
          beatEnd: 1,
          description: 'Cinematic orchestral score, ominous mood, slow tempo',
          intent: 'rising dread',
          url: DREAD_URL,
          fileDuration: 30,
          volume: 0.5,
          fadeInSec: 1.5,
        },
        {
          cueId: 'cue-2-3',
          beatStart: 2,
          beatEnd: 3,
          description: 'Cinematic orchestral score, aggressive mood, driving tempo',
          intent: 'the turn into violence',
          url: VIOLENCE_URL,
          fileDuration: 30,
        },
      ],
  }
  if (overrides?.musicAudio) scene.musicAudio = overrides.musicAudio
  return scene
}

describe('mapMixerPlaybackSegments', () => {
  it('places cues on mixer playback durations rather than stored startTime', () => {
    const segments = [seg('bt_a1', 8), seg('bt_a2', 12), seg('bt_a3', 6), seg('bt_a4', 4)]
    const mapped = mapMixerPlaybackSegments(segments, (s) => s.endTime - s.startTime)
    expect(mapped).toEqual([
      { beatId: 'bt_a1', startTime: 0, endTime: 8, duration: 8 },
      { beatId: 'bt_a2', startTime: 8, endTime: 20, duration: 12 },
      { beatId: 'bt_a3', startTime: 20, endTime: 26, duration: 6 },
      { beatId: 'bt_a4', startTime: 26, endTime: 30, duration: 4 },
    ])
  })
})

describe('resolveMixerMusicClips', () => {
  const getDur = (s: SceneSegment) => s.endTime - s.startTime

  it('schedules scored cues on the mixer playback timeline and replaces legacy', () => {
    const segments = [seg('bt_a1', 8), seg('bt_a2', 12), seg('bt_a3', 6), seg('bt_a4', 4)]
    const { clips, usingScore } = resolveMixerMusicClips({
      scene: cueScene({ musicAudio: LEGACY_URL }),
      segments,
      getPlaybackSegmentDuration: getDur,
      musicConfig: musicConfig(),
      legacyMusicUrl: LEGACY_URL,
      musicFileDuration: 30,
    })

    expect(usingScore).toBe(true)
    expect(clips.map((clip) => clip.url)).toEqual([DREAD_URL, VIOLENCE_URL])
    expect(clips[0]).toMatchObject({
      startTime: 0,
      duration: 20,
      label: 'rising dread',
      volume: 0.5,
      fadeInSec: 1.5,
    })
    expect(clips[1]).toMatchObject({ startTime: 20, duration: 10, label: 'the turn into violence' })
  })

  it('falls back to the legacy scene track when no cue has a URL', () => {
    const segments = [seg('bt_a1', 5), seg('bt_a2', 8), seg('bt_a3', 4)]
    const { clips, usingScore } = resolveMixerMusicClips({
      scene: cueScene({
        cues: [
          {
            cueId: 'cue-0-1',
            beatStart: 0,
            beatEnd: 1,
            description: 'Cinematic orchestral score, ominous mood, slow tempo',
            intent: 'rising dread',
          },
        ],
        musicAudio: LEGACY_URL,
      }),
      segments,
      getPlaybackSegmentDuration: getDur,
      musicConfig: { ...musicConfig(), startSegment: 1, endSegment: 1 },
      legacyMusicUrl: LEGACY_URL,
      musicFileDuration: 30,
    })

    expect(usingScore).toBe(false)
    expect(clips).toHaveLength(1)
    expect(clips[0]).toMatchObject({
      id: 'music-legacy',
      url: LEGACY_URL,
      startTime: 5,
      duration: 8,
      fadeInSec: 1,
      fadeOutSec: 2,
    })
  })

  it('returns nothing when the scene has neither scored cues nor a legacy URL', () => {
    const { clips, usingScore } = resolveMixerMusicClips({
      scene: cueScene({
        cues: [
          {
            cueId: 'cue-0-1',
            beatStart: 0,
            beatEnd: 1,
            description: 'Cinematic orchestral score',
            intent: 'dread',
          },
        ],
      }),
      segments: [seg('bt_a1', 5)],
      getPlaybackSegmentDuration: getDur,
      musicConfig: musicConfig(),
    })
    expect(usingScore).toBe(false)
    expect(clips).toEqual([])
  })
})

describe('mixerMusicClipsToRenderPayload', () => {
  it('multiplies master volume by cue mix for export', () => {
    const payload = mixerMusicClipsToRenderPayload(
      [
        {
          id: 'music-cue-0-1',
          url: DREAD_URL,
          startTime: 0,
          duration: 20,
          label: 'rising dread',
          loop: false,
          actualDuration: 30,
          volume: 0.5,
          fadeInSec: 1.5,
        },
      ],
      musicConfig()
    )
    expect(payload).toEqual([
      {
        url: DREAD_URL,
        startTime: 0,
        duration: 20,
        volume: 0.2,
        loop: false,
        fadeInSec: 1.5,
        fadeOutSec: 2,
        playbackRate: 1,
      },
    ])
  })
})

describe('score stem fades', () => {
  it('ramps in from the score start and out into the score end', () => {
    expect(scoreStemEnvelopeGain(0, 0, 10, 2, 2)).toBe(0)
    expect(scoreStemEnvelopeGain(1, 0, 10, 2, 2)).toBe(0.5)
    expect(scoreStemEnvelopeGain(5, 0, 10, 2, 2)).toBe(1)
    expect(scoreStemEnvelopeGain(9, 0, 10, 2, 2)).toBe(0.5)
  })

  it('folds the stem fade onto each cue edge without shortening a longer cue fade', () => {
    const folded = foldScoreStemFades(
      [
        { startTime: 0, duration: 8, fadeInSec: 1.5, fadeOutSec: 0 },
        { startTime: 8, duration: 4, fadeInSec: 0, fadeOutSec: 0.5 },
      ],
      3,
      2
    )
    expect(folded[0]).toMatchObject({ fadeInSec: 3, fadeOutSec: 0 })
    expect(folded[1]).toMatchObject({ fadeInSec: 0, fadeOutSec: 2 })
  })
})

describe('buildProductionMusicCueClips mix fields', () => {
  it('carries cue volume and fades onto production clips', () => {
    const clips = buildProductionMusicCueClips(
      {
        beats: [
          { beatId: 'bt_a1', kind: 'action' },
          { beatId: 'bt_a2', kind: 'action' },
        ],
        sceneMusicCues: [
          {
            cueId: 'cue-0-1',
            beatStart: 0,
            beatEnd: 1,
            description: 'Cinematic orchestral score, ominous mood, slow tempo',
            intent: 'rising dread',
            url: DREAD_URL,
            fileDuration: 30,
            volume: 0.25,
            fadeOutSec: 3,
          },
        ],
      },
      [
        { beatId: 'bt_a1', startTime: 0, endTime: 10 },
        { beatId: 'bt_a2', startTime: 10, endTime: 20 },
      ]
    )
    expect(clips[0]).toMatchObject({ volume: 0.25, fadeOutSec: 3 })
  })
})

describe('Mixer Score wiring', () => {
  it('schedules Score clips instead of a single musicAudio bed', () => {
    const mixer = readFileSync(
      path.resolve(__dirname, '../components/vision/scene-production/SceneProductionMixer.tsx'),
      'utf8'
    )
    expect(mixer).toContain('resolveMixerMusicClips')
    expect(mixer).toContain('mixerMusicClipsToRenderPayload')
    expect(mixer).toContain("label={mixerMusic.usingScore ? 'Score' : 'Background Music'}")
  })
})
