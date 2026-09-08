import type {
  MixerAudioTracks,
  SceneProductionData,
} from '@/components/vision/scene-production/types'
import {
  DEFAULT_MIXER_AUDIO_TRACKS,
  mergeMixerSettingsForLanguage,
  migrateMixerSettingsByLanguage,
} from '@/lib/scene/mixerSettings'

export type ScreeningMixTrack = keyof MixerAudioTracks

export interface ScreeningTrackVolumes {
  narration: number
  dialogue: number
  music: number
  sfx: number
}

const EMPTY_PRODUCTION_DATA: SceneProductionData = {
  isSegmented: false,
  targetSegmentDuration: 10,
  segments: [],
}

export function clampUnitVolume(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(1, Math.max(0, value))
}

/** Viewer overlay × scene track. Mute zeros every stem; mixer `enabled` is not mute. */
export function effectiveScreeningTrackVolume(opts: {
  muted: boolean
  master: number
  trackVolume: number
}): number {
  if (opts.muted) return 0
  return clampUnitVolume(opts.master) * clampUnitVolume(opts.trackVolume)
}

export function sceneMixerTrackVolumes(
  data: SceneProductionData | null | undefined,
  language: string
): ScreeningTrackVolumes {
  const tracks = mergeMixerSettingsForLanguage(data, language).audioTracks
  return {
    narration: clampUnitVolume(tracks.narration.volume, DEFAULT_MIXER_AUDIO_TRACKS.narration.volume),
    dialogue: clampUnitVolume(tracks.dialogue.volume, DEFAULT_MIXER_AUDIO_TRACKS.dialogue.volume),
    music: clampUnitVolume(tracks.music.volume, DEFAULT_MIXER_AUDIO_TRACKS.music.volume),
    sfx: clampUnitVolume(tracks.sfx.volume, DEFAULT_MIXER_AUDIO_TRACKS.sfx.volume),
  }
}

function emptyProductionData(): SceneProductionData {
  return { ...EMPTY_PRODUCTION_DATA, segments: [] }
}

/** Persist Screening Room Dialogue / Music / SFX (and optional narration) into mixer settings. */
export function patchMixerTrackVolumes(
  data: SceneProductionData | null | undefined,
  language: string,
  volumes: Partial<ScreeningTrackVolumes>
): SceneProductionData {
  const base = data ?? emptyProductionData()
  const lang = language?.trim() || 'en'
  const byLang = migrateMixerSettingsByLanguage(base)
  const existingLang = byLang[lang]
  const mergedTracks = mergeMixerSettingsForLanguage(base, lang).audioTracks
  const audioTracks: MixerAudioTracks = {
    narration: patchTrack(mergedTracks.narration, volumes.narration),
    dialogue: patchTrack(mergedTracks.dialogue, volumes.dialogue),
    music: patchTrack(mergedTracks.music, volumes.music),
    sfx: patchTrack(mergedTracks.sfx, volumes.sfx),
  }

  return {
    ...base,
    mixerSettingsByLanguage: {
      ...byLang,
      [lang]: {
        ...existingLang,
        audioTracks,
      },
    },
    mixerSettings: {
      productionTarget: base.mixerSettings?.productionTarget ?? existingLang?.productionTarget,
      collapsedSections: base.mixerSettings?.collapsedSections,
      theaterMode: base.mixerSettings?.theaterMode,
    },
  }
}

function patchTrack<T extends MixerAudioTracks[ScreeningMixTrack]>(
  track: T,
  volume: number | undefined
): T {
  if (volume === undefined) return track
  return { ...track, volume: clampUnitVolume(volume, track.volume) }
}
