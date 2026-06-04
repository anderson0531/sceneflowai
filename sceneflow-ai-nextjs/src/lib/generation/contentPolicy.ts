/**
 * Unified Vertex / Veo content-policy detection for retry ladders and Kling fallback.
 */

export class ContentPolicyExhaustedError extends Error {
  readonly attempts: number
  readonly lastError: string

  constructor(message: string, attempts: number, lastError: string) {
    super(message)
    this.name = 'ContentPolicyExhaustedError'
    this.attempts = attempts
    this.lastError = lastError
  }
}

const POLICY_MARKERS = [
  'content safety filter',
  'content policy',
  'safety filter',
  'rai media filtered',
  'rai filter',
  'blocked by safety',
  'usage guidelines',
  'responsible ai',
  'violates',
  'filtered by',
  'prompt was blocked',
  'blockreason',
  'safety policies',
  'content was filtered',
]

/**
 * True when an error message indicates Vertex/Veo RAI or Gemini-branded policy rejection.
 */
export function isVertexContentPolicyError(message: string | undefined | null): boolean {
  if (!message?.trim()) return false
  const low = message.toLowerCase()
  return POLICY_MARKERS.some((m) => low.includes(m))
}

/** @deprecated Use isVertexContentPolicyError */
export const isVeoContentPolicyError = isVertexContentPolicyError

export function getVeoPolicyMaxAttempts(): number {
  const raw = process.env.VEO_POLICY_MAX_ATTEMPTS
  const n = raw ? parseInt(raw, 10) : 3
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 5) : 3
}

export function isKlingFallbackEnabled(): boolean {
  if (process.env.KLING_POLICY_FALLBACK_ENABLED === 'false') return false
  return !!(
    process.env.KLING_API_KEY ||
    (process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY)
  )
}
