'use client'

import { memo } from 'react'
import { SceneSegment } from './types'
import { Badge } from '@/components/ui/badge'
import { 
  PlayCircle, AlertCircle, CheckCircle2, Loader2, 
  Film, Video, Image, Upload, Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface VerticalSegmentSelectorProps {
  segments: SceneSegment[]
  selectedSegmentId?: string
  currentPlayingSegmentId?: string
  onSelect: (segmentId: string) => void
  onAddSegment?: () => void
}

const statusConfig: Record<SceneSegment['status'], { 
  icon: React.ReactNode
  label: string
  color: string
}> = {
  DRAFT: { 
    icon: <PlayCircle className="w-3.5 h-3.5" />, 
    label: 'Draft',
    color: 'text-gray-400'
  },
  READY: { 
    icon: <PlayCircle className="w-3.5 h-3.5" />, 
    label: 'Ready',
    color: 'text-sf-primary'
  },
  GENERATING: { 
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, 
    label: 'Gen...',
    color: 'text-amber-500'
  },
  COMPLETE: { 
    icon: <CheckCircle2 className="w-3.5 h-3.5" />, 
    label: 'Done',
    color: 'text-emerald-500'
  },
  UPLOADED: { 
    icon: <Upload className="w-3.5 h-3.5" />, 
    label: 'Uploaded',
    color: 'text-blue-500'
  },
  ERROR: { 
    icon: <AlertCircle className="w-3.5 h-3.5" />, 
    label: 'Error',
    color: 'text-red-500'
  },
}

const assetTypeIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-3 h-3" />,
  image: <Image className="w-3 h-3" />,
}

interface SegmentCardProps {
  segment: SceneSegment
  isSelected: boolean
  isPlaying: boolean
  onSelect: () => void
}

const SegmentCard = memo(({ segment, isSelected, isPlaying, onSelect }: SegmentCardProps) => {
  const duration = segment.endTime - segment.startTime
  const status = statusConfig[segment.status]
  const thumbnailUrl = segment.references.thumbnailUrl || segment.references.mediaUrl
  const hasMedia = segment.status === 'COMPLETE' || segment.status === 'UPLOADED'
  
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full rounded-lg border-2 transition-all overflow-hidden",
        "bg-white dark:bg-gray-900 hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-sf-primary/50",
        isSelected
          ? "border-sf-primary ring-2 ring-sf-primary/30 shadow-md"
          : isPlaying
          ? "border-amber-400 ring-1 ring-amber-400/30"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      )}
    >
      {/* Thumbnail / Visual Indicator */}
      <div className="relative h-16 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={`Segment ${segment.sequenceIndex + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-6 h-6 text-gray-300 dark:text-gray-600" />
          </div>
        )}
        
        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5" />
            </div>
          </div>
        )}
        
        {/* Generating overlay */}
        {segment.status === 'GENERATING' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
        
        {/* Segment number badge */}
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-bold text-white">
          {segment.sequenceIndex + 1}
        </div>
        
        {/* Duration badge */}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] font-mono text-white">
          {duration.toFixed(1)}s
        </div>
      </div>
      
      {/* Info Section */}
      <div className="px-2 py-1.5 space-y-1">
        {/* Status & Type Row */}
        <div className="flex items-center justify-between gap-1">
          <div className={cn("flex items-center gap-1", status.color)}>
            {status.icon}
            <span className="text-[10px] font-medium">{status.label}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {segment.assetType && (
              <span className="text-gray-400">
                {assetTypeIcons[segment.assetType] || <Film className="w-3 h-3" />}
              </span>
            )}
            {segment.takes.length > 0 && (
              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">
                {segment.takes.length} take{segment.takes.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Visual Beat Preview */}
        {segment.visualBeat && (
          <p className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-2 text-left leading-tight">
            {segment.visualBeat}
          </p>
        )}
        
        {/* Transition */}
        {segment.transition && (
          <div className="flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-500">
            <Film className="w-2.5 h-2.5" />
            <span className="uppercase tracking-wide">
              {segment.transition.replace('TRANSITION:', '').trim()}
            </span>
          </div>
        )}
      </div>
    </button>
  )
})

SegmentCard.displayName = 'SegmentCard'

export function VerticalSegmentSelector({
  segments,
  selectedSegmentId,
  currentPlayingSegmentId,
  onSelect,
  onAddSegment,
}: VerticalSegmentSelectorProps) {
  if (segments.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <Film className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No segments yet
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Segments
          </span>
          <span className="text-[10px] text-gray-400">
            {segments.length}
          </span>
        </div>
      </div>
      
      {/* Scrollable Segment List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {segments.map((segment) => (
          <SegmentCard
            key={segment.segmentId}
            segment={segment}
            isSelected={segment.segmentId === selectedSegmentId}
            isPlaying={segment.segmentId === currentPlayingSegmentId}
            onSelect={() => onSelect(segment.segmentId)}
          />
        ))}
        
        {/* Add Segment Button (placeholder) */}
        {/* {typeof onAddSegment === 'function' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddSegment}
            className="w-full h-12 border-dashed flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600"
          >
            <Plus className="w-4 h-4" />
            <span>Add Segment</span>
          </Button>
        )} */}
      </div>
      
      {/* Footer Stats */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>
            {segments.filter(s => s.status === 'COMPLETE' || s.status === 'UPLOADED').length}/{segments.length} complete
          </span>
          <span className="font-mono">
            {segments.length > 0 
              ? `${segments[segments.length - 1].endTime.toFixed(1)}s total`
              : '0s'
            }
          </span>
        </div>
      </div>
    </div>
  )
}
