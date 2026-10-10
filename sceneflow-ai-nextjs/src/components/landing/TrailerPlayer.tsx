'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  enterPhoneVideoFullscreen,
  isPhoneViewport,
} from '@/lib/landing/phoneVideoFullscreen'

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

type Props = {
  webmSrc?: string | null
  mp4Src?: string | null
  label: string
  enterFullscreenLabel?: string
  exitFullscreenLabel?: string
  className?: string
}

export function TrailerPlayer({
  webmSrc,
  mp4Src,
  label,
  enterFullscreenLabel = 'Enter fullscreen',
  exitFullscreenLabel = 'Exit fullscreen',
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const webm = webmSrc?.trim() || ''
  const mp4 = mp4Src?.trim() || ''
  const hasVideo = Boolean(webm || mp4)

  useEffect(() => {
    const video = videoRef.current
    const onDocumentChange = () => setIsFullscreen(!!document.fullscreenElement)
    const onWebkitBegin = () => setIsFullscreen(true)
    const onWebkitEnd = () => setIsFullscreen(false)

    document.addEventListener('fullscreenchange', onDocumentChange)
    video?.addEventListener('webkitbeginfullscreen', onWebkitBegin)
    video?.addEventListener('webkitendfullscreen', onWebkitEnd)
    return () => {
      document.removeEventListener('fullscreenchange', onDocumentChange)
      video?.removeEventListener('webkitbeginfullscreen', onWebkitBegin)
      video?.removeEventListener('webkitendfullscreen', onWebkitEnd)
    }
  }, [hasVideo, webm, mp4])

  const toggleFullscreen = () => {
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video) return

    if (document.fullscreenElement) {
      void document.exitFullscreen?.()
      return
    }

    if (isPhoneViewport() && enterPhoneVideoFullscreen(video)) return

    const request =
      container.requestFullscreen?.bind(container) ??
      (container as FullscreenElement).webkitRequestFullscreen?.bind(container)
    if (request) {
      void Promise.resolve(request()).catch(() => {
        enterPhoneVideoFullscreen(video)
      })
      return
    }
    enterPhoneVideoFullscreen(video)
  }

  if (!hasVideo) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950">
        <p className="text-sm font-medium text-slate-300">{label}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative',
        isFullscreen && 'flex h-full w-full items-center justify-center bg-black'
      )}
    >
      <video
        key={`${webm}|${mp4}`}
        ref={videoRef}
        className={cn(
          'aspect-video w-full rounded-xl bg-black object-contain',
          isFullscreen && 'max-h-screen rounded-none',
          className
        )}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onContextMenu={(event) => event.preventDefault()}
        aria-label={label}
      >
        {webm ? <source src={webm} type="video/webm" /> : null}
        {mp4 ? <source src={mp4} type="video/mp4" /> : null}
      </video>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85"
        aria-label={isFullscreen ? exitFullscreenLabel : enterFullscreenLabel}
      >
        {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
        {isFullscreen ? exitFullscreenLabel : enterFullscreenLabel}
      </button>
    </div>
  )
}
