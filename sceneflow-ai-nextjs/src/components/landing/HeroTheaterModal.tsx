'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, VolumeX, Pause, Play } from 'lucide-react'
import { getHeroVideoLocale, type HeroVideoLocaleId } from '@/config/landing/heroVideoLocales'
import { cn } from '@/lib/utils'

type HeroTheaterModalProps = {
  open: boolean
  onClose: () => void
  activeLocale: HeroVideoLocaleId
}

export function HeroTheaterModal({ open, onClose, activeLocale }: HeroTheaterModalProps) {
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
              key={activeLocale}
              src={activeEntry.src}
              poster={activeEntry.poster}
              loop
              playsInline
              preload="auto"
              muted={isMuted}
              className="absolute inset-0 h-full w-full object-contain"
              onClick={(e) => e.stopPropagation()}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
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
