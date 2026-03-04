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
  Clapperboard,
  Camera,
  Video,
} from 'lucide-react'
import {
  SceneSegment,
  SceneProductionData,
  SceneProductionReferences,
} from './types'
import { SegmentPreviewTimeline } from './SegmentPreviewTimeline'
import { SegmentPromptEditor } from './SegmentPromptEditor'
import { SegmentValidation, ValidationResult } from '@/lib/intelligence/SegmentValidation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ============================================================================
// Segment Direction Card Component
// ============================================================================

interface SegmentDirectionCardProps {
  direction: ProposedDirection
  index: number
  dialogueLines: Array<{ id: string; character: string; text: string }>
  isSelected: boolean
  onSelect: () => void
  onEdit: (updates: Partial<ProposedDirection>) => void
  onApprove: () => void
  onGeneratePrompt: () => void
}

function SegmentDirectionCard({
  direction,
  index,
  dialogueLines,
  isSelected,
  onSelect,
  onEdit,
  onApprove,
  onGeneratePrompt,
}: SegmentDirectionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  
  // Get dialogue lines for this segment
  const segmentDialogue = dialogueLines.filter(d => 
    direction.dialogueLineIds.includes(d.id)
  )
  
  const methodColors: Record<string, string> = {
    'I2V': 'bg-green-500/20 text-green-400 border-green-500/30',
    'T2V': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'EXT': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'FTV': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  }
  
  const confidenceColor = direction.confidence >= 80 
    ? 'text-green-400' 
    : direction.confidence >= 60 
    ? 'text-amber-400' 
    : 'text-red-400'
  
  return (
    <Card 
      className={cn(
        "transition-all cursor-pointer",
        isSelected && "ring-2 ring-primary",
        direction.isApproved && "border-green-500/50 bg-green-950/10",
        direction.isNoTalent && "border-cyan-500/30"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {index + 1}
            </Badge>
            <Badge className={methodColors[direction.generationMethod] || ''}>
              {direction.generationMethod}
            </Badge>
            {direction.isNoTalent && (
              <Badge variant="outline" className="text-cyan-400 border-cyan-500/30">
                No Talent
              </Badge>
            )}
            {direction.isUserEdited && (
              <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                <Edit3 className="w-3 h-3 mr-1" />
                Edited
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-mono", confidenceColor)}>
              {direction.confidence}% conf
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              ~{direction.estimatedDuration}s
            </Badge>
          </div>
        </div>
        
        {/* Direction Details */}
        {isEditing ? (
          <div className="space-y-3" onClick={e => e.stopPropagation()}>
            {/* Shot Type */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Shot Type</label>
                <Select
                  value={direction.shotType}
                  onValueChange={v => onEdit({ shotType: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wide Shot">Wide Shot</SelectItem>
                    <SelectItem value="Medium Shot">Medium Shot</SelectItem>
                    <SelectItem value="Medium Close-Up">Medium Close-Up</SelectItem>
                    <SelectItem value="Close-Up">Close-Up</SelectItem>
                    <SelectItem value="Extreme Close-Up">Extreme Close-Up</SelectItem>
                    <SelectItem value="Two Shot">Two Shot</SelectItem>
                    <SelectItem value="Over-the-Shoulder">Over-the-Shoulder</SelectItem>
                    <SelectItem value="Insert Shot">Insert Shot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Camera</label>
                <Select
                  value={direction.cameraMovement}
                  onValueChange={v => onEdit({ cameraMovement: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Static">Static</SelectItem>
                    <SelectItem value="Dolly In">Dolly In</SelectItem>
                    <SelectItem value="Dolly Out">Dolly Out</SelectItem>
                    <SelectItem value="Pan Left">Pan Left</SelectItem>
                    <SelectItem value="Pan Right">Pan Right</SelectItem>
                    <SelectItem value="Tilt Up">Tilt Up</SelectItem>
                    <SelectItem value="Tilt Down">Tilt Down</SelectItem>
                    <SelectItem value="Handheld">Handheld</SelectItem>
                    <SelectItem value="Steadicam">Steadicam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Angle</label>
                <Select
                  value={direction.cameraAngle}
                  onValueChange={v => onEdit({ cameraAngle: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Eye-Level">Eye-Level</SelectItem>
                    <SelectItem value="Low Angle">Low Angle</SelectItem>
                    <SelectItem value="High Angle">High Angle</SelectItem>
                    <SelectItem value="Dutch Angle">Dutch Angle</SelectItem>
                    <SelectItem value="Bird's Eye">Bird's Eye</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Talent Action */}
            <div>
              <label className="text-xs text-muted-foreground">Talent Action</label>
              <Textarea
                value={direction.talentAction}
                onChange={e => onEdit({ talentAction: e.target.value })}
                placeholder="What the talent does in this segment..."
                className="h-16 text-xs resize-none"
              />
            </div>
            
            {/* Emotional Beat */}
            <div>
              <label className="text-xs text-muted-foreground">Emotional Beat</label>
              <Input
                value={direction.emotionalBeat}
                onChange={e => onEdit({ emotionalBeat: e.target.value })}
                placeholder="e.g., Tension building, Moment of realization"
                className="h-8 text-xs"
              />
            </div>
            
            {/* No Talent Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={direction.isNoTalent ? "default" : "outline"}
                size="sm"
                onClick={() => onEdit({ isNoTalent: !direction.isNoTalent, characters: direction.isNoTalent ? [] : direction.characters })}
                className="h-7 text-xs"
              >
                {direction.isNoTalent ? '✓ No Talent' : 'Mark as No Talent'}
              </Button>
              <span className="text-xs text-muted-foreground">
                (for abstract/title/establishing shots)
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Shot Info Row */}
            <div className="flex items-center gap-2 text-sm">
              <Camera className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{direction.shotType}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{direction.cameraMovement}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{direction.cameraAngle}</span>
            </div>
            
            {/* Talent Action */}
            {direction.talentAction && (
              <div className="flex items-start gap-2 text-sm">
                <Users className="w-3 h-3 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">{direction.talentAction}</span>
              </div>
            )}
            
            {/* Emotional Beat */}
            {direction.emotionalBeat && (
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-amber-300 text-xs">{direction.emotionalBeat}</span>
              </div>
            )}
            
            {/* Characters */}
            {direction.characters.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {direction.characters.map(char => (
                  <Badge key={char} variant="secondary" className="text-xs">
                    {char}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Dialogue Preview */}
            {segmentDialogue.length > 0 && (
              <div className="mt-2 p-2 rounded bg-muted/50 border border-border/50">
                <div className="flex items-center gap-1 mb-1">
                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {segmentDialogue.length} dialogue line{segmentDialogue.length > 1 ? 's' : ''}
                  </span>
                </div>
                {segmentDialogue.slice(0, 2).map((d, i) => (
                  <p key={i} className="text-xs text-muted-foreground truncate">
                    <span className="font-medium text-foreground">{d.character}:</span> "{d.text.substring(0, 40)}..."
                  </p>
                ))}
                {segmentDialogue.length > 2 && (
                  <p className="text-xs text-muted-foreground">+{segmentDialogue.length - 2} more</p>
                )}
              </div>
            )}
            
            {/* Trigger Reason */}
            <p className="text-xs text-muted-foreground italic">
              Cut: {direction.triggerReason}
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-7 text-xs"
          >
            <Edit3 className="w-3 h-3 mr-1" />
            {isEditing ? 'Done' : 'Edit'}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant={direction.isApproved ? "default" : "outline"}
              size="sm"
              onClick={onApprove}
              className={cn(
                "h-7 text-xs",
                direction.isApproved && "bg-green-600 hover:bg-green-700"
              )}
            >
              <Check className="w-3 h-3 mr-1" />
              {direction.isApproved ? 'Approved' : 'Approve'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Movie Set Production Overlay
// ============================================================================

const PRODUCTION_STAGES = [
  { id: 'setup', label: 'Setting up the scene...', icon: 'clapperboard', duration: 1500 },
  { id: 'lighting', label: 'Adjusting lights...', icon: 'lightbulb', duration: 1500 },
  { id: 'camera', label: 'Positioning camera...', icon: 'camera', duration: 1500 },
  { id: 'rolling', label: 'Rolling camera...', icon: 'video', duration: 2000 },
  { id: 'action', label: 'Action! Capturing takes...', icon: 'film', duration: 3000 },
  { id: 'processing', label: 'Processing footage...', icon: 'sparkles', duration: 0 }, // 0 = until complete
]

function ProductionOverlay({ isVisible, currentStage }: { isVisible: boolean; currentStage: number }) {
  if (!isVisible) return null

  const stage = PRODUCTION_STAGES[Math.min(currentStage, PRODUCTION_STAGES.length - 1)]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-8 p-12">
        {/* Animated spotlight effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-amber-500/10 via-transparent to-transparent animate-pulse" />
          <div className="absolute top-0 left-1/4 w-2 h-32 bg-gradient-to-b from-amber-400/50 to-transparent rotate-12 animate-[pulse_2s_ease-in-out_infinite]" />
          <div className="absolute top-0 right-1/4 w-2 h-32 bg-gradient-to-b from-amber-400/50 to-transparent -rotate-12 animate-[pulse_2s_ease-in-out_infinite_0.5s]" />
        </div>

        {/* Clapperboard animation */}
        <div className="relative">
          <div className="relative w-32 h-32">
            {/* Clapper base */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-lg border-2 border-zinc-700 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]" />
              <Film className="w-10 h-10 text-amber-500/60" />
            </div>
            {/* Clapper top (animated) */}
            <div 
              className={cn(
                "absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-t-lg border-2 border-zinc-600 origin-bottom transition-transform duration-300",
                currentStage >= 3 ? "animate-[clap_0.3s_ease-in-out]" : ""
              )}
              style={{
                background: 'repeating-linear-gradient(45deg, #18181b, #18181b 8px, #27272a 8px, #27272a 16px)'
              }}
            />
          </div>
        </div>

        {/* Stage indicator */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-amber-400">
            {stage.icon === 'clapperboard' && <Clapperboard className="w-6 h-6 animate-bounce" />}
            {stage.icon === 'lightbulb' && <div className="w-6 h-6 rounded-full bg-amber-400 animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.6)]" />}
            {stage.icon === 'camera' && <Camera className="w-6 h-6 animate-[wiggle_0.5s_ease-in-out_infinite]" />}
            {stage.icon === 'video' && <Video className="w-6 h-6 text-red-500 animate-pulse" />}
            {stage.icon === 'film' && <Film className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />}
            {stage.icon === 'sparkles' && <Sparkles className="w-6 h-6 animate-pulse" />}
            <span className="text-xl font-semibold tracking-wide">{stage.label}</span>
          </div>

          {/* Progress bar */}
          <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${((currentStage + 1) / PRODUCTION_STAGES.length) * 100}%` }}
            />
          </div>

          {/* Stage dots */}
          <div className="flex items-center gap-2">
            {PRODUCTION_STAGES.map((s, idx) => (
              <div
                key={s.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  idx < currentStage ? "bg-amber-500" :
                  idx === currentStage ? "bg-amber-400 scale-150 animate-pulse" :
                  "bg-zinc-700"
                )}
              />
            ))}
          </div>
        </div>

        {/* Production quote */}
        <p className="text-zinc-500 text-sm italic mt-4">
          "Quiet on set... and... ACTION!"
        </p>
      </div>

      <style jsx>{`
        @keyframes clap {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-25deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
    </div>
  )
}

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
 * Segment direction from Phase 1 (user reviews before prompt generation)
 */
export interface ProposedDirection {
  id: string
  sequenceIndex: number
  estimatedDuration: number
  shotType: string
  cameraMovement: string
  cameraAngle: string
  talentAction: string
  emotionalBeat: string
  characters: string[]
  isNoTalent: boolean
  lightingMood?: string
  keyProps?: string[]
  dialogueLineIds: string[]
  generationMethod: 'T2V' | 'I2V' | 'EXT' | 'FTV'
  triggerReason: string
  confidence: number
  // User review status
  isApproved: boolean
  isUserEdited: boolean
}

/**
 * Proposed segment from AI analysis (preview mode) - Phase 2 output
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
  // Link to approved direction
  directionId?: string
}

/**
 * Workflow phase for the builder
 * NEW: Added 'directions' phase between analyze and review
 */
export type BuilderPhase = 'analyze' | 'directions' | 'review' | 'finalize'

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
  canAdvance: { directions: boolean; review: boolean; finalize: boolean }
}

function PhaseIndicator({ currentPhase, onPhaseClick, canAdvance }: PhaseIndicatorProps) {
  const phases: { id: BuilderPhase; label: string; icon: React.ReactNode }[] = [
    { id: 'analyze', label: 'AI Analysis', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'directions', label: 'Review Directions', icon: <Eye className="w-4 h-4" /> },
    { id: 'review', label: 'Review Prompts', icon: <Edit3 className="w-4 h-4" /> },
    { id: 'finalize', label: 'Finalize', icon: <Check className="w-4 h-4" /> },
  ]

  const getPhaseStatus = (phase: BuilderPhase) => {
    const phaseOrder = ['analyze', 'directions', 'review', 'finalize']
    const currentIndex = phaseOrder.indexOf(currentPhase)
    const phaseIndex = phaseOrder.indexOf(phase)
    
    if (phaseIndex < currentIndex) return 'complete'
    if (phaseIndex === currentIndex) return 'current'
    return 'pending'
  }

  const canClickPhase = (phase: BuilderPhase) => {
    if (phase === 'analyze') return true
    if (phase === 'directions') return canAdvance.directions
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
  
  // NEW: Phase 1 - Proposed directions for user review
  const [proposedDirections, setProposedDirections] = useState<ProposedDirection[]>([])
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false)
  
  // Phase 2 - Proposed segments with full prompts
  const [proposedSegments, setProposedSegments] = useState<ProposedSegment[]>([])
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [selectedDirectionId, setSelectedDirectionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Production overlay state
  const [showProductionOverlay, setShowProductionOverlay] = useState(false)
  const [productionStage, setProductionStage] = useState(0)
  
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
    const hasDirections = proposedDirections.length > 0
    const allDirectionsApproved = proposedDirections.every(d => d.isApproved)
    const hasSegments = proposedSegments.length > 0
    const allValid = allValidations.every(v => v.validation.isValid)
    
    return {
      directions: hasDirections, // Can go to directions phase once we have them
      review: hasSegments, // Can go to review phase once we have segments with prompts
      finalize: hasSegments && allValid,
    }
  }, [proposedDirections, proposedSegments, allValidations])
  
  // Count approved directions
  const approvedDirectionCount = useMemo(() => {
    return proposedDirections.filter(d => d.isApproved).length
  }, [proposedDirections])

  // Total estimated duration from directions
  const totalDirectionsDuration = useMemo(() => {
    return proposedDirections.reduce((sum, d) => sum + d.estimatedDuration, 0)
  }, [proposedDirections])

  // Total estimated duration from segments
  const totalDuration = useMemo(() => {
    return proposedSegments.reduce((sum, seg) => sum + seg.duration, 0)
  }, [proposedSegments])
  
  // Check if scene has direction
  const hasSceneDirection = useMemo(() => {
    const dir = scene?.sceneDirection
    if (!dir) return false
    // Check if any meaningful direction exists
    return !!(dir.camera || dir.lighting || dir.scene || dir.talent || dir.audio)
  }, [scene?.sceneDirection])
  
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

  // Progress through production stages
  const runProductionAnimation = useCallback(async () => {
    setShowProductionOverlay(true)
    setProductionStage(0)
    
    for (let i = 0; i < PRODUCTION_STAGES.length - 1; i++) {
      await new Promise(resolve => setTimeout(resolve, PRODUCTION_STAGES[i].duration))
      setProductionStage(i + 1)
    }
    // Stay on final stage until generation completes
  }, [])

  // Phase 1: Generate segment directions for user review
  const handleAnalyze = useCallback(async () => {
    // Check for scene direction requirement
    if (!hasSceneDirection) {
      toast.error('Scene direction required', {
        description: 'Please generate scene direction first before creating segments.',
      })
      return
    }
    
    setIsAnalyzing(true)
    setError(null)
    
    // Start production animation
    runProductionAnimation()

    try {
      // NEW: Phase 1 - Get directions only (faster, user reviews before prompts)
      const response = await fetch(`/api/scenes/${sceneId}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredDuration: targetDuration,
          projectId,
          focusMode: 'balanced',
          narrationDriven,
          narrationDurationSeconds: audioMetadata.narrationDurationSeconds,
          narrationText: audioMetadata.narrationText,
          narrationAudioUrl: audioMetadata.narrationAudioUrl,
          totalAudioDurationSeconds: audioMetadata.totalAudioDurationSeconds,
          // NEW: Request directions phase only
          phase: 'directions',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze scene')
      }

      const data = await response.json()
      
      // Transform API directions to ProposedDirections
      const directions: ProposedDirection[] = data.directions.map((dir: any, idx: number) => ({
        id: `dir_${sceneId}_${idx + 1}`,
        sequenceIndex: idx,
        estimatedDuration: dir.estimatedDuration || targetDuration,
        shotType: dir.shotType || 'Medium Shot',
        cameraMovement: dir.cameraMovement || 'Static',
        cameraAngle: dir.cameraAngle || 'Eye-Level',
        talentAction: dir.talentAction || '',
        emotionalBeat: dir.emotionalBeat || '',
        characters: dir.characters || [],
        isNoTalent: dir.isNoTalent || false,
        lightingMood: dir.lightingMood,
        keyProps: dir.keyProps || [],
        dialogueLineIds: dir.dialogueLineIds || [],
        generationMethod: dir.generationMethod || 'T2V',
        triggerReason: dir.triggerReason || 'AI-determined cut point',
        confidence: dir.confidence || 75,
        isApproved: false, // User must approve
        isUserEdited: false,
      }))

      setProposedDirections(directions)
      setPhase('directions') // Go to directions review phase
      setLastGeneratedHash(sceneBible.contentHash)
      
      if (directions.length > 0) {
        setSelectedDirectionId(directions[0].id)
      }

      toast.success(`AI proposed ${directions.length} segment directions`, {
        description: 'Review and approve directions before generating prompts.',
      })
    } catch (err: any) {
      console.error('[SegmentBuilder] Analysis error:', err)
      setError(err.message || 'Failed to analyze scene')
      toast.error('Failed to analyze scene')
    } finally {
      setIsAnalyzing(false)
      setShowProductionOverlay(false)
      setProductionStage(0)
    }
  }, [sceneId, projectId, targetDuration, narrationDriven, audioMetadata, sceneBible.contentHash, hasSceneDirection, runProductionAnimation])

  // Phase 2: Generate prompts from approved directions
  const handleGeneratePrompts = useCallback(async () => {
    const approvedDirs = proposedDirections.filter(d => d.isApproved)
    
    if (approvedDirs.length === 0) {
      toast.error('No directions approved', {
        description: 'Please approve at least one segment direction.',
      })
      return
    }
    
    setIsGeneratingPrompts(true)
    setError(null)

    try {
      // Convert ProposedDirections to API format
      const apiDirections = approvedDirs.map(dir => ({
        shotType: dir.shotType,
        cameraMovement: dir.cameraMovement,
        cameraAngle: dir.cameraAngle,
        talentAction: dir.talentAction,
        emotionalBeat: dir.emotionalBeat,
        characters: dir.characters,
        isNoTalent: dir.isNoTalent,
        lightingMood: dir.lightingMood,
        keyProps: dir.keyProps,
        dialogueLineIds: dir.dialogueLineIds,
        isApproved: dir.isApproved,
        isUserEdited: dir.isUserEdited,
        generationMethod: dir.generationMethod,
        triggerReason: dir.triggerReason,
        confidence: dir.confidence,
      }))

      const response = await fetch(`/api/scenes/${sceneId}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredDuration: targetDuration,
          projectId,
          narrationDriven,
          narrationDurationSeconds: audioMetadata.narrationDurationSeconds,
          narrationText: audioMetadata.narrationText,
          narrationAudioUrl: audioMetadata.narrationAudioUrl,
          totalAudioDurationSeconds: audioMetadata.totalAudioDurationSeconds,
          // Phase 2: Generate prompts from approved directions
          phase: 'prompts',
          approvedDirections: apiDirections,
          previewMode: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate prompts')
      }

      const data = await response.json()
      
      // Transform to ProposedSegments
      const proposed: ProposedSegment[] = data.segments.map((seg: any, idx: number) => ({
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
        directionId: approvedDirs[idx]?.id,
      }))

      setProposedSegments(proposed)
      setPhase('review')
      
      if (proposed.length > 0) {
        setSelectedSegmentId(proposed[0].id)
      }

      toast.success(`Generated ${proposed.length} segment prompts`)
    } catch (err: any) {
      console.error('[SegmentBuilder] Prompt generation error:', err)
      setError(err.message || 'Failed to generate prompts')
      toast.error('Failed to generate prompts')
    } finally {
      setIsGeneratingPrompts(false)
    }
  }, [sceneId, projectId, targetDuration, narrationDriven, audioMetadata, proposedDirections])

  // Generate prompt for a single direction
  const handleGenerateSinglePrompt = useCallback(async (directionId: string) => {
    const direction = proposedDirections.find(d => d.id === directionId)
    if (!direction) return
    
    // Mark as approved and generate
    setProposedDirections(prev => prev.map(d => 
      d.id === directionId ? { ...d, isApproved: true } : d
    ))
    
    toast.info('Generating prompt...', { description: `For segment ${direction.sequenceIndex + 1}` })
    
    // For now, just mark it approved - user can click "Generate All Prompts" 
    // A future enhancement could generate just this one segment's prompt
  }, [proposedDirections])

  // Direction editing handlers
  const handleDirectionEdit = useCallback((directionId: string, updates: Partial<ProposedDirection>) => {
    setProposedDirections(prev => prev.map(d => {
      if (d.id !== directionId) return d
      return { ...d, ...updates, isUserEdited: true }
    }))
  }, [])

  const handleDirectionApprove = useCallback((directionId: string) => {
    setProposedDirections(prev => prev.map(d => {
      if (d.id !== directionId) return d
      return { ...d, isApproved: !d.isApproved }
    }))
  }, [])

  const handleApproveAll = useCallback(() => {
    setProposedDirections(prev => prev.map(d => ({ ...d, isApproved: true })))
    toast.success('All directions approved')
  }, [])

  // Legacy: Full segment generation (backwards compatible)
  const handleLegacyAnalyze = useCallback(async () => {
    if (!hasSceneDirection) {
      toast.error('Scene direction required')
      return
    }
    
    setIsAnalyzing(true)
    setError(null)
    runProductionAnimation()

    try {
      const response = await fetch(`/api/scenes/${sceneId}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredDuration: targetDuration,
          projectId,
          focusMode: 'balanced',
          narrationDriven,
          narrationDurationSeconds: audioMetadata.narrationDurationSeconds,
          narrationText: audioMetadata.narrationText,
          narrationAudioUrl: audioMetadata.narrationAudioUrl,
          totalAudioDurationSeconds: audioMetadata.totalAudioDurationSeconds,
          previewMode: true,
          // No phase = legacy full generation
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze scene')
      }

      const data = await response.json()
      
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
      setShowProductionOverlay(false)
      setProductionStage(0)
    }
  }, [sceneId, projectId, targetDuration, narrationDriven, audioMetadata, sceneBible.contentHash, hasSceneDirection, runProductionAnimation])

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
      {/* Production Overlay */}
      <ProductionOverlay isVisible={showProductionOverlay} currentStage={productionStage} />
      
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

                  {/* Scene Direction Requirement Warning */}
                  {!hasSceneDirection && (
                    <Alert className="border-amber-500/50 bg-amber-950/20">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <AlertDescription className="text-amber-200">
                        <strong>Scene direction required.</strong> Generate scene direction first to ensure segments follow your creative vision.
                      </AlertDescription>
                    </Alert>
                  )}

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
                    disabled={isAnalyzing || !hasSceneDirection}
                    className="w-full"
                    size="lg"
                    variant={hasExistingVideoAssets ? 'destructive' : 'default'}
                    title={!hasSceneDirection ? 'Generate scene direction first' : undefined}
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

          {/* Phase: Directions Review (NEW) */}
          {phase === 'directions' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Directions Header */}
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      Review Segment Directions
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Review and approve each segment's direction before generating video prompts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">
                      {approvedDirectionCount}/{proposedDirections.length} Approved
                    </Badge>
                    <Badge variant="outline">
                      ~{Math.round(totalDirectionsDuration)}s total
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Directions List */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {proposedDirections.map((direction, idx) => (
                    <SegmentDirectionCard
                      key={direction.id}
                      direction={direction}
                      index={idx}
                      dialogueLines={sceneBible.dialogue}
                      isSelected={selectedDirectionId === direction.id}
                      onSelect={() => setSelectedDirectionId(direction.id)}
                      onEdit={(updates) => handleDirectionEdit(direction.id, updates)}
                      onApprove={() => handleDirectionApprove(direction.id)}
                      onGeneratePrompt={() => handleGenerateSinglePrompt(direction.id)}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Actions Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApproveAll}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Approve All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPhase('analyze')
                      setProposedDirections([])
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Start Over
                  </Button>
                </div>
                <Button
                  onClick={handleGeneratePrompts}
                  disabled={approvedDirectionCount === 0 || isGeneratingPrompts}
                  size="lg"
                >
                  {isGeneratingPrompts ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Prompts...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Prompts ({approvedDirectionCount})
                    </>
                  )}
                </Button>
              </div>
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
