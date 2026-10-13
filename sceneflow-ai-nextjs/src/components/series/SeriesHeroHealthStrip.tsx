'use client'

import type {
  EpisodeBlueprintResponse,
  SeriesProductionBible,
  SeriesResonanceAnalysis,
} from '@/types/series'
import {
  computeContinuityStats,
  computeSlateStats,
} from '@/lib/series/seriesHealth'
import { SeriesGreenlightGauge } from '@/components/series/SeriesGreenlightGauge'

export type SeriesHealthTab = 'overview' | 'episodes' | 'continuity' | 'reference-library'

interface SeriesHeroHealthStripProps {
  bible: SeriesProductionBible | null | undefined
  episodes: EpisodeBlueprintResponse[]
  resonanceAnalysis: SeriesResonanceAnalysis | null
  onNavigate: (tab: SeriesHealthTab) => void
  onAnalyzeResonance: () => void
}

export function SeriesHeroHealthStrip({
  bible,
  episodes,
  resonanceAnalysis,
  onNavigate,
  onAnalyzeResonance,
}: SeriesHeroHealthStripProps) {
  const continuity = computeContinuityStats(bible)
  const slate = computeSlateStats(episodes)

  const resonanceScore = resonanceAnalysis?.greenlightScore?.score

  const chips: Array<{
    id: string
    label: string
    detail: string
    tab?: SeriesHealthTab
    action?: () => void
    score?: number
  }> = [
    {
      id: 'episodes',
      label: 'Active Episodes',
      detail: `${slate.inProgress} of ${slate.total}`,
      tab: 'episodes',
    },
    {
      id: 'resonance',
      label: 'Audience Resonance',
      detail: '',
      score: resonanceScore,
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
          className="rounded-xl border border-gray-600 bg-gray-900/50 p-4 text-left transition-colors hover:bg-gray-900"
        >
          <p className="text-xs font-medium text-gray-400">{chip.label}</p>
          {chip.id === 'resonance' ? (
            chip.score != null ? (
              <div className="mt-2 flex justify-center">
                <SeriesGreenlightGauge score={chip.score} size="compact" />
              </div>
            ) : (
              <p className="mt-1 text-sm font-bold text-white">Not analyzed</p>
            )
          ) : (
            <p className="mt-1 text-sm text-white">{chip.detail}</p>
          )}
        </button>
      ))}
    </div>
  )
}
