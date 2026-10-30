'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Clock,
  Copy,
  Film,
  Layers,
  Loader2,
  Maximize2,
  Pause,
  PauseCircle,
  Play,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import {
  openTwoModesOnPhoneOrTheater,
  TwoModesTheaterModal,
} from '@/components/landing/TwoModesTheaterModal'
import { PRODUCTION_AGENT_MEDIA } from '@/config/landing/primaryValueMedia'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import {
  formatHeroVideoScript,
  getHeroSectionScript,
} from '@/config/landing/heroSectionScripts'

export const PRODUCTION_AGENT_SECTION_ID = 'production-agent'

const DETAIL_CARD_ICONS = [Clock, Layers, ShieldCheck, PauseCircle] as const

const ANA_VIDEO_BLOCKS = [
  {
    block: 'Block 01 (0:00–0:10)',
    title: 'The 300-Shot Wall & One-Click Launch',
    syncLine:
      'ANA (on camera): "Three hundred shots used to mean three hundred manual prompts. Not anymore."',
    narration:
      'Spend under an hour perfecting your script across 27 scenes — then launch the Production Agent in one click.',
    visual:
      'Medium shot of Ana (CHAR_ANA, olive field jacket over slate turtleneck) in the dark virtual production suite. She taps a single cyan launch control; behind her, a 27-scene storyboard grid and a cyan-to-emerald progress bar ignite across the curved wall display.',
  },
  {
    block: 'Block 02 (0:10–0:20)',
    title: 'Autonomous Build, Self-Healing & Creative Clips Fallback',
    narration:
      'The Agent walks every scene — locking references, laying narration and music cues, optimizing failed clip prompts, and switching to Creative Clips when a shot hits policy filters.',
    visual:
      'Over-the-shoulder past Ana toward the curved wall display as storyboard frames, audio waveforms, and motion previews populate across 27 scene slots. One tile briefly pulses amber (policy retry), rewrites its camera angle, and turns solid emerald green.',
  },
  {
    block: 'Block 03 (0:20–0:30)',
    title: 'Walk Away & Screening Room Notification',
    narration:
      'Set scene checkpoints, or walk away completely. When your Pre-Vis or master cut is ready, a notification delivers your private Screening Room link for review.',
    visual:
      'Ana picks up her ceramic coffee mug as the wall display reaches 100% emerald completion. Her phone lights up with a private /s/ Screening Room notification; she smiles warmly to camera while the finished master plays behind her.',
  },
] as const

export function ProductionAgentSection() {
  const t = useTranslations('productionAgent')
  const tHero = useTranslations('hero')
  const tCommon = useTranslations('common')
  const tShowcase = useTranslations('productionShowcase')
  const detailCards = t.raw('cards') as Array<{ badge: string; title: string; description: string }>
  const [showDetail, setShowDetail] = useState(false)
  const [showAnaScript, setShowAnaScript] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)

  const media = PRODUCTION_AGENT_MEDIA
  const hasVideo = Boolean(media.webmUrl || media.mp4Url)
  const prefersReducedMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion)
  const [inViewport, setInViewport] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(true)
  const [isTheaterOpen, setIsTheaterOpen] = useState(false)
  const [isBuffering, setIsBuffering] = useState(hasVideo)

  const anaHeroScript = getHeroSectionScript('agent')

  useEffect(() => {
    if (prefersReducedMotion) setIsPlaying(false)
  }, [prefersReducedMotion])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasVideo || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.2)
        }
      },
      { threshold: [0, 0.2, 0.5] }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [hasVideo])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasVideo) return

    const shouldPlay = isPlaying && inViewport && !isTheaterOpen && !prefersReducedMotion
    video.muted = isTheaterOpen ? true : isMuted
    if (!shouldPlay) {
      video.pause()
      return
    }

    void video.play().catch(() => {})
  }, [
    hasVideo,
    inViewport,
    isMuted,
    isPlaying,
    isTheaterOpen,
    prefersReducedMotion,
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
    const openedNative = openTwoModesOnPhoneOrTheater(videoRef.current, () => setIsTheaterOpen(true))
    if (openedNative) {
      setIsMuted(false)
      setShowUnmutePrompt(false)
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

  const scrollToCheckout = () => {
    window.location.href = getSignupUrlForTier('explorer')
  }

  const scrollToExamples = () => {
    document.getElementById('production-examples')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCopyAnaScript = async () => {
    try {
      await navigator.clipboard.writeText(formatHeroVideoScript(anaHeroScript))
      setCopiedScript(true)
      setTimeout(() => setCopiedScript(false), 2000)
    } catch {
      // ignore clipboard errors
    }
  }

  const videoCaption =
    'Ana in the SceneFlow virtual production suite as the Autonomous Production Agent builds 27 scenes in the background'

  return (
    <>
      <section
        id={PRODUCTION_AGENT_SECTION_ID}
        className="relative min-h-[64vh] scroll-mt-20 overflow-hidden bg-gray-950 text-white"
      >
        {/* Full-bleed Ana video backdrop matching TwoModesSection, DirectControlSection, and PublishCutSection */}
        {hasVideo ? (
          <div className="absolute inset-0 overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full bg-black object-cover"
              autoPlay={!prefersReducedMotion}
              loop
              muted={isMuted || isTheaterOpen}
              playsInline
              preload={prefersReducedMotion ? 'none' : 'metadata'}
              poster={media.posterUrl || undefined}
              aria-label={videoCaption}
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
          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-1.5 bg-gradient-to-b from-black/80 to-transparent px-4 pt-3 pb-8 sm:gap-2">
            <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
              {isMuted && !isBuffering && (
                showUnmutePrompt ? (
                  <button
                    type="button"
                    onClick={unmuteWithSound}
                    aria-label={tHero('playWithNarration')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-cyan-400/40 bg-black/70 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition-colors hover:border-cyan-400/60 hover:bg-black/85 sm:h-auto sm:w-auto sm:px-2 sm:py-1 sm:text-sm"
                  >
                    <Volume2 className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
                    <span className="hidden whitespace-nowrap sm:inline">{tHero('playWithNarration')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={unmuteWithSound}
                    aria-label={tHero('tapToHear')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-black/60 text-xs font-medium text-gray-200 transition-colors hover:border-cyan-400/40 hover:text-white sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                  >
                    <VolumeX className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
                    <span className="hidden whitespace-nowrap sm:inline">{tHero('tapToHear')}</span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={togglePlay}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-white transition hover:text-cyan-400"
                aria-label={isPlaying ? tHero('pauseBackgroundVideo') : tHero('playBackgroundVideo')}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-white transition hover:text-cyan-400"
                aria-label={isMuted ? tCommon('unmute') : tCommon('mute')}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={openTheater}
                className="flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-black/50 text-xs font-medium text-gray-200 transition-colors hover:border-cyan-400/40 hover:text-white sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                aria-label={tHero('fullscreen')}
              >
                <Maximize2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="hidden whitespace-nowrap sm:inline">{tHero('fullscreen')}</span>
              </button>
            </div>
          </div>
        )}

      <div className="relative z-10 mx-auto flex min-h-[64vh] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
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
          <p className="mx-auto mt-5 max-w-3xl text-balance text-base text-gray-100 sm:text-lg">
            {t('subtitle')}
          </p>

          {/* Toggle to reveal detailed description cards & Ana video script */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowDetail((prev) => !prev)}
              aria-expanded={showDetail}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-cyan-200 backdrop-blur-md transition hover:border-cyan-400/50 hover:bg-slate-900 hover:text-white sm:text-sm"
            >
              <Bot className="h-4 w-4 text-cyan-400" aria-hidden />
              <span>{showDetail ? t('hideDetail') : t('showDetail')}</span>
              {showDetail ? (
                <ChevronUp className="h-4 w-4 text-cyan-300" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4 text-cyan-300" aria-hidden />
              )}
            </button>
          </div>
        </motion.div>

        {/* Collapsible Detailed Description Cards + Ana Video Script */}
        {showDetail && (
          <motion.div
            className="mx-auto mt-8 w-full max-w-4xl rounded-2xl border border-white/15 bg-slate-950/75 p-5 backdrop-blur-md sm:p-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-4 flex flex-col items-center gap-1.5 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                <Bot className="h-3.5 w-3.5" aria-hidden />
                {t('drawerBadge')}
              </span>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                {t('drawerTitle')}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detailCards.map((card, index) => {
                const Icon = DETAIL_CARD_ICONS[index] ?? Clock
                return (
                  <div
                    key={card.title}
                    className="rounded-xl border border-white/10 bg-slate-900/75 p-4 text-left"
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10">
                        <Icon className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300/90">
                        {card.badge}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white">{card.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-300 sm:text-sm">
                      {card.description}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Ana Video Script Drawer */}
            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnaScript((prev) => !prev)}
                  aria-expanded={showAnaScript}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-300 transition hover:text-white sm:text-sm"
                >
                  <Film className="h-4 w-4 text-cyan-400" aria-hidden />
                  <span>
                    {showAnaScript ? t('hideScript') : t('viewScript')}
                  </span>
                  {showAnaScript ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>

                {showAnaScript && (
                  <button
                    type="button"
                    onClick={handleCopyAnaScript}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1 text-xs font-medium text-gray-200 transition hover:border-cyan-400/40 hover:text-white"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                        <span>{t('copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                        <span>{t('copyScript')}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {showAnaScript && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {ANA_VIDEO_BLOCKS.map((item) => (
                    <div
                      key={item.block}
                      className="rounded-xl border border-white/10 bg-slate-950/85 p-3.5 text-left"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                        {item.block}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-white">{item.title}</p>
                      {'syncLine' in item && item.syncLine ? (
                        <p className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-2.5 py-1.5 text-xs italic text-cyan-100">
                          {item.syncLine}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs leading-relaxed text-gray-200">
                        <span className="font-semibold text-gray-400">VO: </span>
                        {item.narration}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
                        <span className="font-semibold text-gray-500">Picture: </span>
                        {item.visual}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
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
          <Button
            size="lg"
            variant="outline"
            className="border-white/25 bg-black/45 text-white backdrop-blur-sm hover:border-cyan-400/50 hover:bg-black/65"
            onClick={scrollToExamples}
          >
            <Clapperboard className="mr-2 h-4 w-4 text-cyan-400" />
            {tShowcase('badge')}
          </Button>
        </motion.div>
      </div>
      </section>

      {hasVideo && (
        <TwoModesTheaterModal
          open={isTheaterOpen}
          onClose={closeTheater}
          media={media}
          caption={videoCaption}
          pauseLabel={tCommon('pause')}
          playLabel={tCommon('play')}
          muteLabel={tCommon('mute')}
          unmuteLabel={tCommon('unmute')}
          soonLabel={tHero('soon')}
        />
      )}
    </>
  )
}

export default ProductionAgentSection
