/**
 * DirectorConsole - Call Action Dashboard
 * 
 * The main view for the Director's Console "Pre-Flight" workflow.
 * Lists segments with "Ready" status and allows:
 * - Clicking a segment to open DirectorDialog for granular control
 * - Batch rendering with "Render Approved Only" or "Render All" modes
 * 
 * Status Indicators (Footage cards):
 * - Ready: Beat configured, no video yet
 * - Rolling: Video generation in progress
 * - In the Can: Video complete and ready to use
 * - Error: Generation failed
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { coerceSceneSfxFlatArray } from '@/lib/script/segmentScript'
import { resolveSceneSfxUrl } from '@/components/vision/scene-production/audioTrackBuilder'
import type { BlueprintAspectRatio } from '@/lib/treatment/blueprintFoundation'
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
  Clapperboard,
  Mic2,
  Volume2,
  MessageSquare,
  Music,
  Upload,
  RefreshCw,
  PlayCircle,
  Timer,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Wand2,
  ListVideo,
  Zap,
} from 'lucide-react'
import type { 
  SceneSegment, 
  DirectorQueueItem,
  VideoGenerationConfig,
  VideoGenerationMethod,
  SceneProductionData,
  ProductionStream,
  ProductionStreamType,
  TextOverlay,
  ProductionTarget,
  AnimaticRenderSettings,
  MixerSettingsPersistPayload,
} from './types'
import { migrateMixerSettingsByLanguage } from '@/lib/scene/mixerSettings'
// Dynamic import for DirectorDialog — heavy module (aggregator registry, useSegmentConfig,
// ImageEditModal) shared with useVideoQueue in this chunk; static import causes webpack TDZ
// ('Cannot access tz before initialization') when the queue first builds.
const DirectorDialog = dynamic(
  () => import('./DirectorDialog').then(mod => ({ default: mod.DirectorDialog })),
  { ssr: false }
)
import { ModerationValidateButton } from '@/components/moderation/ModerationValidateButton'
import { useStore } from '@/store/useStore'
import { readFinalCutSelection } from '@/hooks/final-cut/useFinalCutSelection'
import { persistFinalCutSelectionApi } from '@/lib/final-cut/persistFinalCutSelection'
import type { FinalCutSelection, FinalCutSceneOverride, ProductionLanguage } from '@/lib/types/finalCut'
import { RetakeConfirmDialog } from './RetakeConfirmDialog'
import {
  IntelligentRetakeDialog,
  type IntelligentRetakeSubmitOptions,
} from './IntelligentRetakeDialog'
import {
  resolveRetakeConfirmation,
  type PendingRetakeAction,
} from './retakeConfirm'
import { mergeNegativePrompt, type RetakePlan } from '@/lib/video/retakeIntelligence'
import {
  buildFrameEditReferenceImages,
  frameEditReferenceKeys,
  resolveSegmentEditCharacterReferences,
} from '@/lib/vision/resolveFrameEditCharacterReferences'
// Dynamic import for VideoEditingDialog to prevent TDZ
// VideoEditingDialog → VideoEditingDialogV2 is shared between DirectorConsole (chunk 4195)
// and SegmentStudio (ScriptPanel chunk). When webpack's ModuleConcatenationPlugin scope-hoists
// this shared dependency, it reorders const declarations causing 'Cannot access eJ before initialization'.
const VideoEditingDialog = dynamic(
  () => import('./VideoEditingDialogV2').then(mod => ({ default: mod.VideoEditingDialog })),
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
import { useTranslations } from 'next-intl'
import { StoryboardQualityToggle } from '@/components/vision/StoryboardQualityToggle'
import {
  StoryboardGenerationModeToggle,
  VideoSourceMethodToggle,
} from '@/components/vision/StoryboardGenerationModeToggle'
import {
  VideoAgentConfirmDialog,
  type VideoAgentConfirmOptions,
  type VideoAgentBeatOption,
} from '@/components/vision/VideoAgentConfirmDialog'
import {
  applyVideoGenerationToConfig,
  resolveVideoGeneration,
  type VideoGenerationMode,
  type VideoGenerationQuality,
  type VideoSourceMethod,
} from '@/lib/video/videoGenerationPolicy'
import {
  SCENEFLOW_ENGINE_ID,
  snapDurationForEngine,
} from './videoEngineOptions'
// Dynamic import for SceneProductionMixer to avoid TDZ with LocalRenderService chain
const SceneProductionMixer = dynamic(
  () => import('./SceneProductionMixer').then(mod => ({ default: mod.SceneProductionMixer })),
  { ssr: false, loading: () => <div className="p-4 text-center text-zinc-500">Loading Mixer...</div> }
)
import { useVideoQueue } from '@/hooks/useVideoQueue'
import { forceDownload } from '@/lib/utils'
import type { SceneAudioData } from './GuidePromptEditor'
import type { GuideCharacterDemographic } from '@/lib/scene/segmentGuidePrompt'
import { refreshProductionSegmentVideoPrompts } from '@/lib/scene/syncBeatVideoPrompt'
import { buildBeatVideoClips } from '@/lib/scene/buildBeatVideoClips'
import {
  getSceneBeats,
  isBeatExcluded,
  isBeatFirstPipelineEnabled,
} from '@/lib/script/beatMigration'
import { isBeatFrameStale } from '@/lib/storyboard/syncBeatStillPrompt'
import {
  applyVideoTakeSelection,
  healMissingVideoPointer,
  resolveBeatStillTier,
  resolveSegmentClipTier,
  segmentHasPlayableVideo,
} from '@/lib/storyboard/mediaVersions'
import {
  isLanguageClipTarget,
  isMasterStreamLanguage,
  keepLanguageClipVersions,
  normalizeStreamLanguage,
  resolveLanguageClipPlayback,
  withSelectedLanguageClip,
} from '@/lib/scene/languageClipVersions'
import {
  applyClipCaptionsDirective,
  cleanSpokenLineText,
  composeLanguageClipPrompt,
  englishSpokenLine,
  extractPromptSignageText,
  extractPromptSignageTexts,
  preferStoredSpokenTranslation,
  preserveSignageCaseAndFormulaStyle,
  segmentNeedsLanguageClip,
} from '@/lib/scene/languageClipPrompt'
import {
  beatDirectionOwnsVideoPrompt,
  compileBeatVideoPromptFromDirection,
  isStaleSavedVideoPrompt,
  sameBeatOwnVideoPrompt,
} from '@/lib/scene/beatVideoPromptCompiler'
import { buildSceneStateLedger } from '@/lib/scene/sceneStateLedger'
import {
  parsePersistedMusicCues,
  resolveBeatMusicCue,
} from '@/lib/script/sceneMusicCues'
import { isStoredTranslationTimedForShot } from '@/lib/translation/timedDialogueMetrics'
import type { PromoSceneBeat } from '@/lib/publish/buildPromoScene'
import type { DetailedSceneDirection } from '@/types/scene-direction'
import { translateGuideDialogueLine } from '@/lib/scene/translateGuideDialogue'
import { mergeStreamSelectorLanguages } from '@/lib/streams/projectStreams'
import { BeatVideoGallery, type BeatVideoClip } from './BeatVideoGallery'
import type { SegmentGuideContext } from '@/lib/vision/segmentConfigBuilder'
import {
  buildConsolidatedTakeConfig,
  generateFTVMotionPrompt,
  resolveEffectiveStartFrameUrl,
  resolveExpressGenerationMethod,
  resolveF2VFrameUrls,
  resolveSegmentFrameUrls,
  STANDARD_TAKE_DURATION_SECONDS,
} from '@/lib/vision/segmentConfigBuilder'
import { CONCURRENCY_DEFAULTS } from '@/lib/utils/concurrent-processor'

function getAspectRatioTailwindClass(ratio: BlueprintAspectRatio): string {
  switch (ratio) {
    case '16:9':
      return 'aspect-video'
    case '9:16':
      return 'aspect-[9/16]'
    case '1:1':
      return 'aspect-square'
    case '4:3':
      return 'aspect-[4/3]'
    default:
      return 'aspect-video'
  }
}

function toVideoAspectRatio(ratio: BlueprintAspectRatio): '16:9' | '9:16' {
  return ratio === '9:16' ? '9:16' : '16:9'
}

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
import { SUPPORTED_LANGUAGES, getLanguageName } from '@/constants/languages'
import { getNextProductionStreamVersion, getProductionStreamDisplayName } from './defaults'
import { planSceneRenderAppend } from '@/lib/projects/planSceneRenderAppend'
import {
  appendSceneRenderClient,
  dispatchAppendedSceneRender,
} from '@/lib/projects/appendSceneRenderClient'

// Stable empty segments reference to prevent TDZ render loops
// Using a module-level constant guarantees the same reference for the app's lifecycle
const EMPTY_SEGMENTS: SceneSegment[] = []

export interface DirectorConsoleProps {
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
      resolution?: '360p' | '720p' | '1080p' | '4k' | '4K'
      frameRate?: 24 | 30
      thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high'
      omniMultiShot?: boolean
      qualityTier?: 'fast' | 'premium'
      klingModel?: string
      klingQuality?: 'std' | 'pro' | '4k'
      guidePrompt?: string
      generationMethod?: VideoGenerationMethod
      videoProvider?: 'kling' | 'vertex' | 'aggregator'
      referenceImages?: Array<{ url: string; type?: 'style' | 'character'; name?: string; role?: string }> | string[]
      useBeatFrameAsStart?: boolean
      /** Store the finished clip on this language stream instead of the English master. */
      clipLanguage?: string
      /** When true, intentionally include burned-in captions in the clip prompt (default false). */
      includeCaptions?: boolean
    }
  ) => Promise<void>
  onSegmentUpload?: (segmentId: string, file: File) => void
  /** Persist rendered scene URL to database */
  onRenderedSceneUrlChange?: (url: string | null) => void
  /** Persist production data (including production streams) to database */
  onProductionDataChange?: (data: SceneProductionData) => void
  /** Project art style id, so a refreshed clip prompt matches video generation. */
  artStyleId?: string
  /** Scene index (0-based) for audio generation API calls */
  sceneIndex?: number
  /** Generate audio for a specific scene, audio type, and language */
  onGenerateSceneAudio?: (sceneIdx: number, audioType: 'narration' | 'dialogue', characterName?: string, dialogueIndex?: number, language?: string) => void | Promise<void>
  /** Generate the dialogue and narration stream for one language across every scene */
  onGenerateLanguageStream?: (language: string) => void | Promise<void>
  /** Whether audio generation is in progress */
  isGeneratingAudio?: boolean
  /** Persist keyframe after AI edit (DirectorDialog / pre-flight) */
  onSaveEditedKeyframe?: (
    sceneId: string,
    segmentId: string,
    frameType: 'start' | 'end',
    newFrameUrl: string
  ) => void
  /** Retry this shot's start still using the Frames tab Standard | Creative mode. */
  onRegenerateStill?: (
    sceneId: string,
    segmentId: string
  ) => void
  /** User-initiated Hive validation report callback */
  onModerationReport?: (report: import('@/lib/moderation/moderationPipeline').ModerationReport) => void
  /** Character demographics for auto guide / Director dialog (falls back to scene.characters) */
  guideCharacters?: GuideCharacterDemographic[]
  /** Character references for DirectorDialog REF library */
  characters?: Array<{
    id?: string
    name: string
    type?: string
    referenceImage?: string
    description?: string
    appearanceDescription?: string
    visionDescription?: string
    height?: string
    gender?: string
    hairStyle?: string
    hairColor?: string
    defaultWardrobe?: string
    wardrobeAccessories?: string
    wardrobes?: Array<{
      id: string
      name: string
      description?: string
      accessories?: string
      appearanceNotes?: string
      sceneNumbers?: number[]
      isDefault?: boolean
      needsImageRegen?: boolean
      headshotUrl?: string
      fullBodyUrl?: string
      previewImageUrl?: string
      combinedCharacterRefUrl?: string
    }>
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
  /** Project-level configured language streams (visionPhase.streams). */
  projectStreams?: import('@/lib/streams/projectStreams').ProjectStream[]
  /** Script scenes, so the Mixer can save the end-of-scene transition. */
  scenes?: any[]
  script?: any
  onScriptChange?: (script: any) => void
  /**
   * Report a Video Agent batch up to an owner that outlives this console.
   *
   * The queue keeps rendering after the console closes, so the progress readout
   * and the cancel button cannot both live inside it.
   */
  onVideoRunReport?: import('@/lib/video/videoQueueRunReport').VideoQueueRunReporter
  /** Mixer cloud render was accepted; the page docks it and notifies on completion. */
  onSceneRenderQueued?: (info: import('@/lib/video/sceneRenderQueue').SceneRenderQueuedInfo) => void
  /** Hand the page a cancel for the run it is now reporting. */
  onVideoRunCancelReady?: (cancel: () => void) => void
  /** Session default for Video Agent and Take. Not persisted. */
  videoGenerationQuality?: VideoGenerationQuality
  onVideoGenerationQualityChange?: (quality: VideoGenerationQuality) => void
  videoGenerationMode?: VideoGenerationMode
  onVideoGenerationModeChange?: (mode: VideoGenerationMode) => void
  videoSourceMethod?: VideoSourceMethod
  onVideoSourceMethodChange?: (method: VideoSourceMethod) => void
  /** Jump the parent workflow strip to Pre-Vis. */
  onOpenPreVis?: () => void
  /** Open Screening Room Video for this scene. */
  onPlayScene?: () => void
  /** Open Direct Beat for this clip so beat direction stays the prompt source. */
  onDirectBeat?: (beatId: string, options?: { safety?: boolean }) => void
  /** Shared beat selection with Direction, Audio, and Pre-Vis. */
  selectedBeatId?: string | null
  onSelectBeat?: (beatId: string) => void
  /** Active language selected on the Scene card header. */
  selectedLanguage?: string
  onLanguageChange?: (language: string) => void
  /** Stored scene translations keyed by language, then scene index. */
  sceneTranslations?: Record<string, Record<number, { dialogue?: string[]; narration?: string }>>
  /** Whether shot/still/clip prompts are currently being updated or saved. */
  isUpdatingPrompts?: boolean
}

/** Slots for splitting Video / Mixer / Streams across parent section cards (ScriptPanel). */
export type DirectorWorkflowSlots = {
  videoSection: React.ReactNode
  mixerBody: React.ReactNode
  streamsBody: React.ReactNode
  streamCount: number
  clipStats: { rendered: number; total: number }
  mixerCollapsed: boolean
  setMixerCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  streamsCollapsed: boolean
  setStreamsCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  generateClipForBeat?: (beatId: string) => void
  changeClipDurationForBeat?: (beatId: string, seconds: number) => void
  getClipDurationForBeat?: (beatId: string) => number | undefined
}

export type DirectorWorkflowProps = DirectorConsoleProps & {
  children: (slots: DirectorWorkflowSlots) => React.ReactNode
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

/** Footage card status — completed beats always show "In the Can". */
export function getFootageBeatStatusConfig(item: DirectorQueueItem) {
  if (item.status === 'complete') return statusBadgeConfig['rendered']
  if (item.status === 'rendering') return statusBadgeConfig['rendering']
  if (item.status === 'error') return statusBadgeConfig['error']
  if (item.config.approvalStatus === 'rendering') return statusBadgeConfig['rendering']
  if (item.config.approvalStatus === 'error') return statusBadgeConfig['error']
  return statusBadgeConfig['auto-ready']
}

export function DirectorConsoleRoot({
  sceneId,
  sceneNumber,
  projectId,
  productionData,
  sceneImageUrl,
  scene,
  onGenerate,
  onSegmentUpload,
  onProductionDataChange,
  artStyleId,
  sceneIndex,
  onGenerateSceneAudio,
  onGenerateLanguageStream,
  isGeneratingAudio,
  onSaveEditedKeyframe,
  onRegenerateStill,
  onModerationReport,
  guideCharacters,
  characters = [],
  sceneReferences = [],
  objectReferences = [],
  locationReferences = [],
  projectAspectRatio = '16:9',
  projectStreams,
  scenes,
  script,
  onScriptChange,
  onVideoRunReport,
  onSceneRenderQueued,
  onVideoRunCancelReady,
  videoGenerationQuality = 'draft',
  onVideoGenerationQualityChange,
  videoGenerationMode = 'standard',
  onVideoGenerationModeChange,
  videoSourceMethod,
  onVideoSourceMethodChange,
  onOpenPreVis,
  onPlayScene,
  onDirectBeat,
  selectedBeatId = null,
  onSelectBeat,
  selectedLanguage,
  onLanguageChange,
  sceneTranslations,
  isUpdatingPrompts = false,
  children,
}: DirectorConsoleProps & {
  children?: (slots: DirectorWorkflowSlots) => React.ReactNode
}) {
  const lastRefreshedSegmentsRef = useRef<{
    sig: string
    segments: SceneSegment[]
  } | null>(null)

  // Synchronously refresh production segment video prompts when beat direction changes
  // so the queue and clip gallery never read stale pre-save prompts on the first render.
  const pendingProductionRefresh = useMemo(() => {
    const rawSegments = productionData?.segments
    const currentScene = scene as Record<string, unknown> | undefined
    if (!rawSegments?.length || !currentScene) return null
    const refreshed = refreshProductionSegmentVideoPrompts(rawSegments, currentScene, {
      artStyleId,
    })
    if (!refreshed) return null
    const sig = JSON.stringify(
      refreshed.map((s) => ({
        id: s.segmentId,
        gp: s.generatedPrompt || '',
        ue: s.userEditedPrompt || '',
        st: s.status || '',
        url: s.activeAssetUrl || '',
        sf: s.startFrameUrl || s.references?.startFrameUrl || '',
        ef: s.endFrameUrl || s.references?.endFrameUrl || '',
        stale: Boolean(s.isStale),
        takes: s.takes?.length || 0,
      }))
    )
    if (lastRefreshedSegmentsRef.current?.sig === sig) {
      return lastRefreshedSegmentsRef.current.segments
    }
    lastRefreshedSegmentsRef.current = { sig, segments: refreshed }
    return refreshed
  }, [productionData?.segments, scene, artStyleId])

  // Use stable EMPTY_SEGMENTS constant to prevent TDZ render loops
  // productionData?.segments || [] creates a new array reference each render
  const segments = pendingProductionRefresh ?? productionData?.segments ?? EMPTY_SEGMENTS
  const beatFirstReadOnlyPrompts = isBeatFirstPipelineEnabled()
  const aspectClass = getAspectRatioTailwindClass(projectAspectRatio)
  const videoAspectRatio = toVideoAspectRatio(projectAspectRatio)

  const effectiveGuideCharacters = useMemo(
    () =>
      guideCharacters ??
      normalizeGuideCharacters((scene as { characters?: unknown } | undefined)?.characters),
    [guideCharacters, scene]
  )

  const normalizedSceneSfx = useMemo(() => {
    const cues = coerceSceneSfxFlatArray(scene?.sfx)
    const sceneRecord = scene as Record<string, unknown> | undefined
    if (!sceneRecord) return cues
    return cues.map((cue, idx) => {
      const resolved = resolveSceneSfxUrl(sceneRecord, idx)
      if (!resolved) return cue
      if (typeof cue === 'object' && cue) {
        return { ...cue, audioUrl: resolved }
      }
      return { description: String(cue), audioUrl: resolved }
    })
  }, [scene])

  const segmentGuideContext = useMemo<SegmentGuideContext | undefined>(() => {
    if (!scene) return undefined
    const sceneMeta = scene as { heading?: string; sceneHeading?: string; filmTitle?: string }
    return {
      scene: {
        heading: sceneMeta.heading || sceneMeta.sceneHeading,
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
      filmTitle: sceneMeta.filmTitle,
      projectCharacters: characters,
      locationReferences,
      objectReferences,
      fullScene: scene as Record<string, unknown>,
    }
  }, [scene, effectiveGuideCharacters, normalizedSceneSfx, sceneIndex, characters, locationReferences, objectReferences])

  const tVideoAgent = useTranslations('production.videoAgent')

  const videoGenerationAvailable = useMemo(
    () => segments.some(s => segmentHasPlayableVideo(s)),
    [segments]
  )

  const videoRunReport = useMemo(
    () =>
      onVideoRunReport
        ? { sceneLabel: `Scene ${sceneNumber}`, onReport: onVideoRunReport }
        : undefined,
    [onVideoRunReport, sceneNumber]
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
    isUpdatingPrompts: isQueueUpdatingPrompts,
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
    () => pendingProductionRefresh ?? productionData?.segments ?? EMPTY_SEGMENTS,
    videoAspectRatio,
    videoRunReport
  )

  // Registered after the queue exists, so the page's Cancel drives the same
  // loop this console's own Cancel does.
  useEffect(() => {
    if (onVideoRunCancelReady) onVideoRunCancelReady(cancelRendering)
  }, [onVideoRunCancelReady, cancelRendering])
  
  // Selected segment for DirectorDialog
  const [selectedSegment, setSelectedSegment] = useState<SceneSegment | null>(null)
  const [videoAgentDialogOpen, setVideoAgentDialogOpen] = useState(false)
  const [localVideoSourceMethod, setLocalVideoSourceMethod] =
    useState<VideoSourceMethod>('reference')
  const effectiveVideoSourceMethod: VideoSourceMethod =
    videoGenerationMode === 'creative'
      ? 'frame'
      : (videoSourceMethod ?? localVideoSourceMethod)
  const handleVideoSourceMethodChange = useCallback(
    (next: VideoSourceMethod) => {
      setLocalVideoSourceMethod(next)
      onVideoSourceMethodChange?.(next)
    },
    [onVideoSourceMethodChange]
  )
  const [dialogFocusPrompt, setDialogFocusPrompt] = useState(false)
  const dialogFocusPromptRef = React.useRef(false)

  // Retake confirmation when replacing a completed take via Take or Upload
  const [pendingRetakeAction, setPendingRetakeAction] = useState<PendingRetakeAction | null>(null)

  // Intelligent retake dialog for completed video clips
  const [retakeSegment, setRetakeSegment] = useState<SceneSegment | null>(null)
  
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
  const [isDesignatingScreening, setIsDesignatingScreening] = useState(false)
  const [productionTarget, setProductionTarget] = useState<ProductionTarget>(() => ({
    streamType: 'video',
    language: normalizeStreamLanguage(selectedLanguage || 'en'),
  }))
  const [languageClipBusyId, setLanguageClipBusyId] = useState<string | null>(null)
  const hydratedProductionTargetRef = useRef<string | null>(null)
  const prevProductionLanguageRef = useRef(productionTarget.language)
  const currentProject = useStore((s) => s.currentProject)
  const updateProject = useStore((s) => s.updateProject)
  const finalCutSelection = useMemo(
    () => readFinalCutSelection(currentProject?.metadata),
    [currentProject?.metadata]
  )
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
  
  // Cinematic Elements dialog state - opens for inserting new cinematic segment
  const [cinematicDialogSegmentIndex, setCinematicDialogSegmentIndex] = useState<number | null>(null)
  
  // Persist mixerCollapsed to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mixerCollapsed', JSON.stringify(mixerCollapsed))
    }
  }, [mixerCollapsed])

  // Sync production target language from Scene card header when controlled
  useEffect(() => {
    if (!selectedLanguage) return
    const normalized = normalizeStreamLanguage(selectedLanguage)
    setProductionTarget((prev) =>
      prev.language === normalized ? prev : { ...prev, language: normalized }
    )
  }, [selectedLanguage])

  // Hydrate production target from persisted mixer settings (per scene) when not controlled by header
  useEffect(() => {
    if (selectedLanguage) return
    const saved = productionData?.mixerSettings?.productionTarget
    const token = `${sceneId}:${saved ? `${saved.streamType}:${saved.language}` : 'default'}`
    if (hydratedProductionTargetRef.current === token) return
    setProductionTarget(saved ? { ...saved, streamType: 'video' } : { streamType: 'video', language: 'en' })
    hydratedProductionTargetRef.current = token
  }, [sceneId, productionData?.mixerSettings?.productionTarget, selectedLanguage])

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

  const productionDataRef = useRef(productionData)
  productionDataRef.current = productionData
  const sceneRecordRef = useRef(scene)
  sceneRecordRef.current = scene
  const onProductionDataChangeRef = useRef(onProductionDataChange)
  onProductionDataChangeRef.current = onProductionDataChange

  const beatVideoDirectionKey = useMemo(() => {
    const beats = getSceneBeats((scene as Record<string, unknown> | undefined) ?? null)
    return beats
      .map((entry) =>
        [
          entry.beatId,
          entry.actionDescription ?? '',
          entry.line ?? '',
          entry.beatDirection?.generatedBy ?? '',
          entry.beatDirection?.updatedAt ?? '',
          entry.beatDirection?.startFrame ?? '',
          entry.beatDirection?.clipAction ?? '',
          entry.beatDirection?.endFrame ?? '',
          entry.beatDirection?.frozenMoment ?? '',
          entry.beatDirection?.blocking ?? '',
          entry.beatDirection?.shotType ?? '',
          entry.beatDirection?.cameraAngle ?? '',
          entry.beatDirection?.cameraMovement ?? '',
          entry.beatDirection?.emotion ?? '',
          entry.beatDirection?.gaze ?? '',
          entry.beatDirection?.propInteraction ?? '',
          entry.beatDirection?.lightingAccent ?? '',
          (entry.beatDirection?.keyProps ?? []).join(','),
          (entry.beatDirection?.castInFrame ?? []).join(','),
        ].join('\u001f')
      )
      .join('\u001e')
  }, [scene])

  const missingVideoPointerKey = useMemo(() => {
    return (productionData?.segments ?? [])
      .filter(
        (segment) =>
          (!segment.activeAssetUrl?.trim() && (segment.takes?.length ?? 0) > 0) ||
          (segmentHasPlayableVideo(segment) &&
            (segment.status === 'DRAFT' || !segment.status || !segment.assetType))
      )
      .map((segment) => `${segment.segmentId}:${segment.status ?? ''}:${segment.assetType ?? ''}`)
      .join(',')
  }, [productionData?.segments])

  useEffect(() => {
    const current = productionDataRef.current
    const currentScene = sceneRecordRef.current as Record<string, unknown> | undefined
    const notifyChange = onProductionDataChangeRef.current
    if (!notifyChange || !current?.segments?.length || !currentScene) return
    const nextSegments = refreshProductionSegmentVideoPrompts(current.segments, currentScene, {
      artStyleId,
    })
    const base = nextSegments ?? current.segments
    let healedAny = false
    const healed = base.map((segment) => {
      const next = healMissingVideoPointer(segment)
      if (next !== segment) healedAny = true
      return next
    })
    if (!nextSegments && !healedAny) return
    notifyChange({
      ...current,
      segments: healed,
    })
  }, [beatVideoDirectionKey, productionData?.segments?.length, missingVideoPointerKey, artStyleId])

  useEffect(() => {
    const language = productionTarget.language
    if (prevProductionLanguageRef.current === language) return
    prevProductionLanguageRef.current = language

    if (!onProductionDataChange || !productionData?.isSegmented || !productionData.segments?.length) {
      return
    }
    if (!isBeatFirstPipelineEnabled()) return

    const sceneRecord = scene as Record<string, unknown> | undefined
    if (!sceneRecord) return
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
        const derived = (data.segments || productionData.segments) as SceneSegment[]
        onProductionDataChange({
          ...productionData,
          segments: keepLanguageClipVersions(derived, productionData.segments),
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

  const [timedDialogueOverrides, setTimedDialogueOverrides] = useState<
    Record<string, Record<string, string>>
  >({})
  const inFlightTimedKeysRef = useRef<Set<string>>(new Set())
  const [inFlightTimedAdaptCount, setInFlightTimedAdaptCount] = useState(0)
  const isTranslatingTimedDialogue = inFlightTimedAdaptCount > 0
  const effectiveIsUpdatingPrompts = Boolean(
    isUpdatingPrompts || isQueueUpdatingPrompts
  )

  useEffect(() => {
    const rawLang = productionTarget.language
    if (!isLanguageClipTarget(rawLang)) return
    const langKey = normalizeStreamLanguage(rawLang)
    const sceneRecord = (scene as Record<string, unknown> | undefined) ?? null
    const allBeats = getSceneBeats(sceneRecord).filter((b) => !isBeatExcluded(b))
    let cancelled = false

    for (const beat of allBeats) {
      if (beat.kind === 'action') continue
      const seg = segments.find((s) => s.beatId === beat.beatId)
      const englishLine = englishSpokenLine({
        excerpt: seg?.dialoguePortion?.excerpt,
        beatLine: beat.line,
        dialogueLines: seg?.dialogueLines,
      })
      if (!englishLine.trim()) continue
      const targetDurationSeconds = Math.min(
        10,
        Math.max(
          3,
          typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0
            ? beat.durationSeconds
            : 10
        )
      )
      const existingOverride = timedDialogueOverrides[langKey]?.[beat.beatId]?.trim()
      if (
        existingOverride &&
        (beat.kind === 'title' ||
          isStoredTranslationTimedForShot(
            englishLine,
            existingOverride,
            langKey,
            targetDurationSeconds
          ))
      ) {
        continue
      }
      const isExcerpt = !beat.line?.trim() && !!seg?.dialoguePortion?.excerpt?.trim()
      const stored = preferStoredSpokenTranslation({
        translation: sceneIndex != null ? sceneTranslations?.[langKey]?.[sceneIndex] : undefined,
        kind: beat.kind,
        lineId: beat.lineId || seg?.dialoguePortion?.lineId,
        beatId: beat.beatId,
        dialogue: scene?.dialogue,
        englishLine,
        isExcerpt,
      })
      if (
        stored &&
        (beat.kind === 'title' ||
          isStoredTranslationTimedForShot(englishLine, stored, langKey, targetDurationSeconds))
      ) {
        continue
      }
      const inFlightKey = `${langKey}:${beat.beatId}:${englishLine}`
      if (inFlightTimedKeysRef.current.has(inFlightKey)) continue
      inFlightTimedKeysRef.current.add(inFlightKey)
      setInFlightTimedAdaptCount((count) => count + 1)

      void translateGuideDialogueLine(englishLine, langKey, {
        targetDurationSeconds,
        adaptForTiming: beat.kind !== 'title',
      })
        .then((adapted) => {
          if (cancelled || !adapted?.trim()) return
          if (
            beat.kind !== 'title' &&
            !isStoredTranslationTimedForShot(englishLine, adapted, langKey, targetDurationSeconds)
          ) {
            return
          }
          setTimedDialogueOverrides((prev) => ({
            ...prev,
            [langKey]: {
              ...(prev[langKey] ?? {}),
              [beat.beatId]: adapted.trim(),
            },
          }))
        })
        .catch(() => {
          inFlightTimedKeysRef.current.delete(inFlightKey)
        })
        .finally(() => {
          setInFlightTimedAdaptCount((count) => Math.max(0, count - 1))
        })
    }

    return () => {
      cancelled = true
    }
  }, [
    productionTarget.language,
    scene,
    segments,
    sceneIndex,
    sceneTranslations,
    timedDialogueOverrides,
  ])

  const composeSegmentLanguageClip = useCallback(
    async (
      segment: SceneSegment,
      language: string,
      fallbackPrompt?: string,
      fallbackGuidePrompt?: string,
      includeCaptionsOverride?: boolean,
      sourceMethodOverride?: VideoSourceMethod
    ): Promise<{ prompt: string; guidePrompt?: string; includeCaptions: boolean }> => {
      const sceneRecord = (scene as Record<string, unknown> | undefined) ?? null
      const allBeats = getSceneBeats(sceneRecord)
      const beatIndex = allBeats.findIndex((entry) => entry.beatId === segment.beatId)
      const beat = beatIndex >= 0 ? allBeats[beatIndex] : undefined
      const englishLine = englishSpokenLine({
        excerpt: segment.dialoguePortion?.excerpt,
        beatLine: beat?.line,
        dialogueLines: segment.dialogueLines,
      })
      const isExcerpt = !beat?.line?.trim() && !!segment.dialoguePortion?.excerpt?.trim()
      const rawSegmentDur =
        (typeof segment.endTime === 'number' &&
        typeof segment.startTime === 'number' &&
        segment.endTime > segment.startTime
          ? segment.endTime - segment.startTime
          : 0) ||
        (typeof beat?.durationSeconds === 'number' && beat.durationSeconds > 0
          ? beat.durationSeconds
          : 0) ||
        10
      const targetDurationSeconds = Math.min(10, Math.max(3, rawSegmentDur))
      let translated = preferStoredSpokenTranslation({
        translation: sceneIndex != null ? sceneTranslations?.[language]?.[sceneIndex] : undefined,
        kind: beat?.kind,
        lineId: beat?.lineId || segment.dialoguePortion?.lineId,
        beatId: beat?.beatId,
        dialogue: scene?.dialogue,
        englishLine,
        isExcerpt,
      })
      const promoBeat = beat as PromoSceneBeat | undefined
      if (
        !translated &&
        promoBeat &&
        typeof promoBeat.sourceSceneIndex === 'number' &&
        promoBeat.sourceSceneIndex >= 0
      ) {
        const sourceScene = scenes?.[promoBeat.sourceSceneIndex] as
          | Record<string, unknown>
          | undefined
        const sourceBeats = sourceScene ? getSceneBeats(sourceScene) : []
        const sourceBeat = sourceBeats.find((b) => b.beatId === promoBeat.sourceBeatId)
        translated = preferStoredSpokenTranslation({
          translation: sceneTranslations?.[language]?.[promoBeat.sourceSceneIndex],
          kind: beat?.kind,
          lineId:
            sourceBeat?.lineId || beat?.lineId || segment.dialoguePortion?.lineId,
          beatId: promoBeat.sourceBeatId || beat?.beatId,
          dialogue: Array.isArray(sourceScene?.dialogue)
            ? (sourceScene.dialogue as unknown[])
            : undefined,
          englishLine,
          isExcerpt,
        })
      }
      if (!translated && englishLine.trim() && scenes && sceneTranslations?.[language]) {
        for (let idx = 0; idx < scenes.length; idx += 1) {
          if (idx === sceneIndex) continue
          const candTrans = sceneTranslations[language]?.[idx]
          if (!candTrans) continue
          const candScene = scenes[idx] as Record<string, unknown> | undefined
          const candBeats = candScene ? getSceneBeats(candScene) : []
          const sharedBeat = candBeats.find(
            (b) =>
              b.beatId === beat?.beatId ||
              ((b as PromoSceneBeat).sourceSceneIndex === sceneIndex &&
                (b as PromoSceneBeat).sourceBeatId === beat?.beatId)
          )
          translated = preferStoredSpokenTranslation({
            translation: candTrans,
            kind: beat?.kind,
            lineId: sharedBeat?.lineId || beat?.lineId || segment.dialoguePortion?.lineId,
            beatId: sharedBeat?.beatId || beat?.beatId,
            dialogue: Array.isArray(candScene?.dialogue)
              ? (candScene.dialogue as unknown[])
              : undefined,
            englishLine,
            isExcerpt,
          })
          if (translated) break
        }
      }
      if (
        translated &&
        beat?.kind !== 'title' &&
        !isStoredTranslationTimedForShot(
          englishLine,
          translated,
          language,
          targetDurationSeconds
        )
      ) {
        translated = undefined
      }
      const langKey = normalizeStreamLanguage(language)
      if (!translated && beat?.beatId && timedDialogueOverrides[langKey]?.[beat.beatId]?.trim()) {
        const candidateOverride = timedDialogueOverrides[langKey][beat.beatId].trim()
        if (
          beat.kind === 'title' ||
          isStoredTranslationTimedForShot(
            englishLine,
            candidateOverride,
            language,
            targetDurationSeconds
          )
        ) {
          translated = candidateOverride
        }
      }
      if (!translated && englishLine.trim()) {
        translated = await translateGuideDialogueLine(englishLine, language, {
          targetDurationSeconds,
          adaptForTiming: beat?.kind !== 'title',
        })
        if (translated?.trim() && beat?.beatId) {
          const cleanAdapted = translated.trim()
          setTimedDialogueOverrides((prev) => ({
            ...prev,
            [langKey]: {
              ...(prev[langKey] ?? {}),
              [beat.beatId]: cleanAdapted,
            },
          }))
        }
      }
      const resolvedSourceMethod: 'reference' | 'frame' =
        (sourceMethodOverride ?? effectiveVideoSourceMethod) === 'frame'
          ? 'frame'
          : 'reference'
      const userEdited = segment.userEditedPrompt?.trim()
      const hasGenuineUserEditedPrompt = Boolean(
        userEdited &&
          (!beat ||
            !isStaleSavedVideoPrompt(
              beat,
              userEdited,
              beat.line?.trim(),
              resolvedSourceMethod
            ))
      )
      const sceneDirection = ((sceneRecord?.sceneDirection ??
        sceneRecord?.detailedDirection ??
        null) || null) as DetailedSceneDirection | null
      const activeBeats = allBeats.filter((entry) => !isBeatExcluded(entry))
      const activeBeatIndex = beat
        ? activeBeats.findIndex((entry) => entry.beatId === beat.beatId)
        : -1
      const stateLedger = buildSceneStateLedger(activeBeats)
      const musicCue =
        activeBeatIndex >= 0
          ? resolveBeatMusicCue(
              parsePersistedMusicCues(sceneRecord?.sceneMusicCues, activeBeats),
              activeBeatIndex
            )
          : undefined
      const compiledFromBeat = beat
        ? compileBeatVideoPromptFromDirection(beat, sceneDirection, {
            targetMethod: resolvedSourceMethod,
            previousBeat:
              activeBeatIndex > 0
                ? activeBeats[activeBeatIndex - 1]
                : beatIndex > 0
                  ? allBeats[beatIndex - 1]
                  : undefined,
            sceneState: activeBeatIndex >= 0 ? stateLedger[activeBeatIndex] : undefined,
            excerpt: segment.dialoguePortion?.excerpt?.trim(),
            continuesSameLine: (segment.dialoguePortion?.partIndex ?? 0) > 0,
            ...(musicCue ? { musicCue } : {}),
          }).prompt
        : ''
      const preserveStoredSegmentPrompt =
        !segment.isStale &&
        Boolean(segment.generatedPrompt?.trim()) &&
        sameBeatOwnVideoPrompt(segment.generatedPrompt, compiledFromBeat)
      const sourcePrompt =
        (hasGenuineUserEditedPrompt ? userEdited : undefined) ||
        (preserveStoredSegmentPrompt ? segment.generatedPrompt?.trim() : undefined) ||
        (beat &&
        compiledFromBeat &&
        (beatDirectionOwnsVideoPrompt(beat) ||
          resolvedSourceMethod === 'frame' ||
          (fallbackPrompt &&
            isStaleSavedVideoPrompt(
              beat,
              fallbackPrompt,
              beat.line?.trim(),
              resolvedSourceMethod
            )))
          ? compiledFromBeat
          : undefined) ||
        fallbackPrompt ||
        compiledFromBeat ||
        segment.generatedPrompt ||
        ''
      const signageSources = extractPromptSignageTexts(sourcePrompt, englishLine)
      const signageSourceText = signageSources[0]
      const customSignageOverride =
        productionData?.mixerSettingsByLanguage?.[language]?.languageShotConfigs?.[
          segment.segmentId
        ]?.signageText?.trim() || ''
      let signageTranslatedText = customSignageOverride || undefined
      const signageTranslations: Record<string, string> = {}
      const sceneTrans =
        sceneIndex != null ? sceneTranslations?.[language]?.[sceneIndex] : undefined
      const sourceSceneTrans =
        promoBeat &&
        typeof promoBeat.sourceSceneIndex === 'number' &&
        promoBeat.sourceSceneIndex >= 0
          ? sceneTranslations?.[language]?.[promoBeat.sourceSceneIndex]
          : undefined
      if (!customSignageOverride && signageSources.length > 0) {
        await Promise.all(
          signageSources.map(async (src) => {
            if (src === englishLine.trim()) return
            const anyStoredSignage = Object.values(sceneTranslations?.[language] || {})
              .map((t) => t?.signageByText?.[src])
              .find(Boolean)
            const storedSignage =
              sceneTrans?.signageByText?.[src] ||
              sourceSceneTrans?.signageByText?.[src] ||
              anyStoredSignage
            if (storedSignage) {
              signageTranslations[src] = preserveSignageCaseAndFormulaStyle(src, storedSignage)
              return
            }
            try {
              const raw = await translateGuideDialogueLine(src, language, {
                adaptForTiming: false,
              })
              if (raw?.trim()) {
                signageTranslations[src] = preserveSignageCaseAndFormulaStyle(src, raw)
              }
            } catch {
              // Non-fatal: continue with spoken line translation if signage auto-translate fails
            }
          })
        )
        if (signageSourceText && signageTranslations[signageSourceText]) {
          signageTranslatedText = signageTranslations[signageSourceText]
        }
      }
      const langSettings =
        productionData?.mixerSettingsByLanguage?.[language] ??
        productionData?.mixerSettingsByLanguage?.[langKey]
      const shotCfg = langSettings?.languageShotConfigs?.[segment.segmentId]
      const includeCaptions = Boolean(
        includeCaptionsOverride ??
          shotCfg?.includeCaptions ??
          langSettings?.includeClipCaptions ??
          false
      )
      const composed = composeLanguageClipPrompt({
        sourcePrompt,
        guidePrompt: fallbackGuidePrompt,
        character: beat?.character || segment.dialogueLines?.[0]?.character,
        kind: beat?.kind,
        englishLine,
        translatedLine: translated,
        signageSourceText,
        signageTranslatedText,
        signageTranslations,
        targetLanguage: language,
        includeCaptions,
      })
      return {
        prompt: composed.prompt || sourcePrompt,
        guidePrompt: composed.guidePrompt ?? fallbackGuidePrompt,
        includeCaptions,
      }
    },
    [
      scene,
      scenes,
      sceneIndex,
      sceneTranslations,
      productionData?.mixerSettingsByLanguage,
      timedDialogueOverrides,
      effectiveVideoSourceMethod,
    ]
  )
  
  // Handle saving config from dialog
  const handleSaveConfig = useCallback((config: VideoGenerationConfig) => {
    if (selectedSegment) {
      updateConfig(selectedSegment.segmentId, config)
      setSelectedSegment(null)
    }
  }, [selectedSegment, updateConfig])
  
  const markShotLanguageRegenerate = useCallback(
    (language: string, segmentIds: string[]) => {
      if (!isLanguageClipTarget(language) || !onProductionDataChange || !productionData) return
      const byLang = migrateMixerSettingsByLanguage(productionData)
      const existingLangSettings = byLang[language] ?? {}
      const nextShotConfigs = { ...(existingLangSettings.languageShotConfigs ?? {}) }
      let changed = false
      for (const segmentId of segmentIds) {
        if (nextShotConfigs[segmentId]?.method !== 'regenerate') {
          nextShotConfigs[segmentId] = {
            ...nextShotConfigs[segmentId],
            method: 'regenerate',
          }
          changed = true
        }
      }
      if (!changed) return
      onProductionDataChange({
        ...productionData,
        mixerSettingsByLanguage: {
          ...byLang,
          [language]: {
            ...existingLangSettings,
            languageShotConfigs: nextShotConfigs,
          },
        },
      })
    },
    [onProductionDataChange, productionData]
  )

  const handleToggleClipCaptions = useCallback(
    (segmentId: string, nextIncludeCaptions: boolean) => {
      if (!onProductionDataChange || !productionData) return
      const language = normalizeStreamLanguage(productionTarget.language) || 'en'
      const byLang = migrateMixerSettingsByLanguage(productionData)
      const existingLangSettings = byLang[language] ?? {}
      const existingShotCfg = existingLangSettings.languageShotConfigs?.[segmentId] ?? {}
      const nextShotConfigs = {
        ...(existingLangSettings.languageShotConfigs ?? {}),
        [segmentId]: {
          ...existingShotCfg,
          includeCaptions: nextIncludeCaptions,
        },
      }
      onProductionDataChange({
        ...productionData,
        mixerSettingsByLanguage: {
          ...byLang,
          [language]: {
            ...existingLangSettings,
            languageShotConfigs: nextShotConfigs,
          },
        },
      })
    },
    [onProductionDataChange, productionData, productionTarget.language]
  )

  const handleChangeClipDuration = useCallback(
    (segment: SceneSegment, nextSeconds: number) => {
      const existingItem = queue.find((entry) => entry.segmentId === segment.segmentId)
      if (existingItem) {
        updateConfig(segment.segmentId, {
          ...existingItem.config,
          duration: nextSeconds,
          approvalStatus: 'user-approved',
        })
      }
      if (!onProductionDataChange || !productionData) return
      onProductionDataChange({
        ...productionData,
        segments: productionData.segments.map((seg) =>
          seg.segmentId === segment.segmentId
            ? {
                ...seg,
                endTime: (typeof seg.startTime === 'number' ? seg.startTime : 0) + nextSeconds,
              }
            : seg
        ),
      })
    },
    [queue, updateConfig, onProductionDataChange, productionData]
  )

  // Handle generate from dialog - saves config and triggers single segment generation
  // Pass config via overrideConfigs to bypass React state async timing issues
  const handleGenerateFromDialog = useCallback(
    async (segmentId: string, config: VideoGenerationConfig) => {
      const language = productionTarget.language
      if (isLanguageClipTarget(language)) {
        markShotLanguageRegenerate(language, [segmentId])
        const segment = segments.find((s) => s.segmentId === segmentId)
        const languageName = getLanguageName(language)
        const shotNumber = (segment?.sequenceIndex ?? 0) + 1
        const toastId = `lang-clip-dialog-${sceneId}-${segmentId}-${language}`
        const { toast } = await import('sonner')
        toast.loading(`Translating & queueing ${languageName} clip for Shot ${shotNumber}…`, {
          id: toastId,
        })
        try {
          const composed = segment
            ? await composeSegmentLanguageClip(
                segment,
                language,
                config.prompt,
                config.guidePrompt,
                config.includeCaptions
              )
            : {
                prompt: config.prompt,
                guidePrompt: config.guidePrompt,
                includeCaptions: Boolean(config.includeCaptions),
              }
          const localizedConfig: VideoGenerationConfig = {
            ...config,
            prompt: composed.prompt,
            motionPrompt: composed.prompt,
            guidePrompt: composed.guidePrompt,
            clipLanguage: language,
            includeCaptions: composed.includeCaptions,
          }
          toast.dismiss(toastId)
          await processQueue({
            mode: 'selected',
            priority: 'sequence',
            delayBetween: 6000,
            selectedIds: [segmentId],
            overrideConfigs: new Map([[segmentId, localizedConfig]]),
            clipLanguage: language,
          })
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Could not translate shot for language stream',
            { id: toastId }
          )
        }
        return
      }
      const enLangSettings =
        productionData?.mixerSettingsByLanguage?.en ??
        productionData?.mixerSettingsByLanguage?.[normalizeStreamLanguage(language) || 'en']
      const shotIncludeCaptions =
        config.includeCaptions ??
        enLangSettings?.languageShotConfigs?.[segmentId]?.includeCaptions ??
        enLangSettings?.includeClipCaptions
      let finalConfig = config
      if (shotIncludeCaptions !== undefined) {
        const segment = segments.find((s) => s.segmentId === segmentId)
        const allBeats = getSceneBeats((scene as Record<string, unknown> | undefined) ?? null)
        const beat = segment?.beatId ? allBeats.find((b) => b.beatId === segment.beatId) : undefined
        const nextPrompt =
          String(beat?.kind) !== 'title'
            ? applyClipCaptionsDirective(config.prompt, {
                includeCaptions: shotIncludeCaptions === true,
                spokenLine: beat?.line || segment?.dialoguePortion?.excerpt,
                targetLanguage: 'en',
                kind: beat?.kind,
              })
            : config.prompt
        finalConfig = {
          ...config,
          prompt: nextPrompt,
          motionPrompt: nextPrompt,
          includeCaptions: shotIncludeCaptions === true,
        }
      }
      updateConfig(segmentId, finalConfig)
      await processQueue({
        mode: 'selected',
        priority: 'sequence',
        delayBetween: 6000,
        selectedIds: [segmentId],
        overrideConfigs: new Map([[segmentId, finalConfig]]),
      })
    },
    [
      productionTarget.language,
      productionData?.mixerSettingsByLanguage,
      scene,
      markShotLanguageRegenerate,
      segments,
      sceneId,
      composeSegmentLanguageClip,
      updateConfig,
      processQueue,
    ]
  )

  const handleRequestTake = useCallback(
    (segment: SceneSegment, focusPrompt = false) => {
      dialogFocusPromptRef.current = focusPrompt
      const pending = resolveRetakeConfirmation(segment, getQueueItem(segment.segmentId), 'openDialog')
      if (pending) {
        setPendingRetakeAction(pending)
        return
      }
      setDialogFocusPrompt(focusPrompt)
      setSelectedSegment(segment)
    },
    [getQueueItem]
  )

  const handleRequestUpload = useCallback(
    (segmentId: string) => {
      const segment = segments.find((s) => s.segmentId === segmentId)
      if (!segment) return
      const pending = resolveRetakeConfirmation(segment, getQueueItem(segmentId), 'upload')
      if (pending) {
        setPendingRetakeAction(pending)
        return
      }
      document.getElementById(`upload-video-${segmentId}`)?.click()
    },
    [segments, getQueueItem]
  )

  const handleConfirmRetake = useCallback(() => {
    if (!pendingRetakeAction) return
    const { segmentId, action } = pendingRetakeAction
    if (action === 'openDialog') {
      const segment = segments.find((s) => s.segmentId === segmentId)
      if (segment) {
        setDialogFocusPrompt(dialogFocusPromptRef.current)
        setSelectedSegment(segment)
      }
    } else {
      document.getElementById(`upload-video-${segmentId}`)?.click()
    }
    setPendingRetakeAction(null)
  }, [pendingRetakeAction, segments])

  const retakeCharacterReferences = useMemo(() => {
    if (!retakeSegment || !scene) return []
    return resolveSegmentEditCharacterReferences({
      segment: retakeSegment,
      scene: scene as Record<string, unknown>,
      sceneIndex: sceneIndex ?? 0,
      characters: characters as Array<Record<string, unknown>>,
    })
  }, [retakeSegment, scene, sceneIndex, characters])

  const handleSubmitRetake = useCallback(
    async (plan: RetakePlan, opts: IntelligentRetakeSubmitOptions) => {
      if (!retakeSegment) return

      const segmentId = retakeSegment.segmentId
      const queueItem = getQueueItem(segmentId)
      const existingConfig = queueItem?.config
      const currentPrompt =
        retakeSegment.userEditedPrompt || retakeSegment.generatedPrompt || existingConfig?.prompt || ''

      const resolvedStartFrameUrl =
        resolveEffectiveStartFrameUrl(
          retakeSegment,
          scene as Record<string, unknown> | undefined,
          sceneImageUrl
        ) ||
        existingConfig?.startFrameUrl?.trim() ||
        retakeSegment.references?.startFrameUrl?.trim() ||
        ''

      let editedStartFrameUrl: string | undefined

      if (opts.fixFrame && resolvedStartFrameUrl && opts.frameEditInstruction) {
        const selectedKeys = new Set(frameEditReferenceKeys(retakeCharacterReferences))
        const referenceImages = buildFrameEditReferenceImages({
          characterReferences: retakeCharacterReferences,
          selectedKeys,
        }).map((ref) => ({
          imageUrl: ref.imageUrl,
          name: ref.name,
        }))

        const response = await fetch('/api/image/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'instruction',
            sourceImage: resolvedStartFrameUrl,
            instruction: opts.frameEditInstruction,
            referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            aspectRatio: videoAspectRatio,
            imageSize: '1K',
            saveToBlob: true,
            blobPrefix: 'edited-start-frame',
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Start frame edit failed')
        }

        if (!data.imageUrl) {
          throw new Error('Start frame edit returned no image URL')
        }

        editedStartFrameUrl = data.imageUrl as string
        onSaveEditedKeyframe?.(sceneId, segmentId, 'start', editedStartFrameUrl)

        if (onProductionDataChange && productionData) {
          onProductionDataChange({
            ...productionData,
            segments: productionData.segments.map((seg) =>
              seg.segmentId === segmentId
                ? {
                    ...seg,
                    references: {
                      ...seg.references,
                      startFrameUrl: editedStartFrameUrl,
                    },
                  }
                : seg
            ),
          })
        }
      }

      const existingNegative = existingConfig?.negativePrompt ?? ''
      const mergedNegative = opts.applyPromptChanges
        ? mergeNegativePrompt(existingNegative, plan.negativePromptAdditions)
        : existingNegative

      const revisedPrompt = opts.applyPromptChanges ? plan.revisedPrompt : currentPrompt

      if (onProductionDataChange && productionData && opts.applyPromptChanges) {
        onProductionDataChange({
          ...productionData,
          segments: productionData.segments.map((seg) =>
            seg.segmentId === segmentId
              ? { ...seg, userEditedPrompt: revisedPrompt }
              : seg
          ),
        })
      }

      const updatedConfig = {
        ...(existingConfig ?? {
          mode: 'I2V' as VideoGenerationMethod,
          prompt: currentPrompt,
          motionPrompt: currentPrompt,
          visualPrompt: currentPrompt,
          negativePrompt: '',
          aspectRatio: videoAspectRatio,
          resolution: '1080p' as const,
          duration: STANDARD_TAKE_DURATION_SECONDS,
          startFrameUrl: resolvedStartFrameUrl || null,
          endFrameUrl: null,
          sourceVideoUrl: null,
          approvalStatus: 'user-approved' as const,
          confidence: 100,
        }),
        mode: 'I2V' as VideoGenerationMethod,
        prompt: revisedPrompt,
        motionPrompt: revisedPrompt,
        visualPrompt: revisedPrompt,
        negativePrompt: mergedNegative,
        startFrameUrl: editedStartFrameUrl ?? resolvedStartFrameUrl ?? existingConfig?.startFrameUrl ?? null,
        videoProvider: 'kling' as const,
      }

      updateConfig(segmentId, updatedConfig)

      const activeLang = productionTarget.language
      const isLangRetake = isLanguageClipTarget(activeLang)
      if (isLangRetake) {
        markShotLanguageRegenerate(activeLang, [segmentId])
      }
      const retakeComposed = isLangRetake
        ? await composeSegmentLanguageClip(
            retakeSegment,
            activeLang,
            revisedPrompt,
            existingConfig?.guidePrompt
          )
        : { prompt: revisedPrompt, guidePrompt: existingConfig?.guidePrompt }

      await onGenerate(sceneId, segmentId, 'I2V', {
        prompt: retakeComposed.prompt,
        guidePrompt: retakeComposed.guidePrompt,
        negativePrompt: mergedNegative || undefined,
        startFrameUrl: editedStartFrameUrl ?? resolvedStartFrameUrl ?? undefined,
        generationMethod: 'I2V',
        videoProvider: 'kling',
        aspectRatio: updatedConfig.aspectRatio,
        resolution: updatedConfig.resolution,
        duration: updatedConfig.duration,
        ...(isLangRetake ? { clipLanguage: activeLang } : {}),
      })

      const { toast } = await import('sonner')
      toast.success('Intelligent retake submitted')
      setRetakeSegment(null)
    },
    [
      retakeSegment,
      getQueueItem,
      scene,
      sceneImageUrl,
      retakeCharacterReferences,
      videoAspectRatio,
      onSaveEditedKeyframe,
      sceneId,
      onProductionDataChange,
      productionData,
      updateConfig,
      productionTarget.language,
      markShotLanguageRegenerate,
      composeSegmentLanguageClip,
      onGenerate,
    ]
  )

  // Handle batch render — Video Agent queues segments with REF, I2V, or FTV configs
  const segmentHasVideoAgentInputs = useCallback(
    (item: DirectorQueueItem, segment: SceneSegment | undefined) => {
      if (!segment) {
        return {
          hasStartFrame: false,
          hasEndFrame: false,
          hasRefs: false,
          resolvedStart: '',
          resolvedEnd: '',
          eligible: false,
        }
      }
      const cfg = item.config
      const sceneRecord = scene as Record<string, unknown> | undefined
      const f2vFrames = resolveF2VFrameUrls(segment, sceneRecord)
      const segFrames = resolveSegmentFrameUrls(segment, sceneImageUrl, sceneRecord)

      let resolvedStart =
        f2vFrames.startFrameUrl ||
        resolveEffectiveStartFrameUrl(segment, sceneRecord, sceneImageUrl) ||
        (cfg.startFrameUrl && String(cfg.startFrameUrl).trim()) ||
        segment.startFrameUrl?.trim() ||
        segment.references?.startFrameUrl?.trim() ||
        ''

      // Continuity fallback: only inherit Shot N-1's end frame across explicit CONTINUE cuts
      if (!resolvedStart && segments.length > 1) {
        const segIdx = segments.findIndex((s) => s.segmentId === segment.segmentId)
        if (segIdx > 0) {
          const prevSeg = segments[segIdx - 1]
          const beats = getSceneBeats(sceneRecord ?? null)
          const curBeat = segment.beatId
            ? beats.find((b) => b.beatId === segment.beatId)
            : beats[segIdx]
          const isContinuousCut =
            segment.transitionType === 'CONTINUE' ||
            (curBeat as { transitionType?: string } | undefined)?.transitionType === 'CONTINUE'
          if (isContinuousCut) {
            const prevBeat = prevSeg?.beatId
              ? beats.find((b) => b.beatId === prevSeg.beatId)
              : beats[segIdx - 1]
            resolvedStart =
              prevBeat?.storyboardEndImageUrl?.trim() ||
              prevSeg?.endFrameUrl?.trim() ||
              prevSeg?.references?.endFrameUrl?.trim() ||
              ''
          }
        }
      }

      const rawEnd =
        f2vFrames.endFrameUrl ||
        segFrames.endFrameUrl ||
        (cfg.endFrameUrl && String(cfg.endFrameUrl).trim()) ||
        segment.endFrameUrl?.trim() ||
        segment.references?.endFrameUrl?.trim() ||
        ''
      const resolvedEnd =
        rawEnd && rawEnd !== resolvedStart ? rawEnd : ''

      const hasStartFrame = !!resolvedStart
      const hasEndFrame = !!resolvedEnd
      const hasRefs = (cfg.referenceImages?.length ?? 0) > 0 || cfg.mode === 'REF'
      const hasPrompt = Boolean(
        cfg.prompt?.trim() ||
          segment.userEditedPrompt?.trim() ||
          segment.generatedPrompt?.trim()
      )
      return {
        hasStartFrame,
        hasEndFrame,
        hasRefs,
        resolvedStart,
        resolvedEnd,
        eligible: hasRefs || hasStartFrame || hasPrompt,
      }
    },
    [scene, sceneImageUrl, segments]
  )

  const videoAgentBeats = useMemo<VideoAgentBeatOption[]>(() => {
    const beats = getSceneBeats((scene as Record<string, unknown> | undefined) ?? null)
    const isLanguageStream = isLanguageClipTarget(productionTarget.language)
    const langShotConfigs = isLanguageStream
      ? productionData?.mixerSettingsByLanguage?.[productionTarget.language]?.languageShotConfigs
      : undefined
    return queue.flatMap((item) => {
      const segment = segments.find((s) => s.segmentId === item.segmentId)
      const beat = beats.find((entry) => entry.beatId === segment?.beatId)
      if (beat && isBeatExcluded(beat)) return []
      const rawBeatIndex = beat ? beats.findIndex((entry) => entry.beatId === beat.beatId) : -1
      const sequenceIndex =
        typeof beat?.sequenceIndex === 'number'
          ? beat.sequenceIndex
          : rawBeatIndex >= 0
            ? rawBeatIndex
            : item.sequenceIndex
      const inputs = segmentHasVideoAgentInputs(item, segment)
      const spoken = beat
        ? beat.kind === 'action'
          ? beat.actionDescription
          : beat.line
        : undefined
      const description = (spoken || beat?.character || `Shot ${sequenceIndex + 1}`)
        .replace(/\s+/g, ' ')
        .trim()
      let hasVideo = item.status === 'complete'
      let retainsMasterInLanguage = false
      if (isLanguageStream && segment) {
        const playback = resolveLanguageClipPlayback(segment, productionTarget.language)
        const hasLanguageClip = !playback.usingMaster && !!playback.url
        const shotCfg = langShotConfigs?.[segment.segmentId]
        const sourcePrompt =
          segment.userEditedPrompt || segment.generatedPrompt || item.config.prompt || ''
        const needsLanguageClip = segmentNeedsLanguageClip({
          beatKind: beat?.kind,
          beatCharacter: beat?.character,
          beatLine: beat?.line,
          excerpt: segment.dialoguePortion?.excerpt,
          dialogueLines: segment.dialogueLines,
          sourcePrompt,
          shotMethod: shotCfg?.method,
          customSignageText: shotCfg?.signageText,
        })
        retainsMasterInLanguage = !needsLanguageClip && !hasLanguageClip
        hasVideo = hasLanguageClip || (retainsMasterInLanguage && item.status === 'complete')
      }
      return [
        {
          segmentId: item.segmentId,
          sequenceIndex,
          description,
          hasVideo,
          isRendering: item.status === 'rendering',
          hasError: item.status === 'error',
          eligible: inputs.eligible,
          hasStartFrame: inputs.hasStartFrame,
          hasEndFrame: inputs.hasEndFrame,
          promptChanged:
            segment?.isStale !== undefined
              ? Boolean(segment.isStale)
              : beat
                ? isBeatFrameStale(beat)
                : false,
          imageTier: resolveSegmentClipTier(beat, segment, item.config),
          ...(isLanguageStream ? { retainsMasterInLanguage } : {}),
        },
      ]
    })
  }, [
    queue,
    segments,
    scene,
    segmentHasVideoAgentInputs,
    productionTarget.language,
    productionData?.mixerSettingsByLanguage,
  ])

  const applyVideoAgentPolicyToItem = useCallback(
    (item: DirectorQueueItem, options: VideoAgentConfirmOptions) => {
      const policy = resolveVideoGeneration({
        quality: options.quality,
        mode: options.generationMode,
        sourceMethod: options.sourceMethod ?? effectiveVideoSourceMethod,
      })
      const segment = segments.find((s) => s.segmentId === item.segmentId)
      if (!segment) {
        return applyVideoGenerationToConfig(item.config, policy, {
          resolution: policy.resolution,
        })
      }
      return buildConsolidatedTakeConfig({
        segment,
        allSegments: segments,
        sceneImageUrl,
        guideContext: segmentGuideContext,
        savedConfig: item.config,
        defaultAspectRatio: videoAspectRatio,
        quality: options.quality,
        generationMode: options.generationMode,
        sourceMethod: options.sourceMethod ?? effectiveVideoSourceMethod,
        artStyleId,
        snapDuration: (rawDuration, isCreative, qualityOpt) => {
          const selection = isCreative
            ? ({
                engineId: SCENEFLOW_ENGINE_ID,
                qualityTierId: qualityOpt === 'final' ? 'cinematic' : 'standard',
              } as const)
            : ({ engineId: 'natural-dialogue' } as const)
          return snapDurationForEngine(rawDuration, selection)
        },
      })
    },
    [
      segments,
      sceneImageUrl,
      segmentGuideContext,
      videoAspectRatio,
      effectiveVideoSourceMethod,
      artStyleId,
    ]
  )

  const handleVideoAgentConfirm = useCallback(
    async (options: VideoAgentConfirmOptions) => {
      const selected = new Set(options.selectedSegmentIds)
      const expressIds = queue
        .filter((item) => selected.has(item.segmentId) && item.status !== 'rendering')
        .map((item) => item.segmentId)

      if (expressIds.length === 0) {
        import('sonner').then(({ toast }) => {
          toast.info(
            'No eligible segments for Video Agent — need shot references or a start Shot Frame, and not already rendering.'
          )
        })
        return
      }

      const language = productionTarget.language
      const isLanguageStream = isLanguageClipTarget(language)
      setVideoAgentDialogOpen(false)

      if (onProductionDataChange && productionData) {
        const langKey = isLanguageStream ? language : 'en'
        const byLang = migrateMixerSettingsByLanguage(productionData)
        const existingLangSettings = byLang[langKey] ?? {}
        const nextShotConfigs = { ...(existingLangSettings.languageShotConfigs ?? {}) }
        for (const segmentId of expressIds) {
          nextShotConfigs[segmentId] = {
            ...nextShotConfigs[segmentId],
            ...(isLanguageStream ? { method: 'regenerate' as const } : {}),
            ...(options.includeCaptions !== undefined
              ? { includeCaptions: options.includeCaptions === true }
              : {}),
          }
        }
        onProductionDataChange({
          ...productionData,
          mixerSettingsByLanguage: {
            ...byLang,
            [langKey]: {
              ...existingLangSettings,
              ...(options.includeCaptions !== undefined
                ? { includeClipCaptions: options.includeCaptions === true }
                : {}),
              languageShotConfigs: nextShotConfigs,
            },
          },
        })
      }

      const overrideConfigs = new Map<string, VideoGenerationConfig>()
      if (isLanguageStream) {
        const languageName = getLanguageName(language)
        const translateToastId = `lang-clips-prep-${sceneId}-${language}`
        const { toast } = await import('sonner')
        toast.loading(
          `Translating & queueing ${expressIds.length} ${languageName} clip${expressIds.length > 1 ? 's' : ''}…`,
          { id: translateToastId }
        )
        onVideoRunReport?.({
          sceneId,
          sceneLabel: `Scene ${sceneNumber} (${languageName})`,
          total: expressIds.length,
          completed: 0,
          failed: 0,
          finished: false,
          cancelled: false,
          rateLimitCountdown: 0,
          items: expressIds.map((segId, idx) => {
            const seg = segments.find((s) => s.segmentId === segId)
            const shotNum = (seg?.sequenceIndex ?? idx) + 1
            return {
              key: segId,
              label: `Shot ${shotNum}`,
              status: idx === 0 ? ('running' as const) : ('pending' as const),
            }
          }),
        })

        try {
          await Promise.all(
            expressIds.map(async (segmentId) => {
              const item = queue.find((q) => q.segmentId === segmentId)
              if (!item) return
              const nextConfig = applyVideoAgentPolicyToItem(item, options)
              const segment = segments.find((s) => s.segmentId === segmentId)
              if (segment) {
                const composed = await composeSegmentLanguageClip(
                  segment,
                  language,
                  nextConfig.prompt,
                  nextConfig.guidePrompt,
                  options.includeCaptions
                )
                overrideConfigs.set(segmentId, {
                  ...nextConfig,
                  prompt: composed.prompt,
                  motionPrompt: composed.prompt,
                  guidePrompt: composed.guidePrompt,
                  clipLanguage: language,
                  includeCaptions: composed.includeCaptions,
                })
              } else {
                overrideConfigs.set(segmentId, {
                  ...nextConfig,
                  clipLanguage: language,
                  includeCaptions: options.includeCaptions === true,
                })
              }
            })
          )
          toast.info(
            `Generating ${expressIds.length} ${languageName} clip${expressIds.length > 1 ? 's' : ''} in background…`,
            { id: translateToastId, duration: 4000 }
          )
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Could not translate shot for language stream',
            { id: translateToastId }
          )
          onVideoRunReport?.({
            sceneId,
            sceneLabel: `Scene ${sceneNumber} (${languageName})`,
            total: expressIds.length,
            completed: 0,
            failed: expressIds.length,
            finished: true,
            cancelled: false,
            rateLimitCountdown: 0,
            items: expressIds.map((segId, idx) => {
              const seg = segments.find((s) => s.segmentId === segId)
              const shotNum = (seg?.sequenceIndex ?? idx) + 1
              return {
                key: segId,
                label: `Shot ${shotNum}`,
                status: 'error' as const,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Could not translate shot for language stream',
              }
            }),
          })
          return
        }
      } else {
        const allBeats = getSceneBeats((scene as Record<string, unknown> | undefined) ?? null)
        for (const segmentId of expressIds) {
          const item = queue.find((q) => q.segmentId === segmentId)
          if (!item) continue
          let nextConfig = applyVideoAgentPolicyToItem(item, options)
          if (options.includeCaptions !== undefined) {
            const segment = segments.find((s) => s.segmentId === segmentId)
            const beat = segment?.beatId ? allBeats.find((b) => b.beatId === segment.beatId) : undefined
            const nextPrompt =
              String(beat?.kind) !== 'title'
                ? applyClipCaptionsDirective(nextConfig.prompt, {
                    includeCaptions: options.includeCaptions === true,
                    spokenLine: beat?.line || segment?.dialoguePortion?.excerpt,
                    targetLanguage: 'en',
                    kind: beat?.kind,
                  })
                : nextConfig.prompt
            nextConfig = {
              ...nextConfig,
              prompt: nextPrompt,
              motionPrompt: nextPrompt,
              includeCaptions: options.includeCaptions === true,
            }
          }
          overrideConfigs.set(segmentId, nextConfig)
          updateConfig(segmentId, nextConfig)
        }
      }

      processQueue({
        mode: 'selected',
        priority: 'sequence',
        delayBetween: 500,
        selectedIds: expressIds,
        concurrency: CONCURRENCY_DEFAULTS.VIDEO_GENERATION,
        ...(isLanguageStream ? { clipLanguage: language } : {}),
        overrideConfigs,
      })
    },
    [
      queue,
      applyVideoAgentPolicyToItem,
      processQueue,
      updateConfig,
      productionTarget.language,
      onProductionDataChange,
      productionData,
      segments,
      composeSegmentLanguageClip,
      onVideoRunReport,
      sceneId,
      sceneNumber,
    ]
  )

  const handleOpenVideoAgent = useCallback(() => {
    if (queue.length === 0) return
    setVideoAgentDialogOpen(true)
  }, [queue.length])

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

  const persistFinalCutSelection = useCallback(
    async (nextSelection: FinalCutSelection, toastMessage: string) => {
      if (!currentProject) return
      setIsDesignatingScreening(true)
      try {
        await persistFinalCutSelectionApi(projectId, nextSelection)
        updateProject(projectId, {
          metadata: {
            ...(currentProject.metadata as Record<string, unknown>),
            finalCut: nextSelection,
          } as typeof currentProject.metadata,
        })
        const { toast } = await import('sonner')
        toast.success(toastMessage)
      } catch (err) {
        const { toast } = await import('sonner')
        toast.error(err instanceof Error ? err.message : 'Failed to save screening version')
      } finally {
        setIsDesignatingScreening(false)
      }
    },
    [currentProject, projectId, updateProject]
  )

  const streamMatchesScreeningOverride = useCallback(
    (stream: ProductionStream, override?: FinalCutSceneOverride) => {
      if (!override || override.streamType !== 'video') return false
      return (
        override.language === stream.language &&
        (override.streamVersion ?? 1) === (stream.streamVersion ?? 1)
      )
    },
    []
  )

  const handleDesignateScreeningStream = useCallback(
    async (streamId: string) => {
      const stream = productionStreams.find((s) => s.id === streamId)
      if (!stream || stream.streamType !== 'video' || stream.status !== 'complete') return

      const base = readFinalCutSelection(currentProject?.metadata)
      const overrides = { ...(base.perSceneOverrides ?? {}) }
      const current = overrides[sceneId]
      const alreadyDesignated = current && streamMatchesScreeningOverride(stream, current)

      if (alreadyDesignated) {
        delete overrides[sceneId]
        await persistFinalCutSelection(
          { ...base, perSceneOverrides: overrides },
          `Scene ${sceneNumber}: Screening Room will use the latest video version`
        )
        return
      }

      overrides[sceneId] = {
        streamType: 'video',
        language: stream.language as ProductionLanguage,
        streamVersion: stream.streamVersion ?? 1,
      }
      if (stream.mp4Url) {
        setRenderedSceneUrl(stream.mp4Url)
      }
      if (onProductionDataChange && productionData) {
        onProductionDataChange({
          ...productionData,
          currentStreamId: stream.id,
          ...(stream.mp4Url ? { renderedSceneUrl: stream.mp4Url } : {}),
        })
      }
      await persistFinalCutSelection(
        { ...base, perSceneOverrides: overrides },
        `Scene ${sceneNumber}: Screening Room will use Video v${stream.streamVersion ?? 1}`
      )
    },
    [
      productionStreams,
      currentProject?.metadata,
      sceneId,
      sceneNumber,
      streamMatchesScreeningOverride,
      persistFinalCutSelection,
      onProductionDataChange,
      productionData,
    ]
  )

  const handleUseStreamVersion = useCallback(
    (streamId: string) => {
      if (!onProductionDataChange || !productionData) return
      const stream = productionStreams.find((s) => s.id === streamId)
      if (!stream || stream.status !== 'complete') return
      if (stream.streamType === 'video' && stream.mp4Url) {
        setRenderedSceneUrl(stream.mp4Url)
      }
      onProductionDataChange({
        ...productionData,
        currentStreamId: stream.id,
        ...(stream.streamType === 'video' && stream.mp4Url
          ? { renderedSceneUrl: stream.mp4Url }
          : {}),
      })
      if (stream.streamType === 'video' && currentProject) {
        const base = readFinalCutSelection(currentProject.metadata)
        const overrides = { ...(base.perSceneOverrides ?? {}) }
        overrides[sceneId] = {
          streamType: 'video',
          language: stream.language as ProductionLanguage,
          streamVersion: stream.streamVersion ?? 1,
        }
        void persistFinalCutSelection(
          { ...base, perSceneOverrides: overrides },
          `Scene ${sceneNumber}: Using Video v${stream.streamVersion ?? 1}`
        )
      }
    },
    [
      onProductionDataChange,
      productionData,
      productionStreams,
      currentProject,
      sceneId,
      sceneNumber,
      persistFinalCutSelection,
    ]
  )
  
  // Delete a production stream
  const handleDeleteStream = useCallback((streamId: string) => {
    const deletedStream = productionStreams.find((s) => s.id === streamId)
    const updatedStreams = productionStreams.filter(s => s.id !== streamId)
    setProductionStreams(updatedStreams)

    const latestRemainingVideoUrl =
      updatedStreams
        .filter((s) => (s.streamType === 'video' || !s.streamType) && s.status === 'complete' && s.mp4Url)
        .slice(-1)[0]?.mp4Url ?? null
    const deletedUrl = deletedStream?.mp4Url?.trim()
    const shouldReplaceRenderedUrl =
      !!deletedUrl &&
      (renderedSceneUrl?.trim() === deletedUrl || productionData?.renderedSceneUrl?.trim() === deletedUrl)
    const nextRenderedSceneUrl = shouldReplaceRenderedUrl
      ? latestRemainingVideoUrl
      : productionData?.renderedSceneUrl
    if (shouldReplaceRenderedUrl) {
      setRenderedSceneUrl(latestRemainingVideoUrl)
    }

    // Persist to database
    if (onProductionDataChange && productionData) {
      const deletedStreamIds = Array.from(
        new Set([...(productionData.deletedStreamIds ?? []), streamId])
      )
      const nextCurrentStreamId =
        productionData.currentStreamId === streamId
          ? updatedStreams.filter((s) => s.status === 'complete' && s.mp4Url).slice(-1)[0]?.id
          : productionData.currentStreamId
      onProductionDataChange({
        ...productionData,
        productionStreams: updatedStreams,
        deletedStreamIds,
        renderedSceneUrl: nextRenderedSceneUrl,
        currentStreamId: nextCurrentStreamId,
      })
    }

    if (deletedStream && currentProject) {
      const base = readFinalCutSelection(currentProject.metadata)
      const override = base.perSceneOverrides?.[sceneId]
      if (override && streamMatchesScreeningOverride(deletedStream, override)) {
        const overrides = { ...(base.perSceneOverrides ?? {}) }
        delete overrides[sceneId]
        void persistFinalCutSelection(
          { ...base, perSceneOverrides: overrides },
          `Scene ${sceneNumber}: Screening version cleared (stream deleted)`
        )
      }
    }
  }, [
    productionStreams,
    productionData,
    renderedSceneUrl,
    onProductionDataChange,
    currentProject,
    sceneId,
    sceneNumber,
    streamMatchesScreeningOverride,
    persistFinalCutSelection,
  ])
  
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
        if (streamType === 'video') {
          setRenderedSceneUrl(blob.url)
        }
        if (onProductionDataChange && productionData) {
          onProductionDataChange({
            ...productionData,
            productionStreams: updatedStreams,
            currentStreamId: newStream.id,
            ...(streamType === 'video'
              ? { renderedSceneUrl: blob.url, renderedAt: newStream.completedAt }
              : {}),
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
  
  const publishAppendedRender = useCallback((stream: ProductionStream) => {
    const planned = planSceneRenderAppend({
      streams: productionStreams,
      renderedSceneUrl,
      stream,
    })
    const saved = planned.streams.find((item) => item.id === stream.id) ?? stream
    setProductionStreams(planned.streams)
    if (planned.renderedSceneUrl) setRenderedSceneUrl(planned.renderedSceneUrl)
    dispatchAppendedSceneRender(sceneId, saved)
    void appendSceneRenderClient(projectId, sceneId, saved).catch((error) => {
      console.error('[DirectorConsole] Failed to append scene render:', error)
    })
  }, [productionStreams, renderedSceneUrl, projectId, sceneId])

  // Update stream when render completes. Adds the file only — shot clips stay put.
  const handleRenderComplete = useCallback((
    downloadUrl: string,
    streamType?: 'video' | 'animatic',
    meta?: { durationSeconds?: number }
  ) => {
    console.log('[DirectorConsole] Scene render complete:', downloadUrl)
    const dur =
      typeof meta?.durationSeconds === 'number' &&
      Number.isFinite(meta.durationSeconds) &&
      meta.durationSeconds > 0
        ? meta.durationSeconds
        : undefined
    const st = streamType === 'animatic' ? 'animatic' : 'video'
    const existing = renderingStreamId
      ? productionStreams.find((stream) => stream.id === renderingStreamId)
      : undefined
    const language = existing?.language || productionTarget.language
    const languageInfo = SUPPORTED_LANGUAGES.find((item) => item.code === language)
    const stream: ProductionStream = existing
      ? {
          ...existing,
          status: 'complete',
          mp4Url: downloadUrl,
          completedAt: new Date().toISOString(),
          streamType: st,
          source: existing.source ?? 'render',
          ...(dur !== undefined ? { duration: dur } : {}),
        }
      : {
          id: `scene-render-${Date.now()}`,
          language,
          languageLabel: languageInfo?.name || language,
          status: 'complete',
          streamType: st,
          mp4Url: downloadUrl,
          completedAt: new Date().toISOString(),
          source: 'render',
          ...(dur !== undefined ? { duration: dur } : {}),
        }
    publishAppendedRender(stream)
    if (renderingStreamId) {
      setRenderingStreamId(null)
      setStreamRenderProgress(0)
    }
  }, [renderingStreamId, productionStreams, productionTarget.language, publishAppendedRender])
  
  const videoClips = useMemo<BeatVideoClip[]>(() => {
    const activeLangKey = normalizeStreamLanguage(productionTarget.language) || 'en'
    const activeLangSettings =
      productionData?.mixerSettingsByLanguage?.[productionTarget.language] ??
      productionData?.mixerSettingsByLanguage?.[activeLangKey]
    return buildBeatVideoClips({
      scene: (scene as Record<string, unknown> | undefined) ?? null,
      segments,
      queue,
      languageShotConfigs: activeLangSettings?.languageShotConfigs,
      includeClipCaptions: activeLangSettings?.includeClipCaptions,
      streamLanguage: productionTarget.language,
      sceneIndex,
      scenes: scenes as Array<Record<string, unknown> | null | undefined> | undefined,
      sceneTranslations,
      timedDialogueOverrides:
        timedDialogueOverrides[normalizeStreamLanguage(productionTarget.language)],
      videoSourceMethod: effectiveVideoSourceMethod,
    })
  }, [
    scene,
    segments,
    queue,
    productionData?.mixerSettingsByLanguage,
    productionTarget.language,
    sceneIndex,
    scenes,
    sceneTranslations,
    timedDialogueOverrides,
    effectiveVideoSourceMethod,
  ])

  // Count active (included) segments by status for the selected language
  const statusCounts = useMemo(() => {
    const isLangStream = !isMasterStreamLanguage(productionTarget.language)
    if (videoClips.length > 0) {
      const rendered = videoClips.filter((clip) => {
        const masterDone =
          clip.queueItem?.status === 'complete' || segmentHasPlayableVideo(clip.segment)
        if (!isLangStream) return masterDone
        if (!clip.segment) return false
        const playback = resolveLanguageClipPlayback(clip.segment, productionTarget.language)
        const hasLangClip = !playback.usingMaster && !!playback.url
        if (hasLangClip) return true
        return !clip.needsLanguageClip && masterDone
      }).length
      return {
        rendered,
        total: videoClips.length,
      }
    }
    const allBeats = getSceneBeats((scene as Record<string, unknown> | undefined) ?? null)
    const excludedIds = new Set(
      allBeats.filter((beat) => isBeatExcluded(beat)).map((beat) => beat.beatId)
    )
    const activeQueue =
      excludedIds.size === 0
        ? queue
        : queue.filter((q) => {
            const seg = segments.find((s) => s.segmentId === q.segmentId)
            return !(seg?.beatId && excludedIds.has(seg.beatId))
          })
    return {
      rendered: activeQueue.filter((q) => q.status === 'complete').length,
      total: activeQueue.length,
    }
  }, [videoClips, productionTarget.language, queue, segments, scene])

  const handleRestoreVideoTake = useCallback((segmentId: string, takeId: string) => {
    if (!onProductionDataChange || !productionData) return
    onProductionDataChange({
      ...productionData,
      segments: productionData.segments.map((segment) =>
        segment.segmentId === segmentId ? applyVideoTakeSelection(segment, takeId) : segment
      ),
    })
  }, [onProductionDataChange, productionData])

  const handleRestoreLanguageVersion = useCallback((segmentId: string, takeId: string) => {
    if (!onProductionDataChange || !productionData) return
    const language = productionTarget.language
    if (isMasterStreamLanguage(language)) {
      handleRestoreVideoTake(segmentId, takeId)
      return
    }
    const byLang = migrateMixerSettingsByLanguage(productionData)
    const existingLangSettings = byLang[language] ?? {}
    const nextShotConfigs = {
      ...(existingLangSettings.languageShotConfigs ?? {}),
      [segmentId]: {
        ...(existingLangSettings.languageShotConfigs?.[segmentId] ?? {}),
        method: 'regenerate' as const,
      },
    }
    onProductionDataChange({
      ...productionData,
      segments: productionData.segments.map((segment) =>
        segment.segmentId === segmentId
          ? withSelectedLanguageClip(segment, language, takeId)
          : segment
      ),
      mixerSettingsByLanguage: {
        ...byLang,
        [language]: {
          ...existingLangSettings,
          languageShotConfigs: nextShotConfigs,
        },
      },
    })
  }, [onProductionDataChange, productionData, productionTarget.language, handleRestoreVideoTake])

  const handleStreamLanguageChange = useCallback((language: string) => {
    const next = { ...productionTarget, language }
    setProductionTarget(next)
    onLanguageChange?.(language)
    if (!onProductionDataChange || !productionData) return
    const saved = productionData.mixerSettings?.productionTarget
    if (saved?.language === next.language && saved?.streamType === next.streamType) return
    onProductionDataChange({
      ...productionData,
      mixerSettings: {
        ...productionData.mixerSettings,
        productionTarget: next,
      },
    })
  }, [onProductionDataChange, productionData, productionTarget, onLanguageChange])

  const streamLanguages = useMemo(() => {
    const langs = new Set<string>()
    const dialogueAudio = scene?.dialogueAudio
    if (dialogueAudio && !Array.isArray(dialogueAudio)) {
      Object.keys(dialogueAudio).forEach((code) => langs.add(code))
    }
    const narrationAudio = scene?.narrationAudio
    if (narrationAudio) Object.keys(narrationAudio).forEach((code) => langs.add(code))
    for (const segment of segments) {
      Object.keys(segment.languageVersions || {}).forEach((code) => langs.add(code))
    }
    if (productionTarget.language) langs.add(productionTarget.language)
    return mergeStreamSelectorLanguages(projectStreams, langs)
  }, [scene?.dialogueAudio, scene?.narrationAudio, segments, projectStreams, productionTarget.language])

  const languagesNotYetGenerated = useMemo(
    () => SUPPORTED_LANGUAGES.map((lang) => lang.code).filter((code) => !streamLanguages.includes(code)),
    [streamLanguages]
  )

  const handleGenerateLanguageVersion = useCallback(async (segment: SceneSegment) => {
    const language = productionTarget.language
    if (isMasterStreamLanguage(language)) return
    markShotLanguageRegenerate(language, [segment.segmentId])
    setLanguageClipBusyId(segment.segmentId)
    const languageName = getLanguageName(language)
    const shotNumber = (segment.sequenceIndex ?? 0) + 1
    const shotLabel = `Shot ${shotNumber} (${languageName})`
    const runSceneLabel = `Scene ${sceneNumber} (${languageName})`
    const toastId = `lang-clip-${sceneId}-${segment.segmentId}-${language}`
    const { toast } = await import('sonner')
    toast.loading(`Translating & generating ${languageName} clip for Shot ${shotNumber}…`, {
      id: toastId,
    })
    onVideoRunReport?.({
      sceneId,
      sceneLabel: runSceneLabel,
      total: 1,
      completed: 0,
      failed: 0,
      finished: false,
      cancelled: false,
      rateLimitCountdown: 0,
      items: [{ key: segment.segmentId, label: shotLabel, status: 'running' }],
    })
    try {
      const queueItem = getQueueItem(segment.segmentId)
      const config = queueItem
        ? applyVideoAgentPolicyToItem(queueItem, {
            scope: 'selected',
            selectedSegmentIds: [segment.segmentId],
            quality: videoGenerationQuality,
            generationMode: videoGenerationMode,
            sourceMethod: effectiveVideoSourceMethod,
          })
        : undefined
      let composed: { prompt: string; guidePrompt?: string; includeCaptions: boolean }
      try {
        composed = await composeSegmentLanguageClip(
          segment,
          language,
          config?.prompt,
          config?.guidePrompt,
          undefined,
          effectiveVideoSourceMethod
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not translate this shot'
        toast.error(message, { id: toastId })
        onVideoRunReport?.({
          sceneId,
          sceneLabel: runSceneLabel,
          total: 1,
          completed: 0,
          failed: 1,
          finished: true,
          cancelled: false,
          rateLimitCountdown: 0,
          items: [{ key: segment.segmentId, label: shotLabel, status: 'error', error: message }],
        })
        return
      }
      const sessionPolicy = resolveVideoGeneration({
        quality: videoGenerationQuality,
        mode: videoGenerationMode,
        sourceMethod: effectiveVideoSourceMethod,
      })
      const f2vFrames = resolveF2VFrameUrls(
        segment,
        scene as Record<string, unknown> | undefined
      )
      const fallbackStartFrameUrl =
        f2vFrames.startFrameUrl ||
        resolveEffectiveStartFrameUrl(
          segment,
          scene as Record<string, unknown> | undefined,
          sceneImageUrl
        ) ||
        config?.startFrameUrl ||
        undefined
      const fallbackEndFrameUrl =
        f2vFrames.endFrameUrl || config?.endFrameUrl || undefined
      const effectiveMethod: VideoGenerationMethod =
        config?.mode === 'REF'
          ? 'REF'
          : config?.mode === 'FTV'
            ? 'FTV'
            : config?.mode === 'T2V'
              ? 'T2V'
              : effectiveVideoSourceMethod === 'frame'
                ? fallbackStartFrameUrl &&
                  fallbackEndFrameUrl &&
                  fallbackEndFrameUrl !== fallbackStartFrameUrl
                  ? 'FTV'
                  : 'I2V'
                : 'I2V'
      const isFrameMethod = effectiveMethod === 'FTV' || effectiveMethod === 'I2V'
      const mode: 'T2V' | 'I2V' =
        effectiveMethod === 'T2V' || effectiveMethod === 'REF' ? 'T2V' : 'I2V'
      await onGenerate(sceneId, segment.segmentId, mode, {
        prompt: composed.prompt,
        guidePrompt: composed.guidePrompt,
        negativePrompt: config?.negativePrompt || undefined,
        startFrameUrl:
          isFrameMethod || config?.useBeatFrameAsStart
            ? fallbackStartFrameUrl
            : undefined,
        endFrameUrl: effectiveMethod === 'FTV' ? fallbackEndFrameUrl : undefined,
        referenceImages: isFrameMethod ? undefined : config?.referenceImages,
        useBeatFrameAsStart: isFrameMethod ? true : Boolean(config?.useBeatFrameAsStart),
        generationMethod: effectiveMethod,
        videoProvider: sessionPolicy.videoProvider,
        qualityTier: sessionPolicy.qualityTier,
        klingModel: sessionPolicy.klingModel,
        klingQuality: sessionPolicy.klingQuality,
        aspectRatio: config?.aspectRatio,
        resolution: sessionPolicy.resolution,
        duration: config?.duration,
        frameRate: config?.frameRate,
        thinkingLevel: config?.thinkingLevel,
        omniMultiShot: config?.omniMultiShot,
        clipLanguage: language,
        includeCaptions: composed.includeCaptions,
      })
      toast.dismiss(toastId)
      onVideoRunReport?.({
        sceneId,
        sceneLabel: runSceneLabel,
        total: 1,
        completed: 1,
        failed: 0,
        finished: true,
        cancelled: false,
        rateLimitCountdown: 0,
        items: [{ key: segment.segmentId, label: shotLabel, status: 'done' }],
      })
    } catch (error) {
      toast.dismiss(toastId)
      onVideoRunReport?.({
        sceneId,
        sceneLabel: runSceneLabel,
        total: 1,
        completed: 0,
        failed: 1,
        finished: true,
        cancelled: false,
        rateLimitCountdown: 0,
        items: [
          {
            key: segment.segmentId,
            label: shotLabel,
            status: 'error',
            error: error instanceof Error ? error.message : 'Generation failed',
          },
        ],
      })
    } finally {
      setLanguageClipBusyId(null)
    }
  }, [
    productionTarget.language,
    markShotLanguageRegenerate,
    scene,
    sceneNumber,
    getQueueItem,
    applyVideoAgentPolicyToItem,
    sceneImageUrl,
    onGenerate,
    onVideoRunReport,
    sceneId,
    composeSegmentLanguageClip,
    videoGenerationQuality,
    videoGenerationMode,
    effectiveVideoSourceMethod,
  ])

  // No segments state — only when this console owns the whole layout.
  // The production strip still needs Video / Mixer / Streams slots with zero clips.
  if (segments.length === 0 && !children) {
    return (
      <div className="p-8 text-center">
        <Clapperboard className="w-16 h-16 mx-auto mb-4 text-slate-500 opacity-30" />
        <h3 className="!text-base !leading-normal font-semibold text-slate-300 mb-2">No Shots Available</h3>
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
      sceneId={sceneId}
      finalCutSelection={finalCutSelection}
      onDesignateScreeningStream={handleDesignateScreeningStream}
      isDesignatingScreening={isDesignatingScreening}
      onUseStreamVersion={handleUseStreamVersion}
      currentStreamId={productionData?.currentStreamId}
      onStreamTypeChange={(streamType) =>
        setProductionTarget((prev) => ({ ...prev, streamType }))
      }
      onRenderAnimatic={undefined}
      streamLanguages={streamLanguages}
      onLanguageChange={handleStreamLanguageChange}
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
        key={sceneId}
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
          scoreScene: scene as Record<string, unknown> | undefined,
        }}
        textOverlays={textOverlays}
        onTextOverlaysChange={handleTextOverlaysChange}
        sceneIndex={sceneIndex}
        onGenerateSceneAudio={onGenerateSceneAudio}
        onGenerateLanguageStream={onGenerateLanguageStream}
        onGenerateLanguageVersion={(segment) => {
          void handleGenerateLanguageVersion(segment)
        }}
        generatingLanguageClipId={languageClipBusyId}
        isGeneratingAudio={isGeneratingAudio}
        productionTarget={productionTarget}
        onProductionTargetChange={(nextTarget) => {
          const normalizedLang = normalizeStreamLanguage(nextTarget.language)
          const next = { ...nextTarget, language: normalizedLang }
          setProductionTarget(next)
          if (normalizedLang !== productionTarget.language) {
            onLanguageChange?.(normalizedLang)
          }
        }}
        videoGenerationAvailable={videoGenerationAvailable}
        onSegmentsChange={(updatedSegments) => {
          if (onProductionDataChange && productionData) {
            onProductionDataChange({
              ...productionData,
              segments: updatedSegments,
            })
          }
        }}
        onMixerSettingsChange={(payload: MixerSettingsPersistPayload) => {
          if (!onProductionDataChange) return
          const base =
            productionData ??
            ({
              isSegmented: segments.length > 0,
              targetSegmentDuration: 10,
              segments,
            } as import('./types').SceneProductionData)
          const byLang = migrateMixerSettingsByLanguage(base)
          const nextMixerSettingsByLanguage = {
            ...byLang,
            [payload.language]: {
              ...byLang[payload.language],
              ...payload.languageSettings,
            },
          }
          const nextMixerSettings = {
            productionTarget: payload.productionTarget ?? base.mixerSettings?.productionTarget,
            collapsedSections: payload.collapsedSections ?? base.mixerSettings?.collapsedSections,
            theaterMode: payload.theaterMode ?? base.mixerSettings?.theaterMode,
          }
          const nextTextOverlayTranslations =
            payload.textOverlayTranslations ?? base.textOverlayTranslations

          if (
            JSON.stringify(base.mixerSettingsByLanguage) ===
              JSON.stringify(nextMixerSettingsByLanguage) &&
            JSON.stringify(base.mixerSettings) === JSON.stringify(nextMixerSettings) &&
            JSON.stringify(base.textOverlayTranslations) ===
              JSON.stringify(nextTextOverlayTranslations)
          ) {
            return
          }

          onProductionDataChange({
            ...base,
            mixerSettingsByLanguage: nextMixerSettingsByLanguage,
            mixerSettings: nextMixerSettings,
            textOverlayTranslations: nextTextOverlayTranslations,
          })
        }}
        projectStreams={projectStreams}
        scenes={scenes}
        script={script}
        onScriptChange={onScriptChange}
        onSceneRenderQueued={onSceneRenderQueued}
        onRenderComplete={(downloadUrl, language, streamType = productionTarget.streamType, meta) => {
          const languageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language)
          const st = streamType === 'animatic' ? 'animatic' : 'video'
          const duration =
            typeof meta?.durationSeconds === 'number' &&
            Number.isFinite(meta.durationSeconds) &&
            meta.durationSeconds > 0
              ? meta.durationSeconds
              : undefined
          publishAppendedRender({
            id: `stream-${st}-${language}-${Date.now()}`,
            language,
            languageLabel: languageInfo?.name || language,
            status: 'complete',
            streamType: st,
            mp4Url: downloadUrl,
            completedAt: new Date().toISOString(),
            source: 'render',
            ...(duration !== undefined ? { duration } : {}),
          })
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

  const triggerClipGeneration = useCallback(
    (segment: SceneSegment) => {
      const item = queue.find((entry) => entry.segmentId === segment.segmentId)
      if (!item) {
        void import('sonner').then(({ toast }) => {
          toast.error('This clip is not in the video queue.')
        })
        return
      }
      const inputs = segmentHasVideoAgentInputs(item, segment)
      const requiresFrames =
        videoGenerationMode === 'creative' || effectiveVideoSourceMethod === 'frame'
      if (requiresFrames && !inputs.hasStartFrame) {
        void import('sonner').then(({ toast }) => {
          toast.error(
            'Start/End frames are required for Creative (Kling AI) / Frame-to-Video clips — generate frames in Stills first, or switch to Standard mode.'
          )
        })
        return
      }
      const nextConfig = applyVideoAgentPolicyToItem(item, {
        scope: 'selected',
        selectedSegmentIds: [segment.segmentId],
        quality: videoGenerationQuality,
        generationMode: videoGenerationMode,
        sourceMethod: effectiveVideoSourceMethod,
      })
      void handleGenerateFromDialog(segment.segmentId, nextConfig)
    },
    [
      queue,
      segmentHasVideoAgentInputs,
      videoGenerationMode,
      effectiveVideoSourceMethod,
      applyVideoAgentPolicyToItem,
      videoGenerationQuality,
      handleGenerateFromDialog,
    ]
  )

  const latestClipActionsRef = useRef({
    segments,
    triggerClipGeneration,
    handleChangeClipDuration,
  })
  latestClipActionsRef.current = {
    segments,
    triggerClipGeneration,
    handleChangeClipDuration,
  }

  const generateClipForBeat = useCallback((beatId: string) => {
    window.setTimeout(() => {
      const current = latestClipActionsRef.current
      const seg = current.segments.find((entry) => entry.beatId === beatId)
      if (seg) {
        current.triggerClipGeneration(seg)
      }
    }, 80)
  }, [])

  const changeClipDurationForBeat = useCallback((beatId: string, seconds: number) => {
    const current = latestClipActionsRef.current
    const seg = current.segments.find((entry) => entry.beatId === beatId)
    if (seg) {
      current.handleChangeClipDuration(seg, seconds)
    }
  }, [])

  const getClipDurationForBeat = useCallback(
    (beatId: string): number | undefined => {
      const seg = segments.find((entry) => entry.beatId === beatId)
      if (!seg) return undefined
      const qItem = queue.find((entry) => entry.segmentId === seg.segmentId)
      const raw =
        qItem?.config?.duration ??
        (typeof seg.endTime === 'number' &&
        typeof seg.startTime === 'number' &&
        seg.endTime > seg.startTime
          ? Math.round(seg.endTime - seg.startTime)
          : 8)
      const opts = videoGenerationMode === 'creative' ? [5, 10] : [4, 6, 8, 10]
      return opts.includes(raw) ? raw : opts[opts.length - 1]
    },
    [segments, queue, videoGenerationMode]
  )

  const generateControls = (
    <div className="flex flex-wrap gap-2 justify-end items-center">
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <StoryboardQualityToggle
                size="compact"
                value={videoGenerationQuality}
                onChange={onVideoGenerationQualityChange ?? (() => {})}
                draftLabel={tVideoAgent('qualityDraft')}
                finalLabel={tVideoAgent('qualityFinal')}
                disabled={isRendering}
                ariaLabel="Video generation quality"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{tVideoAgent('qualityTooltip')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <StoryboardGenerationModeToggle
                size="compact"
                value={videoGenerationMode}
                onChange={(nextMode) => {
                  onVideoGenerationModeChange?.(nextMode)
                  if (nextMode === 'creative') {
                    handleVideoSourceMethodChange('frame')
                  }
                }}
                standardLabel={tVideoAgent('modeStandard')}
                creativeLabel={tVideoAgent('modeCreative')}
                disabled={isRendering}
                ariaLabel="Video generation mode"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{tVideoAgent('modeTooltip')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <VideoSourceMethodToggle
                size="compact"
                value={effectiveVideoSourceMethod}
                onChange={handleVideoSourceMethodChange}
                referenceLabel="Reference"
                frameLabel="Frame"
                disabled={isRendering}
                referenceDisabled={videoGenerationMode === 'creative'}
                ariaLabel="Video clip source method"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {effectiveVideoSourceMethod === 'frame'
              ? 'Frame-to-Video (F2V): sends Start and End action frames with the F2V transition prompt.'
              : 'Reference-to-Video (Ingredients): sends Continuity Library reference plates with optimized script direction.'}
          </TooltipContent>
        </Tooltip>
      </div>
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
          {effectiveIsUpdatingPrompts && (
            <span
              data-testid="clips-updating-prompts-badge"
              className="inline-flex h-7 items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 text-[10px] font-medium text-cyan-200"
            >
              <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
              Updating prompts…
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenVideoAgent}
            disabled={queue.length === 0 || effectiveIsUpdatingPrompts}
            className={
              videoClips.some((clip) => clip.status === 'complete' && clip.promptChanged)
                ? 'h-7 px-2.5 text-[10px] font-semibold !border-2 !border-amber-400 bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/45 hover:bg-amber-500/30 hover:!border-amber-300 shadow-md shadow-amber-500/20 hover:shadow-lg transition-all'
                : 'h-7 px-2.5 text-[10px] font-semibold !border-2 !border-indigo-400 bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-400/45 hover:bg-indigo-500/30 hover:!border-indigo-300 shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all'
            }
            title={
              effectiveIsUpdatingPrompts
                ? 'Updating shot prompts — please wait…'
                : videoClips.some((clip) => clip.status === 'complete' && clip.promptChanged)
                  ? 'Action needed: One or more clips have "Prompt changed" — run Video Agent to refresh stale clips'
                  : tVideoAgent('toolbarTitle')
            }
          >
            <Zap className="w-3 h-3 mr-1 text-indigo-300" />
            {tVideoAgent('toolbarButton')}
          </Button>
          {statusCounts.rendered > 0 && onPlayScene && (
            <Button
              size="sm"
              variant="outline"
              onClick={onPlayScene}
              className="h-7 px-2 text-[10px] font-medium bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30"
            >
              <Film className="w-3 h-3 mr-1" />
              Play Scene
            </Button>
          )}
        </>
      )}
    </div>
  )

  const videoSection = (
    <div id={`director-console-${sceneId}`} className="scroll-mt-4">
      <BeatVideoGallery
        clips={videoClips}
        toolbar={generateControls}
        aspectClass={aspectClass}
        isRendering={isRendering}
        isUpdatingPrompts={effectiveIsUpdatingPrompts}
        progress={progress}
        completedCount={completedCount}
        failedCount={failedCount}
        isRateLimitPaused={isRateLimitPaused}
        rateLimitCountdown={rateLimitCountdown}
        readOnlyPrompts={beatFirstReadOnlyPrompts}
        renderedCount={statusCounts.rendered}
        totalCount={videoClips.length || statusCounts.total}
        onOpenPreVis={onOpenPreVis}
        onUpload={onSegmentUpload}
        streamLanguage={productionTarget.language}
        streamLanguages={onLanguageChange ? [] : streamLanguages}
        onStreamLanguageChange={onLanguageChange ? undefined : handleStreamLanguageChange}
        onAddStreamLanguage={onLanguageChange ? undefined : onGenerateLanguageStream}
        languagesNotYetGenerated={onLanguageChange ? [] : languagesNotYetGenerated}
        onGenerateLanguageVersion={(segment) => {
          void handleGenerateLanguageVersion(segment)
        }}
        onRestoreLanguageVersion={handleRestoreLanguageVersion}
        generatingLanguageClipId={languageClipBusyId}
        onToggleClipCaptions={handleToggleClipCaptions}
        sourceMethod={effectiveVideoSourceMethod}
        generationMode={videoGenerationMode}
        onChangeDuration={handleChangeClipDuration}
        onGenerateClip={(segment) => {
          const item = queue.find((entry) => entry.segmentId === segment.segmentId)
          if (!item) {
            void import('sonner').then(({ toast }) => {
              toast.error('This clip is not in the video queue.')
            })
            return
          }
          const inputs = segmentHasVideoAgentInputs(item, segment)
          const requiresFrames =
            videoGenerationMode === 'creative' || effectiveVideoSourceMethod === 'frame'
          if (requiresFrames && !inputs.hasStartFrame) {
            void import('sonner').then(({ toast }) => {
              toast.error(
                'Start/End frames are required for Creative (Kling AI) / Frame-to-Video clips — generate frames in Stills first, or switch to Standard mode.'
              )
            })
            return
          }
          const nextConfig = applyVideoAgentPolicyToItem(item, {
            scope: 'selected',
            selectedSegmentIds: [segment.segmentId],
            quality: videoGenerationQuality,
            generationMode: videoGenerationMode,
            sourceMethod: effectiveVideoSourceMethod,
          })
          handleGenerateFromDialog(segment.segmentId, nextConfig)
        }}
        generatingClipId={isRendering ? currentSegmentId : null}
        onDirectBeat={onDirectBeat}
        onRestoreTake={handleRestoreVideoTake}
        selectedBeatId={selectedBeatId}
        onSelectBeat={onSelectBeat}
      />
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
          title="Language versions"
          badge={productionStreams.length}
          rightHint="Finished MP4s for the selected stream"
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
          clipStats: statusCounts,
          mixerCollapsed,
          setMixerCollapsed,
          streamsCollapsed,
          setStreamsCollapsed,
          generateClipForBeat,
          changeClipDurationForBeat,
          getClipDurationForBeat,
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
          onRegenerateStill={
            onRegenerateStill
              ? () => onRegenerateStill(sceneId, selectedSegment.segmentId)
              : undefined
          }
          guideCharacters={effectiveGuideCharacters}
          readOnlyPrompts={beatFirstReadOnlyPrompts}
          characterReferences={characters}
          sceneReferences={sceneReferences}
          objectReferences={objectReferences}
          locationReferences={locationReferences}
          projectAspectRatio={projectAspectRatio}
          sceneIndex={sceneIndex}
          filmTitle={(scene as { filmTitle?: string } | undefined)?.filmTitle}
          videoGenerationQuality={videoGenerationQuality}
          videoGenerationMode={videoGenerationMode}
          videoSourceMethod={effectiveVideoSourceMethod}
          focusPrompt={dialogFocusPrompt}
          isUpdatingPrompts={effectiveIsUpdatingPrompts}
        />
      )}

      <VideoAgentConfirmDialog
        open={videoAgentDialogOpen}
        onOpenChange={setVideoAgentDialogOpen}
        beats={videoAgentBeats}
        isRunning={isRendering}
        onConfirm={handleVideoAgentConfirm}
        defaultQuality={videoGenerationQuality}
        defaultGenerationMode={videoGenerationMode}
        defaultSourceMethod={effectiveVideoSourceMethod}
        defaultIncludeCaptions={Boolean(
          (
            productionData?.mixerSettingsByLanguage?.[productionTarget.language] ??
            productionData?.mixerSettingsByLanguage?.[
              normalizeStreamLanguage(productionTarget.language) || 'en'
            ]
          )?.includeClipCaptions ?? false
        )}
        streamLanguage={productionTarget.language}
        streamLanguageLabel={
          SUPPORTED_LANGUAGES.find((lang) => lang.code === productionTarget.language)?.name ||
          productionTarget.language
        }
      />

      <RetakeConfirmDialog
        open={!!pendingRetakeAction}
        onOpenChange={(open) => {
          if (!open) setPendingRetakeAction(null)
        }}
        onConfirm={handleConfirmRetake}
      />

      {retakeSegment && (
        <IntelligentRetakeDialog
          open={!!retakeSegment}
          onOpenChange={(open) => {
            if (!open) setRetakeSegment(null)
          }}
          segment={retakeSegment}
          negativePrompt={getQueueItem(retakeSegment.segmentId)?.config.negativePrompt ?? ''}
          sceneDescription={
            (scene as { visualDescription?: string; action?: string } | undefined)?.visualDescription ||
            (scene as { action?: string } | undefined)?.action
          }
          characterReferences={retakeCharacterReferences}
          aspectRatio={videoAspectRatio}
          onSubmitRetake={handleSubmitRetake}
        />
      )}
      
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
          onSelectTake={(take) => {
            if (!onProductionDataChange || !productionData) return
            onProductionDataChange({
              ...productionData,
              segments: productionData.segments.map((seg) =>
                seg.segmentId === editingVideoSegment.segmentId
                  ? applyVideoTakeSelection(seg, take.id)
                  : seg
              ),
            })
          }}
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
            setEditingVideoSegment(null)
            await handleGenerateFromDialog(segmentId, updatedConfig)
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
