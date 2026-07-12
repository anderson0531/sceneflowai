import {
  KLING_MODEL_CATALOG,
  KLING_QUALITY_RESOLUTION,
  type KlingModelCapabilities,
  type KlingModelId,
  type KlingQuality,
} from './types'

export const KLING_FALLBACK_MODEL_FAMILY = 'kling' as const

export function getKlingApiBaseUrl(): string {
  return (process.env.KLING_API_BASE_URL || 'https://api.klingai.com/v1').replace(/\/$/, '')
}

/** @deprecated Use getKlingDefaultModel() */
export function getKlingModelName(): string {
  return getKlingDefaultModel()
}

export function getKlingDefaultModel(): KlingModelId {
  const raw = (process.env.KLING_DEFAULT_MODEL || process.env.KLING_MODEL_NAME || 'kling-v3-omni').trim()
  if (raw in KLING_MODEL_CATALOG) return raw as KlingModelId
  return 'kling-v3-omni'
}

export function getKlingDefaultQuality(): KlingQuality {
  const raw = (process.env.KLING_DEFAULT_QUALITY || 'pro').trim().toLowerCase()
  if (raw === 'std' || raw === 'pro' || raw === '4k') return raw
  return 'pro'
}

/** @deprecated Use getKlingDefaultQuality() */
export function getKlingVideoMode(): 'std' | 'pro' {
  const q = getKlingDefaultQuality()
  return q === 'std' ? 'std' : 'pro'
}

export function isKlingSoundEnabled(): boolean {
  return process.env.KLING_SOUND_ENABLED !== 'false'
}

export function isKlingPrimaryEnabled(): boolean {
  return process.env.KLING_PRIMARY_ENABLED !== 'false'
}

export function isKlingAsyncEnabled(): boolean {
  return process.env.KLING_ASYNC === 'true'
}

export function getKlingWebhookSecret(): string | undefined {
  return process.env.KLING_WEBHOOK_SECRET?.trim() || undefined
}

export function getKlingWebhookBaseUrl(): string {
  return (
    process.env.KLING_WEBHOOK_BASE_URL?.trim() ||
    process.env.VIDEO_AGGREGATOR_WEBHOOK_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ).replace(/\/$/, '')
}

export function getKlingWatermarkDefault(): boolean {
  return process.env.KLING_WATERMARK_DEFAULT === 'true'
}

export function getKlingPollIntervalMs(): number {
  const n = Number(process.env.KLING_POLL_INTERVAL_MS)
  return Number.isFinite(n) && n > 0 ? n : 5000
}

export function getKlingPollTimeoutSec(): number {
  const n = Number(process.env.KLING_POLL_TIMEOUT_SEC)
  return Number.isFinite(n) && n > 0 ? n : 300
}

/** Server-side poll budget for single-segment sync generation (under 300s Vercel maxDuration). */
export function getKlingSegmentPollTimeoutSec(): number {
  return Math.min(getKlingPollTimeoutSec(), 270)
}

export function isVeoFallbackEnabled(): boolean {
  if (process.env.KLING_VEO_FALLBACK_ENABLED === 'false') return false
  return process.env.VEO_FALLBACK_ENABLED !== 'false'
}

/** When true, basic segments may fall back to all-platform Kling via the video aggregator after direct Kling fails. */
export function isKlingAggregatorFallbackEnabled(): boolean {
  return process.env.KLING_AGGREGATOR_FALLBACK_ENABLED !== 'false'
}

export function getKlingAggregatorFallbackModelId(): string {
  return process.env.VIDEO_AGGREGATOR_KLING_FALLBACK_MODEL?.trim() || 'kling-2.6'
}

/** True when direct Kling credentials are configured */
export function hasDirectKlingCredentials(): boolean {
  const apiKey = process.env.KLING_API_KEY?.trim()
  const accessKey = process.env.KLING_ACCESS_KEY?.trim()
  const secretKey = process.env.KLING_SECRET_KEY?.trim()
  return !!(apiKey || (accessKey && secretKey))
}

export function isDirectKlingFallbackEnabled(): boolean {
  if (process.env.KLING_DIRECT_FALLBACK_ENABLED === 'false') return false
  if (process.env.KLING_POLICY_FALLBACK_ENABLED === 'false') return false
  return hasDirectKlingCredentials()
}

export function isKlingConfigured(): boolean {
  return isKlingPrimaryEnabled() && hasDirectKlingCredentials()
}

export function getKlingCapabilities(model?: string): KlingModelCapabilities {
  const id = (model || getKlingDefaultModel()) as KlingModelId
  return KLING_MODEL_CATALOG[id]?.capabilities ?? KLING_MODEL_CATALOG['kling-v3-omni'].capabilities
}

export function resolveKlingQuality(
  quality?: KlingQuality | string,
  resolution?: '720p' | '1080p' | '4k'
): KlingQuality {
  if (quality === 'std' || quality === 'pro' || quality === '4k') return quality
  if (resolution === '720p') return 'std'
  if (resolution === '4k') return '4k'
  return getKlingDefaultQuality()
}

export function klingQualityToResolution(quality: KlingQuality): '720p' | '1080p' | '4k' {
  return KLING_QUALITY_RESOLUTION[quality] ?? '1080p'
}

export function listKlingModels(): Array<{ id: KlingModelId; label: string }> {
  return (Object.keys(KLING_MODEL_CATALOG) as KlingModelId[]).map((id) => ({
    id,
    label: KLING_MODEL_CATALOG[id].label,
  }))
}
