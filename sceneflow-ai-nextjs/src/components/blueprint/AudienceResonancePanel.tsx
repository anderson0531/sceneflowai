'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, 
  ChevronDown, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Film,
  Palette,
  Pencil,
} from 'lucide-react'
import { BlueprintResonanceEditDialog } from './BlueprintResonanceEditDialog'
import { toast } from 'sonner'
import { GreenlightScore } from './GreenlightScore'
import dynamic from 'next/dynamic'
const ResonanceRadarChart = dynamic(
  () => import('@/components/charts/ResonanceRadarChart').then((m) => ({ default: m.ResonanceRadarChart })),
  {
    ssr: false,
    loading: () => <div className="w-full" style={{ height: 250, minHeight: 250 }} />,
  }
)
import { ResonanceRadarLegend } from '@/components/charts/ResonanceRadarLegend'
import { WeightCustomizer } from './WeightCustomizer'
import {
  type AudienceIntent,
  type AudienceResonanceAnalysis,
  type ResonanceInsight,
  type PrimaryGenre,
  type ToneProfile,
  type CheckpointResults,
  type AppliedFix,
  type TargetScoreProfile,
  getTargetProfileForIntent,
  GENRE_OPTIONS,
  TONE_OPTIONS,
  DEFAULT_INTENT,
  formatTargetAudienceForPrompt,
  normalizeAudienceIntent,
} from '@/lib/types/audienceResonance'
import { cn } from '@/lib/utils'
import {
  TargetAudienceSelector,
  applyTargetAudienceChange,
} from '@/components/audience/TargetAudienceSelector'
import { 
  READY_FOR_PRODUCTION_THRESHOLD, 
  MAX_ITERATIONS,
  DEFAULT_SCORING_WEIGHTS,
  WEIGHT_PRESETS,
  AXIS_NARRATIVES,
  type WeightPresetKey 
} from '@/lib/treatment/scoringChecklist'
import { useResonanceStore, type ResonanceCacheEntry } from '@/store/useResonanceStore'
import { 
  calculateLocalScore, 
  createEmptyCheckpointResults,
  type CheckpointOverride 
} from '@/lib/treatment/localScoring'
import type { PersistedAudienceResonance } from '@/lib/types/audienceResonance'
import { createPersistedAR } from '@/lib/types/audienceResonance'
import {
  impactLabel,
  buildScoreImprovementPath,
} from '@/lib/treatment/resonanceScoring'

interface AudienceResonancePanelProps {
  treatment?: any
  onFixApplied?: (insightId: string, section: string, updatedTreatment?: any) => void
  onTreatmentUpdate?: (updatedTreatment: any) => void
  onProceedToScripting?: () => void // Called when user clicks "Proceed to Scripting"
  onAnalysisComplete?: (persistedAR: PersistedAudienceResonance) => void // Called when analysis completes, for database persistence
  savedAnalysis?: PersistedAudienceResonance | null // Pre-loaded analysis from database
}

/**
 * Audience Resonance Engine Panel
 * 
 * Strategic advisor that analyzes film treatments against target market,
 * genre conventions, and commercial viability.
 */
export function AudienceResonancePanel({ 
  treatment: treatmentProp, 
  onFixApplied, 
  onTreatmentUpdate, 
  onProceedToScripting,
  onAnalysisComplete,
  savedAnalysis
}: AudienceResonancePanelProps) {
  // Local treatment state - allows updates from fixes
  const [localTreatment, setLocalTreatment] = useState<any>(treatmentProp)
  const treatment = localTreatment || treatmentProp
  
  // Get treatment ID for cache key
  const treatmentId = useMemo(() => treatment?.id || 'current', [treatment?.id])
  
  // Zustand store for persistence
  const { getAnalysis, setAnalysis: setStoreAnalysis, clearAnalysis: clearStoreAnalysis } = useResonanceStore()
  const cachedState = getAnalysis(treatmentId)
  
  // Flag to prevent restore effect from re-initializing state after user reset
  const wasResetByUser = useRef(false)
  
  // State - initialized from cache if available
  const [intent, setIntentLocal] = useState<AudienceIntent>(() =>
    normalizeAudienceIntent(cachedState?.intent)
  )
  const [analysis, setAnalysisLocal] = useState<AudienceResonanceAnalysis | null>(
    cachedState?.analysis || null
  )
  const [isTargetAudienceOpen, setIsTargetAudienceOpen] = useState(false)
  const [isScoringAdvancedOpen, setIsScoringAdvancedOpen] = useState(false)
  const [showAllInsights, setShowAllInsights] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedInsights, setExpandedInsights] = useState<string[]>([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editFocusInsight, setEditFocusInsight] = useState<ResonanceInsight | null>(null)
  const [previousScore, setPreviousScoreLocal] = useState<number | null>(
    cachedState?.previousScore ?? null
  )
  const [scoreDelta, setScoreDelta] = useState<number | null>(null)
  const [appliedFixes, setAppliedFixesLocal] = useState<string[]>(
    cachedState?.appliedFixes || []
  )
  const [appliedFixDetails, setAppliedFixDetailsLocal] = useState<AppliedFix[]>(
    cachedState?.appliedFixDetails || []
  )
  
  // Iteration tracking for diminishing returns
  const [iterationCount, setIterationCountLocal] = useState(
    cachedState?.iterationCount || 0
  )
  const [isReadyForProduction, setIsReadyForProductionLocal] = useState(
    cachedState?.isReadyForProduction || false
  )
  const [pendingFixesCount, setPendingFixesCountLocal] = useState(
    cachedState?.pendingFixesCount || 0
  )
  
  // Local scoring state - NEW
  const [serverCheckpointResults, setServerCheckpointResultsLocal] = useState<CheckpointResults | null>(
    cachedState?.serverCheckpointResults || null
  )
  const [checkpointOverrides, setCheckpointOverridesLocal] = useState<CheckpointOverride[]>(
    cachedState?.checkpointOverrides || []
  )
  const [isScoreEstimated, setIsScoreEstimatedLocal] = useState(
    cachedState?.isScoreEstimated || false
  )
  
  // Intent lock and target profile - prevents auto-detection from overwriting user selections
  const [hasIntentLock, setHasIntentLockLocal] = useState(
    cachedState?.hasIntentLock || false
  )
  const [targetProfile, setTargetProfileLocal] = useState<TargetScoreProfile | null>(
    cachedState?.targetProfile || null
  )
  
  // Custom scoring weights
  const [customWeights, setCustomWeightsLocal] = useState<Record<string, number>>(
    cachedState?.customWeights || { ...DEFAULT_SCORING_WEIGHTS }
  )
  const [weightPreset, setWeightPresetLocal] = useState<WeightPresetKey | 'custom' | null>(
    cachedState?.weightPreset || null
  )

  const weaknessInsights = useMemo(
    () => analysis?.insights.filter((i) => i.status === 'weakness') ?? [],
    [analysis?.insights]
  )
  const priorityInsights = useMemo(() => weaknessInsights.slice(0, 3), [weaknessInsights])
  const strengthInsights = useMemo(
    () => analysis?.insights.filter((i) => i.status === 'strength').slice(0, 2) ?? [],
    [analysis?.insights]
  )
  const pendingWeaknesses = useMemo(
    () =>
      weaknessInsights.filter(
        (i) => !appliedFixes.includes(i.id) && i.fixSuggestion && i.fixSection
      ),
    [weaknessInsights, appliedFixes]
  )
  const scoreProgress = analysis
    ? Math.min(100, Math.round((analysis.greenlightScore.score / READY_FOR_PRODUCTION_THRESHOLD) * 100))
    : 0

  const scorePath = useMemo(() => {
    if (!analysis) return null
    return (
      analysis.scorePath ??
      buildScoreImprovementPath(
        analysis.greenlightScore.score,
        analysis.axes,
        weaknessInsights
      )
    )
  }, [analysis, weaknessInsights])

  const openImproveDialog = useCallback((insight?: ResonanceInsight) => {
    setEditFocusInsight(insight ?? null)
    setEditDialogOpen(true)
  }, [])
  
  // Wrapper functions to sync local state with Zustand store
  const setIntent = useCallback((value: AudienceIntent | ((prev: AudienceIntent) => AudienceIntent)) => {
    setIntentLocal(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value
      setStoreAnalysis(treatmentId, { intent: newValue })
      return newValue
    })
  }, [treatmentId, setStoreAnalysis])
  
  const setAnalysis = useCallback((value: AudienceResonanceAnalysis | null) => {
    setAnalysisLocal(value)
    setStoreAnalysis(treatmentId, { analysis: value })
  }, [treatmentId, setStoreAnalysis])
  
  const setPreviousScore = useCallback((value: number | null) => {
    setPreviousScoreLocal(value)
    setStoreAnalysis(treatmentId, { previousScore: value })
  }, [treatmentId, setStoreAnalysis])
  
  const setAppliedFixes = useCallback((value: string[] | ((prev: string[]) => string[])) => {
    setAppliedFixesLocal(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value
      setStoreAnalysis(treatmentId, { appliedFixes: newValue })
      return newValue
    })
  }, [treatmentId, setStoreAnalysis])
  
  const setAppliedFixDetails = useCallback((value: AppliedFix[] | ((prev: AppliedFix[]) => AppliedFix[])) => {
    setAppliedFixDetailsLocal(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value
      setStoreAnalysis(treatmentId, { appliedFixDetails: newValue })
      return newValue
    })
  }, [treatmentId, setStoreAnalysis])
  
  const setIterationCount = useCallback((value: number | ((prev: number) => number)) => {
    setIterationCountLocal(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value
      setStoreAnalysis(treatmentId, { iterationCount: newValue })
      return newValue
    })
  }, [treatmentId, setStoreAnalysis])
  
  const setIsReadyForProduction = useCallback((value: boolean) => {
    setIsReadyForProductionLocal(value)
    setStoreAnalysis(treatmentId, { isReadyForProduction: value })
  }, [treatmentId, setStoreAnalysis])
  
  const setPendingFixesCount = useCallback((value: number | ((prev: number) => number)) => {
    setPendingFixesCountLocal(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value
      setStoreAnalysis(treatmentId, { pendingFixesCount: newValue })
      return newValue
    })
  }, [treatmentId, setStoreAnalysis])
  
  // Local scoring setters - NEW
  const setServerCheckpointResults = useCallback((value: CheckpointResults | null) => {
    setServerCheckpointResultsLocal(value)
    setStoreAnalysis(treatmentId, { serverCheckpointResults: value })
  }, [treatmentId, setStoreAnalysis])
  
  const setCheckpointOverrides = useCallback((value: CheckpointOverride[] | ((prev: CheckpointOverride[]) => CheckpointOverride[])) => {
    setCheckpointOverridesLocal(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value
      setStoreAnalysis(treatmentId, { checkpointOverrides: newValue })
      return newValue
    })
  }, [treatmentId, setStoreAnalysis])
  
  const setIsScoreEstimated = useCallback((value: boolean) => {
    setIsScoreEstimatedLocal(value)
    setStoreAnalysis(treatmentId, { isScoreEstimated: value })
  }, [treatmentId, setStoreAnalysis])
  
  // Intent lock and target profile setters
  const setHasIntentLock = useCallback((value: boolean) => {
    setHasIntentLockLocal(value)
    setStoreAnalysis(treatmentId, { hasIntentLock: value })
  }, [treatmentId, setStoreAnalysis])
  
  const setTargetProfile = useCallback((value: TargetScoreProfile | null) => {
    setTargetProfileLocal(value)
    setStoreAnalysis(treatmentId, { targetProfile: value })
  }, [treatmentId, setStoreAnalysis])
  
  // Custom weights setters
  const setCustomWeights = useCallback((value: Record<string, number>) => {
    setCustomWeightsLocal(value)
    setStoreAnalysis(treatmentId, { customWeights: value })
  }, [treatmentId, setStoreAnalysis])
  
  const setWeightPreset = useCallback((value: WeightPresetKey | 'custom' | null) => {
    setWeightPresetLocal(value)
    setStoreAnalysis(treatmentId, { weightPreset: value })
  }, [treatmentId, setStoreAnalysis])
  
  // Sync with prop changes
  useEffect(() => {
    if (treatmentProp && treatmentProp !== localTreatment) {
      setLocalTreatment(treatmentProp)
    }
  }, [treatmentProp])
  
  // Auto-detect intent from treatment - ONLY when not locked
  useEffect(() => {
    // Skip auto-detection if intent is locked (user has started analysis)
    if (hasIntentLock) return
    
    if (treatment) {
      const detectedIntent = detectIntentFromTreatment(treatment)
      setIntent((prev) =>
        normalizeAudienceIntent({
          ...prev,
          ...detectedIntent,
        })
      )
    }
  }, [treatment])
  
  // Restore saved analysis from database when provided (only if no cached state)
  useEffect(() => {
    // Only restore if:
    // 1. We have saved analysis from database
    // 2. We don't have cached state already (localStorage takes priority for fresh session data)
    // 3. The saved analysis has actual data
    // 4. User hasn't just reset (prevents re-initializing after manual reset)
    if (wasResetByUser.current) {
      // User clicked Reset - don't restore from saved analysis
      console.log('[AudienceResonancePanel] Skipping restore - user reset in progress')
      return
    }
    
    if (savedAnalysis?.analysis && !cachedState?.analysis) {
      console.log('[AudienceResonancePanel] Restoring saved analysis from database')
      
      // Restore all state from saved analysis
      setAnalysisLocal(savedAnalysis.analysis)
      setIntentLocal(normalizeAudienceIntent(savedAnalysis.intent))
      setIterationCountLocal(savedAnalysis.iterationCount)
      setIsReadyForProductionLocal(savedAnalysis.isReadyForProduction)
      setPreviousScoreLocal(savedAnalysis.greenlightScore)
      setAppliedFixesLocal(savedAnalysis.appliedFixes || [])
      setAppliedFixDetailsLocal(savedAnalysis.appliedFixDetails || [])
      
      if (savedAnalysis.checkpointResults) {
        setServerCheckpointResultsLocal(savedAnalysis.checkpointResults)
      }
      if (savedAnalysis.targetProfile) {
        setTargetProfileLocal(savedAnalysis.targetProfile)
        setHasIntentLockLocal(true) // If we have a target profile, lock intent
      }
      
      // Also update the store so it's persisted to localStorage
      setStoreAnalysis(treatmentId, {
        analysis: savedAnalysis.analysis,
        intent: savedAnalysis.intent,
        iterationCount: savedAnalysis.iterationCount,
        isReadyForProduction: savedAnalysis.isReadyForProduction,
        previousScore: savedAnalysis.greenlightScore,
        appliedFixes: savedAnalysis.appliedFixes || [],
        appliedFixDetails: savedAnalysis.appliedFixDetails || [],
        serverCheckpointResults: savedAnalysis.checkpointResults || null,
        targetProfile: savedAnalysis.targetProfile || null,
        hasIntentLock: !!savedAnalysis.targetProfile
      })
    }
  }, [savedAnalysis, treatmentId, cachedState?.analysis, setStoreAnalysis])
  
  // Analyze treatment
  const runAnalysis = useCallback(async (quickMode = false, isReanalysis = false) => {
    if (!treatment) {
      setError('No treatment selected')
      return
    }
    
    // Lock intent and create target profile on first analysis
    if (!hasIntentLock) {
      setHasIntentLock(true)
      const profile = getTargetProfileForIntent(intent)
      setTargetProfile(profile)
    }
    
    // Increment iteration count only for re-analysis (after applying fixes)
    const nextIteration = isReanalysis ? iterationCount + 1 : (iterationCount || 1)
    
    setIsAnalyzing(true)
    setError(null)
    
    try {
      // Build checkpoint scores with local overrides applied
      // This tells the API what scores the user expects after fixes
      const checkpointScoresWithOverrides = (() => {
        const scores: Record<string, number> = {}
        // Start with server results
        if (serverCheckpointResults) {
          for (const [, axisResults] of Object.entries(serverCheckpointResults)) {
            for (const [checkpointId, result] of Object.entries(axisResults)) {
              scores[checkpointId] = result.score ?? (result.passed ? 10 : 0)
            }
          }
        }
        // Apply local overrides (user's optimistic scores from applied fixes)
        for (const override of checkpointOverrides) {
          scores[override.checkpointId] = override.overrideScore ?? 8
        }
        return scores
      })()
      
      // Build previous analysis context for re-analysis (maintains scoring baseline)
      const previousAnalysisContext = isReanalysis && analysis ? {
        score: analysis.greenlightScore?.score || 0,
        axisScores: {
          originality: analysis.axes.find(a => a.id === 'originality')?.score || 50,
          genreFidelity: analysis.axes.find(a => a.id === 'genre-fidelity')?.score || 50,
          characterDepth: analysis.axes.find(a => a.id === 'character-depth')?.score || 50,
          pacing: analysis.axes.find(a => a.id === 'pacing')?.score || 50,
          commercialViability: analysis.axes.find(a => a.id === 'commercial-viability')?.score || 50
        },
        // Gradient checkpoint scores (0-10 scale) with local overrides applied
        checkpointScores: checkpointScoresWithOverrides,
        // Legacy: passed checkpoints list for backward compatibility
        passedCheckpoints: serverCheckpointResults 
          ? Object.entries(serverCheckpointResults).flatMap(([, axisResults]) => 
              Object.entries(axisResults)
                .filter(([, result]) => result.passed)
                .map(([checkpointId]) => checkpointId)
            )
          : [],
        // Full applied fix details with fix text for AI verification
        appliedFixes: appliedFixDetails
      } : undefined
      
      const response = await fetch('/api/treatment/analyze-resonance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentId: treatment.id || 'current',
          treatment: {
            title: treatment.label || treatment.title,
            logline: treatment.logline || '',
            synopsis: treatment.synopsis,
            visual_style: treatment.visual_style,
            tone_description: treatment.tone_description || treatment.tone,
            target_audience: treatment.target_audience,
            genre: treatment.genre,
            // Include structured narrative data for consistent AI analysis
            protagonist: treatment.protagonist || '',
            antagonist: treatment.antagonist || '',
            setting: treatment.setting || '',
            themes: treatment.themes || [],
            beats: treatment.beats || [],
            character_descriptions: treatment.character_descriptions || [],
            act_breakdown: treatment.act_breakdown || {}
          },
          intent,
          quickAnalysis: quickMode,
          iteration: nextIteration,
          previousAnalysis: previousAnalysisContext,
          // Target profile for stable scoring path
          targetProfile: targetProfile || getTargetProfileForIntent(intent),
          // Content baseline for intent changes - prevents wild score swings when only audience changes
          // This anchors the AI to the content quality, not just demographic fit
          contentBaseline: !isReanalysis && previousScore ? {
            score: previousScore,
            note: 'Previous score before audience/intent change. Content quality remains same - only evaluate demographic fit changes.'
          } : undefined
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.analysis) {
        // Calculate score delta if we have a previous score
        const newScore = data.analysis.greenlightScore?.score || 0
        if (previousScore !== null && newScore !== previousScore) {
          setScoreDelta(newScore - previousScore)
          // Clear delta after 5 seconds
          setTimeout(() => setScoreDelta(null), 5000)
        }
        setPreviousScore(newScore)
        
        // Store checkpoint results for local scoring - NEW
        if (data.analysis.checkpointResults) {
          setServerCheckpointResults(data.analysis.checkpointResults)
          setCheckpointOverrides([]) // Reset overrides on new analysis
          setIsScoreEstimated(false) // Server score is authoritative
        }
        
        // Update iteration count and ready-for-production status
        if (isReanalysis) {
          setIterationCount(nextIteration)
          setPendingFixesCount(0) // Clear pending fixes after re-analysis
        } else if (iterationCount === 0) {
          setIterationCount(1)
        }
        
        // Check if ready for production (score >= 80)
        const ready = data.readyForProduction || newScore >= READY_FOR_PRODUCTION_THRESHOLD
        setIsReadyForProduction(ready)
        
        setAnalysis(data.analysis)
        
        // Persist to database via callback - NEW
        if (onAnalysisComplete) {
          const persistedAR = createPersistedAR(
            data.analysis,
            intent,
            isReanalysis ? nextIteration : (iterationCount === 0 ? 1 : iterationCount),
            ready,
            appliedFixes,
            appliedFixDetails,
            data.analysis.checkpointResults,
            targetProfile || getTargetProfileForIntent(intent)
          )
          onAnalysisComplete(persistedAR)
        }
        
        // Auto-expand first weakness that hasn't been fixed yet (only if not ready)
        if (!ready) {
          const firstUnfixedWeakness = data.analysis.insights.find(
            (i: ResonanceInsight) => i.status === 'weakness' && !appliedFixes.includes(i.id)
          )
          if (firstUnfixedWeakness) {
            setExpandedInsights([firstUnfixedWeakness.id])
          }
        }
      } else {
        setError(data.error || 'Analysis failed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze treatment')
    } finally {
      setIsAnalyzing(false)
    }
  }, [treatment, intent, previousScore, appliedFixes, appliedFixDetails, iterationCount, serverCheckpointResults, checkpointOverrides, hasIntentLock, targetProfile, setHasIntentLock, setTargetProfile, onAnalysisComplete])
  
  const applyResonanceImprovements = useCallback(
    ({
      updatedTreatment,
      appliedInsightIds,
      section,
    }: {
      updatedTreatment: Record<string, unknown>
      appliedInsightIds: string[]
      section: string
    }) => {
      setLocalTreatment(updatedTreatment)
      setError(null)

      const newInsights = appliedInsightIds.filter((id) => !appliedFixes.includes(id))
      if (newInsights.length === 0) {
        onTreatmentUpdate?.(updatedTreatment)
        return
      }

      const insightsById = new Map(
        (analysis?.insights ?? []).map((i) => [i.id, i])
      )
      const appliedDetails: AppliedFix[] = []
      const newOverrides: CheckpointOverride[] = []

      for (const id of newInsights) {
        const insight = insightsById.get(id)
        if (!insight) continue
        appliedDetails.push({
          id: insight.id,
          checkpointId: insight.checkpointId || '',
          axisId: insight.axisId || '',
          fixText: insight.fixSuggestion || '',
          appliedAt: new Date().toISOString(),
        })
        if (insight.checkpointId && insight.axisId) {
          newOverrides.push({
            checkpointId: insight.checkpointId,
            axisId: insight.axisId as keyof CheckpointResults,
            overridePassed: true,
            overrideScore: 8,
          })
        }
        onFixApplied?.(insight.id, section, updatedTreatment)
      }

      setAppliedFixes((prev) => [...prev, ...newInsights])
      setAppliedFixDetails((prev) => [...prev, ...appliedDetails])
      setPendingFixesCount((prev) => prev + newInsights.length)
      onTreatmentUpdate?.(updatedTreatment)

      if (newOverrides.length > 0 && serverCheckpointResults && analysis) {
        const updatedOverrides = [...checkpointOverrides]
        for (const override of newOverrides) {
          const exists = updatedOverrides.some(
            (o) =>
              o.checkpointId === override.checkpointId &&
              o.axisId === override.axisId
          )
          if (!exists) updatedOverrides.push(override)
        }
        setCheckpointOverrides(updatedOverrides)
        const localResult = calculateLocalScore(
          serverCheckpointResults,
          updatedOverrides
        )
        setAnalysis({
          ...analysis,
          greenlightScore: localResult.greenlightScore,
          axes: localResult.axes,
        })
        setIsScoreEstimated(true)
        const newScore = localResult.overallScore
        if (previousScore !== null && newScore !== previousScore) {
          setScoreDelta(newScore - previousScore)
          setTimeout(() => setScoreDelta(null), 5000)
        }
        setPreviousScore(newScore)
        setIsReadyForProduction(newScore >= READY_FOR_PRODUCTION_THRESHOLD)
      }
    },
    [
      analysis,
      appliedFixes,
      checkpointOverrides,
      onFixApplied,
      onTreatmentUpdate,
      previousScore,
      serverCheckpointResults,
      setAnalysis,
      setAppliedFixDetails,
      setAppliedFixes,
      setCheckpointOverrides,
      setIsReadyForProduction,
      setIsScoreEstimated,
      setPendingFixesCount,
      setPreviousScore,
    ]
  )
  
  // Toggle insight expansion
  const toggleInsight = (id: string) => {
    setExpandedInsights(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }
  
  // Intent change handler - reset iterations but preserve content-based scoring context
  const handleTargetAudienceChange = (
    field: 'region' | 'ageRange' | 'gender' | 'educationLevel' | 'community',
    value: string
  ) => {
    handleIntentChange(field, value, true)
  }

  const handleIntentChange = (
    key: keyof AudienceIntent,
    value: string,
    isTargetAudienceField = false
  ) => {
    // Capture previous analysis for content-based anchoring
    // This prevents wild score swings when only the target audience changes
    const previousScore = analysis?.greenlightScore?.score
    
    setIntent((prev) => {
      const normalized = normalizeAudienceIntent(prev)
      if (isTargetAudienceField) {
        return applyTargetAudienceChange(normalized, key as any, value)
      }
      return { ...normalized, [key]: value }
    })
    // Clear analysis but preserve content-based baseline for scoring stability
    setAnalysisLocal(null)
    setIterationCountLocal(0)
    setIsReadyForProductionLocal(false)
    setAppliedFixesLocal([])
    setAppliedFixDetailsLocal([])
    setPendingFixesCountLocal(0)
    setScoreDelta(null)
    // Preserve previous score for content anchoring (prevents wild swings on audience change)
    setPreviousScoreLocal(previousScore || null)
    // Reset local scoring state
    setServerCheckpointResultsLocal(null)
    setCheckpointOverridesLocal([])
    setIsScoreEstimatedLocal(false)
    // Reset intent lock and target profile - allows new target for new intent
    setHasIntentLockLocal(false)
    setTargetProfileLocal(null)
    // Clear store for this treatment but note: previousScoreLocal preserved for content anchoring
    clearStoreAnalysis(treatmentId)
  }
  
  // Manual reset handler for user control
  const handleReset = () => {
    // Set flag to prevent useEffect from restoring from savedAnalysis
    wasResetByUser.current = true
    
    setAnalysisLocal(null)
    setIterationCountLocal(0)
    setIsReadyForProductionLocal(false)
    setAppliedFixesLocal([])
    setAppliedFixDetailsLocal([])
    setPendingFixesCountLocal(0)
    setScoreDelta(null)
    setPreviousScoreLocal(null)
    setError(null)
    // Reset local scoring state
    setServerCheckpointResultsLocal(null)
    setCheckpointOverridesLocal([])
    setIsScoreEstimatedLocal(false)
    // Reset intent lock and target profile
    setHasIntentLockLocal(false)
    setTargetProfileLocal(null)
    // Clear store for this treatment
    clearStoreAnalysis(treatmentId)
    
    // Clear the flag after a short delay to allow effects to run
    setTimeout(() => {
      wasResetByUser.current = false
    }, 100)
  }
  
  // No treatment available
  if (!treatment) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <Film className="w-12 h-12 text-gray-600 mb-4" />
        <p className="text-gray-400 text-sm">
          Generate a Blueprint first to analyze its audience resonance.
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Audience Resonance</h3>
            <p className="text-xs text-gray-500">Market viability analysis</p>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Intent Selector */}
        <div className="p-4 border-b border-slate-700/30">
          <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsTargetAudienceOpen((open) => !open)}
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-800/40 transition-colors"
              aria-expanded={isTargetAudienceOpen}
            >
              <ChevronDown
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                  isTargetAudienceOpen && 'rotate-180'
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Target audience
                  </p>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {isTargetAudienceOpen ? 'Hide' : 'Show'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Calibrate analysis and recommendations for who you are making this for.
                </p>
                {!isTargetAudienceOpen && (
                  <p className="text-[11px] text-cyan-400/80 mt-1.5 truncate" title={formatTargetAudienceForPrompt(intent)}>
                    {formatTargetAudienceForPrompt(intent)}
                  </p>
                )}
              </div>
            </button>
            <AnimatePresence initial={false}>
              {isTargetAudienceOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 pt-0 border-t border-slate-700/30">
                    <TargetAudienceSelector
                      value={intent}
                      onChange={handleTargetAudienceChange}
                      variant="compact"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-xs text-gray-500 mb-3 mt-5 uppercase tracking-wide">Creative intent</p>
          <div className="space-y-3">
            <IntentSelect
              icon={<Film className="w-4 h-4" />}
              label="Genre"
              value={intent.primaryGenre}
              options={GENRE_OPTIONS}
              onChange={(v) => handleIntentChange('primaryGenre', v)}
            />
            <IntentSelect
              icon={<Palette className="w-4 h-4" />}
              label="Tone"
              value={intent.toneProfile}
              options={TONE_OPTIONS}
              onChange={(v) => handleIntentChange('toneProfile', v)}
            />
          </div>
          
          <div className="mt-4 rounded-lg border border-slate-700/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsScoringAdvancedOpen((o) => !o)}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-800/40 transition-colors"
            >
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Scoring weights (optional)
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform',
                  isScoringAdvancedOpen && 'rotate-180'
                )}
              />
            </button>
            {isScoringAdvancedOpen && (
              <div className="px-3 pb-3 border-t border-slate-700/30">
                <WeightCustomizer
                  weights={customWeights}
                  preset={weightPreset}
                  onWeightsChange={setCustomWeights}
                  onPresetChange={setWeightPreset}
                  disabled={hasIntentLock}
                />
              </div>
            )}
          </div>

          {!analysis && (
            <button
              onClick={() => runAnalysis(false, false)}
              disabled={isAnalyzing}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-cyan-600 transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze Resonance
                </>
              )}
            </button>
          )}
        </div>
        
        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border-b border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        
        {/* Analysis Results */}
        <AnimatePresence mode="wait">
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4"
            >
              {/* Score summary */}
              <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Market readiness
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white tabular-nums">
                        {analysis.greenlightScore.score}
                      </span>
                      <span className="text-sm text-gray-500">/ 100</span>
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
                    <p className="text-sm text-gray-400 mt-0.5">
                      {analysis.greenlightScore.label}
                      {isScoreEstimated && ' · estimated until re-analyze'}
                    </p>
                  </div>
                  <GreenlightScore
                    score={analysis.greenlightScore.score}
                    confidence={analysis.greenlightScore.confidence}
                    size="sm"
                    genre={GENRE_OPTIONS.find((g) => g.value === intent.primaryGenre)?.label}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Progress to production ready</span>
                    <span>{READY_FOR_PRODUCTION_THRESHOLD}+</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        isReadyForProduction
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                      )}
                      style={{ width: `${scoreProgress}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => runAnalysis(false, pendingFixesCount > 0)}
                    disabled={isAnalyzing || iterationCount >= MAX_ITERATIONS}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-600/80 hover:bg-cyan-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {pendingFixesCount > 0 ? 'Verify score' : 'Re-analyze'}
                  </button>
                  {isReadyForProduction ? (
                    <button
                      onClick={onProceedToScripting}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Start production
                    </button>
                  ) : (
                    onProceedToScripting && (
                      <button
                        onClick={onProceedToScripting}
                        className="px-3 py-2 text-xs text-gray-400 hover:text-white border border-slate-600 rounded-lg"
                      >
                        Skip to production
                      </button>
                    )
                  )}
                  <button
                    onClick={handleReset}
                    className="px-2 py-2 text-gray-500 hover:text-gray-300 rounded-lg border border-slate-700/50"
                    title="Reset analysis"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
                {pendingFixesCount > 0 && (
                  <p className="text-[11px] text-cyan-400/90">
                    {pendingFixesCount} improvement{pendingFixesCount > 1 ? 's' : ''} applied — re-analyze to update your official score.
                  </p>
                )}
              </div>

              {/* Path to higher score */}
              {!isReadyForProduction && scorePath && scorePath.steps.length > 0 && (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-medium text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Path to {READY_FOR_PRODUCTION_THRESHOLD}+
                    </h4>
                    <span className="text-[10px] text-gray-500 tabular-nums">
                      ~{scorePath.projectedScoreIfTopSteps} if top {Math.min(3, scorePath.steps.length)} done
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    You need <span className="text-white font-medium">{scorePath.pointsToReady} points</span> to reach production ready. Work through these in order:
                  </p>
                  <ol className="space-y-1.5">
                    {scorePath.steps.slice(0, 3).map((step, idx) => (
                      <li
                        key={step.id}
                        className="flex items-start gap-2 text-xs text-gray-300"
                      >
                        <span className="text-cyan-500/80 font-mono shrink-0">{idx + 1}.</span>
                        <span className="flex-1 min-w-0">
                          <span className="text-white">{step.title}</span>
                          <span className="text-gray-500"> · {step.axisLabel}</span>
                          <span className="text-emerald-400/90 ml-1">+~{step.estimatedGain} pts</span>
                        </span>
                        {!appliedFixes.includes(step.id) && (
                          <button
                            type="button"
                            onClick={() => {
                              const insight = analysis?.insights.find((i) => i.id === step.id)
                              if (insight) openImproveDialog(insight)
                            }}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 shrink-0"
                          >
                            Improve
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                  {pendingWeaknesses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openImproveDialog()}
                      className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-medium rounded-lg border border-cyan-500/30"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Open guided editor
                    </button>
                  )}
                </div>
              )}

              {/* Compact radar */}
              <details className="rounded-xl border border-slate-700/30 bg-slate-800/20 group">
                <summary className="px-3 py-2.5 text-xs text-gray-400 cursor-pointer hover:text-gray-200 list-none flex items-center justify-between">
                  <span>Axis breakdown</span>
                  <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-3 pb-3">
                  <ResonanceRadarChart axes={analysis.axes} size="sm" />
                  <ResonanceRadarLegend axes={analysis.axes} />
                </div>
              </details>

              {/* Priority fixes */}
              {priorityInsights.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Top priorities
                    </h4>
                    {pendingWeaknesses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => openImproveDialog()}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        Improve ({pendingWeaknesses.length})
                      </button>
                    )}
                  </div>
                  {priorityInsights.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      expanded={expandedInsights.includes(insight.id)}
                      onToggle={() => toggleInsight(insight.id)}
                      onImprove={() => openImproveDialog(insight)}
                      isApplied={appliedFixes.includes(insight.id)}
                      showImpact
                    />
                  ))}
                </div>
              )}

              {strengthInsights.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-emerald-500/80 uppercase tracking-wide">
                    Strengths
                  </h4>
                  {strengthInsights.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      expanded={expandedInsights.includes(insight.id)}
                      onToggle={() => toggleInsight(insight.id)}
                      isApplied={false}
                    />
                  ))}
                </div>
              )}

              {weaknessInsights.length > 3 && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowAllInsights((v) => !v)}
                    className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                  >
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform',
                        showAllInsights && 'rotate-180'
                      )}
                    />
                    {showAllInsights ? 'Hide' : 'Show'} all issues ({weaknessInsights.length})
                  </button>
                  {showAllInsights &&
                    weaknessInsights.slice(3).map((insight) => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        expanded={expandedInsights.includes(insight.id)}
                        onToggle={() => toggleInsight(insight.id)}
                        onImprove={() => openImproveDialog(insight)}
                        isApplied={appliedFixes.includes(insight.id)}
                        showImpact
                      />
                    ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Empty State */}
        {!analysis && !isAnalyzing && !error && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/10 to-cyan-500/10 flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-cyan-400/50" />
            </div>
            <p className="text-gray-400 text-sm max-w-[200px]">
              Set your target audience and click Analyze to get market insights
            </p>
          </div>
        )}
      </div>

      <BlueprintResonanceEditDialog
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setEditFocusInsight(null)
        }}
        insights={pendingWeaknesses}
        focusInsight={editFocusInsight}
        treatment={treatment}
        currentScore={analysis?.greenlightScore.score}
        targetScore={READY_FOR_PRODUCTION_THRESHOLD}
        onApplied={applyResonanceImprovements}
      />
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function IntentSelect({
  icon,
  label,
  value,
  options,
  onChange
}: {
  icon: React.ReactNode
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md bg-slate-800/50 flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <div className="flex-1 relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </div>
    </div>
  )
}

function InsightCard({
  insight,
  expanded,
  onToggle,
  onImprove,
  isApplied,
  showImpact = false,
}: {
  insight: ResonanceInsight
  expanded: boolean
  onToggle: () => void
  onImprove?: () => void
  isApplied: boolean
  showImpact?: boolean
}) {
  const statusConfig = {
    strength: {
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20'
    },
    weakness: {
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20'
    },
    neutral: {
      icon: Lightbulb,
      color: 'text-gray-400',
      bg: 'bg-slate-700/30',
      border: 'border-slate-700/30'
    }
  }
  
  // Override config for applied state
  const config = isApplied 
    ? {
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/5',
        border: 'border-emerald-400/30'
      }
    : statusConfig[insight.status]
  const Icon = config.icon
  
  return (
    <div 
      className={`rounded-lg border ${config.border} overflow-hidden transition-all ${isApplied ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 p-3 ${config.bg} hover:bg-opacity-80 transition-colors text-left`}
      >
        <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
        <span className={`flex-1 text-sm font-medium ${isApplied ? 'text-gray-400 line-through' : 'text-white'}`}>{insight.title}</span>
        {showImpact && insight.impactScore != null && insight.status === 'weakness' && (
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
              impactLabel(insight.impactScore) === 'High'
                ? 'text-red-300 bg-red-500/15'
                : impactLabel(insight.impactScore) === 'Medium'
                  ? 'text-amber-300 bg-amber-500/15'
                  : 'text-gray-400 bg-slate-700/50'
            )}
          >
            {impactLabel(insight.impactScore)} impact
          </span>
        )}
        {isApplied && (
          <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded font-medium">
            ✓ Applied
          </span>
        )}
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-3">
              <p className="text-sm text-gray-300">{insight.insight}</p>
              
              {insight.treatmentSection && (
                <p className="text-xs text-gray-500">
                  Section: <span className="text-gray-400">{insight.treatmentSection}</span>
                </p>
              )}
              
              {/* Best Fixed In indicator - only show for weaknesses */}
              {insight.status === 'weakness' && insight.axisId && (
                (() => {
                  const narrative = AXIS_NARRATIVES[insight.axisId]
                  if (!narrative) return null
                  const isScriptFix = narrative.bestFixedIn === 'script'
                  return (
                    <div className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md border ${
                      isScriptFix 
                        ? 'text-purple-400 bg-purple-400/10 border-purple-400/20' 
                        : 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
                    }`}>
                      {isScriptFix ? (
                        <>
                          <Film className="w-3 h-3" />
                          Best addressed in Script phase
                        </>
                      ) : (
                        <>
                          <Lightbulb className="w-3 h-3" />
                          Can be fixed in Blueprint
                        </>
                      )}
                    </div>
                  )
                })()
              )}
              
              {!isApplied && insight.actionable && insight.fixSuggestion && onImprove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onImprove()
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 text-cyan-400 text-xs font-medium rounded-lg hover:bg-cyan-500/20 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Improve in editor
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              
              {/* Applied confirmation */}
              {isApplied && (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Fix applied to treatment
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

function detectIntentFromTreatment(treatment: any): Partial<AudienceIntent> {
  const intent: Partial<AudienceIntent> = {}
  
  // Detect genre from treatment
  const genreText = (treatment.genre || '').toLowerCase()
  for (const opt of GENRE_OPTIONS) {
    if (genreText.includes(opt.value) || genreText.includes(opt.label.toLowerCase())) {
      intent.primaryGenre = opt.value as PrimaryGenre
      break
    }
  }
  
  // Detect tone
  const toneText = (treatment.tone || treatment.tone_description || '').toLowerCase()
  for (const opt of TONE_OPTIONS) {
    if (toneText.includes(opt.label.toLowerCase().split(' ')[0])) {
      intent.toneProfile = opt.value as ToneProfile
      break
    }
  }
  
  return intent
}
