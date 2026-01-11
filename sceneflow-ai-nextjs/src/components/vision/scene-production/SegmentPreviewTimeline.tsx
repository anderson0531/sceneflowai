'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Film,
  Volume2,
  MessageSquare,
  GripVertical,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { SceneBible, ProposedSegment } from './SegmentBuilder'

// ============================================================================
// Types & Interfaces
// ============================================================================

interface SegmentPreviewTimelineProps {
  segments: ProposedSegment[]
  sceneBible: SceneBible
  selectedSegmentId: string | null
  onSelectSegment: (segmentId: string) => void
  onAdjustSegment: (
    segmentId: string,
    changes: { startTime?: number; endTime?: number }
  ) => void
  totalDuration: number
}

interface AudioBeat {
  id: string
  type: 'narration' | 'dialogue'
  characterName?: string
  text: string
  startTime: number
  duration: number
}

// ============================================================================
// Constants
// ============================================================================

const MIN_SEGMENT_DURATION = 2 // seconds
const MAX_SEGMENT_DURATION = 8 // seconds
const PIXELS_PER_SECOND = 60 // Timeline scale
const SNAP_THRESHOLD = 0.15 // seconds - snap to audio boundaries

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Estimate audio timing from dialogue/narration text
 * Average speaking rate: ~150 words per minute = 2.5 words per second
 */
function estimateAudioDuration(text: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const wordsPerSecond = 2.5
  return Math.max(1, wordCount / wordsPerSecond)
}

/**
 * Generate audio beats from scene bible
 */
function generateAudioBeats(sceneBible: SceneBible): AudioBeat[] {
  const beats: AudioBeat[] = []
  let currentTime = 0

  // Add narration as first beat if present
  if (sceneBible.narration) {
    const duration = estimateAudioDuration(sceneBible.narration)
    beats.push({
      id: 'narration',
      type: 'narration',
      text: sceneBible.narration,
      startTime: currentTime,
      duration,
    })
    currentTime += duration + 0.5 // Small gap after narration
  }

  // Add dialogue lines as sequential beats
  sceneBible.dialogue.forEach((line, idx) => {
    const duration = estimateAudioDuration(line.text)
    beats.push({
      id: line.id,
      type: 'dialogue',
      characterName: line.character,
      text: line.text,
      startTime: currentTime,
      duration,
    })
    currentTime += duration + 0.3 // Gap between dialogue lines
  })

  return beats
}

/**
 * Format time as MM:SS.s
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(1)
  return mins > 0 ? `${mins}:${secs.padStart(4, '0')}` : `${secs}s`
}

// ============================================================================
// Timeline Segment Block Component
// ============================================================================

interface SegmentBlockProps {
  segment: ProposedSegment
  isSelected: boolean
  pixelsPerSecond: number
  onSelect: () => void
  onDragStart: (edge: 'left' | 'right', startX: number) => void
}

function SegmentBlock({
  segment,
  isSelected,
  pixelsPerSecond,
  onSelect,
  onDragStart,
}: SegmentBlockProps) {
  const width = segment.duration * pixelsPerSecond
  const left = segment.startTime * pixelsPerSecond

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'I2V': return 'bg-blue-500/20 border-blue-500/50'
      case 'T2V': return 'bg-purple-500/20 border-purple-500/50'
      case 'FTV': return 'bg-green-500/20 border-green-500/50'
      case 'EXT': return 'bg-amber-500/20 border-amber-500/50'
      default: return 'bg-muted border-border'
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'absolute top-0 h-full border rounded cursor-pointer transition-all',
              'flex items-center justify-center overflow-hidden',
              getMethodColor(segment.generationMethod),
              isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
              segment.validation && !segment.validation.isValid && 'border-red-500 border-2'
            )}
            style={{ left, width }}
            onClick={onSelect}
          >
            {/* Left drag handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 flex items-center justify-center"
              onMouseDown={(e) => {
                e.stopPropagation()
                onDragStart('left', e.clientX)
              }}
            >
              <GripVertical className="w-3 h-3 text-white/50" />
            </div>

            {/* Content */}
            <div className="flex flex-col items-center px-2 truncate">
              <span className="text-[10px] font-medium text-foreground">
                S{segment.sequenceIndex + 1}
              </span>
              <span className="text-[9px] text-muted-foreground">
                {segment.duration.toFixed(1)}s
              </span>
            </div>

            {/* Right drag handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 flex items-center justify-center"
              onMouseDown={(e) => {
                e.stopPropagation()
                onDragStart('right', e.clientX)
              }}
            >
              <GripVertical className="w-3 h-3 text-white/50" />
            </div>

            {/* Status indicators */}
            {segment.isAdjusted && (
              <div className="absolute top-1 right-1">
                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-yellow-500/20 border-yellow-500/50">
                  Edited
                </Badge>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Segment {segment.sequenceIndex + 1}</p>
            <p className="text-xs text-muted-foreground">{segment.triggerReason}</p>
            <p className="text-xs">Method: {segment.generationMethod} • Confidence: {segment.confidence}%</p>
            {segment.dialogueLineIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {segment.dialogueLineIds.length} dialogue line(s)
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// Audio Beat Track Component
// ============================================================================

interface AudioBeatTrackProps {
  beats: AudioBeat[]
  pixelsPerSecond: number
  type: 'narration' | 'dialogue'
}

function AudioBeatTrack({ beats, pixelsPerSecond, type }: AudioBeatTrackProps) {
  const filteredBeats = beats.filter(b => b.type === type)
  
  const trackColor = type === 'narration' 
    ? 'bg-emerald-500/30 border-emerald-500/50' 
    : 'bg-sky-500/30 border-sky-500/50'

  const icon = type === 'narration' 
    ? <Volume2 className="w-3 h-3" /> 
    : <MessageSquare className="w-3 h-3" />

  return (
    <div className="flex items-center gap-2">
      {/* Track Label */}
      <div className="w-20 flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        {icon}
        <span className="capitalize">{type}</span>
      </div>

      {/* Track Content */}
      <div className="flex-1 h-6 relative bg-muted/30 rounded overflow-hidden">
        {filteredBeats.map(beat => {
          const left = beat.startTime * pixelsPerSecond
          const width = beat.duration * pixelsPerSecond

          return (
            <TooltipProvider key={beat.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'absolute top-1 bottom-1 rounded border flex items-center px-1 overflow-hidden',
                      trackColor
                    )}
                    style={{ left, width }}
                  >
                    <span className="text-[9px] text-foreground/80 truncate">
                      {beat.characterName ? `${beat.characterName}: ` : ''}
                      {beat.text.substring(0, 30)}...
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">
                    {beat.characterName && <strong>{beat.characterName}: </strong>}
                    {beat.text}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatTime(beat.startTime)} - {formatTime(beat.startTime + beat.duration)}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SegmentPreviewTimeline({
  segments,
  sceneBible,
  selectedSegmentId,
  onSelectSegment,
  onAdjustSegment,
  totalDuration,
}: SegmentPreviewTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragState, setDragState] = useState<{
    segmentId: string
    edge: 'left' | 'right'
    startX: number
    originalStartTime: number
    originalEndTime: number
  } | null>(null)

  // Generate audio beats from scene bible
  const audioBeats = useMemo(() => generateAudioBeats(sceneBible), [sceneBible])

  // Calculate timeline width based on content
  const timelineWidth = useMemo(() => {
    const contentDuration = Math.max(
      totalDuration,
      audioBeats.length > 0 
        ? Math.max(...audioBeats.map(b => b.startTime + b.duration))
        : 0
    )
    return Math.max(600, contentDuration * PIXELS_PER_SECOND + 100)
  }, [totalDuration, audioBeats])

  // Time markers
  const timeMarkers = useMemo(() => {
    const markers: number[] = []
    const duration = timelineWidth / PIXELS_PER_SECOND
    for (let t = 0; t <= duration; t += 5) {
      markers.push(t)
    }
    return markers
  }, [timelineWidth])

  // Handle drag to resize segments
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return

    const deltaX = e.clientX - dragState.startX
    const deltaTime = deltaX / PIXELS_PER_SECOND

    let newStartTime = dragState.originalStartTime
    let newEndTime = dragState.originalEndTime

    if (dragState.edge === 'left') {
      newStartTime = Math.max(0, dragState.originalStartTime + deltaTime)
      // Enforce minimum duration
      if (newEndTime - newStartTime < MIN_SEGMENT_DURATION) {
        newStartTime = newEndTime - MIN_SEGMENT_DURATION
      }
      // Enforce maximum duration
      if (newEndTime - newStartTime > MAX_SEGMENT_DURATION) {
        newStartTime = newEndTime - MAX_SEGMENT_DURATION
      }
    } else {
      newEndTime = Math.max(newStartTime + MIN_SEGMENT_DURATION, dragState.originalEndTime + deltaTime)
      // Enforce maximum duration
      if (newEndTime - newStartTime > MAX_SEGMENT_DURATION) {
        newEndTime = newStartTime + MAX_SEGMENT_DURATION
      }
    }

    // Snap to audio beat boundaries
    const snapToBeats = audioBeats.flatMap(b => [b.startTime, b.startTime + b.duration])
    const snapTarget = dragState.edge === 'left' ? newStartTime : newEndTime

    for (const beatTime of snapToBeats) {
      if (Math.abs(snapTarget - beatTime) < SNAP_THRESHOLD) {
        if (dragState.edge === 'left') {
          newStartTime = beatTime
        } else {
          newEndTime = beatTime
        }
        break
      }
    }

    onAdjustSegment(dragState.segmentId, { startTime: newStartTime, endTime: newEndTime })
  }, [dragState, audioBeats, onAdjustSegment])

  const handleMouseUp = useCallback(() => {
    setDragState(null)
  }, [])

  const handleDragStart = useCallback((
    segmentId: string,
    edge: 'left' | 'right',
    startX: number
  ) => {
    const segment = segments.find(s => s.id === segmentId)
    if (!segment) return

    setDragState({
      segmentId,
      edge,
      startX,
      originalStartTime: segment.startTime,
      originalEndTime: segment.endTime,
    })
  }, [segments])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Segment Timeline</span>
          <Badge variant="outline" className="text-[10px]">
            {segments.length} segments • {formatTime(totalDuration)}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Drag edges to adjust segment boundaries</span>
          <Badge variant="secondary" className="text-[9px]">
            Snaps to audio
          </Badge>
        </div>
      </div>

      {/* Timeline Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto relative bg-background rounded border border-border"
        onMouseMove={dragState ? handleMouseMove : undefined}
        onMouseUp={dragState ? handleMouseUp : undefined}
        onMouseLeave={dragState ? handleMouseUp : undefined}
      >
        <div style={{ width: timelineWidth, minWidth: '100%' }} className="h-full">
          {/* Time Ruler */}
          <div className="h-6 border-b border-border flex items-end relative">
            {timeMarkers.map(time => (
              <div
                key={time}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: time * PIXELS_PER_SECOND }}
              >
                <span className="text-[9px] text-muted-foreground mb-1">
                  {formatTime(time)}
                </span>
                <div className="w-px h-2 bg-border" />
              </div>
            ))}
          </div>

          {/* Segments Track */}
          <div className="h-10 relative bg-muted/20">
            {segments.map(segment => (
              <SegmentBlock
                key={segment.id}
                segment={segment}
                isSelected={segment.id === selectedSegmentId}
                pixelsPerSecond={PIXELS_PER_SECOND}
                onSelect={() => onSelectSegment(segment.id)}
                onDragStart={(edge, startX) => handleDragStart(segment.id, edge, startX)}
              />
            ))}
          </div>

          {/* Audio Tracks */}
          <div className="py-2 px-1 space-y-1 bg-muted/10">
            {sceneBible.narration && (
              <AudioBeatTrack
                beats={audioBeats}
                pixelsPerSecond={PIXELS_PER_SECOND}
                type="narration"
              />
            )}
            {sceneBible.dialogue.length > 0 && (
              <AudioBeatTrack
                beats={audioBeats}
                pixelsPerSecond={PIXELS_PER_SECOND}
                type="dialogue"
              />
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/50" />
          <span>I2V</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/50" />
          <span>T2V</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
          <span>FTV</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/50" />
          <span>EXT</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
          <span>Narration</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-sky-500/30 border border-sky-500/50" />
          <span>Dialogue</span>
        </div>
      </div>
    </div>
  )
}

export default SegmentPreviewTimeline
