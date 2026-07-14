import type {
  AudioTrackConfig,
  MixerAudioTracks,
  MixerDialogueClipConfig,
  MixerSegmentAudioConfig,
  SceneMixerCollapsedSections,
  SceneMixerLanguageSettings,
  SceneMixerSettings,
  SceneProductionData,
  WatermarkConfig,
} from '@/components/vision/scene-production/types'

export const MIXER_SETTINGS_STORAGE_KEY = 'sceneflow-mixer-settings'
export const SCENEFLOW_WATERMARK_STORAGE_KEY = 'sceneflow-watermark-config'

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: true,
  type: 'text',
  text: 'SceneFlow AI Studio',
  textStyle: {
    fontFamily: 'Inter',
    fontSize: 3,
    fontWeight: 500,
    color: '#FFFFFF',
    opacity: 0.6,
    textShadow: true,
    background: false,
    backgroundColor: '#000000',
    backgroundOpacity: 0.5,
  },
  imageUrl: '',
  imageStyle: {
    width: 10,
    opacity: 0.7,
  },
  anchor: 'bottom-right',
  padding: 60,
}

export const DEFAULT_MIXER_COLLAPSED_SECTIONS: SceneMixerCollapsedSections = {
  textOverlays: true,
  watermark: true,
  watermarkCrop: true,
  beatVideo: true,
  beatTrim: true,
  segmentAudio: true,
  narration: true,
  dialogue: true,
  sfx: true,
  music: true,
  timeline: true,
}

export const DEFAULT_MIXER_AUDIO_TRACKS: MixerAudioTracks = {
  narration: { enabled: false, volume: 0.8, startOffset: 0, startSegment: 0, endSegment: -1 },
  dialogue: { enabled: false, volume: 0.9, startOffset: 0, startSegment: 0, endSegment: -1 },
  music: {
    enabled: false,
    volume: 0.4,
    startOffset: 0,
    startSegment: 0,
    endSegment: -1,
    loop: true,
    fadeInSec: 0,
    fadeOutSec: 0,
    playbackRate: 1,
  },
  sfx: { enabled: false, volume: 0.6, startOffset: 0, startSegment: 0, endSegment: -1 },
}

export const DEFAULT_MIXER_SEGMENT_AUDIO_CONFIG: MixerSegmentAudioConfig = {
  includeAudio: true,
  volume: 1.0,
}

export interface ResolvedMixerSettings {
  audioTracks: MixerAudioTracks
  segmentAudioConfigs: Record<string, MixerSegmentAudioConfig>
  dialogueClipConfigs: Record<string, MixerDialogueClipConfig>
  masterSegmentVolume: number
  resolution: '720p' | '1080p' | '4K'
  preserveBackgroundStem: boolean
  includeSpeechStem: boolean
  klingLipsyncEnabled: boolean
  watermarkConfig: WatermarkConfig
  collapsedSections: SceneMixerCollapsedSections
  theaterMode: boolean
}

function mergeAudioTrackConfig(
  defaults: AudioTrackConfig,
  saved?: Partial<AudioTrackConfig>
): AudioTrackConfig {
  if (!saved) return { ...defaults }
  return { ...defaults, ...saved }
}

function mergeAudioTracks(saved?: Partial<MixerAudioTracks>): MixerAudioTracks {
  return {
    narration: mergeAudioTrackConfig(DEFAULT_MIXER_AUDIO_TRACKS.narration, saved?.narration),
    dialogue: mergeAudioTrackConfig(DEFAULT_MIXER_AUDIO_TRACKS.dialogue, saved?.dialogue),
    music: mergeAudioTrackConfig(DEFAULT_MIXER_AUDIO_TRACKS.music, saved?.music),
    sfx: mergeAudioTrackConfig(DEFAULT_MIXER_AUDIO_TRACKS.sfx, saved?.sfx),
  }
}

function mergeSegmentAudioConfigs(
  saved?: Record<string, Partial<MixerSegmentAudioConfig>>
): Record<string, MixerSegmentAudioConfig> {
  if (!saved) return {}
  const out: Record<string, MixerSegmentAudioConfig> = {}
  for (const [segmentId, partial] of Object.entries(saved)) {
    out[segmentId] = {
      ...DEFAULT_MIXER_SEGMENT_AUDIO_CONFIG,
      ...partial,
    }
  }
  return out
}

function mergeDialogueClipConfigs(
  saved?: Record<string, Partial<MixerDialogueClipConfig>>
): Record<string, MixerDialogueClipConfig> {
  if (!saved) return {}
  const out: Record<string, MixerDialogueClipConfig> = {}
  for (const [clipId, partial] of Object.entries(saved)) {
    if (!partial?.id && !clipId) continue
    out[clipId] = {
      id: partial.id ?? clipId,
      enabled: partial.enabled ?? true,
      volume: partial.volume ?? 1,
      startTime: partial.startTime ?? 0,
      duration: partial.duration ?? 3,
      ...(partial.playbackRate !== undefined ? { playbackRate: partial.playbackRate } : {}),
    }
  }
  return out
}

function mergeWatermarkConfig(saved?: Partial<WatermarkConfig>): WatermarkConfig {
  if (!saved) return { ...DEFAULT_WATERMARK_CONFIG }
  return {
    ...DEFAULT_WATERMARK_CONFIG,
    ...saved,
    textStyle: { ...DEFAULT_WATERMARK_CONFIG.textStyle, ...saved.textStyle },
    imageStyle: { ...DEFAULT_WATERMARK_CONFIG.imageStyle, ...saved.imageStyle },
  }
}

function mergeCollapsedSections(
  saved?: Partial<SceneMixerCollapsedSections>
): SceneMixerCollapsedSections {
  return { ...DEFAULT_MIXER_COLLAPSED_SECTIONS, ...saved }
}

/** Merge persisted settings with defaults; defaults only fill unset keys. */
export function mergeMixerSettings(saved?: SceneMixerSettings | null): ResolvedMixerSettings {
  return {
    audioTracks: mergeAudioTracks(saved?.audioTracks),
    segmentAudioConfigs: mergeSegmentAudioConfigs(saved?.segmentAudioConfigs),
    dialogueClipConfigs: mergeDialogueClipConfigs(saved?.dialogueClipConfigs),
    masterSegmentVolume: saved?.masterSegmentVolume ?? 0.8,
    resolution: saved?.resolution ?? '1080p',
    preserveBackgroundStem: saved?.preserveBackgroundStem ?? true,
    includeSpeechStem: saved?.includeSpeechStem ?? false,
    klingLipsyncEnabled: saved?.klingLipsyncEnabled ?? false,
    watermarkConfig: mergeWatermarkConfig(saved?.watermarkConfig),
    collapsedSections: mergeCollapsedSections(saved?.collapsedSections),
    theaterMode: saved?.theaterMode ?? false,
  }
}

/** Build segment audio configs for the current beat list, preserving saved values. */
export function buildSegmentAudioConfigsForSegments(
  segmentIds: string[],
  saved?: Record<string, MixerSegmentAudioConfig>
): Record<string, MixerSegmentAudioConfig> {
  const configs: Record<string, MixerSegmentAudioConfig> = {}
  for (const segmentId of segmentIds) {
    configs[segmentId] =
      saved?.[segmentId] ?? { ...DEFAULT_MIXER_SEGMENT_AUDIO_CONFIG }
  }
  return configs
}

export interface MixerSettingsPersistInput {
  audioTracks: MixerAudioTracks
  segmentAudioConfigs: Record<string, MixerSegmentAudioConfig>
  dialogueClipConfigs: Record<string, MixerDialogueClipConfig>
  masterSegmentVolume: number
  resolution: '720p' | '1080p' | '4K'
  preserveBackgroundStem: boolean
  includeSpeechStem: boolean
  klingLipsyncEnabled: boolean
  watermarkConfig: WatermarkConfig
  collapsedSections: SceneMixerCollapsedSections
  theaterMode: boolean
  productionTarget?: SceneMixerSettings['productionTarget']
}

/** Serialize current mixer state for DB persistence. */
export function buildPersistedMixerSettings(input: MixerSettingsPersistInput): SceneMixerSettings {
  return {
    audioTracks: input.audioTracks,
    segmentAudioConfigs: input.segmentAudioConfigs,
    dialogueClipConfigs: input.dialogueClipConfigs,
    masterSegmentVolume: input.masterSegmentVolume,
    resolution: input.resolution,
    productionTarget: input.productionTarget,
    preserveBackgroundStem: input.preserveBackgroundStem,
    includeSpeechStem: input.includeSpeechStem,
    klingLipsyncEnabled: input.klingLipsyncEnabled,
    watermarkConfig: input.watermarkConfig,
    collapsedSections: input.collapsedSections,
    theaterMode: input.theaterMode,
  }
}

/** Strip shared UI-only fields from a full settings blob. */
export function splitLanguageMixerSettings(
  settings: SceneMixerSettings | null | undefined
): SceneMixerLanguageSettings {
  if (!settings) return {}
  const {
    collapsedSections: _c,
    theaterMode: _t,
    productionTarget: _p,
    ...languageSettings
  } = settings
  return languageSettings
}

/** Build per-language snapshot from current mixer UI state. */
export function buildLanguageMixerSnapshot(
  input: Omit<MixerSettingsPersistInput, 'productionTarget' | 'collapsedSections' | 'theaterMode'>
): SceneMixerLanguageSettings {
  return splitLanguageMixerSettings(buildPersistedMixerSettings(input))
}

/** Migrate legacy single blob into per-language map. */
export function migrateMixerSettingsByLanguage(
  data: SceneProductionData | null | undefined
): Record<string, SceneMixerSettings> {
  if (data?.mixerSettingsByLanguage && Object.keys(data.mixerSettingsByLanguage).length > 0) {
    return { ...data.mixerSettingsByLanguage }
  }
  const legacy = data?.mixerSettings
  if (!legacy || Object.keys(legacy).length === 0) return {}
  const lang = legacy.productionTarget?.language?.trim() || 'en'
  return { [lang]: { ...legacy } }
}

/** Read mixer settings for a language with legacy fallback. */
export function getMixerSettingsForLanguage(
  data: SceneProductionData | null | undefined,
  language: string
): SceneMixerSettings | undefined {
  const lang = language?.trim() || 'en'
  const byLang = migrateMixerSettingsByLanguage(data)
  if (byLang[lang]) return byLang[lang]
  if (lang === 'en' && data?.mixerSettings) return data.mixerSettings
  return undefined
}

/** Merge persisted language settings with defaults for hydration. */
export function mergeMixerSettingsForLanguage(
  data: SceneProductionData | null | undefined,
  language: string
): ResolvedMixerSettings {
  const saved = getMixerSettingsForLanguage(data, language)
  const shared = data?.mixerSettings
  const merged = mergeMixerSettings({
    ...saved,
    collapsedSections: shared?.collapsedSections ?? saved?.collapsedSections,
    theaterMode: shared?.theaterMode ?? saved?.theaterMode,
  })
  return merged
}

/** Extract shared UI prefs from production data (scene-level). */
export function getSharedMixerUiSettings(data: SceneProductionData | null | undefined): {
  productionTarget?: SceneMixerSettings['productionTarget']
  collapsedSections: SceneMixerCollapsedSections
  theaterMode: boolean
} {
  const legacy = data?.mixerSettings
  const firstLang = Object.values(migrateMixerSettingsByLanguage(data))[0]
  const source = legacy ?? firstLang
  return {
    productionTarget: source?.productionTarget,
    collapsedSections: mergeCollapsedSections(source?.collapsedSections),
    theaterMode: source?.theaterMode ?? false,
  }
}

/** One-time migration from legacy global localStorage (read-only). */
export function migrateLegacyLocalStorageSettings(): Partial<SceneMixerSettings> {
  if (typeof window === 'undefined') return {}

  const migrated: Partial<SceneMixerSettings> = {}

  try {
    const stored = localStorage.getItem(MIXER_SETTINGS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>
      if (parsed.collapsedSections && typeof parsed.collapsedSections === 'object') {
        migrated.collapsedSections = parsed.collapsedSections as SceneMixerCollapsedSections
      }
      if (typeof parsed.preserveBackgroundStem === 'boolean') {
        migrated.preserveBackgroundStem = parsed.preserveBackgroundStem
      }
      if (typeof parsed.includeSpeechStem === 'boolean') {
        migrated.includeSpeechStem = parsed.includeSpeechStem
      }
      if (typeof parsed.klingLipsyncEnabled === 'boolean') {
        migrated.klingLipsyncEnabled = parsed.klingLipsyncEnabled
      }
      if (typeof parsed.masterSegmentVolume === 'number') {
        migrated.masterSegmentVolume = parsed.masterSegmentVolume
      }
    }
  } catch {
    // ignore corrupt localStorage
  }

  try {
    const wmRaw = localStorage.getItem(SCENEFLOW_WATERMARK_STORAGE_KEY)
    if (wmRaw) {
      const parsed = JSON.parse(wmRaw) as Partial<WatermarkConfig>
      migrated.watermarkConfig = parsed
    }
  } catch {
    // ignore corrupt localStorage
  }

  return migrated
}
