'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import { VideoGlobeLanguageSelector } from '@/components/landing/VideoGlobeLanguageSelector'
import {
  DOOR_WALKTHROUGH_COPY,
  normalizeWalkthroughDubLocale,
} from '@/config/landing/doorWalkthroughCopy'
import {
  featureRoomVideoSources,
  type FeatureRoomId,
} from '@/config/landing/featureRoomMedia'
import {
  FEATURE_ROOM_SCRIPTS,
  type HeroDubLocaleId,
} from '@/config/landing/featureRoomScripts'
import {
  TRAILER_DUB_LOCALE_IDS,
  type TrailerDubLocaleId,
} from '@/config/landing/productionPipelineDemo'
import { cn } from '@/lib/utils'

export interface InsetRoomTourPlayerProps {
  roomId: FeatureRoomId
  roomLabel: string
  initialLocale?: string
}

function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function InsetRoomTourPlayer({
  roomId,
  roomLabel,
  initialLocale = 'en',
}: InsetRoomTourPlayerProps) {
  const [activeDubLocale, setActiveDubLocale] = useState<HeroDubLocaleId>(() =>
    normalizeWalkthroughDubLocale(initialLocale)
  )
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const savedSeekRef = useRef<number>(0)
  const shouldResumeRef = useRef<boolean>(false)

  useEffect(() => {
    setActiveDubLocale(normalizeWalkthroughDubLocale(initialLocale))
  }, [initialLocale])

  // Reset timeline cleanly when switching between the 4 studio rooms
  useEffect(() => {
    savedSeekRef.current = 0
    shouldResumeRef.current = false
    setCurrentTime(0)
    setIsPlaying(false)
    setIsBuffering(false)
  }, [roomId])

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const uiCopy = DOOR_WALKTHROUGH_COPY[activeDubLocale] ?? DOOR_WALKTHROUGH_COPY.en
  const roomScript = FEATURE_ROOM_SCRIPTS[roomId]
  const beats = roomScript.beatsByLocale[activeDubLocale] ?? roomScript.beatsByLocale.en
  const beatStarts = roomScript.beatStartSeconds
  const sources = useMemo(
    () => featureRoomVideoSources(roomId, activeDubLocale),
    [roomId, activeDubLocale]
  )

  const activeBeatIndex = useMemo(() => {
    let idx = 0
    for (let i = 0; i < beatStarts.length; i += 1) {
      if (currentTime + 0.15 >= (beatStarts[i] ?? 0)) {
        idx = i
      }
    }
    return idx
  }, [beatStarts, currentTime])

  const handleSelectLocale = useCallback(
    (nextLocale: TrailerDubLocaleId) => {
      const el = videoRef.current
      savedSeekRef.current = el?.currentTime ?? 0
      shouldResumeRef.current = Boolean(el && !el.paused)
      const normalized = normalizeWalkthroughDubLocale(nextLocale)
      if (normalized !== activeDubLocale) {
        setIsBuffering(true)
      }
      setActiveDubLocale(normalized)
    },
    [activeDubLocale]
  )

  const handleTogglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      shouldResumeRef.current = true
      void el.play().catch(() => {
        el.muted = true
        setIsMuted(true)
        void el.play().catch(() => {})
      })
      setIsPlaying(true)
    } else {
      shouldResumeRef.current = false
      el.pause()
      setIsPlaying(false)
    }
  }, [])

  const handleToggleMute = useCallback(() => {
    const el = videoRef.current
    const nextMuted = !isMuted
    if (el) {
      el.muted = nextMuted
    }
    setIsMuted(nextMuted)
  }, [isMuted])

  const handleJumpToBeat = useCallback(
    (beatIndex: number) => {
      const targetSec = beatStarts[beatIndex] ?? 0
      const el = videoRef.current
      savedSeekRef.current = targetSec
      shouldResumeRef.current = true
      if (el) {
        el.currentTime = targetSec
        void el.play().catch(() => {
          el.muted = true
          setIsMuted(true)
          void el.play().catch(() => {})
        })
      }
      setCurrentTime(targetSec)
      setIsPlaying(true)
    },
    [beatStarts]
  )

  const handleToggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {})
      return
    }
    const target = containerRef.current ?? videoRef.current
    if (target && typeof target.requestFullscreen === 'function') {
      void target.requestFullscreen().catch(() => {})
    }
  }, [])

  const isRtl = activeDubLocale === 'ar'
  const overallProgressPct = Math.min(
    100,
    Math.max(0, (currentTime / Math.max(1, roomScript.durationSeconds)) * 100)
  )
  const activeBeatNumber = String(activeBeatIndex + 1).padStart(2, '0')

  return (
    <div
      ref={containerRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="inset-room-tour-player"
      data-room-id={roomId}
      className="overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-xl flex flex-col"
    >
      {/* Top Studio Window Bar — Room Title + Globe Language Selector + Fullscreen */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70 shrink-0" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70 shrink-0" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70 shrink-0" />
          <span className="ms-1.5 text-xs font-semibold text-gray-200 whitespace-normal leading-tight">
            SceneFlow Studio · {roomLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <VideoGlobeLanguageSelector
            activeLocale={activeDubLocale}
            availableLocales={TRAILER_DUB_LOCALE_IDS}
            onSelectLocale={handleSelectLocale}
            isLoading={isBuffering}
            align="end"
            variant="theater"
          />
          <VideoControlTooltip
            label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen video tour'}
            side="bottom"
          >
            <button
              type="button"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen video tour'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen video tour'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" aria-hidden />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden />
              )}
            </button>
          </VideoControlTooltip>
        </div>
      </div>

      {/* Unobstructed 16:9 Narrated Room Video Stage */}
      <div
        className="relative aspect-video w-full overflow-hidden bg-black cursor-pointer group"
        onClick={handleTogglePlay}
      >
        <video
          ref={videoRef}
          key={`${roomId}-${activeDubLocale}`}
          playsInline
          muted={isMuted}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const target = e.currentTarget
            if (savedSeekRef.current > 0 && savedSeekRef.current < target.duration) {
              target.currentTime = savedSeekRef.current
            }
            if (shouldResumeRef.current) {
              void target.play().catch(() => {
                target.muted = true
                setIsMuted(true)
                void target.play().catch(() => {})
              })
            }
          }}
          onWaiting={() => setIsBuffering(true)}
          onLoadedData={() => setIsBuffering(false)}
          onCanPlay={() => setIsBuffering(false)}
          onPlaying={() => {
            setIsBuffering(false)
            setIsPlaying(true)
          }}
          onError={() => setIsBuffering(false)}
          onTimeUpdate={(e) => {
            if (e.currentTarget.readyState >= 2 && isBuffering) {
              setIsBuffering(false)
            }
            setCurrentTime(e.currentTarget.currentTime)
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            savedSeekRef.current = 0
            shouldResumeRef.current = false
            setIsPlaying(false)
          }}
          className="h-full w-full object-contain bg-black"
        >
          {sources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
        </video>

        {isBuffering ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-950/45"
            aria-hidden
          >
            <Loader2 className="h-9 w-9 animate-spin text-cyan-400" />
          </div>
        ) : !isPlaying ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/30 transition-colors group-hover:bg-slate-950/15">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/60 bg-slate-950/80 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.3)] backdrop-blur-md transition-transform group-hover:scale-105">
              <Play className="h-6 w-6 fill-cyan-300 ms-0.5" aria-hidden />
            </span>
          </div>
        ) : null}
      </div>

      {/* Below-Frame Controls: Scrubber + Transport + Number-Only Bookmark Buttons + Live Caption */}
      <div className="border-t border-slate-800 bg-slate-900/95 px-3.5 py-3 sm:px-4 space-y-3">
        {/* Scrubbable Timeline with Chapter Pips */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={Math.round(roomScript.durationSeconds)}
          aria-valuenow={Math.round(currentTime)}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            if (rect.width <= 0) return
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            const nextTime = ratio * roomScript.durationSeconds
            savedSeekRef.current = nextTime
            if (videoRef.current) {
              videoRef.current.currentTime = nextTime
            }
            setCurrentTime(nextTime)
          }}
          className="relative h-2 w-full cursor-pointer overflow-hidden rounded-full bg-white/15"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-[width] duration-150"
            style={{ width: `${overallProgressPct}%` }}
          />
          {beatStarts.map((sec, idx) => {
            if (idx === 0) return null
            const pct = Math.min(99, Math.max(1, (sec / Math.max(1, roomScript.durationSeconds)) * 100))
            return (
              <span
                key={`pip-${roomId}-${idx}`}
                className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-slate-950/75"
                style={{ left: `${pct}%` }}
                aria-hidden
              />
            )
          })}
        </div>

        {/* Transport Row + Number-Only Chapter Bookmarks */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <VideoControlTooltip
              label={isPlaying ? uiCopy.pauseLabel : uiCopy.playLabel}
              side="top"
            >
              <button
                type="button"
                onClick={handleTogglePlay}
                title={isPlaying ? uiCopy.pauseLabel : uiCopy.playLabel}
                aria-label={isPlaying ? uiCopy.pauseLabel : uiCopy.playLabel}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-cyan-300 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current ms-0.5" aria-hidden />
                )}
              </button>
            </VideoControlTooltip>

            <VideoControlTooltip
              label={isMuted ? uiCopy.unmuteLabel : uiCopy.muteLabel}
              side="top"
            >
              <button
                type="button"
                onClick={handleToggleMute}
                title={isMuted ? uiCopy.unmuteLabel : uiCopy.muteLabel}
                aria-label={isMuted ? uiCopy.unmuteLabel : uiCopy.muteLabel}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
                )}
              </button>
            </VideoControlTooltip>

            <span className="ms-1 text-[11px] font-medium tabular-nums text-slate-300">
              {formatTimestamp(currentTime)} / {formatTimestamp(roomScript.durationSeconds)}
            </span>
          </div>

          {/* Number-Only Chapter Bookmark Buttons (01, 02, 03…) with Full Narration Tooltips */}
          <div
            role="group"
            aria-label={uiCopy.beatsHeading}
            data-testid="room-tour-bookmarks"
            className="flex flex-wrap items-center gap-1.5"
          >
            {beats.map((beatLine, idx) => {
              const numLabel = String(idx + 1).padStart(2, '0')
              const isCurrent = idx === activeBeatIndex
              const tooltipText = `${numLabel} — ${beatLine}`
              return (
                <VideoControlTooltip
                  key={`${roomId}-${activeDubLocale}-bm-${idx}`}
                  label={tooltipText}
                  side="top"
                >
                  <button
                    type="button"
                    data-bookmark-number={numLabel}
                    aria-pressed={isCurrent}
                    aria-label={tooltipText}
                    title={tooltipText}
                    onClick={() => handleJumpToBeat(idx)}
                    className={cn(
                      'inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-xs font-bold tabular-nums transition-all cursor-pointer',
                      isCurrent
                        ? 'border-cyan-400/75 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                        : 'border-white/10 bg-slate-950/80 text-slate-400 hover:border-cyan-400/45 hover:text-white'
                    )}
                  >
                    {numLabel}
                  </button>
                </VideoControlTooltip>
              )
            })}
          </div>
        </div>

        {/* Synchronized Active Chapter Caption Line (Readable on Touch & Desktop) */}
        <div
          data-testid="room-tour-active-caption"
          className="flex items-start gap-2.5 rounded-xl border border-slate-800/90 bg-slate-950/80 px-3 py-2"
        >
          <span className="mt-0.5 inline-flex shrink-0 items-center rounded-md border border-cyan-400/35 bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-cyan-300">
            {activeBeatNumber}
          </span>
          <p className="!mb-0 text-xs leading-relaxed text-slate-200 whitespace-normal break-words">
            {beats[activeBeatIndex] ?? ''}
          </p>
        </div>
      </div>
    </div>
  )
}

export default InsetRoomTourPlayer
