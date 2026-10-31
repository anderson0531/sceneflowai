'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import {
  EXAMPLE_TRAILER_SCRIPTS,
  IMAGINE_POSSIBILITIES_COPY,
  type ExampleTrailerScript,
} from '@/config/landing/exampleTrailerScripts'
import type { ProductionWalkId } from '@/config/landing/productionPipelineDemo'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export const IMAGINE_POSSIBILITIES_SECTION_ID = 'imagine-possibilities'

export function ImaginePossibilitiesHero() {
  const prefersReducedMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [activeId, setActiveId] = useState<ProductionWalkId>('drama')
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion)
  const [inViewport, setInViewport] = useState(true)
  const [isBuffering, setIsBuffering] = useState(true)

  const activeScript: ExampleTrailerScript =
    EXAMPLE_TRAILER_SCRIPTS.find((item) => item.id === activeId) ?? EXAMPLE_TRAILER_SCRIPTS[0]

  useEffect(() => {
    const video = videoRef.current
    if (!video || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.15)
        }
      },
      { threshold: [0, 0.15, 0.5] }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [activeScript.id])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (prefersReducedMotion || !inViewport) {
      video.pause()
      return
    }
    video.muted = isMuted
    if (isPlaying) {
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [activeScript.id, inViewport, isMuted, isPlaying, prefersReducedMotion])

  const selectCategory = useCallback(
    (id: ProductionWalkId) => {
      setActiveId(id)
      setIsBuffering(true)
      if (!prefersReducedMotion) {
        setIsPlaying(true)
      }
    },
    [prefersReducedMotion]
  )

  const advanceToNextTrailer = useCallback(() => {
    const currentIndex = EXAMPLE_TRAILER_SCRIPTS.findIndex((item) => item.id === activeId)
    const nextIndex = (currentIndex + 1) % EXAMPLE_TRAILER_SCRIPTS.length
    const nextItem = EXAMPLE_TRAILER_SCRIPTS[nextIndex]
    if (nextItem) {
      setActiveId(nextItem.id)
      setIsBuffering(true)
    }
  }, [activeId])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    if (video) {
      video.muted = nextMuted
      if (!nextMuted) {
        void video.play().catch(() => {})
        setIsPlaying(true)
      }
    }
  }, [isMuted])

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
    <section
      id={IMAGINE_POSSIBILITIES_SECTION_ID}
      aria-label={IMAGINE_POSSIBILITIES_COPY.headline}
      className="relative min-h-[100dvh] w-full overflow-hidden bg-gray-950 text-white"
    >
      {/* Background Video Layer — mirrors HeroSection.tsx & HeroVideoBackground.tsx */}
      <div className="absolute inset-x-0 bottom-0 top-16 overflow-hidden lg:inset-0">
        <video
          key={`${activeScript.id}-${activeScript.webmSrc}`}
          ref={videoRef}
          className="absolute inset-0 z-0 h-full w-full bg-black object-cover object-top lg:object-contain lg:object-center"
          autoPlay={!prefersReducedMotion}
          muted={isMuted}
          playsInline
          preload={prefersReducedMotion ? 'none' : 'metadata'}
          onEnded={advanceToNextTrailer}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => {
            setIsBuffering(false)
            if (isPlaying && !prefersReducedMotion) {
              void videoRef.current?.play().catch(() => {})
            }
          }}
          onPlaying={() => setIsBuffering(false)}
          onContextMenu={(event) => event.preventDefault()}
          aria-label={activeScript.buttonLabel}
        >
          <source src={activeScript.webmSrc} type="video/webm" />
          <source src={activeScript.mp4Src} type="video/mp4" />
        </video>
        <div className="pointer-events-none absolute inset-0 z-[1] bg-black/35" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/20 to-black/35" />
      </div>

      {isBuffering && !prefersReducedMotion && (
        <div
          className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/20"
          aria-hidden
        >
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400/80" />
        </div>
      )}

      {/* Minimal Top-Right Background Video Controls */}
      <div className="absolute inset-x-0 top-16 z-20 flex items-center justify-end bg-gradient-to-b from-black/80 to-transparent px-4 pt-3 pb-8 lg:top-20">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            data-hero-control
            onClick={togglePlay}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-white transition hover:text-cyan-400"
            aria-label={isPlaying ? 'Pause background video' : 'Play background video'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            data-hero-control
            onClick={toggleMute}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-white transition hover:text-cyan-400"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Text Overlay: "Imagine the Possibilities" + "with SceneFlow Studio" + Compact Category Pills */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-end px-4 pt-36 pb-16 text-center sm:pb-20 lg:pt-40">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            className="bg-gradient-to-r from-white via-gray-200 to-cyan-200 bg-clip-text text-3xl font-bold leading-tight tracking-tighter text-transparent drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] sm:text-4xl md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.1 }}
          >
            {IMAGINE_POSSIBILITIES_COPY.headline}
          </motion.h2>

          <motion.p
            className="mt-3 text-lg font-medium tracking-wide text-gray-100 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:text-xl md:text-2xl"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.2 }}
          >
            {IMAGINE_POSSIBILITIES_COPY.subheadline}
          </motion.p>

          <motion.div
            role="tablist"
            aria-label="Imagine the Possibilities production categories"
            className="mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.28 }}
          >
            {EXAMPLE_TRAILER_SCRIPTS.map((script) => {
              const isSelected = script.id === activeScript.id
              return (
                <button
                  key={script.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-category-id={script.id}
                  onClick={() => selectCategory(script.id)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur-md transition-all sm:text-sm ${
                    isSelected
                      ? 'border-cyan-400/70 bg-cyan-500/25 text-white shadow-lg shadow-cyan-500/20'
                      : 'border-white/20 bg-black/50 text-gray-200 hover:border-white/40 hover:bg-black/70 hover:text-white'
                  }`}
                >
                  {script.buttonLabel}
                </button>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
