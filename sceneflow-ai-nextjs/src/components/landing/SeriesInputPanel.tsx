'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  getExampleSeriesInput,
  type ExampleEpisodeOneHighlight,
  type ExampleSeriesCastMember,
} from '@/config/landing/exampleSeriesInputs'

type SeriesPanelView = 'bible' | 'cast' | 'episode1' | 'season'

type LocalizedSeriesInput = {
  showTitle: string
  format: string
  genre: string
  artStyle: string
  duration: string
  continuityLock: string
  unitLabel: string
  artLock: string
  logline: string
  seriesSynopsis: string
  cast: readonly ExampleSeriesCastMember[]
  episode1Synopsis: ExampleEpisodeOneHighlight
  episodes: ReadonlyArray<{
    number: number | string
    title: string
    duration: string
    synopsis: string
  }>
}

type SeriesPanelTranslation = {
  headerLabel?: string
  bibleTab?: string
  castTab?: string
  episode1Tab?: string
  seasonTab?: string
  formatLabel?: string
  durationLabel?: string
  artStyleLabel?: string
  continuityLockLabel?: string
  loglineLabel?: string
  synopsisLabel?: string
  lockedCastHeading?: string
  inputs?: Record<string, LocalizedSeriesInput>
}

export function SeriesInputPanel({ cardId }: { cardId: string }) {
  const t = useTranslations('productionShowcase')
  const panelCopy = t.has('seriesPanel')
    ? (t.raw('seriesPanel') as SeriesPanelTranslation)
    : undefined
  const fallbackSeries = getExampleSeriesInput(cardId)
  const series: LocalizedSeriesInput | null =
    panelCopy?.inputs?.[cardId] ?? fallbackSeries
  const [activeView, setActiveView] = useState<SeriesPanelView>('bible')
  if (!series) return null

  const views: Array<{ id: SeriesPanelView; label: string }> = [
    { id: 'bible', label: panelCopy?.bibleTab || 'Series Bible' },
    { id: 'cast', label: `${panelCopy?.castTab || 'Locked Cast'} (${series.cast.length})` },
    { id: 'episode1', label: panelCopy?.episode1Tab || 'Ep. 1 & Ch. 1' },
    { id: 'season', label: `${panelCopy?.seasonTab || 'Season'} (${series.episodes.length})` },
  ]

  return (
    <div className="pointer-events-auto mb-4 rounded-xl border border-white/10 bg-black/45 p-3.5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
            {panelCopy?.headerLabel || 'Series Bible & Episode 1'}
          </span>
          <span className="text-white/25">·</span>
          <span className="text-sm font-bold text-white">{series.showTitle}</span>
        </div>
        <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-200">
          {series.genre}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {views.map((view) => {
          const isSelected = activeView === view.id
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
              aria-pressed={isSelected}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                  : 'bg-slate-900/70 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {view.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-3 text-sm text-gray-200">
        {activeView === 'bible' && (
          <>
            <dl className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-slate-900/70 p-2.5 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {panelCopy?.formatLabel || 'Format'}
                </dt>
                <dd className="mt-0.5 font-medium text-white">{series.format}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {panelCopy?.durationLabel || 'Duration'}
                </dt>
                <dd className="mt-0.5 font-medium text-white">{series.duration}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {panelCopy?.artStyleLabel || 'Art Style'}
                </dt>
                <dd className="mt-0.5 text-slate-200">{series.artStyle}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {panelCopy?.continuityLockLabel || 'Continuity Lock'}
                </dt>
                <dd className="mt-0.5 text-slate-200">{series.continuityLock}</dd>
              </div>
            </dl>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                {panelCopy?.loglineLabel || 'Logline'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white italic">
                “{series.logline}”
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-900/60 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                {panelCopy?.synopsisLabel || 'Series Synopsis & Visual Bible'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-200">{series.seriesSynopsis}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{series.artLock}</p>
            </div>
          </>
        )}

        {activeView === 'cast' && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {panelCopy?.lockedCastHeading || 'Locked Cast & Principal Continuity'} ({series.cast.length})
            </p>
            <ul className="space-y-1.5">
              {series.cast.map((member) => (
                <li
                  key={member.name}
                  className="rounded-lg border border-white/10 bg-slate-900/55 p-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-1.5">
                    <span className="text-xs font-semibold text-white">{member.name}</span>
                    <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200">
                      {member.role}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-300">{member.descriptor}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeView === 'episode1' && (
          <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                {series.episode1Synopsis.episodeLabel}
              </p>
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-200">
                {series.episode1Synopsis.duration}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-white">
              {series.episode1Synopsis.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-200">
              {series.episode1Synopsis.synopsis}
            </p>
            <div className="mt-2 rounded-md border border-white/10 bg-black/40 p-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[11px] font-semibold text-amber-300">
                  {series.episode1Synopsis.chapter1Title}
                </span>
                <span className="text-[10px] font-medium text-amber-200/90">
                  {series.episode1Synopsis.chapter1Duration}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-300">
                {series.episode1Synopsis.chapter1Synopsis}
              </p>
            </div>
          </div>
        )}

        {activeView === 'season' && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {series.unitLabel}
            </p>
            <ol className="space-y-2">
              {series.episodes.map((episode) => (
                <li
                  key={episode.number}
                  className="rounded-lg border border-white/5 bg-slate-900/50 p-2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-white">
                      {episode.number}. {episode.title}
                    </p>
                    <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200">
                      {episode.duration}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-300">{episode.synopsis}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
