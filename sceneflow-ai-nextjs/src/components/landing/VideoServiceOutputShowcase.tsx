'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Globe2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import {
  FEATURE_PAN_LOCALE_OPTIONS,
  VIDEO_SERVICES_NARRATED_PAN,
  VIDEO_SERVICE_PAN_UI_COPY,
  normalizeFeaturePanLocale,
  type FeaturePanLocaleId,
  type VideoServiceVerticalId,
} from '@/config/landing/videoServicesNarratedPan'
import {
  getVideoServicePromoMp4Path,
  getVideoServicePromoWebmPath,
  resolveAvailablePromoVideoLocale,
} from '@/config/landing/videoServicePromoScripts'

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

let sessionPromoAudioUnmuted = false

export type VideoServiceOutputShowcaseProps = {
  verticalId: VideoServiceVerticalId
  verticalTitle: string
  locale?: string
}

export function VideoServiceOutputShowcase({
  verticalId,
  verticalTitle,
  locale,
}: VideoServiceOutputShowcaseProps) {
  const beats = VIDEO_SERVICES_NARRATED_PAN[verticalId]
  const uniqueImages = useMemo(
    () => Array.from(new Set(beats.map((b) => b.imageSrc))),
    [beats]
  )

  const [panLocale, setPanLocale] = useState<FeaturePanLocaleId>(() =>
    normalizeFeaturePanLocale(locale)
  )
  const [beatIndex, setBeatIndex] = useState(0)
  const [beatProgress, setBeatProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [promoAudioUnmuted, setPromoAudioUnmuted] = useState(
    () => sessionPromoAudioUnmuted
  )
  const [promoVideoError, setPromoVideoError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const imageRefs = useRef<Record<string, HTMLImageElement | null>>({})
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const availablePromoLocale = resolveAvailablePromoVideoLocale(verticalId, panLocale)
  const hasPromoVideo = Boolean(availablePromoLocale) && !promoVideoError
  const promoWebmSrc = availablePromoLocale
    ? getVideoServicePromoWebmPath(verticalId, availablePromoLocale)
    : null
  const promoMp4Src = availablePromoLocale
    ? getVideoServicePromoMp4Path(verticalId, availablePromoLocale)
    : null

  // Sync language when page locale changes
  useEffect(() => {
    setPanLocale(normalizeFeaturePanLocale(locale))
  }, [locale])

  // Reset to Beat 0 when switching verticals
  useEffect(() => {
    setBeatIndex(0)
    setBeatProgress(0)
    setIsPlaying(true)
  }, [verticalId])

  // Clear any transient video error when vertical or language changes
  useEffect(() => {
    setPromoVideoError(false)
  }, [verticalId, panLocale])

  // Track native Fullscreen API changes
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === stageRef.current)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const safeIdx = beatIndex < beats.length ? beatIndex : 0
  const currentBeat = beats[safeIdx]
  const uiCopy = VIDEO_SERVICE_PAN_UI_COPY[panLocale]
  const isRtl = panLocale === 'ar'

  const applyCameraTransform = useCallback(
    (progress01: number) => {
      const clamped = Math.max(0, Math.min(1, progress01))
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * clamped)
      const scale =
        currentBeat.fromScale + (currentBeat.toScale - currentBeat.fromScale) * eased
      const originX =
        currentBeat.fromOriginX +
        (currentBeat.toOriginX - currentBeat.fromOriginX) * eased
      const originY =
        currentBeat.fromOriginY +
        (currentBeat.toOriginY - currentBeat.fromOriginY) * eased

      const activeImg = imageRefs.current[currentBeat.imageSrc]
      if (activeImg) {
        activeImg.style.transformOrigin = `${originX.toFixed(2)}% ${originY.toFixed(2)}%`
        activeImg.style.transform = `scale(${scale.toFixed(4)})`
      }
    },
    [currentBeat]
  )

  // Ensure initial transform is applied immediately on beat/vertical change
  useEffect(() => {
    if (hasPromoVideo) return
    applyCameraTransform(0)
  }, [applyCameraTransform, hasPromoVideo])

  // 60fps requestAnimationFrame 5K pan choreography when in 5K Stills Showcase mode
  useEffect(() => {
    if (hasPromoVideo || !isPlaying) return
    if (typeof window === 'undefined') return

    const durationMs = Math.max(4000, currentBeat.durationSec * 1000)
    const startMs = performance.now()
    let rafId = 0
    let cancelled = false

    const tick = (now: number) => {
      if (cancelled) return
      const elapsed = now - startMs
      const rawProgress = Math.min(1, elapsed / durationMs)
      applyCameraTransform(rawProgress)
      setBeatProgress(rawProgress)

      if (rawProgress >= 1) {
        setBeatIndex((prev) => (prev + 1) % beats.length)
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
    applyCameraTransform,
    beats.length,
    currentBeat.durationSec,
    hasPromoVideo,
    isPlaying,
    safeIdx,
    verticalId,
  ])

  // Sync HTML5 `.webm` / `.mp4` promo video playback & studio audio state
  useEffect(() => {
    if (!hasPromoVideo) return
    const vid = videoRef.current
    if (!vid) return
    vid.muted = !promoAudioUnmuted
    if (isPlaying) {
      const p = vid.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // If browser blocks unmuted autoplay, gracefully mute and play
          if (promoAudioUnmuted) {
            vid.muted = true
            setPromoAudioUnmuted(false)
            void vid.play().catch(() => undefined)
          }
        })
      }
    } else {
      vid.pause()
    }
  }, [hasPromoVideo, isPlaying, promoAudioUnmuted, promoWebmSrc])

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev)
  }

  const handleTogglePromoAudio = () => {
    setPromoAudioUnmuted((prev) => {
      const next = !prev
      sessionPromoAudioUnmuted = next
      if (next && !isPlaying) {
        setIsPlaying(true)
      }
      return next
    })
  }

  const handleSelectBeat = (idx: number) => {
    setBeatIndex(idx)
    setBeatProgress(0)
    setIsPlaying(true)
    if (hasPromoVideo && videoRef.current && videoRef.current.duration > 0) {
      videoRef.current.currentTime = (idx / beats.length) * videoRef.current.duration
    }
  }

  const handleSelectLanguage = (nextLocale: FeaturePanLocaleId) => {
    setPanLocale(nextLocale)
    setIsPlaying(true)
    if (resolveAvailablePromoVideoLocale(verticalId, nextLocale)) {
      sessionPromoAudioUnmuted = true
      setPromoAudioUnmuted(true)
    }
  }

  const handleToggleFullscreen = async () => {
    const el = stageRef.current as FullscreenCapableElement | null
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

  const badgeLabel = hasPromoVideo ? uiCopy.promoVideoBadge : uiCopy.outputBadge
  const playToggleLabel = isPlaying ? uiCopy.pauseLabel : uiCopy.playLabel
  const audioToggleLabel = promoAudioUnmuted ? uiCopy.muteLabel : uiCopy.hearPitchLabel
  const fsToggleLabel = isFullscreen
    ? uiCopy.exitFullscreenLabel
    : uiCopy.enterFullscreenLabel

  return (
    <div
      ref={stageRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="video-service-pan-stage"
      className={cn(
        'mb-5 overflow-hidden rounded-2xl border border-emerald-400/30 bg-slate-950 shadow-2xl shadow-black/50',
        isFullscreen && 'flex h-full w-full flex-col justify-center bg-black p-4 sm:p-8'
      )}
    >
      {/* 16:9 Promo Video (.webm / .mp4) OR 5K Pan Cinema Output Stage */}
      <div
        className={cn(
          'relative aspect-video w-full overflow-hidden bg-slate-950',
          isFullscreen && 'mx-auto max-h-[76vh] max-w-7xl rounded-xl border border-white/15'
        )}
      >
        {hasPromoVideo && promoWebmSrc && promoMp4Src ? (
          <video
            key={`${verticalId}-${availablePromoLocale}`}
            ref={videoRef}
            poster={beats[0].imageSrc}
            autoPlay
            loop
            muted={!promoAudioUnmuted}
            playsInline
            preload="metadata"
            aria-label={`${verticalTitle} — ${uiCopy.promoVideoBadge}`}
            onTimeUpdate={(e) => {
              const vid = e.currentTarget
              if (vid.duration > 0) {
                const overall = vid.currentTime / vid.duration
                setBeatProgress(overall)
                const syncedBeat = Math.min(
                  beats.length - 1,
                  Math.floor(overall * beats.length)
                )
                if (syncedBeat !== safeIdx) {
                  setBeatIndex(syncedBeat)
                }
              }
            }}
            onError={() => setPromoVideoError(true)}
            className="h-full w-full object-cover"
          >
            <source src={promoWebmSrc} type="video/webm" />
            <source src={promoMp4Src} type="video/mp4" />
          </video>
        ) : (
          uniqueImages.map((src) => {
            const active = src === currentBeat.imageSrc
            return (
              <img
                key={src}
                ref={(node) => {
                  imageRefs.current[src] = node
                }}
                src={src}
                width={5120}
                height={2880}
                alt={`${verticalTitle} — ${currentBeat.sceneTag[panLocale]}`}
                loading="eager"
                decoding="async"
                draggable={false}
                className={cn(
                  'pointer-events-none absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-700 ease-out will-change-transform',
                  active ? 'opacity-100' : 'opacity-0'
                )}
              />
            )
          })
        )}

        {/* Subtle top & bottom cinema vignettes so badges stay legible without covering the output */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-950/80 via-slate-950/25 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/85 to-transparent"
          aria-hidden
        />

        {/* Top Bar: Deliverable Badge + Studio Audio (when .webm active) / Play / Fullscreen Controls */}
        <div className="absolute inset-x-2.5 top-2.5 z-10 flex flex-wrap items-center justify-between gap-2 sm:inset-x-3.5 sm:top-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 backdrop-blur-md">
            <span
              className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                isPlaying ? 'animate-pulse bg-emerald-400' : 'bg-amber-300'
              )}
              aria-hidden
            />
            <span>{badgeLabel}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {hasPromoVideo ? (
              <VideoControlTooltip label={audioToggleLabel} side="bottom">
                <button
                  type="button"
                  title={audioToggleLabel}
                  aria-label={audioToggleLabel}
                  aria-pressed={promoAudioUnmuted}
                  onClick={handleTogglePromoAudio}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md transition-all cursor-pointer',
                    promoAudioUnmuted
                      ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-100 shadow-sm shadow-emerald-500/20'
                      : 'border-amber-400/60 bg-slate-950/85 text-amber-200 hover:border-amber-300 hover:bg-amber-500/20 hover:text-white'
                  )}
                >
                  {promoAudioUnmuted ? (
                    <Volume2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                  )}
                  <span className="hidden min-[440px]:inline">
                    {promoAudioUnmuted ? uiCopy.voiceoverOnLabel : uiCopy.hearPitchLabel}
                  </span>
                </button>
              </VideoControlTooltip>
            ) : null}

            <VideoControlTooltip label={playToggleLabel} side="bottom">
              <button
                type="button"
                title={playToggleLabel}
                aria-label={playToggleLabel}
                aria-pressed={isPlaying}
                onClick={handleTogglePlay}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-white backdrop-blur-md transition-colors hover:border-emerald-400/60 hover:bg-slate-900 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
              </button>
            </VideoControlTooltip>

            <VideoControlTooltip label={fsToggleLabel} side="bottom">
              <button
                type="button"
                title={fsToggleLabel}
                aria-label={fsToggleLabel}
                onClick={() => void handleToggleFullscreen()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-white backdrop-blur-md transition-colors hover:border-emerald-400/60 hover:bg-slate-900 cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <Maximize className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
              </button>
            </VideoControlTooltip>
          </div>
        </div>

        {/* Bottom-of-Stage Scene Pill + Live Progress Track */}
        <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-10 flex items-center justify-between gap-2 sm:inset-x-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium text-gray-100 backdrop-blur-md">
            <span className="font-bold text-emerald-300">
              {uiCopy.scenePrefix} 0{safeIdx + 1}
            </span>
            <span className="text-slate-500">·</span>
            <span>{currentBeat.sceneTag[panLocale]}</span>
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-slate-900/90">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 transition-[width] duration-75"
            style={{ width: `${Math.round(beatProgress * 100)}%` }}
          />
        </div>
      </div>

      {/* Business Opportunity Pitch Caption + Beat & 7-Language Switcher Bar */}
      <div className="border-t border-white/10 bg-slate-950/95 p-3 sm:p-4">
        <p
          data-testid="video-service-pan-caption"
          className="text-xs leading-relaxed text-gray-100 sm:text-sm"
        >
          {currentBeat.narration[panLocale]}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/90 pt-2.5">
          {/* 3-Beat Selector Pills (regular buttons with aria-pressed) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {beats.map((beat, idx) => {
              const active = idx === safeIdx
              const beatLabel = `${uiCopy.scenePrefix} 0${idx + 1}: ${beat.sceneTag[panLocale]}`
              return (
                <button
                  key={idx}
                  type="button"
                  title={beatLabel}
                  aria-pressed={active}
                  onClick={() => handleSelectBeat(idx)}
                  className={cn(
                    'rounded-lg border px-2 py-1 text-[11px] font-semibold tabular-nums transition-all cursor-pointer',
                    active
                      ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-800 bg-slate-900/80 text-gray-400 hover:border-slate-600 hover:text-white'
                  )}
                >
                  0{idx + 1}
                </button>
              )
            })}
          </div>

          {/* 7-Language Switcher Pills */}
          <div
            className="flex flex-wrap items-center gap-1"
            aria-label={uiCopy.languagePickerTitle}
          >
            <Globe2 className="me-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300/80" aria-hidden />
            {FEATURE_PAN_LOCALE_OPTIONS.map((opt) => {
              const selected = opt.id === panLocale
              const langTooltip = `${opt.nativeName} (${opt.shortLabel}) — ${uiCopy.languagePickerTitle}`
              return (
                <button
                  key={opt.id}
                  type="button"
                  title={langTooltip}
                  aria-pressed={selected}
                  onClick={() => handleSelectLanguage(opt.id)}
                  className={cn(
                    'rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer sm:px-2',
                    selected
                      ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-100'
                      : 'border-slate-800 bg-slate-900/70 text-gray-400 hover:border-slate-600 hover:text-white'
                  )}
                >
                  {opt.shortLabel}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoServiceOutputShowcase
