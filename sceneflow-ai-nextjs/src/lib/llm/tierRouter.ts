/**
 * 3-Tier Role-Based LLM Router
 *
 * Decouples creative brilliance, high-volume drafting, and mechanical extraction:
 * - `tier1_showrunner`: Blueprint creative pitching, Showrunner critique, climax turns,
 *   and cross-model eval judging. Uses Vercel AI Gateway Tier 1 model if configured
 *   (or canary override), cleanly falling back to Vertex Gemini Pro/Flash.
 * - `tier2_scene_writer`: High-volume script drafting & Blueprint JSON compilation.
 *   Uses Vertex Gemini workhorse (`gemini-3.8-flash`) with adaptive thinkingLevel.
 * - `tier3_ledger_extractor`: Continuity ledger updates, JSON extraction, classification.
 *   Uses Vertex Gemini Flash-Lite (`gemini-3.5-flash-lite`) at minimal thinking.
 */

import {
  GEMINI_PRODUCT_MODELS,
  getGeminiProductModel,
  type GeminiThinkingLevel,
} from '@/lib/config/modelConfig'
import {
  generateText,
  type TextGenerationOptions,
  type TextGenerationResult,
} from '@/lib/vertexai/gemini'
import {
  generateTextViaAiGateway,
  isAiGatewayConfigured,
} from './aiGatewayClient'
import {
  resolveCanaryModelForRequest,
  type CanarySurface,
} from '@/lib/models/canaryOverrideStore'

export type ModelTier =
  | 'tier1_showrunner'
  | 'tier2_scene_writer'
  | 'tier3_ledger_extractor'

export interface TierGenerationOptions extends Omit<TextGenerationOptions, 'model'> {
  tier: ModelTier
  surface: CanarySurface
  /** Explicit model override (e.g. during Admin Bake-Off evals) */
  explicitModelId?: string
  /** Optional provider override ('vertex' | 'ai_gateway' | 'auto') */
  provider?: 'vertex' | 'ai_gateway' | 'auto'
  isAdmin?: boolean
  bucketKey?: string
}

export interface TierRouteDecision {
  tier: ModelTier
  surface: CanarySurface
  provider: 'vertex' | 'ai_gateway'
  modelId: string
  thinkingLevel: GeminiThinkingLevel
  isCanary: boolean
}

const DEFAULT_TIER1_GATEWAY_MODEL =
  process.env.SCENEFLOW_TIER1_GATEWAY_MODEL?.trim() || 'anthropic/claude-sonnet-4.6'

export function resolveTierRoute(options: {
  tier: ModelTier
  surface: CanarySurface
  explicitModelId?: string
  provider?: 'vertex' | 'ai_gateway' | 'auto'
  thinkingLevel?: GeminiThinkingLevel
  isAdmin?: boolean
  bucketKey?: string
}): TierRouteDecision {
  const gatewayReady = isAiGatewayConfigured()

  // 1. Explicit model override (used by Admin Bake-Off Runner)
  if (options.explicitModelId) {
    const id = options.explicitModelId.trim()
    const isNonGoogle =
      id.includes('/') && !id.toLowerCase().startsWith('google/')
    const useGateway =
      options.provider === 'ai_gateway' ||
      (options.provider !== 'vertex' && isNonGoogle && gatewayReady)
    return {
      tier: options.tier,
      surface: options.surface,
      provider: useGateway ? 'ai_gateway' : 'vertex',
      modelId: id,
      thinkingLevel: options.thinkingLevel || defaultThinkingForTier(options.tier),
      isCanary: false,
    }
  }

  // 2. Active Admin/Canary override
  const canary = resolveCanaryModelForRequest({
    surface: options.surface,
    isAdmin: options.isAdmin,
    bucketKey: options.bucketKey,
  })
  if (canary.active && canary.modelId) {
    const id = canary.modelId
    const isNonGoogle = id.includes('/') && !id.toLowerCase().startsWith('google/')
    const useGateway =
      canary.provider === 'ai_gateway' ||
      (canary.provider !== 'vertex' && isNonGoogle && gatewayReady)
    return {
      tier: options.tier,
      surface: options.surface,
      provider: useGateway ? 'ai_gateway' : 'vertex',
      modelId: id,
      thinkingLevel: options.thinkingLevel || defaultThinkingForTier(options.tier),
      isCanary: true,
    }
  }

  // 3. Standard Role-Based Tier Routing
  if (options.tier === 'tier1_showrunner') {
    if (options.provider !== 'vertex' && gatewayReady && process.env.ENABLE_AI_GATEWAY_TIER1 === 'true') {
      return {
        tier: options.tier,
        surface: options.surface,
        provider: 'ai_gateway',
        modelId: DEFAULT_TIER1_GATEWAY_MODEL,
        thinkingLevel: options.thinkingLevel || 'high',
        isCanary: false,
      }
    }
    return {
      tier: options.tier,
      surface: options.surface,
      provider: 'vertex',
      modelId: getGeminiProductModel('blueprint'),
      thinkingLevel: options.thinkingLevel || 'high',
      isCanary: false,
    }
  }

  if (options.tier === 'tier3_ledger_extractor') {
    return {
      tier: options.tier,
      surface: options.surface,
      provider: 'vertex',
      modelId: GEMINI_PRODUCT_MODELS.lite,
      thinkingLevel: options.thinkingLevel || 'minimal',
      isCanary: false,
    }
  }

  // Default: tier2_scene_writer
  return {
    tier: options.tier,
    surface: options.surface,
    provider: 'vertex',
    modelId: getGeminiProductModel('script'),
    thinkingLevel: options.thinkingLevel || 'medium',
    isCanary: false,
  }
}

function defaultThinkingForTier(tier: ModelTier): GeminiThinkingLevel {
  if (tier === 'tier1_showrunner') return 'high'
  if (tier === 'tier3_ledger_extractor') return 'minimal'
  return 'medium'
}

/**
 * Execute a tiered LLM generation with automatic AI Gateway -> Vertex fallback.
 */
export async function generateWithTier(
  prompt: string,
  options: TierGenerationOptions
): Promise<TextGenerationResult & { routeDecision: TierRouteDecision }> {
  const decision = resolveTierRoute(options)

  if (decision.provider === 'ai_gateway') {
    try {
      const gwResult = await generateTextViaAiGateway(prompt, {
        model: decision.modelId,
        systemInstruction: options.systemInstruction,
        temperature: options.temperature,
        topP: options.topP,
        maxOutputTokens: options.maxOutputTokens,
        responseMimeType: options.responseMimeType,
        timeoutMs: options.timeoutMs,
        surface: options.surface,
        projectId: options.projectId,
        userId: options.userId,
      })
      return { ...gwResult, routeDecision: decision }
    } catch (err) {
      if (options.disableModelFallback) throw err
      console.warn(
        `[TierRouter] AI Gateway failed for ${decision.modelId}, falling back to Vertex Gemini:`,
        err instanceof Error ? err.message : err
      )
      const fallbackModel =
        options.tier === 'tier3_ledger_extractor'
          ? GEMINI_PRODUCT_MODELS.lite
          : getGeminiProductModel('blueprint')
      const fallbackResult = await generateText(prompt, {
        ...options,
        model: fallbackModel,
        thinkingLevel: decision.thinkingLevel,
        surface: options.surface,
      })
      return {
        ...fallbackResult,
        downgraded: true,
        requestedModelId: decision.modelId,
        routeDecision: { ...decision, provider: 'vertex', modelId: fallbackModel },
      }
    }
  }

  const vertexResult = await generateText(prompt, {
    ...options,
    model: decision.modelId,
    thinkingLevel: decision.thinkingLevel,
    surface: options.surface,
  })
  return { ...vertexResult, routeDecision: decision }
}
