'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Target, ChevronDown, ChevronUp, Sparkles, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { RadarChart } from '@/components/RadarChart'
import { WeaknessBridge } from '@/components/WeaknessBridge'

interface OpportunityReportProps {
  report: VisionaryReport
}

/**
 * OpportunityReport — Full analysis summary view
 * 
 * Renders the complete Visionary Engine report with:
 * - Market scan trends
 * - Gap analysis with concept fit
 * - Bridge plan action items
 */
export function OpportunityReport({ report, marketScan, gapAnalysis, overallScore }: OpportunityReportProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trends: false,
    gaps: false,
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
      {typeof overallScore === 'number' && (
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
      {marketScan && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('trends')}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-semibold text-white">Market Trends</h3>
              <span className="text-xs text-gray-500">({marketScan.trends?.length || 0} identified)</span>
            </div>
            {expandedSections.trends ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.trends && (
            <div className="p-4 pt-0 space-y-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.marketScan.trends.map((trend: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-slate-900/50 p-3 rounded-lg border border-white/10"
                >
                  <div className="w-full h-24 bg-gray-800 rounded-md mb-2 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-white">{trend.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      trend.heat === 'Rising' ? 'bg-emerald-500/20 text-emerald-400' :
                      trend.heat === 'Steady' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>{trend.heat}</span>
                  </div>
                  <p className="text-sm text-gray-400">{trend.description}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gap Analysis & Concept Fit */}
      {report.gapAnalysis && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('gaps')}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              <h3 className="text-base font-semibold text-white">Gap Analysis & Concept Fit</h3>
              <span className="text-xs text-gray-500">({gapAnalysis.gaps?.length || 0} gaps identified)</span>
            </div>
            {expandedSections.gaps ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.gaps && (
            <div className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <RadarChart data={report.radarData} />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Strengths & Weaknesses</h4>
                  {report.gapAnalysis.map((item, i) => (
                    item.type === 'weakness' ? (
                      <WeaknessBridge key={i} weakness={item.label} fix={item.strategicPivot || 'Consult the SceneFlow Creator Lab for a custom pivot strategy.'} />
                    ) : (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-green-500/10 bg-green-500/5">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-1 shrink-0" />
                        <span className="text-sm text-gray-300">{item.label}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
