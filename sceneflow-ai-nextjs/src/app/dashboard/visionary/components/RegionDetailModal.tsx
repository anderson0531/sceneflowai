'use client'

import { motion } from 'framer-motion'
import type { LanguageOpportunity } from '@/lib/visionary/types'
import { X, Globe, TrendingUp, Users, DollarSign, BookOpen } from 'lucide-react'

interface RegionDetailModalProps {
  opportunity: LanguageOpportunity
  onClose: () => void
}

/**
 * RegionDetailModal — Deep-dive view for a single language/region opportunity
 * 
 * Shows supply/demand bars, audience estimates, revenue potential,
 * and cultural adaptation notes.
 */
export function RegionDetailModal({ opportunity, onClose }: RegionDetailModalProps) {
  const opp = opportunity

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{opp.languageName}</h3>
              <p className="text-sm text-gray-400">{opp.regionName} ({opp.region})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-400">{opp.arbitrageScore}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Arbitrage</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <Users className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-400">{opp.demandScore}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Demand</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <DollarSign className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-amber-400">{opp.supplyScore}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Supply</div>
          </div>
        </div>

        {/* Supply vs Demand Bars */}
        <div className="space-y-3 mb-6">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Content Supply</span>
              <span className="text-orange-400">{opp.supplyScore}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{ width: `${opp.supplyScore}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Audience Demand</span>
              <span className="text-blue-400">{opp.demandScore}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${opp.demandScore}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Opportunity Gap</span>
              <span className="text-emerald-400">{opp.arbitrageScore}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                style={{ width: `${opp.arbitrageScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Users className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Est. Audience</div>
              <div className="text-sm text-white">{opp.estimatedAudience}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Revenue Potential</div>
              <div className={`text-sm font-medium capitalize ${
                opp.revenuePotential === 'high' ? 'text-emerald-400' :
                opp.revenuePotential === 'medium' ? 'text-yellow-400' :
                'text-gray-400'
              }`}>
                {opp.revenuePotential}
              </div>
            </div>
          </div>

          {opp.culturalNotes && (
            <div className="flex items-start gap-3">
              <BookOpen className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Cultural Notes</div>
                <p className="text-sm text-gray-300 leading-relaxed">{opp.culturalNotes}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
