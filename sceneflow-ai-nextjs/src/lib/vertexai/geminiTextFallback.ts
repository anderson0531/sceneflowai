import {
  GEMINI_PRODUCT_MODELS,
  GEMINI_TEXT_MODELS_PREVIOUS,
} from '@/lib/config/modelConfig'
import { isRetryableError } from '@/lib/utils/retry'

/**
 * Ordered quota / 404 fallback: workhorse → prior GA → lite → 2.5.
 * Pro leads so heavy revise calls can step down to the GA ladder.
 */
export const GEMINI_QUOTA_FALLBACK_CHAIN = [
  GEMINI_PRODUCT_MODELS.pro,
  GEMINI_PRODUCT_MODELS.workhorse,
  GEMINI_PRODUCT_MODELS.prior,
  GEMINI_PRODUCT_MODELS.lite,
  GEMINI_TEXT_MODELS_PREVIOUS['2.5-flash'],
] as const

export function isGeminiQuotaError(error: unknown): boolean {
  const status = (error as { status?: number })?.status
  if (status === 429) return true
  const message = error instanceof Error ? error.message : String(error)
  if (!isRetryableError(error, status)) return false
  const lower = message.toLowerCase()
  return (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota')
  )
}

/** Next model in the quota fallback chain, or null when exhausted. */
export function getNextGeminiFallbackModel(currentModel: string): string | null {
  const model = currentModel.trim()
  const idx = GEMINI_QUOTA_FALLBACK_CHAIN.indexOf(
    model as (typeof GEMINI_QUOTA_FALLBACK_CHAIN)[number]
  )
  if (idx === -1) return null
  if (idx >= GEMINI_QUOTA_FALLBACK_CHAIN.length - 1) return null
  return GEMINI_QUOTA_FALLBACK_CHAIN[idx + 1]
}

export const VERTEX_QUOTA_EXHAUSTED_USER_MESSAGE =
  'Vertex quota exhausted — try again in a minute or run one scene at a time.'
