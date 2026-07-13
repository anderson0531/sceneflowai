/**
 * Retry/backoff for Cloud Text-to-Speech / Gemini TTS when Google returns 429.
 *
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Parse Retry-After header: delta-seconds or HTTP-date. */
export function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header?.trim()) return undefined
  const trimmed = header.trim()
  const sec = parseInt(trimmed, 10)
  if (!Number.isNaN(sec) && sec >= 0) return Math.min(sec * 1000, 120_000)
  const when = Date.parse(trimmed)
  if (!Number.isNaN(when)) return Math.min(Math.max(0, when - Date.now()), 120_000)
  return undefined
}

/**
 * Backoff for attempt 0.. after first 429 (respect Retry-When when sensible).
 */
export function backoffMsFor429Attempt(
  attemptIndex: number,
  retryAfterHeader: string | null,
  baseDelayMs: number = 1250,
  capMs: number = 12_000
): number {
  const fromHeader = parseRetryAfterMs(retryAfterHeader)
  const exponential = baseDelayMs * Math.pow(2, attemptIndex)
  const jitter = Math.floor(Math.random() * 450)
  const raw = Math.max(fromHeader ?? 0, exponential) + jitter
  return Math.min(capMs, raw)
}

/**
 * Short backoff after intermittent Vertex usage-guidelines blocks (not rate limits).
 */
export function backoffMsForPolicyAttempt(
  attemptIndex: number,
  baseDelayMs: number = 400,
  capMs: number = 3000
): number {
  const exponential = baseDelayMs * Math.pow(2, attemptIndex)
  const jitter = Math.floor(Math.random() * 150)
  return Math.min(capMs, exponential + jitter)
}

export type VertexTtsRateLimitPayload = {
  userMessage: string
  tips: string[]
}

export function parseVertexTtsRateLimit(
  httpStatus: number,
  _responseBody: string
): VertexTtsRateLimitPayload | null {
  if (httpStatus !== 429) return null

  return {
    userMessage:
      "Google's speech service is temporarily overloaded or you've hit a throughput limit. Wait a few seconds and try again.",
    tips: [
      'Tap Generate again in ~10–30 seconds — short bursts usually succeed after backoff.',
      'If you used Generate All Audio, try one line at a time or pause between scenes.',
      'In Google Cloud Console, check Vertex AI / Text-to-Speech quotas and request an increase if this persists.',
      'Guide: cloud.google.com/vertex-ai/generative-ai/docs/error-code-429',
    ],
  }
}

export class GoogleTtsRateLimitedError extends Error {
  readonly payload: VertexTtsRateLimitPayload

  constructor(payload: VertexTtsRateLimitPayload) {
    super(payload.userMessage)
    this.name = 'GoogleTtsRateLimitedError'
    this.payload = payload
  }
}

/** Extra attempts after the first 429 (total tries = 1 + max429Retries). Capped for serverless timeouts. */
export function getGoogleTts429MaxRetries(): number {
  const raw = process.env.GOOGLE_TTS_429_MAX_RETRIES
  if (raw === undefined || raw === '') return 3
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return 3
  return Math.min(n, 8)
}

/** Extra attempts after a Vertex usage-guidelines block before surfacing policyBlocked to the client. */
export function getGoogleTtsPolicyMaxRetries(): number {
  const raw = process.env.GOOGLE_TTS_POLICY_MAX_RETRIES
  if (raw === undefined || raw === '') return 2
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return 2
  return Math.min(n, 4)
}
