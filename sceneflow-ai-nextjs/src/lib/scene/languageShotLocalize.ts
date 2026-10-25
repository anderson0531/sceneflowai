import type {
  LanguageShotMethod,
  MixerLanguageShotConfig,
  SceneSegment,
} from '@/components/vision/scene-production/types'
import {
  presentSegmentForStream,
  resolveLanguageClipPlayback,
} from '@/lib/scene/languageClipVersions'

export const VIDEO_PLAYBACK_RATE_MIN = 0.5
export const VIDEO_PLAYBACK_RATE_MAX = 1.5
/** Default floor for auto-slowing a video clip to match longer dubbed dialogue (0.67x = 1.5x duration, e.g. 10s -> 15s). */
export const AUTO_SLOW_VIDEO_MIN_RATE = 0.67
/** Gentle slow-down floor for hybrid alignment (0.80x = 1.25x duration, e.g. 10s -> 12.5s + optical hold). */
export const HYBRID_SLOW_VIDEO_MIN_RATE = 0.8

const METHODS: LanguageShotMethod[] = ['double', 'lipsync', 'regenerate']

export function clampVideoPlaybackRate(rate: number | undefined): number {
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return 1
  return Math.min(VIDEO_PLAYBACK_RATE_MAX, Math.max(VIDEO_PLAYBACK_RATE_MIN, rate))
}

export function isLanguageShotMethod(value: unknown): value is LanguageShotMethod {
  return METHODS.includes(value as LanguageShotMethod)
}

/**
 * Explicit per-shot choice wins. A saved scene-wide Kling switch, or a legacy
 * localize tier of lip-sync, applies only when the shot has no choice yet.
 */
export function resolveLanguageShotMethod(args: {
  config?: MixerLanguageShotConfig | null
  klingLipsyncEnabled?: boolean
  legacyLocalizeLipsync?: boolean
}): LanguageShotMethod {
  if (isLanguageShotMethod(args.config?.method)) return args.config.method
  if (args.klingLipsyncEnabled || args.legacyLocalizeLipsync) return 'lipsync'
  return 'double'
}

export function resolveShotVideoPlaybackRate(
  config?: MixerLanguageShotConfig | null
): number {
  return clampVideoPlaybackRate(config?.videoPlaybackRate)
}

/** Wall-clock length of a source window played at `rate`. */
export function videoWallDurationSec(playableSec: number, rate: number | undefined): number {
  const playable = Number.isFinite(playableSec) && playableSec > 0 ? playableSec : 0
  return playable / clampVideoPlaybackRate(rate)
}

/**
 * Compute the optimal slowed video playback rate so a video clip (e.g. 10s) stretches
 * up to 1.5x duration (e.g. 15s at 0.67x) to cover longer dubbed dialogue.
 */
export function computeSlowVideoRateForDub(
  playableVideoSec: number,
  dubAudioSec: number,
  minRate: number = AUTO_SLOW_VIDEO_MIN_RATE
): {
  videoPlaybackRate: number
  stretchedVideoSec: number
  remainingHoldSec: number
} {
  const playable = Number.isFinite(playableVideoSec) && playableVideoSec > 0 ? playableVideoSec : 0
  const target = Number.isFinite(dubAudioSec) && dubAudioSec > 0 ? dubAudioSec : 0
  if (playable <= 0 || target <= playable) {
    return {
      videoPlaybackRate: 1,
      stretchedVideoSec: playable,
      remainingHoldSec: 0,
    }
  }
  const safeMin = clampVideoPlaybackRate(minRate)
  const rawRate = playable / target
  const clampedRate = Math.min(1, Math.max(safeMin, Math.round(rawRate * 100) / 100))
  const stretchedVideoSec = videoWallDurationSec(playable, clampedRate)
  const remainingHoldSec = Math.max(0, Math.round((target - stretchedVideoSec) * 10) / 10)
  return {
    videoPlaybackRate: clampedRate,
    stretchedVideoSec,
    remainingHoldSec,
  }
}

/**
 * Compute the dubbed dialogue playback rate needed to fit a longer translated line
 * inside the shot's natural 1.0x video duration (up to `maxAudioRate`, default 1.25x).
 */
export function computeDubAudioSpeedForVideo(
  playableVideoSec: number,
  dubAudioSec: number,
  maxAudioRate = 1.25
): {
  audioPlaybackRate: number
  compressedAudioSec: number
  remainingHoldSec: number
} {
  const playable = Number.isFinite(playableVideoSec) && playableVideoSec > 0 ? playableVideoSec : 0
  const target = Number.isFinite(dubAudioSec) && dubAudioSec > 0 ? dubAudioSec : 0
  if (playable <= 0 || target <= playable) {
    return {
      audioPlaybackRate: 1,
      compressedAudioSec: target,
      remainingHoldSec: 0,
    }
  }
  const safeMax = Math.min(1.5, Math.max(1, maxAudioRate))
  const rawRate = target / playable
  const audioPlaybackRate = Math.min(safeMax, Math.max(1, Math.round(rawRate * 100) / 100))
  const compressedAudioSec = target / audioPlaybackRate
  const remainingHoldSec = Math.max(0, Math.round((compressedAudioSec - playable) * 10) / 10)
  return {
    audioPlaybackRate,
    compressedAudioSec,
    remainingHoldSec,
  }
}

export function mergeLanguageShotConfigs(
  saved?: Record<string, MixerLanguageShotConfig> | null
): Record<string, MixerLanguageShotConfig> {
  if (!saved) return {}
  const out: Record<string, MixerLanguageShotConfig> = {}
  for (const [segmentId, partial] of Object.entries(saved)) {
    if (!segmentId || !partial) continue
    const next: MixerLanguageShotConfig = {}
    if (isLanguageShotMethod(partial.method)) next.method = partial.method
    if (partial.videoPlaybackRate !== undefined) {
      next.videoPlaybackRate = clampVideoPlaybackRate(partial.videoPlaybackRate)
    }
    if (typeof partial.signageText === 'string' && partial.signageText.trim()) {
      next.signageText = partial.signageText.trim()
    }
    if (next.method || next.videoPlaybackRate !== undefined || next.signageText) {
      out[segmentId] = next
    }
  }
  return out
}

/**
 * Regenerated shots play their language clip. Double and lip-sync keep the
 * master picture; lip-sync replaces it only at render time.
 */
export function presentSegmentForShotMethod<
  T extends Pick<
    SceneSegment,
    'activeAssetUrl' | 'assetType' | 'status' | 'takes' | 'currentTakeId' | 'languageVersions'
  >,
>(segment: T, language: string | null | undefined, method: LanguageShotMethod): T {
  if (method !== 'regenerate') return segment
  return presentSegmentForStream(segment, language)
}

export function languageShotVideoUrl(
  segment: Pick<
    SceneSegment,
    'segmentId' | 'activeAssetUrl' | 'takes' | 'currentTakeId' | 'languageVersions'
  >,
  language: string,
  method: LanguageShotMethod,
  lipsyncedVideoBySegment?: Record<string, string>
): string | undefined {
  if (method === 'lipsync') {
    const synced = lipsyncedVideoBySegment?.[segment.segmentId]
    if (synced) return synced
  }
  if (method === 'regenerate') {
    const playback = resolveLanguageClipPlayback(segment, language)
    if (!playback.usingMaster && playback.url) return playback.url
  }
  return segment.activeAssetUrl || undefined
}
