'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { VideoLanguageControl } from '@/components/landing/VideoLanguagePicker'
import { getModalVideoPreload } from '@/lib/landing/videoPreload'
import {
  enterPhoneVideoFullscreen,
  isPhoneViewport,
} from '@/lib/landing/phoneVideoFullscreen'
import { cn } from '@/lib/utils'
import type { TwoModesMediaEntry, TwoModesVideoLocale } from '@/config/landing/twoModesMedia'
import type { VideoLocaleId } from '@/config/landing/videoLocales'

/** Phones play the inline video natively so it can rotate to landscape. */
export function openTwoModesOnPhoneOrTheater(
  video: HTMLVideoElement | null,
  openModal: () => void
): boolean {
  if (video && isPhoneViewport()) {
    video.muted = false
    if (enterPhoneVideoFullscreen(video)) return true
  }
  if (video) video.muted = true
  openModal()
  return false
}

type TwoModesTheaterModalProps = {
  open: boolean
  onClose: () => void
  media: TwoModesMediaEntry
  caption: string
  pauseLabel: string
  playLabel: string
  muteLabel: string
  unmuteLabel: string
  videoLocales?: TwoModesVideoLocale[]
  activeLocaleId?: VideoLocaleId
  onSelectLocale?: (id: VideoLocaleId) => void
  soonLabel?: string
}

export function TwoModesTheaterModal({
  open,
  onClose,
  media,
  caption,
  pauseLabel,
  playLabel,
  muteLabel,
  unmuteLabel,
  videoLocales,
  activeLocaleId,
  onSelectLocale,
  soonLabel,
}: TwoModesTheaterModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isBuffering, setIsBuffering] = useState(true)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
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
    if (!video) return
    video.muted = isMuted
    void video.play().catch(() => {})
  }, [open, isMuted, activeLocaleId, media.mp4Url, media.webmUrl])

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
              key={activeLocaleId ?? 'single'}
              ref={videoRef}
              poster={media.posterUrl || undefined}
              loop
              playsInline
              preload={getModalVideoPreload(open)}
              muted={isMuted}
              autoPlay
              aria-label={caption}
              className="absolute inset-0 h-full w-full object-contain"
              onClick={(event) => event.stopPropagation()}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onWaiting={() => setIsBuffering(true)}
              onCanPlay={() => setIsBuffering(false)}
              onPlaying={() => setIsBuffering(false)}
            >
              {media.webmUrl ? <source src={media.webmUrl} type="video/webm" /> : null}
              {media.mp4Url ? <source src={media.mp4Url} type="video/mp4" /> : null}
            </video>

            {isBuffering && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50"
                aria-hidden
              >
                <Loader2 className="h-12 w-12 animate-spin text-cyan-400/80" />
              </div>
            )}

            {videoLocales && activeLocaleId && onSelectLocale && soonLabel ? (
              <VideoLanguageControl
                locales={videoLocales}
                activeLocaleId={activeLocaleId}
                onSelect={onSelectLocale}
                soonLabel={soonLabel}
                variant="overlay"
                align="start"
              />
            ) : null}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onClose()
              }}
              className="absolute top-4 end-4 z-20 rounded-lg border border-white/15 bg-black/50 p-2 text-gray-200 transition-colors hover:border-cyan-400/40 hover:text-white"
              aria-label="Close fullscreen video"
            >
              <X className="h-6 w-6" />
            </button>

            <div
              className={cn(
                'absolute inset-x-0 bottom-0 flex items-center gap-3',
                'bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10'
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={togglePlay}
                className="p-1 text-white transition hover:text-cyan-400"
                aria-label={isPlaying ? pauseLabel : playLabel}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 text-white transition hover:text-cyan-400"
                aria-label={isMuted ? unmuteLabel : muteLabel}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
