'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { FileText, Edit, Eye, Sparkles, Loader, Loader2, Play, Square, Volume2, Image as ImageIcon, Wand2, ChevronRight, Music, Volume as VolumeIcon, Upload, StopCircle, AlertTriangle, ChevronDown, Check, Pause, Download, Zap, Camera, RefreshCw, Plus, Trash2, GripVertical, Film, Users, Star, BarChart3, Clock, Image, Printer, Info, Clapperboard, CheckCircle, Circle, ArrowRight } from 'lucide-react'
import { SceneWorkflowCoPilot, type WorkflowStep } from './SceneWorkflowCoPilot'
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

export function ScriptPanel({ script, onScriptChange, isGenerating, onExpandScene, onExpandAllScenes, onGenerateSceneImage, characters = [], projectId, visualStyle, validationWarnings = {}, validationInfo = {}, onDismissValidationWarning, onPlayAudio, onGenerateSceneAudio, onGenerateAllAudio, isGeneratingAudio, onPlayScript, onOpenAnimaticsStudio, onAddScene, onDeleteScene, onReorderScenes, directorScore, audienceScore, onGenerateReviews, isGeneratingReviews, onShowReviews, onEditScene, onGenerateSceneScore, generatingScoreFor, getScoreColorClass, hasBYOK = false, onOpenBYOK, onGenerateSceneDirection, generatingDirectionFor, onGenerateAllCharacters, sceneProductionData = {}, sceneProductionReferences = {}, onInitializeSceneProduction, onSegmentPromptChange, onSegmentGenerate, onSegmentUpload, sceneAudioTracks = {} }: ScriptPanelProps) {
  const [expandingScenes, setExpandingScenes] = useState<Set<number>>(new Set())
  const [showScriptEditor, setShowScriptEditor] = useState(false)
  const [selectedScene, setSelectedScene] = useState<number | null>(null)
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  const [storyboardPreviewOpen, setStoryboardPreviewOpen] = useState(false)
  const [sceneDirectionPreviewOpen, setSceneDirectionPreviewOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [generateAudioDialogOpen, setGenerateAudioDialogOpen] = useState(false)
  
  // Audio playback state
  const [voices, setVoices] = useState<Array<CuratedVoice>>([])
  const [enabled, setEnabled] = useState<boolean>(false)
  const [loadingSceneId, setLoadingSceneId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined)
  const queueAbortRef = useRef<{ abort: boolean }>({ abort: false })
  
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
  
  // Audio features state
  const [generatingSFX, setGeneratingSFX] = useState<{sceneIdx: number, sfxIdx: number} | null>(null)
  const [generatingMusic, setGeneratingMusic] = useState<number | null>(null)
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [isPlayingMixed, setIsPlayingMixed] = useState(false)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const playbackAbortRef = useRef(false)

  const scenes = useMemo(() => normalizeScenes(script), [script])

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
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    } catch {}
    audioRef.current = null
    setLoadingSceneId(null)
    queueAbortRef.current.abort = true
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
      
      // Always use standard endpoint (ElevenLabs handles stage directions natively)
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

  const playScene = async (sceneIdx: number) => {
    if (!scenes || scenes.length === 0) return
    stopAudio()
    setLoadingSceneId(sceneIdx)
    const scene = scenes[sceneIdx]
    if (!scene) return
    
    const fullText = buildSceneNarrationText(scene)
    if (!fullText.trim()) {
      stopAudio()
      return
    }
    
    // Chunk to ~1200 chars to avoid long clips
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
      stopAudio()
    } catch {
      stopAudio()
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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-sf-primary" />
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 leading-6 my-0">Production Plan</h2>
          {scenes.length > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
              {scenes.length} {scenes.length === 1 ? 'Scene' : 'Scenes'}
            </span>
          )}
          {isGenerating && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <Loader className="w-3 h-3 animate-spin" />
              Generating...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          
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
          {/* Generate Audio Button */}
          {(onGenerateAllAudio || onGenerateSceneAudio) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setGenerateAudioDialogOpen(true)}
                    disabled={isGeneratingAudio || isDialogGenerating || !script || !scenes || scenes.length === 0}
                    className="flex items-center gap-1"
                  >
                    {isGeneratingAudio || isDialogGenerating ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span className="hidden sm:inline">Generate</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                  <p>Generate audio files for all scenes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
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
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                <p>Edit script</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Report Button */}
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
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Report</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                  <p>Generate printable script, storyboard, or scene direction reports</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Preview Button (Screening Room) */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onPlayScript}
                  disabled={!script || !scenes || scenes.length === 0}
                  className="flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Preview</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                <p>Open Screening Room</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {dialogGenerationMode === 'background' && isDialogGenerating && backgroundProgressPercent !== null && (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <Loader className="w-3 h-3 animate-spin" />
              <span>BG {backgroundProgressPercent}%</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Script Summary Panel */}
      {script && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <div className="px-4 py-4">
            {/* Header with Toggle */}
            <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-sf-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-6 my-0">Production Dashboard</h3>
          </div>
              <button
                onClick={() => setShowScriptOverview(!showScriptOverview)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${showScriptOverview ? '' : 'rotate-180'}`} />
              </button>
            </div>
            
            {/* Collapsible Content */}
            {showScriptOverview && (
              <>
                {/* Statistics Grid - 2 rows x 3 columns */}
                <div className="grid grid-cols-3 gap-3 mb-4">
              {/* Row 1 */}
              {/* Scenes */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Scenes</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {scenes.length}
                </div>
              </div>
              
              {/* Characters */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Characters</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {characters?.length || 0}
                </div>
              </div>
              
              {/* Duration */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Duration</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatTotalDuration(scenes)}
                </div>
              </div>
              
              {/* Row 2 */}
              {/* Images */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Camera className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Images</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {scenes.filter((s: any) => s.imageUrl).length}/{scenes.length}
                </div>
              </div>
              
              {/* Voice */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Volume2 className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Voice</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {scenes.filter((s: any) => s.narrationAudioUrl).length}/{scenes.length}
                </div>
              </div>
              
                            {/* Est. Clips */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">                                            
                <div className="flex items-center gap-2 mb-1">
                  <Film className="w-4 h-4 text-pink-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Est. Clips</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Estimated number of 10-second video clips needed based on scene duration.
                          Each scene may require multiple clips.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">                                                                           
                  {Math.ceil(scenes.reduce((total: number, s: any) => total + calculateSceneDuration(s), 0) / 8)}                                               
                </div>
              </div>
            </div>
            
            {/* Project Cost Calculator */}
            {scenes.length > 0 && (
              <div className="mt-4">
                <ProjectCostCalculator 
                  scenes={scenes}
                  characters={characters}
                  hasBYOK={hasBYOK}
                  onOpenBYOK={onOpenBYOK}
                />
              </div>
            )}
            
            {/* Script Reviews Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Script Reviews
                  </span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {(directorScore || audienceScore) && (
                    <>
                  <Button 
                        variant="ghost"
                        size="sm"
                        onClick={onShowReviews}
                        className="text-xs"
                      >
                        View Full Reviews
                  </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onGenerateReviews}
                        disabled={isGeneratingReviews}
                        className="text-xs"
                      >
                        {isGeneratingReviews ? (
                          <Loader className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                      </Button>
                    </>
                  )}
                  
                  {!directorScore && !audienceScore && (
                  <Button 
                    variant="outline" 
                      size="sm"
                      onClick={onGenerateReviews}
                      disabled={isGeneratingReviews}
                    >
                      {isGeneratingReviews ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Star className="w-4 h-4" />
                      )}
                      Generate Reviews
                  </Button>
                  )}
                </div>
              </div>
              
              {/* Review Scores with Stoplight Colors */}
              {(directorScore || audienceScore) ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* Director Score */}
                  {directorScore && (
                    <div 
                      onClick={onShowReviews}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Film className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Director
                        </span>
                      </div>
                      
                      {/* Score with Stoplight Color */}
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-bold ${getStoplightTextColor(directorScore)}`}>
                          {directorScore}
                        </div>
                        <div className="flex-1">
                          {/* Progress Bar with Stoplight Color */}
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
                  
                  {/* Audience Score */}
                  {audienceScore && (
                    <div 
                      onClick={onShowReviews}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Audience
                        </span>
                      </div>
                      
                      {/* Score with Stoplight Color */}
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-bold ${getStoplightTextColor(audienceScore)}`}>
                          {audienceScore}
                        </div>
                        <div className="flex-1">
                          {/* Progress Bar with Stoplight Color */}
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

      
      {/* Script Content */}
      <div className="flex-1 overflow-y-auto">
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
          <div className="p-4 space-y-6">
            
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
                  selectedLanguage={'en'}
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
                      sceneProductionData={sceneProductionData[scene.id || `scene-${idx}`]}
                      sceneProductionReferences={sceneProductionReferences[scene.id || `scene-${idx}`]}
                      onInitializeSceneProduction={onInitializeSceneProduction}
                      onSegmentPromptChange={onSegmentPromptChange}
                      onSegmentGenerate={onSegmentGenerate}
                      onSegmentUpload={onSegmentUpload}
                      sceneAudioTracks={sceneAudioTracks[scene.id || `scene-${idx}`]}
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
}: SceneCardProps) {
  const isOutline = !scene.isExpanded && scene.summary
  const [isOpen, setIsOpen] = useState(false)
  const [isDialogueActionOpen, setIsDialogueActionOpen] = useState(false)
  const [isDirectorsChairOpen, setIsDirectorsChairOpen] = useState(false)
  const [isStoryboardPreVizOpen, setIsStoryboardPreVizOpen] = useState(false)
  const [isCallActionOpen, setIsCallActionOpen] = useState(false)
  const [copilotCollapsed, setCopilotCollapsed] = useState(false)
  
  // Determine active step for Co-Pilot
  const activeStep: WorkflowStep | null = useMemo(() => {
    if (isDialogueActionOpen) return 'dialogueAction'
    if (isDirectorsChairOpen) return 'directorsChair'
    if (isStoryboardPreVizOpen) return 'storyboardPreViz'
    if (isCallActionOpen) return 'callAction'
    return null
  }, [isDialogueActionOpen, isDirectorsChairOpen, isStoryboardPreVizOpen, isCallActionOpen])
  
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
  const getStepStatus = (stepKey: keyof typeof stepCompletion, isOpen: boolean) => {
    if (stepCompletion[stepKey]) return 'complete'
    if (isOpen) return 'in-progress'
    if (!stepUnlocked[stepKey as keyof typeof stepUnlocked]) return 'locked'
    return 'todo'
  }
  
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
  
  return (
    <div 
      className={`relative p-4 rounded-lg border transition-all ${
        isSelected 
          ? 'border-sf-primary bg-blue-50 dark:bg-blue-950/30 ring-2 ring-sf-primary' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${isOutline ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}
    >
      {/* Collapsible Header - COMPACT THREE-ROW LAYOUT */}
      <div className="mb-3">
        {/* Row 1: Unified Control Bar */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
          {/* Left Side: Scene Management Controls */}
          <div className="flex items-center gap-2">
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
            
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">SCENE {sceneNumber}</span>
            
            {/* Duration Badge */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded cursor-help">
                    {formatDuration(calculateSceneDuration(scene))}
                  </span>
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
            
            {/* Timeline Start */}
            <span className="text-xs text-gray-400">
              @{formatDuration(timelineStart || 0)}
            </span>
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
            
            {/* Score Badge/Button */}
            {!isOutline && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onGenerateSceneScore) {
                          onGenerateSceneScore(sceneIdx)
                        }
                      }}
                      disabled={generatingScoreFor === sceneIdx}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all ${
                        scene.scoreAnalysis 
                          ? `${getScoreColorClass ? getScoreColorClass(scene.scoreAnalysis.overallScore) : 'bg-gray-100 text-gray-800'} shadow-sm hover:opacity-90 cursor-pointer` 
                          : 'border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:border-blue-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {generatingScoreFor === sceneIdx ? (
                        <>
                          <Loader className="w-3 h-3 animate-spin" />
                          <span>...</span>
                        </>
                      ) : scene.scoreAnalysis ? (
                        <>
                          <Star className="w-3 h-3 fill-current" />
                          <span>{scene.scoreAnalysis.overallScore}</span>
                        </>
                      ) : (
                        <>
                          <Star className="w-3 h-3" />
                          <span>Score</span>
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                    {scene.scoreAnalysis ? (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">Scene Quality Score</p>
                        <p>Director: {scene.scoreAnalysis.directorScore}/100</p>
                        <p>Audience: {scene.scoreAnalysis.audienceScore}/100</p>
                        <p className="text-gray-400 mt-2">Click to regenerate score</p>
                      </div>
                    ) : (
                      <p className="text-xs">Generate scene quality score</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* View Review Button - Only visible when score exists */}
            {!isOutline && scene.scoreAnalysis && onOpenSceneReview && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenSceneReview(sceneIdx)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      <BarChart3 className="w-3 h-3" />
                      <span>Review</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                    <p className="text-xs">View detailed scene analysis</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
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
          </div>
        </div>
        
        {/* Row 2: Scene Title */}
        <div className="py-2 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {scene.heading && (
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{scene.heading}</h3>
              )}
              {isOutline && (
                <span className="text-xs px-2 py-0.5 rounded bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 flex-shrink-0">
                  Outline
                </span>
              )}
            </div>
            
            {/* Generate Button (for outline scenes) */}
            {isOutline && onExpand && (
              <Button
                size="sm"
                onClick={handleExpand}
                disabled={isExpanding}
                className="bg-sf-primary text-white hover:bg-sf-accent disabled:opacity-50 text-xs px-3 py-1 h-auto"
              >
                {isExpanding ? <Loader className="w-3 h-3 animate-spin" /> : 'Generate'}
              </Button>
            )}
          </div>
        </div>
        
        {/* Row 3: Scene Description */}
        <div className="py-2 px-3 border-b border-gray-100 dark:border-gray-800">
          <p className={`text-sm text-gray-600 dark:text-gray-400 ${isOpen ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
            {stripAudioDescriptions(scene.action || scene.summary || 'No description available')}
          </p>
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
          
          {/* Dialogue & Action Section */}
          {!isOutline && (() => {
            const status = getStepStatus('dialogueAction', isDialogueActionOpen)
            const isLocked = !stepUnlocked.dialogueAction
            return (
              <div className={`mb-4 border-t border-gray-200 dark:border-gray-700 pt-4 ${isLocked ? 'opacity-50' : ''}`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isLocked) {
                      setIsDialogueActionOpen(!isDialogueActionOpen)
                    }
                  }}
                  disabled={isLocked}
                  className={`flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 transition-colors ${isLocked ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-5">1</span>
                      {status === 'complete' && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      {status === 'in-progress' && <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      {status === 'todo' && <Circle className="w-4 h-4 text-gray-400" />}
                      {status === 'locked' && <Circle className="w-4 h-4 text-gray-500" />}
                    </div>
                    <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dialogue & Action</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isDialogueActionOpen ? 'rotate-90' : ''}`} />
                </button>
              </div>
            )
          })()}
          
          {!isOutline && isDialogueActionOpen && (
            <div className="mt-3 space-y-4">
                  {/* Scene Narration */}
                  {scene.narration && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Scene Narration</span>
                          {scene.narrationAudioUrl && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                              <Volume2 className="w-3 h-3" />
                              Audio Ready
                            </span>
                          )}
                        </div>
                        {scene.narrationAudioUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onPlayAudio?.(scene.narrationAudioUrl, 'narration')
                              }}
                              className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
                              title="Play Narration"
                            >
                              {playingAudio === scene.narrationAudioUrl ? (
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
                              href={scene.narrationAudioUrl}
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
                  )}
                  
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
                          // New format: object keyed by language, use 'en' by default
                          dialogueAudioArray = scene.dialogueAudio['en'] || []
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
          
          {/* Director's Chair Section */}
          {!isOutline && (() => {
            const status = getStepStatus('directorsChair', isDirectorsChairOpen)
            const isLocked = !stepUnlocked.directorsChair
            return (
              <div className={`mb-4 border-t border-gray-200 dark:border-gray-700 pt-4 ${isLocked ? 'opacity-50' : ''}`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isLocked) {
                      setIsDirectorsChairOpen(!isDirectorsChairOpen)
                    }
                  }}
                  disabled={isLocked}
                  className={`flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 transition-colors ${isLocked ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-5">2</span>
                      {status === 'complete' && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      {status === 'in-progress' && <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      {status === 'todo' && <Circle className="w-4 h-4 text-gray-400" />}
                      {status === 'locked' && <Circle className="w-4 h-4 text-gray-500" />}
                    </div>
                    <Film className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Director's Chair</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isDirectorsChairOpen ? 'rotate-90' : ''}`} />
                </button>
              </div>
            )
          })()}
          
          {!isOutline && isDirectorsChairOpen && (
            <div className="mt-3 space-y-4">
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
          
          {/* Storyboard & Pre-Viz Section */}
          {!isOutline && (() => {
            const status = getStepStatus('storyboardPreViz', isStoryboardPreVizOpen)
            const isLocked = !stepUnlocked.storyboardPreViz
            return (
              <div className={`mb-4 border-t border-gray-200 dark:border-gray-700 pt-4 ${isLocked ? 'opacity-50' : ''}`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isLocked) {
                      setIsStoryboardPreVizOpen(!isStoryboardPreVizOpen)
                    }
                  }}
                  disabled={isLocked}
                  className={`flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 transition-colors ${isLocked ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-5">3</span>
                      {status === 'complete' && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      {status === 'in-progress' && <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      {status === 'todo' && <Circle className="w-4 h-4 text-gray-400" />}
                      {status === 'locked' && <Circle className="w-4 h-4 text-gray-500" />}
                    </div>
                    <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Storyboard & Pre-Viz</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isStoryboardPreVizOpen ? 'rotate-90' : ''}`} />
                </button>
              </div>
            )
          })()}
          
          {!isOutline && isStoryboardPreVizOpen && (
            <div className="mt-3 space-y-4">
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
          
          {/* Call Action Section */}
          {!isOutline && (() => {
            const status = getStepStatus('callAction', isCallActionOpen)
            const isLocked = !stepUnlocked.callAction
            return (
              <div className={`mb-4 border-t border-gray-200 dark:border-gray-700 pt-4 ${isLocked ? 'opacity-50' : ''}`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isLocked) {
                      setIsCallActionOpen(!isCallActionOpen)
                    }
                  }}
                  disabled={isLocked}
                  className={`flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 transition-colors ${isLocked ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-5">4</span>
                      {status === 'complete' && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      {status === 'in-progress' && <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      {status === 'todo' && <Circle className="w-4 h-4 text-gray-400" />}
                      {status === 'locked' && <Circle className="w-4 h-4 text-gray-500" />}
                    </div>
                    <Clapperboard className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Call Action</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isCallActionOpen ? 'rotate-90' : ''}`} />
                </button>
              </div>
            )
          })()}
          
          {!isOutline && isCallActionOpen && (
            <div className="mt-3 space-y-4">
              {sceneProductionData && sceneProductionReferences && onInitializeSceneProduction && onSegmentPromptChange && onSegmentGenerate && onSegmentUpload ? (
                <SceneProductionManager
                  sceneId={scene.id || `scene-${sceneIdx}`}
                  sceneNumber={sceneNumber}
                  heading={typeof scene.heading === 'string' ? scene.heading : scene.heading?.text}
                  productionData={sceneProductionData}
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
                    Scene production data is loading...
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* AI Co-Pilot Guidance Panel */}
          {!isOutline && activeStep && (
            <div className="mt-6">
              <SceneWorkflowCoPilot
                activeStep={activeStep}
                isCollapsed={copilotCollapsed}
                onToggleCollapse={() => setCopilotCollapsed(!copilotCollapsed)}
              />
            </div>
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

