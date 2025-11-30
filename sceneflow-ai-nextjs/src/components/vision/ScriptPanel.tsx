'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { FileText, Edit, Eye, Sparkles, Loader, Loader2, Play, Square, Volume2, Image as ImageIcon, Wand2, ChevronRight, Music, Volume as VolumeIcon, Upload, StopCircle, AlertTriangle, ChevronDown, Check, Pause, Download, Zap, Camera, RefreshCw, Plus, Trash2, GripVertical, Film, Users, Star, BarChart3, Clock, Image, Printer, Info, Clapperboard, CheckCircle, Circle, ArrowRight, Bookmark, BookmarkPlus, BookmarkCheck, BookMarked, Lightbulb } from 'lucide-react'
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
import ScenePromptDrawer from './ScenePromptDrawer'
import { AudioMixer, type AudioTrack } from './AudioMixer'
import ScriptReviewModal from './ScriptReviewModal'
import SceneReviewModal from './SceneReviewModal'
import { ScriptEditorModal } from './ScriptEditorModal'
import { toast } from 'sonner'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { ReportType, StoryboardData, SceneDirectionData } from '@/lib/types/reports'
import { ProjectCostCalculator } from './ProjectCostCalculator'
import { ExportDialog } from './ExportDialog'
import { GenerateAudioDialog } from './GenerateAudioDialog'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { WebAudioMixer, type SceneAudioConfig, type AudioSource } from '@/lib/audio/webAudioMixer'
import { getAudioDuration } from '@/lib/audio/audioDuration'
import { getAudioUrl } from '@/lib/audio/languageDetection'

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
  onOpenAnimaticsStudio?: () => void
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
  onInitializeSceneProduction?: (sceneId: string, options: { targetDuration: number }) => Promise<void>
  onSegmentPromptChange?: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentGenerate?: (sceneId: string, segmentId: string, mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD', options?: { startFrameUrl?: string }) => Promise<void>
  onSegmentUpload?: (sceneId: string, segmentId: string, file: File) => Promise<void>
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

/**
 * Strip SFX and Music descriptions from scene action text
 * These are redundantly included and should be displayed separately
 */
function stripAudioDescriptions(action: string): string {
  if (!action) return action
  
  // Remove patterns like "SFX: ...", "MUSIC: ...", "Music: ...", "Sound: ..."
  // Match case-insensitive and handle various formats
  let cleaned = action
    .replace(/\b(SFX|MUSIC|Music|Sound|sound effects?):\s*[^\n]+/gi, '')
    // Remove standalone lines that are just audio descriptions
    .replace(/^\s*(SFX|MUSIC|Music|Sound|sound effects?)\s*:.*$/gmi, '')
    // Clean up multiple consecutive newlines
    .replace(/\n{2,}/g, '\n')
    .trim()
  
  return cleaned
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
function SortableSceneCard({ id, onAddScene, onDeleteScene, onEditScene, onGenerateSceneScore, generatingScoreFor, getScoreColorClass, ...props }: any) {
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
      />
    </div>
  )
}

export function ScriptPanel({ script, onScriptChange, isGenerating, onExpandScene, onExpandAllScenes, onGenerateSceneImage, characters = [], projectId, visualStyle, validationWarnings = {}, validationInfo = {}, onDismissValidationWarning, onPlayAudio, onGenerateSceneAudio, onGenerateAllAudio, isGeneratingAudio, onPlayScript, onOpenAnimaticsStudio, onAddScene, onDeleteScene, onReorderScenes, directorScore, audienceScore, onGenerateReviews, isGeneratingReviews, onShowReviews, onEditScene, onGenerateSceneScore, generatingScoreFor, getScoreColorClass, hasBYOK = false, onOpenBYOK, onGenerateSceneDirection, generatingDirectionFor, onGenerateAllCharacters, sceneProductionData = {}, sceneProductionReferences = {}, belowDashboardSlot, onInitializeSceneProduction, onSegmentPromptChange, onSegmentGenerate, onSegmentUpload, sceneAudioTracks = {}, bookmarkedScene, onBookmarkScene, showStoryboard = true, onToggleStoryboard, showDashboard = false, onToggleDashboard, onOpenAssets }: ScriptPanelProps) {
  const [expandingScenes, setExpandingScenes] = useState<Set<number>>(new Set())
  const [showScriptEditor, setShowScriptEditor] = useState(false)
  const [selectedScene, setSelectedScene] = useState<number | null>(null)
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  const [storyboardPreviewOpen, setStoryboardPreviewOpen] = useState(false)
  const [sceneDirectionPreviewOpen, setSceneDirectionPreviewOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [generateAudioDialogOpen, setGenerateAudioDialogOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  
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
  
  // Dialogue generation state
  const [generatingDialogue, setGeneratingDialogue] = useState<{sceneIdx: number, character: string, dialogueIndex?: number} | null>(null)
  
  // Voice selection visibility state
  const [showVoiceSelection, setShowVoiceSelection] = useState(false)
  
  // Script overview visibility state
  const [showScriptOverview, setShowScriptOverview] = useState(false)
  
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

  const scenes = useMemo(() => normalizeScenes(script), [script])

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
    
    // Get language-specific audio URLs
    const narrationUrl = getAudioUrl(scene, selectedLanguage, 'narration')
    const dialogueArray = scene.dialogueAudio?.[selectedLanguage] || 
                          (selectedLanguage === 'en' ? scene.dialogueAudio?.en : null) ||
                          (Array.isArray(scene.dialogueAudio) ? scene.dialogueAudio : null)
    
    console.log('[ScriptPanel] Calculating audio timeline for scene (language:', selectedLanguage, '):', {
      hasMusic: !!(scene.musicAudio || scene.music?.url),
      musicAudio: scene.musicAudio,
      musicUrl: scene.music?.url,
      hasNarration: !!narrationUrl,
      hasDialogue: !!(Array.isArray(dialogueArray) && dialogueArray.length > 0),
      dialogueCount: Array.isArray(dialogueArray) ? dialogueArray.length : 0,
      hasSFX: !!(scene.sfxAudio && scene.sfxAudio.length > 0),
      sfxCount: scene.sfxAudio?.length || 0
    })
    
    // Music starts at scene beginning (concurrent with everything, loops)
    // Check both musicAudio (new format) and music.url (legacy format)
    const musicUrl = scene.musicAudio || scene.music?.url
    if (musicUrl) {
      config.music = musicUrl
      console.log('[ScriptPanel] Added music:', musicUrl)
    }
    
    // Narration starts at scene beginning (concurrent with music)
    if (narrationUrl) {
      config.narration = narrationUrl
      const storedDuration = scene.narrationAudio?.[selectedLanguage]?.duration
      const narrationDuration = await resolveAudioDuration(narrationUrl, storedDuration)
      totalDuration = Math.max(totalDuration, narrationDuration)
      currentTime = narrationDuration + 0.5 // 500ms pause after narration before dialogue
      console.log('[ScriptPanel] Added narration, duration:', narrationDuration, 'next dialogue starts at:', currentTime)
    }
    
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
          console.log('[ScriptPanel] Added dialogue for', dialogue.character, 'at', config.dialogue[config.dialogue.length - 1].startTime, 's, duration:', dialogueDuration)
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
        console.log('[ScriptPanel] Added SFX at', sfxTime, 's, duration:', sfxDuration)
      }
    }
    
    // Set scene duration for music-only scenes or to ensure music plays long enough
    config.sceneDuration = Math.max(totalDuration, scene.duration || 5)
    
    console.log('[ScriptPanel] Final timeline config:', {
      hasMusic: !!config.music,
      hasNarration: !!config.narration,
      dialogueCount: config.dialogue?.length || 0,
      sfxCount: config.sfx?.length || 0,
      totalDuration: config.sceneDuration
    })
    
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
      console.log('[ScriptPanel] No pre-generated audio found, falling back to TTS generation')
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
      
      console.log('[ScriptPanel] Playing scene', sceneIdx + 1, 'with config:', {
        hasMusic: !!audioConfig.music,
        hasNarration: !!audioConfig.narration,
        dialogueCount: audioConfig.dialogue?.length || 0,
        sfxCount: audioConfig.sfx?.length || 0
      })
      
      // Play the scene - this returns a promise that resolves when all non-looping audio completes
      await audioMixerRef.current.playScene(audioConfig)
      
      // After narration/dialogue completes, wait 3 seconds then fade out music
      if (audioConfig.music && audioMixerRef.current) {
        console.log('[ScriptPanel] Narration/dialogue complete, waiting 3 seconds before fade out...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Fade out music over 2 seconds for smooth ending
        console.log('[ScriptPanel] Fading out music...')
        await audioMixerRef.current.fadeOut(2000)
        
        // Stop all audio after fade
        audioMixerRef.current.stop()
      }
      
      console.log('[ScriptPanel] Scene', sceneIdx + 1, 'playback complete')
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
      
      console.log('[ScriptPanel] Generating audio for text:', t.substring(0, 100))
      
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
    } catch (error: any) {
      console.error('[SFX Generation] Error:', error)
      alert(`Failed to generate sound effect: ${error.message}`)
    } finally {
      setGeneratingSFX(null)
    }
  }

  const generateMusic = async (sceneIdx: number) => {
    const scene = scenes[sceneIdx]
    const music = scene?.music
    if (!music) return

    setGeneratingMusic(sceneIdx)
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
    } catch (error: any) {
      console.error('[Music Generation] Error:', error)
      alert(`Failed to generate music: ${error.message}`)
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

  return (
    <>
      {/* Production Dashboard - moved above Production Plan */}
      {script && showDashboard && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 shadow-inner mb-6">
          <div className="px-5 py-5">
            {/* Header with Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-3 rounded-xl bg-slate-900/70 border border-white/10 px-3 py-2">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.45em] text-slate-400">PROJECT</span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 text-sky-300">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-semibold text-white leading-6 my-0">Dashboard</h3>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowScriptOverview(!showScriptOverview)}
                className="p-2 text-slate-300 hover:text-white rounded-full border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${showScriptOverview ? '' : 'rotate-180'}`} />
              </button>
            </div>
            
            {/* Collapsible Content */}
            {showScriptOverview && (
              <>
                {/* Statistics Grid - 2 rows x 3 columns */}
                <div className="grid grid-cols-3 gap-4 mb-5">
              {/* Scenes */}
                  <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-sf-primary/15 to-white/5 p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2 text-slate-200">
                      <FileText className="w-4 h-4 text-sf-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Scenes</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                  {scenes.length}
                </div>
              </div>
              {/* Characters */}
                  <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-fuchsia-600/20 to-white/5 p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2 text-slate-200">
                      <Users className="w-4 h-4 text-fuchsia-300" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Characters</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                  {characters?.length || 0}
                </div>
              </div>
              {/* Duration */}
                  <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-amber-500/20 to-white/5 p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2 text-slate-200">
                      <Clock className="w-4 h-4 text-amber-300" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Duration</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                  {formatTotalDuration(scenes)}
                </div>
              </div>
              {/* Images */}
              <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-cyan-500/20 to-white/5 p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2 text-slate-200">
                  <ImageIcon className="w-4 h-4 text-cyan-300" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Images</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {imageCount}/{scenes.length}
                </div>
              </div>
              {/* Audio */}
              <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-500/20 to-white/5 p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2 text-slate-200">
                  <Volume2 className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Audio Lines</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {audioCount}
                </div>
              </div>
              {/* Score */}
              <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-amber-400/25 to-white/5 p-4 shadow-lg">                                            
                <div className="flex items-center gap-2 mb-2 text-slate-200">
                  <Star className="w-4 h-4 text-amber-200" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Avg Score</span>
                </div>
                <div className="text-3xl font-bold text-white">                                                                           
                  {averageScore}
                </div>
              </div>
            </div>
            
            {/* Project Cost Calculator */}
            {scenes.length > 0 && (
              <div className="mt-5 rounded-2xl border border-white/5 bg-slate-950/30 p-4 shadow-inner">
                <ProjectCostCalculator 
                  scenes={scenes}
                  characters={characters}
                  hasBYOK={hasBYOK}
                  onOpenBYOK={onOpenBYOK}
                />
              </div>
            )}
            
            {/* Script Reviews Section */}
                <div className="bg-slate-950/40 rounded-2xl p-5 border border-white/10 mt-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-300" />
                  <span className="text-sm font-semibold text-white">
                    Script Reviews
                  </span>
                </div>
                <div className="flex items-center gap-2">
                      {(directorScore || audienceScore) ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={onShowReviews} className="text-xs">
                        View Full Reviews
                  </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onGenerateReviews}
                        disabled={isGeneratingReviews}
                        className="text-xs"
                      >
                            {isGeneratingReviews ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      </Button>
                    </>
                      ) : (
                  <Button 
                    variant="outline" 
                      size="sm"
                      onClick={onGenerateReviews}
                      disabled={isGeneratingReviews}
                    >
                          {isGeneratingReviews ? <Loader className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                      Generate Reviews
                  </Button>
                  )}
                </div>
              </div>
              
              {(directorScore || audienceScore) ? (
                <div className="grid grid-cols-2 gap-4">
                  {directorScore && (
                        <div onClick={onShowReviews} className="cursor-pointer hover:opacity-80 transition-opacity">
                      <div className="flex items-center gap-2 mb-2">
                        <Film className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Director
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-bold ${getStoplightTextColor(directorScore)}`}>
                          {directorScore}
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getStoplightBgColor(directorScore)} transition-all duration-500`}
                              style={{ width: `${directorScore}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {getScoreLabel(directorScore)}
                          </div>
                        </div>
          </div>
        </div>
      )}
                  {audienceScore && (
                        <div onClick={onShowReviews} className="cursor-pointer hover:opacity-80 transition-opacity">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Audience
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-bold ${getStoplightTextColor(audienceScore)}`}>
                          {audienceScore}
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getStoplightBgColor(audienceScore)} transition-all duration-500`}
                              style={{ width: `${audienceScore}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {getScoreLabel(audienceScore)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  Generate reviews to get expert feedback on your script
                </div>
              )}
            </div>
              </>
            )}
          </div>
        </div>
      )}

    <div className="relative rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/60 h-full flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(8,8,20,0.55)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sf-primary via-fuchsia-500 to-cyan-400 opacity-80" />
      {/* Header */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-slate-900/70 backdrop-blur rounded-t-3xl">
        <div className="flex items-start gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-[0.4em] text-slate-400 block mb-1">Scene Flow</span>
            <div className="flex items-center gap-3">
              {scenes.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-sf-primary/15 text-sf-primary border border-sf-primary/40 font-semibold">
                  {scenes.length} {scenes.length === 1 ? 'Scene' : 'Scenes'}
                </span>
              )}
              {isGenerating && (
                <span className="text-xs text-cyan-300 flex items-center gap-1">
                  <Loader className="w-3 h-3 animate-spin" />
                  Generating...
                </span>
              )}
            </div>
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
          
          {/* Assets Button */}
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
                  className="flex items-center gap-1"
                >
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  <span className="hidden sm:inline">Assets</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                <p>Generate audio assets</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Edit Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScriptEditor(true)}
                  className="flex items-center gap-1"
                >
                  <Edit className="w-4 h-4 text-blue-400" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                <p>Edit script</p>
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
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                  <p>Generate printable script, storyboard, or scene direction reports</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleJumpToBookmark}
                disabled={bookmarkedSceneIndex === -1}
                className="flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Bookmark</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
              {bookmarkedSceneIndex === -1 ? 'No bookmarked scene yet' : 'Jump to your saved scene'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

          {/* Storyboard Toggle Button */}
          {onToggleStoryboard && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showStoryboard ? 'default' : 'outline'}
                    size="sm"
                    onClick={onToggleStoryboard}
                    className={`flex items-center gap-1 ${showStoryboard ? 'bg-cyan-500/90 hover:bg-cyan-500 text-white' : ''}`}
                  >
                    <ImageIcon className={`w-4 h-4 ${showStoryboard ? 'text-white' : 'text-cyan-400'}`} />
                    <span className="hidden sm:inline">Storyboard</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                  {showStoryboard ? 'Hide Storyboard section' : 'Show Storyboard section'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Preview moved to Storyboard header */}

          {dialogGenerationMode === 'background' && isDialogGenerating && backgroundProgressPercent !== null && (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <Loader className="w-3 h-3 animate-spin" />
              <span>BG {backgroundProgressPercent}%</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Optional slot between Dashboard and Scene Director */}
      {belowDashboardSlot && showStoryboard ? (
        <div className="mt-6">
          {belowDashboardSlot({ openGenerateAudio: () => setGenerateAudioDialogOpen(true) })}
        </div>
      ) : null}
      
      {/* Script Content */}
      <div className="flex-1 overflow-y-auto bg-slate-950/20">
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
                  items={scenes.map((_: any, idx: number) => idx)}
                  strategy={verticalListSortingStrategy}
                >
                          {scenes.map((scene: any, idx: number) => {
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
                      sceneProductionData={sceneProductionData[scene.id || `scene-${idx}`] || undefined}
                      sceneProductionReferences={sceneProductionReferences[scene.id || `scene-${idx}`] || undefined}
                      onInitializeSceneProduction={onInitializeSceneProduction}
                      onSegmentPromptChange={onSegmentPromptChange}
                      onSegmentGenerate={onSegmentGenerate}
                      onSegmentUpload={onSegmentUpload}
                      sceneAudioTracks={sceneAudioTracks[scene.id || `scene-${idx}`]}
                          domId={domId}
                          isBookmarked={bookmarkedSceneIndex === idx}
                          onBookmarkToggle={() => handleBookmarkToggle(idx)}
                          bookmarkSaving={bookmarkSavingSceneIdx === idx}
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
          onClose={() => setShowScriptEditor(false)}
          script={script?.script || script}
          projectId={projectId || ''}
          characters={characters}
          onApplyChanges={(revisedScript) => {
            const updatedScript = {
              ...script,
              script: revisedScript
            }
            onScriptChange(updatedScript)
            setShowScriptEditor(false)
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
            referenceImage: c.referenceImage,
            referenceImageGCS: c.referenceImageGCS,  // Pass GCS URL for Imagen API
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
  onInitializeSceneProduction?: (sceneId: string, options: { targetDuration: number }) => Promise<void>
  onSegmentPromptChange?: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentGenerate?: (sceneId: string, segmentId: string, mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD', options?: { startFrameUrl?: string }) => Promise<void>
  onSegmentUpload?: (sceneId: string, segmentId: string, file: File) => Promise<void>
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
  sceneAudioTracks,
  domId,
  isBookmarked = false,
  onBookmarkToggle,
  bookmarkSaving = false,
}: SceneCardProps) {
  const isOutline = !scene.isExpanded && scene.summary
  const [isOpen, setIsOpen] = useState(false)
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<WorkflowStep | null>(null)
  const [copilotPanelOpen, setCopilotPanelOpen] = useState(false)
  
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
    setIsOpen(!isOpen)
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddScene?.(sceneIdx)
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Add scene after</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this scene? This cannot be undone.')) {
                        onDeleteScene?.(sceneIdx)
                      }
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
            {/* Status Indicators - Compact */}
            <div className="flex items-center gap-1">
              {/* Image Indicator */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center justify-center w-5 h-5 rounded border ${
                      scene.imageUrl 
                        ? 'bg-green-50 border-green-300 text-green-600 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400' 
                        : 'bg-white border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-600'
                    }`}>
                      <Camera className="w-3 h-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                    {scene.imageUrl ? 'Image generated' : 'No image'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Voice Indicator */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center justify-center w-5 h-5 rounded border ${
                      scene.narrationAudioUrl 
                        ? 'bg-green-50 border-green-300 text-green-600 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400' 
                        : 'bg-white border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-600'
                    }`}>
                      <Volume2 className="w-3 h-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                    {scene.narrationAudioUrl ? 'Voice generated' : 'No voice'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Music Indicator */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center justify-center w-5 h-5 rounded border ${
                      scene.musicAudio 
                        ? 'bg-green-50 border-green-300 text-green-600 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400' 
                        : 'bg-white border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-600'
                    }`}>
                      <Music className="w-3 h-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                    {scene.musicAudio ? 'Music generated' : 'No music'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
                      <span className="text-xs">Edit</span>
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

        {/* Line 2: Scene Title */}
        <div className="mt-2">
          <p className="text-xl font-semibold text-white leading-tight">
            Scene {sceneNumber}: {headingText || 'Untitled'}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {workflowTabs.map(({ key, label }) => {
            const status = getStepStatus(key)
            return (
              <span
                key={key as string}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${chipClassByStatus[status]}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${chipDotClass[status]}`} />
                {label}
              </span>
            )
          })}
        </div>

        <div className="mt-4">
          {(scene.summary || scene.action) && (
            <p className="text-sm text-slate-300/90 mt-1 line-clamp-3">
              {scene.summary || stripAudioDescriptions(scene.action)}
            </p>
          )}
        </div>

        {/* Hide/Show Control - Separate from other buttons */}
        <div className="mb-3 flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleOpen}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-90' : ''}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                {isOpen ? 'Collapse scene' : 'Expand scene'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
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
                      <ChevronDown className={`w-4 h-4 text-amber-300 transition-transform ${isWarningExpanded ? '' : '-rotate-90'}`} />
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
          
          {/* Stepped Timeline Navigation */}
          {!isOutline && (
            <div className="mt-4 mb-6">
              <div className="flex items-center max-w-4xl mx-auto py-4 px-2">
                {workflowTabs.map((tab, index) => {
                  const status = getStepStatus(tab.key)
                  const isLocked = !stepUnlocked[tab.key as keyof typeof stepUnlocked]
                  const isActive = activeWorkflowTab === tab.key
                  const isCompleted = status === 'complete'
                  const isUpcoming = status === 'todo' || status === 'locked'
                  const stepNumber = index + 1
                  const prevCompleted = index > 0 && getStepStatus(workflowTabs[index - 1].key) === 'complete'
                  
                  return (
                    <React.Fragment key={tab.key}>
                      <div 
                        className={`flex items-center ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} group relative z-10`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isLocked && tab.key !== activeWorkflowTab) {
                            setActiveWorkflowTab(tab.key)
                          }
                        }}
                      >
                        {/* Step Circle */}
                        {isCompleted ? (
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-600 text-white font-bold text-sm shadow-md flex-shrink-0">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                        ) : isActive ? (
                          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-sf-primary text-white ring-4 ring-sf-primary/40 font-extrabold text-lg shadow-lg flex-shrink-0">
                            {stepNumber}
                          </div>
                        ) : (
                          <div className={`w-8 h-8 flex items-center justify-center rounded-full border-2 font-bold text-sm flex-shrink-0 ${
                            isUpcoming 
                              ? 'bg-slate-800 text-slate-400 border-slate-600' 
                              : 'bg-slate-700 text-slate-300 border-slate-500'
                          }`}>
                            {stepNumber}
                          </div>
                        )}
                        
                        {/* Step Label */}
                        <p className={`ml-2 text-sm font-semibold hidden sm:block transition-colors whitespace-nowrap ${
                          isCompleted 
                            ? 'text-green-400' 
                            : isActive 
                              ? 'text-white font-extrabold' 
                              : 'text-slate-400 group-hover:text-slate-300'
                        }`}>
                          {tab.label}
                        </p>
                      </div>
                      
                      {/* Connector Line */}
                      {index < workflowTabs.length - 1 && (
                        <div 
                          className={`flex-1 h-0.5 mx-2 ${
                            prevCompleted || isCompleted
                              ? 'bg-green-600' 
                              : 'bg-slate-700'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  )
                })}
                
                {/* AI Co-Pilot Help Button */}
                {activeStep && (
                  <div className="ml-4 flex-shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCopilotPanelOpen(!copilotPanelOpen)
                            }}
                            className={`p-2 rounded-lg transition ${
                              copilotPanelOpen
                                ? 'bg-sf-primary/20 text-sf-primary border border-sf-primary/40'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                            }`}
                            aria-label={activeStep === 'dialogueAction' ? 'Script help' : activeStep === 'directorsChair' ? 'Direction help' : activeStep === 'storyboardPreViz' ? 'Frame help' : 'Call Action help'}
                          >
                            <Lightbulb className="w-5 h-5" />
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
              <div className="mt-4">
                {activeWorkflowTab === 'dialogueAction' && (
                  <div className="space-y-4">
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
                                if (!onGenerateSceneAudio) return
                                
                                setGeneratingDialogue?.({ sceneIdx, character: '__narration__' })
                                try {
                                  await onGenerateSceneAudio?.(sceneIdx, 'narration', undefined, undefined, selectedLanguage)
                                } catch (error) {
                                  console.error('[ScriptPanel] Narration regeneration failed:', error)
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
                              if (!onGenerateSceneAudio) return
                              
                              setGeneratingDialogue?.({ sceneIdx, character: '__narration__' })
                              try {
                                await onGenerateSceneAudio?.(sceneIdx, 'narration', undefined, undefined, selectedLanguage)
                              } catch (error) {
                                console.error('[ScriptPanel] Narration generation failed:', error)
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
                                  <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                                    ✓
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
                                    try {
                                      await onGenerateSceneAudio?.(sceneIdx, 'dialogue', d.character, i, selectedLanguage)
                                    } catch (error) {
                                      console.error('[ScriptPanel] Dialogue regeneration failed:', error)
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
                                  console.log('[ScriptPanel] Generate dialogue clicked:', { sceneIdx, character: d.character, dialogueIndex: i })
                                  
                                  if (!onGenerateSceneAudio) {
                                    console.error('[ScriptPanel] onGenerateSceneAudio is not defined!')
                                    return
                                  }
                                  
                                  setGeneratingDialogue?.({ sceneIdx, character: d.character, dialogueIndex: i })
                                  
                                  try {
                                    await onGenerateSceneAudio?.(sceneIdx, 'dialogue', d.character, i, selectedLanguage)
                                  } catch (error) {
                                    console.error('[ScriptPanel] Dialogue generation failed:', error)
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
                  {!scene.sceneDirection ? (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Generate detailed technical directions for live-action film crew including camera, lighting, scene, talent, and audio specifications.
                      </p>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (onGenerateSceneDirection) {
                            await onGenerateSceneDirection(sceneIdx)
                          }
                        }}
                        disabled={generatingDirectionFor === sceneIdx}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingDirectionFor === sceneIdx ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate Scene Direction</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Technical Details Grid - 2 columns on larger screens */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Camera */}
                        {scene.sceneDirection.camera && (
                          <div className="p-3.5 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                              <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              Camera
                            </h4>
                            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                              {scene.sceneDirection.camera.shots && scene.sceneDirection.camera.shots.length > 0 && (
                                <div className="pb-2 border-b border-blue-200/50 dark:border-blue-800/30">
                                  <span className="font-medium text-blue-900 dark:text-blue-300">Shots: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.camera.shots.join(', ')}</span>
                                </div>
                              )}
                              {scene.sceneDirection.camera.angle && (
                                <div>
                                  <span className="font-medium text-blue-900 dark:text-blue-300">Angle: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.camera.angle}</span>
                                </div>
                              )}
                              {scene.sceneDirection.camera.movement && (
                                <div>
                                  <span className="font-medium text-blue-900 dark:text-blue-300">Movement: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.camera.movement}</span>
                                </div>
                              )}
                              {scene.sceneDirection.camera.lensChoice && (
                                <div>
                                  <span className="font-medium text-blue-900 dark:text-blue-300">Lens: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.camera.lensChoice}</span>
                                </div>
                              )}
                              {scene.sceneDirection.camera.focus && (
                                <div>
                                  <span className="font-medium text-blue-900 dark:text-blue-300">Focus: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.camera.focus}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Lighting */}
                        {scene.sceneDirection.lighting && (
                          <div className="p-3.5 bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                              <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                              Lighting
                            </h4>
                            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                              {scene.sceneDirection.lighting.overallMood && (
                                <div className="pb-2 border-b border-yellow-200/50 dark:border-yellow-800/30">
                                  <span className="font-medium text-yellow-900 dark:text-yellow-300">Mood: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.lighting.overallMood}</span>
                                </div>
                              )}
                              {scene.sceneDirection.lighting.timeOfDay && (
                                <div>
                                  <span className="font-medium text-yellow-900 dark:text-yellow-300">Time of Day: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.lighting.timeOfDay}</span>
                                </div>
                              )}
                              {scene.sceneDirection.lighting.keyLight && (
                                <div>
                                  <span className="font-medium text-yellow-900 dark:text-yellow-300">Key Light: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.lighting.keyLight}</span>
                                </div>
                              )}
                              {scene.sceneDirection.lighting.fillLight && (
                                <div>
                                  <span className="font-medium text-yellow-900 dark:text-yellow-300">Fill Light: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.lighting.fillLight}</span>
                                </div>
                              )}
                              {scene.sceneDirection.lighting.backlight && (
                                <div>
                                  <span className="font-medium text-yellow-900 dark:text-yellow-300">Backlight: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.lighting.backlight}</span>
                                </div>
                              )}
                              {scene.sceneDirection.lighting.practicals && (
                                <div>
                                  <span className="font-medium text-yellow-900 dark:text-yellow-300">Practicals: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.lighting.practicals}</span>
                                </div>
                              )}
                              {scene.sceneDirection.lighting.colorTemperature && (
                                <div>
                                  <span className="font-medium text-yellow-900 dark:text-yellow-300">Color Temp: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.lighting.colorTemperature}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Scene */}
                        {scene.sceneDirection.scene && (
                          <div className="p-3.5 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 rounded-lg border border-green-200 dark:border-green-800/50">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                              Scene
                            </h4>
                            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                              {scene.sceneDirection.scene.location && (
                                <div className="pb-2 border-b border-green-200/50 dark:border-green-800/30">
                                  <span className="font-medium text-green-900 dark:text-green-300">Location: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.scene.location}</span>
                                </div>
                              )}
                              {scene.sceneDirection.scene.keyProps && scene.sceneDirection.scene.keyProps.length > 0 && (
                                <div>
                                  <span className="font-medium text-green-900 dark:text-green-300">Key Props: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.scene.keyProps.join(', ')}</span>
                                </div>
                              )}
                              {scene.sceneDirection.scene.atmosphere && (
                                <div>
                                  <span className="font-medium text-green-900 dark:text-green-300">Atmosphere: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.scene.atmosphere}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Talent */}
                        {scene.sceneDirection.talent && (
                          <div className="p-3.5 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800/50">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              Talent
                            </h4>
                            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                              {scene.sceneDirection.talent.blocking && (
                                <div className="pb-2 border-b border-purple-200/50 dark:border-purple-800/30">
                                  <span className="font-medium text-purple-900 dark:text-purple-300">Blocking: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.talent.blocking}</span>
                                </div>
                              )}
                              {scene.sceneDirection.talent.keyActions && scene.sceneDirection.talent.keyActions.length > 0 && (
                                <div>
                                  <span className="font-medium text-purple-900 dark:text-purple-300">Key Actions: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.talent.keyActions.join(', ')}</span>
                                </div>
                              )}
                              {scene.sceneDirection.talent.emotionalBeat && (
                                <div>
                                  <span className="font-medium text-purple-900 dark:text-purple-300">Emotional Beat: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.talent.emotionalBeat}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Audio */}
                        {scene.sceneDirection.audio && (
                          <div className="p-3.5 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800/50">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                              <Volume2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                              Audio
                            </h4>
                            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                              {scene.sceneDirection.audio.priorities && (
                                <div className="pb-2 border-b border-orange-200/50 dark:border-orange-800/30">
                                  <span className="font-medium text-orange-900 dark:text-orange-300">Priorities: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.audio.priorities}</span>
                                </div>
                              )}
                              {scene.sceneDirection.audio.considerations && (
                                <div>
                                  <span className="font-medium text-orange-900 dark:text-orange-300">Considerations: </span>
                                  <span className="text-gray-800 dark:text-gray-200">{scene.sceneDirection.audio.considerations}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Regenerate Button */}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (onGenerateSceneDirection) {
                              await onGenerateSceneDirection(sceneIdx)
                            }
                          }}
                          disabled={generatingDirectionFor === sceneIdx}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                        >
                          {generatingDirectionFor === sceneIdx ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Regenerating...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              <span>Regenerate Scene Direction</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                )}
                
                {activeWorkflowTab === 'storyboardPreViz' && (
                  <div className="space-y-4">
                  {/* Scene Image */}
                  {scene.imageUrl && (
                    <div className="rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 shadow-md max-w-3xl mx-auto">
                      <img 
                        src={scene.imageUrl} 
                        alt={scene.heading}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Image Generation Buttons */}
                  {onGenerateImage && scene.visualDescription && (
                    <div className="flex items-center justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={handleOpenBuilder}
                              disabled={isGeneratingImage}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50 border border-purple-200 dark:border-purple-800"
                            >
                              <Image className="w-4 h-4" />
                              <span>Build</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Build image prompt</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={handleQuickGenerate}
                              disabled={isGeneratingImage}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50 border border-purple-200 dark:border-purple-800"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>Generate</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">Quick generate image</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  </div>
                )}
                
                {activeWorkflowTab === 'callAction' && (
                  <div className="space-y-4">
                    {onInitializeSceneProduction && onSegmentPromptChange && onSegmentGenerate && onSegmentUpload && sceneProductionReferences ? (
                      <SceneProductionManager
                        sceneId={scene.id || `scene-${sceneIdx}`}
                        sceneNumber={sceneNumber}
                        heading={typeof scene.heading === 'string' ? scene.heading : scene.heading?.text}
                        productionData={sceneProductionData || null}
                        references={sceneProductionReferences}
                        onInitialize={onInitializeSceneProduction}
                        onPromptChange={onSegmentPromptChange}
                        onGenerate={onSegmentGenerate}
                        onUpload={onSegmentUpload}
                        audioTracks={sceneAudioTracks}
                      />
                    ) : (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Scene production handlers are not available. Please refresh the page.
                        </p>
                      </div>
                    )}
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
      
      {/* Generation Lock Screen */}
      {isGeneratingImage && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center rounded-lg">
          <div className="bg-gray-900 border-2 border-purple-500 rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-sm">
            <div className="relative mb-4">
              <Loader className="w-16 h-16 animate-spin text-purple-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-purple-300 animate-pulse"></div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Generating Scene Image</h3>
            <p className="text-sm text-gray-300 text-center">
              Creating your scene visualization...
            </p>
            <p className="text-xs text-gray-400 mt-2">
              This may take 10-15 seconds
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

