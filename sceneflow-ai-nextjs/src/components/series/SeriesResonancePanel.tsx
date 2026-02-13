'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Zap,
  TrendingUp,
  Users,
  Film,
  MapPin,
  Palette,
  Play,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Clock,
  Eye,
  Loader2,
  Check,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  SeriesResonanceAnalysis,
  SeriesResonanceInsight,
  EpisodeEngagementScore,
  SeriesResponse,
  getSeriesGreenlightTier
} from '@/types/series'

interface SeriesResonancePanelProps {
  series: SeriesResponse
  onAnalyze: () => Promise<SeriesResonanceAnalysis>
  onApplyFix: (insightId: string, fixSuggestion: string, targetSection: string, targetId?: string) => Promise<void>
  savedAnalysis?: SeriesResonanceAnalysis | null
  onSeriesUpdated?: () => void
}

/**
 * Series Resonance Analysis Panel
 * 
 * Analyzes production series for audience engagement, character depth,
 * story arc coherence, and commercial viability.
 */
export function SeriesResonancePanel({
  series,
  onAnalyze,
  onApplyFix,
  savedAnalysis,
  onSeriesUpdated
}: SeriesResonancePanelProps) {
  const [analysis, setAnalysis] = useState<SeriesResonanceAnalysis | null>(savedAnalysis || null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedInsights, setExpandedInsights] = useState<string[]>([])
  const [applyingFix, setApplyingFix] = useState<string | null>(null)
  // Initialize appliedFixes from saved analysis to persist across page reloads
  const [appliedFixes, setAppliedFixes] = useState<string[]>(savedAnalysis?.appliedFixes || [])
  const [showEpisodeDetails, setShowEpisodeDetails] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null)
  
  // Handle analyze
  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true)
    setError(null)
    
    try {
      const result = await onAnalyze()
      setAnalysis(result)
      // Preserve appliedFixes from the new analysis result
      if (result.appliedFixes) {
        setAppliedFixes(result.appliedFixes)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }, [onAnalyze])
  
  // Handle apply fix
  const handleApplyFix = useCallback(async (insight: SeriesResonanceInsight) => {
    if (!insight.fixSuggestion || !insight.targetSection) return
    
    setApplyingFix(insight.id)
    
    try {
      await onApplyFix(
        insight.id,
        insight.fixSuggestion,
        insight.targetSection,
        insight.targetId
      )
      setAppliedFixes(prev => [...prev, insight.id])
      onSeriesUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply fix')
    } finally {
      setApplyingFix(null)
    }
  }, [onApplyFix, onSeriesUpdated])
  
  // Toggle insight expansion
  const toggleInsight = useCallback((id: string) => {
    setExpandedInsights(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }, [])
  
  // Categorize insights
  const { strengths, weaknesses, neutral } = useMemo(() => {
    const insights = analysis?.insights || []
    return {
      strengths: insights.filter(i => i.status === 'strength'),
      weaknesses: insights.filter(i => i.status === 'weakness'),
      neutral: insights.filter(i => i.status === 'neutral')
    }
  }, [analysis])
  
  // Get actionable weaknesses count
  const actionableCount = useMemo(() => 
    weaknesses.filter(w => w.actionable && w.fixSuggestion && !appliedFixes.includes(w.id)).length,
    [weaknesses, appliedFixes]
  )
  
  // Get episode by number
  const getEpisodeDetails = useCallback((epNum: number) => {
    return analysis?.episodeEngagement.find(e => e.episodeNumber === epNum)
  }, [analysis])
  
  return (
    <div className="space-y-6">
      {/* Header with Analyze Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Series Resonance Analysis
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Evaluate audience engagement and commercial viability
          </p>
        </div>
        
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : analysis ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-Analyze
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Series
            </>
          )}
        </Button>
      </div>
      
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
        >
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}
      
      {/* Analysis Results */}
      {analysis && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Score Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Greenlight Score */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex flex-col items-center">
                <GreenlightScoreDisplay score={analysis.greenlightScore.score} />
                
                {/* Production Ready Indicator */}
                {analysis.isProductionReady ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-full flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">Production Ready!</span>
                  </motion.div>
                ) : (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-400">
                      {analysis.summary.bingeWorthiness}
                    </p>
                  </div>
                )}
                
                {/* Iteration & Trend Info */}
                {(analysis.iterationCount !== undefined || analysis.scoreTrend) && (
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    {analysis.iterationCount !== undefined && (
                      <span className="px-2 py-1 bg-slate-700/50 rounded text-gray-400">
                        Analysis #{analysis.iterationCount}
                      </span>
                    )}
                    {analysis.scoreTrend && (
                      <span className={`px-2 py-1 rounded flex items-center gap-1 ${
                        analysis.scoreTrend === 'up' ? 'bg-green-500/20 text-green-400' :
                        analysis.scoreTrend === 'down' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-700/50 text-gray-400'
                      }`}>
                        {analysis.scoreTrend === 'up' ? <ArrowUp className="w-3 h-3" /> :
                         analysis.scoreTrend === 'down' ? <ArrowDown className="w-3 h-3" /> : null}
                        {analysis.previousScore !== undefined && analysis.scoreTrend !== 'stable' && (
                          <span>from {analysis.previousScore}</span>
                        )}
                        {analysis.scoreTrend === 'stable' && <span>Stable</span>}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Suggested Action */}
                {analysis.suggestedAction && !analysis.isProductionReady && (
                  <p className="mt-3 text-xs text-gray-500 text-center max-w-[200px]">
                    {analysis.suggestedAction}
                  </p>
                )}
              </div>
            </div>
            
            {/* Radar Chart / Axes */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 lg:col-span-2">
              <h4 className="text-sm font-medium text-gray-400 mb-4">Score Breakdown</h4>
              <div className="space-y-3">
                {analysis.axes.map(axis => (
                  <div key={axis.id} className="flex items-center gap-3 group">
                    <div 
                      className="w-40 text-sm text-gray-400 truncate cursor-help" 
                      title={`${axis.label}: ${axis.description || 'Score metric'}`}
                    >
                      <span className="group-hover:text-gray-300 transition-colors">{axis.label}</span>
                    </div>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${axis.score}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ 
                          backgroundColor: axis.score >= 90 ? '#22c55e' : 
                                          axis.score >= 70 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <div className="w-12 text-right text-sm font-medium" style={{
                      color: axis.score >= 90 ? '#22c55e' : 
                             axis.score >= 70 ? '#f59e0b' : '#ef4444'
                    }}>
                      {axis.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Episode Engagement Timeline */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Episode Engagement Timeline
              </h4>
              <button
                onClick={() => setShowEpisodeDetails(prev => !prev)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
              >
                {showEpisodeDetails ? 'Hide Details' : 'Show Details'}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showEpisodeDetails ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            {/* Episode Score Bars */}
            <div className="flex items-end gap-1 h-32 mb-4">
              {analysis.episodeEngagement.map(ep => (
                <div
                  key={ep.episodeNumber}
                  className="flex-1 flex flex-col items-center cursor-pointer group"
                  onClick={() => setSelectedEpisode(selectedEpisode === ep.episodeNumber ? null : ep.episodeNumber)}
                  title={`Episode ${ep.episodeNumber}: ${ep.title}\nScore: ${ep.overallScore}\nHook: ${ep.hookStrength}/10`}
                >
                  <div className="relative w-full">
                    {/* Hook strength indicator */}
                    <div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: ep.hookStrength >= 8 ? '#22c55e' : 
                                        ep.hookStrength >= 6 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                    {/* Score bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${ep.overallScore}%` }}
                      transition={{ duration: 0.5, delay: ep.episodeNumber * 0.05 }}
                      className={`w-full rounded-t transition-colors ${
                        selectedEpisode === ep.episodeNumber 
                          ? 'bg-cyan-400' 
                          : 'bg-gradient-to-t from-cyan-600/50 to-purple-500/50 group-hover:from-cyan-500/70 group-hover:to-purple-400/70'
                      }`}
                      style={{ minHeight: 4 }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">{ep.episodeNumber}</span>
                </div>
              ))}
            </div>
            
            {/* Episode Details Grid - controlled by showEpisodeDetails */}
            <AnimatePresence>
              {showEpisodeDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {analysis.episodeEngagement.map(ep => (
                        <div 
                          key={ep.episodeNumber}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedEpisode === ep.episodeNumber 
                              ? 'bg-cyan-500/10 border-cyan-500/50' 
                              : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                          }`}
                          onClick={() => setSelectedEpisode(selectedEpisode === ep.episodeNumber ? null : ep.episodeNumber)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-400">Ep {ep.episodeNumber}</span>
                            <span className="text-sm font-bold" style={{
                              color: ep.overallScore >= 80 ? '#22c55e' : 
                                     ep.overallScore >= 65 ? '#f59e0b' : '#ef4444'
                            }}>
                              {ep.overallScore}
                            </span>
                          </div>
                          <p className="text-xs text-white truncate mb-2" title={ep.title}>{ep.title}</p>
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Hook</span>
                              <span className="text-gray-400">{ep.hookStrength}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Cliff</span>
                              <span className="text-gray-400">{ep.cliffhangerScore}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Cont</span>
                              <span className="text-gray-400">{ep.continuityScore}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Char</span>
                              <span className="text-gray-400">{ep.characterMoments}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Selected Episode Details */}
            <AnimatePresence>
              {selectedEpisode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {(() => {
                    const ep = getEpisodeDetails(selectedEpisode)
                    if (!ep) return null
                    return (
                      <div className="bg-slate-900/50 rounded-lg p-4 mt-4 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-white">
                            Episode {ep.episodeNumber}: {ep.title}
                          </h5>
                          <span className="text-lg font-bold" style={{
                            color: ep.overallScore >= 80 ? '#22c55e' : 
                                   ep.overallScore >= 65 ? '#f59e0b' : '#ef4444'
                          }}>
                            {ep.overallScore}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <ScoreMetric label="Hook" value={ep.hookStrength} max={10} />
                          <ScoreMetric label="Cliffhanger" value={ep.cliffhangerScore} max={10} />
                          <ScoreMetric label="Continuity" value={ep.continuityScore} max={10} />
                          <ScoreMetric label="Character" value={ep.characterMoments} max={10} />
                        </div>
                        
                        <div className="flex gap-4 text-xs text-gray-400 mb-3">
                          <span>Tension: <span className={
                            ep.tensionLevel === 'high' ? 'text-red-400' :
                            ep.tensionLevel === 'medium' ? 'text-amber-400' : 'text-green-400'
                          }>{ep.tensionLevel}</span></span>
                          <span>Pacing: <span className="text-gray-300">{ep.pacing}</span></span>
                        </div>
                        
                        {ep.notes && (
                          <p className="text-sm text-gray-400 mb-2">{ep.notes}</p>
                        )}
                        
                        {ep.improvements.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-amber-400 mb-1">Improvements:</p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              {ep.improvements.map((imp, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-amber-400">•</span>
                                  {imp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Strong Hook (8+)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Moderate (6-7)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Weak (&lt;6)</span>
              </div>
            </div>
          </div>
          
          {/* Summary */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h4 className="text-sm font-medium text-white mb-3">Analysis Summary</h4>
            <p className="text-gray-300 text-sm mb-4">{analysis.summary.overallAssessment}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Key Strengths */}
              <div>
                <h5 className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Key Strengths
                </h5>
                <ul className="space-y-1">
                  {analysis.summary.keyStrengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Critical Weaknesses */}
              <div>
                <h5 className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Areas for Improvement
                </h5>
                <ul className="space-y-1">
                  {analysis.summary.criticalWeaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Comparable Series */}
            {analysis.summary.comparableSeries.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-gray-500">
                  Comparable Series: {analysis.summary.comparableSeries.join(', ')}
                </p>
              </div>
            )}
            
            {/* Audience Engagement Drivers */}
            {analysis.summary.audienceEngagementDrivers && analysis.summary.audienceEngagementDrivers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <h5 className="text-xs font-medium text-cyan-400 mb-3 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Audience Engagement Drivers
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analysis.summary.audienceEngagementDrivers.map((driver, i) => (
                    <div 
                      key={i} 
                      className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{driver.driver}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          driver.impactLevel === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                          driver.impactLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {driver.impactLevel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{driver.description}</p>
                      {driver.episodeExamples.length > 0 && (
                        <p className="text-[10px] text-gray-500">
                          Episodes: {driver.episodeExamples.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Market Positioning & Renewal Potential */}
            {(analysis.summary.marketPositioning || analysis.summary.renewalPotential) && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.summary.marketPositioning && (
                  <div>
                    <h5 className="text-xs font-medium text-purple-400 mb-1">Market Positioning</h5>
                    <p className="text-sm text-gray-400">{analysis.summary.marketPositioning}</p>
                  </div>
                )}
                {analysis.summary.renewalPotential && (
                  <div>
                    <h5 className="text-xs font-medium text-blue-400 mb-1">Renewal Potential</h5>
                    <p className="text-sm text-gray-400">{analysis.summary.renewalPotential}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Insights with Apply Fix */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                Actionable Insights
                {actionableCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                    {actionableCount} fixes available
                  </span>
                )}
              </h4>
            </div>
            
            {/* Weaknesses (with fixes) */}
            {weaknesses.length > 0 && (
              <div className="space-y-2">
                {weaknesses.map(insight => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    expanded={expandedInsights.includes(insight.id)}
                    onToggle={() => toggleInsight(insight.id)}
                    onApplyFix={() => handleApplyFix(insight)}
                    isApplying={applyingFix === insight.id}
                    isApplied={appliedFixes.includes(insight.id)}
                  />
                ))}
              </div>
            )}
            
            {/* Strengths */}
            {strengths.length > 0 && (
              <div className="space-y-2 mt-4">
                <h5 className="text-xs text-emerald-400 font-medium">Strengths</h5>
                {strengths.map(insight => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    expanded={expandedInsights.includes(insight.id)}
                    onToggle={() => toggleInsight(insight.id)}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Applied Fixes Count */}
          {appliedFixes.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <p className="text-emerald-400 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                {appliedFixes.length} fix{appliedFixes.length > 1 ? 'es' : ''} applied. 
                <button
                  onClick={handleAnalyze}
                  className="underline hover:text-emerald-300"
                >
                  Re-analyze to see updated score
                </button>
              </p>
            </div>
          )}
        </motion.div>
      )}
      
      {/* Empty State */}
      {!analysis && !isAnalyzing && (
        <div className="bg-slate-800/30 border border-slate-700/30 border-dashed rounded-xl p-12 text-center">
          <Target className="w-12 h-12 text-cyan-400/50 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-300 mb-2">
            Analyze Your Series
          </h4>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Get AI-powered insights on audience engagement, character depth, 
            story arc coherence, and commercial viability.
          </p>
          <Button
            onClick={handleAnalyze}
            className="bg-gradient-to-r from-cyan-500 to-purple-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start Analysis
          </Button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Sub-Components
// =============================================================================

function GreenlightScoreDisplay({ score }: { score: number }) {
  const { tier, label, color } = getSeriesGreenlightTier(score)
  
  const radius = 60
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  const glowColor = tier === 'market-ready' 
    ? 'rgba(34, 197, 94, 0.4)' 
    : tier === 'strong-potential' 
      ? 'rgba(245, 158, 11, 0.3)' 
      : 'rgba(239, 68, 68, 0.2)'
  
  return (
    <div className="relative" style={{ width: 140, height: 140 }}>
      {/* Glow */}
      <div 
        className="absolute inset-0 rounded-full blur-xl"
        style={{ backgroundColor: glowColor }}
      />
      
      {/* SVG */}
      <svg className="transform -rotate-90 relative z-10" width={140} height={140}>
        <circle
          cx={70}
          cy={70}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <motion.circle
          cx={70}
          cy={70}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      
      {/* Center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <motion.span
          className="text-4xl font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-gray-400 mt-1">{label}</span>
      </div>
    </div>
  )
}

function ScoreMetric({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = (value / max) * 100
  const color = percentage >= 80 ? '#22c55e' : percentage >= 60 ? '#f59e0b' : '#ef4444'
  
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span style={{ color }}>{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
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
  insight: SeriesResonanceInsight
  expanded: boolean
  onToggle: () => void
  onApplyFix?: () => void
  isApplying?: boolean
  isApplied?: boolean
}) {
  const statusConfig = {
    strength: { icon: CheckCircle2, color: 'emerald', bg: 'emerald-500/10', border: 'emerald-500/30' },
    weakness: { icon: AlertTriangle, color: 'amber', bg: 'amber-500/10', border: 'amber-500/30' },
    neutral: { icon: Lightbulb, color: 'gray', bg: 'slate-500/10', border: 'slate-500/30' }
  }
  
  const config = statusConfig[insight.status]
  const Icon = config.icon
  
  return (
    <motion.div
      layout
      className={`bg-${config.bg} border border-${config.border} rounded-lg overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left"
      >
        <Icon className={`w-4 h-4 text-${config.color}-400 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{insight.title}</p>
          <p className="text-xs text-gray-500 capitalize">{insight.category}</p>
        </div>
        {insight.estimatedImpact && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <ArrowUp className="w-3 h-3" />
            +{insight.estimatedImpact}
          </span>
        )}
        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <p className="text-sm text-gray-400">{insight.insight}</p>
              
              {insight.fixSuggestion && insight.actionable && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-cyan-400 mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Suggested Fix
                  </p>
                  <p className="text-sm text-gray-300 mb-3">{insight.fixSuggestion}</p>
                  
                  {isApplied ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <Check className="w-4 h-4" />
                      Fix Applied
                    </div>
                  ) : onApplyFix && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onApplyFix()
                      }}
                      disabled={isApplying}
                      className="bg-cyan-600 hover:bg-cyan-500"
                    >
                      {isApplying ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 mr-1" />
                          Apply Fix
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
              
              {insight.targetSection && (
                <p className="text-xs text-gray-600">
                  Target: {insight.targetSection}{insight.targetId ? ` → ${insight.targetId}` : ''}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
