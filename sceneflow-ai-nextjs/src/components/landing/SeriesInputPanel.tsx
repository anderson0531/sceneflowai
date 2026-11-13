'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  Maximize2,
  Palette,
  Users,
  X,
} from 'lucide-react'
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
  setting?: string
  visualStyle?: string
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
  settingLabel?: string
  continuityLockLabel?: string
  loglineLabel?: string
  synopsisLabel?: string
  lockedCastHeading?: string
  expandPortraitHint?: string
  inputs?: Record<string, LocalizedSeriesInput>
}

export function SeriesInputPanel({ cardId }: { cardId: string }) {
  const t = useTranslations('productionShowcase')
  const panelCopy = t.has('seriesPanel')
    ? (t.raw('seriesPanel') as SeriesPanelTranslation)
    : undefined
  const fallbackSeries = getExampleSeriesInput(cardId)

  const series: LocalizedSeriesInput | null = useMemo(() => {
    const localized = panelCopy?.inputs?.[cardId]
    if (!localized && !fallbackSeries) return null
    if (!localized) return fallbackSeries
    if (!fallbackSeries) return localized

    return {
      ...fallbackSeries,
      ...localized,
      setting: localized.setting ?? fallbackSeries.setting,
      visualStyle: localized.visualStyle ?? fallbackSeries.visualStyle,
      cast: localized.cast.map((member, idx) => ({
        ...member,
        imageUrl: member.imageUrl ?? fallbackSeries.cast[idx]?.imageUrl,
      })),
    }
  }, [cardId, fallbackSeries, panelCopy])

  const [activeView, setActiveView] = useState<SeriesPanelView>('bible')
  const [expandedCastIndex, setExpandedCastIndex] = useState<number | null>(null)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  const castWithPortraits = useMemo(
    () =>
      (series?.cast ?? [])
        .map((member, index) => ({ member, index }))
        .filter((entry): entry is { member: ExampleSeriesCastMember & { imageUrl: string }; index: number } =>
          Boolean(entry.member.imageUrl)
        ),
    [series]
  )

  const closeCastModal = useCallback(() => {
    setExpandedCastIndex(null)
  }, [])

  const stepCastModal = useCallback(
    (direction: -1 | 1) => {
      if (castWithPortraits.length <= 1) return
      setExpandedCastIndex((current) => {
        if (current === null) return null
        const pos = castWithPortraits.findIndex((item) => item.index === current)
        if (pos === -1) return castWithPortraits[0]?.index ?? null
        const nextPos = (pos + direction + castWithPortraits.length) % castWithPortraits.length
        return castWithPortraits[nextPos].index
      })
    },
    [castWithPortraits]
  )

  useEffect(() => {
    if (expandedCastIndex === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeCastModal()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        stepCastModal(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        stepCastModal(1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeCastModal, expandedCastIndex, stepCastModal])

  if (!series) return null

  const hasWorldDossier = Boolean(series.setting || series.visualStyle)
  const expandHint = panelCopy?.expandPortraitHint || 'Click portrait for full view'

  const views: Array<{ id: SeriesPanelView; label: string }> = [
    { id: 'bible', label: panelCopy?.bibleTab || 'World & Style' },
    { id: 'cast', label: `${panelCopy?.castTab || 'Cast'} (${series.cast.length})` },
    { id: 'episode1', label: panelCopy?.episode1Tab || 'Synopsis' },
    { id: 'season', label: `${panelCopy?.seasonTab || 'Story Beats'} (${series.episodes.length})` },
  ]

  const expandedMember =
    expandedCastIndex !== null ? series.cast[expandedCastIndex] ?? null : null
  const expandedPortraitPos =
    expandedCastIndex !== null
      ? castWithPortraits.findIndex((item) => item.index === expandedCastIndex)
      : -1

  return (
    <div className="pointer-events-auto mb-4 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-black/80 p-3.5 shadow-inner sm:p-4">
      {/* Production Dossier Header */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300/90">
            {panelCopy?.headerLabel || 'Production Dossier & Story Bible'}
          </p>
          <h4 className="mt-0.5 whitespace-normal break-words text-base font-bold tracking-tight text-white sm:text-lg">
            {series.showTitle}
          </h4>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-200">
          {series.genre}
        </span>
      </div>

      {/* Always-visible Quoted Logline Callout */}
      <div className="mb-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/15 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
          {panelCopy?.loglineLabel || 'Logline'}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-100 italic sm:text-[13px]">
          “{series.logline}”
        </p>
      </div>

      {/* Quick-Expand Cast Thumbnail Strip (rendered when cast portraits exist) */}
      {castWithPortraits.length > 0 && (
        <div className="mb-3.5 rounded-xl border border-white/10 bg-slate-950/70 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              <Users className="h-3 w-3 text-cyan-300" aria-hidden />
              {panelCopy?.castTab || 'Cast'} ({castWithPortraits.length})
            </span>
            <span className="text-[10px] text-cyan-300/80">{expandHint}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 min-[440px]:grid-cols-5 sm:gap-2">
            {castWithPortraits.map(({ member, index }) => (
              <button
                key={member.name}
                type="button"
                title={member.role ? `${member.name} — ${member.role}` : member.name}
                onClick={() => setExpandedCastIndex(index)}
                aria-label={`Expand full view for ${member.name}`}
                className="group/thumb relative flex flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-900/90 text-left transition hover:border-cyan-400/50 hover:ring-1 hover:ring-cyan-400/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
                  <img
                    src={member.imageUrl}
                    alt={member.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-top transition-transform duration-300 group-hover/thumb:scale-105"
                  />
                  <span className="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white/85 opacity-80 backdrop-blur-sm transition group-hover/thumb:bg-cyan-500/90 group-hover/thumb:text-slate-950 group-hover/thumb:opacity-100">
                    <Maximize2 className="h-2.5 w-2.5" aria-hidden />
                  </span>
                </div>
                <span className="line-clamp-1 px-1.5 py-1 text-[10px] font-medium text-slate-200 group-hover/thumb:text-cyan-200">
                  {member.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Segmented Section Tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Production details">
        {views.map((view) => {
          const isSelected = activeView === view.id
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-pressed={isSelected}
              onClick={() => setActiveView(view.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/45'
                  : 'bg-slate-900/75 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {view.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-3 text-sm text-gray-200">
        {activeView === 'bible' && (
          <>
            {hasWorldDossier ? (
              <div className="space-y-2.5">
                {series.setting && (
                  <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>{panelCopy?.settingLabel || 'Setting'}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
                      {series.setting}
                    </p>
                  </div>
                )}

                {series.visualStyle && (
                  <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                      <Palette className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>{panelCopy?.artStyleLabel || 'Visual Style'}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
                      {series.visualStyle}
                    </p>
                  </div>
                )}

                <dl className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-black/35 p-2.5 text-xs sm:grid-cols-2">
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
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {panelCopy?.continuityLockLabel || 'Continuity Lock'}
                    </dt>
                    <dd className="mt-0.5 text-slate-300">{series.continuityLock}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <>
                <dl className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-2.5 text-xs sm:grid-cols-2">
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
                      {panelCopy?.artStyleLabel || 'Visual Style'}
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

                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    {panelCopy?.synopsisLabel || 'Production Synopsis'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-200">
                    {series.seriesSynopsis}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{series.artLock}</p>
                </div>
              </>
            )}
          </>
        )}

        {activeView === 'cast' && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {panelCopy?.lockedCastHeading || 'Principal Cast & Continuity Sheets'} ({series.cast.length})
              </p>
              {castWithPortraits.length > 0 && (
                <span className="text-[10px] text-cyan-300/80">{expandHint}</span>
              )}
            </div>
            <ul className="space-y-2">
              {series.cast.map((member, index) => (
                <li
                  key={member.name}
                  className="rounded-xl border border-white/10 bg-slate-900/65 p-2.5"
                >
                  <div className="flex items-start gap-3">
                    {member.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setExpandedCastIndex(index)}
                        aria-label={`Expand full portrait of ${member.name}`}
                        className="group/portrait relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-slate-950 transition hover:border-cyan-400/60 hover:ring-1 hover:ring-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:w-20"
                      >
                        <img
                          src={member.imageUrl}
                          alt={member.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover object-top transition-transform duration-300 group-hover/portrait:scale-105"
                        />
                        <span className="pointer-events-none absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white/90 backdrop-blur-sm transition group-hover/portrait:bg-cyan-500 group-hover/portrait:text-slate-950">
                          <Maximize2 className="h-2.5 w-2.5" aria-hidden />
                        </span>
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-1.5">
                        <span className="text-xs font-bold text-white sm:text-sm">
                          {member.name}
                        </span>
                        <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                          {member.role}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-gray-300">
                        {member.descriptor}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeView === 'episode1' && (
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                {hasWorldDossier
                  ? panelCopy?.synopsisLabel || 'Production Synopsis'
                  : series.episode1Synopsis.episodeLabel}
              </p>
              <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                <Clock className="h-2.5 w-2.5" aria-hidden />
                {series.episode1Synopsis.duration}
              </span>
            </div>
            {!hasWorldDossier && (
              <p className="mt-1 text-xs font-semibold text-white">
                {series.episode1Synopsis.title}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-gray-200">
              {hasWorldDossier ? series.seriesSynopsis : series.episode1Synopsis.synopsis}
            </p>
            {!hasWorldDossier && (
              <div className="mt-2.5 rounded-lg border border-white/10 bg-black/40 p-2.5">
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
            )}
          </div>
        )}

        {activeView === 'season' && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                {series.unitLabel}
              </p>
            </div>
            <ol className="space-y-2">
              {series.episodes.map((episode) => (
                <li
                  key={episode.number}
                  className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyan-500/15 text-[10px] font-bold text-cyan-300 ring-1 ring-cyan-400/25">
                        {episode.number}
                      </span>
                      <p className="text-xs font-semibold text-white">{episode.title}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                      {episode.duration}
                    </span>
                  </div>
                  <p className="mt-1.5 pl-7 text-xs leading-relaxed text-gray-300">
                    {episode.synopsis}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Full-View Cast Portrait Lightbox */}
      {portalReady &&
        expandedMember &&
        expandedMember.imageUrl &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${expandedMember.name} — Character Sheet`}
            onClick={closeCastModal}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/88 p-4 backdrop-blur-md sm:p-6"
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl md:flex-row"
            >
              <button
                type="button"
                onClick={closeCastModal}
                aria-label="Close character view"
                className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white transition hover:border-cyan-400/50 hover:bg-slate-900"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>

              <div className="relative flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 p-3 md:w-[46%] md:p-4">
                <img
                  src={expandedMember.imageUrl}
                  alt={expandedMember.name}
                  className="max-h-[54dvh] w-auto rounded-xl object-contain shadow-lg md:max-h-[82dvh]"
                />
                {castWithPortraits.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => stepCastModal(-1)}
                      aria-label="Previous cast member"
                      className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white transition hover:border-cyan-400/50 hover:bg-slate-900"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepCastModal(1)}
                      aria-label="Next cast member"
                      className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white transition hover:border-cyan-400/50 hover:bg-slate-900"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 pr-10">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                      {series.showTitle}
                    </span>
                    {expandedPortraitPos >= 0 && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                        {expandedPortraitPos + 1} / {castWithPortraits.length}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
                    {expandedMember.name}
                  </h3>
                  <p className="mt-1 inline-block rounded-md border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-200">
                    {expandedMember.role}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-slate-200">
                    {expandedMember.descriptor}
                  </p>
                </div>

                {castWithPortraits.length > 1 && (
                  <div className="mt-5 border-t border-white/10 pt-3.5">
                    <div className="flex items-center gap-2">
                      {castWithPortraits.map(({ member, index }) => {
                        const isCurrent = index === expandedCastIndex
                        return (
                          <button
                            key={member.name}
                            type="button"
                            onClick={() => setExpandedCastIndex(index)}
                            aria-label={`View ${member.name}`}
                            className={`relative h-12 w-9 overflow-hidden rounded-md border transition ${
                              isCurrent
                                ? 'border-cyan-400 ring-2 ring-cyan-400/50'
                                : 'border-white/15 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={member.imageUrl}
                              alt={member.name}
                              className="h-full w-full object-cover object-top"
                            />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
