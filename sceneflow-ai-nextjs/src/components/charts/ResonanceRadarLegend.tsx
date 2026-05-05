'use client'

import React from 'react'
import type { ResonanceAxis } from '@/lib/types/audienceResonance'

export function ResonanceRadarLegend({ axes }: { axes: ResonanceAxis[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {axes.map((axis) => {
        const scoreColor =
          axis.score >= 80
            ? 'text-emerald-400'
            : axis.score >= 60
              ? 'text-cyan-400'
              : axis.score >= 40
                ? 'text-amber-400'
                : 'text-red-400'

        return (
          <div
            key={axis.id}
            className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50"
          >
            <span className="text-xs text-gray-400 truncate mr-2">{axis.label}</span>
            <span className={`text-sm font-bold ${scoreColor}`}>{axis.score}</span>
          </div>
        )
      })}
    </div>
  )
}
