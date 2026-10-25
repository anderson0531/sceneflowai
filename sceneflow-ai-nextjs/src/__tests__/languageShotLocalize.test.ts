import { describe, expect, it } from 'vitest'
import {
  AUTO_SLOW_VIDEO_MIN_RATE,
  HYBRID_SLOW_VIDEO_MIN_RATE,
  computeDubAudioSpeedForVideo,
  computeSlowVideoRateForDub,
  mergeLanguageShotConfigs,
  presentSegmentForShotMethod,
  resolveLanguageShotMethod,
  resolveShotVideoPlaybackRate,
  videoWallDurationSec,
} from '@/lib/scene/languageShotLocalize'
import { buildSceneDubRenderRequest } from '@/lib/streams/streamLocalize'
import type { SceneSegment } from '@/components/vision/scene-production/types'

describe('resolveLanguageShotMethod', () => {
  it('defaults to double', () => {
    expect(resolveLanguageShotMethod({})).toBe('double')
  })

  it('keeps an explicit choice ahead of the legacy scene-wide switch', () => {
    expect(
      resolveLanguageShotMethod({
        config: { method: 'regenerate' },
        klingLipsyncEnabled: true,
        legacyLocalizeLipsync: true,
      })
    ).toBe('regenerate')
  })

  it('migrates a saved scene-wide Kling switch onto shots that have no choice', () => {
    expect(resolveLanguageShotMethod({ klingLipsyncEnabled: true })).toBe('lipsync')
    expect(resolveLanguageShotMethod({ legacyLocalizeLipsync: true })).toBe('lipsync')
  })
})

describe('video playback rate', () => {
  it('clamps to the dialogue speed range and treats a missing rate as 1', () => {
    expect(resolveShotVideoPlaybackRate(undefined)).toBe(1)
    expect(resolveShotVideoPlaybackRate({ videoPlaybackRate: 2 })).toBe(1.5)
    expect(resolveShotVideoPlaybackRate({ videoPlaybackRate: 0.1 })).toBe(0.5)
    expect(videoWallDurationSec(8, 1.25)).toBeCloseTo(6.4)
  })

  it('drops invalid methods when merging saved configs and preserves signageText', () => {
    const merged = mergeLanguageShotConfigs({
      beat_a: { method: 'lipsync', videoPlaybackRate: 1.1, signageText: 'Abierto' },
      beat_b: { method: 'nope' as 'double' },
    })
    expect(merged.beat_a).toEqual({
      method: 'lipsync',
      videoPlaybackRate: 1.1,
      signageText: 'Abierto',
    })
    expect(merged.beat_b).toBeUndefined()
  })

  it('computes slowed video rate for longer dubbed audio (e.g. 10s clip -> up to 15s)', () => {
    const fit15 = computeSlowVideoRateForDub(10, 15, AUTO_SLOW_VIDEO_MIN_RATE)
    expect(fit15.videoPlaybackRate).toBe(0.67)
    expect(fit15.stretchedVideoSec).toBeCloseTo(10 / 0.67, 2)

    const fit12 = computeSlowVideoRateForDub(10, 12.5, AUTO_SLOW_VIDEO_MIN_RATE)
    expect(fit12.videoPlaybackRate).toBe(0.8)
    expect(fit12.stretchedVideoSec).toBeCloseTo(12.5, 2)
    expect(fit12.remainingHoldSec).toBe(0)

    const hybrid = computeSlowVideoRateForDub(10, 15, HYBRID_SLOW_VIDEO_MIN_RATE)
    expect(hybrid.videoPlaybackRate).toBe(0.8)
    expect(hybrid.stretchedVideoSec).toBeCloseTo(12.5, 2)
    expect(hybrid.remainingHoldSec).toBeCloseTo(2.5, 2)
  })

  it('computes dubbed audio speed to fit natural video duration', () => {
    const fit = computeDubAudioSpeedForVideo(10, 12, 1.25)
    expect(fit.audioPlaybackRate).toBe(1.2)
    expect(fit.compressedAudioSec).toBeCloseTo(10, 2)
  })
})

describe('presentSegmentForShotMethod', () => {
  const segment = {
    segmentId: 'seg-1',
    activeAssetUrl: 'https://example.com/master.mp4',
    assetType: 'video',
    status: 'COMPLETE',
    takes: [],
    languageVersions: {
      es: {
        takes: [
          {
            id: 'take-es',
            createdAt: '2026-01-01T00:00:00.000Z',
            assetUrl: 'https://example.com/es.mp4',
            status: 'COMPLETE',
          },
        ],
        currentTakeId: 'take-es',
      },
    },
  } as unknown as SceneSegment

  it('plays the language clip only for regenerate', () => {
    expect(presentSegmentForShotMethod(segment, 'es', 'double').activeAssetUrl).toBe(
      'https://example.com/master.mp4'
    )
    expect(presentSegmentForShotMethod(segment, 'es', 'lipsync').activeAssetUrl).toBe(
      'https://example.com/master.mp4'
    )
    expect(presentSegmentForShotMethod(segment, 'es', 'regenerate').activeAssetUrl).toBe(
      'https://example.com/es.mp4'
    )
  })

  it('builds dub render request retaining unselected master shots, using regenerated shots, and preserving dialogue-free stems', () => {
    const sceneProduction = {
      isSegmented: true,
      targetSegmentDuration: 8,
      mixerSettingsByLanguage: {
        es: {
          preserveBackgroundStem: true,
          includeSpeechStem: false,
          languageShotConfigs: {
            'seg-1': { method: 'regenerate' as const, videoPlaybackRate: 0.8 },
            'seg-2': { method: 'double' as const, videoPlaybackRate: 0.67 },
          },
          segmentAudioConfigs: {
            'seg-1': { includeAudio: true, volume: 1.0, holdStyle: 'push' as const },
            'seg-2': {
              includeAudio: true,
              volume: 0.9,
              holdStyle: 'freeze' as const,
              audioLeadInSec: 0.3,
            },
          },
        },
      },
      segments: [
        {
          segmentId: 'seg-1',
          sequenceIndex: 0,
          startTime: 0,
          endTime: 4,
          status: 'COMPLETE' as const,
          assetType: 'video' as const,
          activeAssetUrl: 'https://example.com/master-1.mp4',
          references: { characterIds: [], sceneRefIds: [], objectRefIds: [] },
          takes: [],
          languageVersions: {
            es: {
              takes: [
                {
                  id: 'es-take-1',
                  createdAt: '2026-01-01T00:00:00.000Z',
                  assetUrl: 'https://example.com/es-regen-1.mp4',
                  status: 'COMPLETE' as const,
                },
              ],
              currentTakeId: 'es-take-1',
            },
          },
        },
        {
          segmentId: 'seg-2',
          sequenceIndex: 1,
          startTime: 4,
          endTime: 14,
          status: 'COMPLETE' as const,
          assetType: 'video' as const,
          activeAssetUrl: 'https://example.com/master-2.mp4',
          references: { characterIds: [], sceneRefIds: [], objectRefIds: [] },
          takes: [],
          stemSeparation: {
            status: 'complete' as const,
            backgroundStemUrl: 'https://example.com/master-2-bg-stem.mp3',
          },
        },
      ],
    }

    const scriptScene = {
      id: 'scene-1',
      dialogueAudio: {
        es: [{ audioUrl: 'https://example.com/es-line1.mp3', duration: 6, character: 'ELARA' }],
      },
      sfx: [{ audioUrl: 'https://example.com/thunder.mp3', startTime: 1, duration: 3 }],
    }

    const req = buildSceneDubRenderRequest({
      projectId: 'proj-1',
      sceneId: 'scene-1',
      sceneNumber: 1,
      scriptScene,
      sceneProduction,
      language: 'es',
      speed: 1,
      stemMode: 'keep-background',
    })

    expect(req).not.toBeNull()
    expect(req!.segments[0].videoUrl).toBe('https://example.com/es-regen-1.mp4')
    expect(req!.segments[0].audioSource).toBe('original')
    expect(req!.segments[0].holdStyle).toBe('push')
    expect(req!.segments[1].videoUrl).toBe('https://example.com/master-2.mp4')
    expect(req!.segments[1].playbackRate).toBe(0.67)
    expect(req!.segments[1].audioLeadInSec).toBe(0.3)
    expect(req!.audioTracks.sfx?.map((s) => s.url)).toEqual([
      'https://example.com/thunder.mp3',
      'https://example.com/master-2-bg-stem.mp3',
    ])
  })
})
