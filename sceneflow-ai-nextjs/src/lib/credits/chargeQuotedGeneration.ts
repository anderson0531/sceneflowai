import { CreditService } from '@/services/CreditService'
import { logProviderCost } from './costTracking'
import { resolveGenerationQuote } from './resolveGenerationQuote'
import type { GenerationQuote, QuoteGenerationInput } from './quoteGenerationCredits'

export async function chargeQuotedGeneration(args: {
  userId: string
  quote: GenerationQuote
  ref?: string | null
  projectId?: string | null
  segmentId?: string
  sceneId?: string
  meta?: Record<string, unknown>
}): Promise<GenerationQuote> {
  const { quote } = args
  if (quote.credits <= 0) return quote

  await CreditService.charge(args.userId, quote.credits, quote.byok ? 'byok_platform_fee' : 'ai_usage', args.ref ?? args.projectId ?? null, {
    operation: quote.operation,
    model: quote.model,
    resolution: quote.resolution,
    durationSeconds: quote.durationSeconds,
    providerUsd: quote.providerUsd,
    byok: quote.byok,
    projectId: args.projectId ?? undefined,
    segmentId: args.segmentId,
    ...args.meta,
  })

  await logProviderCost({
    userId: args.userId,
    operation: quote.operation,
    provider: 'sceneflow-ai',
    model: quote.model,
    creditsCharged: quote.credits,
    providerCostUsd: quote.cogsUsd,
    marginPercent: 0,
    imageCount: quote.metric === 'per_image' ? quote.units : undefined,
    videoDurationSec: quote.metric === 'per_second' ? quote.durationSeconds : undefined,
    projectId: args.projectId ?? undefined,
    sceneId: args.sceneId,
    segmentId: args.segmentId,
    byok: quote.byok,
    resolution: quote.resolution,
    timestamp: new Date(),
  })

  return quote
}

export async function quoteAndCharge(args: {
  userId: string
  quoteInput: QuoteGenerationInput
  ref?: string | null
  projectId?: string | null
  segmentId?: string
  sceneId?: string
  meta?: Record<string, unknown>
}): Promise<GenerationQuote> {
  const quote = await resolveGenerationQuote(args.quoteInput)
  return chargeQuotedGeneration({ ...args, quote })
}
