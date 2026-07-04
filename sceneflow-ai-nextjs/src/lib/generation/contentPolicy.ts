/**
 * Unified Vertex / Veo content-policy detection for retry ladders and Kling fallback.
 */

import { isContentBlockedError } from '@/lib/vertexai/safety'

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
  if (POLICY_MARKERS.some((m) => low.includes(m))) return true
  return isContentBlockedError(new Error(message))
}

/** @deprecated Use isVertexContentPolicyError */
export const isVeoContentPolicyError = isVertexContentPolicyError

export function getVeoPolicyMaxAttempts(): number {
  const raw = process.env.VEO_POLICY_MAX_ATTEMPTS
  const n = raw ? parseInt(raw, 10) : 3
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 5) : 3
}

import { isDirectKlingFallbackEnabled } from '@/lib/kling/config'

/** Fal.ai gateway for Kling models (platform pay-as-you-go). */
export function isFalKlingFallbackEnabled(): boolean {
  if (process.env.FAL_KLING_POLICY_FALLBACK_ENABLED === 'false') return false
  if (process.env.KLING_POLICY_FALLBACK_ENABLED === 'false') return false
  return !!process.env.FAL_KEY?.trim()
}

/** @deprecated Use isFalKlingFallbackEnabled */
export const isKlingFallbackEnabled = isFalKlingFallbackEnabled

export { isDirectKlingFallbackEnabled }

/** Prefer direct Kling when configured; otherwise Fal-hosted Kling. */
export function getKlingFallbackProvider(): 'kling' | 'fal' | null {
  if (isDirectKlingFallbackEnabled()) return 'kling'
  if (isFalKlingFallbackEnabled()) return 'fal'
  return null
}

export function isVeoPolicyFastFallbackEnabled(): boolean {
  return process.env.VEO_POLICY_FAST_FALLBACK === 'true'
}
