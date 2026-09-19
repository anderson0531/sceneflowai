'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  CalendarClock,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  ArrowRight,
  FileText,
  Film,
  Globe,
  Link2,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import {
  HERO_VIDEO_UNMUTE_DISMISSED_KEY,
  getHeroVideoLocale,
  getHeroVideoLocalesAsVideoLocales,
  resolveHeroVideoLocale,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'
import { VideoLanguageControl } from '@/components/landing/VideoLanguagePicker'
import { HeroTheaterModal } from '@/components/landing/HeroTheaterModal'
import { HeroVideoBackground } from '@/components/landing/HeroVideoBackground'
import { NotifyCapture } from '@/components/landing/NotifyCapture'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { getVideoPreloadStrategy, type VideoPreloadValue } from '@/lib/landing/videoPreload'
import { readHeroNetworkContext } from '@/lib/landing/heroPlaybackPolicy'
import { useReducedMotion } from '@/hooks/useReducedMotion'

function readUnmuteDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(HERO_VIDEO_UNMUTE_DISMISSED_KEY) === '1'
}

export function HeroSection() {
  const t = useTranslations('hero')
  const chips = t.raw('chips') as Array<{ label: string; detail: string }>
  const pipelineSteps = t.raw('pipelineSteps') as string[]
  const chipIcons = [Link2, Film, Globe]
  const landingLocale = useLocale()
  const syncedVideoLocale = resolveHeroVideoLocale(landingLocale)
  const prefersReducedMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion)
  const [isMuted, setIsMuted] = useState(true)
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(true)
  const [isTheaterOpen, setIsTheaterOpen] = useState(false)
  const [activeLocale, setActiveLocale] = useState<HeroVideoLocaleId>(syncedVideoLocale)
  const [inlineVideoLocale, setInlineVideoLocale] =
    useState<HeroVideoLocaleId>(syncedVideoLocale)
  const [videoPreload, setVideoPreload] = useState<VideoPreloadValue>('metadata')
  const [isBuffering, setIsBuffering] = useState(true)

  const heroLocales = getHeroVideoLocalesAsVideoLocales()
  const motionOffset = prefersReducedMotion ? 0 : undefined
  const motionDuration = prefersReducedMotion ? 0 : undefined

  useEffect(() => {
    const ctx = readHeroNetworkContext()
    setVideoPreload(getVideoPreloadStrategy(ctx))
  }, [])

  useEffect(() => {
    setShowUnmutePrompt(!readUnmuteDismissed())
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) setIsPlaying(false)
  }, [prefersReducedMotion])

  useEffect(() => {
    const entry = getHeroVideoLocale(syncedVideoLocale)
    if (!entry?.available) return

    setActiveLocale(syncedVideoLocale)
    setInlineVideoLocale(syncedVideoLocale)
    setIsBuffering(true)
  }, [syncedVideoLocale])

  const unmuteWithSound = useCallback(() => {
    const video = videoRef.current
    if (video) {
      video.muted = false
      void video.play().catch(() => {})
    }
    setIsMuted(false)
    setIsPlaying(true)
    setShowUnmutePrompt(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem(HERO_VIDEO_UNMUTE_DISMISSED_KEY, '1')
    }
  }, [])

  const selectLocale = useCallback((id: HeroVideoLocaleId) => {
    const entry = getHeroVideoLocale(id)
    if (!entry?.available) return

    setActiveLocale(id)
    setInlineVideoLocale(id)
    setIsBuffering(true)

    const video = videoRef.current
    if (video) {
      void video.play().catch(() => {})
    }
  }, [])

  const scrollToCheckout = useCallback(() => {
    window.location.href = getSignupUrlForTier('explorer')
  }, [])

  const scrollToHowItWorks = useCallback(() => {
    document.getElementById('key-features')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const openTheater = useCallback(() => {
    const video = videoRef.current
    if (video) {
      video.muted = true
    }
    setIsTheaterOpen(true)
  }, [])

  const closeTheater = useCallback(() => {
    setIsTheaterOpen(false)
    setInlineVideoLocale(activeLocale)
    setIsBuffering(true)

    const video = videoRef.current
    if (!video) return

    video.muted = isMuted
    if (isPlaying && !prefersReducedMotion) {
      void video.play().catch(() => {})
    }
  }, [activeLocale, isMuted, isPlaying, prefersReducedMotion])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
    } else {
      void video.play().catch(() => {})
      setIsPlaying(true)
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
      <section
        id="hero-video"
        className="relative w-full min-h-[100dvh] bg-gray-950 text-white scroll-mt-24"
      >
        <div className="absolute inset-0 overflow-hidden">
          <HeroVideoBackground
            key={inlineVideoLocale}
            locale={inlineVideoLocale}
            videoRef={videoRef}
            muted={isMuted}
            shouldPlay={isPlaying && !isTheaterOpen}
            preload={videoPreload}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              if (!isTheaterOpen) setIsPlaying(false)
            }}
            onWaiting={() => setIsBuffering(true)}
            onCanPlay={() => {
              setIsBuffering(false)
              if (isPlaying && !isTheaterOpen && !prefersReducedMotion) {
                void videoRef.current?.play().catch(() => {})
              }
            }}
            onPlaying={() => setIsBuffering(false)}
          />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-black/40" />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/25 to-black/35" />
        </div>

        {isBuffering && !prefersReducedMotion && (
          <div
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/20"
            aria-hidden
          >
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400/80" />
          </div>
        )}

        <div className="relative z-10 flex min-h-[100dvh] flex-col justify-center px-4 pt-20 pb-28">
          <div className="container mx-auto">
            {pipelineSteps.length > 0 && (
              <motion.div
                className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-gray-300"
                initial={{ opacity: 0, y: motionOffset ?? 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionDuration ?? 0.6, delay: prefersReducedMotion ? 0 : 0.2 }}
                aria-label="Studio pipeline flow"
              >
                {pipelineSteps.map((step, index) => (
                  <span key={step} className="inline-flex items-center gap-2">
                    <span className="font-medium text-gray-100">{step}</span>
                    {index < pipelineSteps.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                    )}
                  </span>
                ))}
              </motion.div>
            )}

            <div className="max-w-4xl mx-auto text-center mt-8 lg:mt-10">
              <motion.div
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: motionOffset ?? 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionDuration ?? 0.8, delay: prefersReducedMotion ? 0 : 0.1 }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">
                  {t('eyebrow')}
                </p>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  {t('availabilityBadge')}
                </span>
              </motion.div>

              <motion.h1
                className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-tight bg-gradient-to-r from-white via-gray-300 to-gray-400 text-transparent bg-clip-text"
                initial={{ opacity: 0, y: motionOffset ?? 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionDuration ?? 0.8, delay: prefersReducedMotion ? 0 : 0.15 }}
              >
                {t('headline')}
              </motion.h1>

              <motion.p
                className="mt-6 max-w-3xl mx-auto text-base sm:text-lg text-gray-100"
                initial={{ opacity: 0, y: motionOffset ?? 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionDuration ?? 0.8, delay: prefersReducedMotion ? 0 : 0.25 }}
              >
                {t('subheadline')}
              </motion.p>

              <motion.div
                className="mt-8 flex flex-col lg:flex-row items-stretch justify-center gap-3 max-w-5xl mx-auto"
                initial={{ opacity: 0, y: motionOffset ?? 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionDuration ?? 0.8, delay: prefersReducedMotion ? 0 : 0.28 }}
              >
                {chips.map((chip, index) => {
                  const Icon = chipIcons[index] ?? FileText
                  return (
                    <div
                      key={chip.label}
                      className="flex-1 rounded-xl border border-white/10 bg-slate-950/55 px-4 py-3 text-left backdrop-blur-sm"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                          <Icon className="h-4 w-4 text-cyan-400" aria-hidden />
                        </div>
                        <p className="text-sm font-semibold text-white">{chip.label}</p>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{chip.detail}</p>
                    </div>
                  )
                })}
              </motion.div>

              <motion.div
                className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
                initial={{ opacity: 0, y: motionOffset ?? 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionDuration ?? 0.8, delay: prefersReducedMotion ? 0 : 0.32 }}
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-90"
                  onClick={scrollToCheckout}
                >
                  {t('ctaPrimaryLaunch')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-purple-500/40 text-purple-200 hover:bg-purple-500/10"
                  onClick={scrollToHowItWorks}
                >
                  {t('ctaSecondary')}
                </Button>
                {t('ctaSupportingLine') && (
                  <p className="max-w-md text-sm text-gray-300">{t('ctaSupportingLine')}</p>
                )}
              </motion.div>

              <motion.div
                className="mt-10 flex justify-center border-t border-white/10 pt-8"
                initial={{ opacity: 0, y: motionOffset ?? 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionDuration ?? 0.8, delay: prefersReducedMotion ? 0 : 0.36 }}
              >
                <NotifyCapture source="hero" />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
          <VideoLanguageControl
            locales={heroLocales}
            activeLocaleId={activeLocale}
            onSelect={(id) => selectLocale(id as HeroVideoLocaleId)}
            soonLabel={t('soon')}
            variant="inline"
            align="start"
            markAsHeroControl
          />

          <div className="ms-auto flex items-center gap-2">
            {isMuted && !isBuffering && (
              showUnmutePrompt ? (
                <button
                  type="button"
                  data-hero-control
                  onClick={unmuteWithSound}
                  className="flex items-center gap-2 rounded-full bg-black/70 border border-cyan-400/40 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:bg-black/85 hover:border-cyan-400/60 transition-colors"
                >
                  <Volume2 className="h-4 w-4 text-cyan-400" aria-hidden />
                  {t('playWithNarration')}
                </button>
              ) : (
                <button
                  type="button"
                  data-hero-control
                  onClick={unmuteWithSound}
                  className="flex items-center gap-1.5 rounded-full bg-black/60 border border-white/20 px-3 py-2 text-xs font-medium text-gray-200 hover:text-white hover:border-cyan-400/40 transition-colors"
                  aria-label={t('tapToHear')}
                >
                  <VolumeX className="h-4 w-4 text-cyan-400" aria-hidden />
                  {t('tapToHear')}
                </button>
              )
            )}

            <button
              type="button"
              data-hero-control
              onClick={togglePlay}
              className="text-white hover:text-cyan-400 transition p-1"
              aria-label={isPlaying ? t('pauseBackgroundVideo') : t('playBackgroundVideo')}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              type="button"
              data-hero-control
              onClick={toggleMute}
              className="text-white hover:text-cyan-400 transition p-1"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              data-hero-control
              onClick={openTheater}
              className="flex items-center gap-1.5 rounded-lg bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs font-medium text-gray-200 hover:text-white hover:border-cyan-400/40 transition-colors"
              aria-label={t('fullscreen')}
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{t('fullscreen')}</span>
            </button>
          </div>
        </div>
      </section>

      <HeroTheaterModal
        open={isTheaterOpen}
        onClose={closeTheater}
        activeLocale={activeLocale}
        onSelectLocale={selectLocale}
        soonLabel={t('soon')}
      />
    </>
  )
}
