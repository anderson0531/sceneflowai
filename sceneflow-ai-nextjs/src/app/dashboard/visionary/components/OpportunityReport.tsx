'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
} from 'lucide-react'
import { RadarChart } from '@/components/RadarChart'
import type { VisionaryReport } from '@/lib/visionary/types'

interface OpportunityReportProps {
  report: VisionaryReport
}

/**
 * OpportunityReport — Market analysis results and recommended structure.
 *
 * Sections:
 *  1. Viability Score hero
 *  2. Market Trends (collapsible)
 *  3. Recommended Structure — replaces raw "gap analysis" with actionable guidance
 */
export function OpportunityReport({ report }: OpportunityReportProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trends: true,
    structure: true,
  })

  const toggle = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  const marketScan = report.marketScan
  const gapAnalysis = report.gapAnalysis
  const arbitrageMap = report.arbitrageMap

  const overallScore = useMemo(() => {
    if (report.overallScore != null) return report.overallScore
    const fitScore = gapAnalysis?.conceptFit?.score ?? 0
    const opps = arbitrageMap?.opportunities ?? []
    const avgArbitrage = opps.length > 0
      ? opps.reduce((s: number, o: any) => s + (o.arbitrageScore ?? 0), 0) / opps.length
      : 0
    return Math.round(fitScore * 0.6 + avgArbitrage * 0.4)
  }, [report.overallScore, gapAnalysis, arbitrageMap])

  const radarData = useMemo(() => {
    if (report.radarData?.length) return report.radarData
    const fit = gapAnalysis?.conceptFit
    if (!fit) return []
    const opps = arbitrageMap?.opportunities ?? []
    const avgArbitrage = opps.length > 0
      ? Math.round(opps.reduce((s: number, o: any) => s + (o.arbitrageScore ?? 0), 0) / opps.length)
      : 0
    return [
      { label: 'Concept Fit', value: fit.score ?? 0 },
      { label: 'Market Demand', value: avgArbitrage },
      { label: 'Gap Opportunity', value: Math.min(100, (gapAnalysis?.gaps?.length ?? 0) * 20) },
      { label: 'Strengths', value: Math.min(100, (fit.strengths?.length ?? 0) * 25) },
      { label: 'Global Reach', value: Math.min(100, (opps.length ?? 0) * 12) },
    ]
  }, [report.radarData, gapAnalysis, arbitrageMap])

  const trends = useMemo(() => {
    const raw = marketScan?.trends ?? []
    return raw.map((t: any) => ({
      title: t.title || t.category || t.trend || 'Trend',
      description: t.description || t.trend || '',
      heat: t.heat || (t.momentum === 'rising' ? 'Rising' : t.momentum === 'declining' ? 'Niche' : 'Steady'),
      relevanceScore: t.relevanceScore,
    }))
  }, [marketScan])

  const scoreColor = (s: number) => s >= 75 ? 'text-emerald-400' : s >= 50 ? 'text-yellow-400' : s >= 25 ? 'text-orange-400' : 'text-red-400'
  const scoreBg = (s: number) => s >= 75 ? 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/30' : s >= 50 ? 'from-yellow-500/15 to-yellow-600/5 border-yellow-500/30' : 'from-orange-500/15 to-orange-600/5 border-orange-500/30'

  const conceptFit = gapAnalysis?.conceptFit
  const gaps = gapAnalysis?.gaps ?? []

  return (
    <div className="space-y-6">
      {/* Viability Score */}
      {typeof overallScore === 'number' && overallScore > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br ${scoreBg(overallScore)} border rounded-2xl p-6`}
        >
          <div className="flex flex-col gap-8">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Overall Viability Score
              </h3>
              <p className={`text-5xl font-bold ${scoreColor(overallScore)}`}>{overallScore}</p>
              <p className="text-sm text-gray-400 mt-2">
                Based on concept fit, market opportunity, and global reach potential
              </p>
            </div>
            {radarData.length > 0 && (
              <div className="w-full flex flex-col items-center gap-4">
                <RadarChart data={radarData} size={400} showScores />
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 w-full max-w-3xl">
                  {radarData.map((axis) => (
                    <div
                      key={axis.label}
                      className="rounded-xl bg-gray-950/40 border border-white/10 px-2 py-2.5 text-center"
                    >
                      <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider leading-snug">
                        {axis.label}
                      </p>
                      <p className={`text-lg sm:text-xl font-bold tabular-nums mt-1 ${scoreColor(Math.round(axis.value))}`}>
                        {Math.round(Math.min(100, Math.max(0, axis.value)))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Market Trends */}
      {trends.length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          <button onClick={() => toggle('trends')} className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-800/40 transition-colors">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-semibold text-white">Market Trends</h3>
              <span className="text-xs text-gray-500">({trends.length} identified)</span>
            </div>
            {expandedSections.trends ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.trends && (
            <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
              {trends.map((t: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-slate-900/50 p-3 rounded-lg border border-white/5"
                >
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-medium text-white text-sm">{t.title}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      t.heat === 'Rising' ? 'bg-emerald-500/20 text-emerald-400' :
                      t.heat === 'Steady' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>{t.heat}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{t.description}</p>
                  {typeof t.relevanceScore === 'number' && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${t.relevanceScore}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500 tabular-nums">{t.relevanceScore}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommended Structure (replaces raw Gap Analysis) */}
      {conceptFit && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          <button onClick={() => toggle('structure')} className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-800/40 transition-colors">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-semibold text-white">Recommended Structure</h3>
              <span className="text-xs text-gray-500">(fit score: {conceptFit.score ?? '—'})</span>
            </div>
            {expandedSections.structure ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.structure && (
            <div className="p-4 pt-0 space-y-4">
              {/* Strengths */}
              {conceptFit.strengths?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Strengths to Leverage
                  </h4>
                  <div className="space-y-1.5">
                    {conceptFit.strengths.map((s: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-gray-300 leading-relaxed">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations (from weaknesses + pivot suggestions) */}
              {(conceptFit.weaknesses?.length > 0 || conceptFit.pivotSuggestions?.length > 0) && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Optimization Recommendations
                  </h4>
                  <div className="space-y-1.5">
                    {conceptFit.pivotSuggestions?.map((suggestion: string, i: number) => (
                      <div key={`p-${i}`} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-gray-300 leading-relaxed">{suggestion}</span>
                      </div>
                    ))}
                    {conceptFit.weaknesses?.map((w: string, i: number) => (
                      <div key={`w-${i}`} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-gray-300 leading-relaxed">{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Niche Opportunities */}
              {gaps.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Niche Opportunities
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {gaps.map((gap: any, i: number) => (
                      <div key={gap.id || i} className="bg-slate-900/50 p-3 rounded-lg border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                          <h5 className="font-medium text-white text-sm">{gap.niche}</h5>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            gap.opportunityScore >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                            gap.opportunityScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>{gap.opportunityScore}/100</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{gap.description}</p>
                        {gap.targetAudience && (
                          <p className="text-[10px] text-gray-500 mt-1.5">Audience: {gap.targetAudience}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
