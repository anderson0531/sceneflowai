/**
 * GuidePromptEditor - Audio & Scene Direction Context for Video Generation
 * 
 * Displays all audio elements (narration, dialogue, music, SFX) and scene direction
 * for the current segment, allowing users to select which elements to include
 * in the video generation guide prompt.
 * 
 * KEY IMPROVEMENTS (v2):
 * - INTELLIGENT prompt synthesis (not raw concatenation with headers)
 * - Portion selector for splitting long narration/dialogue across clips
 * - Veo 3.1 audio capability indicators
 * - Optimized prompts for video model comprehension
 * 
 * Veo 3.1 Audio Capabilities:
 * - ✅ Native speech synthesis (narration, dialogue with voice)
 * - ✅ Sound effects (ambient, impacts, environment)
 * - ✅ Background music (ambient music and atmosphere from descriptions)
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  buildBatchAutoGuideElements,
  composeGuidePromptFromElements,
  getEffectiveElementText,
  getSegmentDialogueLines,
  type GuideAudioElement,
} from '@/lib/scene/segmentGuidePrompt'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mic2,
  MessageSquare,
  Music,
  Volume2,
  Clapperboard,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  AlertCircle,
  Check,
  FileText,
  Sparkles,
  Info,
  Ban,
  Wand2,
  Eye,
  User,
  Video,
} from 'lucide-react'
import type { SceneSegment, SegmentDialogueLine, NarratorVoiceType, VoiceAnchorPreset } from './types'

// ============================================================================
// Types
// ============================================================================

/**
 * Scene data passed from parent - contains audio and direction information
 */
export interface SceneAudioData {
  // Film Context (for AI prompt generation - cinematic elements)
  filmTitle?: string
  logline?: string
  genre?: string | string[]
  tone?: string
  visualStyle?: string
  
  // Scene heading/context
  sceneHeading?: string
  
  // Narration
  narration?: string
  narrationAudio?: {
    [language: string]: {
      url: string
      generatedAt?: string
    }
  }
  narrationAudioUrl?: string // Legacy field
  
  // Dialogue
  dialogue?: Array<{
    id?: string
    character: string
    line?: string
    text?: string
    parenthetical?: string
  }>
  dialogueAudio?: {
    [language: string]: Array<{
      audioUrl: string
      character: string
      dialogueIndex: number
    }>
  }
  
  // Music
  music?: string | { description: string }
  musicAudio?: string
  
  // SFX
  sfx?: Array<{
    description: string
    audioUrl?: string
  }>
  
  // Scene Direction
  sceneDirection?: {
    action?: string
    visualStyle?: string
    cameraWork?: string
    lighting?: string
    mood?: string
  }
  
  // Visual Description
  visualDescription?: string
  
  // Action (from script)
  action?: string
}

export interface GuidePromptEditorProps {
  segment: SceneSegment
  scene: SceneAudioData
  language?: string
  onGuidePromptChange: (guidePrompt: string) => void
  /** Callback for negative prompt changes */
  onNegativePromptChange?: (negativePrompt: string) => void
  /** Optional characters array for voice anchor demographics */
  characters?: Array<{
    name: string
    age?: string
    gender?: string
    ethnicity?: string
  }>
  /**
   * `batch` = assigned dialogue + direction only (matches Director queue auto-guide, smaller RAI surface).
   * `interactive` = narration/music/SFX defaults on when present (full control).
   */
  defaultElementsMode?: 'interactive' | 'batch'
  className?: string
}

type AudioElement = GuideAudioElement

// ============================================================================
// Voice Anchor Presets (Veo 3.1 Prompt Optimization)
// ============================================================================

/**
 * Voice anchor presets for consistent narrator voice generation
 * Based on the "Voice Anchor" concept from Veo prompt optimization guide:
 * Formula: [Age/Gender] + [Vocal Texture] + [Speaking Style/Pace]
 */
const VOICE_ANCHOR_PRESETS: VoiceAnchorPreset[] = [
  {
    type: 'deep-masculine',
    label: 'Deep Masculine',
    description: 'Authoritative male narrator',
    promptText: 'A deep-voiced male narrator speaking with authority and gravitas',
  },
  {
    type: 'warm-feminine',
    label: 'Warm Feminine',
    description: 'Expressive female narrator',
    promptText: 'A warm, expressive female voice speaking with emotional depth',
  },
  {
    type: 'neutral-documentary',
    label: 'Documentary',
    description: 'Professional neutral style',
    promptText: 'A professional neutral narrator speaking in documentary style',
  },
  {
    type: 'elderly-wise',
    label: 'Elderly Wise',
    description: 'Aged, contemplative voice',
    promptText: 'An elderly, contemplative voice speaking slowly and deliberately',
  },
  {
    type: 'young-energetic',
    label: 'Young Energetic',
    description: 'Youthful, dynamic voice',
    promptText: 'A youthful, energetic voice speaking with dynamic enthusiasm',
  },
  {
    type: 'custom',
    label: 'Custom',
    description: 'Define your own voice style',
    promptText: '',
  },
]

// ============================================================================
// Video Negative Prompt Presets (Veo 3.1 Realism)
// ============================================================================

/**
 * Negative prompt presets to avoid common video generation artifacts
 * Focus on motion quality and realism issues
 */
export const VIDEO_NEGATIVE_PROMPT_PRESETS = [
  {
    id: 'unnatural-motion',
    label: 'Unnatural Motion',
    description: 'Avoid jerky or robotic movements',
    value: 'unnatural motion, jerky movements, robotic motion, stiff movement, mechanical animation, jittery, stuttering motion, unsmooth transitions',
  },
  {
    id: 'bad-physics',
    label: 'Bad Physics',
    description: 'Avoid physics-defying elements',
    value: 'floating objects, defying gravity, impossible physics, clipping through objects, objects passing through each other, glitching',
  },
  {
    id: 'face-distortion',
    label: 'Face Distortion',
    description: 'Avoid facial anomalies',
    value: 'distorted face, morphing face, melting features, uncanny valley, asymmetric eyes, wrong number of eyes, blurred face, deformed facial features',
  },
  {
    id: 'hand-artifacts',
    label: 'Hand Artifacts',
    description: 'Avoid hand/finger issues',
    value: 'extra fingers, missing fingers, fused fingers, deformed hands, wrong number of fingers, malformed hands, floating hands',
  },
  {
    id: 'temporal-flicker',
    label: 'Temporal Flicker',
    description: 'Avoid frame inconsistency',
    value: 'flickering, temporal inconsistency, frame jumping, sudden appearance, sudden disappearance, objects popping in and out',
  },
  {
    id: 'low-quality',
    label: 'Low Quality',
    description: 'Avoid quality issues',
    value: 'blurry, pixelated, low resolution, compression artifacts, noisy, grainy, washed out colors, overexposed, underexposed',
  },
  {
    id: 'non-cinematic',
    label: 'Non-Cinematic',
    description: 'Avoid non-filmic styles',
    value: 'cartoon style, anime, 3D animation, CGI look, video game graphics, illustration style, unrealistic lighting',
  },
  {
    id: 'lip-sync',
    label: 'Lip Sync Issues',
    description: 'Avoid speech artifacts',
    value: 'bad lip sync, mouth not matching audio, frozen mouth, exaggerated mouth movements, no mouth movement when speaking',
  },
  {
    id: 'text-overlay',
    label: 'No Text Overlay',
    description: 'Avoid burned-in text/titles',
    value: 'text overlay, burned-in text, subtitles, captions, title cards, watermark, on-screen text, floating text, text graphics, lower third',
  },
] as const

const DEFAULT_VIDEO_NEGATIVE_PRESETS = ['unnatural-motion', 'face-distortion', 'hand-artifacts', 'text-overlay']

/**
 * Estimate word count for duration calculation
 */
function estimateWordCount(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Estimate speaking duration in seconds (avg 150 words/minute)
 */
function estimateSpeakingDuration(text: string): number {
  const words = estimateWordCount(text)
  return Math.ceil((words / 150) * 60)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get audio URL for a dialogue line
 */
function getDialogueAudioUrl(
  dialogueIndex: number,
  dialogueAudio: SceneAudioData['dialogueAudio'],
  language: string
): string | undefined {
  if (!dialogueAudio) return undefined
  
  const langAudio = dialogueAudio[language]
  if (!langAudio || !Array.isArray(langAudio)) return undefined
  
  const entry = langAudio.find(a => a.dialogueIndex === dialogueIndex)
  return entry?.audioUrl
}

/**
 * Get narration audio URL
 */
function getNarrationAudioUrl(
  scene: SceneAudioData,
  language: string
): string | undefined {
  if (scene.narrationAudio && scene.narrationAudio[language]?.url) {
    return scene.narrationAudio[language].url
  }
  
  if (language === 'en' && scene.narrationAudioUrl) {
    return scene.narrationAudioUrl
  }
  
  return undefined
}

/**
 * Get music description from various formats
 */
function getMusicDescription(music: SceneAudioData['music']): string {
  if (!music) return ''
  if (typeof music === 'string') return music
  if (typeof music === 'object' && music.description) return music.description
  return ''
}

// ============================================================================
// Audio Player Hook
// ============================================================================

function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingUrl, setPlayingUrl] = useState<string | null>(null)
  
  const play = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    
    const audio = new Audio(url)
    audioRef.current = audio
    setPlayingUrl(url)
    
    audio.onended = () => setPlayingUrl(null)
    audio.onerror = () => setPlayingUrl(null)
    
    audio.play().catch(() => setPlayingUrl(null))
  }, [])
  
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingUrl(null)
  }, [])
  
  const toggle = useCallback((url: string) => {
    if (playingUrl === url) {
      stop()
    } else {
      play(url)
    }
  }, [playingUrl, play, stop])
  
  return { playingUrl, toggle, stop }
}

// ============================================================================
// GuidePromptEditor Component
// ============================================================================

export function GuidePromptEditor({
  segment,
  scene,
  language = 'en',
  onGuidePromptChange,
  onNegativePromptChange,
  characters = [],
  defaultElementsMode = 'interactive',
  className,
}: GuidePromptEditorProps) {
  const { playingUrl, toggle } = useAudioPlayer()
  const [isExpanded, setIsExpanded] = useState(true)
  const [elements, setElements] = useState<AudioElement[]>([])
  const [customAddition, setCustomAddition] = useState('')
  const [showRawPreview, setShowRawPreview] = useState(false)
  
  // Stable reference for characters to prevent infinite loops
  // Characters are used for voice anchor lookup, only need to recompute when actual data changes
  const charactersKey = useMemo(() => JSON.stringify(characters.map(c => c.name)), [characters])
  
  // Voice Anchor state for narrator
  const [narratorVoiceType, setNarratorVoiceType] = useState<NarratorVoiceType>('neutral-documentary')
  const [customVoiceDescription, setCustomVoiceDescription] = useState('')
  
  // Negative prompt state for video quality
  const [selectedNegativePresets, setSelectedNegativePresets] = useState<Set<string>>(
    new Set(DEFAULT_VIDEO_NEGATIVE_PRESETS)
  )
  const [customNegativePrompt, setCustomNegativePrompt] = useState('')
  
  // Get the selected voice preset
  const selectedVoicePreset = VOICE_ANCHOR_PRESETS.find(p => p.type === narratorVoiceType) || VOICE_ANCHOR_PRESETS[2]
  
  // Build negative prompt from selected presets + custom
  const buildNegativePrompt = useCallback((): string => {
    const presetValues = VIDEO_NEGATIVE_PROMPT_PRESETS
      .filter(p => selectedNegativePresets.has(p.id))
      .map(p => p.value)
    
    const allParts = [...presetValues]
    if (customNegativePrompt.trim()) {
      allParts.push(customNegativePrompt.trim())
    }
    
    return allParts.join(', ')
  }, [selectedNegativePresets, customNegativePrompt])
  
  // Toggle negative preset selection
  const toggleNegativePreset = useCallback((presetId: string) => {
    setSelectedNegativePresets(prev => {
      const next = new Set(prev)
      if (next.has(presetId)) {
        next.delete(presetId)
      } else {
        next.add(presetId)
      }
      return next
    })
  }, [])
  
  // Notify parent of negative prompt changes
  useEffect(() => {
    onNegativePromptChange?.(buildNegativePrompt())
  }, [buildNegativePrompt, onNegativePromptChange])
  
  // Build the list of audio elements from scene data
  useEffect(() => {
    if (defaultElementsMode === 'batch') {
      const batchEl = buildBatchAutoGuideElements(segment, scene, characters)
      const segmentDialogueRows = getSegmentDialogueLines(segment, scene.dialogue)
      let dialogueRowIdx = 0
      const withAudio: AudioElement[] = batchEl.map((el) => {
        if (el.type !== 'dialogue') return el
        const row = segmentDialogueRows[dialogueRowIdx++]
        const audioUrl = row
          ? getDialogueAudioUrl(row.index, scene.dialogueAudio, language)
          : undefined
        return { ...el, audioUrl }
      })
      setElements(withAudio)
      return
    }

    const newElements: AudioElement[] = []
    
    // 1. Narration
    if (scene.narration) {
      newElements.push({
        id: 'narration',
        type: 'narration',
        label: 'Narration',
        content: scene.narration,
        audioUrl: getNarrationAudioUrl(scene, language),
        selected: true,
        portionStart: 0,
        portionEnd: 100,
      })
    }
    
    // 2. Dialogue lines for this segment
    const segmentDialogue = getSegmentDialogueLines(segment, scene.dialogue)
    segmentDialogue.forEach((dl, idx) => {
      // Try to find character demographics from characters array
      const charData = characters.find(c => 
        c.name.toLowerCase() === dl.character.toLowerCase() ||
        c.name.toLowerCase().includes(dl.character.toLowerCase()) ||
        dl.character.toLowerCase().includes(c.name.toLowerCase())
      )
      
      newElements.push({
        id: `dialogue-${dl.id || idx}`,
        type: 'dialogue',
        label: dl.character,
        content: dl.line,
        character: dl.character,
        characterAge: charData?.age,
        characterGender: charData?.gender,
        characterEthnicity: charData?.ethnicity,
        audioUrl: getDialogueAudioUrl(dl.index, scene.dialogueAudio, language),
        selected: true,
        portionStart: 0,
        portionEnd: 100,
      })
    })
    
    // 3. All scene dialogue (if segment doesn't have specific IDs assigned)
    if (segmentDialogue.length === 0 && scene.dialogue && scene.dialogue.length > 0) {
      scene.dialogue.forEach((dl, idx) => {
        // Try to find character demographics from characters array
        const charData = characters.find(c => 
          c.name.toLowerCase() === (dl.character || '').toLowerCase() ||
          c.name.toLowerCase().includes((dl.character || '').toLowerCase()) ||
          (dl.character || '').toLowerCase().includes(c.name.toLowerCase())
        )
        
        newElements.push({
          id: `scene-dialogue-${idx}`,
          type: 'dialogue',
          label: dl.character || 'Character',
          content: dl.line || dl.text || '',
          character: dl.character,
          characterAge: charData?.age,
          characterGender: charData?.gender,
          characterEthnicity: charData?.ethnicity,
          audioUrl: getDialogueAudioUrl(idx, scene.dialogueAudio, language),
          selected: false,
          portionStart: 0,
          portionEnd: 100,
        })
      })
    }
    
    // 4. Music (selected by default - Veo CAN generate music/ambience)
    const musicDesc = getMusicDescription(scene.music)
    if (musicDesc) {
      newElements.push({
        id: 'music',
        type: 'music',
        label: 'Music',
        content: musicDesc,
        audioUrl: scene.musicAudio,
        selected: true, // Veo can generate background music and ambience
        portionStart: 0,
        portionEnd: 100,
      })
    }
    
    // 5. SFX (selected by default - Veo CAN generate SFX)
    if (scene.sfx && scene.sfx.length > 0) {
      scene.sfx.forEach((sfx, idx) => {
        if (sfx.description) {
          newElements.push({
            id: `sfx-${idx}`,
            type: 'sfx',
            label: `SFX ${idx + 1}`,
            content: sfx.description,
            audioUrl: sfx.audioUrl,
            selected: true, // Veo can generate ambient/SFX
            portionStart: 0,
            portionEnd: 100,
          })
        }
      })
    }
    
    // 6. Scene Direction / Action
    const directionParts: string[] = []
    
    if (segment.actionPrompt) {
      directionParts.push(segment.actionPrompt)
    } else if (segment.action) {
      directionParts.push(segment.action)
    }
    
    if (scene.sceneDirection?.action) {
      directionParts.push(scene.sceneDirection.action)
    }
    if (scene.action && !directionParts.includes(scene.action)) {
      directionParts.push(scene.action)
    }
    if (scene.visualDescription) {
      directionParts.push(scene.visualDescription)
    }
    
    if (directionParts.length > 0) {
      newElements.push({
        id: 'direction',
        type: 'direction',
        label: 'Scene Direction',
        content: directionParts.join('\n\n'),
        selected: true,
        portionStart: 0,
        portionEnd: 100,
      })
    }
    
    setElements(newElements)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, scene, language, charactersKey, defaultElementsMode])  // Use charactersKey for stable reference
  
  // Toggle element selection
  const toggleElement = useCallback((elementId: string) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, selected: !el.selected } : el
    ))
  }, [])
  
  // Update prompt-only edited text for dialogue/narration
  const updateElementEditedContent = useCallback((elementId: string, editedContent: string) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, editedContent } : el
    ))
  }, [])

  const resetElementEditedContent = useCallback((elementId: string) => {
    setElements(prev => prev.map(el =>
      el.id === elementId ? { ...el, editedContent: undefined } : el
    ))
  }, [])
  
  // ============================================================================
  // INTELLIGENT PROMPT SYNTHESIS (shared with batch auto-guide)
  // ============================================================================
  const composedPrompt = useMemo(() => {
    return composeGuidePromptFromElements(elements.filter((el) => el.selected), {
      customAddition,
      narratorVoicePromptText: selectedVoicePreset.promptText,
      narratorUseCustomVoice: narratorVoiceType === 'custom',
      narratorCustomDescription: customVoiceDescription,
    })
  }, [elements, customAddition, narratorVoiceType, customVoiceDescription, selectedVoicePreset])
  
  // Raw concatenated version for preview/debugging
  const rawConcatenatedPrompt = useMemo(() => {
    const selectedElements = elements.filter(el => el.selected)
    const parts: string[] = []
    
    const directions = selectedElements.filter(el => el.type === 'direction')
    if (directions.length > 0) {
      parts.push(`[SCENE DIRECTION]\n${directions.map(d => getEffectiveElementText(d)).join('\n')}`)
    }
    
    const narrations = selectedElements.filter(el => el.type === 'narration')
    if (narrations.length > 0) {
      parts.push(`[NARRATION]\n${narrations.map(n => getEffectiveElementText(n)).join('\n')}`)
    }
    
    const dialogues = selectedElements.filter(el => el.type === 'dialogue')
    if (dialogues.length > 0) {
      const dialogueText = dialogues
        .map(d => `${d.character}: "${getEffectiveElementText(d)}"`)
        .join('\n')
      parts.push(`[DIALOGUE]\n${dialogueText}`)
    }
    
    const sfx = selectedElements.filter(el => el.type === 'sfx')
    if (sfx.length > 0) {
      parts.push(`[SOUND EFFECTS]\n${sfx.map(s => getEffectiveElementText(s)).join(', ')}`)
    }
    
    const music = selectedElements.filter(el => el.type === 'music')
    if (music.length > 0) {
      parts.push(`[MUSIC]\n${music.map(m => getEffectiveElementText(m)).join(', ')}`)
    }
    
    if (customAddition.trim()) {
      parts.push(`[ADDITIONAL NOTES]\n${customAddition.trim()}`)
    }
    
    return parts.join('\n\n')
  }, [elements, customAddition])
  
  // Notify parent of changes
  useEffect(() => {
    onGuidePromptChange(composedPrompt)
  }, [composedPrompt, onGuidePromptChange])
  
  // Count selected elements
  const selectedCount = elements.filter(el => el.selected).length
  const totalCount = elements.length
  
  // Get icon for element type
  const getTypeIcon = (type: AudioElement['type']) => {
    switch (type) {
      case 'narration': return Mic2
      case 'dialogue': return MessageSquare
      case 'music': return Music
      case 'sfx': return Volume2
      case 'direction': return Clapperboard
      default: return FileText
    }
  }
  
  // Get color for element type
  const getTypeColor = (type: AudioElement['type']) => {
    switch (type) {
      case 'narration': return 'text-blue-400'
      case 'dialogue': return 'text-purple-400'
      case 'music': return 'text-green-400'
      case 'sfx': return 'text-amber-400'
      case 'direction': return 'text-cyan-400'
      default: return 'text-slate-400'
    }
  }
  
  const supportsPreciseTextEdit = (element: AudioElement): boolean =>
    element.type === 'narration' || element.type === 'dialogue'

  if (elements.length === 0) {
    return (
      <div className={cn("p-4 bg-slate-800/50 rounded-lg border border-slate-700", className)}>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>No audio or direction elements found for this segment</span>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn("rounded-lg border border-slate-700 overflow-hidden", className)}>
        {/* Header */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-medium text-slate-200">Guide Prompt Builder</span>
            <Badge variant="secondary" className="text-xs bg-slate-700">
              {selectedCount}/{totalCount} selected
            </Badge>
            <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-500/50">
              AI Optimized
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="p-4 space-y-4 bg-slate-900/50">
            {segment.dialogueLineIds && segment.dialogueLineIds.length > 0 && (
              <div className="flex gap-2 p-3 rounded-lg bg-cyan-950/40 border border-cyan-700/40 text-xs text-cyan-100/90 leading-snug">
                <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>
                  Dialogue lines come from <span className="font-medium text-cyan-200">segment assignment</span> (Call Action / segment builder). Adjust assignments there to change which lines appear. Use portion sliders below only when one assigned line is longer than a single clip.
                </span>
              </div>
            )}
            
            {/* Veo Audio Capabilities Banner */}
            <div className="p-3 bg-slate-800/70 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-slate-300">Veo 3.1 Audio Capabilities</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-green-400 cursor-help">
                      <Check className="w-3.5 h-3.5" /> Voice/Dialogue
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Veo can synthesize character voices and narration</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-green-400 cursor-help">
                      <Check className="w-3.5 h-3.5" /> Sound Effects
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ambient sounds, impacts, and environment audio</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-green-400 cursor-help">
                      <Check className="w-3.5 h-3.5" /> Music
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Veo can generate background music and ambience from descriptions</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            {/* Narrator Voice Anchor Selector */}
            {elements.some(el => el.type === 'narration' && el.selected) && (
              <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-blue-400" />
                  <Label className="text-xs font-medium text-blue-300">Narrator Voice Anchor</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-blue-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Voice Anchor ensures consistent narrator voice across all video clips. Veo uses this description to synthesize matching voices.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-3">
                  <Select
                    value={narratorVoiceType}
                    onValueChange={(value) => setNarratorVoiceType(value as NarratorVoiceType)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Select narrator voice style" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_ANCHOR_PRESETS.map((preset) => (
                        <SelectItem key={preset.type} value={preset.type}>
                          <div className="flex flex-col">
                            <span>{preset.label}</span>
                            <span className="text-xs text-slate-500">{preset.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {narratorVoiceType === 'custom' && (
                    <Textarea
                      value={customVoiceDescription}
                      onChange={(e) => setCustomVoiceDescription(e.target.value)}
                      placeholder="e.g., 'A raspy, deep-voiced elderly man with a thick Scottish accent, speaking slowly and deliberately'"
                      className="min-h-[60px] text-sm bg-slate-800 border-slate-600"
                    />
                  )}
                  
                  {narratorVoiceType !== 'custom' && (
                    <p className="text-xs text-slate-500 italic">
                      "{selectedVoicePreset.promptText}"
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Element Cards */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 uppercase tracking-wider">
                Audio & Direction Elements
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Select elements to include. The prompt will be intelligently synthesized for optimal video generation.
              </p>
              
              <ScrollArea className="max-h-[450px]">
                <div className="space-y-3 pr-2">
                  {elements.map((element) => {
                    const Icon = getTypeIcon(element.type)
                    const colorClass = getTypeColor(element.type)
                    const showTextEditor = supportsPreciseTextEdit(element) && element.selected
                    const effectiveText = getEffectiveElementText(element)
                    const estimatedDuration = estimateSpeakingDuration(effectiveText)
                    const hasEdits = Boolean(element.editedContent?.trim())
                    
                    return (
                      <div
                        key={element.id}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          element.selected
                            ? "bg-slate-800 border-slate-600"
                            : "bg-slate-800/30 border-slate-700/50 opacity-60"
                        )}
                      >
                        <div 
                          className="flex items-start gap-3 cursor-pointer"
                          onClick={() => toggleElement(element.id)}
                        >
                          {/* Checkbox */}
                          <Checkbox
                            checked={element.selected}
                            onCheckedChange={() => toggleElement(element.id)}
                            className="mt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          />
                          
                          {/* Icon */}
                          <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", colorClass)} />
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-slate-200">
                                {element.label}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={cn("text-[10px] capitalize", colorClass)}
                              >
                                {element.type}
                              </Badge>
                              {(element.type === 'sfx' || element.type === 'music') && (
                                <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-300">
                                  Veo Native
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 whitespace-pre-wrap break-words select-text cursor-text">
                              {element.content}
                            </p>
                          </div>
                          
                          {/* Audio Preview Button */}
                          {element.audioUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggle(element.audioUrl!)
                              }}
                            >
                              {playingUrl === element.audioUrl ? (
                                <Pause className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </Button>
                          )}
                        </div>
                        
                        {/* Precise text editor for dialogue/narration */}
                        {showTextEditor && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3 h-3 text-amber-400" />
                                <span className="text-xs text-slate-400">Text used for this clip:</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>~{estimatedDuration}s speaking</span>
                                {hasEdits && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[10px] text-amber-300 hover:text-amber-200"
                                    onClick={() => resetElementEditedContent(element.id)}
                                  >
                                    Reset to original
                                  </Button>
                                )}
                              </div>
                            </div>
                            <Textarea
                              value={element.editedContent ?? effectiveText}
                              onChange={(e) => updateElementEditedContent(element.id, e.target.value)}
                              className="min-h-[90px] text-sm bg-slate-900 border-slate-600"
                            />
                            <p className="text-[11px] text-slate-500 mt-2">
                              Source reference (read-only):
                            </p>
                            <p className="text-xs text-slate-500 mt-1 italic line-clamp-3 pl-1 border-l-2 border-slate-600">
                              "{element.content.slice(0, 220)}{element.content.length > 220 ? '...' : ''}"
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
            
            {/* Custom Addition */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">
                Additional Motion/Action Notes (optional)
              </Label>
              <Textarea
                value={customAddition}
                onChange={(e) => setCustomAddition(e.target.value)}
                placeholder="Add custom motion instructions (e.g., 'Camera slowly pushes in on subject')..."
                className="min-h-[60px] text-sm bg-slate-800 border-slate-700"
              />
            </div>
            
            {/* Negative Prompts Section */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="negative" className="border-slate-700">
                <AccordionTrigger className="text-sm text-slate-300 hover:text-white py-2">
                  <div className="flex items-center gap-2">
                    <Ban className="w-4 h-4 text-red-400" />
                    <span>Negative Prompts (Realism)</span>
                    <Badge variant="outline" className="text-[10px] text-red-300 border-red-500/50 ml-2">
                      {selectedNegativePresets.size} active
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Select artifacts to avoid for more realistic video generation:
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {VIDEO_NEGATIVE_PROMPT_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => toggleNegativePreset(preset.id)}
                          className={cn(
                            "p-2 rounded-lg border text-left transition-colors",
                            selectedNegativePresets.has(preset.id)
                              ? "border-red-500/50 bg-red-500/10"
                              : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                          )}
                        >
                          <span className={cn(
                            "text-xs font-medium",
                            selectedNegativePresets.has(preset.id) ? "text-red-300" : "text-slate-400"
                          )}>
                            {preset.label}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {preset.description}
                          </p>
                        </button>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">Custom negative prompt:</Label>
                      <Textarea
                        value={customNegativePrompt}
                        onChange={(e) => setCustomNegativePrompt(e.target.value)}
                        placeholder="Add custom terms to avoid (e.g., 'shaky camera, motion blur')..."
                        className="min-h-[60px] text-sm bg-slate-800 border-slate-700"
                      />
                    </div>
                    
                    {/* Preview combined negative prompt */}
                    {(selectedNegativePresets.size > 0 || customNegativePrompt) && (
                      <div className="p-3 bg-slate-900 rounded-lg">
                        <Label className="text-xs text-slate-500 mb-1 block">Combined negative prompt:</Label>
                        <p className="text-xs text-red-400/70 font-mono break-words max-h-[100px] overflow-y-auto">
                          {buildNegativePrompt() || '(none)'}
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            {/* Optimized Prompt Preview */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="preview" className="border-slate-700">
                <AccordionTrigger className="text-sm text-slate-300 hover:text-white py-2">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-purple-400" />
                    <span>Preview Optimized Prompt</span>
                    <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-500/50 ml-2">
                      {composedPrompt.length} chars
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {/* Optimized prompt */}
                    <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-purple-300 font-medium">AI-Optimized Prompt:</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-purple-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>This prompt is intelligently synthesized for video models. It extracts key visual actions and emotional tones instead of raw text.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">
                        {composedPrompt || '(No elements selected)'}
                      </p>
                    </div>
                    
                    {/* Toggle for raw view */}
                    <button
                      type="button"
                      onClick={() => setShowRawPreview(!showRawPreview)}
                      className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      {showRawPreview ? 'Hide' : 'Show'} raw concatenated version
                    </button>
                    
                    {showRawPreview && (
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                        <Label className="text-xs text-slate-500 mb-1 block">Raw Concatenated (NOT recommended):</Label>
                        <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono max-h-[200px] overflow-y-auto">
                          {rawConcatenatedPrompt || '(No elements selected)'}
                        </pre>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default GuidePromptEditor
