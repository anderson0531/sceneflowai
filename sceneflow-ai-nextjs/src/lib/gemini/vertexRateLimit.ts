/**
 * Vertex / Interactions quota errors.
 *
 * Omni returns HTTP 429 with `code: too_many_requests` and a message that says
 * "check quota". That string does not contain the words "rate limit".
 */

export const VERTEX_RATE_LIMIT_RETRY_AFTER_SECONDS = 60

const INTERACTIONS_429 =
  'Vertex AI Interactions error 429: {"error":{"message":"Resource has been exhausted (e.g. check quota).","code":"too_many_requests"}}'

/** Example body from the Interactions API, used by tests and docs. */
export const VERTEX_INTERACTIONS_TOO_MANY_REQUESTS = INTERACTIONS_429

/** Short cooldown (429 / too_many_requests), even when the text also says "quota". */
export function isVertexBurstRateLimitMessage(message: string | null | undefined): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('too_many_requests') ||
    lower.includes('too many requests')
  )
}

/** Daily/project quota exhaustion that is not already a burst 429. */
export function isVertexQuotaExhaustedMessage(message: string | null | undefined): boolean {
  if (!message || isVertexBurstRateLimitMessage(message)) return false
  const lower = message.toLowerCase()
  return (
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('resource has been exhausted')
  )
}

export function isVertexRateLimitMessage(message: string | null | undefined): boolean {
  return isVertexBurstRateLimitMessage(message) || isVertexQuotaExhaustedMessage(message)
}

export interface VertexRateLimitHttp {
  status: 429
  error: string
  retryAfter: number
  isRateLimited: true
  headers: { 'Retry-After': string }
}

/**
 * Map a Vertex/Interactions quota failure to one HTTP 429.
 * The Google message is preserved so callers do not turn it into a 500.
 */
export function classifyVertexRateLimitHttp(
  message: string | null | undefined
): VertexRateLimitHttp | null {
  if (!message || !isVertexRateLimitMessage(message)) return null
  const retryAfter = VERTEX_RATE_LIMIT_RETRY_AFTER_SECONDS
  return {
    status: 429,
    error: message,
    retryAfter,
    isRateLimited: true,
    headers: { 'Retry-After': String(retryAfter) },
  }
}

/** generate-asset 429s are surfaced once. Inngest must not replay them. */
export function shouldReplayInternalGenerateAsset(path: string, status: number): boolean {
  if (path.includes('/generate-asset') && status === 429) return false
  return true
}
