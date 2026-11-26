'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Film,
  Globe2,
  Headphones,
  Image as ImageIcon,
  Loader2,
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
  enterPhoneVideoFullscreen,
  isCoarsePointer,
  isNativeVideoFullscreen,
} from '@/lib/landing/phoneVideoFullscreen'
import {
  CUSTOMER_PORTAL_ANIMATIC_COPY,
  FEATURE_PAN_LOCALE_OPTIONS,
  normalizeFeaturePanLocale,
  type CustomerPortalAnimaticBeatCopy,
  type CustomerPortalMockUiStrings,
  type FeaturePanLocaleId,
} from '@/config/landing/customerPortalAnimaticCopy'
import { CUSTOMER_PORTAL_AUDIO_MANIFEST } from '@/config/landing/customerPortalAudioManifest'
import { CUSTOMER_PORTAL_FILM_BEATS } from '@/config/landing/customerPortalFilmScript'
import {
  CUSTOMER_PORTAL_VIDEO_MANIFEST,
  resolveCustomerPortalVideoLocale,
} from '@/config/landing/customerPortalVideoManifest'

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

/** Maps each of the 16 hybrid film beats (0..15) to its corresponding 8-stage portal phase (0..7). */
export const FILM_BEAT_TO_STAGE_IDX: readonly number[] = [
  0, 0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7,
] as const

/** Maps each of the 8 portal workflow stages (0..7) to its starting 16-beat film chapter index. */
export const PORTAL_STAGE_START_FILM_BEAT_IDX: readonly number[] = [
  0, 2, 4, 6, 7, 9, 11, 13,
] as const

export function formatPortalWorkflowStepTooltip(beat: CustomerPortalAnimaticBeatCopy): string {
  const cleanShort = beat.shortTabLabel.replace(/^[0-9\u0660-\u0669]+\.\s*/, '').trim()
  return `${beat.stepNumber}: ${cleanShort} — ${beat.headline}`
}

let sessionPortalAudioUnmuted = false

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function formatTimecodeSec(sec: number): string {
  const whole = Math.max(0, Math.floor(sec))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
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
                  <span className="font-semibold">{mockUi.storyboardBeatLabels[idx]}</span>
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
              <p className="text-xs text-slate-200 leading-relaxed">{mockUi.arEmailSubject}</p>
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
              <p className="text-[11px] text-emerald-200">{mockUi.packagedDeliverablesSummary}</p>
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
  const [overallProgress, setOverallProgress] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(() => sessionPortalAudioUnmuted)
  const [inViewport, setInViewport] = useState(true)
  const [nearViewport, setNearViewport] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const pendingSeekBeatRef = useRef<number | null>(null)

  useEffect(() => {
    setPanLocale(normalizeFeaturePanLocale(locale))
  }, [locale])

  const copy = CUSTOMER_PORTAL_ANIMATIC_COPY[panLocale] ?? CUSTOMER_PORTAL_ANIMATIC_COPY.en
  const resolvedVideoLocale = resolveCustomerPortalVideoLocale(panLocale)
  const localeVideo = resolvedVideoLocale
    ? CUSTOMER_PORTAL_VIDEO_MANIFEST[resolvedVideoLocale] ?? null
    : null
  const hasStitchedVideo = Boolean(localeVideo)

  const beats = copy.beats
  const totalStepCount = hasStitchedVideo ? CUSTOMER_PORTAL_FILM_BEATS.length : beats.length
  const safeIdx = beatIdx < totalStepCount ? beatIdx : 0
  const stageIdx = hasStitchedVideo
    ? FILM_BEAT_TO_STAGE_IDX[safeIdx] ?? beats.length - 1
    : Math.min(safeIdx, beats.length - 1)
  const currentBeat = beats[Math.min(stageIdx, beats.length - 1)]!
  const currentFilmBeat =
    CUSTOMER_PORTAL_FILM_BEATS[Math.min(safeIdx, CUSTOMER_PORTAL_FILM_BEATS.length - 1)]!
  const isRtl = panLocale === 'ar'
  const localeAudio = CUSTOMER_PORTAL_AUDIO_MANIFEST[panLocale] ?? null
  const isStudioAudioActive = Boolean(!hasStitchedVideo && localeAudio && voiceoverEnabled)

  // Pause playback when scrolled off-screen & prefetch when scrolling near
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === el) {
            if (entry.isIntersecting) {
              setNearViewport(true)
            }
            setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.12)
          }
        }
      },
      { rootMargin: '400px 0px', threshold: [0, 0.12, 0.4] }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Track Fullscreen API + native mobile video fullscreen state (matching VideoServiceOutputShowcase)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const vid = videoRef.current
    const onFsChange = () => {
      const nativeVidFs = vid ? isNativeVideoFullscreen(vid) : false
      setIsFullscreen(
        document.fullscreenElement === containerRef.current ||
          document.fullscreenElement === vid ||
          nativeVidFs
      )
    }
    document.addEventListener('fullscreenchange', onFsChange)
    vid?.addEventListener('webkitbeginfullscreen', onFsChange)
    vid?.addEventListener('webkitendfullscreen', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      vid?.removeEventListener('webkitbeginfullscreen', onFsChange)
      vid?.removeEventListener('webkitendfullscreen', onFsChange)
    }
  }, [hasStitchedVideo, resolvedVideoLocale])

  const applyCameraMotion = useCallback(
    (progress01: number, beatOverride?: CustomerPortalAnimaticBeatCopy) => {
      const el = canvasRef.current
      if (!el) return
      const targetBeat = beatOverride ?? currentBeat
      const clamped = Math.max(0, Math.min(1, progress01))
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * clamped)
      const scale =
        targetBeat.fromScale + (targetBeat.toScale - targetBeat.fromScale) * eased
      el.style.transformOrigin = `${targetBeat.originX}% ${targetBeat.originY}%`
      el.style.transform = `scale(${scale.toFixed(4)})`
    },
    [currentBeat]
  )

  // Synchronize studio MP3 narration fallback when no stitched video is present
  useEffect(() => {
    if (hasStitchedVideo) return
    const audioEl = audioRef.current
    if (!audioEl || !localeAudio) return

    if (!voiceoverEnabled || !isPlaying || (!inViewport && !isFullscreen)) {
      audioEl.pause()
      return
    }

    const currentWindow = localeAudio.beats[safeIdx]
    if (
      currentWindow &&
      (audioEl.currentTime < currentWindow.startSec - 0.25 ||
        audioEl.currentTime > currentWindow.endSec + 0.35)
    ) {
      audioEl.currentTime = currentWindow.startSec
    }

    void audioEl.play().catch(() => {
      setVoiceoverEnabled(false)
    })

    let rafId = 0
    let cancelled = false

    const syncFromAudio = () => {
      if (cancelled) return
      const t = audioEl.currentTime
      let matchedIdx = localeAudio.beats.findIndex(
        (w, i) => t >= w.startSec && (t < w.endSec || i === localeAudio.beats.length - 1)
      )
      if (matchedIdx < 0) matchedIdx = 0
      const win = localeAudio.beats[matchedIdx]!
      const span = Math.max(0.25, win.endSec - win.startSec)
      const prog = Math.max(0, Math.min(1, (t - win.startSec) / span))
      const totalDur = Math.max(1, localeAudio.beats[localeAudio.beats.length - 1]?.endSec ?? 90)

      setBeatIdx((prev) => (prev === matchedIdx ? prev : matchedIdx))
      setOverallProgress(Math.max(0, Math.min(1, t / totalDur)))
      setElapsedSec(t)
      const matchedBeat = beats[matchedIdx] ?? currentBeat
      applyCameraMotion(prog, matchedBeat)

      rafId = window.requestAnimationFrame(syncFromAudio)
    }

    rafId = window.requestAnimationFrame(syncFromAudio)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(rafId)
      audioEl.pause()
    }
  }, [
    applyCameraMotion,
    beats,
    currentBeat,
    hasStitchedVideo,
    inViewport,
    isFullscreen,
    isPlaying,
    localeAudio,
    safeIdx,
    voiceoverEnabled,
  ])

  // Synchronize HTML5 `<video>` playback & audio state (matching VideoServiceOutputShowcase)
  useEffect(() => {
    if (!hasStitchedVideo || !localeVideo) return
    const vid = videoRef.current
    if (!vid) return

    vid.muted = !voiceoverEnabled
    const shouldPlay = isPlaying && (inViewport || isFullscreen)
    if (shouldPlay) {
      const p = vid.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          if (voiceoverEnabled) {
            vid.muted = true
            setVoiceoverEnabled(false)
            void vid.play().catch(() => undefined)
          }
        })
      }
    } else {
      vid.pause()
    }
  }, [hasStitchedVideo, inViewport, isFullscreen, isPlaying, localeVideo, voiceoverEnabled])

  // Fallback silent mockup choreography when stitched video & studio audio are unavailable
  useEffect(() => {
    if (hasStitchedVideo || isStudioAudioActive) return
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
      setOverallProgress((safeIdx + progress) / beats.length)

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
    hasStitchedVideo,
    inViewport,
    isFullscreen,
    isPlaying,
    isStudioAudioActive,
    safeIdx,
  ])

  const handleTogglePlay = () => {
    const vid = videoRef.current
    if (vid && vid.paused) {
      setIsPlaying(true)
      if (vid.readyState === 0) {
        setIsBuffering(true)
        vid.load()
      }
      void vid.play().catch(() => undefined)
      return
    }
    if (vid && !vid.paused) {
      setIsPlaying(false)
      vid.pause()
      return
    }
    setIsPlaying((prev) => !prev)
  }

  const handleToggleVoiceover = () => {
    if (!hasStitchedVideo && !localeAudio) return
    setVoiceoverEnabled((prev) => {
      const next = !prev
      sessionPortalAudioUnmuted = next
      if (next && !isPlaying) setIsPlaying(true)
      if (videoRef.current) {
        videoRef.current.muted = !next
        if (next) {
          if (videoRef.current.readyState === 0) {
            setIsBuffering(true)
            videoRef.current.load()
          }
          void videoRef.current.play().catch(() => undefined)
        }
      }
      return next
    })
  }

  const handleVideoSurfaceClick = () => {
    if (!hasStitchedVideo) return
    const vid = videoRef.current
    if (!voiceoverEnabled) {
      sessionPortalAudioUnmuted = true
      setVoiceoverEnabled(true)
      setIsPlaying(true)
      if (vid) {
        if (vid.readyState === 0) {
          setIsBuffering(true)
          vid.load()
        }
        vid.muted = false
        void vid.play().catch(() => undefined)
      }
      return
    }
    if (vid && vid.paused) {
      setIsPlaying(true)
      void vid.play().catch(() => undefined)
      return
    }
    if (vid && !vid.paused) {
      setIsPlaying(false)
      vid.pause()
      return
    }
    setIsPlaying((prev) => !prev)
  }

  const handleRestart = () => {
    setBeatIdx(0)
    setOverallProgress(0)
    setElapsedSec(0)
    setIsPlaying(true)
    if (hasStitchedVideo) {
      sessionPortalAudioUnmuted = true
      setVoiceoverEnabled(true)
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.muted = false
        void videoRef.current.play().catch(() => undefined)
      }
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
  }

  const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasStitchedVideo || !videoRef.current || !localeVideo) return
    const duration = videoRef.current.duration > 0 ? videoRef.current.duration : localeVideo.durationSec
    if (!(duration > 0)) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    const rawRatio = isRtl
      ? (rect.right - e.clientX) / rect.width
      : (e.clientX - rect.left) / rect.width
    const clamped = Math.max(0, Math.min(1, rawRatio))
    const targetSec = clamped * duration
    videoRef.current.currentTime = targetSec
    setOverallProgress(clamped)
    setElapsedSec(targetSec)
    const matched = localeVideo.chapters.findIndex(
      (ch, i) => targetSec >= ch.startSec && (targetSec < ch.endSec || i === localeVideo.chapters.length - 1)
    )
    if (matched >= 0) setBeatIdx(matched)
    if (!isPlaying) setIsPlaying(true)
  }

  const handleSelectStage = (targetStageIdx: number) => {
    const clampedStage = Math.max(0, Math.min(beats.length - 1, targetStageIdx))
    setIsPlaying(true)

    if (hasStitchedVideo && localeVideo) {
      const targetFilmBeatIdx =
        PORTAL_STAGE_START_FILM_BEAT_IDX[clampedStage] ??
        Math.max(0, FILM_BEAT_TO_STAGE_IDX.indexOf(clampedStage))
      const chapter = localeVideo.chapters[targetFilmBeatIdx]
      setBeatIdx(targetFilmBeatIdx)
      if (chapter) {
        const vid = videoRef.current
        const duration = vid && vid.duration > 0 ? vid.duration : localeVideo.durationSec
        setElapsedSec(chapter.startSec)
        if (duration > 0) {
          setOverallProgress(Math.max(0, Math.min(1, chapter.startSec / duration)))
        }
        if (vid) {
          if (vid.readyState >= 1) {
            vid.currentTime = chapter.startSec + 0.02
            if (vid.paused) {
              void vid.play().catch(() => undefined)
            }
          } else {
            pendingSeekBeatRef.current = targetFilmBeatIdx
            setIsBuffering(true)
            vid.load()
            void vid.play().catch(() => undefined)
          }
        }
      }
      return
    }

    setBeatIdx(clampedStage)
    setOverallProgress(clampedStage / Math.max(1, beats.length))
    if (audioRef.current && localeAudio?.beats[clampedStage]) {
      const targetSec = localeAudio.beats[clampedStage]!.startSec
      audioRef.current.currentTime = targetSec + 0.02
      setElapsedSec(targetSec)
    }
  }

  const handleSelectLanguage = (nextLocale: FeaturePanLocaleId) => {
    if (hasStitchedVideo && safeIdx > 0) {
      pendingSeekBeatRef.current = safeIdx
    }
    if (nextLocale !== panLocale && hasStitchedVideo) {
      setIsBuffering(true)
    }
    setPanLocale(nextLocale)
    setIsPlaying(true)
    if (hasStitchedVideo) {
      sessionPortalAudioUnmuted = true
      setVoiceoverEnabled(true)
    }
  }

  const handleToggleFullscreen = async () => {
    if (hasStitchedVideo && videoRef.current && isCoarsePointer()) {
      sessionPortalAudioUnmuted = true
      setVoiceoverEnabled(true)
      setIsPlaying(true)
      videoRef.current.muted = false
      void videoRef.current.play().catch(() => undefined)
      if (enterPhoneVideoFullscreen(videoRef.current)) {
        return
      }
    }

    const el = containerRef.current as FullscreenCapableElement | null
    if (!el || typeof document === 'undefined') return
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen()
      } else if (typeof el.requestFullscreen === 'function') {
        await el.requestFullscreen()
      } else if (typeof el.webkitRequestFullscreen === 'function') {
        await el.webkitRequestFullscreen()
      }
    } catch {
      // Ignore fullscreen permission errors
    }
  }

  const playToggleLabel = isPlaying ? copy.pauseLabel : copy.playLabel
  const audioToggleLabel = voiceoverEnabled ? copy.narrateOnLabel : copy.narrateOffLabel
  const fsToggleLabel = isFullscreen ? copy.exitFullscreenLabel : copy.fullscreenLabel

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

        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] font-semibold">
          <span className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-emerald-200">
            {copy.automatedZeroPmPill}
          </span>
          <span className="rounded-lg border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 text-amber-200">
            {copy.pmGatePill}
          </span>
        </div>
      </div>

      {/* Main Video Stage — Controls consistent with the 4 Pitch Video Players (VideoServiceOutputShowcase) */}
      <div
        ref={containerRef}
        className={cn(
          'mt-6 overflow-hidden rounded-2xl border border-emerald-400/30 bg-slate-950 shadow-2xl shadow-black/50',
          isFullscreen && 'flex h-full w-full flex-col justify-center bg-black p-4 sm:p-8'
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
              {hasStitchedVideo && localeVideo
                ? `${formatTimecodeSec(elapsedSec)} / ${formatTimecodeSec(localeVideo.durationSec)}`
                : currentBeat.timecode}
            </span>
          </div>
        </div>

        {/* 16:9 Video Viewport + Bottom-Left Icon-Only Transport Overlay + Scrubbable Progress Track */}
        <div
          className={cn(
            'relative w-full overflow-hidden bg-slate-950',
            hasStitchedVideo && 'aspect-video',
            isFullscreen &&
              hasStitchedVideo &&
              'mx-auto max-h-[76vh] max-w-7xl rounded-xl border border-white/15'
          )}
        >
          {hasStitchedVideo && localeVideo ? (
            <video
              key={`${resolvedVideoLocale}-${localeVideo.webmSrc}`}
              ref={videoRef}
              poster={localeVideo.posterSrc}
              autoPlay={isPlaying && (inViewport || isFullscreen)}
              muted={!voiceoverEnabled}
              playsInline
              loop
              preload={nearViewport ? 'auto' : 'metadata'}
              aria-label={`${copy.title} ${copy.titleAccent}`}
              onClick={handleVideoSurfaceClick}
              onContextMenu={(e) => e.preventDefault()}
              onLoadStart={() => setIsBuffering(true)}
              onWaiting={() => setIsBuffering(true)}
              onSeeking={() => setIsBuffering(true)}
              onLoadedData={() => setIsBuffering(false)}
              onCanPlay={() => setIsBuffering(false)}
              onSeeked={() => setIsBuffering(false)}
              onPlaying={() => {
                setIsBuffering(false)
                setIsPlaying(true)
              }}
              onPause={(e) => {
                const vid = e.currentTarget
                if (!vid.seeking && !vid.ended && (inViewport || isFullscreen) && vid.readyState > 0) {
                  setIsPlaying(false)
                }
              }}
              onLoadedMetadata={(e) => {
                const vid = e.currentTarget
                const targetBeat = pendingSeekBeatRef.current
                if (targetBeat !== null && localeVideo.chapters[targetBeat]) {
                  pendingSeekBeatRef.current = null
                  vid.currentTime = localeVideo.chapters[targetBeat]!.startSec + 0.02
                }
                if (isPlaying && (inViewport || isFullscreen) && vid.paused) {
                  void vid.play().catch(() => undefined)
                }
              }}
              onTimeUpdate={(e) => {
                const vid = e.currentTarget
                if (vid.readyState >= 2 && isBuffering) {
                  setIsBuffering(false)
                }
                const t = vid.currentTime
                const dur = vid.duration > 0 ? vid.duration : localeVideo.durationSec
                setElapsedSec(t)
                if (dur > 0) {
                  setOverallProgress(Math.max(0, Math.min(1, t / dur)))
                }
                const matched = localeVideo.chapters.findIndex(
                  (ch, i) => t >= ch.startSec && (t < ch.endSec || i === localeVideo.chapters.length - 1)
                )
                if (matched >= 0 && matched !== safeIdx) {
                  setBeatIdx(matched)
                }
              }}
              onError={() => setIsBuffering(false)}
              className={cn(
                'h-full w-full cursor-pointer bg-black',
                isFullscreen ? 'object-contain' : 'object-cover'
              )}
            >
              <source src={localeVideo.webmSrc} type="video/webm" />
              <source src={localeVideo.mp4Src} type="video/mp4" />
            </video>
          ) : (
            <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_60%)] px-3.5 py-4 pb-12 sm:px-6 sm:py-6 sm:pb-12">
              <div
                ref={canvasRef}
                className="transition-transform duration-150 ease-out will-change-transform"
              >
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
          )}

          {hasStitchedVideo && isBuffering ? (
            <div
              className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-slate-950/35"
              aria-hidden
            >
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400/90" />
            </div>
          ) : null}

          {/* Bottom-Left Icon-Only Transport Overlay (identical to VideoServiceOutputShowcase) */}
          <div
            dir="ltr"
            className="pointer-events-auto absolute bottom-2 left-2 z-10 flex items-center gap-1.5 sm:bottom-2.5 sm:left-3"
          >
            <VideoControlTooltip label={playToggleLabel} side="top">
              <button
                type="button"
                title={playToggleLabel}
                aria-label={playToggleLabel}
                aria-pressed={isPlaying}
                onClick={handleTogglePlay}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-white backdrop-blur-md transition-colors hover:border-emerald-400/60 hover:bg-slate-900 sm:h-7 sm:w-7 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
              </button>
            </VideoControlTooltip>

            {hasStitchedVideo || localeAudio ? (
              <VideoControlTooltip label={audioToggleLabel} side="top">
                <button
                  type="button"
                  title={audioToggleLabel}
                  aria-label={audioToggleLabel}
                  aria-pressed={voiceoverEnabled}
                  onClick={handleToggleVoiceover}
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-all sm:h-7 sm:w-7 cursor-pointer',
                    voiceoverEnabled
                      ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-200 shadow-sm shadow-emerald-500/20 hover:bg-emerald-500/35'
                      : 'border-amber-400/70 bg-slate-950/75 text-amber-300 shadow-sm shadow-amber-500/15 hover:border-amber-300 hover:bg-slate-900 hover:text-amber-200'
                  )}
                >
                  {voiceoverEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                </button>
              </VideoControlTooltip>
            ) : null}

            <VideoControlTooltip label={copy.restartLabel} side="top">
              <button
                type="button"
                title={copy.restartLabel}
                aria-label={copy.restartLabel}
                onClick={handleRestart}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-white backdrop-blur-md transition-colors hover:border-emerald-400/60 hover:bg-slate-900 sm:h-7 sm:w-7 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </button>
            </VideoControlTooltip>

            <VideoControlTooltip label={fsToggleLabel} side="top">
              <button
                type="button"
                title={fsToggleLabel}
                aria-label={fsToggleLabel}
                onClick={() => void handleToggleFullscreen()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-white backdrop-blur-md transition-colors hover:border-emerald-400/60 hover:bg-slate-900 sm:h-7 sm:w-7 cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <Maximize className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
              </button>
            </VideoControlTooltip>

            {!hasStitchedVideo && localeAudio ? (
              <audio
                ref={audioRef}
                src={localeAudio.audioSrc}
                preload="metadata"
                loop
                className="hidden"
              />
            ) : null}
          </div>

          {/* Scrubbable Live Progress Track (identical to VideoServiceOutputShowcase) */}
          <div
            onClick={hasStitchedVideo ? handleSeekBarClick : undefined}
            className={cn(
              'absolute inset-x-0 bottom-0 z-10 bg-slate-900/90',
              hasStitchedVideo ? 'h-1 cursor-pointer hover:h-1.5 transition-all' : 'h-1'
            )}
          >
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 transition-[width] duration-75"
              style={{ width: `${Math.round(overallProgress * 100)}%` }}
            />
          </div>
        </div>

        {/* Synchronized Caption + Workflow Step Bookmarks & Compact 7-Language Pill Bar (matching VideoServiceOutputShowcase) */}
        <div className="border-t border-white/10 bg-slate-950/95 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-white sm:text-sm">
              <span className="me-1.5 inline-block rounded bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-extrabold text-emerald-300 tabular-nums">
                {currentBeat.stepNumber}
              </span>
              {hasStitchedVideo ? currentFilmBeat.title[panLocale] : currentBeat.headline}
            </p>
            <span className="text-[11px] font-semibold text-amber-300">
              {hasStitchedVideo ? currentBeat.economicsChip : currentBeat.calloutBadge}
            </span>
          </div>

          <p className="mt-1.5 text-xs leading-relaxed text-gray-100 sm:text-sm">
            {hasStitchedVideo ? currentFilmBeat.narrationVo[panLocale] : currentBeat.caption}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/90 pt-2.5">
            {/* 8-Stage Workflow Step Bookmark Pills with Tooltips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {beats.map((stageBeat, idx) => {
                const active = idx === stageIdx
                const stepTooltip = formatPortalWorkflowStepTooltip(stageBeat)
                return (
                  <VideoControlTooltip key={stageBeat.id} label={stepTooltip} side="top">
                    <button
                      type="button"
                      title={stepTooltip}
                      aria-label={stepTooltip}
                      aria-pressed={active}
                      onClick={() => handleSelectStage(idx)}
                      className={cn(
                        'inline-flex min-h-[32px] min-w-[34px] items-center justify-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-all cursor-pointer',
                        active
                          ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200'
                          : 'border-slate-800 bg-slate-900/80 text-gray-400 hover:border-slate-600 hover:text-white'
                      )}
                    >
                      {stageBeat.stepNumber}
                    </button>
                  </VideoControlTooltip>
                )
              })}
            </div>

            {/* 7-Language Switcher Pills (identical to VideoServiceOutputShowcase) */}
            <div className="flex flex-wrap items-center gap-1" aria-label={copy.languageLabel}>
              <Globe2 className="me-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300/80" aria-hidden />
              {FEATURE_PAN_LOCALE_OPTIONS.map((opt) => {
                const selected = opt.id === panLocale
                const hasNativeVideo = Boolean(CUSTOMER_PORTAL_VIDEO_MANIFEST[opt.id])
                const langTooltip = `${opt.nativeName} (${opt.shortLabel}) — ${copy.languageLabel}`
                return (
                  <VideoControlTooltip key={opt.id} label={langTooltip} side="top">
                    <button
                      type="button"
                      title={langTooltip}
                      aria-pressed={selected}
                      aria-busy={selected && isBuffering}
                      onClick={() => handleSelectLanguage(opt.id)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer sm:px-2',
                        selected
                          ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-100'
                          : hasNativeVideo
                            ? 'border-emerald-500/35 bg-slate-900/80 text-emerald-200 hover:border-emerald-400/60 hover:text-white'
                            : 'border-slate-800 bg-slate-900/70 text-gray-400 hover:border-slate-600 hover:text-white'
                      )}
                    >
                      {selected && isBuffering ? (
                        <Loader2
                          className="h-2.5 w-2.5 shrink-0 animate-spin text-emerald-300"
                          aria-hidden
                        />
                      ) : null}
                      <span>{opt.shortLabel}</span>
                    </button>
                  </VideoControlTooltip>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerPortalExperienceAnimatic
