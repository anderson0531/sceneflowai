'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Copy,
  Download,
  Loader,
  Move,
  MonitorPlay,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { saveImageFile } from '@/lib/download/saveFile'
import { ImageEditModal } from './ImageEditModal'
import {
  ExpressSceneConfirmDialog,
  type ExpressSceneConfirmOptions,
} from './ExpressSceneConfirmDialog'
import { SceneImageFrame, type SceneImageFrameProps } from './SceneImageFrame'
import {
  SceneBeatStage,
  shotKindMarker,
  type SceneBeatStageMarker,
} from './scene-production/SceneBeatStage'
import type { ExpressPhaseStatus, ExpressSceneStatus } from './SceneGallery'
import {
  beatFrameSlotKey,
  countStoryboardFrameStats,
  enumerateStoryboardFrameSlots,
  sceneHasNoOwnedBeatImages,
  storyboardGeneratingSlotKey,
  type StoryboardFrameSlot,
} from '@/lib/storyboard/types'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { buildEndFramePrompt, buildStartFramePrompt } from '@/lib/scene/deriveSegmentsFromBeats'
import {
  composeBeatActionFraming,
  composePersistedBeatStillPrompt,
  TITLE_BEAT_ACTION_LEAD_IN,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import { runSceneExpressPreflight } from '@/lib/sceneGeneration/sceneExpressPreflight'
import {
  countStalePromptKeys,
  isPreVisStale,
  sceneHasStalePromptKeys,
} from '@/lib/storyboard/preVisSync'
import { isBeatFrameStale } from '@/lib/storyboard/syncBeatStillPrompt'
import {
  frameMatchesFilters,
  frameRailStatus,
  type FrameAttentionFilter,
  type FrameListFacts,
  type FrameTypeFilter,
} from '@/lib/vision/frameListFilters'
import { StatusFilterBar } from '@/components/vision/StatusFilterBar'
import { countDraftStoryboardFrames, type StoryboardQuality } from '@/lib/storyboard/storyboardQuality'
import { StoryboardQualityToggle } from './StoryboardQualityToggle'
import { StoryboardGenerationModeToggle } from './StoryboardGenerationModeToggle'
import type { StillGenerationMode } from '@/lib/generation/stillPolicy'
import { useTranslations } from 'next-intl'
import {
  frameEditReferenceKeys,
  listAllFrameEditCharacterReferences,
  listFrameEditLocationStills,
  resolveDefaultFrameEditLocationStillIds,
  resolveDefaultFrameEditObjectIds,
  resolveFrameEditCharacterReferences,
} from '@/lib/vision/resolveFrameEditCharacterReferences'
import type { LocationReference } from '@/types/visionReferences'
import {
  formatReferenceReadinessMessage,
  resolveSceneReferenceReadiness,
} from '@/lib/vision/referenceReadiness'
import type { SceneReferenceRequirement } from '@/lib/vision/sceneReferenceRequirements'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FrameMotionEditor } from './FrameMotionEditor'
import type { BeatKenBurnsSettings } from '@/lib/storyboard/kenBurnsFrame'

const frameShowLabels: Record<FrameAttentionFilter, string> = {
  all: 'All',
  needs_action: 'Needs action',
  final: 'Final',
  draft: 'Draft',
  prompt_changed: 'Prompt changed',
  missing: 'Missing',
  placeholder: 'Placeholder',
}

const frameShowTooltips: Record<FrameAttentionFilter, string> = {
  all: 'Every frame in this scene.',
  needs_action: 'Frames that are missing, still a draft, or out of date.',
  final: 'Frames approved as final.',
  draft: 'Frames generated as a draft.',
  prompt_changed: 'Frames whose prompt changed after the image was made.',
  missing: 'Frames with no image yet.',
  placeholder: 'Frames still using a stand-in image.',
}

const frameTypeLabels: Record<FrameTypeFilter, string> = {
  all: 'All',
  action: 'Action',
  dialogue: 'Dialogue',
  narration: 'Narration',
}

const frameTypeTooltips: Record<FrameTypeFilter, string> = {
  all: 'Action, dialogue, and narration frames.',
  action: 'Frames for shots with no spoken line.',
  dialogue: 'Frames for shots spoken by a character.',
  narration: 'Frames for voiceover shots.',
}

type EditingFrame =
  | { kind: 'establishing'; sceneIndex: number; imageUrl: string }
  | { kind: 'beat'; sceneIndex: number; beatId: string; frameRole?: 'start' | 'action-start' | 'end'; imageUrl: string }
  | { kind: 'dialogue'; sceneIndex: number; dialogueIndex: number; imageUrl: string }
  | { kind: 'custom'; sceneIndex: number; customFrameId: string; imageUrl: string }

export interface SceneStoryboardFrameViewerProps {
  scene: any
  sceneIndex: number
  sceneNumber: number
  prompt?: string
  characters?: any[]
  objectReferences?: Array<{ id: string; name: string; imageUrl: string; description?: string }>
  locationReferences?: LocationReference[]
  /**
   * What this scene needs drawn, resolved by the caller so the References tab
   * and the frame gate cannot disagree. Undrawn rows are named in the Express
   * confirm dialog and drawn ahead of the frames.
   */
  sceneRequirements?: SceneReferenceRequirement[]
  selectedLanguage?: string
  narrationVoice?: unknown
  expressPhaseStatus?: ExpressSceneStatus
  expressGateBlocked?: boolean
  onExpressGateBlocked?: () => void
  isExpressRunning?: boolean
  expressElapsedSec?: number
  isGeneratingScene?: boolean
  onGenerateScene?: (prompt: string) => Promise<void>
  onGenerateDialogueFrame?: (dialogueIndex: number) => Promise<void>
  onGenerateBeatFrame?: (beatId: string) => Promise<void>
  onGenerateBeatStartFrame?: (beatId: string) => Promise<void>
  onGenerateBeatEndFrame?: (beatId: string) => Promise<void>
  onGenerateBeatFrames?: (beatId: string) => Promise<void>
  onUsePrevEndFrameAsStart?: (beatId: string) => Promise<void>
  onDeleteBeatStartFrame?: (beatId: string) => Promise<void>
  onDeleteBeatEndFrame?: (beatId: string) => Promise<void>
  onDirectFrame?: (slot: StoryboardFrameSlot) => void
  onDirectorFrame?: (slot: StoryboardFrameSlot) => void
  onUploadDialogueFrame?: (dialogueIndex: number, file: File) => void
  onUploadBeatFrame?: (beatId: string, file: File, frameRole?: 'start' | 'action-start' | 'end') => void
  onUploadScene?: (file: File) => void
  onSaveEditedScene?: (imageUrl: string) => void
  onSaveEditedBeatFrame?: (beatId: string, imageUrl: string, frameRole?: 'start' | 'action-start' | 'end') => void
  onRestoreStillVersion?: (slot: StoryboardFrameSlot, versionId: string) => void
  onSaveBeatKenBurns?: (beatId: string, settings: BeatKenBurnsSettings) => void
  onSaveEditedDialogueFrame?: (dialogueIndex: number, imageUrl: string) => void
  onSaveEditedCustomFrame?: (customFrameId: string, imageUrl: string) => void
  onExpressSceneGenerate?: (options?: ExpressSceneConfirmOptions) => void | Promise<void>
  onSyncPreVisToScript?: () => void | Promise<void>
  onAddStoryboardFrame?: () => void | Promise<void>
  onDeleteStoryboardFrame?: (frameId: string) => void | Promise<void>
  onGenerateCustomFrame?: (frameId: string) => Promise<void>
  onUploadCustomFrame?: (frameId: string, file: File) => void
  /** Key of the frame designated as this scene's Screening Room poster. */
  screeningPosterFrameKey?: string
  onSetScreeningPoster?: (slot: StoryboardFrameSlot | null) => void
  /** When true, skip accordion header — used inside the Writer's Room Pre-Vis panel */
  hideOuterChrome?: boolean
  /** Open Screening Room Pre-Vis for this scene. */
  onPlayPreVis?: () => void
  /** Direct prompt-builder run in flight — same spinner key Regen wrapGenerate uses. */
  generatingDirectSlotKey?: string | null
  /**
   * Session default for Frame Agent, one-click Regen, and Direct Frame.
   * Dialogs may override per run without writing back here.
   */
  frameGenerationQuality?: StoryboardQuality
  onFrameGenerationQualityChange?: (quality: StoryboardQuality) => void
  frameGenerationMode?: StillGenerationMode
  onFrameGenerationModeChange?: (mode: StillGenerationMode) => void
  /** Shared beat selection with Direction, Audio, and Video. */
  selectedBeatId?: string | null
  onSelectBeat?: (beatId: string) => void
}

interface StoryboardSlotHandlers {
  sceneIndex: number
  sceneNumber: number
  prompt: string
  isGenerating: boolean
  generatingDialogueFrames: Set<string>
  generatingCustomFrames: Set<string>
  generatingDirectSlotKey?: string | null
  onGenerate: (prompt: string) => Promise<void>
  onGenerateDialogueFrame?: (dialogueIndex: number) => Promise<void>
  onGenerateBeatFrame?: (beatId: string) => Promise<void>
  onGenerateBeatStartFrame?: (beatId: string) => Promise<void>
  onGenerateBeatEndFrame?: (beatId: string) => Promise<void>
  onGenerateBeatFrames?: (beatId: string) => Promise<void>
  onDeleteBeatStartFrame?: (beatId: string) => Promise<void>
  onDeleteBeatEndFrame?: (beatId: string) => Promise<void>
  onDirectFrame?: (slot: StoryboardFrameSlot) => void
  onDirectorFrame?: (slot: StoryboardFrameSlot) => void
  onUploadDialogueFrame?: (dialogueIndex: number, file: File) => void
  onUploadBeatFrame?: (beatId: string, file: File, frameRole?: 'start' | 'action-start' | 'end') => void
  onEditFrame?: (frame: EditingFrame) => void
  onRestoreStillVersion?: (slot: StoryboardFrameSlot, versionId: string) => void
  onUpload?: (file: File) => void
  onGenerateCustomFrame?: (frameId: string) => Promise<void>
  onUploadCustomFrame?: (frameId: string, file: File) => void
  onDeleteStoryboardFrame?: (frameId: string) => void | Promise<void>
  /** When set, per-slot Generate opens Express instead of single-frame API. */
  routeGenerateToExpress?: () => void
  /** Why no frame can be generated yet (undrawn references). */
  generateBlockedReason?: string
}

function buildStoryboardSlotFrameProps(
  slot: StoryboardFrameSlot,
  handlers: StoryboardSlotHandlers,
  promptChanged = false
): Omit<
  SceneImageFrameProps,
  | 'compact'
  | 'showControls'
  | 'controlsVariant'
  | 'onSelect'
  | 'isSelected'
  | 'showBorder'
  | 'promptLineClamp'
> {
  const {
    sceneIndex,
    sceneNumber,
    prompt,
    isGenerating,
    generatingDialogueFrames,
    generatingCustomFrames,
    generatingDirectSlotKey,
    onGenerate,
    onGenerateDialogueFrame,
    onGenerateBeatFrame,
    onGenerateBeatStartFrame,
    onGenerateBeatEndFrame,
    onGenerateBeatFrames,
    onDeleteBeatStartFrame,
    onDeleteBeatEndFrame,
    onDirectFrame,
    onDirectorFrame,
    onUploadDialogueFrame,
    onUploadBeatFrame,
    onEditFrame,
    onRestoreStillVersion,
    onUpload,
    onGenerateCustomFrame,
    onUploadCustomFrame,
    onDeleteStoryboardFrame,
    routeGenerateToExpress,
    generateBlockedReason,
  } = handlers

  const useExpressGenerate =
    !!routeGenerateToExpress &&
    slot.frameRole !== 'end' &&
    slot.frameRole !== 'action-start'

  if (slot.kind === 'custom') {
    const genKey = storyboardGeneratingSlotKey(sceneIndex, slot)
    return {
      sceneIdx: sceneIndex,
      sceneNumber,
      imageUrl: slot.displayImageUrl,
      isPlaceholder: slot.isPlaceholder,
      isGenerating: generatingCustomFrames.has(genKey) || generatingDirectSlotKey === genKey,
      label: slot.label,
      imagePrompt: slot.storyboardImagePrompt,
      generateBlockedReason,
      onGenerate: () => void onGenerateCustomFrame?.(slot.customFrameId!),
      onDirect: onDirectFrame ? () => onDirectFrame(slot) : undefined,
      onDirector: undefined,
      onUpload: (file) => onUploadCustomFrame?.(slot.customFrameId!, file),
      onEdit:
        slot.displayImageUrl && onEditFrame && slot.customFrameId
          ? (url) =>
              onEditFrame({
                kind: 'custom',
                sceneIndex,
                customFrameId: slot.customFrameId!,
                imageUrl: url,
              })
          : undefined,
      onDelete:
        onDeleteStoryboardFrame && slot.customFrameId
          ? () => {
              if (slot.ownImageUrl && !window.confirm('Delete this storyboard frame?')) return
              void onDeleteStoryboardFrame(slot.customFrameId!)
            }
          : undefined,
      imageVersions: slot.imageVersions,
      imageVersionId: slot.imageVersionId,
      onRestoreVersion:
        onRestoreStillVersion && slot.imageVersions && slot.imageVersions.length > 1
          ? (versionId: string) => onRestoreStillVersion(slot, versionId)
          : undefined,
    }
  }

  const dialogueIdx = slot.dialogueIndex
  const beatId = slot.beatId
  const isActionStartFrame = slot.frameRole === 'action-start'
  const isEndFrame = slot.frameRole === 'end'
  const effectiveBeatRole: 'start' | 'action-start' | 'end' = isActionStartFrame
    ? 'action-start'
    : isEndFrame
      ? 'end'
      : 'start'
  // Any beat-backed slot is a beat frame, dialogue included. The old action/
  // narration gate sent spoken beats down handleGenerateDialogueFrameImage,
  // which froze the page and skipped the Express dock Regen already uses.
  const useBeatFrame = !!beatId
  const generatingKey = storyboardGeneratingSlotKey(sceneIndex, slot)
  const isDirectGenerating = generatingDirectSlotKey === generatingKey
  const isGeneratingBeatFrame =
    useBeatFrame &&
    (generatingDialogueFrames.has(
      isActionStartFrame
        ? `${sceneIndex}-beat-${beatId}-start`
        : isEndFrame
          ? `${sceneIndex}-beat-${beatId}-end`
          : `${sceneIndex}-beat-${beatId}`
    ) ||
      generatingDialogueFrames.has(`${sceneIndex}-beat-${beatId}-frames`) ||
      isDirectGenerating)
  const isGeneratingFrame =
    !useBeatFrame &&
    typeof dialogueIdx === 'number' &&
    (generatingDialogueFrames.has(`${sceneIndex}-${dialogueIdx}`) || isDirectGenerating)
  const isLegacyEstablishingOnly =
    !useBeatFrame && slot.kind === 'action' && typeof dialogueIdx !== 'number' && !beatId

  return {
    sceneIdx: sceneIndex,
    sceneNumber,
    imageUrl: slot.isMissing ? undefined : slot.displayImageUrl,
    isPlaceholder: slot.isPlaceholder,
    isGenerating: isLegacyEstablishingOnly
      ? isGenerating || isDirectGenerating
      : useBeatFrame
        ? isGeneratingBeatFrame
        : isGeneratingFrame,
    label: slot.label,
    generateBlockedReason,
    imageTier: slot.ownImageUrl ? slot.imageTier : undefined,
    beatRole: slot.beatRole,
    beatNumber: slot.beatId ? slot.beatNumber : undefined,
    imagePrompt: slot.storyboardImagePrompt,
    imageError: slot.ownImageUrl ? undefined : slot.imageError,
    promptChanged,
    onGenerate: () => {
      if (isActionStartFrame && useBeatFrame && beatId) {
        if (onGenerateBeatStartFrame) {
          void onGenerateBeatStartFrame(beatId)
        } else if (onGenerateBeatFrames) {
          void onGenerateBeatFrames(beatId)
        }
        return
      }
      if (isEndFrame && useBeatFrame && beatId) {
        if (onGenerateBeatEndFrame) {
          void onGenerateBeatEndFrame(beatId)
        } else if (onGenerateBeatFrames) {
          void onGenerateBeatFrames(beatId)
        }
        return
      }
      if (routeGenerateToExpress) {
        routeGenerateToExpress()
        return
      }
      if (useBeatFrame && beatId) {
        void onGenerateBeatFrame?.(beatId)
      } else if (isLegacyEstablishingOnly) {
        void onGenerate(prompt)
      } else if (typeof dialogueIdx === 'number') {
        void onGenerateDialogueFrame?.(dialogueIdx)
      }
    },
    onDirect: onDirectFrame ? () => onDirectFrame(slot) : undefined,
    onDirector:
      onDirectorFrame && useBeatFrame ? () => onDirectorFrame(slot) : undefined,
    onUpload: (file) => {
      if (useBeatFrame && onUploadBeatFrame && beatId) {
        onUploadBeatFrame(beatId, file, effectiveBeatRole)
      } else if (isLegacyEstablishingOnly) {
        onUpload?.(file)
      } else if (typeof dialogueIdx === 'number') {
        onUploadDialogueFrame?.(dialogueIdx, file)
      }
    },
    onEdit:
      slot.displayImageUrl && !slot.isMissing
        ? (url) => {
            if (useBeatFrame && onEditFrame && beatId) {
              onEditFrame({
                kind: 'beat',
                sceneIndex,
                beatId,
                frameRole: effectiveBeatRole,
                imageUrl: url,
              })
            } else if (isLegacyEstablishingOnly && onEditFrame) {
              onEditFrame({ kind: 'establishing', sceneIndex, imageUrl: url })
            } else if (typeof dialogueIdx === 'number' && onEditFrame) {
              onEditFrame({ kind: 'dialogue', sceneIndex, dialogueIndex: dialogueIdx, imageUrl: url })
            }
          }
        : undefined,
    onDelete:
      isActionStartFrame && slot.ownImageUrl && onDeleteBeatStartFrame && beatId
        ? () => {
            if (!window.confirm('Clear the Start Frame for this shot?')) return
            void onDeleteBeatStartFrame(beatId)
          }
        : isEndFrame && slot.ownImageUrl && onDeleteBeatEndFrame && beatId
          ? () => {
              if (!window.confirm('Clear the End Frame for this shot?')) return
              void onDeleteBeatEndFrame(beatId)
            }
          : undefined,
    generateLabel: useExpressGenerate
      ? 'Stills Agent'
      : isActionStartFrame
        ? 'Generate Start Frame'
        : isEndFrame
          ? 'Generate End Frame'
          : undefined,
    useExpressGenerateIcon: useExpressGenerate,
    imageVersions: slot.imageVersions,
    imageVersionId: slot.imageVersionId,
    onRestoreVersion:
      onRestoreStillVersion && slot.imageVersions && slot.imageVersions.length > 1
        ? (versionId: string) => onRestoreStillVersion(slot, versionId)
        : undefined,
  }
}

function formatBeatRoleLabel(beatRole?: string): string | null {
  if (!beatRole) return null
  if (beatRole === 'title_reveal') return 'Title'
  if (beatRole === 'credit') return 'Credit'
  if (beatRole === 'opening') return 'Opening'
  if (beatRole === 'dissolve') return 'Dissolve'
  if (beatRole === 'climax') return 'Climax'
  if (beatRole === 'progression') return 'Progression'
  return beatRole.replace(/_/g, ' ')
}

function ExpressPhasePill({
  label,
  status,
  rateLimited,
}: {
  label: string
  status: ExpressPhaseStatus
  rateLimited?: boolean
}) {
  const cls = (() => {
    switch (status) {
      case 'running':
        return 'bg-indigo-500/30 text-indigo-200 border-indigo-400/40'
      case 'done':
        return 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
      case 'error':
        return rateLimited
          ? 'bg-amber-500/30 text-amber-200 border-amber-400/50'
          : 'bg-rose-500/30 text-rose-200 border-rose-400/40'
      default:
        return 'bg-gray-700/40 text-gray-300 border-gray-500/40'
    }
  })()
  return (
    <span
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border',
        cls
      )}
      title={rateLimited ? 'Rate limited after repeated 429 responses' : undefined}
    >
      {status === 'running' && <Loader className="w-2.5 h-2.5 animate-spin" />}
      {status === 'done' && <Check className="w-2.5 h-2.5" />}
      {status === 'error' && rateLimited ? '429' : null}
      {label}
    </span>
  )
}

export function SceneStoryboardFrameViewer({
  scene,
  sceneIndex,
  sceneNumber,
  prompt = '',
  characters = [],
  objectReferences = [],
  locationReferences = [],
  sceneRequirements = [],
  selectedLanguage = 'en',
  narrationVoice,
  expressPhaseStatus,
  expressGateBlocked = false,
  onExpressGateBlocked,
  isExpressRunning = false,
  expressElapsedSec = 0,
  isGeneratingScene = false,
  onGenerateScene,
  onGenerateDialogueFrame,
  onGenerateBeatFrame,
  onGenerateBeatStartFrame,
  onGenerateBeatEndFrame,
  onGenerateBeatFrames,
  onUsePrevEndFrameAsStart,
  onDeleteBeatStartFrame,
  onDeleteBeatEndFrame,
  onDirectFrame,
  onDirectorFrame,
  onUploadDialogueFrame,
  onUploadBeatFrame,
  onUploadScene,
  onSaveEditedScene,
  onSaveEditedBeatFrame,
  onRestoreStillVersion,
  onSaveBeatKenBurns,
  onSaveEditedDialogueFrame,
  onSaveEditedCustomFrame,
  onExpressSceneGenerate,
  onSyncPreVisToScript,
  onAddStoryboardFrame,
  onDeleteStoryboardFrame,
  onGenerateCustomFrame,
  onUploadCustomFrame,
  screeningPosterFrameKey,
  onSetScreeningPoster,
  hideOuterChrome = false,
  onPlayPreVis,
  generatingDirectSlotKey = null,
  frameGenerationQuality = 'draft',
  onFrameGenerationQualityChange,
  frameGenerationMode = 'standard',
  onFrameGenerationModeChange,
  selectedBeatId = null,
  onSelectBeat,
}: SceneStoryboardFrameViewerProps) {
  const tExpressScene = useTranslations('production.expressScene')
  const tStillPolicy = useTranslations('production.direction.stillPolicy')
  const [collapsed, setCollapsed] = useState(false)
  const [selectedFrameKey, setSelectedFrameKey] = useState<string | null>(null)
  const [activeBeatFrameRole, setActiveBeatFrameRole] = useState<'start' | 'action-start' | 'end'>('start')
  const [frameAttention, setFrameAttention] = useState<FrameAttentionFilter>('all')
  const [frameType, setFrameType] = useState<FrameTypeFilter>('all')
  const [generatingDialogueFrames, setGeneratingDialogueFrames] = useState<Set<string>>(new Set())
  const [generatingCustomFrames, setGeneratingCustomFrames] = useState<Set<string>>(new Set())
  const [expressSceneDialogOpen, setExpressSceneDialogOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [motionEditorOpen, setMotionEditorOpen] = useState(false)
  const [editingFrame, setEditingFrame] = useState<EditingFrame | null>(null)

  const frameSlots = useMemo(
    () => enumerateStoryboardFrameSlots(scene, undefined, { startFramesOnly: true }),
    [scene]
  )
  const allFrameSlots = useMemo(
    () => enumerateStoryboardFrameSlots(scene, undefined, { startFramesOnly: false }),
    [scene]
  )
  const sceneBeats = useMemo(() => getSceneBeats(scene), [scene])
  const frameStats = useMemo(() => countStoryboardFrameStats(scene), [scene])
  /**
   * Two independent reasons to offer a refresh: the script prose moved under
   * the frames, or the beats are carrying prompts keyed to a direction (or a
   * composer version) that is no longer current. Gating only on the first hid
   * the control for every scene in the second state.
   */
  const preVisStale = useMemo(
    () => isPreVisStale(scene) || sceneHasStalePromptKeys(scene),
    [scene]
  )
  const stalePromptCount = useMemo(() => countStalePromptKeys(scene), [scene])
  const staleFrameCount = useMemo(
    () => sceneBeats.filter((beat) => isBeatFrameStale(beat)).length,
    [sceneBeats]
  )
  const draftFrameCount = useMemo(() => countDraftStoryboardFrames(scene), [scene])
  const slotPromptChanged = useCallback(
    (slot: StoryboardFrameSlot) => {
      if (!slot.beatId) return false
      const beat = sceneBeats.find((entry) => entry.beatId === slot.beatId)
      return beat ? isBeatFrameStale(beat) : false
    },
    [sceneBeats]
  )
  const frameFacts = useMemo<FrameListFacts[]>(
    () =>
      frameSlots.map((slot) => ({
        key: slot.key,
        kind: slot.kind,
        imageTier: slot.ownImageUrl ? slot.imageTier : undefined,
        isMissing: slot.isMissing,
        isPlaceholder: slot.isPlaceholder,
        promptChanged: slotPromptChanged(slot),
        hasImageError: !!slot.imageError?.trim(),
        hasOwnImage: !!slot.ownImageUrl,
        referenceStatus: slot.referenceStatus,
      })),
    [frameSlots, slotPromptChanged]
  )
  const visibleFrameSlots = useMemo(
    () =>
      frameSlots.filter((slot) => {
        const facts = frameFacts.find((entry) => entry.key === slot.key)
        return facts ? frameMatchesFilters(facts, frameAttention, frameType) : true
      }),
    [frameSlots, frameFacts, frameAttention, frameType]
  )
  const isFirstTimeFrameGeneration = useMemo(
    () => sceneHasNoOwnedBeatImages(scene),
    [scene]
  )

  const sceneKey = scene?.sceneId || scene?.id || `scene-${sceneIndex}`

  useEffect(() => {
    setSelectedFrameKey(frameSlots[0]?.key ?? null)
  }, [sceneKey, frameSlots])

  useEffect(() => {
    if (visibleFrameSlots.length === 0) return
    if (visibleFrameSlots.some((slot) => slot.key === selectedFrameKey)) return
    const current = frameSlots.find((slot) => slot.key === selectedFrameKey)
    if (current?.beatId && current.beatId === selectedBeatId) return
    setSelectedFrameKey(visibleFrameSlots[0].key)
  }, [visibleFrameSlots, selectedFrameKey, frameSlots, selectedBeatId])

  useEffect(() => {
    if (!selectedBeatId) return
    const current = frameSlots.find((slot) => slot.key === selectedFrameKey)
    if (current?.beatId === selectedBeatId) return
    const match =
      frameSlots.find((slot) => slot.beatId === selectedBeatId && slot.frameRole !== 'end') ??
      frameSlots.find((slot) => slot.beatId === selectedBeatId)
    if (match && match.key !== selectedFrameKey) setSelectedFrameKey(match.key)
  }, [selectedBeatId, frameSlots, selectedFrameKey])

  const previewSlot = useMemo(() => {
    if (visibleFrameSlots.length === 0) return null
    return visibleFrameSlots.find((slot) => slot.key === selectedFrameKey) ?? visibleFrameSlots[0]
  }, [visibleFrameSlots, selectedFrameKey])

  useEffect(() => {
    setActiveBeatFrameRole('start')
  }, [previewSlot?.beatId])

  const activeBeatIndex = useMemo(() => {
    if (!previewSlot?.beatId) return -1
    return sceneBeats.findIndex((beat) => beat.beatId === previewSlot.beatId)
  }, [previewSlot?.beatId, sceneBeats])

  const activeBeat = useMemo(() => {
    if (activeBeatIndex < 0) return undefined
    return sceneBeats[activeBeatIndex]
  }, [activeBeatIndex, sceneBeats])

  const prevBeatForContinuity = useMemo(() => {
    if (activeBeatIndex <= 0) return undefined
    const prev = sceneBeats[activeBeatIndex - 1]
    const prevEndOrStartUrl =
      prev?.storyboardEndImageUrl?.trim() ||
      prev?.storyboardStartImageUrl?.trim() ||
      prev?.storyboardImageUrl?.trim()
    if (!prev || !prevEndOrStartUrl) return undefined
    return {
      beat: prev,
      beatNumber:
        (typeof prev.sequenceIndex === 'number' ? prev.sequenceIndex : activeBeatIndex - 1) + 1,
      imageUrl: prevEndOrStartUrl,
      hasOwnEndFrame: !!prev.storyboardEndImageUrl?.trim(),
    }
  }, [activeBeatIndex, sceneBeats])

  const actionStartSlotForActiveBeat = useMemo<StoryboardFrameSlot | null>(() => {
    if (!previewSlot?.beatId) return null
    const fromAll = allFrameSlots.find(
      (slot) => slot.beatId === previewSlot.beatId && slot.frameRole === 'action-start'
    )
    if (fromAll) {
      const fallbackPrompt =
        fromAll.storyboardImagePrompt?.trim() ||
        (activeBeat ? buildStartFramePrompt(activeBeat) : '')
      return {
        ...fromAll,
        storyboardImagePrompt: fallbackPrompt || fromAll.storyboardImagePrompt,
      }
    }
    if (!activeBeat) return null
    const ownStart = activeBeat.storyboardStartImageUrl?.trim() || undefined
    return {
      ...previewSlot,
      key: beatFrameSlotKey(previewSlot.beatId, 'action-start'),
      label: `${previewSlot.label} (Start)`,
      frameRole: 'action-start',
      ownImageUrl: ownStart,
      displayImageUrl: ownStart,
      isPlaceholder: false,
      isMissing: !ownStart,
      storyboardImagePrompt:
        activeBeat.storyboardStartImagePrompt?.trim() || buildStartFramePrompt(activeBeat),
      imageError: activeBeat.storyboardStartImageError,
      imageVersions: activeBeat.storyboardStartImageVersions,
      imageVersionId: activeBeat.storyboardStartImageVersionId,
    }
  }, [previewSlot, allFrameSlots, activeBeat])

  const endSlotForActiveBeat = useMemo<StoryboardFrameSlot | null>(() => {
    if (!previewSlot?.beatId) return null
    const fromAll = allFrameSlots.find(
      (slot) => slot.beatId === previewSlot.beatId && slot.frameRole === 'end'
    )
    if (fromAll) {
      const fallbackPrompt =
        fromAll.storyboardImagePrompt?.trim() ||
        (activeBeat ? buildEndFramePrompt(activeBeat) : '')
      return {
        ...fromAll,
        storyboardImagePrompt: fallbackPrompt || fromAll.storyboardImagePrompt,
      }
    }
    if (!activeBeat) return null
    const ownEnd = activeBeat.storyboardEndImageUrl?.trim() || undefined
    return {
      ...previewSlot,
      key: beatFrameSlotKey(previewSlot.beatId, 'end'),
      label: `${previewSlot.label} (End)`,
      frameRole: 'end',
      ownImageUrl: ownEnd,
      displayImageUrl: ownEnd,
      isPlaceholder: false,
      isMissing: !ownEnd,
      storyboardImagePrompt:
        activeBeat.storyboardEndImagePrompt?.trim() || buildEndFramePrompt(activeBeat),
      imageError: activeBeat.storyboardEndImageError,
      imageVersions: activeBeat.storyboardEndImageVersions,
      imageVersionId: activeBeat.storyboardEndImageVersionId,
    }
  }, [previewSlot, allFrameSlots, activeBeat])

  const activeDisplaySlot = useMemo<StoryboardFrameSlot | null>(() => {
    if (!previewSlot) return null
    if (previewSlot.beatId && activeBeatFrameRole === 'action-start' && actionStartSlotForActiveBeat) {
      return actionStartSlotForActiveBeat
    }
    if (previewSlot.beatId && activeBeatFrameRole === 'end' && endSlotForActiveBeat) {
      return endSlotForActiveBeat
    }
    return previewSlot
  }, [previewSlot, activeBeatFrameRole, actionStartSlotForActiveBeat, endSlotForActiveBeat])

  const previewBeatKenBurns = useMemo(() => {
    if (!previewSlot?.beatId) return undefined
    return sceneBeats.find((beat) => beat.beatId === previewSlot.beatId)?.kenBurns
  }, [previewSlot?.beatId, sceneBeats])

  const previewStillPrompt = useMemo(() => {
    const slotToInspect = activeDisplaySlot ?? previewSlot
    if (!slotToInspect) return ''
    if (slotToInspect.storyboardImagePrompt?.trim()) {
      return slotToInspect.storyboardImagePrompt.trim()
    }
    if (slotToInspect.beatId) {
      const beat = sceneBeats.find((entry) => entry.beatId === slotToInspect.beatId)
      if (beat) {
        if (slotToInspect.frameRole === 'action-start') {
          return (beat.storyboardStartImagePrompt?.trim() || buildStartFramePrompt(beat)).trim()
        }
        if (slotToInspect.frameRole === 'end') {
          return (beat.storyboardEndImagePrompt?.trim() || buildEndFramePrompt(beat)).trim()
        }
        if (beat.beatDirection?.framePrompt?.trim()) {
          return beat.beatDirection.framePrompt.trim()
        }
        const isTitle = beat.beatRole === 'title_reveal' || beat.beatRole === 'credit'
        return (
          composePersistedBeatStillPrompt({
            sceneIndex,
            beat,
            actionLeadIn: isTitle ? TITLE_BEAT_ACTION_LEAD_IN : undefined,
          }) ||
          composeBeatActionFraming(beat) ||
          ''
        ).trim()
      }
    }
    if (slotToInspect.key === 'establishing') {
      return (prompt || String(scene?.imagePrompt ?? '')).trim()
    }
    return ''
  }, [activeDisplaySlot, previewSlot, sceneBeats, sceneIndex, prompt, scene?.imagePrompt])

  const [copiedStillSlotKey, setCopiedStillSlotKey] = useState<string | null>(null)

  const handleCopyStillPrompt = useCallback((promptText: string, slotKey: string) => {
    const trimmed = promptText.trim()
    if (!trimmed) return
    void navigator.clipboard.writeText(trimmed).then(() => {
      setCopiedStillSlotKey(slotKey)
      toast.success('Still prompt copied')
      window.setTimeout(() => {
        setCopiedStillSlotKey((current) => (current === slotKey ? null : current))
      }, 2000)
    })
  }, [])

  const editCharacterReferences = useMemo(
    () =>
      resolveFrameEditCharacterReferences({
        editingFrame,
        scene,
        sceneIndex,
        characters: characters ?? [],
        slot: previewSlot,
        locationReferences,
        objectReferences: objectReferences as never,
      }),
    [editingFrame, scene, sceneIndex, characters, previewSlot, locationReferences, objectReferences]
  )

  const allEditCharacterReferences = useMemo(
    () =>
      listAllFrameEditCharacterReferences({
        scene,
        sceneIndex,
        characters: characters ?? [],
      }),
    [scene, sceneIndex, characters]
  )

  const editLocationStills = useMemo(
    () => listFrameEditLocationStills(locationReferences),
    [locationReferences]
  )

  const defaultEditCharRefKeys = useMemo(
    () => frameEditReferenceKeys(editCharacterReferences),
    [editCharacterReferences]
  )

  const defaultEditLocationIds = useMemo(
    () =>
      resolveDefaultFrameEditLocationStillIds({
        editingFrame,
        scene,
        sceneIndex,
        locationReferences,
        slot: previewSlot,
      }),
    [editingFrame, scene, sceneIndex, locationReferences, previewSlot]
  )

  const defaultEditPropIds = useMemo(
    () =>
      resolveDefaultFrameEditObjectIds({
        editingFrame,
        scene,
        sceneIndex,
        objectReferences,
        locationReferences,
        characters: characters ?? [],
        slot: previewSlot,
      }),
    [editingFrame, scene, sceneIndex, objectReferences, locationReferences, characters, previewSlot]
  )

  const sceneExpressPreflight = useMemo(
    () =>
      runSceneExpressPreflight({
        scene,
        sceneIndex,
        characters,
        narrationVoice,
        language: selectedLanguage,
        framesOnly: isFirstTimeFrameGeneration,
        // Resolved once by the scene card and shared, so the References tab,
        // this gate and the auto-chain cannot disagree about what is missing.
        sceneRequirements,
      }),
    [
      scene,
      sceneIndex,
      characters,
      narrationVoice,
      selectedLanguage,
      isFirstTimeFrameGeneration,
      sceneRequirements,
    ]
  )

  const missingSceneReferences = useMemo(
    () => sceneRequirements.filter((requirement) => !requirement.imageUrl?.trim()),
    [sceneRequirements]
  )

  /**
   * Un-imaged references sink single-frame generation too, not just Express:
   * the beat planner names the reference, nothing gets attached, and the model
   * invents an appearance that will not match the next frame.
   *
   * Scoped to this scene, because that is the scope of the runs it gates.
   * Express Frames draws the gaps itself; a single frame has nowhere to put
   * that step, so it still has to wait.
   */
  const referenceReadiness = useMemo(
    () => resolveSceneReferenceReadiness(sceneRequirements),
    [sceneRequirements]
  )
  const referenceGateMessage = formatReferenceReadinessMessage(referenceReadiness, 'scene')

  /**
   * Express Frames draws this scene's missing references before the frames, so
   * an undrawn reference is no longer a reason to refuse the run — the confirm
   * dialog names what will be drawn and the overlay shows it happening.
   */
  const expressCanDrawMissingReferences = !!sceneExpressPreflight.blockedOnlyByReferences
  const expressPreflightBlocks =
    !sceneExpressPreflight.ok && !expressCanDrawMissingReferences

  const sceneExpressDisabled =
    isExpressRunning || (!expressGateBlocked && expressPreflightBlocks)

  const sceneExpressTooltip = expressPreflightBlocks
    ? sceneExpressPreflight.errors[0]
    : expressCanDrawMissingReferences
      ? `${referenceGateMessage} Stills Agent draws them first.`
      : sceneExpressPreflight.nothingToDo
        ? 'Scene complete — choose frames to regenerate'
        : '~60s — Vertex AI — Direction (if needed) → Audio + shots in parallel'

  const openExpressSceneDialog = useCallback(() => {
    if (expressGateBlocked && onExpressGateBlocked) {
      onExpressGateBlocked()
      return
    }
    if (expressPreflightBlocks) {
      toast.error(sceneExpressPreflight.errors[0])
      return
    }
    setExpressSceneDialogOpen(true)
  }, [expressGateBlocked, expressPreflightBlocks, onExpressGateBlocked, sceneExpressPreflight])

  const sceneExpressRunning =
    isExpressRunning &&
    !!expressPhaseStatus &&
    (expressPhaseStatus.direction === 'running' ||
      expressPhaseStatus.audio === 'running' ||
      expressPhaseStatus.image === 'running')

  const handleEditFrame = useCallback((frame: EditingFrame) => {
    setEditingFrame(frame)
    setEditModalOpen(true)
  }, [])

  const wrapGenerate = useCallback(
    async (key: string, fn: () => void | Promise<void>) => {
      setGeneratingDialogueFrames((prev) => new Set(prev).add(key))
      try {
        await fn()
      } finally {
        setGeneratingDialogueFrames((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    },
    []
  )

  const blockedByReferences = useCallback((): boolean => {
    if (referenceReadiness.ready) return false
    toast.error(referenceGateMessage, {
      description:
        'Run Stills Agent to draw them first, or draw them from the Continuity tab.',
    })
    return true
  }, [referenceReadiness.ready, referenceGateMessage])

  const slotHandlers = useMemo(
    (): StoryboardSlotHandlers => ({
      sceneIndex,
      sceneNumber,
      prompt,
      isGenerating: isGeneratingScene,
      generatingDialogueFrames,
      generatingCustomFrames,
      generatingDirectSlotKey,
      onGenerate: async (p) => {
        if (blockedByReferences()) return
        if (onGenerateScene) await onGenerateScene(p)
      },
      onGenerateDialogueFrame: onGenerateDialogueFrame
        ? async (dialogueIdx) => {
            if (blockedByReferences()) return
            const key = `${sceneIndex}-${dialogueIdx}`
            await wrapGenerate(key, () => onGenerateDialogueFrame(dialogueIdx))
          }
        : undefined,
      onGenerateBeatFrame: onGenerateBeatFrame
        ? async (beatId) => {
            if (blockedByReferences()) return
            const key = `${sceneIndex}-beat-${beatId}`
            await wrapGenerate(key, () => onGenerateBeatFrame(beatId))
          }
        : undefined,
      onGenerateBeatStartFrame: onGenerateBeatStartFrame
        ? async (beatId) => {
            if (blockedByReferences()) return
            const key = `${sceneIndex}-beat-${beatId}-start`
            await wrapGenerate(key, () => onGenerateBeatStartFrame(beatId))
          }
        : undefined,
      onGenerateBeatEndFrame: onGenerateBeatEndFrame
        ? async (beatId) => {
            if (blockedByReferences()) return
            const key = `${sceneIndex}-beat-${beatId}-end`
            await wrapGenerate(key, () => onGenerateBeatEndFrame(beatId))
          }
        : undefined,
      onGenerateBeatFrames: onGenerateBeatFrames
        ? async (beatId) => {
            if (blockedByReferences()) return
            const key = `${sceneIndex}-beat-${beatId}-frames`
            await wrapGenerate(key, () => onGenerateBeatFrames(beatId))
          }
        : undefined,
      onDeleteBeatStartFrame,
      onDeleteBeatEndFrame,
      onDirectFrame: onDirectFrame
        ? (slot) => {
            if (blockedByReferences()) return
            onDirectFrame(slot)
          }
        : undefined,
      onDirectorFrame: onDirectorFrame
        ? (slot) => {
            if (blockedByReferences()) return
            onDirectorFrame(slot)
          }
        : undefined,
      onUploadDialogueFrame,
      onUploadBeatFrame,
      onEditFrame: handleEditFrame,
      onRestoreStillVersion,
      onUpload: onUploadScene,
      onGenerateCustomFrame: onGenerateCustomFrame
        ? async (frameId) => {
            if (blockedByReferences()) return
            const key = `custom-${sceneIndex}-${frameId}`
            setGeneratingCustomFrames((prev) => new Set(prev).add(key))
            try {
              await onGenerateCustomFrame(frameId)
            } finally {
              setGeneratingCustomFrames((prev) => {
                const next = new Set(prev)
                next.delete(key)
                return next
              })
            }
          }
        : undefined,
      onUploadCustomFrame,
      onDeleteStoryboardFrame,
      routeGenerateToExpress:
        isFirstTimeFrameGeneration && onExpressSceneGenerate
          ? openExpressSceneDialog
          : undefined,
      generateBlockedReason: referenceGateMessage || undefined,
    }),
    [
      sceneIndex,
      sceneNumber,
      prompt,
      isGeneratingScene,
      generatingDialogueFrames,
      generatingCustomFrames,
      generatingDirectSlotKey,
      onGenerateScene,
      onGenerateDialogueFrame,
      onGenerateBeatFrame,
      onGenerateBeatStartFrame,
      onGenerateBeatEndFrame,
      onGenerateBeatFrames,
      onDeleteBeatStartFrame,
      onDeleteBeatEndFrame,
      onDirectFrame,
      onDirectorFrame,
      onUploadDialogueFrame,
      onUploadBeatFrame,
      handleEditFrame,
      onRestoreStillVersion,
      onUploadScene,
      onGenerateCustomFrame,
      onUploadCustomFrame,
      onDeleteStoryboardFrame,
      wrapGenerate,
      blockedByReferences,
      referenceGateMessage,
      isFirstTimeFrameGeneration,
      onExpressSceneGenerate,
      openExpressSceneDialog,
    ]
  )

  const qualityToggle = (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <StoryboardQualityToggle
              size="compact"
              value={frameGenerationQuality}
              onChange={onFrameGenerationQualityChange ?? (() => {})}
              draftLabel={tExpressScene('qualityDraft')}
              finalLabel={tExpressScene('qualityFinal')}
              disabled={isExpressRunning}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          Default for Stills Agent, Regen, and Direct Frame
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <StoryboardGenerationModeToggle
              size="compact"
              value={frameGenerationMode}
              onChange={onFrameGenerationModeChange ?? (() => {})}
              standardLabel={tStillPolicy('standard')}
              creativeLabel={tStillPolicy('creative')}
              disabled={isExpressRunning}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {tStillPolicy('modeTooltip')}
        </TooltipContent>
      </Tooltip>
    </div>
  )

  if (frameSlots.length === 0 && sceneBeats.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
    <div className={cn(
      hideOuterChrome
        ? 'space-y-3'
        : 'bg-slate-900/40 border border-slate-700/50 rounded-lg overflow-hidden'
    )}>
      {!hideOuterChrome && (
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-cyan-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-cyan-400" />
          )}
          <Clapperboard className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-gray-200">Pre-Vis</span>
          {frameStats.total > 0 && (
            <span className="text-xs text-gray-500">
              ({frameStats.withImage}/{frameStats.total})
            </span>
          )}
        </button>
        {expressPhaseStatus && (
          <div className="flex items-center gap-1 flex-wrap">
            <ExpressPhasePill
              label="Dir"
              status={expressPhaseStatus.direction}
              rateLimited={expressPhaseStatus.rateLimitedPhases?.direction}
            />
            <ExpressPhasePill
              label="Aud"
              status={expressPhaseStatus.audio}
              rateLimited={expressPhaseStatus.rateLimitedPhases?.audio}
            />
            <ExpressPhasePill
              label="Img"
              status={expressPhaseStatus.image}
              rateLimited={expressPhaseStatus.rateLimitedPhases?.image}
            />
            {expressPhaseStatus.rateLimited && (
              <span className="text-[10px] font-medium text-amber-300/90 px-1.5">
                Rate limited
              </span>
            )}
          </div>
        )}
      </div>
      )}

      {(hideOuterChrome || !collapsed) && (
        <div className={cn(hideOuterChrome ? 'space-y-3' : 'p-4 space-y-3')}>
          {hideOuterChrome && expressPhaseStatus && (
            <div className="flex items-center gap-1 flex-wrap justify-end">
              <ExpressPhasePill
                label="Dir"
                status={expressPhaseStatus.direction}
                rateLimited={expressPhaseStatus.rateLimitedPhases?.direction}
              />
              <ExpressPhasePill
                label="Aud"
                status={expressPhaseStatus.audio}
                rateLimited={expressPhaseStatus.rateLimitedPhases?.audio}
              />
              <ExpressPhasePill
                label="Img"
                status={expressPhaseStatus.image}
                rateLimited={expressPhaseStatus.rateLimitedPhases?.image}
              />
              {expressPhaseStatus.rateLimited && (
                <span className="text-[10px] font-medium text-amber-300/90 px-1.5">
                  Rate limited
                </span>
              )}
            </div>
          )}
          {!referenceReadiness.ready && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <p className="text-[11px] leading-relaxed text-amber-200">
                {referenceGateMessage}{' '}
                <span className="text-amber-300/80">
                  Stills Agent draws them first; the Continuity tab shows what is missing.
                </span>
              </p>
            </div>
          )}
          {frameSlots.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              <Camera className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p>No pre-vis frames yet.</p>
              <div className="mt-3 flex flex-col items-center gap-2">
                {qualityToggle}
                {onPlayPreVis && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/50 text-emerald-300"
                    onClick={onPlayPreVis}
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Play Pre-Vis
                  </Button>
                )}
                {onExpressSceneGenerate && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-amber-500/40 text-amber-300"
                    disabled={sceneExpressDisabled}
                    onClick={openExpressSceneDialog}
                  >
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    Stills Agent
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                  className={cn(
                    'text-[10px]',
                    frameStats.missing > 0 || staleFrameCount > 0
                      ? 'text-amber-500'
                      : frameStats.placeholders > 0
                        ? 'text-amber-400'
                        : 'text-gray-400'
                  )}
                >
                  {frameStats.withImage}/{frameStats.total}
                  {frameStats.withEndImage > 0 ? ` · ${frameStats.withEndImage} end` : ''}
                  {frameStats.missing > 0 ? ` · ${frameStats.missing} missing` : ''}
                  {frameStats.placeholders > 0 ? ` · ${frameStats.placeholders} placeholder` : ''}
                  {staleFrameCount > 0
                    ? ` · ${staleFrameCount} out of sync`
                    : ''}
                  {stalePromptCount > 0
                    ? ` · ${stalePromptCount} prompt${stalePromptCount === 1 ? '' : 's'} to refresh`
                    : ''}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {preVisStale && onSyncPreVisToScript && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] border-amber-500/50 text-amber-300 hover:bg-amber-500/15"
                      disabled={isExpressRunning}
                      onClick={() => void onSyncPreVisToScript()}
                    >
                      <RefreshCw className="w-3 h-3 mr-0.5" />
                      Update Frames
                    </Button>
                  )}
                  {qualityToggle}
                  {onPlayPreVis && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
                      onClick={onPlayPreVis}
                    >
                      <Play className="w-3 h-3 mr-0.5" />
                      Play Pre-Vis
                    </Button>
                  )}
                  {onExpressSceneGenerate && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                          disabled={sceneExpressDisabled}
                          onClick={openExpressSceneDialog}
                        >
                          <Zap className="w-3 h-3 mr-0.5" />
                          {sceneExpressRunning
                            ? `Stills Agent ${expressElapsedSec}s`
                            : 'Stills Agent'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">{sceneExpressTooltip}</TooltipContent>
                    </Tooltip>
                  )}
                  {draftFrameCount > 0 && (
                    <span className="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/5 px-1.5 py-1 text-[10px] text-emerald-300/90">
                      <Sparkles className="w-3 h-3" />
                      {draftFrameCount} draft
                    </span>
                  )}
                  {onAddStoryboardFrame && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10"
                      onClick={() => void onAddStoryboardFrame()}
                    >
                      <Plus className="w-3 h-3 mr-0.5" />
                      Add Frame
                    </Button>
                  )}
                </div>
              </div>

              <StatusFilterBar
                activeSummary={[
                  frameAttention === 'all' ? '' : frameShowLabels[frameAttention],
                  frameType === 'all' ? '' : frameTypeLabels[frameType],
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onClear={() => {
                  setFrameAttention('all')
                  setFrameType('all')
                }}
                groups={[
                  {
                    label: 'Show',
                    onSelect: (id) => setFrameAttention(id as FrameAttentionFilter),
                    chips: (
                      [
                        ['all', 'All'],
                        ['needs_action', 'Needs action'],
                        ['final', 'Final'],
                        ['draft', 'Draft'],
                        ['prompt_changed', 'Prompt changed'],
                        ['missing', 'Missing'],
                        ['placeholder', 'Placeholder'],
                      ] as Array<[FrameAttentionFilter, string]>
                    ).map(([id, label]) => ({
                      id,
                      label,
                      tooltip: frameShowTooltips[id],
                      active: frameAttention === id,
                      count:
                        id === 'all'
                          ? frameFacts.length
                          : frameFacts.filter((facts) => frameMatchesFilters(facts, id, frameType)).length,
                    })),
                  },
                  {
                    label: 'Type',
                    onSelect: (id) => setFrameType(id as FrameTypeFilter),
                    chips: (
                      [
                        ['all', 'All'],
                        ['action', 'Action'],
                        ['dialogue', 'Dialogue'],
                        ...(frameFacts.some((facts) => facts.kind === 'narration')
                          ? [['narration', 'Narration'] as [FrameTypeFilter, string]]
                          : []),
                      ] as Array<[FrameTypeFilter, string]>
                    ).map(([id, label]) => ({
                      id,
                      label,
                      tooltip: frameTypeTooltips[id],
                      active: frameType === id,
                      count:
                        id === 'all'
                          ? frameFacts.length
                          : frameFacts.filter((facts) => frameMatchesFilters(facts, frameAttention, id)).length,
                    })),
                  },
                ]}
              />

              <SceneBeatStage
                railLabel="Shot frames"
                items={visibleFrameSlots.map((slot) => {
                  const facts = frameFacts.find((entry) => entry.key === slot.key)
                  const rail = facts ? frameRailStatus(facts) : undefined
                  const markers: SceneBeatStageMarker[] = []
                  const kind = shotKindMarker(facts?.kind ?? slot.kind)
                  if (kind) markers.push(kind)
                  if (screeningPosterFrameKey === slot.key) markers.push('Poster')
                  const beatRow = slot.beatId
                    ? sceneBeats.find((b) => b.beatId === slot.beatId)
                    : undefined
                  const hasDistinctEnd =
                    slot.frameRole === 'end' ||
                    (!!beatRow?.storyboardEndImageUrl?.trim() &&
                      beatRow.storyboardEndImageUrl.trim() !== beatRow.storyboardImageUrl?.trim())
                  if (hasDistinctEnd) markers.push('End')
                  return {
                    id: slot.key,
                    beatNumber: slot.beatNumber,
                    markers,
                    status: rail?.status,
                    statusLabel: rail?.label,
                    ariaLabel: slot.label || `Shot ${slot.beatNumber ?? ''}`,
                  }
                })}
                selectedId={selectedFrameKey}
                onSelect={(id) => {
                  setSelectedFrameKey(id)
                  const slot = visibleFrameSlots.find((entry) => entry.key === id)
                  if (slot?.beatId) onSelectBeat?.(slot.beatId)
                }}
              >

                <div className="sticky top-2 flex w-full min-w-0 max-w-full flex-1 flex-col gap-2 self-start lg:min-w-[40rem]">
                  {previewSlot?.beatId && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-900/60 px-2.5 py-1.5">
                      <div className="flex items-center gap-1 rounded-md bg-slate-800/80 p-0.5 border border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => setActiveBeatFrameRole('start')}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                            activeBeatFrameRole === 'start'
                              ? 'bg-indigo-600/80 text-white shadow-sm'
                              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                          )}
                          title="Pre-Vis Shot Still illustrating the representative action of the shot"
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              previewSlot.ownImageUrl
                                ? 'bg-emerald-400'
                                : previewSlot.displayImageUrl
                                  ? 'bg-amber-400'
                                  : 'bg-slate-500'
                            )}
                          />
                          Shot Still
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveBeatFrameRole('action-start')}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                            activeBeatFrameRole === 'action-start'
                              ? 'bg-indigo-600/80 text-white shadow-sm'
                              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                          )}
                          title="Starting action frame (t = 0s) directed to illustrate the opening staging and pose of the shot with consistent lighting and location"
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              actionStartSlotForActiveBeat?.ownImageUrl ? 'bg-emerald-400' : 'bg-slate-500'
                            )}
                          />
                          Start Frame
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveBeatFrameRole('end')}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                            activeBeatFrameRole === 'end'
                              ? 'bg-indigo-600/80 text-white shadow-sm'
                              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                          )}
                          title="Ending action frame (t = T) directed to illustrate the concluding staging and pose of the shot with consistent lighting and location"
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              endSlotForActiveBeat?.ownImageUrl ? 'bg-emerald-400' : 'bg-slate-500'
                            )}
                          />
                          End Frame
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {prevBeatForContinuity && onUsePrevEndFrameAsStart && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] border-cyan-500/40 text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20"
                            title={
                              prevBeatForContinuity.hasOwnEndFrame
                                ? `Copy Shot ${prevBeatForContinuity.beatNumber}'s End Frame as this shot's Start Frame for seamless F2V continuity`
                                : `Copy Shot ${prevBeatForContinuity.beatNumber}'s frame as this shot's Start Frame for continuity`
                            }
                            onClick={() => {
                              setActiveBeatFrameRole('action-start')
                              void onUsePrevEndFrameAsStart(previewSlot.beatId!)
                            }}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Use Shot {prevBeatForContinuity.beatNumber}{' '}
                            {prevBeatForContinuity.hasOwnEndFrame ? 'End' : 'Frame'} as Start
                          </Button>
                        )}
                        {(onGenerateBeatFrames || onGenerateBeatStartFrame || onGenerateBeatEndFrame) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              isExpressRunning ||
                              generatingDialogueFrames.has(
                                `${sceneIndex}-beat-${previewSlot.beatId}-frames`
                              ) ||
                              generatingDialogueFrames.has(
                                `${sceneIndex}-beat-${previewSlot.beatId}-start`
                              ) ||
                              generatingDialogueFrames.has(
                                `${sceneIndex}-beat-${previewSlot.beatId}-end`
                              )
                            }
                            className="h-7 text-[11px] border-indigo-500/50 text-indigo-200 bg-indigo-500/15 hover:bg-indigo-500/25"
                            title="Expertly generate the Start Frame (t = 0s starting action) and End Frame (t = T ending action) with consistent lighting and location for Frame-to-Video (F2V)"
                            onClick={() => {
                              if (blockedByReferences()) return
                              const bId = previewSlot.beatId!
                              if (onGenerateBeatFrames) {
                                if (activeBeatFrameRole === 'start') {
                                  setActiveBeatFrameRole('action-start')
                                }
                                void slotHandlers.onGenerateBeatFrames?.(bId)
                              } else if (onGenerateBeatEndFrame) {
                                setActiveBeatFrameRole('end')
                                void slotHandlers.onGenerateBeatEndFrame?.(bId)
                              }
                            }}
                          >
                            {generatingDialogueFrames.has(
                              `${sceneIndex}-beat-${previewSlot.beatId}-frames`
                            ) ||
                            generatingDialogueFrames.has(
                              `${sceneIndex}-beat-${previewSlot.beatId}-start`
                            ) ||
                            generatingDialogueFrames.has(
                              `${sceneIndex}-beat-${previewSlot.beatId}-end`
                            ) ? (
                              <>
                                <Loader className="w-3 h-3 mr-1 animate-spin" />
                                Generating Frames…
                              </>
                            ) : actionStartSlotForActiveBeat?.ownImageUrl &&
                              endSlotForActiveBeat?.ownImageUrl ? (
                              <>
                                <Sparkles className="w-3 h-3 mr-1" />
                                Regen Frames
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 mr-1" />
                                Generate Frames
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="w-full rounded-lg overflow-hidden bg-gray-800/50 border border-slate-700/40">
                    <div className="relative overflow-hidden">
                      {activeDisplaySlot ? (
                        <SceneImageFrame
                          {...buildStoryboardSlotFrameProps(
                            activeDisplaySlot,
                            slotHandlers,
                            slotPromptChanged(activeDisplaySlot)
                          )}
                          label=""
                          imagePrompt={undefined}
                          showControls
                          controlsVariant="comfortable"
                          showBorder={false}
                          expandable
                          className="w-full"
                          directorTitle={
                            activeDisplaySlot.frameRole === 'action-start'
                              ? 'Direct Start Frame'
                              : activeDisplaySlot.frameRole === 'end'
                                ? 'Direct End Frame'
                                : 'Direct Shot'
                          }
                        />
                      ) : (
                        <div className="aspect-video flex flex-col items-center justify-center">
                          <Camera className="w-8 h-8 text-gray-600 mb-2" />
                          <span className="text-xs text-gray-500">No pre-vis frames</span>
                        </div>
                      )}
                      {isGeneratingScene && !activeDisplaySlot && (
                        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10">
                          <Loader className="w-10 h-10 animate-spin text-blue-400 mb-2" />
                          <span className="text-sm text-white">Generating...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {activeDisplaySlot && (
                    <div className="px-2 pb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        {activeDisplaySlot.beatNumber != null && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/40 font-medium tabular-nums">
                            Shot {activeDisplaySlot.beatNumber}
                          </span>
                        )}
                        {activeDisplaySlot.frameRole === 'action-start' && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                            Start Frame
                          </span>
                        )}
                        {activeDisplaySlot.frameRole === 'end' && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                            End Frame
                          </span>
                        )}
                        {activeDisplaySlot.beatRole && (
                          <span
                            className={cn(
                              'shrink-0 text-[10px] px-1.5 py-0.5 rounded',
                              activeDisplaySlot.beatRole === 'title_reveal'
                                ? 'bg-violet-500/20 text-violet-300'
                                : 'bg-slate-600/40 text-slate-300'
                            )}
                          >
                            {formatBeatRoleLabel(activeDisplaySlot.beatRole)}
                          </span>
                        )}
                        <p className="text-sm font-semibold text-slate-200 truncate flex-1 min-w-0" title={activeDisplaySlot.label}>
                          {activeDisplaySlot.label}
                        </p>
                        {previewStillPrompt && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] shrink-0 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
                            title="Copy still prompt for Google AI Studio"
                            onClick={() => handleCopyStillPrompt(previewStillPrompt, activeDisplaySlot.key)}
                          >
                            {copiedStillSlotKey === activeDisplaySlot.key ? (
                              <>
                                <Check className="w-3 h-3 mr-1 text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 mr-1" />
                                Copy prompt
                              </>
                            )}
                          </Button>
                        )}
                        {activeDisplaySlot.displayImageUrl && !activeDisplaySlot.isMissing && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] shrink-0 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
                            title="Download still image"
                            onClick={() => {
                              void saveImageFile({
                                url: activeDisplaySlot.displayImageUrl!,
                                sceneNumber,
                                beatNumber: activeDisplaySlot.beatNumber,
                                label: activeDisplaySlot.label || 'still',
                              })
                                .then((saved) => {
                                  if (saved) toast.success('Image saved')
                                })
                                .catch(() => toast.error('Failed to download image'))
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        )}
                        {onSetScreeningPoster &&
                          previewSlot &&
                          previewSlot.displayImageUrl &&
                          !previewSlot.isMissing &&
                          activeDisplaySlot.frameRole !== 'end' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                'h-7 text-[10px] shrink-0',
                                screeningPosterFrameKey === previewSlot.key
                                  ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10'
                                  : 'border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                              )}
                              onClick={() =>
                                onSetScreeningPoster(
                                  screeningPosterFrameKey === previewSlot.key ? null : previewSlot
                                )
                              }
                            >
                              <MonitorPlay className="w-3 h-3 mr-0.5" />
                              {screeningPosterFrameKey === previewSlot.key
                                ? 'Screening Room poster'
                                : 'Set as poster'}
                            </Button>
                          )}
                        {onSaveBeatKenBurns &&
                          previewSlot?.beatId &&
                          previewSlot.displayImageUrl &&
                          !previewSlot.isMissing &&
                          activeDisplaySlot.frameRole !== 'end' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                'h-7 text-[10px] shrink-0',
                                previewBeatKenBurns?.enabled
                                  ? 'border-cyan-500/50 text-cyan-300 bg-cyan-500/10'
                                  : 'border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                              )}
                              onClick={() => setMotionEditorOpen(true)}
                            >
                              <Move className="w-3 h-3 mr-0.5" />
                              {previewBeatKenBurns?.enabled ? 'Motion on' : 'Motion'}
                            </Button>
                          )}
                      </div>
                      {previewStillPrompt && (
                        <p
                          className="mt-1.5 text-xs text-slate-400 leading-relaxed cursor-pointer"
                          title={previewStillPrompt}
                          onClick={() => handleCopyStillPrompt(previewStillPrompt, activeDisplaySlot.key)}
                        >
                          {previewStillPrompt}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </SceneBeatStage>
            </>
          )}
        </div>
      )}

      {onExpressSceneGenerate && (
        <ExpressSceneConfirmDialog
          open={expressSceneDialogOpen}
          onOpenChange={setExpressSceneDialogOpen}
          scene={scene}
          isRunning={isExpressRunning}
          missingReferences={missingSceneReferences}
          defaultQuality={frameGenerationQuality}
          defaultGenerationMode={frameGenerationMode}
          onConfirm={(options) => {
            setExpressSceneDialogOpen(false)
            void onExpressSceneGenerate(options)
          }}
        />
      )}

      <ImageEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        imageUrl={editingFrame?.imageUrl ?? ''}
        imageType="scene"
        aspectRatio="16:9"
        objectReferences={objectReferences}
        characterReferences={
          allEditCharacterReferences.length > 0
            ? allEditCharacterReferences
            : editCharacterReferences
        }
        defaultSelectedCharRefKeys={defaultEditCharRefKeys}
        locationStills={editLocationStills}
        defaultSelectedLocationIds={defaultEditLocationIds}
        defaultSelectedPropIds={defaultEditPropIds}
        onSave={(newImageUrl) => {
          if (!editingFrame) return
          if (editingFrame.kind === 'establishing' && onSaveEditedScene) {
            onSaveEditedScene(newImageUrl)
          } else if (editingFrame.kind === 'beat' && onSaveEditedBeatFrame) {
            onSaveEditedBeatFrame(editingFrame.beatId, newImageUrl, editingFrame.frameRole)
          } else if (editingFrame.kind === 'dialogue' && onSaveEditedDialogueFrame) {
            onSaveEditedDialogueFrame(editingFrame.dialogueIndex, newImageUrl)
          } else if (editingFrame.kind === 'custom' && onSaveEditedCustomFrame) {
            onSaveEditedCustomFrame(editingFrame.customFrameId, newImageUrl)
          }
          setEditModalOpen(false)
          setEditingFrame(null)
        }}
        title="Edit Frame"
      />

      {onSaveBeatKenBurns && previewSlot?.beatId && previewSlot.displayImageUrl && (
        <FrameMotionEditor
          open={motionEditorOpen}
          onOpenChange={setMotionEditorOpen}
          imageUrl={previewSlot.displayImageUrl}
          beatLabel={previewSlot.label}
          value={previewBeatKenBurns}
          onSave={(settings) => onSaveBeatKenBurns(previewSlot.beatId!, settings)}
        />
      )}
    </div>
    </TooltipProvider>
  )
}
