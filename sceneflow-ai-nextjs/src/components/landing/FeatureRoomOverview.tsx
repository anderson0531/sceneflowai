'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { VideoLanguageControl } from '@/components/landing/VideoLanguagePicker'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useLandingVideoLocale } from '@/i18n/useLandingVideoLocale'
import {
  featureRoomHasVideo,
  getFeatureRoomMedia,
  getFeatureRoomVideoLocales,
} from '@/config/landing/featureRoomMedia'
import type { VideoLocaleId } from '@/config/landing/videoLocales'

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

  const media = getFeatureRoomMedia(roomId, activeLocaleId)
  const hasVideo = featureRoomHasVideo(media)

  useEffect(() => {
    setActiveLocaleId(syncedLocaleId)
  }, [syncedLocaleId])

  useEffect(() => {
    setPausedByUser(false)
  }, [roomId])

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
    const shouldPlay = inView && !prefersReducedMotion && !pausedByUser
    if (!shouldPlay) {
      video.pause()
      return
    }
    void video.play().catch(() => {})
  }, [
    hasVideo,
    inView,
    pausedByUser,
    prefersReducedMotion,
    activeLocaleId,
    media.webmUrl,
    media.mp4Url,
  ])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video || !hasVideo) return
    if (video.paused) {
      setPausedByUser(false)
      void video.play().catch(() => {})
    } else {
      setPausedByUser(true)
      video.pause()
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
      className="relative mb-6 min-h-[180px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950"
    >
      {hasVideo ? (
        <video
          key={activeLocaleId}
          ref={videoRef}
          poster={media.posterUrl || undefined}
          autoPlay={!prefersReducedMotion}
          loop
          muted={isMuted}
          playsInline
          preload={prefersReducedMotion ? 'none' : 'metadata'}
          className="absolute inset-0 h-full w-full object-cover"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
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
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/25" />
      <div className="relative flex min-h-[180px] flex-col justify-end px-5 pb-5 pt-14 sm:px-6 sm:pb-6 sm:pt-16">
        <h3 className="text-2xl font-bold text-white sm:text-3xl">{title}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-200 sm:text-base">{promise}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!hasVideo}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white transition hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={isPlaying ? pauseLabel : playLabel}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {hasVideo ? (isPlaying ? pauseLabel : playLabel) : comingSoonLabel}
          </button>
          <button
            type="button"
            onClick={() => setIsMuted((muted) => !muted)}
            disabled={!hasVideo}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white transition hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={isMuted ? unmuteLabel : muteLabel}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {isMuted ? unmuteLabel : muteLabel}
          </button>
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
