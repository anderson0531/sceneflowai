'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, VolumeX, Pause, Play } from 'lucide-react'
import {
  HERO_VIDEO_LANGUAGE_PROMPT,
  HERO_VIDEO_MULTILANG_HINT,
  getHeroVideoLocale,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'
import { HeroLanguagePills } from '@/components/landing/HeroLanguagePills'
import { cn } from '@/lib/utils'

type HeroTheaterModalProps = {
  open: boolean
  onClose: () => void
  activeLocale: HeroVideoLocaleId
  onLocaleChange: (id: HeroVideoLocaleId) => void
}

export function HeroTheaterModal({
  open,
  onClose,
  activeLocale,
  onLocaleChange,
}: HeroTheaterModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const activeEntry = getHeroVideoLocale(activeLocale)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
      setIsMuted(false)
      setIsPlaying(true)
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const video = videoRef.current
    if (!video || !activeEntry) return

    video.muted = isMuted
    video.load()
    void video.play().catch(() => {})
  }, [open, activeLocale, activeEntry, isMuted])

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

  if (!activeEntry) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-6xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute -top-10 right-0 text-gray-300 hover:text-white transition-colors z-20"
              aria-label="Close theater"
            >
              <X className="w-7 h-7" />
            </button>

            <div className="rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black">
              <div className="relative aspect-video w-full">
                <video
                  ref={videoRef}
                  key={activeLocale}
                  src={activeEntry.src}
                  poster={activeEntry.poster}
                  loop
                  playsInline
                  preload="auto"
                  muted={isMuted}
                  className="absolute inset-0 h-full w-full object-cover"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-xs text-gray-400">{HERO_VIDEO_LANGUAGE_PROMPT}</p>
                    <HeroLanguagePills
                      activeLocale={activeLocale}
                      onSelect={onLocaleChange}
                      size="sm"
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className={cn('text-white hover:text-cyan-400 transition p-1')}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="text-white hover:text-cyan-400 transition p-1"
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? (
                          <VolumeX className="w-5 h-5" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 hidden sm:block">
                      {HERO_VIDEO_MULTILANG_HINT}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
