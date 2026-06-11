/**
 * SceneGallery - Visual storyboard display of scenes with images
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 * @see /CONTRIBUTING.md for development guidelines
 * 
 * RECEIVES: scenes from parent via props (sourced from script.script.scenes)
 * Do NOT maintain separate scene state - parent component is source of truth.
 * 
 * When generating/uploading images, the parent (Vision page) updates
 * script.script.scenes, which flows down to this component via props.
 */
'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Camera, Grid, List, RefreshCw, Edit, Loader, Printer, Clapperboard, Sparkles, Eye, EyeOff, X, Upload, Download, FolderPlus, ImagePlus, PenSquare, Wand2, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, Check, Globe, Users, Package, AlertCircle, CheckCircle2, MapPin, FileText, ChevronDown, ChevronUp, GripVertical, Zap, Settings2, Tag, Plus, Share2 } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { AudioGalleryPlayer } from './AudioGalleryPlayer'
import { Button } from '@/components/ui/Button'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useProcessWithOverlay } from '@/hooks/useProcessWithOverlay'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { ReportType, StoryboardData } from '@/lib/types/reports'
import type { SceneProductionData, SceneProductionReferences } from './scene-production/types'
import type { GenerationType } from './scene-production/SegmentStudio'
import type { VideoGenerationMethod } from './scene-production/SegmentPromptBuilder'
import { cn } from '@/lib/utils'
import { formatSceneHeading, extractLocation } from '@/lib/script/formatSceneHeading'
import { getStoryboardBeatProgress } from '@/lib/production/sceneProgress'
import { ImageEditModal } from './ImageEditModal'
import { SceneImageFrame } from './SceneImageFrame'
import {
  ExpressConfirmDialog,
  type ExpressConfirmOptions,
} from './ExpressConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { useStore } from '@/store/useStore'
import {
  flattenSceneToStoryboardFrames,
  countStoryboardFrameStats,
  enumerateStoryboardFrameSlots,
  countStoryboardFramesNeedingGeneration,
  countPlayablePreVisScenes,
  sceneHasPlayablePreVisAudio,
} from '@/lib/storyboard/types'
import { runSceneExpressPreflight } from '@/lib/sceneGeneration/sceneExpressPreflight'
import { isPreVisStale } from '@/lib/storyboard/preVisSync'
import { countDraftStoryboardFrames } from '@/lib/storyboard/storyboardQuality'
import { ProductionReadyBanner } from './production/ProductionReadyBanner'
import type { ProductionReadyChecklist } from '@/lib/production/productionReadinessGate'

export type ExpressPhase = 'direction' | 'audio' | 'image'
export type ExpressPhaseStatus = 'pending' | 'running' | 'done' | 'error'

export interface ExpressSceneStatus {
  direction: ExpressPhaseStatus
  audio: ExpressPhaseStatus
  image: ExpressPhaseStatus
  /** Optional human-readable error from the most recent failed phase. */
  error?: string
}

export type ExpressSceneStatusMap = Record<number, ExpressSceneStatus>

interface SceneGalleryProps {
  scenes: any[]
  characters: any[]
  projectTitle?: string
  onRegenerateScene: (sceneIndex: number) => void | Promise<void>
  onOpenPromptBuilder?: (sceneIndex: number) => void
  onGenerateScene: (sceneIndex: number, prompt: string) => void | Promise<void>
  /** Generate a speaker-focused storyboard frame for a dialogue line. */
  onGenerateDialogueFrame?: (sceneIndex: number, dialogueIndex: number) => void | Promise<void>
  /** Generate a beat-indexed storyboard frame (action or narration beats). */
  onGenerateBeatFrame?: (sceneIndex: number, beatId: string) => void | Promise<void>
  onUploadDialogueFrame?: (sceneIndex: number, dialogueIndex: number, file: File) => void
  onUploadBeatFrame?: (sceneIndex: number, beatId: string, file: File) => void
  onSaveEditedBeatFrame?: (sceneIndex: number, beatId: string, newImageUrl: string) => void
  onSaveEditedDialogueFrame?: (sceneIndex: number, dialogueIndex: number, newImageUrl: string) => void
  onAddStoryboardFrame?: (sceneIndex: number) => void | Promise<void>
  onDeleteStoryboardFrame?: (sceneIndex: number, frameId: string) => void | Promise<void>
  onGenerateCustomFrame?: (sceneIndex: number, frameId: string) => void | Promise<void>
  onUploadCustomFrame?: (sceneIndex: number, frameId: string, file: File) => void
  onUploadScene: (sceneIndex: number, file: File) => void
  onDownloadScene?: (sceneIndex: number) => void
  onAddToLibrary?: (sceneIndex: number) => void
  onAddToSceneLibrary?: (sceneIndex: number, imageUrl: string) => void
  onClose?: () => void
  sceneProductionState: Record<string, SceneProductionData>
  productionReferences: SceneProductionReferences
  onInitializeProduction: (sceneId: string, options: { targetDuration: number }) => Promise<void>
  onSegmentPromptChange: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentDialogueAssignmentChange?: (sceneId: string, segmentId: string, dialogueLineIds: string[]) => void
  onSegmentActionChange?: (sceneId: string, segmentId: string, action: string) => void
  onSegmentGenerate: (sceneId: string, segmentId: string, mode: GenerationType, options?: {
    startFrameUrl?: string
    endFrameUrl?: string
    referenceImages?: Array<{ url: string; type: 'style' | 'character' }>
    generationMethod?: VideoGenerationMethod
    prompt?: string
    negativePrompt?: string
    duration?: number
    aspectRatio?: '16:9' | '9:16'
    resolution?: '720p' | '1080p'
    sourceVideoUrl?: string
    guidePrompt?: string
  }) => Promise<void>
  onSegmentUpload: (sceneId: string, segmentId: string, file: File) => Promise<void>
  /** Persist keyframe after AI edit (gallery production panel) */
  onEditSegmentFrame?: (
    sceneId: string,
    segmentId: string,
    frameType: 'start' | 'end',
    newFrameUrl: string
  ) => void
  onOpenAssets?: () => void
  onOpenPreview?: () => void
  /** Object/prop references from the reference library for consistent image generation */
  objectReferences?: Array<{ id: string; name: string; imageUrl: string; description?: string }>
  /** Callback to open Generate Audio dialog */
  onOpenGenerateAudio?: () => void
  /** Whether audio generation is currently in progress */
  isGeneratingAudio?: boolean
  /** Callback when an edited image is saved */
  onSaveEditedScene?: (sceneIndex: number, newImageUrl: string) => void
  /** Callback to reorder scenes (drag and drop) */
  onReorderScenes?: (startIndex: number, endIndex: number) => void
  /** Called when batch generation starts/ends — parent uses this to suppress per-scene overlays */
  onBatchGenerateStart?: () => void
  onBatchGenerateEnd?: () => void
  onUpdateSceneAudio?: (sceneIndex: number) => Promise<void>
  /**
   * Run the Storyboard Express pipeline (Direction → Audio → Image per scene,
   * up to 3 scenes in parallel). The parent is responsible for kicking off the
   * SSE request and updating script state from incoming events.
   */
  onExpressGenerate?: (options: ExpressConfirmOptions) => Promise<void> | void
  /** Upgrade draft storyboard frames to final quality (all scenes or one scene). */
  onFinalizeStoryboard?: (sceneIndex?: number, language?: string) => Promise<void> | void
  /** Per-scene fast Express (mode=scene). */
  onExpressSceneGenerate?: (
    sceneIndex: number,
    language: string,
    options?: { regenerate?: boolean }
  ) => Promise<void> | void
  /** Sync pre-vis frame prompts to current script before regenerating. */
  onSyncPreVisToScript?: (sceneIndex: number) => Promise<void> | void
  narrationVoice?: unknown
  productionReadyChecklist?: ProductionReadyChecklist
  /** Whether an Express run is currently in flight. */
  isExpressRunning?: boolean
  /** Per-scene phase progress map driven by SSE events. */
  expressStatus?: ExpressSceneStatusMap
  /** When true, Express is blocked until Pre-Vis ready (voices + references). */
  expressGateBlocked?: boolean
  expressGateReasons?: string[]
  /** Open Reference Library sidebar. */
  onOpenReferences?: () => void
  /** Called after successful Express to open storyboard player / share flow. */
  onExpressComplete?: () => void
  /** Art style locked from Blueprint — Express uses this instead of a picker. */
  lockedArtStyle?: string
}

const buildSceneKey = (scene: any, index: number) => scene.sceneId || scene.id || `scene-${index}`

export function SceneGallery({
  scenes,
  characters,
  projectTitle,
  onRegenerateScene,
  onOpenPromptBuilder,
  onGenerateScene,
  onGenerateDialogueFrame,
  onGenerateBeatFrame,
  onUploadDialogueFrame,
  onUploadBeatFrame,
  onSaveEditedBeatFrame,
  onSaveEditedDialogueFrame,
  onAddStoryboardFrame,
  onDeleteStoryboardFrame,
  onGenerateCustomFrame,
  onUploadCustomFrame,
  onUploadScene,
  onDownloadScene,
  onAddToLibrary,
  onAddToSceneLibrary,
  onClose,
  sceneProductionState,
  productionReferences,
  onInitializeProduction,
  onSegmentPromptChange,
  onSegmentDialogueAssignmentChange,
  onSegmentActionChange,
  onSegmentGenerate,
  onSegmentUpload,
  onEditSegmentFrame,
  onOpenAssets,
  onOpenPreview,
  objectReferences,
  onOpenGenerateAudio,
  isGeneratingAudio = false,
  onSaveEditedScene,
  onReorderScenes,
  onBatchGenerateStart,
  onBatchGenerateEnd,
  onUpdateSceneAudio,
  onExpressGenerate,
  onFinalizeStoryboard,
  onExpressSceneGenerate,
  onSyncPreVisToScript,
  narrationVoice,
  productionReadyChecklist,
  isExpressRunning = false,
  expressStatus,
  expressGateBlocked = false,
  expressGateReasons = [],
  onOpenReferences,
  onExpressComplete,
  lockedArtStyle,
}: SceneGalleryProps) {
  const preVisBannerRef = React.useRef<HTMLDivElement>(null)

  const scrollToPreVisBanner = useCallback(() => {
    preVisBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    preVisBannerRef.current?.classList.add('ring-2', 'ring-amber-400/60')
    window.setTimeout(() => {
      preVisBannerRef.current?.classList.remove('ring-2', 'ring-amber-400/60')
    }, 2000)
  }, [])

  const handleExpressGateBlocked = useCallback(() => {
    toast.error(expressGateReasons[0] || 'Complete the Pre-Vis ready checklist before Express.')
    scrollToPreVisBanner()
  }, [expressGateReasons, scrollToPreVisBanner])
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end for scene reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(String(active.id))
      const newIndex = parseInt(String(over.id))
      onReorderScenes?.(oldIndex, newIndex)
    }
  }

  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [selectedScene, setSelectedScene] = useState<number | null>(null)
  const [scenePrompts, setScenePrompts] = useState<Record<number, string>>({})
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set())
  const [generatingDialogueFrames, setGeneratingDialogueFrames] = useState<Set<string>>(new Set())
  const [generatingCustomFrames, setGeneratingCustomFrames] = useState<Set<string>>(new Set())
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  const [openProductionScene, setOpenProductionScene] = useState<string | null>(null)
  const [showAudioPlayer, setShowAudioPlayer] = useState(false)
  const [showStoryboardImages, setShowStoryboardImages] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  
  type EditingFrame =
    | { kind: 'establishing'; sceneIndex: number; imageUrl: string }
    | { kind: 'beat'; sceneIndex: number; beatId: string; imageUrl: string }
    | { kind: 'dialogue'; sceneIndex: number; dialogueIndex: number; imageUrl: string }

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingFrame, setEditingFrame] = useState<EditingFrame | null>(null)

  // Express dialog state
  const [expressDialogOpen, setExpressDialogOpen] = useState(false)
  const [expressStartedAt, setExpressStartedAt] = useState<number | null>(null)
  const [expressElapsedSec, setExpressElapsedSec] = useState(0)

  React.useEffect(() => {
    if (!isExpressRunning || !expressStartedAt) return
    const tick = () => setExpressElapsedSec(Math.floor((Date.now() - expressStartedAt) / 1000))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [isExpressRunning, expressStartedAt])

  React.useEffect(() => {
    if (isExpressRunning) {
      setExpressStartedAt((prev) => prev ?? Date.now())
    } else {
      setExpressStartedAt(null)
      setExpressElapsedSec(0)
    }
  }, [isExpressRunning])

  const currentProject = useStore(s => s.currentProject)
  const setCurrentProject = useStore(s => s.setCurrentProject)
  const storyboardRevision = currentProject?.metadata?.storyboardRevision
  const storyboardVersion =
    typeof storyboardRevision?.version === 'number' && storyboardRevision.version >= 1
      ? storyboardRevision.version
      : 1

  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishLabel, setPublishLabel] = useState('')
  const [publishNotes, setPublishNotes] = useState('')
  const [publishLoading, setPublishLoading] = useState(false)
  
  const playableSceneCount = useMemo(
    () => countPlayablePreVisScenes(scenes, selectedLanguage),
    [scenes, selectedLanguage]
  )

  const scenesWithAudio = useMemo(
    () => scenes.filter((scene) => sceneHasPlayablePreVisAudio(scene, selectedLanguage)).length,
    [scenes, selectedLanguage]
  )
  
  // Detect available languages across all scenes
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>()
    scenes.forEach(scene => {
      if (scene.narrationAudio) {
        Object.keys(scene.narrationAudio).forEach(lang => {
          if (scene.narrationAudio[lang]?.url) langs.add(lang)
        })
      }
      if (scene.dialogueAudio) {
        Object.keys(scene.dialogueAudio).forEach(lang => {
          if (Array.isArray(scene.dialogueAudio[lang]) && scene.dialogueAudio[lang].length > 0) langs.add(lang)
        })
      }
    })
    if (langs.size === 0) langs.add('en')
    return Array.from(langs).sort()
  }, [scenes])
  
  // Processing overlay hook for animated feedback
  const { execute } = useProcessWithOverlay()
  
  // Count scenes needing any Express phase (direction OR image OR missing audio
  // in the currently selected language). When the user picks a non-English
  // language and audio for that language hasn't been generated yet, every
  // scene with dialogue / narration becomes "needs audio" so Express can fan
  // it out.
  const scenesNeedingExpress = useMemo(() => {
    return scenes.filter((scene) => {
      const needsDirection =
        !scene?.sceneDirection ||
        !scene.sceneDirection.camera ||
        !scene.sceneDirection.scene
      const needsImage =
        !scene?.imageUrl || countStoryboardFramesNeedingGeneration(scene) > 0
      const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
      const dialogueAudio = scene?.dialogueAudio?.[selectedLanguage]
      const dialogueOk =
        dialogue.length === 0 ||
        (Array.isArray(dialogueAudio) &&
          dialogueAudio.length >= dialogue.length &&
          dialogueAudio.every((d: any) => d && d.audioUrl))
      const narrationOk =
        !scene?.narration ||
        !!scene?.narrationAudio?.[selectedLanguage]?.url ||
        (selectedLanguage === 'en' && !!scene?.narrationAudioUrl)
      const needsAudio = !(narrationOk && dialogueOk)
      return needsDirection || needsImage || needsAudio
    }).length
  }, [scenes, selectedLanguage])

  const draftFrameCount = useMemo(
    () => scenes.reduce((sum, scene) => sum + countDraftStoryboardFrames(scene), 0),
    [scenes]
  )

  const storyboardBeatProgress = useMemo(() => {
    return scenes.reduce(
      (acc, scene) => {
        const { complete, total } = getStoryboardBeatProgress(scene)
        return { complete: acc.complete + complete, total: acc.total + total }
      },
      { complete: 0, total: 0 }
    )
  }, [scenes])

  const handleExpressConfirm = useCallback(
    async (options: ExpressConfirmOptions) => {
      if (!onExpressGenerate) return
      if (expressGateBlocked) {
        handleExpressGateBlocked()
        return
      }
      setExpressDialogOpen(false)
      try {
        await onExpressGenerate({ ...options, language: selectedLanguage })
      } catch (err) {
        console.error('[SceneGallery] Express generate failed:', err)
      }
    },
    [onExpressGenerate, selectedLanguage, expressGateBlocked, handleExpressGateBlocked]
  )

  // Compute a phase-level progress summary from the SSE-driven `expressStatus`
  // map. We count phases (3 per scene) rather than whole scenes so the bar
  // moves smoothly as Direction → Audio → Image complete on each in-flight
  // worker, instead of jumping in big steps. Errors and skipped phases both
  // count as "complete" since they don't need any more work.
  const expressProgress = useMemo(() => {
    if (!isExpressRunning || !expressStatus) return null
    const sceneEntries = Object.values(expressStatus)
    const sceneCount = sceneEntries.length
    if (sceneCount === 0) return null
    const totalPhases = sceneCount * 3
    let completedPhases = 0
    let runningPhases = 0
    let scenesComplete = 0
    for (const s of sceneEntries) {
      const phases = [s.direction, s.audio, s.image]
      let sceneDone = 0
      for (const p of phases) {
        if (p === 'done' || p === 'error') {
          completedPhases += 1
          sceneDone += 1
        } else if (p === 'running') {
          runningPhases += 1
        }
      }
      if (sceneDone === 3) scenesComplete += 1
    }
    const pct = totalPhases === 0 ? 0 : Math.round((completedPhases / totalPhases) * 100)
    return {
      completedPhases,
      totalPhases,
      runningPhases,
      scenesComplete,
      sceneCount,
      pct,
    }
  }, [isExpressRunning, expressStatus])
  
  // Build smart prompt that includes character AND object references for consistency
  const buildScenePrompt = useCallback((scene: any, sceneIdx: number): string => {
    const savedPrompt = scene.imagePrompt
    if (savedPrompt) return savedPrompt
    
    const baseParts = [
      scene.heading,
      scene.visualDescription || scene.action || scene.summary,
    ].filter(Boolean)
    
    // Add character references if they're in this scene
    if (scene.characters && scene.characters.length > 0) {
      const sceneChars = characters.filter(char => 
        scene.characters.some((name: string) => 
          char.name?.toLowerCase() === name?.toLowerCase()
        )
      )
      
      if (sceneChars.length > 0) {
        const charDescriptions = sceneChars.map(char => {
          const desc = char.imagePrompt || char.description || ''
          const refNote = char.referenceImageUrl ? ' [use reference image for consistency]' : ''
          return `${char.name}: ${desc}${refNote}`
        }).join('; ')
        
        baseParts.push(`Characters: ${charDescriptions}`)
      }
    }
    
    // Add object/prop references if they're mentioned in the scene text
    if (objectReferences && objectReferences.length > 0) {
      const sceneText = `${scene.heading || ''} ${scene.visualDescription || ''} ${scene.action || ''} ${scene.summary || ''}`.toLowerCase()
      const matchedObjects = objectReferences.filter(obj => 
        sceneText.includes(obj.name.toLowerCase())
      )
      
      if (matchedObjects.length > 0) {
        const objDescriptions = matchedObjects.map(obj => {
          const desc = obj.description || obj.name
          return `${obj.name}: ${desc} [use reference image for consistency]`
        }).join('; ')
        
        baseParts.push(`Props/Objects: ${objDescriptions}`)
      }
    }
    
    return baseParts.join('. ')
  }, [characters, objectReferences])
  
  const handleShareStoryboard = async () => {
    try {
      const projectId = scenes[0]?.projectId || window.location.pathname.split('/').pop()

      const response = await fetch('/api/vision/create-share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, linkType: 'storyboard' })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create share link')

      if (data.storyboardRevision && projectId && currentProject?.id === projectId) {
        setCurrentProject({
          ...currentProject,
          metadata: { ...currentProject.metadata, storyboardRevision: data.storyboardRevision },
        })
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(data.shareUrl)
        toast.success('Pre-vis link copied to clipboard!')
      } else {
        // Fallback if clipboard API is not available
        toast.success('Share link created!', {
          description: data.shareUrl,
          duration: 10000,
          action: {
            label: 'Open',
            onClick: () => window.open(data.shareUrl, '_blank')
          }
        })
      }
    } catch (err: any) {
      console.error('[Share Storyboard]', err)
      toast.error(err.message || 'Failed to create share link')
    }
  }

  const handlePublishStoryboardRevision = async () => {
    const projectId = scenes[0]?.projectId || window.location.pathname.split('/').pop()
    if (!projectId || !currentProject?.id || currentProject.id !== projectId) {
      toast.error('Project not loaded — refresh the page and try again.')
      return
    }
    setPublishLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/storyboard-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: publishLabel || undefined, notes: publishNotes || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish revision')
      setCurrentProject({
        ...currentProject,
        metadata: { ...currentProject.metadata, storyboardRevision: data.storyboardRevision },
      })
      setPublishDialogOpen(false)
      setPublishLabel('')
      setPublishNotes('')
      toast.success(`Storyboard v${data.storyboardRevision?.version ?? ''} published`, {
        description: 'Share link unchanged. New feedback after reviewers reload will use this version.',
      })
    } catch (e: any) {
      toast.error(e.message || 'Failed to publish revision')
    } finally {
      setPublishLoading(false)
    }
  }

  return (
    <TooltipProvider>
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-y-2 mb-6">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-sf-primary" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-6 my-0">Pre-Visualization</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'}
          </span>
          {playableSceneCount > 0 && (
            <span className="text-xs text-emerald-500 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded flex items-center gap-1">
              <Play className="w-3 h-3" />
              {playableSceneCount}/{scenes.length} ready
              {scenesWithAudio > 0 && (
                <span className="text-emerald-600/80 dark:text-emerald-300/80">
                  · {scenesWithAudio} audio
                </span>
              )}
            </span>
          )}
          <span
            className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5"
            title="Screening feedback is stamped with this version when reviewers submit."
          >
            v{storyboardVersion}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPublishDialogOpen(true)}
              >
                <Tag className="w-3.5 h-3.5 mr-1" />
                Publish revision
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Bump the storyboard version after meaningful changes. The public link stays the same; feedback
              records which version the reviewer had loaded.
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          {/* Express button - replaces Generate All + Generate Direction.
              While running, the button shows a phase-level progress strip
              along its bottom edge plus a compact "X/Y phases" label, and a
              second pill in the toolbar surfaces "Scene X/Y" progress so
              the user can see how far along the run is. */}
          {onExpressGenerate && scenes.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (expressGateBlocked) {
                      handleExpressGateBlocked()
                      return
                    }
                    if (scenesNeedingExpress === 0) {
                      toast.info('All scenes complete — open Express and enable Regenerate to redo.')
                      setExpressDialogOpen(true)
                      return
                    }
                    setExpressDialogOpen(true)
                  }}
                  disabled={isExpressRunning}
                  className="relative flex items-center gap-2 overflow-hidden bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border-indigo-500/40 hover:border-indigo-500/60 hover:from-indigo-500/25 hover:to-purple-500/25"
                >
                  {isExpressRunning ? (
                    <Loader className="w-4 h-4 animate-spin text-indigo-300" />
                  ) : (
                    <Zap className="w-4 h-4 text-indigo-300" />
                  )}
                  <span>
                    {isExpressRunning
                      ? expressProgress
                        ? `Express ${expressProgress.pct}%`
                        : 'Express running…'
                      : `Express All Scenes (${scenesNeedingExpress})`}
                  </span>
                  {isExpressRunning && expressProgress && (
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-0 h-0.5 bg-indigo-400 transition-all duration-300 ease-out"
                      style={{ width: `${expressProgress.pct}%` }}
                    />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {expressGateBlocked ? (
                  <ul className="text-xs space-y-1 list-disc pl-4">
                    {expressGateReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : isExpressRunning && expressProgress ? (
                  `Direction → Audio → Storyboard • ${storyboardBeatProgress.complete}/${storyboardBeatProgress.total} beats • ${expressElapsedSec}s elapsed`
                ) : scenesNeedingExpress === 0 ? (
                  'All scenes complete — open Express and enable Regenerate to redo'
                ) : (
                  'Express All Scenes: Direction → Audio → storyboard frames for every scene (~3–10 min, varies by beat count)'
                )}
              </TooltipContent>
            </Tooltip>
          )}
          {onFinalizeStoryboard && draftFrameCount > 0 && !isExpressRunning && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void onFinalizeStoryboard(undefined, selectedLanguage)}
                  className="flex items-center gap-2 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                >
                  <Sparkles className="w-4 h-4" />
                  Finalize frames ({draftFrameCount})
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Upgrade draft storyboard frames to Final quality for animatic preview and video
                generation.
              </TooltipContent>
            </Tooltip>
          )}
          {isExpressRunning && expressProgress && (
            <div className="flex items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-[11px] text-indigo-200">
              <span className="font-semibold">
                Beats {storyboardBeatProgress.complete}/{storyboardBeatProgress.total}
              </span>
              <span className="text-indigo-300/70">·</span>
              <span>{expressElapsedSec}s</span>
              <span className="text-indigo-300/70">·</span>
              <span>
                Scene {expressProgress.scenesComplete}/{expressProgress.sceneCount}
              </span>
            </div>
          )}
          {/* Language selector - always visible. The list is the full
              supported languages so users can pick a target locale to
              generate audio in (the Express button reflects "needs audio in
              this language"). When the selected language has no audio yet,
              a small "Missing" badge nudges the user toward Express. */}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <GroupedLanguageSelector
                    value={selectedLanguage}
                    onValueChange={setSelectedLanguage}
                    size="xs"
                    intent="generate"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {availableLanguages.includes(selectedLanguage)
                  ? `Switch storyboard playback language`
                  : `No audio in this language yet — run Express to generate`}
              </TooltipContent>
            </Tooltip>
            {!availableLanguages.includes(selectedLanguage) && (
              <span className="text-[10px] uppercase tracking-wider text-amber-300 bg-amber-900/30 border border-amber-700/40 px-1.5 py-0.5 rounded">
                Missing
              </span>
            )}
          </div>
          {playableSceneCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showAudioPlayer ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAudioPlayer(!showAudioPlayer)}
                  className={showAudioPlayer 
                    ? "flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" 
                    : "flex items-center gap-2"
                  }
                >
                  {showAudioPlayer ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>Player</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showAudioPlayer
                  ? 'Hide player'
                  : 'Preview available scenes — images and/or audio'}
              </TooltipContent>
            </Tooltip>
          )}
          {/* Storyboard Images toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStoryboardImages(!showStoryboardImages)}
                className={showStoryboardImages 
                  ? "flex items-center gap-2" 
                  : "flex items-center gap-2 bg-gray-200 dark:bg-gray-700"
                }
              >
                {showStoryboardImages ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="hidden sm:inline">Images</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showStoryboardImages ? 'Hide storyboard images' : 'Show storyboard images'}</TooltipContent>
          </Tooltip>
          {scenes.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReportPreviewOpen(true)}
                  className="flex items-center justify-center"
                >
                  <Printer className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print Storyboard</TooltipContent>
            </Tooltip>
          )}
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800 text-sf-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            title="Grid view"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('timeline')}
            className={`p-2 rounded transition-colors ${viewMode === 'timeline' ? 'bg-gray-100 dark:bg-gray-800 text-sf-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            title="Timeline view"
          >
            <List className="w-4 h-4" />
          </button>
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClose}
                  className="p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Close Pre-Visualization</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {productionReadyChecklist && (
        <div ref={preVisBannerRef} className="mb-4 rounded-lg transition-shadow">
          <ProductionReadyBanner
            id="previs-ready-banner"
            checklist={productionReadyChecklist}
            onOpenReferences={onOpenReferences}
            onOpenGenerateAudio={onOpenGenerateAudio}
          />
        </div>
      )}
      
      {/* Audio Gallery Player - collapsible section */}
      {showAudioPlayer && playableSceneCount > 0 && (
        <div className="mb-6">
          <AudioGalleryPlayer
            scenes={scenes}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            availableLanguages={availableLanguages}
            onClose={() => setShowAudioPlayer(false)}
            onShare={handleShareStoryboard}
          />
        </div>
      )}
      
      {/* Storyboard Images section - collapsible */}
      {showStoryboardImages && (
        <>
      {scenes.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Camera className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>No scenes generated yet</p>
        </div>
      ) : viewMode === 'grid' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={scenes.map((_, idx) => idx)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {scenes.map((scene, idx) => {
                const sceneKey = buildSceneKey(scene, idx)
                const defaultPrompt = buildScenePrompt(scene, idx)
                const productionData = sceneProductionState[sceneKey] ?? (scene.productionData as SceneProductionData | undefined)
                const isProductionOpen = openProductionScene === sceneKey
                return (
                  <SortableSceneWrapper
                    key={sceneKey}
                    id={idx}
                    isProductionOpen={isProductionOpen}
                    disabled={!onReorderScenes}
                  >
                    <SceneCard
                  sceneKey={sceneKey}
                  scene={scene}
                  sceneNumber={idx + 1}
                  isSelected={selectedScene === idx}
                  isProductionOpen={isProductionOpen}
                  onToggleProduction={() =>
                    setOpenProductionScene(isProductionOpen ? null : sceneKey)
                  }
                  onClick={() => {
                    setSelectedScene(idx)
                    setOpenProductionScene(isProductionOpen ? null : sceneKey)
                  }}
                  onGenerate={async (prompt) => {
                    setGeneratingScenes((prev) => new Set(prev).add(idx))
                    try {
                      await execute(async () => {
                        await onGenerateScene(idx, prompt)
                      }, {
                        message: `Generating image for Scene ${idx + 1}...`,
                        estimatedDuration: 15,
                        operationType: 'image-generation'
                      })
                    } finally {
                      setGeneratingScenes((prev) => {
                        const newSet = new Set(prev)
                        newSet.delete(idx)
                        return newSet
                      })
                    }
                  }}
                  onUpload={(file) => onUploadScene(idx, file)}
                  prompt={scenePrompts[idx] || defaultPrompt}
                  isGenerating={generatingScenes.has(idx)}
                  sceneIndex={idx}
                  onGenerateDialogueFrame={onGenerateDialogueFrame ? async (dialogueIdx) => {
                    const key = `${idx}-${dialogueIdx}`
                    setGeneratingDialogueFrames((prev) => new Set(prev).add(key))
                    try {
                      await execute(async () => {
                        await onGenerateDialogueFrame(idx, dialogueIdx)
                      }, {
                        message: `Generating dialogue frame ${dialogueIdx + 1} for Scene ${idx + 1}...`,
                        estimatedDuration: 15,
                        operationType: 'image-generation',
                      })
                    } finally {
                      setGeneratingDialogueFrames((prev) => {
                        const next = new Set(prev)
                        next.delete(key)
                        return next
                      })
                    }
                  } : undefined}
                  onGenerateBeatFrame={onGenerateBeatFrame ? async (beatId) => {
                    const key = `${idx}-beat-${beatId}`
                    setGeneratingDialogueFrames((prev) => new Set(prev).add(key))
                    try {
                      await execute(async () => {
                        await onGenerateBeatFrame(idx, beatId)
                      }, {
                        message: `Generating beat frame for Scene ${idx + 1}...`,
                        estimatedDuration: 15,
                        operationType: 'image-generation',
                      })
                    } finally {
                      setGeneratingDialogueFrames((prev) => {
                        const next = new Set(prev)
                        next.delete(key)
                        return next
                      })
                    }
                  } : undefined}
                  onUploadDialogueFrame={onUploadDialogueFrame ? (dialogueIdx, file) => onUploadDialogueFrame(idx, dialogueIdx, file) : undefined}
                  onUploadBeatFrame={onUploadBeatFrame ? (beatId, file) => onUploadBeatFrame(idx, beatId, file) : undefined}
                  onEditFrame={(frame) => {
                    setEditingFrame(frame)
                    setEditModalOpen(true)
                  }}
                  onExpressSceneGenerate={
                    onExpressSceneGenerate
                      ? (opts) => onExpressSceneGenerate(idx, selectedLanguage, opts)
                      : undefined
                  }
                  onFinalizeScene={
                    onFinalizeStoryboard
                      ? () => onFinalizeStoryboard(idx, selectedLanguage)
                      : undefined
                  }
                  onSyncPreVisToScript={
                    onSyncPreVisToScript ? () => onSyncPreVisToScript(idx) : undefined
                  }
                  selectedLanguage={selectedLanguage}
                  narrationVoice={narrationVoice}
                  onExpressGateBlocked={handleExpressGateBlocked}
                  expressGateBlocked={expressGateBlocked}
                  isExpressRunning={isExpressRunning}
                  expressElapsedSec={expressElapsedSec}
                  generatingDialogueFrames={generatingDialogueFrames}
                  onAddStoryboardFrame={onAddStoryboardFrame ? () => onAddStoryboardFrame(idx) : undefined}
                  onDeleteStoryboardFrame={onDeleteStoryboardFrame ? (frameId) => onDeleteStoryboardFrame(idx, frameId) : undefined}
                  onGenerateCustomFrame={onGenerateCustomFrame ? async (frameId) => {
                    const key = `custom-${idx}-${frameId}`
                    setGeneratingCustomFrames((prev) => new Set(prev).add(key))
                    try {
                      await execute(async () => {
                        await onGenerateCustomFrame(idx, frameId)
                      }, {
                        message: `Generating custom frame for Scene ${idx + 1}...`,
                        estimatedDuration: 15,
                        operationType: 'image-generation',
                      })
                    } finally {
                      setGeneratingCustomFrames((prev) => {
                        const next = new Set(prev)
                        next.delete(key)
                        return next
                      })
                    }
                  } : undefined}
                  onUploadCustomFrame={onUploadCustomFrame ? (frameId, file) => onUploadCustomFrame(idx, frameId, file) : undefined}
                  generatingCustomFrames={generatingCustomFrames}
                  productionData={productionData}
                  productionReferences={productionReferences}
                  onInitializeProduction={onInitializeProduction}
                  onSegmentPromptChange={onSegmentPromptChange}
                  onSegmentDialogueAssignmentChange={onSegmentDialogueAssignmentChange}
                  onSegmentActionChange={onSegmentActionChange}
                  onSegmentGenerate={onSegmentGenerate}
                  onSegmentUpload={onSegmentUpload}
                  onEditSegmentFrame={onEditSegmentFrame}
                  characters={characters}
                  objectReferences={objectReferences}
                  showDragHandle={!!onReorderScenes}
                  onUpdateSceneAudio={onUpdateSceneAudio}
                  expressPhaseStatus={expressStatus?.[idx]}
                />
                  </SortableSceneWrapper>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <TimelineView 
          scenes={scenes}
          onSceneSelect={setSelectedScene}
          onRegenerateScene={onRegenerateScene}
        />
      )}
        </>
      )}
      
      {/* Storyboard Report Preview Modal */}
      {scenes.length > 0 && (
        <ReportPreviewModal
          type={ReportType.STORYBOARD}
          data={{
            title: projectTitle || 'Untitled Project',
            frames: scenes.flatMap((scene, idx) =>
              flattenSceneToStoryboardFrames(scene, idx + 1).map((f) => ({
                sceneNumber: f.sceneNumber,
                frameType: f.frameType,
                dialogueIndex: f.dialogueIndex,
                imageUrl: f.imageUrl,
                visualDescription: f.visualDescription,
                shotType: f.shotType,
                cameraAngle: f.cameraAngle,
                lighting: f.lighting,
                duration: f.duration,
                character: f.character,
                line: f.line,
              }))
            ),
          } as StoryboardData}
          projectName={projectTitle || 'Untitled Project'}
          open={reportPreviewOpen}
          onOpenChange={setReportPreviewOpen}
        />
      )}
      
      {/* Storyboard Express dialog */}
      {onExpressGenerate && (
        <ExpressConfirmDialog
          open={expressDialogOpen}
          onOpenChange={setExpressDialogOpen}
          scenes={scenes}
          isRunning={isExpressRunning}
          language={selectedLanguage}
          lockedArtStyle={lockedArtStyle}
          onConfirm={handleExpressConfirm}
        />
      )}

      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish storyboard revision</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Increments the version (e.g. v{storyboardVersion} → v{storyboardVersion + 1}). Your share link does not
            change. Reviewers who refresh will see the new current version; their next submissions are stamped
            accordingly.
          </p>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="sb-rev-label" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Label (optional)
              </label>
              <Input
                id="sb-rev-label"
                value={publishLabel}
                onChange={e => setPublishLabel(e.target.value)}
                placeholder="e.g. Client notes round 2"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sb-rev-notes" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Change notes (optional)
              </label>
              <textarea
                id="sb-rev-notes"
                value={publishNotes}
                onChange={e => setPublishNotes(e.target.value)}
                placeholder="What changed since the last version?"
                rows={3}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPublishDialogOpen(false)} disabled={publishLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={handlePublishStoryboardRevision} disabled={publishLoading}>
              {publishLoading ? <Loader className="w-4 h-4 animate-spin" /> : `Publish v${storyboardVersion + 1}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Edit Modal */}
      <ImageEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        imageUrl={editingFrame?.imageUrl ?? ''}
        imageType="scene"
        objectReferences={objectReferences}
        onSave={(newImageUrl) => {
          if (editingFrame) {
            if (editingFrame.kind === 'establishing' && onSaveEditedScene) {
              onSaveEditedScene(editingFrame.sceneIndex, newImageUrl)
            } else if (editingFrame.kind === 'beat' && onSaveEditedBeatFrame) {
              onSaveEditedBeatFrame(editingFrame.sceneIndex, editingFrame.beatId, newImageUrl)
            } else if (editingFrame.kind === 'dialogue' && onSaveEditedDialogueFrame) {
              onSaveEditedDialogueFrame(
                editingFrame.sceneIndex,
                editingFrame.dialogueIndex,
                newImageUrl
              )
            }
          }
          setEditModalOpen(false)
          setEditingFrame(null)
        }}
        title={
          editingFrame
            ? editingFrame.kind === 'beat'
              ? `Edit beat — Scene ${editingFrame.sceneIndex + 1}`
              : editingFrame.kind === 'dialogue'
                ? `Edit dialogue frame — Scene ${editingFrame.sceneIndex + 1}`
                : `Edit Scene ${editingFrame.sceneIndex + 1}`
            : 'Edit frame'
        }
      />
    </div>
    </TooltipProvider>
  )
}

interface SceneCardProps {
  sceneKey: string
  scene: any
  sceneNumber: number
  isSelected: boolean
  isProductionOpen: boolean
  onClick: () => void
  onGenerate: (prompt: string) => Promise<void>
  onGenerateDialogueFrame?: (dialogueIndex: number) => Promise<void>
  onGenerateBeatFrame?: (beatId: string) => Promise<void>
  onUploadDialogueFrame?: (dialogueIndex: number, file: File) => void
  onUploadBeatFrame?: (beatId: string, file: File) => void
  onEditFrame?: (frame: {
    kind: 'establishing' | 'beat' | 'dialogue'
    sceneIndex: number
    imageUrl: string
    beatId?: string
    dialogueIndex?: number
  }) => void
  onExpressSceneGenerate?: (options?: { regenerate?: boolean }) => void
  onFinalizeScene?: () => void
  onSyncPreVisToScript?: () => void | Promise<void>
  onExpressGateBlocked?: () => void
  expressGateBlocked?: boolean
  selectedLanguage?: string
  narrationVoice?: unknown
  isExpressRunning?: boolean
  expressElapsedSec?: number
  generatingDialogueFrames?: Set<string>
  onAddStoryboardFrame?: () => void | Promise<void>
  onDeleteStoryboardFrame?: (frameId: string) => void | Promise<void>
  onGenerateCustomFrame?: (frameId: string) => Promise<void>
  onUploadCustomFrame?: (frameId: string, file: File) => void
  generatingCustomFrames?: Set<string>
  sceneIndex: number
  onUpload: (file: File) => void
  prompt: string
  isGenerating: boolean
  onToggleProduction: () => void
  productionData?: SceneProductionData
  productionReferences: SceneProductionReferences
  onInitializeProduction: (sceneId: string, options: { targetDuration: number }) => Promise<void>
  onSegmentPromptChange: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentDialogueAssignmentChange?: (sceneId: string, segmentId: string, dialogueLineIds: string[]) => void
  onSegmentActionChange?: (sceneId: string, segmentId: string, action: string) => void
  onSegmentGenerate: (sceneId: string, segmentId: string, mode: GenerationType, options?: {
    startFrameUrl?: string
    endFrameUrl?: string
    referenceImages?: Array<{ url: string; type: 'style' | 'character' }>
    generationMethod?: VideoGenerationMethod
    prompt?: string
    negativePrompt?: string
    duration?: number
    aspectRatio?: '16:9' | '9:16'
    resolution?: '720p' | '1080p'
    sourceVideoUrl?: string
    guidePrompt?: string
  }) => Promise<void>
  onSegmentUpload: (sceneId: string, segmentId: string, file: File) => Promise<void>
  onEditSegmentFrame?: (
    sceneId: string,
    segmentId: string,
    frameType: 'start' | 'end',
    newFrameUrl: string
  ) => void
  /** All project characters for reference status checking */
  characters?: any[]
  /** Object/prop references from reference library */
  objectReferences?: Array<{ id: string; name: string; imageUrl: string; description?: string }>
  /** Whether to show the drag handle for reordering */
  showDragHandle?: boolean
  onUpdateSceneAudio?: (sceneIndex: number) => Promise<void>
  /** Express pipeline phase status for this scene. */
  expressPhaseStatus?: ExpressSceneStatus
}

// Sortable wrapper component for drag-and-drop
function SortableSceneWrapper({ 
  id, 
  children, 
  isProductionOpen,
  disabled = false
}: { 
  id: number
  children: React.ReactNode
  isProductionOpen: boolean
  disabled?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('col-span-1', isProductionOpen && 'col-span-2 lg:col-span-3')}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

function SceneCard({
  sceneKey,
  scene,
  sceneNumber,
  isSelected,
  isProductionOpen,
  onClick,
  onGenerate,
  onGenerateDialogueFrame,
  onGenerateBeatFrame,
  onUploadDialogueFrame,
  onUploadBeatFrame,
  onEditFrame,
  onExpressSceneGenerate,
  onFinalizeScene,
  onSyncPreVisToScript,
  onExpressGateBlocked,
  expressGateBlocked = false,
  selectedLanguage = 'en',
  narrationVoice,
  isExpressRunning = false,
  expressElapsedSec = 0,
  generatingDialogueFrames = new Set(),
  onAddStoryboardFrame,
  onDeleteStoryboardFrame,
  onGenerateCustomFrame,
  onUploadCustomFrame,
  generatingCustomFrames = new Set(),
  sceneIndex,
  onUpload,
  prompt,
  isGenerating,
  onToggleProduction,
  productionData,
  productionReferences,
  onInitializeProduction,
  onSegmentPromptChange,
  onSegmentDialogueAssignmentChange,
  onSegmentActionChange,
  onSegmentGenerate,
  onSegmentUpload,
  onEditSegmentFrame,
  characters = [],
  objectReferences = [],
  showDragHandle = false,
  onUpdateSceneAudio,
  expressPhaseStatus,
}: SceneCardProps) {
  const frameSlots = useMemo(() => enumerateStoryboardFrameSlots(scene), [scene])
  const [selectedFrameKey, setSelectedFrameKey] = React.useState<string | null>(null)

  React.useEffect(() => {
    setSelectedFrameKey(frameSlots[0]?.key ?? null)
  }, [sceneKey, frameSlots])

  const previewSlot = useMemo(() => {
    if (frameSlots.length === 0) return null
    return frameSlots.find((slot) => slot.key === selectedFrameKey) ?? frameSlots[0]
  }, [frameSlots, selectedFrameKey])

  const previewImageUrl =
    previewSlot?.displayImageUrl ??
    previewSlot?.ownImageUrl ??
    scene.imageUrl ??
    undefined
  
  // Compute reference status for this scene
  const referenceStatus = useMemo(() => {
    const sceneCharacterNames: string[] = scene.characters || []
    const sceneCharacters = sceneCharacterNames
      .map(name => characters.find(c => c.name === name))
      .filter(Boolean)
    
    const charsWithRef = sceneCharacters.filter(c => c?.referenceImage)
    const charsWithoutRef = sceneCharacters.filter(c => !c?.referenceImage)
    
    // Check for props mentioned in scene that have references
    const sceneText = `${scene.action || ''} ${scene.visualDescription || ''} ${scene.narration || ''}`.toLowerCase()
    const matchingProps = objectReferences.filter(obj => 
      sceneText.includes(obj.name.toLowerCase())
    )
    
    return {
      totalChars: sceneCharacters.length,
      charsWithRef: charsWithRef.length,
      charsWithoutRef: charsWithoutRef.length,
      charsMissingRef: charsWithoutRef.map(c => c?.name).filter(Boolean),
      hasAllCharRefs: sceneCharacters.length === 0 || charsWithRef.length === sceneCharacters.length,
      propsAvailable: matchingProps.length,
      isReady: sceneCharacters.length === 0 || charsWithRef.length === sceneCharacters.length,
    }
  }, [scene, characters, objectReferences])

  const preVisStale = useMemo(() => isPreVisStale(scene), [scene])

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

  const [sceneExpressRegenerateOpen, setSceneExpressRegenerateOpen] = useState(false)

  const sceneExpressDisabled =
    isExpressRunning || (!expressGateBlocked && !sceneExpressPreflight.ok)

  const sceneExpressTooltip = !sceneExpressPreflight.ok
    ? sceneExpressPreflight.errors[0]
    : sceneExpressPreflight.nothingToDo
      ? 'Scene complete — click to regenerate'
      : '~60s — Vertex AI — Direction (if needed) → Audio + beats in parallel'

  const sceneExpressRunning =
    isExpressRunning &&
    !!expressPhaseStatus &&
    (expressPhaseStatus.direction === 'running' ||
      expressPhaseStatus.audio === 'running' ||
      expressPhaseStatus.image === 'running')
  
  const handleCardClick = () => {
    onClick()
  }
  
  const sceneHeading = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text
  const formattedHeading = formatSceneHeading(sceneHeading) || sceneHeading || 'Untitled'
  return (
    <div 
      onClick={handleCardClick}
      className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
        isSelected 
          ? 'border-sf-primary ring-2 ring-sf-primary' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* Drag Handle Indicator */}
      {showDragHandle && (
        <div 
          className="absolute top-2 left-2 p-1.5 bg-black/50 rounded cursor-grab hover:bg-black/70 transition-colors z-20 opacity-0 group-hover:opacity-100"
          title="Drag to reorder scenes"
        >
          <GripVertical className="w-4 h-4 text-white/80" />
        </div>
      )}

      {/* Scene preview — read-only; use storyboard frame thumbnails for generate/upload */}
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
        {previewImageUrl ? (
          <img 
            src={previewImageUrl} 
            alt={`Scene ${sceneNumber}${previewSlot?.label ? ` — ${previewSlot.label}` : ''}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Camera className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <span className="text-xs text-gray-500 dark:text-gray-400">No image</span>
          </div>
        )}
        
        {/* Prominent loading overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-10">
            <Loader className="w-12 h-12 animate-spin text-blue-400 mb-3" />
            <span className="text-sm text-white font-medium">Generating Scene...</span>
            <span className="text-xs text-gray-300 mt-1">Please wait</span>
          </div>
        )}
      </div>
      
      {/* Scene Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="text-white">
          <div className="text-xs font-semibold">SCENE {sceneNumber}</div>
          <div className="text-sm truncate">{formattedHeading}</div>
        </div>
      </div>
      
      {/* Reference Status Indicator - Top Right */}
      {referenceStatus.totalChars > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
              referenceStatus.hasAllCharRefs 
                ? 'bg-emerald-500/90 text-white' 
                : 'bg-amber-500/90 text-white'
            }`}>
              <Users className="w-3 h-3" />
              <span>{referenceStatus.charsWithRef}/{referenceStatus.totalChars}</span>
              {referenceStatus.hasAllCharRefs ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[200px]">
            {referenceStatus.hasAllCharRefs ? (
              <span>All {referenceStatus.totalChars} character reference{referenceStatus.totalChars > 1 ? 's' : ''} ready</span>
            ) : (
              <div>
                <div className="font-medium text-amber-400">Missing references:</div>
                <div className="text-xs">{referenceStatus.charsMissingRef.join(', ')}</div>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      )}
      
      {/* Character Avatars - Top Left (identity + wardrobe ref indicators) */}
      {scene.characters && scene.characters.length > 0 && (
        <div className="absolute top-2 left-2 flex gap-1">
          {scene.characters.slice(0, 3).map((charName: string, i: number) => {
            const char = characters.find(c => c.name === charName)
            const hasRef = char?.referenceImage
            
            // Resolve costume image: wardrobe override → scene-number match → default → baseline
            const hasIdentityRef = !!char?.referenceImage
            let avatarUrl = char?.referenceImage
            let hasWardrobeRef = false
            let wardrobeName = ''
            if (char?.wardrobes && char.wardrobes.length > 0) {
              const sceneWardrobeOverride = scene.characterWardrobes?.find(
                (cw: any) => cw.characterId === char.id || cw.characterId === char.name
              )
              let resolvedWardrobe: any = null
              if (sceneWardrobeOverride?.wardrobeId) {
                resolvedWardrobe = char.wardrobes.find((w: any) => w.id === sceneWardrobeOverride.wardrobeId)
              }
              if (!resolvedWardrobe && sceneNumber) {
                resolvedWardrobe = char.wardrobes.find((w: any) => 
                  w.sceneNumbers && w.sceneNumbers.includes(sceneNumber)
                )
              }
              if (!resolvedWardrobe) {
                resolvedWardrobe = char.wardrobes.find((w: any) => w.isDefault)
              }
              if (!resolvedWardrobe) {
                resolvedWardrobe = char.wardrobes[0]
              }
              if (resolvedWardrobe?.fullBodyUrl) {
                hasWardrobeRef = true
                wardrobeName = resolvedWardrobe.name || ''
              }
            }
            const hasDualRefs = hasIdentityRef && hasWardrobeRef
            
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div 
                    className={`w-6 h-6 rounded-full overflow-hidden shadow-sm border-2 ${
                      hasDualRefs
                        ? 'border-cyan-400'
                        : hasRef
                          ? 'border-emerald-400'
                          : 'border-amber-400'
                    }`}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={charName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                        {charName[0]}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {charName}
                  {hasDualRefs
                    ? ` — Identity ref + Wardrobe ref (${wardrobeName})`
                    : hasWardrobeRef
                      ? ` — Wardrobe ref (${wardrobeName})`
                      : hasRef
                        ? ' — Identity ref'
                        : ' (no reference)'}
                </TooltipContent>
              </Tooltip>
            )
          })}
          {scene.characters.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center text-[10px] text-gray-300">
              +{scene.characters.length - 3}
            </div>
          )}
        </div>
      )}
      
      {/* Audio Status Indicator & Generate Button */}
      {(() => {
        const hasNarration = scene.narrationAudio?.en?.url || scene.narrationAudioUrl
        const hasDialogue = scene.dialogueAudio?.en && scene.dialogueAudio.en.length > 0
        const hasMusic = scene.musicAudio || scene.music?.url
        const hasSfx = scene.sfxAudio && scene.sfxAudio.length > 0
        const hasAnyAudio = hasNarration || hasDialogue || hasMusic || hasSfx
        
        return (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {hasAnyAudio && (
              <div className="flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
                <Volume2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-white font-medium">
                  {[
                    hasNarration && 'VO',
                    hasDialogue && 'DLG',
                    hasMusic && '♪',
                    hasSfx && 'SFX'
                  ].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}
            
            {onUpdateSceneAudio && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-6 px-2 rounded-full bg-black/60 hover:bg-black/80 border-0 text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateSceneAudio(sceneNumber - 1)
                    }}
                  >
                    <RefreshCw className="w-3 h-3 text-emerald-400 mr-1" />
                    <span className="text-[10px] font-medium text-emerald-400">Gen Audio</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate narration, dialogue, music, and SFX for this scene</TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      })()}

      {/* Storyboard frames — establishing, dialogue-linked, and custom cuts */}
      <div
        className="px-3 py-2 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {(() => {
          const frameStats = countStoryboardFrameStats(scene)

          const handleDeleteCustom = (frameId: string, hasImage: boolean) => {
            if (!onDeleteStoryboardFrame) return
            if (hasImage && !window.confirm('Delete this storyboard frame?')) return
            void onDeleteStoryboardFrame(frameId)
          }

          return (
            <>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Storyboard frames
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] ${
                      frameStats.missing > 0
                        ? 'text-amber-500'
                        : frameStats.placeholders > 0
                          ? 'text-amber-400'
                          : 'text-gray-400'
                    }`}
                    title={
                      frameStats.missing > 0
                        ? `${frameStats.missing} frame(s) need generation`
                        : frameStats.placeholders > 0
                          ? `${frameStats.placeholders} frame(s) using anchor placeholder`
                          : 'All frames have dedicated images'
                    }
                  >
                    {frameStats.withImage}/{frameStats.total}
                    {frameStats.missing > 0 ? ` · ${frameStats.missing} missing` : ''}
                    {frameStats.placeholders > 0 ? ` · ${frameStats.placeholders} placeholder` : ''}
                  </span>
                  {preVisStale && onSyncPreVisToScript && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] border-amber-500/50 text-amber-300 hover:bg-amber-500/15 disabled:opacity-50"
                          disabled={isExpressRunning}
                          onClick={(e) => {
                            e.stopPropagation()
                            void onSyncPreVisToScript()
                          }}
                        >
                          <RefreshCw className="w-3 h-3 mr-0.5" />
                          Update Frames
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Script changed since last pre-vis — refresh prompts and enable regeneration
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {onExpressSceneGenerate && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] border-amber-500/40 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
                          disabled={sceneExpressDisabled}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (expressGateBlocked && onExpressGateBlocked) {
                              onExpressGateBlocked()
                              return
                            }
                            if (!sceneExpressPreflight.ok) {
                              toast.error(sceneExpressPreflight.errors[0])
                              return
                            }
                            if (sceneExpressPreflight.nothingToDo) {
                              setSceneExpressRegenerateOpen(true)
                              return
                            }
                            void onExpressSceneGenerate()
                          }}
                        >
                          <Zap className="w-3 h-3 mr-0.5" />
                          {sceneExpressRunning
                            ? `Express ${expressElapsedSec}s`
                            : 'Express'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">{sceneExpressTooltip}</TooltipContent>
                    </Tooltip>
                  )}
                  {onExpressSceneGenerate && (
                    <Dialog
                      open={sceneExpressRegenerateOpen}
                      onOpenChange={setSceneExpressRegenerateOpen}
                    >
                      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
                        <DialogHeader>
                          <DialogTitle>Regenerate Scene Express?</DialogTitle>
                          <DialogDescription>
                            Scene already has direction, audio, and pre-vis frames. This will
                            regenerate them.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSceneExpressRegenerateOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setSceneExpressRegenerateOpen(false)
                              void onExpressSceneGenerate({ regenerate: true })
                            }}
                          >
                            Regenerate
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  {onFinalizeScene && countDraftStoryboardFrames(scene) > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                          disabled={isExpressRunning}
                          onClick={(e) => {
                            e.stopPropagation()
                            void onFinalizeScene()
                          }}
                        >
                          <Sparkles className="w-3 h-3 mr-0.5" />
                          Finalize
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Upgrade draft frames to Final quality for animatic and video
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {onAddStoryboardFrame && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px] border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        void onAddStoryboardFrame()
                      }}
                    >
                      <Plus className="w-3 h-3 mr-0.5" />
                      Add Frame
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {frameSlots.map((slot) => {
                  if (slot.kind === 'custom') {
                    const genKey = `custom-${sceneIndex}-${slot.customFrameId}`
                    const isGeneratingCustom = generatingCustomFrames.has(genKey)
                    return (
                      <div key={slot.key} className="flex-shrink-0 w-36">
                        <SceneImageFrame
                          sceneIdx={sceneIndex}
                          sceneNumber={sceneNumber}
                          imageUrl={slot.displayImageUrl}
                          isPlaceholder={slot.isPlaceholder}
                          isSelected={selectedFrameKey === slot.key}
                          onSelect={() => setSelectedFrameKey(slot.key)}
                          isGenerating={isGeneratingCustom}
                          compact
                          showBorder
                          label={slot.label}
                          onGenerate={() => void onGenerateCustomFrame?.(slot.customFrameId!)}
                          onUpload={(file) => {
                            setSelectedFrameKey(slot.key)
                            onUploadCustomFrame?.(slot.customFrameId!, file)
                          }}
                          onDelete={() => handleDeleteCustom(slot.customFrameId!, !!slot.ownImageUrl)}
                        />
                      </div>
                    )
                  }

                  const dialogueIdx = slot.dialogueIndex
                  const beatId = slot.beatId
                  const useBeatFrame =
                    !!beatId &&
                    (slot.kind === 'narration' || slot.kind === 'action')
                  const isGeneratingBeatFrame =
                    useBeatFrame &&
                    generatingDialogueFrames.has(`${sceneIndex}-beat-${beatId}`)
                  const isGeneratingFrame =
                    !useBeatFrame &&
                    typeof dialogueIdx === 'number' &&
                    generatingDialogueFrames.has(`${sceneIndex}-${dialogueIdx}`)
                  const isLegacyEstablishingOnly =
                    !useBeatFrame &&
                    slot.kind === 'action' &&
                    typeof dialogueIdx !== 'number' &&
                    !beatId

                  return (
                    <div key={slot.key} className="flex-shrink-0 w-36">
                      <SceneImageFrame
                        sceneIdx={sceneIndex}
                        sceneNumber={sceneNumber}
                        imageUrl={slot.isMissing ? undefined : slot.displayImageUrl}
                        isPlaceholder={slot.isPlaceholder}
                        isSelected={selectedFrameKey === slot.key}
                        onSelect={() => setSelectedFrameKey(slot.key)}
                        isGenerating={
                          isLegacyEstablishingOnly
                            ? isGenerating
                            : useBeatFrame
                              ? isGeneratingBeatFrame
                              : isGeneratingFrame
                        }
                        compact
                        showBorder
                        label={slot.label}
                        imageTier={slot.ownImageUrl ? slot.imageTier : undefined}
                        beatRole={slot.beatRole}
                        imagePrompt={slot.storyboardImagePrompt}
                        onGenerate={() => {
                          if (useBeatFrame && beatId) {
                            void onGenerateBeatFrame?.(beatId)
                          } else if (isLegacyEstablishingOnly) {
                            void onGenerate(prompt)
                          } else if (typeof dialogueIdx === 'number') {
                            void onGenerateDialogueFrame?.(dialogueIdx)
                          }
                        }}
                        onUpload={(file) => {
                          setSelectedFrameKey(slot.key)
                          if (useBeatFrame && onUploadBeatFrame && beatId) {
                            onUploadBeatFrame(beatId, file)
                          } else if (isLegacyEstablishingOnly) {
                            onUpload?.(file)
                          } else if (typeof dialogueIdx === 'number') {
                            onUploadDialogueFrame?.(dialogueIdx, file)
                          }
                        }}
                        onEdit={
                          slot.displayImageUrl && !slot.isMissing
                            ? (url) => {
                                if (useBeatFrame && onEditFrame && beatId) {
                                  onEditFrame({
                                    kind: 'beat',
                                    sceneIndex,
                                    beatId,
                                    imageUrl: url,
                                  })
                                } else if (isLegacyEstablishingOnly && onEditFrame) {
                                  onEditFrame({
                                    kind: 'establishing',
                                    sceneIndex,
                                    imageUrl: url,
                                  })
                                } else if (typeof dialogueIdx === 'number' && onEditFrame) {
                                  onEditFrame({
                                    kind: 'dialogue',
                                    sceneIndex,
                                    dialogueIndex: dialogueIdx,
                                    imageUrl: url,
                                  })
                                }
                              }
                            : undefined
                        }
                      />
                    </div>
                  )
                })}
              </div>
            </>
          )
        })()}
      </div>

      {/* Express phase pills - only render when an Express run reports state for this scene */}
      {expressPhaseStatus && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
          <ExpressPhasePill label="Dir" status={expressPhaseStatus.direction} />
          <ExpressPhasePill label="Aud" status={expressPhaseStatus.audio} />
          <ExpressPhasePill label="Img" status={expressPhaseStatus.image} />
        </div>
      )}
    </div>
  )
}

interface TimelineViewProps {
  scenes: any[]
  onSceneSelect: (index: number) => void
  onRegenerateScene: (index: number) => void
}

function TimelineView({ scenes, onSceneSelect, onRegenerateScene }: TimelineViewProps) {
  return (
    <div className="space-y-4">
      {scenes.map((scene, idx) => (
        <div
          key={idx}
          className="flex gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-all"
          onClick={() => onSceneSelect(idx)}
        >
          <div className="w-32 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
            {scene.imageUrl ? (
              <img src={scene.imageUrl} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-500">SCENE {idx + 1}</span>
              {scene.duration && (
                <span className="text-xs text-gray-400">{scene.duration}s</span>
              )}
            </div>
            {scene.heading && (
              <div className="font-semibold text-sm text-gray-900 mb-1">{scene.heading}</div>
            )}
            {scene.action && (
              <p className="text-sm text-gray-600 line-clamp-2">{scene.action}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ExpressPhasePill({
  label,
  status,
}: {
  label: string
  status: ExpressPhaseStatus
}) {
  const cls = (() => {
    switch (status) {
      case 'running':
        return 'bg-indigo-500/30 text-indigo-200 border-indigo-400/40'
      case 'done':
        return 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
      case 'error':
        return 'bg-rose-500/30 text-rose-200 border-rose-400/40'
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
    >
      {status === 'running' && <Loader className="w-2.5 h-2.5 animate-spin" />}
      {status === 'done' && <Check className="w-2.5 h-2.5" />}
      {label}
    </span>
  )
}

