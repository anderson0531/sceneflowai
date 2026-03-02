/**
 * MixerTimeline - Full-width visual timeline for audio track offsets in the mixer
 * 
 * Shows a horizontal overview of all audio tracks' timing relative to video duration.
 * Allows drag-to-reposition for quick offset adjustments.
 * Features: horizontal scroll for long videos, zoom controls, segment visualization
 */

'use client'

import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react'
import { Mic2, MessageSquare, Music, Sparkles, GripVertical, Type, Info, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import type { AudioTrackConfig, MixerAudioTracks, TextOverlay } from './SceneProductionMixer'
import type { SceneSegment } from './types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/Button'

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
  /** Video segments to show on timeline */
  segments?: SceneSegment[]
  /** Current playback time for playhead position */
  currentPlaybackTime?: number
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
  segments = [],
  currentPlaybackTime = 0,
  disabled,
  className = '',
}: MixerTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [draggingTrack, setDraggingTrack] = useState<keyof MixerAudioTracks | null>(null)
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null)
  
  // Zoom state: pixels per second (higher = more zoomed in)
  const [pixelsPerSecond, setPixelsPerSecond] = useState(30)
  const MIN_PPS = 10  // Minimum zoom (zoomed out)
  const MAX_PPS = 100 // Maximum zoom (zoomed in)

  // Duration map
  const durations: Record<keyof MixerAudioTracks, number> = {
    narration: narrationDuration || 5,
    dialogue: dialogueDuration || 5,
    music: musicDuration || 10,
    sfx: sfxDuration || 3,
  }

  // Calculate total timeline duration (max of video or audio end times)
  // Adapts to actual video duration - no artificial 8-second cap
  // NOTE: Music track does NOT extend duration - it loops/fades within video duration
  const totalDuration = useMemo(() => {
    let maxEnd = videoTotalDuration
    for (const key of Object.keys(audioTracks) as Array<keyof MixerAudioTracks>) {
      const track = audioTracks[key]
      if (track.enabled) {
        // Music should NOT extend the render duration - it loops or fades within video
        // Only narration, dialogue, and sfx can extend the duration
        if (key === 'music') {
          // Music is capped to video duration
          continue
        }
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

  // Calculate timeline width based on zoom level
  const timelineWidth = totalDuration * pixelsPerSecond
  const minWidth = 600 // Minimum timeline width in pixels
  const effectiveWidth = Math.max(timelineWidth, minWidth)
  
  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setPixelsPerSecond(prev => Math.min(MAX_PPS, prev + 10))
  }, [])
  
  const handleZoomOut = useCallback(() => {
    setPixelsPerSecond(prev => Math.max(MIN_PPS, prev - 10))
  }, [])
  
  const handleZoomFit = useCallback(() => {
    // Fit timeline to container width
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth - 48 // Account for padding
      const fittedPPS = Math.max(MIN_PPS, Math.min(MAX_PPS, containerWidth / totalDuration))
      setPixelsPerSecond(fittedPPS)
    }
  }, [totalDuration])
  
  // Auto-scroll to follow playhead
  useEffect(() => {
    if (scrollContainerRef.current && currentPlaybackTime > 0) {
      const playheadX = (currentPlaybackTime / totalDuration) * effectiveWidth
      const container = scrollContainerRef.current
      const containerWidth = container.clientWidth
      const scrollLeft = container.scrollLeft
      
      // If playhead is outside visible area, scroll to it
      if (playheadX < scrollLeft + 50 || playheadX > scrollLeft + containerWidth - 50) {
        container.scrollTo({
          left: Math.max(0, playheadX - containerWidth / 2),
          behavior: 'smooth'
        })
      }
    }
  }, [currentPlaybackTime, totalDuration, effectiveWidth])
  
  // Calculate segment positions for video track
  const segmentPositions = useMemo(() => {
    let elapsed = 0
    return segments.map(seg => {
      const duration = seg.actualVideoDuration ?? (seg.endTime - seg.startTime)
      const pos = { start: elapsed, duration, segment: seg }
      elapsed += duration
      return pos
    })
  }, [segments])

  return (
    <div className={`bg-gray-900/60 rounded-lg border border-gray-700/50 overflow-hidden ${className}`}>
      {/* Header with zoom controls */}
      <div className="px-3 py-2 bg-gray-800/40 border-b border-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-400">Timeline</span>
          <span className="text-[10px] text-gray-500">
            Video: {formatTime(videoTotalDuration)} | Total: {formatTime(totalDuration)}
          </span>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={pixelsPerSecond <= MIN_PPS}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[10px] text-gray-500 w-10 text-center">{pixelsPerSecond}px/s</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={pixelsPerSecond >= MAX_PPS}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomFit}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            title="Fit to view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Scrollable Timeline Content */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
        style={{ maxHeight: '280px' }}
      >
        <div 
          ref={containerRef} 
          className="relative px-3 py-3"
          style={{ width: `${effectiveWidth + 48}px`, minWidth: '100%' }}
        >
          {/* Playhead */}
          {currentPlaybackTime > 0 && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{ left: `${24 + (currentPlaybackTime / totalDuration) * effectiveWidth}px` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rotate-45" />
            </div>
          )}
          
          {/* Ruler */}
          <div className="h-5 relative mb-2 border-b border-gray-700/30">
            {/* Tick marks */}
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${(t / totalDuration) * effectiveWidth}px` }}
              >
                <div className="w-px h-2 bg-gray-600" />
                <span className="text-[9px] text-gray-500 -translate-x-1/2 mt-0.5">{formatTime(t)}</span>
              </div>
            ))}
          </div>

          {/* Video Segments Track */}
          <div className="h-8 relative mb-2 rounded bg-gray-800/30">
            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center">
              <span className="text-[10px] text-gray-500 font-medium pl-1">Video</span>
            </div>
            <div className="ml-12 h-full relative">
              {segmentPositions.map((pos, idx) => {
                const startPercent = (pos.start / totalDuration) * 100
                const widthPercent = (pos.duration / totalDuration) * 100
                const isUserUpload = pos.segment.isUserUpload
                
                return (
                  <div
                    key={pos.segment.segmentId}
                    className="absolute top-1 bottom-1 rounded-sm flex items-center overflow-hidden"
                    style={{
                      left: `${startPercent}%`,
                      width: `${Math.max(widthPercent, 1)}%`,
                      backgroundColor: isUserUpload ? 'rgba(34, 197, 94, 0.3)' : 'rgba(168, 85, 247, 0.3)',
                      borderLeft: `2px solid ${isUserUpload ? '#22c55e' : '#a855f7'}`,
                    }}
                    title={`Seg ${idx + 1}: ${pos.duration.toFixed(1)}s${isUserUpload ? ' (upload)' : ''}`}
                  >
                    <span className="text-[8px] text-white/60 px-1 truncate">
                      {idx + 1}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Audio Track Bars */}
          <div className="space-y-1.5">
            {TRACK_VISUALS.map((visual) => {
              const config = audioTracks[visual.key]
              const duration = durations[visual.key]
              const startPercent = (config.startOffset / totalDuration) * 100
              const widthPercent = (duration / totalDuration) * 100
              const endTime = config.startOffset + duration
              const extendsVideo = endTime > videoTotalDuration
              const isDragging = draggingTrack === visual.key

              return (
                <div key={visual.key} className="h-7 relative rounded bg-gray-800/30">
                  {/* Track label */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center">
                    <visual.icon className="w-3 h-3 ml-1" style={{ color: config.enabled ? visual.color : '#6b7280' }} />
                    <span className={`text-[10px] ml-1 ${config.enabled ? 'text-gray-400' : 'text-gray-600'}`}>
                      {visual.label}
                    </span>
                  </div>
                  
                  {/* Track content area */}
                  <div className="ml-12 h-full relative">
                    {config.enabled && (
                      <div
                        className={`
                          absolute top-1 bottom-1 rounded-sm flex items-center gap-1 px-1.5
                          cursor-grab active:cursor-grabbing select-none
                          transition-shadow duration-100
                          ${isDragging ? 'ring-1 ring-white/40 z-10' : 'hover:ring-1 hover:ring-white/20'}
                          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        style={{
                          left: `${startPercent}%`,
                          width: `${Math.max(widthPercent, 3)}%`,
                          backgroundColor: visual.bgColor,
                          borderLeft: `2px solid ${visual.color}`,
                          borderRight: extendsVideo ? `1px dashed ${visual.color}` : undefined,
                        }}
                        onMouseDown={(e) => handleDragStart(e, visual.key)}
                      >
                        <GripVertical className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                        <span className="text-[9px] text-gray-400 truncate">
                          {formatTime(config.startOffset)} - {formatTime(endTime)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Text Overlay Track */}
            <div className="h-7 relative rounded bg-gray-800/30">
              <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center">
                <Type className="w-3 h-3 ml-1" style={{ color: textOverlays.length > 0 ? TEXT_TRACK_VISUAL.color : '#6b7280' }} />
                <span className={`text-[10px] ml-1 ${textOverlays.length > 0 ? 'text-gray-400' : 'text-gray-600'}`}>
                  Text
                </span>
              </div>
              <div className="ml-12 h-full relative">
                {textOverlays.map((overlay) => {
                  const duration = overlay.timing.duration === -1 
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
                        ${isDragging ? 'ring-1 ring-white/40 z-10' : 'hover:ring-1 hover:ring-white/20'}
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
                      <GripVertical className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                      <span className="text-[8px] text-gray-400 truncate">
                        {overlay.text.slice(0, 15)}{overlay.text.length > 15 ? '…' : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 pt-2 border-t border-gray-700/30 flex items-center gap-4 text-[9px] text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(168, 85, 247, 0.3)', borderLeft: '2px solid #a855f7' }} />
              <span>AI Video</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.3)', borderLeft: '2px solid #22c55e' }} />
              <span>Uploaded</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-0.5 h-3 bg-red-500" />
              <span>Playhead</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm border-r border-dashed" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', borderColor: 'rgba(168, 85, 247, 0.5)' }} />
              <span>Extends video</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MixerTimeline
