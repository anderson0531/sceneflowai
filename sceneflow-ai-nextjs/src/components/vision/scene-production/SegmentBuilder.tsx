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
import { allocateVeoSplitDurations, snapToVeoDuration } from '@/lib/scene/veoDuration'
import { stripDirectionBracketsForTiming } from '@/lib/tts/textOptimizer'
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  ChevronRight,
  Clock,
  MessageSquare,
  BookOpen,
  Layers,
  Settings2,
  Lock,
  ArrowRight,
  RefreshCw,
  Wand2,
  Eye,
  Edit3,
  AlertTriangle,
  ChevronDown,
  Users,
  FileText,
  CheckCircle2,
  Clapperboard,
  Video,
  Diamond,
  Mic2,
} from 'lucide-react'
import {
  SceneSegment,
  SceneProductionData,
  SceneProductionReferences,
  ValidationResult,
  SceneBible,
  ProposedSegment,
  BuilderPhase,
} from './types'
// Timeline removed
// SegmentValidation is dynamically imported to avoid circular dependency TDZ
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { SegmentDirection } from '@/types/scene-direction'
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
// Segment / keyframe generation overlay (aligned to real pipeline steps)
// ============================================================================

type OverlayJob = 'directions' | 'video_prompts'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

type OverlayStepDef = {
  id: string
  label: string
  sublabel?: string
  /** Determinate fill 0–1; null = indeterminate while the network request runs */
  progress: number | null
  icon: 'book' | 'audio' | 'sparkles' | 'layers' | 'wand'
}

const OVERLAY_PIPELINES: Record<OverlayJob, OverlayStepDef[]> = {
  directions: [
    {
      id: 'direction',
      label: 'Reading scene direction',
      sublabel: 'Camera, lighting, talent, environment from your director notes',
      progress: 0.14,
      icon: 'book',
    },
    {
      id: 'timeline',
      label: 'Aligning with the audio timeline',
      sublabel: 'Dialogue, VO, and duration context for each beat',
      progress: 0.32,
      icon: 'audio',
    },
    {
      id: 'segments',
      label: 'Generating segments & keyframe copy',
      sublabel: 'Shot breakdown plus start/end frame descriptions per segment',
      progress: null,
      icon: 'sparkles',
    },
    {
      id: 'timeline-build',
      label: 'Building the segment timeline',
      sublabel: 'Stitching durations and transitions',
      progress: 0.94,
      icon: 'layers',
    },
  ],
  video_prompts: [
    {
      id: 'load',
      label: 'Loading shots & keyframe descriptions',
      sublabel: 'Using approved directions from step 1',
      progress: 0.18,
      icon: 'layers',
    },
    {
      id: 'veo',
      label: 'Writing Veo video prompts',
      sublabel: 'Long scenes may be processed in batches — stay on this step until done',
      progress: null,
      icon: 'wand',
    },
    {
      id: 'merge',
      label: 'Merging prompts into segments',
      sublabel: 'Attaching cinematic motion text to each segment',
      progress: 0.97,
      icon: 'sparkles',
    },
  ],
}

function SegmentKeyframeIllustration({ activeStepIndex, totalSteps }: { activeStepIndex: number; totalSteps: number }) {
  const n = 6
  const pulseCutoff = Math.min(activeStepIndex + 2, n)
  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="flex items-end justify-center gap-1 sm:gap-1.5" aria-hidden>
        {Array.from({ length: n }, (_, i) => {
          const h = 28 + (i % 3) * 10 + (i === 2 ? 8 : 0)
          const isLit = i < pulseCutoff
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-0.5">
                <Diamond
                  className={cn(
                    'w-2.5 h-2.5 sm:w-3 sm:h-3 transition-colors duration-300',
                    isLit ? 'text-cyan-400 fill-cyan-500/30' : 'text-zinc-600 fill-transparent'
                  )}
                  strokeWidth={2}
                />
                <Diamond
                  className={cn(
                    'w-2.5 h-2.5 sm:w-3 sm:h-3 transition-colors duration-300',
                    isLit ? 'text-amber-400 fill-amber-500/25' : 'text-zinc-600 fill-transparent'
                  )}
                  strokeWidth={2}
                />
              </div>
              <div
                className={cn(
                  'w-6 sm:w-8 rounded-t-md border transition-all duration-500',
                  isLit
                    ? 'bg-gradient-to-t from-cyan-950/80 via-zinc-800 to-zinc-600 border-cyan-500/35 shadow-[0_0_12px_rgba(34,211,238,0.12)]'
                    : 'bg-gradient-to-t from-zinc-900 to-zinc-800 border-zinc-700/80'
                )}
                style={{ height: h }}
              />
            </div>
          )
        })}
      </div>
      <p className="text-[10px] sm:text-xs text-zinc-500 text-center max-w-xs leading-snug">
        <span className="text-cyan-400/90">Cyan</span> = start keyframe ·{' '}
        <span className="text-amber-400/90">Amber</span> = end keyframe · Bars = segments on the timeline
      </p>
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 rounded-full transition-all duration-300',
              i < activeStepIndex ? 'w-6 bg-amber-500' : i === activeStepIndex ? 'w-8 bg-amber-400 animate-pulse' : 'w-3 bg-zinc-700'
            )}
          />
        ))}
      </div>
    </div>
  )
}

function StepIcon({ kind }: { kind: OverlayStepDef['icon'] }) {
  const cls = 'w-6 h-6 shrink-0 text-amber-400'
  switch (kind) {
    case 'book':
      return <BookOpen className={cls} />
    case 'audio':
      return <Mic2 className={cls} />
    case 'sparkles':
      return <Sparkles className={cn(cls, 'animate-pulse')} />
    case 'layers':
      return <Layers className={cls} />
    case 'wand':
      return <Wand2 className={cn(cls, 'animate-pulse')} />
    default:
      return <Clapperboard className={cls} />
  }
}

function ProductionOverlay({
  isVisible,
  job,
  stepIndex,
}: {
  isVisible: boolean
  job: OverlayJob | null
  stepIndex: number
}) {
  if (!isVisible || !job) return null

  const pipeline = OVERLAY_PIPELINES[job]
  const safeIdx = Math.min(Math.max(0, stepIndex), pipeline.length - 1)
  const step = pipeline[safeIdx]
  const determinate = step.progress != null
  const pct = determinate ? Math.round((step.progress as number) * 100) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-6 sm:gap-8 px-6 py-10 sm:p-12 max-w-lg w-full">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,520px)] h-[520px] rounded-full bg-gradient-radial from-cyan-500/8 from-30% via-amber-500/5 via-50% to-transparent animate-pulse" />
        </div>

        <SegmentKeyframeIllustration activeStepIndex={safeIdx} totalSteps={pipeline.length} />

        <div className="relative flex flex-col items-center gap-3 text-center">
          <div className="flex items-start justify-center gap-3 text-amber-100">
            <StepIcon kind={step.icon} />
            <div className="text-left">
              <p className="text-lg sm:text-xl font-semibold tracking-tight leading-snug">{step.label}</p>
              {step.sublabel && <p className="text-sm text-zinc-400 mt-1 max-w-md">{step.sublabel}</p>}
            </div>
          </div>

          <div className="w-full max-w-sm mx-auto mt-1">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
              {determinate ? (
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 via-amber-500 to-amber-400 transition-[width] duration-700 ease-out rounded-full"
                  style={{ width: `${pct}%` }}
                />
              ) : (
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <div className="absolute inset-y-0 w-[42%] rounded-full bg-gradient-to-r from-transparent via-amber-500/95 to-transparent segment-overlay-scan" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5 tabular-nums">
              {determinate ? `Step ${safeIdx + 1} of ${pipeline.length} · ~${pct}%` : `Step ${safeIdx + 1} of ${pipeline.length} · waiting on AI`}
            </p>
          </div>
        </div>

        <p className="text-zinc-500 text-xs sm:text-sm italic text-center">
          Scene direction drives segments; each segment carries start/end keyframe descriptions for the Frame step.
        </p>
      </div>

      <style jsx global>{`
        @keyframes segment-overlay-scan {
          0% {
            transform: translateX(-100%);
            opacity: 0.85;
          }
          100% {
            transform: translateX(280%);
            opacity: 0.85;
          }
        }
        .segment-overlay-scan {
          animation: segment-overlay-scan 1.35s ease-in-out infinite;
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
  const narrationAudio =
    scene.narrationAudio?.[selectedLanguage] ||
    scene.narrationAudio?.['en-US'] ||
    scene.narrationAudio?.en ||
    {}
  const hasNarrationAudio = Boolean(narrationAudio?.url || scene.narrationUrl)
  const narrationText = isLikelyNarration(scene) ? scene.narration : null
  const narrationAudioUrl = hasNarrationAudio ? (scene.narrationUrl || narrationAudio.url || null) : null
  const narrationDurationSeconds = (narrationText || hasNarrationAudio)
    ? (scene.narrationDuration || narrationAudio.duration || (hasNarrationAudio ? 10 : null) || null)
    : null

  // Extract dialogue durations (match ScriptPanel: en vs en-US vs flat array)
  const da = scene.dialogueAudio
  const dialogueAudioArray: any[] = Array.isArray(da)
    ? da
    : da?.[selectedLanguage] ||
      da?.['en-US'] ||
      da?.en ||
      (typeof da === 'object' && da
        ? (Object.values(da).find((v): v is any[] => Array.isArray(v) && v.length > 0) ?? [])
        : [])

  const dialogueDurations = (scene.dialogue || []).map((d: any, idx: number) => {
    const audioData =
      dialogueAudioArray.find((a: any) => a?.dialogueIndex === idx) ?? dialogueAudioArray[idx] ?? {}
    const text = d.text || d.dialogue || d.line || ''
    const spokenForTiming = stripDirectionBracketsForTiming(text)
    const wordEst = spokenForTiming.split(/\s+/).filter(Boolean).length / 2.5
    const raw = audioData.duration ?? audioData.durationSeconds
    let fromAudio = typeof raw === 'number' && raw > 0 ? raw : 0
    if (fromAudio > 600 && fromAudio < 3_600_000) fromAudio /= 1000
    return {
      character: d.character || d.name || 'UNKNOWN',
      text,
      durationSeconds: fromAudio || wordEst,
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


// ============================================================================
// Client-Side Segment Duration Enforcement (Safety Net)
// ============================================================================

const CLIENT_MAX_SEGMENT_DURATION = 12 // Veo 3.1 max

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

    // Split oversized segment with same 8s-first allocator used server-side.
    const subDurations = allocateVeoSplitDurations(seg.duration, CLIENT_MAX_SEGMENT_DURATION)
    const numParts = subDurations.length
    let currentStart = seg.startTime
    const dialoguePerPart = Math.ceil(seg.dialogueLineIds.length / numParts)

    console.log(
      `[Client Split] Segment ${seg.id} (${seg.duration.toFixed(1)}s) → ${numParts} parts`
    )

    for (let i = 0; i < numParts; i++) {
      const partDuration = subDurations[i] ?? snapToVeoDuration(seg.endTime - currentStart)
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

function mergeVideoPromptsIntoStaged(
  staged: SceneSegment[],
  withPrompts: SceneSegment[]
): SceneSegment[] {
  const bySeq = new Map(withPrompts.map(s => [s.sequenceIndex, s]))
  return staged.map(seg => {
    const w = bySeq.get(seg.sequenceIndex)
    if (!w) return seg
    return {
      ...seg,
      generatedPrompt: w.generatedPrompt || seg.generatedPrompt,
      userEditedPrompt: w.userEditedPrompt ?? seg.userEditedPrompt,
      segmentDirection: w.segmentDirection ?? seg.segmentDirection,
      transitionType: w.transitionType ?? seg.transitionType,
      triggerReason: w.triggerReason ?? seg.triggerReason,
      emotionalBeat: w.emotionalBeat || seg.emotionalBeat,
      ...(Array.isArray(w.dialogueLineIds) && w.dialogueLineIds.length > 0
        ? { dialogueLineIds: w.dialogueLineIds }
        : {}),
    }
  })
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
  const [pendingApprovedDirections, setPendingApprovedDirections] = useState<SegmentDirection[] | null>(null)
  const [stagedSegments, setStagedSegments] = useState<SceneSegment[] | null>(null)
  const [videoPromptNotes, setVideoPromptNotes] = useState('')
  const [keyframesConfirmed, setKeyframesConfirmed] = useState(false)
  
  // NEW: Phase 1 - Proposed directions for user review
      const [error, setError] = useState<string | null>(null)
  
  // Production overlay state
  const [showProductionOverlay, setShowProductionOverlay] = useState(false)
  const [productionOverlayJob, setProductionOverlayJob] = useState<OverlayJob | null>(null)
  const [productionStepIndex, setProductionStepIndex] = useState(0)
  
  /** null = Auto (API: segmentDurationAuto); number = fixed preferredDuration 4–8 */
  const [segmentDurationTarget, setSegmentDurationTarget] = useState<number | null>(null)
  const [narrationDriven, setNarrationDriven] = useState(false)
  const [totalDurationTarget, setTotalDurationTarget] = useState<number | null>(null) // null = let AI decide
  const [segmentCountTarget, setSegmentCountTarget] = useState<number | null>(null) // null = let AI decide
  const [focusMode, setFocusMode] = useState<'balanced' | 'dialogue-focused' | 'action-focused'>('balanced')
  const [customInstructions, setCustomInstructions] = useState('')
  
  // Regeneration dialog state
  
  
  
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

  /** Soft average for UI copy when duration is Auto (matches server hint). */
  const segmentDurationHintSeconds = useMemo(() => {
    const total = audioMetadata.totalAudioDurationSeconds || 0
    const minSeg = Math.max(1, Math.ceil(total / 8))
    const raw = Math.round(total / minSeg)
    if (raw <= 5) return 4
    if (raw <= 7) return 6
    return 8
  }, [audioMetadata.totalAudioDurationSeconds])

  // Intelligently auto-determine settings based on audio metadata
  useEffect(() => {
    // 1. Narration Driven
    if (audioMetadata.narrationDurationSeconds && audioMetadata.narrationDurationSeconds > 0) {
      setNarrationDriven(true)
    } else {
      setNarrationDriven(false)
    }

    // 2. Focus Mode
    const hasDialogue = audioMetadata.dialogueDurations.length > 0
    const hasNarration = audioMetadata.narrationDurationSeconds && audioMetadata.narrationDurationSeconds > 0
    
    let recommendedFocusMode: 'balanced' | 'dialogue-focused' | 'action-focused' = 'balanced'
    if (hasDialogue && !hasNarration) {
      recommendedFocusMode = 'dialogue-focused'
    } else if (!hasDialogue && !hasNarration) {
      recommendedFocusMode = 'action-focused'
    }
    setFocusMode(recommendedFocusMode)
  }, [audioMetadata])

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

  /** Real prep steps before the network call; API step stays until fetch settles */
  const runDirectionsOverlayPreamble = useCallback(async () => {
    setProductionOverlayJob('directions')
    setProductionStepIndex(0)
    setShowProductionOverlay(true)
    await sleep(280)
    setProductionStepIndex(1)
    await sleep(300)
    setProductionStepIndex(2)
  }, [])

  const runVideoPromptsOverlayPreamble = useCallback(async () => {
    setProductionOverlayJob('video_prompts')
    setProductionStepIndex(0)
    setShowProductionOverlay(true)
    await sleep(260)
    setProductionStepIndex(1)
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
    
    await runDirectionsOverlayPreamble()

    try {
      // NEW: Phase 1 - Get directions only (faster, user reviews before prompts)
      const response = await fetch(`/api/scenes/${sceneId}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(segmentDurationTarget == null
            ? { segmentDurationAuto: true }
            : { segmentDurationAuto: false, preferredDuration: segmentDurationTarget }),
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

      const responseText = await response.text()
      let data: any
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error(
          response.ok
            ? 'Invalid JSON from segment API'
            : `Segment API error (${response.status}): ${responseText.slice(0, 280)}`
        )
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to analyze scene')
      }
      
      const approvedDirs = data.directions as SegmentDirection[]

      let currentTime = 0
      const finalSegments: SceneSegment[] = approvedDirs.map((dir, idx) => {
        const est =
          dir.estimatedDuration || segmentDurationTarget || segmentDurationHintSeconds
        const startTime = currentTime
        const endTime = currentTime + est
        currentTime = endTime

        const rawT = String(dir.transitionIn || '').toLowerCase()
        const transitionType: 'CUT' | 'CONTINUE' =
          rawT === 'cut' ? 'CUT' : rawT === 'continue' ? 'CONTINUE' : idx === 0 ? 'CUT' : 'CONTINUE'

        return {
          segmentId: `dir_${sceneId}_${idx + 1}`,
          sequenceIndex: idx,
          startTime,
          endTime,
          status: 'READY' as const,
          generatedPrompt: '',
          startFramePrompt: dir.keyframeStartDescription || '',
          endFramePrompt: dir.keyframeEndDescription || '',
          userEditedPrompt: null,
          activeAssetUrl: null,
          assetType: null,
          generationMethod: dir.generationMethod,
          triggerReason: dir.triggerReason,
          emotionalBeat: dir.emotionalBeat || '',
          dialogueLineIds: dir.dialogueLineIds || [],
          action: dir.talentAction,
          shotType: dir.shotType,
          transitionType,
          segmentDirection: dir,
          references: {
            startFrameUrl: null,
            endFrameUrl: null,
            useSceneFrame: idx === 0,
            characterRefs: [],
            characterIds: [],
            sceneRefIds: [],
            objectRefIds: [],
            startFrameDescription: dir.keyframeStartDescription || '',
            endFrameDescription: dir.keyframeEndDescription || '',
          },
          takes: [],
          promptContext: {
            dialogueHash: '',
            visualDescriptionHash: sceneBible.contentHash,
            generatedAt: new Date().toISOString(),
            sceneNumber: sceneBible.sceneNumber,
          },
          isStale: false,
        }
      })

      setPendingApprovedDirections(approvedDirs)
      setStagedSegments(finalSegments)
      setVideoPromptNotes('')
      setKeyframesConfirmed(false)
      setPhase('video_prompts')
      setLastGeneratedHash(sceneBible.contentHash)

      toast.success(`Created ${finalSegments.length} segments — add keyframes, then generate Veo prompts (or skip).`)

      setProductionStepIndex(3)
      await sleep(220)
    } catch (err: any) {
      console.error('[SegmentBuilder] Analysis error:', err)
      setError(err.message || 'Failed to analyze scene')
      toast.error('Failed to analyze scene')
    } finally {
      setIsAnalyzing(false)
      setShowProductionOverlay(false)
      setProductionOverlayJob(null)
      setProductionStepIndex(0)
    }
  }, [
    sceneId,
    projectId,
    segmentDurationTarget,
    segmentDurationHintSeconds,
    narrationDriven,
    totalDurationTarget,
    segmentCountTarget,
    focusMode,
    customInstructions,
    audioMetadata,
    sceneBible.contentHash,
    hasSceneDirection,
    runDirectionsOverlayPreamble,
  ])

  const finalizeAndClose = useCallback(
    (segments: SceneSegment[]) => {
      onSegmentsFinalized(segments)
      setPendingApprovedDirections(null)
      setStagedSegments(null)
      setPhase('analyze')
      setVideoPromptNotes('')
      setKeyframesConfirmed(false)
      onClose?.()
    },
    [onSegmentsFinalized, onClose]
  )

  const handleSkipVideoPrompts = useCallback(() => {
    if (!stagedSegments?.length) return
    finalizeAndClose(stagedSegments)
    toast.message('Segments saved without Veo prompts', {
      description: 'You can generate video prompts later from the segment workflow if needed.',
    })
  }, [stagedSegments, finalizeAndClose])

  const handleGenerateVideoPrompts = useCallback(async () => {
    if (!pendingApprovedDirections?.length || !stagedSegments?.length) return

    setIsAnalyzing(true)
    setError(null)
    await runVideoPromptsOverlayPreamble()

    try {
      const response = await fetch(`/api/scenes/${sceneId}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(segmentDurationTarget == null
            ? { segmentDurationAuto: true }
            : { segmentDurationAuto: false, preferredDuration: segmentDurationTarget }),
          projectId,
          focusMode,
          narrationDriven,
          narrationDurationSeconds: audioMetadata.narrationDurationSeconds,
          narrationText: audioMetadata.narrationText,
          narrationAudioUrl: audioMetadata.narrationAudioUrl,
          totalAudioDurationSeconds: audioMetadata.totalAudioDurationSeconds,
          totalDurationTarget: totalDurationTarget || undefined,
          segmentCountTarget: segmentCountTarget || undefined,
          customInstructions: customInstructions.trim() || undefined,
          phase: 'video_prompts',
          approvedDirections: pendingApprovedDirections,
          keyframeSummary: videoPromptNotes.trim() || undefined,
          keyframesConfirmed,
        }),
      })

      const responseText = await response.text()
      let data: any
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error(
          response.ok
            ? 'Invalid JSON from segment API'
            : `Segment API error (${response.status}): ${responseText.slice(0, 280)}`
        )
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to generate video prompts')
      }

      const merged = mergeVideoPromptsIntoStaged(stagedSegments, data.segments as SceneSegment[])
      setProductionStepIndex(2)
      await sleep(200)
      finalizeAndClose(merged)
      toast.success(`Generated Veo prompts for ${merged.length} segments`)
    } catch (err: any) {
      console.error('[SegmentBuilder] Video prompts error:', err)
      setError(err.message || 'Failed to generate video prompts')
      toast.error('Failed to generate video prompts')
    } finally {
      setIsAnalyzing(false)
      setShowProductionOverlay(false)
      setProductionOverlayJob(null)
      setProductionStepIndex(0)
    }
  }, [
    sceneId,
    projectId,
    segmentDurationTarget,
    focusMode,
    narrationDriven,
    audioMetadata,
    totalDurationTarget,
    segmentCountTarget,
    customInstructions,
    pendingApprovedDirections,
    stagedSegments,
    videoPromptNotes,
    keyframesConfirmed,
    runVideoPromptsOverlayPreamble,
    finalizeAndClose,
  ])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Production Overlay */}
      <ProductionOverlay isVisible={showProductionOverlay} job={productionOverlayJob} stepIndex={productionStepIndex} />
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-900/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Segment Builder</h2>
          </div>
          <Badge variant="outline" className="border-gray-600 text-gray-400">Scene {sceneNumber}</Badge>
        </div>
        
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-w-0 overflow-hidden">

        {/* Center Panel: Timeline & Segments */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Phase: Analyze */}
          {phase === 'video_prompts' && stagedSegments && (
            <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
              <Card className="w-full max-w-lg bg-gray-900/60 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Video className="w-5 h-5 text-cyan-400" />
                    Video prompts (step 2)
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {stagedSegments.length} segments are staged with keyframe copy. Generate full Veo prompts after you are
                    happy with keyframes, or skip and fill prompts later.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Keyframe / on-set notes (optional)</Label>
                    <Textarea
                      value={videoPromptNotes}
                      onChange={e => setVideoPromptNotes(e.target.value)}
                      placeholder="e.g. Locked wardrobe, practicals on desk, talent blocking approved on set…"
                      className="min-h-[88px] bg-gray-800/50 border-gray-700 text-gray-200 text-sm"
                      maxLength={1200}
                    />
                  </div>
                  <div className="flex items-start gap-2 rounded-md border border-gray-700/60 bg-gray-800/40 p-3">
                    <Checkbox
                      id="keyframes-confirmed"
                      checked={keyframesConfirmed}
                      onCheckedChange={v => setKeyframesConfirmed(v === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="keyframes-confirmed" className="text-sm text-gray-300 leading-snug cursor-pointer">
                      Keyframes are finalized or approved — bias prompts toward the locked stills.
                    </Label>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleGenerateVideoPrompts}
                      disabled={isAnalyzing}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating video prompts…
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Generate Veo prompts
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleSkipVideoPrompts} disabled={isAnalyzing} className="w-full border-gray-600">
                      Skip — save segments without prompts
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPhase('analyze')
                        setError(null)
                      }}
                      disabled={isAnalyzing}
                      className="text-gray-500"
                    >
                      Back to settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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

                                    {/* AI Recommendation Summary */}
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-cyan-500/20 p-2 rounded-full mt-0.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-slate-200">
                          Based on an estimated audio duration of <strong>~{Math.ceil(audioMetadata.totalAudioDurationSeconds)}s</strong> with <strong>{audioMetadata.dialogueDurations.length}</strong> dialogue line{audioMetadata.dialogueDurations.length !== 1 ? 's' : ''}, the AI recommends a <strong className="capitalize text-cyan-400">{focusMode.replace('-', ' ')}</strong> approach
                          {segmentDurationTarget == null ? (
                            <> with <strong>Auto</strong> clip length (4–12s per segment from cuts; ~<strong>{segmentDurationHintSeconds}s</strong> typical).</>
                          ) : (
                            <> targeting <strong>~{segmentDurationTarget}s</strong> per segment (Veo uses 4, 6, 8, 10, or 12s clips).</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Settings Accordion */}
                  <div className="border border-slate-700/50 rounded-lg overflow-hidden">
                    <details className="group">
                      <summary className="flex items-center justify-between p-3 cursor-pointer bg-slate-800/30 hover:bg-slate-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                        <div className="flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-300">Advanced Settings</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
                      </summary>
                      
                      <div className="p-4 space-y-6 border-t border-slate-700/50 bg-slate-900/30">
                        {/* Duration Setting */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-300">Target Segment Duration</label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-300"
                              onClick={() => setSegmentDurationTarget(null)}
                            >
                              {segmentDurationTarget != null ? 'Clear' : 'Auto'}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={4}
                              max={8}
                              step={2}
                              value={segmentDurationTarget ?? segmentDurationHintSeconds}
                              onChange={e => setSegmentDurationTarget(parseInt(e.target.value, 10))}
                              className="flex-1"
                            />
                            <span className="text-sm font-mono w-14 text-right text-slate-300">
                              {segmentDurationTarget != null ? `${segmentDurationTarget}s` : 'Auto'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {segmentDurationTarget == null
                              ? `Auto: each clip is 4, 6, 8, 10, or 12s from dialogue and action cuts (~${segmentDurationHintSeconds}s planning average). Drag the slider to set a fixed target.`
                              : `Prefer ~${segmentDurationTarget}s clips (Veo 3.1 uses only 4, 6, 8, 10, or 12s).`}
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
                            <span className="text-sm font-mono w-16 text-right text-slate-300">
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
                            <span className="text-sm font-mono w-16 text-right text-slate-300">
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
                                    : 'border-gray-700 text-gray-400 hover:text-gray-300'
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
                      </div>
                    </details>
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
                        onClick={() => setError(null)}
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
        </div>
      </div>
    </div>
  )
}

export default SegmentBuilder
