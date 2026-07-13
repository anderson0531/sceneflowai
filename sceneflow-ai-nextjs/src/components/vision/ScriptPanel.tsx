/**
 * ScriptPanel - Displays and manages screenplay scenes
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 * @see /CONTRIBUTING.md for development guidelines
 * 
 * RECEIVES: scenes from parent via props (sourced from script.script.scenes)
 * Do NOT maintain separate scene state in this component.
 * 
 * DEPRECATED: onOpenAnimaticsStudio prop (use Screening Room instead)
 */
'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Edit, Eye, Sparkles, Loader, Loader2, Play, Square, Volume2, VolumeX, Image as ImageIcon, Wand2, ChevronRight, ChevronUp, ChevronLeft, Music, Volume as VolumeIcon, Upload, StopCircle, AlertTriangle, ChevronDown, Check, Pause, Download, Zap, Camera, RefreshCw, Plus, Trash2, GripVertical, Film, Users, Star, BarChart3, Clock, Image, Printer, Info, Clapperboard, CheckCircle, CheckCircle2, Circle, ArrowRight, Bookmark, BookmarkPlus, BookmarkCheck, BookMarked, Lightbulb, Maximize2, Expand, Bot, PenTool, FolderPlus, Pencil, Layers, List, Calculator, FileCheck, Lock, Copy, Languages, Globe, Library, ListVideo, Video, Waves, BookOpen, Target } from 'lucide-react'
import { SceneWorkflowCoPilot, type WorkflowStep } from './SceneWorkflowCoPilot'
import { SceneWorkflowCoPilotPanel } from './SceneWorkflowCoPilotPanel'
import { SceneProductionManager } from './scene-production/SceneProductionManager'
import { SceneProductionDirector } from './scene-production/SceneProductionDirector'
import { SegmentFrameTimeline } from './scene-production/SegmentFrameTimeline'
import { AddSegmentDialog } from './scene-production/AddSegmentDialog'
import { EditSegmentDialog } from './scene-production/EditSegmentDialog'
import { ResetSegmentsConfirmDialog } from './scene-production/ResetSegmentsConfirmDialog'
import { SegmentList } from './scene-production/SegmentList'
import type { ScriptSegment } from '@/lib/script/segmentTypes'
import { coerceDialogueLineText } from '@/lib/script/segmentScript'
import {
  resolveSfxDuration,
  type SfxDurationOverride,
} from '@/lib/elevenlabs/sfxDuration'
import { dispatchExpressVeoSfx } from '@/lib/sfx/clientExpressVeoSfx'
import {
  beatHasSfxAudio,
  listSelectableActionBeats,
} from '@/lib/sfx/resolveExpressVeoSfxItems'
import {
  ActionBeatSfxControls,
  type ExpressBeatSfxStatus,
} from '@/components/vision/ActionBeatSfxControls'
import {
  ExpressSfxConfirmDialog,
  type ExpressSfxConfirmOptions,
} from '@/components/vision/ExpressSfxConfirmDialog'
import {
  ExpressAudioConfirmDialog,
  type ExpressAudioConfirmOptions,
} from '@/components/vision/ExpressAudioConfirmDialog'
import type { ExpressSceneConfirmOptions } from '@/components/vision/ExpressSceneConfirmDialog'
import { processWithConcurrency } from '@/lib/utils/concurrent-processor'
import {
  buildExpressAudioItems,
  parseExpressAudioSelectedIds,
} from '@/lib/audio/buildExpressAudioItems'

// Dynamic imports with ssr: false to prevent TDZ circular dependency issues
// These components have complex initialization that can cause module load order problems
const SegmentBuilder = dynamic(
  () => import('./scene-production/SegmentBuilder').then(mod => ({ default: mod.SegmentBuilder })),
  { ssr: false, loading: () => <div className="p-4 text-center text-zinc-500">Loading Beat Builder...</div> }
)
const DirectorWorkflow = dynamic(
  () => import('./scene-production/DirectorConsole').then(mod => ({ default: mod.DirectorWorkflow })),
  { ssr: false, loading: () => <div className="p-4 text-center text-zinc-500">Loading Director Console...</div> }
)
import { AUDIO_ALIGNMENT_BUFFERS, getLanguagePlaybackOffset, calculateSuggestedOffset, findDialogueAudioForLine } from './scene-production/audioTrackBuilder'
import type { SceneProductionData, SceneProductionReferences, SegmentKeyframeSettings, SceneSegment } from './scene-production/types'
import type { BlueprintAspectRatio } from '@/lib/treatment/blueprintFoundation'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { CuratedVoice } from '@/lib/tts/voices'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ScenePromptBuilder } from './ScenePromptBuilder'
import { SceneDirectionBuilder } from './SceneDirectionBuilder'
import ScenePromptDrawer from './ScenePromptDrawer'
import { AudioMixer, type AudioTrack } from './AudioMixer'
import ScriptReviewModal from './ScriptReviewModal'
import SceneReviewModal from './SceneReviewModal'
import { ImageEditModal } from './ImageEditModal'
import { SceneStoryboardFrameViewer } from './SceneStoryboardFrameViewer'
import { OptimizeSceneDialog } from './OptimizeSceneDialog'
import { Badge } from '@/components/ui/badge'
import { WorkflowNextStepBanner, type WorkflowState } from './WorkflowNextStepBanner'
import { buildWorkflowState } from '@/lib/production/sceneProgress'
import { toast } from 'sonner'
import { ModerationValidateButton } from '@/components/moderation/ModerationValidateButton'
import { saveAudioFile } from '@/lib/download/saveFile'
import { useOverlayStore } from '@/store/useOverlayStore'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { ReportType, StoryboardData, SceneDirectionData } from '@/lib/types/reports'
import { flattenSceneToStoryboardFrames } from '@/lib/storyboard/types'
import { StoryboardReviewPanel } from './StoryboardReviewPanel'
import { getSceneBeats, isBeatFirstPipelineEnabled } from '@/lib/script/beatMigration'
import {
  countStoryboardFrameStats,
  enumerateStoryboardFrameSlots,
} from '@/lib/storyboard/types'
import { buildBeatFirstPlaybackTimeline } from '@/lib/storyboard/types'
import { buildStoryboardMusicClips } from '@/lib/storyboard/musicPlayback'
import { BeatMusicToggle } from '@/components/vision/BeatMusicToggle'
import { BeatExcludeToggle } from '@/components/vision/BeatExcludeToggle'
import { ExportDialog } from './ExportDialog'
import { isDirectionStale, isImageStale } from '@/lib/utils/contentHash'
import { isPreVisStale } from '@/lib/storyboard/preVisSync'
import { getKenBurnsConfig, generateKenBurnsKeyframes, type KenBurnsIntensity } from '@/lib/animation/kenBurns'
import { SceneDirectionProvider } from '@/contexts/SceneDirectionContext'
import { GenerateAudioDialog } from './GenerateAudioDialog'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { useAudioPlayerContext, type Track } from '@/context/AudioPlayerProvider'
import { WebAudioMixer, type SceneAudioConfig, type AudioSource } from '@/lib/audio/webAudioMixer'
import { getAudioDuration } from '@/lib/audio/audioDuration'
import { getAudioUrl } from '@/lib/audio/languageDetection'
import { cleanupScriptAudio } from '@/lib/audio/cleanupAudio'
import { formatSceneHeading } from '@/lib/script/formatSceneHeading'
import { uploadAssetViaAPI } from '@/lib/vision/uploads'
import { stripDirectionBracketsForTiming } from '@/lib/tts/textOptimizer'
import { useCredits } from '@/contexts/CreditsContext'
import { ProjectCostCalculator } from '@/components/credits/ProjectCostCalculator'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type DialogGenerationMode = 'foreground' | 'background'

interface DialogGenerationProgress {
  status: 'idle' | 'running' | 'completed' | 'error'
  phase: 'narration' | 'dialogue' | 'music' | 'sfx' | 'characters' | 'images'
  currentScene: number
  totalScenes: number
  currentDialogue: number
  totalDialogue: number
  currentMusic: number
  totalMusic: number
  currentSfx: number
  totalSfx: number
  currentCharacter: number
  totalCharacters: number
  currentImage: number
  totalImages: number
  completedSteps: number
  totalSteps: number
  message: string
}

// Translation storage types for per-scene, per-language translations
export interface SceneTranslation {
  narration?: string
  dialogue?: string[] // Indexed by dialogue position
}

export interface ProjectTranslations {
  [languageCode: string]: {
    [sceneIndex: number]: SceneTranslation
  }
}

const DirectorChairIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 64 64"
    aria-hidden="true"
    {...props}
  >
    <rect x="10" y="18" width="44" height="10" rx="2" className="fill-slate-100/95" />
    <rect x="14" y="30" width="36" height="7" rx="2" className="fill-slate-200/95" />
    <path d="M18 37L10 54" className="stroke-slate-100" strokeWidth="3" strokeLinecap="round" />
    <path d="M46 37L54 54" className="stroke-slate-100" strokeWidth="3" strokeLinecap="round" />
    <path d="M18 37L30 54" className="stroke-slate-300" strokeWidth="3" strokeLinecap="round" />
    <path d="M46 37L34 54" className="stroke-slate-300" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const SCENE_IMAGE_DELAY_MS = 5000

// Production readiness state for workflow guards
interface ProductionReadiness {
  voicesAssigned: number
  totalCharacters: number
  charactersMissingVoices: string[]
  scenesWithDirection: number
  totalScenes: number
  scenesWithImages: number
  scenesWithAudio: number
  isAudioReady: boolean
  hasNarrationVoice: boolean
}

interface ScriptPanelProps {
  script: any
  onScriptChange: (script: any) => void
  isGenerating: boolean
  onExpandScene?: (sceneNumber: number) => Promise<void>
  onExpandAllScenes?: () => Promise<void>
  onGenerateSceneImage?: (sceneIdx: number, selectedCharacters?: any[]) => Promise<void>
  characters?: Array<{ 
    name: string
    description: string
    referenceImage?: string
    referenceImageGCS?: string
    appearanceDescription?: string
    ethnicity?: string
    subject?: string
  }>
  projectId?: string
  visualStyle?: string
  /** Locked project aspect ratio from Blueprint */
  projectAspectRatio?: BlueprintAspectRatio
  validationWarnings?: Record<number, string>
  validationInfo?: Record<number, {
    passed: boolean
    confidence: number
    message?: string
    warning?: string
    dismissed?: boolean
  }>
  onDismissValidationWarning?: (sceneIdx: number) => void
  onPlayAudio?: (audioUrl: string, label: string, sceneId?: string) => void
  onGenerateSceneAudio?: (sceneIdx: number, audioType: 'narration' | 'dialogue', characterName?: string, dialogueIndex?: number, language?: string) => void
  // NEW: Props for Production Script Header
  onGenerateAllAudio?: (
    language?: string,
    options?: {
      includeNarration?: boolean
      includeDialogue?: boolean
      includeMusic?: boolean
      includeSFX?: boolean
    }
  ) => void
  isGeneratingAudio?: boolean
  // NEW: Production readiness for workflow guards (disable actions until prerequisites met)
  productionReadiness?: ProductionReadiness
  onPlayScript?: () => void
  // NEW: Scene management callbacks
  onAddScene?: (afterIndex?: number) => void
  onDeleteScene?: (sceneIndex: number) => void
  onReorderScenes?: (startIndex: number, endIndex: number) => void
  // NEW: Script review props
  directorScore?: number
  audienceScore?: number
  onGenerateReviews?: () => void
  isGeneratingReviews?: boolean
  onShowReviews?: () => void
  onOpenReferences?: () => void
  onShowTreatmentReview?: () => void
  /** Route to Blueprint to change locked art style / aspect ratio. */
  onRefactorFoundation?: () => void
  directorReview?: any
  audienceReview?: any
  // NEW: Scene editing props
  onEditScene?: (sceneIndex: number) => void
  // NEW: Edit scene with pre-populated recommendations from analysis
  onEditSceneWithRecommendations?: (sceneIndex: number, recommendations: string[]) => void
  onUpdateSceneAudio?: (sceneIndex: number) => Promise<void>
  onDeleteSceneAudio?: (sceneIndex: number, audioType: 'description' | 'narration' | 'dialogue' | 'music' | 'sfx', dialogueIndex?: number, sfxIndex?: number, silent?: boolean) => void
  // NEW: Enhance scene context with AI-generated beat, character arc, and thematic context
  onEnhanceSceneContext?: (sceneIndex: number) => Promise<void>
  // NEW: Scene score generation props
  onGenerateSceneScore?: (sceneIndex: number) => void
  generatingScoreFor?: number | null
  getScoreColorClass?: (score: number) => string
  // NEW: BYOK props for cost calculator
  hasBYOK?: boolean
  onOpenBYOK?: () => void
  // NEW: Scene direction generation props
  generatingDirectionFor?: number | null
  onGenerateAllCharacters?: () => Promise<void>
  // NEW: Scene production props
  sceneProductionData?: Record<string, SceneProductionData>
  sceneProductionReferences?: Record<string, SceneProductionReferences>
  onInitializeSceneProduction?: (
    sceneId: string,
    options: { targetDuration: number; segments?: any[]; generationOptions?: Record<string, unknown> }
  ) => Promise<void>
  onSegmentPromptChange?: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentKeyframeChange?: (sceneId: string, segmentId: string, keyframeSettings: SegmentKeyframeSettings) => void
  onSegmentDialogueAssignmentChange?: (sceneId: string, segmentId: string, dialogueLineIds: string[]) => void
  onSegmentGenerate?: (sceneId: string, segmentId: string, mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD', options?: { startFrameUrl?: string; prompt?: string; negativePrompt?: string; duration?: number; aspectRatio?: '16:9' | '9:16'; resolution?: '720p' | '1080p' }) => Promise<void>
  onSegmentUpload?: (sceneId: string, segmentId: string, file: File) => Promise<void>
  /** Update segment animatic settings for Screening Room (duration) */
  onSegmentAnimaticSettingsChange?: (sceneId: string, segmentId: string, settings: { imageDuration?: number }) => void
  /** Persist rendered scene URL to database */
  onRenderedSceneUrlChange?: (sceneId: string, url: string | null) => void
  onProductionDataChange?: (sceneId: string, data: SceneProductionData) => void
  onResetSegments?: (sceneId: string) => void
  onAddSegment?: (sceneId: string, afterSegmentId: string | null, duration: number) => void
  onAddFullSegment?: (sceneId: string, segment: any) => void
  onDeleteSegment?: (sceneId: string, segmentId: string) => void
  onSegmentResize?: (sceneId: string, segmentId: string, changes: { startTime?: number; duration?: number }) => void
  /** Apply intelligent auto-alignment of keyframes to audio anchors */
  onApplyIntelligentAlignment?: (sceneId: string, language?: string) => void
  onReorderSegments?: (sceneId: string, oldIndex: number, newIndex: number) => void
  onAudioClipChange?: (sceneIdOrIndex: string | number, trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => void
  onCleanupStaleAudioUrl?: (sceneId: string, staleUrl: string) => void
  onAddEstablishingShot?: (sceneId: string, style: 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => void
  onEstablishingShotStyleChange?: (sceneId: string, segmentId: string, style: 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => void
  // Backdrop video generation - inserts new segment with video before specified segment
  onBackdropVideoGenerated?: (sceneId: string, beforeSegmentIndex: number, result: {
    videoUrl: string
    prompt: string
    backdropMode: string
    duration: number
  }) => void
  // Frame Anchoring: Generate end frame for improved video quality
  onGenerateEndFrame?: (sceneId: string, segmentId: string, startFrameUrl: string, segmentPrompt: string) => Promise<string | null>
  // Frame Anchoring: Update segment's end frame URL
  onEndFrameGenerated?: (sceneId: string, segmentId: string, endFrameUrl: string) => void
  sceneAudioTracks?: Record<string, {
    narration?: { url?: string; startTime: number; duration: number }
    dialogue?: Array<{ url?: string; startTime: number; duration: number; character?: string }>
    sfx?: Array<{ url?: string; startTime: number; duration: number; description?: string }>
    music?: { url?: string; startTime: number; duration: number }
  }>
  bookmarkedScene?: { sceneId?: string; sceneNumber?: number } | null
  onBookmarkScene?: (bookmark: { sceneId: string; sceneNumber: number } | null) => Promise<void> | void
  onJumpToBookmark?: () => void
  // Storyboard visibility control
  showStoryboard?: boolean
  onToggleStoryboard?: () => void
  // Dashboard visibility control
  showDashboard?: boolean
  onToggleDashboard?: () => void
  // Assets dialog control
  onOpenAssets?: () => void
  // Global keyframe generation state (for screen freeze)
  isGeneratingKeyframe?: boolean
  generatingKeyframeSceneNumber?: number | null
  // Below dashboard slot
  belowDashboardSlot?: (helpers: { 
    openGenerateAudio: () => void
    openPromptBuilder: (sceneIdx: number) => void
  }) => React.ReactNode
  // Scene timeline filtering - only show selected scene when set
  selectedSceneIndex?: number | null
  // Callback when scene selection changes (for timeline sync)
  onSelectSceneIndex?: (index: number | null) => void
  // Production progress slot (toggled via Progress button, rendered in scroll area)
  productionProgressSlot?: React.ReactNode
  // Callback to add scene frame to reference library
  onAddToReferenceLibrary?: (imageUrl: string, name: string, sceneNumber: number) => Promise<void>
  // Open script editor with initial instruction (from Review Analysis)
  openScriptEditorWithInstruction?: string | null
  onClearScriptEditorInstruction?: () => void
  // Workflow completion overrides
  onMarkWorkflowComplete?: (sceneIdx: number, stepKey: string, isComplete: boolean) => void
  onDismissStaleWarning?: (sceneIdx: number, stepKey: string) => void
  /** Sync pre-vis frame prompts to current script before regenerating. */
  onSyncPreVisToScript?: (sceneIdx: number) => void | Promise<void>
  // Reference Library - scene backdrops and props/objects for Opening Frame builder
  sceneReferences?: Array<{ id: string; name: string; description?: string; imageUrl?: string }>
  objectReferences?: Array<{ id: string; name: string; description?: string; imageUrl?: string }>
  // Location references for environment consistency in keyframe generation
  locationReferences?: Array<{ id: string; location: string; locationDisplay: string; imageUrl: string; description?: string; sceneNumbers?: number[] }>
  // Take management
  onSelectTake?: (sceneId: string, segmentId: string, takeId: string, assetUrl: string) => void
  onDeleteTake?: (sceneId: string, segmentId: string, takeId: string) => void
  // Keyframe State Machine - Frame step handlers
  onGenerateSegmentFrames?: (sceneId: string, segmentId: string, frameType: 'start' | 'end' | 'both', options?: {
    customPrompt?: string
    negativePrompt?: string
    usePreviousEndFrame?: boolean
    previousEndFrameUrl?: string
  }) => Promise<{ startFrameUrl?: string; endFrameUrl?: string } | void>
  onEditFrame?: (sceneId: string, segmentId: string, frameType: 'start' | 'end', frameUrl: string) => void
  onUploadFrame?: (sceneId: string, segmentId: string, frameType: 'start' | 'end', file: File) => void
  generatingFrameForSegment?: string | null
  generatingFramePhase?: 'start' | 'end' | 'video' | null
  // Project info for header display
  projectTitle?: string
  projectLogline?: string
  projectDuration?: string
  seriesInfo?: { seriesTitle: string; episodeNumber: number } | null
  // Translation storage for multi-language support
  storedTranslations?: ProjectTranslations
  onSaveTranslations?: (langCode: string, translations: { [sceneIndex: number]: SceneTranslation }) => Promise<void>
  // Per-scene audience analysis props (integrated from ScriptReviewModal)
  onAnalyzeScene?: (sceneIndex: number) => Promise<void>
  analyzingSceneIndex?: number | null
  onOptimizeScene?: (sceneIndex: number, instruction: string, selectedRecommendations: string[]) => Promise<void>
  optimizingSceneIndex?: number | null
  // Audio timing resync - recalculates startTime for all audio clips after edits
  onResyncAudioTiming?: (sceneIndex: number, language: string) => Promise<void>
  resyncingAudioSceneIndex?: number | null
  // Script regeneration - for recovering from empty scenes state
  onRegenerateScript?: () => Promise<void>
  isRegeneratingScript?: boolean
  /** User-initiated Hive validation report callback */
  onModerationReport?: (report: import('@/lib/moderation/moderationPipeline').ModerationReport) => void
  /** Beat-first: approve storyboard frames before segment/video work */
  onApproveStoryboard?: (sceneIndex: number) => void | Promise<void>
  approvingStoryboardFor?: number | null
  // Per-scene storyboard frame viewer (Pre-Vis beat images)
  onGenerateBeatFrame?: (sceneIdx: number, beatId: string) => Promise<void>
  onGenerateBeatEndFrame?: (sceneIdx: number, beatId: string) => Promise<void>
  onGenerateDialogueFrame?: (sceneIdx: number, dialogueIdx: number) => Promise<void>
  onUploadBeatFrame?: (sceneIdx: number, beatId: string, file: File) => void
  onUploadDialogueFrame?: (sceneIdx: number, dialogueIdx: number, file: File) => void
  onSaveEditedBeatFrame?: (sceneIdx: number, beatId: string, url: string) => void
  onSaveEditedDialogueFrame?: (sceneIdx: number, dialogueIdx: number, url: string) => void
  onSaveEditedCustomFrame?: (sceneIdx: number, frameId: string, url: string) => void
  onSaveEditedStoryboardScene?: (sceneIdx: number, url: string) => void
  onDirectFrame?: (sceneIdx: number, slot: import('@/lib/storyboard/types').StoryboardFrameSlot) => void
  onAddStoryboardFrame?: (sceneIdx: number) => void | Promise<void>
  onDeleteStoryboardFrame?: (sceneIdx: number, frameId: string) => void | Promise<void>
  onGenerateCustomFrame?: (sceneIdx: number, frameId: string) => Promise<void>
  onUploadCustomFrame?: (sceneIdx: number, frameId: string, file: File) => void
  onUploadStoryboardScene?: (sceneIdx: number, file: File) => void
  onExpressSceneGenerate?: (
    sceneIdx: number,
    language: string,
    options?: ExpressSceneConfirmOptions & { finalizeOnly?: boolean }
  ) => Promise<void>
  onFinalizeStoryboardScene?: (sceneIdx: number, language: string) => Promise<void>
  expressStatus?: import('./SceneGallery').ExpressSceneStatusMap
  expressGateBlocked?: boolean
  onExpressGateBlocked?: () => void
  isExpressRunning?: boolean
  narrationVoice?: unknown
}

// Transform score analysis data to review format
function transformScoreToReview(scoreAnalysis: any): any {
  if (!scoreAnalysis) return null
  
  const recommendations = scoreAnalysis.recommendations || []
  
  // Filter out fallback recommendations (identified by ID pattern or specific titles)
  const validRecommendations = recommendations.filter((r: any) => 
    !r.id?.startsWith('fallback-') && 
    r.title !== 'Scene Analysis Unavailable'
  )
  
  // Extract category scores
  const categories = [
    { name: "Director Perspective", score: scoreAnalysis.directorScore || scoreAnalysis.overallScore },
    { name: "Audience Perspective", score: scoreAnalysis.audienceScore || scoreAnalysis.overallScore }
  ]
  
  // Generate analysis summary from valid recommendations
  const analysis = validRecommendations.length > 0
    ? validRecommendations.map((r: any) => r.description || r.title || r.rationale).join(' ')
    : `Scene scored ${scoreAnalysis.overallScore}/100. Director perspective: ${scoreAnalysis.directorScore}/100, Audience perspective: ${scoreAnalysis.audienceScore}/100.`
  
  // Map recommendations by priority (using valid recommendations only)
  const improvements = validRecommendations
    .filter((r: any) => r.priority === 'high' || r.priority === 'medium')
    .map((r: any) => r.title || r.description)
  
  const strengths = validRecommendations
    .filter((r: any) => r.priority === 'low')
    .map((r: any) => r.title || r.description)
  
  const recommendationTexts = validRecommendations
    .map((r: any) => r.rationale || r.impact || r.title)
    .filter((text: any) => text && text.length > 0 && text !== 'N/A')
  
  return {
    overallScore: scoreAnalysis.overallScore,
    categories,
    analysis,
    strengths: strengths.length > 0 ? strengths : ['Scene structure is well-formed'],
    improvements: improvements.length > 0 ? improvements : ['No specific improvements identified'],
    recommendations: recommendationTexts.length > 0 ? recommendationTexts : ['Scene meets basic quality standards'],
    generatedAt: scoreAnalysis.generatedAt || new Date().toISOString()
  }
}

// Stoplight color system for scores
function getStoplightTextColor(score: number): string {
  if (score >= 85) return 'text-green-600 dark:text-green-400'  // Green: Good
  if (score >= 75) return 'text-yellow-600 dark:text-yellow-400'  // Yellow: Fair
  return 'text-red-600 dark:text-red-400'  // Red: Needs Work
}

function getStoplightBgColor(score: number): string {
  if (score >= 85) return 'bg-green-500'  // Green
  if (score >= 75) return 'bg-yellow-500'  // Yellow
  return 'bg-red-500'  // Red
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 85) return 'Good'
  if (score >= 75) return 'Fair'
  return 'Needs Work'
}

// Legacy function for backward compatibility
function getScoreColor(score: number): string {
  if (score >= 90) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
  if (score >= 75) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
  if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
}

// Calculate scene duration based on audio, buffer, and video clips
function calculateSceneDuration(scene: any): number {
  // 1. Calculate audio duration (D_audio)
  // Average speaking rate: 150 words per minute (WPM)
  let totalWords = 0
  
  // Count words in narration
  if (scene.narration || scene.action) {
    const narrationText = scene.narration || scene.action || ''
    totalWords += narrationText.split(/\s+/).filter((w: string) => w.length > 0).length
  }
  
  // Count words in dialogue
  if (scene.dialogue && Array.isArray(scene.dialogue)) {
    scene.dialogue.forEach((d: any) => {
      const raw = d.line || d.text || d.dialogue || ''
      if (raw) {
        const spoken = stripDirectionBracketsForTiming(raw)
        totalWords += spoken.split(/\s+/).filter((w: string) => w.length > 0).length
      }
    })
  }
  
  // Convert words to seconds at 150 WPM
  const audioDuration = (totalWords / 150) * 60
  
  // 2. Calculate buffer time (D_buffer)
  // Estimate 2-4 seconds for non-vocal actions
  // Use scene description length as a proxy for action complexity
  const descriptionLength = (scene.action || scene.visualDescription || '').length
  let bufferTime = 2 // Minimum 2 seconds
  if (descriptionLength > 100) bufferTime = 3
  if (descriptionLength > 200) bufferTime = 4
  if (descriptionLength > 300) bufferTime = 5
  
  // 3. Calculate required duration
  const requiredDuration = audioDuration + bufferTime
  
  // 4. Calculate number of 8-second video clips needed
  const videoCount = Math.ceil(requiredDuration / 8)
  
  // 5. Calculate final scene duration
  const sceneDuration = audioDuration + bufferTime + (videoCount * 0.5)
  
  // Round up to nearest multiple of 8 (for 8-second video clips)
  return Math.ceil(sceneDuration / 8) * 8
}

/** Resolved dialogue/narration duration for generate-segments (en vs en-US vs flat array + word fallback). */
function computeSceneTotalAudioSecondsForSegmentation(scene: any): number {
  const nar = Number(
    scene.narrationAudio?.en?.duration ??
      scene.narrationAudio?.['en-US']?.duration ??
      scene.narrationDuration ??
      0
  )
  const da = scene.dialogueAudio
  const arr: any[] = Array.isArray(da)
    ? da
    : da?.en ||
      da?.['en-US'] ||
      (Object.values(da || {}).find(
        (v): v is any[] => Array.isArray(v) && v.length > 0
      ) ?? [])
  let dialogueSum = 0
  if (Array.isArray(arr) && arr.length > 0) {
    dialogueSum = arr.reduce((acc: number, d: any) => {
      const raw = d?.duration ?? d?.durationSeconds
      if (typeof raw !== 'number' || raw <= 0) return acc
      if (raw > 600 && raw < 3_600_000) return acc + raw / 1000
      return acc + raw
    }, 0)
  }
  if (dialogueSum < 0.5 && Array.isArray(scene.dialogue)) {
    dialogueSum = scene.dialogue.reduce((acc: number, d: any) => {
      const t = d.line || d.text || d.dialogue || ''
      const spoken = stripDirectionBracketsForTiming(t)
      return acc + spoken.split(/\s+/).filter(Boolean).length / 2.5
    }, 0)
  }
  return Math.max(nar, dialogueSum, 1) + 2
}

// Format duration as MM:SS
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Format total duration for summary panel
function formatTotalDuration(scenes: any[]): string {
  const totalSeconds = scenes.reduce((sum, scene) => sum + calculateSceneDuration(scene), 0)
  return formatDuration(totalSeconds)
}

function normalizeScenes(source: any): any[] {
  if (!source) {
    return []
  }

  const candidates = [
    source?.script?.scenes,
    source?.scenes,
    source?.visionPhase?.script?.script?.scenes,
    source?.visionPhase?.scenes,
    source?.metadata?.visionPhase?.script?.script?.scenes,
    source?.metadata?.visionPhase?.scenes
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate
    }
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

const getSceneDomId = (scene: any, index: number) => {
  const rawId = (scene?.id || `scene-${index}`).toString()
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '-')
  return `scene-card-${safeId}`
}

// Sortable Scene Card Wrapper for drag-and-drop
function SortableSceneCard({ id, onAddScene, onDeleteScene, onEditScene, onGenerateSceneScore, generatingScoreFor, getScoreColorClass, onEditImage, totalScenes, onNavigateScene, scenes, script, onScriptChange, setEditingImageData, setImageEditModalOpen, getPlaybackOffsetForScene, handlePlaybackOffsetChange, getSuggestedOffsetForScene, expandedRecommendations, setExpandedRecommendations, onAnalyzeScene, analyzingSceneIndex, onOptimizeScene, optimizingSceneIndex, setOptimizeDialogScene, setOptimizeDialogOpen, onResyncAudioTiming, resyncingAudioSceneIndex, onResetSegments, ...props }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SceneCard 
        {...props} 
        onAddScene={onAddScene}
        onDeleteScene={onDeleteScene}
        onEditScene={onEditScene}
        onUpdateSceneAudio={props.onUpdateSceneAudio}
        onDeleteSceneAudio={props.onDeleteSceneAudio}
        onGenerateSceneScore={onGenerateSceneScore}
        generatingScoreFor={generatingScoreFor}
        getScoreColorClass={getScoreColorClass}
        dragHandleProps={listeners}
        onOpenSceneReview={props.onOpenSceneReview}
        onEditImage={onEditImage}
        totalScenes={totalScenes}
        onNavigateScene={onNavigateScene}
        scenes={scenes}
        script={script}
        onScriptChange={onScriptChange}
        setEditingImageData={setEditingImageData}
        setImageEditModalOpen={setImageEditModalOpen}
        getPlaybackOffsetForScene={getPlaybackOffsetForScene}
        handlePlaybackOffsetChange={handlePlaybackOffsetChange}
        getSuggestedOffsetForScene={getSuggestedOffsetForScene}
        expandedRecommendations={expandedRecommendations}
        setExpandedRecommendations={setExpandedRecommendations}
        onAnalyzeScene={onAnalyzeScene}
        analyzingSceneIndex={analyzingSceneIndex}
        onOptimizeScene={onOptimizeScene}
        optimizingSceneIndex={optimizingSceneIndex}
        setOptimizeDialogScene={setOptimizeDialogScene}
        setOptimizeDialogOpen={setOptimizeDialogOpen}
        onResyncAudioTiming={onResyncAudioTiming}
        resyncingAudioSceneIndex={resyncingAudioSceneIndex}
        onResetSegments={onResetSegments}
      />
    </div>
  )
}

// Film context fix deployed v3 - 2025-02-20 with default projectTitle
export function ScriptPanel({ script, onScriptChange, isGenerating, onExpandScene, onExpandAllScenes, onGenerateSceneImage, characters = [], projectId, visualStyle, projectAspectRatio = '16:9', validationWarnings = {}, validationInfo = {}, onDismissValidationWarning, onPlayAudio, onGenerateSceneAudio, onGenerateAllAudio, isGeneratingAudio, productionReadiness = undefined, onPlayScript, onAddScene, onDeleteScene, onReorderScenes, directorScore, audienceScore, onGenerateReviews, isGeneratingReviews, onShowReviews, onOpenReferences, onShowTreatmentReview, onRefactorFoundation, directorReview, audienceReview, onEditScene, onUpdateSceneAudio, onDeleteSceneAudio, onEnhanceSceneContext, onGenerateSceneScore, generatingScoreFor, getScoreColorClass, hasBYOK = false, onOpenBYOK, generatingDirectionFor, onGenerateAllCharacters, sceneProductionData = {}, sceneProductionReferences = {}, belowDashboardSlot, onInitializeSceneProduction, onSegmentPromptChange, onSegmentKeyframeChange, onSegmentDialogueAssignmentChange, onSegmentGenerate, onSegmentUpload, onSegmentAnimaticSettingsChange, onRenderedSceneUrlChange, onProductionDataChange, onResetSegments, onAddSegment, onAddFullSegment, onDeleteSegment, onSegmentResize, onReorderSegments, onAudioClipChange, onCleanupStaleAudioUrl, onAddEstablishingShot, onEstablishingShotStyleChange, onBackdropVideoGenerated, onGenerateEndFrame, onEndFrameGenerated, sceneAudioTracks = {}, bookmarkedScene, onBookmarkScene, onJumpToBookmark, showStoryboard = true, onToggleStoryboard, showDashboard = false, onToggleDashboard, onOpenAssets, isGeneratingKeyframe = false, generatingKeyframeSceneNumber = null, selectedSceneIndex = null, onSelectSceneIndex, productionProgressSlot, onAddToReferenceLibrary, openScriptEditorWithInstruction = null, onClearScriptEditorInstruction, onMarkWorkflowComplete, onDismissStaleWarning, onSyncPreVisToScript, sceneReferences = [], objectReferences = [], locationReferences = [], onSelectTake, onDeleteTake, onGenerateSegmentFrames, onEditFrame, onUploadFrame, generatingFrameForSegment = null, generatingFramePhase = null, projectTitle = '', projectLogline = '', projectDuration, seriesInfo = null, storedTranslations, onSaveTranslations, onAnalyzeScene, analyzingSceneIndex = null, onOptimizeScene, optimizingSceneIndex = null, onResyncAudioTiming, resyncingAudioSceneIndex = null, onRegenerateScript, isRegeneratingScript = false, onModerationReport, onApproveStoryboard, approvingStoryboardFor = null, onGenerateBeatFrame, onGenerateBeatEndFrame, onGenerateDialogueFrame, onUploadBeatFrame, onUploadDialogueFrame, onSaveEditedBeatFrame, onSaveEditedDialogueFrame, onSaveEditedCustomFrame, onSaveEditedStoryboardScene, onDirectFrame, onAddStoryboardFrame, onDeleteStoryboardFrame, onGenerateCustomFrame, onUploadCustomFrame, onUploadStoryboardScene, onExpressSceneGenerate, onFinalizeStoryboardScene, expressStatus, expressGateBlocked = false, onExpressGateBlocked, isExpressRunning = false, narrationVoice }: ScriptPanelProps) {


  // CRITICAL: Get overlay store for generation blocking - must be at top level before any other hooks
  const overlayStore = useOverlayStore()
  
  // Credits context for budget calculator
  const { credits: userCredits } = useCredits()
  
  const [expandingScenes, setExpandingScenes] = useState<Set<number>>(new Set())
  const [selectedScene, setSelectedScene] = useState<number | null>(null)
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  const [storyboardPreviewOpen, setStoryboardPreviewOpen] = useState(false)
  const [sceneDirectionPreviewOpen, setSceneDirectionPreviewOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [costCalculatorOpen, setCostCalculatorOpen] = useState(false)
  const [generateAudioDialogOpen, setGenerateAudioDialogOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  
  // Language playback offset per scene (for translated audio alignment)
  // Key: sceneId, Value: { languageCode: offsetSeconds }
  const [playbackOffsets, setPlaybackOffsets] = useState<Record<string, Record<string, number>>>({})
  
  // Translation import/export state
  const [translationImportOpen, setTranslationImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  
  // Collapsible UI state with localStorage persistence
  const [sceneNavigationCollapsed, setSceneNavigationCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sceneNavigationCollapsed')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [audioTimelineCollapsed, setAudioTimelineCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audioTimelineCollapsed')
      return saved ? JSON.parse(saved) : true // Default collapsed
    }
    return true // Default collapsed
  })
  
  // Persist collapsed states to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneNavigationCollapsed', JSON.stringify(sceneNavigationCollapsed))
    }
  }, [sceneNavigationCollapsed])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('audioTimelineCollapsed', JSON.stringify(audioTimelineCollapsed))
    }
  }, [audioTimelineCollapsed])
  
  // Image Edit Modal state
  const [imageEditModalOpen, setImageEditModalOpen] = useState(false)
  const [editingImageData, setEditingImageData] = useState<{ 
    url: string
    sceneIdx: number
    // Frame editing context (optional)
    segmentId?: string
    frameType?: 'start' | 'end'
    sceneId?: string
  } | null>(null)
  
  // Audio playback state
  const [voices, setVoices] = useState<Array<CuratedVoice>>([])
  const [enabled, setEnabled] = useState<boolean>(false)
  const [loadingSceneId, setLoadingSceneId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined)
  const queueAbortRef = useRef<{ abort: boolean }>({ abort: false })
  const audioMixerRef = useRef<WebAudioMixer | null>(null)
  const audioDurationCacheRef = useRef<Map<string, number>>(new Map())
  
  // Individual audio playback state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const playingAudioContextRef = useRef<{ url: string; sceneId: string } | null>(null)
  const individualAudioRef = useRef<HTMLAudioElement | null>(null)
  
  // TEMPORARILY DISABLED: Muted audio tracks state
  // The mute functionality is disabled due to a minification TDZ bug that affects
  // any variable defined in this component when accessed from within the .map() callback.
  // TODO: Refactor this 5000+ line component into smaller sub-components to fix
  // const [sceneMuteState, setSceneMuteState] = useState<Record<number, { description?: boolean; narration?: boolean; dialogue?: boolean; music?: boolean; sfx?: boolean }>>({})
  
  // Track orphan audio objects for cleanup (prevents ghost audio)
  const orphanAudioRefs = useRef<Set<HTMLAudioElement>>(new Set())
  
  // Dialogue generation state
  const [generatingDialogue, setGeneratingDialogue] = useState<{sceneIdx: number, character: string, dialogueIndex?: number} | null>(null)
  
  // Scene optimization dialog state (for per-scene audience analysis)
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false)
  const [optimizeDialogScene, setOptimizeDialogScene] = useState<{
    sceneIndex: number
    sceneNumber: number
    sceneHeading: string
    audienceAnalysis?: {
      score: number
      pacing: 'slow' | 'moderate' | 'fast'
      tension: 'low' | 'medium' | 'high'
      characterDevelopment: 'minimal' | 'moderate' | 'strong'
      visualPotential: 'low' | 'medium' | 'high'
      notes: string
      recommendations: string[]
    }
  } | null>(null)
  const [isLocalOptimizing, setIsLocalOptimizing] = useState(false)
  
  // Expanded recommendations state per scene
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<number>>(new Set())
  
  // Voice selection visibility state
  const [showVoiceSelection, setShowVoiceSelection] = useState(false)
  
  // Script overview visibility state
  const [showScriptOverview, setShowScriptOverview] = useState(false)
  
  const [showProductionProgress, setShowProductionProgress] = useState(false)
  
  // Scene review modal state
  const [showSceneReviewModal, setShowSceneReviewModal] = useState(false)
  const [selectedSceneForReview, setSelectedSceneForReview] = useState<number | null>(null)
  
  // Drag and drop functionality
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    
    if (active.id !== over.id) {
      const oldIndex = scenes.findIndex((s: any, idx: number) => idx === active.id)
      const newIndex = scenes.findIndex((s: any, idx: number) => idx === over.id)
      onReorderScenes?.(oldIndex, newIndex)
    }
  }
  
  // Image generation state
  const [generatingImageForScene, setGeneratingImageForScene] = useState<number | null>(null)
  
  // Warning expansion state - track which scene warnings are expanded
  const [warningExpanded, setWarningExpanded] = useState<Record<number, boolean>>({})
  
  // Toggle warning expansion for a specific scene
  const toggleWarningExpanded = (sceneIdx: number) => {
    setWarningExpanded(prev => ({
      ...prev,
      [sceneIdx]: !prev[sceneIdx]
    }))
  }
  
  
  // Set warnings as expanded by default when they first appear
  useEffect(() => {
    const newExpanded: Record<number, boolean> = {}
    Object.keys(validationWarnings).forEach(sceneIdxStr => {
      const sceneIdx = parseInt(sceneIdxStr)
      if (validationWarnings[sceneIdx] && warningExpanded[sceneIdx] === undefined) {
        newExpanded[sceneIdx] = true // Default to expanded
      }
    })
    if (Object.keys(newExpanded).length > 0) {
      setWarningExpanded(prev => ({ ...prev, ...newExpanded }))
    }
  }, [validationWarnings, warningExpanded])
  
  // Cleanup orphan audio objects on unmount (prevents ghost audio)
  useEffect(() => {
    return () => {
      // Stop and clean up all tracked audio objects
      orphanAudioRefs.current.forEach(audio => {
        try {
          audio.pause()
          audio.src = ''  // Cancel any ongoing preload
          audio.load()    // Reset the element
        } catch (e) {
          // Ignore cleanup errors
        }
      })
      orphanAudioRefs.current.clear()
      
      // Also stop the individual audio ref
      if (individualAudioRef.current) {
        individualAudioRef.current.pause()
        individualAudioRef.current.src = ''
      }
      
      // Stop the TTS audio ref
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])
  
  // Scene prompt builder state
  const [sceneBuilderOpen, setSceneBuilderOpen] = useState(false)
  const [sceneBuilderIdx, setSceneBuilderIdx] = useState<number | null>(null)
  const [scenePrompts, setScenePrompts] = useState<Record<number, string>>({})
  
  // Scene prompt drawer state (new editor)
  const [sceneDrawerOpen, setSceneDrawerOpen] = useState(false)
  const [sceneDrawerIdx, setSceneDrawerIdx] = useState<number | null>(null)
  // Collapsible state for Production Scenes section (default hidden)
  const [showProductionScenes, setShowProductionScenes] = useState(false)
  
  // Audio features state
  const [generatingMusic, setGeneratingMusic] = useState<number | null>(null)
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [isPlayingMixed, setIsPlayingMixed] = useState(false)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const playbackAbortRef = useRef(false)
  const [bookmarkSavingSceneIdx, setBookmarkSavingSceneIdx] = useState<number | null>(null)
  
  // Handler for opening frame edit modal (used by SceneCard/SegmentFrameTimeline)
  const handleOpenFrameEditModal = useCallback((
    sceneId: string,
    sceneIdx: number,
    segmentId: string,
    frameType: 'start' | 'end',
    frameUrl: string
  ) => {
    setEditingImageData({
      url: frameUrl,
      sceneIdx,
      sceneId,
      segmentId,
      frameType
    })
    setImageEditModalOpen(true)
  }, [])

  const scenes = useMemo(() => normalizeScenes(script), [script])

  // Get playback offset for current scene/language (must be after scenes is defined)
  const getPlaybackOffsetForScene = useCallback((sceneId: string, language: string): number => {
    // First check local state
    if (playbackOffsets[sceneId]?.[language] !== undefined) {
      return playbackOffsets[sceneId][language]
    }
    // Otherwise fall back to scene data
    const scene = scenes.find(s => (s.sceneId || s.id) === sceneId)
    if (scene) {
      return getLanguagePlaybackOffset(scene, language)
    }
    return 0
  }, [playbackOffsets, scenes])
  
  // Save playback offset for a scene/language (updates local state + persists to script)
  const handlePlaybackOffsetChange = useCallback((sceneId: string, sceneIdx: number, language: string, offset: number) => {
    // Update local state immediately for responsive UI
    setPlaybackOffsets(prev => ({
      ...prev,
      [sceneId]: {
        ...(prev[sceneId] || {}),
        [language]: offset
      }
    }))
    
    // Persist to scene data via onScriptChange
    const updatedScenes = [...scenes]
    const scene = updatedScenes[sceneIdx]
    if (scene) {
      scene.languagePlaybackOffsets = {
        ...(scene.languagePlaybackOffsets || {}),
        [language]: offset
      }
      const updatedScript = {
        ...script,
        script: {
          ...script.script,
          scenes: updatedScenes
        }
      }
      onScriptChange(updatedScript)
      console.log('[Playback Offset] Saved:', { sceneId, language, offset })
    }
  }, [scenes, script, onScriptChange])
  
  // Get suggested playback offset for a scene based on audio duration differences
  const getSuggestedOffsetForScene = useCallback((scene: any): number | undefined => {
    if (!scene || selectedLanguage === 'en') return undefined
    return calculateSuggestedOffset(scene, selectedLanguage, 'en')
  }, [selectedLanguage])

  // Always show single scene - use selectedSceneIndex or default to first scene
  const displayedScenes = useMemo(() => {
    if (scenes.length === 0) return []
    const idx = selectedSceneIndex !== null && selectedSceneIndex >= 0 && selectedSceneIndex < scenes.length
      ? selectedSceneIndex
      : 0 // Default to first scene
    return [{ scene: scenes[idx], originalIndex: idx }]
  }, [scenes, selectedSceneIndex])

  const bookmarkedSceneIndex = useMemo(() => {
    if (!bookmarkedScene) return -1
    return scenes.findIndex((scene: any, idx: number) => {
      const sceneId = scene?.id || `scene-${idx}`
      if (bookmarkedScene?.sceneId) {
        return sceneId === bookmarkedScene.sceneId
      }
      if (bookmarkedScene?.sceneNumber != null) {
        return idx === Number(bookmarkedScene.sceneNumber) - 1
      }
      return false
    })
  }, [bookmarkedScene, scenes])

  const scrollSceneIntoView = useCallback(
    (index: number, smooth = true) => {
      if (index < 0) return
      const scene = scenes[index]
      if (!scene) return
      const domId = getSceneDomId(scene, index)
      const element = typeof window !== 'undefined' ? document.getElementById(domId) : null
      if (element) {
        element.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
      }
    },
    [scenes]
  )

  useEffect(() => {
    if (selectedScene === null && bookmarkedSceneIndex !== -1) {
      setSelectedScene(bookmarkedSceneIndex)
    }
  }, [bookmarkedSceneIndex, selectedScene])

  // Stats for Production Dashboard
  const imageCount = useMemo(
    () => (Array.isArray(scenes) ? scenes.filter((s: any) => !!s?.imageUrl).length : 0),
    [scenes]
  )
  const audioCount = useMemo(() => {
    if (!Array.isArray(scenes)) return 0
    return scenes.reduce((acc: number, s: any) => {
      const narration = s?.narrationAudio?.en?.url || s?.narrationAudioUrl ? 1 : 0
      const music = s?.musicAudio ? 1 : 0
      const dialogue = Array.isArray(s?.dialogueAudio) ? s.dialogueAudio.length : 0
      const sfx = Array.isArray(s?.sfxAudio) ? s.sfxAudio.length : 0
      return acc + narration + music + dialogue + sfx
    }, 0)
  }, [scenes])
  const averageScore = useMemo(() => {
    if (!Array.isArray(scenes) || scenes.length === 0) return 0
    const scores = scenes
      .map((s: any) => s?.scoreAnalysis?.overallScore)
      .filter((n: any) => typeof n === 'number') as number[]
    if (scores.length === 0) return 0
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    return Math.round(avg)
  }, [scenes])

  const [isDialogGenerating, setIsDialogGenerating] = useState(false)
  const [dialogGenerationMode, setDialogGenerationMode] = useState<DialogGenerationMode>('foreground')
  const [dialogGenerationProgress, setDialogGenerationProgress] = useState<DialogGenerationProgress | null>(null)
  const generationModeRef = useRef<DialogGenerationMode>('foreground')
  const backgroundRequestedRef = useRef(false)

  useEffect(() => {
    generationModeRef.current = dialogGenerationMode
  }, [dialogGenerationMode])

  const toastVisualStyle = {
    background: '#111827',
    color: '#F9FAFB',
    border: '1px solid #1f2937'
  }

  const handleBookmarkToggle = async (targetSceneIdx?: number) => {
    if (!onBookmarkScene) return
    const resolvedSceneIdx = typeof targetSceneIdx === 'number' ? targetSceneIdx : selectedScene
    if (resolvedSceneIdx === null || resolvedSceneIdx === undefined) {
      toast.info('Select a scene to bookmark first.', { style: toastVisualStyle })
      return
    }
    const scene = scenes[resolvedSceneIdx]
    if (!scene) {
      toast.error('Selected scene not found.', { style: toastVisualStyle })
      return
    }
    const sceneId = scene?.id || `scene-${resolvedSceneIdx}`
    const sceneNumber = Number(scene?.sceneNumber) || resolvedSceneIdx + 1
    const isBookmarked = resolvedSceneIdx === bookmarkedSceneIndex
    setBookmarkSavingSceneIdx(resolvedSceneIdx)
    try {
      if (isBookmarked) {
        await onBookmarkScene(null)
        toast.info(`Removed bookmark for Scene ${sceneNumber}.`, { style: toastVisualStyle })
      } else {
        await onBookmarkScene({ sceneId, sceneNumber })
        toast.success(`Bookmarked Scene ${sceneNumber}.`, { style: toastVisualStyle })
      }
      if (typeof targetSceneIdx === 'number') {
        setSelectedScene(targetSceneIdx)
      }
    } catch (error) {
      console.error('[Bookmark] Failed to update bookmark', error)
      toast.error('Failed to update bookmark. Please try again.', { style: toastVisualStyle })
    } finally {
      setBookmarkSavingSceneIdx(null)
    }
  }

  const handleJumpToBookmark = () => {
    if (bookmarkedSceneIndex === -1) {
      toast.info('No bookmarked scene yet.', { style: toastVisualStyle })
      return
    }
    setSelectedScene(bookmarkedSceneIndex)
    // Notify parent to update timeline selection
    onSelectSceneIndex?.(bookmarkedSceneIndex)
    scrollSceneIntoView(bookmarkedSceneIndex)
  }

  const backgroundProgressPercent = dialogGenerationMode === 'background' && isDialogGenerating && dialogGenerationProgress
    ? Math.min(99, Math.round((dialogGenerationProgress.completedSteps / Math.max(1, dialogGenerationProgress.totalSteps)) * 100))
    : null

  const updateDialogProgress = (updater: (prev: DialogGenerationProgress | null) => DialogGenerationProgress | null) => {
    setDialogGenerationProgress(prev => updater(prev))
  }

  const handleRunGenerationInBackground = () => {
    if (!isDialogGenerating) return
    backgroundRequestedRef.current = true
    setDialogGenerationMode('background')
    generationModeRef.current = 'background'
    setGenerateAudioDialogOpen(false)
    toast.info('Audio generation will continue in the background.', { style: toastVisualStyle })
  }

  const handleGenerateDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (isDialogGenerating && generationModeRef.current === 'foreground') {
        toast.info('Generation is still running. Use "Run in background" to continue without this dialog.', { style: toastVisualStyle })
        setGenerateAudioDialogOpen(true)
        return
      }
      setGenerateAudioDialogOpen(false)
      if (!isDialogGenerating) {
        setDialogGenerationProgress(null)
        setDialogGenerationMode('foreground')
        generationModeRef.current = 'foreground'
        backgroundRequestedRef.current = false
      }
    } else {
      setGenerateAudioDialogOpen(true)
    }
  }

  // Handler for generating audio from dialog
  const handleGenerateAudioFromDialog = async (
    language: string,
    audioTypes: { narration: boolean; dialogue: boolean; music: boolean; sfx: boolean },
    options?: { stayOpen: boolean; generateCharacters?: boolean; generateSceneImages?: boolean; forceRegenerateImages?: boolean }
  ) => {
    // Pass language parameter to enable multi-language TTS with translation
    const stayOpen = options?.stayOpen ?? true
    const includeCharacters = options?.generateCharacters ?? false
    const includeSceneImages = options?.generateSceneImages ?? false
    const forceRegenerateImages = options?.forceRegenerateImages ?? false

    // Batch API covers narration, dialogue, music, and SFX (ElevenLabs).
    if (audioTypes.narration && audioTypes.dialogue && audioTypes.music && onGenerateAllAudio) {
      setDialogGenerationProgress(null)
      setDialogGenerationMode('foreground')
      generationModeRef.current = 'foreground'
      backgroundRequestedRef.current = false
      await onGenerateAllAudio(language, {
        includeNarration: true,
        includeDialogue: true,
        includeMusic: true,
        includeSFX: !!audioTypes.sfx,
      })
      setGenerateAudioDialogOpen(false)
      return
    }

    if (!onGenerateSceneAudio) {
      console.error('onGenerateSceneAudio not provided')
      toast.error('Audio generation not available', { style: toastVisualStyle })
      return
    }

    const scenes = script?.script?.scenes || []

    if (!scenes.length) {
      toast.error('No scenes to generate audio for', { style: toastVisualStyle })
      return
    }

    const totalDialogueLines = audioTypes.dialogue
      ? scenes.reduce((sum: number, scene: any) => {
          if (!Array.isArray(scene.dialogue)) return sum
          const count = scene.dialogue.filter((d: any) => d?.character && d?.line).length
          return sum + count
        }, 0)
      : 0

    // Count music scenes (scenes that have music description)
    const totalMusicScenes = audioTypes.music
      ? scenes.filter((scene: any) => scene?.music || typeof scene?.music === 'string').length
      : 0

    const totalSceneSteps = audioTypes.narration ? scenes.length : 0
    const totalCharacters = includeCharacters ? (characters?.length || 0) : 0
    const totalImages = includeSceneImages ? scenes.length : 0
    const totalSteps = totalSceneSteps + totalDialogueLines + totalMusicScenes + totalCharacters + totalImages
    const audioTasksSelected = audioTypes.narration || audioTypes.dialogue || audioTypes.music || audioTypes.sfx

    // SFX-only batch: route directly through onGenerateAllAudio with sfx flag.
    if (audioTypes.sfx && !audioTypes.narration && !audioTypes.dialogue && !audioTypes.music && !includeCharacters && !includeSceneImages) {
      if (onGenerateAllAudio) {
        setDialogGenerationProgress(null)
        setDialogGenerationMode('foreground')
        generationModeRef.current = 'foreground'
        backgroundRequestedRef.current = false
        await onGenerateAllAudio(language, { includeSFX: true, includeMusic: false, includeNarration: false, includeDialogue: false })
        setGenerateAudioDialogOpen(false)
      }
      return
    }

    if (totalSteps === 0) {
      toast.info('Select at least one generation option.', { style: toastVisualStyle })
      return
    }

    setIsDialogGenerating(true)
    backgroundRequestedRef.current = !stayOpen

    const initialPhase: DialogGenerationProgress['phase'] = audioTypes.narration
      ? 'narration'
      : audioTypes.dialogue
      ? 'dialogue'
      : audioTypes.music
      ? 'music'
      : audioTypes.sfx
      ? 'sfx'
      : includeCharacters
      ? 'characters'
      : includeSceneImages
      ? 'images'
      : 'narration'

    const initialMessage = (() => {
      switch (initialPhase) {
        case 'narration':
          return audioTypes.narration ? 'Preparing narration...' : 'Narration skipped.'
        case 'dialogue':
          return 'Preparing dialogue...'
        case 'music':
          return 'Preparing music generation...'
        case 'sfx':
          return 'Preparing sound effects...'
        case 'characters':
          return totalCharacters > 0 ? 'Preparing character assets...' : 'No characters to generate.'
        case 'images':
          return totalImages > 0 ? 'Preparing scene images...' : 'No scenes to generate.'
        default:
          return 'Preparing generation...'
      }
    })()

    setDialogGenerationProgress({
      status: 'running',
      phase: initialPhase,
      currentScene: 0,
      totalScenes: scenes.length,
      currentDialogue: 0,
      totalDialogue: totalDialogueLines,
      currentMusic: 0,
      totalMusic: totalMusicScenes,
      currentSfx: 0,
      totalSfx: 0,
      currentCharacter: 0,
      totalCharacters,
      currentImage: 0,
      totalImages,
      completedSteps: 0,
      totalSteps,
      message: initialMessage,
    })

    if (stayOpen) {
      setDialogGenerationMode('foreground')
      generationModeRef.current = 'foreground'
      setGenerateAudioDialogOpen(true)
    } else {
      setDialogGenerationMode('background')
      generationModeRef.current = 'background'
      setGenerateAudioDialogOpen(false)
      toast.info('Generation will continue in the background. A notification will appear when finished.', { style: toastVisualStyle })
    }

    let completedSteps = 0
    let processedDialogue = 0
    const tasksCompleted: string[] = []

    try {
      for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
        const scene = scenes[sceneIdx]
        const hasNarration = audioTypes.narration && (scene?.narration || scene?.action)
        const dialogueEntries = audioTypes.dialogue && Array.isArray(scene.dialogue)
          ? scene.dialogue
              .map((d: any, idx: number) => ({ ...d, __index: idx }))
              .filter((d: any) => d?.character && d?.line)
          : []

        if (hasNarration) {
          updateDialogProgress((prev) => prev ? {
            ...prev,
            phase: 'narration',
            currentScene: sceneIdx + 1,
            message: `Generating narration for scene ${sceneIdx + 1} of ${scenes.length}`,
          } : prev)

          try {
            await onGenerateSceneAudio(sceneIdx, 'narration', undefined, undefined, language)
          } catch (error) {
            console.error(`[Narration Generation] Error for scene ${sceneIdx}:`, error)
          }
          
          // Small delay to allow state updates to propagate
          await new Promise(resolve => setTimeout(resolve, 100))

          completedSteps += 1
          updateDialogProgress((prev) => prev ? {
            ...prev,
            completedSteps,
            currentScene: sceneIdx + 1,
            message: `Narration generated for scene ${sceneIdx + 1}`,
          } : prev)
        }

        if (dialogueEntries && dialogueEntries.length > 0) {
          for (const entry of dialogueEntries) {
            processedDialogue += 1
            updateDialogProgress((prev) => prev ? {
              ...prev,
              phase: 'dialogue',
              currentScene: sceneIdx + 1,
              currentDialogue: processedDialogue,
              message: `Generating dialogue ${processedDialogue} of ${totalDialogueLines}${entry.character ? ` • ${entry.character}` : ''}`,
            } : prev)

            try {
              await onGenerateSceneAudio(sceneIdx, 'dialogue', entry.character, entry.__index, language)
            } catch (error) {
              console.error(`[Dialogue Generation] Error for scene ${sceneIdx}, entry ${entry.__index}:`, error)
            }
            
            // Small delay to allow state updates to propagate
            await new Promise(resolve => setTimeout(resolve, 100))

            completedSteps += 1
            updateDialogProgress((prev) => prev ? {
              ...prev,
              completedSteps,
              currentDialogue: processedDialogue,
            } : prev)
          }
        } else if (audioTypes.dialogue && stayOpen) {
          updateDialogProgress((prev) => prev ? {
            ...prev,
            currentScene: sceneIdx + 1,
          } : prev)
        }
      }

      if (audioTypes.narration) {
        tasksCompleted.push('narration')
      }
      if (audioTypes.dialogue) {
        tasksCompleted.push('dialogue')
      }

      // Generate music for scenes that have music descriptions
      // Always regenerate regardless of existing audio
      if (audioTypes.music) {
        let processedMusic = 0
        for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
          const scene = scenes[sceneIdx]
          const hasMusic = scene?.music || typeof scene?.music === 'string'
          
          if (hasMusic) {
            processedMusic += 1
            updateDialogProgress((prev) => prev ? {
              ...prev,
              phase: 'music',
              currentScene: sceneIdx + 1,
              currentMusic: processedMusic,
              message: `Generating music for scene ${sceneIdx + 1} of ${scenes.length}`,
            } : prev)

            try {
              const sceneForMusic = scenes[sceneIdx]
              const musicDuration =
                typeof sceneForMusic?.musicDuration === 'number' && sceneForMusic.musicDuration > 0
                  ? sceneForMusic.musicDuration
                  : typeof sceneForMusic?.duration === 'number' && sceneForMusic.duration > 0
                    ? sceneForMusic.duration
                    : 30
              await generateMusic(sceneIdx, true, musicDuration)
            } catch (error) {
              console.error(`[Music Generation] Error for scene ${sceneIdx}:`, error)
            }

            completedSteps += 1
            updateDialogProgress((prev) => prev ? {
              ...prev,
              completedSteps,
              currentMusic: processedMusic,
            } : prev)
          }
        }
        if (processedMusic > 0) {
          tasksCompleted.push('music')
        }
      }

      if (includeCharacters) {
        if (totalCharacters === 0) {
          updateDialogProgress(prev => prev ? {
            ...prev,
            phase: 'characters',
            currentCharacter: 0,
            message: 'No characters to generate.',
          } : prev)
        } else if (onGenerateAllCharacters) {
          updateDialogProgress(prev => prev ? {
            ...prev,
            phase: 'characters',
            currentCharacter: 0,
            message: `Generating ${totalCharacters} character asset${totalCharacters !== 1 ? 's' : ''}...`,
          } : prev)

          await onGenerateAllCharacters()

          completedSteps += totalCharacters
          tasksCompleted.push('characters')

          updateDialogProgress(prev => prev ? {
            ...prev,
            phase: 'characters',
            currentCharacter: totalCharacters,
            completedSteps,
            message: 'Character assets generated.',
          } : prev)
        } else {
          toast.warning('Character generation is not available in this project.', { style: toastVisualStyle })
        }
      }

      if (includeSceneImages) {
        if (!onGenerateSceneImage) {
          toast.warning('Scene image generation is not available.', { style: toastVisualStyle })
        } else if (totalImages === 0) {
          updateDialogProgress(prev => prev ? {
            ...prev,
            phase: 'images',
            currentImage: 0,
            message: 'No scene images to generate.',
          } : prev)
        } else {
          for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
            const scene = scenes[sceneIdx]
            const sceneHeading = scene?.heading || scene?.action || `Scene ${sceneIdx + 1}`
            const hasImage = !!scene?.imageUrl
            // Skip existing images unless forceRegenerate is enabled
            const shouldGenerate = !hasImage || forceRegenerateImages

            updateDialogProgress(prev => prev ? {
              ...prev,
              phase: 'images',
              currentScene: sceneIdx + 1,
              currentImage: Math.min(prev.currentImage, sceneIdx),
              message: shouldGenerate
                ? `${forceRegenerateImages && hasImage ? 'Regenerating' : 'Generating'} image for scene ${sceneIdx + 1}${sceneHeading ? ` • ${sceneHeading}` : ''}`
                : `Scene ${sceneIdx + 1} already has an image. Skipping generation...`,
            } : prev)

            if (shouldGenerate) {
              await onGenerateSceneImage(sceneIdx)
              if (sceneIdx < scenes.length - 1) {
                updateDialogProgress(prev => prev ? {
                  ...prev,
                  message: `Scene ${sceneIdx + 1} complete. Waiting ${SCENE_IMAGE_DELAY_MS / 1000}s before next scene...`,
                } : prev)
                await delay(SCENE_IMAGE_DELAY_MS)
              }
            }

            completedSteps += 1

            updateDialogProgress(prev => prev ? {
              ...prev,
              phase: 'images',
              currentScene: sceneIdx + 1,
              currentImage: sceneIdx + 1,
              completedSteps,
              message: shouldGenerate
                ? `${forceRegenerateImages && hasImage ? 'Regenerated' : 'Generated'} image for scene ${sceneIdx + 1}.`
                : `Scene ${sceneIdx + 1} already had an image (skipped).`,
            } : prev)
          }

          if (totalImages > 0) {
            tasksCompleted.push('scene images')
          }
        }
      }

      const isBackground = generationModeRef.current === 'background' || !stayOpen
      const taskSummary = tasksCompleted.length > 0 ? tasksCompleted.join(', ') : 'selected items'

      updateDialogProgress(prev => prev ? {
        ...prev,
        status: 'completed',
        completedSteps: prev.totalSteps,
        message: 'Generation complete.',
      } : prev)

      const completionMessage = `${isBackground ? 'Background generation' : 'Generation'} complete: ${taskSummary}.`
      toast.success(completionMessage, { style: toastVisualStyle })
    } catch (error) {
      console.error('Error generating audio:', error)
      updateDialogProgress(prev => prev ? {
        ...prev,
        status: 'error',
        message: 'Generation failed. Please try again.',
      } : prev)
      toast.error('Failed to generate audio. Please try again.', { style: toastVisualStyle })
    } finally {
      setIsDialogGenerating(false)

      if (generationModeRef.current === 'background' || !stayOpen) {
        setDialogGenerationProgress(null)
        setDialogGenerationMode('foreground')
        generationModeRef.current = 'foreground'
        backgroundRequestedRef.current = false
      }
    }
  }

  // Fetch Google/Gemini voices for fallback playback only
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/tts/google/voices', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        if (!mounted) return
        if (data?.enabled && Array.isArray(data.voices) && data.voices.length > 0) {
          const formattedVoices = data.voices.map((v: any) => ({ 
            id: v.id, 
            name: v.name 
          }))
          setEnabled(true)
          setVoices(formattedVoices)
          setSelectedVoiceId(data.voices[0].id)
        } else {
          setEnabled(false)
          setVoices([])
          setSelectedVoiceId(undefined)
        }
      } catch {
        if (!mounted) return
        setEnabled(false)
        setVoices([])
        setSelectedVoiceId(undefined)
      }
    })()
    return () => { mounted = false }
  }, [])

  const stopAudio = () => {
    try {
      // Stop the WebAudioMixer if it's playing
      if (audioMixerRef.current) {
        audioMixerRef.current.stop()
      }
      // Also stop legacy audio element if present
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    } catch {}
    audioRef.current = null
    setLoadingSceneId(null)
    queueAbortRef.current.abort = true
  }

  // Helper to resolve audio duration with caching
  const resolveAudioDuration = async (url: string, storedDuration?: number): Promise<number> => {
    if (!url) return 0
    
    // Check cache first
    const cached = audioDurationCacheRef.current.get(url)
    if (typeof cached === 'number') return cached
    
    // Use stored duration if available
    if (typeof storedDuration === 'number' && storedDuration > 0) {
      audioDurationCacheRef.current.set(url, storedDuration)
      return storedDuration
    }
    
    // Measure duration from audio file
    try {
      const measured = await getAudioDuration(url)
      if (Number.isFinite(measured) && measured > 0) {
        audioDurationCacheRef.current.set(url, measured)
        return measured
      }
    } catch (error) {
      console.warn('[ScriptPanel] Failed to measure audio duration:', url, error)
    }
    
    // Fallback duration
    const fallback = 3
    audioDurationCacheRef.current.set(url, fallback)
    return fallback
  }

  // Calculate audio timeline for intelligent playback
  const calculateAudioTimeline = async (scene: any): Promise<SceneAudioConfig> => {
    // Normalize and validate audio URLs for playback
    // Checks: 1) URL format is absolute, 2) URL is reachable before playback
    // Returns: Normalized absolute URL or null if unreachable (prevents 404 errors)
    const normalizeAudioUrl = async (rawUrl: string | undefined | null): Promise<string | null> => {
      if (!rawUrl) return null
      
      let absoluteUrl: string
      try {
        // If it's already a valid absolute URL, use as-is
        new URL(rawUrl)
        absoluteUrl = rawUrl
      } catch {
        // Resolve relative URLs against current origin
        if (typeof window !== 'undefined') {
          if (rawUrl.startsWith('/')) {
            absoluteUrl = `${window.location.origin}${rawUrl}`
          } else {
            absoluteUrl = `${window.location.origin}/${rawUrl}`.replace(/([^:]\/)\/+/, '$1')
          }
        } else {
          // Server-side: can't resolve relative paths, return as-is
          return rawUrl
        }
      }

      // Validate URL is reachable with HEAD request (5 second timeout)
      // This prevents attempting to play stale/orphaned audio URLs that return 404
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const headResponse = await fetch(absoluteUrl, {
          method: 'HEAD',
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (!headResponse.ok) {
          console.warn(`[calculateAudioTimeline] Audio URL unreachable (${headResponse.status}), skipping: ${absoluteUrl}`)
          return null
        }
        
        return absoluteUrl
      } catch (error: any) {
        // Network error/timeout - log warning but continue (may be temporary)
        console.warn(`[calculateAudioTimeline] Could not validate audio URL (${error?.message}), attempting playback: ${absoluteUrl}`)
        return absoluteUrl
      }
    }

    const config: SceneAudioConfig = {}
    let currentTime = 0
    let totalDuration = 0
    let descriptionEndTime = 0
    let narrationEndTime = 0
    
    // Get language-specific audio URLs and validate they're reachable
    const narrationUrl = await normalizeAudioUrl(
      getAudioUrl(scene, selectedLanguage, 'narration')
    )
    const descriptionUrl = await normalizeAudioUrl(
      getAudioUrl(scene, selectedLanguage, 'description')
    )
    const dialogueArray = (scene.dialogueAudio?.[selectedLanguage] || 
                          (selectedLanguage === 'en' ? scene.dialogueAudio?.en : null) ||
                          (Array.isArray(scene.dialogueAudio) ? scene.dialogueAudio : null) || []).filter(Boolean)
    
    // Resolve music URL (beat-gated scheduling applied after scene duration is known)
    const rawMusicUrl = scene.musicAudio || scene.music?.url
    let musicUrl: string | null = null
    if (rawMusicUrl) {
      musicUrl = await normalizeAudioUrl(rawMusicUrl)
    }
    
    // Scene description plays before narration when available
    // Check for custom description startTime
    const customDescriptionStartTime = scene.descriptionAudio?.[selectedLanguage]?.startTime
    if (descriptionUrl) {
      config.description = descriptionUrl
      // Use custom startTime if provided, defaults to 0 (start immediately)
      config.descriptionOffsetSeconds = customDescriptionStartTime ?? 0
      if (customDescriptionStartTime !== undefined) {
        console.log(`[ScriptPanel] Using CUSTOM description startTime: ${customDescriptionStartTime}s for scene ${scene.id}`)
      }
      const storedDescriptionDuration = scene.descriptionAudio?.[selectedLanguage]?.duration
      const descriptionDuration = await resolveAudioDuration(descriptionUrl, storedDescriptionDuration)
      descriptionEndTime = (customDescriptionStartTime ?? 0) + descriptionDuration
      totalDuration = Math.max(totalDuration, descriptionEndTime)
    }

    // Check for custom narration startTime, fallback to calculated offset
    const customNarrationStartTime = scene.narrationAudio?.[selectedLanguage]?.startTime
    const narrationOffset = customNarrationStartTime !== undefined
      ? customNarrationStartTime
      : (descriptionUrl ? descriptionEndTime + 0.35 : 2)
    
    if (customNarrationStartTime !== undefined) {
      console.log(`[ScriptPanel] Using CUSTOM narration startTime: ${customNarrationStartTime}s for scene ${scene.id}`)
    }

    // Narration starts after the configured offset (or after description)
    if (narrationUrl) {
      config.narration = narrationUrl
      config.narrationOffsetSeconds = narrationOffset
      const storedDuration = scene.narrationAudio?.[selectedLanguage]?.duration
      const narrationDuration = await resolveAudioDuration(narrationUrl, storedDuration)
      narrationEndTime = narrationOffset + narrationDuration
      totalDuration = Math.max(totalDuration, narrationEndTime)
    } else {
      narrationEndTime = descriptionEndTime
    }
    
    const voiceAnchorTime = Math.max(descriptionEndTime, narrationEndTime)
    currentTime = voiceAnchorTime + 0.5 // 500ms pause after narration/description before dialogue
    
    // Dialogue follows narration sequentially with appropriate spacing
    if (Array.isArray(dialogueArray) && dialogueArray.length > 0) {
      config.dialogue = []
      
      // Helper to extract timestamp from URL filename
      const getUrlTimestamp = (url: string): number => {
        const match = url.match(/(\d{13})/)
        return match ? parseInt(match[1], 10) : 0
      }
      
      // Sort dialogue by URL timestamp (oldest first = correct generation order)
      const sortedDialogue = [...dialogueArray].sort((a, b) => {
        const urlA = a?.audioUrl || a?.url || ''
        const urlB = b?.audioUrl || b?.url || ''
        const tsA = getUrlTimestamp(urlA)
        const tsB = getUrlTimestamp(urlB)
        return tsA - tsB  // Ascending order - oldest first
      })
      
      console.log('[ScriptPanel] 🔊🔊🔊 TIMESTAMP SORTING ACTIVE - Dialogue sorted by URL timestamp')
      console.log('[ScriptPanel] Dialogue count:', dialogueArray.length)
      console.log('[ScriptPanel] Sorted order:', sortedDialogue.map((d: any) => (d?.audioUrl || d?.url || '').split('/').pop()))
      
      for (const dialogue of sortedDialogue) {
        const audioUrl = await normalizeAudioUrl(
          dialogue?.audioUrl || dialogue?.url
        )
        if (audioUrl) {
          // Check for custom startTime on this dialogue entry
          const customDialogueStartTime = dialogue.startTime
          const dialogueStart = customDialogueStartTime !== undefined
            ? customDialogueStartTime
            : currentTime
          
          if (customDialogueStartTime !== undefined) {
            console.log(`[ScriptPanel] Using CUSTOM dialogue startTime: ${customDialogueStartTime}s for "${dialogue.character || 'unknown'}"`)
          }
          
          config.dialogue.push({
            url: audioUrl,
            startTime: dialogueStart
          })
          
          const dialogueDuration = await resolveAudioDuration(audioUrl, dialogue.duration)
          totalDuration = Math.max(totalDuration, dialogueStart + dialogueDuration)
          
          // Add 300ms pause between dialogue lines for natural pacing
          // Update cursor even with custom start time for subsequent sequential dialogues
          currentTime = Math.max(currentTime, dialogueStart) + dialogueDuration + 0.3
        }
      }
    }
    
    // SFX - play concurrently, use specified time or distribute across scene
    if (scene.sfxAudio && scene.sfxAudio.length > 0) {
      config.sfx = []
      
      for (let idx = 0; idx < scene.sfxAudio.length; idx++) {
        const sfxUrl = scene.sfxAudio[idx]
        if (!sfxUrl) continue

        const normalizedSfxUrl = await normalizeAudioUrl(sfxUrl)
        if (!normalizedSfxUrl) continue  // Skip if URL is unreachable
        
        const sfxDef = scene.sfx?.[idx] || {}
        // Use specified time, or distribute SFX evenly across the scene
        let sfxTime: number
        if (sfxDef.time !== undefined) {
          sfxTime = sfxDef.time
        } else {
          // Distribute SFX evenly, starting after first 1 second
          const interval = totalDuration > 2 ? (totalDuration - 1) / scene.sfxAudio.length : 1
          sfxTime = 1 + (idx * interval)
        }
        
        const sfxDuration = await resolveAudioDuration(
          normalizedSfxUrl,
          sfxDef.duration
        )
        config.sfx.push({
          url: normalizedSfxUrl,
          startTime: sfxTime
        })
        totalDuration = Math.max(totalDuration, sfxTime + sfxDuration)
      }
    }
    
    // Set scene duration for music-only scenes or to ensure music plays long enough
    config.sceneDuration = Math.max(totalDuration, scene.duration || 5)

    if (musicUrl) {
      const beatCount = getSceneBeats(scene).length
      if (beatCount > 0) {
        const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, selectedLanguage)
        const musicFileDuration = await resolveAudioDuration(
          musicUrl,
          scene.musicDuration ?? scene.music?.duration
        )
        const musicClips = buildStoryboardMusicClips(
          scene,
          visualFrames,
          config.sceneDuration,
          musicFileDuration
        )
        if (musicClips.length > 0) {
          config.musicSegments = musicClips.map((clip) => ({
            url: clip.url,
            startTime: clip.startTime,
            duration: clip.duration,
            trimStart: clip.trimStart,
          }))
        }
      } else {
        config.music = musicUrl
      }
    }
    
    return config
  }

  // Play scene using pre-generated MP3 files with intelligent timing
  const playScene = async (sceneIdx: number) => {
    if (!scenes || scenes.length === 0) return
    stopAudio()
    setLoadingSceneId(sceneIdx)
    
    const scene = scenes[sceneIdx]
    if (!scene) {
      setLoadingSceneId(null)
      return
    }
    
    // Check if we have any pre-generated audio
    const narrationUrl = getAudioUrl(scene, selectedLanguage, 'narration')
    const dialogueArray = (scene.dialogueAudio?.[selectedLanguage] || 
                          (selectedLanguage === 'en' ? scene.dialogueAudio?.en : null) ||
                          (Array.isArray(scene.dialogueAudio) ? scene.dialogueAudio : null) || []).filter(Boolean)
    const hasDialogue = Array.isArray(dialogueArray) && dialogueArray.some((d: any) => d?.audioUrl || d?.url)
    const hasMusic = !!(scene.musicAudio || scene.music?.url)
    const hasSFX = !!(scene.sfxAudio && scene.sfxAudio.length > 0)
    
    const hasPreGeneratedAudio = narrationUrl || hasDialogue || hasMusic || hasSFX
    
    if (!hasPreGeneratedAudio) {
      // Fall back to legacy TTS generation if no pre-generated audio
      const fullText = buildSceneNarrationText(scene)
      if (!fullText.trim()) {
        setLoadingSceneId(null)
        return
      }
      
      // Chunk text for TTS
      const chunks: string[] = []
      const maxLen = 1200
      let cursor = 0
      while (cursor < fullText.length) {
        chunks.push(fullText.slice(cursor, cursor + maxLen))
        cursor += maxLen
      }
      
      try {
        if (!selectedVoiceId && (!voices || !voices.length)) throw new Error('No voice available')
        await playTextChunks(chunks)
        setLoadingSceneId(null)
      } catch {
        setLoadingSceneId(null)
      }
      return
    }
    
    // Use WebAudioMixer for pre-generated audio
    try {
      // Initialize mixer if needed
      if (!audioMixerRef.current) {
        audioMixerRef.current = new WebAudioMixer()
      }
      
      // Calculate timeline with intelligent timing
      const audioConfig = await calculateAudioTimeline(scene)
      
      try {
        // Wait for the mixer to report real completion of all non-looping audio
        await audioMixerRef.current.playScene(audioConfig)
      } catch (mixerError) {
        console.error('[ScriptPanel] Error in playScene:', mixerError)
      }

      // Give a short breathing room after the final audio finishes
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Fade out looping music gracefully once everything else is done
      if ((audioConfig.music || (audioConfig.musicSegments && audioConfig.musicSegments.length > 0)) && audioMixerRef.current) {
        await audioMixerRef.current.fadeOut(2000)
        audioMixerRef.current.stop()
      }

      setLoadingSceneId(null)
    } catch (error) {
      console.error('[ScriptPanel] Error playing scene:', error)
      setLoadingSceneId(null)
    }
  }

  function buildSceneNarrationText(scene: any): string {
    const parts: string[] = []
    
    // Use dedicated narration field (captivating storytelling)
    if (scene.narration) {
      parts.push(scene.narration)
    }
    
    // Add dialogue only (skip action/technical description)
    if (scene.dialogue && scene.dialogue.length > 0) {
      scene.dialogue.forEach((d: any) => {
        parts.push(`${d.character}: ${d.line}`)
      })
    }
    
    return parts.join('. ')
  }

  async function playTextChunks(texts: string[]) {
    queueAbortRef.current.abort = false
    for (const t of texts) {
      if (queueAbortRef.current.abort) break
      
      const resp = await fetch('/api/tts/google', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, voiceId: selectedVoiceId || voices[0]?.id })
      })
      if (!resp.ok) throw new Error('TTS failed')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve()
        audio.onerror = () => reject(new Error('Audio error'))
        audio.play().catch(reject)
      })
    }
  }

  // Audio generation functions
  const generateMusic = async (
    sceneIdx: number,
    skipOverlay?: boolean,
    durationSeconds?: number
  ) => {
    const scene = scenes[sceneIdx]
    const music = scene?.music
    if (!music) return

    const duration =
      durationSeconds ??
      (typeof scene.musicDuration === 'number' && scene.musicDuration > 0
        ? scene.musicDuration
        : undefined) ??
      (typeof scene.duration === 'number' && scene.duration > 0 ? scene.duration : 30)

    setGeneratingMusic(sceneIdx)
    if (!skipOverlay) {
      overlayStore?.show(`Generating music for Scene ${sceneIdx + 1}...`, 45, 'audio-generation')
    }
    try {
      const { generateMusicTrack } = await import('@/lib/audio/musicClient')
      const data = await generateMusicTrack({
        text: typeof music === 'string' ? music : music.description,
        duration,
        saveToBlob: true,
        projectId: projectId || 'temp',
        sceneId: `scene-${sceneIdx}`,
      })
      const audioUrl = data.url

      await saveSceneAudio(
        sceneIdx,
        'music',
        audioUrl,
        undefined,
        undefined,
        undefined,
        duration,
        typeof data.duration === 'number' && data.duration > 0 ? data.duration : undefined
      )
      if (!skipOverlay) {
        overlayStore?.hide()
      }
    } catch (error: unknown) {
      console.error('[Music Generation] Error:', error)
      if (!skipOverlay) {
        overlayStore?.hide()
      }
      const { LyriaRecitationError } = await import('@/lib/audio/musicClient')
      const message =
        error instanceof LyriaRecitationError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Music generation failed'
      toast.error(
        error instanceof LyriaRecitationError
          ? message
          : `Failed to generate music: ${message}`
      )
    } finally {
      setGeneratingMusic(null)
    }
  }

  const uploadAudio = async (sceneIdx: number, type: 'description' | 'narration' | 'dialogue' | 'sfx' | 'music', sfxIdx?: number, dialogueIdx?: number, characterName?: string) => {
    if (type === 'sfx') {
      toast.info('SFX uploads are no longer supported. Use Generate to create the cue with ElevenLabs.')
      return
    }
    if (!projectId) {
      toast.error('Project not loaded — cannot upload audio')
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mpeg'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const toastId = toast.loading('Uploading audio...')
      try {
        const audioUrl = await uploadAssetViaAPI(file, projectId)
        
        // Handle different audio types
        if (type === 'music') {
          await saveSceneAudio(sceneIdx, type, audioUrl, sfxIdx, undefined)
        } else if (type === 'description') {
          // Update description audio
          const updatedScenes = [...scenes]
          if (!updatedScenes[sceneIdx].descriptionAudio) {
            updatedScenes[sceneIdx].descriptionAudio = {}
          }
          updatedScenes[sceneIdx].descriptionAudio[selectedLanguage] = { url: audioUrl }
          // Also set legacy field for 'en'
          if (selectedLanguage === 'en') {
            updatedScenes[sceneIdx].descriptionAudioUrl = audioUrl
          }
          const updatedScript = { ...script, script: { ...script.script, scenes: updatedScenes } }
          onScriptChange(updatedScript)
        } else if (type === 'narration') {
          // Update narration audio
          const updatedScenes = [...scenes]
          if (!updatedScenes[sceneIdx].narrationAudio) {
            updatedScenes[sceneIdx].narrationAudio = {}
          }
          updatedScenes[sceneIdx].narrationAudio[selectedLanguage] = { url: audioUrl }
          // Also set legacy field for 'en'
          if (selectedLanguage === 'en') {
            updatedScenes[sceneIdx].narrationAudioUrl = audioUrl
          }
          const updatedScript = { ...script, script: { ...script.script, scenes: updatedScenes } }
          onScriptChange(updatedScript)
        } else if (type === 'dialogue' && dialogueIdx !== undefined) {
          const dialogueLine = scenes[sceneIdx]?.dialogue?.[dialogueIdx]
          // Update dialogue audio
          const updatedScenes = [...scenes]
          if (!updatedScenes[sceneIdx].dialogueAudio) {
            updatedScenes[sceneIdx].dialogueAudio = {}
          }
          if (!updatedScenes[sceneIdx].dialogueAudio[selectedLanguage]) {
            updatedScenes[sceneIdx].dialogueAudio[selectedLanguage] = []
          }
          const existingIdx = updatedScenes[sceneIdx].dialogueAudio[selectedLanguage].findIndex(
            (a: any) =>
              (dialogueLine?.lineId && a?.lineId === dialogueLine.lineId) ||
              (a.dialogueIndex === dialogueIdx && a.character === characterName)
          )
          const audioEntry: Record<string, unknown> = {
            audioUrl,
            character: characterName,
            dialogueIndex: dialogueIdx,
          }
          if (dialogueLine?.lineId) audioEntry.lineId = dialogueLine.lineId
          if (dialogueLine?.kind) audioEntry.kind = dialogueLine.kind
          if (dialogueLine?.characterId) audioEntry.characterId = dialogueLine.characterId
          if (existingIdx >= 0) {
            updatedScenes[sceneIdx].dialogueAudio[selectedLanguage][existingIdx] = {
              ...updatedScenes[sceneIdx].dialogueAudio[selectedLanguage][existingIdx],
              ...audioEntry,
            }
          } else {
            updatedScenes[sceneIdx].dialogueAudio[selectedLanguage].push(audioEntry)
          }
          const updatedScript = { ...script, script: { ...script.script, scenes: updatedScenes } }
          onScriptChange(updatedScript)
        }
        
        toast.success('Audio uploaded!', { id: toastId })
      } catch (error: any) {
        console.error('[Audio Upload] Error:', error)
        toast.error(`Failed to upload audio: ${error.message}`, { id: toastId })
      }
    }

    input.click()
  }

  const saveSceneAudio = async (
    sceneIdx: number,
    audioType: 'sfx' | 'music',
    audioUrl: string,
    sfxIdx?: number,
    sfxAttribution?: Record<string, unknown> | null,
    beatContext?: { beatId: string; beatDescription: string },
    musicDuration?: number,
    musicFileDuration?: number
  ) => {
    // CRITICAL FIX: Use atomic server update instead of stale client state
    // The old approach used local `scenes` state which was stale and overwrote server-saved dialogue audio
    
    console.log('[Save Audio] Using atomic server update:', {
      sceneIdx,
      audioType,
      audioUrl: audioUrl.substring(0, 60) + '...',
      sfxIdx,
      projectId
    })
    
    try {
      const atomicAudioUpdate: Record<string, unknown> = {
        sceneIndex: sceneIdx,
        audioType,
        audioUrl,
        sfxIndex: sfxIdx,
      }
      if (audioType === 'sfx' && sfxIdx !== undefined && sfxAttribution !== undefined) {
        atomicAudioUpdate.sfxAttribution = sfxAttribution
      }
      if (audioType === 'sfx' && beatContext?.beatId) {
        atomicAudioUpdate.beatId = beatContext.beatId
        atomicAudioUpdate.beatDescription = beatContext.beatDescription
      }
      if (audioType === 'music' && typeof musicDuration === 'number' && musicDuration > 0) {
        atomicAudioUpdate.musicDuration = musicDuration
      }
      if (audioType === 'music' && typeof musicFileDuration === 'number' && musicFileDuration > 0) {
        atomicAudioUpdate.musicFileDuration = musicFileDuration
      }

      // Make atomic update to database via PATCH endpoint
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atomicAudioUpdate })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save audio atomically')
      }
      
      console.log('[Save Audio] Atomic update successful, now fetching fresh state from server')
      
      // Fetch fresh project data from server to get updated scenes with all audio
      const projectResponse = await fetch(`/api/projects/${projectId}`)
      if (projectResponse.ok) {
        const projectData = await projectResponse.json()
        const freshScript = projectData.project?.metadata?.visionPhase?.script
        
        if (freshScript) {
          console.log('[Save Audio] Got fresh script from server, updating local state')
          // Update parent state with fresh data from server (includes all saved audio)
          onScriptChange(freshScript)
        }
      }
      
      console.log('[Save Audio] State synced with server:', {
        sceneIdx,
        audioType,
        audioUrl: audioUrl.substring(0, 60) + '...'
      })
    } catch (error: any) {
      console.error('[Save Audio] Atomic update failed:', error)
      toast.error(`Failed to save audio: ${error.message}`)
    }
  }

  const playAllScenes = async () => {
    playbackAbortRef.current = false
    setIsPlayingAll(true)
    
    for (let i = 0; i < scenes.length; i++) {
      if (playbackAbortRef.current) break
      await playScene(i)
      await new Promise(resolve => setTimeout(resolve, 1000))  // 1s gap between scenes
    }
    
    setIsPlayingAll(false)
  }

  const stopAllAudio = () => {
    playbackAbortRef.current = true
    stopAudio()
    setIsPlayingAll(false)
    setIsPlayingMixed(false)
  }

  // Parse action text for inline SFX and Music
  const parseScriptForAudio = (action: string) => {
    if (!action) return []
    const lines = action.split('\n')
    const parsed: Array<{type: 'text' | 'sfx' | 'music', content: string}> = []
    
    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed.startsWith('SFX:')) {
        parsed.push({ type: 'sfx', content: trimmed.replace('SFX:', '').trim() })
      } else if (trimmed.startsWith('Music:')) {
        parsed.push({ type: 'music', content: trimmed.replace('Music:', '').trim() })
      } else if (trimmed) {
        parsed.push({ type: 'text', content: line })
      }
    })
    
    return parsed
  }

  // Quick play SFX (generate via ElevenLabs and play immediately).
  // This does NOT persist the URL to the scene; it is a transient preview.
  const generateAndPlaySFX = async (description: string) => {
    if (!description?.trim()) {
      toast.info('Add a description for this SFX before previewing.')
      return
    }
    if (!projectId) {
      toast.error('Project context is missing for SFX preview.')
      return
    }
    const toastId = toast.loading('Generating SFX preview...')
    try {
      const response = await fetch('/api/tts/elevenlabs/sound-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          text: description,
          durationSeconds: resolveSfxDuration({ override: 'auto' }),
        }),
      })
      if (!response.ok) {
        let payload: any = null
        try {
          payload = await response.json()
        } catch {
          payload = null
        }
        if (response.status === 402) {
          const need = payload?.creditsRequired
          const have = payload?.creditsAvailable
          toast.error(
            `Insufficient credits for SFX preview${
              typeof need === 'number' ? `. Need ${need} credits` : ''
            }${typeof have === 'number' ? ` (available: ${have})` : ''}.`,
            { id: toastId }
          )
          return
        }
        throw new Error(payload?.error || `SFX preview failed (HTTP ${response.status})`)
      }
      const data = await response.json()
      const url: string | undefined = data?.url
      if (!url) {
        throw new Error('SFX response missing audio URL')
      }
      const audio = new Audio(url)
      orphanAudioRefs.current.add(audio)
      audio.onended = () => orphanAudioRefs.current.delete(audio)
      audio.onerror = () => orphanAudioRefs.current.delete(audio)
      await audio.play()
      toast.success('SFX preview ready.', { id: toastId })
    } catch (error: any) {
      console.error('[SFX Preview] Error:', error)
      toast.error(`Failed to preview SFX: ${error?.message || 'Unknown error'}`, { id: toastId })
    }
  }

  // Quick play Music (generate and play immediately)
  const generateAndPlayMusic = async (description: string, duration: number = 30) => {
    try {
      const { generateMusicTrack } = await import('@/lib/audio/musicClient')
      const data = await generateMusicTrack({
        text: description,
        duration,
        saveToBlob: true,
        projectId: projectId || 'temp',
        sceneId: 'temp',
      })
      const audioUrl = data.url
      const audio = new Audio(audioUrl)
      
      // Track the audio object for cleanup (prevents ghost audio)
      orphanAudioRefs.current.add(audio)
      
      audio.onended = () => {
        orphanAudioRefs.current.delete(audio)
        URL.revokeObjectURL(audioUrl)  // Free memory
      }
      audio.onerror = () => {
        orphanAudioRefs.current.delete(audio)
        URL.revokeObjectURL(audioUrl)
      }
      
      audio.play()
    } catch (error: unknown) {
      console.error('[Music Playback] Error:', error)
      const { LyriaRecitationError } = await import('@/lib/audio/musicClient')
      const message =
        error instanceof LyriaRecitationError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Music generation failed'
      if (error instanceof LyriaRecitationError) {
        toast.error(message)
      } else {
        alert(`Failed to play music: ${message}`)
      }
    }
  }

  const handleGenerateImage = async (sceneIdx: number) => {
    if (!onGenerateSceneImage) return
    setGeneratingImageForScene(sceneIdx)
    
    try {
      // Pass undefined for selectedCharacters - the API will extract from scene
      await onGenerateSceneImage(sceneIdx, undefined)
    } finally {
      setGeneratingImageForScene(null)
    }
  }

  // Individual audio playback handlers
  const handlePlayAudio = (audioUrl: string, label: string, sceneId?: string) => {
    if (playingAudio === audioUrl) {
      individualAudioRef.current?.pause()
      setPlayingAudio(null)
      playingAudioContextRef.current = null
    } else {
      if (individualAudioRef.current) {
        individualAudioRef.current.src = audioUrl
        individualAudioRef.current.play().catch((error) => {
          console.error('[ScriptPanel] Audio playback failed:', error, audioUrl)
          setPlayingAudio(null)
          playingAudioContextRef.current = null
          toast.error(`Audio not found. Try regenerating the ${label} audio.`)
        })
        setPlayingAudio(audioUrl)
        playingAudioContextRef.current = sceneId ? { url: audioUrl, sceneId } : null
      }
    }
  }

  // NOTE: Mute functionality removed due to minification TDZ bug
  // TODO: Re-add after refactoring ScriptPanel into smaller sub-components

  // Export dialogue for translation - generates numbered format for external translation tools
  const handleExportDialogue = useCallback(() => {
    if (!scenes || scenes.length === 0) {
      toast.error('No scenes to export')
      return
    }
    
    let lineNumber = 1
    const exportLines: string[] = []
    
    scenes.forEach((scene, sceneIdx) => {
      exportLines.push(`=== Scene ${sceneIdx + 1} ===`)
      
      // Add narration
      if (scene.narration) {
        exportLines.push(`[${lineNumber}] NARRATION: ${scene.narration}`)
        lineNumber++
      }
      
      // Add dialogue
      if (scene.dialogue && Array.isArray(scene.dialogue)) {
        scene.dialogue.forEach((d: any) => {
          const charName = (d.character || 'CHARACTER').toUpperCase().replace(/\s+/g, '_')
          exportLines.push(`[${lineNumber}] ${charName}: ${d.line}`)
          lineNumber++
        })
      }
      
      exportLines.push('') // Empty line between scenes
    })
    
    const exportText = exportLines.join('\n')
    navigator.clipboard.writeText(exportText)
    toast.success(`Copied ${lineNumber - 1} lines for ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage} translation`)
  }, [scenes, selectedLanguage])
  
  // Import translated dialogue - parses numbered format and stores translations
  const handleImportDialogue = useCallback(async () => {
    if (!importText.trim()) {
      toast.error('Please paste translated text first')
      return
    }
    
    if (selectedLanguage === 'en') {
      toast.error('Please select a non-English language first')
      return
    }
    
    // Build expected line types from original scenes (position-based matching)
    const expectedTypes = new Map<number, 'narration' | 'dialogue'>()
    let lineNumber = 1
    scenes.forEach((scene) => {
      if (scene.narration) {
        expectedTypes.set(lineNumber, 'narration')
        lineNumber++
      }
      if (scene.dialogue && Array.isArray(scene.dialogue)) {
        scene.dialogue.forEach(() => {
          expectedTypes.set(lineNumber, 'dialogue')
          lineNumber++
        })
      }
    })
    
    // Parse using relaxed regex that accepts translated labels
    const linePattern = /\[(\d+)\]\s*[^:]+:\s*(.+)/g
    const translatedLines = new Map<number, string>()
    
    let match
    while ((match = linePattern.exec(importText)) !== null) {
      const lineNum = parseInt(match[1], 10)
      const text = match[2].trim()
      translatedLines.set(lineNum, text)
    }
    
    if (translatedLines.size === 0) {
      toast.error('No translations found. Make sure the format is: [1] LABEL: translated text')
      return
    }
    
    // Build translations object per scene
    const sceneTranslations: { [sceneIndex: number]: SceneTranslation } = {}
    
    lineNumber = 1
    scenes.forEach((scene, sceneIdx) => {
      const sceneTranslation: SceneTranslation = {}
      
      // Match narration by position
      if (scene.narration) {
        const translatedText = translatedLines.get(lineNumber)
        if (translatedText) {
          sceneTranslation.narration = translatedText
        }
        lineNumber++
      }
      
      // Match dialogue by position
      if (scene.dialogue && Array.isArray(scene.dialogue)) {
        sceneTranslation.dialogue = []
        scene.dialogue.forEach(() => {
          const translatedText = translatedLines.get(lineNumber)
          if (translatedText) {
            sceneTranslation.dialogue!.push(translatedText)
          } else {
            sceneTranslation.dialogue!.push('') // Placeholder for missing translations
          }
          lineNumber++
        })
      }
      
      if (sceneTranslation.narration || (sceneTranslation.dialogue && sceneTranslation.dialogue.length > 0)) {
        sceneTranslations[sceneIdx] = sceneTranslation
      }
    })
    
    // Save translations to project
    if (onSaveTranslations) {
      try {
        await onSaveTranslations(selectedLanguage, sceneTranslations)
        toast.success(`Imported ${translatedLines.size} translations for ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage}`)
        setTranslationImportOpen(false)
        setImportText('')
      } catch (error) {
        console.error('[ScriptPanel] Failed to save translations:', error)
        toast.error('Failed to save translations')
      }
    } else {
      toast.error('Translation storage not configured')
    }
  }, [importText, selectedLanguage, scenes, onSaveTranslations])

  const handleOpenSceneBuilder = (sceneIdx: number) => {
    setSceneBuilderIdx(sceneIdx)
    setSceneBuilderOpen(true)
  }

  const handleOpenSceneDrawer = (sceneIdx: number) => {
    setSceneDrawerIdx(sceneIdx)
    setSceneDrawerOpen(true)
  }

  const handleApplyScenePrompt = (prompt: string) => {
    if (sceneBuilderIdx !== null) {
      setScenePrompts(prev => ({ ...prev, [sceneBuilderIdx]: prompt }))
    }
    setSceneBuilderOpen(false)
    setSceneBuilderIdx(null)
  }

  const exportScenes = useMemo(() => {
    return scenes.map((scene: any, index: number) => {
      const dialogueCandidates = (Array.isArray(scene?.dialogueAudio?.en)
        ? scene.dialogueAudio.en
        : Array.isArray(scene?.dialogueAudio)
          ? scene.dialogueAudio
          : []).filter(Boolean)

      const dialogue = dialogueCandidates
        .filter((entry: any) => entry?.audioUrl)
        .map((entry: any) => ({
          url: entry.audioUrl,
          startTime: Number(entry.startTime ?? 0),
          duration: entry.duration != null ? Number(entry.duration) : undefined
        }))

      const sfxCandidates = Array.isArray(scene?.sfxAudio) ? scene.sfxAudio : []
      const sfx = sfxCandidates
        .map((url: string, sfxIndex: number) => {
          if (!url) return null
          const meta = scene?.sfx?.[sfxIndex] || {}
          return {
            url,
            startTime: Number(meta.time ?? 0),
            duration: meta.duration != null ? Number(meta.duration) : undefined
          }
        })
        .filter(Boolean) as Array<{ url: string; startTime: number; duration?: number }>

      const intensity = (scene?.kenBurnsIntensity as 'subtle' | 'medium' | 'dramatic') || 'medium'

      return {
        id: scene?.id || `scene-${index + 1}`,
        number: index + 1,
        imagePath: scene?.imageUrl || '/images/placeholders/placeholder.svg',
        duration: Math.max(0.5, Number(scene?.duration) || 5),
        audio: {
          narration: scene?.narrationAudio?.en?.url || scene?.narrationAudioUrl || undefined,
          dialogue: dialogue.length > 0 ? dialogue : undefined,
          sfx: sfx.length > 0 ? sfx : undefined,
          music: scene?.musicAudio || scene?.music?.url || undefined
        },
        kenBurnsIntensity: intensity
      }
    })
  }, [scenes])

  // NEW: Handle keyframe upload
  const handleUploadKeyframe = async (sceneIdx: number, file: File) => {
    if (!projectId) {
      toast.error('Project ID missing')
      return
    }
    
    const toastId = toast.loading('Uploading frame...')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('sceneNumber', (sceneIdx + 1).toString())

      const res = await fetch('/api/scene/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')

      const data = await res.json()
      
      // Update local script state
      let updatedScript = Array.isArray(script) ? [...script] : { ...script }
      const currentScenes = normalizeScenes(script)
      
      const updatedScenes = currentScenes.map((s: any, idx: number) => 
        idx === sceneIdx 
          ? { ...s, imageUrl: data.imageUrl } 
          : s
      )

      if (Array.isArray(script)) {
        updatedScript = updatedScenes
      } else if (script.script && Array.isArray(script.script.scenes)) {
        updatedScript.script.scenes = updatedScenes
      } else if (script.scenes && Array.isArray(script.scenes)) {
        updatedScript.scenes = updatedScenes
      }
      
      onScriptChange(updatedScript)
      
      toast.success('Frame uploaded successfully', { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error('Failed to upload frame', { id: toastId })
    }
  }

  // Handle segment frame upload (for Start/End frames in Frame step)
  const handleUploadFrame = (sceneId: string, segmentId: string, frameType: 'start' | 'end', file: File) => {
    if (onUploadFrame) {
      onUploadFrame(sceneId, segmentId, frameType, file)
    }
  }

  return (
    <>
    <div className="relative rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/60 flex-1 min-h-0 flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(8,8,20,0.55)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sf-primary via-fuchsia-500 to-cyan-400 opacity-80" />
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex-shrink-0 bg-slate-900/70 backdrop-blur rounded-t-3xl">
        {/* Title and Action Buttons - Same Line */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white">Production Studio</h3>
            {isGenerating && (
              <span className="text-xs text-cyan-300 flex items-center gap-1.5">
                <Loader className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </span>
            )}
          </div>
          
          {/* Action Buttons - Right Justified */}
          <div className="flex items-center gap-2">
            {onOpenReferences && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenReferences}
                className="flex items-center gap-2 border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/10"
                title="Open Reference Library — cast, locations, and props"
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span className="text-sm hidden sm:inline">Reference</span>
              </Button>
            )}

            {onShowReviews && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (audienceScore == null && onGenerateReviews) {
                    onGenerateReviews()
                  } else {
                    onShowReviews()
                  }
                }}
                disabled={isGeneratingReviews}
                className="flex items-center gap-2 border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10"
                title={
                  audienceScore == null
                    ? 'Analyze audience resonance for your script'
                    : 'Audience resonance analysis and script insights'
                }
              >
                {isGeneratingReviews ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                ) : (
                  <Target className="w-4 h-4 text-purple-400" />
                )}
                <span className="text-sm hidden sm:inline">Audience</span>
                {audienceScore != null && !isGeneratingReviews && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold tabular-nums">
                    {audienceScore}
                  </span>
                )}
              </Button>
            )}

            {productionProgressSlot && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProductionProgress((prev) => !prev)}
                className={`h-8 w-8 p-0 ${
                  showProductionProgress
                    ? 'border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20'
                    : 'border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/10'
                }`}
                title={showProductionProgress ? 'Close Production Progress panel' : 'Toggle Production Progress panel'}
                aria-label={showProductionProgress ? 'Close Production Progress panel' : 'Toggle Production Progress panel'}
              >
                <BarChart3 className="w-4 h-4 text-cyan-400" />
              </Button>
            )}

            {/* Budget Calculator Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCostCalculatorOpen(true)}
              className="h-8 w-8 p-0 border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/10"
              title="Open budget calculator to estimate costs"
              aria-label="Open budget calculator"
            >
              <Calculator className="w-4 h-4 text-cyan-400" />
            </Button>

            {/* Resume (Go to Bookmark) Button */}
            {bookmarkedScene && onJumpToBookmark && (
              <Button
                variant="outline"
                size="sm"
                onClick={onJumpToBookmark}
                className="flex items-center gap-2 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/10"
                title={`Resume at Scene ${bookmarkedScene.sceneNumber || ''}`}
              >
                <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm hidden sm:inline">Resume</span>
              </Button>
            )}

            {/* Review Treatment Button */}
            {onShowTreatmentReview && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShowTreatmentReview}
                className="h-8 w-8 p-0 border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10"
                title="Review film treatment for script alignment"
                aria-label="Review film treatment"
              >
                <FileCheck className="w-4 h-4 text-purple-400" />
              </Button>
            )}

            {onRefactorFoundation && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefactorFoundation}
                className="h-8 w-8 p-0 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/10"
                title="Change art style or aspect ratio in Blueprint"
                aria-label="Refactor foundation in Blueprint"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
              </Button>
            )}

            {/* Translation indicator badge - shown when non-English translations exist */}
            {storedTranslations && Object.keys(storedTranslations).filter(k => k !== 'en' && Object.keys(storedTranslations[k] || {}).length > 0).length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs text-blue-300">
                        {Object.keys(storedTranslations).filter(k => k !== 'en' && Object.keys(storedTranslations[k] || {}).length > 0).length} lang
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Translations available — select language in Generate Audio dialog</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}


            {/* Translation & Script Tools overflow menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-700">
                <DropdownMenuLabel className="text-gray-400">Translation Tools</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={handleExportDialogue}
                  className="text-gray-200 hover:bg-gray-800 cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Script for Translation
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTranslationImportOpen(true)}
                  className="text-gray-200 hover:bg-gray-800 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Translation
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuLabel className="text-gray-400">Script</DropdownMenuLabel>
                {onRegenerateScript && (
                  <DropdownMenuItem
                    onClick={() => onRegenerateScript?.()}
                    className="text-gray-200 hover:bg-gray-800 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Script to Original
                  </DropdownMenuItem>
                )}
                {script && projectId && onModerationReport && (
                  <div className="px-2 py-1.5">
                    <ModerationValidateButton
                      projectId={projectId}
                      stage="script"
                      source="project_script"
                      label="Validate script"
                      className="w-full justify-start"
                      onReport={onModerationReport}
                    />
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Background generation progress indicator */}
        {dialogGenerationMode === 'background' && isDialogGenerating && backgroundProgressPercent !== null && (
          <div className="flex items-center gap-1 text-xs text-blue-400 mt-2">
            <Loader className="w-3 h-3 animate-spin" />
            <span>BG {backgroundProgressPercent}%</span>
          </div>
        )}
        
        {/* Project Title & Logline */}
        {(projectTitle || projectLogline) && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-white/90 truncate">
                  {projectTitle}
                </h2>
                {seriesInfo && (
                  <p className="text-xs text-purple-400 mt-0.5 truncate">
                    {seriesInfo.seriesTitle} • Episode {seriesInfo.episodeNumber}
                  </p>
                )}
              </div>
              {projectDuration && (
                <span className="text-xs font-medium text-gray-400 bg-slate-800 px-2 py-0.5 rounded flex-shrink-0">
                  {projectDuration}
                </span>
              )}
            </div>
            {projectLogline && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                {projectLogline}
              </p>
            )}
          </div>
        )}

      </div>
      
      {/* Script Content - scrollable area containing storyboard and scenes */}
      <div
        data-vision-scroll-panel
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-slate-950/20"
      >
        {showProductionProgress && productionProgressSlot ? (
          <div className="px-6 pt-4 shrink-0">
            {productionProgressSlot}
          </div>
        ) : null}

        {/* Optional storyboard slot - now inside scrollable area */}
        {belowDashboardSlot && showStoryboard ? (
          <div className="px-6 pt-6">
            {belowDashboardSlot({ 
              openGenerateAudio: () => setGenerateAudioDialogOpen(true),
              openPromptBuilder: handleOpenSceneBuilder
            })}
          </div>
        ) : null}
        
        {!script || isGenerating ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            {isGenerating ? (
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-sf-primary" />
                <p>Generating script...</p>
              </div>
            ) : (
              <p>No script generated yet</p>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Scenes List (inside Production Plan container) */}
            {/* Scenes */}
            {scenes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                  No script scenes available
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">
                  The script may need to be regenerated
                </p>
                {onRegenerateScript && (
                  <Button
                    onClick={onRegenerateScript}
                    disabled={isRegeneratingScript || isGenerating}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    {isRegeneratingScript ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Regenerating Script...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate Script
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayedScenes.map((item) => item.originalIndex)}
                  strategy={verticalListSortingStrategy}
                >
                          {displayedScenes.map(({ scene, originalIndex: idx }) => {
                            const timelineStart = scenes.slice(0, idx).reduce((total: number, s: any) => total + calculateSceneDuration(s), 0)
                            const domId = getSceneDomId(scene, idx)
                    return (
                    <SortableSceneCard
                  key={idx}
                      id={idx}
                  scene={scene}
                  sceneNumber={idx + 1}
                  isSelected={selectedScene === idx}
                  onClick={() => setSelectedScene(idx)}
                  onExpand={onExpandScene}
                  isExpanding={expandingScenes.has(scene.sceneNumber)}
                  onPlayScene={playScene}
                  isPlaying={loadingSceneId === idx}
                  audioEnabled={enabled}
                  sceneIdx={idx}
                      timelineStart={timelineStart}
                  onGenerateImage={handleGenerateImage}
                  isGeneratingImage={generatingImageForScene === idx}
                  onOpenPromptBuilder={handleOpenSceneBuilder}
                  onOpenPromptDrawer={handleOpenSceneDrawer}
                  scenePrompt={scenePrompts[idx]}
                      onPromptChange={(sceneIdx: number, prompt: string) => setScenePrompts(prev => ({ ...prev, [sceneIdx]: prompt }))}
                  validationWarning={validationWarnings[idx]}
                  validationInfo={validationInfo[idx]}
                  isWarningExpanded={warningExpanded[idx] || false}
                  onToggleWarningExpanded={() => toggleWarningExpanded(idx)}
                  onDismissValidationWarning={() => onDismissValidationWarning?.(idx)}
                  parseScriptForAudio={parseScriptForAudio}
                  generateAndPlaySFX={generateAndPlaySFX}
                  generateAndPlayMusic={generateAndPlayMusic}
                  onPlayAudio={handlePlayAudio}
                  onGenerateSceneAudio={onGenerateSceneAudio}
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={setSelectedLanguage}
                  playingAudio={playingAudio}
                      generatingDialogue={generatingDialogue}
                      setGeneratingDialogue={setGeneratingDialogue}
                      onAddScene={onAddScene}
                      onDeleteScene={onDeleteScene}
                      onEditScene={onEditScene}
                      onUpdateSceneAudio={onUpdateSceneAudio}
                      onDeleteSceneAudio={onDeleteSceneAudio}
                      onEnhanceSceneContext={onEnhanceSceneContext}
                      onGenerateSceneScore={onGenerateSceneScore}
                      generatingScoreFor={generatingScoreFor}
                      getScoreColorClass={getScoreColorClass}
                      onStopAudio={stopAudio}
                      onOpenSceneReview={(sceneIdx: number) => {
                        setSelectedSceneForReview(sceneIdx)
                        setShowSceneReviewModal(true)
                      }}
                      generatingMusic={generatingMusic}
                      setGeneratingMusic={setGeneratingMusic}
                      generateMusic={generateMusic}
                      uploadAudio={uploadAudio}
                      onSaveSfxAudio={saveSceneAudio}
                      generatingDirectionFor={generatingDirectionFor}
                      sceneProductionData={sceneProductionData[scene.sceneId || scene.id || `scene-${idx}`] || undefined}
                      sceneProductionReferences={sceneProductionReferences[scene.sceneId || scene.id || `scene-${idx}`] || undefined}
                      onInitializeSceneProduction={onInitializeSceneProduction}
                      onSegmentPromptChange={onSegmentPromptChange}
                      onSegmentKeyframeChange={onSegmentKeyframeChange}
                      onSegmentDialogueAssignmentChange={onSegmentDialogueAssignmentChange}
                      onSegmentGenerate={onSegmentGenerate}
                      onSegmentUpload={onSegmentUpload}
                      onSegmentAnimaticSettingsChange={onSegmentAnimaticSettingsChange}
                      onRenderedSceneUrlChange={onRenderedSceneUrlChange}
                      onProductionDataChange={onProductionDataChange}
                      onResetSegments={onResetSegments}
                      onGenerateAllAudio={onGenerateAllAudio}
                      isGeneratingAudio={isGeneratingAudio}
                      onAddSegment={onAddSegment}
                      onAddFullSegment={onAddFullSegment}
                      onDeleteSegment={onDeleteSegment}
                      onSegmentResize={onSegmentResize}
                      onReorderSegments={onReorderSegments}
                      onAudioClipChange={onAudioClipChange}
                      onAddEstablishingShot={onAddEstablishingShot}
                      onEstablishingShotStyleChange={onEstablishingShotStyleChange}
                      onBackdropVideoGenerated={onBackdropVideoGenerated}
                      onGenerateEndFrame={onGenerateEndFrame}
                      onEndFrameGenerated={onEndFrameGenerated}
                      characters={characters}
                      onSelectTake={onSelectTake}
                      onDeleteTake={onDeleteTake}
                      sceneAudioTracks={sceneAudioTracks[scene.sceneId || scene.id || `scene-${idx}`]}
                      domId={domId}
                      isBookmarked={bookmarkedSceneIndex === idx}
                      onBookmarkToggle={() => handleBookmarkToggle(idx)}
                      bookmarkSaving={bookmarkSavingSceneIdx === idx}
                      overlayStore={overlayStore}
                      projectId={projectId}
                      onUploadKeyframe={handleUploadKeyframe}
                      onAddToReferenceLibrary={onAddToReferenceLibrary}
                      onEditImage={(url: string, sceneIdx: number) => {
                        setEditingImageData({ url, sceneIdx });
                        setImageEditModalOpen(true);
                      }}
                      onOpenFrameEditModal={(sceneIdx: number, sceneId: string, segmentId: string, frameType: 'start' | 'end', frameUrl: string) => {
                        setEditingImageData({ url: frameUrl, sceneIdx, sceneId, segmentId, frameType });
                        setImageEditModalOpen(true);
                      }}
                      onUploadFrame={handleUploadFrame}
                      isWorkflowOpen={true}
                      onWorkflowOpenChange={() => {
                        // Single scene view - workflow always open, navigation via timeline
                      }}
                      totalScenes={scenes.length}
                      onNavigateScene={(newIdx: number) => {
                        // Navigate to scene via parent handler
                        if (onSelectSceneIndex) {
                          onSelectSceneIndex(newIdx)
                        }
                      }}
                      onMarkWorkflowComplete={onMarkWorkflowComplete}
                      onDismissStaleWarning={onDismissStaleWarning}
                      onSyncPreVisToScript={onSyncPreVisToScript}
                      onGenerateSegmentFrames={onGenerateSegmentFrames}
                      onEditFrame={onEditFrame}
                      generatingFrameForSegment={generatingFrameForSegment}
                      generatingFramePhase={generatingFramePhase}
                      bookmarkedSceneIndex={bookmarkedSceneIndex}
                      sceneNavigationCollapsed={sceneNavigationCollapsed}
                      setSceneNavigationCollapsed={setSceneNavigationCollapsed}
                      audioTimelineCollapsed={audioTimelineCollapsed}
                      setAudioTimelineCollapsed={setAudioTimelineCollapsed}
                      scenes={scenes}
                      script={script}
                      onScriptChange={onScriptChange}
                      setEditingImageData={setEditingImageData}
                      setImageEditModalOpen={setImageEditModalOpen}
                      sceneReferences={sceneReferences}
                      objectReferences={objectReferences}
                      locationReferences={locationReferences}
                      getPlaybackOffsetForScene={getPlaybackOffsetForScene}
                      handlePlaybackOffsetChange={handlePlaybackOffsetChange}
                      getSuggestedOffsetForScene={getSuggestedOffsetForScene}
                      expandedRecommendations={expandedRecommendations}
                      setExpandedRecommendations={setExpandedRecommendations}
                      onAnalyzeScene={onAnalyzeScene}
                      analyzingSceneIndex={analyzingSceneIndex}
                      onOptimizeScene={onOptimizeScene}
                      optimizingSceneIndex={optimizingSceneIndex}
                      setOptimizeDialogScene={setOptimizeDialogScene}
                      setOptimizeDialogOpen={setOptimizeDialogOpen}
                      productionReadiness={productionReadiness}
                      onModerationReport={onModerationReport}
                      onResyncAudioTiming={onResyncAudioTiming}
                      resyncingAudioSceneIndex={resyncingAudioSceneIndex}
                      projectTitle={projectTitle}
                      projectLogline={projectLogline}
                      visualStyle={visualStyle}
                      projectAspectRatio={projectAspectRatio}
                      onApproveStoryboard={onApproveStoryboard}
                      approvingStoryboardFor={approvingStoryboardFor}
                      onGenerateBeatFrame={onGenerateBeatFrame}
                      onGenerateBeatEndFrame={onGenerateBeatEndFrame}
                      onGenerateDialogueFrame={onGenerateDialogueFrame}
                      onUploadBeatFrame={onUploadBeatFrame}
                      onUploadDialogueFrame={onUploadDialogueFrame}
                      onSaveEditedBeatFrame={onSaveEditedBeatFrame}
                      onSaveEditedDialogueFrame={onSaveEditedDialogueFrame}
                      onSaveEditedCustomFrame={onSaveEditedCustomFrame}
                      onSaveEditedStoryboardScene={onSaveEditedStoryboardScene}
                      onDirectFrame={onDirectFrame}
                      onAddStoryboardFrame={onAddStoryboardFrame}
                      onDeleteStoryboardFrame={onDeleteStoryboardFrame}
                      onGenerateCustomFrame={onGenerateCustomFrame}
                      onUploadCustomFrame={onUploadCustomFrame}
                      onUploadStoryboardScene={onUploadStoryboardScene}
                      onExpressSceneGenerate={onExpressSceneGenerate}
                      onFinalizeStoryboardScene={onFinalizeStoryboardScene}
                      expressStatus={expressStatus}
                      expressGateBlocked={expressGateBlocked}
                      onExpressGateBlocked={onExpressGateBlocked}
                      isExpressRunning={isExpressRunning}
                      narrationVoice={narrationVoice}
                    />
                    )
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
      </div>

      {/* Scene Review Modal */}
      {showSceneReviewModal && selectedSceneForReview !== null && (
        <SceneReviewModal
          isOpen={showSceneReviewModal}
          onClose={() => {
            setShowSceneReviewModal(false)
            setSelectedSceneForReview(null)
          }}
          sceneNumber={selectedSceneForReview + 1}
          sceneReview={transformScoreToReview(scenes[selectedSceneForReview]?.scoreAnalysis) || null}
          onRegenerate={() => {
            if (onGenerateSceneScore) {
              onGenerateSceneScore(selectedSceneForReview)
            }
          }}
          isGenerating={generatingScoreFor === selectedSceneForReview}
        />
      )}

      {/* Image Edit Modal */}
      {editingImageData && (
        <ImageEditModal
          open={imageEditModalOpen}
          onOpenChange={(open) => {
            setImageEditModalOpen(open)
            if (!open) setEditingImageData(null)
          }}
          imageUrl={editingImageData.url}
          imageType="scene"
          aspectRatio={projectAspectRatio}
          title={editingImageData.segmentId 
            ? `Edit ${editingImageData.frameType === 'start' ? 'Start' : 'End'} Frame`
            : undefined
          }
          objectReferences={
            editingImageData.segmentId
              ? objectReferences
                  ?.filter((ref) => ref.imageUrl)
                  .map((ref) => ({
                    id: ref.id,
                    name: ref.name,
                    imageUrl: ref.imageUrl!,
                    description: ref.description,
                  }))
              : undefined
          }
          subjectReference={(() => {
            if (!editingImageData.segmentId || editingImageData.sceneIdx === undefined) {
              return undefined
            }
            const scene = scenes[editingImageData.sceneIdx]
            if (!scene) return undefined
            const sceneId =
              scene.sceneId || scene.id || `scene-${editingImageData.sceneIdx}`
            const prod = sceneProductionData[sceneId]
            const segment = prod?.segments?.find(
              (s) => s.segmentId === editingImageData.segmentId
            )
            const firstLine = segment?.dialogueLines?.find((d) => d.covered !== false)
            const charName = firstLine?.character
            if (!charName) return undefined
            const char = characters.find((c) => c.name === charName)
            const refUrl = (char as { referenceImage?: string; referenceUrl?: string })
              ?.referenceImage || (char as { referenceUrl?: string })?.referenceUrl
            if (!refUrl) return undefined
            return {
              imageUrl: refUrl,
              description:
                (char as { appearanceDescription?: string; description?: string })
                  ?.appearanceDescription ||
                (char as { description?: string })?.description ||
                charName,
            }
          })()}
          onSave={(newImageUrl) => {
            // Check if this is a frame edit or scene image edit
            if (editingImageData.segmentId && editingImageData.sceneId && editingImageData.frameType) {
              // Frame edit - call onEditFrame callback which persists to production data
              onEditFrame?.(
                editingImageData.sceneId,
                editingImageData.segmentId,
                editingImageData.frameType,
                newImageUrl
              )
            } else {
              // Scene image edit - update scene directly
              const updatedScenes = [...scenes]
              updatedScenes[editingImageData.sceneIdx] = {
                ...updatedScenes[editingImageData.sceneIdx],
                imageUrl: newImageUrl
              }
              onScriptChange({
                ...script,
                script: {
                  ...script.script,
                  scenes: updatedScenes
                }
              })
            }
            setImageEditModalOpen(false)
            setEditingImageData(null)
          }}
        />
      )}

      {/* Optimize Scene Dialogue - For per-scene audience analysis optimization */}
      {optimizeDialogScene && (
        <OptimizeSceneDialog
          isOpen={optimizeDialogOpen}
          onClose={() => {
            setOptimizeDialogOpen(false)
            setOptimizeDialogScene(null)
          }}
          sceneNumber={optimizeDialogScene.sceneNumber}
          sceneHeading={optimizeDialogScene.sceneHeading}
          sceneAnalysis={optimizeDialogScene.audienceAnalysis}
          isOptimizing={isLocalOptimizing || optimizingSceneIndex === optimizeDialogScene.sceneIndex}
          onOptimize={async (instruction, selectedRecommendations) => {
            if (!onOptimizeScene) return
            setIsLocalOptimizing(true)
            try {
              await onOptimizeScene(optimizeDialogScene.sceneIndex, instruction, selectedRecommendations)
              // Close dialog on success
              setOptimizeDialogOpen(false)
              setOptimizeDialogScene(null)
              // Collapse recommendations panel
              setExpandedRecommendations(prev => {
                const newSet = new Set(prev)
                newSet.delete(optimizeDialogScene.sceneIndex)
                return newSet
              })
              toast.success(`Scene ${optimizeDialogScene.sceneNumber} optimized!`)
            } catch (error) {
              console.error('[OptimizeScene] Failed:', error)
              toast.error('Failed to optimize scene')
            } finally {
              setIsLocalOptimizing(false)
            }
          }}
        />
      )}

      {/* Scene Prompt Builder Modal */}
      {sceneBuilderIdx !== null && (
        <ScenePromptBuilder
          projectId={projectId}
          open={sceneBuilderOpen}
          onClose={() => {
            setSceneBuilderOpen(false)
            setSceneBuilderIdx(null)
          }}
          scene={scenes[sceneBuilderIdx]}
          availableCharacters={characters
            .filter(c => c.type !== 'narrator' && c.type !== 'description')
            .map(c => ({
            name: c.name,
            description: c.description,
            referenceImage: c.referenceImage,  // Pass Blob URL for Imagen API
            appearanceDescription: c.appearanceDescription,  // Pass appearance description
            ethnicity: c.ethnicity,
            subject: c.subject,
            type: c.type,  // Pass type for narrator filtering in CharacterSelectionSection
            wardrobes: c.wardrobes  // Pass wardrobes for costume selection in dialog
          }))}
          sceneReferences={sceneReferences}
          objectReferences={objectReferences}
          locationReferences={locationReferences}
          sceneIndex={sceneBuilderIdx}
          onGenerateImage={async (selectedCharacters) => {
            // Start generation (this sets generatingImageForScene)
            if (onGenerateSceneImage) {
              await onGenerateSceneImage(sceneBuilderIdx, selectedCharacters)
            }
            // Close modal after generation completes
            setSceneBuilderOpen(false)
            setSceneBuilderIdx(null)
          }}
          isGenerating={generatingImageForScene === sceneBuilderIdx}
        />
      )}

      {/* Scene Prompt Drawer (New Editor with AI Assist) */}
      {sceneDrawerIdx !== null && projectId && (
        <ScenePromptDrawer
          open={sceneDrawerOpen}
          onClose={() => {
            setSceneDrawerOpen(false)
            setSceneDrawerIdx(null)
          }}
          scene={scenes[sceneDrawerIdx]}
          characters={characters}
          visualStyle={visualStyle || 'Cinematic'}
          projectId={projectId}
          onSceneImageGenerated={(imageUrl, sceneNumber) => {
            // Trigger refresh - the parent component should listen for scene-updated event
            window.dispatchEvent(new CustomEvent('scene-updated', {
              detail: { sceneNumber, imageUrl }
            }))
          }}
        />
      )}
      
      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExportScript={() => setReportPreviewOpen(true)}
        onExportStoryboard={() => setStoryboardPreviewOpen(true)}
        onExportSceneDirection={() => setSceneDirectionPreviewOpen(true)}
      />
      
      {/* Generate Audio Dialog */}
      <GenerateAudioDialog
        open={generateAudioDialogOpen}
        onOpenChange={handleGenerateDialogOpenChange}
        script={script}
        onGenerate={handleGenerateAudioFromDialog}
        characters={characters}
        isGenerating={isDialogGenerating}
        generationProgress={dialogGenerationMode === 'foreground' ? dialogGenerationProgress : null}
        mode={dialogGenerationMode}
        onRunInBackground={isDialogGenerating && dialogGenerationMode === 'foreground' ? handleRunGenerationInBackground : undefined}
      />

      
      {/* Translation Import Modal */}
      <Dialog open={translationImportOpen} onOpenChange={setTranslationImportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-blue-400" />
              Import {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name} Translation
            </DialogTitle>
            <DialogDescription>
              Paste your translated script below. The format should match the exported format:
              <code className="block mt-2 p-2 bg-slate-800 rounded text-xs">
                [1] TRANSLATED_LABEL: translated text
              </code>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 my-4">
            <textarea
              className="w-full h-64 p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Paste translated script here...\n\nExample:\n=== ฉากที่ 1 ===\n[1] คำบรรยาย: ข้อความภาษาไทย...\n[2] ตัวละคร: บทสนทนาภาษาไทย...`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTranslationImportOpen(false)
                setImportText('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportDialogue}
              disabled={!importText.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Translation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Report Preview Modals */}
      {script && (
        <>
          <ReportPreviewModal
            type={ReportType.PROFESSIONAL_SCRIPT}
            data={script as any}
            projectName={script.title || 'Untitled Script'}
            open={reportPreviewOpen}
            onOpenChange={setReportPreviewOpen}
          />
          <ReportPreviewModal
            type={ReportType.STORYBOARD}
            data={{
              title: script.title || 'Untitled Script',
              frames: scenes.flatMap((scene: any, idx: number) =>
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
            projectName={script.title || 'Untitled Script'}
            open={storyboardPreviewOpen}
            onOpenChange={setStoryboardPreviewOpen}
          />
          <ReportPreviewModal
            type={ReportType.SCENE_DIRECTION}
            data={{
              title: script.title || 'Untitled Script',
              scenes: scenes.map((scene: any, idx: number) => ({
                sceneNumber: idx + 1,
                heading: scene.heading,
                visualDescription: scene.visualDescription || scene.action || scene.summary,
                shotType: scene.shotType,
                cameraAngle: scene.cameraAngle,
                lighting: scene.lighting,
                mood: scene.mood,
                duration: scene.duration,
                sceneDirection: scene.sceneDirection
              }))
            } as SceneDirectionData}
            projectName={script.title || 'Untitled Script'}
            open={sceneDirectionPreviewOpen}
            onOpenChange={setSceneDirectionPreviewOpen}
          />
        </>
      )}
      
      {/* Hidden audio player for individual audio files */}
      <audio
        ref={individualAudioRef}
        onEnded={() => setPlayingAudio(null)}
        onError={(e) => {
          // Handle audio loading errors (404s, etc.)
          const target = e.currentTarget
          if (target.src && playingAudio) {
            console.error('[ScriptPanel] Audio load error:', target.src)
            const ctx = playingAudioContextRef.current
            if (ctx && ctx.url === playingAudio && onCleanupStaleAudioUrl) {
              onCleanupStaleAudioUrl(ctx.sceneId, playingAudio)
            }
            setPlayingAudio(null)
            playingAudioContextRef.current = null
            // Don't show toast here - handlePlayAudio.catch will handle it
          }
        }}
        className="hidden"
      />

      {/* Budget Calculator Modal */}
      <Dialog open={costCalculatorOpen} onOpenChange={setCostCalculatorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-sf-primary" />
              Project Cost Calculator - {script?.title || 'Untitled Project'}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Estimate credits needed for your project and set a budget.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ProjectCostCalculator 
              currentTier="starter"
              currentBalance={userCredits?.total_credits ?? 0}
              compact={false}
              projectId={projectId}
              initialParams={undefined}
              onSetBudget={async (budget) => {
                // Save budget to project metadata
                if (!projectId) return
                try {
                  await fetch(`/api/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      metadata: { 
                        ...script?.metadata, 
                        creditsBudget: budget 
                      } 
                    })
                  })
                  setCostCalculatorOpen(false)
                  window.dispatchEvent(new CustomEvent('project-updated'))
                  toast.success('Budget saved successfully')
                } catch (error) {
                  console.error('Failed to set budget:', error)
                  toast.error('Failed to save budget')
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  )
}

interface SceneCardProps {
  scene: any
  sceneNumber: number
  isSelected: boolean
  onClick: () => void
  projectTitle?: string
  projectLogline?: string
  visualStyle?: string
  projectAspectRatio?: BlueprintAspectRatio
  onExpand?: (sceneNumber: number) => Promise<void>
  isExpanding?: boolean
  onPlayScene?: (sceneIdx: number) => Promise<void>
  isPlaying?: boolean
  audioEnabled?: boolean
  sceneIdx: number
  onGenerateImage?: (sceneIdx: number) => Promise<void>
  isGeneratingImage?: boolean
  onOpenPromptBuilder?: (sceneIdx: number) => void
  onOpenPromptDrawer?: (sceneIdx: number) => void
  scenePrompt?: string
  onPromptChange?: (sceneIdx: number, prompt: string) => void
  validationWarning?: string
  validationInfo?: {
    passed: boolean
    confidence: number
    message?: string
    warning?: string
    dismissed?: boolean
  }
  isWarningExpanded?: boolean
  onToggleWarningExpanded?: () => void
  onDismissValidationWarning?: () => void
  // Audio functions - inline play
  parseScriptForAudio?: (action: string) => Array<{type: 'text' | 'sfx' | 'music', content: string}>
  generateAndPlaySFX?: (description: string) => Promise<void>
  generateAndPlayMusic?: (description: string, duration?: number) => Promise<void>
  // Individual audio playback
  onPlayAudio?: (audioUrl: string, label: string, sceneId?: string) => void
  onGenerateSceneAudio?: (sceneIdx: number, audioType: 'narration' | 'dialogue', characterName?: string, dialogueIndex?: number, language?: string) => void
  onGenerateAllAudio?: (
    language?: string,
    options?: {
      includeNarration?: boolean
      includeDialogue?: boolean
      includeMusic?: boolean
      includeSFX?: boolean
    }
  ) => void
  isGeneratingAudio?: boolean
  selectedLanguage?: string
  onLanguageChange?: (lang: string) => void
  playingAudio?: string | null
  generatingDialogue?: {sceneIdx: number, character: string, dialogueIndex?: number} | null
  setGeneratingDialogue?: (state: {sceneIdx: number, character: string, dialogueIndex?: number} | null) => void
  timelineStart?: number
  dragHandleProps?: any
  onAddScene?: (afterIndex?: number) => void
  onDeleteScene?: (sceneIndex: number) => void
  onEditScene?: (sceneIndex: number) => void
  onEditSceneWithRecommendations?: (sceneIndex: number) => void
  onUpdateSceneAudio?: (sceneIndex: number) => Promise<void>
  // NEW: Delete specific audio from scene
  onDeleteSceneAudio?: (sceneIndex: number, audioType: 'description' | 'narration' | 'dialogue' | 'music' | 'sfx', dialogueIndex?: number, sfxIndex?: number, silent?: boolean) => void
  uploadAudio?: (
    sceneIdx: number,
    type: 'description' | 'narration' | 'dialogue' | 'sfx' | 'music',
    sfxIdx?: number,
    dialogueIdx?: number,
    characterName?: string
  ) => void
  // NEW: Enhance scene context with AI-generated beat, character arc, and thematic context
  onEnhanceSceneContext?: (sceneIndex: number) => Promise<void>
  // NEW: Audio start time offset controls
  onUpdateAudioStartTime?: (sceneIndex: number, audioType: 'description' | 'narration' | 'dialogue', startTime: number, dialogueIndex?: number) => void
  // NEW: Scene score generation props
  onGenerateSceneScore?: (sceneIndex: number) => void
  generatingScoreFor?: number | null
  getScoreColorClass?: (score: number) => string
  onStopAudio?: () => void
  // NEW: Scene review modal props
  onOpenSceneReview?: (sceneIdx: number) => void
  // NEW: Music and SFX generation props
  generatingMusic?: number | null
  setGeneratingMusic?: (state: number | null) => void
  // Functions for generating and saving audio
  generateMusic?: (sceneIdx: number, skipOverlay?: boolean, durationSeconds?: number) => Promise<void>
  /** Persist a generated SFX URL through the project PATCH path. */
  onSaveSfxAudio?: (
    sceneIdx: number,
    audioType: 'sfx' | 'music',
    audioUrl: string,
    sfxIdx?: number,
    sfxAttribution?: Record<string, unknown> | null,
    beatContext?: { beatId: string; beatDescription: string }
  ) => Promise<void> | void
  // NEW: Scene direction generation props
  generatingDirectionFor?: number | null
  // NEW: Scene production props
  sceneProductionData?: SceneProductionData | null
  sceneProductionReferences?: SceneProductionReferences
  // Optional slot renderer to place content below Dashboard (e.g., Storyboard header)
  // Provides helper to open the Generate Audio dialog from parent section
  belowDashboardSlot?: (helpers: { openGenerateAudio: () => void }) => React.ReactNode
  onInitializeSceneProduction?: (
    sceneId: string,
    options: { targetDuration: number; segments?: any[]; generationOptions?: Record<string, unknown> }
  ) => Promise<void>
  onSegmentPromptChange?: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentKeyframeChange?: (sceneId: string, segmentId: string, keyframeSettings: SegmentKeyframeSettings) => void
  onSegmentDialogueAssignmentChange?: (sceneId: string, segmentId: string, dialogueLineIds: string[]) => void
  onSegmentGenerate?: (sceneId: string, segmentId: string, mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD', options?: { startFrameUrl?: string; prompt?: string; negativePrompt?: string; duration?: number; aspectRatio?: '16:9' | '9:16'; resolution?: '720p' | '1080p' }) => Promise<void>
  onSegmentUpload?: (sceneId: string, segmentId: string, file: File) => Promise<void>
  /** Update segment animatic settings for Screening Room (duration) */
  onSegmentAnimaticSettingsChange?: (sceneId: string, segmentId: string, settings: { imageDuration?: number }) => void
  /** Persist rendered scene URL to database */
  onRenderedSceneUrlChange?: (sceneId: string, url: string | null) => void
  onProductionDataChange?: (sceneId: string, data: SceneProductionData) => void
  onResetSegments?: (sceneId: string) => void
  onAddSegment?: (sceneId: string, afterSegmentId: string | null, duration: number) => void
  onAddFullSegment?: (sceneId: string, segment: any) => void
  onDeleteSegment?: (sceneId: string, segmentId: string) => void
  onSegmentResize?: (sceneId: string, segmentId: string, changes: { startTime?: number; duration?: number }) => void
  /** Apply intelligent auto-alignment of keyframes to audio anchors */
  onApplyIntelligentAlignment?: (sceneId: string, language?: string) => void
  onReorderSegments?: (sceneId: string, oldIndex: number, newIndex: number) => void
  onAudioClipChange?: (sceneIdOrIndex: string | number, trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => void
  onCleanupStaleAudioUrl?: (sceneId: string, staleUrl: string) => void
  onAddEstablishingShot?: (sceneId: string, style: 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => void
  onEstablishingShotStyleChange?: (sceneId: string, segmentId: string, style: 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => void
  // Backdrop video generation - inserts new segment with video before specified segment
  onBackdropVideoGenerated?: (sceneId: string, beforeSegmentIndex: number, result: {
    videoUrl: string
    prompt: string
    backdropMode: string
    duration: number
  }) => void
  // Frame Anchoring: Generate end frame for improved video quality
  onGenerateEndFrame?: (sceneId: string, segmentId: string, startFrameUrl: string, segmentPrompt: string) => Promise<string | null>
  // Frame Anchoring: Update segment's end frame URL
  onEndFrameGenerated?: (sceneId: string, segmentId: string, endFrameUrl: string) => void
  // Characters for backdrop video modal and wardrobe selection
  characters?: Array<{ 
    id: string
    name: string
    description?: string
    appearance?: string
    wardrobes?: Array<{
      id: string
      name: string
      description: string
      accessories?: string
      previewImageUrl?: string
      isDefault: boolean
      createdAt: string
    }>
  }>
  // Take management
  onSelectTake?: (sceneId: string, segmentId: string, takeId: string, assetUrl: string) => void
  onDeleteTake?: (sceneId: string, segmentId: string, takeId: string) => void
  sceneAudioTracks?: {
    narration?: { url?: string; startTime: number; duration: number }
    dialogue?: Array<{ url?: string; startTime: number; duration: number; character?: string }>
    sfx?: Array<{ url?: string; startTime: number; duration: number; description?: string }>
    music?: { url?: string; startTime: number; duration: number }
  }
  domId?: string
  isBookmarked?: boolean
  onBookmarkToggle?: () => void
  bookmarkSaving?: boolean
  overlayStore?: { show: (message: string, duration: number, category?: string) => void; hide: () => void }
  projectId?: string
  onUploadKeyframe?: (sceneIdx: number, file: File) => Promise<void>
  // Single-scene-open control
  isWorkflowOpen?: boolean
  onWorkflowOpenChange?: (isOpen: boolean) => void
  // Reference library
  onAddToReferenceLibrary?: (imageUrl: string, name: string, sceneNumber: number) => Promise<void>
  // Image editing
  onEditImage?: (url: string, sceneIdx: number) => void
  // Scene navigation
  totalScenes?: number
  onNavigateScene?: (sceneIdx: number) => void
  // Workflow completion overrides
  onMarkWorkflowComplete?: (sceneIdx: number, stepKey: string, isComplete: boolean) => void
  onDismissStaleWarning?: (sceneIdx: number, stepKey: string) => void
  onSyncPreVisToScript?: (sceneIdx: number) => void | Promise<void>
  // Keyframe State Machine - Frame step handlers
  onGenerateSegmentFrames?: (sceneId: string, segmentId: string, frameType: 'start' | 'end' | 'both', options?: { customPrompt?: string; negativePrompt?: string; usePreviousEndFrame?: boolean }) => Promise<{ startFrameUrl?: string; endFrameUrl?: string } | void>
  onEditFrame?: (sceneId: string, segmentId: string, frameType: 'start' | 'end', frameUrl: string) => void
  onOpenFrameEditModal?: (sceneId: string, sceneIdx: number, segmentId: string, frameType: 'start' | 'end', frameUrl: string) => void
  onUploadFrame?: (sceneId: string, segmentId: string, frameType: 'start' | 'end', file: File) => void
  generatingFrameForSegment?: string | null
  generatingFramePhase?: 'start' | 'end' | 'video' | null
  // Bookmark index for scene jump selector
  bookmarkedSceneIndex?: number
  // Collapsible UI state
  sceneNavigationCollapsed?: boolean
  setSceneNavigationCollapsed?: (collapsed: boolean) => void
  audioTimelineCollapsed?: boolean
  setAudioTimelineCollapsed?: (collapsed: boolean) => void
  // Ken Burns toggle and script updates
  scenes?: any[]
  script?: any
  onScriptChange?: (script: any) => void
  // Image edit modal access
  setEditingImageData?: (data: { url: string; sceneIdx: number; segmentId?: string; frameType?: 'start' | 'end'; sceneId?: string } | null) => void
  setImageEditModalOpen?: (open: boolean) => void
  // Visual references for SegmentBuilder
  sceneReferences?: Array<{ id: string; name: string; description?: string; imageUrl?: string }>
  objectReferences?: Array<{ id: string; name: string; description?: string; imageUrl?: string }>
  // Location references for environment consistency in keyframe generation
  locationReferences?: Array<{ id: string; location: string; locationDisplay: string; imageUrl: string; description?: string; sceneNumbers?: number[] }>
  // Language playback offset for translated audio alignment
  getPlaybackOffsetForScene?: (sceneId: string, language: string) => number
  handlePlaybackOffsetChange?: (sceneId: string, sceneIdx: number, language: string, offset: number) => void
  getSuggestedOffsetForScene?: (scene: any) => number | undefined
  // Per-scene audience analysis props
  expandedRecommendations?: Set<number>
  setExpandedRecommendations?: React.Dispatch<React.SetStateAction<Set<number>>>
  onAnalyzeScene?: (sceneIndex: number) => Promise<void>
  analyzingSceneIndex?: number | null
  onOptimizeScene?: (sceneIndex: number, instruction: string, selectedRecommendations: string[]) => Promise<void>
  optimizingSceneIndex?: number | null
  setOptimizeDialogScene?: (scene: any) => void
  setOptimizeDialogOpen?: (open: boolean) => void
  // Audio timing resync - recalculates startTime for all audio clips after edits
  onResyncAudioTiming?: (sceneIndex: number, language: string) => Promise<void>
  resyncingAudioSceneIndex?: number | null
  onApproveStoryboard?: (sceneIndex: number) => void | Promise<void>
  approvingStoryboardFor?: number | null
  // Production readiness for workflow guards (voices assigned, etc.)
  productionReadiness?: ProductionReadiness
  onModerationReport?: (report: import('@/lib/moderation/moderationPipeline').ModerationReport) => void
  onGenerateBeatFrame?: (sceneIdx: number, beatId: string) => Promise<void>
  onGenerateBeatEndFrame?: (sceneIdx: number, beatId: string) => Promise<void>
  onGenerateDialogueFrame?: (sceneIdx: number, dialogueIdx: number) => Promise<void>
  onUploadBeatFrame?: (sceneIdx: number, beatId: string, file: File) => void
  onUploadDialogueFrame?: (sceneIdx: number, dialogueIdx: number, file: File) => void
  onSaveEditedBeatFrame?: (sceneIdx: number, beatId: string, url: string) => void
  onSaveEditedDialogueFrame?: (sceneIdx: number, dialogueIdx: number, url: string) => void
  onSaveEditedCustomFrame?: (sceneIdx: number, frameId: string, url: string) => void
  onSaveEditedStoryboardScene?: (sceneIdx: number, url: string) => void
  onDirectFrame?: (sceneIdx: number, slot: import('@/lib/storyboard/types').StoryboardFrameSlot) => void
  onAddStoryboardFrame?: (sceneIdx: number) => void | Promise<void>
  onDeleteStoryboardFrame?: (sceneIdx: number, frameId: string) => void | Promise<void>
  onGenerateCustomFrame?: (sceneIdx: number, frameId: string) => Promise<void>
  onUploadCustomFrame?: (sceneIdx: number, frameId: string, file: File) => void
  onUploadStoryboardScene?: (sceneIdx: number, file: File) => void
  onExpressSceneGenerate?: (
    sceneIdx: number,
    language: string,
    options?: ExpressSceneConfirmOptions & { finalizeOnly?: boolean }
  ) => Promise<void>
  onFinalizeStoryboardScene?: (sceneIdx: number, language: string) => Promise<void>
  expressStatus?: import('./SceneGallery').ExpressSceneStatusMap
  expressGateBlocked?: boolean
  onExpressGateBlocked?: () => void
  isExpressRunning?: boolean
  narrationVoice?: unknown
}

async function downloadSceneAudioFile(
  e: React.MouseEvent,
  url: string,
  options: Omit<Parameters<typeof saveAudioFile>[0], 'url'>
) {
  e.stopPropagation()
  try {
    await saveAudioFile({ url, ...options })
  } catch (error) {
    console.error('[ScriptPanel] Audio download failed:', error)
    toast.error('Failed to save audio file')
  }
}

function SceneCard({
  scene,
  sceneNumber,
  isSelected,
  onClick,
  onExpand,
  isExpanding,
  onPlayScene,
  isPlaying,
  audioEnabled,
  sceneIdx,
  onGenerateImage,
  isGeneratingImage,
  onOpenPromptBuilder,
  onOpenPromptDrawer,
  scenePrompt,
  onPromptChange,
  validationWarning,
  validationInfo,
  isWarningExpanded,
  onToggleWarningExpanded,
  onDismissValidationWarning,
  parseScriptForAudio,
  generateAndPlaySFX,
  generateAndPlayMusic,
  onPlayAudio,
  onGenerateSceneAudio,
  onGenerateAllAudio,
  isGeneratingAudio,
  selectedLanguage = 'en',
  onLanguageChange,
  playingAudio,
  generatingDialogue,
  setGeneratingDialogue,
  timelineStart,
  dragHandleProps,
  onAddScene,
  onDeleteScene,
  onEditScene,
  onEditSceneWithRecommendations,
  onUpdateSceneAudio,
  onDeleteSceneAudio,
  onEnhanceSceneContext,
  onUpdateAudioStartTime,
  onGenerateSceneScore,
  generatingScoreFor,
  getScoreColorClass,
  onStopAudio,
  onOpenSceneReview,
  generatingMusic,
  setGeneratingMusic,
  generateMusic,
  onSaveSfxAudio,
  uploadAudio,
  generatingDirectionFor,
  sceneProductionData,
  sceneProductionReferences,
  onInitializeSceneProduction,
  onSegmentPromptChange,
  onSegmentKeyframeChange,
  onSegmentDialogueAssignmentChange,
  onSegmentGenerate,
  onSegmentUpload,
  onSegmentAnimaticSettingsChange,
  onRenderedSceneUrlChange,
  onProductionDataChange,
  onResetSegments,
  onAddSegment,
  onAddFullSegment,
  onDeleteSegment,
  onSegmentResize,
  onApplyIntelligentAlignment,
  onReorderSegments,
  onAudioClipChange,
  onCleanupStaleAudioUrl,
  onAddEstablishingShot,
  onEstablishingShotStyleChange,
  onBackdropVideoGenerated,
  onGenerateEndFrame,
  onEndFrameGenerated,
  characters = [],
  sceneAudioTracks,
  domId,
  isBookmarked = false,
  onBookmarkToggle,
  bookmarkSaving = false,
  overlayStore,
  projectId,
  onUploadKeyframe,
  isWorkflowOpen = false,
  onWorkflowOpenChange,
  onAddToReferenceLibrary,
  onEditImage,
  totalScenes,
  onNavigateScene,
  onMarkWorkflowComplete,
  onDismissStaleWarning,
  onSyncPreVisToScript,
  onSelectTake,
  onDeleteTake,
  onGenerateSegmentFrames,
  onEditFrame,
  onOpenFrameEditModal,
  onUploadFrame,
  generatingFrameForSegment,
  generatingFramePhase,
  bookmarkedSceneIndex = -1,
  sceneNavigationCollapsed,
  setSceneNavigationCollapsed,
  audioTimelineCollapsed,
  setAudioTimelineCollapsed,
  scenes,
  script,
  onScriptChange,
  setEditingImageData,
  setImageEditModalOpen,
  sceneReferences = [],
  objectReferences = [],
  locationReferences = [],
  getPlaybackOffsetForScene,
  handlePlaybackOffsetChange,
  getSuggestedOffsetForScene,
  expandedRecommendations,
  setExpandedRecommendations,
  onAnalyzeScene,
  productionReadiness,
  analyzingSceneIndex,
  onOptimizeScene,
  optimizingSceneIndex,
  setOptimizeDialogScene,
  setOptimizeDialogOpen,
  onResyncAudioTiming,
  resyncingAudioSceneIndex,
  onApproveStoryboard,
  approvingStoryboardFor = null,
  projectTitle = '',
  projectLogline = '',
  visualStyle,
  projectAspectRatio = '16:9',
  onModerationReport,
  onGenerateBeatFrame,
  onGenerateBeatEndFrame,
  onGenerateDialogueFrame,
  onUploadBeatFrame,
  onUploadDialogueFrame,
  onSaveEditedBeatFrame,
  onSaveEditedDialogueFrame,
  onSaveEditedCustomFrame,
  onSaveEditedStoryboardScene,
  onDirectFrame,
  onAddStoryboardFrame,
  onDeleteStoryboardFrame,
  onGenerateCustomFrame,
  onUploadCustomFrame,
  onUploadStoryboardScene,
  onExpressSceneGenerate,
  onFinalizeStoryboardScene,
  expressStatus,
  expressGateBlocked = false,
  onExpressGateBlocked,
  isExpressRunning = false,
  narrationVoice,
}: SceneCardProps) {
  const isOutline = !scene.isExpanded && scene.summary
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<WorkflowStep | null>(
    scene.workflowCompletions?.['callAction'] ? 'callAction' : 'dialogueAction'
  )
  const [copilotPanelOpen, setCopilotPanelOpen] = useState(false)
  const [directionBuilderOpen, setDirectionBuilderOpen] = useState(false)
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null)
  
  // Beat selection and dialog states
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [editSegmentDialogOpen, setEditSegmentDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteSceneConfirmOpen, setDeleteSceneConfirmOpen] = useState(false)
  const [resetSegmentsDialogOpen, setResetSegmentsDialogOpen] = useState(false)
  const [isResettingSegments, setIsResettingSegments] = useState(false)
  
  
  // Add Beat dialog state
  const [addSegmentDialogOpen, setAddSegmentDialogOpen] = useState(false)

  type SceneScriptTab = 'direction' | 'narration' | 'previs' | 'beats' | 'music'
  const [activeSceneTab, setActiveSceneTab] = useState<SceneScriptTab>('direction')

  type ShootTab = 'review' | 'video' | 'mixer' | 'streams'
  const [activeShootTab, setActiveShootTab] = useState<ShootTab>('review')

  const sceneBeatsForTabs = useMemo(() => getSceneBeats(scene), [scene])
  const excludedBeatCount = useMemo(
    () => sceneBeatsForTabs.filter((beat) => beat.excluded === true).length,
    [sceneBeatsForTabs]
  )
  const frameSlotsForTabs = useMemo(() => enumerateStoryboardFrameSlots(scene), [scene])
  const preVisFrameStats = useMemo(() => countStoryboardFrameStats(scene), [scene])

  const hasDirectionTab = !!(
    scene.visualDescription ||
    scene.action ||
    scene.summary ||
    scene.heading ||
    scene.sceneDirection
  )
  const hasNarrationTab = !!(
    scene.narration &&
    !(Array.isArray((scene as any).segments) && (scene as any).segments.length > 0)
  )
  const hasPreVisTab = frameSlotsForTabs.length > 0 || sceneBeatsForTabs.length > 0
  const hasBeatsTab = sceneBeatsForTabs.length > 0
  const hasMusicTab = !!scene.music

  const defaultMusicPlayDuration = useMemo(() => {
    if (typeof scene.musicDuration === 'number' && scene.musicDuration > 0) {
      return scene.musicDuration
    }
    if (typeof scene.duration === 'number' && scene.duration > 0) {
      return scene.duration
    }
    const segs = sceneProductionData?.segments
    if (segs?.length) {
      const total = segs.reduce(
        (sum, s) => sum + Math.max(0, (s.endTime ?? 0) - (s.startTime ?? 0)),
        0
      )
      if (total > 0) return Math.ceil(total)
    }
    return 30
  }, [scene.musicDuration, scene.duration, sceneProductionData?.segments])

  const [musicPlayDuration, setMusicPlayDuration] = useState(defaultMusicPlayDuration)

  useEffect(() => {
    setMusicPlayDuration(defaultMusicPlayDuration)
  }, [defaultMusicPlayDuration, sceneIdx])

  const availableSceneTabs = useMemo(() => {
    const tabs: SceneScriptTab[] = []
    if (hasDirectionTab) tabs.push('direction')
    if (hasBeatsTab) tabs.push('beats')
    if (hasMusicTab) tabs.push('music')
    if (hasPreVisTab) tabs.push('previs')
    if (hasNarrationTab) tabs.push('narration')
    return tabs
  }, [hasDirectionTab, hasNarrationTab, hasPreVisTab, hasBeatsTab, hasMusicTab])

  useEffect(() => {
    if (availableSceneTabs.length === 0) return
    if (!availableSceneTabs.includes(activeSceneTab)) {
      setActiveSceneTab(
        availableSceneTabs.includes('direction') ? 'direction' : availableSceneTabs[0]
      )
    }
  }, [sceneIdx, availableSceneTabs, activeSceneTab])

  const showShootReview = useMemo(
    () => isBeatFirstPipelineEnabled() && getSceneBeats(scene).length > 0 && !!onApproveStoryboard,
    [scene, onApproveStoryboard]
  )
  const hasShootSegments = !!(sceneProductionData?.segments && sceneProductionData.segments.length > 0)

  const availableShootTabs = useMemo(() => {
    const tabs: ShootTab[] = []
    if (showShootReview) tabs.push('review')
    if (hasShootSegments) {
      tabs.push('video', 'mixer', 'streams')
    }
    return tabs
  }, [showShootReview, hasShootSegments])

  useEffect(() => {
    if (availableShootTabs.length === 0) return
    if (!availableShootTabs.includes(activeShootTab)) {
      setActiveShootTab(
        availableShootTabs.includes('review') ? 'review' : availableShootTabs[0]
      )
    }
  }, [sceneIdx, availableShootTabs, activeShootTab])

  const [selectedExpressBeatIds, setSelectedExpressBeatIds] = useState<Set<string>>(() => new Set())
  const [expressSfxDialogOpen, setExpressSfxDialogOpen] = useState(false)
  const [isExpressSfxRunning, setIsExpressSfxRunning] = useState(false)
  const [expressAudioDialogOpen, setExpressAudioDialogOpen] = useState(false)
  const [isExpressAudioRunning, setIsExpressAudioRunning] = useState(false)
  const [expressBeatStatus, setExpressBeatStatus] = useState<Record<string, ExpressBeatSfxStatus>>({})
  // Scene Image section: collapsed by default
  const [sceneImageCollapsed, setSceneImageCollapsed] = useState(true)
  // Production workflow container collapse states
  const [storyboardBuilderCollapsed, setStoryboardBuilderCollapsed] = useState(true)

  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ sceneId?: string; sceneIndex?: number }>).detail
      if (detail?.sceneIndex != null && detail.sceneIndex !== sceneIdx) return
      if (detail?.sceneId) {
        const thisSceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
        if (detail.sceneId !== thisSceneId) return
      }
      setActiveWorkflowTab('callAction')
      if (!isWorkflowOpen && onWorkflowOpenChange) onWorkflowOpenChange(true)
      requestAnimationFrame(() => {
        document.getElementById(`director-console-${scene.sceneId || scene.id || `scene-${sceneIdx}`}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    }
    window.addEventListener('production:open-action-tab', handler)
    return () => window.removeEventListener('production:open-action-tab', handler)
  }, [sceneIdx, scene, isWorkflowOpen, onWorkflowOpenChange])
  const [showKeyframes, setShowKeyframes] = useState(false)
  
  // Determine active step for Co-Pilot
  const activeStep: WorkflowStep | null = activeWorkflowTab
  
  // Manual workflow completion overrides (user marked as done)
  const workflowCompletions = scene.workflowCompletions || {}

  const expressSfxBeatOptions = useMemo(() => {
    const sceneRecord = scene as Record<string, unknown>
    return listSelectableActionBeats(sceneRecord).map((beat) => ({
      beatId: beat.beatId,
      label:
        beat.actionDescription.length > 72
          ? `${beat.actionDescription.slice(0, 72)}…`
          : beat.actionDescription,
      hasAudio: beatHasSfxAudio(sceneRecord, {
        beatId: beat.beatId,
        actionDescription: beat.actionDescription,
        kind: 'action',
      }),
    }))
  }, [scene])

  const selectedExpressCount = selectedExpressBeatIds.size

  const toggleExpressBeatSelection = useCallback((beatId: string, selected: boolean) => {
    setSelectedExpressBeatIds((prev) => {
      const next = new Set(prev)
      if (selected) next.add(beatId)
      else next.delete(beatId)
      return next
    })
  }, [])

  const handleExpressSfxConfirm = useCallback(
    async (options: ExpressSfxConfirmOptions) => {
      if (!projectId || options.beatIds.length === 0) return

      setIsExpressSfxRunning(true)
      const statusSeed: Record<string, ExpressBeatSfxStatus> = {}
      options.beatIds.forEach((beatId) => {
        statusSeed[beatId] = 'pending'
      })
      setExpressBeatStatus(statusSeed)

      try {
        await dispatchExpressVeoSfx({
          projectId,
          sceneIndex: sceneIdx,
          beatIds: options.beatIds,
          segmentDurationSeconds: scene.duration,
          durationOverride: options.durationOverride,
          regenerate: options.regenerate,
          onItemStart: (beatId) => {
            setExpressBeatStatus((prev) => ({ ...prev, [beatId]: 'running' }))
          },
          onItemDone: async ({ beatId, sfxIndex, url, attribution }) => {
            setExpressBeatStatus((prev) => ({ ...prev, [beatId]: 'done' }))
            const beat = getSceneBeats(scene).find((entry) => entry.beatId === beatId)
            await onSaveSfxAudio?.(
              sceneIdx,
              'sfx',
              url,
              sfxIndex,
              attribution,
              beat
                ? { beatId, beatDescription: beat.actionDescription?.trim() ?? '' }
                : undefined
            )
          },
          onItemError: (beatId) => {
            setExpressBeatStatus((prev) => ({ ...prev, [beatId]: 'error' }))
          },
        })
      } finally {
        setIsExpressSfxRunning(false)
        setExpressSfxDialogOpen(false)
      }
    },
    [projectId, sceneIdx, scene, onSaveSfxAudio]
  )

  // ---- Express Audio (dialogue + music + Veo SFX) ----
  const getNarrationAudioUrlForLang = useCallback(
    (lang: string): string | undefined => {
      const sceneRecord = scene as Record<string, any>
      if (sceneRecord.narrationAudio && sceneRecord.narrationAudio[lang]?.url) {
        return sceneRecord.narrationAudio[lang].url
      }
      if (lang === 'en' && sceneRecord.narrationAudioUrl) {
        return sceneRecord.narrationAudioUrl
      }
      return undefined
    },
    [scene]
  )

  const expressAudioItems = useMemo(
    () => buildExpressAudioItems(scene as Record<string, unknown>, selectedLanguage),
    [scene, selectedLanguage]
  )

  const handleExpressAudioConfirm = useCallback(
    async (options: ExpressAudioConfirmOptions) => {
      if (!projectId) return
      const lang = selectedLanguage
      const isAll = options.scope === 'all'
      const selection = parseExpressAudioSelectedIds(options.selectedIds)
      const selectedDialogueIndices = new Set(selection.dialogueIndices)

      setIsExpressAudioRunning(true)
      overlayStore?.show(`Express Audio for Scene ${sceneIdx + 1}...`, 60, 'audio-generation')

      try {
        // Scope = All: delete existing audio for the selected items first.
        if (isAll && onDeleteSceneAudio) {
          const deletions: Promise<unknown>[] = []
          if (selection.includeNarration) {
            deletions.push(
              Promise.resolve(onDeleteSceneAudio(sceneIdx, 'narration', undefined, undefined, true))
            )
          }
          for (const dialogueIndex of selection.dialogueIndices) {
            deletions.push(
              Promise.resolve(
                onDeleteSceneAudio(sceneIdx, 'dialogue', dialogueIndex, undefined, true)
              )
            )
          }
          if (selection.includeMusic) {
            deletions.push(
              Promise.resolve(onDeleteSceneAudio(sceneIdx, 'music', undefined, undefined, true))
            )
          }
          await Promise.all(deletions)
          // Give deletions a moment to settle before regenerating.
          await new Promise((resolve) => setTimeout(resolve, 400))
        }

        // ---- TTS lane: narration + dialogue lines (concurrency 3) ----
        const ttsLane = async () => {
          if (!onGenerateSceneAudio) return
          const tasks: Array<{ id: string; execute: () => Promise<void> }> = []

          const hasNarrationText = !!String(scene.narration || '').trim()
          const narrationNeeded =
            selection.includeNarration &&
            hasNarrationText &&
            (isAll || !getNarrationAudioUrlForLang(lang))
          if (narrationNeeded) {
            tasks.push({
              id: 'narration',
              execute: async () => {
                await onGenerateSceneAudio(sceneIdx, 'narration', undefined, undefined, lang)
              },
            })
          }

          const dialogueLines: any[] = Array.isArray(scene.dialogue) ? scene.dialogue : []
          dialogueLines.forEach((d: any, i: number) => {
            if (!d?.line || !d?.character) return
            if (!selectedDialogueIndices.has(i)) return
            if (!isAll) {
              const entry = findDialogueAudioForLine(scene, {
                language: lang,
                lineId: d.lineId,
                dialogueIndex: i,
                character: d.character,
              })
              if (entry?.audioUrl || entry?.url) return // already has audio
            }
            tasks.push({
              id: `dialogue-${i}`,
              execute: async () => {
                await onGenerateSceneAudio(sceneIdx, 'dialogue', d.character, i, lang)
              },
            })
          })

          if (tasks.length === 0) return
          await processWithConcurrency(tasks, 3, undefined, false)
        }

        // ---- Music lane ----
        const musicLane = async () => {
          if (!selection.includeMusic || !generateMusic || !scene.music) return
          const musicMissing = !((scene as any).musicAudio || (scene as any).music?.url)
          if (!isAll && !musicMissing) return
          await generateMusic(sceneIdx, true)
        }

        // ---- Veo SFX lane ----
        const sfxLane = async () => {
          if (selection.sfxBeatIds.length === 0) return
          await dispatchExpressVeoSfx({
            projectId,
            sceneIndex: sceneIdx,
            beatIds: selection.sfxBeatIds,
            segmentDurationSeconds: scene.duration,
            durationOverride: options.durationOverride,
            regenerate: isAll,
            onItemStart: (beatId) => {
              setExpressBeatStatus((prev) => ({ ...prev, [beatId]: 'running' }))
            },
            onItemDone: async ({ beatId, sfxIndex, url, attribution }) => {
              setExpressBeatStatus((prev) => ({ ...prev, [beatId]: 'done' }))
              const beat = getSceneBeats(scene).find((entry) => entry.beatId === beatId)
              await onSaveSfxAudio?.(
                sceneIdx,
                'sfx',
                url,
                sfxIndex,
                attribution as unknown as Record<string, unknown> | null,
                beat
                  ? { beatId, beatDescription: beat.actionDescription?.trim() ?? '' }
                  : undefined
              )
            },
            onItemError: (beatId) => {
              setExpressBeatStatus((prev) => ({ ...prev, [beatId]: 'error' }))
            },
          })
        }

        const results = await Promise.allSettled([ttsLane(), musicLane(), sfxLane()])
        const failed = results.filter((r) => r.status === 'rejected')
        if (failed.length === 0) {
          toast.success(`Express Audio complete for Scene ${sceneIdx + 1}`)
        } else {
          toast.warning(
            `Express Audio finished with ${failed.length} issue${failed.length === 1 ? '' : 's'} for Scene ${sceneIdx + 1}`
          )
        }
      } catch (error) {
        console.error('[ScriptPanel] Express Audio failed:', error)
        toast.error('Express Audio failed')
      } finally {
        overlayStore?.hide()
        setIsExpressAudioRunning(false)
        setExpressAudioDialogOpen(false)
      }
    },
    [
      projectId,
      sceneIdx,
      scene,
      selectedLanguage,
      onGenerateSceneAudio,
      generateMusic,
      onDeleteSceneAudio,
      onSaveSfxAudio,
      getNarrationAudioUrlForLang,
    ]
  )
  
  // Helper: Check if all audio is complete for a specific language
  // Script step auto-completes when narration + dialogue audio are generated
  // Note: "description audio" is NOT checked — it's not part of the standard audio generation workflow
  const isSceneAudioCompleteForLanguage = useMemo(() => {
    return (lang: string): boolean => {
      // Check if scene has any text that requires audio
      const hasNarrationText = !!scene.narration?.trim()
      const dialogueLines = scene.dialogue || []
      const hasDialogueText = dialogueLines.length > 0
      
      // If scene has no narration or dialogue, consider it complete
      if (!hasNarrationText && !hasDialogueText) {
        return true
      }
      
      // Check narration audio (if scene has narration text)
      let hasNarrationAudio = true
      if (hasNarrationText) {
        const narrUrl = scene.narrationAudio?.[lang]?.url || (lang === 'en' ? scene.narrationAudioUrl : undefined)
        hasNarrationAudio = !!narrUrl
      }
      
      // Check all dialogue lines have audio
      let hasAllDialogueAudio = true
      if (hasDialogueText) {
        // Get dialogue audio array for this language
        let dialogueAudioArray: any[] = []
        if (Array.isArray(scene.dialogueAudio)) {
          // Old format: array (treat as 'en')
          dialogueAudioArray = (lang === 'en' ? scene.dialogueAudio : []).filter(Boolean)
        } else if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object') {
          // New format: object keyed by language
          dialogueAudioArray = (scene.dialogueAudio[lang] || []).filter(Boolean)
        }
        
        // Each dialogue line should have a matching audio entry
        // NOTE: We only expect audio for characters that have a voiceConfig assigned
        hasAllDialogueAudio = dialogueLines.every((d: any, idx: number) => {
          const char = characters.find(c => c.name === d.character)
          if (!char?.voiceConfig) {
            return true // No voice assigned, so audio isn't expected for this line
          }
          
          const audioEntry = dialogueAudioArray.find((a: any) => 
            a?.dialogueIndex === idx && a?.audioUrl
          )
          return !!audioEntry
        })
      }
      
      return hasNarrationAudio && hasAllDialogueAudio
    }
  }, [scene.narration, scene.dialogue, 
      scene.narrationAudio, scene.narrationAudioUrl, scene.dialogueAudio, characters])
  
  // Completion status detection for workflow steps (combines auto-detection + manual overrides)
  const stepCompletion = useMemo(() => {
    // Auto-detected completions
    // Script step: Auto-complete only when ALL audio is generated for selected language
    const dialogueActionAuto = isSceneAudioCompleteForLanguage(selectedLanguage)
    const directorsChairAuto = !!scene.sceneDirection
    const storyboardPreVizAuto = !!scene.imageUrl
    // Beat Builder: Complete when segments exist and all have READY or higher status
    const segmentBuilderAuto = (() => {
      if (!sceneProductionData) return false
      if (!sceneProductionData.isSegmented || sceneProductionData.segments.length === 0) return false
      // All segments should have status of READY or higher (not DRAFT)
      return sceneProductionData.segments.every(segment => 
        segment.status !== 'DRAFT' && segment.generatedPrompt
      )
    })()
    // Check if Call Action is complete: scene must be segmented and all segments must have assets
    const callActionAuto = (() => {
      if (!sceneProductionData) return false
      if (!sceneProductionData.isSegmented || sceneProductionData.segments.length === 0) return false
      // All segments should have active assets (video or image)
      return sceneProductionData.segments.every(segment => segment.activeAssetUrl && segment.assetType)
    })()
    
    // Combine auto-detection with manual overrides (manual override wins)
    return {
      dialogueAction: workflowCompletions.dialogueAction ?? dialogueActionAuto,
      directorsChair: workflowCompletions.directorsChair ?? directorsChairAuto,
      storyboardPreViz: workflowCompletions.storyboardPreViz ?? storyboardPreVizAuto,
      segmentBuilder: workflowCompletions.segmentBuilder ?? segmentBuilderAuto,
      callAction: workflowCompletions.callAction ?? callActionAuto,
    }
  }, [isSceneAudioCompleteForLanguage, selectedLanguage, scene.sceneDirection, scene.imageUrl, sceneProductionData, workflowCompletions])
  
  // Sequential activation logic - steps unlock based on prerequisite completion
  // Order: Script -> Frame -> Call Action
  // Frame unlocks after Script is complete
  // Call Action also requires scene image for visual consistency (soft requirement - shows warning)
  const hasSceneImage = !!scene.imageUrl
  const stepUnlocked = useMemo(() => {
    return {
      dialogueAction: true, // Always unlocked
      directorsChair: stepCompletion.dialogueAction, // Keep for internal logic
      segmentBuilder: stepCompletion.dialogueAction, // Keep for internal logic (auto-segmentation)
      storyboardPreViz: stepCompletion.dialogueAction, // Frame logic now merged into Call Action
      callAction: stepCompletion.dialogueAction,  // Call Action unlocks after Script (Frame merged in)
    }
  }, [stepCompletion])
  
  // Scene image requirement warning for Call Action
  // Soft requirement: Allow proceeding but show warning for better quality
  const sceneImageWarning = useMemo(() => {
    if (stepUnlocked.callAction && !hasSceneImage) {
      return {
        show: true,
        message: 'Generate a scene image first for better video consistency',
        severity: 'warning' as const
      }
    }
    return { show: false, message: '', severity: 'info' as const }
  }, [stepUnlocked.callAction, hasSceneImage])
  
  // Compute staleness for workflow sync tracking
  // User can dismiss stale warnings - stored in scene.dismissedStaleWarnings
  const dismissedWarnings = scene.dismissedStaleWarnings || {}
  const stepStaleness = useMemo(() => {
    return {
      directorsChair: isDirectionStale(scene) && !dismissedWarnings.directorsChair,
      storyboardPreViz: isImageStale(scene) && !dismissedWarnings.storyboardPreViz,
      preVisSync: isPreVisStale(scene) && !dismissedWarnings.preVisSync,
    }
  }, [scene, dismissedWarnings])
  
  // Determine status for each step (includes 'stale' for workflow sync warnings)
  type StepStatus = 'complete' | 'stale' | 'in-progress' | 'todo' | 'locked'

  const getStepStatus = (stepKey: keyof typeof stepCompletion): StepStatus => {
    if (stepCompletion[stepKey]) {
      // Check for staleness on completed steps
      if (stepKey === 'directorsChair' && stepStaleness.directorsChair) return 'stale'
      if (stepKey === 'storyboardPreViz' && stepStaleness.storyboardPreViz) return 'stale'
      return 'complete'
    }
    if (activeWorkflowTab === stepKey) return 'in-progress'
    if (!stepUnlocked[stepKey as keyof typeof stepUnlocked]) return 'locked'
    return 'todo'
  }

  const chipClassByStatus: Record<StepStatus, string> = {
    complete: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40',
    stale: 'bg-amber-500/15 text-amber-200 border border-amber-400/40',
    'in-progress': 'bg-sf-primary/20 text-sf-primary border border-sf-primary/40',
    todo: 'bg-white/5 text-slate-300 border border-white/10',
    locked: 'bg-slate-800/60 text-slate-500 border border-white/10'
  }

  const chipDotClass: Record<StepStatus, string> = {
    complete: 'bg-emerald-300',
    stale: 'bg-amber-300',
    'in-progress': 'bg-sf-primary',
    todo: 'bg-slate-400',
    locked: 'bg-slate-600'
  }

  const workflowTabs: Array<{ key: WorkflowStep; label: string; icon: React.ReactNode; description: string }> = useMemo(() => [
    { key: 'dialogueAction', label: 'Script', icon: <FileText className="w-4 h-4" />, description: 'Write and edit your scene script' },
    // Direction (directorsChair) is hidden - auto-generated from Script, accessible via Frame dialog and Export
    // Frame (storyboardPreViz) merged into Action for unified production workflow
    { key: 'callAction', label: 'Motion', icon: <Clapperboard className="w-4 h-4" />, description: 'Generate and edit the full-motion video for this scene' }
  ], [])
  
  // Update active workflow tab when completions change if we haven't manually switched
  // By default we no longer auto-open the first incomplete step to prevent panel jumping,
  // we just respect the initial state set above (either 'dialogueAction' or 'callAction').
  
  const handleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onExpand && !isExpanding) {
      await onExpand(scene.sceneNumber)
    }
  }
  
  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPlaying) {
      if (onStopAudio) {
        onStopAudio()
      }
    } else if (onPlayScene) {
      // Try to use the audio player context for enhanced playback
      try {
        const audioPlayer = useAudioPlayerContext()
        if (audioPlayer && scene) {
          // Build playlist: music + dialogue + SFX in sequence
          const playlist: Track[] = []
          
          // Add music if available
          if (scene.musicAudio?.url) {
            playlist.push({
              id: 'music',
              url: scene.musicAudio.url,
              title: scene.musicAudio.name || 'Music',
              type: 'music',
              meta: scene.musicAudio,
            })
          }
          
          // Add narration/dialogue lines if available
          if (Array.isArray(scene.dialogues)) {
            scene.dialogues.forEach((d: any, i: number) => {
              if (d.audioUrl) {
                playlist.push({
                  id: `dlg-${i}`,
                  url: d.audioUrl,
                  title: d.speaker ?? `Line ${i + 1}`,
                  type: d.type ?? 'dialogue',
                  meta: d,
                })
              }
            })
          }
          
          // Add SFX if available
          if (Array.isArray(scene.sfx)) {
            scene.sfx.forEach((s: any, i: number) => {
              if (s.url) {
                playlist.push({
                  id: `sfx-${i}`,
                  url: s.url,
                  title: s.name ?? 'SFX',
                  type: 'sfx',
                  meta: s,
                })
              }
            })
          }
          
          // Load and play if playlist has tracks
          if (playlist.length > 0) {
            audioPlayer.loadPlaylist(playlist, 0)
            await audioPlayer.play()
            return
          }
        }
      } catch (err) {
        // Provider not available or error - fall back to original handler
        console.debug('Audio player context not available, using fallback', err)
      }
      
      // Fallback: use original onPlayScene handler
      await onPlayScene(sceneIdx)
    }
  }
  
  const handleQuickGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onGenerateImage && !isGeneratingImage) {
      await onGenerateImage(sceneIdx)
    }
  }
  
  const handleGenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onGenerateImage && !isGeneratingImage) {
      await onGenerateImage(sceneIdx)
    }
  }

  const handleOpenBuilder = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onOpenPromptBuilder) {
      onOpenPromptBuilder(sceneIdx)
    }
  }

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onWorkflowOpenChange) {
      onWorkflowOpenChange(!isWorkflowOpen)
    }
  }
  
  const accentGradient =
    sceneNumber % 2 === 0
      ? 'from-sf-primary/35 via-sky-500/10 to-transparent'
      : 'from-fuchsia-400/35 via-amber-400/15 to-transparent'

  const selectionClasses = isSelected
    ? 'border-sf-primary/70 ring-2 ring-sf-primary/60'
    : 'border-white/10 hover:border-sf-primary/30'

  const bookmarkClasses = isBookmarked ? 'border-amber-300/80 shadow-[0_0_35px_rgba(251,191,36,0.25)]' : ''
  const headingText =
    typeof scene?.heading === 'string'
      ? scene.heading
      : typeof scene?.heading === 'object' && scene.heading !== null
        ? (scene.heading as any)?.text
        : ''
  const formattedHeading = formatSceneHeading(headingText) || headingText || 'Untitled'
  const sceneDescriptionText =
    (scene.sceneDirection as { sceneDescription?: string } | undefined)?.sceneDescription ||
    scene.visualDescription ||
    scene.action ||
    scene.summary ||
    ''

  return (
    <div
      id={domId}
      className={`relative overflow-hidden p-5 rounded-2xl border transition-all shadow-[0_15px_40px_rgba(8,8,20,0.35)] bg-slate-950/50 backdrop-blur ${selectionClasses} ${bookmarkClasses} ${isOutline ? 'bg-amber-500/10 border-amber-300/40' : ''}`}
    >
      <div className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${accentGradient} opacity-40`} />
      <div className="relative z-[1]">
        {/* Top Row: Control Buttons */}
        <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-200 dark:border-gray-700 mb-2">
          {/* Left Side: Scene Navigation & Management Controls */}
          <div className="flex items-center gap-2">
            {/* Collapse/Expand Scene Navigation */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSceneNavigationCollapsed(!sceneNavigationCollapsed)
                    }}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  >
                    {sceneNavigationCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                  {sceneNavigationCollapsed ? 'Show' : 'Hide'} scene navigation
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <AnimatePresence>
              {!sceneNavigationCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
            {/* Previous Scene Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onNavigateScene && sceneIdx > 0) {
                        onNavigateScene(sceneIdx - 1)
                      }
                    }}
                    disabled={sceneIdx === 0}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Previous scene</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Next Scene Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onNavigateScene && totalScenes && sceneIdx < totalScenes - 1) {
                        onNavigateScene(sceneIdx + 1)
                      }
                    }}
                    disabled={!totalScenes || sceneIdx >= totalScenes - 1}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Next scene</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Scene Jump Selector */}
            {totalScenes && totalScenes > 1 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded px-2 py-1 transition-colors cursor-pointer"
                    title="Jump to any scene"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="font-medium">S{sceneNumber}/{totalScenes}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-64 max-h-80 p-2 bg-slate-900 border-slate-700"
                  align="start"
                  sideOffset={8}
                  onWheel={(e) => e.stopPropagation()}
                >
                  <div className="text-xs text-gray-400 px-2 py-1.5 mb-1 border-b border-gray-700">
                    Jump to Scene
                  </div>
                  <div 
                    className="space-y-0.5 max-h-52 overflow-y-scroll pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:hover:bg-gray-500"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#4b5563 #1f2937'
                    }}
                  >
                    {Array.from({ length: totalScenes }, (_, i) => {
                      const isCurrentScene = i === sceneIdx
                      const isBookmarked = i === bookmarkedSceneIndex
                      return (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onNavigateScene && !isCurrentScene) {
                              onNavigateScene(i)
                            }
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                            isCurrentScene
                              ? 'bg-purple-600/30 text-purple-300'
                              : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                          }`}
                        >
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[32px] text-center ${
                            isCurrentScene ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300'
                          }`}>
                            S{i + 1}
                          </span>
                          <span className="text-xs truncate flex-1">Scene {i + 1}</span>
                          {isBookmarked && (
                            <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                          )}
                          {isCurrentScene && (
                            <CheckCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="w-px h-4 bg-gray-700" />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddScene?.(sceneIdx)
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Add scene after</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteSceneConfirmOpen(true)
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Delete scene</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Scene & Time Pill - Secondary Timeline Metadata */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1.5 bg-indigo-900/30 rounded-full px-2 py-0.5 text-[10px] border border-indigo-700/50 cursor-help">
                    <span className="text-indigo-300 font-semibold">S{sceneNumber}</span>
                    <span className="text-gray-500">|</span>
                    <span className="text-white/80 font-medium">{formatDuration(calculateSceneDuration(scene))}</span>
                    <span className="text-gray-500">@</span>
                    <span className="text-gray-400">{formatDuration(timelineStart || 0)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                  <div className="text-xs">
                    <p>Duration: {formatDuration(calculateSceneDuration(scene))}</p>
                    <p>Starts at: {formatDuration(timelineStart || 0)}</p>
                    <p>Est. Videos: {Math.ceil(calculateSceneDuration(scene) / 8)}</p>
                    <p className="text-gray-400 mt-1">Rounded to 8-second clips</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Right Side: Scene Actions */}
          <div className="flex items-center gap-2">

            {/* Bookmark toggle button */}
            {onBookmarkToggle && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onBookmarkToggle()
                      }}
                      disabled={bookmarkSaving}
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark scene'}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all shadow-md ${
                        isBookmarked
                          ? 'bg-amber-500/30 border-amber-400 text-amber-200 hover:bg-amber-500/40 hover:border-amber-300 hover:shadow-lg'
                          : 'border-amber-400/50 text-amber-400 hover:border-amber-400 hover:bg-amber-500/20 hover:text-amber-300 hover:shadow-lg'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {bookmarkSaving ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : isBookmarked ? (
                        <BookmarkCheck className="w-5 h-5" />
                      ) : (
                        <BookmarkPlus className="w-5 h-5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                    {isBookmarked ? 'Remove bookmark' : 'Mark for Resume'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Scene Title, Score, and Description */}
        <div 
          className="mt-2 flex items-start justify-between cursor-pointer hover:bg-white/5 -mx-2 px-2 py-1 rounded-lg transition-colors"
          onClick={toggleOpen}
        >
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xl font-semibold text-white leading-tight">
                SCENE {sceneNumber}: {formattedHeading}
              </p>
            
            {/* Audience Resonance Analysis Badge - Integrated from ScriptReviewModal */}
            {!isOutline && (
              <div className="flex items-center gap-2">
                {scene.audienceAnalysis?.score !== undefined ? (
                  <>
                    {/* Audience Analysis Score Badge */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Toggle recommendations expansion
                              setExpandedRecommendations(prev => {
                                const newSet = new Set(prev)
                                if (newSet.has(sceneIdx)) {
                                  newSet.delete(sceneIdx)
                                } else {
                                  newSet.add(sceneIdx)
                                }
                                return newSet
                              })
                            }}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all cursor-pointer hover:scale-105 shadow-sm ${
                              scene.audienceAnalysis.score >= 80 
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 hover:bg-emerald-500/30 hover:border-emerald-400/70' 
                                : scene.audienceAnalysis.score >= 60 
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 hover:bg-cyan-500/30 hover:border-cyan-400/70' 
                                  : 'bg-rose-500/20 text-rose-300 border-rose-400/50 hover:bg-rose-500/30 hover:border-rose-400/70'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span className="tabular-nums">{scene.audienceAnalysis.score}</span>
                            {/* Score delta indicator */}
                            {scene.audienceAnalysis.previousScore !== undefined && scene.audienceAnalysis.previousScore !== scene.audienceAnalysis.score && (() => {
                              const delta = scene.audienceAnalysis.score - scene.audienceAnalysis.previousScore!
                              return (
                                <span className={`text-[10px] font-bold tabular-nums ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {delta > 0 ? `▲+${delta}` : `▼${delta}`}
                                </span>
                              )
                            })()}
                            {(scene.audienceAnalysis.recommendations?.length || 0) > 0 && (
                              <span className="flex items-center justify-center ml-0.5 h-4 min-w-4 px-1 text-[10px] font-bold bg-violet-500/40 text-violet-200 rounded-full">
                                {scene.audienceAnalysis.recommendations.length}
                              </span>
                            )}
                            {expandedRecommendations.has(sceneIdx) ? (
                              <ChevronUp className="w-3 h-3 ml-0.5 opacity-70" />
                            ) : (
                              <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900/95 backdrop-blur-sm text-white border border-gray-700/50 max-w-xs shadow-xl">
                          <div className="space-y-2 p-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">Audience Resonance: {scene.audienceAnalysis.score}/100</p>
                              {scene.audienceAnalysis.previousScore !== undefined && scene.audienceAnalysis.previousScore !== scene.audienceAnalysis.score && (() => {
                                const delta = scene.audienceAnalysis.score - scene.audienceAnalysis.previousScore!
                                return (
                                  <span className={`text-xs font-bold ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    ({delta > 0 ? `+${delta}` : delta} from {scene.audienceAnalysis.previousScore})
                                  </span>
                                )
                              })()}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-300">
                                Pacing: {scene.audienceAnalysis.pacing}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-300">
                                Tension: {scene.audienceAnalysis.tension}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed">{scene.audienceAnalysis.notes}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Optimize and Re-analyze buttons moved to expandable recommendations panel for cleaner header */}
                  </>
                ) : (
                  /* No analysis yet - show Analyze and Edit buttons */
                  <div className="flex items-center gap-1.5">
                    {onAnalyzeScene && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onAnalyzeScene(sceneIdx)
                              }}
                              disabled={analyzingSceneIndex === sceneIdx}
                              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all bg-indigo-500/20 text-indigo-300 border-indigo-400/50 hover:bg-indigo-500/30 hover:border-indigo-400/70 disabled:opacity-50 shadow-sm"
                            >
                              {analyzingSceneIndex === sceneIdx ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Analyzing...</span>
                                </>
                              ) : (
                                <>
                                  <Users className="w-3 h-3" />
                                  <span>Analyze</span>
                                </>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white border border-gray-700">
                            <p className="text-xs">Analyze scene for audience resonance</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {onEditScene && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditScene(sceneIdx)
                              }}
                              className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg font-medium border transition-all bg-gray-700/40 text-gray-300 border-gray-600/50 hover:bg-gray-700/60 hover:border-gray-500/70 hover:text-white shadow-sm"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Direct</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white border border-gray-700">
                            <p className="text-xs">Direct scene with AI assistance</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>
            )}
            </div>
            {sceneDescriptionText && (
              <p className="text-sm text-slate-400 leading-relaxed pr-4">
                {sceneDescriptionText}
              </p>
            )}
          </div>
          
          {/* Mark Done and Help controls */}
          {!isOutline && activeStep && (
            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Play Audio Button - Only visible in Script tab */}
                {activeStep === 'dialogueAction' && onPlayScene && (
                  <button
                    onClick={handlePlay}
                    className={`px-2 py-1 text-xs rounded-lg transition flex items-center gap-1 border ${isPlaying ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'}`}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Play Audio</span>
                      </>
                    )}
                  </button>
                )}
                
            </div>
          )}
        </div>
        
        {/* Expandable Recommendations Panel - Shows when user clicks the score badge */}
        <AnimatePresence>
          {expandedRecommendations.has(sceneIdx) && scene.audienceAnalysis && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-4 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/60 rounded-xl shadow-lg backdrop-blur-sm">
                {/* Analysis Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Pacing', value: scene.audienceAnalysis.pacing, icon: '⚡' },
                    { label: 'Tension', value: scene.audienceAnalysis.tension, icon: '🎭' },
                    { label: 'Character', value: scene.audienceAnalysis.characterDevelopment, icon: '👤' },
                    { label: 'Visual', value: scene.audienceAnalysis.visualPotential, icon: '🎬' },
                  ].map((metric) => (
                    <div key={metric.label} className="flex flex-col items-center p-2 bg-gray-800/50 rounded-lg border border-gray-700/40">
                      <span className="text-sm mb-1">{metric.icon}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{metric.label}</span>
                      <span className="text-xs font-medium text-gray-200 capitalize">{metric.value}</span>
                    </div>
                  ))}
                </div>
                
                {/* Notes */}
                {scene.audienceAnalysis.notes && (
                  <div className="mb-4 p-3 bg-gray-800/40 rounded-lg border-l-2 border-cyan-500/50">
                    <p className="text-xs text-gray-300 leading-relaxed italic">
                      "{scene.audienceAnalysis.notes}"
                    </p>
                  </div>
                )}
                
                {/* Sync CTA - Show when scene was optimized after last analysis */}
                {scene.audienceAnalysis.optimizedAt && 
                 scene.audienceAnalysis.analyzedAt &&
                 new Date(scene.audienceAnalysis.optimizedAt) > new Date(scene.audienceAnalysis.analyzedAt) && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-xs text-amber-200 flex-1">Scene optimized since last analysis - score may have changed</span>
                    {onAnalyzeScene && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAnalyzeScene(sceneIdx)
                        }}
                        disabled={analyzingSceneIndex === sceneIdx}
                        className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg"
                      >
                        {analyzingSceneIndex === sceneIdx ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Re-analyze'
                        )}
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Recommendations */}
                {(scene.audienceAnalysis.recommendations?.length || 0) > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-violet-300 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Recommendations
                    </p>
                    <ul className="space-y-2">
                      {scene.audienceAnalysis.recommendations.map((rec: string | { text: string; category?: string; impact?: string; priority?: string; pointsDeducted?: number }, rIdx: number) => {
                        const recText =
                          typeof rec === 'string'
                            ? rec
                            : typeof rec === 'object' && rec && typeof rec.text === 'string'
                            ? rec.text
                            : (() => {
                                const line = coerceDialogueLineText((rec as any)?.line)
                                if (line && typeof (rec as any)?.character === 'string') {
                                  return `${(rec as any).character}: ${line}`
                                }
                                return line || String(rec)
                              })()
                        const recCategory = typeof rec === 'object' && rec?.category ? rec.category : null
                        const recImpact = typeof rec === 'object' && rec?.impact ? rec.impact : null
                        const recPriority = typeof rec === 'object' && rec?.priority ? rec.priority : null
                        const recPointsDeducted = typeof rec === 'object' && rec?.pointsDeducted ? rec.pointsDeducted : null
                        return (
                          <li key={rIdx} className="text-xs text-gray-300 flex gap-3 p-2.5 bg-gray-800/40 rounded-lg border border-gray-700/30 hover:bg-gray-800/60 transition-colors">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold flex-shrink-0 mt-0.5">
                              {rIdx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="leading-relaxed">{recText}</span>
                              {(recCategory || recImpact || recPriority || recPointsDeducted) && (
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  {recPriority && (
                                    <span className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                      recPriority === 'high' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                      recPriority === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                      'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    }`}>
                                      {recPriority === 'high' ? '🚨' : recPriority === 'medium' ? '⚠️' : '💡'} {recPriority}
                                    </span>
                                  )}
                                  {recPointsDeducted && (
                                    <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                                      -{recPointsDeducted} pts
                                    </span>
                                  )}
                                  {recImpact && (
                                    <span className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                      recImpact === 'structural' 
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    }`}>
                                      {recImpact === 'structural' ? '🔧' : '✨'} {recImpact}
                                    </span>
                                  )}
                                  {recCategory && (
                                    <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400 border border-gray-600/30">
                                      {recCategory}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-700/50">
                  {onEditSceneWithRecommendations && (scene.audienceAnalysis.recommendations?.length || 0) > 0 && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Extract recommendation texts
                        const recommendations = (scene.audienceAnalysis.recommendations || []).map((rec: string | { text: string }) => 
                          typeof rec === 'string' ? rec : rec?.text || String(rec)
                        )
                        onEditSceneWithRecommendations(sceneIdx, recommendations)
                      }}
                      className="h-8 text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg shadow-md"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit & Apply
                    </Button>
                  )}
                  {onEditScene && !(onEditSceneWithRecommendations && (scene.audienceAnalysis.recommendations?.length || 0) > 0) && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditScene(sceneIdx)
                      }}
                      className="h-8 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Direct
                    </Button>
                  )}
                  {onAnalyzeScene && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAnalyzeScene(sceneIdx)
                      }}
                      disabled={analyzingSceneIndex === sceneIdx}
                      className="h-8 text-xs border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 rounded-lg"
                    >
                      {analyzingSceneIndex === sceneIdx ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Analyze
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Production Section Navigation - Segmented Tab Control */}
        {!isOutline && (
          <div className="w-full py-2 mb-3">
            {/* Segmented Control Container */}
            <div className="inline-flex w-full bg-gray-800/60 rounded-xl p-1.5 border border-gray-700/50">
              {workflowTabs.map((tab) => {
                const isActive = activeWorkflowTab === tab.key
                const status = getStepStatus(tab.key)
                const tooltipText = tab.key === 'dialogueAction'
                  ? 'Review script, generate narration, dialogue, music & SFX audio'
                  : 'Build storyboard keyframes, generate video beats & render final scene'
                
                return (
                  <TooltipProvider key={tab.key} delayDuration={400}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveWorkflowTab(tab.key)
                            if (!isWorkflowOpen && onWorkflowOpenChange) {
                              onWorkflowOpenChange(true)
                            }
                          }}
                          className={`
                            flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-lg
                            transition-all duration-200 ease-out relative
                            ${isActive 
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                            }
                          `}
                        >
                          {/* Icon - always visible */}
                          {React.cloneElement(tab.icon as React.ReactElement, { 
                            className: `w-5 h-5 ${isActive ? 'text-white' : ''}` 
                          })}
                          
                          {/* Large Section Title */}
                          <span className={`
                            text-xl font-bold tracking-wide
                            ${isActive ? 'text-white' : ''}
                          `}>
                            {tab.label}
                          </span>

                          {/* Completion indicator dot */}
                          {status === 'complete' && (
                            <span className="absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700 max-w-xs">
                        <p className="text-xs">{tooltipText}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
          </div>
        )}

        {/* Next Step CTA Banner — contextual workflow guidance (Script tab only) */}
        {!isOutline && isWorkflowOpen && activeWorkflowTab !== 'callAction' && (() => {
          const wfState: WorkflowState = buildWorkflowState(
            scene,
            sceneProductionData,
            { activeTab: activeWorkflowTab as WorkflowState['activeTab'], language: selectedLanguage }
          )
          return (
            <WorkflowNextStepBanner
              workflowState={wfState}
              className="mt-2 mb-1"
              onAction={(actionId, targetTab) => {
                if (targetTab && targetTab !== activeWorkflowTab) {
                  setActiveWorkflowTab(targetTab as WorkflowStep)
                }
                if (!isWorkflowOpen && onWorkflowOpenChange) {
                  onWorkflowOpenChange(true)
                }
              }}
              onNextScene={() => {
                if (onNavigateScene && totalScenes && sceneIdx < totalScenes - 1) {
                  onNavigateScene(sceneIdx + 1)
                }
              }}
            />
          )
        })()}

      </div>

      {/* Collapsible Content */}
      {isWorkflowOpen && (
        <div className="mt-3">
          {/* Prompt textarea hidden - accessible via drawer/builder */}
          
          {/* Validation Info Display */}
          {(() => {
            // Only show warning if validation failed and not dismissed
            const shouldShowWarning = validationInfo && 
              validationInfo.passed === false && 
              validationInfo.warning && 
              !validationInfo.dismissed

            // Show success indicator if validation passed with high confidence (≥90%) and not dismissed
            const shouldShowSuccess = validationInfo && 
              validationInfo.passed === true && 
              validationInfo.confidence >= 90 &&
              !validationInfo.dismissed

            if (shouldShowWarning) {
              return (
                <div className="mb-3 p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg">
                  {/* Clickable Header with Warning Icon */}
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-amber-500/10 -m-3 p-3 rounded-lg transition-colors"
                    onClick={onToggleWarningExpanded}
                  >
                    <div className="flex items-center gap-2 text-amber-200">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <span className="font-semibold text-sm">
                        Character Reference Not Applied ({validationInfo.confidence}% match)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`w-4 h-4 text-amber-300 transition-transform ${isWarningExpanded ? '' : 'rotate-180'}`} />
                    </div>
                  </div>
                  
                  {/* Collapsible Details */}
                  {isWarningExpanded && (
                    <div className="mt-2 pl-7 text-sm">
                      <div className="text-amber-300/80">{validationInfo.warning}</div>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="text-amber-300/80">
                          💡 Try regenerating with Max quality or upload a different reference image for better results.
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDismissValidationWarning?.()
                          }}
                          className="ml-auto px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            if (shouldShowSuccess) {
              return (
                <div className="mb-3 p-2 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-200 text-sm">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      <span>Character reference verified ({validationInfo.confidence}% match)</span>
                    </div>
                    <button
                      onClick={() => onDismissValidationWarning?.()}
                      className="text-green-300 hover:text-green-100 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            }

            return null
          })()}
          
          {/* Tab Content Container - No duplicate tabs, tabs are in header */}
          {!isOutline && (
            <div className="mt-4">
              <div className="bg-slate-800/30 rounded-lg p-4 min-h-[200px]">
                {/* Staleness Warning Banner */}
                {(() => {
                  // Direction is now hidden, so show Direction stale warning on Frame tab too
                  const directionStale = activeWorkflowTab === 'storyboardPreViz' && stepStaleness.directorsChair
                  const imageStale = activeWorkflowTab === 'storyboardPreViz' && stepStaleness.storyboardPreViz
                  const preVisStale = activeWorkflowTab === 'storyboardPreViz' && stepStaleness.preVisSync
                  
                  if (!directionStale && !imageStale && !preVisStale) return null
                  
                  const staleStepKey = directionStale
                    ? 'directorsChair'
                    : preVisStale
                      ? 'preVisSync'
                      : 'storyboardPreViz'
                  
                  return (
                    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-300">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium">
                          {directionStale
                            ? 'Script has changed. Re-edit the scene to refresh direction, or continue with the current summary.'
                            : preVisStale
                              ? 'Script has changed since pre-vis was generated — update frame prompts before regenerating.'
                              : 'Direction has changed. Consider regenerating Frame.'}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          {(preVisStale || imageStale) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (preVisStale && onSyncPreVisToScript) {
                                void onSyncPreVisToScript(sceneIdx)
                              } else if (imageStale && onGenerateImage) {
                                onGenerateImage(sceneIdx)
                              }
                            }}
                            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs rounded border border-amber-500/40 transition-colors"
                          >
                            {preVisStale
                                ? 'Update Pre-vis Frames'
                                : 'Regenerate Frame'}
                          </button>
                          )}
                          {onDismissStaleWarning && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDismissStaleWarning(sceneIdx, staleStepKey)
                              }}
                              className="px-2 py-1 text-amber-300/70 hover:text-amber-200 text-xs transition-colors"
                              title="Dismiss this warning"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}
                
                {activeWorkflowTab === 'dialogueAction' && (
                  <div className="space-y-4">
                  {/* Quick Actions Bar */}
                  <div className="sticky top-0 z-10 p-2 -mx-4 -mt-4 mb-4 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400 ml-2">Quick Actions</span>
                    </div>
                    <div className="flex items-center gap-2 mr-2">
                      {/* Edit Script Button */}
                      {!isOutline && onEditScene && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditScene(sceneIdx)
                                }}
                                className="px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all shadow-sm bg-blue-600 hover:bg-blue-500 text-white"
                              >
                                <Edit className="w-3 h-3" />
                                Direct
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Direct and revise scene script</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {/* Audio generation has moved to the "Express Audio" button in the Scene Beats card */}
                      {/* Language Stream Selector */}
                      <div className="flex items-center gap-1.5">
                        <GroupedLanguageSelector
                          value={selectedLanguage}
                          onValueChange={onLanguageChange}
                          size="xs"
                          intent="generate"
                          className="bg-gray-800 border-blue-500/30 text-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Scene Emotional Context Header */}
                  {(scene.sceneDirection?.mood || scene.mood || scene.sceneDirection?.tone || scene.tone || scene.sceneDirection?.pacing || scene.pacing) && (
                    <div className="p-3 bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-fuchsia-900/20 rounded-lg border border-indigo-500/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-semibold text-indigo-200">Scene Context</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(scene.sceneDirection?.mood || scene.mood) && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-indigo-400/70">Mood</span>
                            <span className="text-sm text-white/90 font-medium">{scene.sceneDirection?.mood || scene.mood}</span>
                          </div>
                        )}
                        {(scene.sceneDirection?.intent || scene.objective) && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-purple-400/70">Intent</span>
                            <span className="text-sm text-white/90 font-medium truncate">{scene.sceneDirection?.intent || scene.objective}</span>
                          </div>
                        )}
                        {(scene.sceneDirection?.pacing || scene.pacing) && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-fuchsia-400/70">Pacing</span>
                            <span className="text-sm text-white/90 font-medium capitalize">{scene.sceneDirection?.pacing || scene.pacing}</span>
                          </div>
                        )}
                        {(scene.sceneDirection?.tone || scene.tone) && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-amber-400/70">Tone</span>
                            <span className="text-sm text-white/90 font-medium">{scene.sceneDirection?.tone || scene.tone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {availableSceneTabs.length > 0 && (
                    <Tabs
                      value={activeSceneTab}
                      onValueChange={(v) => setActiveSceneTab(v as SceneScriptTab)}
                      className="w-full"
                    >
                      <div className="overflow-x-auto pb-1 -mx-1 px-1">
                        <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap gap-0.5 p-1">
                          {hasDirectionTab && (
                            <TabsTrigger value="direction" className="text-xs gap-1.5 px-2.5 py-1.5">
                              <Film className="w-3.5 h-3.5 shrink-0" />
                              Direction
                            </TabsTrigger>
                          )}
                          {hasBeatsTab && (
                            <TabsTrigger value="beats" className="text-xs gap-1.5 px-2.5 py-1.5">
                              <List className="w-3.5 h-3.5 shrink-0" />
                              Beats
                              <span className="text-[10px] opacity-60">
                                ({sceneBeatsForTabs.length}
                                {excludedBeatCount > 0 ? `, ${excludedBeatCount} ignored` : ''})
                              </span>
                            </TabsTrigger>
                          )}
                          {hasMusicTab && (
                            <TabsTrigger value="music" className="text-xs gap-1.5 px-2.5 py-1.5">
                              <Music className="w-3.5 h-3.5 shrink-0" />
                              Music
                            </TabsTrigger>
                          )}
                          {hasPreVisTab && (
                            <TabsTrigger value="previs" className="text-xs gap-1.5 px-2.5 py-1.5">
                              <Clapperboard className="w-3.5 h-3.5 shrink-0" />
                              Visualization
                              {preVisFrameStats.total > 0 && (
                                <span className="text-[10px] opacity-60">
                                  ({preVisFrameStats.withImage}/{preVisFrameStats.total})
                                </span>
                              )}
                            </TabsTrigger>
                          )}
                          {hasNarrationTab && (
                            <TabsTrigger value="narration" className="text-xs gap-1.5 px-2.5 py-1.5">
                              <Volume2 className="w-3.5 h-3.5 shrink-0" />
                              Narration
                            </TabsTrigger>
                          )}
                        </TabsList>
                      </div>

                  {/* Direction */}
                  {hasDirectionTab && (
                  <TabsContent value="direction" className="mt-3 focus-visible:outline-none">
                  {(() => {
                    const sceneDescription = scene.visualDescription || scene.action || scene.summary || scene.heading
                    const sceneDir = scene.sceneDirection
                    const hasDirection = !!sceneDir

                    return (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="space-y-3">
                            {/* Scene Description — plain-language narrative of what happens */}
                            {hasDirection && sceneDir.sceneDescription && (
                              <div className="text-sm text-gray-200 leading-relaxed bg-slate-800/50 rounded-md p-3 border border-slate-700/50">
                                <span className="text-[10px] uppercase tracking-wider text-cyan-400/80 font-semibold block mb-1.5">Scene Description</span>
                                {sceneDir.sceneDescription}
                              </div>
                            )}
                            {/* Show visual description as the base */}
                            {sceneDescription && (
                              <div className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                                "{sceneDescription}"
                              </div>
                            )}
                            {/* Show detailed direction sections */}
                            {hasDirection && (
                              <div className="pt-2 border-t border-blue-200 dark:border-blue-700 space-y-2">
                                {sceneDir.scene?.atmosphere && (
                                  <div className="text-xs">
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">Atmosphere:</span>
                                    <span className="ml-1 text-gray-600 dark:text-gray-400">{sceneDir.scene.atmosphere}</span>
                                  </div>
                                )}
                                {sceneDir.scene?.location && (
                                  <div className="text-xs">
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">Location:</span>
                                    <span className="ml-1 text-gray-600 dark:text-gray-400">{sceneDir.scene.location}</span>
                                  </div>
                                )}
                                {sceneDir.scene?.keyProps && sceneDir.scene.keyProps.length > 0 && (
                                  <div className="text-xs">
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">Key Props:</span>
                                    <span className="ml-1 text-gray-600 dark:text-gray-400">{sceneDir.scene.keyProps.join(', ')}</span>
                                  </div>
                                )}
                                {sceneDir.camera && (
                                  <div className="text-xs">
                                    <span className="font-semibold text-purple-600 dark:text-purple-400">Camera:</span>
                                    <span className="ml-1 text-gray-600 dark:text-gray-400">
                                      {[
                                        sceneDir.camera.shots?.join(', '),
                                        sceneDir.camera.angle,
                                        sceneDir.camera.movement
                                      ].filter(Boolean).join(' • ')}
                                    </span>
                                  </div>
                                )}
                                {sceneDir.lighting && (
                                  <div className="text-xs">
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">Lighting:</span>
                                    <span className="ml-1 text-gray-600 dark:text-gray-400">
                                      {[
                                        sceneDir.lighting.overallMood,
                                        sceneDir.lighting.timeOfDay,
                                        sceneDir.lighting.colorTemperature
                                      ].filter(Boolean).join(' • ')}
                                    </span>
                                  </div>
                                )}
                                {sceneDir.talent && (
                                  <div className="text-xs">
                                    <span className="font-semibold text-green-600 dark:text-green-400">Talent:</span>
                                    <span className="ml-1 text-gray-600 dark:text-gray-400">
                                      {sceneDir.talent.emotionalBeat || sceneDir.talent.blocking}
                                    </span>
                                  </div>
                                )}
                                {sceneDir.audio && (
                                  <div className="text-xs">
                                    <span className="font-semibold text-pink-600 dark:text-pink-400">Audio:</span>
                                    <span className="ml-1 text-gray-600 dark:text-gray-400">
                                      {sceneDir.audio.priorities || sceneDir.audio.considerations}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                      </div>
                    )
                  })()}
                  </TabsContent>
                  )}

                  {/* Narration */}
                  {hasNarrationTab && (
                  <TabsContent value="narration" className="mt-3 focus-visible:outline-none">
                  {(() => {
                    const narrationUrl = scene.narrationAudio?.[selectedLanguage]?.url || (selectedLanguage === 'en' ? scene.narrationAudioUrl : undefined)
                    
                    return (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-end gap-2 mb-2">
                        {narrationUrl && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1 mr-auto">
                            <Volume2 className="w-3 h-3" />
                            {scene.narrationAudio?.[selectedLanguage]?.duration 
                              ? `${scene.narrationAudio[selectedLanguage].duration.toFixed(1)}s`
                              : 'Ready'}
                          </span>
                        )}
                        {narrationUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onPlayAudio?.(narrationUrl, 'narration', scene.id || scene.sceneId || `scene-${sceneIdx}`)
                              }}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Play Narration"
                            >
                              {playingAudio === narrationUrl ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                setGeneratingDialogue?.({ sceneIdx, character: '__narration__' })
                                overlayStore?.show(`Regenerating narration for Scene ${sceneIdx + 1}...`, 20)
                                try {
                                  await onGenerateSceneAudio?.(sceneIdx, 'narration', undefined, undefined, selectedLanguage)
                                  overlayStore?.hide()
                                } catch (error) {
                                  console.error('[ScriptPanel] Narration regeneration failed:', error)
                                  overlayStore?.hide()
                                  toast.error('Failed to regenerate narration')
                                } finally {
                                  setGeneratingDialogue?.(null)
                                }
                              }}
                              disabled={generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__narration__'}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded disabled:opacity-50"
                              title="Regenerate Narration Audio"
                            >
                              {generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__narration__' ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                void downloadSceneAudioFile(e, narrationUrl, {
                                  sceneNumber: sceneIdx + 1,
                                  track: 'narration',
                                })
                              }}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Download Narration"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Delete narration audio? You can regenerate it later.')) {
                                  onDeleteSceneAudio?.(sceneIdx, 'narration')
                                }
                              }}
                              className="p-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded text-red-500 dark:text-red-400"
                              title="Delete Narration Audio"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                uploadAudio?.(sceneIdx, 'narration')
                              }}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Upload Narration Audio"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                setGeneratingDialogue?.({ sceneIdx, character: '__narration__' })
                                overlayStore?.show(`Generating narration for Scene ${sceneIdx + 1}...`, 20)
                                try {
                                  await onGenerateSceneAudio?.(sceneIdx, 'narration', undefined, undefined, selectedLanguage)
                                  overlayStore?.hide()
                                } catch (error) {
                                  console.error('[ScriptPanel] Narration generation failed:', error)
                                  overlayStore?.hide()
                                  toast.error('Failed to generate narration')
                                } finally {
                                  setGeneratingDialogue?.(null)
                                }
                              }}
                              disabled={generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__narration__'}
                              className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50 flex items-center gap-1"
                            >
                              {generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__narration__' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : null}
                              Generate Audio
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                uploadAudio?.(sceneIdx, 'narration')
                              }}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Upload Narration Audio"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                        "{scene.narration}"
                      </div>
                    </div>
                  )
                  })()}
                  </TabsContent>
                  )}

                  {/* Pre-Vis */}
                  {hasPreVisTab && (
                  <TabsContent value="previs" className="mt-3 focus-visible:outline-none">
                  <SceneStoryboardFrameViewer
                    hideOuterChrome
                    scene={scene}
                    sceneIndex={sceneIdx}
                    sceneNumber={sceneNumber}
                    prompt={scenePrompt || scene.imagePrompt || ''}
                    characters={characters}
                    objectReferences={objectReferences}
                    selectedLanguage={selectedLanguage}
                    narrationVoice={narrationVoice}
                    expressPhaseStatus={expressStatus?.[sceneIdx]}
                    expressGateBlocked={expressGateBlocked}
                    onExpressGateBlocked={onExpressGateBlocked}
                    isExpressRunning={isExpressRunning}
                    isGeneratingScene={isGeneratingImage}
                    onGenerateScene={
                      onGenerateImage
                        ? async (p) => {
                            await onGenerateImage(sceneIdx)
                          }
                        : undefined
                    }
                    onGenerateDialogueFrame={
                      onGenerateDialogueFrame
                        ? (dialogueIdx) => onGenerateDialogueFrame(sceneIdx, dialogueIdx)
                        : undefined
                    }
                    onGenerateBeatFrame={
                      onGenerateBeatFrame
                        ? (beatId) => onGenerateBeatFrame(sceneIdx, beatId)
                        : undefined
                    }
                    onDirectFrame={
                      onDirectFrame ? (slot) => onDirectFrame(sceneIdx, slot) : undefined
                    }
                    onUploadDialogueFrame={
                      onUploadDialogueFrame
                        ? (dialogueIdx, file) => onUploadDialogueFrame(sceneIdx, dialogueIdx, file)
                        : undefined
                    }
                    onUploadBeatFrame={
                      onUploadBeatFrame
                        ? (beatId, file) => onUploadBeatFrame(sceneIdx, beatId, file)
                        : undefined
                    }
                    onUploadScene={
                      onUploadStoryboardScene
                        ? (file) => onUploadStoryboardScene(sceneIdx, file)
                        : undefined
                    }
                    onSaveEditedScene={
                      onSaveEditedStoryboardScene
                        ? (url) => onSaveEditedStoryboardScene(sceneIdx, url)
                        : undefined
                    }
                    onSaveEditedBeatFrame={
                      onSaveEditedBeatFrame
                        ? (beatId, url) => onSaveEditedBeatFrame(sceneIdx, beatId, url)
                        : undefined
                    }
                    onSaveEditedDialogueFrame={
                      onSaveEditedDialogueFrame
                        ? (dialogueIdx, url) => onSaveEditedDialogueFrame(sceneIdx, dialogueIdx, url)
                        : undefined
                    }
                    onSaveEditedCustomFrame={
                      onSaveEditedCustomFrame
                        ? (frameId, url) => onSaveEditedCustomFrame(sceneIdx, frameId, url)
                        : undefined
                    }
                    onExpressSceneGenerate={
                      onExpressSceneGenerate
                        ? (opts) => onExpressSceneGenerate(sceneIdx, selectedLanguage, opts)
                        : undefined
                    }
                    onFinalizeScene={
                      onFinalizeStoryboardScene
                        ? () => onFinalizeStoryboardScene(sceneIdx, selectedLanguage)
                        : undefined
                    }
                    onSyncPreVisToScript={
                      onSyncPreVisToScript ? () => onSyncPreVisToScript(sceneIdx) : undefined
                    }
                    onAddStoryboardFrame={
                      onAddStoryboardFrame ? () => onAddStoryboardFrame(sceneIdx) : undefined
                    }
                    onDeleteStoryboardFrame={
                      onDeleteStoryboardFrame
                        ? (frameId) => onDeleteStoryboardFrame(sceneIdx, frameId)
                        : undefined
                    }
                    onGenerateCustomFrame={
                      onGenerateCustomFrame
                        ? (frameId) => onGenerateCustomFrame(sceneIdx, frameId)
                        : undefined
                    }
                    onUploadCustomFrame={
                      onUploadCustomFrame
                        ? (frameId, file) => onUploadCustomFrame(sceneIdx, frameId, file)
                        : undefined
                    }
                  />
                  </TabsContent>
                  )}

                  {/* Beats */}
                  {hasBeatsTab && (
                  <TabsContent value="beats" className="mt-3 focus-visible:outline-none">
                  {(() => {
                    const timelineBeats = sceneBeatsForTabs
                    const sceneSfxList = Array.isArray(scene.sfx) ? scene.sfx : []
                    const sfxByBeatId = new Map<string, Array<{ description: string; idx: number }>>()
                    sceneSfxList.forEach((raw: unknown, idx: number) => {
                      const entry =
                        typeof raw === 'string'
                          ? { description: raw.trim() }
                          : (raw as { description?: string; sourceBeatId?: string })
                      const description = String(
                        entry?.description ?? (typeof raw === 'string' ? raw : '')
                      ).trim()
                      const beatId = entry?.sourceBeatId
                      if (!description || !beatId) return
                      const list = sfxByBeatId.get(beatId) ?? []
                      list.push({ description, idx })
                      sfxByBeatId.set(beatId, list)
                    })
                    const parseInlineBeatSfx = (actionText?: string) => {
                      if (!actionText?.trim()) return [] as string[]
                      return actionText
                        .split('\n')
                        .map((line) => line.trim())
                        .filter((line) => /^SFX:/i.test(line))
                        .map((line) => line.replace(/^SFX:\s*/i, '').trim())
                        .filter(Boolean)
                    }
                    const hasSceneMusic = !!(scene.musicAudio || scene.music?.url)
                    let spokenBeatCursor = 0
                    return (
                    <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-700/50">
                      <div className="flex items-center justify-end gap-2 mb-3 flex-wrap">
                        {(() => {
                          const hasAudioContent =
                            (Array.isArray(scene.dialogue) && scene.dialogue.length > 0) ||
                            !!String(scene.narration || '').trim() ||
                            !!scene.music ||
                            expressSfxBeatOptions.length > 0
                          if (!hasAudioContent) return null

                          const voicesReady = productionReadiness?.isAudioReady ?? true
                          const hasNarrationVoice = productionReadiness?.hasNarrationVoice ?? true
                          const missingVoices = productionReadiness?.charactersMissingVoices || []
                          const isDisabled =
                            isExpressAudioRunning || !voicesReady || !hasNarrationVoice

                          const button = (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-violet-400/60 text-violet-200 hover:bg-violet-900/30"
                              disabled={isDisabled}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!isExpressAudioRunning && voicesReady && hasNarrationVoice) {
                                  setExpressAudioDialogOpen(true)
                                }
                              }}
                            >
                              {isExpressAudioRunning ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Express Audio...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Express Audio
                                  {(!voicesReady || !hasNarrationVoice) && (
                                    <span className="ml-1 text-amber-400">⚠</span>
                                  )}
                                </>
                              )}
                            </Button>
                          )

                          if (!voicesReady || !hasNarrationVoice) {
                            return (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                                  <TooltipContent side="bottom" className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700 max-w-xs">
                                    <div className="space-y-1">
                                      <p className="font-medium text-amber-400 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Voice Setup Required
                                      </p>
                                      {!hasNarrationVoice && (
                                        <p className="text-xs text-gray-300">• Assign a narrator voice</p>
                                      )}
                                      {missingVoices.length > 0 && (
                                        <p className="text-xs text-gray-300">
                                          • Assign voices to: {missingVoices.slice(0, 3).join(', ')}
                                          {missingVoices.length > 3 && ` +${missingVoices.length - 3} more`}
                                        </p>
                                      )}
                                      <p className="text-[10px] text-gray-500 pt-1">
                                        Set up voices in the Reference Library
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          }

                          return button
                        })()}
                        {/* Voice Casting Quick View — dialogue characters only */}
                        {scene.dialogue && scene.dialogue.length > 0 && (
                        <div className="flex items-center gap-1">
                          {(() => {
                            // Get dialogue audio array for current language
                            let castingDialogueAudioArray: any[] = []
                            if (Array.isArray(scene.dialogueAudio)) {
                              castingDialogueAudioArray = scene.dialogueAudio
                            } else if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object') {
                              castingDialogueAudioArray = scene.dialogueAudio[selectedLanguage] || []
                            }
                            return Array.from(new Set(scene.dialogue.map((d: any) => d.character))).slice(0, 4).map((character: any) => {
                            const charDialogues = scene.dialogue.filter((d: any) => d.character === character)
                            const charAudioReady = charDialogues.filter((d: any, idx: number) => {
                              const dialogueIndex = scene.dialogue.findIndex((dd: any, i: number) => dd === d && i <= idx)
                              const audioEntry = castingDialogueAudioArray.find((a: any) => 
                                a.character === character && a.dialogueIndex === dialogueIndex
                              )
                              return audioEntry?.audioUrl
                            }).length
                            const allReady = charAudioReady === charDialogues.length
                            
                            return (
                            <TooltipProvider key={character}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${
                                    allReady 
                                      ? 'bg-blue-600/30 text-blue-200 border-blue-500/40' 
                                      : charAudioReady > 0
                                      ? 'bg-yellow-800/50 text-yellow-300 border-yellow-600/30'
                                      : 'bg-slate-700/40 text-slate-300 border-slate-600/40'
                                  }`}>
                                    {character?.slice(0, 2)?.toUpperCase() || '??'}
                                    <span className="text-[8px] opacity-70">({charDialogues.length})</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border border-gray-700">
                                  <p className="text-xs font-medium">{character}</p>
                                  <p className="text-[10px] text-gray-400">{charDialogues.length} {charDialogues.length === 1 ? 'line' : 'lines'} • {charAudioReady} audio ready</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )})
                          })()}
                          {Array.from(new Set(scene.dialogue.map((d: any) => d.character))).length > 4 && (
                            <span className="text-[10px] text-gray-500">+{Array.from(new Set(scene.dialogue.map((d: any) => d.character))).length - 4}</span>
                          )}
                          {/* Resync Audio Timing Button */}
                          {onResyncAudioTiming && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onResyncAudioTiming(sceneIdx, selectedLanguage)
                                    }}
                                    disabled={resyncingAudioSceneIndex === sceneIdx}
                                    className="ml-2 p-1 rounded hover:bg-blue-900/30 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                                  >
                                    {resyncingAudioSceneIndex === sceneIdx ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border border-gray-700">
                                  <p className="text-xs">Resync audio timing</p>
                                  <p className="text-[10px] text-gray-400">Recalculate start times after edits</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        )}
                      </div>
                      <div className="space-y-3">
                      {timelineBeats.map((beat, beatIndex) => {
                        const beatNumber =
                          (typeof beat.sequenceIndex === 'number' ? beat.sequenceIndex : beatIndex) + 1
                        if (beat.kind === 'action') {
                          const beatSfx = sfxByBeatId.get(beat.beatId) ?? []
                          const inlineSfx =
                            beatSfx.length === 0 && sceneSfxList.length === 0
                              ? parseInlineBeatSfx(beat.actionDescription)
                              : []
                          const sfxLabels = [
                            ...beatSfx.map((s) => s.description),
                            ...inlineSfx,
                          ]
                          return (
                            <div
                              key={beat.beatId}
                              className={`p-3 bg-slate-800/35 rounded-lg border border-slate-600/40 ${
                                beat.excluded ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/40 font-medium tabular-nums shrink-0">
                                  Beat {beatNumber}
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                                  Action
                                </span>
                                {beat.excluded && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">
                                    Excluded
                                  </span>
                                )}
                                {beat.beatRole === 'title_reveal' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                    Title
                                  </span>
                                )}
                                </div>
                                <BeatExcludeToggle
                                  beat={beat}
                                  sceneIdx={sceneIdx}
                                  scenes={scenes}
                                  script={script}
                                  onScriptChange={onScriptChange}
                                />
                                {hasSceneMusic && (
                                  <BeatMusicToggle
                                    beat={beat}
                                    sceneIdx={sceneIdx}
                                    scenes={scenes}
                                    script={script}
                                    onScriptChange={onScriptChange}
                                  />
                                )}
                              </div>
                              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                                {beat.actionDescription?.trim() || 'No action description'}
                              </p>
                              {sfxLabels.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {sfxLabels.map((label, sfxIdx) => (
                                    <span
                                      key={`${beat.beatId}-sfx-${sfxIdx}`}
                                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-200 border border-blue-500/25"
                                    >
                                      <VolumeIcon className="w-3 h-3 shrink-0" />
                                      SFX: {label.length > 56 ? `${label.slice(0, 56)}…` : label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <ActionBeatSfxControls
                                beat={beat}
                                scene={scene}
                                sceneIdx={sceneIdx}
                                projectId={projectId}
                                segmentDurationSeconds={scene.duration}
                                playingAudio={playingAudio}
                                expressSelectable={expressSfxBeatOptions.length > 0}
                                expressSelected={selectedExpressBeatIds.has(beat.beatId)}
                                onExpressSelectedChange={toggleExpressBeatSelection}
                                expressStatus={expressBeatStatus[beat.beatId]}
                                isExpressRunning={isExpressSfxRunning}
                                onPlayAudio={onPlayAudio}
                                onSaveSfxAudio={onSaveSfxAudio}
                              />
                            </div>
                          )
                        }

                        const dialogueLines = Array.isArray(scene.dialogue) ? scene.dialogue : []
                        let dialogueIndex = spokenBeatCursor
                        if (beat.lineId?.trim()) {
                          const byLineId = dialogueLines.findIndex(
                            (entry: { lineId?: string }) => entry?.lineId === beat.lineId
                          )
                          if (byLineId >= 0) dialogueIndex = byLineId
                        }
                        spokenBeatCursor = Math.max(spokenBeatCursor + 1, dialogueIndex + 1)
                        const d = dialogueLines[dialogueIndex] ?? {
                          character: beat.character,
                          line: beat.line,
                          lineId: beat.lineId,
                          kind: beat.kind,
                          characterId: beat.characterId,
                        }
                        const i = dialogueIndex
                        const audioEntry = findDialogueAudioForLine(scene, {
                          language: selectedLanguage,
                          lineId: d.lineId,
                          dialogueIndex: i,
                          character: d.character,
                        })
                        const dialogueAudioUrl = audioEntry?.audioUrl || audioEntry?.url
                        const sceneKey = scene.id || scene.sceneId || `scene-${sceneIdx}`
                        // Extract parenthetical voice direction from line (e.g., "(angrily) I'm fine")
                        const dialogueLineText = coerceDialogueLineText(d.line ?? d.text)
                        const parentheticalMatch = dialogueLineText.match(/^\(([^)]+)\)\s*/)
                        const parenthetical = parentheticalMatch?.[1]
                        const lineWithoutParenthetical = parenthetical
                          ? dialogueLineText.replace(/^\([^)]+\)\s*/, '')
                          : dialogueLineText
                        
                        const isNarrationBeat = beat.kind === 'narration'
                        
                        return (
                          <div
                            key={beat.beatId}
                            className={`p-3 rounded-lg border transition-colors ${
                              isNarrationBeat
                                ? 'bg-indigo-900/20 border-indigo-700/30 hover:border-indigo-600/40'
                                : 'bg-blue-900/20 border-blue-700/30 hover:border-blue-600/40'
                            } ${beat.excluded ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/40 font-medium tabular-nums shrink-0">
                                    Beat {beatNumber}
                                  </span>
                                  <div className={`text-sm font-semibold ${isNarrationBeat ? 'text-indigo-200' : 'text-blue-200'}`}>
                                    {isNarrationBeat ? 'Narration' : d.character}
                                  </div>
                                  {beat.excluded && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">
                                      Excluded
                                    </span>
                                  )}
                                  {/* Voice direction / parenthetical */}
                                  {(parenthetical || d.voiceDirection || d.emotion) && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-300 border border-slate-600/40 italic">
                                      {parenthetical || d.voiceDirection || d.emotion}
                                    </span>
                                  )}
                                  {dialogueAudioUrl && (
                                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                                      <Volume2 className="w-3 h-3" />
                                      Ready
                                    </span>
                                  )}
                                  </div>
                                  <BeatExcludeToggle
                                    beat={beat}
                                    sceneIdx={sceneIdx}
                                    scenes={scenes}
                                    script={script}
                                    onScriptChange={onScriptChange}
                                  />
                                  {hasSceneMusic && (
                                    <BeatMusicToggle
                                      beat={beat}
                                      sceneIdx={sceneIdx}
                                      scenes={scenes}
                                      script={script}
                                      onScriptChange={onScriptChange}
                                    />
                                  )}
                                </div>
                                <div className="text-sm text-gray-200 leading-relaxed">"{lineWithoutParenthetical}"</div>
                                {audioEntry?.duration && (
                                  <span className="text-[10px] text-gray-500 mt-1">Duration: {audioEntry.duration.toFixed(1)}s</span>
                                )}
                              </div>
                            {dialogueAudioUrl ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onPlayAudio?.(dialogueAudioUrl, d.character, sceneKey)
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                  title="Play Dialogue"
                                >
                                  {playingAudio === dialogueAudioUrl ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    if (!onGenerateSceneAudio) return
                                    
                                    setGeneratingDialogue?.({ sceneIdx, character: d.character, dialogueIndex: i })
                                    overlayStore?.show(`Regenerating dialogue for ${d.character}...`, 15)
                                    try {
                                      await onGenerateSceneAudio?.(sceneIdx, 'dialogue', d.character, i, selectedLanguage)
                                      overlayStore?.hide()
                                    } catch (error) {
                                      console.error('[ScriptPanel] Dialogue regeneration failed:', error)
                                      overlayStore?.hide()
                                      toast.error('Failed to regenerate dialogue')
                                    } finally {
                                      setGeneratingDialogue?.(null)
                                    }
                                  }}
                                  disabled={generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === d.character && generatingDialogue?.dialogueIndex === i}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                                  title="Regenerate Dialogue Audio"
                                >
                                  {generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === d.character && generatingDialogue?.dialogueIndex === i ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    void downloadSceneAudioFile(e, audioEntry.audioUrl, {
                                      sceneNumber: sceneIdx + 1,
                                      track: 'dialogue',
                                      character: d.character,
                                      index: i,
                                    })
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                  title="Download Dialogue"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (confirm(`Delete ${d.character}'s dialogue audio? You can regenerate it later.`)) {
                                      onDeleteSceneAudio?.(sceneIdx, 'dialogue', i)
                                    }
                                  }}
                                  className="p-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded text-red-500 dark:text-red-400"
                                  title="Delete Dialogue Audio"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    uploadAudio?.(sceneIdx, 'dialogue', undefined, i, d.character)
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                  title="Upload Dialogue Audio"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    if (!onGenerateSceneAudio) {
                                      console.error('[ScriptPanel] onGenerateSceneAudio is not defined!')
                                      return
                                    }
                                    
                                    setGeneratingDialogue?.({ sceneIdx, character: d.character, dialogueIndex: i })
                                    overlayStore?.show(`Generating dialogue for ${d.character}...`, 15)
                                    
                                    try {
                                      await onGenerateSceneAudio?.(sceneIdx, 'dialogue', d.character, i, selectedLanguage)
                                      overlayStore?.hide()
                                    } catch (error) {
                                      console.error('[ScriptPanel] Dialogue generation failed:', error)
                                      overlayStore?.hide()
                                      toast.error(`Failed to generate dialogue for ${d.character}`)
                                    } finally {
                                      setGeneratingDialogue?.(null)
                                    }
                                  }}
                                  disabled={generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === d.character && generatingDialogue?.dialogueIndex === i}
                                  className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                                >
                                  {generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === d.character && generatingDialogue?.dialogueIndex === i ? (
                                    <div className="flex items-center gap-1">
                                      <Loader className="w-3 h-3 animate-spin" />
                                      Generating...
                                    </div>
                                  ) : (
                                    'Generate'
                                  )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  uploadAudio?.(sceneIdx, 'dialogue', undefined, i, d.character)
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                title="Upload Dialogue Audio"
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                            </div>
                            )}
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    </div>
                    )
                  })()}
                  </TabsContent>
                  )}

                  {/* Music */}
                  {hasMusicTab && (
                  <TabsContent value="music" className="mt-3 focus-visible:outline-none">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-end gap-2 mb-2">
                        {scene.musicAudio && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1 mr-auto">
                            <Volume2 className="w-3 h-3" />
                            Audio Ready
                          </span>
                        )}
                        {scene.musicAudio ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onPlayAudio?.(scene.musicAudio, 'music')
                              }}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Play Music"
                            >
                              {playingAudio === scene.musicAudio ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                setGeneratingMusic?.(sceneIdx)
                                try {
                                  await generateMusic?.(sceneIdx, false, musicPlayDuration)
                                } catch (error) {
                                  console.error('[ScriptPanel] Music regeneration failed:', error)
                                } finally {
                                  setGeneratingMusic?.(null)
                                }
                              }}
                              disabled={generatingMusic === sceneIdx}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded disabled:opacity-50"
                              title="Regenerate Music"
                            >
                              {generatingMusic === sceneIdx ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                void downloadSceneAudioFile(e, scene.musicAudio, {
                                  sceneNumber: sceneIdx + 1,
                                  track: 'music',
                                })
                              }}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Download Music"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Delete background music? You can regenerate it later.')) {
                                  onDeleteSceneAudio?.(sceneIdx, 'music')
                                }
                              }}
                              className="p-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded text-red-500 dark:text-red-400"
                              title="Delete Music Audio"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                uploadAudio?.(sceneIdx, 'music')
                              }}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Upload Music Audio"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                setGeneratingMusic?.(sceneIdx)
                                try {
                                  await generateMusic?.(sceneIdx, false, musicPlayDuration)
                                } catch (error) {
                                  console.error('[ScriptPanel] Music generation failed:', error)
                                } finally {
                                  setGeneratingMusic?.(null)
                                }
                              }}
                              disabled={generatingMusic === sceneIdx}
                              className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
                            >
                              {generatingMusic === sceneIdx ? (
                                <div className="flex items-center gap-1">
                                  <Loader className="w-3 h-3 animate-spin" />
                                  Generating...
                                </div>
                              ) : (
                                'Generate'
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                uploadAudio?.(sceneIdx, 'music')
                              }}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Upload Music Audio"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="whitespace-nowrap">Play duration (s)</span>
                          <input
                            type="number"
                            min={5}
                            max={600}
                            step={1}
                            value={musicPlayDuration}
                            onChange={(e) => {
                              const next = parseInt(e.target.value, 10)
                              if (Number.isFinite(next) && next >= 5) {
                                setMusicPlayDuration(Math.min(600, next))
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 px-2 py-1 text-xs rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                          />
                        </label>
                        <span className="text-[10px] text-gray-500 dark:text-gray-500">
                          Lyria generates ~30s clips; longer durations loop in the Mixer.
                        </span>
                        {typeof scene.musicFileDuration === 'number' && scene.musicFileDuration > 0 && (
                          <span className="text-[10px] text-gray-500">
                            Clip length: ~{Math.round(scene.musicFileDuration)}s
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 italic">
                        {typeof scene.music === 'string' ? scene.music : scene.music.description}
                      </div>
                    </div>
                  </TabsContent>
                  )}

                    </Tabs>
                  )}

                  </div>
                )}

                {activeWorkflowTab === 'directorsChair' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Film className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-200">Scene Direction</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {scene.sceneDirection && (
                            <Button 
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-800/50"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDirectionBuilderOpen(true)
                              }}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          )}
                          <Button 
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-800/50"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDirectionBuilderOpen(true)
                            }}
                            disabled={generatingDirectionFor === sceneIdx}
                          >
                            {generatingDirectionFor === sceneIdx ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Generating...
                              </>
                            ) : scene.sceneDirection ? (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Regenerate
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 mr-1" />
                                Generate
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      {scene.sceneDirection ? (
                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {typeof scene.sceneDirection === 'string' ? (
                            scene.sceneDirection
                          ) : (
                            <div className="space-y-3 mt-2">
                              {scene.sceneDirection.scene && (
                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded">
                                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 text-xs uppercase mb-1">Visual</h4>
                                  <p className="text-gray-700 dark:text-gray-300">{typeof scene.sceneDirection.scene === 'string' ? scene.sceneDirection.scene : JSON.stringify(scene.sceneDirection.scene)}</p>
                                </div>
                              )}
                              {scene.sceneDirection.camera && (
                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded">
                                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 text-xs uppercase mb-1">Camera</h4>
                                  <p className="text-gray-700 dark:text-gray-300">{typeof scene.sceneDirection.camera === 'string' ? scene.sceneDirection.camera : JSON.stringify(scene.sceneDirection.camera)}</p>
                                </div>
                              )}
                              {scene.sceneDirection.lighting && (
                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded">
                                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 text-xs uppercase mb-1">Lighting</h4>
                                  <p className="text-gray-700 dark:text-gray-300">{typeof scene.sceneDirection.lighting === 'string' ? scene.sceneDirection.lighting : JSON.stringify(scene.sceneDirection.lighting)}</p>
                                </div>
                              )}
                              {scene.sceneDirection.audio && (
                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded">
                                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 text-xs uppercase mb-1">Audio</h4>
                                  <p className="text-gray-700 dark:text-gray-300">{typeof scene.sceneDirection.audio === 'string' ? scene.sceneDirection.audio : JSON.stringify(scene.sceneDirection.audio)}</p>
                                </div>
                              )}
                              {scene.sceneDirection.talent && (
                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded">
                                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 text-xs uppercase mb-1">Talent</h4>
                                  <p className="text-gray-700 dark:text-gray-300">{typeof scene.sceneDirection.talent === 'string' ? scene.sceneDirection.talent : JSON.stringify(scene.sceneDirection.talent)}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm italic">
                          No scene direction generated yet.
                        </div>
                      )}
                    </div>
                    
                    {/* Scene Direction Builder Dialog */}
                    <SceneDirectionBuilder
                      open={directionBuilderOpen}
                      onClose={() => setDirectionBuilderOpen(false)}
                      scene={scene}
                      existingDirection={scene.sceneDirection}
                      onGenerate={() => {
                        setDirectionBuilderOpen(false)
                      }}
                      isGenerating={generatingDirectionFor === sceneIdx}
                    />
                  </div>
                )}


                {activeWorkflowTab === 'callAction' && (
                  <SceneDirectionProvider direction={scene.detailedDirection || scene.sceneDirection}>
                  <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                    {/* Audio Not Generated Warning — soft gate instead of tab lock */}
                    {!stepCompletion.dialogueAction && (() => {
                      // Build specific list of missing audio
                      const missing: string[] = []
                      if (scene.narration?.trim()) {
                        const narrUrl = scene.narrationAudio?.[selectedLanguage]?.url || (selectedLanguage === 'en' ? scene.narrationAudioUrl : undefined)
                        if (!narrUrl) missing.push('Narration')
                      }
                      const dialogueLines = scene.dialogue || []
                      if (dialogueLines.length > 0) {
                        let dialogueAudioArray: any[] = []
                        if (Array.isArray(scene.dialogueAudio)) {
                          dialogueAudioArray = selectedLanguage === 'en' ? scene.dialogueAudio : []
                        } else if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object') {
                          dialogueAudioArray = scene.dialogueAudio[selectedLanguage] || []
                        }
                        
                        const missingCount = dialogueLines.filter((d: any, idx: number) => {
                          const char = characters.find(c => c.name === d.character)
                          if (!char?.voiceConfig) {
                            return false // Skip lines without a voice assigned
                          }
                          return !dialogueAudioArray.find((a: any) => a?.dialogueIndex === idx && a?.audioUrl)
                        }).length
                        
                        if (missingCount > 0) missing.push(`${missingCount} dialogue line${missingCount > 1 ? 's' : ''}`)
                      }
                      const missingText = missing.length > 0 ? missing.join(' and ') : 'Audio'
                      return (
                        <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <Volume2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-blue-200">{missingText} not generated yet — your animatic and renders will be silent.</p>
                            <p className="text-xs text-blue-200/60 mt-0.5">Generate audio in the Script tab first for the best production quality.</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveWorkflowTab('dialogueAction')
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded transition-colors whitespace-nowrap"
                          >
                            Go to Script
                          </button>
                        </div>
                      )
                    })()}
                    {/* Scene Image Requirement Warning */}
                    {sceneImageWarning.show && (
                      <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm text-amber-200">{sceneImageWarning.message}</p>
                          <p className="text-xs text-amber-200/60 mt-0.5">
                            Reference images help maintain character and scene consistency across video segments.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleQuickGenerate}
                            className="px-3 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded transition-colors"
                          >
                            Quick Generate
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenPromptBuilder?.(sceneIdx)
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded transition-colors flex items-center gap-1.5"
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            Builder
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* ==================== SHOOT TABS: Review / Video / Mixer / Streams ==================== */}
                    {availableShootTabs.length > 0 && !hasShootSegments && showShootReview && (
                      <Tabs
                        value={activeShootTab}
                        onValueChange={(v) => setActiveShootTab(v as ShootTab)}
                        className="w-full"
                      >
                        <div className="overflow-x-auto pb-1 -mx-1 px-1">
                          <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap gap-0.5 p-1">
                            <TabsTrigger value="review" className="text-xs gap-1.5 px-2.5 py-1.5">
                              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                              Review
                            </TabsTrigger>
                          </TabsList>
                        </div>
                        <TabsContent value="review" className="mt-3 focus-visible:outline-none">
                          <StoryboardReviewPanel
                            scene={scene}
                            sceneIndex={sceneIdx}
                            onApprove={onApproveStoryboard!}
                            isApproving={approvingStoryboardFor === sceneIdx}
                            hideOuterChrome
                          />
                        </TabsContent>
                      </Tabs>
                    )}

                    {hasShootSegments && (() => {
                      const workflowSceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
                      return (
                        <DirectorWorkflow
                          sceneId={workflowSceneId}
                          sceneNumber={sceneNumber}
                          projectId={projectId ?? ''}
                          productionData={sceneProductionData ?? null}
                          sceneImageUrl={scene.imageUrl}
                          scene={{
                            ...scene,
                            filmTitle: projectTitle || script?.title,
                            logline: projectLogline || script?.logline,
                            genre: script?.genre,
                            tone: script?.tone,
                            visualStyle: visualStyle,
                            sceneHeading: scene.sceneHeading,
                          }}
                          guideCharacters={(characters || []).map((c) => ({
                            name: c.name,
                            age: (c as { age?: string }).age,
                            gender: (c as { gender?: string }).gender,
                            ethnicity: (c as { ethnicity?: string }).ethnicity,
                          }))}
                          characters={(characters || []).map((c) => ({
                            name: c.name,
                            referenceImage: (c as { referenceImage?: string }).referenceImage,
                            description: c.description,
                            wardrobes: (c as {
                              wardrobes?: Array<{
                                id: string
                                name: string
                                headshotUrl?: string
                                fullBodyUrl?: string
                                previewImageUrl?: string
                              }>
                            }).wardrobes?.map(w => ({
                              id: w.id,
                              name: w.name,
                              headshotUrl: w.headshotUrl ?? w.previewImageUrl,
                              fullBodyUrl: w.fullBodyUrl ?? w.previewImageUrl,
                            })),
                          }))}
                          sceneReferences={sceneReferences}
                          objectReferences={objectReferences}
                          locationReferences={locationReferences}
                          onGenerate={onSegmentGenerate || (async () => {})}
                          onSegmentUpload={onSegmentUpload ? (segmentId, file) => onSegmentUpload(workflowSceneId, segmentId, file) : undefined}
                          onRenderedSceneUrlChange={onRenderedSceneUrlChange ? (url) => onRenderedSceneUrlChange(workflowSceneId, url) : undefined}
                          onProductionDataChange={onProductionDataChange ? (data) => onProductionDataChange(workflowSceneId, data) : undefined}
                          sceneIndex={sceneIdx}
                          onGenerateSceneAudio={onGenerateSceneAudio ? (idx, audioType, characterName, dialogueIndex, language) => onGenerateSceneAudio(idx, audioType, characterName, dialogueIndex, language) : undefined}
                          onGenerateAllAudio={onGenerateAllAudio}
                          isGeneratingAudio={isGeneratingAudio}
                          onSaveEditedKeyframe={onEditFrame}
                          onModerationReport={onModerationReport}
                          projectAspectRatio={projectAspectRatio}
                        >
                          {(slots) => (
                            <Tabs
                              value={activeShootTab}
                              onValueChange={(v) => setActiveShootTab(v as ShootTab)}
                              className="w-full"
                            >
                              <div className="overflow-x-auto pb-1 -mx-1 px-1">
                                <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap gap-0.5 p-1">
                                  {showShootReview && (
                                    <TabsTrigger value="review" className="text-xs gap-1.5 px-2.5 py-1.5">
                                      <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                                      Review
                                    </TabsTrigger>
                                  )}
                                  <TabsTrigger value="video" className="text-xs gap-1.5 px-2.5 py-1.5">
                                    <Film className="w-3.5 h-3.5 shrink-0" />
                                    Video
                                  </TabsTrigger>
                                  {slots.mixerBody != null && (
                                    <TabsTrigger value="mixer" className="text-xs gap-1.5 px-2.5 py-1.5">
                                      <Clapperboard className="w-3.5 h-3.5 shrink-0" />
                                      Mixer
                                    </TabsTrigger>
                                  )}
                                  <TabsTrigger value="streams" className="text-xs gap-1.5 px-2.5 py-1.5">
                                    <ListVideo className="w-3.5 h-3.5 shrink-0" />
                                    Streams
                                    {slots.streamCount > 0 && (
                                      <span className="text-[10px] opacity-60">({slots.streamCount})</span>
                                    )}
                                  </TabsTrigger>
                                </TabsList>
                              </div>

                              {showShootReview && (
                                <TabsContent value="review" className="mt-3 focus-visible:outline-none">
                                  <StoryboardReviewPanel
                                    scene={scene}
                                    sceneIndex={sceneIdx}
                                    onApprove={onApproveStoryboard!}
                                    isApproving={approvingStoryboardFor === sceneIdx}
                                    hideOuterChrome
                                  />
                                </TabsContent>
                              )}

                              <TabsContent value="video" className="mt-3 focus-visible:outline-none">
                                {slots.videoSection}
                              </TabsContent>

                              {slots.mixerBody != null && (
                                <TabsContent value="mixer" className="mt-3 focus-visible:outline-none">
                                  <div id={`production-mixer-${workflowSceneId}`} className="scroll-mt-4">
                                    {slots.mixerBody}
                                  </div>
                                </TabsContent>
                              )}

                              <TabsContent value="streams" className="mt-3 focus-visible:outline-none overflow-hidden">
                                {slots.streamsBody}
                              </TabsContent>
                            </Tabs>
                          )}
                        </DirectorWorkflow>
                      )
                    })()}
                    
                    {/* Fallback: SceneProductionDirector when no segments yet (legacy pipeline only) */}
                    {!(sceneProductionData?.segments && sceneProductionData.segments.length > 0) &&
                      !isBeatFirstPipelineEnabled() && (
                      <SceneProductionDirector
                        sceneId={scene.sceneId || scene.id || `scene-${sceneIdx}`}
                        sceneNumber={sceneNumber}
                        scene={scene}
                        projectId={projectId || ''}
                        productionData={sceneProductionData || null}
                        references={sceneProductionReferences || {}}
                        hasSceneDirection={!!scene.sceneDirection || !!scene.detailedDirection}
                        hasSceneImage={!!scene.imageUrl}
                        hasAudio={stepCompletion.dialogueAction}
                        onSegmentsCreated={async (segments) => {
                          // Initialize production with the finalized segments
                          if (onInitializeSceneProduction) {
                            await onInitializeSceneProduction(
                              scene.sceneId || scene.id || `scene-${sceneIdx}`,
                              { targetDuration: segments.reduce((sum, s) => sum + s.duration, 0), segments }
                            )
                          }
                        }}
                        onNavigateToDirection={() => {
                          // Navigate to Directors Chair tab
                          setActiveWorkflowTab('directorsChair')
                        }}
                        onNavigateToImage={() => {
                          // Trigger scene image generation
                          onGenerateImage?.(sceneIdx)
                        }}
                        onNavigateToAudio={() => {
                          // Navigate to Script tab for audio generation
                          setActiveWorkflowTab('dialogueAction')
                        }}
                      />
                    )}
                  </div>
                  </SceneDirectionProvider>
                )}
              </div>
            </div>
          )}
          
          {/* Add Beat Dialog */}
          <AddSegmentDialog
            open={addSegmentDialogOpen}
            onOpenChange={setAddSegmentDialogOpen}
            sceneId={scene.sceneId || scene.id || `scene-${sceneIdx}`}
            sceneNumber={sceneNumber}
            visualDescription={scene.visualDescription || scene.action || ''}
            sceneDirection={{
              camera: scene.sceneDirection?.camera,
              lighting: scene.sceneDirection?.lighting,
              scene: scene.sceneDirection?.scene,
              talent: scene.sceneDirection?.talent,
              audio: scene.sceneDirection?.audio,
            }}
            narrationText={scene.narration || null}
            dialogueLines={(scene.dialogue || []).map((d: any, idx: number) => ({
              id: d.id || `dialogue-${idx}`,
              character: d.character || d.name || 'UNKNOWN',
              text: d.text || d.dialogue || d.line || '',
              emotion: d.emotion || d.mood || undefined,
            }))}
            characters={(characters || []).map(c => ({
              id: c.id || c.name,
              name: c.name,
              description: c.appearance || c.description,
            }))}
            sceneFrameUrl={scene.imageUrl || null}
            existingSegments={sceneProductionData?.segments || []}
            onAddSegment={(newSegment) => {
              const sceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
              console.log('[ScriptPanel] AddSegmentDialog callback:', { sceneId, hasHandler: !!onAddFullSegment })
              // Use onAddFullBeat to properly append the complete segment
              if (onAddFullSegment) {
                onAddFullSegment(sceneId, newSegment)
                console.log('[ScriptPanel] onAddFullSegment called successfully')
                // Trigger a Keyframes view update or scroll
                setShowKeyframes(true)
              } else {
                console.error('[ScriptPanel] onAddFullSegment is NOT defined!')
              }
            }}
          />
          
          {/* Delete Beat Confirmation Dialog */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent className="bg-slate-900 border border-red-500/30 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-red-400 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Delete Beat
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to delete this segment? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedSegmentId && onDeleteSegment) {
                      const sceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
                      onDeleteSegment(sceneId, selectedSegmentId)
                      setSelectedSegmentId(null)
                    }
                    setDeleteConfirmOpen(false)
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 border border-red-500 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Delete Beat
                </button>
              </div>
            </DialogContent>
          </Dialog>
          
          <ResetSegmentsConfirmDialog
            open={resetSegmentsDialogOpen}
            onOpenChange={setResetSegmentsDialogOpen}
            sceneNumber={sceneNumber}
            sceneHeading={formattedHeading}
            production={sceneProductionData ?? null}
            isResetting={isResettingSegments}
            onConfirm={async () => {
              if (!onResetSegments) return
              const sceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
              setIsResettingSegments(true)
              try {
                await Promise.resolve(onResetSegments(sceneId))
                setResetSegmentsDialogOpen(false)
              } finally {
                setIsResettingSegments(false)
              }
            }}
          />

          {/* Delete Scene Confirmation Dialog */}
          <Dialog open={deleteSceneConfirmOpen} onOpenChange={setDeleteSceneConfirmOpen}>
            <DialogContent className="bg-slate-900 border border-red-500/30 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Delete Scene {sceneNumber}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  This will permanently remove this scene and all associated assets.
                </DialogDescription>
              </DialogHeader>
              
              {/* Scene Preview */}
              <div className="bg-slate-800/60 rounded-lg border border-slate-700/50 p-3 space-y-3">
                <div className="flex items-start gap-3">
                  {scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
                      alt={`Scene ${sceneNumber}`}
                      className="w-20 h-14 object-cover rounded-md border border-slate-600 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-14 bg-slate-700/50 rounded-md border border-slate-600 flex-shrink-0 flex items-center justify-center">
                      <Film className="w-5 h-5 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{formattedHeading}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Duration: {formatDuration(calculateSceneDuration(scene))}
                    </p>
                  </div>
                </div>
                
                {/* Assets that will be deleted */}
                {(() => {
                  const assets: string[] = []
                  if (scene.imageUrl) assets.push('Scene image')
                  if (scene.narrationAudioUrl || scene.narrationAudio) assets.push('Narration audio')
                  if (scene.descriptionAudioUrl || scene.descriptionAudio) assets.push('Description audio')
                  if (scene.dialogue?.some((d: any) => d?.audioUrl || d?.audio)) assets.push('Dialogue audio')
                  if (scene.sceneDirection) assets.push('Scene direction')
                  if (sceneProductionData?.segments?.length) assets.push(`${sceneProductionData.segments.length} beat${sceneProductionData.segments.length > 1 ? 's' : ''}`)
                  if (scene.musicUrl || scene.musicAudio) assets.push('Music')
                  
                  return assets.length > 0 ? (
                    <div className="border-t border-slate-700/50 pt-2">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5">Assets that will be removed</p>
                      <div className="flex flex-wrap gap-1.5">
                        {assets.map((asset, i) => (
                          <span key={i} className="px-2 py-0.5 text-[11px] bg-red-500/10 text-red-300 border border-red-500/20 rounded-full">
                            {asset}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}
              </div>
              
              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={() => setDeleteSceneConfirmOpen(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteScene?.(sceneIdx)
                    setDeleteSceneConfirmOpen(false)
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 border border-red-500 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Scene
                </button>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Edit Beat Dialog */}
          <EditSegmentDialog
            open={editSegmentDialogOpen}
            onOpenChange={setEditSegmentDialogOpen}
            segment={selectedSegmentId ? sceneProductionData?.segments?.find(s => s.segmentId === selectedSegmentId) || null : null}
            sceneId={scene.sceneId || scene.id || `scene-${sceneIdx}`}
            sceneNumber={sceneNumber}
            sceneFrameUrl={scene.imageUrl || null}
            onPromptChange={onSegmentPromptChange}
            onSegmentResize={onSegmentResize}
          />

          <ExpressSfxConfirmDialog
            open={expressSfxDialogOpen}
            onOpenChange={setExpressSfxDialogOpen}
            beats={expressSfxBeatOptions}
            initialBeatIds={Array.from(selectedExpressBeatIds)}
            segmentDurationSeconds={scene.duration}
            isRunning={isExpressSfxRunning}
            onConfirm={handleExpressSfxConfirm}
          />

          <ExpressAudioConfirmDialog
            open={expressAudioDialogOpen}
            onOpenChange={setExpressAudioDialogOpen}
            items={expressAudioItems}
            segmentDurationSeconds={scene.duration}
            isRunning={isExpressAudioRunning}
            onConfirm={handleExpressAudioConfirm}
          />
          
          {/* AI Co-Pilot Side Panel */}
          {!isOutline && activeStep && (
            <SceneWorkflowCoPilotPanel
              activeStep={activeStep}
              isOpen={copilotPanelOpen}
              onClose={() => setCopilotPanelOpen(false)}
              onRegenerate={undefined}
              sceneIdx={sceneIdx}
              generatingDirectionFor={generatingDirectionFor}
            />
          )}
          
          
          {/* Show summary for outlines only (action now always visible in Row 3) */}
          {isOutline && scene.summary && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">{scene.summary}</div>
          )}
        </div>
      )}
    </div>
  )
}

