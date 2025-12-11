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
import { FileText, Edit, Eye, Sparkles, Loader, Loader2, Play, Square, Volume2, Image as ImageIcon, Wand2, ChevronRight, ChevronUp, Music, Volume as VolumeIcon, Upload, StopCircle, AlertTriangle, ChevronDown, Check, Pause, Download, Zap, Camera, RefreshCw, Plus, Trash2, GripVertical, Film, Users, Star, BarChart3, Clock, Image, Printer, Info, Clapperboard, CheckCircle, Circle, ArrowRight, Bookmark, BookmarkPlus, BookmarkCheck, BookMarked, Lightbulb, Maximize2, Bot, PenTool, FolderPlus, Pencil } from 'lucide-react'
import { SceneWorkflowCoPilot, type WorkflowStep } from './SceneWorkflowCoPilot'
import { SceneWorkflowCoPilotPanel } from './SceneWorkflowCoPilotPanel'
import { SceneProductionManager } from './scene-production/SceneProductionManager'
import { SceneProductionData, SceneProductionReferences } from './scene-production/types'
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
import { ScriptEditorModal } from './ScriptEditorModal'
import { ImageEditModal } from './ImageEditModal'
import { toast } from 'sonner'
import { useOverlayStore } from '@/store/useOverlayStore'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { ReportType, StoryboardData, SceneDirectionData } from '@/lib/types/reports'
import { ProjectCostCalculator } from './ProjectCostCalculator'
import { ExportDialog } from './ExportDialog'
import { GenerateAudioDialog } from './GenerateAudioDialog'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { WebAudioMixer, type SceneAudioConfig, type AudioSource } from '@/lib/audio/webAudioMixer'
import { getAudioDuration } from '@/lib/audio/audioDuration'
import { getAudioUrl } from '@/lib/audio/languageDetection'
import { cleanupScriptAudio } from '@/lib/audio/cleanupAudio'
import { formatSceneHeading } from '@/lib/script/formatSceneHeading'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'

type DialogGenerationMode = 'foreground' | 'background'

interface DialogGenerationProgress {
  status: 'idle' | 'running' | 'completed' | 'error'
  phase: 'narration' | 'dialogue' | 'characters' | 'images'
  currentScene: number
  totalScenes: number
  currentDialogue: number
  totalDialogue: number
  currentCharacter: number
  totalCharacters: number
  currentImage: number
  totalImages: number
  completedSteps: number
  totalSteps: number
  message: string
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
  onGenerateAllAudio?: () => void
  isGeneratingAudio?: boolean
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
  directorReview?: any
  audienceReview?: any
  // NEW: Scene editing props
  onEditScene?: (sceneIndex: number) => void
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
  onSegmentGenerate?: (sceneId: string, segmentId: string, mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD', options?: { startFrameUrl?: string; prompt?: string; negativePrompt?: string; duration?: number; aspectRatio?: '16:9' | '9:16'; resolution?: '720p' | '1080p' }) => Promise<void>
  onSegmentUpload?: (sceneId: string, segmentId: string, file: File) => Promise<void>
  onAddSegment?: (sceneId: string, afterSegmentId: string | null, duration: number) => void
  onDeleteSegment?: (sceneId: string, segmentId: string) => void
  onAudioClipChange?: (sceneId: string, trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => void
  sceneAudioTracks?: Record<string, {
    narration?: { url?: string; startTime: number; duration: number }
    dialogue?: Array<{ url?: string; startTime: number; duration: number; character?: string }>
    sfx?: Array<{ url?: string; startTime: number; duration: number; description?: string }>
    music?: { url?: string; startTime: number; duration: number }
  }>
  bookmarkedScene?: { sceneId?: string; sceneNumber?: number } | null
  onBookmarkScene?: (bookmark: { sceneId: string; sceneNumber: number } | null) => Promise<void> | void
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
  if (!source) return []

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
function SortableSceneCard({ id, onAddScene, onDeleteScene, onEditScene, onGenerateSceneScore, generatingScoreFor, getScoreColorClass, onEditImage, ...props }: any) {
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
        onGenerateSceneScore={onGenerateSceneScore}
        generatingScoreFor={generatingScoreFor}
        getScoreColorClass={getScoreColorClass}
        dragHandleProps={listeners}
        onOpenSceneReview={props.onOpenSceneReview}
        onEditImage={onEditImage}
      />
    </div>
  )
}

export function ScriptPanel({ script, onScriptChange, isGenerating, onExpandScene, onExpandAllScenes, onGenerateSceneImage, characters = [], projectId, visualStyle, validationWarnings = {}, validationInfo = {}, onDismissValidationWarning, onPlayAudio, onGenerateSceneAudio, onGenerateAllAudio, isGeneratingAudio, onPlayScript, onAddScene, onDeleteScene, onReorderScenes, directorScore, audienceScore, onGenerateReviews, isGeneratingReviews, onShowReviews, directorReview, audienceReview, onEditScene, onGenerateSceneScore, generatingScoreFor, getScoreColorClass, hasBYOK = false, onOpenBYOK, onGenerateSceneDirection, generatingDirectionFor, onGenerateAllCharacters, sceneProductionData = {}, sceneProductionReferences = {}, belowDashboardSlot, onInitializeSceneProduction, onSegmentPromptChange, onSegmentGenerate, onSegmentUpload, onAddSegment, onDeleteSegment, onAudioClipChange, sceneAudioTracks = {}, bookmarkedScene, onBookmarkScene, showStoryboard = true, onToggleStoryboard, showDashboard = false, onToggleDashboard, onOpenAssets, isGeneratingKeyframe = false, generatingKeyframeSceneNumber = null, selectedSceneIndex = null, onSelectSceneIndex, timelineSlot, onAddToReferenceLibrary, openScriptEditorWithInstruction = null, onClearScriptEditorInstruction }: ScriptPanelProps) {
  // CRITICAL: Get overlay store for generation blocking - must be at top level before any other hooks
  const overlayStore = useOverlayStore()
  
  const [expandingScenes, setExpandingScenes] = useState<Set<number>>(new Set())
  const [showScriptEditor, setShowScriptEditor] = useState(false)
  const [scriptEditorInitialInstruction, setScriptEditorInitialInstruction] = useState<string | null>(null)
  const [selectedScene, setSelectedScene] = useState<number | null>(null)
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  const [storyboardPreviewOpen, setStoryboardPreviewOpen] = useState(false)
  const [sceneDirectionPreviewOpen, setSceneDirectionPreviewOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [generateAudioDialogOpen, setGenerateAudioDialogOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  
  // Image Edit Modal state
  const [imageEditModalOpen, setImageEditModalOpen] = useState(false)
  const [editingImageData, setEditingImageData] = useState<{ url: string; sceneIdx: number } | null>(null)
  
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
  
  // Track orphan audio objects for cleanup (prevents ghost audio)
  const orphanAudioRefs = useRef<Set<HTMLAudioElement>>(new Set())
  
  // Dialogue generation state
  const [generatingDialogue, setGeneratingDialogue] = useState<{sceneIdx: number, character: string, dialogueIndex?: number} | null>(null)
  
  // Voice selection visibility state
  const [showVoiceSelection, setShowVoiceSelection] = useState(false)
  
  // Script overview visibility state
  const [showScriptOverview, setShowScriptOverview] = useState(false)
  
  // Scene timeline visibility state
  const [showTimeline, setShowTimeline] = useState(true)
  
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
  const [generatingSFX, setGeneratingSFX] = useState<{sceneIdx: number, sfxIdx: number} | null>(null)
  const [generatingMusic, setGeneratingMusic] = useState<number | null>(null)
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [isPlayingMixed, setIsPlayingMixed] = useState(false)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const playbackAbortRef = useRef(false)
  const [bookmarkSavingSceneIdx, setBookmarkSavingSceneIdx] = useState<number | null>(null)
  
  // Single-scene-open state - only one scene workflow can be open at a time
  const [openSceneIdx, setOpenSceneIdx] = useState<number | null>(null)

  const scenes = useMemo(() => normalizeScenes(script), [script])

  // Filter to only show selected scene when selectedSceneIndex is set
  const displayedScenes = useMemo(() => {
    if (selectedSceneIndex !== null && selectedSceneIndex >= 0 && selectedSceneIndex < scenes.length) {
      return [{ scene: scenes[selectedSceneIndex], originalIndex: selectedSceneIndex }]
    }
    // When no scene is selected, show all scenes
    return scenes.map((scene: any, idx: number) => ({ scene, originalIndex: idx }))
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
      const narration = s?.narrationAudioUrl || s?.narrationAudio?.en?.url ? 1 : 0
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

  // Open script editor when instruction is provided from parent (e.g., Review Analysis modal)
  useEffect(() => {
    if (openScriptEditorWithInstruction) {
      setScriptEditorInitialInstruction(openScriptEditorWithInstruction)
      setShowScriptEditor(true)
      // Clear the instruction in parent after opening
      onClearScriptEditorInstruction?.()
    }
  }, [openScriptEditorWithInstruction, onClearScriptEditorInstruction])

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
    options?: { stayOpen: boolean; generateCharacters?: boolean; generateSceneImages?: boolean }
  ) => {
    const stayOpen = options?.stayOpen ?? true
    const includeCharacters = options?.generateCharacters ?? false
    const includeSceneImages = options?.generateSceneImages ?? false

    // If all types are selected and it's English, use the batch generation API (includes music and SFX)
    if (language === 'en' && audioTypes.narration && audioTypes.dialogue && audioTypes.music && audioTypes.sfx) {
      if (onGenerateAllAudio) {
        setDialogGenerationProgress(null)
        setDialogGenerationMode('foreground')
        generationModeRef.current = 'foreground'
        backgroundRequestedRef.current = false
        await onGenerateAllAudio()
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

    // Show warning if music/SFX are selected for non-English
    if ((audioTypes.music || audioTypes.sfx) && language !== 'en') {
      toast.warning('Music and SFX will be generated in English only. Generating narration and dialogue in the selected language.', { style: toastVisualStyle })
    }

    const totalDialogueLines = audioTypes.dialogue
      ? scenes.reduce((sum: number, scene: any) => {
          if (!Array.isArray(scene.dialogue)) return sum
          const count = scene.dialogue.filter((d: any) => d?.character && d?.text).length
          return sum + count
        }, 0)
      : 0

    const totalSceneSteps = audioTypes.narration ? scenes.length : 0
    const totalCharacters = includeCharacters ? (characters?.length || 0) : 0
    const totalImages = includeSceneImages ? scenes.length : 0
    const totalSteps = totalSceneSteps + totalDialogueLines + totalCharacters + totalImages
    const audioTasksSelected = audioTypes.narration || audioTypes.dialogue
    const languageName = SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || language

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
        const hasNarration = audioTypes.narration && scene?.action
        const dialogueEntries = audioTypes.dialogue && Array.isArray(scene.dialogue)
          ? scene.dialogue
              .map((d: any, idx: number) => ({ ...d, __index: idx }))
              .filter((d: any) => d?.character && d?.text)
          : []

        if (hasNarration) {
          updateDialogProgress((prev) => prev ? {
            ...prev,
            phase: 'narration',
            currentScene: sceneIdx + 1,
            message: `Generating narration for scene ${sceneIdx + 1} of ${scenes.length}`,
          } : prev)

          await onGenerateSceneAudio(sceneIdx, 'narration', undefined, undefined, language)

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

            await onGenerateSceneAudio(sceneIdx, 'dialogue', entry.character, entry.__index, language)

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

            updateDialogProgress(prev => prev ? {
              ...prev,
              phase: 'images',
              currentScene: sceneIdx + 1,
              currentImage: Math.min(prev.currentImage, sceneIdx),
              message: hasImage
                ? `Scene ${sceneIdx + 1} already has an image. Skipping generation...`
                : `Generating image for scene ${sceneIdx + 1}${sceneHeading ? ` • ${sceneHeading}` : ''}`,
            } : prev)

            if (!hasImage) {
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
              message: hasImage
                ? `Scene ${sceneIdx + 1} already had an image (skipped).`
                : `Generated image for scene ${sceneIdx + 1}.`,
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

      const completionMessage = `${isBackground ? 'Background generation' : `Generation${audioTasksSelected ? ` for ${languageName}` : ''}`} complete: ${taskSummary}.`
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
    if (descriptionUrl) {
      config.description = descriptionUrl
      const storedDescriptionDuration = scene.descriptionAudio?.[selectedLanguage]?.duration
      const descriptionDuration = await resolveAudioDuration(descriptionUrl, storedDescriptionDuration)
      descriptionEndTime = descriptionDuration
      totalDuration = Math.max(totalDuration, descriptionEndTime)
    }

    const narrationOffset = descriptionUrl
      ? descriptionEndTime + 0.35
      : 2

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
      
      for (const dialogue of dialogueArray) {
        const audioUrl = dialogue.audioUrl || dialogue.url
        if (audioUrl) {
          config.dialogue.push({
            url: audioUrl,
            startTime: currentTime
          })
          
          const dialogueDuration = await resolveAudioDuration(audioUrl, dialogue.duration)
          totalDuration = Math.max(totalDuration, currentTime + dialogueDuration)
          
          // Add 300ms pause between dialogue lines for natural pacing
          currentTime += dialogueDuration + 0.3
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
  const generateSFX = async (sceneIdx: number, sfxIdx: number) => {
    const scene = scenes[sceneIdx]
    const sfx = scene?.sfx?.[sfxIdx]
    if (!sfx) return

    setGeneratingSFX({ sceneIdx, sfxIdx })
    overlayStore?.show(`Generating sound effect ${sfxIdx + 1} for Scene ${sceneIdx + 1}...`, 15)
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
      overlayStore?.hide()
      toast.success(`Sound effect generated!`)
    } catch (error: any) {
      console.error('[SFX Generation] Error:', error)
      overlayStore?.hide()
      toast.error(`Failed to generate sound effect: ${error.message}`)
    } finally {
      setGeneratingSFX(null)
    }
  }

  const generateMusic = async (sceneIdx: number) => {
    const scene = scenes[sceneIdx]
    const music = scene?.music
    if (!music) return

    setGeneratingMusic(sceneIdx)
    overlayStore?.show(`Generating music for Scene ${sceneIdx + 1}...`, 45)
    try {
      const duration = scene.duration || 30
      const response = await fetch('/api/tts/elevenlabs/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: typeof music === 'string' ? music : music.description, duration })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Music generation failed')
      }

      const blob = await response.blob()
      
      // Upload to blob storage for persistence
      const formData = new FormData()
      const fileName = `music-${projectId || 'temp'}-scene-${sceneIdx}-${Date.now()}.mp3`
      formData.append('file', blob, fileName)
      
      const uploadResponse = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.details || 'Failed to save music audio')
      }
      
      const uploadData = await uploadResponse.json()
      const audioUrl = uploadData.audioUrl
      
      // Update scene with persistent audio URL
      await saveSceneAudio(sceneIdx, 'music', audioUrl)
      overlayStore?.hide()
      toast.success(`Music generated!`)
    } catch (error: any) {
      console.error('[Music Generation] Error:', error)
      overlayStore?.hide()
      toast.error(`Failed to generate music: ${error.message}`)
    } finally {
      setGeneratingMusic(null)
    }
  }

  const uploadAudio = async (sceneIdx: number, type: 'sfx' | 'music', sfxIdx?: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/mp3,audio/wav,audio/ogg,audio/webm'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.details || 'Upload failed')
        }

        const data = await response.json()
        await saveSceneAudio(sceneIdx, type, data.audioUrl, sfxIdx)
      } catch (error: any) {
        console.error('[Audio Upload] Error:', error)
        alert(`Failed to upload audio: ${error.message}`)
      }
    }

    input.click()
  }

  const saveSceneAudio = async (sceneIdx: number, audioType: 'sfx' | 'music', audioUrl: string, sfxIdx?: number) => {
    const updatedScenes = [...scenes]
    
    if (audioType === 'sfx' && sfxIdx !== undefined) {
      // Ensure sfx array exists
      if (!updatedScenes[sceneIdx].sfx) updatedScenes[sceneIdx].sfx = []
      
      // Update sfx item with audioUrl
      if (typeof updatedScenes[sceneIdx].sfx[sfxIdx] === 'string') {
        updatedScenes[sceneIdx].sfx[sfxIdx] = {
          description: updatedScenes[sceneIdx].sfx[sfxIdx],
          audioUrl
        }
      } else {
        updatedScenes[sceneIdx].sfx[sfxIdx] = {
          ...updatedScenes[sceneIdx].sfx[sfxIdx],
          audioUrl
        }
      }
      
      // ALSO set sfxAudio array for UI display (parallel structure to dialogueAudio)
      if (!updatedScenes[sceneIdx].sfxAudio) {
        updatedScenes[sceneIdx].sfxAudio = []
      }
      updatedScenes[sceneIdx].sfxAudio[sfxIdx] = audioUrl
    } else if (audioType === 'music') {
      // Set musicAudio property (not music.audioUrl)
      updatedScenes[sceneIdx].musicAudio = audioUrl
    }

    // Update local state
    const updatedScript = {
      ...script,
      script: {
        ...script.script,
        scenes: updatedScenes
      }
    }
    onScriptChange(updatedScript)

    // Save to database if projectId is available
    if (projectId) {
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              visionPhase: {
                ...script,
                script: { scenes: updatedScenes }
              }
            }
          })
        })
      } catch (error) {
        console.error('[Save Audio] Error:', error)
      }
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
        individualAudioRef.current.play()
        setPlayingAudio(audioUrl)
      }
    }
  }


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

  return (
    <>
    <div className="relative rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/60 h-full flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(8,8,20,0.55)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sf-primary via-fuchsia-500 to-cyan-400 opacity-80" />
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex-shrink-0 bg-slate-900/70 backdrop-blur rounded-t-3xl">
        {/* Title and Action Buttons - Same Line */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">Scene Studio</h2>
            {isGenerating && (
              <span className="text-xs text-cyan-300 flex items-center gap-1.5">
                <Loader className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </span>
            )}
          </div>
          
          {/* Action Buttons - Right Justified */}
          <div className="flex items-center gap-2">
            {/* Flow / Co-Director Button (Coming Soon) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="flex items-center gap-2 opacity-50 cursor-not-allowed border-purple-500/30 hover:border-purple-500/30"
                  >
                    <Bot className="w-5 h-5 text-purple-400" />
                    <span className="text-sm">Flow</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700 max-w-xs">
                  <p className="font-medium">Intelligent Co-Director</p>
                  <p className="text-xs text-gray-400 mt-1">Coming Soon - AI assistant that analyzes your project and guides you through the optimal workflow</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Build All Button (formerly Assets) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (onOpenAssets) {
                        onOpenAssets()
                      } else {
                        setGenerateAudioDialogOpen(true)
                      }
                    }}
                    className="flex items-center gap-2 border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/10"
                  >
                    <Wand2 className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm">Build</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700 max-w-xs">
                  <p className="font-medium">Auto-Build Assets</p>
                  <p className="text-xs text-gray-400 mt-1">Automatically generate characters, directions, scene frames, audio, and video segments</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Edit Script Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowScriptEditor(true)}
                    className="flex items-center gap-2 border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10"
                  >
                    <PenTool className="w-5 h-5 text-blue-400" />
                    <span className="text-sm">Edit</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                  <p>Edit screenplay script</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Export Button */}
            {script && scenes && scenes.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExportDialogOpen(true)}
                      className="flex items-center gap-2 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                    >
                      <Download className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm">Export</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                    <p>Export script, storyboard, or reports</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap text-slate-200">
          
          {/* Stop button if playing */}
          {loadingSceneId !== null && (
            <Button
              variant="outline"
              size="sm"
              onClick={stopAudio}
              className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-100 dark:border-red-700"
            >
              <Square className="w-4 h-4" />
              <span className="hidden sm:inline">Stop</span>
            </Button>
          )}
          {/* Generate Audio button moved to Storyboard header */}
          
          {/* Language Selector */}
          <div className="w-[140px]">
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

          {/* Action buttons moved to header row */}

          {dialogGenerationMode === 'background' && isDialogGenerating && backgroundProgressPercent !== null && (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <Loader className="w-3 h-3 animate-spin" />
              <span>BG {backgroundProgressPercent}%</span>
            </div>
          )}
        </div>
        
        {/* Timeline Slot - renders scene timeline selector */}
        {timelineSlot && (
          <div className="mt-3">
            <button 
              onClick={() => setShowTimeline(!showTimeline)}
              className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <span>Scene Timeline</span>
              {showTimeline ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showTimeline && timelineSlot}
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
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Try regenerating the script
                </p>
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
                      sceneProductionData={sceneProductionData[scene.sceneId || scene.id || `scene-${idx}`] || undefined}
                      sceneProductionReferences={sceneProductionReferences[scene.sceneId || scene.id || `scene-${idx}`] || undefined}
                      onInitializeSceneProduction={onInitializeSceneProduction}
                      onSegmentPromptChange={onSegmentPromptChange}
                      onSegmentGenerate={onSegmentGenerate}
                      onSegmentUpload={onSegmentUpload}
                      onAddSegment={onAddSegment}
                      onDeleteSegment={onDeleteSegment}
                      onAudioClipChange={onAudioClipChange}
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
                          isWorkflowOpen={selectedSceneIndex !== null ? true : openSceneIdx === idx}
                          onWorkflowOpenChange={(isOpen: boolean) => {
                            // Single-scene-open behavior: close others when opening this one
                            // When selectedSceneIndex is set, the scene is always open
                            if (selectedSceneIndex === null) {
                              setOpenSceneIdx(isOpen ? idx : null)
                            }
                          }}
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

      {/* Script Editor Modal */}
      {showScriptEditor && (
        <ScriptEditorModal
          isOpen={showScriptEditor}
          onClose={() => {
            setShowScriptEditor(false)
            setScriptEditorInitialInstruction(null) // Clear instruction when closing
          }}
          script={script?.script || script}
          projectId={projectId || ''}
          characters={characters}
          directorReview={directorReview}
          audienceReview={audienceReview}
          initialInstruction={scriptEditorInitialInstruction || undefined}
          onApplyChanges={(revisedScript) => {
            // Clean up stale audio when script scenes are edited
            const originalScenes = script?.script?.scenes || script?.scenes || []
            const revisedScenes = revisedScript.scenes || []
            const cleanedScenes = cleanupScriptAudio(originalScenes, revisedScenes)
            
            const updatedScript = {
              ...script,
              script: {
                ...revisedScript,
                scenes: cleanedScenes
              }
            }
            onScriptChange(updatedScript)
            setShowScriptEditor(false)
            setScriptEditorInitialInstruction(null) // Clear instruction after applying
          }}
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
          onSave={(newImageUrl) => {
            // Update the scene with the new image URL
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
            setImageEditModalOpen(false)
            setEditingImageData(null)
          }}
        />
      )}

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
            subject: c.subject
          }))}
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
        className="hidden"
      />

      {/* Global Keyframe Generation Overlay */}
      {isGeneratingKeyframe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-purple-500 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <Loader className="w-16 h-16 animate-spin text-purple-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-purple-300 animate-pulse"></div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                Generating Scene Frame
              </h3>
              {generatingKeyframeSceneNumber !== null && (
                <p className="text-sm text-gray-400 mb-3">
                  Scene {generatingKeyframeSceneNumber}
                </p>
              )}
              <p className="text-sm text-gray-400 text-center">
                Creating your scene visualization with character references...
              </p>
              <p className="text-xs text-gray-500 mt-2">
                This may take 15-30 seconds with character matching
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
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
  // NEW: Scene production props
  sceneProductionData?: SceneProductionData | null
  sceneProductionReferences?: SceneProductionReferences
  // Optional slot renderer to place content below Dashboard (e.g., Storyboard header)
  // Provides helper to open the Generate Audio dialog from parent section
  belowDashboardSlot?: (helpers: { openGenerateAudio: () => void }) => React.ReactNode
  onInitializeSceneProduction?: (sceneId: string, options: { targetDuration: number; segments?: any[] }) => Promise<void>
  onSegmentPromptChange?: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentGenerate?: (sceneId: string, segmentId: string, mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD', options?: { startFrameUrl?: string; prompt?: string; negativePrompt?: string; duration?: number; aspectRatio?: '16:9' | '9:16'; resolution?: '720p' | '1080p' }) => Promise<void>
  onSegmentUpload?: (sceneId: string, segmentId: string, file: File) => Promise<void>
  onAddSegment?: (sceneId: string, afterSegmentId: string | null, duration: number) => void
  onDeleteSegment?: (sceneId: string, segmentId: string) => void
  onAudioClipChange?: (sceneId: string, trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => void
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
  sceneProductionData,
  sceneProductionReferences,
  onInitializeSceneProduction,
  onSegmentPromptChange,
  onSegmentGenerate,
  onSegmentUpload,
  onAddSegment,
  onDeleteSegment,
  onAudioClipChange,
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
}: SceneCardProps) {
  const isOutline = !scene.isExpanded && scene.summary
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<WorkflowStep | null>(null)
  const [copilotPanelOpen, setCopilotPanelOpen] = useState(false)
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [directionBuilderOpen, setDirectionBuilderOpen] = useState(false)
  
  // Determine active step for Co-Pilot
  const activeStep: WorkflowStep | null = activeWorkflowTab
  
  // Completion status detection for workflow steps
  const stepCompletion = useMemo(() => {
    const dialogueActionComplete = !!(scene.narration || (scene.dialogue && scene.dialogue.length > 0))
    const directorsChairComplete = !!scene.sceneDirection
    const storyboardPreVizComplete = !!scene.imageUrl
    // Check if Call Action is complete: scene must be segmented and all segments must have assets
    const callActionComplete = (() => {
      if (!sceneProductionData) return false
      if (!sceneProductionData.isSegmented || sceneProductionData.segments.length === 0) return false
      // All segments should have active assets (video or image)
      return sceneProductionData.segments.every(segment => segment.activeAssetUrl && segment.assetType)
    })()
    
    return {
      dialogueAction: dialogueActionComplete,
      directorsChair: directorsChairComplete,
      storyboardPreViz: storyboardPreVizComplete,
      callAction: callActionComplete,
    }
  }, [scene.narration, scene.dialogue, scene.sceneDirection, scene.imageUrl, sceneProductionData])
  
  // Sequential activation logic - steps unlock based on prerequisite completion
  const stepUnlocked = useMemo(() => {
    return {
      dialogueAction: true, // Always unlocked
      directorsChair: stepCompletion.dialogueAction,
      storyboardPreViz: stepCompletion.directorsChair,
      callAction: stepCompletion.storyboardPreViz,
    }
  }, [stepCompletion])
  
  // Determine status for each step
  type StepStatus = 'complete' | 'in-progress' | 'todo' | 'locked'

  const getStepStatus = (stepKey: keyof typeof stepCompletion): StepStatus => {
    if (stepCompletion[stepKey]) return 'complete'
    if (activeWorkflowTab === stepKey) return 'in-progress'
    if (!stepUnlocked[stepKey as keyof typeof stepUnlocked]) return 'locked'
    return 'todo'
  }

  const chipClassByStatus: Record<StepStatus, string> = {
    complete: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40',
    'in-progress': 'bg-sf-primary/20 text-sf-primary border border-sf-primary/40',
    todo: 'bg-white/5 text-slate-300 border border-white/10',
    locked: 'bg-slate-800/60 text-slate-500 border border-white/10'
  }

  const chipDotClass: Record<StepStatus, string> = {
    complete: 'bg-emerald-300',
    'in-progress': 'bg-sf-primary',
    todo: 'bg-slate-400',
    locked: 'bg-slate-600'
  }

  const workflowTabs: Array<{ key: WorkflowStep; label: string; icon: React.ReactNode }> = useMemo(() => [
    { key: 'dialogueAction', label: 'Script', icon: <FileText className="w-4 h-4" /> },
    { key: 'directorsChair', label: 'Direction', icon: <Film className="w-4 h-4" /> },
    { key: 'storyboardPreViz', label: 'Frame', icon: <Camera className="w-4 h-4" /> },
    { key: 'callAction', label: 'Call Action', icon: <Clapperboard className="w-4 h-4" /> }
  ], [])
  
  // Set default tab to first unlocked step
  useEffect(() => {
    if (!activeWorkflowTab && !isOutline) {
      const firstUnlocked = workflowTabs.find(tab => stepUnlocked[tab.key as keyof typeof stepUnlocked])
      if (firstUnlocked) {
        setActiveWorkflowTab(firstUnlocked.key)
      }
    }
  }, [isOutline, activeWorkflowTab, stepUnlocked, workflowTabs])
  
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
          {/* Left Side: Scene Management Controls */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="p-1 cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    {...(dragHandleProps || {})}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Drag to reorder</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
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
            
            {/* Scene & Time Pill - Consolidated Timeline Metadata */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2 bg-indigo-900/40 rounded-full px-3 py-1 text-xs border border-indigo-700 cursor-help">
                    <span className="text-indigo-300 font-extrabold">S {sceneNumber}</span>
                    <span className="text-gray-500">|</span>
                    <span className="text-white font-bold tracking-wider">{formatDuration(calculateSceneDuration(scene))}</span>
                    <span className="text-gray-400">@ {formatDuration(timelineStart || 0)}</span>
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
          
          {/* Right Side: Scene Actions & Status */}
          <div className="flex items-center gap-2">
            {/* Workflow Status Indicators */}
            <div className="flex items-center gap-1 mr-2">
              {workflowTabs.map((tab) => {
                const status = getStepStatus(tab.key)
                const isComplete = status === 'complete'
                const isInProgress = status === 'in-progress'
                
                return (
                  <TooltipProvider key={tab.key}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full border transition-colors ${
                          isComplete 
                            ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                            : isInProgress
                              ? 'bg-sf-primary/20 border-sf-primary/50 text-sf-primary'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}>
                          {React.cloneElement(tab.icon as React.ReactElement, { className: "w-3 h-3" })}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                        {tab.label}: {status === 'complete' ? 'Complete' : status === 'in-progress' ? 'In Progress' : 'Pending'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
            
            {/* Edit Button */}
            {!isOutline && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onEditScene) onEditScene(sceneIdx)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-xs">Edit Scene</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Edit scene</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Play Button */}
            {!isOutline && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onPlayScene) onPlayScene(sceneIdx)
                      }}
                      disabled={isPlaying}
                      className="flex items-center gap-1 px-2 py-1 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span className="text-xs">{isPlaying ? 'Stop' : 'Play'}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                    {isPlaying ? 'Stop playing scene' : 'Play scene'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Open/Close Button */}
            <button
              onClick={toggleOpen}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors"
              title={isWorkflowOpen ? "Collapse scene" : "Expand scene"}
            >
              {isWorkflowOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

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

        {/* Line 2: Scene Title - Click to toggle open/close */}
        <div 
          className="mt-2 cursor-pointer hover:bg-white/5 -mx-2 px-2 py-1 rounded-lg transition-colors"
          onClick={toggleOpen}
        >
          <p className="text-xl font-semibold text-white leading-tight flex items-center gap-2">
            SCENE {sceneNumber}: {formattedHeading}
            <span className="text-xs text-gray-500 font-normal">
              {isWorkflowOpen ? '(click to collapse)' : '(click to expand)'}
            </span>
          </p>
        </div>
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
          
          {/* Folder Tab Navigation */}
          {!isOutline && (
            <div className="mt-4">
              <div className="flex items-end border-b border-gray-700/50 px-2">
                {workflowTabs.map((tab) => {
                  const isActive = activeWorkflowTab === tab.key
                  const status = getStepStatus(tab.key)
                  const isLocked = !stepUnlocked[tab.key as keyof typeof stepUnlocked]
                  
                  return (
                    <button
                      key={tab.key}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isLocked) setActiveWorkflowTab(tab.key)
                      }}
                      disabled={isLocked}
                      className={`
                        relative px-4 py-2 text-sm font-medium rounded-t-lg transition-all mr-1
                        ${isActive 
                          ? 'bg-slate-800/80 text-white border-t border-x border-gray-600/50 border-b-slate-900' 
                          : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-transparent'
                        }
                        ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {status === 'complete' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          React.cloneElement(tab.icon as React.ReactElement, { 
                            className: `w-3.5 h-3.5 ${isActive ? 'text-sf-primary' : ''}` 
                          })
                        )}
                        {tab.label}
                      </div>
                    </button>
                  )
                })}
                
                {/* AI Co-Pilot Help Button */}
                {activeStep && (
                  <div className="ml-auto mb-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCopilotPanelOpen(!copilotPanelOpen)
                            }}
                            className={`p-1.5 rounded-lg transition ${
                              copilotPanelOpen
                                ? 'bg-sf-primary/20 text-sf-primary border border-sf-primary/40'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                            }`}
                            aria-label={activeStep === 'dialogueAction' ? 'Script help' : activeStep === 'directorsChair' ? 'Direction help' : activeStep === 'storyboardPreViz' ? 'Frame help' : 'Call Action help'}
                          >
                            <Lightbulb className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                          {activeStep === 'dialogueAction' && 'Get help with Script workflow'}
                          {activeStep === 'directorsChair' && 'Get help with Direction workflow'}
                          {activeStep === 'storyboardPreViz' && 'Get help with Frame workflow'}
                          {activeStep === 'callAction' && 'Get help with Call Action workflow'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
              
              {/* Tab Content Container */}
              <div className="bg-slate-800/30 rounded-b-lg rounded-tr-lg p-4 min-h-[200px]">
                {activeWorkflowTab === 'dialogueAction' && (
                  <div className="space-y-4">
                  {/* Scene Description (plays before narration) */}
                  {(() => {
                    const sceneDescription = scene.visualDescription || scene.action || scene.summary || scene.heading
                    if (!sceneDescription) return null

                    const descriptionUrl = scene.descriptionAudio?.[selectedLanguage]?.url || (selectedLanguage === 'en' ? scene.descriptionAudioUrl : undefined)

                    return (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                            <span className="text-xs font-semibold text-purple-700 dark:text-purple-200">Scene Description</span>
                            {descriptionUrl && (
                              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                                <Volume2 className="w-3 h-3" />
                                Audio Ready
                              </span>
                            )}
                          </div>
                          {descriptionUrl ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onPlayAudio?.(descriptionUrl, 'description')
                                }}
                                className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                                title="Play Scene Description"
                              >
                                {playingAudio === descriptionUrl ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (!onGenerateSceneAudio) return

                                  setGeneratingDialogue?.({ sceneIdx, character: '__description__' })
                                  overlayStore?.show(`Regenerating scene description for Scene ${sceneIdx + 1}...`, 20)
                                  try {
                                    await onGenerateSceneAudio?.(sceneIdx, 'description', undefined, undefined, selectedLanguage)
                                    overlayStore?.hide()
                                    toast.success('Scene description regenerated!')
                                  } catch (error) {
                                    console.error('[ScriptPanel] Description regeneration failed:', error)
                                    overlayStore?.hide()
                                    toast.error('Failed to regenerate description audio')
                                  } finally {
                                    setGeneratingDialogue?.(null)
                                  }
                                }}
                                disabled={generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__description__'}
                                className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded disabled:opacity-50"
                                title="Regenerate Scene Description Audio"
                              >
                                {generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__description__' ? (
                                  <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </button>
                              <a
                                href={descriptionUrl}
                                download
                                className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                                title="Download Scene Description Audio"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          ) : (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!onGenerateSceneAudio) return

                                setGeneratingDialogue?.({ sceneIdx, character: '__description__' })
                                overlayStore?.show(`Generating scene description for Scene ${sceneIdx + 1}...`, 20)
                                try {
                                  await onGenerateSceneAudio?.(sceneIdx, 'description', undefined, undefined, selectedLanguage)
                                  overlayStore?.hide()
                                  toast.success('Scene description generated!')
                                } catch (error) {
                                  console.error('[ScriptPanel] Description generation failed:', error)
                                  overlayStore?.hide()
                                  toast.error('Failed to generate scene description audio')
                                } finally {
                                  setGeneratingDialogue?.(null)
                                }
                              }}
                              disabled={generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__description__'}
                              className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50 flex items-center gap-1"
                            >
                              {generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__description__' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : null}
                              Generate Audio
                            </button>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                          "{sceneDescription}"
                        </div>
                      </div>
                    )
                  })()}

                  {/* Scene Narration */}
                  {scene.narration && (() => {
                    const narrationUrl = scene.narrationAudio?.[selectedLanguage]?.url || (selectedLanguage === 'en' ? scene.narrationAudioUrl : undefined)
                    
                    return (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Scene Narration</span>
                          {narrationUrl && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                              <Volume2 className="w-3 h-3" />
                              Audio Ready
                            </span>
                          )}
                        </div>
                        {narrationUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onPlayAudio?.(narrationUrl, 'narration')
                              }}
                              className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
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
                                  toast.success('Narration regenerated!')
                                } catch (error) {
                                  console.error('[ScriptPanel] Narration regeneration failed:', error)
                                  overlayStore?.hide()
                                  toast.error('Failed to regenerate narration')
                                } finally {
                                  setGeneratingDialogue?.(null)
                                }
                              }}
                              disabled={generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__narration__'}
                              className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded disabled:opacity-50"
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
                              className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
                              title="Download Narration"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        ) : (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              setGeneratingDialogue?.({ sceneIdx, character: '__narration__' })
                              overlayStore?.show(`Generating narration for Scene ${sceneIdx + 1}...`, 20)
                              try {
                                await onGenerateSceneAudio?.(sceneIdx, 'narration', undefined, undefined, selectedLanguage)
                                overlayStore?.hide()
                                toast.success('Narration generated!')
                              } catch (error) {
                                console.error('[ScriptPanel] Narration generation failed:', error)
                                overlayStore?.hide()
                                toast.error('Failed to generate narration')
                              } finally {
                                setGeneratingDialogue?.(null)
                              }
                            }}
                            disabled={generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__narration__'}
                            className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 flex items-center gap-1"
                          >
                            {generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__narration__' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : null}
                            Generate Audio
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                        "{scene.narration}"
                      </div>
                    </div>
                  )
                  })()}
                  
                  {/* Scene Dialog */}
                  {scene.dialogue && scene.dialogue.length > 0 && (
                    <div className="bg-green-950 border-l-4 border-green-500 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Scene Dialog</span>
                      </div>
                      <div className="space-y-2">
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
                        return (
                          <div key={i} className="flex items-start gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.character}</div>
                                {audioEntry?.audioUrl && (
                                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                                    <Volume2 className="w-3 h-3" />
                                    Audio Ready
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-700 dark:text-gray-300 italic">"{d.line}"</div>
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
                                      toast.success('Dialogue regenerated!')
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
                              </div>
                            ) : (
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
                                    toast.success(`Dialogue generated for ${d.character}`)
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
                            )}
                          </div>
                        )
                      })}
                      </div>
                    </div>
                  )}
                  
                  {/* Background Music */}
                  {scene.music && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Background Music</span>
                          {scene.musicAudio && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                              <Volume2 className="w-3 h-3" />
                              Audio Ready
                            </span>
                          )}
                        </div>
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
                          </div>
                        ) : (
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
                        )}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 italic">
                        {typeof scene.music === 'string' ? scene.music : scene.music.description}
                      </div>
                    </div>
                  )}
                  
                  {/* SFX */}
                  {scene.sfx && Array.isArray(scene.sfx) && scene.sfx.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <VolumeIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sound Effects ({scene.sfx.length})</span>
                      </div>
                      {scene.sfx.map((sfx: any, sfxIdx: number) => {
                        const sfxAudio = scene.sfxAudio?.[sfxIdx]
                        return (
                          <div key={sfxIdx} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
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
                                </div>
                              ) : (
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
                          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-black">
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
                          <p className="text-xs opacity-60 mt-1">Generate or upload an image to visualize this scene</p>
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

                {activeWorkflowTab === 'callAction' && (
                  <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                    <SceneProductionManager
                      sceneId={scene.sceneId || scene.id || `scene-${sceneIdx}`}
                      sceneNumber={sceneNumber}
                      heading={scene.heading}
                      scene={scene}
                      productionData={sceneProductionData || null}
                      references={sceneProductionReferences || {}}
                      onInitialize={onInitializeSceneProduction || (async () => {})}
                      onPromptChange={onSegmentPromptChange || (() => {})}
                      onGenerate={onSegmentGenerate || (async () => {})}
                      onUpload={onSegmentUpload || (async () => {})}
                      audioTracks={sceneAudioTracks}
                      onAddSegment={onAddSegment}
                      onDeleteSegment={onDeleteSegment}
                      onAudioClipChange={onAudioClipChange}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
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
              onRunReview={activeStep === 'dialogueAction' && onGenerateSceneScore ? () => {
                if (onGenerateSceneScore) {
                  onGenerateSceneScore(sceneIdx)
                }
              } : undefined}
              sceneIdx={sceneIdx}
              generatingDirectionFor={generatingDirectionFor}
              generatingScoreFor={generatingScoreFor}
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

