'use client'

import React, { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import {
  AlertTriangle,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  Trash2,
  Video,
} from 'lucide-react'
import type { SceneProductionData } from './types'

export interface SegmentResetImpact {
  segmentCount: number
  segmentsWithKeyframes: number
  keyframeImageCount: number
  videoCount: number
  imageClipCount: number
  alternateTakeCount: number
  hasRenderedScene: boolean
  productionStreamCount: number
  lockedSegmentCount: number
}

export function computeSegmentResetImpact(
  production: SceneProductionData | null | undefined
): SegmentResetImpact {
  const segments = production?.segments ?? []
  let keyframeImageCount = 0
  let segmentsWithKeyframes = 0
  let videoCount = 0
  let imageClipCount = 0
  let alternateTakeCount = 0
  let lockedSegmentCount = 0

  for (const seg of segments) {
    const startUrl = seg.references?.startFrameUrl || seg.startFrameUrl
    const endUrl = seg.references?.endFrameUrl || seg.endFrameUrl
    if (startUrl) keyframeImageCount++
    if (endUrl) keyframeImageCount++
    if (startUrl || endUrl) segmentsWithKeyframes++

    if (seg.activeAssetUrl) {
      if (seg.assetType === 'image') imageClipCount++
      else videoCount++
    }

    alternateTakeCount += Array.isArray(seg.takes) ? seg.takes.length : 0
    if (seg.lockedForProduction) lockedSegmentCount++
  }

  const streams = production?.productionStreams ?? []
  const productionStreamCount = streams.filter((s) => !!s.mp4Url).length

  const hasRenderedScene =
    !!production?.renderedSceneUrl || productionStreamCount > 0

  return {
    segmentCount: segments.length,
    segmentsWithKeyframes,
    keyframeImageCount,
    videoCount,
    imageClipCount,
    alternateTakeCount,
    hasRenderedScene,
    productionStreamCount,
    lockedSegmentCount,
  }
}

interface ResetSegmentsConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sceneNumber: number
  sceneHeading?: string
  production: SceneProductionData | null | undefined
  isResetting?: boolean
  onConfirm: () => void | Promise<void>
}

function ImpactRow({
  icon: Icon,
  label,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  detail?: string
}) {
  return (
    <li className="flex gap-3 text-sm">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-500/15 text-red-300">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-gray-200">
        <span className="font-medium text-red-100">{label}</span>
        {detail ? (
          <span className="mt-0.5 block text-xs text-gray-400">{detail}</span>
        ) : null}
      </span>
    </li>
  )
}

/**
 * Destructive confirmation before clearing all production segments for a scene.
 */
export function ResetSegmentsConfirmDialog({
  open,
  onOpenChange,
  sceneNumber,
  sceneHeading,
  production,
  isResetting = false,
  onConfirm,
}: ResetSegmentsConfirmDialogProps) {
  const impact = useMemo(() => computeSegmentResetImpact(production), [production])

  const hasGeneratedWork =
    impact.segmentCount > 0 &&
    (impact.keyframeImageCount > 0 ||
      impact.videoCount > 0 ||
      impact.imageClipCount > 0 ||
      impact.alternateTakeCount > 0 ||
      impact.hasRenderedScene)

  return (
    <Dialog open={open} onOpenChange={(next) => !isResetting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg border-red-900/40 bg-gray-950 text-gray-100">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/20 ring-1 ring-red-500/40">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="space-y-1 text-left">
              <DialogTitle className="text-lg text-white">
                Reset scene production?
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-400">
                Scene {sceneNumber}
                {sceneHeading ? (
                  <>
                    {' '}
                    <span className="text-gray-500">·</span>{' '}
                    <span className="text-gray-300">{sceneHeading}</span>
                  </>
                ) : null}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm leading-relaxed text-red-100/90">
            This removes your entire <strong className="font-semibold text-red-50">segment timeline</strong>{' '}
            for this scene and cannot be undone. You will need to run segment setup again from scratch.
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              What you will lose
            </p>
            <ul className="space-y-2.5">
              <ImpactRow
                icon={Layers}
                label={`${impact.segmentCount} segment${impact.segmentCount === 1 ? '' : 's'}`}
                detail="Timing, direction notes, Veo prompts, and dialogue-to-segment mapping"
              />
              {impact.keyframeImageCount > 0 ? (
                <ImpactRow
                  icon={ImageIcon}
                  label={
                    impact.keyframeImageCount === 1
                      ? '1 keyframe image'
                      : `${impact.keyframeImageCount} keyframe images`
                  }
                  detail={
                    impact.segmentsWithKeyframes > 0
                      ? `Across ${impact.segmentsWithKeyframes} segment${impact.segmentsWithKeyframes === 1 ? '' : 's'} (start/end frames)`
                      : 'Start and end frame stills used for video generation'
                  }
                />
              ) : null}
              {impact.videoCount > 0 ? (
                <ImpactRow
                  icon={Video}
                  label={
                    impact.videoCount === 1
                      ? '1 generated video clip'
                      : `${impact.videoCount} generated video clips`
                  }
                  detail="Segment-level Veo / I2V outputs and active takes on the timeline"
                />
              ) : null}
              {impact.imageClipCount > 0 ? (
                <ImpactRow
                  icon={ImageIcon}
                  label={
                    impact.imageClipCount === 1
                      ? '1 image clip'
                      : `${impact.imageClipCount} image clips`
                  }
                  detail="Uploaded or generated still assets attached to segments"
                />
              ) : null}
              {impact.alternateTakeCount > 0 ? (
                <ImpactRow
                  icon={Film}
                  label={
                    impact.alternateTakeCount === 1
                      ? '1 alternate take'
                      : `${impact.alternateTakeCount} alternate takes`
                  }
                  detail="Extra generations stored per segment"
                />
              ) : null}
              {impact.hasRenderedScene ? (
                <ImpactRow
                  icon={Clapperboard}
                  label="Scene render / production stream"
                  detail={
                    impact.productionStreamCount > 0
                      ? `${impact.productionStreamCount} language or output stream${impact.productionStreamCount === 1 ? '' : 's'} linked to this scene`
                      : 'Final mixed scene output from the production mixer'
                  }
                />
              ) : null}
              {!hasGeneratedWork && impact.segmentCount > 0 ? (
                <ImpactRow
                  icon={Layers}
                  label="Segment structure only"
                  detail="No keyframes or clips detected yet, but segmentation progress will still be cleared"
                />
              ) : null}
            </ul>
          </div>

          <p className="rounded-md border border-gray-800 bg-gray-900/60 px-3 py-2 text-xs text-gray-400">
            <strong className="font-medium text-gray-300">Not deleted:</strong> script text, scene
            dialogue, narration, music/SFX audio, scene still image, and character references.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResetting}
            className="border-gray-700 text-gray-200 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={isResetting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Reset production
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
