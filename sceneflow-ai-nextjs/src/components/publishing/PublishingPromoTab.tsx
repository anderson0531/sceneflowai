'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Download,
  Film,
  Loader2,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { planPromoTrailer } from '@/lib/publish/trailerPlanner'
import { getPublishingState, upsertPublishingState } from '@/lib/publish/publishingState'
import type { PromoTrailerBeatPlan, PromoTrailerAsset } from '@/types/publishingAssets'
import type { ProjectStream } from '@/lib/streams/projectStreams'

export interface PublishingPromoTabProps {
  projectId: string
  projectTitle?: string
  metadata: unknown
  script?: unknown
  streams: ProjectStream[]
  userId?: string
  onSaveMetadata: (metadata: Record<string, unknown>) => Promise<void>
}

const TARGET_OPTIONS = [30, 45, 60] as const

export function PublishingPromoTab({
  projectId,
  projectTitle,
  metadata,
  script,
  streams,
  userId,
  onSaveMetadata,
}: PublishingPromoTabProps) {
  const [targetDuration, setTargetDuration] = useState<(typeof TARGET_OPTIONS)[number]>(45)
  const [beatPlan, setBeatPlan] = useState<PromoTrailerBeatPlan[]>([])
  const [planning, setPlanning] = useState(false)
  const [rendering, setRendering] = useState(false)

  const publishingState = useMemo(() => getPublishingState(metadata), [metadata])
  const trailer = publishingState.promo?.trailer

  const masterStream = useMemo(
    () => streams.find((s) => s.status === 'ready' && s.mp4Url),
    [streams]
  )

  const scenes = useMemo(() => {
    const s = script as { script?: { scenes?: unknown[] }; scenes?: unknown[] } | undefined
    return s?.script?.scenes ?? s?.scenes ?? []
  }, [script])

  const sceneScores = useMemo(() => {
    const review = (metadata as { audienceReview?: { sceneScores?: Record<number, number> } })
      ?.audienceReview
    return review?.sceneScores
  }, [metadata])

  const handleRegeneratePlan = useCallback(() => {
    setPlanning(true)
    try {
      const result = planPromoTrailer({
        scenes,
        sceneScores,
        targetDurationSec: targetDuration,
      })
      setBeatPlan(result.beatPlan)
      toast.success(
        `Beat plan: ${result.beatPlan.length} beats · ~${Math.round(result.totalDurationSec)}s`
      )
    } finally {
      setPlanning(false)
    }
  }, [scenes, sceneScores, targetDuration])

  const handleRenderTrailer = useCallback(async () => {
    if (!masterStream?.mp4Url) {
      toast.error('Render a master stream first in Final Streams.')
      return
    }
    if (beatPlan.length === 0) {
      toast.error('Generate a beat plan first.')
      return
    }
    setRendering(true)
    try {
      const res = await fetch('/api/publish/trailer/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          videoUrl: masterStream.mp4Url,
          beatPlan,
          targetDurationSec: targetDuration,
          title: projectTitle,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Trailer render failed')

      const trailerAsset: PromoTrailerAsset = {
        mp4Url: data.mp4Url,
        aspect: '9:16',
        durationSec: data.durationSec ?? targetDuration,
        targetDurationSec: targetDuration,
        beatPlan,
        renderedAt: new Date().toISOString(),
        status: 'ready',
      }

      const nextMetadata = upsertPublishingState(
        (metadata as Record<string, unknown>) || {},
        {
          promo: {
            ...publishingState.promo,
            trailer: trailerAsset,
          },
        }
      )
      await onSaveMetadata(nextMetadata)
      toast.success('Promo trailer rendered')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Trailer render failed')
    } finally {
      setRendering(false)
    }
  }, [
    masterStream,
    beatPlan,
    projectId,
    userId,
    targetDuration,
    projectTitle,
    metadata,
    publishingState.promo,
    onSaveMetadata,
  ])

  return (
    <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 p-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
          <Smartphone className="w-4 h-4 text-fuchsia-400" />
          9:16 Promo Trailer
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Beat-woven vertical trailer (30–60s) from Audience Resonance–scored beats.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {TARGET_OPTIONS.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setTargetDuration(sec)}
              className={cn(
                'rounded-full px-3 py-1 text-xs border transition-colors',
                targetDuration === sec
                  ? 'border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-200'
                  : 'border-zinc-700 text-zinc-400'
              )}
            >
              {sec}s
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button size="sm" variant="outline" onClick={handleRegeneratePlan} disabled={planning}>
            {planning ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            Regenerate plan
          </Button>
          <Button
            size="sm"
            onClick={handleRenderTrailer}
            disabled={rendering || beatPlan.length === 0 || !masterStream?.mp4Url}
            className="bg-fuchsia-600 hover:bg-fuchsia-500"
          >
            {rendering ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Film className="w-4 h-4 mr-1" />
            )}
            Render trailer
          </Button>
        </div>

        {beatPlan.length > 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
              Beat timeline ({beatPlan.length} beats)
            </p>
            <div className="flex flex-wrap gap-1">
              {beatPlan.map((beat) => (
                <span
                  key={beat.beatId}
                  className="text-[10px] px-2 py-0.5 rounded bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-200"
                  title={beat.label}
                >
                  S{beat.sceneIndex + 1} · {beat.endSec - beat.startSec}s
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {trailer?.mp4Url ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-xs text-emerald-200 mb-2">
            Trailer ready · {Math.round(trailer.durationSec)}s · 9:16
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild className="border-emerald-500/30">
              <a href={trailer.mp4Url} target="_blank" rel="noopener noreferrer" download>
                <Download className="w-3.5 h-3.5 mr-1" />
                Download
              </a>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
