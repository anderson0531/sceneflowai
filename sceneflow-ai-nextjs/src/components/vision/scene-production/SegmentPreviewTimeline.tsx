'use client'

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Film, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ProposedSegment } from './types'

// ============================================================================
// Types & Interfaces
// ============================================================================

interface SegmentPreviewTimelineProps {
  segments: ProposedSegment[]
  selectedSegmentId: string | null
  onSelectSegment: (segmentId: string) => void
  totalDuration: number
  /** @deprecated No longer used — kept for API compat */
  sceneBible?: unknown
  /** @deprecated No longer used — kept for API compat */
  onAdjustSegment?: (
    segmentId: string,
    changes: { startTime?: number; endTime?: number }
  ) => void
}

// ============================================================================
// Constants & Helpers
// ============================================================================

const METHOD_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  I2V: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  T2V: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' },
  FTV: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
  EXT: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' },
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(1)
  return mins > 0 ? `${mins}:${secs.padStart(4, '0')}` : `${secs}s`
}

// ============================================================================
// Segment Pill Component
// ============================================================================

interface SegmentPillProps {
  segment: ProposedSegment
  isSelected: boolean
  onSelect: () => void
}

function SegmentPill({ segment, isSelected, onSelect }: SegmentPillProps) {
  const colors = METHOD_COLORS[segment.generationMethod] ?? {
    bg: 'bg-muted',
    border: 'border-border',
    text: 'text-muted-foreground',
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onSelect}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
              'hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              colors.bg, colors.border,
              isSelected
                ? 'ring-2 ring-primary ring-offset-1 ring-offset-background shadow-md'
                : 'opacity-80 hover:opacity-100',
              segment.isAdjusted && 'ring-1 ring-yellow-500/50',
            )}
          >
            {/* Method dot */}
            <span className={cn('w-1.5 h-1.5 rounded-full', colors.text, 'bg-current')} />
            <span className="text-foreground whitespace-nowrap">
              S{segment.sequenceIndex + 1}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground tabular-nums">
              {segment.duration.toFixed(1)}s
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Segment {segment.sequenceIndex + 1}</p>
            <p className="text-xs text-muted-foreground">{segment.triggerReason}</p>
            <p className="text-xs">
              Method: {segment.generationMethod} · Confidence: {segment.confidence}%
            </p>
            {segment.dialogueLineIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {segment.dialogueLineIds.length} dialogue line(s)
              </p>
            )}
            {segment.isAdjusted && (
              <p className="text-xs text-yellow-400">Manually adjusted</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// Main Component — Compact Segment Navigator
// ============================================================================

export function SegmentPreviewTimeline({
  segments,
  selectedSegmentId,
  onSelectSegment,
  totalDuration,
}: SegmentPreviewTimelineProps) {
  const selectedIndex = useMemo(
    () => segments.findIndex(s => s.id === selectedSegmentId),
    [segments, selectedSegmentId],
  )

  const handlePrev = () => {
    if (selectedIndex > 0) onSelectSegment(segments[selectedIndex - 1].id)
  }

  const handleNext = () => {
    if (selectedIndex < segments.length - 1) onSelectSegment(segments[selectedIndex + 1].id)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Segments</span>
          <Badge variant="outline" className="text-[10px]">
            {segments.length} segments · {formatTime(totalDuration)}
          </Badge>
        </div>

        {/* Prev / Next arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            disabled={selectedIndex <= 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            aria-label="Previous segment"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums min-w-[3ch] text-center">
            {selectedIndex >= 0 ? selectedIndex + 1 : '—'}/{segments.length}
          </span>
          <button
            onClick={handleNext}
            disabled={selectedIndex >= segments.length - 1 || selectedIndex < 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            aria-label="Next segment"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pill strip */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {segments.map(seg => (
          <SegmentPill
            key={seg.id}
            segment={seg}
            isSelected={seg.id === selectedSegmentId}
            onSelect={() => onSelectSegment(seg.id)}
          />
        ))}
      </div>

      {/* Method legend */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {Object.entries(METHOD_COLORS).map(([method, c]) => (
          <div key={method} className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', c.bg, c.border, 'border')} />
            <span>{method}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SegmentPreviewTimeline
