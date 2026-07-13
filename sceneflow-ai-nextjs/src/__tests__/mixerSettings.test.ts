import { describe, expect, it } from 'vitest'
import {
  buildPersistedMixerSettings,
  buildSegmentAudioConfigsForSegments,
  DEFAULT_MIXER_AUDIO_TRACKS,
  DEFAULT_MIXER_SEGMENT_AUDIO_CONFIG,
  mergeMixerSettings,
} from '@/lib/scene/mixerSettings'
import type { SceneMixerSettings } from '@/components/vision/scene-production/types'

describe('mergeMixerSettings', () => {
  it('returns code defaults when settings are empty', () => {
    const merged = mergeMixerSettings()
    expect(merged.audioTracks).toEqual(DEFAULT_MIXER_AUDIO_TRACKS)
    expect(merged.masterSegmentVolume).toBe(0.8)
    expect(merged.resolution).toBe('1080p')
    expect(merged.preserveBackgroundStem).toBe(true)
    expect(merged.includeSpeechStem).toBe(false)
    expect(merged.klingLipsyncEnabled).toBe(false)
    expect(merged.theaterMode).toBe(false)
  })

  it('only overrides provided audio track fields', () => {
    const merged = mergeMixerSettings({
      audioTracks: {
        dialogue: { volume: 0.25 },
      },
    })
    expect(merged.audioTracks.dialogue.volume).toBe(0.25)
    expect(merged.audioTracks.dialogue.enabled).toBe(false)
    expect(merged.audioTracks.narration).toEqual(DEFAULT_MIXER_AUDIO_TRACKS.narration)
  })

  it('merges per-segment audio configs with defaults for partial entries', () => {
    const merged = mergeMixerSettings({
      segmentAudioConfigs: {
        beat_a: { volume: 0.5 },
      },
    })
    expect(merged.segmentAudioConfigs.beat_a).toEqual({
      includeAudio: true,
      volume: 0.5,
    })
  })
})

describe('buildSegmentAudioConfigsForSegments', () => {
  it('preserves existing segment configs and defaults new beats', () => {
    const saved = {
      beat_a: { includeAudio: false, volume: 0.4 },
    }
    const result = buildSegmentAudioConfigsForSegments(['beat_a', 'beat_b'], saved)
    expect(result.beat_a).toEqual({ includeAudio: false, volume: 0.4 })
    expect(result.beat_b).toEqual(DEFAULT_MIXER_SEGMENT_AUDIO_CONFIG)
  })
})

describe('buildPersistedMixerSettings', () => {
  it('serializes current mixer state for DB storage', () => {
    const input = {
      audioTracks: DEFAULT_MIXER_AUDIO_TRACKS,
      segmentAudioConfigs: { beat_a: { includeAudio: true, volume: 0.9 } },
      dialogueClipConfigs: {},
      masterSegmentVolume: 0.55,
      resolution: '4K' as const,
      preserveBackgroundStem: false,
      includeSpeechStem: true,
      klingLipsyncEnabled: true,
      watermarkConfig: mergeMixerSettings().watermarkConfig,
      collapsedSections: mergeMixerSettings().collapsedSections,
      theaterMode: true,
      productionTarget: { streamType: 'video' as const, language: 'es' },
    }
    const persisted = buildPersistedMixerSettings(input)
    expect(persisted.masterSegmentVolume).toBe(0.55)
    expect(persisted.resolution).toBe('4K')
    expect(persisted.productionTarget).toEqual({ streamType: 'video', language: 'es' })
    expect(persisted.segmentAudioConfigs?.beat_a?.volume).toBe(0.9)
  })
})

describe('migrateLegacyLocalStorageSettings', () => {
  it('returns empty object when window is undefined', async () => {
    const { migrateLegacyLocalStorageSettings } = await import('@/lib/scene/mixerSettings')
    const result = migrateLegacyLocalStorageSettings()
    expect(result).toEqual({})
  })
})

describe('legacy stem flags in merge', () => {
  it('applies migrated-style partial settings', () => {
    const legacy: SceneMixerSettings = {
      preserveBackgroundStem: false,
      includeSpeechStem: true,
      klingLipsyncEnabled: true,
      masterSegmentVolume: 0.33,
    }
    const merged = mergeMixerSettings(legacy)
    expect(merged.preserveBackgroundStem).toBe(false)
    expect(merged.includeSpeechStem).toBe(true)
    expect(merged.klingLipsyncEnabled).toBe(true)
    expect(merged.masterSegmentVolume).toBe(0.33)
  })
})
