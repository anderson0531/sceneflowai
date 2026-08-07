'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Download,
  Film,
  Loader2,
  Mic2,
  Music2,
  Smartphone,
  Sparkles,
  Clapperboard,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { planPromoTrailer, DEFAULT_TRAILER_SEC } from '@/lib/publish/trailerPlanner'
import { getPublishingState, upsertPublishingState } from '@/lib/publish/publishingState'
import { findPromoSceneIndex, isPromoCinematicScene } from '@/lib/publish/buildPromoScene'
import type { PromoTrailerBeatPlan, PromoTrailerAsset } from '@/types/publishingAssets'
import type { ProjectStream } from '@/lib/streams/projectStreams'
import type { SceneProductionData } from '@/components/vision/scene-production/types'

export interface PublishingPromoTabProps {
  projectId: string
  projectTitle?: string
  metadata: unknown
  script?: unknown
  streams: ProjectStream[]
  userId?: string
  sceneProductionState?: Record<string, SceneProductionData>
  onSaveMetadata: (metadata: Record<string, unknown>) => Promise<void>
  /** Apply updated script scenes after promo upsert / audio. */
  onScriptScenesUpdated?: (scenes: unknown[]) => void
  /** Jump to Screening Room Promo mode after render. */
  onPreviewPromo?: () => void
  /** Focus the promo scene in Studio / Director Console. */
  onOpenPromoInStudio?: (sceneId: string) => void
}

const TARGET_OPTIONS = [30, 45, 60] as const

export function PublishingPromoTab({
  projectId,
  projectTitle,
  metadata,
  script,
  streams,
  userId,
  sceneProductionState,
  onSaveMetadata,
  onScriptScenesUpdated,
  onPreviewPromo,
  onOpenPromoInStudio,
}: PublishingPromoTabProps) {
  const [targetDuration, setTargetDuration] = useState<(typeof TARGET_OPTIONS)[number]>(
    DEFAULT_TRAILER_SEC
  )
  const [beatPlan, setBeatPlan] = useState<PromoTrailerBeatPlan[]>([])
  const [planning, setPlanning] = useState(false)
  const [upserting, setUpserting] = useState(false)
  const [narrating, setNarrating] = useState(false)
  const [composing, setComposing] = useState(false)
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

  const promoScene = useMemo(() => {
    const idx = findPromoSceneIndex(scenes)
    return idx >= 0 ? (scenes[idx] as Record<string, unknown>) : null
  }, [scenes])

  const sceneScores = useMemo(() => {
    const review = (metadata as { audienceReview?: { sceneScores?: Record<number, number> } })
      ?.audienceReview
    return review?.sceneScores
  }, [metadata])

  const applyScenes = useCallback(
    (nextScenes: unknown[], nextMetadata?: Record<string, unknown>) => {
      onScriptScenesUpdated?.(nextScenes)
      if (nextMetadata) {
        void onSaveMetadata(nextMetadata)
      }
    },
    [onScriptScenesUpdated, onSaveMetadata]
  )

  const handleRegeneratePlan = useCallback(() => {
    setPlanning(true)
    try {
      const result = planPromoTrailer({
        scenes,
        sceneProductionState,
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
  }, [scenes, sceneProductionState, sceneScores, targetDuration])

  const handleUpsertPromoScene = useCallback(async () => {
    setUpserting(true)
    try {
      const res = await fetch('/api/publish/promo/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'upsert',
          targetDurationSec: targetDuration,
          sceneScores,
          scenes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create promo scene')
      if (Array.isArray(data.beatPlan)) setBeatPlan(data.beatPlan)
      if (Array.isArray(data.scenes)) {
        applyScenes(data.scenes, data.metadata)
      }
      toast.success('Promo scene ready — add narration/music or open in Studio')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Promo scene failed')
    } finally {
      setUpserting(false)
    }
  }, [projectId, targetDuration, sceneScores, scenes, applyScenes])

  const handleGenerateNarration = useCallback(async () => {
    setNarrating(true)
    try {
      const res = await fetch('/api/publish/promo/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'narration',
          targetDurationSec: targetDuration,
          scenes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Narration failed')
      if (Array.isArray(data.scenes)) applyScenes(data.scenes, data.metadata)
      toast.success('Promo narration generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Narration failed')
    } finally {
      setNarrating(false)
    }
  }, [projectId, targetDuration, scenes, applyScenes])

  const handleGenerateMusic = useCallback(async () => {
    setComposing(true)
    try {
      const res = await fetch('/api/publish/promo/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'music',
          targetDurationSec: targetDuration,
          scenes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Music failed')
      if (Array.isArray(data.scenes)) applyScenes(data.scenes, data.metadata)
      toast.success('Promo music generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Music failed')
    } finally {
      setComposing(false)
    }
  }, [projectId, targetDuration, scenes, applyScenes])

  const handleRenderTrailer = useCallback(async () => {
    const plan =
      beatPlan.length > 0
        ? beatPlan
        : planPromoTrailer({
            scenes,
            sceneProductionState,
            sceneScores,
            targetDurationSec: targetDuration,
          }).beatPlan

    if (plan.length === 0) {
      toast.error('Generate a beat plan or promo scene first.')
      return
    }

    const hasClip = plan.some((b) => b.videoUrl) || !!masterStream?.mp4Url
    if (!hasClip) {
      toast.error('Need scene video clips or a master stream to render.')
      return
    }

    setRendering(true)
    try {
      const narrationAudioUrl = (() => {
        const da = promoScene?.dialogueAudio as Record<string, Array<{ audioUrl?: string }>> | undefined
        return da?.en?.[0]?.audioUrl
      })()
      const musicAudioUrl =
        typeof promoScene?.musicAudio === 'string' ? promoScene.musicAudio : undefined

      const res = await fetch('/api/publish/trailer/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          videoUrl: masterStream?.mp4Url,
          beatPlan: plan,
          targetDurationSec: targetDuration,
          title: projectTitle,
          narrationAudioUrl,
          musicAudioUrl,
          promoSceneId: typeof promoScene?.id === 'string' ? promoScene.id : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Trailer render failed')

      const trailerAsset: PromoTrailerAsset = {
        mp4Url: data.mp4Url,
        aspect: '9:16',
        durationSec: data.durationSec ?? targetDuration,
        targetDurationSec: targetDuration,
        beatPlan: plan,
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
      setBeatPlan(plan)
      toast.success('Promo trailer rendered')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Trailer render failed')
    } finally {
      setRendering(false)
    }
  }, [
    beatPlan,
    scenes,
    sceneProductionState,
    sceneScores,
    masterStream,
    projectId,
    userId,
    targetDuration,
    projectTitle,
    metadata,
    publishingState.promo,
    onSaveMetadata,
    promoScene,
  ])

  return (
    <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 p-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
          <Smartphone className="w-4 h-4 text-fuchsia-400" />
          9:16 Promo Trailer
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Build a captivating ~{targetDuration}s trailer from existing beats, frames, and clips.
          Promo-specific narration and music stay on the promo scene.
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
            Plan beats
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleUpsertPromoScene}
            disabled={upserting}
            className="border-fuchsia-500/40 text-fuchsia-200"
          >
            {upserting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Clapperboard className="w-4 h-4 mr-1" />
            )}
            {promoScene ? 'Refresh promo scene' : 'Create promo scene'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateNarration}
            disabled={narrating || !promoScene}
          >
            {narrating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Mic2 className="w-4 h-4 mr-1" />
            )}
            Promo narration
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateMusic}
            disabled={composing || !promoScene}
          >
            {composing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Music2 className="w-4 h-4 mr-1" />
            )}
            Promo music
          </Button>
          <Button
            size="sm"
            onClick={handleRenderTrailer}
            disabled={
              rendering ||
              (beatPlan.length === 0 && !promoScene) ||
              (!masterStream?.mp4Url && !beatPlan.some((b) => b.videoUrl))
            }
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

        {promoScene && onOpenPromoInStudio ? (
          <Button
            size="sm"
            variant="ghost"
            className="mb-3 text-xs text-zinc-400"
            onClick={() =>
              onOpenPromoInStudio(String(promoScene.id || promoScene.sceneId || ''))
            }
          >
            Open promo scene in Studio
          </Button>
        ) : null}

        {(beatPlan.length > 0 ||
          (Array.isArray(promoScene?.promoBeatPlan) &&
            (promoScene!.promoBeatPlan as unknown[]).length > 0)) && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
              Beat timeline (
              {beatPlan.length ||
                (promoScene?.promoBeatPlan as PromoTrailerBeatPlan[] | undefined)?.length ||
                0}{' '}
              beats)
            </p>
            <div className="flex flex-wrap gap-1">
              {(beatPlan.length
                ? beatPlan
                : ((promoScene?.promoBeatPlan as PromoTrailerBeatPlan[]) || [])
              ).map((beat) => (
                <span
                  key={`${beat.sceneIndex}-${beat.beatId}`}
                  className="text-[10px] px-2 py-0.5 rounded bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-200"
                  title={beat.label}
                >
                  S{beat.sceneIndex + 1} · {beat.durationSec ?? beat.endSec - beat.startSec}s
                  {beat.videoUrl ? ' · clip' : beat.frameUrl ? ' · frame' : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {trailer?.mp4Url ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-xs text-emerald-200 mb-2">
            Trailer ready · {Math.round(trailer.durationSec)}s · 9:16
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={trailer.mp4Url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center rounded-md border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download
            </a>
            {onPreviewPromo ? (
              <Button size="sm" variant="outline" onClick={onPreviewPromo}>
                Play in Screening Room
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {promoScene && isPromoCinematicScene(promoScene) ? (
        <p className="text-[11px] text-zinc-500">
          Promo scene is excluded from Animatic/Video film playthrough — use Screening Room → Promo.
        </p>
      ) : null}
    </div>
  )
}
