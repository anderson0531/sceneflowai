'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface OpportunityReportProps {
  marketScan?: any
  gapAnalysis?: any
  overallScore?: number
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
            <div className="p-4 pt-0 space-y-3">
              {marketScan.trends.map((trend: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-slate-900/50 p-3 rounded-lg border border-white/10"
                >
                  <h4 className="font-semibold text-white">{trend.category}</h4>
                  <p className="text-sm text-gray-400">{trend.trend}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gap Analysis & Concept Fit */}
      {gapAnalysis && (
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
              {/* Concept Fit Score */}
              {gapAnalysis.conceptFit && (
                <div className={`my-4 bg-gradient-to-br ${getScoreBg(gapAnalysis.conceptFit.score)} border rounded-lg p-4`}>
                  <h4 className="font-semibold text-white">Concept-Market Fit Score: <span className={getScoreColor(gapAnalysis.conceptFit.score)}>{gapAnalysis.conceptFit.score}</span></h4>
                  <div className="mt-2 text-sm text-gray-300">
                    <p><strong>Strengths:</strong> {gapAnalysis.conceptFit.strengths.join(', ')}</p>
                    <p><strong>Weaknesses:</strong> {gapAnalysis.conceptFit.weaknesses.join(', ')}</p>
                  </div>
                </div>
              )}
              {/* Gap Cards */}
              {gapAnalysis.gaps.map((gap: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-slate-900/50 p-3 rounded-lg border border-white/10"
                >
                  <h4 className="font-semibold text-white">{gap.niche}</h4>
                  <p className="text-sm text-gray-400">{gap.description}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
