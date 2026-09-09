'use client'

import Link from 'next/link'
import {
  PIPELINE_DEMO_STAGES,
  getPipelineDemoHref,
  getPipelineDemoNextStage,
  matchPipelineDemoStage,
  type PipelineDemoStageId,
} from '@/config/landing/productionPipelineDemo'

const STAGE_LABELS: Record<PipelineDemoStageId, string> = {
  blueprint: 'Blueprint + AR',
  'script-ar': 'Script AR',
  'screening-room': 'Screening Room',
}

type Props = {
  tokenOrSlug: string
}

export function PipelineDemoChrome({ tokenOrSlug }: Props) {
  const stage = matchPipelineDemoStage(tokenOrSlug)
  if (!stage) return null

  const next = getPipelineDemoNextStage(stage)
  const nextHref = next ? getPipelineDemoHref(next) : null

  return (
    <div className="border-b border-cyan-500/20 bg-slate-950/90">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-2">
        <nav aria-label="Pipeline review walk" className="flex flex-wrap items-center gap-2">
          {PIPELINE_DEMO_STAGES.map((id, index) => {
            const href = getPipelineDemoHref(id)
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
    </div>
  )
}
