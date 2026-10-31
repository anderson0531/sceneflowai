'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowRight,
  Check,
  Clapperboard,
  Copy,
  FileText,
  Film,
  GraduationCap,
  Maximize2,
  Palette,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import {
  EXAMPLE_TRAILER_SCRIPTS,
  IMAGINE_POSSIBILITIES_COPY,
  formatExampleTrailerScript,
  type ExampleTrailerScript,
} from '@/config/landing/exampleTrailerScripts'
import type { ProductionWalkId } from '@/config/landing/productionPipelineDemo'
import {
  enterPhoneVideoFullscreen,
  isCoarsePointer,
} from '@/lib/landing/phoneVideoFullscreen'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export const IMAGINE_POSSIBILITIES_SECTION_ID = 'imagine-possibilities'

type CategoryTheme = {
  icon: React.ElementType
  activePill: string
  badgeClass: string
  accentText: string
  glowClass: string
}

const CATEGORY_THEMES: Record<ProductionWalkId, CategoryTheme> = {
  drama: {
    icon: Clapperboard,
    activePill:
      'border-purple-400/70 bg-gradient-to-r from-purple-600/35 via-indigo-600/30 to-cyan-500/25 text-white shadow-lg shadow-purple-500/20',
    badgeClass: 'border-purple-400/40 bg-purple-500/20 text-purple-200',
    accentText: 'text-purple-300',
    glowClass: 'from-purple-600/25 via-transparent to-cyan-500/15',
  },
  animation: {
    icon: Palette,
    activePill:
      'border-amber-400/70 bg-gradient-to-r from-amber-500/35 via-orange-500/30 to-yellow-500/20 text-white shadow-lg shadow-amber-500/20',
    badgeClass: 'border-amber-400/40 bg-amber-500/20 text-amber-200',
    accentText: 'text-amber-300',
    glowClass: 'from-amber-500/25 via-transparent to-orange-500/15',
  },
  documentary: {
    icon: Film,
    activePill:
      'border-rose-400/70 bg-gradient-to-r from-rose-600/35 via-amber-600/25 to-orange-500/20 text-white shadow-lg shadow-rose-500/20',
    badgeClass: 'border-rose-400/40 bg-rose-500/20 text-rose-200',
    accentText: 'text-rose-300',
    glowClass: 'from-rose-500/25 via-transparent to-amber-500/15',
  },
  training: {
    icon: GraduationCap,
    activePill:
      'border-emerald-400/70 bg-gradient-to-r from-emerald-600/35 via-teal-600/30 to-cyan-500/20 text-white shadow-lg shadow-emerald-500/20',
    badgeClass: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
    accentText: 'text-emerald-300',
    glowClass: 'from-emerald-500/25 via-transparent to-teal-500/15',
  },
}

export function ImaginePossibilitiesHero() {
  const prefersReducedMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const theaterVideoRef = useRef<HTMLVideoElement>(null)

  const [activeId, setActiveId] = useState<ProductionWalkId>('drama')
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion)
  const [inViewport, setInViewport] = useState(true)
  const [theaterOpen, setTheaterOpen] = useState(false)
  const [scriptModalOpen, setScriptModalOpen] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)

  const activeScript: ExampleTrailerScript =
    EXAMPLE_TRAILER_SCRIPTS.find((item) => item.id === activeId) ?? EXAMPLE_TRAILER_SCRIPTS[0]
  const theme = CATEGORY_THEMES[activeScript.id]

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
    if (prefersReducedMotion || theaterOpen || scriptModalOpen || !inViewport) {
      video.pause()
      return
    }
    video.muted = isMuted
    if (isPlaying) {
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [
    activeScript.id,
    inViewport,
    isMuted,
    isPlaying,
    prefersReducedMotion,
    scriptModalOpen,
    theaterOpen,
  ])

  useEffect(() => {
    if (!theaterOpen && !scriptModalOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTheaterOpen(false)
        setScriptModalOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [scriptModalOpen, theaterOpen])

  const selectCategory = useCallback(
    (id: ProductionWalkId) => {
      setActiveId(id)
      setCopiedScript(false)
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

  const openFullscreen = useCallback(() => {
    const video = videoRef.current
    if (video && isCoarsePointer()) {
      video.muted = false
      setIsMuted(false)
      void video.play().catch(() => {})
      if (enterPhoneVideoFullscreen(video)) return
    }
    setTheaterOpen(true)
  }, [])

  const scrollToProductionCard = useCallback((id: ProductionWalkId) => {
    const target =
      document.getElementById(`production-showcase-${id}`) ??
      document.getElementById('production-examples')
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollToPlatformHero = useCallback(() => {
    document.getElementById('hero-video')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleCopyTrailerScript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatExampleTrailerScript(activeScript))
      setCopiedScript(true)
      setTimeout(() => setCopiedScript(false), 2200)
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  }, [activeScript])

  return (
    <section
      id={IMAGINE_POSSIBILITIES_SECTION_ID}
      aria-label={IMAGINE_POSSIBILITIES_COPY.headline}
      className="relative w-full overflow-hidden border-b border-white/10 bg-slate-950 pt-20 pb-10 text-white lg:pt-24 lg:pb-14"
    >
      {/* Ambient genre glow */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60 transition-colors duration-700 ${theme.glowClass}`}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header: Eyebrow + "Imagine the Possibilities" + 4 Category Buttons */}
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
            <span>{IMAGINE_POSSIBILITIES_COPY.eyebrow}</span>
          </div>

          <motion.h2
            className="mt-4 bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
          >
            {IMAGINE_POSSIBILITIES_COPY.headline}
          </motion.h2>

          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {IMAGINE_POSSIBILITIES_COPY.subheadline}
          </p>
        </div>

        {/* 4 Category Switcher Buttons: Cinematic Drama, Animated Series, Documentaries, Training Series */}
        <div
          role="tablist"
          aria-label="Imagine the Possibilities production categories"
          className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3"
        >
          {EXAMPLE_TRAILER_SCRIPTS.map((script) => {
            const isSelected = script.id === activeScript.id
            const itemTheme = CATEGORY_THEMES[script.id]
            const Icon = itemTheme.icon
            return (
              <button
                key={script.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-category-id={script.id}
                onClick={() => selectCategory(script.id)}
                className={`group flex flex-col items-start justify-between rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ${
                  isSelected
                    ? itemTheme.activePill
                    : 'border-white/10 bg-slate-900/75 text-slate-300 hover:border-white/25 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-bold sm:text-sm">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? 'text-white' : itemTheme.accentText
                      }`}
                      aria-hidden
                    />
                    <span>{script.buttonLabel}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
                      isSelected
                        ? 'bg-black/35 text-white ring-1 ring-white/25'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {script.runtimeLabel}
                  </span>
                </div>
                <p
                  className={`mt-1.5 line-clamp-1 text-[11px] font-medium ${
                    isSelected ? 'text-white/90' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                >
                  {script.showTitle}
                </p>
              </button>
            )
          })}
        </div>

        {/* Widescreen 16:9 Cinematic Trailer Showcase Frame */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl shadow-black/80">
          <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
            <video
              key={`${activeScript.id}-${activeScript.webmSrc}`}
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay={!prefersReducedMotion}
              muted={isMuted}
              playsInline
              preload={prefersReducedMotion ? 'none' : 'metadata'}
              onEnded={advanceToNextTrailer}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onContextMenu={(event) => event.preventDefault()}
              aria-label={`${activeScript.buttonLabel} trailer — ${activeScript.showTitle}`}
            >
              <source src={activeScript.webmSrc} type="video/webm" />
              <source src={activeScript.mp4Src} type="video/mp4" />
            </video>

            {/* Cinematic Vignette Overlays */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-black/45" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />

            {/* Top Bar Inside Video: Active Category Badge & Media Controls */}
            <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md ${theme.badgeClass}`}
                >
                  <Sparkles className="h-3 w-3" aria-hidden />
                  {activeScript.buttonLabel}
                </span>
                <span className="hidden rounded-full border border-white/15 bg-black/65 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-md sm:inline-flex">
                  {activeScript.formatBadge}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-black/75 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:border-cyan-300 hover:bg-black/90"
                  aria-label={
                    isMuted
                      ? IMAGINE_POSSIBILITIES_COPY.unmuteLabel
                      : IMAGINE_POSSIBILITIES_COPY.muteLabel
                  }
                >
                  {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                  )}
                  <span>
                    {isMuted
                      ? IMAGINE_POSSIBILITIES_COPY.unmuteLabel
                      : IMAGINE_POSSIBILITIES_COPY.muteLabel}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white backdrop-blur-md transition hover:border-white/40 hover:bg-black/90"
                  aria-label={isPlaying ? 'Pause trailer' : 'Play trailer'}
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Play className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>

                <button
                  type="button"
                  onClick={openFullscreen}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:border-white/40 hover:bg-black/90"
                  aria-label={IMAGINE_POSSIBILITIES_COPY.fullscreenLabel}
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">
                    {IMAGINE_POSSIBILITIES_COPY.fullscreenLabel}
                  </span>
                </button>
              </div>
            </div>

            {/* Bottom Lower-Third Overlay on Desktop */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden flex-col justify-end p-5 lg:flex">
              <div className="max-w-3xl">
                <p className={`text-xs font-bold uppercase tracking-wider ${theme.accentText}`}>
                  {activeScript.tagline}
                </p>
                <h3 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  {activeScript.showTitle}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-200">
                  {activeScript.logline}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Action Bar Below Video */}
          <div className="flex flex-col justify-between gap-4 border-t border-white/10 bg-slate-900/90 px-4 py-3.5 sm:flex-row sm:items-center sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 lg:hidden">
                <span className="text-base font-bold text-white">{activeScript.showTitle}</span>
                <span className="text-xs text-slate-400">· {activeScript.tagline}</span>
              </div>
              <p className="mt-1 text-xs text-slate-300 lg:mt-0">
                <span className="font-semibold text-cyan-300">Continuity Lock:</span>{' '}
                {activeScript.continuityBadge}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setScriptModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-cyan-400/40 hover:bg-slate-800 hover:text-white"
              >
                <FileText className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                <span>
                  {IMAGINE_POSSIBILITIES_COPY.viewScriptLabel} ({activeScript.blocks.length} Shots)
                </span>
              </button>

              <button
                type="button"
                onClick={() => scrollToProductionCard(activeScript.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
              >
                <span>{IMAGINE_POSSIBILITIES_COPY.exploreProductionLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={scrollToPlatformHero}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/25 hover:text-white"
              >
                <span>{IMAGINE_POSSIBILITIES_COPY.platformOverviewLabel}</span>
                <ArrowDown className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Video Theater Modal */}
      {theaterOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex flex-col bg-black"
              role="dialog"
              aria-modal="true"
              aria-label={`${activeScript.showTitle} — ${activeScript.buttonLabel} Trailer`}
            >
              <video
                key={`theater-${activeScript.id}`}
                ref={theaterVideoRef}
                className="h-full w-full object-contain"
                autoPlay
                controls
                playsInline
                controlsList="nodownload"
                onContextMenu={(event) => event.preventDefault()}
              >
                <source src={activeScript.webmSrc} type="video/webm" />
                <source src={activeScript.mp4Src} type="video/mp4" />
              </video>
              <button
                type="button"
                onClick={() => setTheaterOpen(false)}
                className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-xs font-semibold text-white hover:bg-black/90"
                aria-label={IMAGINE_POSSIBILITIES_COPY.exitFullscreenLabel}
              >
                <X className="h-4 w-4" aria-hidden />
                <span>{IMAGINE_POSSIBILITIES_COPY.exitFullscreenLabel}</span>
              </button>
            </div>,
            document.body
          )
        : null}

      {/* Trailer Script & Shot Breakdown Modal */}
      {scriptModalOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-label={`${activeScript.showTitle} Trailer Script`}
              onClick={() => setScriptModalOpen(false)}
            >
              <div
                className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 text-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${theme.badgeClass}`}
                      >
                        {activeScript.buttonLabel}
                      </span>
                      <span className="text-xs text-slate-400">
                        {activeScript.formatBadge} ({activeScript.runtimeLabel})
                      </span>
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-white">
                      {activeScript.showTitle} — Official Trailer Script ({activeScript.blocks.length}{' '}
                      Shots)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyTrailerScript}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25 hover:text-white"
                    >
                      {copiedScript ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                          <span>Copied Script</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                          <span>Copy Trailer Script</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setScriptModalOpen(false)}
                      className="rounded-lg border border-white/15 bg-slate-800 p-1.5 text-slate-300 hover:text-white"
                      aria-label="Close trailer script"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>

                {/* Category switcher inside modal */}
                <div className="flex flex-wrap gap-1.5 border-b border-white/10 bg-slate-950 px-5 py-2.5">
                  {EXAMPLE_TRAILER_SCRIPTS.map((script) => (
                    <button
                      key={script.id}
                      type="button"
                      onClick={() => selectCategory(script.id)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                        script.id === activeScript.id
                          ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {script.buttonLabel} · {script.showTitle} ({script.runtimeLabel})
                    </button>
                  ))}
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                      Visual &amp; Continuity Lock
                    </p>
                    <p className="mt-1 text-sm text-slate-200">{activeScript.artStyleLock}</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {activeScript.referenceLocks.map((ref) => (
                        <div
                          key={ref.token}
                          className="rounded-lg border border-white/10 bg-slate-950/70 p-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white">{ref.name}</span>
                            <code className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-300">
                              {ref.token}
                            </code>
                          </div>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                            {ref.role}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-300">
                            {ref.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {activeScript.blocks.map((block) => (
                      <div
                        key={block.blockNumber}
                        className="rounded-xl border border-white/10 bg-slate-900/50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                          <h4 className="text-sm font-bold text-white">
                            Shot {String(block.blockNumber).padStart(2, '0')} — {block.title}
                          </h4>
                          <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-cyan-200">
                            {block.timecode} · {block.timing}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-200">
                          {block.inSceneDialogue ? (
                            <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-amber-100">
                              <span className="font-bold text-amber-300">In-Scene Dialogue: </span>
                              {block.inSceneDialogue}
                            </p>
                          ) : null}
                          {block.narrationVo ? (
                            <p className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-cyan-100">
                              <span className="font-bold text-cyan-300">Narrator VO: </span>“
                              {block.narrationVo}”
                            </p>
                          ) : null}
                          <p>
                            <span className="font-semibold text-slate-400">Video Prompt: </span>
                            {block.videoPrompt}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-400">
                              Camera &amp; Lighting:{' '}
                            </span>
                            {block.cameraAndLighting}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-400">SFX &amp; Score: </span>
                            {block.sfxAndMusic}
                          </p>
                          <p className="text-emerald-300">
                            <span className="font-semibold">Settle On: </span>
                            {block.settleOn}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  )
}
