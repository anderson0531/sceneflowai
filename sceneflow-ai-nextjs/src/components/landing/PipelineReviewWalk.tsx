'use client'

import { FileText, Radar, Clapperboard, ExternalLink } from 'lucide-react'
import {
  getPipelineDemoHref,
  type PipelineDemoStageId,
} from '@/config/landing/productionPipelineDemo'

const STAGE_ICONS = {
  blueprint: FileText,
  'script-ar': Radar,
  'screening-room': Clapperboard,
} as const

export type PipelineWalkStepCopy = {
  id: PipelineDemoStageId
  step: string
  title: string
  body: string
}

type Props = {
  steps: PipelineWalkStepCopy[]
  listenOnlyLabel: string
  openLabel: string
  comingSoonLabel: string
}

export function PipelineReviewWalk({
  steps,
  listenOnlyLabel,
  openLabel,
  comingSoonLabel,
}: Props) {
  return (
    <ol
      id="pipeline-review-walk"
      className="mb-14 grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      {steps.map((step) => {
        const href = getPipelineDemoHref(step.id)
        const Icon = STAGE_ICONS[step.id]
        return (
          <li key={step.id}>
            <article className="flex h-full flex-col rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/40">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/15 text-sm font-semibold text-cyan-200">
                  {step.step}
                </span>
                <Icon className="h-5 w-5 text-cyan-300" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-400">{step.body}</p>
              <p className="mt-3 text-xs text-gray-500">{listenOnlyLabel}</p>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20"
                >
                  {openLabel}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : (
                <p className="mt-4 rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-center text-sm text-gray-500">
                  {comingSoonLabel}
                </p>
              )}
            </article>
          </li>
        )
      })}
    </ol>
  )
}
