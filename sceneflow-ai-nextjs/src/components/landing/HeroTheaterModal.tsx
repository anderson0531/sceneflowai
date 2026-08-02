'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, VolumeX, Pause, Play, Loader2 } from 'lucide-react'
import { VideoLanguageControl } from '@/components/landing/VideoLanguagePicker'
import {
  getHeroVideoLocale,
  getHeroVideoLocalesAsVideoLocales,
  getHeroVideoPlaybackSources,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'
import { getModalVideoPreload } from '@/lib/landing/videoPreload'
import { useAdaptiveVideoSource } from '@/lib/landing/useAdaptiveVideoSource'
import { cn } from '@/lib/utils'

type HeroTheaterModalProps = {
  open: boolean
  onClose: () => void
  activeLocale: HeroVideoLocaleId
  onSelectLocale: (id: HeroVideoLocaleId) => void
  soonLabel: string
}

export function HeroTheaterModal({
  open,
  onClose,
  activeLocale,
  onSelectLocale,
  soonLabel,
}: HeroTheaterModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isBuffering, setIsBuffering] = useState(true)
  const activeEntry = getHeroVideoLocale(activeLocale)
  const heroLocales = getHeroVideoLocalesAsVideoLocales()
  const playbackSources = useMemo(
    () => (activeEntry ? getHeroVideoPlaybackSources(activeLocale) : null),
    [activeEntry, activeLocale]
  )

  useAdaptiveVideoSource(
    videoRef,
    playbackSources ?? { mp4Src: '' },
    open && Boolean(playbackSources?.mp4Src)
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
    video.poster = playbackSources.poster
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
              ref={videoRef}
              poster={playbackSources.poster}
              loop
              playsInline
              preload={getModalVideoPreload(open)}
              muted={isMuted}
              className="absolute inset-0 h-full w-full object-contain"
              onClick={(e) => e.stopPropagation()}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onWaiting={() => setIsBuffering(true)}
              onCanPlay={() => setIsBuffering(false)}
              onPlaying={() => setIsBuffering(false)}
            />

            {isBuffering && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50"
                aria-hidden
              >
                <Loader2 className="h-12 w-12 animate-spin text-cyan-400/80" />
              </div>
            )}

            <VideoLanguageControl
              locales={heroLocales}
              activeLocaleId={activeLocale}
              onSelect={(id) => onSelectLocale(id as HeroVideoLocaleId)}
              soonLabel={soonLabel}
              variant="overlay"
              align="start"
            />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="absolute top-4 right-4 z-20 rounded-lg bg-black/50 border border-white/15 p-2 text-gray-200 hover:text-white hover:border-cyan-400/40 transition-colors"
              aria-label="Close fullscreen video"
            >
              <X className="w-6 h-6" />
            </button>

            <div
              className={cn(
                'absolute inset-x-0 bottom-0 flex items-center gap-3',
                'bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={togglePlay}
                className="text-white hover:text-cyan-400 transition p-1"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="text-white hover:text-cyan-400 transition p-1"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
