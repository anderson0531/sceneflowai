'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Film, Image as ImageIcon, MonitorPlay, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { FinalCutStream, StreamScene, StreamSegment } from '@/lib/types/finalCut'
import { resolveStreamSegmentMediaForExport } from '@/lib/final-cut/resolveSegmentMedia'

function resolvedVideoUrl(
  seg: StreamSegment,
  sourceSceneId: string,
  sceneProductionState: Record<string, unknown>
): string {
  const m = resolveStreamSegmentMediaForExport(seg, sourceSceneId, sceneProductionState)
  return m?.assetType === 'video' && m.assetUrl ? m.assetUrl : ''
}

/**
 * When Production splits a scene into segments that all point at the same video file
 * (one continuous render), seeking with segment-local time restarts at 0 every segment (~8s).
 * Use time since the start of the contiguous same-URL block instead.
 */
function previewSeekSecondsInMedia(
  scene: StreamScene,
  segmentIndex: number,
  localInScene: number,
  mediaUrl: string,
  sceneProductionState: Record<string, unknown>
): number {
  const segments = [...scene.segments].sort((a, b) => a.sequenceIndex - b.sequenceIndex)
  const seg = segments[segmentIndex]
  if (!seg || !mediaUrl) return Math.max(0, localInScene - seg.startTime)

  let j = segmentIndex
  while (j > 0) {
    const prevUrl = resolvedVideoUrl(segments[j - 1], scene.sourceSceneId, sceneProductionState)
    const currUrl = resolvedVideoUrl(segments[j], scene.sourceSceneId, sceneProductionState)
    if (!currUrl || currUrl !== mediaUrl || prevUrl !== mediaUrl) break
    j--
  }
  const blockStartSceneLocal = segments[j].startTime
  return Math.max(0, localInScene - blockStartSceneLocal)
}

export interface PreviewClip {
  scene: StreamScene
  segment: StreamSegment
  media: { assetUrl: string; assetType: 'video' | 'image' }
  /** Seconds into the segment timeline (0 … segment duration) */
  localTimeSec: number
}

export function findPreviewClipAtTime(
  stream: FinalCutStream | null,
  globalTimeSec: number,
  sceneProductionState: Record<string, unknown>
): PreviewClip | null {
  if (!stream?.scenes?.length) return null
  const t = Math.max(0, globalTimeSec)

  for (const scene of stream.scenes) {
    if (t < scene.startTime) continue
    if (t >= scene.endTime) continue

    const localInScene = t - scene.startTime
    const segments = [...scene.segments].sort((a, b) => a.sequenceIndex - b.sequenceIndex)
    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si]
      if (localInScene < seg.startTime || localInScene >= seg.endTime) continue
      const media = resolveStreamSegmentMediaForExport(seg, scene.sourceSceneId, sceneProductionState)
      if (!media?.assetUrl) return null
      const localTimeSec =
        media.assetType === 'video'
          ? previewSeekSecondsInMedia(scene, si, localInScene, media.assetUrl, sceneProductionState)
          : Math.max(0, localInScene - seg.startTime)
      return { scene, segment: seg, media, localTimeSec }
    }
    return null
  }

  // Playhead past last scene end: hold last frame of final segment if possible
  const lastScene = stream.scenes[stream.scenes.length - 1]
  if (lastScene && t >= lastScene.endTime && lastScene.segments.length > 0) {
    const segments = [...lastScene.segments].sort((a, b) => a.sequenceIndex - b.sequenceIndex)
    const lastIdx = segments.length - 1
    const seg = segments[lastIdx]
    const media = resolveStreamSegmentMediaForExport(seg, lastScene.sourceSceneId, sceneProductionState)
    if (media?.assetUrl) {
      const sceneSpan = lastScene.endTime - lastScene.startTime
      const localInSceneEnd = Math.max(0, sceneSpan - 0.04)
      const localTimeSec =
        media.assetType === 'video'
          ? previewSeekSecondsInMedia(
              lastScene,
              lastIdx,
              localInSceneEnd,
              media.assetUrl,
              sceneProductionState
            )
          : Math.max(0, seg.endTime - seg.startTime - 0.04)
      return {
        scene: lastScene,
        segment: seg,
        media,
        localTimeSec,
      }
    }
  }

  return null
}

export interface FinalCutPreviewMonitorProps {
  selectedStream: FinalCutStream | null
  currentTime: number
  isPlaying: boolean
  playbackRate: number
  sceneProductionState: Record<string, unknown>
  /** 0–100 assembly master level; scales preview video element volume when unmuted */
  masterVolume?: number
  className?: string
}

export function FinalCutPreviewMonitor({
  selectedStream,
  currentTime,
  isPlaying,
  playbackRate,
  sceneProductionState,
  masterVolume = 100,
  className,
}: FinalCutPreviewMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [previewMuted, setPreviewMuted] = useState(true)

  const clip = useMemo(
    () => findPreviewClipAtTime(selectedStream, currentTime, sceneProductionState),
    [selectedStream, currentTime, sceneProductionState]
  )

  const seekVideoToClip = useCallback(() => {
    const v = videoRef.current
    if (!v || !clip || clip.media.assetType !== 'video') return
    const target = clip.localTimeSec
    if (!Number.isFinite(target)) return
    if (Math.abs(v.currentTime - target) > 0.12) {
      try {
        v.currentTime = target
      } catch {
        /* seek may throw if no data */
      }
    }
  }, [clip])

  // New file / segment: seek once metadata is ready
  useEffect(() => {
    const v = videoRef.current
    if (!v || !clip || clip.media.assetType !== 'video') return
    const t = clip.localTimeSec
    const apply = () => {
      if (Number.isFinite(t)) v.currentTime = t
    }
    v.addEventListener('loadedmetadata', apply, { once: true })
    if (v.readyState >= 1) apply()
  }, [clip?.media.assetUrl, clip?.segment.id, clip?.media.assetType])

  // Play / pause + rate (avoid depending on full `clip` — it updates every scrub frame)
  useEffect(() => {
    const v = videoRef.current
    if (!v || !clip || clip.media.assetType !== 'video') return
    v.playbackRate = playbackRate
    if (isPlaying) {
      seekVideoToClip()
      v.play().catch(() => {
        setPreviewMuted(true)
        v.muted = true
        v.play().catch(() => {})
      })
    } else {
      v.pause()
      seekVideoToClip()
    }
  }, [
    isPlaying,
    playbackRate,
    clip?.segment.id,
    clip?.media.assetUrl,
    clip?.media.assetType,
    seekVideoToClip,
  ])

  // Scrub / timeline drift
  useEffect(() => {
    seekVideoToClip()
  }, [currentTime, seekVideoToClip])

  useEffect(() => {
    const v = videoRef.current
    if (v) v.muted = previewMuted
  }, [previewMuted])

  const volumeScale = Math.max(0, Math.min(100, masterVolume)) / 100

  useEffect(() => {
    const v = videoRef.current
    if (v) v.volume = volumeScale
  }, [volumeScale, clip?.media.assetUrl])

  const heading = clip?.scene.heading || `Scene ${clip?.scene.sceneNumber ?? ''}`

  return (
    <div
      className={cn(
        'shrink-0 border-b border-white/[0.06] bg-zinc-950/80 px-4 py-3',
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 min-w-0">
          <MonitorPlay className="w-4 h-4 text-violet-400 shrink-0" aria-hidden />
          <span className="font-medium text-zinc-300 truncate">Program preview</span>
          {clip ? (
            <span className="text-zinc-500 truncate hidden md:inline">· {heading}</span>
          ) : null}
        </div>
        {clip?.media.assetType === 'video' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-zinc-400 hover:text-white shrink-0 self-start"
            onClick={() => setPreviewMuted((m) => !m)}
            aria-label={previewMuted ? 'Unmute preview' : 'Mute preview'}
          >
            {previewMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        ) : null}
      </div>

      <div className="mt-3 flex justify-center">
        <div
          className={cn(
            'relative w-full max-w-3xl overflow-hidden rounded-lg border border-zinc-800 bg-black',
            'aspect-video shadow-inner shadow-black/60'
          )}
        >
          {!selectedStream ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 p-4 text-center">
              <Film className="w-10 h-10 opacity-40" />
              <p className="text-sm">Select a stream to preview</p>
            </div>
          ) : !clip ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 p-4 text-center">
              <Film className="w-10 h-10 opacity-40" />
              <p className="text-sm">No media at the playhead</p>
              <p className="text-xs text-zinc-600 max-w-sm">
                Link Production segments or move the playhead over a scene with video or stills.
              </p>
            </div>
          ) : clip.media.assetType === 'video' ? (
            <video
              key={`${clip.segment.id}-${clip.media.assetUrl}`}
              ref={videoRef}
              src={clip.media.assetUrl}
              className="h-full w-full object-contain"
              playsInline
              muted={previewMuted}
              preload="metadata"
            />
          ) : (
            <img
              key={clip.media.assetUrl}
              src={clip.media.assetUrl}
              alt=""
              className="h-full w-full object-contain"
            />
          )}
        </div>
      </div>

      {clip && clip.media.assetType === 'image' ? (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ImageIcon className="w-3.5 h-3.5" />
          Still image at playhead — use transport to scrub the timeline
        </p>
      ) : null}
    </div>
  )
}
