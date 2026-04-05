'use client'

import { motion } from 'framer-motion'
import { Map, CheckCircle2, Info } from 'lucide-react'
import type { LanguageOpportunity, ArbitrageMap } from '@/lib/visionary/types'

interface ArbitrageHeatMapProps {
  data: ArbitrageMap
  onSelectRegion: (region: LanguageOpportunity) => void
  selectedMarkets?: LanguageOpportunity[]
  onToggleMarket?: (opp: LanguageOpportunity) => void
  /** When set, analysis was scoped to these ISO region codes only */
  targetRegionCodes?: string[]
}

function marketKey(opp: LanguageOpportunity) {
  return `${opp.language}-${opp.region}`
}

export function ArbitrageHeatMap({ data, onSelectRegion, selectedMarkets, onToggleMarket, targetRegionCodes }: ArbitrageHeatMapProps) {
  const opportunities = data?.opportunities || [];
  const selectable = !!onToggleMarket
  const selectedKeys = new Set((selectedMarkets ?? []).map(marketKey))
  const scoped = (targetRegionCodes ?? []).filter(Boolean).length > 0

  return (
    <div className="bg-gray-800/60 border border-purple-500/30 rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Map className="w-5 h-5 text-purple-400" />
          {scoped ? 'Target market scores' : 'Global Opportunity Grid'}
        </h3>
        {selectable && selectedKeys.size > 0 && (
          <span className="text-xs text-purple-300 bg-purple-500/15 px-2.5 py-1 rounded-full">
            {selectedKeys.size} market{selectedKeys.size !== 1 ? 's' : ''} selected
          </span>
        )}
      </div>
      {scoped && (
        <div className="flex items-start gap-1.5 mb-3 text-xs text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
          <span>
            Analysis is limited to your selected regions ({targetRegionCodes?.join(', ')}). Scores and briefs apply to these markets only; concept generation uses your checked markets below.
          </span>
        </div>
      )}
      {selectable && (
        <div className="flex items-start gap-1.5 mb-4 text-xs text-gray-500">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
          <span>Select target markets for concept generation. These influence cultural themes in your storyline.</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {opportunities.map((opp, i) => {
          const isSelected = selectedKeys.has(marketKey(opp))
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative border p-4 rounded-xl bg-slate-900 cursor-pointer transition-all ${
                isSelected
                  ? 'border-emerald-500/60 ring-1 ring-emerald-500/30 bg-emerald-500/5'
                  : 'hover:bg-slate-800/70 hover:border-purple-400/50'
              }`}
            >
              {selectable && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleMarket(opp) }}
                  className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-700 border border-gray-600 text-gray-500 hover:border-emerald-500/50'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-4 h-4" />}
                </button>
              )}
              <div onClick={() => onSelectRegion(opp)}>
                <div className="flex justify-between items-center mb-2 pr-8">
                  <h3 className="text-xl font-bold">{opp.regionName} ({opp.languageName})</h3>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/50 text-sm">
                    Score: {opp.arbitrageScore}
                  </span>
                </div>
                <p className="text-slate-400 italic mb-2 text-sm">&quot;{opp.optimizedTitle}&quot;</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800 p-2 rounded">Demand: {opp.demandScore}</div>
                  <div className="bg-slate-800 p-2 rounded">Revenue: {opp.revenuePotential}</div>
                </div>
                <p className="mt-4 text-xs text-slate-300">{opp.culturalNotes}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
