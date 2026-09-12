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

  // Vertex Gemini Image error 429: ...
  const vertexMatch = msg.match(/\berror\s+(\d{3})\b/i)
  if (vertexMatch) return Number(vertexMatch[1])

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

const CANARY_STATUS_CODES = new Set([401, 403])

const CANARY_MESSAGE_PATTERNS = [
  '403',
  '401',
  'forbidden',
  'unauthorized',
  'permission denied',
  'invalid api key',
  'invalid credentials',
] as const

/**
 * Auth/config failures — abort the remaining pool on first occurrence.
 * Content policy, safety, and empty-image stay per-beat so siblings can finish.
 */
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

/**
 * Vertex already exhausted its identity-ref 429 ladder — outer scene retries must not
 * re-burst another full inner attempt×3 cycle.
 */
export function isIdentityRefRateLimitExhausted(err: unknown): boolean {
  const msg = String((err as { message?: unknown })?.message || err || '').toLowerCase()
  return msg.includes('identity-ref rate limit exhausted')
}

/**
 * Beat-pool retries: transient Vertex/gateway errors only.
 * Identity-ref 429 exhaustion already ran the inner ladder — do not re-burst.
 */
export function isIdentityRefLadderExhausted(err: unknown): boolean {
  const msg = String((err as { message?: unknown })?.message || err || '').toLowerCase()
  if (!msg.includes('identity-ref rate limit exhausted')) return false
  return /after\s+3\s+(retries|attempts?)/.test(msg)
}

export function isExpressBeatPoolRetryable(err: unknown): boolean {
  // Fail-fast 1-attempt 429s are retryable. Only a finished 3-retry ladder is fatal.
  if (isIdentityRefLadderExhausted(err)) return false
  return isTransientExpressImageError(err)
}

/** Stable code for a frame that rendered but the face is the wrong person. */
export const CHARACTER_LIKENESS_MISMATCH_CODE = 'CHARACTER_LIKENESS_MISMATCH'

/**
 * User-facing copy for likeness drift. Deliberately avoids transient/canary
 * trigger words (timeout, unavailable, quota, blocked, safety, forbidden).
 */
export const CHARACTER_LIKENESS_MISMATCH_MESSAGE =
  'Character does not match reference photo — regenerate this frame'

export function isCharacterLikenessMismatchError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const e = err as {
      status?: unknown
      code?: unknown
      payload?: { code?: unknown }
    }
    if (e.code === CHARACTER_LIKENESS_MISMATCH_CODE) return true
    if (e.payload?.code === CHARACTER_LIKENESS_MISMATCH_CODE) return true
    if (e.status === 422 && e.code === CHARACTER_LIKENESS_MISMATCH_CODE) return true
  }

  const msg = String((err as { message?: unknown })?.message || err || '').toLowerCase()
  return msg.includes('character does not match reference photo')
}

/** Short overlay/tile copy — never dump Vertex payload text to the user. */
export function formatExpressImageErrorForUser(err: unknown): string {
  if (isCharacterLikenessMismatchError(err)) {
    return CHARACTER_LIKENESS_MISMATCH_MESSAGE
  }
  if (isIdentityRefRateLimitExhausted(err) || isExpressImageRateLimitError(err)) {
    return 'Rate limited — retry this frame'
  }
  const msg = String((err as { message?: unknown })?.message || err || '').trim()
  if (/failed to download reference image|failed to attach all reference/i.test(msg)) {
    return 'Reference image could not be loaded — retry this frame'
  }
  if (msg.toLowerCase().includes('content policy') || msg.toLowerCase().includes('safety')) {
    return 'Blocked by content policy — edit prompt or retry'
  }
  if (!msg) return 'Generation failed'
  return msg.length > 120 ? `${msg.slice(0, 117)}…` : msg
}
