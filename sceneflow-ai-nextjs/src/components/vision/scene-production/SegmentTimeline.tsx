'use client'

import { useState } from 'react'
import { SegmentBlock } from './SegmentBlock'
import { SceneSegment } from './types'

interface SegmentTimelineProps {
  segments: SceneSegment[]
  selectedSegmentId?: string
  onSelect: (segmentId: string) => void
}

export function SegmentTimeline({ segments, selectedSegmentId, onSelect }: SegmentTimelineProps) {
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

  if (segments.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        No segments yet. Initialize scene production to create segments and prompts.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
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
  )
}

