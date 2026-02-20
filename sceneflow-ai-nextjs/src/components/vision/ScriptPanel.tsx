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
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Edit, Eye, Sparkles, Loader, Loader2, Play, Square, Volume2, VolumeX, Image as ImageIcon, Wand2, ChevronRight, ChevronUp, ChevronLeft, Music, Volume as VolumeIcon, Upload, StopCircle, AlertTriangle, ChevronDown, Check, Pause, Download, Zap, Camera, RefreshCw, Plus, Trash2, GripVertical, Film, Users, Star, BarChart3, Clock, Image, Printer, Info, Clapperboard, CheckCircle, CheckCircle2, Circle, ArrowRight, Bookmark, BookmarkPlus, BookmarkCheck, BookMarked, Lightbulb, Maximize2, Expand, Bot, PenTool, FolderPlus, Pencil, Layers, List, Calculator, FileCheck, Lock, Copy, Languages } from 'lucide-react'
import { SceneWorkflowCoPilot, type WorkflowStep } from './SceneWorkflowCoPilot'
import { SceneWorkflowCoPilotPanel } from './SceneWorkflowCoPilotPanel'
import { SceneProductionManager } from './scene-production/SceneProductionManager'
import { SegmentFrameTimeline } from './scene-production/SegmentFrameTimeline'
import { SegmentBuilder } from './scene-production/SegmentBuilder'
import { AddSegmentDialog } from './scene-production/AddSegmentDialog'
import { EditSegmentDialog } from './scene-production/EditSegmentDialog'
import { DirectorConsole } from './scene-production/DirectorConsole'
import { SceneTimelineV2 } from './scene-production/SceneTimelineV2'
import { SceneRenderDialog } from './scene-production/SceneRenderDialog'
import { applySequentialAlignmentToScene, AUDIO_ALIGNMENT_BUFFERS, getLanguagePlaybackOffset, calculateSuggestedOffset } from './scene-production/audioTrackBuilder'
import { type AudioTracksData, type AudioTrackClip } from './scene-production/AudioTimeline'
import { SceneProductionData, SceneProductionReferences, SegmentKeyframeSettings, SceneSegment, AudioTrackType } from './scene-production/types'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getCuratedElevenVoices, type CuratedVoice } from '@/lib/tts/voices'
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
import { OptimizeSceneDialog } from './OptimizeSceneDialog'
import { SceneDirectionOptimizeDialog, type DirectionOptimizationConfig } from './scene-production/SceneDirectionOptimizeDialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useOverlayStore } from '@/store/useOverlayStore'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { ReportType, StoryboardData, SceneDirectionData } from '@/lib/types/reports'
import { ExportDialog } from './ExportDialog'
import { isDirectionStale, isImageStale } from '@/lib/utils/contentHash'
import { getKenBurnsConfig, generateKenBurnsKeyframes, type KenBurnsIntensity } from '@/lib/animation/kenBurns'
import { SceneDirectionProvider } from '@/contexts/SceneDirectionContext'
import { GenerateAudioDialog } from './GenerateAudioDialog'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { WebAudioMixer, type SceneAudioConfig, type AudioSource } from '@/lib/audio/webAudioMixer'
import { getAudioDuration } from '@/lib/audio/audioDuration'
import { getAudioUrl } from '@/lib/audio/languageDetection'
import { cleanupScriptAudio } from '@/lib/audio/cleanupAudio'
import { formatSceneHeading } from '@/lib/script/formatSceneHeading'
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
  validationWarnings?: Record<number, string>
  validationInfo?: Record<number, {
    passed: boolean
    confidence: number
    message?: string
    warning?: string
    dismissed?: boolean
  }>
  onDismissValidationWarning?: (sceneIdx: number) => void
  onPlayAudio?: (audioUrl: string, label: string) => void
  onGenerateSceneAudio?: (sceneIdx: number, audioType: 'narration' | 'dialogue', characterName?: string, dialogueIndex?: number, language?: string) => void
  // NEW: Props for Production Script Header
  onGenerateAllAudio?: (language?: string) => void
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
  onShowTreatmentReview?: () => void
  directorReview?: any
  audienceReview?: any
  // NEW: Scene editing props
  onEditScene?: (sceneIndex: number) => void
  // NEW: Edit scene with pre-populated recommendations from analysis
  onEditSceneWithRecommendations?: (sceneIndex: number, recommendations: string[]) => void
  onUpdateSceneAudio?: (sceneIndex: number) => Promise<void>
  onDeleteSceneAudio?: (sceneIndex: number, audioType: 'description' | 'narration' | 'dialogue' | 'music' | 'sfx', dialogueIndex?: number, sfxIndex?: number) => void
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
  onGenerateSceneDirection?: (sceneIdx: number) => Promise<void>
  generatingDirectionFor?: number | null
  onGenerateAllCharacters?: () => Promise<void>
  // NEW: Scene production props
  sceneProductionData?: Record<string, SceneProductionData>
  sceneProductionReferences?: Record<string, SceneProductionReferences>
  onInitializeSceneProduction?: (sceneId: string, options: { targetDuration: number; segments?: any[] }) => Promise<void>
  onSegmentPromptChange?: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentKeyframeChange?: (sceneId: string, segmentId: string, keyframeSettings: SegmentKeyframeSettings) => void
  onSegmentDialogueAssignmentChange?: (sceneId: string, segmentId: string, dialogueLineIds: string[]) => void
  onSegmentGenerate?: (sceneId: string, segmentId: string, mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD', options?: { startFrameUrl?: string; prompt?: string; negativePrompt?: string; duration?: number; aspectRatio?: '16:9' | '9:16'; resolution?: '720p' | '1080p' }) => Promise<void>
  onSegmentUpload?: (sceneId: string, segmentId: string, file: File) => Promise<void>
  onLockSegment?: (sceneId: string, segmentId: string, locked: boolean) => void
  /** Update segment animatic settings for Screening Room (duration) */
  onSegmentAnimaticSettingsChange?: (sceneId: string, segmentId: string, settings: { imageDuration?: number }) => void
  /** Persist rendered scene URL to database */
  onRenderedSceneUrlChange?: (sceneId: string, url: string | null) => void
  onAddSegment?: (sceneId: string, afterSegmentId: string | null, duration: number) => void
  onAddFullSegment?: (sceneId: string, segment: any) => void
  onDeleteSegment?: (sceneId: string, segmentId: string) => void
  onSegmentResize?: (sceneId: string, segmentId: string, changes: { startTime?: number; duration?: number }) => void
  /** Apply intelligent auto-alignment of keyframes to audio anchors */
  onApplyIntelligentAlignment?: (sceneId: string, language?: string) => void
  onReorderSegments?: (sceneId: string, oldIndex: number, newIndex: number) => void
  onAudioClipChange?: (sceneIndex: number, trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => void
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
  // Timeline slot to render above scenes
  timelineSlot?: React.ReactNode
  // Callback to add scene frame to reference library
  onAddToReferenceLibrary?: (imageUrl: string, name: string, sceneNumber: number) => Promise<void>
  // Open script editor with initial instruction (from Review Analysis)
  openScriptEditorWithInstruction?: string | null
  onClearScriptEditorInstruction?: () => void
  // Workflow completion overrides
  onMarkWorkflowComplete?: (sceneIdx: number, stepKey: string, isComplete: boolean) => void
  onDismissStaleWarning?: (sceneIdx: number, stepKey: string) => void
  // Reference Library - scene backdrops and props/objects for Opening Frame builder
  sceneReferences?: Array<{ id: string; name: string; description?: string; imageUrl?: string }>
  objectReferences?: Array<{ id: string; name: string; description?: string; imageUrl?: string }>
  // Take management
  onSelectTake?: (sceneId: string, segmentId: string, takeId: string, assetUrl: string) => void
  onDeleteTake?: (sceneId: string, segmentId: string, takeId: string) => void
  // Keyframe State Machine - Frame step handlers
  onGenerateSegmentFrames?: (sceneId: string, segmentId: string, frameType: 'start' | 'end' | 'both', options?: {
    customPrompt?: string
    negativePrompt?: string
    usePreviousEndFrame?: boolean
    previousEndFrameUrl?: string
  }) => Promise<void>
  onGenerateAllSegmentFrames?: (sceneId: string) => Promise<void>
  onEditFrame?: (sceneId: string, segmentId: string, frameType: 'start' | 'end', frameUrl: string) => void
  onUploadFrame?: (sceneId: string, segmentId: string, frameType: 'start' | 'end', file: File) => void
  generatingFrameForSegment?: string | null
  generatingFramePhase?: 'start' | 'end' | 'video' | null
  // Project info for header display
  projectTitle?: string
  projectLogline?: string
  projectDuration?: string
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
      if (d.line) {
        totalWords += d.line.split(/\s+/).filter((w: string) => w.length > 0).length
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
function SortableSceneCard({ id, onAddScene, onDeleteScene, onEditScene, onGenerateSceneScore, generatingScoreFor, getScoreColorClass, onEditImage, totalScenes, onNavigateScene, scenes, script, onScriptChange, setEditingImageData, setImageEditModalOpen, getPlaybackOffsetForScene, handlePlaybackOffsetChange, getSuggestedOffsetForScene, expandedRecommendations, setExpandedRecommendations, onAnalyzeScene, analyzingSceneIndex, onOptimizeScene, optimizingSceneIndex, setOptimizeDialogScene, setOptimizeDialogOpen, onResyncAudioTiming, resyncingAudioSceneIndex, ...props }: any) {
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
      />
    </div>
  )
}

export function ScriptPanel({ script, onScriptChange, isGenerating, onExpandScene, onExpandAllScenes, onGenerateSceneImage, characters = [], projectId, visualStyle, validationWarnings = {}, validationInfo = {}, onDismissValidationWarning, onPlayAudio, onGenerateSceneAudio, onGenerateAllAudio, isGeneratingAudio, productionReadiness = undefined, onPlayScript, onAddScene, onDeleteScene, onReorderScenes, directorScore, audienceScore, onGenerateReviews, isGeneratingReviews, onShowReviews, onShowTreatmentReview, directorReview, audienceReview, onEditScene, onUpdateSceneAudio, onDeleteSceneAudio, onEnhanceSceneContext, onGenerateSceneScore, generatingScoreFor, getScoreColorClass, hasBYOK = false, onOpenBYOK, onGenerateSceneDirection, generatingDirectionFor, onGenerateAllCharacters, sceneProductionData = {}, sceneProductionReferences = {}, belowDashboardSlot, onInitializeSceneProduction, onSegmentPromptChange, onSegmentKeyframeChange, onSegmentDialogueAssignmentChange, onSegmentGenerate, onSegmentUpload, onLockSegment, onSegmentAnimaticSettingsChange, onRenderedSceneUrlChange, onAddSegment, onAddFullSegment, onDeleteSegment, onSegmentResize, onReorderSegments, onAudioClipChange, onCleanupStaleAudioUrl, onAddEstablishingShot, onEstablishingShotStyleChange, onBackdropVideoGenerated, onGenerateEndFrame, onEndFrameGenerated, sceneAudioTracks = {}, bookmarkedScene, onBookmarkScene, onJumpToBookmark, showStoryboard = true, onToggleStoryboard, showDashboard = false, onToggleDashboard, onOpenAssets, isGeneratingKeyframe = false, generatingKeyframeSceneNumber = null, selectedSceneIndex = null, onSelectSceneIndex, timelineSlot, onAddToReferenceLibrary, openScriptEditorWithInstruction = null, onClearScriptEditorInstruction, onMarkWorkflowComplete, onDismissStaleWarning, sceneReferences = [], objectReferences = [], onSelectTake, onDeleteTake, onGenerateSegmentFrames, onGenerateAllSegmentFrames, onEditFrame, onUploadFrame, generatingFrameForSegment = null, generatingFramePhase = null, projectTitle, projectLogline, projectDuration, storedTranslations, onSaveTranslations, onAnalyzeScene, analyzingSceneIndex = null, onOptimizeScene, optimizingSceneIndex = null, onResyncAudioTiming, resyncingAudioSceneIndex = null, onRegenerateScript, isRegeneratingScript = false }: ScriptPanelProps) {
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
  
  // Scene timeline visibility state - hidden (scene card navigation is primary)
  const [showTimeline, setShowTimeline] = useState(false)
  
  // Scene review modal state
  const [showSceneReviewModal, setShowSceneReviewModal] = useState(false)
  const [selectedSceneForReview, setSelectedSceneForReview] = useState<number | null>(null)
  
  // Animatic render dialog state
  const [animaticRenderDialogOpen, setAnimaticRenderDialogOpen] = useState(false)
  const [animaticRenderSceneIdx, setAnimaticRenderSceneIdx] = useState<number | null>(null)
  
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
  const [generatingSFX, setGeneratingSFX] = useState<{sceneIdx: number, sfxIdx: number} | null>(null)
  const [generatingMusic, setGeneratingMusic] = useState<number | null>(null)
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [isPlayingMixed, setIsPlayingMixed] = useState(false)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const playbackAbortRef = useRef(false)
  const [bookmarkSavingSceneIdx, setBookmarkSavingSceneIdx] = useState<number | null>(null)
  
  // Scene Direction Optimization Dialog state
  const [directionOptimizeDialogOpen, setDirectionOptimizeDialogOpen] = useState(false)
  const [directionOptimizeSceneIdx, setDirectionOptimizeSceneIdx] = useState<number | null>(null)
  const [isOptimizingDirection, setIsOptimizingDirection] = useState(false)

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

    // If all types are selected, use the batch generation API (includes music and SFX)
    if (audioTypes.narration && audioTypes.dialogue && audioTypes.music && audioTypes.sfx) {
      if (onGenerateAllAudio) {
        setDialogGenerationProgress(null)
        setDialogGenerationMode('foreground')
        generationModeRef.current = 'foreground'
        backgroundRequestedRef.current = false
        await onGenerateAllAudio(language) // Pass language for translation support
        setGenerateAudioDialogOpen(false)
        return
      }
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

    // Count SFX items across all scenes
    const totalSfxItems = audioTypes.sfx
      ? scenes.reduce((sum: number, scene: any) => {
          if (!Array.isArray(scene.sfx)) return sum
          return sum + scene.sfx.length
        }, 0)
      : 0

    const totalSceneSteps = audioTypes.narration ? scenes.length : 0
    const totalCharacters = includeCharacters ? (characters?.length || 0) : 0
    const totalImages = includeSceneImages ? scenes.length : 0
    const totalSteps = totalSceneSteps + totalDialogueLines + totalMusicScenes + totalSfxItems + totalCharacters + totalImages
    const audioTasksSelected = audioTypes.narration || audioTypes.dialogue || audioTypes.music || audioTypes.sfx

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
      totalSfx: totalSfxItems,
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
              await generateMusic(sceneIdx)
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

      // Generate SFX for scenes that have sound effects
      if (audioTypes.sfx) {
        let processedSfx = 0
        for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
          const scene = scenes[sceneIdx]
          if (!Array.isArray(scene.sfx)) continue

          for (let sfxIdx = 0; sfxIdx < scene.sfx.length; sfxIdx++) {
            // Always regenerate SFX regardless of existing audio
            processedSfx += 1
            updateDialogProgress((prev) => prev ? {
              ...prev,
              phase: 'sfx',
              currentScene: sceneIdx + 1,
              currentSfx: processedSfx,
              message: `Generating sound effect ${processedSfx} of ${totalSfxItems} (Scene ${sceneIdx + 1})`,
            } : prev)

            try {
              await generateSFX(sceneIdx, sfxIdx)
            } catch (error) {
              console.error(`[SFX Generation] Error for scene ${sceneIdx}, sfx ${sfxIdx}:`, error)
            }

            completedSteps += 1
            updateDialogProgress((prev) => prev ? {
              ...prev,
              completedSteps,
              currentSfx: processedSfx,
            } : prev)
          }
        }
        if (processedSfx > 0) {
          tasksCompleted.push('sfx')
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

  // Fetch ElevenLabs voices
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/tts/elevenlabs/voices', { cache: 'no-store' })
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
    const config: SceneAudioConfig = {}
    let currentTime = 0
    let totalDuration = 0
    let descriptionEndTime = 0
    let narrationEndTime = 0
    
    // Get language-specific audio URLs
    const narrationUrl = getAudioUrl(scene, selectedLanguage, 'narration')
    const descriptionUrl = getAudioUrl(scene, selectedLanguage, 'description')
    const dialogueArray = scene.dialogueAudio?.[selectedLanguage] || 
                          (selectedLanguage === 'en' ? scene.dialogueAudio?.en : null) ||
                          (Array.isArray(scene.dialogueAudio) ? scene.dialogueAudio : null)
    
    // Music starts at scene beginning (concurrent with everything, loops)
    // Check both musicAudio (new format) and music.url (legacy format)
    const musicUrl = scene.musicAudio || scene.music?.url
    if (musicUrl) {
      config.music = musicUrl
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
        const urlA = a.audioUrl || a.url || ''
        const urlB = b.audioUrl || b.url || ''
        const tsA = getUrlTimestamp(urlA)
        const tsB = getUrlTimestamp(urlB)
        return tsA - tsB  // Ascending order - oldest first
      })
      
      console.log('[ScriptPanel] 🔊🔊🔊 TIMESTAMP SORTING ACTIVE - Dialogue sorted by URL timestamp')
      console.log('[ScriptPanel] Dialogue count:', dialogueArray.length)
      console.log('[ScriptPanel] Sorted order:', sortedDialogue.map((d: any) => (d.audioUrl || d.url || '').split('/').pop()))
      
      for (const dialogue of sortedDialogue) {
        const audioUrl = dialogue.audioUrl || dialogue.url
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
        
        const sfxDuration = await resolveAudioDuration(sfxUrl, sfxDef.duration)
        config.sfx.push({
          url: sfxUrl,
          startTime: sfxTime
        })
        totalDuration = Math.max(totalDuration, sfxTime + sfxDuration)
      }
    }
    
    // Set scene duration for music-only scenes or to ensure music plays long enough
    config.sceneDuration = Math.max(totalDuration, scene.duration || 5)
    
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
    const dialogueArray = scene.dialogueAudio?.[selectedLanguage] || 
                          (selectedLanguage === 'en' ? scene.dialogueAudio?.en : null) ||
                          (Array.isArray(scene.dialogueAudio) ? scene.dialogueAudio : null)
    const hasDialogue = Array.isArray(dialogueArray) && dialogueArray.some((d: any) => d.audioUrl || d.url)
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
      if (audioConfig.music && audioMixerRef.current) {
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
      
      const resp = await fetch('/api/tts/elevenlabs', {
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
  const generateSFX = async (sceneIdx: number, sfxIdx: number, skipOverlay?: boolean) => {
    const scene = scenes[sceneIdx]
    const sfx = scene?.sfx?.[sfxIdx]
    if (!sfx) return

    setGeneratingSFX({ sceneIdx, sfxIdx })
    if (!skipOverlay) {
      overlayStore?.show(`Generating sound effect ${sfxIdx + 1} for Scene ${sceneIdx + 1}...`, 15, 'audio-generation')
    }
    try {
      const response = await fetch('/api/tts/elevenlabs/sound-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: typeof sfx === 'string' ? sfx : sfx.description, duration: 2.0 })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'SFX generation failed')
      }

      const blob = await response.blob()
      
      // Upload to blob storage for persistence
      const formData = new FormData()
      const fileName = `sfx-${projectId || 'temp'}-scene-${sceneIdx}-sfx-${sfxIdx}-${Date.now()}.mp3`
      formData.append('file', blob, fileName)
      
      const uploadResponse = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.details || 'Failed to save SFX audio')
      }
      
      const uploadData = await uploadResponse.json()
      const audioUrl = uploadData.audioUrl
      
      // Update scene with persistent audio URL
      await saveSceneAudio(sceneIdx, 'sfx', audioUrl, sfxIdx)
      if (!skipOverlay) {
        overlayStore?.hide()
      }
    } catch (error: any) {
      console.error('[SFX Generation] Error:', error)
      if (!skipOverlay) {
        overlayStore?.hide()
      }
      toast.error(`Failed to generate sound effect: ${error.message}`)
    } finally {
      setGeneratingSFX(null)
    }
  }

  const generateMusic = async (sceneIdx: number, skipOverlay?: boolean) => {
    const scene = scenes[sceneIdx]
    const music = scene?.music
    if (!music) return

    setGeneratingMusic(sceneIdx)
    if (!skipOverlay) {
      overlayStore?.show(`Generating music for Scene ${sceneIdx + 1}...`, 45, 'audio-generation')
    }
    try {
      const duration = scene.duration || 30
      // Use saveToBlob to have the server upload directly - avoids 4.5MB payload limit
      const response = await fetch('/api/tts/elevenlabs/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: typeof music === 'string' ? music : music.description, 
          duration,
          saveToBlob: true,  // Server-side upload bypasses client payload limits
          projectId: projectId || 'temp',
          sceneId: `scene-${sceneIdx}`
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Music generation failed')
      }

      // Server returns the blob URL directly when saveToBlob=true
      const data = await response.json()
      const audioUrl = data.url
      
      // Update scene with persistent audio URL
      await saveSceneAudio(sceneIdx, 'music', audioUrl)
      if (!skipOverlay) {
        overlayStore?.hide()
      }
    } catch (error: any) {
      console.error('[Music Generation] Error:', error)
      if (!skipOverlay) {
        overlayStore?.hide()
      }
      toast.error(`Failed to generate music: ${error.message}`)
    } finally {
      setGeneratingMusic(null)
    }
  }

  const uploadAudio = async (sceneIdx: number, type: 'description' | 'narration' | 'dialogue' | 'sfx' | 'music', sfxIdx?: number, dialogueIdx?: number, characterName?: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mpeg'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const toastId = toast.loading('Uploading audio...')
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload/audio', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        const data = await response.json()
        const audioUrl = data.url
        
        // Handle different audio types
        if (type === 'sfx' || type === 'music') {
          await saveSceneAudio(sceneIdx, type, audioUrl, sfxIdx)
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
          // Update dialogue audio
          const updatedScenes = [...scenes]
          if (!updatedScenes[sceneIdx].dialogueAudio) {
            updatedScenes[sceneIdx].dialogueAudio = {}
          }
          if (!updatedScenes[sceneIdx].dialogueAudio[selectedLanguage]) {
            updatedScenes[sceneIdx].dialogueAudio[selectedLanguage] = []
          }
          // Find and update the entry for this dialogue index
          const existingIdx = updatedScenes[sceneIdx].dialogueAudio[selectedLanguage].findIndex((a: any) => a.dialogueIndex === dialogueIdx)
          const audioEntry = { audioUrl, character: characterName, dialogueIndex: dialogueIdx }
          if (existingIdx >= 0) {
            updatedScenes[sceneIdx].dialogueAudio[selectedLanguage][existingIdx] = audioEntry
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

  const saveSceneAudio = async (sceneIdx: number, audioType: 'sfx' | 'music', audioUrl: string, sfxIdx?: number) => {
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
      // Make atomic update to database via PATCH endpoint
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atomicAudioUpdate: {
            sceneIndex: sceneIdx,
            audioType,
            audioUrl,
            sfxIndex: sfxIdx
          }
        })
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

  // Quick play SFX (generate and play immediately)
  const generateAndPlaySFX = async (description: string) => {
    try {
      const response = await fetch('/api/tts/elevenlabs/sound-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description, duration: 2.0 })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'SFX generation failed' }))
        throw new Error(error.details || error.error || 'SFX generation failed')
      }
      
      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
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
    } catch (error: any) {
      console.error('[SFX Playback] Error:', error)
      alert(`Failed to play sound effect: ${error.message}`)
    }
  }

  // Quick play Music (generate and play immediately)
  const generateAndPlayMusic = async (description: string, duration: number = 30) => {
    try {
      const response = await fetch('/api/tts/elevenlabs/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description, duration })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Music generation failed' }))
        
        // Handle 501 (Not Implemented) for Lyria API
        if (response.status === 501) {
          alert('Music generation is coming soon! Google Lyria RealTime API is currently in experimental preview.')
          return
        }
        
        throw new Error(error.details || error.error || 'Music generation failed')
      }
      
      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
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
    } catch (error: any) {
      console.error('[Music Playback] Error:', error)
      alert(`Failed to play music: ${error.message}`)
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
  const handlePlayAudio = (audioUrl: string, label: string) => {
    if (playingAudio === audioUrl) {
      individualAudioRef.current?.pause()
      setPlayingAudio(null)
    } else {
      if (individualAudioRef.current) {
        individualAudioRef.current.src = audioUrl
        individualAudioRef.current.play().catch((error) => {
          console.error('[ScriptPanel] Audio playback failed:', error, audioUrl)
          setPlayingAudio(null)
          toast.error(`Audio not found. Try regenerating the ${label} audio.`)
        })
        setPlayingAudio(audioUrl)
      }
    }
  }

  // Scene Direction Optimization handler
  const handleOptimizeDirection = useCallback(async (config: DirectionOptimizationConfig) => {
    if (directionOptimizeSceneIdx === null || !projectId) return null
    
    const scene = scenes[directionOptimizeSceneIdx]
    if (!scene) return null
    
    setIsOptimizingDirection(true)
    
    try {
      const response = await fetch('/api/scene/optimize-direction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex: directionOptimizeSceneIdx,
          scene: {
            heading: scene.heading,
            action: scene.action,
            visualDescription: scene.visualDescription,
            narration: scene.narration,
            dialogue: scene.dialogue,
            characters: scene.characters,
            sceneDirection: scene.sceneDirection
          },
          config
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to optimize direction')
      }
      
      const result = await response.json()
      
      if (result.success && result.sceneDirection) {
        // Update the scene with the optimized direction
        const updatedScenes = scenes.map((s, idx) => 
          idx === directionOptimizeSceneIdx 
            ? { ...s, sceneDirection: result.sceneDirection }
            : s
        )
        
        // Propagate update to parent
        if (onScriptChange) {
          const updatedScript = script?.script 
            ? { ...script, script: { ...script.script, scenes: updatedScenes } }
            : { ...script, scenes: updatedScenes }
          await onScriptChange(updatedScript)
        }
        
        toast.success('Scene direction optimized for professional production', {
          description: `${config.selectedTemplates.length} optimizations applied`
        })
        
        setDirectionOptimizeDialogOpen(false)
        return result.sceneDirection
      }
      
      return null
    } catch (error) {
      console.error('[ScriptPanel] Direction optimization failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to optimize direction')
      return null
    } finally {
      setIsOptimizingDirection(false)
    }
  }, [directionOptimizeSceneIdx, projectId, scenes, script, onScriptChange])

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
      const dialogueCandidates = Array.isArray(scene?.dialogueAudio?.en)
        ? scene.dialogueAudio.en
        : Array.isArray(scene?.dialogueAudio)
          ? scene.dialogueAudio
          : []

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
    <div className="relative rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/60 h-full flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(8,8,20,0.55)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sf-primary via-fuchsia-500 to-cyan-400 opacity-80" />
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex-shrink-0 bg-slate-900/70 backdrop-blur rounded-t-3xl">
        {/* Title and Action Buttons - Same Line */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white">Production</h3>
            {isGenerating && (
              <span className="text-xs text-cyan-300 flex items-center gap-1.5">
                <Loader className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </span>
            )}
          </div>
          
          {/* Action Buttons - Right Justified */}
          <div className="flex items-center gap-2">
            {/* Budget Calculator Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCostCalculatorOpen(true)}
              className="flex items-center gap-2 border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/10"
              title="Open budget calculator to estimate costs"
            >
              <Calculator className="w-4 h-4 text-cyan-400" />
              <span className="text-sm hidden sm:inline">Budget</span>
            </Button>

            {/* Go to Bookmark Button */}
            {bookmarkedScene && onJumpToBookmark && (
              <Button
                variant="outline"
                size="sm"
                onClick={onJumpToBookmark}
                className="flex items-center gap-2 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/10"
                title={`Jump to bookmarked scene ${bookmarkedScene.sceneNumber || ''}`}
              >
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span className="text-sm hidden sm:inline">Bookmark</span>
              </Button>
            )}

            {/* Review Treatment Button */}
            {onShowTreatmentReview && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShowTreatmentReview}
                className="flex items-center gap-2 border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10"
                title="Review film treatment for script alignment"
              >
                <FileCheck className="w-4 h-4 text-purple-400" />
                <span className="text-sm hidden sm:inline">Treatment</span>
              </Button>
            )}

            {/* Language Selector */}
            <div className="w-[120px]">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="text-xs focus:bg-slate-700 focus:text-slate-100">
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Translation Export/Import Icons - only show for non-English languages */}
            {selectedLanguage !== 'en' && (
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExportDialogue}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-green-400 hover:bg-green-500/10"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Export script for {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name} translation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTranslationImportOpen(true)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Import {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name} translation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Show indicator if translations exist for this language */}
                {storedTranslations?.[selectedLanguage] && Object.keys(storedTranslations[selectedLanguage]).length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">{Object.keys(storedTranslations[selectedLanguage]).length} scenes translated</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
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
              <h2 className="text-base font-semibold text-white/90 truncate flex-1">
                {projectTitle}
              </h2>
              {projectDuration && (
                <span className="text-xs font-medium text-gray-400 bg-slate-800 px-2 py-0.5 rounded">
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
        
        {/* Timeline Slot - renders scene timeline selector (toggle is in header) */}
        {timelineSlot && showTimeline && (
          <div className="mt-3">
            {timelineSlot}
          </div>
        )}
      </div>
      
      {/* Script Content - scrollable area containing storyboard and scenes */}
      <div className="flex-1 overflow-y-auto bg-slate-950/20">
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
                      generatingSFX={generatingSFX}
                      setGeneratingSFX={setGeneratingSFX}
                      generateMusic={generateMusic}
                      generateSFX={generateSFX}
                      onGenerateSceneDirection={onGenerateSceneDirection}
                      generatingDirectionFor={generatingDirectionFor}
                      isOptimizingDirection={isOptimizingDirection}
                      onOpenDirectionOptimize={(sceneIdx) => {
                        setDirectionOptimizeSceneIdx(sceneIdx)
                        setDirectionOptimizeDialogOpen(true)
                      }}
                      sceneProductionData={sceneProductionData[scene.sceneId || scene.id || `scene-${idx}`] || undefined}
                      sceneProductionReferences={sceneProductionReferences[scene.sceneId || scene.id || `scene-${idx}`] || undefined}
                      onInitializeSceneProduction={onInitializeSceneProduction}
                      onSegmentPromptChange={onSegmentPromptChange}
                      onSegmentKeyframeChange={onSegmentKeyframeChange}
                      onSegmentDialogueAssignmentChange={onSegmentDialogueAssignmentChange}
                      onSegmentGenerate={onSegmentGenerate}
                      onSegmentUpload={onSegmentUpload}
                      onLockSegment={onLockSegment}
                      onSegmentAnimaticSettingsChange={onSegmentAnimaticSettingsChange}
                      onRenderedSceneUrlChange={onRenderedSceneUrlChange}
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
                      onGenerateSegmentFrames={onGenerateSegmentFrames}
                      onGenerateAllSegmentFrames={onGenerateAllSegmentFrames}
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
                      onResyncAudioTiming={onResyncAudioTiming}
                      resyncingAudioSceneIndex={resyncingAudioSceneIndex}
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
          title={editingImageData.segmentId 
            ? `Edit ${editingImageData.frameType === 'start' ? 'Start' : 'End'} Frame`
            : undefined
          }
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

      {/* Optimize Scene Dialog - For per-scene audience analysis optimization */}
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

      {/* Scene Direction Optimize Dialog - For Veo-3 and professional video production */}
      {directionOptimizeSceneIdx !== null && (
        <SceneDirectionOptimizeDialog
          isOpen={directionOptimizeDialogOpen}
          onClose={() => {
            setDirectionOptimizeDialogOpen(false)
            setDirectionOptimizeSceneIdx(null)
          }}
          sceneNumber={directionOptimizeSceneIdx + 1}
          scene={scenes[directionOptimizeSceneIdx] || {}}
          onOptimize={handleOptimizeDirection}
          isOptimizing={isOptimizingDirection}
        />
      )}

      {/* Animatic Render Dialog - for exporting keyframe-based animatic as MP4 */}
      {animaticRenderSceneIdx !== null && (() => {
        const scene = scenes[animaticRenderSceneIdx]
        const sceneId = scene?.sceneId || scene?.id || `scene-${animaticRenderSceneIdx}`
        const sceneProductionData = getSceneProductionData?.(sceneId)
        
        // Build audio data from scene
        const narrationUrl = scene?.narrationAudio?.[selectedLanguage]?.url || scene?.narrationAudioUrl
        const narrationDuration = scene?.narrationAudio?.[selectedLanguage]?.duration
        const dialogueAudioArray = Array.isArray(scene?.dialogueAudio) 
          ? scene.dialogueAudio 
          : scene?.dialogueAudio?.[selectedLanguage] || []
        
        return (
          <SceneRenderDialog
            open={animaticRenderDialogOpen}
            onOpenChange={(open) => {
              setAnimaticRenderDialogOpen(open)
              if (!open) setAnimaticRenderSceneIdx(null)
            }}
            sceneId={sceneId}
            sceneNumber={animaticRenderSceneIdx + 1}
            projectId={projectId}
            segments={sceneProductionData?.segments || []}
            productionData={sceneProductionData || null}
            audioData={{
              narrationUrl,
              narrationDuration,
              dialogueEntries: dialogueAudioArray.map((d: any, i: number) => ({
                audioUrl: d?.audioUrl,
                duration: d?.duration,
                character: scene?.dialogue?.[i]?.character || d?.character
              })),
              musicUrl: scene?.musicAudio || scene?.music?.url,
              musicDuration: scene?.music?.duration,
            }}
            onRenderComplete={(downloadUrl) => {
              toast.success('Animatic rendered successfully!')
              console.log('[ScriptPanel] Animatic render complete:', downloadUrl)
            }}
          />
        )
      })()}

      {/* Scene Prompt Builder Modal */}
      {sceneBuilderIdx !== null && (
        <ScenePromptBuilder
          open={sceneBuilderOpen}
          onClose={() => {
            setSceneBuilderOpen(false)
            setSceneBuilderIdx(null)
          }}
          scene={scenes[sceneBuilderIdx]}
          availableCharacters={characters.map(c => ({
            name: c.name,
            description: c.description,
            referenceImage: c.referenceImage,  // Pass Blob URL for Imagen API
            appearanceDescription: c.appearanceDescription,  // Pass appearance description
            ethnicity: c.ethnicity,
            subject: c.subject,
            wardrobes: c.wardrobes  // Pass wardrobes for costume selection in dialog
          }))}
          sceneReferences={sceneReferences}
          objectReferences={objectReferences}
          sceneWardrobes={(() => {
            // Build wardrobes map from scene's characterWardrobes array
            const scene = scenes[sceneBuilderIdx]
            const wardrobesMap: Record<string, string> = {}
            if (scene?.characterWardrobes) {
              scene.characterWardrobes.forEach((cw: any) => {
                const char = characters.find(c => c.id === cw.characterId)
                if (char) {
                  wardrobesMap[char.name] = cw.wardrobeId
                }
              })
            }
            return wardrobesMap
          })()}
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
              frames: scenes.map((scene: any, idx: number) => ({
                sceneNumber: idx + 1,
                imageUrl: scene.imageUrl,
                visualDescription: scene.visualDescription || scene.action || scene.summary,
                shotType: scene.shotType,
                cameraAngle: scene.cameraAngle,
                lighting: scene.lighting,
                duration: scene.duration
              }))
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
            setPlayingAudio(null)
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
  onPlayAudio?: (audioUrl: string, label: string) => void
  onGenerateSceneAudio?: (sceneIdx: number, audioType: 'narration' | 'dialogue', characterName?: string, dialogueIndex?: number, language?: string) => void
  selectedLanguage?: string
  playingAudio?: string | null
  generatingDialogue?: {sceneIdx: number, character: string, dialogueIndex?: number} | null
  setGeneratingDialogue?: (state: {sceneIdx: number, character: string, dialogueIndex?: number} | null) => void
  timelineStart?: number
  dragHandleProps?: any
  onAddScene?: (afterIndex?: number) => void
  onDeleteScene?: (sceneIndex: number) => void
  onEditScene?: (sceneIndex: number) => void
  onUpdateSceneAudio?: (sceneIndex: number) => Promise<void>
  // NEW: Delete specific audio from scene
  onDeleteSceneAudio?: (sceneIndex: number, audioType: 'description' | 'narration' | 'dialogue' | 'music' | 'sfx', dialogueIndex?: number, sfxIndex?: number) => void
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
  generatingSFX?: {sceneIdx: number, sfxIdx: number} | null
  setGeneratingSFX?: (state: {sceneIdx: number, sfxIdx: number} | null) => void
  // Functions for generating and saving audio
  generateMusic?: (sceneIdx: number) => Promise<void>
  generateSFX?: (sceneIdx: number, sfxIdx: number) => Promise<void>
  // NEW: Scene direction generation props
  onGenerateSceneDirection?: (sceneIdx: number) => Promise<void>
  generatingDirectionFor?: number | null
  isOptimizingDirection?: boolean
  onOpenDirectionOptimize?: (sceneIdx: number) => void
  // NEW: Scene production props
  sceneProductionData?: SceneProductionData | null
  sceneProductionReferences?: SceneProductionReferences
  // Optional slot renderer to place content below Dashboard (e.g., Storyboard header)
  // Provides helper to open the Generate Audio dialog from parent section
  belowDashboardSlot?: (helpers: { openGenerateAudio: () => void }) => React.ReactNode
  onInitializeSceneProduction?: (sceneId: string, options: { targetDuration: number; segments?: any[] }) => Promise<void>
  onSegmentPromptChange?: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentKeyframeChange?: (sceneId: string, segmentId: string, keyframeSettings: SegmentKeyframeSettings) => void
  onSegmentDialogueAssignmentChange?: (sceneId: string, segmentId: string, dialogueLineIds: string[]) => void
  onSegmentGenerate?: (sceneId: string, segmentId: string, mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD', options?: { startFrameUrl?: string; prompt?: string; negativePrompt?: string; duration?: number; aspectRatio?: '16:9' | '9:16'; resolution?: '720p' | '1080p' }) => Promise<void>
  onSegmentUpload?: (sceneId: string, segmentId: string, file: File) => Promise<void>
  onLockSegment?: (sceneId: string, segmentId: string, locked: boolean) => void
  /** Update segment animatic settings for Screening Room (duration) */
  onSegmentAnimaticSettingsChange?: (sceneId: string, segmentId: string, settings: { imageDuration?: number }) => void
  /** Persist rendered scene URL to database */
  onRenderedSceneUrlChange?: (sceneId: string, url: string | null) => void
  onAddSegment?: (sceneId: string, afterSegmentId: string | null, duration: number) => void
  onAddFullSegment?: (sceneId: string, segment: any) => void
  onDeleteSegment?: (sceneId: string, segmentId: string) => void
  onSegmentResize?: (sceneId: string, segmentId: string, changes: { startTime?: number; duration?: number }) => void
  /** Apply intelligent auto-alignment of keyframes to audio anchors */
  onApplyIntelligentAlignment?: (sceneId: string, language?: string) => void
  onReorderSegments?: (sceneId: string, oldIndex: number, newIndex: number) => void
  onAudioClipChange?: (sceneIndex: number, trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => void
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
  overlayStore?: { show: (message: string, duration: number) => void; hide: () => void }
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
  // Keyframe State Machine - Frame step handlers
  onGenerateSegmentFrames?: (sceneId: string, segmentId: string, frameType: 'start' | 'end' | 'both', options?: { customPrompt?: string; negativePrompt?: string; usePreviousEndFrame?: boolean }) => Promise<void>
  onGenerateAllSegmentFrames?: (sceneId: string) => Promise<void>
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
  // Scene wardrobe assignment - allows selecting which wardrobe each character uses in this scene
  onUpdateSceneWardrobe?: (sceneIndex: number, characterId: string, wardrobeId: string | null) => void
  // Visual references for SegmentBuilder
  sceneReferences?: Array<{ id: string; name: string; description?: string; imageUrl?: string }>
  objectReferences?: Array<{ id: string; name: string; description?: string; imageUrl?: string }>
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
  // Production readiness for workflow guards (voices assigned, etc.)
  productionReadiness?: ProductionReadiness
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
  selectedLanguage = 'en',
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
  generatingSFX,
  setGeneratingSFX,
  generateMusic,
  generateSFX,
  onGenerateSceneDirection,
  generatingDirectionFor,
  isOptimizingDirection,
  onOpenDirectionOptimize,
  sceneProductionData,
  sceneProductionReferences,
  onInitializeSceneProduction,
  onSegmentPromptChange,
  onSegmentKeyframeChange,
  onSegmentDialogueAssignmentChange,
  onSegmentGenerate,
  onSegmentUpload,
  onLockSegment,
  onSegmentAnimaticSettingsChange,
  onRenderedSceneUrlChange,
  onProductionDataChange,
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
  onSelectTake,
  onDeleteTake,
  onGenerateSegmentFrames,
  onGenerateAllSegmentFrames,
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
  onUpdateSceneWardrobe,
  sceneReferences = [],
  objectReferences = [],
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
}: SceneCardProps) {
  const isOutline = !scene.isExpanded && scene.summary
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<WorkflowStep | null>(null)
  const [copilotPanelOpen, setCopilotPanelOpen] = useState(false)
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [directionBuilderOpen, setDirectionBuilderOpen] = useState(false)
  const [isUpdatingAudio, setIsUpdatingAudio] = useState(false)
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null)
  
  // Segment selection and dialog states
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [editSegmentDialogOpen, setEditSegmentDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  
  // Generate All Audio confirmation dialog
  const [generateAllAudioConfirmOpen, setGenerateAllAudioConfirmOpen] = useState(false)
  
  // Add Segment dialog state
  const [addSegmentDialogOpen, setAddSegmentDialogOpen] = useState(false)
  
  // Collapsible section states
  const [descriptionCollapsed, setDescriptionCollapsed] = useState(false)
  const [narrationCollapsed, setNarrationCollapsed] = useState(false)
  const [dialogueCollapsed, setDialogueCollapsed] = useState(false)
  const [musicCollapsed, setMusicCollapsed] = useState(false)
  const [sfxCollapsed, setSfxCollapsed] = useState(false)
  const [sceneCastCollapsed, setSceneCastCollapsed] = useState(true) // Collapsed by default - wardrobe selection is advanced
  // Scene Image section: collapsed by default
  const [sceneImageCollapsed, setSceneImageCollapsed] = useState(true)
  // Production workflow container collapse states
  const [storyboardBuilderCollapsed, setStoryboardBuilderCollapsed] = useState(false)
  const [videoProductionCollapsed, setVideoProductionCollapsed] = useState(false)
  // Video Editor collapsed state with localStorage persistence (default: expanded)
  const [videoEditorCollapsed, setVideoEditorCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('videoEditorCollapsed')
      return saved ? JSON.parse(saved) : false // Default expanded
    }
    return false
  })
  
  // Persist videoEditorCollapsed to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('videoEditorCollapsed', JSON.stringify(videoEditorCollapsed))
    }
  }, [videoEditorCollapsed])
  
  // Determine active step for Co-Pilot
  const activeStep: WorkflowStep | null = activeWorkflowTab
  
  // Manual workflow completion overrides (user marked as done)
  const workflowCompletions = scene.workflowCompletions || {}
  
  // Helper: Check if all audio is complete for a specific language
  // Script step auto-completes only when all required audio is generated for selected language
  const isSceneAudioCompleteForLanguage = useMemo(() => {
    return (lang: string): boolean => {
      // Check if scene has any text that requires audio
      const hasNarrationText = !!scene.narration?.trim()
      const hasDescriptionText = !!(scene.visualDescription?.trim() || scene.action?.trim())
      const dialogueLines = scene.dialogue || []
      const hasDialogueText = dialogueLines.length > 0
      
      // If scene has no text at all, consider it complete
      if (!hasNarrationText && !hasDescriptionText && !hasDialogueText) {
        return true
      }
      
      // Check description audio (if scene has description text)
      let hasDescriptionAudio = true
      if (hasDescriptionText) {
        const descUrl = scene.descriptionAudio?.[lang]?.url || (lang === 'en' ? scene.descriptionAudioUrl : undefined)
        hasDescriptionAudio = !!descUrl
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
          dialogueAudioArray = lang === 'en' ? scene.dialogueAudio : []
        } else if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object') {
          // New format: object keyed by language
          dialogueAudioArray = scene.dialogueAudio[lang] || []
        }
        
        // Each dialogue line should have a matching audio entry
        hasAllDialogueAudio = dialogueLines.every((d: any, idx: number) => {
          const audioEntry = dialogueAudioArray.find((a: any) => 
            a.dialogueIndex === idx && a.audioUrl
          )
          return !!audioEntry
        })
      }
      
      return hasDescriptionAudio && hasNarrationAudio && hasAllDialogueAudio
    }
  }, [scene.narration, scene.visualDescription, scene.action, scene.dialogue, 
      scene.descriptionAudio, scene.descriptionAudioUrl, 
      scene.narrationAudio, scene.narrationAudioUrl, scene.dialogueAudio])
  
  // Completion status detection for workflow steps (combines auto-detection + manual overrides)
  const stepCompletion = useMemo(() => {
    // Auto-detected completions
    // Script step: Auto-complete only when ALL audio is generated for selected language
    const dialogueActionAuto = isSceneAudioCompleteForLanguage(selectedLanguage)
    const directorsChairAuto = !!scene.sceneDirection
    const storyboardPreVizAuto = !!scene.imageUrl
    // Segment Builder: Complete when segments exist and all have READY or higher status
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
      storyboardPreViz: isImageStale(scene) && !dismissedWarnings.storyboardPreViz
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

  const workflowTabs: Array<{ key: WorkflowStep; label: string; icon: React.ReactNode }> = useMemo(() => [
    { key: 'dialogueAction', label: 'Script', icon: <FileText className="w-4 h-4" /> },
    // Direction (directorsChair) is hidden - auto-generated from Script, accessible via Frame dialog and Export
    // Frame (storyboardPreViz) merged into Call Action for unified production workflow
    { key: 'callAction', label: 'Call Action', icon: <Clapperboard className="w-4 h-4" /> }
  ], [])
  
  // Set default tab to first incomplete unlocked step (Feature 3: auto-open first incomplete)
  useEffect(() => {
    if (!activeWorkflowTab && !isOutline) {
      // Priority: First incomplete & unlocked step
      const firstIncomplete = workflowTabs.find(tab => {
        const isUnlocked = stepUnlocked[tab.key as keyof typeof stepUnlocked]
        const isComplete = stepCompletion[tab.key as keyof typeof stepCompletion]
        return isUnlocked && !isComplete
      })
      
      // Fall back to first unlocked step if all are complete
      const fallback = workflowTabs.find(tab => stepUnlocked[tab.key as keyof typeof stepUnlocked])
      
      const targetTab = firstIncomplete || fallback
      if (targetTab) {
        setActiveWorkflowTab(targetTab.key)
      }
    }
  }, [isOutline, activeWorkflowTab, stepUnlocked, stepCompletion, workflowTabs])
  
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
                      if (confirm('Delete this scene? This cannot be undone.')) {
                        onDeleteScene?.(sceneIdx)
                      }
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
                    {isBookmarked ? 'Remove bookmark' : 'Bookmark this scene'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Dedicated Workflow Tabs Row - Full-Width Section Header */}
        {!isOutline && (
          <div className="w-full py-3 mb-2">
            <div className="flex w-full items-center bg-gray-900/80 rounded-xl p-1.5 gap-1 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20">
              {workflowTabs.map((tab) => {
                const status = getStepStatus(tab.key)
                const isComplete = status === 'complete'
                const isStale = status === 'stale'
                const isLocked = !stepUnlocked[tab.key as keyof typeof stepUnlocked]
                const isActive = activeWorkflowTab === tab.key
                
                return (
                  <TooltipProvider key={tab.key}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!isLocked) {
                              setActiveWorkflowTab(tab.key)
                              if (!isWorkflowOpen && onWorkflowOpenChange) {
                                onWorkflowOpenChange(true)
                              }
                            }
                          }}
                          disabled={isLocked}
                          className={`
                            relative flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all
                            ${isActive 
                              ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-white border border-blue-500/50 shadow-lg shadow-blue-500/20' 
                              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                            }
                            ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {isLocked ? (
                              <Lock className="w-4 h-4 text-slate-500" />
                            ) : isStale ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            ) : isComplete ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              React.cloneElement(tab.icon as React.ReactElement, { 
                                className: `w-4 h-4 ${isActive ? 'text-blue-400' : ''}` 
                              })
                            )}
                            <span className={`${isStale ? 'text-amber-300' : ''} truncate`}>{tab.label}</span>
                          </div>
                          {isActive && (
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                        {isLocked ? 'Complete previous steps' : isStale ? 'Needs update' : isComplete ? 'Complete' : 'In progress'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
          </div>
        )}

        {/* Line 2: Scene Title with Mark Done and Help controls */}
        <div 
          className="mt-2 flex items-center justify-between cursor-pointer hover:bg-white/5 -mx-2 px-2 py-1 rounded-lg transition-colors"
          onClick={toggleOpen}
        >
          <div className="flex items-center gap-2">
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
                            <p className="text-sm font-semibold">Audience Resonance: {scene.audienceAnalysis.score}/100</p>
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
                  /* No analysis yet - show Analyze button */
                  onAnalyzeScene && (
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
                  )
                )}
              </div>
            )}
          </div>
          
          {/* Mark Done and Help controls */}
          {!isOutline && activeStep && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {/* Audio Buttons - Only visible in Script tab */}
              {activeStep === 'dialogueAction' && (
                <>
                  {/* Play Scene Audio Button */}
                  {onPlayScene && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handlePlay}
                            className={`p-1.5 rounded-lg transition border ${isPlaying ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'}`}
                          >
                            {isPlaying ? (
                              <Square className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                          {isPlaying ? 'Stop audio' : 'Play scene audio'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {/* Update Audio Button (Regenerate) */}
                  {onUpdateSceneAudio && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            disabled={isUpdatingAudio}
                            onClick={async (e) => {
                              e.stopPropagation()
                              setIsUpdatingAudio(true)
                              try {
                                await onUpdateSceneAudio(sceneIdx)
                              } finally {
                                setIsUpdatingAudio(false)
                              }
                            }}
                            className="p-1.5 rounded-lg transition bg-purple-500/20 text-purple-400 border border-purple-500/40 hover:bg-purple-500/30 disabled:opacity-50"
                          >
                            {isUpdatingAudio ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Regenerate all audio for this scene</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>
              )}
              
              {/* Mark as Done / Unmark button */}
              {onMarkWorkflowComplete && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const currentlyComplete = stepCompletion[activeStep as keyof typeof stepCompletion]
                          onMarkWorkflowComplete(sceneIdx, activeStep, !currentlyComplete)
                          
                          // Auto-switch to Call Action when Script is marked as Done
                          if (activeStep === 'dialogueAction' && !currentlyComplete) {
                            setActiveWorkflowTab('callAction')
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded-lg transition flex items-center gap-1 ${
                          stepCompletion[activeStep as keyof typeof stepCompletion]
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                        }`}
                      >
                        {stepCompletion[activeStep as keyof typeof stepCompletion] ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>Done</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-3 h-3" />
                            <span>Mark Done</span>
                          </>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                      {stepCompletion[activeStep as keyof typeof stepCompletion]
                        ? 'Click to unmark as complete'
                        : 'Mark this step as complete'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                      {scene.audienceAnalysis.recommendations.map((rec: string | { text: string; category?: string; impact?: string }, rIdx: number) => {
                        const recText = typeof rec === 'string' ? rec : rec?.text || String(rec)
                        return (
                          <li key={rIdx} className="text-xs text-gray-300 flex gap-3 p-2.5 bg-gray-800/40 rounded-lg border border-gray-700/30 hover:bg-gray-800/60 transition-colors">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold flex-shrink-0">
                              {rIdx + 1}
                            </span>
                            <span className="leading-relaxed">{recText}</span>
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
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Apply Recommendations
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
                  
                  if (!directionStale && !imageStale) return null
                  
                  // If both are stale, prioritize Direction (regenerate Direction first, then Frame)
                  const staleStepKey = directionStale ? 'directorsChair' : 'storyboardPreViz'
                  
                  return (
                    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-300">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium">
                          {directionStale 
                            ? 'Script has changed. Direction may be stale — regenerate before creating Frame.' 
                            : 'Direction has changed. Consider regenerating Frame.'}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (directionStale && onGenerateSceneDirection) {
                                onGenerateSceneDirection(sceneIdx)
                              } else if (imageStale && onGenerateImage) {
                                onGenerateImage(sceneIdx)
                              }
                            }}
                            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs rounded border border-amber-500/40 transition-colors"
                          >
                            {directionStale ? 'Regenerate Direction' : 'Regenerate Frame'}
                          </button>
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
                                Edit Script
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Edit and revise scene script</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {/* Generate All Audio button with workflow guard */}
                      {(() => {
                        const voicesReady = productionReadiness?.isAudioReady ?? true
                        const missingVoices = productionReadiness?.charactersMissingVoices || []
                        const hasNarrationVoice = productionReadiness?.hasNarrationVoice ?? true
                        const isDisabled = !voicesReady || !hasNarrationVoice
                        
                        const button = (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!isDisabled) {
                                setGenerateAllAudioConfirmOpen(true)
                              }
                            }}
                            disabled={isDisabled}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all shadow-sm ${
                              isDisabled 
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                : 'bg-purple-600 hover:bg-purple-500 text-white'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            Generate All Audio
                            {isDisabled && <span className="ml-1 text-amber-400">⚠</span>}
                          </button>
                        )
                        
                        if (isDisabled) {
                          return (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {button}
                                </TooltipTrigger>
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
                                      Set up voices in the Production Bible sidebar
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        }
                        
                        return button
                      })()}
                      
                      {/* Generate All Audio Confirmation Dialog */}
                      <Dialog open={generateAllAudioConfirmOpen} onOpenChange={setGenerateAllAudioConfirmOpen}>
                        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                              <RefreshCw className="w-5 h-5 text-purple-400" />
                              Regenerate All Audio
                            </DialogTitle>
                            <DialogDescription className="text-gray-400">
                              This will delete all existing audio for Scene {sceneIdx + 1} and regenerate fresh audio for narration, dialogue, music, and sound effects.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-2">
                            <p className="text-amber-200 text-sm flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>Existing audio will be permanently deleted. Use this to update audio after script changes.</span>
                            </p>
                          </div>
                          <div className="flex justify-end gap-3 mt-4">
                            <button
                              onClick={() => setGenerateAllAudioConfirmOpen(false)}
                              className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                setGenerateAllAudioConfirmOpen(false)
                                
                                overlayStore?.show(`Regenerating all audio for Scene ${sceneIdx + 1}...`, 60, 'audio-generation')
                                try {
                                  // First, delete ALL existing audio for this scene (silently)
                                  // This ensures fresh generation even for script updates
                                  if (onDeleteSceneAudio) {
                                    // Delete narration audio (always attempt to clear any orphaned audio)
                                    await onDeleteSceneAudio(sceneIdx, 'narration', undefined, undefined, true)
                                    // Delete ALL dialogue audio using -1 index (catches orphaned entries from removed dialogue lines)
                                    await onDeleteSceneAudio(sceneIdx, 'dialogue', -1, undefined, true)
                                    // Delete music audio
                                    await onDeleteSceneAudio(sceneIdx, 'music', undefined, undefined, true)
                                    // Delete ALL SFX audio using -1 index (catches orphaned entries from removed SFX)
                                    await onDeleteSceneAudio(sceneIdx, 'sfx', undefined, -1, true)
                                  }
                                  
                                  // Small delay to ensure deletions are processed
                                  await new Promise(resolve => setTimeout(resolve, 500))
                                  
                                  // Now generate all audio fresh
                                  // Generate narration
                                  if (scene.narration && onGenerateSceneAudio) {
                                    await onGenerateSceneAudio(sceneIdx, 'narration', undefined, undefined)
                                  }
                                  // Generate all dialogues
                                  if (scene.dialogue && onGenerateSceneAudio) {
                                    for (let i = 0; i < scene.dialogue.length; i++) {
                                      const d = scene.dialogue[i]
                                      if (d.line && d.character) {
                                        await onGenerateSceneAudio(sceneIdx, 'dialogue', d.character, i)
                                      }
                                    }
                                  }
                                  // Generate music
                                  if (scene.music) {
                                    await generateMusic(sceneIdx, true)
                                  }
                                  // Generate all SFX
                                  if (Array.isArray(scene.sfx)) {
                                    for (let sfxIdx = 0; sfxIdx < scene.sfx.length; sfxIdx++) {
                                      await generateSFX(sceneIdx, sfxIdx, true)
                                    }
                                  }
                                  overlayStore?.hide()
                                } catch (error) {
                                  console.error('[ScriptPanel] Generate all failed:', error)
                                  overlayStore?.hide()
                                  toast.error('Failed to generate some audio')
                                }
                              }}
                              className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors"
                            >
                              Regenerate All
                            </button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDescriptionCollapsed(!descriptionCollapsed || !narrationCollapsed || !dialogueCollapsed || !musicCollapsed || !sfxCollapsed)
                          setNarrationCollapsed(!descriptionCollapsed || !narrationCollapsed || !dialogueCollapsed || !musicCollapsed || !sfxCollapsed)
                          setDialogueCollapsed(!descriptionCollapsed || !narrationCollapsed || !dialogueCollapsed || !musicCollapsed || !sfxCollapsed)
                          setMusicCollapsed(!descriptionCollapsed || !narrationCollapsed || !dialogueCollapsed || !musicCollapsed || !sfxCollapsed)
                          setSfxCollapsed(!descriptionCollapsed || !narrationCollapsed || !dialogueCollapsed || !musicCollapsed || !sfxCollapsed)
                        }}
                        className="px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md flex items-center gap-1 transition-all"
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${descriptionCollapsed && narrationCollapsed && dialogueCollapsed ? 'rotate-180' : ''}`} />
                        {descriptionCollapsed && narrationCollapsed && dialogueCollapsed ? 'Expand All' : 'Collapse All'}
                      </button>
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
                  
                  {/* Scene Direction (visual/camera/lighting/talent/audio directions) */}
                  {(() => {
                    const sceneDescription = scene.visualDescription || scene.action || scene.summary || scene.heading
                    const sceneDir = scene.sceneDirection
                    const hasDirection = !!sceneDir
                    const isGeneratingDirection = generatingDirectionFor === sceneIdx

                    // Don't show if no description AND no direction
                    if (!sceneDescription && !hasDirection) return null

                    return (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDescriptionCollapsed(!descriptionCollapsed)
                            }}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <ChevronDown className={`w-4 h-4 text-blue-600 dark:text-blue-400 transition-transform ${descriptionCollapsed ? '-rotate-90' : ''}`} />
                            <Film className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Scene Direction</span>
                            {hasDirection && (
                              <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Enhanced
                              </span>
                            )}
                          </button>
                          <div className="flex items-center gap-1">
                            {/* Optimize Direction Button - shows when direction exists */}
                            {hasDirection && onOpenDirectionOptimize && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onOpenDirectionOptimize(sceneIdx)
                                }}
                                disabled={isGeneratingDirection || isOptimizingDirection}
                                className="text-xs px-2 py-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded disabled:opacity-50 flex items-center gap-1"
                                title="Optimize scene direction for professional video production"
                              >
                                <Wand2 className="w-3 h-3" />
                                Optimize
                              </button>
                            )}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!onGenerateSceneDirection) return
                                await onGenerateSceneDirection(sceneIdx)
                              }}
                              disabled={isGeneratingDirection}
                              className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50 flex items-center gap-1"
                              title="Generate detailed scene direction for camera, lighting, talent, and audio"
                            >
                              {isGeneratingDirection ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              {hasDirection ? 'Refresh' : 'Generate'}
                            </button>
                          </div>
                        </div>
                        {!descriptionCollapsed && (
                          <div className="space-y-3">
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
                        )}
                      </div>
                    )
                  })()}

                  {/* Scene Narration */}
                  {scene.narration && (() => {
                    const narrationUrl = scene.narrationAudio?.[selectedLanguage]?.url || (selectedLanguage === 'en' ? scene.narrationAudioUrl : undefined)
                    
                    return (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setNarrationCollapsed(!narrationCollapsed)
                          }}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <ChevronDown className={`w-4 h-4 text-purple-600 dark:text-purple-400 transition-transform ${narrationCollapsed ? '-rotate-90' : ''}`} />
                          <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Scene Narration</span>
                          {narrationUrl && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                              <Volume2 className="w-3 h-3" />
                              {scene.narrationAudio?.[selectedLanguage]?.duration 
                                ? `${scene.narrationAudio[selectedLanguage].duration.toFixed(1)}s`
                                : 'Ready'}
                            </span>
                          )}
                        </button>
                        {narrationUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onPlayAudio?.(narrationUrl, 'narration')
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
                            <a
                              href={narrationUrl}
                              download
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Download Narration"
                            >
                              <Download className="w-4 h-4" />
                            </a>
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
                                uploadAudio(sceneIdx, 'narration')
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
                                uploadAudio(sceneIdx, 'narration')
                              }}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Upload Narration Audio"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {!narrationCollapsed && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                          "{scene.narration}"
                        </div>
                      )}
                    </div>
                  )
                  })()}
                  
                  {/* Scene Cast & Wardrobe Selection */}
                  {scene.dialogue && scene.dialogue.length > 0 && characters && characters.length > 0 && (() => {
                    // Get unique character names from dialogue
                    const sceneCharacterNames = Array.from(new Set(scene.dialogue.map((d: any) => d.character))) as string[]
                    // Find matching characters from character library
                    const sceneCharacters = sceneCharacterNames
                      .map(name => characters.find(c => c.name.toLowerCase() === name.toLowerCase()))
                      .filter((c): c is NonNullable<typeof c> => c !== undefined && c.wardrobes && c.wardrobes.length > 1)
                    
                    // Only show if there are characters with multiple wardrobes
                    if (sceneCharacters.length === 0) return null
                    
                    return (
                      <div className="bg-violet-950 border-l-4 border-violet-500 p-4 rounded-lg">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSceneCastCollapsed(!sceneCastCollapsed)
                          }}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity w-full"
                        >
                          <ChevronDown className={`w-4 h-4 text-violet-400 transition-transform ${sceneCastCollapsed ? '-rotate-90' : ''}`} />
                          <Users className="w-4 h-4 text-violet-400" />
                          <span className="text-sm font-semibold text-gray-200">Scene Wardrobe</span>
                          <span className="text-xs text-gray-500">({sceneCharacters.length} {sceneCharacters.length === 1 ? 'character' : 'characters'} with costume options)</span>
                        </button>
                        
                        {!sceneCastCollapsed && (
                          <div className="mt-3 space-y-2">
                            {sceneCharacters.map((character) => {
                              // Get current wardrobe assignment for this scene
                              const sceneWardrobe = scene.characterWardrobes?.find((cw: any) => cw.characterId === character.id)
                              const currentWardrobeId = sceneWardrobe?.wardrobeId || character.wardrobes?.find(w => w.isDefault)?.id || ''
                              const currentWardrobe = character.wardrobes?.find(w => w.id === currentWardrobeId)
                              
                              return (
                                <div key={character.id} className="flex items-center gap-3 bg-violet-900/30 rounded-lg p-2">
                                  <span className="text-sm font-medium text-violet-200 min-w-[100px]">{character.name}</span>
                                  <select
                                    value={currentWardrobeId}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      const wardrobeId = e.target.value || null
                                      onUpdateSceneWardrobe?.(sceneIdx, character.id, wardrobeId)
                                    }}
                                    className="flex-1 bg-violet-900/50 border border-violet-600/50 text-violet-200 text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                  >
                                    {character.wardrobes?.map((wardrobe) => (
                                      <option key={wardrobe.id} value={wardrobe.id}>
                                        {wardrobe.name}{wardrobe.isDefault ? ' (Default)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                  {currentWardrobe && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button className="p-1 text-violet-400 hover:text-violet-300 hover:bg-violet-800/30 rounded transition-colors">
                                            <Info className="w-4 h-4" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-gray-900 text-white border border-gray-700 max-w-xs p-3">
                                          {currentWardrobe.previewImageUrl && (
                                            <div className="mb-2">
                                              <img 
                                                src={currentWardrobe.previewImageUrl} 
                                                alt={`${character.name} - ${currentWardrobe.name}`}
                                                className="w-20 h-20 object-cover rounded-md border border-gray-600"
                                              />
                                            </div>
                                          )}
                                          <p className="text-xs font-medium text-violet-300 mb-1">{currentWardrobe.name}</p>
                                          <p className="text-xs text-gray-300">{currentWardrobe.description}</p>
                                          {currentWardrobe.accessories && (
                                            <p className="text-xs text-gray-400 mt-1">Accessories: {currentWardrobe.accessories}</p>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              )
                            })}
                            <p className="text-[10px] text-violet-400/70 mt-2">
                              Select different wardrobes for characters in this scene. Changes affect image generation.
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  
                  {/* Scene Dialog */}
                  {scene.dialogue && scene.dialogue.length > 0 && (
                    <div className="bg-emerald-950 border-l-4 border-emerald-500 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDialogueCollapsed(!dialogueCollapsed)
                          }}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <ChevronDown className={`w-4 h-4 text-emerald-400 transition-transform ${dialogueCollapsed ? '-rotate-90' : ''}`} />
                          <Users className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-semibold text-gray-200">Scene Dialog</span>
                          <span className="text-xs text-gray-500">({scene.dialogue.length} {scene.dialogue.length === 1 ? 'line' : 'lines'})</span>
                        </button>
                        {/* Voice Casting Quick View */}
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
                                      ? 'bg-green-600/50 text-green-200 border-green-500/50' 
                                      : charAudioReady > 0
                                      ? 'bg-yellow-800/50 text-yellow-300 border-yellow-600/30'
                                      : 'bg-green-800/50 text-green-300 border-green-600/30'
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
                                    className="ml-2 p-1 rounded hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
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
                      </div>
                      {!dialogueCollapsed && (
                      <div className="space-y-3">
                      {scene.dialogue.map((d: any, i: number) => {
                        // Match audio by both character and dialogueIndex
                        // Handle both old array format and new object format (keyed by language)
                        let dialogueAudioArray: any[] = []
                        if (Array.isArray(scene.dialogueAudio)) {
                          // Old format: array
                          dialogueAudioArray = scene.dialogueAudio
                        } else if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object') {
                          // New format: object keyed by language
                          dialogueAudioArray = scene.dialogueAudio[selectedLanguage] || []
                        }
                        const audioEntry = dialogueAudioArray.find((a: any) => 
                          a.character === d.character && a.dialogueIndex === i
                        )
                        // Extract parenthetical voice direction from line (e.g., "(angrily) I'm fine")
                        const parentheticalMatch = d.line?.match(/^\(([^)]+)\)\s*/)
                        const parenthetical = parentheticalMatch?.[1]
                        const lineWithoutParenthetical = parenthetical ? d.line.replace(/^\([^)]+\)\s*/, '') : d.line
                        
                        return (
                          <div key={i} className="p-3 bg-green-900/30 rounded-lg border border-green-700/30 hover:border-green-600/50 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className="text-sm font-semibold text-green-200">{d.character}</div>
                                  {/* Voice direction / parenthetical */}
                                  {(parenthetical || d.voiceDirection || d.emotion) && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 italic">
                                      {parenthetical || d.voiceDirection || d.emotion}
                                    </span>
                                  )}
                                  {audioEntry?.audioUrl && (
                                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                                      <Volume2 className="w-3 h-3" />
                                      Ready
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-200 leading-relaxed">"{lineWithoutParenthetical}"</div>
                                {audioEntry?.duration && (
                                  <span className="text-[10px] text-gray-500 mt-1">Duration: {audioEntry.duration.toFixed(1)}s</span>
                                )}
                              </div>
                            {audioEntry?.audioUrl ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onPlayAudio?.(audioEntry.audioUrl, d.character)
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                  title="Play Dialogue"
                                >
                                  {playingAudio === audioEntry.audioUrl ? (
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
                                <a
                                  href={audioEntry.audioUrl}
                                  download
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                  title="Download Dialogue"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
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
                                    uploadAudio(sceneIdx, 'dialogue', undefined, i, d.character)
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
                                  uploadAudio(sceneIdx, 'dialogue', undefined, i, d.character)
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
                      )}
                    </div>
                  )}
                  
                  {/* Background Music */}
                  {scene.music && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMusicCollapsed(!musicCollapsed)
                          }}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <ChevronDown className={`w-4 h-4 text-purple-600 dark:text-purple-400 transition-transform ${musicCollapsed ? '-rotate-90' : ''}`} />
                          <Music className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Background Music</span>
                          {scene.musicAudio && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                              <Volume2 className="w-3 h-3" />
                              Audio Ready
                            </span>
                          )}
                        </button>
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
                                  await generateMusic?.(sceneIdx)
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
                            <a
                              href={scene.musicAudio}
                              download
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Download Music"
                            >
                              <Download className="w-4 h-4" />
                            </a>
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
                                uploadAudio(sceneIdx, 'music')
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
                                  await generateMusic?.(sceneIdx)
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
                                uploadAudio(sceneIdx, 'music')
                              }}
                              className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                              title="Upload Music Audio"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {!musicCollapsed && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 italic">
                          {typeof scene.music === 'string' ? scene.music : scene.music.description}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* SFX */}
                  {scene.sfx && Array.isArray(scene.sfx) && scene.sfx.length > 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSfxCollapsed(!sfxCollapsed)
                          }}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <ChevronDown className={`w-4 h-4 text-amber-600 dark:text-amber-400 transition-transform ${sfxCollapsed ? '-rotate-90' : ''}`} />
                          <VolumeIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Sound Effects ({scene.sfx.length})</span>
                        </button>
                      </div>
                      {!sfxCollapsed && (
                        <div className="space-y-2">
                        {scene.sfx.map((sfx: any, sfxIdx: number) => {
                        const sfxAudio = scene.sfxAudio?.[sfxIdx]
                        return (
                          <div key={sfxIdx} className="p-3 bg-amber-100/50 dark:bg-amber-950/30 rounded-lg border border-amber-300/50 dark:border-amber-700/50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <VolumeIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">SFX {sfxIdx + 1}</span>
                                {sfxAudio && (
                                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                                    <Volume2 className="w-3 h-3" />
                                    Audio Ready
                                  </span>
                                )}
                              </div>
                              {sfxAudio ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onPlayAudio?.(sfxAudio, `sfx-${sfxIdx}`)
                                    }}
                                    className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
                                    title="Play SFX"
                                  >
                                    {playingAudio === sfxAudio ? (
                                      <Pause className="w-4 h-4" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      setGeneratingSFX?.({ sceneIdx, sfxIdx })
                                      try {
                                        await generateSFX?.(sceneIdx, sfxIdx)
                                      } catch (error) {
                                        console.error('[ScriptPanel] SFX regeneration failed:', error)
                                      } finally {
                                        setGeneratingSFX?.(null)
                                      }
                                    }}
                                    disabled={generatingSFX?.sceneIdx === sceneIdx && generatingSFX?.sfxIdx === sfxIdx}
                                    className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded disabled:opacity-50"
                                    title="Regenerate SFX"
                                  >
                                    {generatingSFX?.sceneIdx === sceneIdx && generatingSFX?.sfxIdx === sfxIdx ? (
                                      <Loader className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-4 h-4" />
                                    )}
                                  </button>
                                  <a
                                    href={sfxAudio}
                                    download
                                    className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
                                    title="Download SFX"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (confirm('Delete this sound effect? You can regenerate it later.')) {
                                        onDeleteSceneAudio?.(sceneIdx, 'sfx', undefined, sfxIdx)
                                      }
                                    }}
                                    className="p-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded text-red-500 dark:text-red-400"
                                    title="Delete SFX Audio"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      uploadAudio(sceneIdx, 'sfx', sfxIdx)
                                    }}
                                    className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
                                    title="Upload SFX Audio"
                                  >
                                    <Upload className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      setGeneratingSFX?.({ sceneIdx, sfxIdx })
                                      try {
                                        await generateSFX?.(sceneIdx, sfxIdx)
                                      } catch (error) {
                                        console.error('[ScriptPanel] SFX generation failed:', error)
                                      } finally {
                                        setGeneratingSFX?.(null)
                                      }
                                    }}
                                    disabled={generatingSFX?.sceneIdx === sceneIdx && generatingSFX?.sfxIdx === sfxIdx}
                                    className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded disabled:opacity-50"
                                  >
                                    {generatingSFX?.sceneIdx === sceneIdx && generatingSFX?.sfxIdx === sfxIdx ? (
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
                                      uploadAudio(sceneIdx, 'sfx', sfxIdx)
                                    }}
                                    className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
                                    title="Upload SFX Audio"
                                  >
                                    <Upload className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 italic">
                              {typeof sfx === 'string' ? sfx : sfx.description}
                            </div>
                          </div>
                        )
                      })}
                      </div>
                      )}
                    </div>
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
                        onGenerateSceneDirection?.(sceneIdx)
                      }}
                      isGenerating={generatingDirectionFor === sceneIdx}
                    />
                  </div>
                )}

                {activeWorkflowTab === 'storyboardPreViz' && (
                  <div className="space-y-4">
                    {/* Keyframe State Machine - Show SegmentFrameTimeline when segments exist */}
                    {sceneProductionData?.isSegmented && sceneProductionData.segments?.length > 0 ? (
                      <SegmentFrameTimeline
                        segments={sceneProductionData.segments}
                        sceneId={scene.sceneId || scene.id || `scene-${sceneIdx}`}
                        sceneNumber={sceneNumber}
                        sceneImageUrl={scene.imageUrl}
                        selectedSegmentIndex={selectedSegmentIndex}
                        onSelectSegment={setSelectedSegmentIndex}
                        onGenerateFrames={(segmentId, frameType, options) => 
                          onGenerateSegmentFrames?.(
                            scene.sceneId || scene.id || `scene-${sceneIdx}`,
                            segmentId,
                            frameType,
                            options
                          ) ?? Promise.resolve()
                        }
                        onGenerateAllFrames={() => 
                          onGenerateAllSegmentFrames?.(scene.sceneId || scene.id || `scene-${sceneIdx}`) ?? Promise.resolve()
                        }
                        onGenerateVideo={(segmentId) => 
                          onSegmentGenerate?.(
                            scene.sceneId || scene.id || `scene-${sceneIdx}`,
                            segmentId,
                            'I2V'
                          )
                        }
                        onEditFrame={(segmentId, frameType, frameUrl) => {
                          // Use the callback prop from ScriptPanel where state is accessible
                          onOpenFrameEditModal?.(
                            sceneIdx,
                            scene.sceneId || scene.id || `scene-${sceneIdx}`,
                            segmentId,
                            frameType,
                            frameUrl
                          )
                        }}
                        onUploadFrame={(segmentId, frameType, file) => {
                          onUploadFrame?.(
                            scene.sceneId || scene.id || `scene-${sceneIdx}`,
                            segmentId,
                            frameType,
                            file
                          )
                        }}
                        isGenerating={!!generatingFrameForSegment}
                        generatingSegmentId={generatingFrameForSegment}
                        generatingPhase={generatingFramePhase}
                        onSegmentAnimaticSettingsChange={onSegmentAnimaticSettingsChange ? 
                          (segmentId, settings) => onSegmentAnimaticSettingsChange(
                            scene.sceneId || scene.id || `scene-${sceneIdx}`,
                            segmentId,
                            settings
                          ) : undefined
                        }
                        characters={characters?.map(c => ({
                          name: c.name,
                          appearance: c.appearance || c.description,
                          referenceUrl: (c as any).referenceImage
                        }))}
                        objectReferences={objectReferences?.map(obj => ({
                          id: obj.id,
                          name: obj.name,
                          imageUrl: obj.imageUrl || '',
                          description: obj.description,
                        })) || []}
                        sceneDirection={scene.detailedDirection || scene.sceneDirection}
                        sceneData={{
                          id: scene.id,
                          sceneId: scene.sceneId || scene.id || `scene-${sceneIdx}`,
                          heading: scene.heading,
                          action: scene.action,
                          narration: scene.narration,
                          dialogue: scene.dialogue,
                          duration: scene.duration,
                          narrationAudio: scene.narrationAudio,
                          dialogueAudio: scene.dialogueAudio,
                          sceneDirection: scene.detailedDirection || scene.sceneDirection,
                        }}
                        onAddSegment={(newSegment) => {
                          console.log('[ScriptPanel] onAddSegment handler:', { sceneId: scene.sceneId || scene.id || `scene-${sceneIdx}`, newSegment, hasHandler: !!onAddFullSegment })
                          if (onAddFullSegment) {
                            onAddFullSegment(scene.sceneId || scene.id || `scene-${sceneIdx}`, newSegment)
                          } else {
                            console.error('[ScriptPanel] onAddFullSegment is undefined!')
                          }
                        }}
                        onDeleteSegment={onDeleteSegment ? (segmentId) => {
                          console.log('[ScriptPanel] onDeleteSegment called:', { sceneId: scene.sceneId || scene.id || `scene-${sceneIdx}`, segmentId })
                          onDeleteSegment(scene.sceneId || scene.id || `scene-${sceneIdx}`, segmentId)
                        } : undefined}
                        // Regenerate segments via API with audio duration for proper segment count
                        onResegment={onInitializeSceneProduction ? async () => {
                          // Calculate total audio duration for proper segment count
                          const narrationDuration = scene.narrationAudio?.en?.duration || scene.narrationDuration || 0
                          const dialogueArray = scene.dialogueAudio?.en || scene.dialogueAudio || []
                          const dialogueDuration = Array.isArray(dialogueArray) 
                            ? dialogueArray.reduce((acc: number, d: any) => acc + (d.duration || 3), 0)
                            : 0
                          const totalAudioDuration = Math.max(narrationDuration, dialogueDuration) + 2
                          
                          await onInitializeSceneProduction(
                            scene.sceneId || scene.id || `scene-${sceneIdx}`,
                            { 
                              targetDuration: Math.max(scene.duration || 8, totalAudioDuration),
                              generationOptions: {
                                totalAudioDurationSeconds: totalAudioDuration,
                                narrationDriven: narrationDuration > 0
                              }
                            }
                          )
                        } : undefined}
                      />
                    ) : (
                      /* Fallback: Simple single-frame viewer when no segments exist */
                      <div className="space-y-4">
                        {/* Initialize Segments CTA when scene image exists but no segments */}
                        {scene.imageUrl && onInitializeSceneProduction && (
                          <div className="flex items-center gap-4 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-indigo-300">Ready for Frame Anchoring</h4>
                              <p className="text-xs text-slate-400 mt-1">
                                Initialize segments to unlock the Keyframe State Machine for Start/End frame generation.
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => onInitializeSceneProduction(
                                scene.sceneId || scene.id || `scene-${sceneIdx}`,
                                { targetDuration: scene.duration || 8 }
                              )}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              <Layers className="w-4 h-4 mr-2" />
                              Initialize Segments
                            </Button>
                          </div>
                        )}
                        
                        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 group">
                        {scene.imageUrl ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="relative w-full h-full cursor-pointer">
                                <img 
                                  src={scene.imageUrl} 
                                  alt={`Scene ${sceneNumber} Frame`} 
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-1 text-white">
                                  <Maximize2 className="w-4 h-4" />
                                </div>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-black" aria-describedby={undefined}>
                              <DialogTitle className="sr-only">Scene {sceneNumber} Frame</DialogTitle>
                              <div className="relative w-full h-full flex items-center justify-center">
                                <img 
                                  src={scene.imageUrl} 
                                  alt={`Scene ${sceneNumber} Frame Fullscreen`} 
                                  className="max-w-full max-h-[90vh] object-contain"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900">
                            <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
                            <span className="text-sm font-medium">No frame generated</span>
                            <p className="text-xs opacity-60 mt-1">Generate a scene image using the buttons below, or go to Scene tab</p>
                          </div>
                        )}
                        
                        {/* Overlay Actions */}
                        <TooltipProvider>
                          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <Button
                                    size="sm"
                                    variant="secondary"
                                    className="bg-white/90 text-black hover:bg-white w-10 h-10 p-0"
                                    onClick={() => onOpenPromptBuilder?.(sceneIdx)}
                                 >
                                   <Wand2 className="w-4 h-4" />
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent>Generate</TooltipContent>
                             </Tooltip>
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <Button
                                    size="sm"
                                    variant="secondary"
                                    className="bg-white/90 text-black hover:bg-white w-10 h-10 p-0"
                                    onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file && onUploadKeyframe) {
                                      await onUploadKeyframe(sceneIdx, file);
                                    }
                                  };
                                  input.click();
                                }}
                                 >
                                   <Upload className="w-4 h-4" />
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent>Upload</TooltipContent>
                             </Tooltip>
                             {scene.imageUrl && (
                               <>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button
                                       size="sm"
                                       variant="secondary"
                                       className="bg-white/90 text-black hover:bg-white w-10 h-10 p-0"
                                       onClick={async () => {
                                         try {
                                           const response = await fetch(scene.imageUrl);
                                           const blob = await response.blob();
                                           const url = window.URL.createObjectURL(blob);
                                           const a = document.createElement('a');
                                           a.href = url;
                                           a.download = `scene-${sceneNumber}-frame.png`;
                                           document.body.appendChild(a);
                                           a.click();
                                           document.body.removeChild(a);
                                           window.URL.revokeObjectURL(url);
                                         } catch (error) {
                                           console.error('Failed to download image:', error);
                                         }
                                       }}
                                     >
                                       <Download className="w-4 h-4" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent>Download</TooltipContent>
                                 </Tooltip>
                                 {onEditImage && (
                                   <Tooltip>
                                     <TooltipTrigger asChild>
                                       <Button
                                         size="sm"
                                         variant="secondary"
                                         className="bg-white/90 text-black hover:bg-white w-10 h-10 p-0"
                                         onClick={() => onEditImage(scene.imageUrl, sceneIdx)}
                                       >
                                         <Pencil className="w-4 h-4" />
                                       </Button>
                                     </TooltipTrigger>
                                     <TooltipContent>Edit Image</TooltipContent>
                                   </Tooltip>
                                 )}
                                 {onAddToReferenceLibrary && (
                                   <Tooltip>
                                     <TooltipTrigger asChild>
                                       <Button
                                         size="sm"
                                         variant="secondary"
                                         className="bg-white/90 text-black hover:bg-white w-10 h-10 p-0"
                                         onClick={async () => {
                                           await onAddToReferenceLibrary(scene.imageUrl, `Scene ${sceneNumber} Frame`, sceneNumber);
                                         }}
                                       >
                                         <FolderPlus className="w-4 h-4" />
                                       </Button>
                                     </TooltipTrigger>
                                     <TooltipContent>Add to Library</TooltipContent>
                                   </Tooltip>
                                 )}
                               </>
                             )}
                          </div>
                        </TooltipProvider>
                      </div>
                      </div>
                    )}
                  </div>
                )}

                {activeWorkflowTab === 'callAction' && (
                  <SceneDirectionProvider direction={scene.detailedDirection || scene.sceneDirection}>
                  <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Open scene image generation dialog
                            onGenerateImage?.(sceneIdx)
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded transition-colors"
                        >
                          Generate Image
                        </button>
                      </div>
                    )}
                    
                    {/* ==================== STORYBOARD BUILDER CONTAINER ==================== */}
                    {/* Groups: Keyframe Generation + Storyboard Editor - simplified to 2-step workflow */}
                    {sceneProductionData?.isSegmented && sceneProductionData.segments?.length > 0 && (
                      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg overflow-hidden">
                        {/* Storyboard Builder Header */}
                        <button 
                          onClick={() => setStoryboardBuilderCollapsed(!storyboardBuilderCollapsed)}
                          className="w-full p-4 hover:bg-cyan-500/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {storyboardBuilderCollapsed ? <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />}
                            <div className="flex items-center justify-center w-5 h-5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold flex-shrink-0">1</div>
                            <Layers className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                            <div className="text-left">
                              <p className="text-cyan-300 font-medium">Storyboard Builder</p>
                            </div>
                            <span className="text-cyan-400/70 text-sm ml-auto hidden sm:inline">Build keyframes and preview your storyboard</span>
                          </div>
                        </button>
                        
                        {/* Collapsible Content - contained within the card */}
                        <AnimatePresence>
                          {!storyboardBuilderCollapsed && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="px-4 pb-4 space-y-4 border-t border-cyan-500/20"
                            >
                        
                        {/* Keyframe Generation */}
                        <SegmentFrameTimeline
                          segments={sceneProductionData.segments}
                          sceneId={scene.sceneId || scene.id || `scene-${sceneIdx}`}
                          sceneNumber={sceneNumber}
                          sceneImageUrl={scene.imageUrl}
                          selectedSegmentIndex={selectedSegmentIndex}
                          onSelectSegment={setSelectedSegmentIndex}
                          onGenerateFrames={(segmentId, frameType, options) => 
                            onGenerateSegmentFrames?.(
                              scene.sceneId || scene.id || `scene-${sceneIdx}`,
                              segmentId,
                              frameType,
                              options
                            ) ?? Promise.resolve()
                          }
                          onGenerateAllFrames={() => 
                            onGenerateAllSegmentFrames?.(scene.sceneId || scene.id || `scene-${sceneIdx}`) ?? Promise.resolve()
                          }
                          onGenerateVideo={(segmentId) => 
                            onSegmentGenerate?.(
                              scene.sceneId || scene.id || `scene-${sceneIdx}`,
                              segmentId,
                              'I2V'
                            )
                          }
                          onOpenDirectorConsole={() => {
                            const consoleId = `director-console-${scene.sceneId || scene.id || `scene-${sceneIdx}`}`
                            const consoleEl = document.getElementById(consoleId)
                            if (consoleEl) {
                              consoleEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }
                          }}
                          onEditFrame={(segmentId, frameType, frameUrl) => {
                            onOpenFrameEditModal?.(
                              sceneIdx,
                              scene.sceneId || scene.id || `scene-${sceneIdx}`,
                              segmentId,
                              frameType,
                              frameUrl
                            )
                          }}
                          onUploadFrame={(segmentId, frameType, file) => {
                            onUploadFrame?.(
                              scene.sceneId || scene.id || `scene-${sceneIdx}`,
                              segmentId,
                              frameType,
                              file
                            )
                          }}
                          isGenerating={!!generatingFrameForSegment}
                          generatingSegmentId={generatingFrameForSegment}
                          generatingPhase={generatingFramePhase}
                          onSegmentAnimaticSettingsChange={onSegmentAnimaticSettingsChange ? 
                            (segmentId, settings) => onSegmentAnimaticSettingsChange(
                              scene.sceneId || scene.id || `scene-${sceneIdx}`,
                              segmentId,
                              settings
                            ) : undefined
                          }
                          characters={characters?.map(c => ({
                            name: c.name,
                            appearance: c.appearance || c.description,
                            referenceUrl: (c as any).referenceImage
                          }))}
                          objectReferences={objectReferences?.map(obj => ({
                            id: obj.id,
                            name: obj.name,
                            imageUrl: obj.imageUrl || '',
                            description: obj.description,
                          })) || []}
                          sceneDirection={scene.detailedDirection || scene.sceneDirection}
                          sceneData={{
                            id: scene.id,
                            sceneId: scene.sceneId || scene.id || `scene-${sceneIdx}`,
                            heading: scene.heading,
                            action: scene.action,
                            narration: scene.narration,
                            dialogue: scene.dialogue,
                            duration: scene.duration,
                            narrationAudio: scene.narrationAudio,
                            dialogueAudio: scene.dialogueAudio,
                            sceneDirection: scene.detailedDirection || scene.sceneDirection,
                          }}
                          onAddSegment={(newSegment) => {
                            console.log('[ScriptPanel] onAddSegment handler (Storyboard Builder):', { sceneId: scene.sceneId || scene.id, newSegment })
                            if (onAddFullSegment) {
                              onAddFullSegment(scene.sceneId || scene.id || `scene-${sceneIdx}`, newSegment)
                            }
                          }}
                          onDeleteSegment={onDeleteSegment ? (segmentId) => {
                            onDeleteSegment(scene.sceneId || scene.id || `scene-${sceneIdx}`, segmentId)
                          } : undefined}
                          // Regenerate segments via API with audio duration for proper segment count
                          onResegment={onInitializeSceneProduction ? async () => {
                            // Calculate total audio duration for proper segment count
                            const narrationDuration = scene.narrationAudio?.en?.duration || scene.narrationDuration || 0
                            const dialogueArray = scene.dialogueAudio?.en || scene.dialogueAudio || []
                            const dialogueDuration = Array.isArray(dialogueArray) 
                              ? dialogueArray.reduce((acc: number, d: any) => acc + (d.duration || 3), 0)
                              : 0
                            const totalAudioDuration = Math.max(narrationDuration, dialogueDuration) + 2
                            
                            await onInitializeSceneProduction(
                              scene.sceneId || scene.id || `scene-${sceneIdx}`,
                              { 
                                targetDuration: Math.max(scene.duration || 8, totalAudioDuration),
                                generationOptions: {
                                  totalAudioDurationSeconds: totalAudioDuration,
                                  narrationDriven: narrationDuration > 0
                                }
                              }
                            )
                          } : undefined}
                        />
                    
                    {/* Storyboard Editor - Preview and edit timing */}
                    {(() => {
                      // Build audio tracks data from scene using sequential alignment
                      const narrationUrl = scene.narrationAudio?.[selectedLanguage]?.url || (selectedLanguage === 'en' ? scene.narrationAudioUrl : undefined)
                      
                      // Get dialogue audio array
                      let dialogueAudioArray: any[] = []
                      if (Array.isArray(scene.dialogueAudio)) {
                        dialogueAudioArray = scene.dialogueAudio
                      } else if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object') {
                        dialogueAudioArray = scene.dialogueAudio[selectedLanguage] || []
                      }
                      
                      // Check if we have any audio to display
                      const hasSfxAudio = scene.sfxAudio && scene.sfxAudio.length > 0 && scene.sfxAudio.some((url: string) => url)
                      const hasMusicAudio = !!(scene.musicAudio || scene.music?.url)
                      const hasAnyAudio = narrationUrl || dialogueAudioArray.some((d: any) => d?.audioUrl) || hasSfxAudio || hasMusicAudio
                      if (!hasAnyAudio) return null
                      
                      // ================================================================
                      // Use sequential alignment system for consistent timing
                      // ================================================================
                      const alignment = applySequentialAlignmentToScene(scene, selectedLanguage, new Set())
                      
                      // Build audio tracks using aligned timings
                      const audioTracks: AudioTracksData = {
                        voiceover: [],
                        dialogue: [],
                        music: [],
                        sfx: []
                      }
                      
                      // Add Narration to voiceover track (blue) with aligned timing
                      if (narrationUrl) {
                        audioTracks.voiceover!.push({
                          id: 'narration',
                          url: narrationUrl,
                          startTime: alignment.narrationStartTime,
                          duration: alignment.narrationDuration || 5,
                          label: 'Narration'
                        })
                      }
                      
                      // Add dialogue clips with aligned timings
                      const dialogueClips: AudioTrackClip[] = dialogueAudioArray
                        .filter((d: any) => d?.audioUrl)
                        .map((d: any, idx: number) => {
                          // Find aligned timing for this dialogue
                          const alignedTiming = alignment.dialogueTimings.find(t => t.index === idx)
                          return {
                            id: `dialogue-${idx}`,
                            url: d.audioUrl,
                            startTime: alignedTiming?.startTime ?? (alignment.narrationStartTime + alignment.narrationDuration + 1 + (idx * 4)),
                            duration: alignedTiming?.duration ?? d.duration ?? 3,
                            label: d.character || `Line ${idx + 1}`
                          }
                        })
                      
                      if (dialogueClips.length > 0) {
                        audioTracks.dialogue = dialogueClips
                      }
                      
                      // Add SFX clips with aligned timings
                      const sfxList = scene.sfx || []
                      const sfxAudioList = scene.sfxAudio || []
                      
                      if (sfxList.length > 0 || sfxAudioList.length > 0) {
                        const sfxClips: AudioTrackClip[] = []
                        const maxLength = Math.max(sfxList.length, sfxAudioList.length)
                        
                        for (let idx = 0; idx < maxLength; idx++) {
                          const sfxDef = sfxList[idx] || {}
                          const url = sfxAudioList[idx] || (typeof sfxDef !== 'string' && sfxDef.audioUrl)
                          
                          if (!url) continue
                          
                          // Find aligned timing for this SFX
                          const alignedTiming = alignment.sfxTimings.find(t => t.index === idx)
                          
                          sfxClips.push({
                            id: `sfx-${idx}`,
                            url,
                            startTime: alignedTiming?.startTime ?? (1 + idx * 2),
                            duration: alignedTiming?.duration ?? (typeof sfxDef !== 'string' && sfxDef.duration) ?? 2,
                            label: typeof sfxDef === 'string' ? sfxDef.slice(0, 20) : (sfxDef.description?.slice(0, 20) || `SFX ${idx + 1}`)
                          })
                        }
                        
                        if (sfxClips.length > 0) {
                          audioTracks.sfx = sfxClips
                        }
                      }
                      
                      // Add Music with duration spanning entire scene + buffer
                      const musicUrl = scene.musicAudio || scene.music?.url
                      if (musicUrl) {
                        audioTracks.music!.push({
                          id: 'music',
                          url: musicUrl,
                          startTime: 0,
                          duration: alignment.musicDuration,
                          label: 'Background Music'
                        })
                      }
                      
                      // Use aligned total duration
                      const sceneDuration = alignment.totalDuration + 2 // Add 2s buffer for display
                      
                      return (
                        <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setAudioTimelineCollapsed(!audioTimelineCollapsed)
                              }}
                              className="flex items-center gap-3 transition-colors group"
                              title={audioTimelineCollapsed ? 'Show storyboard editor' : 'Hide storyboard editor'}
                            >
                              {audioTimelineCollapsed ? <ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                              <Layers className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                              <span className="text-cyan-300 font-medium">Storyboard Editor</span>
                            </button>
                            <span className="text-cyan-400/70 text-sm ml-auto">{sceneDuration.toFixed(1)}s total</span>
                          </div>
                          <AnimatePresence>
                            {!audioTimelineCollapsed && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-3"
                              >
                                <SceneTimelineV2
                                  mode="storyboard"
                                  segments={sceneProductionData?.segments || []}
                                  scene={scene}
                                  selectedSegmentId={selectedSegmentId}
                                  selectedLanguage={selectedLanguage}
                                  playbackOffset={getPlaybackOffsetForScene?.(scene.sceneId || scene.id || `scene-${sceneIdx}`, selectedLanguage) ?? 0}
                                  suggestedOffset={getSuggestedOffsetForScene?.(scene)}
                                  onPlaybackOffsetChange={(offset) => {
                                    const sceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
                                    handlePlaybackOffsetChange?.(sceneId, sceneIdx, selectedLanguage, offset)
                                  }}
                                  onLanguageChange={(lang) => {
                                    // Update panel-level language state
                                    setSelectedLanguage(lang)
                                  }}
                                  onSegmentSelect={setSelectedSegmentId}
                                  onVisualClipChange={(clipId, changes) => {
                                    const sceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
                                    onSegmentResize?.(sceneId, clipId, changes)
                                  }}
                                  onAudioClipChange={(trackType: AudioTrackType, clipId: string, changes: { startTime?: number; duration?: number }) => {
                                    onAudioClipChange?.(sceneIdx, trackType, clipId, changes)
                                  }}
                                  onDeleteSegment={(segmentId) => {
                                    const sceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
                                    onDeleteSegment?.(sceneId, segmentId)
                                  }}
                                  onReorderSegments={(oldIndex, newIndex) => {
                                    const sceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
                                    onReorderSegments?.(sceneId, oldIndex, newIndex)
                                  }}
                                  onApplyIntelligentAlignment={onApplyIntelligentAlignment}
                                  sceneFrameUrl={scene?.imageUrl}
                                  onGenerateSceneMp4={() => {
                                    setAnimaticRenderSceneIdx(sceneIdx)
                                    setAnimaticRenderDialogOpen(true)
                                  }}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          
                          {/* Segment controls footer when segment selected */}
                          {sceneProductionData?.segments?.length > 0 && !audioTimelineCollapsed && selectedSegmentId && (
                            <div className="px-3 py-2 border-t border-cyan-500/20 bg-cyan-900/10 flex items-center justify-end">
                              <div className="flex items-center gap-2">
                                {/* Edit Segment button */}
                                <button
                                  onClick={() => setEditSegmentDialogOpen(true)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-amber-300 text-xs font-medium transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Edit Segment
                                </button>
                                {/* Delete Segment button - only when more than 1 segment */}
                                {sceneProductionData.segments.length > 1 && (
                                  <button
                                    onClick={() => setDeleteConfirmOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded text-red-300 text-xs font-medium transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    
                    {/* ==================== VIDEO PRODUCTION CONTAINER ==================== */}
                    {/* Groups: Video Generation (DirectorConsole) + Video Editor */}
                    {sceneProductionData?.segments && sceneProductionData.segments.length > 0 && (
                      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg overflow-hidden">
                        {/* Video Production Header */}
                        <button 
                          onClick={() => setVideoProductionCollapsed(!videoProductionCollapsed)}
                          className="w-full p-4 hover:bg-indigo-500/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {videoProductionCollapsed ? <ChevronRight className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />}
                            <div className="flex items-center justify-center w-5 h-5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex-shrink-0">2</div>
                            <Film className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <div className="text-left">
                              <p className="text-indigo-300 font-medium">Video Production</p>
                            </div>
                            <span className="text-indigo-400/70 text-sm ml-auto hidden sm:inline">Generate AI videos and edit your final cut</span>
                          </div>
                        </button>
                        
                        {/* Collapsible Content - contained within the card */}
                        <AnimatePresence>
                          {!videoProductionCollapsed && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="px-4 pb-4 space-y-4 border-t border-indigo-500/20"
                            >
                        
                        {/* Video Generation */}
                        <div id={`director-console-${scene.sceneId || scene.id || `scene-${sceneIdx}`}`} className="scroll-mt-4 pt-4">
                          <DirectorConsole
                            sceneId={scene.sceneId || scene.id || `scene-${sceneIdx}`}
                            sceneNumber={sceneNumber}
                            projectId={projectId}
                            productionData={sceneProductionData}
                            sceneImageUrl={scene.imageUrl}
                            scene={{
                              ...scene,
                              // Pass film-level context for cinematic element generation
                              filmTitle: projectTitle || script?.title,
                              logline: projectLogline || script?.logline,
                              genre: script?.genre,
                              tone: script?.tone,
                              visualStyle: visualStyle,
                              sceneHeading: scene.sceneHeading,
                            }}
                            onGenerate={onSegmentGenerate || (async () => {})}
                            onSegmentUpload={onSegmentUpload ? (segmentId, file) => onSegmentUpload(scene.sceneId || scene.id || `scene-${sceneIdx}`, segmentId, file) : undefined}
                            onLockSegment={onLockSegment ? (segmentId, locked) => onLockSegment(scene.sceneId || scene.id || `scene-${sceneIdx}`, segmentId, locked) : undefined}
                            onRenderedSceneUrlChange={onRenderedSceneUrlChange ? (url) => onRenderedSceneUrlChange(scene.sceneId || scene.id || `scene-${sceneIdx}`, url) : undefined}
                            onProductionDataChange={onProductionDataChange ? (data) => onProductionDataChange(scene.sceneId || scene.id || `scene-${sceneIdx}`, data) : undefined}
                          />
                        </div>
                        
                        {/* Video Editor - Edit final cut with rendered videos */}
                        {(() => {
                          // Check if any segments have rendered or uploaded videos
                          const hasRenderedVideos = sceneProductionData?.segments?.some((seg: SceneSegment) => 
                            (seg.status === 'COMPLETE' || seg.status === 'UPLOADED') && seg.activeAssetUrl?.includes('.mp4')
                          )
                          
                          // Build audio tracks for video editor
                          const narrationUrl = scene.narrationAudio?.[selectedLanguage]?.url || (selectedLanguage === 'en' ? scene.narrationAudioUrl : undefined)
                          let dialogueAudioArray: any[] = []
                          if (Array.isArray(scene.dialogueAudio)) {
                            dialogueAudioArray = scene.dialogueAudio
                          } else if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object') {
                            dialogueAudioArray = scene.dialogueAudio[selectedLanguage] || []
                          }
                          const hasAnyAudio = narrationUrl || dialogueAudioArray.some((d: any) => d?.audioUrl)
                          const completedCount = sceneProductionData?.segments?.filter((s: SceneSegment) => s.status === 'COMPLETE' || s.status === 'UPLOADED').length || 0
                          const totalCount = sceneProductionData?.segments?.length || 0
                          
                          return (
                            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-lg overflow-hidden">
                              {/* Video Editor Header - Collapsible */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setVideoEditorCollapsed(!videoEditorCollapsed)
                                }}
                                className="w-full p-4 hover:bg-emerald-500/5 transition-colors flex items-center gap-3"
                              >
                                {videoEditorCollapsed ? <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                                <Film className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <span className="text-emerald-300 font-medium">Video Editor</span>
                                <span className="text-emerald-400/70 text-sm ml-auto">
                                  {completedCount}/{totalCount} videos ready
                                </span>
                              </button>
                              
                              {/* Collapsible Content */}
                              <AnimatePresence>
                                {!videoEditorCollapsed && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="px-4 pb-4 border-t border-emerald-500/20"
                                  >
                              {!hasRenderedVideos ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                  <Film className="w-8 h-8 text-emerald-400/30 mb-3" />
                                  <p className="text-emerald-300/70 font-medium">No videos rendered yet</p>
                                  <p className="text-emerald-400/50 text-sm mt-1">Generate video clips above to start editing your final cut</p>
                                </div>
                              ) : (
                              <div className="pt-4">
                                <SceneTimelineV2
                                  mode="video"
                                  segments={sceneProductionData?.segments || []}
                                  scene={scene}
                                  selectedSegmentId={selectedSegmentId}
                                  selectedLanguage={selectedLanguage}
                                  playbackOffset={getPlaybackOffsetForScene?.(scene.sceneId || scene.id || `scene-${sceneIdx}`, selectedLanguage) ?? 0}
                                  suggestedOffset={getSuggestedOffsetForScene?.(scene)}
                                  onPlaybackOffsetChange={(offset) => {
                                    const sceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
                                    handlePlaybackOffsetChange?.(sceneId, sceneIdx, selectedLanguage, offset)
                                  }}
                                  onLanguageChange={(lang) => setSelectedLanguage(lang)}
                                  onSegmentSelect={setSelectedSegmentId}
                                  onVisualClipChange={(clipId, changes) => {
                                    const sceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
                                    onSegmentResize?.(sceneId, clipId, changes)
                                  }}
                                  onAudioClipChange={(trackType: AudioTrackType, clipId: string, changes: { startTime?: number; duration?: number }) => {
                                    onAudioClipChange?.(sceneIdx, trackType, clipId, changes)
                                  }}
                                  onDeleteSegment={(segmentId) => {
                                    const sceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
                                    onDeleteSegment?.(sceneId, segmentId)
                                  }}
                                  onReorderSegments={(oldIndex, newIndex) => {
                                    const sceneId = scene.sceneId || scene.id || `scene-${sceneIdx}`
                                    onReorderSegments?.(sceneId, oldIndex, newIndex)
                                  }}
                                  onApplyIntelligentAlignment={onApplyIntelligentAlignment}
                                  sceneFrameUrl={scene?.imageUrl}
                                  onGenerateSceneMp4={() => {
                                    setAnimaticRenderSceneIdx(sceneIdx)
                                    setAnimaticRenderDialogOpen(true)
                                  }}
                                />
                              </div>
                              )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })()}
                        </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    
                    {/* Fallback: SceneProductionManager when no segments yet */}
                    {!(sceneProductionData?.segments && sceneProductionData.segments.length > 0) && (
                      <SceneProductionManager
                        sceneId={scene.sceneId || scene.id || `scene-${sceneIdx}`}
                        sceneNumber={sceneNumber}
                        heading={scene.heading}
                        scene={scene}
                        projectId={projectId}
                        productionData={sceneProductionData || null}
                        references={sceneProductionReferences || {}}
                        onInitialize={onInitializeSceneProduction || (async () => {})}
                        onPromptChange={onSegmentPromptChange || (() => {})}
                        onGenerate={onSegmentGenerate || (async () => {})}
                        onUpload={onSegmentUpload || (async () => {})}
                        audioTracks={sceneAudioTracks}
                        onAddSegment={onAddSegment}
                        onDeleteSegment={onDeleteSegment}
                        onSegmentResize={onSegmentResize}
                        onApplyIntelligentAlignment={onApplyIntelligentAlignment}
                        onReorderSegments={onReorderSegments}
                        onAudioClipChange={onAudioClipChange}
                        onCleanupStaleAudioUrl={onCleanupStaleAudioUrl}
                        onKeyframeChange={onSegmentKeyframeChange}
                        onDialogueAssignmentChange={onSegmentDialogueAssignmentChange}
                        onEditImage={onEditImage ? (imageUrl: string) => onEditImage(imageUrl, sceneIdx) : undefined}
                        onAddEstablishingShot={onAddEstablishingShot}
                        onEstablishingShotStyleChange={onEstablishingShotStyleChange}
                        onBackdropVideoGenerated={onBackdropVideoGenerated}
                        onGenerateEndFrame={onGenerateEndFrame}
                        onEndFrameGenerated={onEndFrameGenerated}
                        characters={characters}
                        onSelectTake={onSelectTake ? (takeSceneId: string, segmentId: string, takeId: string, assetUrl: string) => onSelectTake(takeSceneId, segmentId, takeId, assetUrl) : undefined}
                        onDeleteTake={onDeleteTake ? (takeSceneId: string, segmentId: string, takeId: string) => onDeleteTake(takeSceneId, segmentId, takeId) : undefined}
                      />
                    )}
                  </div>
                  </SceneDirectionProvider>
                )}
              </div>
            </div>
          )}
          
          {/* Add Segment Dialog */}
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
              // Use onAddFullSegment to properly append the complete segment
              if (onAddFullSegment) {
                onAddFullSegment(sceneId, newSegment)
                console.log('[ScriptPanel] onAddFullSegment called successfully')
              } else {
                console.error('[ScriptPanel] onAddFullSegment is NOT defined!')
              }
            }}
          />
          
          {/* Delete Segment Confirmation Dialog */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent className="bg-slate-900 border border-red-500/30 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-red-400 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Delete Segment
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
                  Delete Segment
                </button>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Edit Segment Dialog */}
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
          
          {/* AI Co-Pilot Side Panel */}
          {!isOutline && activeStep && (
            <SceneWorkflowCoPilotPanel
              activeStep={activeStep}
              isOpen={copilotPanelOpen}
              onClose={() => setCopilotPanelOpen(false)}
              onRegenerate={activeStep === 'directorsChair' && onGenerateSceneDirection ? async () => {
                if (onGenerateSceneDirection) {
                  await onGenerateSceneDirection(sceneIdx)
                }
              } : undefined}
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

