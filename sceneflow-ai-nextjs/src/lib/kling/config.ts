export const KLING_FALLBACK_MODEL_FAMILY = 'kling' as const

export function getKlingApiBaseUrl(): string {
  return (process.env.KLING_API_BASE_URL || 'https://api.klingai.com/v1').replace(/\/$/, '')
}

export function getKlingModelName(): string {
  return process.env.KLING_MODEL_NAME || 'kling-v2-6'
}

export function getKlingVideoMode(): 'std' | 'pro' {
  return process.env.KLING_VIDEO_MODE === 'pro' ? 'pro' : 'std'
}

export function isKlingSoundEnabled(): boolean {
  return process.env.KLING_SOUND_ENABLED !== 'false'
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
