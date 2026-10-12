'use client'

import { getExampleSeriesInput } from '@/config/landing/exampleSeriesInputs'

export function SeriesInputPanel({ cardId }: { cardId: string }) {
  const series = getExampleSeriesInput(cardId)
  if (!series) return null

  return (
    <div className="pointer-events-auto mb-4 rounded-xl border border-white/10 bg-black/40 p-3">
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Series input</p>
      </div>
      <div className="max-h-52 space-y-3 overflow-y-auto pr-1 text-sm text-gray-200">
        <p className="font-semibold text-white">{series.showTitle}</p>
        <p className="text-xs leading-relaxed text-gray-300">{series.artLock}</p>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Storyline</p>
          <p className="mt-1 leading-relaxed">{series.logline}</p>
          <p className="mt-2 leading-relaxed text-gray-300">{series.storyline}</p>
        </div>
        <ol className="space-y-2">
          {series.episodes.map((episode) => (
            <li key={episode.number}>
              <p className="font-medium text-white">
                {episode.number}. {episode.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-300">{episode.synopsis}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
