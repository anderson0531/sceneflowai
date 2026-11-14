'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Globe2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
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
  FEATURE_PAN_LOCALE_OPTIONS,
  VIDEO_SERVICES_NARRATED_PAN,
  VIDEO_SERVICE_PAN_UI_COPY,
  normalizeFeaturePanLocale,
  type FeaturePanLocaleId,
  type VideoServiceVerticalId,
} from '@/config/landing/videoServicesNarratedPan'
import {
  getVideoServicePromoMp4Path,
  getVideoServicePromoPosterPath,
  getVideoServicePromoWebmPath,
  hasNativePromoVideoForLocale,
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
  const [inViewport, setInViewport] = useState(true)
  const [nearViewport, setNearViewport] = useState(true)
  const [promoAudioUnmuted, setPromoAudioUnmuted] = useState(
    () => sessionPromoAudioUnmuted
  )
  const [promoVideoError, setPromoVideoError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const imageRefs = useRef<Record<string, HTMLImageElement | null>>({})
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const pendingSeekRatioRef = useRef<number | null>(null)

  const availablePromoLocale = resolveAvailablePromoVideoLocale(verticalId, panLocale)
  const hasNativeLocaleVideo = hasNativePromoVideoForLocale(verticalId, panLocale)
  const hasPromoVideo = Boolean(availablePromoLocale) && !promoVideoError
  const promoWebmSrc = availablePromoLocale
    ? getVideoServicePromoWebmPath(verticalId, availablePromoLocale)
    : null
  const promoMp4Src = availablePromoLocale
    ? getVideoServicePromoMp4Path(verticalId, availablePromoLocale)
    : null
  const promoPosterSrc = getVideoServicePromoPosterPath(verticalId)

  // Sync language when page locale changes
  useEffect(() => {
    setPanLocale(normalizeFeaturePanLocale(locale))
  }, [locale])

  // Reset to Beat 0 when switching verticals
  useEffect(() => {
    pendingSeekRatioRef.current = null
    setBeatIndex(0)
    setBeatProgress(0)
    setIsPlaying(true)
  }, [verticalId])

  // Clear any transient video error when vertical or language changes
  useEffect(() => {
    setPromoVideoError(false)
  }, [verticalId, panLocale])

  // Viewport observer so off-screen promo videos wait at 0:00 until scrolled near/into view
  useEffect(() => {
    const el = stageRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== stageRef.current) continue
          if (entry.isIntersecting) {
            setNearViewport(true)
          }
          setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.12)
        }
      },
      { rootMargin: '400px 0px', threshold: [0, 0.12, 0.4] }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [verticalId])

  // Track native Fullscreen API + iOS video fullscreen changes
  useEffect(() => {
    if (typeof document === 'undefined') return
    const vid = videoRef.current
    const onFsChange = () => {
      const nativeVidFs = vid ? isNativeVideoFullscreen(vid) : false
      setIsFullscreen(
        document.fullscreenElement === stageRef.current ||
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
  }, [hasPromoVideo, availablePromoLocale, verticalId])

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
    if (hasPromoVideo || !isPlaying || (!inViewport && !isFullscreen)) return
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
    inViewport,
    isFullscreen,
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
    const shouldPlay = isPlaying && (inViewport || isFullscreen)
    if (shouldPlay) {
      const p = vid.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // If browser blocks unmuted autoplay prior to user gesture, gracefully mute and play
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
  }, [hasPromoVideo, inViewport, isFullscreen, isPlaying, promoAudioUnmuted, promoWebmSrc])

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
      if (videoRef.current) {
        videoRef.current.muted = !next
        if (next) {
          void videoRef.current.play().catch(() => undefined)
        }
      }
      return next
    })
  }

  const handleVideoSurfaceClick = () => {
    if (!hasPromoVideo) return
    if (!promoAudioUnmuted) {
      sessionPromoAudioUnmuted = true
      setPromoAudioUnmuted(true)
      setIsPlaying(true)
      if (videoRef.current) {
        videoRef.current.muted = false
        void videoRef.current.play().catch(() => undefined)
      }
      return
    }
    setIsPlaying((prev) => !prev)
  }

  const handleRestartFromBeginning = () => {
    setBeatIndex(0)
    setBeatProgress(0)
    setIsPlaying(true)
    if (hasPromoVideo) {
      sessionPromoAudioUnmuted = true
      setPromoAudioUnmuted(true)
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.muted = false
        void videoRef.current.play().catch(() => undefined)
      }
    }
  }

  const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasPromoVideo || !videoRef.current || !(videoRef.current.duration > 0)) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    const rawRatio = isRtl
      ? (rect.right - e.clientX) / rect.width
      : (e.clientX - rect.left) / rect.width
    const clamped = Math.max(0, Math.min(1, rawRatio))
    videoRef.current.currentTime = clamped * videoRef.current.duration
    setBeatProgress(clamped)
    const syncedBeat = Math.min(beats.length - 1, Math.floor(clamped * beats.length))
    setBeatIndex(syncedBeat)
    if (!isPlaying) {
      setIsPlaying(true)
    }
  }

  const handleSelectBeat = (idx: number) => {
    setBeatIndex(idx)
    setBeatProgress(idx / beats.length)
    setIsPlaying(true)
    if (hasPromoVideo && videoRef.current && videoRef.current.duration > 0) {
      const targetTime = (idx / beats.length) * videoRef.current.duration
      videoRef.current.currentTime = targetTime
    }
  }

  const handleSelectLanguage = (nextLocale: FeaturePanLocaleId) => {
    if (
      hasPromoVideo &&
      videoRef.current &&
      videoRef.current.duration > 0 &&
      videoRef.current.currentTime > 0
    ) {
      pendingSeekRatioRef.current =
        videoRef.current.currentTime / videoRef.current.duration
    }
    setPanLocale(nextLocale)
    setIsPlaying(true)
    if (resolveAvailablePromoVideoLocale(verticalId, nextLocale)) {
      sessionPromoAudioUnmuted = true
      setPromoAudioUnmuted(true)
    }
  }

  const handleToggleFullscreen = async () => {
    if (hasPromoVideo && videoRef.current && isCoarsePointer()) {
      sessionPromoAudioUnmuted = true
      setPromoAudioUnmuted(true)
      setIsPlaying(true)
      videoRef.current.muted = false
      void videoRef.current.play().catch(() => undefined)
      if (enterPhoneVideoFullscreen(videoRef.current)) {
        return
      }
    }

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

  const playToggleLabel = isPlaying ? uiCopy.pauseLabel : uiCopy.playLabel
  const audioToggleTooltip = promoAudioUnmuted ? uiCopy.muteLabel : uiCopy.hearPitchLabel
  const fsToggleLabel = isFullscreen
    ? uiCopy.exitFullscreenLabel
    : uiCopy.enterFullscreenLabel
  const segmentPrefix = hasPromoVideo ? uiCopy.actPrefix : uiCopy.scenePrefix

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
            poster={promoPosterSrc}
            loop
            muted={!promoAudioUnmuted}
            playsInline
            preload={nearViewport ? 'metadata' : 'none'}
            aria-label={`${verticalTitle} — ${uiCopy.promoVideoBadge}`}
            onClick={handleVideoSurfaceClick}
            onContextMenu={(e) => e.preventDefault()}
            onLoadedMetadata={(e) => {
              const vid = e.currentTarget
              if (vid.duration > 0 && pendingSeekRatioRef.current !== null) {
                const ratio = pendingSeekRatioRef.current
                pendingSeekRatioRef.current = null
                if (ratio > 0 && ratio < 0.98) {
                  vid.currentTime = ratio * vid.duration
                }
              }
            }}
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
            className={cn(
              'h-full w-full cursor-pointer bg-black',
              isFullscreen ? 'object-contain' : 'object-cover'
            )}
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

        {/* Subtle cinema vignettes only on 5K Stills so Promo Video stays completely unobstructed */}
        {!hasPromoVideo ? (
          <>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-950/75 via-slate-950/20 to-transparent sm:h-20"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/80 to-transparent sm:h-14"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-center sm:inset-x-3 sm:top-2.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[11px]">
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    isPlaying ? 'animate-pulse bg-emerald-400' : 'bg-amber-300'
                  )}
                  aria-hidden
                />
                <span>{uiCopy.outputBadge}</span>
              </div>
            </div>
          </>
        ) : null}

        {/* Bottom-of-Player Controls: Compact icon-only transport on bottom-left (keeps top of frame & bottom-right SceneFlow Studio watermark 100% clear) */}
        {hasPromoVideo ? (
          <div
            dir="ltr"
            className="pointer-events-auto absolute bottom-2 left-2 z-10 flex items-center gap-1 sm:bottom-2.5 sm:left-3 sm:gap-1.5"
          >
            <VideoControlTooltip label={playToggleLabel} side="top">
              <button
                type="button"
                title={playToggleLabel}
                aria-label={playToggleLabel}
                aria-pressed={isPlaying}
                onClick={handleTogglePlay}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-slate-950/70 text-white backdrop-blur-md transition-colors hover:border-emerald-400/60 hover:bg-slate-900 sm:h-7 sm:w-7 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                ) : (
                  <Play className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                )}
              </button>
            </VideoControlTooltip>

            <VideoControlTooltip label={audioToggleTooltip} side="top">
              <button
                type="button"
                title={audioToggleTooltip}
                aria-label={audioToggleTooltip}
                aria-pressed={promoAudioUnmuted}
                onClick={handleTogglePromoAudio}
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full border backdrop-blur-md transition-all sm:h-7 sm:w-7 cursor-pointer',
                  promoAudioUnmuted
                    ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-200 shadow-sm shadow-emerald-500/20 hover:bg-emerald-500/35'
                    : 'border-amber-400/70 bg-slate-950/75 text-amber-300 shadow-sm shadow-amber-500/15 hover:border-amber-300 hover:bg-slate-900 hover:text-amber-200'
                )}
              >
                {promoAudioUnmuted ? (
                  <Volume2 className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                ) : (
                  <VolumeX className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                )}
              </button>
            </VideoControlTooltip>

            <VideoControlTooltip label={uiCopy.restartLabel} side="top">
              <button
                type="button"
                title={uiCopy.restartLabel}
                aria-label={uiCopy.restartLabel}
                onClick={handleRestartFromBeginning}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-slate-950/70 text-white backdrop-blur-md transition-colors hover:border-emerald-400/60 hover:bg-slate-900 sm:h-7 sm:w-7 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
              </button>
            </VideoControlTooltip>

            <VideoControlTooltip label={fsToggleLabel} side="top">
              <button
                type="button"
                title={fsToggleLabel}
                aria-label={fsToggleLabel}
                onClick={() => void handleToggleFullscreen()}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-slate-950/70 text-white backdrop-blur-md transition-colors hover:border-emerald-400/60 hover:bg-slate-900 sm:h-7 sm:w-7 cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                ) : (
                  <Maximize className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                )}
              </button>
            </VideoControlTooltip>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-10 flex items-center justify-between gap-2 sm:inset-x-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-slate-950/80 px-2 py-0.5 text-[10px] font-medium text-gray-100 backdrop-blur-md sm:text-[11px]">
              <span className="font-bold text-emerald-300">
                {uiCopy.scenePrefix} 0{safeIdx + 1}
              </span>
              <span className="text-slate-500">·</span>
              <span>{currentBeat.sceneTag[panLocale]}</span>
            </span>

            <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5">
              <VideoControlTooltip label={playToggleLabel} side="top">
                <button
                  type="button"
                  title={playToggleLabel}
                  aria-label={playToggleLabel}
                  aria-pressed={isPlaying}
                  onClick={handleTogglePlay}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-white backdrop-blur-md transition-colors hover:border-emerald-400/60 hover:bg-slate-900 sm:h-7 sm:w-7 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                  ) : (
                    <Play className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                  )}
                </button>
              </VideoControlTooltip>

              <VideoControlTooltip label={fsToggleLabel} side="top">
                <button
                  type="button"
                  title={fsToggleLabel}
                  aria-label={fsToggleLabel}
                  onClick={() => void handleToggleFullscreen()}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-white backdrop-blur-md transition-colors hover:border-emerald-400/60 hover:bg-slate-900 sm:h-7 sm:w-7 cursor-pointer"
                >
                  {isFullscreen ? (
                    <Minimize className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                  ) : (
                    <Maximize className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                  )}
                </button>
              </VideoControlTooltip>
            </div>
          </div>
        )}

        {/* Live Progress Track (Scrubbable when Promo Video is active) */}
        <div
          onClick={hasPromoVideo ? handleSeekBarClick : undefined}
          className={cn(
            'absolute inset-x-0 bottom-0 z-10 bg-slate-900/90',
            hasPromoVideo ? 'h-1 cursor-pointer hover:h-1.5 transition-all' : 'h-1'
          )}
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 transition-[width] duration-75"
            style={{ width: `${Math.round(beatProgress * 100)}%` }}
          />
        </div>
      </div>

      {/* Business Opportunity Pitch Caption + Act/Beat & 7-Language Switcher Bar */}
      <div className="border-t border-white/10 bg-slate-950/95 p-3 sm:p-4">
        <p
          data-testid="video-service-pan-caption"
          className="text-xs leading-relaxed text-gray-100 sm:text-sm"
        >
          {currentBeat.narration[panLocale]}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/90 pt-2.5">
          {/* 3-Act / 3-Beat Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {beats.map((beat, idx) => {
              const active = idx === safeIdx
              const beatLabel = `${segmentPrefix} 0${idx + 1}: ${beat.sceneTag[panLocale]}`
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
            {hasPromoVideo && !hasNativeLocaleVideo ? (
              <span className="inline-flex items-center rounded-md border border-amber-400/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">
                {uiCopy.englishAudioPreviewNote}
              </span>
            ) : null}
          </div>

          {/* 7-Language Switcher Pills */}
          <div
            className="flex flex-wrap items-center gap-1"
            aria-label={uiCopy.languagePickerTitle}
          >
            <Globe2 className="me-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300/80" aria-hidden />
            {FEATURE_PAN_LOCALE_OPTIONS.map((opt) => {
              const selected = opt.id === panLocale
              const hasNativeDub = hasNativePromoVideoForLocale(verticalId, opt.id)
              const langTooltip = `${opt.nativeName} (${opt.shortLabel}) — ${uiCopy.languagePickerTitle}`
              return (
                <button
                  key={opt.id}
                  type="button"
                  title={langTooltip}
                  aria-pressed={selected}
                  onClick={() => handleSelectLanguage(opt.id)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer sm:px-2',
                    selected
                      ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-100'
                      : hasPromoVideo && hasNativeDub
                        ? 'border-emerald-500/35 bg-slate-900/80 text-emerald-200 hover:border-emerald-400/60 hover:text-white'
                        : 'border-slate-800 bg-slate-900/70 text-gray-400 hover:border-slate-600 hover:text-white'
                  )}
                >
                  <span>{opt.shortLabel}</span>
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
