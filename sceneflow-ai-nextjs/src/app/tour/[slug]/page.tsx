'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Building2, Compass, RefreshCw } from 'lucide-react'
import { InteractivePropertyPlayer } from '@/components/property-tours/InteractivePropertyPlayer'
import type { PropertyTourDTO } from '@/lib/propertyTours/types'

function PropertyTourSkeleton({ isEmbed }: { isEmbed: boolean }) {
  return (
    <div
      className={`flex w-full flex-col bg-slate-950 text-white ${
        isEmbed ? 'h-screen min-h-[520px]' : 'min-h-screen'
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-800" />
          <div className="space-y-1.5">
            <div className="h-3 w-28 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-52 animate-pulse rounded bg-slate-800" />
          </div>
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-800" />
      </div>

      <div className="flex-1 flex items-center justify-center bg-black p-6">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Compass className="h-10 w-10 animate-spin text-cyan-500/70" />
          <p className="text-sm font-medium text-slate-400">Loading Interactive Property Tour...</p>
        </div>
      </div>

      <div className="border-t border-white/10 bg-slate-950 px-4 py-4 md:px-6 space-y-3">
        <div className="flex gap-2">
          <div className="h-8 w-36 animate-pulse rounded-full bg-slate-800" />
          <div className="h-8 w-40 animate-pulse rounded-full bg-slate-800" />
          <div className="h-8 w-32 animate-pulse rounded-full bg-slate-800" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-7 w-28 animate-pulse rounded-lg bg-slate-900" />
          <div className="h-7 w-28 animate-pulse rounded-lg bg-slate-900" />
          <div className="h-7 w-28 animate-pulse rounded-lg bg-slate-900" />
        </div>
      </div>
    </div>
  )
}

function StandalonePropertyTourInner() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()

  const slug = typeof params?.slug === 'string' ? params.slug : ''
  const isEmbed =
    searchParams.get('embed') === '1' || searchParams.get('embed')?.toLowerCase() === 'true'
  const isPreview =
    searchParams.get('preview') === '1' || searchParams.get('preview')?.toLowerCase() === 'true'

  const [tour, setTour] = useState<PropertyTourDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      setUnavailableMessage('This property tour is currently paused or unavailable')
      return
    }

    let cancelled = false
    setLoading(true)
    setUnavailableMessage(null)

    const qs = isPreview ? '?preview=1' : ''
    fetch(`/api/tour/${encodeURIComponent(slug)}${qs}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.tour) {
          throw new Error(
            data?.error || 'This property tour is currently paused or unavailable'
          )
        }
        if (!cancelled) {
          setTour(data.tour as PropertyTourDTO)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTour(null)
          setUnavailableMessage(
            err instanceof Error && err.message
              ? err.message
              : 'This property tour is currently paused or unavailable'
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [slug, isPreview, reloadKey])

  if (loading) {
    return <PropertyTourSkeleton isEmbed={isEmbed} />
  }

  if (!tour) {
    return (
      <div
        className={`flex w-full flex-col items-center justify-center bg-slate-950 p-6 text-center text-white ${
          isEmbed ? 'h-screen min-h-[420px]' : 'min-h-screen'
        }`}
      >
        <div className="max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-white">
            This property tour is currently paused or unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {unavailableMessage &&
            unavailableMessage !== 'This property tour is currently paused or unavailable'
              ? unavailableMessage
              : 'The listing brokerage may have taken this interactive showcase offline or updated the link.'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <InteractivePropertyPlayer tour={tour} isEmbed={isEmbed} isPreview={isPreview} />
}

export default function StandalonePropertyTourPage() {
  return (
    <Suspense fallback={<PropertyTourSkeleton isEmbed={false} />}>
      <StandalonePropertyTourInner />
    </Suspense>
  )
}
