'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Clapperboard,
  Compass,
  Film,
  Images,
  Layers,
  Pause,
  Play,
  Sparkles,
  Tv,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import { VideoGlobeLanguageSelector } from '@/components/landing/VideoGlobeLanguageSelector'
import {
  DOOR_WALKTHROUGH_COPY,
  normalizeWalkthroughDubLocale,
  ROOM_PANNED_SLIDES,
} from '@/config/landing/doorWalkthroughCopy'
import {
  FEATURE_ROOM_IDS,
  featureRoomVideoSources,
  type FeatureRoomId,
} from '@/config/landing/featureRoomMedia'
import {
  FEATURE_ROOM_SCRIPTS,
  type HeroDubLocaleId,
} from '@/config/landing/featureRoomScripts'
import { TRAILER_DUB_LOCALE_IDS, type TrailerDubLocaleId } from '@/config/landing/productionPipelineDemo'
import { cn } from '@/lib/utils'

export type WalkthroughDisplayMode = 'video' | 'panned'

export interface StudioDoorWalkthroughModalProps {
  open: boolean
  onClose: () => void
  initialRoomId?: FeatureRoomId
  initialLocale?: string
  initialMode?: WalkthroughDisplayMode
  productionTitle?: string
}

const ROOM_ICONS: Record<FeatureRoomId, React.ComponentType<{ className?: string }>> = {
  'series-desk': Layers,
  'blueprint-board': Compass,
  'production-stage': Clapperboard,
  'screening-room': Tv,
}

function parsePercentPair(pos: string): [number, number] {
  const parts = pos.trim().split(/\s+/)
  const x = Number.parseFloat(parts[0] ?? '50')
  const y = Number.parseFloat(parts[1] ?? '50')
  return [Number.isFinite(x) ? x : 50, Number.isFinite(y) ? y : 50]
}

function interpolateSlideTransform(
  fromPos: string,
  toPos: string,
  fromScale: number,
  toScale: number,
  progress: number
): { objectPosition: string; scale: number } {
  const clamped = Math.max(0, Math.min(1, progress))
  // Smooth cosine ease-in-out for cinematic camera panning
  const eased = 0.5 - 0.5 * Math.cos(Math.PI * clamped)
  const [fx, fy] = parsePercentPair(fromPos)
  const [tx, ty] = parsePercentPair(toPos)
  const x = fx + (tx - fx) * eased
  const y = fy + (ty - fy) * eased
  const scale = fromScale + (toScale - fromScale) * eased
  return {
    objectPosition: `${x.toFixed(2)}% ${y.toFixed(2)}%`,
    scale: Number(scale.toFixed(4)),
  }
}

function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function StudioDoorWalkthroughModal({
  open,
  onClose,
  initialRoomId = 'screening-room',
  initialLocale = 'en',
  initialMode = 'video',
  productionTitle,
}: StudioDoorWalkthroughModalProps) {
  const [mounted, setMounted] = useState(false)
  const [activeRoomId, setActiveRoomId] = useState<FeatureRoomId>(initialRoomId)
  const [activeDubLocale, setActiveDubLocale] = useState<HeroDubLocaleId>(() =>
    normalizeWalkthroughDubLocale(initialLocale)
  )
  const [mode, setMode] = useState<WalkthroughDisplayMode>(initialMode)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const savedSeekRef = useRef<number>(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync initial props each time the modal opens
  useEffect(() => {
    if (!open) return
    setActiveRoomId(initialRoomId)
    setActiveDubLocale(normalizeWalkthroughDubLocale(initialLocale))
    setMode(initialMode)
    setCurrentTime(0)
    setIsPlaying(true)
    savedSeekRef.current = 0
  }, [open, initialRoomId, initialLocale, initialMode])

  // Escape key + body scroll lock while open
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  const uiCopy = DOOR_WALKTHROUGH_COPY[activeDubLocale] ?? DOOR_WALKTHROUGH_COPY.en
  const roomScript = FEATURE_ROOM_SCRIPTS[activeRoomId]
  const beats = roomScript.beatsByLocale[activeDubLocale] ?? roomScript.beatsByLocale.en
  const beatStarts = roomScript.beatStartSeconds
  const slides = ROOM_PANNED_SLIDES[activeRoomId]
  const sources = useMemo(
    () => featureRoomVideoSources(activeRoomId, activeDubLocale),
    [activeRoomId, activeDubLocale]
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

  const activeSlide = slides[activeBeatIndex] ?? slides[0]
  const beatStartSec = beatStarts[activeBeatIndex] ?? 0
  const nextBeatStartSec =
    beatStarts[activeBeatIndex + 1] ?? roomScript.durationSeconds
  const beatDuration = Math.max(1, nextBeatStartSec - beatStartSec)
  const beatProgress = Math.max(
    0,
    Math.min(1, (currentTime - beatStartSec) / beatDuration)
  )

  const panTransform = useMemo(() => {
    if (!activeSlide) {
      return { objectPosition: '50% 50%', scale: 1 }
    }
    return interpolateSlideTransform(
      activeSlide.fromPos,
      activeSlide.toPos,
      activeSlide.fromScale,
      activeSlide.toScale,
      beatProgress
    )
  }, [activeSlide, beatProgress])

  const handleSelectRoom = useCallback((roomId: FeatureRoomId) => {
    savedSeekRef.current = 0
    setCurrentTime(0)
    setActiveRoomId(roomId)
    setIsPlaying(true)
  }, [])

  const handleSelectLocale = useCallback((nextLocale: TrailerDubLocaleId) => {
    const currentPos = videoRef.current?.currentTime ?? 0
    savedSeekRef.current = currentPos
    setActiveDubLocale(normalizeWalkthroughDubLocale(nextLocale))
  }, [])

  const handleJumpToBeat = useCallback((beatIndex: number) => {
    const targetSec = beatStarts[beatIndex] ?? 0
    const el = videoRef.current
    if (el) {
      el.currentTime = targetSec
      void el.play().catch(() => {})
    }
    setCurrentTime(targetSec)
    setIsPlaying(true)
  }, [beatStarts])

  const handleTogglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      void el.play().catch(() => {})
      setIsPlaying(true)
    } else {
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

  if (!open || !mounted) return null

  const isRtl = activeDubLocale === 'ar'
  const activeRoomLabel = uiCopy.rooms[activeRoomId]
  const overallProgressPct = Math.min(
    100,
    Math.max(0, (currentTime / Math.max(1, roomScript.durationSeconds)) * 100)
  )

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${activeRoomLabel} — ${uiCopy.narratedPreviewTag}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="studio-door-walkthrough-modal"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 md:p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 text-white shadow-[0_28px_90px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-900/90 px-3.5 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
                  <Sparkles className="h-3 w-3 shrink-0 text-amber-300" aria-hidden />
                  <span className="whitespace-normal leading-snug">{uiCopy.interimBadge}</span>
                </span>
                {productionTitle ? (
                  <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-200">
                    {productionTitle}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-1.5 text-base sm:text-lg font-bold tracking-tight text-white">
                {activeRoomLabel} · {uiCopy.narratedPreviewTag}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <VideoGlobeLanguageSelector
                activeLocale={activeDubLocale}
                availableLocales={TRAILER_DUB_LOCALE_IDS}
                onSelectLocale={handleSelectLocale}
                align="end"
                variant="theater"
              />
              <VideoControlTooltip label={uiCopy.closeLabel} side="bottom">
                <button
                  type="button"
                  onClick={onClose}
                  title={uiCopy.closeLabel}
                  aria-label={uiCopy.closeLabel}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </VideoControlTooltip>
            </div>
          </div>

          {/* 4 Studio Door Room Switcher + Mode Toggle (Video vs Panned 5K Screens) */}
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="tablist"
              aria-label="Studio rooms"
              className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1"
            >
              {FEATURE_ROOM_IDS.map((roomId, idx) => {
                const Icon = ROOM_ICONS[roomId]
                const active = roomId === activeRoomId
                const label = uiCopy.rooms[roomId]
                return (
                  <button
                    key={roomId}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    title={label}
                    onClick={() => handleSelectRoom(roomId)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-semibold transition-all cursor-pointer',
                      active
                        ? 'border-cyan-400/60 bg-cyan-500/15 text-white shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                        : 'border-white/10 bg-slate-950/65 text-slate-300 hover:border-white/25 hover:text-white'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold',
                        active ? 'bg-cyan-400/20 text-cyan-300' : 'bg-white/5 text-slate-400'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 whitespace-normal break-words leading-tight">
                      <span className="mr-1 text-[10px] font-bold text-slate-400">
                        0{idx + 1}
                      </span>
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Mode Switcher: Narrated Screen Video vs Panned 5K Studio Screenshots */}
            <div
              role="group"
              aria-label="Walkthrough visual mode"
              className="grid grid-cols-2 sm:inline-flex rounded-xl border border-white/10 bg-slate-950/80 p-1 shrink-0 gap-1"
            >
              <button
                type="button"
                aria-pressed={mode === 'video'}
                title={uiCopy.modeScreenVideo}
                onClick={() => setMode('video')}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                  mode === 'video'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                )}
              >
                <Film className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="whitespace-normal leading-tight">{uiCopy.modeScreenVideo}</span>
              </button>
              <button
                type="button"
                aria-pressed={mode === 'panned'}
                title={uiCopy.modePannedScreens}
                onClick={() => setMode('panned')}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                  mode === 'panned'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                )}
              >
                <Images className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="whitespace-normal leading-tight">{uiCopy.modePannedScreens}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Split: Stage + Synchronized Voiceover Steps */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Left / Main 16:9 Narrated Stage */}
          <div className="lg:col-span-8 flex flex-col bg-black/95 border-b lg:border-b-0 lg:border-r border-white/10">
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              <video
                ref={videoRef}
                key={`${activeRoomId}-${activeDubLocale}`}
                playsInline
                autoPlay
                muted={isMuted}
                preload="auto"
                onLoadedMetadata={(e) => {
                  const target = e.currentTarget
                  if (savedSeekRef.current > 0 && savedSeekRef.current < target.duration) {
                    target.currentTime = savedSeekRef.current
                  }
                  if (isPlaying) {
                    void target.play().catch(() => {
                      // If unmuted autoplay is blocked on mobile, fall back to muted playback
                      target.muted = true
                      setIsMuted(true)
                      void target.play().catch(() => {})
                    })
                  }
                }}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  savedSeekRef.current = 0
                  setIsPlaying(false)
                }}
                className={cn(
                  mode === 'video'
                    ? 'h-full w-full object-contain bg-black'
                    : 'pointer-events-none absolute h-px w-px opacity-0'
                )}
              >
                {sources.map((source) => (
                  <source key={source.src} src={source.src} type={source.type} />
                ))}
              </video>

              {mode === 'panned' && activeSlide ? (
                <div
                  data-testid="panned-screenshot-stage"
                  className="relative h-full w-full overflow-hidden bg-slate-950"
                >
                  <img
                    key={`${activeRoomId}-${activeBeatIndex}-${activeSlide.imageUrl}`}
                    src={activeSlide.imageUrl}
                    alt={`${activeRoomLabel} — ${uiCopy.beatPrefix} ${activeBeatIndex + 1}`}
                    style={{
                      objectPosition: panTransform.objectPosition,
                      transform: `scale(${panTransform.scale})`,
                    }}
                    className="h-full w-full object-cover transition-[transform,object-position] duration-300 ease-out will-change-transform select-none"
                  />
                  {/* Subtle bottom caption gradient for synchronized voiceover */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent px-4 pb-3.5 pt-10">
                    <p className="mx-auto max-w-3xl text-center text-xs sm:text-sm font-medium leading-relaxed text-white drop-shadow">
                      {beats[activeBeatIndex] ?? ''}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Transport Bar */}
            <div className="flex flex-col gap-2 border-t border-white/10 bg-slate-900/90 px-3.5 py-2.5 sm:px-4">
              {/* Scrubbable Progress Bar */}
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
                  if (videoRef.current) {
                    videoRef.current.currentTime = nextTime
                  }
                  setCurrentTime(nextTime)
                }}
                className="group relative h-2 w-full cursor-pointer overflow-hidden rounded-full bg-white/15"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-[width] duration-150"
                  style={{ width: `${overallProgressPct}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    title={isPlaying ? uiCopy.pauseLabel : uiCopy.playLabel}
                    aria-label={isPlaying ? uiCopy.pauseLabel : uiCopy.playLabel}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-cyan-300 fill-cyan-300" aria-hidden />
                    )}
                    <span>{isPlaying ? uiCopy.pauseLabel : uiCopy.playLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMute}
                    title={isMuted ? uiCopy.unmuteLabel : uiCopy.muteLabel}
                    aria-label={isMuted ? uiCopy.unmuteLabel : uiCopy.muteLabel}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    {isMuted ? (
                      <VolumeX className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
                    )}
                    <span className="hidden sm:inline">
                      {isMuted ? uiCopy.unmuteLabel : uiCopy.muteLabel}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs tabular-nums text-slate-300">
                  <span className="rounded-md bg-white/5 px-2 py-0.5 font-semibold text-cyan-300">
                    {uiCopy.beatPrefix} {activeBeatIndex + 1}/{beats.length}
                  </span>
                  <span>
                    {formatTimestamp(currentTime)} / {formatTimestamp(roomScript.durationSeconds)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Synchronized 7-Language Voiceover Beat Transcript */}
          <div className="lg:col-span-4 flex flex-col bg-slate-950/95 p-3.5 sm:p-4 lg:max-h-[70dvh] lg:overflow-y-auto">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300">
              {uiCopy.beatsHeading}
            </p>
            <div className="space-y-2">
              {beats.map((line, idx) => {
                const isCurrent = idx === activeBeatIndex
                const startSec = beatStarts[idx] ?? 0
                return (
                  <button
                    key={`${activeRoomId}-${activeDubLocale}-${idx}`}
                    type="button"
                    onClick={() => handleJumpToBeat(idx)}
                    title={`${uiCopy.beatPrefix} ${idx + 1} (${formatTimestamp(startSec)})`}
                    className={cn(
                      'w-full rounded-xl border p-3 text-left transition-all cursor-pointer',
                      isCurrent
                        ? 'border-cyan-400/50 bg-cyan-500/10 text-white shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                        : 'border-white/8 bg-slate-900/55 text-slate-300 hover:border-white/20 hover:bg-slate-900/90 hover:text-white'
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold">
                      <span className={isCurrent ? 'text-cyan-300' : 'text-slate-400'}>
                        {uiCopy.beatPrefix} {idx + 1}
                      </span>
                      <span className="tabular-nums text-slate-500">
                        {formatTimestamp(startSec)}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-normal break-words">
                      {line}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default StudioDoorWalkthroughModal
