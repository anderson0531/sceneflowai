'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Film, Image as ImageIcon, MonitorPlay, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { FinalCutStream, StreamScene, StreamSegment } from '@/lib/types/finalCut'
import {
  resolveStreamSegmentMediaForExport,
  resolveSceneLevelPreviewVideo,
} from '@/lib/final-cut/resolveSegmentMedia'

/** Wait until dimensions / duration are known so currentTime seeks are reliable */
function waitLoadedMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const onMeta = () => {
      video.removeEventListener('error', onErr)
      resolve()
    }
    const onErr = () => {
      video.removeEventListener('loadedmetadata', onMeta)
      resolve()
    }
    video.addEventListener('loadedmetadata', onMeta, { once: true })
    video.addEventListener('error', onErr, { once: true })
  })
}

/** Seek and wait for the decoder; avoids playing the wrong frame at scene / URL boundaries */
function seekToTimeAndSettle(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve) => {
    if (!Number.isFinite(seconds)) {
      resolve()
      return
    }
    const target = Math.max(0, seconds)
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    const onSeeked = () => finish()
    video.addEventListener('seeked', onSeeked, { once: true })
    const timer = window.setTimeout(finish, 1000)
    try {
      video.currentTime = target
    } catch {
      finish()
      return
    }
    requestAnimationFrame(() => {
      if (settled) return
      if (!video.seeking && Math.abs(video.currentTime - target) < 0.08) {
        finish()
      }
    })
  })
}

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
  /** True when preview uses full-scene render URL; keeps one `<video>` per scene on the timeline */
  usesSceneLevelVideo?: boolean
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

    const sceneVideoUrl = resolveSceneLevelPreviewVideo(sceneProductionState, scene.sourceSceneId)
    if (sceneVideoUrl && segments.length > 0) {
      const refSeg = segments[0]
      return {
        scene,
        segment: refSeg,
        media: { assetUrl: sceneVideoUrl, assetType: 'video' },
        localTimeSec: Math.max(0, localInScene),
        usesSceneLevelVideo: true,
      }
    }

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
    const sceneSpan = lastScene.endTime - lastScene.startTime
    const localInSceneEnd = Math.max(0, sceneSpan - 0.04)

    const endSceneVideo = resolveSceneLevelPreviewVideo(sceneProductionState, lastScene.sourceSceneId)
    if (endSceneVideo) {
      return {
        scene: lastScene,
        segment: seg,
        media: { assetUrl: endSceneVideo, assetType: 'video' },
        localTimeSec: localInSceneEnd,
        usesSceneLevelVideo: true,
      }
    }

    const media = resolveStreamSegmentMediaForExport(seg, lastScene.sourceSceneId, sceneProductionState)
    if (media?.assetUrl) {
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
  const [previewMuted, setPreviewMuted] = useState(false)
  const isPlayingRef = useRef(isPlaying)
  const playbackRateRef = useRef(playbackRate)
  const previewMutedRef = useRef(previewMuted)
  const masterVolumeRef = useRef(masterVolume)
  const resyncGeneration = useRef(0)

  const clip = useMemo(
    () => findPreviewClipAtTime(selectedStream, currentTime, sceneProductionState),
    [selectedStream, currentTime, sceneProductionState]
  )

  const clipRef = useRef(clip)
  clipRef.current = clip

  const clipSourceKey = useMemo(() => {
    if (!clip || clip.media.assetType !== 'video') return ''
    return `${clip.scene.id}|${clip.media.assetUrl}|${clip.usesSceneLevelVideo ? 'scene' : clip.segment.id}`
  }, [
    clip?.scene.id,
    clip?.media.assetUrl,
    clip?.media.assetType,
    clip?.usesSceneLevelVideo,
    clip?.segment.id,
  ])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])
  useEffect(() => {
    playbackRateRef.current = playbackRate
  }, [playbackRate])
  useEffect(() => {
    previewMutedRef.current = previewMuted
  }, [previewMuted])
  useEffect(() => {
    masterVolumeRef.current = masterVolume
  }, [masterVolume])

  const seekVideoToClip = useCallback(() => {
    const v = videoRef.current
    const c = clipRef.current
    if (!v || !c || c.media.assetType !== 'video') return
    const target = c.localTimeSec
    if (!Number.isFinite(target)) return
    if (Math.abs(v.currentTime - target) > 0.12) {
      try {
        v.currentTime = target
      } catch {
        /* seek may throw if no data */
      }
    }
  }, [])

  // New URL or scene: load metadata, seek, then play — avoids starting before the file is ready
  useEffect(() => {
    const v = videoRef.current
    const c = clipRef.current
    if (!v || !c || c.media.assetType !== 'video' || !clipSourceKey) return

    const gen = ++resyncGeneration.current
    let cancelled = false

    const run = async () => {
      v.pause()
      v.muted = previewMutedRef.current
      v.volume = Math.max(0, Math.min(100, masterVolumeRef.current)) / 100

      await waitLoadedMetadata(v)
      if (cancelled || gen !== resyncGeneration.current) return

      const targetClip = clipRef.current
      if (!targetClip || targetClip.media.assetType !== 'video') return
      await seekToTimeAndSettle(v, targetClip.localTimeSec)
      if (cancelled || gen !== resyncGeneration.current) return

      v.playbackRate = playbackRateRef.current
      v.muted = previewMutedRef.current
      if (isPlayingRef.current) {
        try {
          await v.play()
        } catch {
          setPreviewMuted(true)
          v.muted = true
          v.play().catch(() => {})
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [clipSourceKey])

  // Play / pause when only transport changes (same video source; new source handled by resync)
  useEffect(() => {
    const v = videoRef.current
    const c = clipRef.current
    if (!v || !c || c.media.assetType !== 'video' || !clipSourceKey) return
    if (v.readyState < HTMLMediaElement.HAVE_METADATA) return

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
  }, [isPlaying, playbackRate, clipSourceKey, seekVideoToClip])

  // Scrub / timeline drift (same source)
  useEffect(() => {
    const v = videoRef.current
    const c = clipRef.current
    if (!v || !c || c.media.assetType !== 'video') return
    if (v.readyState < HTMLMediaElement.HAVE_METADATA) return
    seekVideoToClip()
  }, [currentTime, seekVideoToClip, clipSourceKey])

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
          <span className="font-medium text-zinc-300 truncate">Program Preview</span>
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
              key={
                clip.usesSceneLevelVideo
                  ? `scene-${clip.scene.id}-${clip.media.assetUrl}`
                  : `${clip.segment.id}-${clip.media.assetUrl}`
              }
              ref={videoRef}
              src={clip.media.assetUrl}
              className="h-full w-full object-contain"
              playsInline
              muted={previewMuted}
              preload="auto"
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
