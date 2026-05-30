'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Loader2 } from 'lucide-react'
import { AudiencePlayer } from '@/components/screening-room/AudiencePlayer'
import {
  loadPremiereScreeningForEmbed,
  PremiereScreeningLoadError,
  type LoadedPremiereScreening,
} from '@/lib/premiere/premiereScreeningEmbedLoader'
import { cn } from '@/lib/utils'

function ScreeningEmbedSkeleton({ minHeight }: { minHeight: string }) {
  return (
    <div className={cn('flex flex-col h-full bg-slate-900/80 animate-pulse', minHeight)}>
      <div className="flex-1 bg-slate-800/60 m-2 rounded-lg" />
      <div className="px-3 pb-3 space-y-2">
        <div className="h-1.5 bg-slate-700 rounded-full w-full" />
        <div className="flex justify-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-700" />
          <div className="h-8 w-8 rounded-full bg-slate-700" />
        </div>
      </div>
    </div>
  )
}

export interface PremiereScreeningEmbedPlayerProps {
  screeningId: string
  className?: string
  minHeight?: string
  onNotFound?: () => void
  showExpandLink?: boolean
  expandHref?: string
}

export function PremiereScreeningEmbedPlayer({
  screeningId,
  className,
  minHeight = 'min-h-[280px]',
  onNotFound,
  showExpandLink = true,
  expandHref,
}: PremiereScreeningEmbedPlayerProps) {
  const [loaded, setLoaded] = useState<LoadedPremiereScreening | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const onNotFoundRef = useRef(onNotFound)
  onNotFoundRef.current = onNotFound

  useEffect(() => {
    if (!screeningId.trim()) return

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await loadPremiereScreeningForEmbed(screeningId)
        if (!cancelled) setLoaded(data)
      } catch (err: unknown) {
        if (cancelled) return
        const status = err instanceof PremiereScreeningLoadError ? err.status : 500
        if (status === 404 && onNotFoundRef.current) {
          onNotFoundRef.current()
          return
        }
        setError(err instanceof Error ? err.message : 'Failed to load screening')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screeningId])

  if (loading) {
    return (
      <div className={cn('h-full flex items-center justify-center bg-black/90', minHeight, className)}>
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  if (error || !loaded) {
    return (
      <div className={cn('h-full flex items-center justify-center bg-black/90 p-4', minHeight, className)}>
        <p className="text-sm text-slate-400 text-center">{error || 'Screening unavailable'}</p>
      </div>
    )
  }

  const resolvedExpandHref =
    expandHref ??
    (showExpandLink && screeningId.trim()
      ? `/embed/screening/${encodeURIComponent(screeningId.trim())}`
      : undefined)

  return (
    <div className={cn('h-full flex flex-col', minHeight, className)}>
      <div className="flex-1 min-h-0">
        <AudiencePlayer
          screeningId={loaded.screeningId}
          videoUrl={loaded.videoUrl}
          title={loaded.title}
          description={loaded.description}
          collectDemographics={false}
          embedMode
          className="h-full rounded-none"
        />
      </div>
      {resolvedExpandHref ? (
        <div className="shrink-0 border-t border-white/10 bg-gray-950/90 px-4 py-2.5">
          <Link
            href={resolvedExpandHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300"
          >
            Open expanded player
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  )
}

export { ScreeningEmbedSkeleton }
