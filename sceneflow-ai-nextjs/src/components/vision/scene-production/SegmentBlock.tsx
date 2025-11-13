'use client'

import { memo } from 'react'
import { SceneSegment } from './types'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SegmentBlockProps {
  segment: SceneSegment
  isSelected: boolean
  onSelect: (segmentId: string) => void
}

const statusIconMap: Record<SceneSegment['status'], React.ReactNode> = {
  DRAFT: <PlayCircle className="w-4 h-4 text-gray-400" />,
  READY: <PlayCircle className="w-4 h-4 text-sf-primary" />,
  GENERATING: <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />,
  COMPLETE: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  UPLOADED: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
  ERROR: <AlertCircle className="w-4 h-4 text-red-500" />,
}

const statusLabelMap: Record<SceneSegment['status'], string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  GENERATING: 'Generating',
  COMPLETE: 'Complete',
  UPLOADED: 'Uploaded',
  ERROR: 'Needs Attention',
}

export const SegmentBlock = memo(({ segment, isSelected, onSelect }: SegmentBlockProps) => {
  const duration = segment.endTime - segment.startTime
  const startLabel = new Date(segment.startTime * 1000).toISOString().substr(14, 5)
  const endLabel = new Date(segment.endTime * 1000).toISOString().substr(14, 5)

  return (
    <button
      type="button"
      onClick={() => onSelect(segment.segmentId)}
      className={cn(
        'flex flex-col gap-2 rounded-lg border px-3 py-2 text-left transition-all',
        isSelected
          ? 'border-sf-primary ring-2 ring-sf-primary/40 bg-sf-primary/5'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
          Segment {segment.sequenceIndex + 1}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          {statusIconMap[segment.status]}
          <span>{statusLabelMap[segment.status]}</span>
        </div>
      </div>

      <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
        {startLabel} – {endLabel} <span className="text-xs text-gray-500">({duration.toFixed(1)}s)</span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{segment.assetType ? segment.assetType.toUpperCase() : 'No Asset'}</Badge>
          <span>{segment.takes.length} takes</span>
        </div>
        <span>#{segment.segmentId.slice(0, 6)}</span>
      </div>
    </button>
  )
})

SegmentBlock.displayName = 'SegmentBlock'

