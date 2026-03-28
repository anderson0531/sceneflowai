'use client'

import { motion } from 'framer-motion'
import { Map, Zap } from 'lucide-react'
import type { LanguageOpportunity, ArbitrageMap } from '@/lib/visionary/types'

interface ArbitrageHeatMapProps {
  data: ArbitrageMap
  onSelectRegion: (region: LanguageOpportunity) => void
}

export function ArbitrageHeatMap({ data, onSelectRegion }: ArbitrageHeatMapProps) {
  const opportunities = data?.opportunities || [];

  return (
    <div className="bg-gray-800/60 border border-purple-500/30 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Map className="w-5 h-5 text-purple-400" />
        Global Opportunity Grid
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {opportunities.map((opp, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelectRegion(opp)}
            className="border p-4 rounded-xl bg-slate-900 cursor-pointer hover:bg-slate-800/70 hover:border-purple-400/50 transition-colors"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold">{opp.regionName} ({opp.languageName})</h3>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/50 text-sm">
                Score: {opp.arbitrageScore}
              </span>
            </div>
            <p className="text-slate-400 italic mb-2 text-sm">"{opp.optimizedTitle}"</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800 p-2 rounded">Demand: {opp.demandScore}</div>
              <div className="bg-slate-800 p-2 rounded">Revenue: {opp.revenuePotential}</div>
            </div>
            <p className="mt-4 text-xs text-slate-300">{opp.culturalNotes}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
