'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { SceneFlowStudioBrand } from '@/components/layout/SceneFlowStudioBrand'
import { PipelineDemoChrome } from '@/components/landing/PipelineDemoChrome'
import { BlueprintShareLanguageControls } from '@/components/blueprint/BlueprintShareLanguageControls'
import { BlueprintSectionAudioPlayer } from '@/components/blueprint/BlueprintSectionAudioPlayer'
import { cn } from '@/lib/utils'
import type { SharedScriptARReview } from '@/lib/script/audienceResonance/sanitizeShareReview'
import type {
  ScriptARSectionAudioMap,
  ScriptARShareSection,
} from '@/lib/script/audienceResonance/shareTypes'

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 70) return 'text-blue-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

const TABS: { id: ScriptARShareSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'recommendations', label: 'Scene notes' },
]

export function ScriptResonanceShareViewer({ token }: { token: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('Script Audience Resonance')
  const [review, setReview] = useState<SharedScriptARReview | null>(null)
  const [language, setLanguage] = useState('en')
  const [audioByLang, setAudioByLang] = useState<Record<string, ScriptARSectionAudioMap>>({})
  const [translations, setTranslations] = useState<
    Record<string, Partial<Record<ScriptARShareSection, string>>>
  >({})
  const [tab, setTab] = useState<ScriptARShareSection>('overview')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/script-resonance/share/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        if (!data.success) {
          if (!cancelled) setError(data.error || 'Link not found')
          return
        }
        if (cancelled) return
        setTitle(data.payload?.projectTitle || 'Script Audience Resonance')
        setReview(data.payload?.review || null)
        setAudioByLang(data.payload?.sectionAudioByLanguage || {})
        setTranslations(data.payload?.sectionTranslations || {})
        setLanguage(data.payload?.sectionAudioLanguage || 'en')
      } catch {
        if (!cancelled) setError('Failed to load report')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const audio = audioByLang[language] || {}
  const copy = translations[language] || {}

  const tabBody = useMemo(() => {
    if (!review) return null
    if (tab === 'overview') {
      return (
        <div className="space-y-4">
          {copy.overview ? <p className="text-sm text-gray-300">{copy.overview}</p> : null}
          {review.categories.map((cat) => (
            <div key={cat.name}>
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
            </div>
          ))}
        </div>
      )
    }
    if (tab === 'analysis') {
      return (
        <div className="space-y-4 text-sm text-gray-300">
          <p>{copy.analysis || review.analysis}</p>
          {review.strengths.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/80">
                Strengths
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {review.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {review.improvements.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-400/80">
                Improvements
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {review.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )
    }
    return (
      <div className="space-y-4 text-sm text-gray-300">
        {copy.recommendations ? <p>{copy.recommendations}</p> : null}
        {review.recommendations.map((rec) => (
          <p key={rec.text}>{rec.text}</p>
        ))}
        {review.sceneAnalysis.map((scene) => (
          <div key={`${scene.sceneNumber}-${scene.sceneHeading}`} className="rounded-lg border border-slate-800 p-3">
            <p className="font-medium text-white">
              Scene {scene.sceneNumber}: {scene.sceneHeading}{' '}
              <span className={cn('ml-2', scoreColor(scene.score))}>{scene.score}</span>
            </p>
            {scene.notes ? <p className="mt-1 text-gray-400">{scene.notes}</p> : null}
          </div>
        ))}
      </div>
    )
  }, [copy, review, tab])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
        Loading script report…
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-gray-400">
        <div className="max-w-md text-center">
          <p className="mb-2 text-lg text-gray-200">Unable to open this report</p>
          <p className="text-sm">{error || 'Report not available'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 text-gray-100">
      <PipelineDemoChrome tokenOrSlug={token} />
      <header className="sticky top-0 z-20 border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-md">
        <div className="mx-auto max-w-4xl space-y-2 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <SceneFlowStudioBrand href="/" nameClassName="text-white" />
            <Link
              href="/"
              className="shrink-0 text-sm text-purple-300/90 hover:text-purple-200 hover:underline"
            >
              Learn more about SceneFlow
            </Link>
          </div>
          <p className="sf-review-eyebrow">Script Audience Resonance · Listen only</p>
          <BlueprintShareLanguageControls
            language={language}
            onLanguageChange={setLanguage}
            enableGoogleTranslate={false}
          />
          <p className="text-xs text-gray-500">Read and listen only. No feedback or script edits.</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            <p className="text-sm text-gray-400">Insights & Direction — shared report</p>
          </div>
          <p className={cn('text-4xl font-bold', scoreColor(review.overallScore))}>
            {review.overallScore}
            <span className="ml-1 text-sm font-medium text-gray-500">/ 100</span>
          </p>
        </div>

        <nav className="flex gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm',
                tab === item.id
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-slate-700 text-slate-400 hover:text-slate-200'
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {audio[tab]?.url ? (
          <BlueprintSectionAudioPlayer
            sectionId={tab}
            audio={audio[tab]}
            label={`Listen to ${tab}`}
            status="ready"
          />
        ) : (
          <p className="text-sm text-gray-500">
            Audio has not been generated for this language yet. You can still read the report.
          </p>
        )}

        {tabBody}
      </main>
    </div>
  )
}
