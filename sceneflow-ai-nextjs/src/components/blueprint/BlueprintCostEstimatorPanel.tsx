'use client'

import React, { useMemo, useState } from 'react'
import {
  Calculator,
  Check,
  ChevronDown,
  Clapperboard,
  Coins,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  Sparkles,
  Volume2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  estimateBlueprintProjectCost,
  type BlueprintProductionMode,
} from '@/lib/credits/blueprintCostEstimator'
import {
  ALTERNATIVE_ENGINES,
  SCENEFLOW_ENGINE_ID,
  SCENEFLOW_QUALITY_TIERS,
  type SceneFlowQualityTierId,
  type VideoEngineId,
} from '@/lib/credits/videoEnginePricing'
import { ClientQuoteMarginPanel } from '@/components/credits/ClientQuoteMarginPanel'
import { useLiveRateCard } from '@/hooks/useLiveRateCard'
import { cn } from '@/lib/utils'

interface BlueprintCostEstimatorPanelProps {
  projectId?: string
  treatment: Record<string, unknown> | null | undefined
  projectMetadata?: Record<string, unknown> | null
  onProjectMetadataPatched?: (patch: Record<string, unknown>) => void
}

export function BlueprintCostEstimatorPanel({
  projectId,
  treatment,
  projectMetadata,
  onProjectMetadataPatched,
}: BlueprintCostEstimatorPanelProps) {
  const { rateCard } = useLiveRateCard()

  const clientOrder = (projectMetadata?.clientOrder || null) as Record<
    string,
    unknown
  > | null
  const isClientProject = Boolean(clientOrder?.isClientProject)
  const savedParams = (projectMetadata?.creditsBudgetParams || {}) as Record<
    string,
    unknown
  >
  const savedBudget = Number(projectMetadata?.creditsBudget || 0)
  const sunkCredits = Number(projectMetadata?.creditsUsed || 0)
  const visionPhase = (projectMetadata?.visionPhase || null) as Record<
    string,
    unknown
  > | null

  const [productionMode, setProductionMode] = useState<BlueprintProductionMode>(
    () => {
      const m = savedParams.productionMode
      if (m === 'animatic_only' || m === 'hybrid' || m === 'full_ai_video') {
        return m
      }
      return isClientProject ? 'hybrid' : 'full_ai_video'
    }
  )
  const [engine, setEngine] = useState<VideoEngineId>(
    () => (savedParams.engine as VideoEngineId) || SCENEFLOW_ENGINE_ID
  )
  const [qualityTier, setQualityTier] = useState<SceneFlowQualityTierId>(
    () => (savedParams.qualityTier as SceneFlowQualityTierId) || 'cinematic'
  )
  const [hybridVideoShare, setHybridVideoShare] = useState<number | undefined>(
    () =>
      typeof savedParams.hybridVideoShare === 'number'
        ? savedParams.hybridVideoShare
        : undefined
  )
  const [retakeMultiplier, setRetakeMultiplier] = useState<number>(() =>
    typeof savedParams.retakeMultiplier === 'number'
      ? savedParams.retakeMultiplier
      : 1.2
  )
  const [includeBeatStills, setIncludeBeatStills] = useState<boolean>(true)
  const [includeShareAudio, setIncludeShareAudio] = useState<boolean>(true)
  const [byokExcludeMedia, setByokExcludeMedia] = useState<boolean>(() =>
    Boolean(savedParams.byokExcludeMedia)
  )
  const [targetBudgetInput, setTargetBudgetInput] = useState<string>(() =>
    savedBudget > 0 ? String(savedBudget) : ''
  )
  const [chaptersOpen, setChaptersOpen] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)

  const targetBudgetCredits = useMemo(() => {
    const n = Number(targetBudgetInput)
    return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
  }, [targetBudgetInput])

  const estimate = useMemo(
    () =>
      estimateBlueprintProjectCost({
        treatment,
        visionPhase,
        sunkCreditsUsed: sunkCredits,
        rateCard,
        options: {
          productionMode,
          engine,
          qualityTier,
          hybridVideoShare,
          retakeMultiplier,
          includeBeatStoryboardStills: includeBeatStills,
          includeShareAudio,
          byokExcludeMedia,
          targetBudgetCredits,
        },
      }),
    [
      treatment,
      visionPhase,
      sunkCredits,
      rateCard,
      productionMode,
      engine,
      qualityTier,
      hybridVideoShare,
      retakeMultiplier,
      includeBeatStills,
      includeShareAudio,
      byokExcludeMedia,
      targetBudgetCredits,
    ]
  )

  const handleSaveProjectBudget = async (
    overrideBudgetCredits?: number,
    extraMeta?: Record<string, unknown>
  ) => {
    if (!projectId || projectId.startsWith('new-project')) {
      toast.error('Save the Blueprint project before locking a budget')
      return
    }

    const finalCredits = Math.round(
      overrideBudgetCredits ??
        targetBudgetCredits ??
        estimate.totalEstimatedCredits
    )
    setSaving(true)
    try {
      const clientOrderPatch =
        extraMeta?.clientOrder && typeof extraMeta.clientOrder === 'object'
          ? (extraMeta.clientOrder as Record<string, unknown>)
          : undefined

      const mergedClientOrder = clientOrderPatch
        ? {
            ...(clientOrder || {}),
            ...clientOrderPatch,
          }
        : undefined

      const patchMeta: Record<string, unknown> = {
        creditsBudget: finalCredits,
        creditsBudgetParams: estimate.creditsBudgetParams,
        ...(mergedClientOrder ? { clientOrder: mergedClientOrder } : {}),
      }

      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditsBudget: finalCredits,
          creditsBudgetParams: estimate.creditsBudgetParams,
          ...(clientOrderPatch ? { clientOrderPatch } : {}),
        }),
      })
      if (!res.ok) {
        throw new Error('Failed to save project budget')
      }
      setTargetBudgetInput(String(finalCredits))
      onProjectMetadataPatched?.(patchMeta)
      toast.success(
        `Project budget locked at ${finalCredits.toLocaleString()} credits ($${(
          finalCredits / 100
        ).toFixed(2)})`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save budget')
    } finally {
      setSaving(false)
    }
  }

  if (!treatment) {
    return (
      <div className="p-6 text-center text-sm text-gray-400">
        Generate or load a Blueprint to estimate Production chapter costs and margins.
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 text-gray-100">
      {/* Header Summary Card */}
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <Calculator className="w-3.5 h-3.5" />
              Blueprint Cost & Scope Estimator
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              1 Blueprint Beat = 1 Production Chapter • {estimate.summary.chapterCount}{' '}
              {estimate.summary.chapterCount === 1 ? 'chapter' : 'chapters'} • ~
              {estimate.summary.totalMinutes} min
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white">
              {estimate.totalEstimatedCredits.toLocaleString()}{' '}
              <span className="text-xs font-medium text-cyan-300">cr</span>
            </div>
            <div className="text-xs text-emerald-300 font-medium">
              ~${estimate.totalEstimatedUsd.toFixed(2)} est. cost
            </div>
          </div>
        </div>

        {/* Scope Pills */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-950/70 border border-slate-800 px-2 py-1.5">
            <div className="text-[10px] text-gray-500">Scenes</div>
            <div className="font-semibold text-white">
              {estimate.summary.totalScenes}
            </div>
          </div>
          <div className="rounded-lg bg-slate-950/70 border border-slate-800 px-2 py-1.5">
            <div className="text-[10px] text-gray-500">8s Shots</div>
            <div className="font-semibold text-white">
              {estimate.summary.totalShots}
            </div>
          </div>
          <div className="rounded-lg bg-slate-950/70 border border-slate-800 px-2 py-1.5">
            <div className="text-[10px] text-gray-500">AI Video / Stills</div>
            <div className="font-semibold text-white">
              {estimate.summary.aiVideoShots} / {estimate.summary.archivalShots}
            </div>
          </div>
        </div>

        {/* Creator Target Budget Bar */}
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <label className="text-gray-300 font-medium flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              Target Credit Budget
            </label>
            <input
              type="number"
              min={0}
              step={50}
              placeholder={`e.g. ${estimate.totalEstimatedCredits}`}
              value={targetBudgetInput}
              onChange={(e) => setTargetBudgetInput(e.target.value)}
              className="w-28 rounded-md bg-slate-950 border border-slate-700 px-2 py-1 text-right text-xs text-white"
            />
          </div>
          {estimate.budgetVariance && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    estimate.budgetVariance.withinBudget
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  )}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(5, estimate.budgetVariance.utilizationPercent)
                    )}%`,
                  }}
                />
              </div>
              <div
                className={cn(
                  'text-[11px] font-medium flex justify-between',
                  estimate.budgetVariance.withinBudget
                    ? 'text-emerald-300'
                    : 'text-rose-300'
                )}
              >
                <span>
                  {estimate.budgetVariance.withinBudget
                    ? `${estimate.budgetVariance.deltaCredits.toLocaleString()} cr under target`
                    : `${Math.abs(
                        estimate.budgetVariance.deltaCredits
                      ).toLocaleString()} cr over target`}
                </span>
                <span>{estimate.budgetVariance.utilizationPercent}%</span>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleSaveProjectBudget()}
          disabled={saving || !projectId || projectId.startsWith('new-project')}
          className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Lock Budget for Production (
          {(targetBudgetCredits ?? estimate.totalEstimatedCredits).toLocaleString()}{' '}
          cr)
        </button>
      </div>

      {/* Service Provider Quote & Margin Planner (Top priority for Client Orders, collapsible for all users) */}
      <ClientQuoteMarginPanel
        baseProjectCredits={estimate.totalEstimatedCredits}
        hybridVideoShare={estimate.options.hybridVideoShare}
        initialClientPriceUsd={
          typeof clientOrder?.clientPriceUsd === 'number'
            ? clientOrder.clientPriceUsd
            : 300
        }
        initialIncludedRounds={
          typeof clientOrder?.maxFeedbackRounds === 'number'
            ? clientOrder.maxFeedbackRounds
            : 2
        }
        defaultOpen={isClientProject}
        onApplyPresetParams={(params) => {
          const share = params.video.hybridVideoShare ?? 0.5
          setProductionMode(share <= 0 ? 'animatic_only' : share >= 1 ? 'full_ai_video' : 'hybrid')
          setHybridVideoShare(share)
          if (params.video.engine) setEngine(params.video.engine)
          if (params.video.qualityTier) setQualityTier(params.video.qualityTier)
        }}
        onChangeHybridVideoShare={(share) => {
          setProductionMode(share <= 0 ? 'animatic_only' : share >= 1 ? 'full_ai_video' : 'hybrid')
          setHybridVideoShare(share)
        }}
        onApplyCreditCeiling={(ceilingCredits, clientOrderMeta) => {
          void handleSaveProjectBudget(ceilingCredits, clientOrderMeta)
        }}
      />

      {/* Production Scope & Quality Knobs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-3">
        <div className="text-xs font-semibold text-gray-200">
          Production Delivery Method
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: 'animatic_only', label: 'Animatic Only' },
              { id: 'hybrid', label: 'Hybrid Mix' },
              { id: 'full_ai_video', label: 'Full AI Video' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setProductionMode(mode.id)
                if (mode.id === 'hybrid' && hybridVideoShare === undefined) {
                  setHybridVideoShare(estimate.summary.derivedHybridShareFromBeats)
                }
              }}
              className={cn(
                'rounded-lg px-2 py-1.5 text-[11px] font-medium border transition',
                productionMode === mode.id
                  ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-slate-800 bg-slate-950/60 text-gray-400 hover:text-gray-200'
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {productionMode !== 'animatic_only' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Video Engine
              </label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as VideoEngineId)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-white"
              >
                <option value={SCENEFLOW_ENGINE_ID}>SceneFlow Omni (Kling)</option>
                {ALTERNATIVE_ENGINES.map((alt) => (
                  <option key={alt.id} value={alt.id}>
                    {alt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Quality / Retakes
              </label>
              <div className="flex gap-1.5">
                {engine === SCENEFLOW_ENGINE_ID && (
                  <select
                    value={qualityTier}
                    onChange={(e) =>
                      setQualityTier(e.target.value as SceneFlowQualityTierId)
                    }
                    className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-white"
                  >
                    {SCENEFLOW_QUALITY_TIERS.map((qt) => (
                      <option key={qt.id} value={qt.id}>
                        {qt.label}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={String(retakeMultiplier)}
                  onChange={(e) => setRetakeMultiplier(Number(e.target.value))}
                  className="w-20 rounded-lg bg-slate-950 border border-slate-700 px-1.5 py-1.5 text-xs text-white"
                  title="Retake Buffer"
                >
                  <option value="1">1.0x</option>
                  <option value="1.2">1.2x</option>
                  <option value="1.5">1.5x</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1.5 pt-1 text-xs">
          <label className="flex items-center justify-between cursor-pointer text-gray-300">
            <span>Storyboard beat illustrations (Share Link)</span>
            <input
              type="checkbox"
              checked={includeBeatStills}
              onChange={(e) => setIncludeBeatStills(e.target.checked)}
              className="rounded border-slate-600"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer text-gray-300">
            <span>Narrated Blueprint share audio</span>
            <input
              type="checkbox"
              checked={includeShareAudio}
              onChange={(e) => setIncludeShareAudio(e.target.checked)}
              className="rounded border-slate-600"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer text-gray-300">
            <span>BYOK media credentials (20% platform fee)</span>
            <input
              type="checkbox"
              checked={byokExcludeMedia}
              onChange={(e) => setByokExcludeMedia(e.target.checked)}
              className="rounded border-slate-600"
            />
          </label>
        </div>
      </div>

      {/* Cost Category Breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2 text-xs">
        <div className="font-semibold text-gray-200 mb-1">
          Lifecycle Credit Breakdown
        </div>
        <div className="flex items-center justify-between text-gray-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Blueprint, Scripting & Share Assets
          </span>
          <span>
            {(
              estimate.categories.sunkBlueprintCredits +
              estimate.categories.intelligenceAndScriptCredits
            ).toLocaleString()}{' '}
            cr
          </span>
        </div>
        <div className="flex items-center justify-between text-gray-300">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            Continuity Refs ({estimate.summary.ungeneratedReferences.total} ungenerated)
          </span>
          <span>
            {estimate.categories.continuityReferenceCredits.toLocaleString()} cr
          </span>
        </div>
        <div className="flex items-center justify-between text-gray-300">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
            Shot Keyframes & Animatic Stills
          </span>
          <span>
            {estimate.categories.keyframeStillCredits.toLocaleString()} cr
          </span>
        </div>
        <div className="flex items-center justify-between text-gray-300">
          <span className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            AI Video Clips ({estimate.summary.clipLabel})
          </span>
          <span>
            {estimate.categories.videoGenerationCredits.toLocaleString()} cr
          </span>
        </div>
        <div className="flex items-center justify-between text-gray-300">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            Dialogue TTS, Music, SFX & Cloud Render
          </span>
          <span>
            {estimate.categories.audioAndRenderCredits.toLocaleString()} cr
          </span>
        </div>
      </div>

      {/* 1:1 Beat -> Production Chapter Cost Breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
        <button
          type="button"
          onClick={() => setChaptersOpen((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-gray-200"
        >
          <span className="flex items-center gap-1.5">
            <Clapperboard className="w-3.5 h-3.5 text-cyan-400" />
            Per-Chapter Cost Breakdown ({estimate.chapters.length} Beats)
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform',
              chaptersOpen && 'rotate-180'
            )}
          />
        </button>

        {chaptersOpen && (
          <div className="mt-3 space-y-2">
            {estimate.chapters.map((ch) => (
              <div
                key={ch.chapterNumber}
                className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">
                    Ch {ch.chapterNumber}. {ch.title}
                  </div>
                  <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-1.5">
                    <span>{ch.minutes}m</span>
                    <span>•</span>
                    <span>{ch.targetShots} shots</span>
                    <span>•</span>
                    <span
                      className={
                        ch.deliveryFormat === 'archival_photo'
                          ? 'text-amber-300'
                          : 'text-cyan-300'
                      }
                    >
                      {ch.deliveryFormat === 'archival_photo'
                        ? 'Archival Lead'
                        : 'AI Cinema'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-gray-100">
                    {ch.totalChapterCredits.toLocaleString()} cr
                  </div>
                  <div className="text-[10px] text-gray-500">
                    ${ch.totalChapterUsd.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
