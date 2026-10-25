/**
 * MixerTimeline - Commercial Multi-Track NLE Timeline for Scene Production Mixer
 *
 * Provides interactive playhead scrubbing, multi-track visualization (V1 Video,
 * A1 Dialogue, A2 Narration, A3 SFX, A4 Score/Music, FX1 Text Overlays),
 * non-destructive trim/hold region shading, shot selection, and transition join badges.
 */

'use client'

import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react'
import {
  Mic2,
  MessageSquare,
  Music,
  Sparkles,
  GripVertical,
  Type,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Film,
  Scissors,
  ArrowRightLeft,
} from 'lucide-react'
import type { TextOverlay, SceneSegment, MixerSegmentAudioConfig } from './types'
import { Button } from '@/components/ui/Button'
import {
  resolveSegmentSourceDurationSec,
  resolveVideoTrimWindow,
} from '@/lib/video/segmentVideoTrim'

// ============================================================================
// Types
// ============================================================================

export interface AudioClipInfo {
  id: string
  label?: string
  startTime: number
  duration: number
  audioUrl?: string
  character?: string
  /** When set, bar width uses duration / playbackRate (wall-clock). */
  playbackRate?: number
}

export interface TimelineMusicClipInfo {
  id: string
  label?: string
  startTime: number
  duration: number
  fadeInSec?: number
  fadeOutSec?: number
  loop?: boolean
}

export interface TimelineSfxClipInfo {
  id?: string
  description?: string
  startTime: number
  duration: number
}

export interface TimelineNarrationInfo {
  startTime: number
  duration: number
  enabled?: boolean
}

const DIALOGUE_TRACK_VISUAL = {
  code: 'A1',
  label: 'Voice',
  tooltip: 'Track A1: Character Dialogue',
  icon: MessageSquare,
  color: '#3b82f6',
  bgColor: 'rgba(59, 130, 246, 0.22)',
}

const NARRATION_TRACK_VISUAL = {
  code: 'A2',
  label: 'Narr.',
  tooltip: 'Track A2: Voiceover Narration (VO)',
  icon: Mic2,
  color: '#a855f7',
  bgColor: 'rgba(168, 85, 247, 0.22)',
}

const SFX_TRACK_VISUAL = {
  code: 'A3',
  label: 'SFX',
  tooltip: 'Track A3: Sound Effects (SFX)',
  icon: Sparkles,
  color: '#f59e0b',
  bgColor: 'rgba(245, 158, 11, 0.22)',
}

const MUSIC_TRACK_VISUAL = {
  code: 'A4',
  label: 'Music',
  tooltip: 'Track A4: Background Music & Score Cues',
  icon: Music,
  color: '#10b981',
  bgColor: 'rgba(16, 185, 129, 0.20)',
}

const TEXT_TRACK_VISUAL = {
  code: 'FX1',
  label: 'Text',
  tooltip: 'Track FX1: On-Screen Text Overlays & Captions',
  icon: Type,
  color: '#ec4899',
  bgColor: 'rgba(236, 72, 153, 0.22)',
}

const TRACK_HEADER_WIDTH = 72

interface MixerTimelineProps {
  videoTotalDuration: number
  /** Full scrubber length (elastic audio); defaults to video + overlay extents */
  timelineDuration?: number
  /** Dialogue clips positioned on the global timeline */
  dialogueClips?: AudioClipInfo[]
  /** Narration track span on the global timeline */
  narrationClip?: TimelineNarrationInfo | null
  /** SFX clips positioned on the global timeline */
  sfxClips?: TimelineSfxClipInfo[]
  /** Music / Score clips positioned on the global timeline */
  musicClips?: TimelineMusicClipInfo[]
  /** Text overlays to display on timeline */
  textOverlays?: TextOverlay[]
  /** Callback when text overlay timing changes (drag-to-reposition) */
  onTextOverlayChange?: (overlay: TextOverlay) => void
  /** Video segments to show on timeline */
  segments?: SceneSegment[]
  /** Optional map of segment IDs to their override durations (e.g. from dialogue audio + buffer) */
  segmentDurations?: Record<string, number>
  /** Probed video durations per segment ID for trim/hold calculation */
  measuredDurations?: Record<string, number>
  /** Per-segment audio & hold configs (for J-cut/L-cut & holdStyle badges) */
  segmentAudioConfigs?: Record<string, MixerSegmentAudioConfig>
  /** Whether Auto-Ducking (-8 dB under dialogue/narration) is enabled on A4 Score/Music */
  musicAutoDuck?: boolean
  /** Whether Auto-Ducking (-8 dB under dialogue/narration) is enabled on A3 SFX */
  sfxAutoDuck?: boolean
  /** Currently selected segment ID in shot/trim inspector */
  selectedSegmentId?: string | null
  /** Callback when user clicks a video shot block on V1 */
  onSelectSegment?: (segmentId: string) => void
  /** Callback when user clicks a shot transition join badge on V1 */
  onCycleShotJoin?: (segmentId: string) => void
  /** Callback when user double-clicks or inspects a cut boundary */
  onInspectShotBoundary?: (shotIndex: number) => void
  /** Current playback time for playhead position */
  currentPlaybackTime?: number
  /** Callback when user clicks or scrubs on the timeline ruler/tracks */
  onSeekTime?: (timeSec: number) => void
  disabled?: boolean
  className?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

function formatSmpte(secs: number, fps = 24): string {
  if (!Number.isFinite(secs) || secs < 0) return '00:00:00'
  const totalFrames = Math.floor(secs * fps)
  const ff = totalFrames % fps
  const totalSecs = Math.floor(secs)
  const ss = totalSecs % 60
  const mm = Math.floor(totalSecs / 60)
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}:${ff.toString().padStart(2, '0')}`
}

/**
 * Build an SVG path (in viewBox 0..100 x 0..24) representing an Auto-Ducking gain envelope
 * for a clip spanning [clipStart, clipStart + clipDuration].
 * Normal gain is at y=4; ducked gain (-8 dB) dips smoothly to y=17 during speech windows.
 */
function buildAutoDuckSvgPath(
  clipStart: number,
  clipDuration: number,
  speechWindows: Array<{ start: number; end: number }>
): string {
  if (clipDuration <= 0 || speechWindows.length === 0) {
    return 'M 0 4 L 100 4'
  }
  const clipEnd = clipStart + clipDuration
  const overlapping = speechWindows
    .map((w) => ({
      start: Math.max(clipStart, w.start),
      end: Math.min(clipEnd, w.end),
    }))
    .filter((w) => w.end > w.start + 0.05)
    .sort((a, b) => a.start - b.start)

  if (overlapping.length === 0) {
    return 'M 0 4 L 100 4'
  }

  // Merge adjacent/overlapping windows
  const merged: Array<{ start: number; end: number }> = []
  for (const w of overlapping) {
    const last = merged[merged.length - 1]
    if (last && w.start <= last.end + 0.25) {
      last.end = Math.max(last.end, w.end)
    } else {
      merged.push({ ...w })
    }
  }

  const rampPct = Math.min(3.5, Math.max(0.8, (0.2 / clipDuration) * 100))
  const parts: string[] = ['M 0 4']
  for (const w of merged) {
    const sPct = Math.max(0, Math.min(100, ((w.start - clipStart) / clipDuration) * 100))
    const ePct = Math.max(0, Math.min(100, ((w.end - clipStart) / clipDuration) * 100))
    const attackStart = Math.max(0, sPct - rampPct)
    const releaseEnd = Math.min(100, ePct + rampPct)
    parts.push(`L ${attackStart.toFixed(1)} 4`)
    parts.push(`L ${sPct.toFixed(1)} 17`)
    parts.push(`L ${ePct.toFixed(1)} 17`)
    parts.push(`L ${releaseEnd.toFixed(1)} 4`)
  }
  parts.push('L 100 4')
  return parts.join(' ')
}

// ============================================================================
// MixerTimeline Component
// ============================================================================

export const MixerTimeline: React.FC<MixerTimelineProps> = ({
  videoTotalDuration,
  timelineDuration,
  dialogueClips = [],
  narrationClip = null,
  sfxClips = [],
  musicClips = [],
  textOverlays = [],
  onTextOverlayChange,
  segments = [],
  segmentDurations = {},
  measuredDurations = {},
  segmentAudioConfigs = {},
  musicAutoDuck = false,
  sfxAutoDuck = false,
  selectedSegmentId = null,
  onSelectSegment,
  onCycleShotJoin,
  onInspectShotBoundary,
  currentPlaybackTime = 0,
  onSeekTime,
  disabled,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)

  // Zoom state: pixels per second (higher = more zoomed in)
  const MIN_PPS = 5
  const MAX_PPS = 150
  const [pixelsPerSecond, setPixelsPerSecond] = useState(() => {
    const idealPPS = 650 / Math.max(videoTotalDuration, 5)
    return Math.max(MIN_PPS, Math.min(MAX_PPS, Math.round(idealPPS)))
  })

  const wallClockClipDuration = useCallback((clip: AudioClipInfo) => {
    const rate = clip.playbackRate && clip.playbackRate > 0 ? clip.playbackRate : 1
    return clip.duration / rate
  }, [])

  // Calculate total timeline duration
  const totalDuration = useMemo(() => {
    const base = timelineDuration ?? videoTotalDuration
    let maxEnd = base
    for (const overlay of textOverlays) {
      const overlayEnd =
        overlay.timing.startTime +
        (overlay.timing.duration === -1 ? videoTotalDuration : overlay.timing.duration)
      maxEnd = Math.max(maxEnd, overlayEnd)
    }
    for (const clip of dialogueClips) {
      maxEnd = Math.max(maxEnd, clip.startTime + wallClockClipDuration(clip))
    }
    for (const mc of musicClips) {
      maxEnd = Math.max(maxEnd, mc.startTime + mc.duration)
    }
    for (const sc of sfxClips) {
      maxEnd = Math.max(maxEnd, sc.startTime + sc.duration)
    }
    return Math.max(maxEnd, Math.max(5, videoTotalDuration))
  }, [
    videoTotalDuration,
    timelineDuration,
    textOverlays,
    dialogueClips,
    musicClips,
    sfxClips,
    wallClockClipDuration,
  ])

  // Generate ruler ticks + sub-ticks
  const ticks = useMemo(() => {
    let interval: number
    if (totalDuration <= 12) interval = 1
    else if (totalDuration <= 25) interval = 2
    else if (totalDuration <= 45) interval = 5
    else if (totalDuration <= 90) interval = 10
    else if (totalDuration <= 180) interval = 15
    else if (totalDuration <= 360) interval = 30
    else interval = 60
    const count = Math.ceil(totalDuration / interval) + 1
    return Array.from({ length: count }, (_, i) => i * interval).filter((t) => t <= totalDuration)
  }, [totalDuration])

  // Convert clientX mouse coordinate into timeline seconds
  const clientXToTimeSec = useCallback(
    (clientX: number): number => {
      const container = containerRef.current
      if (!container) return 0
      const rect = container.getBoundingClientRect()
      // Track content starts after TRACK_HEADER_WIDTH + 12px left padding and ends 12px before right edge
      const trackStartOffset = TRACK_HEADER_WIDTH + 12
      const trackWidth = Math.max(1, rect.width - trackStartOffset - 12)
      const relX = clientX - rect.left - trackStartOffset
      const ratio = Math.max(0, Math.min(1, relX / trackWidth))
      return ratio * totalDuration
    },
    [totalDuration]
  )

  const handleRulerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || !onSeekTime) return
      e.preventDefault()
      setIsScrubbing(true)
      onSeekTime(clientXToTimeSec(e.clientX))

      const handleMouseMove = (moveEvent: MouseEvent) => {
        onSeekTime(clientXToTimeSec(moveEvent.clientX))
      }
      const handleMouseUp = () => {
        setIsScrubbing(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [disabled, onSeekTime, clientXToTimeSec]
  )

  // Handle text overlay drag
  const handleTextDragStart = useCallback(
    (e: React.MouseEvent, overlay: TextOverlay) => {
      if (disabled || !onTextOverlayChange) return
      e.preventDefault()
      e.stopPropagation()
      setDraggingTextId(overlay.id)

      const container = containerRef.current
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const trackWidth = Math.max(1, containerRect.width - TRACK_HEADER_WIDTH - 24)
      const startX = e.clientX
      const startOffset = overlay.timing.startTime

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        const deltaPercent = deltaX / trackWidth
        const deltaSeconds = deltaPercent * totalDuration
        const newStartTime = Math.max(0, Math.round((startOffset + deltaSeconds) * 10) / 10)
        onTextOverlayChange({
          ...overlay,
          timing: { ...overlay.timing, startTime: newStartTime },
        })
      }

      const handleMouseUp = () => {
        setDraggingTextId(null)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [disabled, totalDuration, onTextOverlayChange]
  )

  const timelineWidth = totalDuration * pixelsPerSecond
  const minWidth = 620
  const effectiveWidth = Math.max(timelineWidth, minWidth)

  const handleZoomIn = useCallback(() => {
    setPixelsPerSecond((prev) => Math.min(MAX_PPS, prev + 12))
  }, [])

  const handleZoomOut = useCallback(() => {
    setPixelsPerSecond((prev) => Math.max(MIN_PPS, prev - 12))
  }, [])

  const handleZoomFit = useCallback(() => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth - (TRACK_HEADER_WIDTH + 32)
      const fittedPPS = Math.max(MIN_PPS, Math.min(MAX_PPS, containerWidth / totalDuration))
      setPixelsPerSecond(Math.round(fittedPPS))
    }
  }, [totalDuration])

  // Auto-scroll to follow playhead
  useEffect(() => {
    if (scrollContainerRef.current && currentPlaybackTime > 0 && !isScrubbing) {
      const innerWidth = containerRef.current?.offsetWidth ?? effectiveWidth
      const trackWidth = Math.max(0, innerWidth - (TRACK_HEADER_WIDTH + 24))
      const playheadX = TRACK_HEADER_WIDTH + 12 + (currentPlaybackTime / totalDuration) * trackWidth
      const container = scrollContainerRef.current
      const containerWidth = container.clientWidth
      const scrollLeft = container.scrollLeft

      if (playheadX < scrollLeft + 50 || playheadX > scrollLeft + containerWidth - 50) {
        container.scrollTo({
          left: Math.max(0, playheadX - containerWidth / 2),
          behavior: 'smooth',
        })
      }
    }
  }, [currentPlaybackTime, totalDuration, effectiveWidth, isScrubbing])

  // Calculate segment positions, trim metadata, and freeze-hold extensions for V1 track
  const segmentPositions = useMemo(() => {
    let elapsed = 0
    return segments.map((seg) => {
      const duration =
        segmentDurations?.[seg.segmentId] ??
        seg.actualVideoDuration ??
        (seg.endTime - seg.startTime)
      const sourceSec = resolveSegmentSourceDurationSec(seg, measuredDurations?.[seg.segmentId])
      const trim = resolveVideoTrimWindow(seg, sourceSec)
      const holdSec = Math.max(0, duration - trim.playableSec)
      const segAudioCfg = segmentAudioConfigs?.[seg.segmentId]
      const pos = {
        start: elapsed,
        duration,
        playableVideoSec: trim.playableSec,
        holdSec,
        holdStyle: segAudioCfg?.holdStyle ?? 'freeze',
        audioLeadInSec: segAudioCfg?.audioLeadInSec ?? 0,
        audioTailOutSec: segAudioCfg?.audioTailOutSec ?? 0,
        isTrimmed: trim.isTrimmed,
        segment: seg,
      }
      elapsed += duration
      return pos
    })
  }, [segments, segmentDurations, measuredDurations, segmentAudioConfigs])

  // Active speech windows (A1 Dialogue + A2 Narration) for Auto-Ducking envelope rendering
  const speechWindows = useMemo(() => {
    const wins: Array<{ start: number; end: number }> = []
    for (const c of dialogueClips) {
      const dur = wallClockClipDuration(c)
      if (dur > 0.05) {
        wins.push({ start: c.startTime, end: c.startTime + dur })
      }
    }
    if (narrationClip && narrationClip.duration > 0.05) {
      wins.push({
        start: narrationClip.startTime,
        end: narrationClip.startTime + narrationClip.duration,
      })
    }
    return wins
  }, [dialogueClips, narrationClip, wallClockClipDuration])

  const clampedPlayheadRatio =
    totalDuration > 0 ? Math.max(0, Math.min(1, currentPlaybackTime / totalDuration)) : 0

  return (
    <div
      className={`bg-zinc-950/90 rounded-lg border border-zinc-800/90 overflow-hidden shadow-inner ${className}`}
    >
      {/* Scene Timeline Header Bar */}
      <div className="px-3 py-2 bg-zinc-900/80 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5" title="Multi-track non-linear editor (NLE) sequence timeline">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-200">
              Scene Tracks
            </span>
          </div>
          <div
            className="flex items-center gap-2 text-[11px] font-mono tabular-nums bg-zinc-950/80 border border-zinc-800 px-2 py-0.5 rounded"
            title={`Playhead SMPTE Timecode (24 fps): ${formatSmpte(currentPlaybackTime)} • V1 Video: ${formatTime(videoTotalDuration)} • Master Duration: ${formatTime(totalDuration)}`}
          >
            <span className="text-red-400 font-semibold">{formatTime(currentPlaybackTime)}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">Video: {formatTime(videoTotalDuration)}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-cyan-300">Total: {formatTime(totalDuration)}</span>
          </div>
          {onSeekTime && (
            <span className="hidden xl:inline text-[10px] text-zinc-500">
              Click or drag ruler to jump to any moment • Click a shot to edit
            </span>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={pixelsPerSecond <= MIN_PPS}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Zoom out timeline"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <input
            type="range"
            min={MIN_PPS}
            max={MAX_PPS}
            value={pixelsPerSecond}
            onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
            className="w-16 sm:w-24 h-1 appearance-none bg-zinc-800 rounded-full cursor-pointer accent-cyan-400"
            title={`Zoom: ${pixelsPerSecond}px/s`}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={pixelsPerSecond >= MAX_PPS}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Zoom in timeline"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-zinc-800 mx-0.5" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomFit}
            className="h-6 px-2 text-[10px] font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800"
            title="Fit entire sequence to view"
          >
            <Maximize2 className="w-3 h-3 mr-1" />
            Fit
          </Button>
        </div>
      </div>

      {/* Scrollable Multi-Track Body */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-950"
        style={{ maxHeight: 'min(520px, 78vh)' }}
      >
        <div
          ref={containerRef}
          className="relative px-3 pt-3 pb-2.5 flex-1 select-none"
          style={{ width: `${effectiveWidth}px`, minWidth: '100%' }}
        >
          {/* Broadcast Playhead — always visible */}
          {totalDuration > 0 && (
            <div
              className="absolute top-1 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              style={{
                left: `calc(${TRACK_HEADER_WIDTH + 12}px + ${clampedPlayheadRatio} * (100% - ${TRACK_HEADER_WIDTH + 24}px))`,
              }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rotate-45 rounded-[1px]" />
            </div>
          )}

          {/* Interactive Timecode Ruler */}
          <div
            onMouseDown={handleRulerMouseDown}
            className={`h-6 relative mb-2 border-b border-zinc-800/90 flex items-end ${
              onSeekTime && !disabled ? 'cursor-ew-resize hover:bg-zinc-900/50' : ''
            }`}
            style={{ marginLeft: `${TRACK_HEADER_WIDTH}px` }}
            title={onSeekTime ? 'Click or drag to scrub playhead' : undefined}
          >
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute bottom-0 flex flex-col items-center pointer-events-none"
                style={{ left: `${(t / totalDuration) * 100}%` }}
              >
                <span className="text-[9px] font-mono tabular-nums text-zinc-400 -translate-x-1/2 mb-0.5">
                  {formatTime(t)}
                </span>
                <div className="w-px h-2 bg-zinc-600" />
              </div>
            ))}
          </div>

          {/* V1: Video Sequence Track */}
          <div className="h-10 relative mb-1.5 rounded bg-zinc-900/60 border border-zinc-800/60 flex">
            <div
              className="sticky left-0 z-20 shrink-0 flex items-center gap-1 px-2 bg-zinc-950 border-r border-zinc-800/90"
              style={{ width: `${TRACK_HEADER_WIDTH}px` }}
              title="Track V1: Video Shots & Transitions"
            >
              <Film className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-[10px] font-semibold text-cyan-300">Video</span>
            </div>
            <div
              className="flex-1 h-full relative min-w-0"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && onSeekTime && !disabled) {
                  handleRulerMouseDown(e)
                }
              }}
            >
              {segmentPositions.map((pos, idx) => {
                const startPercent = (pos.start / totalDuration) * 100
                const widthPercent = (pos.duration / totalDuration) * 100
                const isUserUpload = pos.segment.isUserUpload
                const isSelected = selectedSegmentId === pos.segment.segmentId
                const holdRatio =
                  pos.duration > 0 && pos.holdSec > 0.15
                    ? Math.min(0.85, pos.holdSec / pos.duration)
                    : 0
                const joinEffect =
                  pos.segment.shotJoin === 'dissolve' || pos.segment.shotJoin === 'fade'
                    ? pos.segment.shotJoin
                    : 'cut'

                return (
                  <React.Fragment key={pos.segment.segmentId}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectSegment?.(pos.segment.segmentId)
                        onSeekTime?.(pos.start)
                      }}
                      className={`absolute top-1 bottom-1 rounded-sm flex items-center justify-between overflow-hidden px-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-1 ring-amber-400 z-10'
                          : 'hover:ring-1 hover:ring-cyan-400/50'
                      }`}
                      style={{
                        left: `${startPercent}%`,
                        width: `calc(${Math.max(widthPercent, 1.2)}% - 2px)`,
                        backgroundColor: isUserUpload
                          ? 'rgba(16, 185, 129, 0.25)'
                          : 'rgba(6, 182, 212, 0.22)',
                        borderLeft: `2px solid ${isUserUpload ? '#10b981' : '#06b6d4'}`,
                      }}
                      title={`Shot #${idx + 1}: ${pos.duration.toFixed(1)}s${
                        pos.isTrimmed ? ` (Trimmed: ${pos.playableVideoSec.toFixed(1)}s)` : ''
                      }${pos.holdSec > 0.15 ? ` (+${pos.holdSec.toFixed(1)}s hold)` : ''}${
                        isUserUpload ? ' • Uploaded' : ''
                      }`}
                    >
                      {/* Freeze/Hold Tail Shading when audio or manual hold extends shot */}
                      {holdRatio > 0 && (
                        <div
                          className="absolute top-0 bottom-0 right-0 pointer-events-none border-l border-dashed border-amber-400/60"
                          style={{
                            width: `${holdRatio * 100}%`,
                            backgroundImage:
                              'repeating-linear-gradient(45deg, rgba(245,158,11,0.12), rgba(245,158,11,0.12) 4px, rgba(0,0,0,0.2) 4px, rgba(0,0,0,0.2) 8px)',
                          }}
                        />
                      )}
                      <div className="flex items-center gap-1 min-w-0 z-10">
                        <span className="text-[9px] font-mono font-semibold text-white truncate">
                          S{idx + 1}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-300/80 hidden sm:inline">
                          {pos.duration.toFixed(1)}s
                        </span>
                        {(pos.audioLeadInSec > 0.05 || pos.audioTailOutSec > 0.05) && (
                          <span
                            className="text-[7px] font-mono px-1 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 shrink-0"
                            title={`Audio Split Edit — ${pos.audioLeadInSec > 0.05 ? `J-Cut (-${pos.audioLeadInSec.toFixed(1)}s early audio)` : ''} ${pos.audioTailOutSec > 0.05 ? `L-Cut (+${pos.audioTailOutSec.toFixed(1)}s trailing audio)` : ''}`}
                          >
                            {pos.audioLeadInSec > 0.05 ? `-${pos.audioLeadInSec.toFixed(1)}s` : ''}
                            {pos.audioLeadInSec > 0.05 && pos.audioTailOutSec > 0.05 ? ' ' : ''}
                            {pos.audioTailOutSec > 0.05 ? `+${pos.audioTailOutSec.toFixed(1)}s` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 z-10">
                        {pos.holdSec > 0.15 && (
                          <span
                            className="text-[7px] font-medium px-1 rounded bg-amber-950/90 text-amber-300 border border-amber-500/40 shrink-0"
                            title={
                              pos.holdStyle === 'push'
                                ? '103% Ken Burns Push Hold (Slow Zoom)'
                                : pos.holdStyle === 'pingpong'
                                  ? 'Ping-Pong Micro-Motion Hold'
                                  : 'Freeze Frame Hold (Static Last Frame)'
                            }
                          >
                            {pos.holdStyle === 'push'
                              ? 'Zoom'
                              : pos.holdStyle === 'pingpong'
                                ? 'Motion'
                                : 'Hold'}
                          </span>
                        )}
                        {pos.isTrimmed && (
                          <Scissors className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Transition Join Pill between shots on V1 */}
                    {idx < segmentPositions.length - 1 && (
                      <div
                        style={{
                          left: `${startPercent + widthPercent}%`,
                        }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5"
                      >
                        <button
                          type="button"
                          disabled={disabled || !onCycleShotJoin}
                          onClick={(e) => {
                            e.stopPropagation()
                            onCycleShotJoin?.(pos.segment.segmentId)
                          }}
                          title={`Transition Shot #${idx + 1} → #${idx + 2}: ${joinEffect.toUpperCase()} (click to switch Cut / Dissolve / Fade)`}
                          className={`px-1 py-0.5 rounded text-[7px] font-semibold uppercase tracking-tighter border transition-colors ${
                            joinEffect === 'dissolve'
                              ? 'bg-violet-950/95 border-violet-400/70 text-violet-200'
                              : joinEffect === 'fade'
                                ? 'bg-amber-950/95 border-amber-400/70 text-amber-200'
                                : 'bg-zinc-900/90 border-zinc-700 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {joinEffect === 'dissolve' ? 'Mix' : joinEffect === 'fade' ? 'Fade' : 'Cut'}
                        </button>
                        {onInspectShotBoundary && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onInspectShotBoundary(idx)
                            }}
                            title={`Inspect Match-Cut Frame Boundary: Shot #${idx + 1} Out vs. Shot #${idx + 2} In`}
                            className="px-1 py-0.5 rounded text-[7px] font-mono bg-zinc-950/95 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/90 transition-colors"
                          >
                            ≟
                          </button>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {/* A1: Dialogue Track */}
          {dialogueClips.length > 0 && (
            <div className="h-7 relative mb-1.5 rounded bg-zinc-900/50 border border-zinc-800/50 flex">
              <div
                className="sticky left-0 z-20 shrink-0 flex items-center gap-1 px-2 bg-zinc-950 border-r border-zinc-800/90 h-full"
                style={{ width: `${TRACK_HEADER_WIDTH}px` }}
                title={DIALOGUE_TRACK_VISUAL.tooltip}
              >
                <MessageSquare
                  className="w-3 h-3 shrink-0"
                  style={{ color: DIALOGUE_TRACK_VISUAL.color }}
                />
                <span className="text-[10px] font-medium text-blue-300">
                  {DIALOGUE_TRACK_VISUAL.label}
                </span>
              </div>
              <div className="flex-1 h-full relative min-w-0">
                {dialogueClips.map((clip) => {
                  const wallDur = wallClockClipDuration(clip)
                  const startPercent = (clip.startTime / totalDuration) * 100
                  const widthPercent = (wallDur / totalDuration) * 100
                  const hasSpeed = clip.playbackRate && Math.abs(clip.playbackRate - 1) > 0.02
                  return (
                    <div
                      key={clip.id}
                      onClick={() => onSeekTime?.(clip.startTime)}
                      className="absolute top-1 bottom-1 rounded-sm flex items-center justify-between overflow-hidden px-1.5 cursor-pointer hover:ring-1 hover:ring-blue-400/50"
                      style={{
                        left: `${startPercent}%`,
                        width: `calc(${Math.max(widthPercent, 1)}% - 2px)`,
                        backgroundColor: DIALOGUE_TRACK_VISUAL.bgColor,
                        borderLeft: `2px solid ${DIALOGUE_TRACK_VISUAL.color}`,
                      }}
                      title={`${clip.label || clip.character || clip.id} (${wallDur.toFixed(1)}s)`}
                    >
                      <span className="text-[8px] font-medium text-blue-100 truncate">
                        {clip.label || clip.character || 'Line'}
                      </span>
                      {hasSpeed && (
                        <span className="text-[7px] font-mono text-blue-300 ml-1 shrink-0">
                          {clip.playbackRate}×
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* A2: Narration Track */}
          {narrationClip && narrationClip.duration > 0 && (
            <div className="h-7 relative mb-1.5 rounded bg-zinc-900/50 border border-zinc-800/50 flex">
              <div
                className="sticky left-0 z-20 shrink-0 flex items-center gap-1 px-2 bg-zinc-950 border-r border-zinc-800/90 h-full"
                style={{ width: `${TRACK_HEADER_WIDTH}px` }}
                title={NARRATION_TRACK_VISUAL.tooltip}
              >
                <Mic2
                  className="w-3 h-3 shrink-0"
                  style={{ color: NARRATION_TRACK_VISUAL.color }}
                />
                <span className="text-[10px] font-medium text-purple-300">
                  {NARRATION_TRACK_VISUAL.label}
                </span>
              </div>
              <div className="flex-1 h-full relative min-w-0">
                <div
                  onClick={() => onSeekTime?.(narrationClip.startTime)}
                  className="absolute top-1 bottom-1 rounded-sm flex items-center overflow-hidden px-1.5 cursor-pointer"
                  style={{
                    left: `${(narrationClip.startTime / totalDuration) * 100}%`,
                    width: `calc(${Math.max((narrationClip.duration / totalDuration) * 100, 1)}% - 2px)`,
                    backgroundColor: NARRATION_TRACK_VISUAL.bgColor,
                    borderLeft: `2px solid ${NARRATION_TRACK_VISUAL.color}`,
                  }}
                  title={`Narration (${narrationClip.duration.toFixed(1)}s)`}
                >
                  <span className="text-[8px] font-medium text-purple-200 truncate">
                    Voiceover Narration ({narrationClip.duration.toFixed(1)}s)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* A3: SFX Track */}
          {sfxClips.length > 0 && (
            <div className="h-7 relative mb-1.5 rounded bg-zinc-900/50 border border-zinc-800/50 flex">
              <div
                className="sticky left-0 z-20 shrink-0 flex items-center justify-between px-2 bg-zinc-950 border-r border-zinc-800/90 h-full"
                style={{ width: `${TRACK_HEADER_WIDTH}px` }}
                title={SFX_TRACK_VISUAL.tooltip}
              >
                <div className="flex items-center gap-1">
                  <Sparkles
                    className="w-3 h-3 shrink-0"
                    style={{ color: SFX_TRACK_VISUAL.color }}
                  />
                  <span className="text-[10px] font-medium text-amber-300">
                    {SFX_TRACK_VISUAL.label}
                  </span>
                </div>
                {sfxAutoDuck && (
                  <span
                    className="text-[7px] font-medium px-1 rounded bg-amber-950/90 text-amber-300 border border-amber-500/40"
                    title="Auto-Lower During Speech active (Auto-Duck -8 dB under dialogue/narration)"
                  >
                    Auto
                  </span>
                )}
              </div>
              <div className="flex-1 h-full relative min-w-0">
                {sfxClips.map((sfx, idx) => {
                  const startPercent = (sfx.startTime / totalDuration) * 100
                  const widthPercent = (sfx.duration / totalDuration) * 100
                  const duckPath = sfxAutoDuck
                    ? buildAutoDuckSvgPath(sfx.startTime, sfx.duration, speechWindows)
                    : null
                  return (
                    <div
                      key={sfx.id || `sfx-${idx}`}
                      onClick={() => onSeekTime?.(sfx.startTime)}
                      className="absolute top-1 bottom-1 rounded-sm flex items-center overflow-hidden px-1.5 cursor-pointer"
                      style={{
                        left: `${startPercent}%`,
                        width: `calc(${Math.max(widthPercent, 1.5)}% - 2px)`,
                        backgroundColor: SFX_TRACK_VISUAL.bgColor,
                        borderLeft: `2px solid ${SFX_TRACK_VISUAL.color}`,
                      }}
                      title={`${sfx.description || `SFX #${idx + 1}`}${sfxAutoDuck ? ' • Auto-Duck -8 dB under speech' : ''}`}
                    >
                      {duckPath && (
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
                        >
                          <path
                            d={duckPath}
                            fill="none"
                            stroke="#fcd34d"
                            strokeWidth="6"
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>
                      )}
                      <span className="text-[8px] text-amber-100 truncate relative z-10">
                        {sfx.description || `SFX ${idx + 1}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* A4: Music / Score Track */}
          {musicClips.length > 0 && (
            <div className="h-7 relative mb-1.5 rounded bg-zinc-900/50 border border-zinc-800/50 flex">
              <div
                className="sticky left-0 z-20 shrink-0 flex items-center justify-between px-2 bg-zinc-950 border-r border-zinc-800/90 h-full"
                style={{ width: `${TRACK_HEADER_WIDTH}px` }}
                title={MUSIC_TRACK_VISUAL.tooltip}
              >
                <div className="flex items-center gap-1">
                  <Music
                    className="w-3 h-3 shrink-0"
                    style={{ color: MUSIC_TRACK_VISUAL.color }}
                  />
                  <span className="text-[10px] font-medium text-emerald-300">
                    {MUSIC_TRACK_VISUAL.label}
                  </span>
                </div>
                {musicAutoDuck && (
                  <span
                    className="text-[7px] font-medium px-1 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/40"
                    title="Auto-Lower During Speech active (Auto-Duck -8 dB under dialogue/narration)"
                  >
                    Auto
                  </span>
                )}
              </div>
              <div className="flex-1 h-full relative min-w-0">
                {musicClips.map((mc) => {
                  const startPercent = (mc.startTime / totalDuration) * 100
                  const widthPercent = (mc.duration / totalDuration) * 100
                  const duckPath = musicAutoDuck
                    ? buildAutoDuckSvgPath(mc.startTime, mc.duration, speechWindows)
                    : null
                  return (
                    <div
                      key={mc.id}
                      onClick={() => onSeekTime?.(mc.startTime)}
                      className="absolute top-1 bottom-1 rounded-sm flex items-center justify-between overflow-hidden px-1.5 cursor-pointer"
                      style={{
                        left: `${startPercent}%`,
                        width: `calc(${Math.max(widthPercent, 2)}% - 2px)`,
                        backgroundColor: MUSIC_TRACK_VISUAL.bgColor,
                        borderLeft: `2px solid ${MUSIC_TRACK_VISUAL.color}`,
                      }}
                      title={`${mc.label || 'Score Cue'} (${mc.duration.toFixed(1)}s)${musicAutoDuck ? ' • Auto-Duck -8 dB under speech' : ''}`}
                    >
                      {duckPath && (
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
                        >
                          <path
                            d={duckPath}
                            fill="none"
                            stroke="#6ee7b7"
                            strokeWidth="6"
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>
                      )}
                      <span className="text-[8px] text-emerald-100 truncate relative z-10">
                        {mc.label || 'Score Bed'}
                      </span>
                      {(mc.fadeInSec || mc.fadeOutSec) ? (
                        <span className="text-[7px] font-mono text-emerald-300/80 ml-1 shrink-0 relative z-10">
                          {mc.fadeInSec ? `↗${mc.fadeInSec}s` : ''}{' '}
                          {mc.fadeOutSec ? `↘${mc.fadeOutSec}s` : ''}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* FX1: Text Overlay Track */}
          <div className="h-7 relative rounded bg-zinc-900/50 border border-zinc-800/50 flex">
            <div
              className="sticky left-0 z-20 shrink-0 flex items-center gap-1 px-2 bg-zinc-950 border-r border-zinc-800/90 h-full"
              style={{ width: `${TRACK_HEADER_WIDTH}px` }}
              title={TEXT_TRACK_VISUAL.tooltip}
            >
              <Type
                className="w-3 h-3 shrink-0"
                style={{ color: textOverlays.length > 0 ? TEXT_TRACK_VISUAL.color : '#52525b' }}
              />
              <span
                className={`text-[10px] font-medium ${
                  textOverlays.length > 0 ? 'text-pink-300' : 'text-zinc-600'
                }`}
              >
                {TEXT_TRACK_VISUAL.label}
              </span>
            </div>
            <div className="flex-1 h-full relative min-w-0">
              {textOverlays.map((overlay) => {
                const duration =
                  overlay.timing.duration === -1
                    ? videoTotalDuration - overlay.timing.startTime
                    : overlay.timing.duration
                const startPercent = (overlay.timing.startTime / totalDuration) * 100
                const widthPercent = (duration / totalDuration) * 100
                const isDragging = draggingTextId === overlay.id

                return (
                  <div
                    key={overlay.id}
                    className={`
                      absolute top-1 bottom-1 rounded-sm flex items-center gap-1 px-1.5
                      cursor-grab active:cursor-grabbing select-none
                      transition-shadow duration-100
                      ${isDragging ? 'ring-1 ring-white/50 z-10' : 'hover:ring-1 hover:ring-pink-400/40'}
                      ${disabled || !onTextOverlayChange ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    style={{
                      left: `${startPercent}%`,
                      width: `${Math.max(widthPercent, 3)}%`,
                      backgroundColor: TEXT_TRACK_VISUAL.bgColor,
                      borderLeft: `2px solid ${TEXT_TRACK_VISUAL.color}`,
                    }}
                    onMouseDown={(e) => handleTextDragStart(e, overlay)}
                    title={overlay.text}
                  >
                    <GripVertical className="w-2.5 h-2.5 text-pink-300/70 flex-shrink-0" />
                    <span className="text-[8px] text-pink-100 truncate">
                      {overlay.text.slice(0, 18)}
                      {overlay.text.length > 18 ? '…' : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="px-3 py-2 border-t border-zinc-800/80 bg-zinc-900/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] text-zinc-400">
        <div className="flex items-center gap-1" title="Track V1: Video Shot">
          <div
            className="w-3 h-2 rounded-sm"
            style={{ backgroundColor: 'rgba(6, 182, 212, 0.25)', borderLeft: '2px solid #06b6d4' }}
          />
          <span>Video Shot</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-2 rounded-sm"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.25)', borderLeft: '2px solid #10b981' }}
          />
          <span>Uploaded</span>
        </div>
        <div className="flex items-center gap-1" title="Extended hold/pause tail (Still Frame, 103% Ken Burns Slow Zoom, or Ping-Pong Motion)">
          <div
            className="w-3 h-2 rounded-sm border border-dashed border-amber-400/60"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(245,158,11,0.2), rgba(245,158,11,0.2) 2px, transparent 2px, transparent 4px)',
            }}
          />
          <span>Extended Pause / Hold</span>
        </div>
        <div className="flex items-center gap-1" title="Shot transition join (Cut, Dissolve, or Fade to Black)">
          <ArrowRightLeft className="w-2.5 h-2.5 text-violet-400" />
          <span>Transition (Cut / Dissolve / Fade)</span>
        </div>
        {dialogueClips.length > 0 && (
          <div className="flex items-center gap-1" title="Track A1: Character Dialogue">
            <div
              className="w-3 h-2 rounded-sm"
              style={{
                backgroundColor: DIALOGUE_TRACK_VISUAL.bgColor,
                borderLeft: `2px solid ${DIALOGUE_TRACK_VISUAL.color}`,
              }}
            />
            <span>Dialogue</span>
          </div>
        )}
        {musicClips.length > 0 && (
          <div className="flex items-center gap-1" title="Track A4: Music & Score Cues">
            <div
              className="w-3 h-2 rounded-sm"
              style={{
                backgroundColor: MUSIC_TRACK_VISUAL.bgColor,
                borderLeft: `2px solid ${MUSIC_TRACK_VISUAL.color}`,
              }}
            />
            <span>Music</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-0.5 h-3 bg-red-500" />
          <span>Playhead</span>
        </div>
      </div>
    </div>
  )
}
