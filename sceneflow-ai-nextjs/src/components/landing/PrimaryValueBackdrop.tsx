'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { TwoModesTheaterModal } from '@/components/landing/TwoModesTheaterModal'
import { VideoLanguageControl } from '@/components/landing/VideoLanguagePicker'
import type { TwoModesMediaEntry, TwoModesVideoLocale } from '@/config/landing/twoModesMedia'
import type { VideoLocaleId } from '@/config/landing/videoLocales'
import { useLandingVideoLocale } from '@/i18n/useLandingVideoLocale'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type ComparisonCopy = {
  id: string
  caption: string
}

type PrimaryValueNamespace = 'twoModes' | 'directControl' | 'publishCut'

export function PrimaryValueBackdrop({
  sectionId,
  namespace,
  hashAliases = [],
  getMedia,
  videoLocales,
}: {
  sectionId: string
  namespace: PrimaryValueNamespace
  hashAliases?: readonly string[]
  getMedia: (id: string) => TwoModesMediaEntry
  /** When set, the section plays a dubbed clip and shows the hero language control. */
  videoLocales?: TwoModesVideoLocale[]
}) {
  const t = useTranslations(namespace)
  const tHero = useTranslations('hero')
  const tCommon = useTranslations('common')
  const comparison = t.raw('comparison') as ComparisonCopy
  const syncedLocaleId = useLandingVideoLocale(videoLocales)
  const [activeLocaleId, setActiveLocaleId] = useState<VideoLocaleId>(syncedLocaleId)
  const activeLocale = videoLocales?.find(
    (locale) => locale.id === activeLocaleId && locale.available
  )
  const fallbackMedia = getMedia(comparison.id)
  const media: TwoModesMediaEntry = activeLocale
    ? {
        imageUrl: '',
        posterUrl: activeLocale.poster ?? fallbackMedia.posterUrl,
        webmUrl: activeLocale.webmUrl,
        mp4Url: activeLocale.mp4Url || activeLocale.src,
      }
    : fallbackMedia
  const hasVideo = Boolean(media.webmUrl || media.mp4Url)
  const hasLocalePicker = Boolean(videoLocales?.length)
  const prefersReducedMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion)
  const [isMuted, setIsMuted] = useState(true)
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(true)
  const [isTheaterOpen, setIsTheaterOpen] = useState(false)
  const [isBuffering, setIsBuffering] = useState(hasVideo)

  const scrollToCheckout = () => {
    window.location.href = getSignupUrlForTier('explorer')
  }

  useEffect(() => {
    if (prefersReducedMotion) setIsPlaying(false)
  }, [prefersReducedMotion])

  useEffect(() => {
    setActiveLocaleId(syncedLocaleId)
    if (hasLocalePicker) setIsBuffering(true)
  }, [syncedLocaleId, hasLocalePicker])

  const selectLocale = useCallback(
    (id: VideoLocaleId) => {
      const entry = videoLocales?.find((locale) => locale.id === id)
      if (!entry?.available) return
      setActiveLocaleId(id)
      setIsBuffering(true)
    },
    [videoLocales]
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasVideo) return

    const shouldPlay = isPlaying && !isTheaterOpen && !prefersReducedMotion
    video.muted = isTheaterOpen ? true : isMuted
    if (!shouldPlay) {
      video.pause()
      return
    }

    void video.play().catch(() => {})
  }, [
    hasVideo,
    isMuted,
    isPlaying,
    isTheaterOpen,
    prefersReducedMotion,
    activeLocaleId,
    media.mp4Url,
    media.webmUrl,
  ])

  const unmuteWithSound = useCallback(() => {
    const video = videoRef.current
    if (video) {
      video.muted = false
      void video.play().catch(() => {})
    }
    setIsMuted(false)
    setIsPlaying(true)
    setShowUnmutePrompt(false)
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (!video.paused) {
      video.pause()
      setIsPlaying(false)
      return
    }

    void video.play().catch(() => {})
    setIsPlaying(true)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    const nextMuted = !isMuted
    video.muted = nextMuted
    setIsMuted(nextMuted)
    if (!nextMuted) setShowUnmutePrompt(false)
  }

  const openTheater = useCallback(() => {
    const video = videoRef.current
    if (video) video.muted = true
    setIsTheaterOpen(true)
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
        id={sectionId}
        className="relative min-h-[80vh] scroll-mt-20 overflow-hidden bg-gray-950 text-white"
      >
        {hashAliases.map((aliasId) => (
          <span
            key={aliasId}
            id={aliasId}
            className="absolute top-0 left-0 h-0 w-0 scroll-mt-20"
            aria-hidden="true"
          />
        ))}

        {hasVideo ? (
          <div className="absolute inset-0 overflow-hidden">
            <video
              key={videoLocales ? activeLocaleId : 'single'}
              ref={videoRef}
              className="absolute inset-0 h-full w-full bg-black object-cover"
              autoPlay={!prefersReducedMotion}
              loop
              muted={isMuted || isTheaterOpen}
              playsInline
              preload={prefersReducedMotion ? 'none' : 'metadata'}
              poster={media.posterUrl || undefined}
              aria-label={comparison.caption}
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
            >
              {media.webmUrl ? <source src={media.webmUrl} type="video/webm" /> : null}
              {media.mp4Url ? <source src={media.mp4Url} type="video/mp4" /> : null}
            </video>
            <div className="pointer-events-none absolute inset-0 z-[1] bg-black/40" />
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/25 to-black/35" />
          </div>
        ) : null}

        {hasVideo && isBuffering && !prefersReducedMotion && (
          <div
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/20"
            aria-hidden
          >
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400/80" />
          </div>
        )}

        {hasVideo && (
          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent px-4 pt-3 pb-8">
            {videoLocales ? (
              <VideoLanguageControl
                locales={videoLocales}
                activeLocaleId={activeLocaleId}
                onSelect={selectLocale}
                soonLabel={tHero('soon')}
                variant="inline"
                align="start"
              />
            ) : null}
            <div className="ms-auto flex items-center gap-2">
              {isMuted && !isBuffering && (
                showUnmutePrompt ? (
                  <button
                    type="button"
                    onClick={unmuteWithSound}
                    className="flex items-center gap-2 rounded-full border border-cyan-400/40 bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition-colors hover:border-cyan-400/60 hover:bg-black/85 sm:text-sm"
                  >
                    <Volume2 className="h-4 w-4 text-cyan-400" aria-hidden />
                    {tHero('playWithNarration')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={unmuteWithSound}
                    className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-gray-200 transition-colors hover:border-cyan-400/40 hover:text-white"
                    aria-label={tHero('tapToHear')}
                  >
                    <VolumeX className="h-4 w-4 text-cyan-400" aria-hidden />
                    {tHero('tapToHear')}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={togglePlay}
                className="p-1 text-white transition hover:text-cyan-400"
                aria-label={isPlaying ? tHero('pauseBackgroundVideo') : tHero('playBackgroundVideo')}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 text-white transition hover:text-cyan-400"
                aria-label={isMuted ? tCommon('unmute') : tCommon('mute')}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={openTheater}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-cyan-400/40 hover:text-white"
                aria-label={tHero('fullscreen')}
              >
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{tHero('fullscreen')}</span>
              </button>
            </div>
          </div>
        )}

        <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
              {t('eyebrow')}
            </p>
            <h2 className="mx-auto max-w-4xl text-balance text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              {t('title')}
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-balance text-lg text-gray-100">
              {t('subtitle')}
            </p>
          </motion.div>

          <motion.div
            className="mt-10 flex justify-center"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-90"
              onClick={scrollToCheckout}
            >
              {t('cta')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {hasVideo && (
        <TwoModesTheaterModal
          open={isTheaterOpen}
          onClose={closeTheater}
          media={media}
          caption={comparison.caption}
          pauseLabel={tCommon('pause')}
          playLabel={tCommon('play')}
          muteLabel={tCommon('mute')}
          unmuteLabel={tCommon('unmute')}
          videoLocales={videoLocales}
          activeLocaleId={activeLocaleId}
          onSelectLocale={selectLocale}
          soonLabel={tHero('soon')}
        />
      )}
    </>
  )
}
