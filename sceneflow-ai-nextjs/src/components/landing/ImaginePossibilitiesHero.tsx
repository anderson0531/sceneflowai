'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2, Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import {
  openTwoModesOnPhoneOrTheater,
  TwoModesTheaterModal,
} from '@/components/landing/TwoModesTheaterModal'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import { VideoGlobeLanguageSelector } from '@/components/landing/VideoGlobeLanguageSelector'
import {
  EXAMPLE_TRAILER_SCRIPTS,
  IMAGINE_POSSIBILITIES_COPY,
  type ExampleTrailerScript,
} from '@/config/landing/exampleTrailerScripts'
import {
  PRODUCTION_TRAILER_POSTERS,
  getAnimatedSeriesTrailerSources,
  getCinematicDramaTrailerSources,
  getCreatorPodcastTrailerSources,
  getDocumentaryTrailerSources,
  getProductionTrailerSources,
  getTrainingSeriesTrailerSources,
  getVideoMemoirTrailerSources,
  resolveTrailerDubLocale,
  type ProductionWalkId,
  type TrailerDubLocaleId,
} from '@/config/landing/productionPipelineDemo'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { readHeroNetworkContext } from '@/lib/landing/heroPlaybackPolicy'
import { getVideoPreloadStrategy, type VideoPreloadValue } from '@/lib/landing/videoPreload'

export const IMAGINE_POSSIBILITIES_SECTION_ID = 'imagine-possibilities'

export function ImaginePossibilitiesHero() {
  const locale = useLocale()
  const tPossibilities = useTranslations('imaginePossibilities')
  const tHero = useTranslations('hero')
  const tCommon = useTranslations('common')
  const prefersReducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const prevSourceKeyRef = useRef<string | null>(null)
  const isReloadingSourceRef = useRef(false)

  const headline = tPossibilities.has('headline')
    ? tPossibilities('headline')
    : IMAGINE_POSSIBILITIES_COPY.headline
  const subheadline = tPossibilities.has('subheadline')
    ? tPossibilities('subheadline')
    : IMAGINE_POSSIBILITIES_COPY.subheadline
  const categoriesAriaLabel = tPossibilities.has('categoriesAriaLabel')
    ? tPossibilities('categoriesAriaLabel')
    : IMAGINE_POSSIBILITIES_COPY.categoriesAriaLabel
  const getCategoryLabel = useCallback(
    (script: ExampleTrailerScript) => {
      const key = `categories.${script.id}` as const
      return tPossibilities.has(key) ? tPossibilities(key) : script.buttonLabel
    },
    [tPossibilities]
  )

  const [activeId, setActiveId] = useState<ProductionWalkId>('drama')
  const [videoLocale, setVideoLocale] = useState<TrailerDubLocaleId>(() =>
    resolveTrailerDubLocale(locale)
  )
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion)
  const [inViewport, setInViewport] = useState(true)
  const [isBuffering, setIsBuffering] = useState(true)
  const [isTheaterOpen, setIsTheaterOpen] = useState(false)
  const [videoPreload, setVideoPreload] = useState<VideoPreloadValue>('auto')
  const [userActivatedPlayback, setUserActivatedPlayback] = useState(false)
  const [prefetchedIds, setPrefetchedIds] = useState<ProductionWalkId[]>([])
  const pendingSeekRef = useRef<{ time: number; duration: number } | null>(null)

  useEffect(() => {
    setVideoLocale(resolveTrailerDubLocale(locale))
  }, [locale])

  const activeScript: ExampleTrailerScript =
    EXAMPLE_TRAILER_SCRIPTS.find((item) => item.id === activeId) ?? EXAMPLE_TRAILER_SCRIPTS[0]
  const activeSources =
    activeScript.id === 'drama'
      ? getCinematicDramaTrailerSources(videoLocale)
      : activeScript.id === 'animation'
        ? getAnimatedSeriesTrailerSources(videoLocale)
        : activeScript.id === 'documentary'
          ? getDocumentaryTrailerSources(videoLocale)
          : activeScript.id === 'training'
            ? getTrainingSeriesTrailerSources(videoLocale)
            : activeScript.id === 'podcast'
              ? getCreatorPodcastTrailerSources(videoLocale)
              : activeScript.id === 'memoir'
                ? getVideoMemoirTrailerSources(videoLocale)
                : { webmSrc: activeScript.webmSrc, mp4Src: activeScript.mp4Src }
  const activePoster = PRODUCTION_TRAILER_POSTERS[activeScript.id]
  const activeCategoryLabel = getCategoryLabel(activeScript)

  useEffect(() => {
    const ctx = readHeroNetworkContext()
    setVideoPreload(getVideoPreloadStrategy(ctx))
  }, [])

  const prefetchCategory = useCallback((id: ProductionWalkId) => {
    setPrefetchedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const playHeroVideo = useCallback((video: HTMLVideoElement) => {
    void video.play().catch((err: unknown) => {
      const errName =
        err && typeof err === 'object' && 'name' in err
          ? String((err as { name?: unknown }).name)
          : ''
      if (!video.muted && errName === 'NotAllowedError') {
        video.muted = true
        setIsMuted(true)
        void video.play().catch(() => {})
      }
    })
  }, [])

  useEffect(() => {
    const target = sectionRef.current ?? videoRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== target) continue
          setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.15)
        }
      },
      { threshold: [0, 0.15, 0.5] }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const sourceKey = `${activeSources.webmSrc}|${activeSources.mp4Src}`
    if (prevSourceKeyRef.current === null) {
      prevSourceKeyRef.current = sourceKey
      return
    }
    if (prevSourceKeyRef.current === sourceKey) return
    prevSourceKeyRef.current = sourceKey

    isReloadingSourceRef.current = true
    video.load()
    isReloadingSourceRef.current = false

    if ((!prefersReducedMotion || userActivatedPlayback) && inViewport && !isTheaterOpen && isPlaying) {
      video.muted = isMuted
      playHeroVideo(video)
    }
  }, [
    activeSources.webmSrc,
    activeSources.mp4Src,
    inViewport,
    isMuted,
    isPlaying,
    isTheaterOpen,
    playHeroVideo,
    prefersReducedMotion,
    userActivatedPlayback,
  ])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if ((prefersReducedMotion && !userActivatedPlayback) || !inViewport || isTheaterOpen) {
      video.pause()
      return
    }
    video.muted = isMuted
    if (isPlaying) {
      playHeroVideo(video)
    } else {
      video.pause()
    }
  }, [
    inViewport,
    isMuted,
    isPlaying,
    isTheaterOpen,
    playHeroVideo,
    prefersReducedMotion,
    userActivatedPlayback,
  ])

  const selectCategory = useCallback(
    (id: ProductionWalkId) => {
      pendingSeekRef.current = null
      setUserActivatedPlayback(true)
      setActiveId((prev) => {
        if (prev !== id) {
          setIsBuffering(true)
        }
        return id
      })
      setIsPlaying(true)
    },
    []
  )

  const handleSelectVideoLocale = useCallback(
    (nextLocale: TrailerDubLocaleId) => {
      const video = videoRef.current
      if (
        video &&
        Number.isFinite(video.currentTime) &&
        Number.isFinite(video.duration) &&
        video.duration > 0
      ) {
        pendingSeekRef.current = { time: video.currentTime, duration: video.duration }
      } else {
        pendingSeekRef.current = null
      }
      if (video && !isTheaterOpen) {
        video.muted = false
      }
      setUserActivatedPlayback(true)
      setIsMuted(false)
      setIsPlaying(true)
      setVideoLocale((prev) => {
        if (prev === nextLocale) {
          if (video && !isTheaterOpen && video.paused) {
            playHeroVideo(video)
          }
          setIsBuffering(false)
          return prev
        }
        setIsBuffering(true)
        return nextLocale
      })
    },
    [isTheaterOpen, playHeroVideo]
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

  const warmNextTrailer = useCallback(() => {
    if (prefersReducedMotion || videoPreload !== 'auto') return
    const currentIndex = EXAMPLE_TRAILER_SCRIPTS.findIndex((item) => item.id === activeScript.id)
    const nextItem = EXAMPLE_TRAILER_SCRIPTS[(currentIndex + 1) % EXAMPLE_TRAILER_SCRIPTS.length]
    if (nextItem) {
      prefetchCategory(nextItem.id)
    }
  }, [activeScript.id, prefersReducedMotion, videoPreload, prefetchCategory])

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

  const openTheater = useCallback(() => {
    const openedNative = openTwoModesOnPhoneOrTheater(videoRef.current, () => setIsTheaterOpen(true))
    if (openedNative) {
      setIsMuted(false)
    }
  }, [])

  const closeTheater = useCallback(() => {
    setIsTheaterOpen(false)
    const video = videoRef.current
    if (!video) return
    video.muted = isMuted
    if (isPlaying && !prefersReducedMotion) {
      void video.play().catch(() => {})
    }
  }, [isMuted, isPlaying, prefersReducedMotion])

  return (
    <>
      <section
        ref={sectionRef}
        id={IMAGINE_POSSIBILITIES_SECTION_ID}
        aria-label={headline}
        className="relative min-h-[100dvh] w-full overflow-hidden bg-gray-950 text-white"
      >
        {/* Background Video Layer — mirrors HeroSection.tsx & HeroVideoBackground.tsx */}
        <div className="absolute inset-x-0 bottom-0 top-16 overflow-hidden lg:inset-0">
          <video
            ref={videoRef}
            poster={activePoster}
            className="absolute inset-0 z-0 h-full w-full bg-black object-cover object-top lg:object-contain lg:object-center"
            autoPlay={!prefersReducedMotion}
            muted={isMuted || isTheaterOpen}
            playsInline
            preload={
              userActivatedPlayback
                ? 'auto'
                : prefersReducedMotion
                  ? 'none'
                  : videoPreload
            }
            onLoadedMetadata={(event) => {
              const pending = pendingSeekRef.current
              if (!pending) return
              pendingSeekRef.current = null
              const video = event.currentTarget
              if (
                Number.isFinite(video.duration) &&
                Math.abs(video.duration - pending.duration) < 3 &&
                pending.time > 0 &&
                pending.time < video.duration - 0.5
              ) {
                video.currentTime = pending.time
              }
            }}
            onEnded={advanceToNextTrailer}
            onPlay={() => setIsPlaying(true)}
            onPause={(event) => {
              if (
                !isTheaterOpen &&
                !isReloadingSourceRef.current &&
                !event.currentTarget.ended &&
                event.currentTarget.readyState > 0
              ) {
                setIsPlaying(false)
              }
            }}
            onWaiting={() => setIsBuffering(true)}
            onLoadedData={() => setIsBuffering(false)}
            onCanPlay={() => {
              setIsBuffering(false)
              if (
                isPlaying &&
                inViewport &&
                !isTheaterOpen &&
                (!prefersReducedMotion || userActivatedPlayback) &&
                videoRef.current
              ) {
                videoRef.current.muted = isMuted
                playHeroVideo(videoRef.current)
              }
            }}
            onPlaying={() => {
              setIsBuffering(false)
              warmNextTrailer()
            }}
            onError={() => setIsBuffering(false)}
            onContextMenu={(event) => event.preventDefault()}
            aria-label={activeCategoryLabel}
          >
            <source src={activeSources.webmSrc} type="video/webm" />
            <source src={activeSources.mp4Src} type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-0 z-[1] bg-black/35" />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/20 to-black/35" />
        </div>

        {/* Warm poster images and hovered/next category trailer streams */}
        {prefetchedIds
          .filter((id) => id !== activeScript.id)
          .map((id) => {
            const nextSources = getProductionTrailerSources(id, videoLocale)
            return (
              <React.Fragment key={`prefetch-${id}`}>
                <link rel="prefetch" as="image" href={nextSources.posterSrc} />
                {!prefersReducedMotion && videoPreload === 'auto' ? (
                  <link rel="prefetch" as="video" href={nextSources.webmSrc} type="video/webm" />
                ) : null}
              </React.Fragment>
            )
          })}

        {isBuffering && !prefersReducedMotion && (
          <div
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/20"
            aria-hidden
          >
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400/80" />
          </div>
        )}

        {/* Top-Right Background Video Controls */}
        <div className="absolute inset-x-0 top-16 z-20 flex items-center justify-end bg-gradient-to-b from-black/80 to-transparent px-4 pt-3 pb-8 lg:top-20">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <VideoGlobeLanguageSelector
              activeLocale={videoLocale}
              onSelectLocale={handleSelectVideoLocale}
              variant="hero"
              align="end"
              markAsHeroControl
            />
            <VideoControlTooltip
              label={isPlaying ? tHero('pauseBackgroundVideo') : tHero('playBackgroundVideo')}
            >
              <button
                type="button"
                data-hero-control
                onClick={togglePlay}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85 hover:text-cyan-300"
                aria-label={isPlaying ? tHero('pauseBackgroundVideo') : tHero('playBackgroundVideo')}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </VideoControlTooltip>
            <VideoControlTooltip label={isMuted ? tCommon('unmute') : tCommon('mute')}>
              <button
                type="button"
                data-hero-control
                onClick={toggleMute}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85 hover:text-cyan-300"
                aria-label={isMuted ? tCommon('unmute') : tCommon('mute')}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </VideoControlTooltip>
            <VideoControlTooltip label={tHero('fullscreen')}>
              <button
                type="button"
                data-hero-control
                onClick={openTheater}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/65 text-gray-200 backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85 hover:text-white"
                aria-label={tHero('fullscreen')}
              >
                <Maximize2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </button>
            </VideoControlTooltip>
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
              {headline}
            </motion.h2>

            <motion.p
              className="mt-3 text-lg font-medium tracking-wide text-gray-100 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:text-xl md:text-2xl"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.2 }}
            >
              {subheadline}
            </motion.p>

            <motion.div
              role="tablist"
              aria-label={categoriesAriaLabel}
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
                    onMouseEnter={() => prefetchCategory(script.id)}
                    onFocus={() => prefetchCategory(script.id)}
                    onClick={() => selectCategory(script.id)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur-md transition-all sm:text-sm ${
                      isSelected
                        ? 'border-cyan-400/70 bg-cyan-500/25 text-white shadow-lg shadow-cyan-500/20'
                        : 'border-white/20 bg-black/50 text-gray-200 hover:border-white/40 hover:bg-black/70 hover:text-white'
                    }`}
                  >
                    {getCategoryLabel(script)}
                  </button>
                )
              })}
            </motion.div>
          </div>
        </div>
      </section>

      <TwoModesTheaterModal
        open={isTheaterOpen}
        onClose={closeTheater}
        media={{
          imageUrl: '',
          posterUrl: activePoster,
          webmUrl: activeSources.webmSrc,
          mp4Url: activeSources.mp4Src,
        }}
        caption={activeCategoryLabel}
        pauseLabel={tCommon('pause')}
        playLabel={tCommon('play')}
        muteLabel={tCommon('mute')}
        unmuteLabel={tCommon('unmute')}
        languageControl={
          <VideoGlobeLanguageSelector
            activeLocale={videoLocale}
            onSelectLocale={handleSelectVideoLocale}
            variant="theater"
            align="start"
          />
        }
      />
    </>
  )
}
