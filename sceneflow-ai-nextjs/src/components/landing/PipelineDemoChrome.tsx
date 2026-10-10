'use client'

import Link from 'next/link'
import {
  PIPELINE_DEMO_STAGES,
  SCREENING_CUTS,
  SCREENING_CUT_LABELS,
  getPipelineDemoNextStage,
  getScreeningCutHref,
  getWalkStageHref,
  matchPipelineWalk,
  type PipelineDemoStageId,
  type ScreeningCut,
} from '@/config/landing/productionPipelineDemo'

const STAGE_LABELS: Record<PipelineDemoStageId, string> = {
  blueprint: 'Blueprint + AR',
  'script-ar': 'Script AR',
  'screening-room': 'Screening Room',
}

type Props = {
  tokenOrSlug: string
  activeCut?: ScreeningCut | null
}

export function PipelineDemoChrome({ tokenOrSlug, activeCut = null }: Props) {
  const match = matchPipelineWalk(tokenOrSlug)
  if (!match) return null

  const { walkId, stage } = match
  const next = getPipelineDemoNextStage(stage)
  const nextHref = next ? getWalkStageHref(walkId, next) : null

  return (
    <div className="border-b border-cyan-500/20 bg-slate-950/90">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-2">
        <nav aria-label="Pipeline review walk" className="flex flex-wrap items-center gap-2">
          {PIPELINE_DEMO_STAGES.map((id, index) => {
            const href = getWalkStageHref(walkId, id)
            const current = id === stage
            const className = current
              ? 'rounded-full border border-cyan-400/50 bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-200'
              : 'rounded-full border border-slate-700/70 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200'
            const label = `${index + 1} ${STAGE_LABELS[id]}`
            if (!href || current) {
              return (
                <span key={id} className={className} aria-current={current ? 'step' : undefined}>
                  {label}
                </span>
              )
            }
            return (
              <Link key={id} href={href} className={className}>
                {label}
              </Link>
            )
          })}
        </nav>
        {nextHref ? (
          <Link
            href={nextHref}
            className="text-xs font-medium text-cyan-300 hover:text-cyan-200"
          >
            Next: {STAGE_LABELS[next!]} →
          </Link>
        ) : (
          <Link href="/#production-examples" className="text-xs text-slate-400 hover:text-slate-200">
            Back to examples
          </Link>
        )}
      </div>
      {stage === 'screening-room' ? (
        <nav
          aria-label="Screening Room cuts"
          className="mx-auto flex max-w-4xl flex-wrap gap-2 px-4 pb-2"
        >
          {SCREENING_CUTS.map((cut) => {
            const href = getScreeningCutHref(walkId, cut)
            if (!href) return null
            const current = activeCut === cut || (activeCut == null && cut === 'final')
            return (
              <Link
                key={cut}
                href={href}
                aria-current={current ? 'page' : undefined}
                className={
                  current
                    ? 'rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white'
                    : 'rounded-full px-2.5 py-1 text-xs text-slate-400 hover:text-white'
                }
              >
                {SCREENING_CUT_LABELS[cut]}
              </Link>
            )
          })}
        </nav>
      ) : null}
    </div>
  )
}
