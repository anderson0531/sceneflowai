'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  FileText,
  CheckCircle2,
  Clapperboard,
  Camera,
  Video,
} from 'lucide-react'
import {
  SceneSegment,
  SceneProductionData,
  SceneProductionReferences,
  ValidationResult,
  SceneBible,
  ProposedDirection,
  ProposedSegment,
  BuilderPhase,
} from './types'
// Timeline removed
// SegmentValidation is dynamically imported to avoid circular dependency TDZ
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ============================================================================
// Dynamic Import Helper - Avoids TDZ circular dependency
// ============================================================================

/**
 * Lazily loads SegmentValidation class to avoid circular dependency TDZ error.
 * The validation module imports types from ./types, and we import from ./types too.
 * Static imports would cause bundler to evaluate both before either is ready.
 */
const getSegmentValidation = async () => {
  const { SegmentValidation } = await import('@/lib/intelligence/SegmentValidation')
  return SegmentValidation
}

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
  
  return (
    <Card 
      className={cn(
        "transition-all cursor-pointer",
        isSelected && "ring-2 ring-primary",
        direction.isApproved && "border-green-500/50 bg-green-950/10"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {index + 1}
            </Badge>
            <Badge className={methodColors[direction.generationMethod] || ''}>
              {direction.generationMethod}
            </Badge>
            {direction.isUserEdited && (
              <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                <Edit3 className="w-3 h-3 mr-1" />
                Edited
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              ~{direction.estimatedDuration}s
            </Badge>
          </div>
        </div>
        
        {/* Direction Details */}
        {isEditing ? (
          <div className="space-y-4" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Shot Type</label>
                <Input
                  value={direction.shotType}
                  onChange={e => onEdit({ shotType: e.target.value })}
                  placeholder="e.g., Medium Close-Up"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Trigger Reason</label>
                <Input
                  value={direction.triggerReason}
                  onChange={e => onEdit({ triggerReason: e.target.value })}
                  placeholder="Why cut here?"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            
            {/* Talent Action */}
            <div>
              <label className="text-xs text-muted-foreground">Talent Action</label>
              <Textarea
                value={direction.talentAction}
                onChange={e => onEdit({ talentAction: e.target.value })}
                placeholder="What the talent does in this segment..."
                className="h-20 text-sm resize-none"
              />
            </div>

            {/* Frame Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-green-400">Start Frame Image Prompt</label>
                <Textarea
                  value={direction.keyframeStartDescription || ''}
                  onChange={e => onEdit({ keyframeStartDescription: e.target.value })}
                  placeholder="Detailed prompt for the starting keyframe..."
                  className="h-32 text-xs resize-none mt-1 font-mono bg-green-950/20 border-green-900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-orange-400">End Frame Image Prompt</label>
                <Textarea
                  value={direction.keyframeEndDescription || ''}
                  onChange={e => onEdit({ keyframeEndDescription: e.target.value })}
                  placeholder="Detailed prompt for the ending keyframe..."
                  className="h-32 text-xs resize-none mt-1 font-mono bg-orange-950/20 border-orange-900"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── CAMERA SECTION ── */}
            <div className="flex items-center gap-2 text-sm">
              <Camera className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="font-medium">{direction.shotType}</span>
            </div>

            {/* ── PERFORMANCE SECTION ── */}
            {direction.talentAction && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Action</span>
                </div>
                <div className="p-2.5 rounded-md bg-muted/20 border border-border/20 space-y-2">
                  <p className="text-sm text-foreground/80 leading-relaxed">{direction.talentAction}</p>
                </div>
              </div>
            )}

            {/* ── FRAME PROMPTS SECTION ── */}
            {(direction.keyframeStartDescription || direction.keyframeEndDescription) && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Film className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Image Prompts</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {direction.keyframeStartDescription && (
                    <div className="p-2.5 rounded border border-green-500/20 bg-green-950/10">
                      <div className="text-[10px] uppercase text-green-500/70 mb-1.5 font-semibold">Start Frame</div>
                      <p className="text-xs text-foreground/70 leading-relaxed font-mono">{direction.keyframeStartDescription}</p>
                    </div>
                  )}
                  {direction.keyframeEndDescription && (
                    <div className="p-2.5 rounded border border-orange-500/20 bg-orange-950/10">
                      <div className="text-[10px] uppercase text-orange-500/70 mb-1.5 font-semibold">End Frame</div>
                      <p className="text-xs text-foreground/70 leading-relaxed font-mono">{direction.keyframeEndDescription}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dialogue Covered */}
        {segmentDialogue.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
              Audio Covered
            </div>
            <div className="space-y-1.5">
              {segmentDialogue.map((line, i) => (
                <div key={i} className="text-xs flex gap-2">
                  <span className="text-muted-foreground min-w-[60px]">{line.character}:</span>
                  <span className="text-foreground/90 italic truncate">"{line.text}"</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-8"
          >
            {isEditing ? 'Done Editing' : 'Edit Frames'}
          </Button>

          <div className="flex-1" />

          {direction.isApproved ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onApprove}
              className="h-8 text-green-400 border-green-500/30 hover:bg-green-500/10 hover:text-green-300"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Approved
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onApprove}
              className="h-8 bg-green-600 hover:bg-green-500 text-white"
            >
              Approve Segment
            </Button>
          )}
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
// Component Props (types imported from ./types to avoid circular dependency)
// ============================================================================

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

// Heuristic: determine whether the provided scene.narration should be treated as
// real narration (audio/script text) vs being a repeat of the scene's visual
// description. We conservatively only treat it as narration if it exists and is
// not exactly identical to the visual description. Presence of narration audio
// URLs still counts as narration.
function isLikelyNarration(scene: any): boolean {
  const narration = scene?.narration
  if (!narration) return false
  const nTrim = narration.toString().trim()
  if (!nTrim) return false
  const visual = (scene.visualDescription || scene.action || scene.summary || '').toString().trim()
  if (visual && nTrim === visual) return false
  return true
}

/**
 * Generate a content hash for staleness detection
 */
function generateContentHash(scene: any): string {
  const content = JSON.stringify({
    heading: scene.heading,
    visualDescription: scene.visualDescription || scene.action,
    narration: isLikelyNarration(scene) ? scene.narration : null,
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
    narration: isLikelyNarration(scene) ? scene.narration : null,
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
  // Extract narration metadata (safely filter out visual-description masquerading as narration)
  const narrationAudio = scene.narrationAudio?.[selectedLanguage] || scene.narrationAudio?.['en-US'] || {}
  const hasNarrationAudio = Boolean(narrationAudio?.url || scene.narrationUrl)
  const narrationText = isLikelyNarration(scene) ? scene.narration : null
  const narrationAudioUrl = hasNarrationAudio ? (scene.narrationUrl || narrationAudio.url || null) : null
  const narrationDurationSeconds = (narrationText || hasNarrationAudio)
    ? (scene.narrationDuration || narrationAudio.duration || (hasNarrationAudio ? 10 : null) || null)
    : null

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

// ============================================================================
// Workflow Phase Indicator
// ============================================================================

interface PhaseIndicatorProps {
  currentPhase: BuilderPhase
  onPhaseClick: (phase: BuilderPhase) => void
  canAdvance: { directions: boolean }
}

function PhaseIndicator({ currentPhase, onPhaseClick, canAdvance }: PhaseIndicatorProps) {
  const phases: { id: BuilderPhase; label: string; icon: React.ReactNode }[] = [
    { id: 'analyze', label: 'Analysis', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'directions', label: 'Review Segments', icon: <Eye className="w-4 h-4" /> },
  ]

  const getPhaseStatus = (phase: BuilderPhase) => {
    const phaseOrder = ['analyze', 'directions']
    const currentIndex = phaseOrder.indexOf(currentPhase)
    const phaseIndex = phaseOrder.indexOf(phase)
    
    if (phaseIndex < currentIndex) return 'complete'
    if (phaseIndex === currentIndex) return 'current'
    return 'pending'
  }

  const canClickPhase = (phase: BuilderPhase) => {
    if (phase === 'analyze') return true
    if (phase === 'directions') return canAdvance.directions
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
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium',
                status === 'current' && 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20',
                status === 'complete' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                status === 'pending' && 'text-gray-500',
                canClick && status !== 'current' && 'hover:bg-gray-800 cursor-pointer',
                !canClick && 'opacity-50 cursor-not-allowed'
              )}
            >
              {status === 'complete' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                phase.icon
              )}
              <span>{phase.label}</span>
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
// Client-Side Segment Duration Enforcement (Safety Net)
// ============================================================================

const CLIENT_MAX_SEGMENT_DURATION = 8 // Veo 3.1 max

/**
 * Snap a duration to the nearest valid Veo 3.1 duration (4, 6, or 8 seconds).
 */
function snapToVeoDuration(duration: number): number {
  if (duration <= 5) return 4
  if (duration <= 7) return 6
  return 8
}

/**
 * Client-side safety net: split any ProposedSegments that exceed the max duration.
 * This runs after API response in case the server-side enforcement was bypassed.
 */
function enforceClientMaxDuration(segments: ProposedSegment[]): ProposedSegment[] {
  const needsSplit = segments.some(s => s.duration > CLIENT_MAX_SEGMENT_DURATION)
  if (!needsSplit) return segments

  const result: ProposedSegment[] = []
  let globalIndex = 0

  for (const seg of segments) {
    if (seg.duration <= CLIENT_MAX_SEGMENT_DURATION) {
      result.push({ ...seg, sequenceIndex: globalIndex })
      globalIndex++
      continue
    }

    // Split oversized segment
    const numParts = Math.ceil(seg.duration / CLIENT_MAX_SEGMENT_DURATION)
    const rawPartDuration = seg.duration / numParts
    let currentStart = seg.startTime
    const dialoguePerPart = Math.ceil(seg.dialogueLineIds.length / numParts)

    console.log(
      `[Client Split] Segment ${seg.id} (${seg.duration.toFixed(1)}s) → ${numParts} parts`
    )

    for (let i = 0; i < numParts; i++) {
      const partDuration = i === numParts - 1
        ? snapToVeoDuration(seg.endTime - currentStart)
        : snapToVeoDuration(rawPartDuration)
      const partEnd = currentStart + partDuration
      const partDialogue = seg.dialogueLineIds.slice(
        i * dialoguePerPart,
        (i + 1) * dialoguePerPart
      )

      result.push({
        ...seg,
        id: i === 0 ? seg.id : `${seg.id}_split${i}`,
        sequenceIndex: globalIndex,
        startTime: currentStart,
        endTime: partEnd,
        duration: partDuration,
        dialogueLineIds: partDialogue,
        triggerReason: i === 0
          ? seg.triggerReason
          : `Split from oversized segment (part ${i + 1}/${numParts})`,
        isAdjusted: false,
        userEditedPrompt: null,
      })

      currentStart = partEnd
      globalIndex++
    }
  }

  return result
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
  const [selectedDirectionId, setSelectedDirectionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Production overlay state
  const [showProductionOverlay, setShowProductionOverlay] = useState(false)
  const [productionStage, setProductionStage] = useState(0)
  
  // Generation options
  const [targetDuration, setTargetDuration] = useState(6) // 4-8 seconds
  const [narrationDriven, setNarrationDriven] = useState(false)
  const [totalDurationTarget, setTotalDurationTarget] = useState<number | null>(null) // null = let AI decide
  const [segmentCountTarget, setSegmentCountTarget] = useState<number | null>(null) // null = let AI decide
  const [focusMode, setFocusMode] = useState<'balanced' | 'dialogue-focused' | 'action-focused'>('balanced')
  const [customInstructions, setCustomInstructions] = useState('')
  
  // Regeneration dialog state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [regenerationConfig, setRegenerationConfig] = useState({
    targetDuration: 6,
    narrationDriven: false,
    preserveManualEdits: false,
  })
  
  // Track scene bible hash for staleness
  const [lastGeneratedHash, setLastGeneratedHash] = useState<string | null>(null)
  
  // Validation results (loaded asynchronously to avoid TDZ)
  const [allValidations, setAllValidations] = useState<Array<{ segmentId: string; validation: ValidationResult }>>([])
  
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

  // Detect when narration (text or audio) is removed and call server to clear
  // any persisted audio artifacts. This helps avoid stale audio being reused
  // when users delete narration content in the editor.
  const prevAudioRef = useRef<{ narrationText: string | null; narrationAudioUrl: string | null }>({
    narrationText: audioMetadata.narrationText,
    narrationAudioUrl: audioMetadata.narrationAudioUrl,
  })

  useEffect(() => {
    const prev = prevAudioRef.current
    const hadNarration = Boolean(prev.narrationText || prev.narrationAudioUrl)
    const hasNarrationNow = Boolean(audioMetadata.narrationText || audioMetadata.narrationAudioUrl)
    if (hadNarration && !hasNarrationNow) {
      ;(async () => {
        try {
          await fetch(`/api/scenes/${sceneId}/clear-audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: ['narration'] }),
          })
        } catch (err) {
          // Non-fatal; log for debugging
          // eslint-disable-next-line no-console
          console.warn('clear-audio request failed', err)
        }
      })()
    }
    prevAudioRef.current = {
      narrationText: audioMetadata.narrationText,
      narrationAudioUrl: audioMetadata.narrationAudioUrl,
    }
  }, [audioMetadata.narrationText, audioMetadata.narrationAudioUrl, sceneId])

  // Selected segment for editing
  // Check if can advance to next phase
  const canAdvance = useMemo(() => {
    const hasDirections = proposedDirections.length > 0
    return {
      directions: hasDirections, // Can go to directions phase once we have them
    }
  }, [proposedDirections])
  
  // Count approved directions
  const approvedDirectionCount = useMemo(() => {
    return proposedDirections.filter(d => d.isApproved).length
  }, [proposedDirections])

  // Total estimated duration from directions
  const totalDuration = useMemo(() => {
    return proposedDirections.reduce((sum, d) => sum + d.estimatedDuration, 0)
  }, [proposedDirections])
  
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
          focusMode,
          narrationDriven,
          narrationDurationSeconds: audioMetadata.narrationDurationSeconds,
          narrationText: audioMetadata.narrationText,
          narrationAudioUrl: audioMetadata.narrationAudioUrl,
          totalAudioDurationSeconds: audioMetadata.totalAudioDurationSeconds,
          // Scope controls
          totalDurationTarget: totalDurationTarget || undefined,
          segmentCountTarget: segmentCountTarget || undefined,
          customInstructions: customInstructions.trim() || undefined,
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
        estimatedDuration: dir.estimated_duration || dir.estimatedDuration || targetDuration,
        shotType: dir.shot_type || dir.shotType || 'Medium Shot',
        talentAction: dir.talent_action || dir.talentAction || '',
        dialogueLineIds: dir.dialogue_indices || dir.dialogueLineIds || [],
        generationMethod: dir.generation_method || dir.generationMethod || 'FTV',
        triggerReason: dir.trigger_reason || dir.triggerReason || 'AI-determined cut point',
        confidence: dir.confidence || 90,
        // Map the new image prompts
        keyframeStartDescription: dir.keyframe_start_prompt || dir.keyframeStartDescription || '',
        keyframeEndDescription: dir.keyframe_end_prompt || dir.keyframeEndDescription || '',
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
  }, [sceneId, projectId, targetDuration, narrationDriven, totalDurationTarget, segmentCountTarget, focusMode, customInstructions, audioMetadata, sceneBible.contentHash, hasSceneDirection, runProductionAnimation])

  // Phase 2: Generate prompts from approved directions
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

  const handleGenerateSinglePrompt = useCallback((directionId: string) => {}, []) // Stub for type compatibility

  // Open regeneration dialog with current settings
  const handleOpenRegenerateDialog = useCallback(() => {
    setRegenerationConfig({
      targetDuration,
      narrationDriven,
      preserveManualEdits: false,
    })
    setShowRegenerateDialog(true)
  }, [targetDuration, narrationDriven])

  // Unified reset — clears all builder state back to analyze phase
  const resetToAnalyze = useCallback(() => {    setPhase('analyze')
    setError(null)
    setProposedDirections([])
    setSelectedDirectionId(null)
  }, [])

  // Confirm regeneration from dialog
  const handleConfirmRegenerate = useCallback(() => {
    // Apply config to generation options
    setTargetDuration(regenerationConfig.targetDuration)
    setNarrationDriven(regenerationConfig.narrationDriven)
    
    // Reset state for new generation (uses unified reset + dialog dismiss)
    resetToAnalyze()
    setShowRegenerateDialog(false)
    
    toast.info('Ready for regeneration - click Analyze Scene')
  }, [regenerationConfig, resetToAnalyze])

  const handleFinalize = useCallback(() => {
    // Transform ProposedDirections directly to SceneSegments
    const approvedDirs = proposedDirections.filter(d => d.isApproved)
    
    if (approvedDirs.length === 0) {
      toast.error('No directions approved', {
        description: 'Please approve at least one segment direction.',
      })
      return
    }

    let currentTime = 0;
    
    const finalSegments: SceneSegment[] = approvedDirs.map((dir, idx) => {
      const startTime = currentTime;
      const endTime = currentTime + dir.estimatedDuration;
      currentTime = endTime;
      
      // We will generate the F2V video_generation_prompt lazily or in SegmentStudio
      const fallbackPrompt = `${dir.shotType} shot. ${dir.talentAction}`
      
      return {
        segmentId: dir.id,
        sequenceIndex: idx,
        startTime,
        endTime,
        status: 'READY' as const,
        generatedPrompt: '', // F2V prompt starts empty, generated in Step 2
        userEditedPrompt: null,
        activeAssetUrl: null,
        assetType: null,
        generationMethod: dir.generationMethod,
        triggerReason: dir.triggerReason,
        emotionalBeat: '', // omitted from simplified format
        dialogueLineIds: dir.dialogueLineIds,
        // Map talentAction and shotType so the prompt builder has something to start with
        action: dir.talentAction,
        shotType: dir.shotType,
        references: {
          startFrameUrl: null,
          endFrameUrl: null,
          useSceneFrame: idx === 0,
          characterRefs: [],
          characterIds: [],
          sceneRefIds: [],
          objectRefIds: [],
          // Map the Image Gen Prompts!
          startFrameDescription: dir.keyframeStartDescription,
          endFrameDescription: dir.keyframeEndDescription,
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
      }
    })

    onSegmentsFinalized(finalSegments)
    toast.success(`Finalized ${finalSegments.length} segments - Ready for Key Frames`)
    
    if (onClose) {
      onClose()
    }
  }, [proposedDirections, sceneBible, onSegmentsFinalized, onClose])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Production Overlay */}
      <ProductionOverlay isVisible={showProductionOverlay} currentStage={productionStage} />
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-900/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Segment Builder</h2>
          </div>
          <Badge variant="outline" className="border-gray-600 text-gray-400">Scene {sceneNumber}</Badge>
        </div>
        <PhaseIndicator
          currentPhase={phase}
          onPhaseClick={setPhase}
          canAdvance={canAdvance}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-w-0 overflow-hidden">

        {/* Center Panel: Timeline & Segments */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Phase: Analyze */}
          {phase === 'analyze' && (
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="w-full max-w-md bg-gray-900/60 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    Scene Analysis
                  </CardTitle>
                  <CardDescription className="text-gray-400">
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
                          <p className="text-xs text-gray-500 mt-1">
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
                    <label className="text-sm font-medium text-gray-300">Target Segment Duration</label>
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
                    <p className="text-xs text-gray-500">
                      Segments will be up to {targetDuration} seconds (Veo 3.1 optimal range: 4-8s)
                    </p>
                  </div>

                  {/* Narration-Driven Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-300">Narration-Driven</p>
                      <p className="text-xs text-gray-500">
                        Prioritize narration timing for segment boundaries
                      </p>
                    </div>
                    <Button
                      variant={narrationDriven ? 'default' : 'outline'}
                      size="sm"
                      className={narrationDriven ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'border-gray-600 text-gray-400 hover:bg-gray-800'}
                      onClick={() => setNarrationDriven(!narrationDriven)}
                    >
                      {narrationDriven ? 'On' : 'Off'}
                    </Button>
                  </div>

                  {/* Total Scene Duration Target */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Total Scene Duration</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-gray-500 hover:text-gray-300"
                        onClick={() => setTotalDurationTarget(null)}
                      >
                        {totalDurationTarget ? 'Clear' : 'Auto'}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={10}
                        max={120}
                        step={5}
                        value={totalDurationTarget ?? 30}
                        onChange={e => setTotalDurationTarget(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-16 text-right">
                        {totalDurationTarget ? `~${totalDurationTarget}s` : 'Auto'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {totalDurationTarget
                        ? `AI will target approximately ${totalDurationTarget}s total (may adjust ±10% for better cut points)`
                        : 'Let AI determine total duration based on content'}
                    </p>
                  </div>

                  {/* Segment Count Target */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Segment Count</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-gray-500 hover:text-gray-300"
                        onClick={() => setSegmentCountTarget(null)}
                      >
                        {segmentCountTarget ? 'Clear' : 'Auto'}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={2}
                        max={12}
                        step={1}
                        value={segmentCountTarget ?? 5}
                        onChange={e => setSegmentCountTarget(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-16 text-right">
                        {segmentCountTarget ? `${segmentCountTarget}` : 'Auto'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {segmentCountTarget
                        ? `AI will aim for ${segmentCountTarget} segments`
                        : 'Let AI determine optimal segment count'}
                    </p>
                  </div>

                  {/* Focus Mode */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Focus Mode</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['balanced', 'dialogue-focused', 'action-focused'] as const).map(mode => (
                        <Button
                          key={mode}
                          variant={focusMode === mode ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            'text-xs capitalize',
                            focusMode === mode
                              ? 'bg-cyan-600 text-white hover:bg-cyan-500 border-cyan-600'
                              : 'border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                          )}
                          onClick={() => setFocusMode(mode)}
                        >
                          {mode.replace('-', ' ')}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      {focusMode === 'balanced' && 'Balance dialogue and visual action in segments'}
                      {focusMode === 'dialogue-focused' && 'Prioritize dialogue coverage — combine visual beats'}
                      {focusMode === 'action-focused' && 'Prioritize visual action — combine dialogue lines'}
                    </p>
                  </div>

                  {/* Custom Instructions */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Director Notes (Optional)</label>
                    <textarea
                      value={customInstructions}
                      onChange={e => setCustomInstructions(e.target.value)}
                      placeholder="e.g., 'Emphasize the opening reveal' or 'Keep the pacing tight'"
                      className="w-full h-16 px-3 py-2 text-xs rounded-md border border-gray-700/50 bg-gray-800/50 text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-gray-600"
                      maxLength={300}
                    />
                    <p className="text-xs text-gray-500">
                      {customInstructions.length}/300 — Free-form direction for the AI
                    </p>
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
                    <div className="space-y-2">
                      <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetToAnalyze}
                        className="w-full"
                      >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Clear Error & Try Again
                      </Button>
                    </div>
                  )}

                  {/* Generate Button */}
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !hasSceneDirection}
                    className={cn(
                      'w-full',
                      !hasExistingVideoAssets && 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                    )}
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
              <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-900/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium flex items-center gap-2 text-white">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      Review Segment Directions
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Review and approve each segment's direction before generating video prompts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">
                      {approvedDirectionCount}/{proposedDirections.length} Approved
                    </Badge>
                    <Badge variant="outline">
                      ~{Math.round(totalDuration)}s total
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
                    onClick={resetToAnalyze}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Start Over
                  </Button>
                </div>
                <Button
                  onClick={handleFinalize}
                  disabled={approvedDirectionCount === 0}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Finalize Segments ({approvedDirectionCount})
                </Button>
              </div>
            </div>
          )}

          {/* Phase 2 was removed. Finalize happens directly. */}
          
          {/* Phase 2 was removed. Finalize happens directly. */}
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
            {proposedDirections.some(d => d.isUserEdited) && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Preserve Manual Edits</p>
                  <p className="text-xs text-muted-foreground">
                    Attempt to reapply your edits to matching segments
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
                {proposedDirections.filter(d => d.isUserEdited).length > 0 
                  ? `${proposedDirections.filter(d => d.isUserEdited).length} edited direction(s) will be discarded.`
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
