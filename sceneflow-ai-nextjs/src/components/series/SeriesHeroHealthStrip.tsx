'use client'

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
    tab?: SeriesHealthTab
    action?: () => void
  }> = [
    {
      id: 'bible',
      label: 'Series Bible',
      detail: `${bibleHealth.filled} of ${bibleHealth.total} fields`,
      tab: 'continuity',
    },
    {
      id: 'resonance',
      label: 'Resonance',
      detail: resonance.label,
      action: onAnalyzeResonance,
    },
    {
      id: 'continuity',
      label: 'Continuity',
      detail: `${continuity.characters} cast · ${continuity.threads} threads · ${continuity.keyEvents} events`,
      tab: 'continuity',
    },
    {
      id: 'slate',
      label: 'Episode Slate',
      detail: `${slate.completed} done · ${slate.inProgress} active · ${slate.blueprint} blueprint`,
      tab: 'episodes',
    },
  ]

  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => (chip.action ? chip.action() : chip.tab && onNavigate(chip.tab))}
          className="rounded-xl border border-white/10 bg-gray-900/50 p-4 text-left transition-colors hover:bg-gray-900"
        >
          <p className="text-xs font-medium text-gray-400">{chip.label}</p>
          <p className="mt-1 text-sm text-white">{chip.detail}</p>
        </button>
      ))}
    </div>
  )
}
