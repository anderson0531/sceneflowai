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
    if (next.method || next.videoPlaybackRate !== undefined) out[segmentId] = next
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
