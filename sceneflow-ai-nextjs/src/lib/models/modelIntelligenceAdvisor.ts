/**
 * SceneFlow Model Intelligence & Upgrade Advisor (MIUA)
 *
 * Synthesizes:
 *  1. Live model catalogs (Vercel AI Gateway pricing/context + Vertex AI + Gemini Dev)
 *  2. Deterministic release analysis (`analyzeModelReleases`)
 *  3. Trailing 30-day real LLM telemetry (`LlmTelemetrySummary`)
 *  4. 60-minute longform script unit-economics projections (`project60MinScriptCostUsd`)
 *  5. Optional Golden-Fixture Bake-Off scores
 *
 * Produces actionable Upgrade Dossiers with ROI-quantified verdicts so SceneFlow
 * stays ahead of the model curve while protecting longform production accessibility.
 */

import {
  listModelRegistry,
  type ModelRegistryEntry,
} from './modelRegistry'
import {
  analyzeModelReleases,
  normalizeCatalogModelId,
  type ModelCatalogSnapshot,
  type ModelRecommendation,
} from './modelReleaseAnalyzer'
import type { RichCatalogModel } from './fetchModelCatalogs'
import {
  estimateLlmCostUsd,
  project60MinScriptCostUsd,
  resolveLlmModelRates,
  type LlmModelTokenRates,
  type LongformScriptCostProjection,
} from '@/lib/credits/llmPricing'
import type { LlmTelemetrySummary } from '@/lib/vertexai/llmTelemetry'

export type UpgradeVerdict =
  | 'UPGRADE_RECOMMENDED'
  | 'CANARY_WORTHY'
  | 'COST_REGRESSION_HOLD'
  | 'QUALITY_REGRESSION_HOLD'
  | 'DEPRECATION_URGENT'
  | 'CURRENT'

export interface BakeOffScoreSummary {
  candidateModelId: string
  baselineModelId: string
  baselineQualityScore: number
  candidateQualityScore: number
  qualityDelta: number
  baselineNameNovelty: number
  candidateNameNovelty: number
  baselineJsonReliability: number
  candidateJsonReliability: number
  baselineAvgLatencyMs: number
  candidateAvgLatencyMs: number
  efficiencyWinner: 'candidate' | 'baseline' | 'tie'
}

export interface ModelUpgradeDossier {
  entryId: string
  functionLabel: string
  symbol: string
  surface: string
  currentModelId: string
  candidateModelId: string | null
  candidateProvider: string
  verdict: UpgradeVerdict
  headline: string
  rationale: string
  currentRates: LlmModelTokenRates
  candidateRates: LlmModelTokenRates | null
  script60mCurrent: LongformScriptCostProjection
  script60mCandidate: LongformScriptCostProjection | null
  projected30dCurrentUsd: number
  projected30dCandidateUsd: number | null
  projected30dDeltaUsd: number | null
  projected30dDeltaPercent: number | null
  contextWindowGainTokens: number
  bakeOff?: BakeOffScoreSummary
  prBrief: string | null
  files: string[]
  tests: string[]
}

export interface ModelIntelligenceReport {
  generatedAt: string
  telemetry: LlmTelemetrySummary
  dossiers: ModelUpgradeDossier[]
  crossProviderCandidates: Array<{
    modelId: string
    provider: string
    recommendedRole: string
    inputPer1MUsd: number
    outputPer1MUsd: number
    contextWindow: number
    script60mTierRoutedUsd: number
    note: string
  }>
  recommendationsSummary: {
    upgradeNow: number
    canaryWorthy: number
    costHolds: number
    deprecationAlerts: number
  }
}

function buildLiveRateOverrides(
  richGatewayModels: RichCatalogModel[]
): Record<string, Partial<LlmModelTokenRates>> {
  const overrides: Record<string, Partial<LlmModelTokenRates>> = {}
  for (const m of richGatewayModels) {
    if (m.inputPer1MUsd === undefined && m.outputPer1MUsd === undefined) continue
    const partial: Partial<LlmModelTokenRates> = {
      modelId: m.shortId,
      ...(m.inputPer1MUsd !== undefined ? { inputPer1MUsd: m.inputPer1MUsd } : {}),
      ...(m.cachedInputPer1MUsd !== undefined
        ? { cachedInputPer1MUsd: m.cachedInputPer1MUsd }
        : m.inputPer1MUsd !== undefined
          ? { cachedInputPer1MUsd: Number((m.inputPer1MUsd * 0.1).toFixed(4)) }
          : {}),
      ...(m.outputPer1MUsd !== undefined
        ? { outputPer1MUsd: m.outputPer1MUsd, thinkingPer1MUsd: m.outputPer1MUsd }
        : {}),
      ...(m.contextWindow ? { contextWindow: m.contextWindow } : {}),
      ...(m.maxOutputTokens ? { maxOutputTokens: m.maxOutputTokens } : {}),
    }
    overrides[m.shortId.toLowerCase()] = partial
    overrides[m.id.toLowerCase()] = partial
  }
  return overrides
}

function replayTelemetryCostUsd(
  modelId: string,
  telemetry: LlmTelemetrySummary,
  surfaceFilter: string | null,
  liveOverrides: Record<string, Partial<LlmModelTokenRates>>
): number {
  const matchingSurfaces = surfaceFilter
    ? telemetry.bySurface.filter((s) => s.surface.includes(surfaceFilter))
    : telemetry.bySurface

  let prompt = 0
  let cached = 0
  let output = 0
  let thoughts = 0
  for (const s of matchingSurfaces) {
    prompt += s.promptTokens
    cached += s.cachedTokens
    output += s.outputTokens
    thoughts += s.thoughtsTokens
  }

  // When live telemetry is still warming up (0 calls), use a realistic baseline of
  // 50 60-min scripts/month so Admins still see concrete dollar comparisons.
  if (prompt === 0 && output === 0) {
    const baseline60m = project60MinScriptCostUsd(modelId, liveOverrides)
    return Number((baseline60m.tierRoutedCostUsd * 50).toFixed(2))
  }

  return Number(
    estimateLlmCostUsd(
      modelId,
      {
        promptTokenCount: prompt,
        cachedContentTokenCount: cached,
        candidatesTokenCount: output,
        thoughtsTokenCount: thoughts,
      },
      liveOverrides
    ).toFixed(4)
  )
}

function buildEnhancedPrBrief(opts: {
  entry: ModelRegistryEntry
  verdict: UpgradeVerdict
  candidateModelId: string | null
  rationale: string
  projected30dDeltaUsd: number | null
  script60mCurrent: LongformScriptCostProjection
  script60mCandidate: LongformScriptCostProjection | null
}): string {
  const lines = [
    `SceneFlow Model Intelligence Upgrade Brief`,
    ``,
    `Verdict: ${opts.verdict}`,
    `Function: ${opts.entry.function} (${opts.entry.symbol})`,
    `Current pin: ${opts.entry.modelId}`,
    `Proposed candidate: ${opts.candidateModelId ?? 'none'}`,
    `60-Min Script Cost (Tier-Routed): $${opts.script60mCurrent.tierRoutedCostUsd.toFixed(4)} -> ${
      opts.script60mCandidate ? `$${opts.script60mCandidate.tierRoutedCostUsd.toFixed(4)}` : 'n/a'
    }`,
    opts.projected30dDeltaUsd !== null
      ? `Projected 30d COGS Delta: ${opts.projected30dDeltaUsd >= 0 ? '+' : ''}$${opts.projected30dDeltaUsd.toFixed(2)}`
      : `Projected 30d COGS Delta: n/a`,
    `Rationale: ${opts.rationale}`,
  ]
  if (opts.entry.files.length > 0) {
    lines.push('', 'Files to update:', ...opts.entry.files.map((f) => `- ${f}`))
  }
  if (opts.entry.tests.length > 0) {
    lines.push('', 'Tests to run:', ...opts.entry.tests.map((t) => `- ${t}`))
  }
  lines.push(
    '',
    'Also update `src/lib/credits/llmPricing.ts` (and `credit_pricing` draft rates if margin shifts > 10%).'
  )
  return lines.join('\n')
}

/**
 * Synthesize a complete Model Intelligence & Upgrade Advisor report.
 */
export function buildModelIntelligenceReport(input: {
  catalogs: ModelCatalogSnapshot[]
  richGatewayModels: RichCatalogModel[]
  telemetry: LlmTelemetrySummary
  entries?: ModelRegistryEntry[]
  bakeOffByEntryId?: Record<string, BakeOffScoreSummary>
}): ModelIntelligenceReport {
  const entries = input.entries ?? listModelRegistry()
  const releaseRecs = analyzeModelReleases(entries, input.catalogs)
  const recById = new Map<string, ModelRecommendation>(
    releaseRecs.map((r) => [r.entryId, r])
  )
  const liveOverrides = buildLiveRateOverrides(input.richGatewayModels)

  // Focus dossiers on active text LLM entries + any retired/actionable entries
  const targetEntries = entries.filter(
    (e) => e.category === 'text' || e.role === 'retired' || recById.get(e.id)?.action !== 'catalog_only'
  )

  const dossiers: ModelUpgradeDossier[] = targetEntries.map((entry) => {
    const rec = recById.get(entry.id)
    const currentRates = resolveLlmModelRates(entry.modelId, liveOverrides)
    const script60mCurrent = project60MinScriptCostUsd(entry.modelId, liveOverrides)

    const candidateModelId = rec?.proposedModelId ?? null
    const candidateRates = candidateModelId
      ? resolveLlmModelRates(candidateModelId, liveOverrides)
      : null
    const script60mCandidate = candidateModelId
      ? project60MinScriptCostUsd(candidateModelId, liveOverrides)
      : null

    const surfaceFilter =
      entry.id === 'text-workhorse'
        ? null
        : entry.id.includes('script')
          ? 'script'
          : entry.id.includes('blueprint')
            ? 'blueprint'
            : null

    const projected30dCurrentUsd = replayTelemetryCostUsd(
      entry.modelId,
      input.telemetry,
      surfaceFilter,
      liveOverrides
    )
    const projected30dCandidateUsd = candidateModelId
      ? replayTelemetryCostUsd(candidateModelId, input.telemetry, surfaceFilter, liveOverrides)
      : null

    const projected30dDeltaUsd =
      projected30dCandidateUsd !== null
        ? Number((projected30dCandidateUsd - projected30dCurrentUsd).toFixed(4))
        : null
    const projected30dDeltaPercent =
      projected30dDeltaUsd !== null && projected30dCurrentUsd > 0
        ? Math.round((projected30dDeltaUsd / projected30dCurrentUsd) * 100)
        : null

    const contextWindowGainTokens = candidateRates
      ? candidateRates.contextWindow - currentRates.contextWindow
      : 0

    const bakeOff = input.bakeOffByEntryId?.[entry.id]

    let verdict: UpgradeVerdict = 'CURRENT'
    let headline = `${entry.modelId} is current`
    let rationale = rec?.reason || 'No newer GA release detected in active catalogs.'

    if (entry.role === 'retired' || rec?.action === 'cleanup') {
      verdict = 'DEPRECATION_URGENT'
      headline = `Remove retired pin ${entry.modelId}`
      rationale = rec?.reason || 'Retired model constant should be cleaned up.'
    } else if (candidateModelId && rec && (rec.action === 'workhorse_bump' || rec.action === 'rename')) {
      if (bakeOff && bakeOff.qualityDelta < -3) {
        verdict = 'QUALITY_REGRESSION_HOLD'
        headline = `Hold ${candidateModelId} (quality regressed ${bakeOff.qualityDelta} pts)`
        rationale = `Golden Bake-Off showed quality drop (${bakeOff.baselineQualityScore} -> ${bakeOff.candidateQualityScore}). Keep ${entry.modelId}.`
      } else if (projected30dDeltaPercent !== null && projected30dDeltaPercent > 25 && (!bakeOff || bakeOff.qualityDelta < 5)) {
        verdict = 'COST_REGRESSION_HOLD'
        headline = `Hold ${candidateModelId} (+${projected30dDeltaPercent}% projected COGS)`
        rationale = `Candidate raises projected 30d COGS by ${projected30dDeltaPercent}% without a proven >=5 pt Golden Bake-Off gain. Run Bake-Off or restrict to Tier 1.`
      } else if (bakeOff && bakeOff.qualityDelta >= 0) {
        verdict = 'UPGRADE_RECOMMENDED'
        headline = `Upgrade to ${candidateModelId} (Bake-Off verified)`
        rationale = `Bake-Off passed (+${bakeOff.qualityDelta} quality pts, ${projected30dDeltaPercent ?? 0}% COGS delta). Safe to bump pin.`
      } else {
        verdict = 'CANARY_WORTHY'
        headline = `Run Bake-Off / Canary for ${candidateModelId}`
        rationale = `${rec.reason} Projected 30d COGS delta: ${projected30dDeltaPercent ?? 0}%. Run Golden Bake-Off before bumping production pin.`
      }
    } else if (rec?.action === 'hold') {
      verdict = 'COST_REGRESSION_HOLD'
      headline = `Hold ${entry.modelId} (${rec.reason})`
    }

    const prBrief =
      verdict === 'CURRENT'
        ? null
        : buildEnhancedPrBrief({
            entry,
            verdict,
            candidateModelId,
            rationale,
            projected30dDeltaUsd,
            script60mCurrent,
            script60mCandidate,
          })

    return {
      entryId: entry.id,
      functionLabel: entry.function,
      symbol: entry.symbol,
      surface: surfaceFilter || 'all_text',
      currentModelId: entry.modelId,
      candidateModelId,
      candidateProvider: candidateRates?.provider ?? currentRates.provider,
      verdict,
      headline,
      rationale,
      currentRates,
      candidateRates,
      script60mCurrent,
      script60mCandidate,
      projected30dCurrentUsd,
      projected30dCandidateUsd,
      projected30dDeltaUsd,
      projected30dDeltaPercent,
      contextWindowGainTokens,
      bakeOff,
      prBrief,
      files: entry.files,
      tests: entry.tests,
    }
  })

  // Surface top cross-provider Tier 1 & Tier 3 candidates from Gateway catalog (or seeded defaults)
  const crossProviderIds = new Set<string>([
    'anthropic/claude-sonnet-4.6',
    'openai/gpt-5',
    'google/gemini-3.5-flash-lite',
    'google/gemini-3.1-pro-preview',
  ])
  for (const m of input.richGatewayModels) {
    if (
      (m.provider === 'anthropic' && m.shortId.includes('sonnet')) ||
      (m.provider === 'openai' && (m.shortId.startsWith('gpt-5') || m.shortId.startsWith('gpt-4.1'))) ||
      (m.provider === 'google' && m.shortId.includes('gemini-3') && !m.shortId.includes('image'))
    ) {
      crossProviderIds.add(m.id)
    }
  }

  const crossProviderCandidates = Array.from(crossProviderIds)
    .slice(0, 8)
    .map((id) => {
      const short = normalizeCatalogModelId(id)
      const rates = resolveLlmModelRates(short, liveOverrides)
      const proj = project60MinScriptCostUsd(short, liveOverrides)
      const role =
        rates.provider === 'anthropic' || short.includes('pro') || short.startsWith('gpt-5')
          ? 'Tier 1 Showrunner Pitch & Cross-Model Eval Judge'
          : short.includes('lite')
            ? 'Tier 3 Continuity Ledger & JSON Extractor'
            : 'Tier 2 Scene Writer Workhorse'
      return {
        modelId: id,
        provider: rates.provider,
        recommendedRole: role,
        inputPer1MUsd: rates.inputPer1MUsd,
        outputPer1MUsd: rates.outputPer1MUsd,
        contextWindow: rates.contextWindow,
        script60mTierRoutedUsd: proj.tierRoutedCostUsd,
        note:
          role.startsWith('Tier 1')
            ? 'Use selectively (2–4 calls/project) for maximum First-Take creative lift without inflating per-scene COGS.'
            : role.startsWith('Tier 3')
              ? 'Ultra-low cost ($0.10/1M in) for rolling Continuity Ledger updates and mechanical extraction.'
              : 'High-throughput workhorse with Vertex Context Caching (75–90% input discount).',
      }
    })

  return {
    generatedAt: new Date().toISOString(),
    telemetry: input.telemetry,
    dossiers,
    crossProviderCandidates,
    recommendationsSummary: {
      upgradeNow: dossiers.filter((d) => d.verdict === 'UPGRADE_RECOMMENDED').length,
      canaryWorthy: dossiers.filter((d) => d.verdict === 'CANARY_WORTHY').length,
      costHolds: dossiers.filter((d) => d.verdict === 'COST_REGRESSION_HOLD').length,
      deprecationAlerts: dossiers.filter((d) => d.verdict === 'DEPRECATION_URGENT').length,
    },
  }
}
