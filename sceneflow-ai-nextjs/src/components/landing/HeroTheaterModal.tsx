'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, VolumeX, Pause, Play, Loader2 } from 'lucide-react'
import {
  getHeroVideoLocale,
  getHeroPublicVideoSources,
  HERO_PUBLIC_POSTER_FALLBACK,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'
import { getModalVideoPreload } from '@/lib/landing/videoPreload'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import { cn } from '@/lib/utils'

type HeroTheaterModalProps = {
  open: boolean
  onClose: () => void
  activeLocale: HeroVideoLocaleId
  onSelectLocale?: (id: HeroVideoLocaleId) => void
  soonLabel?: string
}

export function HeroTheaterModal({
  open,
  onClose,
  activeLocale,
}: HeroTheaterModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isBuffering, setIsBuffering] = useState(true)
  const activeEntry = getHeroVideoLocale(activeLocale)
  const playbackSources = useMemo(
    () => (activeEntry ? getHeroPublicVideoSources(activeLocale) : null),
    [activeEntry, activeLocale]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
      setIsMuted(false)
      setIsPlaying(true)
      setIsBuffering(true)
    } else {
      document.body.style.overflow = 'unset'
      const video = videoRef.current
      if (video) {
        video.pause()
        video.muted = true
      }
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const video = videoRef.current
    if (!video || !playbackSources) return

    video.muted = isMuted
    video.poster = playbackSources.poster || HERO_PUBLIC_POSTER_FALLBACK
    void video.play().catch(() => {})
  }, [open, activeLocale, playbackSources, isMuted])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const next = !video.muted
    video.muted = next
    setIsMuted(next)
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play().catch(() => {})
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [])

  if (!activeEntry || !playbackSources) return null

  const poster = playbackSources.poster || HERO_PUBLIC_POSTER_FALLBACK

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <video
              key={activeLocale}
              ref={videoRef}
              poster={poster}
              loop
              playsInline
              preload={getModalVideoPreload(open)}
              muted={isMuted}
              autoPlay
              className="absolute inset-0 h-full w-full object-contain"
              onClick={(e) => e.stopPropagation()}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onWaiting={() => setIsBuffering(true)}
              onCanPlay={() => setIsBuffering(false)}
              onPlaying={() => setIsBuffering(false)}
            >
              {playbackSources.webmSrc ? (
                <source src={playbackSources.webmSrc} type="video/webm" />
              ) : null}
              <source src={playbackSources.mp4Src} type="video/mp4" />
            </video>

            {isBuffering && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50"
                aria-hidden
              >
                <Loader2 className="h-12 w-12 animate-spin text-cyan-400/80" />
              </div>
            )}

            <VideoControlTooltip label="Close fullscreen video">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                className="absolute top-4 end-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/65 text-gray-200 backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85 hover:text-white"
                aria-label="Close fullscreen video"
              >
                <X className="w-5 h-5" />
              </button>
            </VideoControlTooltip>

            <div
              className={cn(
                'absolute inset-x-0 bottom-0 flex items-center gap-2.5',
                'bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <VideoControlTooltip label={isPlaying ? 'Pause' : 'Play'} side="top">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </VideoControlTooltip>
              <VideoControlTooltip label={isMuted ? 'Unmute' : 'Mute'} side="top">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </VideoControlTooltip>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
