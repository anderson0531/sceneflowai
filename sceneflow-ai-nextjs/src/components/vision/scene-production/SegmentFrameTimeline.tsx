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
  Layers,
  RefreshCw,
  Settings2,
  Clapperboard,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SegmentPairCard } from './SegmentPairCard'
import { DeleteSegmentDialog } from './DeleteSegmentDialog'
import { RegenerateSegmentsDialog } from './RegenerateSegmentsDialog'
import { AddSegmentTypeDialog, type SegmentPurpose, type AdjacentSceneContext } from './AddSegmentTypeDialog'
import { AddSpecialSegmentDialog } from './AddSpecialSegmentDialog'
import type { KeyframeGenerationConfig } from './KeyframeRegenerationDialog'
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
    /** Whether this came from the dialog (user made explicit selections) */
    fromDialog?: boolean
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
    /** Selected object/prop references with images */
    selectedObjectReferences?: Array<{
      id: string
      name: string
      imageUrl?: string
      description?: string
    }>
    /** Selected location references with images */
    selectedLocationReferences?: Array<{
      id: string
      name: string
      imageUrl?: string
      description?: string
    }>
    /** Scene direction for intelligent prompt building (avoids fallback to PromptEnhancer) */
    sceneDirection?: DetailedSceneDirection | null
  }) => Promise<{ startFrameUrl?: string; endFrameUrl?: string } | void>
  onGenerateVideo: (segmentId: string) => void
  onOpenDirectorConsole?: () => void
  onEditFrame?: (segmentId: string, frameType: 'start' | 'end', frameUrl: string) => void
  onUploadFrame?: (segmentId: string, frameType: 'start' | 'end', file: File) => void
  /** Update segment animatic settings for Screening Room (duration) */
  onSegmentAnimaticSettingsChange?: (segmentId: string, settings: { imageDuration?: number }) => void
  isGenerating: boolean
  generatingSegmentId?: string | null
  generatingPhase?: 'start' | 'end' | 'video'
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
  /** Callback to delete a segment */
  onDeleteSegment?: (segmentId: string) => void
  /** Callback to add a new segment */
  onAddSegment?: (segment: Partial<SceneSegment> & { 
    segmentPurpose: SegmentPurpose
    insertPosition: 'before' | 'after' | 'start' | 'end'
    insertIndex?: number 
  }) => void
  /** Adjacent scene context for intelligent segment creation */
  adjacentSceneContext?: AdjacentSceneContext
  /** Film context for AI prompt generation (for special segments) */
  filmContext?: {
    title?: string
    logline?: string
    genre?: string[]
    tone?: string
    visualStyle?: string
    targetAudience?: string
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function hasStartFrame(segment: SceneSegment): boolean {
  return !!(segment.startFrameUrl || segment.references?.startFrameUrl)
}

function hasEndFrame(segment: SceneSegment): boolean {
  return !!(segment.endFrameUrl || segment.references?.endFrameUrl)
}

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
  onGenerateVideo,
  onOpenDirectorConsole,
  onEditFrame,
  onUploadFrame,
  onSegmentAnimaticSettingsChange,
  isGenerating,
  generatingSegmentId,
  generatingPhase,
  sceneDirection,
  onResegment,
  onResegmentWithConfig,
  totalAudioDurationSeconds,
  sceneData,
  onDeleteSegment,
  onAddSegment,
  adjacentSceneContext,
  filmContext,
}: SegmentFrameTimelineProps) {
  const stats = useMemo(() => calculateTimelineStats(segments), [segments])

  const segmentsNeedingEnd = useMemo(
    () => segments.filter((s) => hasStartFrame(s) && !hasEndFrame(s)),
    [segments]
  )
  const segmentsNeedingBoth = useMemo(
    () => segments.filter((s) => !hasStartFrame(s) && !hasEndFrame(s)),
    [segments]
  )
  const allHavePreVisStarts = useMemo(
    () => segments.length > 0 && segments.every(hasStartFrame),
    [segments]
  )
  
  // Regenerate all segments dialog state
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  
  // Delete beat dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteSegmentTarget, setDeleteSegmentTarget] = useState<{ segmentId: string; index: number } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Add segment dialog state (for standard keyframe segments)
  const [addSegmentDialogOpen, setAddSegmentDialogOpen] = useState(false)
  
  // Add special segment dialog state (for cinematic elements: title, match-cut, etc.)
  const [specialSegmentDialogOpen, setSpecialSegmentDialogOpen] = useState(false)
  
  // Get previous segment's end frame for each segment (for CONTINUE transitions)
  const getPreviousEndFrame = useCallback((index: number): string | null => {
    if (index === 0) return null
    const prevSegment = segments[index - 1]
    return prevSegment?.endFrameUrl || prevSegment?.references?.endFrameUrl || null
  }, [segments])

  const { execute: executeWithOverlay } = useProcessWithOverlay()

  // Quick generate bypassing the dialog
  const quickGenerateFrame = useCallback(async (
    segment: SceneSegment,
    segmentIndex: number,
    frameType: 'start' | 'end' | 'both'
  ) => {
    const frameLabel = frameType === 'both' ? 'start + end frames' : `${frameType} frame`
    await executeWithOverlay(
      async () => {
        await onGenerateFrames(segment.segmentId, frameType, {
          usePreviousEndFrame: false, // Default to Camera Cut
          previousEndFrameUrl: frameType === 'start' && segmentIndex > 0 ? getPreviousEndFrame(segmentIndex) || undefined : undefined,
          sceneDirection,
        })
      },
      {
        message: `Generating ${frameLabel}...`,
        estimatedDuration: frameType === 'both' ? 45 : 25,
        operationType: 'keyframe-generation'
      }
    )
  }, [onGenerateFrames, executeWithOverlay, sceneDirection, getPreviousEndFrame])
  
  const handleExpress = useCallback(async () => {
    // Process ALL segments sequentially for Express keyframe generation
    // Keyframes MUST be processed sequentially because the end frame of the previous segment
    // is often used as the start frame of the next segment (chain reference consistency).
    // Using Promise.all across concurrent chains breaks this consistency since the previous
    // segment's end frame wouldn't be ready when the next segment starts.

    await executeWithOverlay(
      async () => {
        let lastEndFrameUrl: string | undefined = undefined

        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i]
          
          // If it's a continuation within the scene (not the first segment and not a CUT)
          const isContinuation = i > 0 && segment.transitionType !== 'CUT'
          
          const result = await onGenerateFrames(segment.segmentId, 'both', {
            usePreviousEndFrame: false, // Default to Camera Cut
            previousEndFrameUrl: isContinuation ? lastEndFrameUrl : undefined,
            sceneDirection,
          })

          if (result && result.endFrameUrl) {
            lastEndFrameUrl = result.endFrameUrl
          }
        }
      },
      {
        message: `Express generating keyframes...`,
        estimatedDuration: segments.length * 35,
        operationType: 'keyframe-generation'
      }
    )
  }, [segments, onGenerateFrames, executeWithOverlay, sceneDirection])

  const handleExpressEndFrames = useCallback(async () => {
    const targets = segmentsNeedingEnd
    if (targets.length === 0) return

    await executeWithOverlay(
      async () => {
        let lastEndFrameUrl: string | undefined = undefined

        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i]
          if (!hasStartFrame(segment) || hasEndFrame(segment)) continue

          const isContinuation = i > 0 && segment.transitionType !== 'CUT'

          const result = await onGenerateFrames(segment.segmentId, 'end', {
            usePreviousEndFrame: false,
            previousEndFrameUrl: isContinuation ? lastEndFrameUrl : undefined,
            sceneDirection,
          })

          if (result?.endFrameUrl) {
            lastEndFrameUrl = result.endFrameUrl
          } else if (segment.endFrameUrl || segment.references?.endFrameUrl) {
            lastEndFrameUrl =
              segment.endFrameUrl || segment.references?.endFrameUrl || undefined
          }
        }
      },
      {
        message: `Express generating end frames (${targets.length})…`,
        estimatedDuration: targets.length * 25,
        operationType: 'keyframe-generation',
      }
    )
  }, [segments, segmentsNeedingEnd, onGenerateFrames, executeWithOverlay, sceneDirection])

  // Handle delete segment
  const handleDeleteClick = useCallback((segmentId: string, index: number) => {
    setDeleteSegmentTarget({ segmentId, index })
    setDeleteDialogOpen(true)
  }, [])
  
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteSegmentTarget || !onDeleteSegment) return
    
    setIsDeleting(true)
    try {
      onDeleteSegment(deleteSegmentTarget.segmentId)
      toast.success(`Beat ${deleteSegmentTarget.index + 1} deleted`)
      setDeleteDialogOpen(false)
      setDeleteSegmentTarget(null)
    } catch (error) {
      toast.error('Failed to delete segment')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteSegmentTarget, onDeleteSegment])
  
  // Get segment info for delete dialog
  const deleteSegmentInfo = useMemo(() => {
    if (!deleteSegmentTarget) return null
    const segment = segments.find(s => s.segmentId === deleteSegmentTarget.segmentId)
    if (!segment) return null
    return {
      index: deleteSegmentTarget.index,
      duration: segment.endTime - segment.startTime,
      hasFrames: !!(segment.startFrameUrl || segment.endFrameUrl || segment.references?.startFrameUrl || segment.references?.endFrameUrl)
    }
  }, [deleteSegmentTarget, segments])

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Layers className="w-12 h-12 mb-3 opacity-30" />
        <span className="text-sm font-medium">No beats generated</span>
        <p className="text-xs opacity-60 mt-1">Generate segments in the Call Action step first</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Keyframe toolbar (no nested collapse — parent KeyFrame Production section toggles visibility) */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ImageIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-sm font-medium text-cyan-300">Beat Frame Generation</span>
            <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              {stats.fullyAnchored}/{stats.total} ready
            </Badge>
          </div>
          
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
            
            {stats.fullyAnchored === stats.total && stats.total > 0 ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 h-10 px-4 text-sm font-semibold flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                FTV Ready
              </Badge>
            ) : null}
            
            {segmentsNeedingEnd.length > 0 && (
              <Button
                size="default"
                variant="outline"
                onClick={handleExpressEndFrames}
                disabled={isGenerating}
                className="h-10 px-5 text-sm font-semibold border-purple-500/50 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400 shadow-md hover:shadow-lg transition-all"
                title="Generate end frames from Pre-Vis start frames (AI edit)"
              >
                <Wand2 className="w-5 h-5 mr-2" />
                Express End ({segmentsNeedingEnd.length})
              </Button>
            )}

            {(!allHavePreVisStarts || segmentsNeedingBoth.length > 0) && stats.total > 0 && (
              <Button
                size="default"
                variant="outline"
                onClick={handleExpress}
                disabled={isGenerating}
                className="h-10 px-5 text-sm font-semibold border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 shadow-md hover:shadow-lg transition-all"
                title={
                  segmentsNeedingBoth.length > 0
                    ? 'Generate start and end frames for segments missing both'
                    : 'Auto-generate start and end frames for all segments'
                }
              >
                <Wand2 className="w-5 h-5 mr-2" />
                {segmentsNeedingBoth.length > 0 ? `Express Both (${segmentsNeedingBoth.length})` : 'Express'}
              </Button>
            )}
            
            {/* Add Beat Button - opens add segment type dialog for keyframe-based segments */}
            {stats.total > 0 && (
              <Button
                size="default"
                variant="outline"
                onClick={() => setAddSegmentDialogOpen(true)}
                disabled={isGenerating}
                className="h-10 px-5 text-sm font-semibold border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-400 shadow-md hover:shadow-lg transition-all"
                title="Add a beat clip with Beat Frames"
              >
                <Layers className="w-5 h-5 mr-2" />
                Add
              </Button>
            )}
          </div>
        </div>
        
        {/* Stats Row - Inline */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs border-t border-cyan-500/10 bg-gray-900/30 mt-3 flex-wrap">
          {allHavePreVisStarts && (
            <>
              <span className="text-slate-500">
                Starts locked from Pre-Vis — generate end frames to complete FTV pairs
              </span>
              <span className="text-slate-600">•</span>
            </>
          )}
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
      </div>
        
      {/* Beat Cards with Shot Grouping */}
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
                
                {/* Beat Card with Continuation Border */}
                <div className={`${isContinuationGroup ? 'border-l-2 border-blue-500/30 pl-2 ml-1' : ''}`}>
                  <SegmentPairCard
                    segment={segment}
                    segmentIndex={index}
                    isSelected={selectedSegmentIndex === index}
                    onSelect={() => onSelectSegment(index)}
                    onGenerateStartFrame={() => quickGenerateFrame(segment, index, 'start')}
                    onGenerateEndFrame={() => quickGenerateFrame(segment, index, 'end')}
                    onGenerateBothFrames={() => quickGenerateFrame(segment, index, 'both')}
                    onGenerateVideo={() => onGenerateVideo(segment.segmentId)}
                    onOpenDirectorConsole={onOpenDirectorConsole}
                    onEditFrame={onEditFrame ? (frameType, frameUrl) => onEditFrame(segment.segmentId, frameType, frameUrl) : undefined}
                    onUploadFrame={onUploadFrame ? (frameType, file) => onUploadFrame(segment.segmentId, frameType, file) : undefined}
                    onAnimaticSettingsChange={onSegmentAnimaticSettingsChange ? (settings) => onSegmentAnimaticSettingsChange(segment.segmentId, settings) : undefined}
                    onDelete={onDeleteSegment ? () => handleDeleteClick(segment.segmentId, index) : undefined}
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
      
      {/* Generate Video Action Container */}
      {stats.fullyAnchored > 0 && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Video className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-emerald-300 font-medium">FTV Mode Ready</p>
              <p className="text-emerald-400/70 text-sm mt-0.5">
                {stats.fullyAnchored} segment{stats.fullyAnchored > 1 ? 's are' : ' is'} anchored. 
                Frame-to-Video generation will use both frames to constrain video output.
              </p>
            </div>
          </div>
          <Button
            onClick={onOpenDirectorConsole}
            className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-900/20"
          >
            <Video className="w-4 h-4 mr-2" />
            Generate Video
          </Button>
        </div>
      )}
      
      {/* Regenerate All Beats Confirmation Dialog */}
      <RegenerateSegmentsDialog
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
        totalBeats={stats.total}
        totalDuration={stats.totalDuration}
        anchoredCount={stats.fullyAnchored}
        hasGeneratedAssets={segments.some(s => s.activeAssetUrl || s.startFrameUrl || s.endFrameUrl || (s.takes && s.takes.length > 0))}
        onConfirm={() => {
          if (onDeleteSegment) {
            segments.forEach(s => onDeleteSegment(s.segmentId))
            toast.success('Beats cleared', { description: 'Use the Beat Builder to regenerate with new settings.' })
          }
        }}
      />
      
      {/* Delete Beat Confirmation Dialog */}
      {deleteSegmentInfo && (
        <DeleteSegmentDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          segmentIndex={deleteSegmentInfo.index}
          segmentDuration={deleteSegmentInfo.duration}
          hasFrames={deleteSegmentInfo.hasFrames}
          totalSegments={segments.length}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      )}
      
      {/* Add Beat Type Dialog - for keyframe-based segments */}
      <AddSegmentTypeDialog
        open={addSegmentDialogOpen}
        onOpenChange={setAddSegmentDialogOpen}
        sceneId={sceneId}
        sceneNumber={sceneNumber}
        existingSegments={segments}
        adjacentContext={adjacentSceneContext || {
          currentScene: {
            heading: sceneData?.heading,
            action: sceneData?.action,
            narration: sceneData?.narration,
          },
          previousScene: segments.length > 0 ? {
            lastSegment: segments[segments.length - 1]
          } : undefined
        }}
        onAddSegment={onAddSegment || ((segment) => {
          toast.info('Segment created! Connect the onAddSegment handler to persist.')
          console.log('New segment:', segment)
        })}
        onRegenerateAll={sceneData && onResegmentWithConfig ? () => setRegenerateDialogOpen(true) : undefined}
      />
      
      {/* Add Special Beat Dialog - for cinematic elements (title, match-cut, establishing, b-roll, outro) */}
      <AddSpecialSegmentDialog
        open={specialSegmentDialogOpen}
        onOpenChange={setSpecialSegmentDialogOpen}
        sceneId={sceneId}
        sceneNumber={sceneNumber}
        existingSegments={segments}
        insertAfterIndex={segments.length > 0 ? segments.length - 1 : undefined}
        adjacentContext={adjacentSceneContext || {
          currentScene: {
            heading: sceneData?.heading,
            action: sceneData?.action,
            narration: sceneData?.narration,
          },
          previousScene: segments.length > 0 ? {
            lastSegment: segments[segments.length - 1]
          } : undefined
        }}
        onAddSegment={onAddSegment || ((segment) => {
          toast.info('Cinematic element created! Connect the onAddSegment handler to persist.')
          console.log('New special segment:', segment)
        })}
        filmContext={filmContext || {
          // Fallback: extract from scene heading if no film context provided
          title: sceneData?.heading?.split('-')[0]?.trim(),
        }}
      />
    </div>
  )
}

export default SegmentFrameTimeline
