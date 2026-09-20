'use client'

import { useEffect, type RefObject } from 'react'
import {
  getHeroPublicVideoSources,
  HERO_PUBLIC_POSTER_FALLBACK,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { VideoPreloadValue } from '@/lib/landing/videoPreload'

type HeroVideoBackgroundProps = {
  locale: HeroVideoLocaleId
  videoRef: RefObject<HTMLVideoElement | null>
  muted: boolean
  shouldPlay: boolean
  preload: VideoPreloadValue
  onPlay?: () => void
  onPause?: () => void
  onWaiting?: () => void
  onCanPlay?: () => void
  onPlaying?: () => void
}

export function HeroVideoBackground({
  locale,
  videoRef,
  muted,
  shouldPlay,
  preload,
  onPlay,
  onPause,
  onWaiting,
  onCanPlay,
  onPlaying,
}: HeroVideoBackgroundProps) {
  const prefersReducedMotion = useReducedMotion()
  const sources = getHeroPublicVideoSources(locale)
  const poster = sources.poster || HERO_PUBLIC_POSTER_FALLBACK

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (prefersReducedMotion || !shouldPlay) {
      video.pause()
      return
    }

    void video.play().catch(() => {})
  }, [locale, shouldPlay, prefersReducedMotion, videoRef])

  return (
    <video
      ref={videoRef}
      poster={poster}
      autoPlay={!prefersReducedMotion && shouldPlay}
      loop
      muted={muted}
      playsInline
      preload={prefersReducedMotion ? 'none' : preload}
      className="absolute inset-0 z-0 h-full w-full bg-black object-cover object-top lg:object-contain lg:object-center"
      onPlay={onPlay}
      onPause={onPause}
      onWaiting={onWaiting}
      onCanPlay={onCanPlay}
      onPlaying={onPlaying}
    >
      {sources.webmSrc ? <source src={sources.webmSrc} type="video/webm" /> : null}
      <source src={sources.mp4Src} type="video/mp4" />
    </video>
  )
}
