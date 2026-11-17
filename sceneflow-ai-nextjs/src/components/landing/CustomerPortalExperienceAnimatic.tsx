'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Film,
  Globe2,
  Headphones,
  Image as ImageIcon,
  Lock,
  Mail,
  Maximize,
  Mic,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import {
  CUSTOMER_PORTAL_ANIMATIC_COPY,
  FEATURE_PAN_LOCALE_OPTIONS,
  normalizeFeaturePanLocale,
  type CustomerPortalAnimaticBeatCopy,
  type CustomerPortalMockUiStrings,
  type FeaturePanLocaleId,
} from '@/config/landing/customerPortalAnimaticCopy'

export const CUSTOMER_PORTAL_ANIMATIC_ID = 'customer-portal-animatic'

const SERVICE_THUMBS = [
  '/landing/video-services/memoir-1.webp',
  '/landing/video-services/realestate-1.webp',
  '/landing/video-services/training-1.webp',
  '/landing/video-services/brand-1.webp',
] as const

const STORYBOARD_THUMBS = [
  '/landing/video-services/memoir-1.webp',
  '/landing/video-services/memoir-2.webp',
  '/landing/video-services/brand-2.webp',
] as const

const CONTINUITY_THUMBS = [
  '/images/sandbox/glass-ledger/char-elara.jpg',
  '/images/sandbox/glass-ledger/loc-observation-deck.jpg',
  '/images/sandbox/glass-ledger/prop-chrono-key.jpg',
] as const

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function phaseBadgeStyle(kind: CustomerPortalAnimaticBeatCopy['phaseKind']): string {
  if (kind === 'automated') {
    return 'border-emerald-400/45 bg-emerald-500/20 text-emerald-200'
  }
  if (kind === 'pm_gate') {
    return 'border-amber-400/50 bg-amber-500/20 text-amber-200'
  }
  return 'border-cyan-400/45 bg-cyan-500/20 text-cyan-200'
}

function PortalScreenMockup({
  beat,
  mockUi,
}: {
  beat: CustomerPortalAnimaticBeatCopy
  mockUi: CustomerPortalMockUiStrings
}) {
  switch (beat.id) {
    case 'storefront':
      return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="grid grid-cols-2 gap-2.5 lg:col-span-8">
            {mockUi.services.map((svc, idx) => (
              <div
                key={svc.name}
                className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/90 shadow-md"
              >
                <div className="relative h-20 sm:h-24 w-full overflow-hidden bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={SERVICE_THUMBS[idx]}
                    alt={svc.name}
                    loading="lazy"
                    className="h-full w-full object-cover opacity-85"
                  />
                  <span className="absolute bottom-1.5 end-1.5 rounded-md bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                    {svc.price}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold text-white leading-snug">{svc.name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{svc.tag}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-between rounded-xl border-2 border-emerald-400/60 bg-gradient-to-b from-emerald-950/65 via-slate-900/95 to-slate-950 p-3.5 shadow-lg shadow-emerald-500/10 lg:col-span-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                {beat.calloutBadge}
              </span>
              <p className="mt-2 text-xs font-bold text-white leading-snug">
                {mockUi.blueprintPassTitle}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300 tabular-nums">
                  {mockUi.blueprintPassPrice}
                </span>
                <span className="text-[10px] text-emerald-100/85 leading-tight">
                  {mockUi.blueprintPassNote}
                </span>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-300 px-3 py-2 text-center text-[11px] font-extrabold text-slate-950 shadow">
              {mockUi.blueprintPassCta}
            </div>
          </div>
        </div>
      )

    case 'auto-intake':
      return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3.5 lg:col-span-5">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {mockUi.emailInboxLabel}
            </p>
            <div className="mt-2.5 space-y-2">
              <div className="rounded-lg border border-emerald-400/55 bg-emerald-950/40 p-2.5">
                <p className="text-[10px] font-semibold text-emerald-300">
                  {mockUi.agencyName} • {mockUi.instantDeliveryTag}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-white leading-snug">
                  {mockUi.intakeEmailSubject}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 opacity-65">
                <p className="text-[10px] text-slate-400">{mockUi.blueprintEmailSubject}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-400/40 bg-slate-900/95 p-3.5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">{mockUi.intakeProgressLabel}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-400/40 px-2 py-0.5 text-[10px] font-semibold text-purple-200">
                <Mic className="h-3 w-3 shrink-0" aria-hidden />
                {mockUi.voiceTextBadge}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-[96%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
            </div>
            <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/85 p-3 text-xs italic leading-relaxed text-slate-200">
              {mockUi.intakeSampleQuote}
            </div>
          </div>
        </div>
      )

    case 'illustrated-blueprint':
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
              <Film className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
              {mockUi.storyboardHeader}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-200">
                <Headphones className="h-3 w-3 shrink-0" aria-hidden />
                {mockUi.listenAudioPill}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/45 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200">
                <TrendingUp className="h-3 w-3 shrink-0" aria-hidden />
                {mockUi.arScorePill}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {STORYBOARD_THUMBS.map((src, idx) => (
              <div
                key={src}
                className="overflow-hidden rounded-xl border border-emerald-400/30 bg-slate-900/90"
              >
                <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="flex items-center justify-between px-2.5 py-2 text-[11px] text-slate-200">
                  <span className="font-semibold">
                    {mockUi.storyboardBeatLabels[idx]}
                  </span>
                  <Volume2 className="h-3.5 w-3.5 text-cyan-300 shrink-0" aria-hidden />
                </div>
              </div>
            ))}
          </div>
        </div>
      )

    case 'ai-revisions-ar':
      return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="space-y-2.5 rounded-xl border border-white/10 bg-slate-900/90 p-3.5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-200">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                {mockUi.aiClarifierTitle}
              </span>
              <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                {mockUi.revisionsCounterPill}
              </span>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2.5 text-[11px] text-slate-300">
              {mockUi.clientRawNote}
            </div>
            <div className="rounded-lg border border-emerald-400/45 bg-emerald-950/35 p-2.5 text-[11px] font-medium text-emerald-100">
              {mockUi.aiClarifiedSummary}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-cyan-400/40 bg-slate-900/95 p-3.5 lg:col-span-5">
            <div className="space-y-2">
              <span className="inline-block rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-bold text-cyan-200">
                {mockUi.arCounterPill}
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {mockUi.arEmailSubject}
              </p>
              <div className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-center text-[11px] font-semibold text-cyan-200">
                {mockUi.confirmRevisionBtn}
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-300 px-3 py-2 text-center text-[11px] font-extrabold text-slate-950 shadow">
              {mockUi.approveBlueprintBtn}
            </div>
          </div>
        </div>
      )

    case 'pm-quote-checkout':
      return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="rounded-xl border border-amber-400/45 bg-slate-900/95 p-3.5 lg:col-span-7">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
              {mockUi.pmConsoleTitle}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-xs font-semibold text-cyan-200">
                {mockUi.estComputeMetric}
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-xs font-semibold text-amber-200">
                {mockUi.estOperatorMetric}
              </div>
              <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/30 p-2.5 text-xs font-bold text-emerald-200 sm:col-span-2">
                {mockUi.packageQuoteMetric}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-emerald-400/50 bg-gradient-to-b from-slate-900 to-emerald-950/45 p-3.5 lg:col-span-5">
            <div className="space-y-1.5 text-xs text-slate-200">
              <p className="font-bold text-white">{mockUi.packagedDeliverablesTitle}</p>
              <p className="text-[11px] text-emerald-200">
                {mockUi.packagedDeliverablesSummary}
              </p>
            </div>
            <div className="mt-3 rounded-lg bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-300 px-3 py-2.5 text-center text-xs font-extrabold text-slate-950 shadow">
              {mockUi.sendStripeWhopBtn}
            </div>
          </div>
        </div>
      )

    case 'script-continuity':
      return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="rounded-xl border border-cyan-400/40 bg-slate-900/90 p-3.5 lg:col-span-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-0.5 text-[10px] font-bold text-cyan-200">
              <FileText className="h-3 w-3 shrink-0" aria-hidden />
              {mockUi.autoScriptStepPill}
            </span>
            <p className="mt-2.5 text-xs font-bold text-white leading-snug">
              {mockUi.scriptAutoBadge}
            </p>
            <p className="mt-2 text-[11px] text-slate-300 leading-relaxed">
              {mockUi.continuityEmailSubject}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-400/45 bg-slate-900/95 p-3.5 lg:col-span-7">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
              <ImageIcon className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
              {mockUi.continuityUploadsTitle}
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {mockUi.continuitySlots.map((slotLabel, idx) => (
                <div
                  key={slotLabel}
                  className="overflow-hidden rounded-lg border border-emerald-400/35 bg-slate-950/90"
                >
                  <div className="h-16 sm:h-20 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={CONTINUITY_THUMBS[idx]}
                      alt={slotLabel}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="px-2 py-1.5 text-center text-[10px] font-bold text-emerald-200">
                    {slotLabel}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'screening-room':
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {mockUi.screeningDeliverables.map((label, idx) => (
              <span
                key={label}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-[11px] font-bold',
                  idx === 0 || idx === 4
                    ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
                    : 'border-slate-700 bg-slate-900/90 text-slate-300'
                )}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="relative h-32 sm:h-36 overflow-hidden rounded-xl border border-white/15 bg-slate-950 lg:col-span-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/video-services/memoir-2.webp"
                alt=""
                loading="lazy"
                className="h-full w-full object-cover opacity-90"
              />
              <div className="absolute inset-x-3 bottom-2 flex items-center justify-between rounded-lg bg-slate-950/85 px-3 py-1.5 text-[11px] text-white backdrop-blur-sm">
                <span className="font-semibold">08:42 / 12:00 · 4K HDR</span>
                <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                  {mockUi.roundOneOfTwoBadge}
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-xl border border-emerald-400/40 bg-slate-900/95 p-3.5 lg:col-span-4">
              <p className="text-xs text-slate-200 leading-relaxed">
                {mockUi.screeningEmailSubject}
              </p>
              <div className="mt-3 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-300 px-3 py-2 text-center text-[11px] font-extrabold text-slate-950">
                {mockUi.approveMasterBtn}
              </div>
            </div>
          </div>
        </div>
      )

    case 'margin-payoff':
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {mockUi.payoffCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-emerald-400/40 bg-gradient-to-b from-slate-900/95 to-emerald-950/40 p-4 text-center shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {card.label}
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-300 tabular-nums">
                {card.value}
              </p>
              <p className="mt-1.5 text-xs text-emerald-100/85">{card.sub}</p>
            </div>
          ))}
        </div>
      )
  }
}

export function CustomerPortalExperienceAnimatic({ locale }: { locale?: string }) {
  const [panLocale, setPanLocale] = useState<FeaturePanLocaleId>(() =>
    normalizeFeaturePanLocale(locale)
  )
  const [beatIdx, setBeatIdx] = useState(0)
  const [beatProgress, setBeatProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false)
  const [inViewport, setInViewport] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setPanLocale(normalizeFeaturePanLocale(locale))
  }, [locale])

  const copy = CUSTOMER_PORTAL_ANIMATIC_COPY[panLocale] ?? CUSTOMER_PORTAL_ANIMATIC_COPY.en
  const beats = copy.beats
  const safeIdx = beatIdx < beats.length ? beatIdx : 0
  const currentBeat = beats[safeIdx]!
  const isRtl = panLocale === 'ar'

  const activeSpeechLang = useMemo(
    () =>
      FEATURE_PAN_LOCALE_OPTIONS.find((opt) => opt.id === panLocale)?.speechLang ?? 'en-US',
    [panLocale]
  )

  // Pause animation & speech when scrolled off-screen
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === el) {
            setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.15)
          }
        }
      },
      { threshold: [0, 0.15, 0.5] }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Track Fullscreen state
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const applyCameraMotion = useCallback(
    (progress01: number) => {
      const el = canvasRef.current
      if (!el) return
      const clamped = Math.max(0, Math.min(1, progress01))
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * clamped)
      const scale =
        currentBeat.fromScale + (currentBeat.toScale - currentBeat.fromScale) * eased
      el.style.transformOrigin = `${currentBeat.originX}% ${currentBeat.originY}%`
      el.style.transform = `scale(${scale.toFixed(4)})`
    },
    [currentBeat]
  )

  // Speak localized narration when voiceoverEnabled is active
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    if (!voiceoverEnabled || !isPlaying || (!inViewport && !isFullscreen)) {
      return
    }

    const utterance = new SpeechSynthesisUtterance(currentBeat.narration)
    utterance.lang = activeSpeechLang
    utterance.rate = 1.02
    window.speechSynthesis.speak(utterance)

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [
    activeSpeechLang,
    currentBeat.narration,
    inViewport,
    isFullscreen,
    isPlaying,
    safeIdx,
    voiceoverEnabled,
  ])

  // 60fps camera choreography & beat progression
  useEffect(() => {
    applyCameraMotion(0)
    if (!isPlaying || (!inViewport && !isFullscreen)) return
    if (typeof window === 'undefined') return

    const durationMs = Math.max(5000, currentBeat.durationSec * 1000)
    const startMs = performance.now()
    let rafId = 0
    let cancelled = false

    const tick = (now: number) => {
      if (cancelled) return
      const elapsed = now - startMs
      const progress = Math.min(1, elapsed / durationMs)
      applyCameraMotion(progress)
      setBeatProgress(progress)

      if (progress >= 1) {
        setBeatIdx((prev) => (prev + 1) % beats.length)
        return
      }
      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(rafId)
    }
  }, [
    applyCameraMotion,
    beats.length,
    currentBeat.durationSec,
    inViewport,
    isFullscreen,
    isPlaying,
    safeIdx,
  ])

  const handleToggleFullscreen = () => {
    const el = containerRef.current as FullscreenCapableElement | null
    if (!el || typeof document === 'undefined') return
    if (document.fullscreenElement === el) {
      void document.exitFullscreen().catch(() => undefined)
      return
    }
    if (el.requestFullscreen) {
      void el.requestFullscreen().catch(() => undefined)
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen()
    }
  }

  const handleSelectBeat = (idx: number) => {
    setBeatIdx(idx)
    setBeatProgress(0)
  }

  const handleRestart = () => {
    setBeatIdx(0)
    setBeatProgress(0)
    setIsPlaying(true)
  }

  const handleToggleVoiceover = () => {
    setVoiceoverEnabled((prev) => {
      const next = !prev
      if (next && !isPlaying) setIsPlaying(true)
      return next
    })
  }

  return (
    <div
      id={CUSTOMER_PORTAL_ANIMATIC_ID}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="mt-10 scroll-mt-24 rounded-2xl border border-emerald-400/35 bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/90 p-4 shadow-2xl sm:p-7"
    >
      {/* Header */}
      <div className="mx-auto max-w-4xl text-center">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300 sm:text-xs">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
          <span>{copy.eyebrow}</span>
        </p>
        <h3 className="mt-2 text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {copy.title}{' '}
          <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
            {copy.titleAccent}
          </span>
        </h3>
        <p className="mx-auto mt-2.5 max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
          {copy.subtitle}
        </p>

        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold">
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-emerald-200">
            {copy.automatedZeroPmPill}
          </span>
          <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-amber-200">
            {copy.pmGatePill}
          </span>
        </div>
      </div>

      {/* Main Animatic Stage */}
      <div
        ref={containerRef}
        className={cn(
          'mt-6 overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl',
          isFullscreen && 'flex h-full flex-col justify-between p-4 sm:p-8'
        )}
      >
        {/* Top Browser / Portal Chrome Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-3.5 py-2.5 sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <span className="inline-flex items-center gap-1.5 truncate rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-slate-200">
              <Lock className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden />
              <span className="truncate">{copy.mockUi.agencyDomain}</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-950/50 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-200">
              <CheckCircle2 className="h-3 w-3 shrink-0 text-cyan-300" aria-hidden />
              {copy.mockUi.whiteLabelPill}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[10px] font-bold',
                phaseBadgeStyle(currentBeat.phaseKind)
              )}
            >
              {currentBeat.phaseBadge}
            </span>
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-mono text-slate-300 tabular-nums">
              {currentBeat.timecode}
            </span>
          </div>
        </div>

        {/* Animated Camera Viewport */}
        <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_60%)] px-3.5 py-4 sm:px-6 sm:py-6">
          <div
            ref={canvasRef}
            className="transition-transform duration-150 ease-out will-change-transform"
          >
            {/* White-Label Agency Subheader inside Mockup */}
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-black text-slate-950">
                  HV
                </span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  {copy.mockUi.agencyName}
                </span>
              </div>
              <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                {currentBeat.economicsChip}
              </span>
            </div>

            <PortalScreenMockup beat={currentBeat} mockUi={copy.mockUi} />
          </div>
        </div>

        {/* Synchronized Narrated Caption & Headline Bar */}
        <div className="border-t border-slate-800/90 bg-slate-900/90 px-4 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-white sm:text-base">
              <span className="me-2 inline-block rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-extrabold text-emerald-300 tabular-nums">
                {currentBeat.stepNumber}
              </span>
              {currentBeat.headline}
            </p>
            <span className="text-[11px] font-semibold text-amber-300">
              {currentBeat.calloutBadge}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-200 sm:text-sm">
            {currentBeat.caption}
          </p>

          {/* Live Beat Progress Bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 transition-[width] duration-100"
              style={{ width: `${Math.round(beatProgress * 100)}%` }}
            />
          </div>
        </div>

        {/* Interactive Player Controls + 7-Locale Selector + 8-Step Scrubber */}
        <div className="border-t border-slate-800 bg-slate-950 px-3.5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <VideoControlTooltip
                label={isPlaying ? copy.pauseLabel : copy.playLabel}
                side="top"
              >
                <button
                  type="button"
                  title={isPlaying ? copy.pauseLabel : copy.playLabel}
                  onClick={() => setIsPlaying((p) => !p)}
                  aria-label={isPlaying ? copy.pauseLabel : copy.playLabel}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500/30 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  ) : (
                    <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  <span>{isPlaying ? copy.pauseLabel : copy.playLabel}</span>
                </button>
              </VideoControlTooltip>

              <VideoControlTooltip label={copy.restartLabel} side="top">
                <button
                  type="button"
                  title={copy.restartLabel}
                  onClick={handleRestart}
                  aria-label={copy.restartLabel}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-200 hover:border-slate-500 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                </button>
              </VideoControlTooltip>

              <VideoControlTooltip
                label={voiceoverEnabled ? copy.narrateOnLabel : copy.narrateOffLabel}
                side="top"
              >
                <button
                  type="button"
                  title={voiceoverEnabled ? copy.narrateOnLabel : copy.narrateOffLabel}
                  onClick={handleToggleVoiceover}
                  aria-pressed={voiceoverEnabled}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer',
                    voiceoverEnabled
                      ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
                      : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 hover:text-white'
                  )}
                >
                  {voiceoverEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  )}
                  <span>{voiceoverEnabled ? copy.narrateOnLabel : copy.narrateOffLabel}</span>
                </button>
              </VideoControlTooltip>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200">
                <Globe2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
                <select
                  aria-label={copy.languageLabel}
                  title={copy.languageLabel}
                  value={panLocale}
                  onChange={(e) => setPanLocale(e.target.value as FeaturePanLocaleId)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                >
                  {FEATURE_PAN_LOCALE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                      {opt.shortLabel} · {opt.nativeName}
                    </option>
                  ))}
                </select>
              </label>

              <VideoControlTooltip
                label={isFullscreen ? copy.exitFullscreenLabel : copy.fullscreenLabel}
                side="top"
              >
                <button
                  type="button"
                  title={isFullscreen ? copy.exitFullscreenLabel : copy.fullscreenLabel}
                  onClick={handleToggleFullscreen}
                  aria-label={isFullscreen ? copy.exitFullscreenLabel : copy.fullscreenLabel}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-200 hover:border-slate-500 hover:text-white cursor-pointer"
                >
                  {isFullscreen ? (
                    <Minimize className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Maximize className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
              </VideoControlTooltip>
            </div>
          </div>

          {/* 8-Beat Clickable Storyboard Stepper */}
          <div className="mt-3 grid grid-cols-2 gap-1.5 min-[480px]:grid-cols-4 lg:grid-cols-8">
            {beats.map((b, idx) => {
              const active = idx === safeIdx
              return (
                <button
                  key={b.id}
                  type="button"
                  title={`${b.shortTabLabel} — ${b.headline}`}
                  onClick={() => handleSelectBeat(idx)}
                  className={cn(
                    'rounded-lg border px-2 py-1.5 text-start text-[11px] font-semibold leading-tight transition-all cursor-pointer',
                    active
                      ? 'border-emerald-400/70 bg-emerald-500/20 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  )}
                >
                  <span className="block whitespace-normal break-words">{b.shortTabLabel}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerPortalExperienceAnimatic
