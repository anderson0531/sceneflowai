'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Loader,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { ImageEditModal } from './ImageEditModal'
import {
  ExpressSceneConfirmDialog,
  type ExpressSceneConfirmOptions,
} from './ExpressSceneConfirmDialog'
import { SceneImageFrame, type SceneImageFrameProps } from './SceneImageFrame'
import type { ExpressPhaseStatus, ExpressSceneStatus } from './SceneGallery'
import {
  countStoryboardFrameStats,
  enumerateStoryboardFrameSlots,
  type StoryboardFrameSlot,
} from '@/lib/storyboard/types'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { runSceneExpressPreflight } from '@/lib/sceneGeneration/sceneExpressPreflight'
import { isPreVisStale } from '@/lib/storyboard/preVisSync'
import { countDraftStoryboardFrames } from '@/lib/storyboard/storyboardQuality'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type EditingFrame =
  | { kind: 'establishing'; sceneIndex: number; imageUrl: string }
  | { kind: 'beat'; sceneIndex: number; beatId: string; imageUrl: string }
  | { kind: 'dialogue'; sceneIndex: number; dialogueIndex: number; imageUrl: string }
  | { kind: 'custom'; sceneIndex: number; customFrameId: string; imageUrl: string }

export interface SceneStoryboardFrameViewerProps {
  scene: any
  sceneIndex: number
  sceneNumber: number
  prompt?: string
  characters?: any[]
  objectReferences?: Array<{ id: string; name: string; imageUrl: string; description?: string }>
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
  onGenerateBeatEndFrame?: (beatId: string) => Promise<void>
  onDirectFrame?: (slot: StoryboardFrameSlot) => void
  onUploadDialogueFrame?: (dialogueIndex: number, file: File) => void
  onUploadBeatFrame?: (beatId: string, file: File) => void
  onUploadScene?: (file: File) => void
  onSaveEditedScene?: (imageUrl: string) => void
  onSaveEditedBeatFrame?: (beatId: string, imageUrl: string) => void
  onSaveEditedDialogueFrame?: (dialogueIndex: number, imageUrl: string) => void
  onSaveEditedCustomFrame?: (customFrameId: string, imageUrl: string) => void
  onExpressSceneGenerate?: (options?: ExpressSceneConfirmOptions) => void | Promise<void>
  onFinalizeScene?: () => void | Promise<void>
  onSyncPreVisToScript?: () => void | Promise<void>
  onAddStoryboardFrame?: () => void | Promise<void>
  onDeleteStoryboardFrame?: (frameId: string) => void | Promise<void>
  onGenerateCustomFrame?: (frameId: string) => Promise<void>
  onUploadCustomFrame?: (frameId: string, file: File) => void
}

interface StoryboardSlotHandlers {
  sceneIndex: number
  sceneNumber: number
  prompt: string
  isGenerating: boolean
  generatingDialogueFrames: Set<string>
  generatingCustomFrames: Set<string>
  onGenerate: (prompt: string) => Promise<void>
  onGenerateDialogueFrame?: (dialogueIndex: number) => Promise<void>
  onGenerateBeatFrame?: (beatId: string) => Promise<void>
  onGenerateBeatEndFrame?: (beatId: string) => Promise<void>
  onDirectFrame?: (slot: StoryboardFrameSlot) => void
  onUploadDialogueFrame?: (dialogueIndex: number, file: File) => void
  onUploadBeatFrame?: (beatId: string, file: File) => void
  onEditFrame?: (frame: EditingFrame) => void
  onUpload?: (file: File) => void
  onGenerateCustomFrame?: (frameId: string) => Promise<void>
  onUploadCustomFrame?: (frameId: string, file: File) => void
  onDeleteStoryboardFrame?: (frameId: string) => void | Promise<void>
}

function buildStoryboardSlotFrameProps(
  slot: StoryboardFrameSlot,
  handlers: StoryboardSlotHandlers
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
    onGenerate,
    onGenerateDialogueFrame,
    onGenerateBeatFrame,
    onGenerateBeatEndFrame,
    onDirectFrame,
    onUploadDialogueFrame,
    onUploadBeatFrame,
    onEditFrame,
    onUpload,
    onGenerateCustomFrame,
    onUploadCustomFrame,
    onDeleteStoryboardFrame,
  } = handlers

  if (slot.kind === 'custom') {
    const genKey = `custom-${sceneIndex}-${slot.customFrameId}`
    return {
      sceneIdx: sceneIndex,
      sceneNumber,
      imageUrl: slot.displayImageUrl,
      isPlaceholder: slot.isPlaceholder,
      isGenerating: generatingCustomFrames.has(genKey),
      label: slot.label,
      imagePrompt: slot.storyboardImagePrompt,
      onGenerate: () => void onGenerateCustomFrame?.(slot.customFrameId!),
      onDirect: onDirectFrame ? () => onDirectFrame(slot) : undefined,
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
    }
  }

  const dialogueIdx = slot.dialogueIndex
  const beatId = slot.beatId
  const isEndBeatSlot = slot.frameRole === 'end' && !!beatId
  const useBeatFrame = !!beatId && (slot.kind === 'narration' || slot.kind === 'action' || isEndBeatSlot)
  const isGeneratingBeatFrame =
    useBeatFrame &&
    generatingDialogueFrames.has(
      isEndBeatSlot ? `${sceneIndex}-beat-end-${beatId}` : `${sceneIndex}-beat-${beatId}`
    )
  const isGeneratingFrame =
    !useBeatFrame &&
    typeof dialogueIdx === 'number' &&
    generatingDialogueFrames.has(`${sceneIndex}-${dialogueIdx}`)
  const isLegacyEstablishingOnly =
    !useBeatFrame && slot.kind === 'action' && typeof dialogueIdx !== 'number' && !beatId

  return {
    sceneIdx: sceneIndex,
    sceneNumber,
    imageUrl: slot.isMissing ? undefined : slot.displayImageUrl,
    isPlaceholder: slot.isPlaceholder,
    isGenerating: isLegacyEstablishingOnly
      ? isGenerating
      : useBeatFrame
        ? isGeneratingBeatFrame
        : isGeneratingFrame,
    label: isEndBeatSlot && slot.isMissing ? 'Add end frame' : slot.label,
    imageTier: slot.ownImageUrl ? slot.imageTier : undefined,
    beatRole: slot.beatRole,
    imagePrompt: slot.storyboardImagePrompt,
    onGenerate: () => {
      if (isEndBeatSlot && beatId) {
        void onGenerateBeatEndFrame?.(beatId)
      } else if (useBeatFrame && beatId) {
        void onGenerateBeatFrame?.(beatId)
      } else if (isLegacyEstablishingOnly) {
        void onGenerate(prompt)
      } else if (typeof dialogueIdx === 'number') {
        void onGenerateDialogueFrame?.(dialogueIdx)
      }
    },
    onDirect: onDirectFrame ? () => onDirectFrame(slot) : undefined,
    onUpload: (file) => {
      if (useBeatFrame && onUploadBeatFrame && beatId) {
        onUploadBeatFrame(beatId, file)
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
              onEditFrame({ kind: 'beat', sceneIndex, beatId, imageUrl: url })
            } else if (isLegacyEstablishingOnly && onEditFrame) {
              onEditFrame({ kind: 'establishing', sceneIndex, imageUrl: url })
            } else if (typeof dialogueIdx === 'number' && onEditFrame) {
              onEditFrame({ kind: 'dialogue', sceneIndex, dialogueIndex: dialogueIdx, imageUrl: url })
            }
          }
        : undefined,
  }
}

const THUMBNAIL_DRAG_THRESHOLD_PX = 5

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
  onGenerateBeatEndFrame,
  onDirectFrame,
  onUploadDialogueFrame,
  onUploadBeatFrame,
  onUploadScene,
  onSaveEditedScene,
  onSaveEditedBeatFrame,
  onSaveEditedDialogueFrame,
  onSaveEditedCustomFrame,
  onExpressSceneGenerate,
  onFinalizeScene,
  onSyncPreVisToScript,
  onAddStoryboardFrame,
  onDeleteStoryboardFrame,
  onGenerateCustomFrame,
  onUploadCustomFrame,
}: SceneStoryboardFrameViewerProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedFrameKey, setSelectedFrameKey] = useState<string | null>(null)
  const [generatingDialogueFrames, setGeneratingDialogueFrames] = useState<Set<string>>(new Set())
  const [generatingCustomFrames, setGeneratingCustomFrames] = useState<Set<string>>(new Set())
  const [expressSceneDialogOpen, setExpressSceneDialogOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingFrame, setEditingFrame] = useState<EditingFrame | null>(null)
  const thumbnailScrollRef = useRef<HTMLDivElement>(null)
  const thumbnailDragRef = useRef<{
    pointerId: number
    startY: number
    startScrollTop: number
    isDragging: boolean
  } | null>(null)
  const thumbnailDidDragRef = useRef(false)

  const frameSlots = useMemo(() => enumerateStoryboardFrameSlots(scene), [scene])
  const sceneBeats = useMemo(() => getSceneBeats(scene), [scene])
  const frameStats = useMemo(() => countStoryboardFrameStats(scene), [scene])
  const preVisStale = useMemo(() => isPreVisStale(scene), [scene])

  const sceneKey = scene?.sceneId || scene?.id || `scene-${sceneIndex}`

  useEffect(() => {
    setSelectedFrameKey(frameSlots[0]?.key ?? null)
  }, [sceneKey, frameSlots])

  const previewSlot = useMemo(() => {
    if (frameSlots.length === 0) return null
    return frameSlots.find((slot) => slot.key === selectedFrameKey) ?? frameSlots[0]
  }, [frameSlots, selectedFrameKey])

  const sceneExpressPreflight = useMemo(
    () =>
      runSceneExpressPreflight({
        scene,
        sceneIndex,
        characters,
        narrationVoice,
        language: selectedLanguage,
      }),
    [scene, sceneIndex, characters, narrationVoice, selectedLanguage]
  )

  const sceneExpressDisabled =
    isExpressRunning || (!expressGateBlocked && !sceneExpressPreflight.ok)

  const sceneExpressTooltip = !sceneExpressPreflight.ok
    ? sceneExpressPreflight.errors[0]
    : sceneExpressPreflight.nothingToDo
      ? 'Scene complete — choose frames to regenerate'
      : '~60s — Vertex AI — Direction (if needed) → Audio + beats in parallel'

  const openExpressSceneDialog = useCallback(() => {
    if (expressGateBlocked && onExpressGateBlocked) {
      onExpressGateBlocked()
      return
    }
    if (!sceneExpressPreflight.ok) {
      toast.error(sceneExpressPreflight.errors[0])
      return
    }
    setExpressSceneDialogOpen(true)
  }, [expressGateBlocked, onExpressGateBlocked, sceneExpressPreflight])

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

  const handleThumbnailPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = thumbnailScrollRef.current
    if (!el) return

    const state = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startScrollTop: el.scrollTop,
      isDragging: false,
    }
    thumbnailDragRef.current = state
    thumbnailDidDragRef.current = false

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== state.pointerId || !thumbnailScrollRef.current) return
      const deltaY = ev.clientY - state.startY
      if (!state.isDragging && Math.abs(deltaY) < THUMBNAIL_DRAG_THRESHOLD_PX) return
      if (!state.isDragging) {
        state.isDragging = true
        thumbnailDidDragRef.current = true
        document.body.style.userSelect = 'none'
        thumbnailScrollRef.current.style.cursor = 'grabbing'
      }
      ev.preventDefault()
      thumbnailScrollRef.current.scrollTop = state.startScrollTop - deltaY
    }

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== state.pointerId) return
      thumbnailDragRef.current = null
      document.body.style.userSelect = ''
      if (thumbnailScrollRef.current) {
        thumbnailScrollRef.current.style.cursor = ''
      }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [])

  const handleThumbnailClickCapture = useCallback((e: React.MouseEvent) => {
    if (thumbnailDidDragRef.current) {
      e.preventDefault()
      e.stopPropagation()
      thumbnailDidDragRef.current = false
    }
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

  const slotHandlers = useMemo(
    (): StoryboardSlotHandlers => ({
      sceneIndex,
      sceneNumber,
      prompt,
      isGenerating: isGeneratingScene,
      generatingDialogueFrames,
      generatingCustomFrames,
      onGenerate: async (p) => {
        if (onGenerateScene) await onGenerateScene(p)
      },
      onGenerateDialogueFrame: onGenerateDialogueFrame
        ? async (dialogueIdx) => {
            const key = `${sceneIndex}-${dialogueIdx}`
            await wrapGenerate(key, () => onGenerateDialogueFrame(dialogueIdx))
          }
        : undefined,
      onGenerateBeatFrame: onGenerateBeatFrame
        ? async (beatId) => {
            const key = `${sceneIndex}-beat-${beatId}`
            await wrapGenerate(key, () => onGenerateBeatFrame(beatId))
          }
        : undefined,
      onGenerateBeatEndFrame: onGenerateBeatEndFrame
        ? async (beatId) => {
            const key = `${sceneIndex}-beat-end-${beatId}`
            await wrapGenerate(key, () => onGenerateBeatEndFrame(beatId))
          }
        : undefined,
      onDirectFrame,
      onUploadDialogueFrame,
      onUploadBeatFrame,
      onEditFrame: handleEditFrame,
      onUpload: onUploadScene,
      onGenerateCustomFrame: onGenerateCustomFrame
        ? async (frameId) => {
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
    }),
    [
      sceneIndex,
      sceneNumber,
      prompt,
      isGeneratingScene,
      generatingDialogueFrames,
      generatingCustomFrames,
      onGenerateScene,
      onGenerateDialogueFrame,
      onGenerateBeatFrame,
      onGenerateBeatEndFrame,
      onDirectFrame,
      onUploadDialogueFrame,
      onUploadBeatFrame,
      handleEditFrame,
      onUploadScene,
      onGenerateCustomFrame,
      onUploadCustomFrame,
      onDeleteStoryboardFrame,
      wrapGenerate,
    ]
  )

  if (frameSlots.length === 0 && sceneBeats.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
    <div className="bg-slate-900/40 border border-slate-700/50 rounded-lg overflow-hidden">
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
          <span className="text-sm font-semibold text-gray-200">Pre-Vis Frames</span>
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

      {!collapsed && (
        <div className="p-4 space-y-3">
          {frameSlots.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              <Camera className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p>No pre-vis frames yet.</p>
              {onExpressSceneGenerate && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 border-amber-500/40 text-amber-300"
                  disabled={sceneExpressDisabled}
                  onClick={openExpressSceneDialog}
                >
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                  Express Scene
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                  className={cn(
                    'text-[10px]',
                    frameStats.missing > 0
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
                          {sceneExpressRunning ? `Express ${expressElapsedSec}s` : 'Express'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">{sceneExpressTooltip}</TooltipContent>
                    </Tooltip>
                  )}
                  {onFinalizeScene && countDraftStoryboardFrames(scene) > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                      disabled={isExpressRunning}
                      onClick={() => void onFinalizeScene()}
                    >
                      <Sparkles className="w-3 h-3 mr-0.5" />
                      Finalize
                    </Button>
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

              <div className="relative">
                <div
                  ref={thumbnailScrollRef}
                  className="absolute left-0 top-0 bottom-0 w-[30%] grid grid-cols-2 content-start gap-2 overflow-y-auto overscroll-contain pr-1 cursor-grab active:cursor-grabbing"
                  onPointerDown={handleThumbnailPointerDown}
                  onClickCapture={handleThumbnailClickCapture}
                >
                  {frameSlots.map((slot) => (
                    <div key={slot.key} className="w-full">
                      <SceneImageFrame
                        {...buildStoryboardSlotFrameProps(slot, slotHandlers)}
                        showControls={false}
                        compact
                        showBorder
                        isSelected={selectedFrameKey === slot.key}
                        onSelect={() => setSelectedFrameKey(slot.key)}
                      />
                    </div>
                  ))}
                </div>

                <div className="ml-[calc(30%+0.75rem)] flex flex-col gap-2 min-w-0">
                  <div className="rounded-lg overflow-hidden bg-gray-800/50 border border-slate-700/40">
                    <div className="relative overflow-hidden">
                      {previewSlot ? (
                        <SceneImageFrame
                          {...buildStoryboardSlotFrameProps(previewSlot, slotHandlers)}
                          label=""
                          imagePrompt={undefined}
                          showControls
                          controlsVariant="comfortable"
                          showBorder={false}
                          expandable
                        />
                      ) : (
                        <div className="aspect-video flex flex-col items-center justify-center">
                          <Camera className="w-8 h-8 text-gray-600 mb-2" />
                          <span className="text-xs text-gray-500">No pre-vis frames</span>
                        </div>
                      )}
                      {isGeneratingScene && !previewSlot && (
                        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10">
                          <Loader className="w-10 h-10 animate-spin text-blue-400 mb-2" />
                          <span className="text-sm text-white">Generating...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {previewSlot && (
                    <div className="px-2 pb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {previewSlot.beatRole && (
                          <span
                            className={cn(
                              'shrink-0 text-[10px] px-1.5 py-0.5 rounded',
                              previewSlot.beatRole === 'title_reveal'
                                ? 'bg-violet-500/20 text-violet-300'
                                : 'bg-slate-600/40 text-slate-300'
                            )}
                          >
                            {formatBeatRoleLabel(previewSlot.beatRole)}
                          </span>
                        )}
                        <p className="text-sm font-semibold text-slate-200 truncate" title={previewSlot.label}>
                          {previewSlot.label}
                        </p>
                      </div>
                      {previewSlot.storyboardImagePrompt?.trim() && (
                        <p
                          className="mt-1.5 text-xs text-slate-400 leading-relaxed cursor-help"
                          title={previewSlot.storyboardImagePrompt}
                          onClick={() => {
                            void navigator.clipboard
                              .writeText(previewSlot.storyboardImagePrompt!.trim())
                              .then(() => {
                                toast.success('Prompt copied')
                              })
                          }}
                        >
                          {previewSlot.storyboardImagePrompt.trim()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
        subjectReference={(() => {
          if (!editingFrame) return undefined
          if (editingFrame.kind === 'dialogue') {
            const line = scene.dialogue?.[editingFrame.dialogueIndex]
            const charName = line?.character
            const char = characters.find((c) => c.name === charName)
            if (char?.referenceImage) {
              return {
                imageUrl: char.referenceImage,
                description: char.appearanceDescription || char.description || charName || 'Character',
              }
            }
          }
          if (editingFrame.kind === 'beat') {
            const beat = scene.beats?.find((b: { beatId?: string }) => b.beatId === editingFrame.beatId)
            const charName = beat?.character
            const char = characters.find((c) => c.name === charName)
            if (char?.referenceImage) {
              return {
                imageUrl: char.referenceImage,
                description: char.appearanceDescription || char.description || charName || 'Character',
              }
            }
          }
          return undefined
        })()}
        onSave={(newImageUrl) => {
          if (!editingFrame) return
          if (editingFrame.kind === 'establishing' && onSaveEditedScene) {
            onSaveEditedScene(newImageUrl)
          } else if (editingFrame.kind === 'beat' && onSaveEditedBeatFrame) {
            onSaveEditedBeatFrame(editingFrame.beatId, newImageUrl)
          } else if (editingFrame.kind === 'dialogue' && onSaveEditedDialogueFrame) {
            onSaveEditedDialogueFrame(editingFrame.dialogueIndex, newImageUrl)
          } else if (editingFrame.kind === 'custom' && onSaveEditedCustomFrame) {
            onSaveEditedCustomFrame(editingFrame.customFrameId, newImageUrl)
          }
          setEditModalOpen(false)
          setEditingFrame(null)
        }}
        title={
          editingFrame
            ? editingFrame.kind === 'beat'
              ? `Edit beat — Scene ${sceneNumber}`
              : editingFrame.kind === 'dialogue'
                ? `Edit dialogue frame — Scene ${sceneNumber}`
                : editingFrame.kind === 'custom'
                  ? `Edit custom frame — Scene ${sceneNumber}`
                  : `Edit Scene ${sceneNumber}`
            : 'Edit frame'
        }
      />
    </div>
    </TooltipProvider>
  )
}
