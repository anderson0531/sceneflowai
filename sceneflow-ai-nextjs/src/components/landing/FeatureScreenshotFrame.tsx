'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { cn } from '@/lib/utils'

type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
  webkitExitFullscreen?: () => void
  webkitDisplayingFullscreen?: boolean
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function isNativeVideoFullscreen(video: HTMLVideoElement): boolean {
  return Boolean((video as FullscreenVideo).webkitDisplayingFullscreen)
}

function enterNativeVideoFullscreen(video: HTMLVideoElement) {
  ;(video as FullscreenVideo).webkitEnterFullscreen?.()
}

function exitNativeVideoFullscreen(video: HTMLVideoElement) {
  const element = video as FullscreenVideo
  if (element.webkitDisplayingFullscreen) element.webkitExitFullscreen?.()
}

type FeatureScreenshotFrameProps = {
  src: string
  label: string
  enterFullscreenLabel: string
  exitFullscreenLabel: string
}

/** Holds a still WebM on its first frame so the panel reads as a screenshot. */
function holdStill(video: HTMLVideoElement) {
  if (!video.paused) video.pause()
}

function isImageScreenshot(src: string): boolean {
  return /\.(webp|png|jpe?g)(?:$|[?#])/i.test(src)
}

export function FeatureScreenshotFrame({
  src,
  label,
  enterFullscreenLabel,
  exitFullscreenLabel,
}: FeatureScreenshotFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const image = isImageScreenshot(src)

  useEffect(() => {
    const syncFullscreen = () => {
      const frame = frameRef.current
      const video = videoRef.current
      const native = video ? isNativeVideoFullscreen(video) : false
      setIsFullscreen(Boolean(frame && document.fullscreenElement === frame) || native)
    }

    document.addEventListener('fullscreenchange', syncFullscreen)
    const video = videoRef.current
    video?.addEventListener('webkitbeginfullscreen', syncFullscreen)
    video?.addEventListener('webkitendfullscreen', syncFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen)
      video?.removeEventListener('webkitbeginfullscreen', syncFullscreen)
      video?.removeEventListener('webkitendfullscreen', syncFullscreen)
    }
  }, [src])

  const toggleFullscreen = () => {
    const frame = frameRef.current
    const video = videoRef.current
    if (!frame) return

    if (document.fullscreenElement === frame) {
      void document.exitFullscreen?.()
      return
    }
    if (video && isNativeVideoFullscreen(video)) {
      exitNativeVideoFullscreen(video)
      return
    }

    const request =
      frame.requestFullscreen?.bind(frame) ??
      (frame as FullscreenElement).webkitRequestFullscreen?.bind(frame)
    if (request) {
      void Promise.resolve(request()).catch(() => {
        if (video) enterNativeVideoFullscreen(video)
      })
      return
    }
    if (video) enterNativeVideoFullscreen(video)
  }

  const mediaClass = cn(
    'w-full bg-black object-contain object-center',
    isFullscreen ? 'absolute inset-0 h-full' : 'h-auto max-h-[70vh]'
  )

  return (
    <div
      ref={frameRef}
      className={cn(
        'relative mt-4 min-h-[56vh] w-full overflow-hidden rounded-xl border border-slate-700 bg-black',
        isFullscreen && 'mt-0 h-full min-h-0 rounded-none border-0'
      )}
    >
      {image ? (
        <img
          key={src}
          src={src}
          alt={label}
          className={mediaClass}
          onContextMenu={(event) => event.preventDefault()}
        />
      ) : (
        <video
          key={src}
          ref={videoRef}
          className={mediaClass}
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-label={label}
          onLoadedData={(event) => holdStill(event.currentTarget)}
          onPlaying={(event) => holdStill(event.currentTarget)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <source src={`${src}#t=0.1`} type="video/webm" />
        </video>
      )}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute right-3 top-3 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white transition hover:border-cyan-400/40"
        aria-label={isFullscreen ? exitFullscreenLabel : enterFullscreenLabel}
        aria-pressed={isFullscreen}
      >
        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        {isFullscreen ? exitFullscreenLabel : enterFullscreenLabel}
      </button>
    </div>
  )
}
