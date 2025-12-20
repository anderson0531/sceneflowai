'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  Wand2, 
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  Video,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SegmentPairCard } from './SegmentPairCard'
import type { 
  SceneSegment, 
  AnchorStatus 
} from './types'

// ============================================================================
// Types
// ============================================================================

export interface SegmentFrameTimelineProps {
  segments: SceneSegment[]
  sceneId: string
  sceneNumber: number
  sceneImageUrl?: string | null
  selectedSegmentIndex: number | null
  onSelectSegment: (index: number) => void
  onGenerateFrames: (segmentId: string, frameType: 'start' | 'end' | 'both') => Promise<void>
  onGenerateAllFrames: () => Promise<void>
  onGenerateVideo: (segmentId: string) => void
  onEditFrame?: (segmentId: string, frameType: 'start' | 'end', frameUrl: string) => void
  onUploadFrame?: (segmentId: string, frameType: 'start' | 'end', file: File) => void
  isGenerating: boolean
  generatingSegmentId?: string | null
  generatingPhase?: 'start' | 'end' | 'video'
  characters?: Array<{
    name: string
    appearance?: string
    referenceUrl?: string
  }>
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateTimelineStats(segments: SceneSegment[]) {
  const total = segments.length
  const fullyAnchored = segments.filter(s => 
    (s.anchorStatus === 'fully-anchored') || 
    (s.startFrameUrl && s.endFrameUrl) ||
    (s.references?.startFrameUrl && s.references?.endFrameUrl)
  ).length
  const startLocked = segments.filter(s => 
    s.anchorStatus === 'start-locked' || 
    s.anchorStatus === 'end-pending' ||
    (s.startFrameUrl || s.references?.startFrameUrl) && !(s.endFrameUrl || s.references?.endFrameUrl)
  ).length
  const pending = total - fullyAnchored - startLocked
  
  const totalDuration = segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
  const anchoredDuration = segments
    .filter(s => s.anchorStatus === 'fully-anchored' || (s.startFrameUrl && s.endFrameUrl))
    .reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
  
  const progressPercent = total > 0 ? (fullyAnchored / total) * 100 : 0
  
  return {
    total,
    fullyAnchored,
    startLocked,
    pending,
    totalDuration,
    anchoredDuration,
    progressPercent
  }
}

// ============================================================================
// SegmentFrameTimeline Component
// ============================================================================

export function SegmentFrameTimeline({
  segments,
  sceneId,
  sceneNumber,
  sceneImageUrl,
  selectedSegmentIndex,
  onSelectSegment,
  onGenerateFrames,
  onGenerateAllFrames,
  onGenerateVideo,
  onEditFrame,
  onUploadFrame,
  isGenerating,
  generatingSegmentId,
  generatingPhase,
  characters = []
}: SegmentFrameTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const stats = useMemo(() => calculateTimelineStats(segments), [segments])
  
  // Get previous segment's end frame for each segment (for CONTINUE transitions)
  const getPreviousEndFrame = useCallback((index: number): string | null => {
    if (index === 0) return null
    const prevSegment = segments[index - 1]
    return prevSegment?.endFrameUrl || prevSegment?.references?.endFrameUrl || null
  }, [segments])
  
  // Handle frame generation for a segment
  const handleGenerateFrames = useCallback(async (segmentId: string, frameType: 'start' | 'end' | 'both') => {
    await onGenerateFrames(segmentId, frameType)
  }, [onGenerateFrames])

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Layers className="w-12 h-12 mb-3 opacity-30" />
        <span className="text-sm font-medium">No segments generated</span>
        <p className="text-xs opacity-60 mt-1">Generate segments in the Call Action step first</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div>
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-left hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <h3 className="text-sm font-medium text-slate-200">
              Keyframe State Machine
            </h3>
            <Badge variant="secondary" className="text-[10px] bg-slate-700 text-slate-300">
              {stats.fullyAnchored}/{stats.total} ready
            </Badge>
          </button>
          
          <div className="flex items-center gap-2">
            {/* Progress Indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
              <span>{Math.round(stats.progressPercent)}%</span>
            </div>
            
            {/* Batch Generate Button */}
            {stats.pending > 0 || stats.startLocked > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={onGenerateAllFrames}
                disabled={isGenerating}
                className="h-7 text-xs"
              >
                <Wand2 className="w-3 h-3 mr-1" />
                Generate All Frames
              </Button>
            ) : stats.fullyAnchored === stats.total && stats.total > 0 ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                All Segments Ready
              </Badge>
            ) : null}
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {stats.totalDuration.toFixed(1)}s total
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            {stats.fullyAnchored} anchored
          </span>
          {stats.startLocked > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400">
                <ImageIcon className="w-3 h-3" />
                {stats.startLocked} partial
              </span>
            </>
          )}
          {stats.pending > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-400">
                <AlertCircle className="w-3 h-3" />
                {stats.pending} pending
              </span>
            </>
          )}
        </div>
        
        {isExpanded && (
          <div className="mt-4 space-y-3">
            {segments.map((segment, index) => (
              <SegmentPairCard
                key={segment.segmentId}
                segment={segment}
                segmentIndex={index}
                isSelected={selectedSegmentIndex === index}
                onSelect={() => onSelectSegment(index)}
                onGenerateStartFrame={() => handleGenerateFrames(segment.segmentId, 'start')}
                onGenerateEndFrame={() => handleGenerateFrames(segment.segmentId, 'end')}
                onGenerateBothFrames={() => handleGenerateFrames(segment.segmentId, 'both')}
                onGenerateVideo={() => onGenerateVideo(segment.segmentId)}
                onEditFrame={onEditFrame ? (frameType, frameUrl) => onEditFrame(segment.segmentId, frameType, frameUrl) : undefined}
                onUploadFrame={onUploadFrame ? (frameType, file) => onUploadFrame(segment.segmentId, frameType, file) : undefined}
                isGenerating={isGenerating && generatingSegmentId === segment.segmentId}
                generatingPhase={generatingSegmentId === segment.segmentId ? generatingPhase : undefined}
                previousSegmentEndFrame={getPreviousEndFrame(index)}
                sceneImageUrl={sceneImageUrl}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* FTV Mode Explanation */}
      {stats.fullyAnchored > 0 && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Video className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="text-green-300 font-medium">FTV Mode Ready</p>
              <p className="text-green-400/70 mt-0.5">
                {stats.fullyAnchored} segment{stats.fullyAnchored > 1 ? 's are' : ' is'} fully anchored with Start and End frames. 
                Veo 3.1 will use both frames to generate constrained video with minimal character drift.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SegmentFrameTimeline
