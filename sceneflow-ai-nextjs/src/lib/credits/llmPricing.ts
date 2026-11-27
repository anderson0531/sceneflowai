/**
 * LLM Token Pricing & Unit-Economics Calculator
 *
 * Supplies per-1M-token USD rates (input, cached input, output, thinking)
 * for Vertex AI Gemini models and cross-provider models exposed via
 * Vercel AI Gateway. Supports live pricing overlays from Gateway `/v1/models`.
 */

export interface LlmModelTokenRates {
  /** Canonical short model ID (e.g. 'gemini-3.8-flash', 'claude-sonnet-4.6') */
  modelId: string
  provider: 'google' | 'anthropic' | 'openai' | 'deepseek' | 'xai' | 'other'
  /** USD per 1,000,000 uncached input tokens */
  inputPer1MUsd: number
  /** USD per 1,000,000 cached input tokens (typically 10-25% of inputPer1MUsd) */
  cachedInputPer1MUsd: number
  /** USD per 1,000,000 output tokens */
  outputPer1MUsd: number
  /** USD per 1,000,000 thinking/reasoning tokens (defaults to outputPer1MUsd if omitted) */
  thinkingPer1MUsd?: number
  /** Nominal context window in tokens */
  contextWindow: number
  /** Nominal max output tokens */
  maxOutputTokens: number
  /** Optional deprecation or retirement date (ISO YYYY-MM-DD) */
  deprecationDate?: string
}

export interface LlmTokenUsage {
  promptTokenCount?: number
  cachedContentTokenCount?: number
  candidatesTokenCount?: number
  thoughtsTokenCount?: number
  totalTokenCount?: number
}

/**
 * Baseline seeded per-1M-token USD rates.
 * Live Vercel AI Gateway `/v1/models` pricing overlays these at analysis time.
 */
export const SEEDED_LLM_TOKEN_RATES: Record<string, LlmModelTokenRates> = {
  'gemini-3.8-flash': {
    modelId: 'gemini-3.8-flash',
    provider: 'google',
    inputPer1MUsd: 0.30,
    cachedInputPer1MUsd: 0.03,
    outputPer1MUsd: 2.50,
    thinkingPer1MUsd: 2.50,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
  },
  'gemini-3.6-flash': {
    modelId: 'gemini-3.6-flash',
    provider: 'google',
    inputPer1MUsd: 0.30,
    cachedInputPer1MUsd: 0.03,
    outputPer1MUsd: 2.50,
    thinkingPer1MUsd: 2.50,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
  },
  'gemini-3.5-flash': {
    modelId: 'gemini-3.5-flash',
    provider: 'google',
    inputPer1MUsd: 0.30,
    cachedInputPer1MUsd: 0.03,
    outputPer1MUsd: 2.50,
    thinkingPer1MUsd: 2.50,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
  },
  'gemini-3.5-flash-lite': {
    modelId: 'gemini-3.5-flash-lite',
    provider: 'google',
    inputPer1MUsd: 0.10,
    cachedInputPer1MUsd: 0.01,
    outputPer1MUsd: 0.40,
    thinkingPer1MUsd: 0.40,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
  },
  'gemini-3.1-pro-preview': {
    modelId: 'gemini-3.1-pro-preview',
    provider: 'google',
    inputPer1MUsd: 2.00,
    cachedInputPer1MUsd: 0.20,
    outputPer1MUsd: 12.00,
    thinkingPer1MUsd: 12.00,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
  },
  'gemini-3.1-pro': {
    modelId: 'gemini-3.1-pro',
    provider: 'google',
    inputPer1MUsd: 2.00,
    cachedInputPer1MUsd: 0.20,
    outputPer1MUsd: 12.00,
    thinkingPer1MUsd: 12.00,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
  },
  'gemini-2.5-flash': {
    modelId: 'gemini-2.5-flash',
    provider: 'google',
    inputPer1MUsd: 0.30,
    cachedInputPer1MUsd: 0.03,
    outputPer1MUsd: 2.50,
    thinkingPer1MUsd: 2.50,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
  },
  'claude-sonnet-4.6': {
    modelId: 'claude-sonnet-4.6',
    provider: 'anthropic',
    inputPer1MUsd: 3.00,
    cachedInputPer1MUsd: 0.30,
    outputPer1MUsd: 15.00,
    thinkingPer1MUsd: 15.00,
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
  },
  'claude-sonnet-4.5': {
    modelId: 'claude-sonnet-4.5',
    provider: 'anthropic',
    inputPer1MUsd: 3.00,
    cachedInputPer1MUsd: 0.30,
    outputPer1MUsd: 15.00,
    thinkingPer1MUsd: 15.00,
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
  },
  'gpt-5': {
    modelId: 'gpt-5',
    provider: 'openai',
    inputPer1MUsd: 1.25,
    cachedInputPer1MUsd: 0.125,
    outputPer1MUsd: 10.00,
    thinkingPer1MUsd: 10.00,
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
  },
}

const DEFAULT_FALLBACK_RATES: LlmModelTokenRates = {
  modelId: 'unknown',
  provider: 'other',
  inputPer1MUsd: 0.50,
  cachedInputPer1MUsd: 0.05,
  outputPer1MUsd: 3.00,
  thinkingPer1MUsd: 3.00,
  contextWindow: 128_000,
  maxOutputTokens: 16_384,
}

function normalizeRateKey(modelId: string): string {
  const trimmed = (modelId || '').trim().toLowerCase()
  const slash = trimmed.lastIndexOf('/')
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed
}

/**
 * Look up token rates for a model ID, applying optional live catalog overrides.
 */
export function resolveLlmModelRates(
  modelId: string,
  liveOverrides?: Record<string, Partial<LlmModelTokenRates>>
): LlmModelTokenRates {
  const key = normalizeRateKey(modelId)
  const base =
    SEEDED_LLM_TOKEN_RATES[key] ??
    (key.includes('flash-lite')
      ? SEEDED_LLM_TOKEN_RATES['gemini-3.5-flash-lite']
      : key.includes('flash')
        ? SEEDED_LLM_TOKEN_RATES['gemini-3.8-flash']
        : key.includes('gemini') && key.includes('pro')
          ? SEEDED_LLM_TOKEN_RATES['gemini-3.1-pro']
          : key.includes('claude') && key.includes('sonnet')
            ? SEEDED_LLM_TOKEN_RATES['claude-sonnet-4.6']
            : { ...DEFAULT_FALLBACK_RATES, modelId: key || 'unknown' })

  const override = liveOverrides?.[key] ?? liveOverrides?.[modelId]
  if (!override) return { ...base, modelId: key || base.modelId }

  return {
    ...base,
    ...override,
    modelId: key || base.modelId,
  }
}

/**
 * Compute USD cost for a single LLM call from Vertex / Gateway usageMetadata.
 */
export function estimateLlmCostUsd(
  modelId: string,
  usage?: LlmTokenUsage | null,
  liveOverrides?: Record<string, Partial<LlmModelTokenRates>>
): number {
  if (!usage) return 0
  const rates = resolveLlmModelRates(modelId, liveOverrides)

  const totalPrompt = Math.max(0, usage.promptTokenCount ?? 0)
  const cachedPrompt = Math.min(totalPrompt, Math.max(0, usage.cachedContentTokenCount ?? 0))
  const uncachedPrompt = Math.max(0, totalPrompt - cachedPrompt)
  const outputTokens = Math.max(0, usage.candidatesTokenCount ?? 0)
  const thinkingTokens = Math.max(0, usage.thoughtsTokenCount ?? 0)

  const inputCost = (uncachedPrompt / 1_000_000) * rates.inputPer1MUsd
  const cachedCost = (cachedPrompt / 1_000_000) * rates.cachedInputPer1MUsd
  const outputCost = (outputTokens / 1_000_000) * rates.outputPer1MUsd
  const thinkingCost =
    (thinkingTokens / 1_000_000) * (rates.thinkingPer1MUsd ?? rates.outputPer1MUsd)

  return Number((inputCost + cachedCost + outputCost + thinkingCost).toFixed(6))
}

/**
 * Standard SceneFlow 60-minute script workload profile (used by Admin MIUA for apples-to-apples comparisons).
 * Represents ~25 scenes across 10 generation batches with ~11k static Story Bible prefix tokens.
 */
export const LONGFORM_60M_SCRIPT_PROFILE = {
  chunks: 10,
  staticPrefixTokensPerChunk: 11_000,
  dynamicPromptTokensPerChunk: 2_500,
  outputTokensPerChunk: 10_500,
  thinkingTokensPerChunk: 4_500,
} as const

export interface LongformScriptCostProjection {
  modelId: string
  uncachedCostUsd: number
  cachedCostUsd: number
  cacheSavingsPercent: number
  tierRoutedCostUsd: number
}

/**
 * Project USD cost of generating a full 60-minute script on a given candidate model,
 * comparing uncached vs Vertex-cached vs 3-tier routed (adaptive thinking + Flash-Lite ledger).
 */
export function project60MinScriptCostUsd(
  modelId: string,
  liveOverrides?: Record<string, Partial<LlmModelTokenRates>>
): LongformScriptCostProjection {
  const {
    chunks,
    staticPrefixTokensPerChunk,
    dynamicPromptTokensPerChunk,
    outputTokensPerChunk,
    thinkingTokensPerChunk,
  } = LONGFORM_60M_SCRIPT_PROFILE

  const uncached = estimateLlmCostUsd(
    modelId,
    {
      promptTokenCount: (staticPrefixTokensPerChunk + dynamicPromptTokensPerChunk) * chunks,
      cachedContentTokenCount: 0,
      candidatesTokenCount: outputTokensPerChunk * chunks,
      thoughtsTokenCount: thinkingTokensPerChunk * chunks,
    },
    liveOverrides
  )

  // First chunk populates cache; chunks 2..N read staticPrefixTokensPerChunk from cache.
  const cached = estimateLlmCostUsd(
    modelId,
    {
      promptTokenCount: (staticPrefixTokensPerChunk + dynamicPromptTokensPerChunk) * chunks,
      cachedContentTokenCount: staticPrefixTokensPerChunk * Math.max(0, chunks - 1),
      candidatesTokenCount: outputTokensPerChunk * chunks,
      thoughtsTokenCount: thinkingTokensPerChunk * chunks,
    },
    liveOverrides
  )

  // 3-tier routing: adaptive thinking cuts average thinking tokens ~45% on non-climax batches,
  // plus Flash-Lite ledger updates (~2k in / 0.6k out per batch).
  const adaptiveMainCost = estimateLlmCostUsd(
    modelId,
    {
      promptTokenCount: (staticPrefixTokensPerChunk + dynamicPromptTokensPerChunk) * chunks,
      cachedContentTokenCount: staticPrefixTokensPerChunk * Math.max(0, chunks - 1),
      candidatesTokenCount: outputTokensPerChunk * chunks,
      thoughtsTokenCount: Math.round(thinkingTokensPerChunk * 0.55) * chunks,
    },
    liveOverrides
  )
  const ledgerCost = estimateLlmCostUsd(
    'gemini-3.5-flash-lite',
    {
      promptTokenCount: 2_000 * chunks,
      candidatesTokenCount: 600 * chunks,
      thoughtsTokenCount: 0,
    },
    liveOverrides
  )

  const tierRoutedCostUsd = Number((adaptiveMainCost + ledgerCost).toFixed(4))
  const cacheSavingsPercent =
    uncached > 0 ? Math.round(((uncached - cached) / uncached) * 100) : 0

  return {
    modelId: normalizeRateKey(modelId),
    uncachedCostUsd: Number(uncached.toFixed(4)),
    cachedCostUsd: Number(cached.toFixed(4)),
    cacheSavingsPercent,
    tierRoutedCostUsd,
  }
}
