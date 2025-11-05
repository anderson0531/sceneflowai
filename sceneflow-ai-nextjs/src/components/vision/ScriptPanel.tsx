'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FileText, Edit, Eye, Sparkles, Loader, Loader2, Play, Square, Volume2, Image as ImageIcon, Wand2, ChevronRight, Music, Volume as VolumeIcon, Upload, StopCircle, AlertTriangle, ChevronDown, Check, Pause, Download, Zap, Camera, RefreshCw, Plus, Trash2, GripVertical, Film, Users, Star, BarChart3, Clock, Image, Clapperboard, Printer, Video as VideoIcon, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
import { ReportType } from '@/lib/types/reports'
import { ProjectCostCalculator } from './ProjectCostCalculator'

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
  onGenerateSceneAudio?: (sceneIdx: number, audioType: 'narration' | 'dialogue', characterName?: string, dialogueIndex?: number) => void
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

export function ScriptPanel({ script, onScriptChange, isGenerating, onExpandScene, onExpandAllScenes, onGenerateSceneImage, characters = [], projectId, visualStyle, validationWarnings = {}, validationInfo = {}, onDismissValidationWarning, onPlayAudio, onGenerateSceneAudio, onGenerateAllAudio, isGeneratingAudio, onPlayScript, onOpenAnimaticsStudio, onAddScene, onDeleteScene, onReorderScenes, directorScore, audienceScore, onGenerateReviews, isGeneratingReviews, onShowReviews, onEditScene, onGenerateSceneScore, generatingScoreFor, getScoreColorClass, hasBYOK = false, onOpenBYOK }: ScriptPanelProps) {
  const [expandingScenes, setExpandingScenes] = useState<Set<number>>(new Set())
  const [showScriptEditor, setShowScriptEditor] = useState(false)
  const [selectedScene, setSelectedScene] = useState<number | null>(null)
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  
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
  const [showScriptOverview, setShowScriptOverview] = useState(true)
  
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

  const scenes = script?.script?.scenes || []

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

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-sf-primary" />
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 leading-6 my-0">Production Script</h2>
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
                    {/* Screening Room Button */}
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
                  <Play className="w-4 h-4" />
                  <span>Screen</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                <p>Open Screening Room</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Generate All Audio Button */}
          {onGenerateAllAudio && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onGenerateAllAudio}
                    disabled={isGeneratingAudio || !script || !scenes || scenes.length === 0}
                    className="flex items-center gap-1"
                  >
                    {isGeneratingAudio ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Generate All</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">
                  <p>Generate narration, dialogue, music, and SFX for all scenes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
                    {/* Animatics Studio Button - HIDDEN */}
          {false && onOpenAnimaticsStudio && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onOpenAnimaticsStudio}
                    disabled={!script || !scenes || scenes.length === 0}
                    className="flex items-center gap-1"
                  >
                    <VideoIcon className="w-4 h-4" />
                    <span>Animatics</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white border border-gray-700">                                                       
                  <p>Open Animatics Studio</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScriptEditor(true)}
            className="flex items-center gap-2"
          >
            <Clapperboard className="w-4 h-4" />
            <span>Review</span>
          </Button>
          
          {/* Preview/Print Button */}
          {script && scenes && scenes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReportPreviewOpen(true)}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Script</span>
            </Button>
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-6 my-0">Script Overview</h3>
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
      
      {/* Report Preview Modal */}
      {script && (
        <ReportPreviewModal
          type={ReportType.PROFESSIONAL_SCRIPT}
          data={script as any}
          projectName={script.title || 'Untitled Script'}
          open={reportPreviewOpen}
          onOpenChange={setReportPreviewOpen}
        />
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
  onGenerateSceneAudio?: (sceneIdx: number, audioType: 'narration' | 'dialogue', characterName?: string, dialogueIndex?: number) => void
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
}

function SceneCard({ scene, sceneNumber, isSelected, onClick, onExpand, isExpanding, onPlayScene, isPlaying, audioEnabled, sceneIdx, onGenerateImage, isGeneratingImage, onOpenPromptBuilder, onOpenPromptDrawer, scenePrompt, onPromptChange, validationWarning, validationInfo, isWarningExpanded, onToggleWarningExpanded, onDismissValidationWarning, parseScriptForAudio, generateAndPlaySFX, generateAndPlayMusic, onPlayAudio, onGenerateSceneAudio, playingAudio, generatingDialogue, setGeneratingDialogue, timelineStart, dragHandleProps, onAddScene, onDeleteScene, onEditScene, onGenerateSceneScore, generatingScoreFor, getScoreColorClass, onStopAudio, onOpenSceneReview, generatingMusic, setGeneratingMusic, generatingSFX, setGeneratingSFX, generateMusic, generateSFX }: SceneCardProps) {
  const isOutline = !scene.isExpanded && scene.summary
  const [isOpen, setIsOpen] = useState(false)
  
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
          
          {/* Scene Image - Prominent Storyboard Display */}
          {!isOutline && scene.imageUrl && (
            <div className="mb-4 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 shadow-md max-w-3xl mx-auto">
              <img 
                src={scene.imageUrl} 
                alt={scene.heading}
                className="w-full h-auto object-cover"
              />
            </div>
          )}
          
          {/* Image Generation Buttons - Above Narration */}
          {onGenerateImage && scene.visualDescription && (
            <div className="mb-3 flex items-center justify-end gap-2">
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
          
          {/* Narration (if available) */}
          {scene.narration && (
            <div className="mt-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
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
                          await onGenerateSceneAudio(sceneIdx, 'narration')
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
                        await onGenerateSceneAudio(sceneIdx, 'narration')
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
          
          {/* Show summary for outlines only (action now always visible in Row 3) */}
          {isOutline && scene.summary && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">{scene.summary}</div>
          )}
          
          {!isOutline && scene.dialogue && scene.dialogue.length > 0 && (
            <div className="space-y-2">
              {scene.dialogue.map((d: any, i: number) => {
                // Match audio by both character and dialogueIndex
                const audioEntry = scene.dialogueAudio?.find((a: any) => 
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
                              await onGenerateSceneAudio(sceneIdx, 'dialogue', d.character, i)
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
                            await onGenerateSceneAudio(sceneIdx, 'dialogue', d.character, i)
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
          )}
          
          {/* Music (if available) */}
          {scene.music && (
            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
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
          
          {/* SFX (if available) */}
          {scene.sfx && Array.isArray(scene.sfx) && scene.sfx.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Sound Effects ({scene.sfx.length})
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

