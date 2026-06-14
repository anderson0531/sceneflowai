import { isRetryableError } from '../utils/retry'

/** Extract HTTP status from Scene Express image generation errors. */
export function resolveExpressImageErrorStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    const e = err as { status?: unknown; response?: { status?: unknown } }
    if (typeof e.status === 'number') return e.status
    if (typeof e.response?.status === 'number') return e.response.status
  }

  const msg = String((err as { message?: unknown })?.message || err || '')
  const httpMatch = msg.match(/\bHTTP\s+(\d{3})\b/i)
  if (httpMatch) return Number(httpMatch[1])

  const parenMatch = msg.match(/\(\s*HTTP\s+(\d{3})\s*\)/i)
  if (parenMatch) return Number(parenMatch[1])

  return undefined
}

const TRANSIENT_MESSAGE_PATTERNS = [
  '429',
  '502',
  '503',
  '504',
  'resource_exhausted',
  'rate limit',
  'quota',
  'too many requests',
  'gateway timeout',
  'bad gateway',
  'service unavailable',
  'temporarily unavailable',
  'unavailable',
  'deadline_exceeded',
  'timed out',
  'timeout',
  'econnreset',
  'etimedout',
] as const

/** Transient image errors (429 + gateway/timeouts) — retry with backoff, not canary abort. */
export function isTransientExpressImageError(err: unknown): boolean {
  const status = resolveExpressImageErrorStatus(err)
  if (status === 429 || status === 502 || status === 503 || status === 504) {
    return true
  }

  const msg = String((err as { message?: unknown })?.message || err || '').toLowerCase()
  if (TRANSIENT_MESSAGE_PATTERNS.some((p) => msg.includes(p))) {
    return true
  }

  return isRetryableError(err, status)
}

const CANARY_STATUS_CODES = new Set([400, 401, 403])

const CANARY_MESSAGE_PATTERNS = [
  '403',
  '401',
  'forbidden',
  'unauthorized',
  'permission denied',
  'content policy',
  'safety',
  'blocked',
  'invalid api key',
  'invalid credentials',
] as const

/** Auth/config/content-policy failures — abort pool on first occurrence (canary). */
export function isExpressImageCanaryAbortError(err: unknown): boolean {
  if (isTransientExpressImageError(err)) {
    return false
  }

  const status = resolveExpressImageErrorStatus(err)
  if (status !== undefined && CANARY_STATUS_CODES.has(status)) {
    return true
  }

  const msg = String((err as { message?: unknown })?.message || err || '').toLowerCase()
  return CANARY_MESSAGE_PATTERNS.some((p) => msg.includes(p))
}

/** Rate-limit-specific (429) — used for rateLimitedFailures tracking, not retry classification. */
export function isExpressImageRateLimitError(err: unknown): boolean {
  const status = resolveExpressImageErrorStatus(err)
  if (status === 429) return true

  const msg = String((err as { message?: unknown })?.message || err || '').toLowerCase()
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('quota')
  )
}
