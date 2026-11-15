import { describe, expect, it } from 'vitest'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import {
  buildCombinedSpeechDuckWindows,
  computeNarrationElasticAdjustments,
  mixerNarrationClipsToRenderPayload,
  resolveMixerNarrationClips,
  resolveUnifiedManualVideoRate,
} from '@/lib/scene/mixerNarrationCues'
import {
  buildPersistedMixerSettings,
  DEFAULT_MIXER_AUDIO_TRACKS,
  mergeMixerSettings,
} from '@/lib/scene/mixerSettings'
import {
  computePlaybackSegmentDuration,
  getClipsAssignedToSegment,
} from '@/lib/scene/mixerTiming'
import { PROMO_LEGACY_NARRATION_LINE_ID } from '@/lib/script/sceneNarrationCues'
import {
  buildSceneRenderAudioClips,
  toSceneRenderVideoSegment,
} from '@/lib/video/renderTypes'

function makeSeg(
  id: string,
  index: number,
  startSec: number,
  durSec: number,
  beatId: string,
  assetType: 'video' | 'image' = 'video'
): SceneSegment {
  return {
    segmentId: id,
    sequenceIndex: index,
    startTime: startSec,
    endTime: startSec + durSec,
    status: 'COMPLETE',
    activeAssetUrl:
      assetType === 'image'
        ? `https://cdn.example.com/${id}.png`
        : `https://cdn.example.com/${id}.mp4`,
    assetType,
    beatId,
    actualVideoDuration: assetType === 'video' ? durSec : undefined,
    imageDuration: assetType === 'image' ? durSec : undefined,
    takes: [],
    references: { startFrameUrl: null, endFrameUrl: null, characterRefs: [], sceneRefs: [] },
    prompt: 'Shot prompt',
  } as unknown as SceneSegment
}

describe('Mixer narration elastic pacing, alignment & render spec parity', () => {
  it('computes Intro Freeze, Close Freeze, Slow-Mo Fit, and Flow adjustments across multi-shot cues', () => {
    const segments = [
      makeSeg('seg-1', 0, 0, 5, 'b1'),
      makeSeg('seg-2', 1, 5, 5, 'b2'),
      makeSeg('seg-3', 2, 10, 4, 'b3'),
    ]
    const beats = [
      { beatId: 'b1', sequenceIndex: 0, kind: 'action', actionDescription: 'Shot 1' },
      { beatId: 'b2', sequenceIndex: 1, kind: 'action', actionDescription: 'Shot 2' },
      { beatId: 'b3', sequenceIndex: 2, kind: 'action', actionDescription: 'Shot 3' },
    ]

    // 1. Intro-Freeze on Shot 1 (2.5s intro freeze before motion starts; 7s cue over 5s shot -> +2s overrun absorbed by intro!)
    const introScene = {
      id: 'sc-intro',
      beats,
      sceneNarrationCues: [
        {
          cueId: 'cue-intro',
          beatStart: 0,
          beatEnd: 0,
          speakerType: 'narrator',
          alignmentMode: 'intro-freeze',
          introNarrationSec: 2.5,
          byLanguage: {
            en: {
              text: 'Meet the architect who built the impossible tower.',
              audioUrl: 'https://cdn.example.com/intro.mp3',
              durationSec: 7.0,
            },
          },
        },
      ],
    }
    const introAdj = computeNarrationElasticAdjustments({
      scene: introScene,
      segments,
      language: 'en',
      narrationEnabled: true,
      getBaseShotDuration: (seg, rate) => (seg.actualVideoDuration ?? 5) / rate,
    })
    expect(introAdj['seg-1']?.addedPreHoldSec).toBeCloseTo(2.5)
    expect(introAdj['seg-1']?.addedPostHoldSec).toBe(0)
    expect(introAdj['seg-1']?.suggestedPreHoldStyle).toBe('push')

    // 2. Slow-Mo Fit across Shots 1–2 (13s cue over 10s combined motion -> slows both shots proportionally!)
    const slowMoScene = {
      id: 'sc-slowmo',
      beats,
      sceneNarrationCues: [
        {
          cueId: 'cue-slow',
          beatStart: 0,
          beatEnd: 1,
          speakerType: 'narrator',
          alignmentMode: 'slow-mo-fit',
          byLanguage: {
            en: {
              text: 'Across two connected shots, time slows cleanly to fit the voiceover.',
              audioUrl: 'https://cdn.example.com/slow.mp3',
              durationSec: 12.5,
            },
          },
        },
      ],
    }
    const slowAdj = computeNarrationElasticAdjustments({
      scene: slowMoScene,
      segments,
      language: 'en',
      narrationEnabled: true,
      getBaseShotDuration: (seg, rate) => (seg.actualVideoDuration ?? 5) / rate,
    })
    expect(slowAdj['seg-1']?.effectiveVideoPlaybackRate).toBeCloseTo(0.8, 2)
    expect(slowAdj['seg-2']?.effectiveVideoPlaybackRate).toBeCloseTo(0.8, 2)
    expect(slowAdj['seg-2']?.addedPostHoldSec).toBe(0)

    // 3. Outro-Freeze on Shot 3 (6.5s cue over 4s shot -> +2.5s Close Freeze on seg-3)
    const outroScene = {
      id: 'sc-outro',
      beats,
      sceneNarrationCues: [
        {
          cueId: 'cue-outro',
          beatStart: 2,
          beatEnd: 2,
          speakerType: 'narrator',
          alignmentMode: 'outro-freeze',
          byLanguage: {
            en: {
              text: 'Notice the hairline fracture left behind on the seal.',
              audioUrl: 'https://cdn.example.com/outro.mp3',
              durationSec: 6.5,
            },
          },
        },
      ],
    }
    const outroAdj = computeNarrationElasticAdjustments({
      scene: outroScene,
      segments,
      language: 'en',
      narrationEnabled: true,
      getBaseShotDuration: (seg, rate) => (seg.actualVideoDuration ?? 4) / rate,
    })
    expect(outroAdj['seg-3']?.addedPostHoldSec).toBeCloseTo(2.5)
    expect(outroAdj['seg-3']?.suggestedHoldStyle).toBe('push')
  })

  it('unlocks manual videoPlaybackRate for English & localized streams and excludes narration-owned lines from A1 Dialogue', () => {
    expect(
      resolveUnifiedManualVideoRate(
        'seg-1',
        { 'seg-1': { includeAudio: true, volume: 1, videoPlaybackRate: 0.75 } },
        { 'seg-1': { method: 'double', videoPlaybackRate: 0.9 } }
      )
    ).toBeCloseTo(0.75)

    const seg = {
      ...makeSeg('seg-1', 0, 0, 6, 'b1'),
      dialogueLineIds: [PROMO_LEGACY_NARRATION_LINE_ID],
    }
    const promoClip = {
      id: 'dialogue-0',
      audioUrl: 'https://cdn.example.com/promo-vo.mp3',
      duration: 24,
      segmentId: 'seg-1',
      lineId: PROMO_LEGACY_NARRATION_LINE_ID,
      startTime: 0,
    }
    expect(getClipsAssignedToSegment(seg, [promoClip], 0, null)).toHaveLength(1)
    const assignedWithExclusion = getClipsAssignedToSegment(
      seg,
      [promoClip],
      0,
      null,
      new Set([PROMO_LEGACY_NARRATION_LINE_ID])
    )
    expect(assignedWithExclusion).toHaveLength(0)

    const totalShotDur = computePlaybackSegmentDuration({
      segment: seg,
      dialogueEnabled: true,
      dialogueClips: [promoClip],
      probedDurations: {},
      narrationPrefix: 0,
      getPlaybackRate: () => 1,
      excludedLineIds: new Set([PROMO_LEGACY_NARRATION_LINE_ID]),
      preSegmentHoldSec: 2.0,
      videoPlaybackRate: 0.75, // 6s / 0.75 = 8s motion
      manualPostPause: 1.5,
      narrationPostPause: 0.5,
    })
    // 2.0s intro freeze + 8.0s slow-mo motion + 1.5s manual close hold + 0.5s narration elastic hold = 12.0s (NOT 24s!)
    expect(totalShotDur).toBeCloseTo(12.0)
  })

  it('projects multi-shot narration clips, merges Dialogue + Narration duck windows, and computes extraFinalHoldSec', () => {
    const segments = [
      makeSeg('seg-1', 0, 0, 4, 'b1'),
      makeSeg('seg-2', 1, 4, 5, 'b2', 'image'),
    ]
    const scene = {
      id: 'sc-memoir',
      beats: [
        { beatId: 'b1', sequenceIndex: 0, kind: 'action', actionDescription: 'Clip' },
        { beatId: 'b2', sequenceIndex: 1, kind: 'action', actionDescription: 'Archival photo' },
      ],
      sceneNarrationCues: [
        {
          cueId: 'cue-1',
          beatStart: 0,
          beatEnd: 1,
          speakerType: 'character',
          characterName: 'Grandmother Lin',
          alignmentMode: 'flow',
          startOffsetSec: 0.5,
          byLanguage: {
            en: {
              text: 'We crossed the harbor at dawn with only one suitcase.',
              audioUrl: 'https://cdn.example.com/lin.mp3',
              durationSec: 9.5,
            },
          },
        },
      ],
    }

    const projected = resolveMixerNarrationClips({
      scene,
      segments,
      language: 'en',
      getPlaybackSegmentDuration: (s) => (s.segmentId === 'seg-1' ? 4 : 5),
      narrationConfig: { ...DEFAULT_MIXER_AUDIO_TRACKS.narration, enabled: true, volume: 0.9 },
    })

    expect(projected.usingCues).toBe(true)
    expect(projected.clips).toHaveLength(1)
    expect(projected.clips[0]?.startTime).toBeCloseTo(0.5)
    expect(projected.clips[0]?.speakerLabel).toBe('Grandmother Lin (V.O.)')
    expect(projected.clips[0]?.coveredSegmentIds).toEqual(['seg-1', 'seg-2'])

    // Cue ends at 0.5 + 9.5 = 10.0s over 9.0s total video -> adds 1.0 + 0.15 = 1.15s extraFinalHoldSec!
    const renderPayload = mixerNarrationClipsToRenderPayload(
      projected.clips,
      { ...DEFAULT_MIXER_AUDIO_TRACKS.narration, enabled: true, volume: 0.9, warmBroadcastEq: false },
      9.0
    )
    expect(renderPayload.extraFinalHoldSec).toBeCloseTo(1.15)
    expect(renderPayload.narrationRenderClips[0]?.warmBroadcastEq).toBe(false)

    // Coalesce adjacent Dialogue + Narration speech windows within 180ms
    const duckWindows = buildCombinedSpeechDuckWindows({
      dialogueWindows: [{ startTime: 0, endTime: 2.0 }],
      narrationClips: [
        { startTime: 2.1, duration: 4.0 },
        { startTime: 8.0, duration: 2.0 },
      ],
      narrationEnabled: true,
    })
    expect(duckWindows).toEqual([
      { startTime: 0, endTime: 6.1 },
      { startTime: 8.0, endTime: 10.0 },
    ])
  })

  it('prevents pauseDuration double-counting and 50ms narration truncation in renderTypes', () => {
    const segVideo = toSceneRenderVideoSegment({
      segmentId: 'seg-1',
      sequenceIndex: 0,
      videoUrl: 'https://cdn.example.com/s1.mp4',
      assetType: 'video',
      startTime: 0,
      endTime: 11, // 2s preHold + 6s motion + 3s pauseDuration
      preSegmentHoldSec: 2,
      preHoldStyle: 'push',
      pauseDuration: 3,
      holdStyle: 'push',
      playbackRate: 0.75,
    })
    const segStill = toSceneRenderVideoSegment({
      segmentId: 'seg-2',
      sequenceIndex: 1,
      videoUrl: 'https://cdn.example.com/s2.png',
      assetType: 'image',
      startTime: 11,
      endTime: 15,
      audioSource: 'none',
      audioVolume: 0,
      pauseDuration: 0,
    })

    // Pure motion duration is 6s (NOT 11s!), so 2 + 6 + 3 = 11s total without double-counting
    expect(segVideo.duration).toBeCloseTo(6)
    expect(segVideo.preSegmentHoldSec).toBe(2)
    expect(segVideo.pauseDuration).toBe(3)
    expect(segStill.assetType).toBe('image')

    const audioClips = buildSceneRenderAudioClips(
      {
        includeNarration: true,
        includeDialogue: false,
        includeMusic: true,
        includeSfx: true,
        includeSegmentAudio: true,
        language: 'en',
        narrationVolume: 0.9,
        dialogueVolume: 0.9,
        musicVolume: 0.3,
        sfxVolume: 0.6,
        segmentAudioVolume: 1,
        autoDuckMusic: true,
      },
      {
        // Omitted duration (like Promo trailer render) must become 0 (play full file), NEVER 0.05s!
        narration: [
          {
            url: 'https://cdn.example.com/promo-vo.mp3',
            startTime: 1.0,
            warmBroadcastEq: false,
          },
        ],
        music: [
          {
            url: 'https://cdn.example.com/score.mp3',
            startTime: 0,
            duration: 30,
            loop: true,
          },
        ],
        sfx: [
          {
            url: 'https://cdn.example.com/demucs-stem.wav',
            startTime: 2.0,
            duration: 6.0,
            trimStart: 1.25,
            volume: 0.8,
          },
        ],
      },
      [segVideo, segStill]
    )

    const narrClip = audioClips.find((c) => c.type === 'narration')!
    const musicClip = audioClips.find((c) => c.type === 'music')!
    const sfxClip = audioClips.find((c) => c.type === 'sfx')!

    expect(narrClip.duration).toBe(0)
    expect(narrClip.warmBroadcastEq).toBe(false)
    // Total video duration = (2 + 6 + 3) + 4 = 15s (exact!)
    expect(musicClip.duration).toBeCloseTo(15)
    // Demucs background stem preserves explicit trimStart = 1.25s
    expect(sfxClip.trimStart).toBeCloseTo(1.25)
  })

  it('persists and merges narrationCueConfigs, sceneIntroTransition, sceneEndTransition, and shot alignment fields', () => {
    const merged = mergeMixerSettings({
      audioTracks: {
        narration: { enabled: true, volume: 0.95, warmBroadcastEq: false },
      },
      narrationCueConfigs: {
        'cue-1': { enabled: true, volume: 1.15, startOffsetSec: 0.5, alignmentMode: 'intro-freeze' },
      },
      sceneIntroTransition: { effect: 'fade_in', durationSec: 1.5, leadInHoldSec: 1.0 },
      sceneEndTransition: { effect: 'fade', durationSec: 1.0, holdSec: 2.0 },
      segmentAudioConfigs: {
        'seg-1': {
          includeAudio: true,
          volume: 0.8,
          preSegmentHoldSec: 2.0,
          preHoldStyle: 'push',
          videoPlaybackRate: 0.75,
        },
      },
    })

    expect(merged.audioTracks.narration.warmBroadcastEq).toBe(false)
    expect(merged.narrationCueConfigs['cue-1']?.alignmentMode).toBe('intro-freeze')
    expect(merged.sceneIntroTransition.effect).toBe('fade_in')
    expect(merged.sceneEndTransition?.holdSec).toBe(2.0)
    expect(merged.segmentAudioConfigs['seg-1']?.preSegmentHoldSec).toBe(2.0)
    expect(merged.segmentAudioConfigs['seg-1']?.videoPlaybackRate).toBe(0.75)

    const persisted = buildPersistedMixerSettings({
      audioTracks: merged.audioTracks,
      segmentAudioConfigs: merged.segmentAudioConfigs,
      dialogueClipConfigs: {},
      narrationCueConfigs: merged.narrationCueConfigs,
      sceneIntroTransition: merged.sceneIntroTransition,
      sceneEndTransition: merged.sceneEndTransition,
      masterSegmentVolume: merged.masterSegmentVolume,
      resolution: merged.resolution,
      preserveBackgroundStem: merged.preserveBackgroundStem,
      includeSpeechStem: merged.includeSpeechStem,
      klingLipsyncEnabled: merged.klingLipsyncEnabled,
      watermarkConfig: merged.watermarkConfig,
      collapsedSections: merged.collapsedSections,
      theaterMode: merged.theaterMode,
      productionTarget: merged.productionTarget,
    })

    expect(persisted.narrationCueConfigs?.['cue-1']?.volume).toBe(1.15)
    expect(persisted.sceneIntroTransition?.leadInHoldSec).toBe(1.0)
    expect(persisted.sceneEndTransition?.effect).toBe('fade')
  })
})
