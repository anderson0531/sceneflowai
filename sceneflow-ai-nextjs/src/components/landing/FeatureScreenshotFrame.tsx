'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Globe2,
  Loader2,
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
  getKeyFeatureNarratedPan,
  normalizeFeaturePanLocale,
  type FeaturePanLocaleId,
} from '@/config/landing/keyFeatureNarratedPan'
import {
  FEATURE_ANIMATIC_UI_COPY,
  getKeyFeatureAnimaticMp4Path,
  getKeyFeatureAnimaticPosterPath,
  getKeyFeatureAnimaticWebmPath,
  getKeyFeatureChapterTiming,
} from '@/config/landing/keyFeatureAnimatics'

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

let sessionFeatureAudioUnmuted = false

export function unlockFeatureAnimaticAudio() {
  sessionFeatureAudioUnmuted = true
}

export type FeatureScreenshotVariant = {
  id: string
  label: string
  imageUrl: string
}

export type FeatureScreenshotFrameProps = {
  src: string
  label: string
  enterFullscreenLabel: string
  exitFullscreenLabel: string
  variants?: readonly FeatureScreenshotVariant[]
  featureIcon?: string
  locale?: string
}

export function FeatureScreenshotFrame({
  src,
  label,
  enterFullscreenLabel,
  exitFullscreenLabel,
  variants,
  featureIcon,
  locale,
}: FeatureScreenshotFrameProps) {
  const [panLocale, setPanLocale] = useState<FeaturePanLocaleId>(() =>
    normalizeFeaturePanLocale(locale)
  )
  const [beatIndex, setBeatIndex] = useState(0)
  const [chapterProgress, setChapterProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [inViewport, setInViewport] = useState(true)
  const [nearViewport, setNearViewport] = useState(true)
  const [audioUnmuted, setAudioUnmuted] = useState(() => sessionFeatureAudioUnmuted)
  const [videoError, setVideoError] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const pendingBeatIndexRef = useRef<number>(0)

  const panSpec = useMemo(
    () => getKeyFeatureNarratedPan(featureIcon, src),
    [featureIcon, src]
  )
  const resolvedIcon = featureIcon ?? panSpec?.icon ?? undefined

  const chapterInfo = useMemo(
    () => getKeyFeatureChapterTiming(resolvedIcon, panLocale),
    [resolvedIcon, panLocale]
  )

  const hasAnimaticVideo = Boolean(chapterInfo) && !videoError
  const animaticWebmSrc = chapterInfo
    ? getKeyFeatureAnimaticWebmPath(chapterInfo.suiteId, panLocale)
    : null
  const animaticMp4Src = chapterInfo
    ? getKeyFeatureAnimaticMp4Path(chapterInfo.suiteId, panLocale)
    : null
  const animaticPosterSrc = chapterInfo
    ? getKeyFeatureAnimaticPosterPath(chapterInfo.suiteId)
    : src

  const beats = panSpec?.beats ?? []
  const safeBeatIdx = beats.length > 0 && beatIndex < beats.length ? beatIndex : 0
  const currentBeat = beats[safeBeatIdx] ?? null
  const uiCopy = FEATURE_ANIMATIC_UI_COPY[panLocale]
  const isRtl = panLocale === 'ar'

  // Resolve fallback image variant when displaying static fallback or poster
  const activeVariant = useMemo(() => {
    if (!variants?.length) return undefined
    if (currentBeat?.variantId) {
      const matched = variants.find((v) => v.id === currentBeat.variantId)
      if (matched) return matched
    }
    const locVariantId = panLocale === 'zh' ? 'zh-CN' : panLocale
    return variants.find((v) => v.id === locVariantId) ?? variants[0]
  }, [variants, currentBeat?.variantId, panLocale])

  const fallbackImageSrc = activeVariant?.imageUrl || src

  // Sync language when page locale changes
  useEffect(() => {
    setPanLocale(normalizeFeaturePanLocale(locale))
  }, [locale])

  // Sync session audio unlock when focusing from FullStudioDirectoryDrawer
  useEffect(() => {
    if (sessionFeatureAudioUnmuted && !audioUnmuted) {
      setAudioUnmuted(true)
    }
  }, [featureIcon, audioUnmuted])

  // Reset to Beat 0 when switching feature
  useEffect(() => {
    pendingBeatIndexRef.current = 0
    setBeatIndex(0)
    setChapterProgress(0)
    setIsPlaying(true)
    setVideoError(false)
  }, [resolvedIcon, src])

  // Clear video error on language change
  useEffect(() => {
    setVideoError(false)
  }, [panLocale])

  const seekToChapterBeat = useCallback(
    (vid: HTMLVideoElement, targetBeatIdx: number) => {
      if (!chapterInfo) return
      const { startSec, endSec, beatStartsSec } = chapterInfo.timing
      const beatSec = beatStartsSec[targetBeatIdx] ?? startSec
      const clampedSec = Math.max(startSec, Math.min(Math.max(startSec, endSec - 0.2), beatSec))
      try {
        if (Math.abs(vid.currentTime - clampedSec) > 0.08) {
          vid.currentTime = clampedSec
        }
      } catch {
        // Ignore seek before metadata ready; onLoadedMetadata handles it
      }
    },
    [chapterInfo]
  )

  // When switching between two features that share the SAME Suite Animatic `<video>` file,
  // seek immediately to the newly selected feature's chapter start!
  useEffect(() => {
    if (!hasAnimaticVideo || !chapterInfo) return
    const vid = videoRef.current
    if (!vid || vid.readyState < 1) return
    seekToChapterBeat(vid, pendingBeatIndexRef.current)
  }, [hasAnimaticVideo, chapterInfo, resolvedIcon, seekToChapterBeat])

  // Viewport observer so off-screen animatics wait cleanly until scrolled near/into view
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
  }, [resolvedIcon])

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
  }, [hasAnimaticVideo, panLocale, resolvedIcon])

  // Sync HTML5 `.webm` / `.mp4` animatic video playback & studio audio state
  useEffect(() => {
    if (!hasAnimaticVideo) return
    const vid = videoRef.current
    if (!vid) return
    vid.muted = !audioUnmuted
    const shouldPlay = isPlaying && (inViewport || isFullscreen)
    if (shouldPlay) {
      // If chapter starts >0.25s into the suite and metadata hasn't arrived yet, wait for
      // `onLoadedMetadata` to seek directly to `startSec` so byte-0 isn't fetched and aborted.
      if (vid.readyState === 0 && (chapterInfo?.timing.startSec ?? 0) > 0.25) {
        return
      }
      const p = vid.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          if (audioUnmuted) {
            vid.muted = true
            setAudioUnmuted(false)
            void vid.play().catch(() => undefined)
          }
        })
      }
    } else {
      vid.pause()
    }
  }, [
    hasAnimaticVideo,
    inViewport,
    isFullscreen,
    isPlaying,
    audioUnmuted,
    animaticWebmSrc,
    resolvedIcon,
    chapterInfo?.timing.startSec,
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

  const handleToggleAudio = () => {
    setAudioUnmuted((prev) => {
      const next = !prev
      sessionFeatureAudioUnmuted = next
      if (next && !isPlaying) {
        setIsPlaying(true)
      }
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
    if (!hasAnimaticVideo) return
    const vid = videoRef.current
    if (!audioUnmuted) {
      sessionFeatureAudioUnmuted = true
      setAudioUnmuted(true)
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

  const handleRestartChapter = () => {
    pendingBeatIndexRef.current = 0
    setBeatIndex(0)
    setChapterProgress(0)
    setIsPlaying(true)
    if (hasAnimaticVideo && chapterInfo) {
      sessionFeatureAudioUnmuted = true
      setAudioUnmuted(true)
      if (videoRef.current) {
        seekToChapterBeat(videoRef.current, 0)
        videoRef.current.muted = false
        void videoRef.current.play().catch(() => undefined)
      }
    }
  }

  const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasAnimaticVideo || !chapterInfo || !videoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    const rawRatio = isRtl
      ? (rect.right - e.clientX) / rect.width
      : (e.clientX - rect.left) / rect.width
    const clamped = Math.max(0, Math.min(1, rawRatio))
    const { startSec, endSec, beatStartsSec } = chapterInfo.timing
    const span = Math.max(0.5, endSec - startSec)
    const targetSec = startSec + clamped * span
    videoRef.current.currentTime = targetSec
    setChapterProgress(clamped)

    let syncedBeat = 0
    for (let i = 0; i < beatStartsSec.length; i++) {
      if (targetSec + 0.05 >= beatStartsSec[i]!) {
        syncedBeat = i
      }
    }
    setBeatIndex(Math.min(Math.max(0, beats.length - 1), syncedBeat))
    if (!isPlaying) {
      setIsPlaying(true)
    }
  }

  const handleSelectBeat = (idx: number) => {
    pendingBeatIndexRef.current = idx
    setBeatIndex(idx)
    if (beats.length > 0) {
      setChapterProgress(idx / beats.length)
    }
    setIsPlaying(true)
    if (hasAnimaticVideo && videoRef.current) {
      seekToChapterBeat(videoRef.current, idx)
    }
  }

  const handleSelectLanguage = (nextLocale: FeaturePanLocaleId) => {
    pendingBeatIndexRef.current = safeBeatIdx
    if (nextLocale !== panLocale) {
      setIsBuffering(true)
    }
    setPanLocale(nextLocale)
    setIsPlaying(true)
    sessionFeatureAudioUnmuted = true
    setAudioUnmuted(true)
  }

  const handleToggleFullscreen = async () => {
    if (hasAnimaticVideo && videoRef.current && isCoarsePointer()) {
      sessionFeatureAudioUnmuted = true
      setAudioUnmuted(true)
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
  const audioToggleTooltip = audioUnmuted ? uiCopy.muteLabel : uiCopy.hearNarrationLabel
  const fsToggleLabel = isFullscreen
    ? exitFullscreenLabel || uiCopy.exitFullscreenLabel
    : enterFullscreenLabel || uiCopy.enterFullscreenLabel

  return (
    <div
      ref={stageRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="feature-animatic-stage"
      className={cn(
        'mt-4 w-full overflow-hidden rounded-2xl border border-emerald-400/30 bg-slate-950 shadow-2xl shadow-black/50',
        isFullscreen && 'mt-0 flex h-full w-full flex-col justify-center bg-black p-4 sm:p-8'
      )}
    >
      {/* Clean, unobstructed 16:9 Animatic Video Stage (matching VideoServiceOutputShowcase) */}
      <div
        className={cn(
          'relative aspect-video w-full overflow-hidden bg-slate-950',
          isFullscreen && 'mx-auto max-h-[76vh] max-w-7xl rounded-xl border border-white/15'
        )}
      >
        {hasAnimaticVideo && animaticWebmSrc && animaticMp4Src && chapterInfo ? (
          <video
            key={`${chapterInfo.suiteId}-${panLocale}`}
            ref={videoRef}
            poster={fallbackImageSrc || animaticPosterSrc}
            autoPlay={isPlaying && (inViewport || isFullscreen)}
            muted={!audioUnmuted}
            playsInline
            preload={nearViewport ? 'auto' : 'metadata'}
            aria-label={`${label} — ${uiCopy.animaticBadge}`}
            onClick={handleVideoSurfaceClick}
            onContextMenu={(e) => e.preventDefault()}
            onLoadStart={() => setIsBuffering(true)}
            onWaiting={() => setIsBuffering(true)}
            onSeeking={() => setIsBuffering(true)}
            onLoadedData={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}
            onPlaying={() => {
              setIsBuffering(false)
              setIsPlaying(true)
            }}
            onSeeked={(e) => {
              setIsBuffering(false)
              if (isPlaying && (inViewport || isFullscreen) && e.currentTarget.paused) {
                void e.currentTarget.play().catch(() => undefined)
              }
            }}
            onPause={(e) => {
              const vid = e.currentTarget
              if (!vid.seeking && !vid.ended && (inViewport || isFullscreen) && vid.readyState > 0) {
                setIsPlaying(false)
              }
            }}
            onLoadedMetadata={(e) => {
              const vid = e.currentTarget
              seekToChapterBeat(vid, pendingBeatIndexRef.current)
              if (isPlaying && (inViewport || isFullscreen) && vid.paused) {
                void vid.play().catch(() => undefined)
              }
            }}
            onTimeUpdate={(e) => {
              const vid = e.currentTarget
              if (vid.seeking) return
              if (vid.readyState >= 2 && isBuffering) {
                setIsBuffering(false)
              }
              const { startSec, endSec, beatStartsSec } = chapterInfo.timing
              const span = Math.max(0.5, endSec - startSec)
              const t = vid.currentTime

              // Keep playback cleanly bounded to the selected feature's chapter window
              if (t >= endSec - 0.06) {
                pendingBeatIndexRef.current = 0
                vid.currentTime = startSec
                setChapterProgress(0)
                if (safeBeatIdx !== 0) setBeatIndex(0)
                return
              }
              if (t < startSec - 0.25) {
                vid.currentTime = startSec
                return
              }

              const progress = Math.max(0, Math.min(1, (t - startSec) / span))
              setChapterProgress(progress)

              let activeIdx = 0
              for (let i = 0; i < beatStartsSec.length; i++) {
                if (t + 0.08 >= beatStartsSec[i]!) {
                  activeIdx = i
                }
              }
              const clampedIdx = Math.min(Math.max(0, beats.length - 1), activeIdx)
              if (clampedIdx !== safeBeatIdx) {
                setBeatIndex(clampedIdx)
              }
            }}
            onEnded={(e) => {
              const vid = e.currentTarget
              pendingBeatIndexRef.current = 0
              vid.currentTime = chapterInfo.timing.startSec
              setChapterProgress(0)
              setBeatIndex(0)
              if (isPlaying) {
                void vid.play().catch(() => undefined)
              }
            }}
            onError={() => {
              setIsBuffering(false)
              setVideoError(true)
            }}
            className="h-full w-full cursor-pointer bg-slate-950 object-contain"
          >
            <source src={animaticWebmSrc} type="video/webm" />
            <source
              src={animaticMp4Src}
              type="video/mp4"
              onError={() => {
                setIsBuffering(false)
                setVideoError(true)
              }}
            />
          </video>
        ) : (
          <img
            src={fallbackImageSrc}
            alt={label}
            loading="eager"
            decoding="async"
            draggable={false}
            className="pointer-events-none h-full w-full select-none object-contain bg-slate-950"
          />
        )}

        {hasAnimaticVideo && isBuffering ? (
          <div
            className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-slate-950/35"
            aria-hidden
          >
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400/90" />
          </div>
        ) : null}

        {/* Compact icon-only bottom-left transport — never blocks the screen on mobile or desktop */}
        <div
          dir="ltr"
          className="pointer-events-auto absolute bottom-2 left-2 z-10 flex items-center gap-1 sm:bottom-2.5 sm:left-3 sm:gap-1.5"
        >
          {hasAnimaticVideo ? (
            <>
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

              <VideoControlTooltip label={audioToggleTooltip} side="top">
                <button
                  type="button"
                  title={audioToggleTooltip}
                  aria-label={audioToggleTooltip}
                  aria-pressed={audioUnmuted}
                  onClick={handleToggleAudio}
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full border backdrop-blur-md transition-all sm:h-7 sm:w-7 cursor-pointer',
                    audioUnmuted
                      ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-200 shadow-sm shadow-emerald-500/20 hover:bg-emerald-500/35'
                      : 'border-amber-400/70 bg-slate-950/75 text-amber-300 shadow-sm shadow-amber-500/15 hover:border-amber-300 hover:bg-slate-900 hover:text-amber-200'
                  )}
                >
                  {audioUnmuted ? (
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
                  onClick={handleRestartChapter}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-white backdrop-blur-md transition-colors hover:border-emerald-400/60 hover:bg-slate-900 sm:h-7 sm:w-7 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                </button>
              </VideoControlTooltip>
            </>
          ) : null}

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

        {/* Scrubbable Chapter Progress Track */}
        <div
          onClick={hasAnimaticVideo ? handleSeekBarClick : undefined}
          className={cn(
            'absolute inset-x-0 bottom-0 z-10 bg-slate-900/90',
            hasAnimaticVideo ? 'h-1 cursor-pointer hover:h-1.5 transition-all' : 'h-1'
          )}
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 transition-[width] duration-75"
            style={{ width: `${Math.round(chapterProgress * 100)}%` }}
          />
        </div>
      </div>

      {/* Below-Frame Complete Feature & Value Proposition Narration + Part & 7-Language Switcher Bar */}
      {currentBeat ? (
        <div className="border-t border-white/10 bg-slate-950/95 p-3 sm:p-4">
          <p
            data-testid="feature-pan-caption"
            dir={isRtl ? 'rtl' : 'ltr'}
            className="text-xs leading-relaxed text-gray-100 sm:text-sm"
          >
            {currentBeat.narration[panLocale]}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/90 pt-2.5">
            {/* Part / Beat Selector Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {beats.map((beat, idx) => {
                const active = idx === safeBeatIdx
                const beatLabel = `${uiCopy.beatPrefix} 0${idx + 1}: ${beat.narration[panLocale]}`
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
              data-testid="feature-pan-narrator-bar"
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
                    aria-busy={selected && isBuffering}
                    onClick={() => handleSelectLanguage(opt.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer sm:px-2',
                      selected
                        ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-100'
                        : 'border-emerald-500/35 bg-slate-900/80 text-emerald-200 hover:border-emerald-400/60 hover:text-white'
                    )}
                  >
                    {selected && isBuffering ? (
                      <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin text-emerald-300" aria-hidden />
                    ) : null}
                    <span>{opt.shortLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default FeatureScreenshotFrame
