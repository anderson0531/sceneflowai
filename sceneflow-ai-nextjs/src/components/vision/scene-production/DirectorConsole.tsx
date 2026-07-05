/**
 * DirectorConsole - Call Action Dashboard
 * 
 * The main view for the Director's Console "Pre-Flight" workflow.
 * Lists segments with "Ready" status and allows:
 * - Clicking a segment to open DirectorDialog for granular control
 * - Batch rendering with "Render Approved Only" or "Render All" modes
 * 
 * Status Indicators:
 * - auto-ready: Configured by system, not yet reviewed
 * - user-approved: User opened dialog and clicked "Approve"
 * - rendering: Currently generating video
 * - rendered: Video exists
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { coerceSceneSfxFlatArray } from '@/lib/script/segmentScript'
import type { BlueprintAspectRatio } from '@/lib/treatment/blueprintFoundation'
import { getAspectRatioTailwindClass, toVideoAspectRatio } from '@/lib/vision/artStyle'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AnimatePresence, motion } from 'framer-motion'
import { 
  Play, 
  CheckCircle,
  Clock,
  AlertCircle,
  Film,
  Loader2,
  Settings2,
  Sparkles,
  Clapperboard,
  Mic2,
  Volume2,
  MessageSquare,
  Music,
  Upload,
  RefreshCw,
  Lock,
  Unlock,
  PlayCircle,
  Timer,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Wand2,
  Shield,
  ShieldCheck,
  CloudUpload,
  ListVideo,
} from 'lucide-react'
import type { 
  SceneSegment, 
  VideoGenerationConfig,
  VideoGenerationMethod,
  SceneProductionData,
  SelectedAudioTracks,
  AudioTrackTimingSettings,
  SceneAudioConfig,
  ProductionStream,
  ProductionStreamType,
  TextOverlay,
  ProductionTarget,
  AnimaticRenderSettings,
} from './types'
// Dynamic import for DirectorDialog — heavy module (aggregator registry, useSegmentConfig,
// ImageEditModal) shared with useVideoQueue in this chunk; static import causes webpack TDZ
// ('Cannot access tz before initialization') when the queue first builds.
const DirectorDialog = dynamic(
  () => import('./DirectorDialog').then(mod => ({ default: mod.DirectorDialog })),
  { ssr: false }
)
import { ModerationValidateButton } from '@/components/moderation/ModerationValidateButton'
// Dynamic import for VideoEditingDialog to prevent TDZ
// VideoEditingDialog → VideoEditingDialogV2 is shared between DirectorConsole (chunk 4195)
// and SegmentStudio (ScriptPanel chunk). When webpack's ModuleConcatenationPlugin scope-hoists
// this shared dependency, it reorders const declarations causing 'Cannot access eJ before initialization'.
const VideoEditingDialog = dynamic(
  () => import('./VideoEditingDialogV2').then(mod => ({ default: mod.VideoEditingDialog })),
  { ssr: false }
)
const SceneVideoPlayer = dynamic(
  () => import('./SceneVideoPlayer').then(mod => ({ default: mod.SceneVideoPlayer })),
  { ssr: false }
)
// Dynamic import for SceneRenderDialog - shared between DirectorConsole and ScriptPanel chunks
const SceneRenderDialog = dynamic(
  () => import('./SceneRenderDialog').then(mod => ({ default: mod.SceneRenderDialog })),
  { ssr: false }
)
const AddSpecialSegmentDialog = dynamic(
  () => import('./AddSpecialSegmentDialog').then(mod => ({ default: mod.AddSpecialSegmentDialog })),
  { ssr: false }
)
const ProductionStreamsPanel = dynamic(
  () => import('./ProductionStreamsPanel').then(mod => ({ default: mod.ProductionStreamsPanel })),
  { ssr: false }
)
import { ProductionSectionHeader } from './ProductionSectionHeader'
// Dynamic import for SceneProductionMixer to avoid TDZ with LocalRenderService chain
const SceneProductionMixer = dynamic(
  () => import('./SceneProductionMixer').then(mod => ({ default: mod.SceneProductionMixer })),
  { ssr: false, loading: () => <div className="p-4 text-center text-zinc-500">Loading Mixer...</div> }
)
import { useVideoQueue } from '@/hooks/useVideoQueue'
import { forceDownload } from '@/lib/utils'
import type { SceneAudioData } from './GuidePromptEditor'
import type { GuideCharacterDemographic } from '@/lib/scene/segmentGuidePrompt'
import { isBeatFirstPipelineEnabled, isStoryboardApproved } from '@/lib/script/beatMigration'
import type { SegmentGuideContext } from '@/hooks/useSegmentConfig'

function normalizeGuideCharacters(raw: unknown): GuideCharacterDemographic[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((c: Record<string, unknown>) => ({
      name: String(c.name ?? c.id ?? ''),
      age: c.age != null ? String(c.age) : undefined,
      gender: c.gender != null ? String(c.gender) : undefined,
      ethnicity: c.ethnicity != null ? String(c.ethnicity) : undefined,
    }))
    .filter((c) => c.name.length > 0)
}
import { upload } from '@vercel/blob/client'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { getNextProductionStreamVersion, getProductionStreamDisplayName } from './defaults'

// Default audio track selection state
const DEFAULT_AUDIO_TRACKS: SelectedAudioTracks = {
  narration: true,
  dialogue: true,
  music: false,
  sfx: false,
}

// Default timing settings
const DEFAULT_TIMING: AudioTrackTimingSettings = {
  startTime: 0,
  duration: 30,
}

// Stable empty segments reference to prevent TDZ render loops
// Using a module-level constant guarantees the same reference for the app's lifecycle
const EMPTY_SEGMENTS: SceneSegment[] = []

// Audio track timing state type
interface AudioTrackTimingState {
  narration: AudioTrackTimingSettings
  dialogue: AudioTrackTimingSettings
  music: AudioTrackTimingSettings
  sfx: AudioTrackTimingSettings
}

interface DirectorConsoleProps {
  sceneId: string
  sceneNumber: number
  projectId: string
  productionData: SceneProductionData | null
  sceneImageUrl?: string
  scene?: SceneAudioData
  onGenerate: (
    sceneId: string,
    segmentId: string,
    mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD',
    options?: {
      startFrameUrl?: string
      endFrameUrl?: string
      sourceVideoUrl?: string
      prompt?: string
      negativePrompt?: string
      duration?: number
      aspectRatio?: '16:9' | '9:16'
      resolution?: '720p' | '1080p'
      generationMethod?: VideoGenerationMethod
    }
  ) => Promise<void>
  onSegmentUpload?: (segmentId: string, file: File) => void
  /** Persist lock status to database */
  onLockSegment?: (segmentId: string, locked: boolean) => void
  /** Persist rendered scene URL to database */
  onRenderedSceneUrlChange?: (url: string | null) => void
  /** Persist production data (including production streams) to database */
  onProductionDataChange?: (data: SceneProductionData) => void
  /** Scene index (0-based) for audio generation API calls */
  sceneIndex?: number
  /** Generate audio for a specific scene, audio type, and language */
  onGenerateSceneAudio?: (sceneIdx: number, audioType: 'narration' | 'dialogue', characterName?: string, dialogueIndex?: number, language?: string) => void | Promise<void>
  /** Generate all audio for all scenes in a given language */
  onGenerateAllAudio?: (language?: string) => void | Promise<void>
  /** Whether audio generation is in progress */
  isGeneratingAudio?: boolean
  /** Persist keyframe after AI edit (DirectorDialog / pre-flight) */
  onSaveEditedKeyframe?: (
    sceneId: string,
    segmentId: string,
    frameType: 'start' | 'end',
    newFrameUrl: string
  ) => void
  /** User-initiated Hive validation report callback */
  onModerationReport?: (report: import('@/lib/moderation/moderationPipeline').ModerationReport) => void
  /** Character demographics for auto guide / Director dialog (falls back to scene.characters) */
  guideCharacters?: GuideCharacterDemographic[]
  /** Character references for DirectorDialog REF library */
  characters?: Array<{
    name: string
    referenceImage?: string
    description?: string
    wardrobes?: Array<{ id: string; name: string; headshotUrl?: string; fullBodyUrl?: string; previewImageUrl?: string }>
  }>
  /** Scene references for DirectorDialog REF library */
  sceneReferences?: Array<{ id: string; name: string; imageUrl?: string; description?: string }>
  /** Object/prop references for DirectorDialog REF library */
  objectReferences?: Array<{ id: string; name: string; imageUrl?: string; description?: string }>
  /** Location references for DirectorDialog REF library */
  locationReferences?: Array<{
    id: string
    location: string
    locationDisplay: string
    imageUrl: string
    description?: string
  }>
  /** Locked project aspect ratio from Blueprint */
  projectAspectRatio?: BlueprintAspectRatio
}

/** Slots for splitting Video / Mixer / Streams across parent section cards (ScriptPanel). */
export type DirectorWorkflowSlots = {
  videoSection: React.ReactNode
  mixerBody: React.ReactNode
  streamsBody: React.ReactNode
  streamCount: number
  mixerCollapsed: boolean
  setMixerCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  streamsCollapsed: boolean
  setStreamsCollapsed: React.Dispatch<React.SetStateAction<boolean>>
}

export type DirectorWorkflowProps = DirectorConsoleProps & {
  children: (slots: DirectorWorkflowSlots) => React.ReactNode
}

// Method badge colors and labels
const methodBadgeConfig: Record<VideoGenerationMethod, { label: string; className: string }> = {
  FTV: { label: 'INTERP', className: 'bg-purple-500/20 text-purple-300 border-purple-500/50' },
  I2V: { label: 'I2V', className: 'bg-blue-500/20 text-blue-300 border-blue-500/50' },
  T2V: { label: 'T2V', className: 'bg-green-500/20 text-green-300 border-green-500/50' },
  EXT: { label: 'EXT', className: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
  REF: { label: 'REF', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' },
}

// Status badge colors - Using film terminology
const statusBadgeConfig = {
  'auto-ready': { label: 'Ready', className: 'bg-slate-500/20 text-slate-300 border-slate-500/50', icon: Clock },
  'user-approved': { label: 'Approved', className: 'bg-blue-500/20 text-blue-300 border-blue-500/50', icon: CheckCircle },
  'locked': { label: 'Locked', className: 'bg-green-500/20 text-green-300 border-green-500/50', icon: CheckCircle },
  'rendering': { label: 'Rolling', className: 'bg-blue-500/20 text-blue-300 border-blue-500/50', icon: Loader2 },
  'rendered': { label: 'In the Can', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50', icon: Film },
  'error': { label: 'Error', className: 'bg-red-500/20 text-red-300 border-red-500/50', icon: AlertCircle },
}

function DirectorConsoleRoot({
  sceneId,
  sceneNumber,
  projectId,
  productionData,
  sceneImageUrl,
  scene,
  onGenerate,
  onSegmentUpload,
  onLockSegment,
  onRenderedSceneUrlChange,
  onProductionDataChange,
  sceneIndex,
  onGenerateSceneAudio,
  onGenerateAllAudio,
  isGeneratingAudio,
  onSaveEditedKeyframe,
  onModerationReport,
  guideCharacters,
  characters = [],
  sceneReferences = [],
  objectReferences = [],
  locationReferences = [],
  projectAspectRatio = '16:9',
  children,
}: DirectorConsoleProps & {
  children?: (slots: DirectorWorkflowSlots) => React.ReactNode
}) {
  // Use stable EMPTY_SEGMENTS constant to prevent TDZ render loops
  // productionData?.segments || [] creates a new array reference each render
  const segments = productionData?.segments ?? EMPTY_SEGMENTS
  const beatFirstReadOnlyPrompts = isBeatFirstPipelineEnabled()
  const aspectClass = getAspectRatioTailwindClass(projectAspectRatio)
  const videoAspectRatio = toVideoAspectRatio(projectAspectRatio)

  const effectiveGuideCharacters = useMemo(
    () =>
      guideCharacters ??
      normalizeGuideCharacters((scene as { characters?: unknown } | undefined)?.characters),
    [guideCharacters, scene]
  )

  const normalizedSceneSfx = useMemo(
    () => coerceSceneSfxFlatArray(scene?.sfx),
    [scene?.sfx]
  )

  const segmentGuideContext = useMemo<SegmentGuideContext | undefined>(() => {
    if (!scene) return undefined
    return {
      scene: {
        dialogue: scene.dialogue,
        sceneDirection: scene.sceneDirection,
        visualDescription: scene.visualDescription,
        action: scene.action,
        narration: scene.narration,
        music: scene.music,
        sfx: normalizedSceneSfx,
      },
      characters: effectiveGuideCharacters,
      sceneIndex,
      projectCharacters: characters,
      locationReferences,
      objectReferences,
      fullScene: scene as Record<string, unknown>,
    }
  }, [scene, effectiveGuideCharacters, normalizedSceneSfx, sceneIndex, characters, locationReferences, objectReferences])

  const videoGenerationAvailable = useMemo(
    () => segments.some(s => s.activeAssetUrl && s.status === 'COMPLETE'),
    [segments]
  )
  
  // Video queue state and actions
  const {
    queue,
    isRendering,
    progress,
    currentSegmentId,
    completedCount,
    failedCount,
    isRateLimitPaused,
    rateLimitCountdown,
    updateConfig,
    processQueue,
    cancelRendering,
    getQueueItem,
  } = useVideoQueue(
    segments,
    sceneId,
    sceneImageUrl,
    onGenerate,
    segmentGuideContext,
    () => productionData?.segments ?? EMPTY_SEGMENTS,
    videoAspectRatio
  )
  
  // Selected segment for DirectorDialog
  const [selectedSegment, setSelectedSegment] = useState<SceneSegment | null>(null)
  
  // Beat for VideoEditingDialog (editing completed videos)
  const [editingVideoSegment, setEditingVideoSegment] = useState<SceneSegment | null>(null)
  
  // Beat selection for batch operations (checkboxes)
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<string>>(new Set())
  
  // Toggle segment selection
  const toggleSegmentSelection = useCallback((segmentId: string, checked: boolean) => {
    setSelectedSegmentIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(segmentId)
      } else {
        next.delete(segmentId)
      }
      return next
    })
  }, [])
  
  // Select/deselect all segments
  const selectAllBeats = useCallback(() => {
    setSelectedSegmentIds(new Set(queue.map(q => q.segmentId)))
  }, [queue])
  
  const deselectAllBeats = useCallback(() => {
    setSelectedSegmentIds(new Set())
  }, [])
  
  // Scene video player modal state
  const [isScenePlayerOpen, setIsScenePlayerOpen] = useState(false)
  
  // Production Streams panel collapsed by default (expand when user needs exports)
  const [streamsCollapsed, setStreamsCollapsed] = useState(true)
  
  // Scene Production Mixer collapsed state with localStorage persistence (default: collapsed)
  const [mixerCollapsed, setMixerCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mixerCollapsed')
      return saved ? JSON.parse(saved) : true // Default collapsed
    }
    return true
  })
  
  // Scene render dialog state
  const [isRenderDialogOpen, setIsRenderDialogOpen] = useState(false)
  
  // Rendered scene MP4 URL (from Cloud Run render) - initialize from productionData
  const [renderedSceneUrl, setRenderedSceneUrl] = useState<string | null>(
    productionData?.renderedSceneUrl || null
  )
  
  // Scene video player for rendered MP4
  const [isRenderedScenePlayerOpen, setIsRenderedScenePlayerOpen] = useState(false)
  
  // Production streams state - multi-language video renders
  const [productionStreams, setProductionStreams] = useState<ProductionStream[]>(
    productionData?.productionStreams || []
  )
  const [renderingStreamId, setRenderingStreamId] = useState<string | null>(null)
  const [streamRenderProgress, setStreamRenderProgress] = useState(0)
  const [isUploadingStream, setIsUploadingStream] = useState(false)
  const [streamUploadError, setStreamUploadError] = useState<string | null>(null)
  const [productionTarget, setProductionTarget] = useState<ProductionTarget>({ streamType: 'video', language: 'en' })
  const prevProductionLanguageRef = useRef(productionTarget.language)
  const [renderDialogMode, setRenderDialogMode] = useState<'video' | 'animatic'>('video')
  const [renderDialogAnimaticSettings, setRenderDialogAnimaticSettings] = useState<
    Partial<Omit<AnimaticRenderSettings, 'type'>> | undefined
  >(undefined)

  const renderDialogLanguage = useMemo(() => {
    if (renderingStreamId) {
      return productionStreams.find(s => s.id === renderingStreamId)?.language ?? productionTarget.language
    }
    return productionTarget.language
  }, [renderingStreamId, productionStreams, productionTarget.language])
  
  // Text overlays state - titles, lower thirds, subtitles
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>(
    (productionData?.textOverlays as TextOverlay[]) || []
  )
  
  // Segment-specific playback: start player at this segment index
  const [playFromSegmentIndex, setPlayFromSegmentIndex] = useState<number>(0)
  
  // Cinematic Elements dialog state - opens for inserting new cinematic segment
  const [cinematicDialogSegmentIndex, setCinematicDialogSegmentIndex] = useState<number | null>(null)
  
  // Audio track selection for video playback overlay
  const [selectedAudioTracks, setSelectedAudioTracks] = useState<SelectedAudioTracks>(DEFAULT_AUDIO_TRACKS)
  
  // Audio track timing settings
  const [audioTrackTiming, setAudioTrackTiming] = useState<AudioTrackTimingState>({
    narration: { ...DEFAULT_TIMING },
    dialogue: { ...DEFAULT_TIMING },
    music: { ...DEFAULT_TIMING },
    sfx: { ...DEFAULT_TIMING },
  })
  
  // Persist mixerCollapsed to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mixerCollapsed', JSON.stringify(mixerCollapsed))
    }
  }, [mixerCollapsed])

  // Sync renderedSceneUrl when productionData changes (e.g., after page reload)
  useEffect(() => {
    if (productionData?.renderedSceneUrl && productionData.renderedSceneUrl !== renderedSceneUrl) {
      console.log('[DirectorConsole] Syncing renderedSceneUrl from productionData:', productionData.renderedSceneUrl)
      setRenderedSceneUrl(productionData.renderedSceneUrl)
    }
  }, [productionData?.renderedSceneUrl])

  // Sync productionStreams when productionData changes (e.g., after page reload)
  useEffect(() => {
    if (productionData) {
      const streamsFromData = productionData.productionStreams || []
      // Compare by ID to detect changes
      const currentIds = new Set(productionStreams.map(s => s.id))
      const newIds = new Set(streamsFromData.map((s: ProductionStream) => s.id))
      
      // Check if IDs are different OR if sizes are different
      const hasDifference = currentIds.size !== newIds.size || 
                           !Array.from(currentIds).every(id => newIds.has(id))
      
      if (hasDifference) {
        console.log('[DirectorConsole] Syncing productionStreams from productionData:', {
          before: productionStreams.length,
          after: streamsFromData.length,
          streams: streamsFromData.map((s: ProductionStream) => ({ id: s.id, status: s.status, language: s.language }))
        })
        setProductionStreams(streamsFromData)
      }
    }
  }, [productionData])

  const sceneHasDialogueAudioForLanguage = useCallback(
    (language: string): boolean => {
      const da = scene?.dialogueAudio
      if (!da) return false
      if (Array.isArray(da)) {
        return language === 'en' && da.some((entry) => !!entry?.audioUrl || (entry?.duration ?? 0) > 0)
      }
      const langEntries = da[language]
      return (
        Array.isArray(langEntries) &&
        langEntries.some((entry) => !!entry?.audioUrl || (entry?.duration ?? 0) > 0)
      )
    },
    [scene?.dialogueAudio]
  )

  useEffect(() => {
    const language = productionTarget.language
    if (prevProductionLanguageRef.current === language) return
    prevProductionLanguageRef.current = language

    if (!onProductionDataChange || !productionData?.isSegmented || !productionData.segments?.length) {
      return
    }
    if (!isBeatFirstPipelineEnabled()) return

    const sceneRecord = scene as Record<string, unknown> | undefined
    if (!sceneRecord || !isStoryboardApproved(sceneRecord)) return
    if (!sceneHasDialogueAudioForLanguage(language)) return

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/scenes/${encodeURIComponent(sceneId)}/derive-segments`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              language,
              existingSegments: productionData.segments,
            }),
          }
        )
        const data = await response.json()
        if (!response.ok || !data.success) {
          console.warn('[DirectorConsole] Language re-derive failed:', data.errors || data.error)
          return
        }
        onProductionDataChange({
          ...productionData,
          segments: data.segments || productionData.segments,
          lastGeneratedAt: new Date().toISOString(),
        })
        const languageInfo = SUPPORTED_LANGUAGES.find((l) => l.code === language)
        const { toast } = await import('sonner')
        toast.success(
          `Updated extension timing for ${languageInfo?.name ?? language}`
        )
      } catch (err) {
        console.warn('[DirectorConsole] Language re-derive error:', err)
      }
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [
    productionTarget.language,
    onProductionDataChange,
    productionData,
    scene,
    sceneId,
    projectId,
    sceneHasDialogueAudioForLanguage,
  ])

  // Get previous segment's last frame for Extend mode (prefer actual video frame over keyframe)
  const previousSegmentLastFrame = useMemo(() => {
    if (!editingVideoSegment || segments.length === 0) return null
    const currentIndex = segments.findIndex(s => s.segmentId === editingVideoSegment.segmentId)
    if (currentIndex <= 0) return null
    const previousSegment = segments[currentIndex - 1]
    
    // Priority 1: Get the latest successful take's actual last frame (extracted from video)
    const successfulTakes = previousSegment.takes?.filter(t => 
      t.status === 'done' && (t.lastFrameUrl || t.videoUrl || t.assetUrl)
    ) || []
    
    if (successfulTakes.length > 0) {
      const latestTake = successfulTakes[successfulTakes.length - 1]
      if (latestTake.lastFrameUrl) return latestTake.lastFrameUrl
      if (latestTake.thumbnailUrl) return latestTake.thumbnailUrl
    }
    
    // Priority 2: Fallback to pre-generated end keyframe
    return previousSegment.references?.endFrameUrl || null
  }, [editingVideoSegment, segments])
  
  // Update track timing
  const updateTrackTiming = useCallback((track: keyof AudioTrackTimingState, field: 'startTime' | 'duration', value: number) => {
    setAudioTrackTiming(prev => ({
      ...prev,
      [track]: {
        ...prev[track],
        [field]: Math.max(0, value),
      },
    }))
  }, [])
  
  // Toggle individual audio track
  const toggleAudioTrack = useCallback((track: keyof SelectedAudioTracks) => {
    setSelectedAudioTracks(prev => ({
      ...prev,
      [track]: !prev[track]
    }))
  }, [])
  
  // Handle saving config from dialog
  const handleSaveConfig = useCallback((config: VideoGenerationConfig) => {
    if (selectedSegment) {
      updateConfig(selectedSegment.segmentId, config)
      setSelectedSegment(null)
    }
  }, [selectedSegment, updateConfig])
  
  // Handle generate from dialog - saves config and triggers single segment generation
  // Pass config via overrideConfigs to bypass React state async timing issues
  const handleGenerateFromDialog = useCallback((segmentId: string, config: VideoGenerationConfig) => {
    updateConfig(segmentId, config)
    processQueue({
      mode: 'selected',
      priority: 'sequence',
      delayBetween: 6000,
      selectedIds: [segmentId],
      overrideConfigs: new Map([[segmentId, config]]),
    })
  }, [updateConfig, processQueue])
  
  // Handle batch render - approved only
  const handleRenderApproved = useCallback(() => {
    processQueue({
      mode: 'approved_only',
      priority: 'sequence',
      delayBetween: 6000,
    })
  }, [processQueue])
  
  // Handle batch render - all segments
  const handleRenderAll = useCallback(() => {
    processQueue({
      mode: 'all',
      priority: 'approved_first',
      delayBetween: 6000,
    })
  }, [processQueue])
  
  // Handle batch render — Express queues segments with REF or I2V configs
  const handleExpress = useCallback(() => {
    const expressIds = queue
      .filter((item) => {
        const segment = segments.find((s) => s.segmentId === item.segmentId)
        if (!segment) return false

        if (segment.lockedForProduction || item.config.approvalStatus === 'locked') return false

        const cfg = item.config
        const resolvedStart =
          (cfg.startFrameUrl && String(cfg.startFrameUrl).trim()) ||
          segment.startFrameUrl?.trim() ||
          segment.references?.startFrameUrl?.trim() ||
          (segment.sequenceIndex === 0 && sceneImageUrl?.trim() ? sceneImageUrl.trim() : '')

        const hasStartFrame = !!resolvedStart
        const hasRefs =
          (cfg.referenceImages?.length ?? 0) > 0 || cfg.mode === 'REF'
        const isCompleteOrRendering =
          item.status === 'complete' || item.status === 'rendering'

        return (hasRefs || hasStartFrame) && !isCompleteOrRendering
      })
      .map((item) => item.segmentId)

    if (expressIds.length === 0) {
      import('sonner').then(({ toast }) => {
        toast.info(
          'No eligible segments for Express — need beat references or a start Beat Frame, unlocked, and not already rendering.'
        )
      })
      return
    }

    processQueue({
      mode: 'selected',
      priority: 'sequence',
      delayBetween: 500,
      selectedIds: expressIds,
      concurrency: 3,
    })
  }, [queue, segments, sceneImageUrl, processQueue])

  // Toggle segment lock status (locked/unlocked) - persists to DB
  const handleToggleLock = useCallback((segmentId: string) => {
    const item = queue.find(q => q.segmentId === segmentId)
    const segment = segments.find(s => s.segmentId === segmentId)
    if (item && segment) {
      // Check current lock state from both sources (segment.lockedForProduction or config status)
      const isCurrentlyLocked = segment.lockedForProduction || item.config.approvalStatus === 'locked'
      const newLockState = !isCurrentlyLocked
      const newStatus = newLockState ? 'locked' : 'auto-ready'
      
      console.log('[DirectorConsole] Toggle lock:', { 
        segmentId, 
        currentLocked: isCurrentlyLocked,
        newLocked: newLockState,
        segmentLockedForProduction: segment.lockedForProduction,
        configApprovalStatus: item.config.approvalStatus
      })
      
      // Update local queue state
      updateConfig(segmentId, { ...item.config, approvalStatus: newStatus })
      
      // Persist to DB if callback provided
      if (onLockSegment) {
        console.log('[DirectorConsole] Calling onLockSegment:', segmentId, newLockState)
        onLockSegment(segmentId, newLockState)
      } else {
        console.warn('[DirectorConsole] onLockSegment callback not provided!')
      }
    }
  }, [queue, segments, updateConfig, onLockSegment])
  
  // Mark segment for "Retake" - opens dialog for user to configure regeneration
  const handleMarkRetake = useCallback((segmentId: string) => {
    const segment = segments.find(s => s.segmentId === segmentId)
    if (segment) {
      // Open DirectorDialog so user can review/edit settings before regenerating
      setSelectedSegment(segment)
    }
  }, [segments])
  
  // === Text Overlay Handlers ===
  
  // Handle text overlay changes - update local state and persist to database
  const handleTextOverlaysChange = useCallback((newOverlays: TextOverlay[]) => {
    setTextOverlays(newOverlays)
    
    // Persist to database via onProductionDataChange
    if (onProductionDataChange && productionData) {
      onProductionDataChange({
        ...productionData,
        textOverlays: newOverlays as import('./types').TextOverlayData[],
      })
    }
  }, [onProductionDataChange, productionData])
  
  // === Production Streams Handlers ===
  
  // Delete a production stream
  const handleDeleteStream = useCallback((streamId: string) => {
    const updatedStreams = productionStreams.filter(s => s.id !== streamId)
    setProductionStreams(updatedStreams)
    
    // Persist to database
    if (onProductionDataChange && productionData) {
      onProductionDataChange({
        ...productionData,
        productionStreams: updatedStreams,
      })
    }
  }, [productionStreams, productionData, onProductionDataChange])
  
  // Re-render an existing production stream
  const handleReRenderStream = useCallback(async (streamId: string) => {
    const stream = productionStreams.find(s => s.id === streamId)
    if (!stream) return

    const st = stream.streamType || 'animatic'
    const nextVer = getNextProductionStreamVersion(productionStreams, stream.language, st)
    const newId = `stream-${st}-${stream.language}-v${nextVer}-${Date.now()}`
    const newStream: ProductionStream = {
      ...stream,
      id: newId,
      streamVersion: nextVer,
      status: 'rendering',
      mp4Url: undefined,
      completedAt: undefined,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      error: undefined,
      renderJobId: undefined,
    }
    const updatedStreams = [...productionStreams, newStream]
    setProductionStreams(updatedStreams)
    setRenderingStreamId(newId)
    setStreamRenderProgress(0)
    setProductionTarget(prev => ({ ...prev, streamType: stream.streamType, language: stream.language }))
    setRenderDialogMode(stream.streamType === 'video' ? 'video' : 'animatic')
    if (stream.streamType === 'animatic' && stream.renderSettings?.type === 'animatic') {
      const rs = stream.renderSettings
      setRenderDialogAnimaticSettings({
        kenBurnsIntensity: rs.kenBurnsIntensity,
        transitionStyle: rs.transitionStyle,
        transitionDuration: rs.transitionDuration,
        includeSubtitles: rs.includeSubtitles,
        subtitleStyle: rs.subtitleStyle,
      })
    } else {
      setRenderDialogAnimaticSettings(undefined)
    }
    
    if (onProductionDataChange && productionData) {
      onProductionDataChange({
        ...productionData,
        productionStreams: updatedStreams,
      })
    }

    setIsRenderDialogOpen(true)
  }, [productionStreams, productionData, onProductionDataChange])
  
  // Preview a production stream
  const handlePreviewStream = useCallback((streamId: string, mp4Url: string) => {
    const stream = productionStreams.find(s => s.id === streamId)
    if (stream) {
      setRenderedSceneUrl(mp4Url)
      setIsRenderedScenePlayerOpen(true)
    }
  }, [productionStreams])
  
  // Download a production stream
  const handleDownloadStream = useCallback(async (streamId: string, mp4Url: string, language: string) => {
    const stream = productionStreams.find(s => s.id === streamId)
    const label = stream ? getProductionStreamDisplayName(stream) : `${language} v${stream?.streamVersion ?? 1}`
    const safeName = label.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || `scene-${sceneNumber}-${language}`
    const filename = `${safeName}.mp4`
    await forceDownload(mp4Url, filename)
  }, [sceneNumber, productionStreams])

  const extractVideoDuration = useCallback((file: File): Promise<number | undefined> => {
    if (!file.type.startsWith('video')) return Promise.resolve(undefined)
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      const objectUrl = URL.createObjectURL(file)
      video.onloadedmetadata = () => {
        const duration = video.duration
        URL.revokeObjectURL(objectUrl)
        if (Number.isFinite(duration) && duration > 0) resolve(duration)
        else resolve(undefined)
      }
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(undefined)
      }
      video.src = objectUrl
    })
  }, [])

  const handleUploadStream = useCallback(
    async (streamType: ProductionStreamType, file: File) => {
      setIsUploadingStream(true)
      setStreamUploadError(null)
      const language = productionTarget.language
      const languageInfo = SUPPORTED_LANGUAGES.find((l) => l.code === language)
      try {
        const fileExt = file.name.split('.').pop() || 'mp4'
        const nextVer = getNextProductionStreamVersion(productionStreams, language, streamType)
        const blob = await upload(
          `production-streams/${projectId}/${sceneId}/${streamType}-v${nextVer}-${Date.now()}.${fileExt}`,
          file,
          {
            access: 'public',
            handleUploadUrl: '/api/segments/upload-video-url',
          }
        )
        const duration = await extractVideoDuration(file)
        const baseName = file.name.replace(/\.[^/.]+$/, '').trim()
        const typeLabel = streamType === 'video' ? 'Video' : 'Animatic'
        const streamId = `stream-upload-${streamType}-${language}-v${nextVer}-${Date.now()}`
        const newStream: ProductionStream = {
          id: streamId,
          streamType,
          streamVersion: nextVer,
          language,
          languageLabel: languageInfo?.name || language,
          displayName: baseName || `${languageInfo?.name || language} ${typeLabel}`,
          source: 'upload',
          status: 'complete',
          mp4Url: blob.url,
          fileSize: file.size,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          ...(duration !== undefined ? { duration } : {}),
        }
        const updatedStreams = [...productionStreams, newStream]
        setProductionStreams(updatedStreams)
        if (onProductionDataChange && productionData) {
          onProductionDataChange({
            ...productionData,
            productionStreams: updatedStreams,
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setStreamUploadError(message)
        console.error('[DirectorConsole] Stream upload failed:', err)
      } finally {
        setIsUploadingStream(false)
      }
    },
    [
      productionTarget.language,
      productionStreams,
      projectId,
      sceneId,
      productionData,
      onProductionDataChange,
      extractVideoDuration,
    ]
  )

  const handleRenameStream = useCallback(
    (streamId: string, displayName: string) => {
      const trimmed = displayName.trim()
      const updatedStreams = productionStreams.map((s) =>
        s.id === streamId ? { ...s, displayName: trimmed || undefined } : s
      )
      setProductionStreams(updatedStreams)
      if (onProductionDataChange && productionData) {
        onProductionDataChange({
          ...productionData,
          productionStreams: updatedStreams,
        })
      }
    },
    [productionStreams, productionData, onProductionDataChange]
  )
  
  // Update stream when render completes
  const handleRenderComplete = useCallback((
    downloadUrl: string,
    streamType?: 'video' | 'animatic',
    meta?: { durationSeconds?: number }
  ) => {
    console.log('[DirectorConsole] Scene render complete:', downloadUrl)
    setRenderedSceneUrl(downloadUrl)
    
    if (renderingStreamId) {
      const dur =
        typeof meta?.durationSeconds === 'number' &&
        Number.isFinite(meta.durationSeconds) &&
        meta.durationSeconds > 0
          ? meta.durationSeconds
          : undefined
      const updatedStreams = productionStreams.map(s => 
        s.id === renderingStreamId 
          ? { 
              ...s, 
              status: 'complete' as const, 
              mp4Url: downloadUrl,
              completedAt: new Date().toISOString(),
              streamType: streamType === 'animatic' ? 'animatic' as const : 'video' as const,
              ...(dur !== undefined ? { duration: dur } : {}),
            }
          : s
      )
      setProductionStreams(updatedStreams)
      setRenderingStreamId(null)
      setStreamRenderProgress(0)
      
      // Persist production streams to database
      if (onProductionDataChange && productionData) {
        onProductionDataChange({
          ...productionData,
          productionStreams: updatedStreams,
        })
      }
    }
    
    // Persist rendered scene URL to database
    if (onRenderedSceneUrlChange) {
      onRenderedSceneUrlChange(downloadUrl)
    }
  }, [renderingStreamId, productionStreams, productionData, onProductionDataChange, onRenderedSceneUrlChange])
  
  // Count segments by status
  const statusCounts = {
    approved: queue.filter(q => q.config.approvalStatus === 'user-approved').length,
    autoReady: queue.filter(q => q.config.approvalStatus === 'auto-ready').length,
    locked: queue.filter(q => q.config.approvalStatus === 'locked').length,
    rendered: queue.filter(q => q.status === 'complete').length,
    retakes: queue.filter(q => q.status === 'complete' && q.config.approvalStatus === 'auto-ready').length,
    total: queue.length,
  }
  
  // Count selected segments that are NOT locked (eligible for generation)
  const selectedUnlockedCount = Array.from(selectedSegmentIds).filter(id => {
    const item = queue.find(q => q.segmentId === id)
    return item && item.config.approvalStatus !== 'locked'
  }).length

  // No segments state
  if (segments.length === 0) {
    return (
      <div className="p-8 text-center">
        <Clapperboard className="w-16 h-16 mx-auto mb-4 text-slate-500 opacity-30" />
        <h3 className="!text-base !leading-normal font-semibold text-slate-300 mb-2">No Beats Available</h3>
        <p className="text-sm text-slate-500">
          Initialize scene production in the Frame step first to create video segments.
        </p>
      </div>
    )
  }

  const streamsBody = (
    <ProductionStreamsPanel
      productionStreams={productionStreams}
      selectedLanguage={productionTarget.language}
      streamType={productionTarget.streamType}
      onStreamTypeChange={(streamType) =>
        setProductionTarget((prev) => ({ ...prev, streamType }))
      }
      onRenderAnimatic={undefined}
      onDeleteStream={handleDeleteStream}
      onReRenderStream={handleReRenderStream}
      onPreviewStream={handlePreviewStream}
      onDownloadStream={handleDownloadStream}
      onUploadStream={handleUploadStream}
      onRenameStream={handleRenameStream}
      isRendering={!!renderingStreamId}
      renderingStreamId={renderingStreamId}
      renderProgress={streamRenderProgress}
      isUploadingStream={isUploadingStream}
      streamUploadError={streamUploadError}
      onDismissStreamUploadError={() => setStreamUploadError(null)}
      hasSegmentChanges={false}
      videoGenerationAvailable={videoGenerationAvailable}
      disabled={isRendering}
    />
  )

  const mixerBody =
    segments.length > 0 && sceneId ? (
      <SceneProductionMixer
        sceneId={sceneId}
        sceneNumber={sceneNumber}
        projectId={projectId}
        segments={segments}
        productionData={productionData}
        audioAssets={{
          narrationAudioUrl: scene?.narrationAudioUrl,
          narrationAudio: scene?.narrationAudio,
          narration: scene?.narration,
          dialogueAudio: scene?.dialogueAudio,
          dialogue: scene?.dialogue,
          musicAudio: scene?.musicAudio,
          music: scene?.music,
          musicDuration: (scene as { musicDuration?: number })?.musicDuration,
          musicFileDuration: (scene as { musicFileDuration?: number })?.musicFileDuration,
          sfx: normalizedSceneSfx,
        }}
        textOverlays={textOverlays}
        onTextOverlaysChange={handleTextOverlaysChange}
        sceneIndex={sceneIndex}
        onGenerateSceneAudio={onGenerateSceneAudio}
        onGenerateAllAudio={onGenerateAllAudio}
        isGeneratingAudio={isGeneratingAudio}
        productionTarget={productionTarget}
        onProductionTargetChange={setProductionTarget}
        videoGenerationAvailable={videoGenerationAvailable}
        onSegmentsChange={(updatedSegments) => {
          if (onProductionDataChange && productionData) {
            onProductionDataChange({
              ...productionData,
              segments: updatedSegments,
            })
          }
        }}
        onRenderComplete={(downloadUrl, language, streamType = productionTarget.streamType, meta) => {
          setRenderedSceneUrl(downloadUrl)
          const languageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language)
          const st = streamType === 'animatic' ? 'animatic' : 'video'
          const updatedStreams = (() => {
            const prev = productionStreams
            const v = getNextProductionStreamVersion(prev, language, st)
            const id = `stream-${st}-${language}-v${v}-${Date.now()}`
            return [
              ...prev,
              {
                id,
                language,
                languageLabel: languageInfo?.name || language,
                status: 'complete' as const,
                streamType: st,
                streamVersion: v,
                mp4Url: downloadUrl,
                completedAt: new Date().toISOString(),
                duration:
                  typeof meta?.durationSeconds === 'number' &&
                  Number.isFinite(meta.durationSeconds) &&
                  meta.durationSeconds > 0
                    ? meta.durationSeconds
                    : undefined,
              } satisfies ProductionStream,
            ]
          })()
          setProductionStreams(updatedStreams)
          if (onRenderedSceneUrlChange) {
            onRenderedSceneUrlChange(downloadUrl)
          }
          if (onProductionDataChange) {
            const baseData = productionData || { isSegmented: false, segments: [] }
            onProductionDataChange({
              ...baseData,
              renderedSceneUrl: downloadUrl,
              renderedAt: new Date().toISOString(),
              productionStreams: updatedStreams,
            } as SceneProductionData)
          }
          import('sonner').then(({ toast }) => {
            toast.success('Stream rendered', {
              description: 'Review the MP4 in Streams or open Screening Room.',
              action: {
                label: 'Play in Streams',
                onClick: () => setStreamsCollapsed(false),
              },
            })
          })
        }}
        onProductionStreamsChange={(streams) => {
          setProductionStreams(streams)
        }}
        isGeneratingBeats={isRendering}
      />
    ) : null

  const generateControls = (
    <div className="flex flex-wrap gap-2 justify-end">
      {isRendering ? (
        <>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {isRateLimitPaused ? (
              <>
                <span className="text-amber-400 font-medium">⏸ Rate Limited</span>
                <span className="text-amber-300">Resuming in {rateLimitCountdown}s...</span>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  Rendering {completedCount + 1} of {queue.length}...
                </span>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={cancelRendering} className="bg-slate-800 border-slate-700 text-slate-300">
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExpress}
            disabled={queue.length === 0}
            className="border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-400 shadow-md hover:shadow-lg transition-all"
            title="Express: batch-generate video for unlocked segments with beat references or a start Beat Frame"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Express
          </Button>
          {statusCounts.rendered > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsScenePlayerOpen(true)}
              className="bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30"
            >
              <Film className="w-4 h-4 mr-2" />
              Play Beats ({statusCounts.rendered})
            </Button>
          )}
        </>
      )}
    </div>
  )

  const videoSection = (
    <div id={`director-console-${sceneId}`} className="scroll-mt-4 space-y-4">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 p-2 sm:p-3 border-b border-gray-700/40">
          <ProductionSectionHeader
            icon={Film}
            title="Footage"
            badge={`${statusCounts.rendered}/${statusCounts.total}`}
            rightHint="Generate video clips from Beat Frames using AI"
            className="flex-1 min-w-0 border-0 p-0"
          />
          <div className="flex-shrink-0 px-1 sm:px-0">{generateControls}</div>
        </div>
        <div className="px-4 pb-4 pt-3 space-y-4 border-t border-gray-700/50">
            {isRendering && (
              <div className="space-y-2">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${isRateLimitPaused ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{completedCount} completed</span>
                  {isRateLimitPaused && <span className="text-amber-400">⏸ Paused ({rateLimitCountdown}s)</span>}
                  {failedCount > 0 && <span className="text-red-400">{failedCount} failed</span>}
                  <span>{progress}%</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {queue.map((item) => {
                const segment = segments.find(s => s.segmentId === item.segmentId)
                if (!segment) return null
                const methodConfig = methodBadgeConfig[item.config.mode] || methodBadgeConfig['I2V']
                const statusConfig = statusBadgeConfig[item.config.approvalStatus] || statusBadgeConfig['auto-ready']
                const StatusIcon = statusConfig.icon
                const isCurrentlyRendering = currentSegmentId === item.segmentId
                return (
                  <div
                    key={item.segmentId}
                    className={`
                border rounded-lg p-4 transition-all 
                hover:border-indigo-500/70 hover:bg-slate-800/50
                ${item.config.approvalStatus === 'user-approved' ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-slate-800/30 border-slate-700/50'}
                ${selectedSegmentIds.has(item.segmentId) ? 'ring-4 ring-amber-500 bg-amber-500/10' : ''}
                ${isCurrentlyRendering ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : ''}
              `}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 flex items-start pt-1">
                        <Checkbox
                          checked={selectedSegmentIds.has(item.segmentId)}
                          onCheckedChange={(checked) => toggleSegmentSelection(item.segmentId, checked === true)}
                          className="border-slate-500"
                        />
                      </div>
                      <div className={`w-32 ${aspectClass} bg-black rounded overflow-hidden relative flex-shrink-0`}>
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={`Beat ${item.sequenceIndex + 1}`} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800">
                            <Film className="w-8 h-8 text-slate-600" />
                          </div>
                        )}
                        <Badge variant="outline" className={`absolute bottom-1 right-1 text-[10px] px-1.5 py-0 ${methodConfig.className}`}>
                          {methodConfig.label}
                        </Badge>
                        {isCurrentlyRendering && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                          </div>
                        )}
                        {item.status === 'complete' && !isCurrentlyRendering && (
                          <>
                            <div className="absolute top-1 left-1 flex items-center gap-1">
                              <Badge className="bg-emerald-500/80 text-white text-[10px] px-1.5 py-0">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Done
                              </Badge>
                              {segment.isUserUpload && (
                                <Badge className="bg-sky-500/80 text-white text-[10px] px-1.5 py-0">
                                  <CloudUpload className="w-3 h-3 mr-1" />
                                  Uploaded
                                </Badge>
                              )}
                              {item.config.approvalStatus === 'locked' && (
                                <Badge className="bg-amber-500/80 text-white text-[10px] px-1.5 py-0">
                                  <ShieldCheck className="w-3 h-3" />
                                </Badge>
                              )}
                            </div>
                            <button
                              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group"
                              onClick={(e) => {
                                e.stopPropagation()
                                const segmentIndex = segments.findIndex(s => s.segmentId === item.segmentId)
                                if (segmentIndex >= 0) {
                                  setPlayFromSegmentIndex(segmentIndex)
                                  setIsScenePlayerOpen(true)
                                }
                              }}
                              title="Play beat video"
                            >
                              <PlayCircle className="w-10 h-10 text-white/0 group-hover:text-white/90 transition-colors drop-shadow-lg" />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold text-slate-200">Beat {item.sequenceIndex + 1}</span>
                          <Badge variant="outline" className={`flex items-center gap-1 text-[10px] ${statusConfig.className}`}>
                            <StatusIcon className={`w-3 h-3 ${item.config.approvalStatus === 'rendering' ? 'animate-spin' : ''}`} />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                          {item.config.prompt || 'No prompt configured'}
                        </p>
                        {beatFirstReadOnlyPrompts && (
                          <p className="text-[10px] text-slate-500 mt-1">
                            Auto-derived from direction — edit script or Pre-Vis to change
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          {segment.veoTimelineContinuation && (
                            <>
                              <span className="text-cyan-400/90">Auto Veo extension</span>
                              <span>•</span>
                            </>
                          )}
                          {segment.isUserUpload ? (
                            <>
                              <span className="text-sky-400 font-medium">
                                {segment.actualVideoDuration ? `${Math.round(segment.actualVideoDuration)}s` : `${item.config.duration}s`}
                              </span>
                              <span>•</span>
                              <span>{item.config.aspectRatio}</span>
                              <span>•</span>
                              <span className="text-sky-400">User Upload</span>
                            </>
                          ) : (
                            <>
                              <span>{item.config.duration}s</span>
                              <span>•</span>
                              <span>{item.config.aspectRatio}</span>
                              <span>•</span>
                              <span>{item.config.confidence}% confidence</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">
                        {onSegmentUpload && (
                          <>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              id={`upload-video-${item.segmentId}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  onSegmentUpload(item.segmentId, file)
                                }
                                e.target.value = ''
                              }}
                              disabled={item.config.approvalStatus === 'locked'}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={
                                    item.config.approvalStatus === 'locked'
                                      ? 'text-slate-600 cursor-not-allowed opacity-50'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }
                                  disabled={item.config.approvalStatus === 'locked'}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (item.config.approvalStatus === 'locked') {
                                      import('sonner').then(({ toast }) => {
                                        toast.error('Beat is protected', {
                                          description: 'Unprotect this segment first to upload a new video',
                                        })
                                      })
                                      return
                                    }
                                    document.getElementById(`upload-video-${item.segmentId}`)?.click()
                                  }}
                                >
                                  <Upload className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {item.config.approvalStatus === 'locked' ? 'Unprotect segment to upload' : 'Upload Video'}
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {onModerationReport &&
                          projectId &&
                          segment.isUserUpload &&
                          segment.assetType === 'video' &&
                          segment.activeAssetUrl &&
                          item.status === 'complete' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <ModerationValidateButton
                                  projectId={projectId}
                                  stage="fal_video"
                                  source="segment_asset"
                                  resourceId={item.segmentId}
                                  label="Validate"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-slate-500 hover:text-indigo-300"
                                  onReport={onModerationReport}
                                />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Validate uploaded video with Hive (credit charge)
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 px-2"
                          onClick={() => setSelectedSegment(segment)}
                        >
                          <Settings2 className="w-3.5 h-3.5 mr-1" />
                          Take ({segment.takes?.length || 1})
                        </Button>
                      </div>
                    </div>
                    {item.status === 'complete' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={item.config.approvalStatus === 'locked' ? 'default' : 'outline'}
                              size="sm"
                              className={
                                item.config.approvalStatus === 'locked'
                                  ? 'flex-1 bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'flex-1 bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                              }
                              onClick={() => handleToggleLock(item.segmentId)}
                            >
                              {item.config.approvalStatus === 'locked' ? (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                                  Protected
                                </>
                              ) : (
                                <>
                                  <Shield className="w-3.5 h-3.5 mr-1.5" />
                                  Protect
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {item.config.approvalStatus === 'locked'
                              ? 'Unprotect to allow replacement'
                              : 'Protect this segment from batch operations'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
        </div>
      </div>
    </div>
  )

  const defaultWorkflowLayout = (
    <div className="space-y-4">
      {videoSection}
      {segments.length > 0 && sceneId && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
          <ProductionSectionHeader
            icon={Clapperboard}
            title="Mixer"
            rightHint="Render final scene with audio"
            collapsible
            expanded={!mixerCollapsed}
            onToggle={() => setMixerCollapsed((c) => !c)}
          />
          <AnimatePresence>
            {!mixerCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-gray-700/50"
              >
                {mixerBody}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
        <ProductionSectionHeader
          icon={ListVideo}
          title="Streams — Export (MP4)"
          badge={productionStreams.length}
          rightHint="Finished MP4 library — not live preview"
          collapsible
          expanded={!streamsCollapsed}
          onToggle={() => setStreamsCollapsed((c) => !c)}
        />
        <AnimatePresence>
          {!streamsCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-700/50 px-3 pb-3 pt-2 overflow-hidden"
            >
              {streamsBody}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  return (
    <TooltipProvider>
      {children ? (
        children({
          videoSection,
          mixerBody,
          streamsBody,
          streamCount: productionStreams.length,
          mixerCollapsed,
          setMixerCollapsed,
          streamsCollapsed,
          setStreamsCollapsed,
        })
      ) : (
        defaultWorkflowLayout
      )}

      {/* DirectorDialog Modal */}
      {selectedSegment && (
        <DirectorDialog 
          segment={selectedSegment}
          sceneId={sceneId}
          sceneImageUrl={sceneImageUrl}
          scene={scene}
          isOpen={!!selectedSegment}
          onClose={() => setSelectedSegment(null)}
          onSaveConfig={handleSaveConfig}
          onGenerate={handleGenerateFromDialog}
          savedConfig={getQueueItem(selectedSegment.segmentId)?.config}
          projectId={projectId}
          onSaveEditedKeyframe={onSaveEditedKeyframe}
          guideCharacters={effectiveGuideCharacters}
          readOnlyPrompts={beatFirstReadOnlyPrompts}
          characterReferences={characters}
          sceneReferences={sceneReferences}
          objectReferences={objectReferences}
          locationReferences={locationReferences}
          projectAspectRatio={projectAspectRatio}
          sceneIndex={sceneIndex}
        />
      )}
      
      {/* SceneVideoPlayer Modal */}
      <SceneVideoPlayer
        segments={segments}
        sceneNumber={sceneNumber}
        isOpen={isScenePlayerOpen}
        onClose={() => {
          setIsScenePlayerOpen(false)
          setPlayFromSegmentIndex(0)
        }}
        startAtSegment={playFromSegmentIndex}
        audioTracks={selectedAudioTracks}
        sceneAudio={{
          narrationUrl: scene?.narrationAudioUrl,
          musicUrl: scene?.musicAudio,
          // Collect dialogue audio URLs
          dialogueUrls: scene?.dialogueAudio?.en?.map(d => d?.audioUrl).filter(Boolean) || [],
          // Collect SFX audio URLs
          sfxUrls: normalizedSceneSfx
            .filter(
              (s): s is { audioUrl: string } =>
                typeof s === 'object' && !!s && typeof (s as { audioUrl?: string }).audioUrl === 'string'
            )
            .map((s) => s.audioUrl),
        }}
        audioConfig={{
          narration: scene?.narrationAudioUrl ? {
            url: scene.narrationAudioUrl,
            startTime: audioTrackTiming.narration.startTime,
            duration: audioTrackTiming.narration.duration,
            volume: 0.8,
          } : undefined,
          music: scene?.musicAudio ? {
            url: scene.musicAudio,
            startTime: audioTrackTiming.music.startTime,
            duration: audioTrackTiming.music.duration,
            volume: 0.5,
            loop: false,
          } : undefined,
          dialogue: scene?.dialogueAudio?.en?.filter(d => d?.audioUrl).map((d, i) => ({
            url: d.audioUrl!,
            startTime: audioTrackTiming.dialogue.startTime + (i * 2), // Stagger dialogue lines
            duration: audioTrackTiming.dialogue.duration,
            volume: 0.9,
          })),
          sfx: normalizedSceneSfx
            .filter(
              (s): s is { audioUrl: string } =>
                typeof s === 'object' && !!s && typeof (s as { audioUrl?: string }).audioUrl === 'string'
            )
            .map((s, i) => ({
              url: s.audioUrl,
              startTime: audioTrackTiming.sfx.startTime + i * 1,
              duration: audioTrackTiming.sfx.duration,
              volume: 0.6,
            })),
        } as SceneAudioConfig}
      />
      
      {/* VideoEditingDialog for editing completed segment videos */}
      {editingVideoSegment && (
        <VideoEditingDialog
          open={!!editingVideoSegment}
          onClose={() => setEditingVideoSegment(null)}
          segment={editingVideoSegment}
          allSegments={segments}
          sceneImageUrl={sceneImageUrl}
          characters={scene?.characters}
          previousSegmentLastFrame={previousSegmentLastFrame}
          onGenerate={async (data) => {
            // Map VideoEditingDialog data to VideoGenerationConfig
            const segmentId = editingVideoSegment.segmentId
            const updatedConfig = {
              ...editingVideoSegment.config,
              mode: data.method,
              prompt: data.prompt,
              negativePrompt: data.negativePrompt || editingVideoSegment.config.negativePrompt,
              duration: data.duration || editingVideoSegment.config.duration,
              aspectRatio: data.aspectRatio || editingVideoSegment.config.aspectRatio,
              resolution: data.resolution || editingVideoSegment.config.resolution,
            }
            updateConfig(segmentId, updatedConfig)
            // Pass config via overrideConfigs to bypass React state async timing
            processQueue({
              mode: 'selected',
              priority: 'sequence',
              delayBetween: 6000,
              selectedIds: [segmentId],
              overrideConfigs: new Map([[segmentId, updatedConfig]]),
            })
            setEditingVideoSegment(null)
          }}
          isGenerating={isRendering && currentSegmentId === editingVideoSegment.segmentId}
        />
      )}
      
      {/* Scene Render Dialog - for exporting scene as MP4 */}
      <SceneRenderDialog
        open={isRenderDialogOpen}
        onOpenChange={(open) => {
          setIsRenderDialogOpen(open)
          if (!open) {
            setRenderDialogAnimaticSettings(undefined)
          }
        }}
        sceneId={sceneId}
        sceneNumber={sceneNumber}
        projectId={projectId}
        segments={segments}
        productionData={productionData}
        renderMode={renderDialogMode}
        initialLanguage={renderDialogLanguage}
        animaticRenderSettings={renderDialogAnimaticSettings}
        audioData={{
          narrationUrl: scene?.narrationAudioUrl || scene?.narrationAudio?.[renderDialogLanguage]?.url,
          narrationDuration: scene?.narrationAudio?.[renderDialogLanguage]?.duration ?? 30,
          dialogueEntries: (() => {
            const dAudio = scene?.dialogueAudio
            const arr = Array.isArray(dAudio) ? dAudio : dAudio?.[renderDialogLanguage] || []
            return arr.filter(Boolean).map((d: { audioUrl?: string; duration?: number; character?: string }, i: number) => ({
              audioUrl: d?.audioUrl,
              duration: d?.duration ?? 3,
              character: scene?.dialogue?.[i]?.character || d?.character,
            }))
          })(),
          musicUrl: scene?.musicAudio,
          musicDuration:
            (scene as { musicDuration?: number })?.musicDuration ??
            (scene as { musicFileDuration?: number })?.musicFileDuration ??
            30,
          sfxUrl: scene?.sfx?.find(s => s.audioUrl)?.audioUrl,
          sfxDuration: 5,
        }}
        onRenderComplete={handleRenderComplete}
      />
      
      {/* Rendered Scene MP4 Player Modal */}
      {isRenderedScenePlayerOpen && renderedSceneUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl p-4">
            <button
              onClick={() => setIsRenderedScenePlayerOpen(false)}
              className="absolute -top-2 -right-2 z-10 p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-300"
            >
              ✕
            </button>
            <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
              <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                <h3 className="!text-sm !leading-normal !mb-0 text-white font-medium flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-cyan-400" />
                  Scene {sceneNumber} - Rendered Video
                </h3>
                <button
                  onClick={() => renderedSceneUrl && forceDownload(renderedSceneUrl, `scene-${sceneNumber}.mp4`)}
                  className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download MP4
                </button>
              </div>
              <video
                src={renderedSceneUrl}
                controls
                autoPlay
                className={`w-full ${aspectClass} bg-black`}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* AddSpecialSegmentDialog for inserting cinematic elements */}
      <AddSpecialSegmentDialog
        open={cinematicDialogSegmentIndex !== null}
        onOpenChange={(open) => {
          if (!open) setCinematicDialogSegmentIndex(null)
        }}
        sceneId={sceneId}
        sceneNumber={sceneNumber}
        existingSegments={segments}
        insertAfterIndex={cinematicDialogSegmentIndex ?? undefined}
        adjacentContext={{
          currentScene: {
            heading: scene?.sceneHeading,
            action: scene?.action,
            narration: scene?.narration,
            dialogue: scene?.dialogue?.map(d => ({ character: d.character, text: d.line })),
          },
          // Adjacent context could be enhanced with previous/next scene data if available
        }}
        onAddSegment={(segmentData) => {
          // Handle adding the new cinematic segment
          if (onProductionDataChange && productionData) {
            const idx = segmentData.insertIndex ?? segments.length
            const newSegments = [...segments]
            
            newSegments.splice(idx, 0, {
              ...segmentData,
              segmentId: segmentData.segmentId || `segment-${Date.now()}`
            } as SceneSegment)
            
            // Recalculate sequenceIndex and timing for all segments
            let currentTime = 0
            const renumberedSegments = newSegments.map((seg, i) => {
              const duration = seg.endTime - seg.startTime
              const updated = {
                ...seg,
                sequenceIndex: i,
                startTime: currentTime,
                endTime: currentTime + duration,
              }
              currentTime += duration
              return updated
            })
            
            onProductionDataChange({
              ...productionData,
              segments: renumberedSegments
            })
          }
          
          import('sonner').then(({ toast }) => {
            toast.success(`${segmentData.segmentPurpose} segment added!`, {
              description: 'Configure it in the Director Dialog to generate video.',
            })
          })
          setCinematicDialogSegmentIndex(null)
        }}
        filmContext={{
          title: scene?.filmTitle,
          genre: scene?.genre ? [scene.genre] : undefined,
          tone: scene?.tone,
        }}
      />
      
    </TooltipProvider>
  )
}

export function DirectorWorkflow(props: DirectorWorkflowProps) {
  return <DirectorConsoleRoot {...props} />
}

export function DirectorConsole(props: DirectorConsoleProps) {
  return <DirectorConsoleRoot {...props} />
}

export default DirectorConsole
