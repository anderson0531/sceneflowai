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
  Layers,
  RefreshCw,
  Copy,
  ClipboardPaste,
  Sparkles,
  Film
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SegmentPairCard } from './SegmentPairCard'
import { FramePromptDialog, type FrameGenerationOptions } from './FramePromptDialog'
import type { 
  SceneSegment, 
  AnchorStatus 
} from './types'
import type { DetailedSceneDirection } from '@/types/scene-direction'

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
  }) => Promise<void>
  onGenerateAllFrames: () => Promise<void>
  onGenerateVideo: (segmentId: string) => void
  onOpenDirectorConsole?: () => void
  onEditFrame?: (segmentId: string, frameType: 'start' | 'end', frameUrl: string) => void
  onUploadFrame?: (segmentId: string, frameType: 'start' | 'end', file: File) => void
  /** Update segment animatic settings for Screening Room (duration + frame selection) */
  onSegmentAnimaticSettingsChange?: (segmentId: string, settings: { imageDuration?: number; frameSelection?: 'start' | 'end' | 'both' }) => void
  isGenerating: boolean
  generatingSegmentId?: string | null
  generatingPhase?: 'start' | 'end' | 'video'
  characters?: Array<{
    name: string
    appearance?: string
    referenceUrl?: string
  }>
  /** Scene direction for intelligent prompt building */
  sceneDirection?: DetailedSceneDirection | null
  /** Callback to trigger segment regeneration - optionally accepts pre-parsed segments */
  onResegment?: (segments?: any[]) => void
  /** 
   * TEMPORARY WORKAROUND: Scene data for copy prompt functionality
   * TODO: Remove when Vertex AI billing is resolved and direct API calls work
   */
  sceneNarration?: string
  sceneDialogue?: Array<{ character?: string; speaker?: string; line?: string; text?: string; duration?: number }>
  targetSegmentDuration?: number
  /** Audio duration for narration track (seconds) */
  narrationAudioDuration?: number
  /** Audio durations for each dialogue line (seconds) */
  dialogueAudioDurations?: Array<{ character?: string; duration: number }>
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
  characters = [],
  sceneDirection,
  // TEMPORARY WORKAROUND: Props for copy prompt functionality
  // TODO: Remove when Vertex AI billing is resolved
  onResegment,
  sceneNarration,
  sceneDialogue,
  targetSegmentDuration = 8,
  narrationAudioDuration,
  dialogueAudioDurations
}: SegmentFrameTimelineProps) {
  // Calculate stats first to determine initial expanded state
  const stats = useMemo(() => calculateTimelineStats(segments), [segments])
  
  // Auto-collapse when status is "All Ready" or "FTV Mode Ready"
  const isAllReady = stats.fullyAnchored === stats.total && stats.total > 0
  const [isExpanded, setIsExpanded] = useState(!isAllReady)

  // ============================================================================
  // TEMPORARY WORKAROUND: Copy Prompt Functionality
  // TODO: Remove this entire section when Vertex AI billing is resolved
  // ============================================================================
  const buildSegmentationPrompt = useCallback(() => {
    // Build dialogue text with durations if available
    const dialogueWithDurations = sceneDialogue && sceneDialogue.length > 0
      ? sceneDialogue.map((d, i) => {
          const char = d.character || d.speaker || 'Unknown'
          const text = d.line || d.text || ''
          const duration = dialogueAudioDurations?.[i]?.duration || d.duration
          return duration 
            ? `- ${char}: "${text}" (${duration.toFixed(1)}s audio)`
            : `- ${char}: "${text}"`
        }).join('\n')
      : ''
    
    // Calculate total audio duration from actual audio files
    const totalDialogueDuration = dialogueAudioDurations?.reduce((sum, d) => sum + d.duration, 0) || 0
    const totalAudioDuration = Math.max(narrationAudioDuration || 0, totalDialogueDuration) || stats.totalDuration
    const minSegmentsNeeded = Math.ceil(totalAudioDuration / targetSegmentDuration)
    
    // Build audio duration breakdown section
    let audioDurationBreakdown = 'AUDIO DURATION BREAKDOWN:\n'
    if (narrationAudioDuration) {
      const narrationSegments = Math.ceil(narrationAudioDuration / targetSegmentDuration)
      audioDurationBreakdown += `- Narration: ${narrationAudioDuration.toFixed(1)}s → requires ${narrationSegments} segment${narrationSegments > 1 ? 's' : ''} (${targetSegmentDuration}s each)\n`
    }
    if (dialogueAudioDurations && dialogueAudioDurations.length > 0) {
      audioDurationBreakdown += `- Dialogue lines:\n`
      dialogueAudioDurations.forEach((d, i) => {
        const segmentsForLine = Math.ceil(d.duration / targetSegmentDuration)
        audioDurationBreakdown += `  ${i + 1}. ${d.character || 'Speaker'}: ${d.duration.toFixed(1)}s\n`
      })
      audioDurationBreakdown += `- Total dialogue: ${totalDialogueDuration.toFixed(1)}s\n`
    }
    audioDurationBreakdown += `- TOTAL AUDIO: ${totalAudioDuration.toFixed(1)}s\n`
    audioDurationBreakdown += `- MINIMUM SEGMENTS REQUIRED: ${minSegmentsNeeded} (at ${targetSegmentDuration}s max each)`
    
    return `You are a professional film editor analyzing a scene for video segment generation.

SCENE CONTENT:
Narration: ${sceneNarration || 'No narration'}
Dialogue:
${dialogueWithDurations || 'No dialogue'}

${audioDurationBreakdown}

SEGMENT-TO-AUDIO ALIGNMENT RULES:
1. Each segment MUST be ≤ ${targetSegmentDuration} seconds (Veo 3.1 hard limit)
2. Segment boundaries should align with audio content:
   - For ${narrationAudioDuration?.toFixed(1) || 'N/A'}s narration → create ${Math.ceil((narrationAudioDuration || 0) / targetSegmentDuration)} aligned segments
   - Place segment breaks at natural pauses, sentence boundaries, or emotional beats
3. Total segment duration MUST cover ALL ${totalAudioDuration.toFixed(1)}s of audio
4. Use CONTINUE transition for segments within the same shot/camera angle
5. Use CUT, FADE, or DISSOLVE for scene/shot changes

OUTPUT FORMAT (JSON array):
[
  {
    "startTime": 0.0,
    "endTime": 7.5,
    "description": "Opening shot - covers narration 0-7.5s describing...",
    "transitionType": "FADE"
  },
  {
    "startTime": 7.5,
    "endTime": 15.0,
    "description": "Continuation - covers narration 7.5-15s showing...",
    "transitionType": "CONTINUE"
  },
  ...
]

Generate ${minSegmentsNeeded}+ segments now:`
  }, [sceneNarration, sceneDialogue, stats.totalDuration, targetSegmentDuration, narrationAudioDuration, dialogueAudioDurations])

  const handleCopyPrompt = useCallback(() => {
    const prompt = buildSegmentationPrompt()
    navigator.clipboard.writeText(prompt)
    toast.success('Segmentation prompt copied to clipboard')
  }, [buildSegmentationPrompt])

  // Regeneration dialog state
  const [showResegmentDialog, setShowResegmentDialog] = useState(false)
  const [showPasteDialog, setShowPasteDialog] = useState(false)
  const [pastedJson, setPastedJson] = useState('')
  const [isProcessingPaste, setIsProcessingPaste] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  const handleCopyPromptInDialog = useCallback(() => {
    const prompt = buildSegmentationPrompt()
    navigator.clipboard.writeText(prompt)
    setCopiedPrompt(true)
    toast.success('Segmentation prompt copied to clipboard')
    setTimeout(() => setCopiedPrompt(false), 2000)
  }, [buildSegmentationPrompt])

  const handleProcessPastedResults = useCallback(async () => {
    if (!pastedJson.trim() || !onResegment) return

    setIsProcessingPaste(true)
    try {
      // Try to extract JSON from the pasted content
      let jsonContent = pastedJson.trim()
      
      // Handle markdown code blocks
      const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim()
      }
      
      // Parse the JSON
      let parsed: any
      try {
        parsed = JSON.parse(jsonContent)
      } catch (parseError) {
        // Try to find JSON array in the content
        const arrayMatch = jsonContent.match(/\[\s*\{[\s\S]*\}\s*\]/)
        if (arrayMatch) {
          parsed = JSON.parse(arrayMatch[0])
        } else {
          throw new Error('Could not find valid JSON in the pasted content')
        }
      }
      
      // Extract segments array
      const segments = Array.isArray(parsed) ? parsed : parsed.segments
      if (!Array.isArray(segments) || segments.length === 0) {
        throw new Error('No segments found in the pasted JSON')
      }
      
      // Transform to expected format if needed
      const transformedSegments = segments.map((seg: any, idx: number) => ({
        segmentId: seg.segmentId || `segment-${idx}`,
        label: seg.label || seg.description || `Segment ${idx + 1}`,
        startTime: seg.startTime || 0,
        endTime: seg.endTime || (seg.startTime || 0) + (seg.duration || 5),
        duration: seg.duration || (seg.endTime - seg.startTime) || 5,
        prompt: seg.prompt || seg.description || '',
        shotType: seg.shotType || 'medium',
        cameraMovement: seg.cameraMovement || 'static',
        transitionType: seg.transitionType || (idx === 0 ? 'FADE' : 'CUT'),
        status: 'DRAFT' as const,
        anchorStatus: 'pending' as const,
      }))
      
      // Call onResegment with the parsed segments
      await onResegment(transformedSegments)
      
      toast.success(`Created ${transformedSegments.length} segments from pasted results`)
      setShowPasteDialog(false)
      setShowResegmentDialog(false)
      setPastedJson('')
    } catch (error: any) {
      console.error('Error processing pasted results:', error)
      toast.error(error.message || 'Failed to process pasted results')
    } finally {
      setIsProcessingPaste(false)
    }
  }, [pastedJson, onResegment])
  // ============================================================================
  // END TEMPORARY WORKAROUND
  // ============================================================================
  
  // Frame prompt dialog state
  const [framePromptDialogOpen, setFramePromptDialogOpen] = useState(false)
  const [dialogSegment, setDialogSegment] = useState<SceneSegment | null>(null)
  const [dialogSegmentIndex, setDialogSegmentIndex] = useState(0)
  const [dialogFrameType, setDialogFrameType] = useState<'start' | 'end' | 'both'>('both')
  const [dialogPreviousEndFrame, setDialogPreviousEndFrame] = useState<string | null>(null)
  
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
  const handleDialogGenerate = useCallback(async (options: FrameGenerationOptions) => {
    setFramePromptDialogOpen(false)
    
    await onGenerateFrames(options.segmentId, options.frameType, {
      customPrompt: options.customPrompt,
      negativePrompt: options.negativePrompt,
      usePreviousEndFrame: options.usePreviousEndFrame,
      previousEndFrameUrl: options.previousEndFrameUrl || undefined,
    })
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
      {/* Compact Header with Status Bar */}
      <div className="bg-gray-900/50 rounded-xl border border-cyan-500/30 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 bg-cyan-900/20 border-b border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 text-left hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">Keyframe State Machine</h3>
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  {stats.fullyAnchored}/{stats.total} ready
                </Badge>
              </div>
              <p className="text-xs text-gray-400">Anchor start and end frames for video generation</p>
            </div>
          </button>
          
          <div className="flex items-center gap-3">
            {/* Progress Bar - Compact */}
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-10">{Math.round(stats.progressPercent)}%</span>
            </div>
            
            {/* Batch Generate Button */}
            {stats.pending > 0 || stats.startLocked > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={onGenerateAllFrames}
                disabled={isGenerating}
                className="h-7 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/30"
              >
                <Wand2 className="w-3 h-3 mr-1.5" />
                Generate All Frames
              </Button>
            ) : stats.fullyAnchored === stats.total && stats.total > 0 ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 h-7 px-3">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                All Ready
              </Badge>
            ) : null}
            
            {/* TEMPORARY WORKAROUND: Copy Prompt + Resegment buttons */}
            {/* TODO: Remove when Vertex AI billing is resolved */}
            {stats.total > 0 && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyPrompt}
                  className="h-7 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50"
                  title="Copy segmentation prompt for AI Studio"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Prompt
                </Button>
                {onResegment && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowResegmentDialog(true)}
                    className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
                    title="Regenerate segments (opens generation dialog)"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate Segments
                  </Button>
                )}
              </>
            )}
            {/* END TEMPORARY WORKAROUND */}
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
        <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Video className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="text-emerald-300 font-medium">FTV Mode Ready</p>
              <p className="text-emerald-400/70 mt-0.5">
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
        }))}
      />

      {/* Regenerate Segments Dialog */}
      <Dialog open={showResegmentDialog} onOpenChange={setShowResegmentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Film className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-left">Regenerate Segments</DialogTitle>
                <DialogDescription className="text-left">
                  Use the manual workaround to regenerate segments via external AI.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <h4 className="text-sm font-medium text-amber-300 mb-2">Manual Workflow</h4>
              <ol className="text-xs text-amber-200/80 space-y-2 list-decimal list-inside">
                <li>Click <strong>Copy Prompt</strong> to copy the segmentation prompt</li>
                <li>Paste into <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline text-amber-400 hover:text-amber-300">Google AI Studio</a> or ChatGPT</li>
                <li>Copy the JSON response from the AI</li>
                <li>Click <strong>Paste Results</strong> to import the segments</li>
              </ol>
            </div>
          </div>
          
          <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
            <div className="flex gap-2 mr-auto">
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={handleCopyPromptInDialog}
                className="text-xs"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
              </Button>
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={() => setShowPasteDialog(true)}
                className="text-xs"
              >
                <ClipboardPaste className="w-3.5 h-3.5 mr-1.5" />
                Paste Results
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setShowResegmentDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paste Results Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <ClipboardPaste className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle className="text-left">Paste AI Results</DialogTitle>
                <DialogDescription className="text-left">
                  Paste the JSON response from Gemini or ChatGPT to create segments.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">JSON Response</Label>
              <Textarea
                placeholder='Paste the JSON response here...

Example format:
[
  {
    "startTime": 0.0,
    "endTime": 7.5,
    "description": "Opening shot...",
    "transitionType": "FADE"
  }
]'
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
              />
            </div>
            
            <p className="text-xs text-gray-500">
              Supports JSON arrays or objects with a "segments" property. 
              Markdown code blocks are automatically extracted.
            </p>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPasteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleProcessPastedResults} 
              disabled={isProcessingPaste || !pastedJson.trim()}
            >
              {isProcessingPaste ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Segments
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SegmentFrameTimeline
