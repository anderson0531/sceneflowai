'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, 
  ChevronDown, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  Zap,
  ArrowRight,
  TrendingUp,
  Users,
  Film,
  Palette
} from 'lucide-react'
import { GreenlightScore } from './GreenlightScore'
import { ResonanceRadarChart, ResonanceRadarLegend } from '@/components/charts/ResonanceRadarChart'
import {
  type AudienceIntent,
  type AudienceResonanceAnalysis,
  type ResonanceInsight,
  type PrimaryGenre,
  type ToneProfile,
  GENRE_OPTIONS,
  DEMOGRAPHIC_OPTIONS,
  TONE_OPTIONS,
  DEFAULT_INTENT
} from '@/lib/types/audienceResonance'

interface AudienceResonancePanelProps {
  treatment?: any
  onFixApplied?: (insightId: string, section: string) => void
}

/**
 * Audience Resonance Engine Panel
 * 
 * Strategic advisor that analyzes film treatments against target market,
 * genre conventions, and commercial viability.
 */
export function AudienceResonancePanel({ treatment, onFixApplied }: AudienceResonancePanelProps) {
  // State
  const [intent, setIntent] = useState<AudienceIntent>(DEFAULT_INTENT)
  const [analysis, setAnalysis] = useState<AudienceResonanceAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedInsights, setExpandedInsights] = useState<string[]>([])
  const [applyingFix, setApplyingFix] = useState<string | null>(null)
  
  // Auto-detect intent from treatment
  useEffect(() => {
    if (treatment) {
      const detectedIntent = detectIntentFromTreatment(treatment)
      setIntent(prev => ({
        ...prev,
        ...detectedIntent
      }))
    }
  }, [treatment])
  
  // Analyze treatment
  const runAnalysis = useCallback(async (quickMode = false) => {
    if (!treatment) {
      setError('No treatment selected')
      return
    }
    
    setIsAnalyzing(true)
    setError(null)
    
    try {
      const response = await fetch('/api/treatment/analyze-resonance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentId: treatment.id || 'current',
          treatment: {
            title: treatment.label || treatment.title,
            content: treatment.content,
            synopsis: treatment.synopsis,
            visual_style: treatment.visual_style,
            tone_description: treatment.tone_description || treatment.tone,
            target_audience: treatment.target_audience,
            genre: treatment.genre
          },
          intent,
          quickAnalysis: quickMode
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.analysis) {
        setAnalysis(data.analysis)
        // Auto-expand first weakness
        const firstWeakness = data.analysis.insights.find((i: ResonanceInsight) => i.status === 'weakness')
        if (firstWeakness) {
          setExpandedInsights([firstWeakness.id])
        }
      } else {
        setError(data.error || 'Analysis failed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze treatment')
    } finally {
      setIsAnalyzing(false)
    }
  }, [treatment, intent])
  
  // Apply fix suggestion
  const applyFix = useCallback(async (insight: ResonanceInsight) => {
    if (!insight.fixSuggestion || !insight.fixSection) return
    
    setApplyingFix(insight.id)
    
    try {
      // Call the refine API with the fix suggestion
      const response = await fetch('/api/treatment/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatment,
          section: insight.fixSection,
          instructions: insight.fixSuggestion,
          mode: 'enhance'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        onFixApplied?.(insight.id, insight.fixSection)
        // Re-analyze after fix
        setTimeout(() => runAnalysis(true), 500)
      }
    } catch (err) {
      console.error('Failed to apply fix:', err)
    } finally {
      setApplyingFix(null)
    }
  }, [treatment, onFixApplied, runAnalysis])
  
  // Toggle insight expansion
  const toggleInsight = (id: string) => {
    setExpandedInsights(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }
  
  // Intent change handler with debounced re-analysis
  const handleIntentChange = (key: keyof AudienceIntent, value: string) => {
    setIntent(prev => ({ ...prev, [key]: value }))
    // Clear analysis when intent changes
    setAnalysis(null)
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
          
          {/* Analyze Button */}
          <button
            onClick={() => runAnalysis(false)}
            disabled={isAnalyzing}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          
          {/* Quick Analysis (free) */}
          {!analysis && !isAnalyzing && (
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
              {/* Greenlight Score */}
              <div className="flex flex-col items-center">
                <GreenlightScore
                  score={analysis.greenlightScore.score}
                  confidence={analysis.greenlightScore.confidence}
                  size="md"
                  genre={GENRE_OPTIONS.find(g => g.value === intent.primaryGenre)?.label}
                />
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
                  />
                ))}
                
                {/* Recommendations */}
                {analysis.recommendations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700/30">
                    <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                      Top Recommendations
                    </h4>
                    {analysis.recommendations.slice(0, 3).map((rec) => (
                      <div 
                        key={rec.id}
                        className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 mb-2"
                      >
                        <TrendingUp className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">{rec.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{rec.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                              +{rec.expectedImpact} pts
                            </span>
                            <span className="text-[10px] text-gray-500 capitalize">
                              {rec.effort} effort
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Credits Used */}
              {analysis.creditsUsed > 0 && (
                <p className="text-[10px] text-gray-600 text-center">
                  Analysis used {analysis.creditsUsed} credits
                </p>
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
  isApplying
}: {
  insight: ResonanceInsight
  expanded: boolean
  onToggle: () => void
  onApplyFix: () => void
  isApplying: boolean
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
  
  const config = statusConfig[insight.status]
  const Icon = config.icon
  
  return (
    <div 
      className={`rounded-lg border ${config.border} overflow-hidden transition-all`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 p-3 ${config.bg} hover:bg-opacity-80 transition-colors text-left`}
      >
        <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
        <span className="flex-1 text-sm text-white font-medium">{insight.title}</span>
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
              
              {/* Fix Button */}
              {insight.actionable && insight.fixSuggestion && (
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
