'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Film, MonitorPlay, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { FinalCutSceneClip } from '@/lib/types/finalCut'

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

/** Seek and wait for the decoder; avoids playing the wrong frame at scene boundaries */
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

export interface PreviewClip {
  clip: FinalCutSceneClip
  /** Seconds into the scene clip (0 … clip duration). */
  localTimeSec: number
}

export function findPreviewClipAtTime(
  clips: FinalCutSceneClip[],
  globalTimeSec: number
): PreviewClip | null {
  if (!clips.length) return null
  const t = Math.max(0, globalTimeSec)

  for (const clip of clips) {
    if (t < clip.startTime) continue
    if (t >= clip.endTime) continue
    return { clip, localTimeSec: Math.max(0, t - clip.startTime) }
  }

  // Past last clip: hold last frame.
  const last = clips[clips.length - 1]
  if (last && t >= last.endTime) {
    return { clip: last, localTimeSec: Math.max(0, last.duration - 0.04) }
  }
  return null
}

export interface FinalCutPreviewMonitorProps {
  clips: FinalCutSceneClip[]
  currentTime: number
  isPlaying: boolean
  playbackRate: number
  /** Show the empty-state copy when no clips are resolved yet. */
  hasSelection: boolean
  className?: string
}

/**
 * Read-only program monitor. Plays the resolved scene-level production stream
 * at the playhead. No master volume mixing, no overlays — Final Cut is a
 * preview viewer.
 */
export function FinalCutPreviewMonitor({
  clips,
  currentTime,
  isPlaying,
  playbackRate,
  hasSelection,
  className,
}: FinalCutPreviewMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [previewMuted, setPreviewMuted] = useState(false)
  const isPlayingRef = useRef(isPlaying)
  const playbackRateRef = useRef(playbackRate)
  const previewMutedRef = useRef(previewMuted)
  const resyncGeneration = useRef(0)

  const preview = useMemo(() => findPreviewClipAtTime(clips, currentTime), [clips, currentTime])
  const previewRef = useRef(preview)
  previewRef.current = preview

  const sourceKey = preview?.clip.url
    ? `${preview.clip.sceneId}|${preview.clip.url}`
    : ''

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])
  useEffect(() => {
    playbackRateRef.current = playbackRate
  }, [playbackRate])
  useEffect(() => {
    previewMutedRef.current = previewMuted
  }, [previewMuted])

  const seekVideoToClip = useCallback(() => {
    const v = videoRef.current
    const p = previewRef.current
    if (!v || !p?.clip.url) return
    const target = p.localTimeSec
    if (!Number.isFinite(target)) return
    if (Math.abs(v.currentTime - target) > 0.12) {
      try {
        v.currentTime = target
      } catch {
        /* seek may throw if no data */
      }
    }
  }, [])

  // New URL or scene: load metadata, seek, then play
  useEffect(() => {
    const v = videoRef.current
    const p = previewRef.current
    if (!v || !p?.clip.url || !sourceKey) return

    const gen = ++resyncGeneration.current
    let cancelled = false

    const run = async () => {
      v.pause()
      v.muted = previewMutedRef.current
      v.volume = 1

      await waitLoadedMetadata(v)
      if (cancelled || gen !== resyncGeneration.current) return

      const targetClip = previewRef.current
      if (!targetClip) return
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
  }, [sourceKey])

  useEffect(() => {
    const v = videoRef.current
    const p = previewRef.current
    if (!v || !p?.clip.url || !sourceKey) return
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
  }, [isPlaying, playbackRate, sourceKey, seekVideoToClip])

  useEffect(() => {
    const v = videoRef.current
    const p = previewRef.current
    if (!v || !p?.clip.url) return
    if (v.readyState < HTMLMediaElement.HAVE_METADATA) return
    seekVideoToClip()
  }, [currentTime, seekVideoToClip, sourceKey])

  useEffect(() => {
    const v = videoRef.current
    if (v) v.muted = previewMuted
  }, [previewMuted])

  const heading =
    preview?.clip.heading ||
    (preview?.clip ? `Scene ${preview.clip.sceneNumber}` : '')

  return (
    <div
      className={cn(
        'shrink-0 border-b border-white/[0.06] bg-gradient-to-b from-zinc-950/90 to-zinc-950/70 px-4 py-3',
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 min-w-0">
          <MonitorPlay className="w-4 h-4 text-violet-400 shrink-0" aria-hidden />
          <span className="font-semibold text-zinc-200 truncate">Program preview</span>
          {preview ? (
            <span className="text-zinc-500 truncate hidden md:inline">· {heading}</span>
          ) : null}
        </div>
        {preview?.clip.url ? (
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
            'relative w-full max-w-3xl overflow-hidden rounded-xl border border-violet-500/25 bg-black',
            'aspect-video shadow-[inset_0_2px_24px_rgba(0,0,0,0.65),0_0_0_1px_rgba(139,92,246,0.15),0_24px_80px_-20px_rgba(139,92,246,0.35)]',
            'ring-1 ring-violet-400/10'
          )}
        >
          {!hasSelection || clips.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 p-4 text-center">
              <Film className="w-10 h-10 opacity-40" />
              <p className="text-sm">Pick a format and language to preview</p>
            </div>
          ) : !preview ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 p-4 text-center">
              <Film className="w-10 h-10 opacity-40" />
              <p className="text-sm">No media at the playhead</p>
            </div>
          ) : !preview.clip.url ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 p-4 text-center">
              <Film className="w-10 h-10 opacity-40" />
              <p className="text-sm">No render for this scene yet</p>
              <p className="text-xs text-zinc-600 max-w-sm">
                Render this scene in the Production Scene Mixer or pick a different version.
              </p>
            </div>
          ) : (
            <video
              key={`${preview.clip.sceneId}-${preview.clip.url}`}
              ref={videoRef}
              src={preview.clip.url}
              className="h-full w-full object-contain"
              playsInline
              muted={previewMuted}
              preload="auto"
            />
          )}
        </div>
      </div>
    </div>
  )
}
