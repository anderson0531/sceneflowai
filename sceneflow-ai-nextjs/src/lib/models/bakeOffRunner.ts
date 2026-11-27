/**
 * Automated Golden-Fixture Side-by-Side Bake-Off Runner
 *
 * Compares a baseline pinned model against a candidate model across the
 * SceneFlow Golden Evaluation Suite, measuring:
 *  - JSON Parse Reliability & Truncation (MAX_TOKENS) Rate
 *  - Average Latency (ms)
 *  - Name Novelty / Anti-Cliché Score (`auditBlueprintCharacterNames`)
 *  - First-Take Readiness & Noir-Drift Freedom (`auditFirstTakeReadiness`)
 *  - Exact USD Cost & Value-per-Dollar Efficiency Winner
 */

import { generateWithTier } from '@/lib/llm/tierRouter'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { estimateLlmCostUsd } from '@/lib/credits/llmPricing'
import { auditFirstTakeReadiness } from '@/lib/treatment/showrunnerPipeline'
import {
  selectGoldenFixtures,
  type GoldenEvalFixture,
  type GoldenFixtureCategory,
} from './goldenEvalSuite'
import type { BakeOffScoreSummary } from './modelIntelligenceAdvisor'

export interface FixtureRunMetrics {
  fixtureId: string
  fixtureLabel: string
  modelId: string
  jsonValid: boolean
  truncated: boolean
  latencyMs: number
  costUsd: number
  qualityScore: number
  nameNoveltyScore: number
  noirDriftDetected: boolean
  sampleTitle?: string
  sampleLogline?: string
  sampleCast?: string[]
  error?: string
}

export interface BakeOffRunResult {
  runAt: string
  baselineModelId: string
  candidateModelId: string
  fixturesEvaluated: number
  summary: BakeOffScoreSummary
  baselineCostUsd: number
  candidateCostUsd: number
  perFixture: Array<{
    fixtureId: string
    fixtureLabel: string
    baseline: FixtureRunMetrics
    candidate: FixtureRunMetrics
  }>
}

function buildCompactEvalPrompt(fixture: GoldenEvalFixture): string {
  if (fixture.category === 'longform_script_chunk') {
    return `You are a professional screenplay writer.
TASK: ${fixture.input}
Genre: ${fixture.genre} | Tone: ${fixture.tone}
Return ONLY valid JSON:
{
  "scenes": [
    {
      "sceneNumber": 14,
      "heading": "INT./EXT. LOCATION - TIME",
      "movements": ["Movement 1", "Movement 2"],
      "beats": [
        {"kind": "action", "movementIndex": 0, "text": "Vivid visual action"},
        {"kind": "dialogue", "movementIndex": 1, "character": "Exact Character Name", "line": "Subtext-rich dialogue"}
      ]
    }
  ]
}`
  }

  return `You are a showrunner creating an original, production-ready Film Treatment Blueprint.
INPUT: ${fixture.input}
Genre: ${fixture.genre} | Tone: ${fixture.tone} | Target Audience: ${fixture.targetAudience} | Runtime: ~${fixture.targetMinutes}m
Preserve any user-supplied names verbatim; invent fresh, grounded, culturally authentic names for all new characters (never use overused defaults like Elena, Marcus, Maya, Vance, Thorne, Elara, Lyra, Kael).

Return ONLY valid JSON:
{
  "title": "Original title",
  "logline": "One vivid poster-ready sentence",
  "synopsis": "Concise 2-paragraph synopsis",
  "protagonist": "Protagonist summary",
  "antagonist": "Opposing force",
  "character_descriptions": [
    {
      "name": "Full Name",
      "role": "protagonist | antagonist | supporting",
      "age": "Exact age",
      "gender": "female | male | non-binary",
      "appearance": "2 vivid sentences of standing physical appearance",
      "defaultWardrobe": "Concrete primary outfit",
      "voiceFingerprint": "Distinct speech cadence and verbal tells"
    }
  ],
  "scene_descriptions": [
    { "name": "Specific Location 1", "type": "INT", "location": "Details", "atmosphere": "Mood" },
    { "name": "Specific Location 2", "type": "EXT", "location": "Details", "atmosphere": "Mood" }
  ],
  "beats": [
    { "title": "Beat 1", "intent": "Purpose", "synopsis": "Action and THEREFORE/BUT turn", "minutes": 5, "characters": ["Full Name"] }
  ]
}`
}

async function evaluateModelOnFixture(
  modelId: string,
  fixture: GoldenEvalFixture
): Promise<FixtureRunMetrics> {
  const start = Date.now()
  try {
    const res = await generateWithTier(buildCompactEvalPrompt(fixture), {
      tier: 'tier2_scene_writer',
      surface: 'eval_judge',
      explicitModelId: modelId,
      temperature: 0.65,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      thinkingLevel: 'medium',
      timeoutMs: 60_000,
      disableModelFallback: true,
    })

    const latencyMs = Date.now() - start
    const truncated = res.finishReason === 'MAX_TOKENS'
    const costUsd = estimateLlmCostUsd(modelId, res.usageMetadata)
    const parsed = safeParseJsonFromText(res.text) as Record<string, any> | null

    if (!parsed || typeof parsed !== 'object') {
      return {
        fixtureId: fixture.id,
        fixtureLabel: fixture.label,
        modelId,
        jsonValid: false,
        truncated,
        latencyMs,
        costUsd,
        qualityScore: 0,
        nameNoveltyScore: 0,
        noirDriftDetected: false,
        error: 'Invalid JSON output',
      }
    }

    if (fixture.category === 'longform_script_chunk') {
      const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : []
      const hasBeats = scenes.every((s: any) => Array.isArray(s?.beats) && s.beats.length >= 2)
      const qualityScore = Math.min(
        100,
        (scenes.length >= 2 ? 60 : scenes.length * 30) +
          (hasBeats ? 30 : 10) +
          (truncated ? 0 : 10)
      )
      return {
        fixtureId: fixture.id,
        fixtureLabel: fixture.label,
        modelId,
        jsonValid: true,
        truncated,
        latencyMs,
        costUsd,
        qualityScore,
        nameNoveltyScore: 100,
        noirDriftDetected: false,
        sampleTitle: scenes[0]?.heading,
      }
    }

    const readiness = auditFirstTakeReadiness(parsed, {
      userInput: fixture.input,
      requestedTone: fixture.tone,
      targetMinutes: 15, // Compact eval harness does not require 24 beats
    })
    const castNames = Array.isArray(parsed.character_descriptions)
      ? parsed.character_descriptions.map((c: any) => String(c?.name || '')).filter(Boolean)
      : []

    return {
      fixtureId: fixture.id,
      fixtureLabel: fixture.label,
      modelId,
      jsonValid: true,
      truncated,
      latencyMs,
      costUsd,
      qualityScore: readiness.score,
      nameNoveltyScore: readiness.nameEntropy.score,
      noirDriftDetected: readiness.noirDriftDetected,
      sampleTitle: typeof parsed.title === 'string' ? parsed.title : undefined,
      sampleLogline: typeof parsed.logline === 'string' ? parsed.logline : undefined,
      sampleCast: castNames,
    }
  } catch (err) {
    return {
      fixtureId: fixture.id,
      fixtureLabel: fixture.label,
      modelId,
      jsonValid: false,
      truncated: false,
      latencyMs: Date.now() - start,
      costUsd: 0,
      qualityScore: 0,
      nameNoveltyScore: 0,
      noirDriftDetected: false,
      error: err instanceof Error ? err.message : 'Evaluation call failed',
    }
  }
}

/**
 * Summarize two arrays of fixture metrics into a single BakeOffScoreSummary (pure helper for tests & runner).
 */
export function summarizeBakeOffMetrics(
  baselineModelId: string,
  candidateModelId: string,
  baselineRuns: FixtureRunMetrics[],
  candidateRuns: FixtureRunMetrics[]
): { summary: BakeOffScoreSummary; baselineCostUsd: number; candidateCostUsd: number } {
  const avg = (nums: number[]) =>
    nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0
  const sum = (nums: number[]) =>
    Number(nums.reduce((a, b) => a + b, 0).toFixed(6))

  const baselineQualityScore = avg(baselineRuns.map((r) => r.qualityScore))
  const candidateQualityScore = avg(candidateRuns.map((r) => r.qualityScore))
  const baselineNameNovelty = avg(baselineRuns.map((r) => r.nameNoveltyScore))
  const candidateNameNovelty = avg(candidateRuns.map((r) => r.nameNoveltyScore))
  const baselineJsonReliability = avg(baselineRuns.map((r) => (r.jsonValid ? 100 : 0)))
  const candidateJsonReliability = avg(candidateRuns.map((r) => (r.jsonValid ? 100 : 0)))
  const baselineAvgLatencyMs = avg(baselineRuns.map((r) => r.latencyMs))
  const candidateAvgLatencyMs = avg(candidateRuns.map((r) => r.latencyMs))
  const baselineCostUsd = sum(baselineRuns.map((r) => r.costUsd))
  const candidateCostUsd = sum(candidateRuns.map((r) => r.costUsd))

  const qualityDelta = candidateQualityScore - baselineQualityScore
  const baselineEfficiency = baselineQualityScore / Math.max(0.0001, baselineCostUsd)
  const candidateEfficiency = candidateQualityScore / Math.max(0.0001, candidateCostUsd)

  let efficiencyWinner: 'candidate' | 'baseline' | 'tie' = 'tie'
  if (candidateQualityScore >= baselineQualityScore - 2 && candidateEfficiency > baselineEfficiency * 1.05) {
    efficiencyWinner = 'candidate'
  } else if (qualityDelta >= 4) {
    efficiencyWinner = 'candidate'
  } else if (baselineQualityScore > candidateQualityScore + 2 || baselineEfficiency > candidateEfficiency * 1.05) {
    efficiencyWinner = 'baseline'
  }

  return {
    baselineCostUsd,
    candidateCostUsd,
    summary: {
      baselineModelId,
      candidateModelId,
      baselineQualityScore,
      candidateQualityScore,
      qualityDelta,
      baselineNameNovelty,
      candidateNameNovelty,
      baselineJsonReliability,
      candidateJsonReliability,
      baselineAvgLatencyMs,
      candidateAvgLatencyMs,
      efficiencyWinner,
    },
  }
}

/**
 * Execute a side-by-side Golden-Fixture Bake-Off comparing baseline vs candidate model.
 */
export async function runGoldenBakeOff(opts: {
  baselineModelId: string
  candidateModelId: string
  categories?: GoldenFixtureCategory[]
  limit?: number
}): Promise<BakeOffRunResult> {
  const fixtures = selectGoldenFixtures({
    categories: opts.categories,
    limit: opts.limit ?? 3,
  })

  const perFixture: BakeOffRunResult['perFixture'] = []
  for (const fixture of fixtures) {
    const [baseline, candidate] = await Promise.all([
      evaluateModelOnFixture(opts.baselineModelId, fixture),
      evaluateModelOnFixture(opts.candidateModelId, fixture),
    ])
    perFixture.push({
      fixtureId: fixture.id,
      fixtureLabel: fixture.label,
      baseline,
      candidate,
    })
  }

  const { summary, baselineCostUsd, candidateCostUsd } = summarizeBakeOffMetrics(
    opts.baselineModelId,
    opts.candidateModelId,
    perFixture.map((p) => p.baseline),
    perFixture.map((p) => p.candidate)
  )

  return {
    runAt: new Date().toISOString(),
    baselineModelId: opts.baselineModelId,
    candidateModelId: opts.candidateModelId,
    fixturesEvaluated: fixtures.length,
    summary,
    baselineCostUsd,
    candidateCostUsd,
    perFixture,
  }
}
