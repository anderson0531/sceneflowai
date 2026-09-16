import { isRetryableError } from '../utils/retry'
import {
  IMAGE_SAFETY_BOARD_MESSAGE,
  IMAGE_SAFETY_CODE,
  IMAGE_SAFETY_USER_MESSAGE,
  isImageSafetyError,
} from '@/lib/generation/stillPolicy'

export {
  IMAGE_SAFETY_BOARD_MESSAGE,
  IMAGE_SAFETY_CODE,
  IMAGE_SAFETY_USER_MESSAGE,
  isImageSafetyError,
}

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

function expressErrorText(err: unknown): string {
  const parts: string[] = [String((err as { message?: unknown })?.message || err || '')]
  if (err && typeof err === 'object') {
    const payload = (err as { payload?: { googleError?: unknown; error?: unknown } }).payload
    if (payload?.googleError) parts.push(String(payload.googleError))
    if (payload?.error) parts.push(String(payload.error))
  }
  return parts.join(' ').toLowerCase()
}

const IDENTITY_REF_RATE_LIMIT_MARKER = 'identity-ref rate limit exhausted'
const RATE_LIMIT_FAILED_FAST_MARKER = 'rate limit failed fast'

/**
 * Vertex already exhausted its identity-ref 429 ladder — outer scene retries must not
 * re-burst another full inner attempt×3 cycle.
 */
export function isIdentityRefRateLimitExhausted(err: unknown): boolean {
  return expressErrorText(err).includes(IDENTITY_REF_RATE_LIMIT_MARKER)
}

/**
 * Beat-pool retries: transient Vertex/gateway errors only.
 * Identity-ref 429 exhaustion already ran the inner ladder — do not re-burst.
 */
export function isIdentityRefLadderExhausted(err: unknown): boolean {
  const msg = expressErrorText(err)
  if (!msg.includes(IDENTITY_REF_RATE_LIMIT_MARKER)) return false
  return /after\s+3\s+(retries|attempts?)/.test(msg)
}

/**
 * Express fail-fast 429: one Vertex attempt, then stamp. Do not sleep or re-queue.
 */
export function isExpressFailFastRateLimitError(err: unknown): boolean {
  const msg = expressErrorText(err)
  if (msg.includes(RATE_LIMIT_FAILED_FAST_MARKER)) return true
  if (msg.includes('google cloud quota limit reached')) return true
  if (msg.includes(IDENTITY_REF_RATE_LIMIT_MARKER) && /after\s+1\s+attempt/.test(msg)) {
    return true
  }
  return false
}

export function isExpressBeatPoolRetryable(err: unknown): boolean {
  if (isIdentityRefLadderExhausted(err)) return false
  if (isExpressFailFastRateLimitError(err)) return false
  return isTransientExpressImageError(err)
}

/** Client aborted the Express SSE run. Remaining queued beats fail with this. */
export const FRAME_AGENT_CANCELLED_CODE = 'FRAME_AGENT_CANCELLED'
export const FRAME_AGENT_CANCELLED_MESSAGE = 'Frame Agent cancelled'

export function createFrameAgentCancelledError(): Error & { code: string; status: number } {
  const err = new Error(FRAME_AGENT_CANCELLED_MESSAGE) as Error & {
    code: string
    status: number
  }
  err.name = 'AbortError'
  err.code = FRAME_AGENT_CANCELLED_CODE
  err.status = 499
  return err
}

export function isFrameAgentCancelledError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; code?: string; payload?: { code?: unknown }; message?: string }
  if (e.code === FRAME_AGENT_CANCELLED_CODE) return true
  if (e.payload?.code === FRAME_AGENT_CANCELLED_CODE) return true
  return String(e.message || '').includes(FRAME_AGENT_CANCELLED_MESSAGE)
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
  if (isImageSafetyError(err)) {
    return IMAGE_SAFETY_BOARD_MESSAGE
  }
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
    return IMAGE_SAFETY_BOARD_MESSAGE
  }
  if (!msg) return 'Generation failed'
  return msg.length > 120 ? `${msg.slice(0, 117)}…` : msg
}
