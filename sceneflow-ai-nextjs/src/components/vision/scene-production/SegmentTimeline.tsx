'use client'

import { useState, useMemo } from 'react'
import { SegmentBlock } from './SegmentBlock'
import { SceneSegment } from './types'

interface SegmentTimelineProps {
  segments: SceneSegment[]
  selectedSegmentId?: string
  onSelect: (segmentId: string) => void
  // Audio track data (optional for now, will be enhanced later)
  audioTracks?: {
    narration?: { url?: string; startTime: number; duration: number }
    dialogue?: Array<{ url?: string; startTime: number; duration: number; character?: string }>
    sfx?: Array<{ url?: string; startTime: number; duration: number; description?: string }>
    music?: { url?: string; startTime: number; duration: number }
  }
}

export function SegmentTimeline({ segments, selectedSegmentId, onSelect, audioTracks }: SegmentTimelineProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set())

  const handleToggleExpand = (segmentId: string) => {
    setExpandedSegments((prev) => {
      const next = new Set(prev)
      if (next.has(segmentId)) {
        next.delete(segmentId)
      } else {
        next.add(segmentId)
      }
      return next
    })
  }

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (segments.length === 0) return 0
    const lastSegment = segments[segments.length - 1]
    return lastSegment.endTime
  }, [segments])

  if (segments.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        No segments yet. Initialize scene production to create segments and prompts.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
        <span className="font-mono">Timeline: 0:00 - {formatTime(totalDuration)}</span>
        <span className="text-gray-400">{segments.length} segment{segments.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Responsive Segment Cards Timeline */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto p-3">
          <div className="flex gap-3">
            {segments.map((segment) => (
              <SegmentBlock
                key={segment.segmentId}
                segment={segment}
                isSelected={segment.segmentId === selectedSegmentId}
                onSelect={onSelect}
                isExpanded={expandedSegments.has(segment.segmentId)}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
