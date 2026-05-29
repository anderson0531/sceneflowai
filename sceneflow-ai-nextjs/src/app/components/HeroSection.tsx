'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, ArrowRight, Pause, Volume2, VolumeX, Maximize, Globe } from 'lucide-react'
import Link from 'next/link'
import { getEarlyAccessUrl } from '@/lib/auth/postLoginRedirect'
import { HERO_COPY } from '@/config/landing/valuePropCopy'
import {
  DEFAULT_HERO_VIDEO_LOCALE,
  HERO_VIDEO_LANGUAGE_PROMPT,
  HERO_VIDEO_LOCALES,
  HERO_VIDEO_MULTILANG_HINT,
  HERO_VIDEO_LOCALE_STORAGE_KEY,
  getHeroVideoLocale,
  getDefaultHeroVideoSrc,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'
import { cn } from '@/lib/utils'

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
}

function readStoredLocale(): HeroVideoLocaleId | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(HERO_VIDEO_LOCALE_STORAGE_KEY)
  if (stored && getHeroVideoLocale(stored as HeroVideoLocaleId)?.available) {
    return stored as HeroVideoLocaleId
  }
  return null
}

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [activeLocale, setActiveLocale] = useState<HeroVideoLocaleId>(DEFAULT_HERO_VIDEO_LOCALE)

  const activeEntry = getHeroVideoLocale(activeLocale) ?? getHeroVideoLocale(DEFAULT_HERO_VIDEO_LOCALE)!
  const videoSrc = activeEntry.available ? activeEntry.src : getDefaultHeroVideoSrc()

  useEffect(() => {
    const stored = readStoredLocale()
    if (stored) setActiveLocale(stored)
  }, [])

  const selectLocale = useCallback((id: HeroVideoLocaleId) => {
    const entry = getHeroVideoLocale(id)
    if (!entry?.available) return

    setActiveLocale(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem(HERO_VIDEO_LOCALE_STORAGE_KEY, id)
    }

    const video = videoRef.current
    if (!video) return

    const wasPlaying = !video.paused
    video.src = entry.src
    video.load()
    if (wasPlaying) {
      void video.play().catch(() => {})
    }
  }, [])

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
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <>
      <section className="relative bg-gray-950 text-white pt-24 pb-20 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-36">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.07]" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950/80 to-transparent" />
        
        <div className="relative container mx-auto px-4 z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.p
              className="text-sm font-medium text-cyan-400/90 mb-4 tracking-wide"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {HERO_COPY.pipelineLine}
            </motion.p>

            <motion.h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-tight bg-gradient-to-r from-white via-gray-300 to-gray-400 text-transparent bg-clip-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {HERO_COPY.headline}
            </motion.h1>

            <motion.p 
              className="mt-6 max-w-2xl mx-auto text-lg text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {HERO_COPY.subheadline}
            </motion.p>
            
            <motion.div 
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link href={getEarlyAccessUrl()} className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  {HERO_COPY.ctaPrimary}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto"
                onClick={() => scrollToSection('use-cases')}
              >
                <Play className="mr-2 w-5 h-5" />
                {HERO_COPY.ctaSecondary}
              </Button>
            </motion.div>
          </div>

          <motion.div
            className="relative max-w-4xl mx-auto mt-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="mb-4 flex flex-col items-center gap-3">
              <p className="inline-flex items-center gap-2 text-sm text-gray-400">
                <Globe className="h-4 w-4 text-cyan-400/80" aria-hidden />
                {HERO_VIDEO_LANGUAGE_PROMPT}
              </p>
              <div
                className="flex flex-wrap items-center justify-center gap-2"
                role="group"
                aria-label="Hero video language"
              >
                {HERO_VIDEO_LOCALES.map((locale) => {
                  const isActive = activeLocale === locale.id
                  const isDisabled = !locale.available
                  return (
                    <button
                      key={locale.id}
                      type="button"
                      disabled={isDisabled}
                      aria-pressed={isActive}
                      aria-label={
                        isDisabled
                          ? `${locale.label} — coming soon`
                          : `Play hero video in ${locale.label}`
                      }
                      onClick={() => selectLocale(locale.id)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-sm font-medium transition-colors border',
                        isActive
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20 hover:text-white',
                        isDisabled &&
                          'opacity-50 cursor-not-allowed hover:border-white/10 hover:text-gray-300'
                      )}
                    >
                      <span className="hidden sm:inline">{locale.nativeLabel}</span>
                      <span className="sm:hidden">{locale.label}</span>
                      {isDisabled ? (
                        <span className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-500">
                          Soon
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 max-w-lg text-center">
                {HERO_VIDEO_MULTILANG_HINT}
              </p>
            </div>

            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl" />

            <div 
              ref={containerRef}
              className="relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-black group"
            >
              <div className="relative aspect-video w-full h-full">
                <video
                  ref={videoRef}
                  key={activeLocale}
                  src={videoSrc}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  className="absolute inset-0 h-full w-full object-cover"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center space-x-4">
                      <button onClick={togglePlay} className="text-white hover:text-cyan-400 transition" aria-label={isPlaying ? "Pause" : "Play"}>
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                      </button>
                      <button onClick={toggleMute} className="text-white hover:text-cyan-400 transition" aria-label={isMuted ? "Unmute" : "Mute"}>
                        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                      </button>
                    </div>
                    <button onClick={toggleFullscreen} className="text-white hover:text-cyan-400 transition" aria-label="Fullscreen">
                      <Maximize className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-base text-gray-400">
              From concept to publish-ready video — one automated studio
            </p>
            <p className="mt-1 text-center text-sm text-gray-500">
              Switch languages on the same pipeline — automated streams in Production, not manual re-edit cycles.
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
}
