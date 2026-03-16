'use client'

import { motion } from 'framer-motion'
import type { ArbitrageHeatMapData, LanguageOpportunity } from '@/lib/visionary/types'
import { useState } from 'react'
import { Globe, TrendingUp, ChevronRight } from 'lucide-react'

interface ArbitrageHeatMapProps {
  data: ArbitrageHeatMapData
  onSelectRegion?: (opportunity: LanguageOpportunity) => void
}

/**
 * ArbitrageHeatMap — Visual grid of language/region opportunities
 * 
 * Renders a card-based heat map where each cell represents a language/region
 * combination, colored by arbitrage score. Clickable to see details.
 */
export function ArbitrageHeatMap({ data, onSelectRegion }: ArbitrageHeatMapProps) {
  const [sortBy, setSortBy] = useState<'arbitrage' | 'demand' | 'revenue'>('arbitrage')

  const sorted = [...data.opportunities].sort((a, b) => {
    switch (sortBy) {
      case 'demand': return b.demandScore - a.demandScore
      case 'revenue': {
        const rv = { high: 3, medium: 2, low: 1 }
        return (rv[b.revenuePotential] || 0) - (rv[a.revenuePotential] || 0)
      }
      default: return b.arbitrageScore - a.arbitrageScore
    }
  })

  const getHeatColor = (score: number) => {
    if (score >= 80) return 'from-emerald-500/30 to-emerald-600/20 border-emerald-500/40'
    if (score >= 60) return 'from-green-500/25 to-green-600/15 border-green-500/30'
    if (score >= 40) return 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/25'
    if (score >= 20) return 'from-orange-500/15 to-orange-600/10 border-orange-500/20'
    return 'from-gray-500/10 to-gray-600/5 border-gray-500/15'
  }

  const getRevBadge = (level: string) => {
    switch (level) {
      case 'high': return 'bg-emerald-500/20 text-emerald-400'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-semibold text-white">Language Arbitrage Map</h3>
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
          {(['arbitrage', 'demand', 'revenue'] as const).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                sortBy === key
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {key === 'arbitrage' ? 'Opportunity' : key === 'demand' ? 'Demand' : 'Revenue'}
            </button>
          ))}
        </div>
      </div>

      {/* Top Regions Summary */}
      {data.topRegions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.topRegions.slice(0, 3).map((region, idx) => (
            <motion.div
              key={region.region}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-gray-800/60 border border-gray-700 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm font-medium text-white">{region.regionName}</span>
              </div>
              <div className="text-xs text-gray-400">
                Score: <span className="text-emerald-400 font-semibold">{region.totalArbitrageScore}</span>
                <span className="mx-1.5">·</span>
                {region.topLanguages.slice(0, 3).join(', ')}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((opp, idx) => (
          <motion.button
            key={`${opp.language}-${opp.region}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03 }}
            onClick={() => onSelectRegion?.(opp)}
            className={`bg-gradient-to-br ${getHeatColor(opp.arbitrageScore)} border rounded-lg p-3 text-left hover:scale-[1.02] transition-all group`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-white">{opp.languageName}</span>
                <span className="text-xs text-gray-400 ml-1.5">({opp.regionName})</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div>
                <span className="text-gray-500">Arb</span>
                <span className="ml-1 font-semibold text-emerald-400">{opp.arbitrageScore}</span>
              </div>
              <div>
                <span className="text-gray-500">Demand</span>
                <span className="ml-1 font-semibold text-blue-400">{opp.demandScore}</span>
              </div>
              <div>
                <span className="text-gray-500">Supply</span>
                <span className="ml-1 font-semibold text-orange-400">{opp.supplyScore}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-gray-500">{opp.estimatedAudience}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRevBadge(opp.revenuePotential)}`}>
                {opp.revenuePotential}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Global Insight */}
      {data.globalInsight && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 mt-2">
          <p className="text-sm text-emerald-300/90 leading-relaxed">{data.globalInsight}</p>
        </div>
      )}
    </div>
  )
}
