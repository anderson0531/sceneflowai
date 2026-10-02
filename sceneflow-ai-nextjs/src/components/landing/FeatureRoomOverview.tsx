'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { VideoLanguageControl } from '@/components/landing/VideoLanguagePicker'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useLandingVideoLocale } from '@/i18n/useLandingVideoLocale'
import {
  FEATURE_ROOM_COLD_OPEN_SECONDS,
  featureRoomHasVideo,
  getFeatureRoomMedia,
  getFeatureRoomVideoLocales,
} from '@/config/landing/featureRoomMedia'
import type { VideoLocaleId } from '@/config/landing/videoLocales'

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

type FeatureRoomOverviewProps = {
  roomId: string
  title: string
  promise: string
  comingSoonLabel: string
  soonLabel: string
  pauseLabel: string
  playLabel: string
  muteLabel: string
  unmuteLabel: string
  enterFullscreenLabel: string
  exitFullscreenLabel: string
  watchLongformHref?: string
  watchLongformLabel?: string
}

export function FeatureRoomOverview({
  roomId,
  title,
  promise,
  comingSoonLabel,
  soonLabel,
  pauseLabel,
  playLabel,
  muteLabel,
  unmuteLabel,
  enterFullscreenLabel,
  exitFullscreenLabel,
  watchLongformHref,
  watchLongformLabel,
}: FeatureRoomOverviewProps) {
  const videoLocales = useMemo(() => getFeatureRoomVideoLocales(roomId), [roomId])
  const pageLocaleId = useLandingVideoLocale()
  const playerLocaleId = useLandingVideoLocale(videoLocales)
  const anyAvailable = videoLocales.some((locale) => locale.available)
  const syncedLocaleId = anyAvailable ? playerLocaleId : pageLocaleId
  const prefersReducedMotion = useReducedMotion()
  const bandRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activeLocaleId, setActiveLocaleId] = useState<VideoLocaleId>(syncedLocaleId)
  const [inView, setInView] = useState(false)
  const [pausedByUser, setPausedByUser] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [filmEngaged, setFilmEngaged] = useState(false)

  const media = getFeatureRoomMedia(roomId, activeLocaleId)
  const hasVideo = featureRoomHasVideo(media)

  useEffect(() => {
    setActiveLocaleId(syncedLocaleId)
  }, [syncedLocaleId])

  useEffect(() => {
    setPausedByUser(false)
    setFilmEngaged(false)
    setIsMuted(true)
  }, [roomId])

  useEffect(() => {
    const syncFullscreen = () => {
      const band = bandRef.current
      const video = videoRef.current
      const native = video ? isNativeVideoFullscreen(video) : false
      setIsFullscreen(Boolean(band && document.fullscreenElement === band) || native)
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
  }, [hasVideo, activeLocaleId, roomId])

  useEffect(() => {
    if (hasVideo) return
    if (document.fullscreenElement === bandRef.current) {
      void document.exitFullscreen?.()
    }
  }, [hasVideo])

  useEffect(() => {
    const band = bandRef.current
    if (!band) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.45 }
    )
    observer.observe(band)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasVideo) return
    const offscreen = !inView && !isFullscreen
    const holdColdOpen = !filmEngaged && (prefersReducedMotion || offscreen || pausedByUser)
    if (holdColdOpen || (filmEngaged && (offscreen || pausedByUser))) {
      video.pause()
      return
    }
    if (!filmEngaged) {
      video.muted = true
    }
    void video.play().catch(() => {})
  }, [
    hasVideo,
    inView,
    pausedByUser,
    prefersReducedMotion,
    filmEngaged,
    isFullscreen,
    activeLocaleId,
    media.webmUrl,
    media.mp4Url,
  ])

  const engageFilm = () => {
    const video = videoRef.current
    if (!video || !hasVideo) return
    setFilmEngaged(true)
    setPausedByUser(false)
    setIsMuted(false)
    video.currentTime = 0
    video.muted = false
    void video.play().catch(() => {})
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video || !hasVideo) return
    if (!filmEngaged) {
      engageFilm()
      return
    }
    if (video.paused) {
      setPausedByUser(false)
      void video.play().catch(() => {})
    } else {
      setPausedByUser(true)
      video.pause()
    }
  }

  const toggleMute = () => {
    if (!hasVideo) return
    if (!filmEngaged) {
      engageFilm()
      return
    }
    setIsMuted((muted) => !muted)
  }

  const toggleFullscreen = () => {
    const band = bandRef.current
    const video = videoRef.current
    if (!band || !video || !hasVideo) return

    if (document.fullscreenElement === band) {
      void document.exitFullscreen?.()
      return
    }
    if (isNativeVideoFullscreen(video)) {
      exitNativeVideoFullscreen(video)
      return
    }

    const request =
      band.requestFullscreen?.bind(band) ??
      (band as FullscreenElement).webkitRequestFullscreen?.bind(band)
    if (request) {
      void Promise.resolve(request()).catch(() => {
        enterNativeVideoFullscreen(video)
      })
      return
    }
    enterNativeVideoFullscreen(video)
  }

  const onTimeUpdate = () => {
    const video = videoRef.current
    if (!video || filmEngaged) return
    if (video.currentTime >= FEATURE_ROOM_COLD_OPEN_SECONDS) {
      video.currentTime = 0
    }
  }

  const selectLocale = (id: VideoLocaleId) => {
    const entry = videoLocales.find((locale) => locale.id === id)
    if (!entry?.available) return
    setActiveLocaleId(id)
    setPausedByUser(false)
  }

  return (
    <div
      ref={bandRef}
      className={cn(
        'relative mb-6 min-h-[180px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950',
        isFullscreen && 'mb-0 min-h-0 rounded-none border-0 bg-black'
      )}
    >
      {hasVideo ? (
        <video
          key={`${roomId}-${activeLocaleId}`}
          ref={videoRef}
          poster={media.posterUrl || undefined}
          autoPlay={!prefersReducedMotion && !filmEngaged}
          muted={isMuted}
          playsInline
          preload={prefersReducedMotion ? 'none' : 'metadata'}
          className={cn(
            'absolute inset-0 h-full w-full object-cover',
            isFullscreen && 'object-contain'
          )}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => {
            const video = videoRef.current
            if (!video || filmEngaged) return
            video.currentTime = 0
            void video.play().catch(() => {})
          }}
        >
          {media.webmUrl ? <source src={media.webmUrl} type="video/webm" /> : null}
          {media.mp4Url ? <source src={media.mp4Url} type="video/mp4" /> : null}
        </video>
      ) : media.posterUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${media.posterUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950" />
      )}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/25',
          isFullscreen && 'from-black/80 via-transparent to-black/35'
        )}
      />
      <div
        className={cn(
          'relative z-10 flex min-h-[180px] flex-col justify-end px-5 pb-5 pt-14 sm:px-6 sm:pb-6 sm:pt-16',
          isFullscreen && 'h-full min-h-full w-full'
        )}
      >
        {isFullscreen ? null : (
          <>
            <h3 className="text-2xl font-bold text-white sm:text-3xl">{title}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-200 sm:text-base">{promise}</p>
          </>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!hasVideo}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white transition hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={filmEngaged && isPlaying ? pauseLabel : playLabel}
          >
            {filmEngaged && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {hasVideo ? (filmEngaged && isPlaying ? pauseLabel : playLabel) : comingSoonLabel}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            disabled={!hasVideo}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white transition hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={isMuted ? unmuteLabel : muteLabel}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {isMuted ? unmuteLabel : muteLabel}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            disabled={!hasVideo}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white transition hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={isFullscreen ? exitFullscreenLabel : enterFullscreenLabel}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            {isFullscreen ? exitFullscreenLabel : enterFullscreenLabel}
          </button>
          {watchLongformHref && watchLongformLabel ? (
            <a
              href={watchLongformHref}
              className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-100 transition hover:border-amber-200/70"
            >
              {watchLongformLabel}
            </a>
          ) : null}
        </div>
      </div>
      <VideoLanguageControl
        locales={videoLocales}
        activeLocaleId={activeLocaleId}
        onSelect={selectLocale}
        soonLabel={soonLabel}
        variant="overlay"
        align="start"
      />
    </div>
  )
}
