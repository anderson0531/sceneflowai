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
  ChevronRight,
  Layers,
  RefreshCw,
  Settings2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SegmentPairCard } from './SegmentPairCard'
import { FramePromptDialog, type FrameGenerationOptions } from './FramePromptDialog'
import { KeyframeRegenerationDialog, type KeyframeGenerationConfig } from './KeyframeRegenerationDialog'
import type { 
  SceneSegment, 
  AnchorStatus 
} from './types'
import type { DetailedSceneDirection } from '@/types/scene-direction'
import { useProcessWithOverlay } from '@/hooks/useProcessWithOverlay'

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
  onGenerateFrames: (segmentId: string, frameType: 'start' | 'end' | 'both', options?: {
    customPrompt?: string
    negativePrompt?: string
    usePreviousEndFrame?: boolean
    previousEndFrameUrl?: string
    /** Selected characters with reference images for identity lock */
    selectedCharacters?: Array<{
      name: string
      referenceImageUrl?: string
    }>
    /** Visual setup options (from guided mode) */
    visualSetup?: {
      location: string
      timeOfDay: string
      weather: string
      atmosphere: string
      shotType: string
      cameraAngle: string
      lighting: string
    }
    /** Art style for frame generation */
    artStyle?: string
  }) => Promise<void>
  onGenerateAllFrames: () => Promise<void>
  onGenerateVideo: (segmentId: string) => void
  onOpenDirectorConsole?: () => void
  onEditFrame?: (segmentId: string, frameType: 'start' | 'end', frameUrl: string) => void
  onUploadFrame?: (segmentId: string, frameType: 'start' | 'end', file: File) => void
  /** Update segment animatic settings for Screening Room (duration) */
  onSegmentAnimaticSettingsChange?: (segmentId: string, settings: { imageDuration?: number }) => void
  isGenerating: boolean
  generatingSegmentId?: string | null
  generatingPhase?: 'start' | 'end' | 'video'
  characters?: Array<{
    name: string
    appearance?: string
    referenceUrl?: string
  }>
  /** Object/prop references from the reference library for consistent image generation */
  objectReferences?: Array<{
    id: string
    name: string
    imageUrl: string
    description?: string
    importance?: 'critical' | 'secondary'
  }>
  /** Scene direction for intelligent prompt building */
  sceneDirection?: DetailedSceneDirection | null
  /** Callback to trigger segment regeneration (returns Promise for overlay) */
  onResegment?: () => Promise<void>
  /** Callback to trigger intelligent segment regeneration with config */
  onResegmentWithConfig?: (config: KeyframeGenerationConfig) => Promise<void>
  /** Total audio duration in seconds (narration + dialogue) for proper segment count estimation */
  totalAudioDurationSeconds?: number
  /** Scene data for the regeneration dialog */
  sceneData?: {
    id?: string
    sceneId?: string
    heading?: string
    action?: string
    narration?: string
    dialogue?: Array<{ character: string; line: string }>
    duration?: number
    narrationAudio?: { en?: { duration?: number } }
    dialogueAudio?: any[] | { en?: any[] }
    sceneDirection?: any
  }
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
  onOpenDirectorConsole,
  onEditFrame,
  onUploadFrame,
  onSegmentAnimaticSettingsChange,
  isGenerating,
  generatingSegmentId,
  generatingPhase,
  characters,
  objectReferences,
  sceneDirection,
  onResegment,
  onResegmentWithConfig,
  totalAudioDurationSeconds,
  sceneData,
}: SegmentFrameTimelineProps) {
  // Calculate stats first to determine initial expanded state
  const stats = useMemo(() => calculateTimelineStats(segments), [segments])
  
  // Auto-collapse when status is "All Ready" or "FTV Mode Ready"
  const isAllReady = stats.fullyAnchored === stats.total && stats.total > 0
  const [isExpanded, setIsExpanded] = useState(!isAllReady)
  
  // Frame prompt dialog state
  const [framePromptDialogOpen, setFramePromptDialogOpen] = useState(false)
  const [dialogSegment, setDialogSegment] = useState<SceneSegment | null>(null)
  const [dialogSegmentIndex, setDialogSegmentIndex] = useState(0)
  const [dialogFrameType, setDialogFrameType] = useState<'start' | 'end' | 'both'>('both')
  const [dialogPreviousEndFrame, setDialogPreviousEndFrame] = useState<string | null>(null)
  
  // Keyframe regeneration dialog state
  const [keyframeRegenDialogOpen, setKeyframeRegenDialogOpen] = useState(false)
  const [isRegeneratingKeyframes, setIsRegeneratingKeyframes] = useState(false)
  
  // Get previous segment's end frame for each segment (for CONTINUE transitions)
  const getPreviousEndFrame = useCallback((index: number): string | null => {
    if (index === 0) return null
    const prevSegment = segments[index - 1]
    return prevSegment?.endFrameUrl || prevSegment?.references?.endFrameUrl || null
  }, [segments])
  
  // Open the frame prompt dialog instead of generating directly
  const openFramePromptDialog = useCallback((
    segment: SceneSegment,
    segmentIndex: number,
    frameType: 'start' | 'end' | 'both'
  ) => {
    setDialogSegment(segment)
    setDialogSegmentIndex(segmentIndex)
    setDialogFrameType(frameType)
    setDialogPreviousEndFrame(getPreviousEndFrame(segmentIndex))
    setFramePromptDialogOpen(true)
  }, [getPreviousEndFrame])
  
  // Handle generation from dialog
  const { execute: executeWithOverlay } = useProcessWithOverlay()
  
  const handleDialogGenerate = useCallback(async (options: FrameGenerationOptions) => {
    setFramePromptDialogOpen(false)
    
    const frameLabel = options.frameType === 'both' ? 'start + end frames' : `${options.frameType} frame`
    
    await executeWithOverlay(
      async () => {
        await onGenerateFrames(options.segmentId, options.frameType, {
          customPrompt: options.customPrompt,
          negativePrompt: options.negativePrompt,
          usePreviousEndFrame: options.usePreviousEndFrame,
          previousEndFrameUrl: options.previousEndFrameUrl || undefined,
          // NEW: Pass selected characters with reference images for identity lock
          selectedCharacters: options.selectedCharacters?.map(c => ({
            name: c.name,
            referenceImageUrl: c.referenceImageUrl,
          })),
          // NEW: Pass visual setup for prompt construction
          visualSetup: options.visualSetup,
          // NEW: Pass art style for generation
          artStyle: options.artStyle,
        })
      },
      {
        message: `Generating ${frameLabel}...`,
        estimatedDuration: options.frameType === 'both' ? 45 : 25,
        operationType: 'keyframe-generation'
      }
    )
  }, [onGenerateFrames, executeWithOverlay])

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
      {/* Keyframe Generation Header - FTV Mode Ready style */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 transition-colors group"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
            <ImageIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-cyan-300 font-medium">Keyframe Generation</span>
            <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              {stats.fullyAnchored}/{stats.total} ready
            </Badge>
          </button>
          
          <div className="flex items-center gap-3">
            {/* Progress Bar - Compact */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
              <span className="text-cyan-400/70 text-[10px] w-8">{Math.round(stats.progressPercent)}%</span>
            </div>
            
            {/* Batch Generate Button */}
            {stats.pending > 0 || stats.startLocked > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={onGenerateAllFrames}
                disabled={isGenerating}
                className="h-8 px-4 text-xs font-medium bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 shadow-md shadow-cyan-500/20"
              >
                <Wand2 className="w-4 h-4 mr-1.5" />
                Generate All
              </Button>
            ) : stats.fullyAnchored === stats.total && stats.total > 0 ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 h-7 px-3 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                FTV Ready
              </Badge>
            ) : null}
            
            {/* Keyframes button - opens intelligent regeneration dialog */}
            {stats.total > 0 && (onResegment || onResegmentWithConfig) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // If we have scene data and the config handler, use the dialog
                  if (sceneData && onResegmentWithConfig) {
                    setKeyframeRegenDialogOpen(true)
                  } else if (onResegment) {
                    // Fallback to simple resegment
                    executeWithOverlay(
                      async () => {
                        await onResegment()
                      },
                      {
                        message: 'Re-analyzing scene and generating segments...',
                        estimatedDuration: 15,
                        operationType: 'scene-analysis'
                      }
                    )
                  }
                }}
                disabled={isGenerating || isRegeneratingKeyframes}
                className="h-8 px-4 text-xs font-medium border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400"
                title="Open keyframe generation settings"
              >
                <Settings2 className="w-4 h-4 mr-1.5" />
                Keyframes
              </Button>
            )}
          </div>
        </div>
        
        {/* Stats Row - Inline */}
        {isExpanded && (
        <div className="flex items-center gap-4 px-4 py-2 text-xs border-t border-cyan-500/10 bg-gray-900/30">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            {stats.totalDuration.toFixed(1)}s total
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {stats.fullyAnchored} anchored
          </span>
          {stats.startLocked > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <ImageIcon className="w-3.5 h-3.5" />
                {stats.startLocked} partial
              </span>
            </>
          )}
          {stats.pending > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <AlertCircle className="w-3.5 h-3.5" />
                {stats.pending} pending
              </span>
            </>
          )}
        </div>
        )}
      </div>
        
      {/* Segment Cards with Shot Grouping */}
      {isExpanded && (
        <div className="space-y-2">
          {segments.map((segment, index) => {
            const isContinuationGroup = segment.transitionType === 'CONTINUE'
            const nextIsContinuation = segments[index + 1]?.transitionType === 'CONTINUE'
            const isFirstInGroup = !isContinuationGroup
            const isLastInGroup = !nextIsContinuation
            
            return (
              <div key={segment.segmentId}>
                {/* Shot Change Divider */}
                {segment.transitionType === 'CUT' && index > 0 && (
                  <div className="flex items-center gap-2 py-2 px-3 my-1">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                    <span className="text-[10px] uppercase tracking-wider text-amber-500/60 font-medium">
                      Shot Change
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                  </div>
                )}
                
                {/* Segment Card with Continuation Border */}
                <div className={`${isContinuationGroup ? 'border-l-2 border-blue-500/30 pl-2 ml-1' : ''}`}>
                  <SegmentPairCard
                    segment={segment}
                    segmentIndex={index}
                    isSelected={selectedSegmentIndex === index}
                    onSelect={() => onSelectSegment(index)}
                    onGenerateStartFrame={() => openFramePromptDialog(segment, index, 'start')}
                    onGenerateEndFrame={() => openFramePromptDialog(segment, index, 'end')}
                    onGenerateBothFrames={() => openFramePromptDialog(segment, index, 'both')}
                    onGenerateVideo={() => onGenerateVideo(segment.segmentId)}
                    onOpenDirectorConsole={onOpenDirectorConsole}
                    onEditFrame={onEditFrame ? (frameType, frameUrl) => onEditFrame(segment.segmentId, frameType, frameUrl) : undefined}
                    onUploadFrame={onUploadFrame ? (frameType, file) => onUploadFrame(segment.segmentId, frameType, file) : undefined}
                    onAnimaticSettingsChange={onSegmentAnimaticSettingsChange ? (settings) => onSegmentAnimaticSettingsChange(segment.segmentId, settings) : undefined}
                    isGenerating={isGenerating && generatingSegmentId === segment.segmentId}
                    generatingPhase={generatingSegmentId === segment.segmentId ? generatingPhase : undefined}
                    previousSegmentEndFrame={getPreviousEndFrame(index)}
                    sceneImageUrl={sceneImageUrl}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* FTV Mode Ready Banner */}
      {stats.fullyAnchored > 0 && (
        <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Video className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-emerald-300 font-medium">FTV Mode Ready</p>
              <p className="text-emerald-400/70 text-sm mt-0.5">
                {stats.fullyAnchored} segment{stats.fullyAnchored > 1 ? 's are' : ' is'} anchored. 
                Frame-to-Video generation will use both frames to constrain video output.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Frame Prompt Dialog */}
      <FramePromptDialog
        open={framePromptDialogOpen}
        onOpenChange={setFramePromptDialogOpen}
        segment={dialogSegment}
        segmentIndex={dialogSegmentIndex}
        frameType={dialogFrameType}
        previousEndFrameUrl={dialogPreviousEndFrame}
        sceneImageUrl={sceneImageUrl}
        onGenerate={handleDialogGenerate}
        isGenerating={isGenerating}
        sceneDirection={sceneDirection}
        characters={characters?.map(c => ({
          name: c.name,
          appearance: c.appearance,
          // NEW: Pass reference image for character selection UI
          referenceImage: c.referenceUrl,
        }))}
        objectReferences={objectReferences}
      />
      
      {/* Keyframe Regeneration Dialog */}
      {sceneData && (
        <KeyframeRegenerationDialog
          open={keyframeRegenDialogOpen}
          onOpenChange={setKeyframeRegenDialogOpen}
          scene={sceneData}
          existingSegments={segments}
          characters={characters}
          onGenerate={async (config) => {
            setIsRegeneratingKeyframes(true)
            try {
              if (onResegmentWithConfig) {
                await executeWithOverlay(
                  async () => {
                    await onResegmentWithConfig(config)
                  },
                  {
                    message: 'Regenerating keyframe segments with your settings...',
                    estimatedDuration: 20,
                    operationType: 'scene-analysis'
                  }
                )
              } else if (onResegment) {
                await executeWithOverlay(
                  async () => {
                    await onResegment()
                  },
                  {
                    message: 'Re-analyzing scene and generating segments...',
                    estimatedDuration: 15,
                    operationType: 'scene-analysis'
                  }
                )
              }
            } finally {
              setIsRegeneratingKeyframes(false)
            }
          }}
          isGenerating={isRegeneratingKeyframes}
        />
      )}
    </div>
  )
}

export default SegmentFrameTimeline
