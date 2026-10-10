'use client'

import {
  PRODUCTION_WALK_LABELS,
  SCREENING_CUT_LABELS,
  matchPipelineWalk,
  type ScreeningCut,
} from '@/config/landing/productionPipelineDemo'
import { PipelineDemoChrome } from '@/components/landing/PipelineDemoChrome'

const STAGE_LABELS = {
  blueprint: 'Blueprint',
  'script-ar': 'Audience Resonance',
  'screening-room': 'Screening Room',
} as const

type Props = {
  tokenOrSlug: string
  activeCut?: ScreeningCut | null
}

export function PipelinePlaceholderStage({ tokenOrSlug, activeCut = null }: Props) {
  const match = matchPipelineWalk(tokenOrSlug)
  const title = match ? PRODUCTION_WALK_LABELS[match.walkId] : 'Production example'
  const stageLabel = activeCut
    ? SCREENING_CUT_LABELS[activeCut]
    : match
      ? STAGE_LABELS[match.stage]
      : 'Screening Room'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PipelineDemoChrome tokenOrSlug={tokenOrSlug} activeCut={activeCut} />
      <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">{stageLabel}</p>
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
          This share is being prepared. Continue through Blueprint, Audience Resonance, and the
          Screening Room — Pre-Vis, Rough Cut, Scenes, Trailer, and Final — to walk the pipeline.
        </p>
      </main>
    </div>
  )
}
