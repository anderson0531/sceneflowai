'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ExternalLink } from 'lucide-react'
import { BlueprintReviewHero } from '@/components/blueprint/BlueprintReviewHero'
import { BlueprintReviewSection } from '@/components/blueprint/BlueprintReviewSection'
import type { BlueprintSectionAudioMap, BlueprintSectionAudioStatus } from '@/lib/blueprint/shareTypes'
import { resolveBlueprintHeroImageUrl } from '@/lib/blueprint/resolveBlueprintHeroImage'
import {
  getLandingBlueprintShareHref,
  LANDING_SAMPLE,
} from '@/config/landingSamples'

export function LandingBlueprintEmbed() {
  const token = LANDING_SAMPLE.blueprintShareToken.trim()
  const shareHref = getLandingBlueprintShareHref()

  const [loading, setLoading] = useState(!!token)
  const [error, setError] = useState<string | null>(null)
  const [treatment, setTreatment] = useState<Record<string, unknown> | null>(null)
  const [heroImageUrl, setHeroImageUrl] = useState<string | undefined>()
  const [sectionAudio, setSectionAudio] = useState<BlueprintSectionAudioMap>({})
  const [allowTts, setAllowTts] = useState(true)
  const [audioStatus, setAudioStatus] = useState<BlueprintSectionAudioStatus | undefined>()

  const loadShare = useCallback(async () => {
    if (!token) return
    const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}`, { cache: 'no-store' })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || 'Blueprint not available')
    }
    const payload = data.payload
    setTreatment(payload?.treatment || null)
    setHeroImageUrl(
      resolveBlueprintHeroImageUrl(payload) ??
        resolveBlueprintHeroImageUrl(payload?.treatment as Record<string, unknown> | undefined)
    )
    setAllowTts(payload?.shareSettings?.allowTts !== false)
    setSectionAudio(payload?.sectionAudio || {})
    setAudioStatus(payload?.sectionAudioStatus)
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        await loadShare()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load blueprint')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, loadShare])

  if (!token) {
    return (
      <div className="h-full min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] flex flex-col items-center justify-center gap-3 px-6 text-center bg-slate-950">
        <p className="text-sm text-slate-400">
          Blueprint collaboration preview — set{' '}
          <code className="text-slate-300">blueprintShareToken</code> in landingSamples config
        </p>
        <p className="text-xs text-slate-500 max-w-md">
          Create a Blueprint share link for &quot;{LANDING_SAMPLE.projectTitle}&quot; in Studio, then paste the
          token from the share URL.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (error || !treatment) {
    return (
      <div className="h-full min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] flex flex-col items-center justify-center gap-3 px-6 text-center bg-slate-950">
        <p className="text-sm text-red-400">{error || 'Blueprint not available'}</p>
        {shareHref && (
          <Link
            href={shareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
          >
            Try opening full Blueprint review
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    )
  }

  const filmTitle = String(treatment.title || LANDING_SAMPLE.projectTitle)
  const logline = treatment.logline ? String(treatment.logline) : undefined
  const hasCoreAudio = !!sectionAudio.core?.url

  return (
    <div className="h-full min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] flex flex-col bg-slate-950 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        <BlueprintReviewHero
          title={filmTitle}
          logline={logline}
          heroImageUrl={heroImageUrl}
          genre={treatment.genre ? String(treatment.genre) : undefined}
        />
        <BlueprintReviewSection
          sectionId="core"
          title="Core"
          variant={treatment}
          expanded
          onToggle={() => {}}
          audio={sectionAudio.core}
          audioPlayerStatus={
            hasCoreAudio ? 'ready' : allowTts && audioStatus === 'pending' ? 'preparing' : 'unavailable'
          }
          allowTts={allowTts}
          canFeedback={false}
          omitLoglineInCore={!!treatment.logline}
          omitTitleInCore={!!treatment.title}
        />
      </div>
      <div className="shrink-0 border-t border-white/10 bg-slate-900/80 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs text-slate-400">
          Join to rate sections, leave notes, and chat with the team
        </p>
        {shareHref && (
          <Link
            href={shareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 whitespace-nowrap"
          >
            Open full Blueprint review
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  )
}
