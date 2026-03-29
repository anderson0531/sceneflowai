'use client'

import { motion } from 'framer-motion'
import type { VisionaryReport } from '@/lib/visionary/types'
import {
  TrendingUp,
  Target,
  Globe,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'

interface OpportunityReportProps {
  report: VisionaryReport
}

/**
 * OpportunityReport — Full analysis summary view
 * 
 * Renders the complete Visionary Engine report with:
 * - Overall score hero
 * - Market scan trends
 * - Gap analysis with concept fit
 * - Bridge plan action items
 */
export function OpportunityReport({ report }: OpportunityReportProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trends: false,
    gaps: false,
    plan: true,
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400'
    if (score >= 50) return 'text-yellow-400'
    if (score >= 25) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 75) return 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30'
    if (score >= 50) return 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30'
    if (score >= 25) return 'from-orange-500/20 to-orange-600/10 border-orange-500/30'
    return 'from-red-500/20 to-red-600/10 border-red-500/30'
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Hero */}
      {typeof report.overallScore === 'number' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br ${getScoreBg(report.overallScore)} border rounded-2xl p-6`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">
                Overall Viability Score
              </h3>
              <p className={`text-5xl font-bold ${getScoreColor(report.overallScore)}`}>
                {report.overallScore}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Based on concept fit, market opportunity, and language arbitrage potential
              </p>
            </div>
            <div className="w-20 h-20 rounded-full border-4 border-gray-700 flex items-center justify-center">
              <div className={`text-2xl font-bold ${getScoreColor(report.overallScore)}`}>
                {report.overallScore >= 75 ? '🎯' : report.overallScore >= 50 ? '📈' : '⚠️'}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Market Trends */}
      {report.marketScan && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('trends')}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-semibold text-white">Market Trends</h3>
              <span className="text-xs text-gray-500">({report.marketScan.trends?.length || 0} identified)</span>
            </div>
            {expandedSections.trends ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.trends && (
            <div className="p-4 pt-0 space-y-3">
              {report.marketScan.trends?.map((trend: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 bg-gray-700/30 rounded-lg p-3"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    trend.momentum === 'rising' ? 'bg-emerald-500' :
                    trend.momentum === 'stable' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{trend.trend}</span>
                      <span className="text-[10px] text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">{trend.category}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Relevance: {trend.relevanceScore}/100 · {trend.regions?.join(', ')}
                    </div>
                  </div>
                  <span className={`text-xs font-medium capitalize ${
                    trend.momentum === 'rising' ? 'text-emerald-400' :
                    trend.momentum === 'stable' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {trend.momentum}
                  </span>
                </motion.div>
              ))}

              {/* Saturated & Emerging */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3">
                  <div className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> Saturated Niches
                  </div>
                  <ul className="space-y-1">
                    {report.marketScan.saturatedNiches?.map((niche: string, i: number) => (
                      <li key={i} className="text-xs text-gray-400">• {niche}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3">
                  <div className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1.5">
                    <Rocket className="w-3 h-3" /> Emerging Formats
                  </div>
                  <ul className="space-y-1">
                    {report.marketScan.emergingFormats?.map((format: string, i: number) => (
                      <li key={i} className="text-xs text-gray-400">• {format}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gap Analysis + Concept Fit */}
      {report.gapAnalysis && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('gaps')}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              <h3 className="text-base font-semibold text-white">Gap Analysis & Concept Fit</h3>
              <span className="text-xs text-gray-500">
                Fit: {report.gapAnalysis.conceptFit?.score || '—'}/100
              </span>
            </div>
            {expandedSections.gaps ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.gaps && (
            <div className="p-4 pt-0 space-y-4">
              {/* Concept Fit Card */}
              {report.gapAnalysis.conceptFit && (
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-3xl font-bold ${getScoreColor(report.gapAnalysis.conceptFit.score)}`}>
                      {report.gapAnalysis.conceptFit.score}
                    </span>
                    <span className="text-sm text-gray-400">Concept-Market Fit</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-emerald-400 font-medium mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Strengths
                      </div>
                      <ul className="space-y-1">
                        {report.gapAnalysis.conceptFit.strengths?.map((s: string, i: number) => (
                          <li key={i} className="text-xs text-gray-300">• {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs text-orange-400 font-medium mb-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Weaknesses
                      </div>
                      <ul className="space-y-1">
                        {report.gapAnalysis.conceptFit.weaknesses?.map((w: string, i: number) => (
                          <li key={i} className="text-xs text-gray-300">• {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {report.gapAnalysis.conceptFit.pivotSuggestions?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <div className="text-xs text-blue-400 font-medium mb-1.5">💡 Pivot Suggestions</div>
                      <ul className="space-y-1">
                        {report.gapAnalysis.conceptFit.pivotSuggestions.map((s: string, i: number) => (
                          <li key={i} className="text-xs text-gray-300">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Content Gaps */}
              <div className="space-y-2">
                {report.gapAnalysis.gaps?.map((gap: any, idx: number) => (
                  <motion.div
                    key={gap.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gray-700/20 border border-gray-700/50 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-white">{gap.niche}</span>
                      <span className={`text-xs font-semibold ${getScoreColor(gap.opportunityScore)}`}>
                        {gap.opportunityScore}/100
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{gap.description}</p>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded ${
                        gap.demandSignal === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                        gap.demandSignal === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        Demand: {gap.demandSignal}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        gap.competitionLevel === 'low' ? 'bg-emerald-500/20 text-emerald-400' :
                        gap.competitionLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        Competition: {gap.competitionLevel}
                      </span>
                      <span className="text-gray-500">{gap.estimatedTAM}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bridge Plan */}
      {report.bridgePlan && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('plan')}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-semibold text-white">Production Plan</h3>
              <span className="text-xs text-gray-500">
                {report.bridgePlan.actions?.length || 0} actions · ~{report.bridgePlan.totalEstimatedCredits} credits
              </span>
            </div>
            {expandedSections.plan ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.plan && (
            <div className="p-4 pt-0 space-y-4">
              {/* Summary */}
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-amber-400 mb-1">{report.bridgePlan.title}</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{report.bridgePlan.summary}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span>⏱ {report.bridgePlan.estimatedTimeline}</span>
                  <span>🎯 Success: {report.bridgePlan.successProbability}%</span>
                  <span>🌐 Languages: {report.bridgePlan.recommendedLanguages?.join(', ')}</span>
                </div>
              </div>

              {/* Actions by Phase */}
              {['blueprint', 'production', 'final-cut', 'premiere'].map(phaseKey => {
                const phaseActions = report.bridgePlan!.actions?.filter(
                  (a: any) => a.phase === phaseKey
                )
                if (!phaseActions?.length) return null

                const phaseColors: Record<string, string> = {
                  blueprint: 'text-blue-400 border-blue-500/30',
                  production: 'text-cyan-400 border-cyan-500/30',
                  'final-cut': 'text-purple-400 border-purple-500/30',
                  premiere: 'text-amber-400 border-amber-500/30',
                }

                return (
                  <div key={phaseKey}>
                    <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${phaseColors[phaseKey]?.split(' ')[0]}`}>
                      {phaseKey.replace('-', ' ')}
                    </h4>
                    <div className="space-y-2">
                      {phaseActions.map((action: any, idx: number) => (
                        <div
                          key={action.id}
                          className={`bg-gray-700/20 border-l-2 ${phaseColors[phaseKey]?.split(' ')[1]} rounded-r-lg p-3`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">{action.action}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              action.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                              action.priority === 'recommended' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {action.priority}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{action.description}</p>
                          <div className="text-[10px] text-gray-500 mt-1.5">
                            ~{action.estimatedCredits} credits
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Credits Used */}
      <div className="text-center text-xs text-gray-500 pt-2">
        Analysis used <span className="text-emerald-400 font-medium">{report.creditsUsed}</span> credits
      </div>
    </div>
  )
}
