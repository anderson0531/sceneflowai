/**
 * MixerTimeline - Compact visual timeline for audio track offsets in the mixer
 * 
 * Shows a horizontal overview of all audio tracks' timing relative to video duration.
 * Allows drag-to-reposition for quick offset adjustments.
 */

'use client'

import React, { useRef, useCallback, useState, useMemo } from 'react'
import { Mic2, MessageSquare, Music, Sparkles, GripVertical, Type, Info } from 'lucide-react'
import type { AudioTrackConfig, MixerAudioTracks, TextOverlay } from './SceneProductionMixer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ============================================================================
// Types
// ============================================================================

interface TrackVisual {
  key: keyof MixerAudioTracks
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
}

export interface AudioClipInfo {
  id: string
  label?: string
  startTime: number
  duration: number
  audioUrl?: string
  character?: string
}

interface MixerTimelineProps {
  audioTracks: MixerAudioTracks
  onTrackChange: (track: keyof MixerAudioTracks, config: AudioTrackConfig) => void
  videoTotalDuration: number
  narrationDuration?: number
  dialogueDuration?: number
  musicDuration?: number
  sfxDuration?: number
  /** Individual dialogue clips for per-line control */
  dialogueClips?: AudioClipInfo[]
  /** Individual SFX clips */
  sfxClips?: AudioClipInfo[]
  /** Text overlays to display on timeline */
  textOverlays?: TextOverlay[]
  /** Callback when text overlay timing changes (drag-to-reposition) */
  onTextOverlayChange?: (overlay: TextOverlay) => void
  disabled?: boolean
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const TRACK_VISUALS: TrackVisual[] = [
  { key: 'narration', label: 'Narr', icon: Mic2, color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.25)' },
  { key: 'dialogue', label: 'Dial', icon: MessageSquare, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.25)' },
  { key: 'sfx', label: 'SFX', icon: Sparkles, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.25)' },
  { key: 'music', label: 'Music', icon: Music, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.25)' },
]

// Text track visual config
const TEXT_TRACK_VISUAL = {
  label: 'Text',
  icon: Type,
  color: '#ec4899',  // Pink
  bgColor: 'rgba(236, 72, 153, 0.25)',
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ============================================================================
// Main Component
// ============================================================================

export function MixerTimeline({
  audioTracks,
  onTrackChange,
  videoTotalDuration,
  narrationDuration = 0,
  dialogueDuration = 0,
  musicDuration = 0,
  sfxDuration = 0,
  dialogueClips = [],
  sfxClips = [],
  textOverlays = [],
  onTextOverlayChange,
  disabled,
  className = '',
}: MixerTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingTrack, setDraggingTrack] = useState<keyof MixerAudioTracks | null>(null)
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null)

  // Duration map
  const durations: Record<keyof MixerAudioTracks, number> = {
    narration: narrationDuration || 5,
    dialogue: dialogueDuration || 5,
    music: musicDuration || 10,
    sfx: sfxDuration || 3,
  }

  // Calculate total timeline duration (max of video or audio end times)
  // Adapts to actual video duration - no artificial 8-second cap
  const totalDuration = useMemo(() => {
    let maxEnd = videoTotalDuration
    for (const key of Object.keys(audioTracks) as Array<keyof MixerAudioTracks>) {
      const track = audioTracks[key]
      if (track.enabled) {
        maxEnd = Math.max(maxEnd, track.startOffset + (durations[key] || 0))
      }
    }
    // Include text overlays in duration calculation
    for (const overlay of textOverlays) {
      const overlayEnd = overlay.timing.startTime + (overlay.timing.duration === -1 ? videoTotalDuration : overlay.timing.duration)
      maxEnd = Math.max(maxEnd, overlayEnd)
    }
    // Minimum of 5 seconds or video duration (no artificial cap)
    return Math.max(maxEnd, Math.max(5, videoTotalDuration))
  }, [audioTracks, videoTotalDuration, durations, textOverlays])

  // Generate ruler ticks - adaptive intervals for any duration
  const ticks = useMemo(() => {
    let interval: number
    if (totalDuration <= 15) interval = 2
    else if (totalDuration <= 30) interval = 5
    else if (totalDuration <= 60) interval = 10
    else if (totalDuration <= 120) interval = 15
    else if (totalDuration <= 300) interval = 30
    else interval = 60
    const count = Math.ceil(totalDuration / interval) + 1
    return Array.from({ length: count }, (_, i) => i * interval).filter(t => t <= totalDuration)
  }, [totalDuration])

  // Handle drag
  const handleDragStart = useCallback((
    e: React.MouseEvent, 
    trackKey: keyof MixerAudioTracks
  ) => {
    if (disabled || !audioTracks[trackKey].enabled) return
    e.preventDefault()
    setDraggingTrack(trackKey)

    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const startX = e.clientX
    const startOffset = audioTracks[trackKey].startOffset

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaPercent = deltaX / containerRect.width
      const deltaSeconds = deltaPercent * totalDuration
      const newOffset = Math.max(0, Math.round((startOffset + deltaSeconds) * 10) / 10)
      onTrackChange(trackKey, { ...audioTracks[trackKey], startOffset: newOffset })
    }

    const handleMouseUp = () => {
      setDraggingTrack(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [disabled, audioTracks, totalDuration, onTrackChange])

  // Handle text overlay drag
  const handleTextDragStart = useCallback((
    e: React.MouseEvent,
    overlay: TextOverlay
  ) => {
    if (disabled || !onTextOverlayChange) return
    e.preventDefault()
    setDraggingTextId(overlay.id)

    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const startX = e.clientX
    const startOffset = overlay.timing.startTime

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaPercent = deltaX / containerRect.width
      const deltaSeconds = deltaPercent * totalDuration
      const newStartTime = Math.max(0, Math.round((startOffset + deltaSeconds) * 10) / 10)
      onTextOverlayChange({
        ...overlay,
        timing: { ...overlay.timing, startTime: newStartTime }
      })
    }

    const handleMouseUp = () => {
      setDraggingTextId(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [disabled, totalDuration, onTextOverlayChange])

  const videoEndPercent = (videoTotalDuration / totalDuration) * 100

  return (
    <div className={`bg-gray-900/60 rounded-lg border border-gray-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-3 py-1.5 bg-gray-800/40 border-b border-gray-700/30 flex items-center justify-between">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Timeline Overview</span>
        <span className="text-[10px] text-gray-500">
          Video: {formatTime(videoTotalDuration)} | Total: {formatTime(totalDuration)}
        </span>
      </div>

      {/* Timeline Content */}
      <div ref={containerRef} className="relative px-3 py-2">
        {/* Ruler */}
        <div className="h-4 relative mb-1 border-b border-gray-700/30">
          {/* Video duration background */}
          <div 
            className="absolute inset-y-0 left-0 bg-gray-700/20"
            style={{ width: `${videoEndPercent}%` }}
          />
          {/* Video end marker */}
          {videoTotalDuration < totalDuration && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-amber-500/50"
              style={{ left: `${videoEndPercent}%` }}
            />
          )}
          {/* Tick marks */}
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: `${(t / totalDuration) * 100}%` }}
            >
              <span className="text-[8px] text-gray-600 -translate-x-1/2">{formatTime(t)}</span>
            </div>
          ))}
        </div>

        {/* Track Bars */}
        <div className="space-y-1">
          {TRACK_VISUALS.map((visual) => {
            const config = audioTracks[visual.key]
            const duration = durations[visual.key]
            const startPercent = (config.startOffset / totalDuration) * 100
            const widthPercent = (duration / totalDuration) * 100
            const endTime = config.startOffset + duration
            const extendsVideo = endTime > videoTotalDuration
            const isDragging = draggingTrack === visual.key

            if (!config.enabled) {
              return (
                <div key={visual.key} className="h-5 flex items-center">
                  <div className="flex items-center gap-1 text-gray-600 text-[10px] opacity-50">
                    <visual.icon className="w-3 h-3" />
                    <span>{visual.label}</span>
                  </div>
                </div>
              )
            }

            return (
              <div key={visual.key} className="h-5 relative">
                {/* Track bar */}
                <div
                  className={`
                    absolute top-0 h-full rounded-sm flex items-center gap-1 px-1.5
                    cursor-grab active:cursor-grabbing select-none
                    transition-shadow duration-100
                    ${isDragging ? 'ring-1 ring-white/40 z-10' : 'hover:ring-1 hover:ring-white/20'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  style={{
                    left: `${startPercent}%`,
                    width: `${Math.max(widthPercent, 4)}%`,
                    backgroundColor: visual.bgColor,
                    borderLeft: `2px solid ${visual.color}`,
                    borderRight: extendsVideo ? `1px dashed ${visual.color}` : undefined,
                  }}
                  onMouseDown={(e) => handleDragStart(e, visual.key)}
                >
                  <GripVertical className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                  <visual.icon className="w-3 h-3 flex-shrink-0" style={{ color: visual.color }} />
                  <span className="text-[9px] text-gray-400 truncate">
                    {formatTime(config.startOffset)}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Text Overlay Track */}
          {textOverlays.length > 0 && (
            <div className="h-5 relative">
              {textOverlays.map((overlay) => {
                const duration = overlay.timing.duration === -1 
                  ? videoTotalDuration - overlay.timing.startTime 
                  : overlay.timing.duration
                const startPercent = (overlay.timing.startTime / totalDuration) * 100
                const widthPercent = (duration / totalDuration) * 100
                const endTime = overlay.timing.startTime + duration
                const extendsVideo = endTime > videoTotalDuration
                const isDragging = draggingTextId === overlay.id

                return (
                  <div
                    key={overlay.id}
                    className={`
                      absolute top-0 h-full rounded-sm flex items-center gap-1 px-1.5
                      cursor-grab active:cursor-grabbing select-none
                      transition-shadow duration-100
                      ${isDragging ? 'ring-1 ring-white/40 z-10' : 'hover:ring-1 hover:ring-white/20'}
                      ${disabled || !onTextOverlayChange ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    style={{
                      left: `${startPercent}%`,
                      width: `${Math.max(widthPercent, 4)}%`,
                      backgroundColor: TEXT_TRACK_VISUAL.bgColor,
                      borderLeft: `2px solid ${TEXT_TRACK_VISUAL.color}`,
                      borderRight: extendsVideo ? `1px dashed ${TEXT_TRACK_VISUAL.color}` : undefined,
                    }}
                    onMouseDown={(e) => handleTextDragStart(e, overlay)}
                    title={overlay.text}
                  >
                    <GripVertical className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                    <Type className="w-3 h-3 flex-shrink-0" style={{ color: TEXT_TRACK_VISUAL.color }} />
                    <span className="text-[9px] text-gray-400 truncate max-w-[60px]">
                      {overlay.text.slice(0, 10)}{overlay.text.length > 10 ? '…' : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty text track placeholder */}
          {textOverlays.length === 0 && (
            <div className="h-5 flex items-center">
              <div className="flex items-center gap-1 text-gray-600 text-[10px] opacity-50">
                <Type className="w-3 h-3" />
                <span>Text</span>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-2 pt-1.5 border-t border-gray-700/30 flex items-center gap-4 text-[9px] text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-700/40 rounded-sm" />
            <span>Video</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-0.5 h-2 bg-amber-500/50" />
            <span>Video End</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm border-r border-dashed" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', borderColor: 'rgba(168, 85, 247, 0.5)' }} />
            <span>Audio extends</span>
          </div>
          {textOverlays.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 cursor-help">
                    <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: TEXT_TRACK_VISUAL.bgColor, borderLeft: `2px solid ${TEXT_TRACK_VISUAL.color}` }} />
                    <span>Text</span>
                    <Info className="w-2.5 h-2.5 text-gray-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p className="text-xs">
                    <strong>Preview vs Final Render:</strong> Text overlays are shown as CSS overlays in preview. 
                    The final rendered video will burn text using FFmpeg, which may appear slightly different.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  )
}

export default MixerTimeline
