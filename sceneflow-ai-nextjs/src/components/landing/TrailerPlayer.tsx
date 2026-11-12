'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Maximize, Minimize, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import { VideoGlobeLanguageSelector } from '@/components/landing/VideoGlobeLanguageSelector'
import type { TrailerDubLocaleId } from '@/config/landing/productionPipelineDemo'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  enterPhoneVideoFullscreen,
  isCoarsePointer,
  isNativeVideoFullscreen,
} from '@/lib/landing/phoneVideoFullscreen'

type Props = {
  webmSrc?: string | null
  mp4Src?: string | null
  posterSrc?: string | null
  label: string
  /** Cover the parent. Stage is a contained trailer for the Screening Room cut. */
  mode?: 'background' | 'stage'
  enterFullscreenLabel?: string
  exitFullscreenLabel?: string
  activeLocale?: TrailerDubLocaleId
  onSelectLocale?: (locale: TrailerDubLocaleId) => void
  className?: string
}

export function TrailerPlayer({
  webmSrc,
  mp4Src,
  posterSrc,
  label,
  mode = 'stage',
  enterFullscreenLabel = 'Enter fullscreen',
  exitFullscreenLabel = 'Exit fullscreen',
  activeLocale,
  onSelectLocale,
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const theaterRef = useRef<HTMLVideoElement>(null)
  const prevInlineSourceRef = useRef<string | null>(null)
  const prevTheaterSourceRef = useRef<string | null>(null)
  const pendingSeekRef = useRef<{ time: number; duration: number } | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const [theaterOpen, setTheaterOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(mode === 'background')
  const [inViewport, setInViewport] = useState(mode !== 'background')
  const [nearViewport, setNearViewport] = useState(mode !== 'background')
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [localeActivated, setLocaleActivated] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const webm = webmSrc?.trim() || ''
  const mp4 = mp4Src?.trim() || ''
  const poster = posterSrc?.trim() || ''
  const hasVideo = Boolean(webm || mp4)
  const background = mode === 'background'

  const playWithAutoplayFallback = useCallback((video: HTMLVideoElement) => {
    void video.play().catch((err: unknown) => {
      const errName =
        err && typeof err === 'object' && 'name' in err
          ? String((err as { name?: unknown }).name)
          : ''
      const fallbackMuted = !video.muted && errName === 'NotAllowedError'
      if (fallbackMuted) {
        video.muted = fallbackMuted
        setIsMuted(fallbackMuted)
        void video.play().catch(() => {})
      }
    })
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasVideo || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== videoRef.current) continue
          if (entry.isIntersecting) {
            setNearViewport(true)
          }
          setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.15)
        }
      },
      { rootMargin: '400px 0px', threshold: [0, 0.15, 0.5] }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [hasVideo, mode])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasVideo) return
    const syncFullscreen = () => {
      const native = isNativeVideoFullscreen(video)
      setIsFullscreen(document.fullscreenElement === video || native)
    }
    document.addEventListener('fullscreenchange', syncFullscreen)
    video.addEventListener('webkitbeginfullscreen', syncFullscreen)
    video.addEventListener('webkitendfullscreen', syncFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen)
      video.removeEventListener('webkitbeginfullscreen', syncFullscreen)
      video.removeEventListener('webkitendfullscreen', syncFullscreen)
    }
  }, [hasVideo, mode])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasVideo) return
    const sourceKey = `${webm}|${mp4}`
    if (prevInlineSourceRef.current === null) {
      prevInlineSourceRef.current = sourceKey
      return
    }
    if (prevInlineSourceRef.current === sourceKey) return
    prevInlineSourceRef.current = sourceKey

    video.load()
    if (!theaterOpen && (background || isFullscreen || localeActivated)) {
      video.muted = isMuted
      playWithAutoplayFallback(video)
    }
  }, [
    background,
    hasVideo,
    isFullscreen,
    isMuted,
    localeActivated,
    mp4,
    playWithAutoplayFallback,
    theaterOpen,
    webm,
  ])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasVideo) return
    if (
      (prefersReducedMotion && !isFullscreen && !localeActivated) ||
      theaterOpen ||
      (!inViewport && !isFullscreen && !localeActivated)
    ) {
      video.pause()
      return
    }
    if (background || isFullscreen || localeActivated) {
      video.muted = isMuted
      playWithAutoplayFallback(video)
    }
  }, [
    background,
    hasVideo,
    inViewport,
    isFullscreen,
    isMuted,
    localeActivated,
    playWithAutoplayFallback,
    prefersReducedMotion,
    theaterOpen,
  ])

  useEffect(() => {
    if (!theaterOpen) {
      prevTheaterSourceRef.current = null
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTheaterOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const video = theaterRef.current
    if (video) {
      prevTheaterSourceRef.current = `${webm}|${mp4}`
      video.muted = false
      setIsMuted(false)
      playWithAutoplayFallback(video)
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [theaterOpen, playWithAutoplayFallback, webm, mp4])

  useEffect(() => {
    if (!theaterOpen) return
    const video = theaterRef.current
    if (!video) return
    const sourceKey = `${webm}|${mp4}`
    if (prevTheaterSourceRef.current === null) {
      prevTheaterSourceRef.current = sourceKey
      return
    }
    if (prevTheaterSourceRef.current === sourceKey) return
    prevTheaterSourceRef.current = sourceKey
    video.load()
    video.muted = isMuted
    playWithAutoplayFallback(video)
  }, [isMuted, mp4, playWithAutoplayFallback, theaterOpen, webm])

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    const next = !video.muted
    video.muted = next
    setIsMuted(next)
    if (!next) void video.play().catch(() => {})
  }

  const handleSelectLocale = (nextLocale: TrailerDubLocaleId) => {
    const activeVideo = theaterOpen ? theaterRef.current : videoRef.current
    if (
      activeVideo &&
      Number.isFinite(activeVideo.currentTime) &&
      Number.isFinite(activeVideo.duration) &&
      activeVideo.duration > 0
    ) {
      pendingSeekRef.current = {
        time: activeVideo.currentTime,
        duration: activeVideo.duration,
      }
    } else {
      pendingSeekRef.current = null
    }
    if (activeVideo) {
      activeVideo.muted = false
    }
    setLocaleActivated(true)
    setNearViewport(true)
    setIsMuted(false)
    if (nextLocale !== activeLocale) {
      setIsBuffering(true)
    } else if (activeVideo && activeVideo.paused) {
      playWithAutoplayFallback(activeVideo)
    }
    onSelectLocale?.(nextLocale)
  }

  const applyPendingSeek = (video: HTMLVideoElement) => {
    const pending = pendingSeekRef.current
    if (!pending) return
    pendingSeekRef.current = null
    if (
      Number.isFinite(video.duration) &&
      Math.abs(video.duration - pending.duration) < 3 &&
      pending.time > 0 &&
      pending.time < video.duration - 0.5
    ) {
      video.currentTime = pending.time
    }
  }

  const expand = () => {
    const video = videoRef.current
    if (!video) return
    if (isCoarsePointer()) {
      video.muted = false
      setIsMuted(false)
      void video.play().catch(() => {})
      if (enterPhoneVideoFullscreen(video)) return
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
      <div
        className={cn(
          background
            ? isFullscreen
              ? 'pointer-events-auto absolute inset-0 z-0'
              : 'pointer-events-none absolute inset-0 z-0'
            : 'relative',
          className
        )}
      >
        <video
          ref={videoRef}
          className={cn(
            'pointer-events-auto bg-black',
            background
              ? isFullscreen
                ? 'h-full w-full object-contain'
                : 'h-full w-full object-cover'
              : 'aspect-video w-full rounded-xl object-contain'
          )}
          poster={poster || undefined}
          autoPlay={(background || localeActivated) && inViewport && !prefersReducedMotion}
          loop={background}
          muted={isMuted}
          playsInline
          preload={
            localeActivated
              ? 'auto'
              : prefersReducedMotion || (background && !nearViewport)
                ? 'none'
                : 'metadata'
          }
          controls={!background || isFullscreen}
          controlsList={background && !isFullscreen ? undefined : 'nodownload'}
          onLoadedMetadata={(event) => applyPendingSeek(event.currentTarget)}
          onWaiting={() => {
            if (localeActivated) setIsBuffering(true)
          }}
          onLoadedData={() => setIsBuffering(false)}
          onCanPlay={(event) => {
            setIsBuffering(false)
            if (!theaterOpen && (background || isFullscreen || localeActivated) && inViewport) {
              event.currentTarget.muted = isMuted
              playWithAutoplayFallback(event.currentTarget)
            }
          }}
          onPlaying={() => setIsBuffering(false)}
          onError={() => setIsBuffering(false)}
          onContextMenu={(event) => event.preventDefault()}
          aria-label={label}
        >
          {webm ? <source src={webm} type="video/webm" /> : null}
          {mp4 ? <source src={mp4} type="video/mp4" /> : null}
        </video>
        {isBuffering && localeActivated && !theaterOpen ? (
          <div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/20"
            aria-hidden
          >
            <Loader2 className="h-7 w-7 animate-spin text-cyan-400/85" />
          </div>
        ) : null}
        {background ? null : (
          <div className="pointer-events-auto absolute left-3 top-3 z-30 flex items-center gap-1.5">
            {activeLocale && onSelectLocale ? (
              <VideoGlobeLanguageSelector
                activeLocale={activeLocale}
                onSelectLocale={handleSelectLocale}
                variant="card"
                align="start"
              />
            ) : null}
            <VideoControlTooltip label={enterFullscreenLabel}>
              <button
                type="button"
                onClick={expand}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85"
                aria-label={enterFullscreenLabel}
              >
                <Maximize className="h-3.5 w-3.5" />
              </button>
            </VideoControlTooltip>
          </div>
        )}
      </div>
      {background && hasVideo ? (
        <div className="pointer-events-auto absolute left-3 top-3 z-30 flex items-center gap-1.5">
          {activeLocale && onSelectLocale ? (
            <VideoGlobeLanguageSelector
              activeLocale={activeLocale}
              onSelectLocale={handleSelectLocale}
              variant="card"
              align="start"
            />
          ) : null}
          <VideoControlTooltip label={isMuted ? 'Unmute' : 'Mute'}>
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </VideoControlTooltip>
          <VideoControlTooltip label={enterFullscreenLabel}>
            <button
              type="button"
              onClick={expand}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85"
              aria-label={enterFullscreenLabel}
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </VideoControlTooltip>
        </div>
      ) : null}

      {theaterOpen && typeof document !== 'undefined'
        ? createPortal(
        <div className="fixed inset-0 z-[80] bg-black" role="dialog" aria-modal="true" aria-label={label}>
          <video
            ref={theaterRef}
            className="h-full w-full object-contain"
            autoPlay
            loop={background}
            playsInline
            preload="auto"
            controlsList="nodownload"
            onLoadedMetadata={(event) => applyPendingSeek(event.currentTarget)}
            onContextMenu={(event) => event.preventDefault()}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            {webm ? <source src={webm} type="video/webm" /> : null}
            {mp4 ? <source src={mp4} type="video/mp4" /> : null}
          </video>
          {activeLocale && onSelectLocale ? (
            <div className="absolute left-4 top-4 z-20">
              <VideoGlobeLanguageSelector
                activeLocale={activeLocale}
                onSelectLocale={handleSelectLocale}
                variant="theater"
                align="start"
              />
            </div>
          ) : null}
          <VideoControlTooltip label={exitFullscreenLabel}>
            <button
              type="button"
              onClick={() => setTheaterOpen(false)}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/65 text-gray-200 backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85 hover:text-white"
              aria-label={exitFullscreenLabel}
            >
              <X className="h-5 w-5" />
            </button>
          </VideoControlTooltip>
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
            <VideoControlTooltip label={isPlaying ? 'Pause' : 'Play'} side="top">
              <button
                type="button"
                onClick={() => {
                  const video = theaterRef.current
                  if (!video) return
                  if (video.paused) void video.play().catch(() => {})
                  else video.pause()
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </VideoControlTooltip>
            <VideoControlTooltip label={isMuted ? 'Unmute' : 'Mute'} side="top">
              <button
                type="button"
                onClick={() => {
                  const video = theaterRef.current
                  if (!video) return
                  video.muted = !video.muted
                  setIsMuted(video.muted)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </VideoControlTooltip>
            <VideoControlTooltip label={exitFullscreenLabel} side="top">
              <button
                type="button"
                onClick={() => setTheaterOpen(false)}
                className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
                aria-label={exitFullscreenLabel}
              >
                <Minimize className="h-4 w-4" />
              </button>
            </VideoControlTooltip>
          </div>
        </div>,
        document.body
      )
        : null}
    </>
  )
}
