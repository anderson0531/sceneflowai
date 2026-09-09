'use client'

import { Radar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SharedBlueprintARSnapshot } from '@/lib/blueprint/sanitizeShareAR'
import type { BlueprintSectionAudioEntry } from '@/lib/blueprint/shareTypes'
import { BlueprintSectionAudioPlayer } from './BlueprintSectionAudioPlayer'

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 70) return 'text-blue-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

type Props = {
  snapshot: SharedBlueprintARSnapshot
  audio?: BlueprintSectionAudioEntry
  translationNarration?: string
  allowTts: boolean
}

export function BlueprintShareResonancePanel({
  snapshot,
  audio,
  translationNarration,
  allowTts,
}: Props) {
  const analysis = snapshot.analysis
  if (!analysis) {
    return (
      <section
        id="section-resonance"
        className="rounded-xl border border-cyan-500/20 bg-slate-900/50 p-5"
      >
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Radar className="h-5 w-5 text-cyan-300" />
          Audience Resonance
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          No Audience Resonance analysis was saved with this share.
        </p>
      </section>
    )
  }

  return (
    <section
      id="section-resonance"
      className="space-y-4 rounded-xl border border-cyan-500/20 bg-slate-900/50 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Radar className="h-5 w-5 text-cyan-300" />
            Audience Resonance
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {analysis.isReadyForProduction ? 'Production ready' : 'Needs improvement'} · snapshot
            from share time
          </p>
        </div>
        <p className={cn('text-3xl font-bold', scoreColor(analysis.overallScore))}>
          {analysis.overallScore}
          <span className="ml-1 text-sm font-medium text-gray-500">/ 100</span>
        </p>
      </div>

      {allowTts && audio?.url ? (
        <BlueprintSectionAudioPlayer
          sectionId="resonance"
          audio={audio}
          label="Listen to Audience Resonance"
          status="ready"
        />
      ) : null}

      {translationNarration ? (
        <p className="text-sm leading-relaxed text-gray-300">{translationNarration}</p>
      ) : analysis.summary ? (
        <p className="text-sm leading-relaxed text-gray-300">{analysis.summary}</p>
      ) : null}

      {analysis.categories.length > 0 ? (
        <ul className="space-y-2">
          {analysis.categories.map((cat) => (
            <li key={cat.name}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-gray-300">{cat.name}</span>
                <span className={cn('font-medium', scoreColor(cat.score))}>{cat.score}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-cyan-500/80"
                  style={{ width: `${Math.min(100, Math.max(0, cat.score))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {analysis.strengths.length > 0 ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/80">
            Strengths
          </h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-300">
            {analysis.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {analysis.improvements.length > 0 ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-400/80">
            Gaps
          </h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-300">
            {analysis.improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
