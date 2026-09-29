'use client'

import { useEffect, useRef, useState } from 'react'
import NextImage from 'next/image'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { getTwoModesMedia } from '@/config/landing/twoModesMedia'

export function TwoModesMediaFrame({
  mediaId,
  caption,
  comingSoon,
}: {
  mediaId: string
  caption: string
  comingSoon: string
}) {
  const media = getTwoModesMedia(mediaId)
  const hasVideo = Boolean(media.webmUrl || media.mp4Url)
  const t = useTranslations('common')
  const prefersReducedMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion)
  const [isMuted, setIsMuted] = useState(true)

  useEffect(() => {
    if (prefersReducedMotion) setIsPlaying(false)
  }, [prefersReducedMotion])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasVideo) return

    video.muted = isMuted
    if (prefersReducedMotion || !isPlaying) {
      video.pause()
      return
    }

    void video.play().catch(() => {})
  }, [hasVideo, isMuted, isPlaying, prefersReducedMotion])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (!video.paused) {
      video.pause()
      setIsPlaying(false)
      return
    }

    void video.play().catch(() => {})
    setIsPlaying(true)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    const nextMuted = !isMuted
    video.muted = nextMuted
    setIsMuted(nextMuted)
  }

  if (hasVideo) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full bg-black object-cover"
          autoPlay={!prefersReducedMotion}
          loop
          muted={isMuted}
          playsInline
          preload={prefersReducedMotion ? 'none' : 'metadata'}
          poster={media.posterUrl || undefined}
          aria-label={caption}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          {media.webmUrl ? <source src={media.webmUrl} type="video/webm" /> : null}
          {media.mp4Url ? <source src={media.mp4Url} type="video/mp4" /> : null}
        </video>
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-end gap-2 bg-gradient-to-b from-black/80 to-transparent px-3 pt-3 pb-8">
          <button
            type="button"
            onClick={togglePlay}
            className="p-1 text-white transition hover:text-cyan-400"
            aria-label={isPlaying ? t('pause') : t('play')}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="p-1 text-white transition hover:text-cyan-400"
            aria-label={isMuted ? t('unmute') : t('mute')}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>
    )
  }

  if (media.imageUrl) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
        <NextImage
          src={media.imageUrl}
          alt={caption}
          width={2400}
          height={1340}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-900/50 p-6">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-slate-300">{caption}</p>
        <p className="text-xs text-slate-500">{comingSoon}</p>
      </div>
    </div>
  )
}

export default TwoModesMediaFrame
