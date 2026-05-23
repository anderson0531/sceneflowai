'use client'

import { cn } from '@/lib/utils'

interface SceneAudienceBadgeProps {
  audienceAnalysis?: {
    score?: number
    pacing?: string
    tension?: string
    notes?: string
  } | null
}

export function SceneAudienceBadge({ audienceAnalysis }: SceneAudienceBadgeProps) {
  if (!audienceAnalysis?.score && !audienceAnalysis?.notes) return null

  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-950/30 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="font-semibold text-purple-300 uppercase tracking-wide text-[10px]">
          AI scene insight
        </span>
        {typeof audienceAnalysis.score === 'number' && (
          <span className="text-purple-200 font-medium">Score {audienceAnalysis.score}</span>
        )}
        {audienceAnalysis.pacing && (
          <span className="text-gray-400">Pacing: {audienceAnalysis.pacing}</span>
        )}
        {audienceAnalysis.tension && (
          <span className="text-gray-400">Tension: {audienceAnalysis.tension}</span>
        )}
      </div>
      {audienceAnalysis.notes && (
        <p className="text-gray-400 leading-relaxed line-clamp-3">{audienceAnalysis.notes}</p>
      )}
    </div>
  )
}
