'use client'

import { memo } from 'react'
import { SceneSegment } from './types'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, AlertCircle, CheckCircle2, Loader2, Film, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SegmentBlockProps {
  segment: SceneSegment
  isSelected: boolean
  onSelect: (segmentId: string) => void
  isExpanded?: boolean
  onToggleExpand?: (segmentId: string) => void
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

export const SegmentBlock = memo(({ segment, isSelected, onSelect, isExpanded = false, onToggleExpand }: SegmentBlockProps) => {
  const duration = segment.endTime - segment.startTime
  const startLabel =
    segment.timecodeStart ??
    new Date(segment.startTime * 1000).toISOString().substring(14, 19)
  const endLabel =
    segment.timecodeEnd ??
    new Date(segment.endTime * 1000).toISOString().substring(14, 19)

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpand?.(segment.segmentId)
  }

  const handleCardClick = () => {
    onSelect(segment.segmentId)
  }

  // Get first line of visual beat for collapsed view
  const firstLine = segment.visualBeat ? segment.visualBeat.split('\n')[0].trim() : null

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border-2 transition-all flex-shrink-0 bg-white dark:bg-gray-900 shadow-sm',
        'min-w-[280px] max-w-[360px] flex-1',
        isSelected
          ? 'border-sf-primary ring-2 ring-sf-primary/40 bg-sf-primary/5'
          : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
      )}
    >
      <button
        type="button"
        onClick={handleCardClick}
        className="flex flex-col gap-2.5 px-4 py-3 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            Segment {segment.sequenceIndex + 1}
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
            {statusIconMap[segment.status]}
            <span>{statusLabelMap[segment.status]}</span>
          </div>
        </div>

        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {startLabel} – {endLabel} <span className="text-sm font-normal text-gray-600 dark:text-gray-400">({duration.toFixed(1)}s)</span>
        </div>

        {segment.visualBeat ? (
          <div className={cn(
            'text-sm text-gray-700 dark:text-gray-200 leading-relaxed',
            isExpanded ? '' : 'line-clamp-1'
          )}>
            {isExpanded ? segment.visualBeat : firstLine}
          </div>
        ) : null}

        {isExpanded && (
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2 flex-wrap">
              {segment.transition ? (
                <span className="inline-flex items-center gap-1">
                  <Film className="w-3 h-3" />
                  <span className="uppercase tracking-wide text-xs">{segment.transition.replace('TRANSITION:', '').trim()}</span>
                </span>
              ) : null}
              <Badge variant="secondary" className="text-xs">{segment.assetType ? segment.assetType.toUpperCase() : 'No Asset'}</Badge>
              <span className="font-medium">{segment.takes.length} takes</span>
            </div>
            <span className="font-mono text-[10px]">#{segment.segmentId.slice(0, 6)}</span>
          </div>
        )}
      </button>

      {/* Expand/Collapse button */}
      {segment.visualBeat && (
        <button
          type="button"
          onClick={handleToggleClick}
          className="flex items-center justify-center gap-1 px-4 pb-3 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors border-t border-gray-200 dark:border-gray-700"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>Show more</span>
            </>
          )}
        </button>
      )}

      {/* Compact footer when collapsed */}
      {!isExpanded && (
        <div className="flex items-center justify-between px-4 pb-3 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 flex-wrap">
            {segment.transition && (
              <span className="inline-flex items-center gap-1">
                <Film className="w-3 h-3" />
                <span className="uppercase tracking-wide text-xs">{segment.transition.replace('TRANSITION:', '').trim()}</span>
              </span>
            )}
            <Badge variant="secondary" className="text-xs">{segment.assetType ? segment.assetType.toUpperCase() : 'No Asset'}</Badge>
            <span className="font-medium">{segment.takes.length} takes</span>
          </div>
          <span className="font-mono text-[10px]">#{segment.segmentId.slice(0, 6)}</span>
        </div>
      )}
    </div>
  )
})

SegmentBlock.displayName = 'SegmentBlock'

