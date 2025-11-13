'use client'

import { SegmentBlock } from './SegmentBlock'
import { SceneSegment } from './types'

interface SegmentTimelineProps {
  segments: SceneSegment[]
  selectedSegmentId?: string
  onSelect: (segmentId: string) => void
}

export function SegmentTimeline({ segments, selectedSegmentId, onSelect }: SegmentTimelineProps) {
  if (segments.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        No segments yet. Initialize scene production to create segments and prompts.
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {segments.map((segment) => (
        <SegmentBlock
          key={segment.segmentId}
          segment={segment}
          isSelected={segment.segmentId === selectedSegmentId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

