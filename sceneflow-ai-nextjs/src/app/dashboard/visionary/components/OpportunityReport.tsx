'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Target, ChevronDown, ChevronUp, Sparkles, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { RadarChart } from '@/components/RadarChart'
import { WeaknessBridge } from '@/components/WeaknessBridge'
import type { VisionaryReport } from '@/lib/visionary/types'

interface OpportunityReportProps {
  report: VisionaryReport
}

/**
 * OpportunityReport — Full analysis summary view
 *
 * Derives all display data from the single `report` prop which contains
 * the raw Gemini output from phases 1-3.
 */
export function OpportunityReport({ report }: OpportunityReportProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trends: false,
    gaps: false,
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const marketScan = report.marketScan
  const gapAnalysis = report.gapAnalysis
  const arbitrageMap = report.arbitrageMap

  const overallScore = useMemo(() => {
    if (report.overallScore != null) return report.overallScore
    const fitScore = gapAnalysis?.conceptFit?.score ?? 0
    const opps = arbitrageMap?.opportunities ?? []
    const avgArbitrage = opps.length > 0
      ? opps.reduce((s: number, o: { arbitrageScore?: number }) => s + (o.arbitrageScore ?? 0), 0) / opps.length
      : 0
    return Math.round(fitScore * 0.6 + avgArbitrage * 0.4)
  }, [report.overallScore, gapAnalysis, arbitrageMap])

  const radarData = useMemo(() => {
    if (report.radarData?.length) return report.radarData
    const fit = gapAnalysis?.conceptFit
    if (!fit) return []
    const opps = arbitrageMap?.opportunities ?? []
    const avgArbitrage = opps.length > 0
      ? Math.round(opps.reduce((s: number, o: { arbitrageScore?: number }) => s + (o.arbitrageScore ?? 0), 0) / opps.length)
      : 0
    return [
      { label: 'Concept Fit', value: fit.score ?? 0 },
      { label: 'Market Demand', value: avgArbitrage },
      { label: 'Gap Opportunity', value: Math.min(100, (gapAnalysis?.gaps?.length ?? 0) * 20) },
      { label: 'Strengths', value: Math.min(100, (fit.strengths?.length ?? 0) * 25) },
      { label: 'Global Reach', value: Math.min(100, (opps.length ?? 0) * 12) },
    ]
  }, [report.radarData, gapAnalysis, arbitrageMap])

  // Gemini trends use `category`/`trend`/`momentum` — normalise for display
  const trends = useMemo(() => {
    const raw = marketScan?.trends ?? []
    return raw.map((t: any) => ({
      title: t.title || t.category || t.trend || 'Trend',
      description: t.description || t.trend || '',
      heat: t.heat || (t.momentum === 'rising' ? 'Rising' : t.momentum === 'declining' ? 'Niche' : 'Steady'),
      relevanceScore: t.relevanceScore,
    }))
  }, [marketScan])

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

  const conceptFit = gapAnalysis?.conceptFit
  const gaps = gapAnalysis?.gaps ?? []

  return (
    <div className="space-y-6">
      {/* Overall Score Hero */}
      {typeof overallScore === 'number' && overallScore > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br ${getScoreBg(overallScore)} border rounded-2xl p-6`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">
                Overall Viability Score
              </h3>
              <p className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Based on concept fit, market opportunity, and language arbitrage potential
              </p>
            </div>
            <div className="w-20 h-20 rounded-full border-4 border-gray-700 flex items-center justify-center">
              <div className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore >= 75 ? '🎯' : overallScore >= 50 ? '📈' : '⚠️'}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Market Trends */}
      {trends.length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('trends')}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-semibold text-white">Market Trends</h3>
              <span className="text-xs text-gray-500">({trends.length} identified)</span>
            </div>
            {expandedSections.trends ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.trends && (
            <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
              {trends.map((trend: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-slate-900/50 p-3 rounded-lg border border-white/10"
                >
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-semibold text-white">{trend.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      trend.heat === 'Rising' ? 'bg-emerald-500/20 text-emerald-400' :
                      trend.heat === 'Steady' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>{trend.heat}</span>
                  </div>
                  <p className="text-sm text-gray-400">{trend.description}</p>
                  {typeof trend.relevanceScore === 'number' && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${trend.relevanceScore}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{trend.relevanceScore}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gap Analysis & Concept Fit */}
      {conceptFit && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('gaps')}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              <h3 className="text-base font-semibold text-white">Gap Analysis & Concept Fit</h3>
              <span className="text-xs text-gray-500">({gaps.length} gaps, fit: {conceptFit.score ?? '—'})</span>
            </div>
            {expandedSections.gaps ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.gaps && (
            <div className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {radarData.length > 0 && (
                  <div>
                    <RadarChart data={radarData} />
                  </div>
                )}
                <div className="space-y-2">
                  <h4 className="font-semibold text-white mb-2">Strengths & Weaknesses</h4>
                  {conceptFit.strengths?.map((s: string, i: number) => (
                    <div key={`s-${i}`} className="flex items-start gap-3 p-3 rounded-lg border border-green-500/10 bg-green-500/5">
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-1 shrink-0" />
                      <span className="text-sm text-gray-300">{s}</span>
                    </div>
                  ))}
                  {conceptFit.weaknesses?.map((w: string, i: number) => (
                    <WeaknessBridge
                      key={`w-${i}`}
                      weakness={w}
                      fix={conceptFit.pivotSuggestions?.[i] || 'Consider a creative pivot to address this gap.'}
                    />
                  ))}
                </div>
              </div>

              {/* Gap details */}
              {gaps.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-gray-700">
                  <h4 className="font-semibold text-white text-sm">Identified Gaps</h4>
                  {gaps.map((gap: any, i: number) => (
                    <div key={gap.id || i} className="bg-slate-900/50 p-3 rounded-lg border border-white/10">
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="font-medium text-white text-sm">{gap.niche}</h5>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          gap.opportunityScore >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                          gap.opportunityScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {gap.opportunityScore}/100
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{gap.description}</p>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="px-2 py-0.5 bg-gray-800 rounded text-gray-300">Demand: {gap.demandSignal}</span>
                        <span className="px-2 py-0.5 bg-gray-800 rounded text-gray-300">Competition: {gap.competitionLevel}</span>
                        {gap.estimatedTAM && <span className="px-2 py-0.5 bg-gray-800 rounded text-gray-300">{gap.estimatedTAM}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
