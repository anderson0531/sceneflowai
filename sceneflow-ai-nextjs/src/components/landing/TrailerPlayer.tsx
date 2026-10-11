'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  enterPhoneVideoFullscreen,
  isCoarsePointer,
} from '@/lib/landing/phoneVideoFullscreen'

type Props = {
  webmSrc?: string | null
  mp4Src?: string | null
  label: string
  /** Cover the parent. Stage is a contained trailer for the Screening Room cut. */
  mode?: 'background' | 'stage'
  enterFullscreenLabel?: string
  exitFullscreenLabel?: string
  className?: string
}

export function TrailerPlayer({
  webmSrc,
  mp4Src,
  label,
  mode = 'stage',
  enterFullscreenLabel = 'Enter fullscreen',
  exitFullscreenLabel = 'Exit fullscreen',
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const theaterRef = useRef<HTMLVideoElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const [theaterOpen, setTheaterOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(mode === 'background')
  const [isMuted, setIsMuted] = useState(true)
  const webm = webmSrc?.trim() || ''
  const mp4 = mp4Src?.trim() || ''
  const hasVideo = Boolean(webm || mp4)
  const background = mode === 'background'

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasVideo) return
    if (prefersReducedMotion || theaterOpen) {
      video.pause()
      return
    }
    if (background) {
      video.muted = isMuted
      void video.play().catch(() => {})
    }
  }, [background, hasVideo, isMuted, prefersReducedMotion, theaterOpen, webm, mp4])

  useEffect(() => {
    if (!theaterOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTheaterOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const video = theaterRef.current
    if (video) {
      video.muted = false
      setIsMuted(false)
      void video.play().catch(() => {})
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [theaterOpen])

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    const next = !video.muted
    video.muted = next
    setIsMuted(next)
    if (!next) void video.play().catch(() => {})
  }

  const expand = () => {
    const video = videoRef.current
    if (!video) return
    if (isCoarsePointer()) {
      video.muted = false
      setIsMuted(false)
      enterPhoneVideoFullscreen(video)
      return
    }
    setTheaterOpen(true)
  }

  if (!hasVideo) {
    return (
      <div
        className={cn(
          'bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950',
          background ? 'absolute inset-0' : 'flex aspect-video w-full items-center justify-center rounded-xl',
          className
        )}
      >
        {background ? null : <p className="text-sm font-medium text-slate-300">{label}</p>}
      </div>
    )
  }

  return (
    <>
      <div className={cn(background ? 'pointer-events-none absolute inset-0 z-0' : 'relative', className)}>
        <video
          key={`${webm}|${mp4}|${mode}`}
          ref={videoRef}
          className={cn(
            'bg-black',
            background
              ? 'h-full w-full object-cover'
              : 'aspect-video w-full rounded-xl object-contain'
          )}
          autoPlay={background && !prefersReducedMotion}
          loop={background}
          muted={background || isMuted}
          playsInline
          preload={prefersReducedMotion ? 'none' : 'metadata'}
          controls={!background}
          controlsList={background ? undefined : 'nodownload'}
          onContextMenu={(event) => event.preventDefault()}
          aria-label={label}
        >
          {webm ? <source src={webm} type="video/webm" /> : null}
          {mp4 ? <source src={mp4} type="video/mp4" /> : null}
        </video>
        {background ? null : (
          <button
            type="button"
            onClick={expand}
            className="pointer-events-auto absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85"
            aria-label={enterFullscreenLabel}
          >
            <Maximize className="h-3.5 w-3.5" />
            {enterFullscreenLabel}
          </button>
        )}
      </div>
      {background && hasVideo ? (
        <div className="pointer-events-auto absolute left-3 top-3 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button
            type="button"
            onClick={expand}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85"
            aria-label={enterFullscreenLabel}
          >
            <Maximize className="h-3.5 w-3.5" />
            {enterFullscreenLabel}
          </button>
        </div>
      ) : null}

      {theaterOpen && typeof document !== 'undefined'
        ? createPortal(
        <div className="fixed inset-0 z-[80] bg-black" role="dialog" aria-modal="true" aria-label={label}>
          <video
            key={`theater-${webm}|${mp4}`}
            ref={theaterRef}
            className="h-full w-full object-contain"
            autoPlay
            loop={background}
            playsInline
            controlsList="nodownload"
            onContextMenu={(event) => event.preventDefault()}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            {webm ? <source src={webm} type="video/webm" /> : null}
            {mp4 ? <source src={mp4} type="video/mp4" /> : null}
          </video>
          <button
            type="button"
            onClick={() => setTheaterOpen(false)}
            className="absolute right-4 top-4 z-20 rounded-lg border border-white/15 bg-black/50 p-2 text-gray-200 hover:text-white"
            aria-label={exitFullscreenLabel}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
            <button
              type="button"
              onClick={() => {
                const video = theaterRef.current
                if (!video) return
                if (video.paused) void video.play().catch(() => {})
                else video.pause()
              }}
              className="p-1 text-white hover:text-cyan-400"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const video = theaterRef.current
                if (!video) return
                video.muted = !video.muted
                setIsMuted(video.muted)
              }}
              className="p-1 text-white hover:text-cyan-400"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-white">
              <Minimize className="h-3.5 w-3.5" />
              {exitFullscreenLabel}
            </span>
          </div>
        </div>,
        document.body
      )
        : null}
    </>
  )
}
