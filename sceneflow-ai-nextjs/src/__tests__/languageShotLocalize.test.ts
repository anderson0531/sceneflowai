import { describe, expect, it } from 'vitest'
import {
  mergeLanguageShotConfigs,
  presentSegmentForShotMethod,
  resolveLanguageShotMethod,
  resolveShotVideoPlaybackRate,
  videoWallDurationSec,
} from '@/lib/scene/languageShotLocalize'
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

  it('drops invalid methods when merging saved configs', () => {
    const merged = mergeLanguageShotConfigs({
      beat_a: { method: 'lipsync', videoPlaybackRate: 1.1 },
      beat_b: { method: 'nope' as 'double' },
    })
    expect(merged.beat_a).toEqual({ method: 'lipsync', videoPlaybackRate: 1.1 })
    expect(merged.beat_b).toBeUndefined()
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
})
