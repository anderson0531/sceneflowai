import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_MIXER_AUDIO_TRACKS } from '@/lib/scene/mixerSettings'
import {
  clampUnitVolume,
  effectiveScreeningTrackVolume,
  patchMixerTrackVolumes,
  sceneMixerTrackVolumes,
} from '@/lib/scene/screeningTrackVolume'
import type { SceneProductionData } from '@/components/vision/scene-production/types'

describe('effectiveScreeningTrackVolume', () => {
  it('returns 0 when muted regardless of master and track levels', () => {
    expect(
      effectiveScreeningTrackVolume({ muted: true, master: 1, trackVolume: 1 })
    ).toBe(0)
  })

  it('multiplies master overlay by the scene track volume', () => {
    expect(
      effectiveScreeningTrackVolume({ muted: false, master: 0.8, trackVolume: 0.5 })
    ).toBeCloseTo(0.4)
  })

  it('clamps non-finite and out-of-range inputs', () => {
    expect(clampUnitVolume(Number.NaN, 0.4)).toBe(0.4)
    expect(clampUnitVolume(1.7)).toBe(1)
    expect(clampUnitVolume(-0.2)).toBe(0)
    expect(
      effectiveScreeningTrackVolume({ muted: false, master: 2, trackVolume: 0.5 })
    ).toBe(0.5)
  })
})

describe('sceneMixerTrackVolumes', () => {
  it('returns mixer defaults when production data is empty', () => {
    expect(sceneMixerTrackVolumes(undefined, 'en')).toEqual({
      narration: DEFAULT_MIXER_AUDIO_TRACKS.narration.volume,
      dialogue: DEFAULT_MIXER_AUDIO_TRACKS.dialogue.volume,
      music: DEFAULT_MIXER_AUDIO_TRACKS.music.volume,
      sfx: DEFAULT_MIXER_AUDIO_TRACKS.sfx.volume,
    })
  })

  it('reads per-language mixer track volumes', () => {
    const data: SceneProductionData = {
      isSegmented: false,
      targetSegmentDuration: 10,
      segments: [],
      mixerSettingsByLanguage: {
        en: {
          audioTracks: {
            dialogue: { volume: 0.7 },
            music: { volume: 0.2 },
            sfx: { volume: 0.15 },
          },
        },
      },
    }
    expect(sceneMixerTrackVolumes(data, 'en')).toMatchObject({
      dialogue: 0.7,
      music: 0.2,
      sfx: 0.15,
    })
  })
})

describe('patchMixerTrackVolumes', () => {
  it('writes screening mix into mixerSettingsByLanguage without using enabled as mute', () => {
    const base: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 10,
      segments: [],
      mixerSettingsByLanguage: {
        en: {
          audioTracks: {
            dialogue: {
              enabled: true,
              volume: 0.9,
              startOffset: 0,
              startSegment: 0,
              endSegment: -1,
            },
            music: {
              enabled: true,
              volume: 0.15,
              startOffset: 0,
              startSegment: 0,
              endSegment: -1,
              loop: true,
            },
          },
        },
      },
    }

    const patched = patchMixerTrackVolumes(base, 'en', { music: 0.85, sfx: 0.1 })
    const tracks = patched.mixerSettingsByLanguage?.en?.audioTracks

    expect(tracks?.music.volume).toBe(0.85)
    expect(tracks?.music.enabled).toBe(true)
    expect(tracks?.music.loop).toBe(true)
    expect(tracks?.dialogue.volume).toBe(0.9)
    expect(tracks?.dialogue.enabled).toBe(true)
    expect(tracks?.sfx.volume).toBe(0.1)
    expect(tracks?.sfx.enabled).toBe(false)
  })

  it('creates mixer settings when a scene has no production data yet', () => {
    const patched = patchMixerTrackVolumes(undefined, 'es', { music: 0.05 })
    expect(patched.mixerSettingsByLanguage?.es?.audioTracks?.music.volume).toBe(0.05)
    expect(patched.mixerSettingsByLanguage?.es?.audioTracks?.dialogue.volume).toBe(
      DEFAULT_MIXER_AUDIO_TRACKS.dialogue.volume
    )
  })
})

describe('screening scene mix source contract', () => {
  const root = process.cwd()

  it('AudioGalleryPlayer exposes Dialogue and SFX sliders bound to mixer persist', () => {
    const src = readFileSync(
      path.join(root, 'src/components/vision/AudioGalleryPlayer.tsx'),
      'utf8'
    )
    expect(src).toContain('Scene {currentSceneIndex + 1} mix')
    expect(src).toContain("applyTrackVolume('dialogue'")
    expect(src).toContain("applyTrackVolume('sfx'")
    expect(src).toContain("applyTrackVolume('music'")
    expect(src).toContain('onSceneMixChange')
    expect(src).not.toContain('sceneflow-gallery-music-volume')
    expect(src).not.toContain('DIALOGUE_VOLUME_BOOST')
  })

  it('useStoryboardPlayback multiplies master by scene track volumes without a dialogue boost', () => {
    const src = readFileSync(
      path.join(root, 'src/hooks/useStoryboardPlayback.ts'),
      'utf8'
    )
    expect(src).toContain('effectiveScreeningTrackVolume')
    expect(src).toContain('dialogueVolume')
    expect(src).toContain('sfxVolume')
    expect(src).not.toContain('DIALOGUE_VOLUME_BOOST')
  })

  it('FullscreenPlayer applies current-scene mixer volumes for share playback', () => {
    const src = readFileSync(
      path.join(root, 'src/components/vision/FullscreenPlayer.tsx'),
      'utf8'
    )
    expect(src).toContain('sceneMixerTrackVolumes')
    expect(src).toContain('effectiveScreeningTrackVolume')
    expect(src).toContain('sceneProductionData')
    expect(src).toContain('Scene {currentSceneIndex + 1} mix')
  })

  it('SceneGallery wires screening mix persist to production data', () => {
    const gallery = readFileSync(
      path.join(root, 'src/components/vision/SceneGallery.tsx'),
      'utf8'
    )
    const page = readFileSync(
      path.join(root, 'src/app/dashboard/workflow/vision/[projectId]/page.tsx'),
      'utf8'
    )
    expect(gallery).toContain('onSceneMixChange={onSceneMixChange}')
    expect(page).toContain('onSceneMixChange={handleScreeningSceneMixChange}')
    expect(page).toContain('patchMixerTrackVolumes(current, language, volumes)')
  })
})
