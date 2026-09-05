'use client'

import React from 'react'
import {
  BookOpen,
  Target,
  GitBranch,
  Film,
  ChevronRight,
} from 'lucide-react'
import type {
  EpisodeBlueprintResponse,
  SeriesProductionBible,
  SeriesResonanceAnalysis,
} from '@/types/series'
import {
  computeBibleCompleteness,
  computeContinuityStats,
  computeSlateStats,
  formatResonanceFreshness,
} from '@/lib/series/seriesHealth'

export type SeriesHealthTab = 'overview' | 'episodes' | 'continuity' | 'reference-library'

interface SeriesHeroHealthStripProps {
  bible: SeriesProductionBible | null | undefined
  episodes: EpisodeBlueprintResponse[]
  resonanceAnalysis: SeriesResonanceAnalysis | null
  resonanceAnalyzedAt?: string | null
  onNavigate: (tab: SeriesHealthTab) => void
  onAnalyzeResonance: () => void
}

export function SeriesHeroHealthStrip({
  bible,
  episodes,
  resonanceAnalysis,
  resonanceAnalyzedAt,
  onNavigate,
  onAnalyzeResonance,
}: SeriesHeroHealthStripProps) {
  const bibleHealth = computeBibleCompleteness(bible)
  const continuity = computeContinuityStats(bible)
  const slate = computeSlateStats(episodes)
  const resonance = formatResonanceFreshness(resonanceAnalysis, resonanceAnalyzedAt)

  const chips: Array<{
    id: string
    label: string
    detail: string
    icon: React.ReactNode
    tab?: SeriesHealthTab
    action?: () => void
    accent: string
  }> = [
    {
      id: 'bible',
      label: 'Series Bible',
      detail: `${bibleHealth.filled} of ${bibleHealth.total} fields`,
      icon: <BookOpen className="w-4 h-4" />,
      tab: 'continuity',
      accent: 'amber',
    },
    {
      id: 'resonance',
      label: 'Resonance',
      detail: resonance.label,
      icon: <Target className="w-4 h-4" />,
      action: onAnalyzeResonance,
      accent: resonance.stale ? 'orange' : 'cyan',
    },
    {
      id: 'continuity',
      label: 'Continuity',
      detail: `${continuity.characters} cast · ${continuity.threads} threads · ${continuity.keyEvents} events`,
      icon: <GitBranch className="w-4 h-4" />,
      tab: 'continuity',
      accent: 'purple',
    },
    {
      id: 'slate',
      label: 'Episode Slate',
      detail: `${slate.completed} done · ${slate.inProgress} active · ${slate.blueprint} blueprint`,
      icon: <Film className="w-4 h-4" />,
      tab: 'episodes',
      accent: 'blue',
    },
  ]

  const chipAccent: Record<string, string> = {
    amber: 'text-amber-400',
    orange: 'text-orange-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => (chip.action ? chip.action() : chip.tab && onNavigate(chip.tab))}
          className="group text-left bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 hover:border-gray-600 rounded-xl p-4 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className={chipAccent[chip.accent] ?? 'text-gray-400'}>{chip.icon}</div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
          </div>
          <p className="text-xs font-medium text-gray-400 mt-3">{chip.label}</p>
          <p className="text-sm text-white mt-1">{chip.detail}</p>
        </button>
      ))}
    </div>
  )
}
