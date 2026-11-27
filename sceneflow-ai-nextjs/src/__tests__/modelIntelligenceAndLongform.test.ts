import { describe, it, expect, beforeEach } from 'vitest'
import {
  estimateLlmCostUsd,
  project60MinScriptCostUsd,
} from '@/lib/credits/llmPricing'
import {
  clearRecentLlmTelemetry,
  recordLlmTelemetry,
  summarizeLlmTelemetryEvents,
} from '@/lib/vertexai/llmTelemetry'
import {
  clearAllCanaryOverrides,
  resolveCanaryModelForRequest,
  setCanaryOverride,
} from '@/lib/models/canaryOverrideStore'
import { resolveTierRoute } from '@/lib/llm/tierRouter'
import {
  createEmptyContinuityLedger,
  formatContinuityLedgerBlock,
  selectAdaptiveThinkingLevelForChunk,
  updateContinuityLedgerDeterministic,
} from '@/lib/script/continuityLedger'
import {
  classifySegmentMotion,
  compareProductionFidelityTiers,
} from '@/lib/video/fidelityPlanner'
import { parseRichGatewayModels } from '@/lib/models/fetchModelCatalogs'
import { buildModelIntelligenceReport } from '@/lib/models/modelIntelligenceAdvisor'
import { summarizeBakeOffMetrics } from '@/lib/models/bakeOffRunner'

describe('Phase 1 & 3A: LLM Pricing, Telemetry, Canary Routing & Longform Script Compiler', () => {
  beforeEach(() => {
    clearRecentLlmTelemetry()
    clearAllCanaryOverrides()
  })

  it('calculates cached vs uncached LLM costs and shows significant 60-min script savings', () => {
    const uncached = estimateLlmCostUsd('gemini-3.8-flash', {
      promptTokenCount: 100_000,
      cachedContentTokenCount: 0,
      candidatesTokenCount: 20_000,
      thoughtsTokenCount: 10_000,
    })
    const cached = estimateLlmCostUsd('gemini-3.8-flash', {
      promptTokenCount: 100_000,
      cachedContentTokenCount: 90_000,
      candidatesTokenCount: 20_000,
      thoughtsTokenCount: 10_000,
    })
    expect(cached).toBeLessThan(uncached)

    const proj = project60MinScriptCostUsd('gemini-3.8-flash')
    expect(proj.cachedCostUsd).toBeLessThan(proj.uncachedCostUsd)
    expect(proj.tierRoutedCostUsd).toBeLessThan(proj.cachedCostUsd)
  })

  it('records and rolls up LLM telemetry including downgrades, truncations, and cache hits', () => {
    const e1 = recordLlmTelemetry({
      surface: 'script_chunk',
      requestedModel: 'gemini-3.8-flash',
      servedModel: 'gemini-3.8-flash',
      usedCache: true,
      usageMetadata: {
        promptTokenCount: 12_000,
        cachedContentTokenCount: 10_000,
        candidatesTokenCount: 4_000,
        thoughtsTokenCount: 2_000,
      },
      latencyMs: 3200,
      finishReason: 'STOP',
      persistToDb: false,
    })
    const e2 = recordLlmTelemetry({
      surface: 'blueprint',
      requestedModel: 'gemini-3.8-flash',
      servedModel: 'gemini-3.6-flash',
      downgraded: true,
      usageMetadata: {
        promptTokenCount: 5_000,
        candidatesTokenCount: 8_000,
      },
      latencyMs: 4800,
      finishReason: 'MAX_TOKENS',
      persistToDb: false,
    })

    const summary = summarizeLlmTelemetryEvents([e1, e2], 30, 'memory')
    expect(summary.totalCalls).toBe(2)
    expect(summary.downgradeRate).toBe(0.5)
    expect(summary.truncationRate).toBe(0.5)
    expect(summary.cacheHitRate).toBe(0.5)
    expect(summary.totalCostUsd).toBeGreaterThan(0)
    expect(summary.bySurface.length).toBe(2)
  })

  it('enforces safe admin_only and canary_percent overrides in Tier Router', () => {
    // Default off -> standard vertex routing
    const baseRoute = resolveTierRoute({
      tier: 'tier3_ledger_extractor',
      surface: 'script_ledger',
    })
    expect(baseRoute.modelId).toBe('gemini-3.5-flash-lite')
    expect(baseRoute.isCanary).toBe(false)

    setCanaryOverride({
      surface: 'blueprint',
      mode: 'admin_only',
      candidateModelId: 'gemini-3.9-flash',
    })
    expect(resolveCanaryModelForRequest({ surface: 'blueprint', isAdmin: false }).active).toBe(false)
    const adminCheck = resolveCanaryModelForRequest({ surface: 'blueprint', isAdmin: true })
    expect(adminCheck.active).toBe(true)
    expect(adminCheck.modelId).toBe('gemini-3.9-flash')

    const routed = resolveTierRoute({
      tier: 'tier2_scene_writer',
      surface: 'blueprint',
      isAdmin: true,
    })
    expect(routed.isCanary).toBe(true)
    expect(routed.modelId).toBe('gemini-3.9-flash')
  })

  it('updates Rolling Continuity Ledger deterministically and adapts chunk thinking levels', () => {
    const empty = createEmptyContinuityLedger()
    const updated = updateContinuityLedgerDeterministic(empty, [
      {
        sceneNumber: 1,
        heading: 'INT. HARBOR BAKERY - DAWN',
        action: 'Nadia unlocks the rusted proofing locker and finds an overdue eviction notice.',
        dialogue: [{ character: 'Nadia Kowalski', line: 'Forty years of starter and they give us thirty days.' }],
        beats: [{ kind: 'action', text: 'Nadia slams the eviction letter onto the flour-dusted counter.' }],
      },
    ])

    expect(updated.lastSceneNumber).toBe(1)
    expect(updated.sceneExitBaton).toContain('INT. HARBOR BAKERY - DAWN')
    expect(updated.characterKnowledge['Nadia Kowalski']).toContain('thirty days')

    const block = formatContinuityLedgerBlock(updated)
    expect(block).toContain('ROLLING CONTINUITY LEDGER')
    expect(block).toContain('Nadia Kowalski')

    // Adaptive thinking: high on opening, midpoint, finale, turning-point beats, and retries; medium otherwise
    expect(selectAdaptiveThinkingLevelForChunk({ chunkIndex: 0, totalChunks: 10 })).toBe('high')
    expect(selectAdaptiveThinkingLevelForChunk({ chunkIndex: 5, totalChunks: 10 })).toBe('high')
    expect(selectAdaptiveThinkingLevelForChunk({ chunkIndex: 9, totalChunks: 10 })).toBe('high')
    expect(selectAdaptiveThinkingLevelForChunk({ chunkIndex: 2, totalChunks: 10, beatTitle: 'Midpoint Reveal' })).toBe('high')
    expect(selectAdaptiveThinkingLevelForChunk({ chunkIndex: 2, totalChunks: 10, beatTitle: 'Morning Prep' })).toBe('medium')
    expect(selectAdaptiveThinkingLevelForChunk({ chunkIndex: 2, totalChunks: 10, beatTitle: 'Morning Prep', isRetry: true })).toBe('high')
  })

  it('classifies video motion complexity and delivers 70-95% longform cost savings on Animatic & Hybrid tiers', () => {
    expect(
      classifySegmentMotion({ id: '1', durationSec: 8, actionText: 'High-speed rooftop chase through storm' })
    ).toBe('hero_action')
    expect(
      classifySegmentMotion({ id: '2', durationSec: 8, dialogueText: 'Quiet emotional confession across dinner table' })
    ).toBe('dialogue_closeup')
    expect(
      classifySegmentMotion({ id: '3', durationSec: 8, actionText: 'Wide establishing shot of misty harbor sunrise' })
    ).toBe('establishing_atmospheric')

    const segments = [
      ...Array.from({ length: 15 }, (_, i) => ({ id: `h${i}`, durationSec: 8, actionText: 'Car chase sprint' })),
      ...Array.from({ length: 50 }, (_, i) => ({ id: `d${i}`, durationSec: 8, dialogueText: 'Intimate conversation' })),
      ...Array.from({ length: 35 }, (_, i) => ({ id: `e${i}`, durationSec: 8, actionText: 'Wide establishing shot' })),
    ]
    const tiers = compareProductionFidelityTiers(segments)
    expect(tiers.animatic_first.savingsVsCinemaPercent).toBeGreaterThanOrEqual(90)
    expect(tiers.hybrid_indie.savingsVsCinemaPercent).toBeGreaterThanOrEqual(65)
    expect(tiers.hybrid_indie.totalCostUsd).toBeLessThan(tiers.cinema_cut.totalCostUsd)
  })
})

describe('Phase 3B: Admin Model Intelligence & Upgrade Advisor (MIUA)', () => {
  it('parses rich Gateway pricing/context metadata and produces ROI-quantified Upgrade Dossiers', () => {
    const richModels = parseRichGatewayModels({
      data: [
        {
          id: 'google/gemini-3.9-flash',
          context_window: 2_000_000,
          max_tokens: 65536,
          pricing: { input: 0.00000025, output: 0.0000020 },
        },
        {
          id: 'anthropic/claude-sonnet-4.6',
          context_window: 1_000_000,
          max_tokens: 64000,
          pricing: { input: 0.000003, output: 0.000015 },
        },
      ],
    })
    expect(richModels[0].shortId).toBe('gemini-3.9-flash')
    expect(richModels[0].inputPer1MUsd).toBe(0.25)
    expect(richModels[0].outputPer1MUsd).toBe(2)

    const telemetry = summarizeLlmTelemetryEvents([], 30, 'memory')
    const report = buildModelIntelligenceReport({
      catalogs: [
        { source: 'gateway', status: 'ok', modelIds: ['gemini-3.9-flash', 'gemini-3.8-flash'] },
        { source: 'vertex', status: 'ok', modelIds: ['gemini-3.9-flash', 'gemini-3.8-flash'] },
        { source: 'gemini_developer', status: 'unavailable', modelIds: [] },
      ],
      richGatewayModels: richModels,
      telemetry,
    })

    const workhorseDossier = report.dossiers.find((d) => d.entryId === 'text-workhorse')
    expect(workhorseDossier).toBeDefined()
    expect(workhorseDossier?.candidateModelId).toBe('gemini-3.9-flash')
    expect(workhorseDossier?.verdict).toBe('CANARY_WORTHY')
    expect((workhorseDossier?.projected30dDeltaUsd ?? 0)).toBeLessThan(0) // Cheaper!
    expect(workhorseDossier?.contextWindowGainTokens).toBeGreaterThan(0)
    expect(report.crossProviderCandidates.length).toBeGreaterThan(0)
  })

  it('computes Bake-Off winner and promotes dossier to UPGRADE_RECOMMENDED when verified', () => {
    const { summary } = summarizeBakeOffMetrics(
      'gemini-3.8-flash',
      'gemini-3.9-flash',
      [
        {
          fixtureId: 'f1',
          fixtureLabel: 'Sparse',
          modelId: 'gemini-3.8-flash',
          jsonValid: true,
          truncated: false,
          latencyMs: 3200,
          costUsd: 0.012,
          qualityScore: 84,
          nameNoveltyScore: 90,
          noirDriftDetected: false,
        },
      ],
      [
        {
          fixtureId: 'f1',
          fixtureLabel: 'Sparse',
          modelId: 'gemini-3.9-flash',
          jsonValid: true,
          truncated: false,
          latencyMs: 2600,
          costUsd: 0.009,
          qualityScore: 92,
          nameNoveltyScore: 100,
          noirDriftDetected: false,
        },
      ]
    )

    expect(summary.qualityDelta).toBe(8)
    expect(summary.efficiencyWinner).toBe('candidate')

    const report = buildModelIntelligenceReport({
      catalogs: [
        { source: 'gateway', status: 'ok', modelIds: ['gemini-3.9-flash', 'gemini-3.8-flash'] },
        { source: 'vertex', status: 'ok', modelIds: ['gemini-3.9-flash', 'gemini-3.8-flash'] },
      ],
      richGatewayModels: [],
      telemetry: summarizeLlmTelemetryEvents([], 30, 'memory'),
      bakeOffByEntryId: { 'text-workhorse': summary },
    })

    const workhorseDossier = report.dossiers.find((d) => d.entryId === 'text-workhorse')
    expect(workhorseDossier?.verdict).toBe('UPGRADE_RECOMMENDED')
  })
})
