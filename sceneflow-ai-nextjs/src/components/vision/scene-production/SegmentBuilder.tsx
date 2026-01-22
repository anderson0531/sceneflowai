'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  ChevronRight,
  Film,
  Clock,
  MessageSquare,
  BookOpen,
  Layers,
  Settings2,
  Lock,
  ArrowRight,
  RefreshCw,
  Wand2,
  Play,
  Eye,
  Edit3,
  AlertTriangle,
  Users,
  MapPin,
  FileText,
  Volume2,
  CheckCircle2,
} from 'lucide-react'
import {
  SceneSegment,
  SceneProductionData,
  SceneProductionReferences,
} from './types'
import { SegmentPreviewTimeline } from './SegmentPreviewTimeline'
import { SegmentPromptEditor } from './SegmentPromptEditor'
import { SegmentValidation, ValidationResult } from '@/lib/intelligence/SegmentValidation'

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Scene Bible - Immutable scene content during segmentation
 * This is the "single source of truth" for the scene's creative content
 */
export interface SceneBible {
  sceneId: string
  sceneNumber: number
  heading: string
  location: string
  timeOfDay: string
  visualDescription: string
  narration: string | null
  dialogue: Array<{
    id: string
    character: string
    text: string
    emotion?: string
  }>
  characters: Array<{
    id: string
    name: string
    description?: string
    appearanceDescription?: string
    referenceImageUrl?: string
  }>
  sceneFrameUrl?: string | null
  // Computed content hash for staleness detection
  contentHash: string
}

/**
 * Proposed segment from AI analysis (preview mode)
 */
export interface ProposedSegment {
  id: string
  sequenceIndex: number
  startTime: number
  endTime: number
  duration: number
  triggerReason: string
  generationMethod: 'T2V' | 'I2V' | 'EXT' | 'FTV'
  generatedPrompt: string
  emotionalBeat: string
  dialogueLineIds: string[]
  confidence: number
  // Validation status
  validation?: ValidationResult
  // User adjustments
  isAdjusted: boolean
  userEditedPrompt?: string | null
}

/**
 * Workflow phase for the builder
 */
export type BuilderPhase = 'analyze' | 'review' | 'finalize'

interface SegmentBuilderProps {
  sceneId: string
  sceneNumber: number
  scene: any // Full scene object from script.script.scenes
  productionData?: SceneProductionData | null
  references: SceneProductionReferences
  projectId: string
  onSegmentsGenerated: (segments: SceneSegment[]) => void
  onSegmentsFinalized: (segments: SceneSegment[]) => void
  onClose?: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a content hash for staleness detection
 */
function generateContentHash(scene: any): string {
  const content = JSON.stringify({
    heading: scene.heading,
    visualDescription: scene.visualDescription || scene.action,
    narration: scene.narration,
    dialogue: scene.dialogue?.map((d: any) => ({
      character: d.character,
      text: d.text || d.dialogue || d.line,
    })),
  })
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

/**
 * Extract Scene Bible from scene data
 */
function extractSceneBible(scene: any, sceneNumber: number, characters: any[]): SceneBible {
  const headingText = typeof scene.heading === 'string' 
    ? scene.heading 
    : scene.heading?.text || 'UNKNOWN LOCATION'
  
  // Parse heading for location and time
  const headingMatch = headingText.match(/^(INT\.|EXT\.|INT\/EXT\.?)\s*(.+?)(?:\s*[-–]\s*(DAY|NIGHT|MORNING|EVENING|DAWN|DUSK|CONTINUOUS|LATER|MOMENTS LATER))?$/i)
  const location = headingMatch ? headingMatch[2].trim() : headingText
  const timeOfDay = headingMatch ? (headingMatch[3] || 'DAY') : 'DAY'

  // Map dialogue with IDs
  const dialogue = (scene.dialogue || []).map((d: any, idx: number) => ({
    id: d.id || `dialogue-${idx}`,
    character: d.character || d.name || 'UNKNOWN',
    text: d.text || d.dialogue || d.line || '',
    emotion: d.emotion || d.mood || undefined,
  }))

  // Map characters present in scene
  const sceneCharacterNames = new Set(dialogue.map((d: { character: string }) => d.character.toUpperCase()))
  const sceneCharacters = characters
    .filter(c => sceneCharacterNames.has(c.name?.toUpperCase()))
    .map(c => ({
      id: c.id || c.name,
      name: c.name,
      description: c.description,
      appearanceDescription: c.appearance || c.appearanceDescription,
      referenceImageUrl: c.referenceImage || c.referenceImageUrl,
    }))

  return {
    sceneId: scene.id || `scene-${sceneNumber}`,
    sceneNumber,
    heading: headingText,
    location,
    timeOfDay,
    visualDescription: scene.visualDescription || scene.action || scene.summary || '',
    narration: scene.narration || null,
    dialogue,
    characters: sceneCharacters,
    sceneFrameUrl: scene.imageUrl || scene.sceneImageUrl || null,
    contentHash: generateContentHash(scene),
  }
}

/**
 * Extract audio metadata from scene for intelligent segmentation
 * This includes narration duration and dialogue timing for audio-aligned segments
 */
function extractAudioMetadata(scene: any, selectedLanguage = 'en-US'): {
  narrationDurationSeconds: number | null
  narrationText: string | null
  narrationAudioUrl: string | null
  dialogueDurations: Array<{ character: string; text: string; durationSeconds: number }>
  totalAudioDurationSeconds: number
} {
  // Extract narration metadata
  const narrationAudio = scene.narrationAudio?.[selectedLanguage] || scene.narrationAudio?.['en-US'] || {}
  const narrationDurationSeconds = scene.narrationDuration 
    || narrationAudio.duration 
    || (scene.narrationUrl && 10) // Default estimate if URL exists but no duration
    || null
  const narrationText = scene.narration || null
  const narrationAudioUrl = scene.narrationUrl || narrationAudio.url || null

  // Extract dialogue durations
  const dialogueAudioArray = Array.isArray(scene.dialogueAudio)
    ? scene.dialogueAudio
    : (scene.dialogueAudio?.[selectedLanguage] || [])
  
  const dialogueDurations = (scene.dialogue || []).map((d: any, idx: number) => {
    const audioData = dialogueAudioArray[idx] || {}
    const text = d.text || d.dialogue || d.line || ''
    // Estimate: ~2.5 words per second if no duration available
    const estimatedDuration = text.split(/\s+/).length / 2.5
    return {
      character: d.character || d.name || 'UNKNOWN',
      text,
      durationSeconds: audioData.duration || estimatedDuration,
    }
  })

  // Calculate total audio duration
  const totalDialogueDuration = dialogueDurations.reduce((acc: number, d) => acc + d.durationSeconds, 0)
  const totalAudioDurationSeconds = Math.max(
    narrationDurationSeconds || 0,
    totalDialogueDuration
  ) + 2 // Buffer for gaps between dialogue

  return {
    narrationDurationSeconds,
    narrationText,
    narrationAudioUrl,
    dialogueDurations,
    totalAudioDurationSeconds,
  }
}

// ============================================================================
// Scene Bible Panel Component
// ============================================================================

interface SceneBiblePanelProps {
  bible: SceneBible
}

function SceneBiblePanel({ bible }: SceneBiblePanelProps) {
  return (
    <Card className="border-amber-500/30 bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-500" />
          <CardTitle className="text-sm text-amber-500">Scene Bible</CardTitle>
          <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-400">
            Read-Only During Segmentation
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Edit the scene in the Script tab if changes are needed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Heading */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Scene Heading</span>
          </div>
          <p className="text-sm font-mono bg-background/50 px-2 py-1 rounded border border-border/50">
            {bible.heading}
          </p>
        </div>

        {/* Visual Description */}
        {bible.visualDescription && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Eye className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Visual Description</span>
            </div>
            <ScrollArea className="h-20">
              <p className="text-xs text-foreground/80 bg-background/50 px-2 py-1 rounded border border-border/50">
                {bible.visualDescription}
              </p>
            </ScrollArea>
          </div>
        )}

        {/* Narration */}
        {bible.narration && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Volume2 className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Narration</span>
            </div>
            <ScrollArea className="h-16">
              <p className="text-xs italic text-foreground/80 bg-background/50 px-2 py-1 rounded border border-border/50">
                "{bible.narration}"
              </p>
            </ScrollArea>
          </div>
        )}

        {/* Dialogue */}
        {bible.dialogue.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Dialogue ({bible.dialogue.length} lines)
              </span>
            </div>
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {bible.dialogue.map((line, idx) => (
                  <div
                    key={line.id}
                    className="text-xs bg-background/50 px-2 py-1 rounded border border-border/50"
                  >
                    <span className="font-semibold text-primary">{line.character}:</span>{' '}
                    <span className="text-foreground/80">"{line.text}"</span>
                    {line.emotion && (
                      <span className="text-muted-foreground ml-1">({line.emotion})</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Characters */}
        {bible.characters.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Characters ({bible.characters.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {bible.characters.map(char => (
                <Badge key={char.id} variant="secondary" className="text-[10px]">
                  {char.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Workflow Phase Indicator
// ============================================================================

interface PhaseIndicatorProps {
  currentPhase: BuilderPhase
  onPhaseClick: (phase: BuilderPhase) => void
  canAdvance: { review: boolean; finalize: boolean }
}

function PhaseIndicator({ currentPhase, onPhaseClick, canAdvance }: PhaseIndicatorProps) {
  const phases: { id: BuilderPhase; label: string; icon: React.ReactNode }[] = [
    { id: 'analyze', label: 'AI Analysis', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'review', label: 'Review & Revise', icon: <Edit3 className="w-4 h-4" /> },
    { id: 'finalize', label: 'Finalize', icon: <Check className="w-4 h-4" /> },
  ]

  const getPhaseStatus = (phase: BuilderPhase) => {
    const phaseOrder = ['analyze', 'review', 'finalize']
    const currentIndex = phaseOrder.indexOf(currentPhase)
    const phaseIndex = phaseOrder.indexOf(phase)
    
    if (phaseIndex < currentIndex) return 'complete'
    if (phaseIndex === currentIndex) return 'current'
    return 'pending'
  }

  const canClickPhase = (phase: BuilderPhase) => {
    if (phase === 'analyze') return true
    if (phase === 'review') return canAdvance.review
    if (phase === 'finalize') return canAdvance.finalize
    return false
  }

  return (
    <div className="flex items-center gap-2">
      {phases.map((phase, idx) => {
        const status = getPhaseStatus(phase.id)
        const canClick = canClickPhase(phase.id)
        
        return (
          <React.Fragment key={phase.id}>
            <button
              onClick={() => canClick && onPhaseClick(phase.id)}
              disabled={!canClick}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                status === 'current' && 'bg-primary text-primary-foreground',
                status === 'complete' && 'bg-green-500/20 text-green-500',
                status === 'pending' && 'bg-muted text-muted-foreground',
                canClick && status !== 'current' && 'hover:bg-muted/80 cursor-pointer',
                !canClick && 'opacity-50 cursor-not-allowed'
              )}
            >
              {status === 'complete' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                phase.icon
              )}
              <span className="text-sm font-medium">{phase.label}</span>
            </button>
            {idx < phases.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SegmentBuilder({
  sceneId,
  sceneNumber,
  scene,
  productionData,
  references,
  projectId,
  onSegmentsGenerated,
  onSegmentsFinalized,
  onClose,
}: SegmentBuilderProps) {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [phase, setPhase] = useState<BuilderPhase>('analyze')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [proposedSegments, setProposedSegments] = useState<ProposedSegment[]>([])
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Generation options
  const [targetDuration, setTargetDuration] = useState(6) // 4-8 seconds
  const [narrationDriven, setNarrationDriven] = useState(false)
  
  // Regeneration dialog state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [regenerationConfig, setRegenerationConfig] = useState({
    targetDuration: 6,
    narrationDriven: false,
    preserveManualEdits: false,
  })
  
  // Track scene bible hash for staleness
  const [lastGeneratedHash, setLastGeneratedHash] = useState<string | null>(null)
  
  // Track if we have existing finalized segments
  const existingSegments = productionData?.segments || []
  const hasExistingSegments = existingSegments.length > 0
  const hasExistingVideoAssets = existingSegments.some(
    seg => seg.activeAssetUrl || (seg.takes && seg.takes.length > 0)
  )

  // -------------------------------------------------------------------------
  // Derived State
  // -------------------------------------------------------------------------
  
  // Extract Scene Bible (immutable during segmentation)
  const sceneBible = useMemo(() => {
    return extractSceneBible(scene, sceneNumber, references.characters)
  }, [scene, sceneNumber, references.characters])

  // Extract audio metadata for intelligent segmentation
  const audioMetadata = useMemo(() => {
    return extractAudioMetadata(scene)
  }, [scene])

  // Auto-enable narration-driven mode if scene has narration audio
  useEffect(() => {
    if (audioMetadata.narrationDurationSeconds && audioMetadata.narrationDurationSeconds > 0) {
      setNarrationDriven(true)
    }
  }, [audioMetadata.narrationDurationSeconds])

  // Selected segment for editing
  const selectedSegment = useMemo(() => {
    return proposedSegments.find(s => s.id === selectedSegmentId) || null
  }, [proposedSegments, selectedSegmentId])

  // Validation for all segments
  const allValidations = useMemo(() => {
    return proposedSegments.map(seg => ({
      segmentId: seg.id,
      validation: SegmentValidation.validateSegment(seg, sceneBible),
    }))
  }, [proposedSegments, sceneBible])

  // Check if can advance to next phase
  const canAdvance = useMemo(() => {
    const hasSegments = proposedSegments.length > 0
    const allValid = allValidations.every(v => v.validation.isValid)
    
    return {
      review: hasSegments,
      finalize: hasSegments && allValid,
    }
  }, [proposedSegments, allValidations])

  // Total estimated duration
  const totalDuration = useMemo(() => {
    return proposedSegments.reduce((sum, seg) => sum + seg.duration, 0)
  }, [proposedSegments])
  
  // Staleness detection - check if scene content changed since last generation
  const isStale = useMemo(() => {
    if (!lastGeneratedHash) return false
    return sceneBible.contentHash !== lastGeneratedHash
  }, [sceneBible.contentHash, lastGeneratedHash])
  
  // Check if existing segments are stale (for post-finalization view)
  const existingSegmentsStale = useMemo(() => {
    if (!hasExistingSegments) return false
    const firstSegment = existingSegments[0]
    const savedHash = firstSegment.promptContext?.visualDescriptionHash
    if (!savedHash) return false
    return savedHash !== sceneBible.contentHash
  }, [hasExistingSegments, existingSegments, sceneBible.contentHash])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch(`/api/scenes/${sceneId}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredDuration: targetDuration,
          projectId,
          focusMode: 'balanced',
          narrationDriven,
          // Pass audio metadata for intelligent segmentation
          narrationDurationSeconds: audioMetadata.narrationDurationSeconds,
          narrationText: audioMetadata.narrationText,
          narrationAudioUrl: audioMetadata.narrationAudioUrl,
          // Pass total audio duration for minimum segment calculation
          totalAudioDurationSeconds: audioMetadata.totalAudioDurationSeconds,
          // Request preview mode (segments not committed)
          previewMode: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze scene')
      }

      const data = await response.json()
      
      // Transform API segments to ProposedSegments
      const proposed: ProposedSegment[] = data.segments.map((seg: any) => ({
        id: seg.segmentId,
        sequenceIndex: seg.sequenceIndex,
        startTime: seg.startTime,
        endTime: seg.endTime,
        duration: seg.endTime - seg.startTime,
        triggerReason: seg.triggerReason || 'AI-determined cut point',
        generationMethod: seg.generationMethod || 'T2V',
        generatedPrompt: seg.generatedPrompt || '',
        emotionalBeat: seg.emotionalBeat || '',
        dialogueLineIds: seg.dialogueLineIds || [],
        confidence: seg.generationPlan?.confidence || 75,
        isAdjusted: false,
        userEditedPrompt: null,
      }))

      setProposedSegments(proposed)
      setPhase('review')
      
      // Save the content hash for staleness detection
      setLastGeneratedHash(sceneBible.contentHash)
      
      // Select first segment
      if (proposed.length > 0) {
        setSelectedSegmentId(proposed[0].id)
      }

      toast.success(`AI generated ${proposed.length} segments`)
    } catch (err: any) {
      console.error('[SegmentBuilder] Analysis error:', err)
      setError(err.message || 'Failed to analyze scene')
      toast.error('Failed to analyze scene')
    } finally {
      setIsAnalyzing(false)
    }
  }, [sceneId, projectId, targetDuration, narrationDriven, audioMetadata, sceneBible.contentHash])

  const handlePromptEdit = useCallback((segmentId: string, newPrompt: string) => {
    setProposedSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId) return seg
      return {
        ...seg,
        userEditedPrompt: newPrompt,
        isAdjusted: true,
      }
    }))
  }, [])

  const handleSegmentAdjust = useCallback((
    segmentId: string,
    changes: Partial<Pick<ProposedSegment, 'startTime' | 'endTime' | 'duration'>>
  ) => {
    setProposedSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId) return seg
      
      const newStartTime = changes.startTime ?? seg.startTime
      const newEndTime = changes.endTime ?? seg.endTime
      const newDuration = newEndTime - newStartTime
      
      return {
        ...seg,
        startTime: newStartTime,
        endTime: newEndTime,
        duration: newDuration,
        isAdjusted: true,
      }
    }))
  }, [])

  // Open regeneration dialog with current settings
  const handleOpenRegenerateDialog = useCallback(() => {
    setRegenerationConfig({
      targetDuration,
      narrationDriven,
      preserveManualEdits: false,
    })
    setShowRegenerateDialog(true)
  }, [targetDuration, narrationDriven])
  
  // Confirm regeneration from dialog
  const handleConfirmRegenerate = useCallback(() => {
    // Apply config to generation options
    setTargetDuration(regenerationConfig.targetDuration)
    setNarrationDriven(regenerationConfig.narrationDriven)
    
    // Store current user-edited prompts if preserving
    const preservedEdits = regenerationConfig.preserveManualEdits
      ? proposedSegments
          .filter(s => s.userEditedPrompt)
          .map(s => ({ sequenceIndex: s.sequenceIndex, prompt: s.userEditedPrompt }))
      : []
    
    // Reset state for new generation
    setPhase('analyze')
    setProposedSegments([])
    setSelectedSegmentId(null)
    setShowRegenerateDialog(false)
    
    toast.info('Ready for regeneration - click Generate Segments')
  }, [regenerationConfig, proposedSegments])
  
  // Quick regenerate (no dialog, same settings)
  const handleQuickRegenerate = useCallback(() => {
    setPhase('analyze')
    setProposedSegments([])
    setSelectedSegmentId(null)
  }, [])

  const handleFinalize = useCallback(() => {
    // Transform ProposedSegments to SceneSegments
    const finalSegments: SceneSegment[] = proposedSegments.map(seg => ({
      segmentId: seg.id,
      sequenceIndex: seg.sequenceIndex,
      startTime: seg.startTime,
      endTime: seg.endTime,
      status: 'READY' as const,
      generatedPrompt: seg.generatedPrompt,
      userEditedPrompt: seg.userEditedPrompt,
      activeAssetUrl: null,
      assetType: null,
      generationMethod: seg.generationMethod,
      triggerReason: seg.triggerReason,
      emotionalBeat: seg.emotionalBeat,
      dialogueLineIds: seg.dialogueLineIds,
      references: {
        startFrameUrl: null,
        endFrameUrl: null,
        useSceneFrame: seg.sequenceIndex === 0,
        characterRefs: [],
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
      takes: [],
      // Prompt context for staleness detection
      promptContext: {
        dialogueHash: '',
        visualDescriptionHash: sceneBible.contentHash,
        generatedAt: new Date().toISOString(),
        sceneNumber: sceneBible.sceneNumber,
      },
      isStale: false,
    }))

    onSegmentsFinalized(finalSegments)
    toast.success(`Finalized ${finalSegments.length} segments - Ready for Key Frames`)
    
    if (onClose) {
      onClose()
    }
  }, [proposedSegments, sceneBible, onSegmentsFinalized, onClose])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Segment Builder</h2>
          </div>
          <Badge variant="outline">Scene {sceneNumber}</Badge>
        </div>
        <PhaseIndicator
          currentPhase={phase}
          onPhaseClick={setPhase}
          canAdvance={canAdvance}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Left Panel: Scene Bible (Read-Only) */}
        <div className="w-64 flex-shrink-0 border-r border-border p-4 overflow-y-auto">
          <SceneBiblePanel bible={sceneBible} />
        </div>

        {/* Center Panel: Timeline & Segments */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Phase: Analyze */}
          {phase === 'analyze' && (
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI Scene Analysis
                  </CardTitle>
                  <CardDescription>
                    Generate intelligent segments based on scene content (narration, dialogue, and scene changes)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing Segments Warning */}
                  {hasExistingSegments && (
                    <Alert className={cn(
                      "border",
                      existingSegmentsStale 
                        ? "border-amber-500/50 bg-amber-950/20" 
                        : "border-blue-500/50 bg-blue-950/20"
                    )}>
                      <div className="flex items-start gap-2">
                        {existingSegmentsStale ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                        ) : (
                          <Layers className="w-4 h-4 text-blue-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm font-medium",
                            existingSegmentsStale ? "text-amber-400" : "text-blue-400"
                          )}>
                            {existingSegments.length} Existing Segments
                            {existingSegmentsStale && " (Scene Changed)"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {hasExistingVideoAssets ? (
                              <>
                                <span className="text-red-400 font-medium">Warning:</span> Regenerating will discard {existingSegments.filter(s => s.activeAssetUrl || s.takes?.length).length} generated video assets.
                              </>
                            ) : (
                              "Regenerating will replace current segment configuration."
                            )}
                          </p>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* Duration Setting */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Segment Duration</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={4}
                        max={8}
                        step={1}
                        value={targetDuration}
                        onChange={e => setTargetDuration(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-12">{targetDuration}s</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Segments will be up to {targetDuration} seconds (Veo 3.1 optimal range: 4-8s)
                    </p>
                  </div>

                  {/* Narration-Driven Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Narration-Driven</p>
                      <p className="text-xs text-muted-foreground">
                        Prioritize narration timing for segment boundaries
                      </p>
                    </div>
                    <Button
                      variant={narrationDriven ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNarrationDriven(!narrationDriven)}
                    >
                      {narrationDriven ? 'On' : 'Off'}
                    </Button>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Generate Button */}
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full"
                    size="lg"
                    variant={hasExistingVideoAssets ? 'destructive' : 'default'}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Scene...
                      </>
                    ) : hasExistingSegments ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate Segments
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Segments
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Phase: Review */}
          {phase === 'review' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Timeline Preview */}
              <div className="h-48 border-b border-border p-4">
                <SegmentPreviewTimeline
                  segments={proposedSegments}
                  sceneBible={sceneBible}
                  selectedSegmentId={selectedSegmentId}
                  onSelectSegment={setSelectedSegmentId}
                  onAdjustSegment={handleSegmentAdjust}
                  totalDuration={totalDuration}
                />
              </div>

              {/* Segment Editor */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedSegment ? (
                  <SegmentPromptEditor
                    segment={selectedSegment}
                    sceneBible={sceneBible}
                    validation={allValidations.find(v => v.segmentId === selectedSegment.id)?.validation}
                    onPromptChange={handlePromptEdit}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Select a segment to edit</p>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-medium">{proposedSegments.length}</span>{' '}
                    <span className="text-muted-foreground">segments</span>
                  </div>
                  <div className="text-sm">
                    <Clock className="w-3 h-3 inline mr-1" />
                    <span className="font-mono">{totalDuration.toFixed(1)}s</span>{' '}
                    <span className="text-muted-foreground">total</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Staleness Warning */}
                  {isStale && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/50 gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Scene Changed
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={handleQuickRegenerate}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Quick Regen
                  </Button>
                  <Button variant="outline" onClick={handleOpenRegenerateDialog}>
                    <Settings2 className="w-4 h-4 mr-2" />
                    Regenerate...
                  </Button>
                  <Button
                    onClick={() => setPhase('finalize')}
                    disabled={!canAdvance.finalize}
                  >
                    Continue to Finalize
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Phase: Finalize */}
          {phase === 'finalize' && (
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="w-full max-w-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    Ready to Finalize
                  </CardTitle>
                  <CardDescription>
                    Review your segments before proceeding to Key Frame generation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Segments:</span>
                      <span className="font-medium">{proposedSegments.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Duration:</span>
                      <span className="font-medium font-mono">{totalDuration.toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dialogue Lines Covered:</span>
                      <span className="font-medium">
                        {new Set(proposedSegments.flatMap(s => s.dialogueLineIds)).size} / {sceneBible.dialogue.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">User Adjusted:</span>
                      <span className="font-medium">
                        {proposedSegments.filter(s => s.isAdjusted).length} segments
                      </span>
                    </div>
                  </div>

                  {/* Validation Warnings */}
                  {allValidations.some(v => !v.validation.isValid) && (
                    <Alert variant="destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        Some segments have validation issues. Please review before finalizing.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPhase('review')}
                      className="flex-1"
                    >
                      Back to Review
                    </Button>
                    <Button
                      onClick={handleFinalize}
                      className="flex-1"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Finalize & Proceed
                    </Button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    After finalizing, proceed to the Frame tab to generate key frames for each segment
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Regeneration Configuration Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Regenerate Segments
            </DialogTitle>
            <DialogDescription>
              Configure options for segment regeneration. Current proposals will be discarded.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Staleness Warning */}
            {isStale && (
              <Alert className="border-amber-500/50 bg-amber-950/20">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <AlertDescription className="text-amber-400">
                  Scene content has changed since last generation. Regeneration recommended.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Duration Setting */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Segment Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={4}
                  max={8}
                  step={1}
                  value={regenerationConfig.targetDuration}
                  onChange={e => setRegenerationConfig(prev => ({
                    ...prev,
                    targetDuration: parseInt(e.target.value)
                  }))}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-12">{regenerationConfig.targetDuration}s</span>
              </div>
            </div>

            {/* Narration-Driven Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Narration-Driven</p>
                <p className="text-xs text-muted-foreground">
                  Prioritize narration timing for segment boundaries
                </p>
              </div>
              <Button
                variant={regenerationConfig.narrationDriven ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRegenerationConfig(prev => ({
                  ...prev,
                  narrationDriven: !prev.narrationDriven
                }))}
              >
                {regenerationConfig.narrationDriven ? 'On' : 'Off'}
              </Button>
            </div>

            {/* Preserve Manual Edits Toggle */}
            {proposedSegments.some(s => s.userEditedPrompt) && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Preserve Manual Edits</p>
                  <p className="text-xs text-muted-foreground">
                    Attempt to reapply your prompt edits to matching segments
                  </p>
                </div>
                <Button
                  variant={regenerationConfig.preserveManualEdits ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRegenerationConfig(prev => ({
                    ...prev,
                    preserveManualEdits: !prev.preserveManualEdits
                  }))}
                >
                  {regenerationConfig.preserveManualEdits ? 'Yes' : 'No'}
                </Button>
              </div>
            )}

            {/* Warning about discarding current work */}
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                {proposedSegments.filter(s => s.isAdjusted).length > 0 
                  ? `${proposedSegments.filter(s => s.isAdjusted).length} adjusted segment(s) will be discarded.`
                  : 'Current segment proposals will be discarded.'}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRegenerate}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SegmentBuilder
