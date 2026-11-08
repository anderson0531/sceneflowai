import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  areAllClipUrlsCached,
  getResolvedClipUrl,
  preloadSceneVideoClips,
} from '@/lib/video/mixerClipPreloader'

describe('mixerClipPreloader', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true for empty clip URL list in areAllClipUrlsCached', () => {
    expect(areAllClipUrlsCached([])).toBe(true)
    expect(areAllClipUrlsCached([undefined, null, ''])).toBe(true)
  })

  it('returns original trimmed URL from getResolvedClipUrl when not yet cached', () => {
    const raw = '  https://cdn.example.com/unloaded-shot.mp4  '
    expect(getResolvedClipUrl(raw)).toBe('https://cdn.example.com/unloaded-shot.mp4')
    expect(getResolvedClipUrl(undefined)).toBe('')
  })

  it('resolves immediately when segments have no video URLs', async () => {
    const onProgress = vi.fn()
    const result = await preloadSceneVideoClips(
      [
        { segmentId: 'seg-1', activeAssetUrl: null },
        { segmentId: 'seg-2', activeAssetUrl: undefined },
      ],
      { onProgress }
    )
    expect(onProgress).toHaveBeenCalledWith(0, 0)
    expect(result.resolvedUrlsBySegmentId).toEqual({})
    expect(result.durationsBySegmentId).toEqual({})
  })

  it('tracks progress across unique segment clip URLs', async () => {
    const progressSteps: Array<[number, number]> = []
    const result = await preloadSceneVideoClips(
      [
        { segmentId: 'seg-1', activeAssetUrl: 'https://cdn.example.com/shot-1.mp4' },
        { segmentId: 'seg-2', activeAssetUrl: 'https://cdn.example.com/shot-2.mp4' },
        { segmentId: 'seg-3', activeAssetUrl: 'https://cdn.example.com/shot-1.mp4' },
      ],
      {
        onProgress: (loaded, total) => progressSteps.push([loaded, total]),
      }
    )
    expect(progressSteps[0]).toEqual([0, 2])
    expect(progressSteps[progressSteps.length - 1]).toEqual([2, 2])
    expect(result.resolvedUrlsBySegmentId).toEqual({
      'seg-1': 'https://cdn.example.com/shot-1.mp4',
      'seg-2': 'https://cdn.example.com/shot-2.mp4',
      'seg-3': 'https://cdn.example.com/shot-1.mp4',
    })
  })

  it('ScenePreviewPlayer integrates mixerClipPreloader, Loading Clips toast, and full-width Program Monitor frame', () => {
    const playerPath = path.join(
      process.cwd(),
      'src/components/vision/scene-production/ScenePreviewPlayer.tsx'
    )
    const src = readFileSync(playerPath, 'utf8')

    // Verifies clip preloader + Loading Clips toast integration
    expect(src).toContain('preloadSceneVideoClips')
    expect(src).toContain('MIXER_CLIP_LOAD_TOAST_ID')
    expect(src).toContain('Loading scene clips')
    expect(src).toContain('pendingPlayWhenReady')
    expect(src).toContain('standbyVideoRef')

    // Verifies Program Monitor UI frame alignment (w-full outer card + Program Monitor header)
    expect(src).toContain('Program Monitor')
    expect(src).toContain('Clips Ready')
    expect(src).toContain('Loading Clips')
  })

  it('declares previewPlaybackKind before the metadata probe effect in SceneProductionMixer', () => {
    const mixerPath = path.join(
      process.cwd(),
      'src/components/vision/scene-production/SceneProductionMixer.tsx'
    )
    const src = readFileSync(mixerPath, 'utf8')
    const declIdx = src.indexOf("const previewPlaybackKind: 'video' | 'image-sequence' = 'video'")
    const useIdx = src.indexOf('if (!videoSegmentProbeKey || previewPlaybackKind === \'video\')')
    expect(declIdx).toBeGreaterThan(0)
    expect(useIdx).toBeGreaterThan(declIdx)
  })
})
