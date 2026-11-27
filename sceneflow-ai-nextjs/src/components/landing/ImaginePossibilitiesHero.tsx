'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight, Briefcase, Compass, Loader2, Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { isPrelaunchAccessModeEnabled } from '@/lib/billing/prelaunchAccess'
import { openPrelaunchAccessModal } from '@/components/landing/PrelaunchAccessModal'
import { localizeUsdText } from '@/lib/i18n/landingCurrency'
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
  const studioCopy = useStudioLandingCopy()
  const prelaunchOnly = isPrelaunchAccessModeEnabled()
  const tPossibilities = useTranslations('imaginePossibilities')
  const tHero = useTranslations('hero')
  const tCommon = useTranslations('common')
  const primaryHeroCtaLabel = prelaunchOnly
    ? (tHero.has('requestPreLaunchAccess') ? tHero('requestPreLaunchAccess') : 'Request Pre-Launch Access')
    : localizeUsdText(studioCopy.heroDock.primaryCta, locale)
  const prefersReducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const prevSourceKeyRef = useRef<string | null>(null)
  const isReloadingSourceRef = useRef(false)

  const heroEyebrow = tHero.has('eyebrow') ? tHero('eyebrow') : ''
  const headline = tHero.has('headline')
    ? tHero('headline')
    : tPossibilities.has('headline')
      ? tPossibilities('headline')
      : IMAGINE_POSSIBILITIES_COPY.headline
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
  const [isBuffering, setIsBuffering] = useState(false)
  const [isTheaterOpen, setIsTheaterOpen] = useState(false)
  const [videoPreload, setVideoPreload] = useState<VideoPreloadValue>('metadata')
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
      if (video.readyState >= 2 || (!video.paused && video.currentTime > 0)) {
        setIsBuffering(false)
      }
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
        } else {
          setIsBuffering(false)
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
        {/* Background Video Layer — full-bleed cinematic framing */}
        <div className="absolute inset-x-0 bottom-0 top-16 overflow-hidden xl:inset-0">
          <video
            ref={videoRef}
            poster={activePoster}
            className="absolute inset-0 z-0 h-full w-full bg-black object-cover object-center"
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
            onWaiting={(event) => {
              if (userActivatedPlayback && event.currentTarget.readyState < 2) {
                setIsBuffering(true)
              }
            }}
            onLoadedData={() => setIsBuffering(false)}
            onSeeked={() => setIsBuffering(false)}
            onCanPlayThrough={() => setIsBuffering(false)}
            onTimeUpdate={(event) => {
              const vid = event.currentTarget
              if (isBuffering && (vid.readyState >= 2 || (!vid.paused && vid.currentTime > 0))) {
                setIsBuffering(false)
              }
            }}
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

        {/* Warm only lightweight poster images (~40 KB); avoid full-file video prefetches that choke the playing Hero stream. */}
        {prefetchedIds
          .filter((id) => id !== activeScript.id)
          .map((id) => {
            const nextSources = getProductionTrailerSources(id, videoLocale)
            return (
              <link key={`prefetch-${id}`} rel="prefetch" as="image" href={nextSources.posterSrc} />
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
        <div className="absolute inset-x-0 top-16 z-20 flex items-center justify-end bg-gradient-to-b from-black/80 to-transparent px-4 pt-3 pb-8 xl:top-20">
          <div className="flex items-center gap-2">
            <VideoGlobeLanguageSelector
              activeLocale={videoLocale}
              onSelectLocale={handleSelectVideoLocale}
              isLoading={isBuffering}
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
                className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85 hover:text-cyan-300"
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
                className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85 hover:text-cyan-300"
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
                className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/65 text-gray-200 backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85 hover:text-white"
                aria-label={tHero('fullscreen')}
              >
                <Maximize2 className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            </VideoControlTooltip>
          </div>
        </div>

        {/* Cinematic Bottom Dock: Category-Defining H1 + Concise Value Prop + 6 Genre Pills + 2 Crisp CTAs */}
        <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-end px-4 pt-32 pb-10 text-center sm:pt-36 sm:pb-16 lg:pt-40">
          <div className="mx-auto w-full max-w-4xl">
            {heroEyebrow ? (
              <motion.p
                className="mb-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
              >
                {heroEyebrow}
              </motion.p>
            ) : null}

            <motion.h1
              className="bg-gradient-to-r from-white via-gray-100 to-cyan-200 bg-clip-text text-balance text-3xl font-bold leading-[1.12] tracking-tight text-transparent drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] sm:text-5xl md:text-6xl lg:text-7xl"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.1 }}
            >
              {headline}
            </motion.h1>

            <motion.p
              className="mx-auto mt-3 sm:mt-4 max-w-2xl text-sm leading-relaxed text-gray-100/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] sm:text-base md:text-lg"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.7, delay: prefersReducedMotion ? 0 : 0.2 }}
            >
              {studioCopy.heroDock.tagline}
            </motion.p>

            <div className="relative mt-5 sm:mt-6">
              <motion.div
                role="tablist"
                aria-label={categoriesAriaLabel}
                className="flex w-full max-w-full flex-nowrap items-center justify-start gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:justify-center sm:gap-2.5 sm:overflow-visible sm:px-0 sm:pb-0"
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.7, delay: prefersReducedMotion ? 0 : 0.28 }}
              >
                {EXAMPLE_TRAILER_SCRIPTS.map((script) => {
                  const isSelected = script.id === activeScript.id
                  const categoryLabel = getCategoryLabel(script)
                  return (
                    <button
                      key={script.id}
                      type="button"
                      role="tab"
                      title={categoryLabel}
                      aria-selected={isSelected}
                      data-category-id={script.id}
                      onMouseEnter={() => prefetchCategory(script.id)}
                      onFocus={() => prefetchCategory(script.id)}
                      onClick={() => selectCategory(script.id)}
                      className={`shrink-0 whitespace-nowrap rounded-lg sm:rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-all sm:px-4 sm:py-1.5 sm:text-sm ${
                        isSelected
                          ? 'border-cyan-400/80 bg-cyan-500/25 text-white shadow-lg shadow-cyan-500/25'
                          : 'border-white/20 bg-black/55 text-gray-200 hover:border-white/40 hover:bg-black/75 hover:text-white'
                      }`}
                    >
                      {categoryLabel}
                    </button>
                  )
                })}
              </motion.div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-gray-950/90 to-transparent sm:hidden"
              />
            </div>

            <motion.div
              className="mx-auto mt-5 flex w-full max-w-md flex-col items-stretch justify-center gap-2.5 sm:max-w-none sm:flex-row sm:items-center sm:gap-3.5"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.7, delay: prefersReducedMotion ? 0 : 0.36 }}
            >
              <button
                type="button"
                title={primaryHeroCtaLabel}
                onClick={() => {
                  if (prelaunchOnly && openPrelaunchAccessModal({ tier: 'explorer', source: 'hero' })) {
                    return
                  }
                  window.location.href = getSignupUrlForTier('explorer')
                }}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl sm:rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition-all hover:brightness-110 sm:w-auto sm:text-base cursor-pointer"
              >
                <span className="whitespace-normal leading-tight">{primaryHeroCtaLabel}</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                title={studioCopy.heroDock.howItWorksCta}
                onClick={() => {
                  document.getElementById('studio-tour')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl sm:rounded-full border border-white/25 bg-black/60 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:border-cyan-400/50 hover:bg-black/80 sm:w-auto sm:text-base"
              >
                <Compass className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
                <span className="whitespace-normal leading-tight">{studioCopy.heroDock.howItWorksCta}</span>
              </button>
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
