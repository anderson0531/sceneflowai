'use client'

import { getExampleSeriesInput } from '@/config/landing/exampleSeriesInputs'
import { PRODUCTION_SHOWCASE_COPY } from '@/config/landing/productionShowcaseCopy'
import {
  PRODUCTION_WALK_LABELS,
  SCREENING_CUT_LABELS,
  matchPipelineWalk,
  type ScreeningCut,
} from '@/config/landing/productionPipelineDemo'

const STAGE_LABELS = {
  series: 'Series Room',
  blueprint: 'Blueprint Room',
  'script-ar': 'Production Stage',
  'screening-room': 'Screening Room',
} as const

type Props = {
  tokenOrSlug: string
  activeCut?: ScreeningCut | null
}

export function PipelinePlaceholderStage({ tokenOrSlug, activeCut = null }: Props) {
  const match = matchPipelineWalk(tokenOrSlug)
  const series = match ? getExampleSeriesInput(match.walkId) : null
  const showcaseCard = match
    ? PRODUCTION_SHOWCASE_COPY.cards.find((card) => card.id === match.walkId)
    : null
  const title = series?.showTitle ?? (match ? PRODUCTION_WALK_LABELS[match.walkId] : 'Production example')
  const stageLabel = activeCut
    ? SCREENING_CUT_LABELS[activeCut]
    : match
      ? STAGE_LABELS[match.stage]
      : 'Screening Room'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-300">
            {stageLabel}
          </span>
          {series ? (
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              {series.genre} · {series.format}
            </span>
          ) : null}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
          This share is being prepared. Review the production one milestone at a time: Series Room,
          Blueprint Room, Production Stage, then Screening Room.
        </p>

        {series ? (
          <div className="mt-8 space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                Logline &amp; Series Synopsis
              </p>
              <p className="mt-2 text-sm font-medium italic text-white">“{series.logline}”</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-200">{series.seriesSynopsis}</p>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">{series.artLock}</p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                Locked Cast &amp; Principal Continuity ({series.cast.length})
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {series.cast.map((member) => (
                  <div
                    key={member.name}
                    className="rounded-xl border border-white/10 bg-slate-900/70 p-3.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{member.name}</p>
                      <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-200">
                        {member.role}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      {member.descriptor}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                  {series.episode1Synopsis.episodeLabel}
                </p>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-200">
                  {series.episode1Synopsis.duration}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {series.episode1Synopsis.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {series.episode1Synopsis.synopsis}
              </p>

              <div className="mt-4 rounded-xl border border-amber-400/30 bg-black/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-300">
                    {series.episode1Synopsis.chapter1Title}
                  </span>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                    {series.episode1Synopsis.chapter1Duration}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-200">
                  {series.episode1Synopsis.chapter1Synopsis}
                </p>
              </div>
            </section>

            {showcaseCard?.solutionPillars?.length ? (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                  Long-Form Production Architecture ({showcaseCard.solutionPillars.length} Pillars)
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {showcaseCard.solutionPillars.map((pillar) => (
                    <div
                      key={pillar.title}
                      className="rounded-xl border border-white/10 bg-slate-900/70 p-3.5"
                    >
                      <p className="text-sm font-semibold text-white">{pillar.title}</p>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-rose-300/90">
                        {PRODUCTION_SHOWCASE_COPY.frictionLabel}: {pillar.frictionHeadline}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        {pillar.friction}
                      </p>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                        {PRODUCTION_SHOWCASE_COPY.solutionPillarLabel}: {pillar.solutionHeadline}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-200">
                        {pillar.solution}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  )
}
