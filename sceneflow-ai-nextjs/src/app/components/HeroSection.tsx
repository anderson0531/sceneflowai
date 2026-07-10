'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Globe,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  DEFAULT_HERO_VIDEO_LOCALE,
  HERO_VIDEO_LOCALE_STORAGE_KEY,
  HERO_VIDEO_UNMUTE_DISMISSED_KEY,
  getHeroVideoLocale,
  getDefaultHeroVideoSrc,
  getDefaultHeroVideoPoster,
  getSuggestedHeroLocaleFromBrowser,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'
import { HeroLanguagePills } from '@/components/landing/HeroLanguagePills'
import { HeroTheaterModal } from '@/components/landing/HeroTheaterModal'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'

function readStoredLocale(): HeroVideoLocaleId | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(HERO_VIDEO_LOCALE_STORAGE_KEY)
  if (stored && getHeroVideoLocale(stored as HeroVideoLocaleId)?.available) {
    return stored as HeroVideoLocaleId
  }
  return null
}

function readUnmuteDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(HERO_VIDEO_UNMUTE_DISMISSED_KEY) === '1'
}

function applyLocaleToVideo(
  video: HTMLVideoElement,
  id: HeroVideoLocaleId,
  shouldPlay: boolean
) {
  const entry = getHeroVideoLocale(id)
  if (!entry?.available) return

  const wasPlaying = !video.paused
  video.src = entry.src
  video.poster = entry.poster
  video.load()
  if (shouldPlay && wasPlaying) {
    void video.play().catch(() => {})
  }
}

export function HeroSection() {
  const t = useTranslations('hero')
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(true)
  const [isTheaterOpen, setIsTheaterOpen] = useState(false)
  const [activeLocale, setActiveLocale] = useState<HeroVideoLocaleId>(DEFAULT_HERO_VIDEO_LOCALE)
  const [inlineVideoLocale, setInlineVideoLocale] =
    useState<HeroVideoLocaleId>(DEFAULT_HERO_VIDEO_LOCALE)
  const [highlightLocale, setHighlightLocale] = useState<HeroVideoLocaleId | null>(null)

  const inlineEntry =
    getHeroVideoLocale(inlineVideoLocale) ?? getHeroVideoLocale(DEFAULT_HERO_VIDEO_LOCALE)!
  const videoSrc = inlineEntry.available ? inlineEntry.src : getDefaultHeroVideoSrc()
  const videoPoster = inlineEntry.available ? inlineEntry.poster : getDefaultHeroVideoPoster()

  useEffect(() => {
    const stored = readStoredLocale()
    if (stored) {
      setActiveLocale(stored)
      setInlineVideoLocale(stored)
    } else {
      setHighlightLocale(getSuggestedHeroLocaleFromBrowser())
    }
    setShowUnmutePrompt(!readUnmuteDismissed())
  }, [])

  const unmuteWithSound = useCallback(() => {
    const video = videoRef.current
    if (video) {
      video.muted = false
      void video.play().catch(() => {})
    }
    setIsMuted(false)
    setShowUnmutePrompt(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem(HERO_VIDEO_UNMUTE_DISMISSED_KEY, '1')
    }
  }, [])

  const selectLocale = useCallback(
    (id: HeroVideoLocaleId) => {
      const entry = getHeroVideoLocale(id)
      if (!entry?.available) return

      setActiveLocale(id)
      setHighlightLocale(null)
      if (typeof window !== 'undefined') {
        localStorage.setItem(HERO_VIDEO_LOCALE_STORAGE_KEY, id)
      }

      if (isTheaterOpen) return

      setInlineVideoLocale(id)
      const video = videoRef.current
      if (!video) return
      applyLocaleToVideo(video, id, true)
    },
    [isTheaterOpen]
  )

  const scrollToCheckout = useCallback(() => {
    window.location.href = getSignupUrlForTier('explorer')
  }, [])

  const openTheater = useCallback(() => {
    const video = videoRef.current
    if (video) {
      video.pause()
      video.muted = true
    }
    setIsTheaterOpen(true)
  }, [])

  const closeTheater = useCallback(() => {
    setIsTheaterOpen(false)
    setInlineVideoLocale(activeLocale)

    const video = videoRef.current
    if (!video) return

    applyLocaleToVideo(video, activeLocale, isPlaying)
    video.muted = isMuted
    if (isPlaying) {
      void video.play().catch(() => {})
    }
  }, [activeLocale, isMuted, isPlaying])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted
      videoRef.current.muted = nextMuted
      setIsMuted(nextMuted)
      if (!nextMuted) {
        setShowUnmutePrompt(false)
        if (typeof window !== 'undefined') {
          localStorage.setItem(HERO_VIDEO_UNMUTE_DISMISSED_KEY, '1')
        }
      }
    }
  }

  return (
    <>
      <section className="relative bg-gray-950 text-white pt-20 pb-16 sm:pt-24 sm:pb-20 lg:pt-28 lg:pb-24">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.07]" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950/80 to-transparent" />

        <div className="relative container mx-auto px-4 z-10">
          <motion.div
            id="hero-video"
            className="relative max-w-6xl mx-auto scroll-mt-24"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="pointer-events-none absolute -inset-4 bg-gradient-to-r from-sf-brand-cyan/20 via-sf-brand-purple/15 to-sf-brand-cyan/10 rounded-3xl blur-2xl" />

            <div
              ref={containerRef}
              className="relative z-10 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-black group cursor-pointer"
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (target.closest('[data-hero-control]')) return
                openTheater()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openTheater()
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Expand hero video to fullscreen with sound"
            >
              <div className="relative aspect-video w-full h-full">
                <video
                  ref={videoRef}
                  key={inlineVideoLocale}
                  src={videoSrc}
                  poster={videoPoster}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  className="absolute inset-0 h-full w-full object-cover"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                {isMuted && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {showUnmutePrompt ? (
                      <button
                        type="button"
                        data-hero-control
                        onClick={(e) => {
                          e.stopPropagation()
                          unmuteWithSound()
                        }}
                        className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/70 border border-cyan-400/40 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 animate-pulse hover:bg-black/85 hover:border-cyan-400/60 transition-colors"
                      >
                        <Volume2 className="h-5 w-5 text-cyan-400" aria-hidden />
                        Play with narration
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-hero-control
                        onClick={(e) => {
                          e.stopPropagation()
                          unmuteWithSound()
                        }}
                        className="pointer-events-auto absolute bottom-14 right-3 flex items-center gap-1.5 rounded-full bg-black/60 border border-white/20 px-3 py-2 text-xs font-medium text-gray-200 hover:text-white hover:border-cyan-400/40 transition-colors"
                        aria-label="Tap to hear narration"
                      >
                        <VolumeX className="h-4 w-4 text-cyan-400 animate-pulse" aria-hidden />
                        Tap to hear
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  data-hero-control
                  onClick={(e) => {
                    e.stopPropagation()
                    openTheater()
                  }}
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs font-medium text-gray-200 hover:text-white hover:border-cyan-400/40 transition-colors"
                  aria-label="Open fullscreen video"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Fullscreen</span>
                </button>

                <div
                  data-hero-control
                  className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePlay()
                    }}
                    className="text-white hover:text-cyan-400 transition p-1"
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
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMute()
                    }}
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
              </div>
            </div>

            <div className="relative z-10 mt-4 flex flex-col items-center gap-2 px-1">
              <p className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                <Globe className="h-3.5 w-3.5 text-cyan-400/80 shrink-0" aria-hidden />
                {t('languagePrompt')}
              </p>
              <HeroLanguagePills
                activeLocale={activeLocale}
                onSelect={selectLocale}
                highlightLocale={highlightLocale}
                size="sm"
              />
              <p className="text-[10px] text-gray-500 max-w-lg text-center">
                {t('multilangHint')}
              </p>
            </div>
          </motion.div>

          <div className="max-w-4xl mx-auto text-center mt-12 lg:mt-14">
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-tight bg-gradient-to-r from-white via-gray-300 to-gray-400 text-transparent bg-clip-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
            >
              {t('headline')}
            </motion.h1>

            <motion.p
              className="mt-6 max-w-2xl mx-auto text-lg text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
            >
              {t('subheadline')}
            </motion.p>

            <motion.p
              className="mt-4 max-w-xl mx-auto text-sm text-gray-500"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {t('audienceMicroLine')}
            </motion.p>

            <motion.div
              className="mt-10 flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
            >
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-90"
                onClick={scrollToCheckout}
              >
                {t('ctaPrimaryLaunch')}
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <HeroTheaterModal
        open={isTheaterOpen}
        onClose={closeTheater}
        activeLocale={activeLocale}
      />
    </>
  )
}
