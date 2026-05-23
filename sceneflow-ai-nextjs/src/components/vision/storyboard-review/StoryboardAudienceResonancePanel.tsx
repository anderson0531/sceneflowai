'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

export type SharedAudienceResonance = {
  overallScore: number
  categories?: { name: string; score: number; weight?: number }[]
  analysis?: string
  strengths?: string[]
  improvements?: string[]
  targetDemographic?: string
  emotionalImpact?: string
  showVsTellRatio?: number
  generatedAt?: string
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 70) return 'text-blue-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function CategoryBars({
  categories,
}: {
  categories: { name: string; score: number; weight?: number }[]
}) {
  const valid = categories.filter((c) => typeof c.score === 'number')
  if (!valid.length) return null
  return (
    <ul className="space-y-2">
      {valid.map((cat) => (
        <li key={cat.name}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-300">{cat.name}</span>
            <span className={cn('font-medium', scoreColor(cat.score))}>{cat.score}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500/80 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, cat.score))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

interface StoryboardAudienceResonancePanelProps {
  data: SharedAudienceResonance
  open: boolean
  onClose: () => void
}

export function StoryboardAudienceResonancePanel({
  data,
  open,
  onClose,
}: StoryboardAudienceResonancePanelProps) {
  const [tab, setTab] = useState<'overview' | 'analysis'>('overview')

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 lg:absolute lg:inset-0"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-gray-900 border-l border-gray-800 shadow-xl flex flex-col lg:absolute lg:inset-y-0 lg:right-0"
        role="dialog"
        aria-labelledby="ar-panel-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 id="ar-panel-title" className="text-sm font-semibold text-white">
            Audience Resonance
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm px-2 py-1"
          >
            Close
          </button>
        </div>

        <div className="flex border-b border-gray-800 px-2 pt-2 gap-1" role="tablist">
          {(['overview', 'analysis'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 text-xs font-medium rounded-t-lg capitalize',
                tab === t ? 'bg-gray-800 text-emerald-400' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'overview' && (
            <>
              <div className="text-center py-4">
                <div className={cn('text-4xl font-bold', scoreColor(data.overallScore))}>
                  {data.overallScore}
                </div>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Overall score</p>
              </div>
              {data.targetDemographic && (
                <div className="text-sm">
                  <p className="text-gray-500 text-xs uppercase mb-1">Target audience</p>
                  <p className="text-gray-200">{data.targetDemographic}</p>
                </div>
              )}
              {data.emotionalImpact && (
                <div className="text-sm">
                  <p className="text-gray-500 text-xs uppercase mb-1">Emotional impact</p>
                  <p className="text-gray-200">{data.emotionalImpact}</p>
                </div>
              )}
              {typeof data.showVsTellRatio === 'number' && (
                <div className="text-sm">
                  <p className="text-gray-500 text-xs uppercase mb-1">Show vs tell</p>
                  <p className="text-gray-200">{Math.round(data.showVsTellRatio)}% visual/action</p>
                </div>
              )}
              {data.categories && data.categories.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs uppercase mb-2">Dimensions</p>
                  <CategoryBars categories={data.categories} />
                </div>
              )}
            </>
          )}

          {tab === 'analysis' && (
            <>
              {data.analysis && (
                <div>
                  <p className="text-gray-500 text-xs uppercase mb-2">Analysis</p>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {data.analysis}
                  </p>
                </div>
              )}
              {data.strengths && data.strengths.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs uppercase mb-2">Strengths</p>
                  <ul className="list-disc list-inside text-sm text-emerald-300/90 space-y-1">
                    {data.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.improvements && data.improvements.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs uppercase mb-2">Improvements</p>
                  <ul className="list-disc list-inside text-sm text-amber-300/90 space-y-1">
                    {data.improvements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!data.analysis && !data.strengths?.length && !data.improvements?.length && (
                <p className="text-sm text-gray-500">No analysis text available for this project.</p>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  )
}
