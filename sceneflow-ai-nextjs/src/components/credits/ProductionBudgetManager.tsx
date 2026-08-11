'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlertTriangle,
  Brain,
  Calculator,
  Check,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Key,
  Lightbulb,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react'
import {
  applyMethodDefaults,
  buildProductionBudgetParams,
  DEFAULT_PRODUCTION_METHOD,
  DEFAULT_FRAME_ITERATIONS,
  DEFAULT_VIDEO_ITERATIONS,
  estimateProductionBudget,
  getFrameUnitCost,
  getVideoUnitCost,
  parseCreditsBudgetParamsV2,
  PRODUCTION_METHODS,
  readProjectBudgetScope,
  type FrameQuality,
  type ProductionMethodId,
  type SuggestionId,
  type VideoQuality,
} from '@/lib/credits/productionBudgetManager'
import { getProjectCreditsBudget } from '@/lib/credits/projectBudgetShared'

export interface ProductionBudgetManagerProps {
  projectId?: string
  projectTitle?: string
  script?: unknown
  metadata?: Record<string, unknown> | null
  /** Live Production Studio scene map (preferred for frames/videos actuals). */
  sceneProductionData?: Record<string, unknown> | null
  currentBalance?: number
  initialByokExcludeMedia?: boolean
  hasByokKeys?: boolean
  onSetBudget?: (
    credits: number,
    budgetParams?: Record<string, unknown>
  ) => void | Promise<void>
}

const METHOD_ORDER: ProductionMethodId[] = [
  'animatic_first',
  'draft_production',
  'final_delivery',
  'express_sprint',
]

function formatCredits(n: number): string {
  return Math.round(n).toLocaleString()
}

function MethodIcon({ id }: { id: ProductionMethodId }) {
  switch (id) {
    case 'animatic_first':
      return <Clapperboard className="w-4 h-4" />
    case 'draft_production':
      return <Film className="w-4 h-4" />
    case 'final_delivery':
      return <Sparkles className="w-4 h-4" />
    case 'express_sprint':
      return <Zap className="w-4 h-4" />
    default:
      return <Calculator className="w-4 h-4" />
  }
}

export function ProductionBudgetManager({
  projectId,
  projectTitle,
  script,
  metadata,
  sceneProductionData,
  currentBalance = 0,
  initialByokExcludeMedia = false,
  hasByokKeys = false,
  onSetBudget,
}: ProductionBudgetManagerProps) {
  const t = useTranslations('production.budgetManager')

  const scope = useMemo(
    () =>
      readProjectBudgetScope({
        script,
        metadata: metadata ?? null,
        productionScenes: sceneProductionData ?? null,
      }),
    [script, metadata, sceneProductionData]
  )

  const saved = useMemo(
    () => parseCreditsBudgetParamsV2(metadata?.creditsBudgetParams),
    [metadata?.creditsBudgetParams]
  )

  const creditsBudget = useMemo(
    () => getProjectCreditsBudget(metadata ?? null),
    [metadata]
  )

  const [method, setMethod] = useState<ProductionMethodId>(
    saved?.method ?? DEFAULT_PRODUCTION_METHOD
  )
  const [frameQuality, setFrameQuality] = useState<FrameQuality>(
    saved?.frameQuality ?? PRODUCTION_METHODS.animatic_first.frameQuality
  )
  const [videoQuality, setVideoQuality] = useState<VideoQuality>(
    saved?.videoQuality ?? PRODUCTION_METHODS.animatic_first.videoQuality
  )
  const [frameIterations, setFrameIterations] = useState(
    saved?.frameIterations ?? DEFAULT_FRAME_ITERATIONS
  )
  const [videoIterations, setVideoIterations] = useState(
    saved?.videoIterations ?? 0
  )
  const [topazEnabled, setTopazEnabled] = useState(
    saved?.topazEnabled ?? false
  )
  const [intelligenceEnabled, setIntelligenceEnabled] = useState(
    saved?.intelligenceEnabled ?? true
  )
  const [byokExcludeMedia, setByokExcludeMedia] = useState(
    Boolean(saved?.byokExcludeMedia ?? initialByokExcludeMedia)
  )
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setByokExcludeMedia(Boolean(saved?.byokExcludeMedia ?? initialByokExcludeMedia))
  }, [initialByokExcludeMedia, saved?.byokExcludeMedia])

  const applyMethod = useCallback((next: ProductionMethodId) => {
    const defaults = applyMethodDefaults(next)
    setMethod(next)
    setFrameQuality(defaults.frameQuality)
    setVideoQuality(defaults.videoQuality)
    setFrameIterations(defaults.frameIterations)
    setVideoIterations(defaults.videoIterations)
    setTopazEnabled(defaults.topazEnabled)
    setIntelligenceEnabled(defaults.intelligenceEnabled)
  }, [])

  const estimate = useMemo(
    () =>
      estimateProductionBudget({
        scenes: scope.scenes,
        beats: scope.beats,
        segmentDurationSec: scope.segmentDurationSec,
        method,
        frameQuality,
        videoQuality,
        frameIterations,
        videoIterations: videoQuality === 'none' ? 0 : videoIterations,
        topazEnabled,
        intelligenceEnabled,
        byokExcludeMedia,
        creditsUsed: scope.creditsUsed,
        framesDone: scope.framesDone,
        videosDone: scope.videosDone,
        observedVideoTakesAvg: scope.observedVideoTakesAvg ?? undefined,
        creditsBudget,
        hasByokKeys: hasByokKeys || byokExcludeMedia,
      }),
    [
      scope,
      method,
      frameQuality,
      videoQuality,
      frameIterations,
      videoIterations,
      topazEnabled,
      intelligenceEnabled,
      byokExcludeMedia,
      creditsBudget,
      hasByokKeys,
    ]
  )

  const frameUnit = getFrameUnitCost(frameQuality)
  const videoUnit = getVideoUnitCost(videoQuality, scope.segmentDurationSec)

  const suggestionText = (id: SuggestionId): string => {
    switch (id) {
      case 'use_animatic_first':
        return t('suggestions.useAnimaticFirst')
      case 'stay_on_draft':
        return t('suggestions.stayOnDraft')
      case 'lower_frame_iterations':
        return t('suggestions.lowerFrameIterations')
      case 'lower_video_iterations':
        return t('suggestions.lowerVideoIterations')
      case 'disable_topaz':
        return t('suggestions.disableTopaz')
      case 'enable_byok':
        return t('suggestions.enableByok')
      default:
        return id
    }
  }

  const handleSetBudget = async () => {
    if (!onSetBudget) return
    setIsSaving(true)
    try {
      const params = buildProductionBudgetParams({
        method,
        frameQuality,
        videoQuality,
        frameIterations,
        videoIterations: videoQuality === 'none' ? 0 : videoIterations,
        topazEnabled,
        intelligenceEnabled,
        byokExcludeMedia,
        segmentDurationSec: scope.segmentDurationSec,
      })
      await onSetBudget(estimate.plannedTotal, params)
    } finally {
      setIsSaving(false)
    }
  }

  const remainingToBudget = Math.max(0, estimate.plannedTotal - currentBalance)

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden max-w-4xl mx-auto">
      <div className="p-6 border-b border-slate-700/50 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('title')}</h2>
            <p className="text-sm text-gray-400">
              {projectTitle ? t('subtitleWithTitle', { title: projectTitle }) : t('subtitle')}
            </p>
          </div>
        </div>
        {currentBalance > 0 && (
          <div className="text-right shrink-0">
            <div className="text-sm text-gray-400">{t('currentBalance')}</div>
            <div className="text-lg font-bold text-cyan-400">
              {t('creditsCount', { count: formatCredits(currentBalance) })}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Hero summary: Charged / To complete / Forecast dominate first scan */}
        <div
          className={`p-5 rounded-2xl border ${
            estimate.creditsUsed > 0 && estimate.variance > 0
              ? 'bg-gradient-to-br from-slate-800/90 to-amber-950/30 border-amber-500/25'
              : 'bg-gradient-to-br from-slate-800/90 to-cyan-950/40 border-cyan-500/20'
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-4 text-center">
            <div>
              <div className="text-xs uppercase tracking-wide text-cyan-400/80 mb-1">
                {t('charged')}
              </div>
              <div className="text-3xl font-semibold tabular-nums text-cyan-300">
                {formatCredits(estimate.creditsUsed)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-amber-300/80 mb-1">
                {t('costToComplete')}
              </div>
              <div className="text-3xl font-semibold tabular-nums text-white">
                {formatCredits(estimate.costToComplete)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-white/70 mb-1">
                {t('forecast')}
              </div>
              <div className="text-4xl font-bold tabular-nums text-white tracking-tight">
                {formatCredits(estimate.forecastTotal)}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-300">
            <span>
              {t('progressFrames', {
                done: scope.framesDone,
                total: scope.beats,
              })}
            </span>
            <span className="text-slate-600 hidden sm:inline" aria-hidden>
              ·
            </span>
            <span>
              {t('progressVideos', {
                done: scope.videosDone,
                total: scope.beats,
              })}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              {t('required')}: {formatCredits(estimate.plannedTotal)}
            </span>
            {currentBalance > 0 && (
              <span>
                {t('currentBalance')}: {formatCredits(currentBalance)}
              </span>
            )}
          </div>

          {creditsBudget > 0 && (
            <div className="mt-3 text-xs text-gray-400 text-center">
              {estimate.variance > 0
                ? t('overBudget', { credits: formatCredits(estimate.variance) })
                : t('underBudget', {
                    credits: formatCredits(Math.abs(estimate.variance)),
                  })}
            </div>
          )}
          {remainingToBudget > 0 && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('needCredits', { credits: formatCredits(remainingToBudget) })}
            </div>
          )}
        </div>

        <label
          className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${
            byokExcludeMedia
              ? 'bg-amber-500/10 border-amber-500/40'
              : 'bg-slate-800/50 border-slate-700/50'
          }`}
        >
          <input
            type="checkbox"
            checked={byokExcludeMedia}
            onChange={(e) => setByokExcludeMedia(e.target.checked)}
            className="mt-1 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
          />
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Key className="w-4 h-4 text-amber-400" />
              {t('byokTitle')}
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('byokDescription')}</p>
          </div>
        </label>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
          <span>
            {t('scenes')}: <span className="text-gray-300">{scope.scenes}</span>
          </span>
          <span>
            {t('beats')}: <span className="text-gray-300">{scope.beats}</span>
          </span>
          <span>
            {t('clipDuration')}:{' '}
            <span className="text-gray-300">
              {t('seconds', { count: scope.segmentDurationSec })}
            </span>
          </span>
        </div>
        <p className="text-xs text-gray-500 -mt-4">{t('scopeFixedHint')}</p>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">{t('methodsTitle')}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {METHOD_ORDER.map((id) => {
              const selected = method === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyMethod(id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selected
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-gray-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 font-medium">
                    <MethodIcon id={id} />
                    {t(`methods.${id}.name`)}
                    {id === 'animatic_first' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        {t('recommended')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{t(`methods.${id}.hint`)}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {t('frameResolution')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['draft', 'final'] as FrameQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setFrameQuality(q)}
                  className={`p-3 rounded-lg border text-sm ${
                    frameQuality === q
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-gray-300'
                  }`}
                >
                  {t(`quality.${q}`)}
                  <div className="text-xs text-cyan-400/80 mt-1">
                    {t('creditsPerFrame', { credits: getFrameUnitCost(q) })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300 flex items-center gap-2">
              <Video className="w-4 h-4" />
              {t('videoResolution')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['none', 'draft', 'final'] as VideoQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setVideoQuality(q)
                    if (q === 'none') setVideoIterations(0)
                    else if (videoIterations <= 0) setVideoIterations(DEFAULT_VIDEO_ITERATIONS)
                  }}
                  className={`p-3 rounded-lg border text-sm ${
                    videoQuality === q
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-gray-300'
                  }`}
                >
                  {t(`quality.${q}`)}
                  <div className="text-xs text-cyan-400/80 mt-1">
                    {q === 'none'
                      ? t('creditsZero')
                      : t('creditsPerClip', {
                          credits: getVideoUnitCost(q, scope.segmentDurationSec),
                          seconds: scope.segmentDurationSec,
                        })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-2">{t('providerNote')}</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-300">{t('frameIterations')}</label>
              <span className="text-sm font-medium text-white">
                {frameIterations.toFixed(2)}×
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={frameIterations}
              onChange={(e) => setFrameIterations(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('frameIterationsHint', { rate: '80%' })}
            </p>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-300">{t('videoIterations')}</label>
              <span className="text-sm font-medium text-white">
                {videoQuality === 'none' ? '—' : `${videoIterations.toFixed(2)}×`}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              disabled={videoQuality === 'none'}
              value={videoQuality === 'none' ? 1 : videoIterations}
              onChange={(e) => setVideoIterations(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-40"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('videoIterationsHint', { rate: '90%' })}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
              topazEnabled
                ? 'bg-violet-500/10 border-violet-500/40'
                : 'bg-slate-800/50 border-slate-700/50'
            }`}
          >
            <input
              type="checkbox"
              checked={topazEnabled}
              onChange={(e) => setTopazEnabled(e.target.checked)}
              className="mt-1 rounded border-slate-600 bg-slate-800 text-cyan-500"
            />
            <div>
              <div className="text-sm font-medium text-white">{t('topazTitle')}</div>
              <p className="text-xs text-gray-400 mt-0.5">{t('topazDescription')}</p>
            </div>
          </label>
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
              intelligenceEnabled
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-slate-800/50 border-slate-700/50'
            }`}
          >
            <input
              type="checkbox"
              checked={intelligenceEnabled}
              onChange={(e) => setIntelligenceEnabled(e.target.checked)}
              className="mt-1 rounded border-slate-600 bg-slate-800 text-cyan-500"
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Brain className="w-4 h-4 text-emerald-400" />
                {t('intelligenceTitle')}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{t('intelligenceDescription')}</p>
            </div>
          </label>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">{t('breakdown')}</h3>
          <div className="space-y-2">
            {[
              {
                key: 'frames',
                icon: ImageIcon,
                label: t('lineFrames', {
                  quality: t(`quality.${frameQuality}`),
                  rate: frameUnit,
                }),
                line: estimate.frames,
              },
              {
                key: 'videos',
                icon: Video,
                label: t('lineVideos', {
                  quality: t(`quality.${videoQuality}`),
                  rate: videoUnit,
                  seconds: scope.segmentDurationSec,
                }),
                line: estimate.videos,
              },
              {
                key: 'topaz',
                icon: Sparkles,
                label: t('lineTopaz'),
                line: estimate.topaz,
              },
              {
                key: 'intelligence',
                icon: Brain,
                label: t('lineIntelligence'),
                line: estimate.intelligence,
              },
            ].map((row) => {
              const Icon = row.icon
              if (row.line.quantity <= 0 && row.line.credits <= 0 && row.key !== 'videos') {
                return null
              }
              return (
                <div
                  key={row.key}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    row.line.excluded
                      ? 'bg-amber-950/20 border border-amber-700/30'
                      : 'bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span className={row.line.excluded ? 'line-through text-gray-400' : ''}>
                      {row.label}
                    </span>
                    {row.line.excluded && (
                      <span className="text-[10px] text-amber-300">{t('excludedByok')}</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-white">
                    {formatCredits(row.line.credits)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {estimate.suggestions.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <Lightbulb className="w-4 h-4 text-amber-300" />
              {t('suggestionsTitle')}
            </div>
            <ul className="space-y-1.5">
              {estimate.suggestions.map((id) => (
                <li key={id} className="text-xs text-gray-400 flex gap-2">
                  <span className="text-amber-400/80">•</span>
                  {suggestionText(id)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {onSetBudget && (
          <button
            type="button"
            disabled={isSaving || !projectId || scope.beats === 0}
            onClick={handleSetBudget}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {isSaving
              ? t('saving')
              : t('setAsProjectBudget', {
                  credits: formatCredits(estimate.plannedTotal),
                })}
          </button>
        )}
        {scope.beats === 0 && (
          <p className="text-xs text-amber-300 text-center">{t('noBeatsYet')}</p>
        )}
      </div>
    </div>
  )
}

export default ProductionBudgetManager
