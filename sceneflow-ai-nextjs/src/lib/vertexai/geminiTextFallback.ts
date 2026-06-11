import {
  GEMINI_TEXT_MODELS,
  GEMINI_TEXT_MODELS_PREVIOUS,
} from '@/lib/config/modelConfig'
import { isRetryableError } from '@/lib/utils/retry'

/** Ordered quota fallback: lighter models / separate quota pools. */
export const GEMINI_QUOTA_FALLBACK_CHAIN = [
  GEMINI_TEXT_MODELS['3-pro'],
  GEMINI_TEXT_MODELS['3-flash'],
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
