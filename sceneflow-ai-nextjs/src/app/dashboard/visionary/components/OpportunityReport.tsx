'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface OpportunityReportProps {
  marketScan: any;
  gapAnalysis: any;
}

/**
 * OpportunityReport — Full analysis summary view
 * 
 * Renders the complete Visionary Engine report with:
 * - Market scan trends
 * - Gap analysis with concept fit
 */
export function OpportunityReport({ marketScan, gapAnalysis }: OpportunityReportProps) {
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
