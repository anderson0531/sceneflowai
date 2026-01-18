'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
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
  Zap,
  ArrowRight,
  TrendingUp,
  Users,
  Film,
  Palette,
  ShieldCheck
} from 'lucide-react'
import { GreenlightScore } from './GreenlightScore'
import { ResonanceRadarChart, ResonanceRadarLegend } from '@/components/charts/ResonanceRadarChart'
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
  DEMOGRAPHIC_OPTIONS,
  TONE_OPTIONS,
  DEFAULT_INTENT
} from '@/lib/types/audienceResonance'
import { READY_FOR_PRODUCTION_THRESHOLD, MAX_ITERATIONS } from '@/lib/treatment/scoringChecklist'
import { useResonanceStore, type ResonanceCacheEntry } from '@/store/useResonanceStore'
import { 
  calculateLocalScore, 
  createEmptyCheckpointResults,
  type CheckpointOverride 
} from '@/lib/treatment/localScoring'

interface AudienceResonancePanelProps {
  treatment?: any
  onFixApplied?: (insightId: string, section: string, updatedTreatment?: any) => void
  onTreatmentUpdate?: (updatedTreatment: any) => void
  onProceedToScripting?: () => void // Called when user clicks "Proceed to Scripting"
}

/**
 * Audience Resonance Engine Panel
 * 
 * Strategic advisor that analyzes film treatments against target market,
 * genre conventions, and commercial viability.
 */
export function AudienceResonancePanel({ treatment: treatmentProp, onFixApplied, onTreatmentUpdate, onProceedToScripting }: AudienceResonancePanelProps) {
  // Local treatment state - allows updates from fixes
  const [localTreatment, setLocalTreatment] = useState<any>(treatmentProp)
  const treatment = localTreatment || treatmentProp
  
  // Get treatment ID for cache key
  const treatmentId = useMemo(() => treatment?.id || 'current', [treatment?.id])
  
  // Zustand store for persistence
  const { getAnalysis, setAnalysis: setStoreAnalysis, clearAnalysis: clearStoreAnalysis } = useResonanceStore()
  const cachedState = getAnalysis(treatmentId)
  
  // State - initialized from cache if available
  const [intent, setIntentLocal] = useState<AudienceIntent>(
    cachedState?.intent || DEFAULT_INTENT
  )
  const [analysis, setAnalysisLocal] = useState<AudienceResonanceAnalysis | null>(
    cachedState?.analysis || null
  )
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedInsights, setExpandedInsights] = useState<string[]>([])
  const [applyingFix, setApplyingFix] = useState<string | null>(null)
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
      setIntent(prev => ({
        ...prev,
        ...detectedIntent
      }))
    }
  }, [treatment])
  
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
            // NOTE: content field removed - unused by API, reduces payload size
            synopsis: treatment.synopsis,
            visual_style: treatment.visual_style,
            tone_description: treatment.tone_description || treatment.tone,
            target_audience: treatment.target_audience,
            genre: treatment.genre
          },
          intent,
          quickAnalysis: quickMode,
          iteration: nextIteration,
          previousAnalysis: previousAnalysisContext,
          // Target profile for stable scoring path
          targetProfile: targetProfile || getTargetProfileForIntent(intent)
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
  }, [treatment, intent, previousScore, appliedFixes, appliedFixDetails, iterationCount, serverCheckpointResults, checkpointOverrides, hasIntentLock, targetProfile, setHasIntentLock, setTargetProfile])
  
  // Apply fix suggestion
  const applyFix = useCallback(async (insight: ResonanceInsight) => {
    if (!insight.fixSuggestion || !insight.fixSection) return
    
    // Check if we've reached max iterations
    if (iterationCount >= MAX_ITERATIONS) {
      setError('Maximum refinement iterations reached. Your treatment is ready for production.')
      return
    }
    
    setApplyingFix(insight.id)
    setError(null)
    
    try {
      // Call the refine API with the fix suggestion
      const response = await fetch('/api/treatment/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant: treatment,
          section: insight.fixSection,
          instructions: insight.fixSuggestion
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.draft) {
        // Merge the draft into the local treatment
        const updatedTreatment = { ...treatment, ...data.draft, updatedAt: Date.now() }
        setLocalTreatment(updatedTreatment)
        
        // Track this fix as applied (increment pending fixes count)
        setAppliedFixes(prev => [...prev, insight.id])
        setPendingFixesCount(prev => prev + 1)
        
        // Track full fix details for API verification (gradient scoring)
        const fixDetail: AppliedFix = {
          id: insight.id,
          checkpointId: insight.checkpointId || '',
          axisId: insight.axisId || '',
          fixText: insight.fixSuggestion || '',
          appliedAt: new Date().toISOString()
        }
        setAppliedFixDetails(prev => [...prev, fixDetail])
        
        // LOCAL SCORING: Add checkpoint override if insight has checkpointId - NEW
        if (insight.checkpointId && insight.axisId && serverCheckpointResults) {
          const newOverride: CheckpointOverride = {
            checkpointId: insight.checkpointId,
            axisId: insight.axisId,
            overridePassed: true, // User applied the fix
            overrideScore: 8 // Gradient: 8/10 for locally-applied fix (pending AI verification)
          }
          
          setCheckpointOverrides(prev => {
            // Don't add duplicate overrides
            const existing = prev.find(
              o => o.checkpointId === insight.checkpointId && o.axisId === insight.axisId
            )
            if (existing) return prev
            return [...prev, newOverride]
          })
          
          // Recalculate score locally
          const updatedOverrides = checkpointOverrides.some(
            o => o.checkpointId === insight.checkpointId && o.axisId === insight.axisId
          ) ? checkpointOverrides : [...checkpointOverrides, newOverride]
          
          const localResult = calculateLocalScore(serverCheckpointResults, updatedOverrides)
          
          // Update analysis with estimated score
          if (analysis) {
            const updatedAnalysis: AudienceResonanceAnalysis = {
              ...analysis,
              greenlightScore: localResult.greenlightScore,
              axes: localResult.axes
            }
            setAnalysis(updatedAnalysis)
            setIsScoreEstimated(true)
            
            // Calculate and show score delta
            const newScore = localResult.overallScore
            if (previousScore !== null && newScore !== previousScore) {
              setScoreDelta(newScore - previousScore)
              setTimeout(() => setScoreDelta(null), 5000)
            }
            setPreviousScore(newScore)
            
            // Check if now ready for production
            const ready = newScore >= READY_FOR_PRODUCTION_THRESHOLD
            setIsReadyForProduction(ready)
          }
        }
        
        // Notify parent component
        onFixApplied?.(insight.id, insight.fixSection, updatedTreatment)
        onTreatmentUpdate?.(updatedTreatment)
        
        // NOTE: Do NOT auto re-analyze. User will click Analyze when ready.
        // This allows applying multiple fixes before using an iteration.
      } else {
        setError(data.message || 'Failed to apply fix')
      }
    } catch (err) {
      console.error('Failed to apply fix:', err)
      setError('Failed to apply fix. Please try again.')
    } finally {
      setApplyingFix(null)
    }
  }, [treatment, onFixApplied, onTreatmentUpdate, runAnalysis, serverCheckpointResults, checkpointOverrides, analysis, previousScore, setAnalysis, setIsScoreEstimated, setCheckpointOverrides, setPreviousScore, setIsReadyForProduction, setAppliedFixes, setAppliedFixDetails, setPendingFixesCount, iterationCount])
  
  // Toggle insight expansion
  const toggleInsight = (id: string) => {
    setExpandedInsights(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }
  
  // Intent change handler - reset iterations for fresh scoring with new intent
  const handleIntentChange = (key: keyof AudienceIntent, value: string) => {
    setIntent(prev => ({ ...prev, [key]: value }))
    // Clear analysis and reset iterations when intent changes
    setAnalysisLocal(null)
    setIterationCountLocal(0)
    setIsReadyForProductionLocal(false)
    setAppliedFixesLocal([])
    setAppliedFixDetailsLocal([])
    setPendingFixesCountLocal(0)
    setScoreDelta(null)
    setPreviousScoreLocal(null)
    // Reset local scoring state
    setServerCheckpointResultsLocal(null)
    setCheckpointOverridesLocal([])
    setIsScoreEstimatedLocal(false)
    // Reset intent lock and target profile - allows new target for new intent
    setHasIntentLockLocal(false)
    setTargetProfileLocal(null)
    // Clear store for this treatment
    clearStoreAnalysis(treatmentId)
  }
  
  // Manual reset handler for user control
  const handleReset = () => {
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
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Target Intent</p>
          
          <div className="space-y-3">
            {/* Genre */}
            <IntentSelect
              icon={<Film className="w-4 h-4" />}
              label="Genre"
              value={intent.primaryGenre}
              options={GENRE_OPTIONS}
              onChange={(v) => handleIntentChange('primaryGenre', v)}
            />
            
            {/* Demographic */}
            <IntentSelect
              icon={<Users className="w-4 h-4" />}
              label="Audience"
              value={intent.targetDemographic}
              options={DEMOGRAPHIC_OPTIONS}
              onChange={(v) => handleIntentChange('targetDemographic', v)}
            />
            
            {/* Tone */}
            <IntentSelect
              icon={<Palette className="w-4 h-4" />}
              label="Tone"
              value={intent.toneProfile}
              options={TONE_OPTIONS}
              onChange={(v) => handleIntentChange('toneProfile', v)}
            />
          </div>
          
          {/* Iteration Progress */}
          {iterationCount > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">
                  Iteration {iterationCount}/{MAX_ITERATIONS}
                </span>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2 py-0.5 text-gray-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded transition-colors"
                  title="Reset iterations to score different intent"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
              <span className={`font-medium ${
                isReadyForProduction ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                Target: {READY_FOR_PRODUCTION_THRESHOLD}+
              </span>
            </div>
          )}
          
          {/* Pending Fixes Indicator */}
          {pendingFixesCount > 0 && (
            <div className="mt-2 p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <p className="text-xs text-cyan-400">
                <span className="font-medium">{pendingFixesCount} fix{pendingFixesCount > 1 ? 'es' : ''} applied</span> — Click Re-analyze to see updated score
              </p>
            </div>
          )}
          
          {/* Ready for Production Banner */}
          {isReadyForProduction && analysis && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-3 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-lg border border-emerald-500/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Ready for Production!</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Your treatment meets the quality threshold and is ready for production.
              </p>
              <button
                onClick={onProceedToScripting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                Start Production
              </button>
            </motion.div>
          )}
          
          {/* Analyze Button - hidden when ready for production */}
          {!isReadyForProduction && (
            <button
              onClick={() => runAnalysis(false, pendingFixesCount > 0)}
              disabled={isAnalyzing || iterationCount >= MAX_ITERATIONS}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : iterationCount >= MAX_ITERATIONS ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Analysis Complete
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {pendingFixesCount > 0 ? `Re-analyze (${pendingFixesCount} fix${pendingFixesCount > 1 ? 'es' : ''})` : iterationCount > 0 ? 'Re-analyze' : 'Analyze Resonance'}
                </>
              )}
            </button>
          )}
          
          {/* Max Iterations Reached Notice */}
          {iterationCount >= MAX_ITERATIONS && !isReadyForProduction && (
            <div className="mt-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-xs text-amber-400">
                Maximum refinements reached. Consider starting production - 
                detailed improvements can be made during the scripting phase.
              </p>
              <button
                onClick={onProceedToScripting}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/20 text-amber-300 font-medium rounded-lg hover:bg-amber-500/30 transition-all text-sm"
              >
                <ArrowRight className="w-4 h-4" />
                Start Production Anyway
              </button>
            </div>
          )}
          
          {/* Quick Analysis (free) - only show on first analysis */}
          {!analysis && !isAnalyzing && iterationCount === 0 && (
            <button
              onClick={() => runAnalysis(true)}
              className="mt-2 w-full text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              or try Quick Analysis (free)
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 space-y-6"
            >
              {/* Greenlight Score with Delta Indicator */}
              <div className="flex flex-col items-center relative">
                <GreenlightScore
                  score={analysis.greenlightScore.score}
                  confidence={analysis.greenlightScore.confidence}
                  size="md"
                  genre={GENRE_OPTIONS.find(g => g.value === intent.primaryGenre)?.label}
                />
                
                {/* Estimated Score Badge - NEW */}
                {isScoreEstimated && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Estimated Score
                    </span>
                    <button
                      onClick={() => runAnalysis(false, true)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-full border border-cyan-500/30 transition-colors disabled:opacity-50"
                      title="Re-analyze with API to verify score"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      Verify Score
                    </button>
                  </div>
                )}
                
                {/* Score Delta Indicator */}
                <AnimatePresence>
                  {scoreDelta !== null && scoreDelta !== 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.8 }}
                      className={`absolute -right-2 top-0 px-2 py-1 rounded-full text-xs font-bold ${
                        scoreDelta > 0 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {scoreDelta > 0 ? '+' : ''}{scoreDelta} pts
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Applied Fixes Count */}
                {appliedFixes.length > 0 && (
                  <div className="mt-2 text-xs text-cyan-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {appliedFixes.length} fix{appliedFixes.length > 1 ? 'es' : ''} applied
                  </div>
                )}
              </div>
              
              {/* Radar Chart */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Resonance Radar
                </h4>
                <ResonanceRadarChart 
                  axes={analysis.axes} 
                  size="md" 
                />
                <ResonanceRadarLegend axes={analysis.axes} />
              </div>
              
              {/* Insights Accordion */}
              <div className="space-y-2">
                <h4 className="text-xs text-gray-500 uppercase tracking-wide">
                  Insights & Recommendations
                </h4>
                
                {analysis.insights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    expanded={expandedInsights.includes(insight.id)}
                    onToggle={() => toggleInsight(insight.id)}
                    onApplyFix={() => applyFix(insight)}
                    isApplying={applyingFix === insight.id}
                    isApplied={appliedFixes.includes(insight.id)}
                  />
                ))}
                
              </div>
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
  onApplyFix,
  isApplying,
  isApplied
}: {
  insight: ResonanceInsight
  expanded: boolean
  onToggle: () => void
  onApplyFix: () => void
  isApplying: boolean
  isApplied: boolean
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
              
              {/* Fix Button - hidden when applied */}
              {!isApplied && insight.actionable && insight.fixSuggestion && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onApplyFix()
                  }}
                  disabled={isApplying}
                  className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 text-cyan-400 text-xs font-medium rounded-lg hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                >
                  {isApplying ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  Apply Fix
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
