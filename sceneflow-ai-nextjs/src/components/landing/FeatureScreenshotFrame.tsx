'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  children: ReactNode
}

/** Holds a still WebM on its first frame so the panel reads as a screenshot. */
function holdStill(video: HTMLVideoElement) {
  if (!video.paused) video.pause()
}

export function FeatureScreenshotFrame({
  src,
  label,
  enterFullscreenLabel,
  exitFullscreenLabel,
  children,
}: FeatureScreenshotFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

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
    if (!frame || !video) return

    if (document.fullscreenElement === frame) {
      void document.exitFullscreen?.()
      return
    }
    if (isNativeVideoFullscreen(video)) {
      exitNativeVideoFullscreen(video)
      return
    }

    const request =
      frame.requestFullscreen?.bind(frame) ??
      (frame as FullscreenElement).webkitRequestFullscreen?.bind(frame)
    if (request) {
      void Promise.resolve(request()).catch(() => {
        enterNativeVideoFullscreen(video)
      })
      return
    }
    enterNativeVideoFullscreen(video)
  }

  return (
    <div className="relative min-h-[70vh] overflow-hidden">
      <div
        ref={frameRef}
        className={cn(
          'bg-black',
          isFullscreen ? 'relative h-full w-full' : 'absolute inset-0'
        )}
      >
        <video
          key={src}
          ref={videoRef}
          className={cn(
            'absolute inset-0 z-0 h-full w-full bg-black',
            isFullscreen ? 'object-contain object-center' : 'object-cover object-center'
          )}
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
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 z-[1] h-48 bg-gradient-to-b from-black/70 via-black/30 to-transparent',
            isFullscreen && 'hidden'
          )}
        />
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
      <div
        className={cn(
          'pointer-events-none relative z-10 flex min-h-[70vh] flex-col justify-start p-5 sm:p-6',
          isFullscreen && 'hidden'
        )}
      >
        {children}
      </div>
    </div>
  )
}
