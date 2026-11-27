'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Check,
  Copy,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

type UpgradeVerdict =
  | 'UPGRADE_RECOMMENDED'
  | 'CANARY_WORTHY'
  | 'COST_REGRESSION_HOLD'
  | 'QUALITY_REGRESSION_HOLD'
  | 'DEPRECATION_URGENT'
  | 'CURRENT'

interface ModelUpgradeDossier {
  entryId: string
  functionLabel: string
  symbol: string
  surface: string
  currentModelId: string
  candidateModelId: string | null
  verdict: UpgradeVerdict
  headline: string
  rationale: string
  script60mCurrent: {
    uncachedCostUsd: number
    cachedCostUsd: number
    tierRoutedCostUsd: number
    cacheSavingsPercent: number
  }
  script60mCandidate: {
    uncachedCostUsd: number
    cachedCostUsd: number
    tierRoutedCostUsd: number
    cacheSavingsPercent: number
  } | null
  projected30dCurrentUsd: number
  projected30dCandidateUsd: number | null
  projected30dDeltaUsd: number | null
  projected30dDeltaPercent: number | null
  prBrief: string | null
}

interface IntelligenceResponse {
  generatedAt: string
  aiGatewayInferenceEnabled: boolean
  telemetry: {
    periodDays: number
    source: 'database' | 'memory'
    totalCalls: number
    totalCostUsd: number
    avgLatencyMs: number
    downgradeRate: number
    truncationRate: number
    cacheHitRate: number
  }
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
  canaryOverrides: Array<{
    surface: string
    mode: string
    candidateModelId: string
    percent: number
  }>
  longformVideoFidelityComparison: {
    animatic_first: { label: string; totalCostUsd: number; savingsVsCinemaPercent: number }
    hybrid_indie: { label: string; totalCostUsd: number; savingsVsCinemaPercent: number }
    cinema_cut: { label: string; totalCostUsd: number; savingsVsCinemaPercent: number }
  }
}

interface BakeOffResponse {
  runAt: string
  baselineModelId: string
  candidateModelId: string
  fixturesEvaluated: number
  baselineCostUsd: number
  candidateCostUsd: number
  summary: {
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
}

interface ProbeResponse {
  checkedAt?: string
  defaultModel?: string
  results?: Array<{
    model: string
    ok: boolean
    status?: number
    latencyMs?: number
    error?: string
  }>
  recentDowngrades?: Array<{
    requestedModel: string
    resolvedModel: string
    reason: string
    at: string
  }>
}

const VERDICT_STYLE: Record<UpgradeVerdict, string> = {
  UPGRADE_RECOMMENDED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  CANARY_WORTHY: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  COST_REGRESSION_HOLD: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  QUALITY_REGRESSION_HOLD: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  DEPRECATION_URGENT: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  CURRENT: 'bg-gray-700/60 text-gray-300 border-gray-600/60',
}

export function ModelIntelligenceAdvisorCard() {
  const [data, setData] = useState<IntelligenceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [bakeOffLoading, setBakeOffLoading] = useState<string | null>(null)
  const [bakeOffResult, setBakeOffResult] = useState<BakeOffResponse | null>(null)

  const [probeLoading, setProbeLoading] = useState(false)
  const [probeData, setProbeData] = useState<ProbeResponse | null>(null)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [canaryBusy, setCanaryBusy] = useState<string | null>(null)

  const loadIntelligence = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/models/intelligence', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as IntelligenceResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model intelligence')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadIntelligence()
  }, [loadIntelligence])

  const runBakeOff = async (baselineModelId: string, candidateModelId: string) => {
    setBakeOffLoading(candidateModelId)
    setError(null)
    try {
      const res = await fetch('/api/admin/models/bake-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baselineModelId,
          candidateModelId,
          limit: 3,
        }),
      })
      if (!res.ok) throw new Error(`Bake-off failed (HTTP ${res.status})`)
      const json = (await res.json()) as BakeOffResponse
      setBakeOffResult(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bake-off failed')
    } finally {
      setBakeOffLoading(null)
    }
  }

  const runVertexProbe = async () => {
    setProbeLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/diagnostics/gemini-models', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Vertex probe failed (HTTP ${res.status})`)
      const json = (await res.json()) as ProbeResponse
      setProbeData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vertex probe failed')
    } finally {
      setProbeLoading(false)
    }
  }

  const toggleAdminCanary = async (surface: string, candidateModelId: string, enable: boolean) => {
    setCanaryBusy(candidateModelId)
    try {
      await fetch('/api/admin/models/canary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surface: surface === 'all_text' ? 'blueprint' : surface,
          mode: enable ? 'admin_only' : 'off',
          candidateModelId,
          percent: 0,
        }),
      })
      await loadIntelligence()
    } finally {
      setCanaryBusy(null)
    }
  }

  const copyPrBrief = async (entryId: string, brief: string) => {
    await navigator.clipboard.writeText(brief)
    setCopiedId(entryId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-gray-900/90 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            <Sparkles className="w-4 h-4" />
            <span>Model Intelligence &amp; Upgrade Advisor (MIUA)</span>
          </div>
          <h3 className="text-lg font-semibold text-white mt-1">
            Automated Model Research, Unit Economics &amp; Golden Bake-Offs
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Tracks real LLM COGS, projects 60-minute script economics, and benchmarks candidate upgrades side-by-side before bumping pins.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runVertexProbe()}
            disabled={probeLoading}
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            {probeLoading ? 'Probing Vertex…' : 'Probe Live Vertex Models'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void loadIntelligence()}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Intelligence
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Unit-Economics Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
              <div className="text-[11px] text-gray-400">30d LLM Calls</div>
              <div className="text-lg font-semibold text-white">
                {data.telemetry.totalCalls.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500">Source: {data.telemetry.source}</div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
              <div className="text-[11px] text-gray-400">30d LLM COGS</div>
              <div className="text-lg font-semibold text-emerald-300">
                ${data.telemetry.totalCostUsd.toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-500">Avg {data.telemetry.avgLatencyMs}ms</div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
              <div className="text-[11px] text-gray-400">Context Cache Hit</div>
              <div className="text-lg font-semibold text-cyan-300">
                {Math.round(data.telemetry.cacheHitRate * 100)}%
              </div>
              <div className="text-[10px] text-gray-500">Vertex explicit cache</div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
              <div className="text-[11px] text-gray-400">MAX_TOKENS Rate</div>
              <div className="text-lg font-semibold text-amber-300">
                {(data.telemetry.truncationRate * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-500">Auto-halved to 1 scene</div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
              <div className="text-[11px] text-gray-400">Silent Downgrades</div>
              <div className="text-lg font-semibold text-gray-100">
                {(data.telemetry.downgradeRate * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-500">
                Gateway Tier 1: {data.aiGatewayInferenceEnabled ? 'Ready' : 'Vertex fallback'}
              </div>
            </div>
          </div>

          {/* 60-Min Video Accessibility Ladder */}
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <TrendingDown className="w-4 h-4" />
              <span>60-Minute Longform Video Production Accessibility Ladder (3,600s Reference Feature)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {Object.entries(data.longformVideoFidelityComparison).map(([key, tier]) => (
                <div key={key} className="rounded-md border border-gray-800 bg-gray-900/70 p-3">
                  <div className="font-medium text-gray-200">{tier.label}</div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-base font-bold text-white">${tier.totalCostUsd.toFixed(0)}</span>
                    {tier.savingsVsCinemaPercent > 0 ? (
                      <span className="text-emerald-400 font-semibold">
                        Save {tier.savingsVsCinemaPercent}%
                      </span>
                    ) : (
                      <span className="text-gray-500">Baseline</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade Dossiers */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Active Model Upgrade Dossiers
            </div>
            <div className="space-y-2">
              {data.dossiers.slice(0, 8).map((dossier) => {
                const isCanaryActive = data.canaryOverrides.some(
                  (o) => o.candidateModelId === dossier.candidateModelId && o.mode !== 'off'
                )
                return (
                  <div
                    key={dossier.entryId}
                    className="rounded-lg border border-gray-800 bg-gray-950/70 p-4 flex flex-col gap-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${VERDICT_STYLE[dossier.verdict]}`}
                        >
                          {dossier.verdict.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-medium text-white">
                          {dossier.functionLabel}
                        </span>
                        <code className="text-xs text-cyan-300 bg-gray-900 px-1.5 py-0.5 rounded">
                          {dossier.currentModelId}
                        </code>
                        {dossier.candidateModelId && (
                          <span className="text-xs text-gray-400">
                            → <code className="text-emerald-300">{dossier.candidateModelId}</code>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dossier.candidateModelId && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void runBakeOff(dossier.currentModelId, dossier.candidateModelId!)
                              }
                              disabled={bakeOffLoading === dossier.candidateModelId}
                            >
                              <FlaskConical className="w-3.5 h-3.5 mr-1" />
                              {bakeOffLoading === dossier.candidateModelId
                                ? 'Running Bake-Off…'
                                : 'Run Golden Bake-Off'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void toggleAdminCanary(
                                  dossier.surface,
                                  dossier.candidateModelId!,
                                  !isCanaryActive
                                )
                              }
                              disabled={canaryBusy === dossier.candidateModelId}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                              {isCanaryActive ? 'Disable Admin Canary' : 'Enable Admin Canary'}
                            </Button>
                          </>
                        )}
                        {dossier.prBrief && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void copyPrBrief(dossier.entryId, dossier.prBrief!)}
                          >
                            {copiedId === dossier.entryId ? (
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 mr-1" />
                            )}
                            {copiedId === dossier.entryId ? 'Copied PR Brief' : 'Copy PR Brief'}
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-300">{dossier.rationale}</p>

                    <div className="flex flex-wrap gap-4 text-[11px] text-gray-400">
                      <span>
                        60m Script (Uncached → Tier-Routed):{' '}
                        <strong className="text-gray-200">
                          ${dossier.script60mCurrent.uncachedCostUsd.toFixed(3)} → $
                          {dossier.script60mCurrent.tierRoutedCostUsd.toFixed(3)}
                        </strong>
                      </span>
                      {dossier.projected30dDeltaUsd !== null && (
                        <span>
                          Projected 30d COGS Delta:{' '}
                          <strong
                            className={
                              dossier.projected30dDeltaUsd <= 0
                                ? 'text-emerald-400'
                                : 'text-amber-300'
                            }
                          >
                            {dossier.projected30dDeltaUsd >= 0 ? '+' : ''}$
                            {dossier.projected30dDeltaUsd.toFixed(2)} (
                            {dossier.projected30dDeltaPercent ?? 0}%)
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cross-Provider Tiered Candidates */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Multi-Provider Tier Candidates (Vercel AI Gateway + Vertex)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {data.crossProviderCandidates.map((cand) => (
                <div
                  key={cand.modelId}
                  className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-cyan-300 font-semibold">{cand.modelId}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void runBakeOff('gemini-3.8-flash', cand.modelId)}
                      disabled={bakeOffLoading === cand.modelId}
                    >
                      <FlaskConical className="w-3 h-3 mr-1" />
                      {bakeOffLoading === cand.modelId ? 'Testing…' : 'Bake-Off vs Flash'}
                    </Button>
                  </div>
                  <div className="text-gray-200 font-medium">{cand.recommendedRole}</div>
                  <div className="text-[11px] text-gray-400">
                    ${cand.inputPer1MUsd}/1M in · ${cand.outputPer1MUsd}/1M out ·{' '}
                    {(cand.contextWindow / 1000).toFixed(0)}k ctx · 60m Script: $
                    {cand.script60mTierRoutedUsd.toFixed(3)}
                  </div>
                  <p className="text-[11px] text-gray-400">{cand.note}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Golden Bake-Off Results */}
      {bakeOffResult && (
        <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/20 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-emerald-300">
              Golden Bake-Off Scorecard ({bakeOffResult.fixturesEvaluated} fixtures) — Winner:{' '}
              <span className="uppercase">{bakeOffResult.summary.efficiencyWinner}</span>
            </div>
            <span className="text-[11px] text-gray-400">{bakeOffResult.runAt}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-gray-400">Quality Score</div>
              <div className="text-white font-semibold">
                {bakeOffResult.summary.baselineQualityScore} →{' '}
                {bakeOffResult.summary.candidateQualityScore} (
                {bakeOffResult.summary.qualityDelta >= 0 ? '+' : ''}
                {bakeOffResult.summary.qualityDelta})
              </div>
            </div>
            <div>
              <div className="text-gray-400">Name Novelty</div>
              <div className="text-white font-semibold">
                {bakeOffResult.summary.baselineNameNovelty} →{' '}
                {bakeOffResult.summary.candidateNameNovelty}
              </div>
            </div>
            <div>
              <div className="text-gray-400">JSON Reliability</div>
              <div className="text-white font-semibold">
                {bakeOffResult.summary.baselineJsonReliability}% →{' '}
                {bakeOffResult.summary.candidateJsonReliability}%
              </div>
            </div>
            <div>
              <div className="text-gray-400">Latency / Cost</div>
              <div className="text-white font-semibold">
                {bakeOffResult.summary.candidateAvgLatencyMs}ms · $
                {bakeOffResult.candidateCostUsd.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Vertex Gemini Diagnostic Probe Results */}
      {probeData && Array.isArray(probeData.results) && (
        <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-200">
            Live Vertex AI Gemini Availability Probe
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {probeData.results.map((r) => (
              <div
                key={r.model}
                className={`rounded border px-2.5 py-1.5 flex items-center justify-between ${
                  r.ok
                    ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-950/20 text-rose-200'
                }`}
              >
                <code className="truncate">{r.model}</code>
                <span>{r.ok ? `${r.latencyMs ?? 0}ms` : r.status || 'ERR'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
