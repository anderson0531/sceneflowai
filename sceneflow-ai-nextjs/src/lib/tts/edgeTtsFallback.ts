import { GoogleTtsRateLimitedError } from '@/lib/tts/googleTtsRetry'

/** When false, paid TTS failures are not retried with Edge (default: enabled). */
export function isEdgeTtsFallbackEnabled(): boolean {
  const v = process.env.EDGE_TTS_FALLBACK?.trim().toLowerCase()
  if (v === 'false' || v === '0' || v === 'no') return false
  return true
}

export function isElevenLabsQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /quota_exceeded|insufficient.*credit|credit.*exceeded|402|payment_required/i.test(msg)
}

export function isQuotaOrRateLimitError(err: unknown): boolean {
  if (err instanceof GoogleTtsRateLimitedError) return true
  if (isElevenLabsQuotaError(err)) return true
  const msg = err instanceof Error ? err.message : String(err)
  if (/429|rate.?limit|resource.?exhausted|quota/i.test(msg)) return true
  if (typeof (err as { status?: number })?.status === 'number') {
    const status = (err as { status: number }).status
    if (status === 429 || status === 402 || status === 503) return true
  }
  return false
}
