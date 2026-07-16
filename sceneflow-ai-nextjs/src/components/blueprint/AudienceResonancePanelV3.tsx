'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Sparkles,
  RefreshCw,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { TargetAudienceSelector } from '@/components/audience/TargetAudienceSelector'
import { AUDIENCE_PRESETS } from '@/lib/constants/audience-presets'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  type AudienceDefinition,
  type AudienceTargetProfile,
  type BlueprintAudienceResonanceAnalysis,
  type BlueprintAudienceRecommendation,
  type PersistedBlueprintAudienceResonance,
  createAudienceDefinition,
  createPersistedBlueprintAR,
  audienceDefinitionFromIntent,
  READY_FOR_PRODUCTION_THRESHOLD_V3,
  type AudienceIntent,
  normalizeAudienceIntent,
  targetAudienceToPromptString,
  GENRE_OPTIONS,
} from '@/lib/types/audienceResonance'
import { BlueprintTtsControls } from './BlueprintTtsControls'
import type { OpenBlueprintRefineOptions } from '@/lib/blueprint/openBlueprintRefine'
import { blueprintCategoryToSection, scrollToBlueprintSection } from '@/lib/blueprint/blueprintProgress'
import { BLUEPRINT_COPY } from '@/lib/blueprint/blueprintGlossary'
import { buildBlueprintARNarrationText } from '@/lib/blueprint/arNarrationText'
import { resolveContentIntent, type ContentIntent } from '@/lib/content/contentIntent'
import {
  getScoreTextClassName,
  SCORE_READY_THRESHOLD,
} from '@/lib/product/scoreThresholds'

const ResonanceRadarChart = dynamic(
  () =>
    import('@/components/charts/ResonanceRadarChart').then((m) => ({
      default: m.ResonanceRadarChart,
    })),
  { ssr: false, loading: () => <div className="h-[180px]" /> }
)
import { ResonanceRadarLegend } from '@/components/charts/ResonanceRadarLegend'
import type { ResonanceAxis } from '@/lib/types/audienceResonance'

export interface AudienceResonancePanelV3Props {
  treatment?: Record<string, unknown>
  projectId?: string
  audienceDefinition?: AudienceDefinition | null
  savedBlueprintAR?: PersistedBlueprintAudienceResonance | null
  /** Legacy intent for migration */
  legacyIntent?: AudienceIntent | null
  contentIntent?: ContentIntent | null
  onTreatmentUpdate?: (updated: Record<string, unknown>) => void
  onProceedToScripting?: () => void
  onAudienceDefinitionSave?: (def: AudienceDefinition) => Promise<void>
  onAnalysisComplete?: (persisted: PersistedBlueprintAudienceResonance) => void
  onOpenBlueprintRefine?: (opts?: OpenBlueprintRefineOptions) => void
  onScrollToSection?: (section: string) => void
}

const V3_CATEGORY_AXIS_IDS: Record<string, ResonanceAxis['id']> = {
  'Audience Appeal': 'commercial-viability',
  'Genre & Tone Fit': 'genre-fidelity',
  'Concept Hook': 'originality',
  'Character Connection': 'character-depth',
  'Clarity & Structure': 'pacing',
}

const CATEGORY_SECTION_MAP: Record<string, string> = {
  'Audience Appeal': 'core',
  'Genre & Tone Fit': 'tone',
  'Concept Hook': 'story',
  'Character Connection': 'characters',
  'Clarity & Structure': 'beats',
}

function getBlueprintScoreTextClass(score: number): string {
  return getScoreTextClassName(score)
}

function getBlueprintScoreBarClass(score: number): string {
  if (score >= SCORE_READY_THRESHOLD) return 'bg-gradient-to-r from-emerald-500 to-green-400'
  if (score >= 60) return 'bg-gradient-to-r from-amber-500 to-yellow-400'
  return 'bg-gradient-to-r from-red-600 to-red-400'
}

function getBlueprintScoreBorderClass(score: number): string {
  if (score >= SCORE_READY_THRESHOLD) return 'border-emerald-500/35'
  if (score >= 60) return 'border-amber-500/35'
  return 'border-red-500/35'
}

function getBlueprintScoreLabel(score: number): string {
  if (score >= SCORE_READY_THRESHOLD) return 'Production ready'
  if (score >= 60) return 'Needs improvement'
  return 'Major gaps'
}

function categoriesToAxes(
  analysis: BlueprintAudienceResonanceAnalysis
): ResonanceAxis[] {
  const fallbackIds: ResonanceAxis['id'][] = [
    'commercial-viability',
    'genre-fidelity',
    'originality',
    'character-depth',
    'pacing',
  ]
  return analysis.categories.map((c, i) => ({
    id: V3_CATEGORY_AXIS_IDS[c.name] ?? fallbackIds[i % fallbackIds.length],
    label: c.name,
    description: '',
    score: c.score,
    weight: c.weight / 100,
  }))
}

export function AudienceResonancePanelV3({
  treatment: treatmentProp,
  projectId,
  audienceDefinition: savedDefProp,
  savedBlueprintAR,
  legacyIntent,
  contentIntent: contentIntentProp,
  onTreatmentUpdate,
  onProceedToScripting,
  onAudienceDefinitionSave,
  onAnalysisComplete,
  onOpenBlueprintRefine,
  onScrollToSection,
}: AudienceResonancePanelV3Props) {
  const [localTreatment, setLocalTreatment] = useState(treatmentProp)
  const treatment = localTreatment || treatmentProp

  const initialDef = useMemo(() => {
    if (savedDefProp) return savedDefProp
    if (savedBlueprintAR?.audienceDefinition) return savedBlueprintAR.audienceDefinition
    if (legacyIntent) return audienceDefinitionFromIntent(legacyIntent)
    return audienceDefinitionFromIntent()
  }, [savedDefProp, savedBlueprintAR, legacyIntent])

  const [audienceDefinition, setAudienceDefinition] =
    useState<AudienceDefinition>(initialDef)
  const [audienceDirty, setAudienceDirty] = useState(false)
  const [analysis, setAnalysis] = useState<BlueprintAudienceResonanceAnalysis | null>(
    savedBlueprintAR?.analysis ?? null
  )
  const [appliedIds, setAppliedIds] = useState<string[]>(
    savedBlueprintAR?.appliedRecommendationIds ?? []
  )
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSavingAudience, setIsSavingAudience] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scoreDelta, setScoreDelta] = useState<number | null>(null)
  const [audienceSetupExpanded, setAudienceSetupExpanded] = useState(false)

  useEffect(() => {
    setLocalTreatment(treatmentProp)
  }, [treatmentProp])

  useEffect(() => {
    if (savedBlueprintAR?.analysis) {
      setAnalysis(savedBlueprintAR.analysis)
      setAppliedIds(savedBlueprintAR.appliedRecommendationIds ?? [])
    }
  }, [savedBlueprintAR])

  const pendingRecs = useMemo(
    () =>
      (analysis?.recommendations ?? []).filter((r) => !appliedIds.includes(r.id)),
    [analysis, appliedIds]
  )

  const sortedRecs = useMemo(
    () => [...pendingRecs].sort((a, b) => b.pointsDeducted - a.pointsDeducted),
    [pendingRecs]
  )

  const pointsToReady = analysis
    ? Math.max(0, READY_FOR_PRODUCTION_THRESHOLD_V3 - analysis.overallScore)
    : 0

  const updateProfile = (field: keyof AudienceTargetProfile, value: string) => {
    setAudienceDefinition((prev) =>
      createAudienceDefinition({
        ...prev,
        profile: { ...prev.profile, [field]: value },
        presetId: undefined,
      })
    )
    setAudienceDirty(true)
  }

  const applyPreset = (presetId: string) => {
    const preset = AUDIENCE_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setAudienceDefinition(
      createAudienceDefinition({
        profile: preset.profile,
        presetId: preset.id,
        customDirection: audienceDefinition.customDirection,
        source: 'blueprint',
      })
    )
    setAudienceDirty(true)
  }

  const handleSaveAudience = async () => {
    setIsSavingAudience(true)
    try {
      const def = createAudienceDefinition({
        ...audienceDefinition,
        updatedAt: new Date().toISOString(),
        source: 'blueprint',
      })
      setAudienceDefinition(def)
      await onAudienceDefinitionSave?.(def)
      setAudienceDirty(false)
      toast.success('Target audience saved for this project')
    } catch (e) {
      toast.error('Failed to save audience')
    } finally {
      setIsSavingAudience(false)
    }
  }

  const runAnalysis = useCallback(async () => {
    if (!treatment) return
    if (audienceDirty) {
      toast.error('Save your target audience before analyzing')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    const prevScore = analysis?.overallScore ?? null

    try {
      const intent = legacyIntent || normalizeAudienceIntent()
      const contentIntent =
        contentIntentProp ?? resolveContentIntent(treatment.genre as string | undefined)
      const response = await fetch('/api/treatment/audience-resonance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          treatmentId: (treatment.id as string) || 'current',
          treatment: {
            title: treatment.label || treatment.title,
            logline: treatment.logline,
            synopsis: treatment.synopsis,
            genre: treatment.genre,
            tone_description: treatment.tone_description || treatment.tone,
            visual_style: treatment.visual_style,
            artStyle: treatment.artStyle,
            aspectRatio: treatment.aspectRatio,
            protagonist: treatment.protagonist,
            antagonist: treatment.antagonist,
            setting: treatment.setting,
            beats: treatment.beats,
            character_descriptions: treatment.character_descriptions,
          },
          audienceDefinition,
          genre: intent.primaryGenre,
          tone: intent.toneProfile,
          contentIntent,
          appliedRecommendationIds: appliedIds,
          iteration: (savedBlueprintAR?.iterationCount ?? 0) + 1,
          previousAnalysis: analysis
            ? {
                overallScore: analysis.overallScore,
                categories: analysis.categories,
              }
            : undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      if (data.success && data.analysis) {
        setAnalysis(data.analysis)
        if (prevScore !== null && data.analysis.overallScore !== prevScore) {
          setScoreDelta(data.analysis.overallScore - prevScore)
          setTimeout(() => setScoreDelta(null), 5000)
        }
        const persisted = createPersistedBlueprintAR(
          data.analysis,
          audienceDefinition,
          appliedIds,
          (savedBlueprintAR?.iterationCount ?? 0) + 1
        )
        onAnalysisComplete?.(persisted)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsAnalyzing(false)
    }
  }, [
    treatment,
    audienceDefinition,
    audienceDirty,
    analysis,
    appliedIds,
    legacyIntent,
    savedBlueprintAR,
    onAnalysisComplete,
    projectId,
  ])

  const handleResonanceRefineApply = (
    patch: Record<string, unknown>,
    appliedRecs: BlueprintAudienceRecommendation[]
  ) => {
    const updated = { ...treatment, ...patch, updatedAt: Date.now() }
    setLocalTreatment(updated)
    onTreatmentUpdate?.(updated)
    const newApplied = [...appliedIds, ...appliedRecs.map((r) => r.id)]
    setAppliedIds(newApplied)
    if (analysis) {
      const persisted = createPersistedBlueprintAR(
        analysis,
        audienceDefinition,
        newApplied,
        savedBlueprintAR?.iterationCount ?? 0
      )
      onAnalysisComplete?.(persisted)
    }
    toast.success('Blueprint updated — re-analyze to refresh your score')
  }

  const openEditor = (recs?: BlueprintAudienceRecommendation[]) => {
    const list = recs ?? pendingRecs
    if (list.length === 0) {
      toast.info('No pending recommendations')
      return
    }
    if (!onOpenBlueprintRefine) {
      toast.error('Blueprint editor is unavailable')
      return
    }
    onOpenBlueprintRefine({
      resonanceRecommendations: list,
      initialScope: list[0]?.fixSection || 'story',
      onApplyExtra: (patch) => handleResonanceRefineApply(patch, list),
    })
  }

  useEffect(() => {
    const onReanalyze = () => {
      if (audienceDirty) {
        toast.error('Save your target audience before re-analyzing')
        return
      }
      void runAnalysis()
    }
    window.addEventListener('sf:blueprint-reanalyze-ar', onReanalyze)
    return () => window.removeEventListener('sf:blueprint-reanalyze-ar', onReanalyze)
  }, [runAnalysis, audienceDirty])

  const arNarrationText = useCallback(
    () =>
      buildBlueprintARNarrationText({
        analysis,
        treatment,
        appliedRecommendationIds: appliedIds,
      }),
    [analysis, treatment, appliedIds]
  )

  const handleReset = () => {
    setAnalysis(null)
    setAppliedIds([])
    setScoreDelta(null)
    setError(null)
  }

  const radarAxes = analysis ? categoriesToAxes(analysis) : []

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-slate-800/60 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Audience Resonance Analysis
            </h2>
            <BlueprintTtsControls
              playId="ar-panel"
              getTextToSpeak={arNarrationText}
            />
          </div>

          <button
            type="button"
            onClick={() => setAudienceSetupExpanded((v) => !v)}
            className="w-full flex items-center gap-2 text-left group"
            aria-expanded={audienceSetupExpanded}
          >
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide flex-1">
              Target Audience
            </span>
            {audienceDirty && (
              <span className="text-[10px] text-amber-400 normal-case tracking-normal">
                Unsaved
              </span>
            )}
            <span className="text-[10px] text-gray-500 group-hover:text-gray-400 normal-case tracking-normal">
              {audienceSetupExpanded ? 'Hide' : 'Show'}
            </span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-gray-500 transition-transform shrink-0',
                audienceSetupExpanded && 'rotate-180'
              )}
            />
          </button>

          {!audienceSetupExpanded && (
            <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">
              {targetAudienceToPromptString(audienceDefinition.profile)}
              {audienceDefinition.customDirection
                ? ` · ${audienceDefinition.customDirection}`
                : ''}
            </p>
          )}

          {audienceSetupExpanded && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-wrap gap-1.5">
                {AUDIENCE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={cn(
                      'px-2 py-1 text-[10px] rounded-md border transition-colors',
                      audienceDefinition.presetId === p.id
                        ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                        : 'border-slate-700 text-gray-400 hover:border-slate-500'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <TargetAudienceSelector
                value={audienceDefinition.profile}
                onChange={updateProfile}
                variant="compact"
                showSummary
              />

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Analysis direction (optional)
                </label>
                <Textarea
                  value={audienceDefinition.customDirection || ''}
                  onChange={(e) => {
                    setAudienceDefinition((prev) =>
                      createAudienceDefinition({
                        ...prev,
                        customDirection: e.target.value,
                      })
                    )
                    setAudienceDirty(true)
                  }}
                  placeholder="e.g. Focus on emotional authenticity for a female-led YA audience..."
                  className="min-h-[60px] text-xs bg-slate-800/50 border-slate-600"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveAudience}
              disabled={isSavingAudience || !audienceDirty}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-600 text-gray-300 hover:bg-slate-800 disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              Save audience
            </button>
            <button
              type="button"
              onClick={runAnalysis}
              disabled={isAnalyzing || audienceDirty}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Analyze
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 mx-4 mt-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 space-y-4"
            >
              <div
                className={cn(
                  'rounded-xl border bg-slate-900/40 p-4 space-y-3',
                  getBlueprintScoreBorderClass(analysis.overallScore)
                )}
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className={cn(
                      'text-3xl font-bold tabular-nums',
                      getBlueprintScoreTextClass(analysis.overallScore)
                    )}
                  >
                    {analysis.overallScore}
                  </span>
                  <span className="text-sm text-gray-500">/ 100</span>
                  <span
                    className={cn(
                      'text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded',
                      analysis.overallScore >= READY_FOR_PRODUCTION_THRESHOLD_V3
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : analysis.overallScore >= 60
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/15 text-red-400'
                    )}
                  >
                    {getBlueprintScoreLabel(analysis.overallScore)}
                  </span>
                  {scoreDelta !== null && scoreDelta !== 0 && (
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        scoreDelta > 0 ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {scoreDelta > 0 ? '+' : ''}
                      {scoreDelta}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{analysis.summary}</p>
                {!analysis.isReadyForProduction && pointsToReady > 0 && (
                  <p className="text-[11px] text-cyan-400/90 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {pointsToReady} points to reach {READY_FOR_PRODUCTION_THRESHOLD_V3}+
                  </p>
                )}
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      getBlueprintScoreBarClass(analysis.overallScore)
                    )}
                    style={{
                      width: `${Math.min(100, analysis.overallScore)}%`,
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className="flex-1 px-3 py-2 text-xs bg-cyan-600/80 hover:bg-cyan-600 text-white rounded-lg disabled:opacity-50"
                  >
                    Re-analyze
                  </button>
                  {onProceedToScripting && (
                    <button
                      type="button"
                      onClick={onProceedToScripting}
                      className={cn(
                        'flex-1 px-3 py-2 text-xs text-white rounded-lg',
                        analysis.isReadyForProduction
                          ? 'bg-emerald-600'
                          : 'bg-slate-700 hover:bg-slate-600'
                      )}
                    >
                      {BLUEPRINT_COPY.startProduction}
                    </button>
                  )}
                  <button type="button" onClick={handleReset} className="p-2 text-gray-500 border border-slate-700 rounded-lg">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {analysis.deductions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Score breakdown (from 100)
                  </h4>
                  <ul className="space-y-1">
                    {analysis.deductions.map((d, i) => (
                      <li
                        key={i}
                        className="flex justify-between text-xs text-gray-300 bg-slate-800/40 rounded px-2 py-1.5 cursor-pointer hover:bg-slate-700/50"
                        onClick={() => {
                          const section = blueprintCategoryToSection(d.category || '')
                          scrollToBlueprintSection(section)
                          onScrollToSection?.(section)
                        }}
                        title="Jump to matching Blueprint section"
                      >
                        <span className="flex-1 pr-2">{d.reason}</span>
                        <span className="text-red-400 font-mono shrink-0">−{d.points}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sortedRecs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-amber-400/90 uppercase tracking-wide">
                      Recommendations
                    </h4>
                    <button
                      type="button"
                      onClick={() => openEditor()}
                      className="text-[10px] text-cyan-400 flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Open editor
                    </button>
                  </div>
                  {sortedRecs.slice(0, 5).map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-white font-medium">
                          {rec.title || rec.text.slice(0, 60)}
                        </span>
                        <span className="text-[10px] text-red-400/90 font-mono">
                          −{rec.pointsDeducted}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{rec.text}</p>
                      <button
                        type="button"
                        onClick={() => openEditor([rec])}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300"
                      >
                        Improve in editor →
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {analysis.strengths.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs text-emerald-500/80 uppercase tracking-wide">
                    Strengths
                  </h4>
                  {analysis.strengths.slice(0, 3).map((s, i) => (
                    <p key={i} className="text-xs text-gray-400 flex gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      {s}
                    </p>
                  ))}
                </div>
              )}

              <details className="rounded-xl border border-slate-700/30 bg-slate-800/20">
                <summary className="px-3 py-2 text-xs text-gray-400 cursor-pointer list-none flex justify-between">
                  Category scores
                  <ChevronDown className="w-4 h-4" />
                </summary>
                <div className="px-3 pb-3 space-y-2">
                  <ResonanceRadarChart axes={radarAxes} size="sm" />
                  <ResonanceRadarLegend axes={radarAxes} />
                  {analysis.categories.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        const section =
                          CATEGORY_SECTION_MAP[cat.name] ??
                          blueprintCategoryToSection(cat.name)
                        scrollToBlueprintSection(section)
                        onScrollToSection?.(section)
                      }}
                      className="w-full flex justify-between text-[11px] text-gray-400 hover:text-cyan-300 px-1 py-0.5 rounded hover:bg-slate-800/50"
                    >
                      <span>{cat.name}</span>
                      <span className="font-mono">{cat.score}</span>
                    </button>
                  ))}
                </div>
              </details>
            </motion.div>
          )}
        </AnimatePresence>

        {!analysis && !isAnalyzing && !error && (
          <div className="py-12 px-4 text-center text-sm text-gray-500">
            Save your target audience, then analyze how your blueprint resonates with that audience.
          </div>
        )}
      </div>

    </div>
  )
}

export default AudienceResonancePanelV3
