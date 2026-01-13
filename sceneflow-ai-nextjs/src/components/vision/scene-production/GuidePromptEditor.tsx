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
 * - ❌ Background music (must be added as MP3 overlay in post-production)
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
import { Slider } from '@/components/ui/slider'
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
  Scissors,
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
  className?: string
}

interface AudioElement {
  id: string
  type: 'narration' | 'dialogue' | 'music' | 'sfx' | 'direction'
  label: string
  content: string
  audioUrl?: string
  character?: string
  selected: boolean
  // Portion selection for long content spanning multiple clips
  portionStart: number  // 0-100 percentage
  portionEnd: number    // 0-100 percentage
}

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
] as const

const DEFAULT_VIDEO_NEGATIVE_PRESETS = ['unnatural-motion', 'face-distortion', 'hand-artifacts']

/**
 * Auto-generate voice anchor from character demographics
 * Used when no explicit voice type is selected for dialogue
 */
function generateCharacterVoiceAnchor(
  name: string,
  age?: string,
  gender?: string,
  ethnicity?: string
): string {
  const parts: string[] = []
  
  // Age descriptor
  if (age) {
    const ageNum = parseInt(age)
    if (!isNaN(ageNum)) {
      if (ageNum < 25) parts.push('young')
      else if (ageNum < 40) parts.push('adult')
      else if (ageNum < 60) parts.push('middle-aged')
      else parts.push('elderly')
    }
  }
  
  // Gender descriptor
  if (gender) {
    parts.push(gender.toLowerCase())
  }
  
  // Build the anchor
  if (parts.length > 0) {
    return `${name}, a ${parts.join(' ')} voice`
  }
  
  return name
}

// ============================================================================
// Intelligent Prompt Synthesis Helpers
// ============================================================================

/**
 * Extract the most visually important action from direction text
 * Prioritizes camera movements, character actions, and key visual moments
 */
function extractCoreVisualAction(text: string, maxLength: number = 250): string {
  if (!text) return ''
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  
  // Visual keywords to prioritize
  const visualKeywords = [
    'camera', 'cut', 'close up', 'wide shot', 'pan', 'zoom', 'reveal', 'tracking',
    'types', 'looks', 'turns', 'walks', 'runs', 'sits', 'stands', 'enters', 'exits',
    'gazes', 'stares', 'reaches', 'grabs', 'opens', 'closes', 'moves', 'slowly',
    'suddenly', 'quickly', 'face', 'eyes', 'hands', 'screen', 'monitor', 'light'
  ]
  
  // Score and sort sentences by visual relevance
  const scored = sentences.map(s => ({
    text: s.trim(),
    score: visualKeywords.filter(k => s.toLowerCase().includes(k)).length
  }))
  .sort((a, b) => b.score - a.score)
  
  // Take top sentences up to maxLength
  let result = ''
  for (const item of scored) {
    if (result.length + item.text.length + 2 <= maxLength) {
      result += (result ? '. ' : '') + item.text
    } else if (!result) {
      // At least include first sentence truncated
      result = item.text.slice(0, maxLength - 3) + '...'
      break
    } else {
      break
    }
  }
  
  return result
}

/**
 * Extract emotional tone from dialogue text and parentheticals
 */
function extractDialoguePerformance(dialogueText: string, parenthetical?: string): string {
  // Check parenthetical first (e.g., "(tiredly)", "(whispered)")
  if (parenthetical) {
    const cleaned = parenthetical.replace(/[()]/g, '').trim().toLowerCase()
    return cleaned
  }
  
  // Emotion keywords to detect from dialogue content
  const emotionPatterns: [RegExp, string][] = [
    [/tiredly|exhausted|weary/i, 'with exhaustion'],
    [/angrily|furious|rage/i, 'with anger'],
    [/softly|gently|tender/i, 'softly'],
    [/urgently|desperate/i, 'urgently'],
    [/quietly|hushed/i, 'quietly'],
    [/murmur|mumble/i, 'in a low murmur'],
    [/whisper/i, 'in a whisper'],
    [/shout|yell|scream/i, 'loudly'],
    [/sad|grief|mourn/i, 'with sadness'],
    [/laugh|chuckle|amused/i, 'with amusement'],
    [/fear|afraid|terror/i, 'fearfully'],
    [/cold|stern|firm/i, 'coldly'],
  ]
  
  for (const [pattern, emotion] of emotionPatterns) {
    if (pattern.test(dialogueText)) {
      return emotion
    }
  }
  
  return ''
}

/**
 * Extract the emotional/atmospheric tone from narration
 */
function extractNarrativeTone(narrationText: string): string {
  const tonePatterns: [RegExp, string][] = [
    [/catastrophe|disaster|destruction/i, 'somber reflection'],
    [/weight|burden|heavy/i, 'burdened atmosphere'],
    [/failed|loss|lost/i, 'melancholic undertone'],
    [/hope|light|future/i, 'hopeful undercurrent'],
    [/danger|threat|risk/i, 'tense atmosphere'],
    [/love|heart|warm/i, 'emotional warmth'],
    [/echo|memory|past/i, 'contemplative mood'],
    [/quiet|silence|still/i, 'quiet contemplation'],
    [/ambition|drive|obsession/i, 'driven intensity'],
  ]
  
  const matchedTones: string[] = []
  const lower = narrationText.toLowerCase()
  
  for (const [pattern, tone] of tonePatterns) {
    if (pattern.test(lower) && !matchedTones.includes(tone)) {
      matchedTones.push(tone)
    }
  }
  
  return matchedTones.slice(0, 2).join(', ') || 'contemplative narration'
}

/**
 * Get a portion of text based on percentage range
 */
function getTextPortion(text: string, startPercent: number, endPercent: number): string {
  if (!text) return ''
  
  // Split by sentences for cleaner cuts
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const totalSentences = sentences.length
  
  const startIdx = Math.floor((startPercent / 100) * totalSentences)
  const endIdx = Math.ceil((endPercent / 100) * totalSentences)
  
  return sentences.slice(startIdx, endIdx).join(' ').trim()
}

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
 * Extract dialogue lines for this segment based on dialogueLineIds
 */
function getSegmentDialogueLines(
  segment: SceneSegment,
  sceneDialogue: SceneAudioData['dialogue']
): Array<{ id: string; character: string; line: string; parenthetical?: string; index: number }> {
  if (!sceneDialogue || sceneDialogue.length === 0) return []
  
  const dialogueLineIds = segment.dialogueLineIds || []
  
  if (dialogueLineIds.length > 0) {
    return dialogueLineIds
      .map((id) => {
        const dialogueItem = sceneDialogue.find((d, i) => 
          (d.id === id) || (`dialogue-${i}` === id)
        )
        if (!dialogueItem) return null
        return {
          id,
          character: dialogueItem.character || 'Unknown',
          line: dialogueItem.line || dialogueItem.text || '',
          parenthetical: dialogueItem.parenthetical,
          index: sceneDialogue.indexOf(dialogueItem),
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
  }
  
  if (segment.dialogueLines && segment.dialogueLines.length > 0) {
    return segment.dialogueLines.map((dl, idx) => ({
      id: dl.id,
      character: dl.character,
      line: dl.line,
      index: idx,
    }))
  }
  
  return []
}

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
  className,
}: GuidePromptEditorProps) {
  const { playingUrl, toggle } = useAudioPlayer()
  const [isExpanded, setIsExpanded] = useState(true)
  const [elements, setElements] = useState<AudioElement[]>([])
  const [customAddition, setCustomAddition] = useState('')
  const [showRawPreview, setShowRawPreview] = useState(false)
  
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
      newElements.push({
        id: `dialogue-${dl.id || idx}`,
        type: 'dialogue',
        label: dl.character,
        content: dl.line,
        character: dl.character,
        audioUrl: getDialogueAudioUrl(dl.index, scene.dialogueAudio, language),
        selected: true,
        portionStart: 0,
        portionEnd: 100,
      })
    })
    
    // 3. All scene dialogue (if segment doesn't have specific IDs assigned)
    if (segmentDialogue.length === 0 && scene.dialogue && scene.dialogue.length > 0) {
      scene.dialogue.forEach((dl, idx) => {
        newElements.push({
          id: `scene-dialogue-${idx}`,
          type: 'dialogue',
          label: dl.character || 'Character',
          content: dl.line || dl.text || '',
          character: dl.character,
          audioUrl: getDialogueAudioUrl(idx, scene.dialogueAudio, language),
          selected: false,
          portionStart: 0,
          portionEnd: 100,
        })
      })
    }
    
    // 4. Music (NOT selected by default - Veo can't generate music)
    const musicDesc = getMusicDescription(scene.music)
    if (musicDesc) {
      newElements.push({
        id: 'music',
        type: 'music',
        label: 'Music',
        content: musicDesc,
        audioUrl: scene.musicAudio,
        selected: false, // Never include - must be post-production overlay
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
  }, [segment, scene, language])
  
  // Toggle element selection
  const toggleElement = useCallback((elementId: string) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, selected: !el.selected } : el
    ))
  }, [])
  
  // Update element portion
  const updateElementPortion = useCallback((elementId: string, start: number, end: number) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, portionStart: start, portionEnd: end } : el
    ))
  }, [])
  
  // ============================================================================
  // INTELLIGENT PROMPT SYNTHESIS - Anchor & Layer Format
  // Veo 3.1 Optimization: [Cinematography] → [Visual Anchor] → [Action] → 
  // [Environment] → [Audio: Dialogue] → [Audio: SFX+Ambience]
  // ============================================================================
  const composedPrompt = useMemo(() => {
    const selectedElements = elements.filter(el => el.selected)
    
    if (selectedElements.length === 0 && !customAddition.trim()) {
      return ''
    }
    
    const promptParts: string[] = []
    
    // 1. CINEMATOGRAPHY (from scene direction camera work)
    const directions = selectedElements.filter(el => el.type === 'direction')
    if (directions.length > 0) {
      const directionText = directions
        .map(d => getTextPortion(d.content, d.portionStart, d.portionEnd))
        .join(' ')
      
      // Extract camera work if present
      const cameraMatch = directionText.match(/(?:camera|shot|angle|pan|zoom|tracking|dolly|close[- ]?up|wide|medium)[^.]*\./i)
      if (cameraMatch) {
        promptParts.push(cameraMatch[0].trim())
      }
      
      // 2. VISUAL ACTION - Core visual description
      const visualAction = extractCoreVisualAction(directionText, 250)
      if (visualAction) {
        promptParts.push(visualAction)
      }
    }
    
    // 3. DIALOGUE with Voice Anchors - Include actual dialogue text for Veo synthesis
    const dialogues = selectedElements.filter(el => el.type === 'dialogue')
    if (dialogues.length > 0) {
      const dialogueParts = dialogues.map(d => {
        const portion = getTextPortion(d.content, d.portionStart, d.portionEnd)
        const charName = d.character || 'Character'
        const emotion = extractDialoguePerformance(portion)
        
        // Truncate long dialogue to ~80 words max for Veo
        const words = portion.split(/\s+/)
        const truncatedText = words.length > 80 
          ? words.slice(0, 80).join(' ') + '...'
          : portion
        
        // Format with voice anchor: "[Voice Description] says: "[Dialogue]""
        if (emotion) {
          return `${charName} ${emotion} says: "${truncatedText}"`
        }
        return `${charName} says: "${truncatedText}"`
      })
      
      promptParts.push(dialogueParts.join(' '))
    }
    
    // 4. NARRATION with Voice Anchor - Include actual narration text (parsed portion)
    const narrations = selectedElements.filter(el => el.type === 'narration')
    if (narrations.length > 0) {
      const narrationText = narrations
        .map(n => getTextPortion(n.content, n.portionStart, n.portionEnd))
        .join(' ')
      
      // Get the voice anchor description
      const voiceAnchor = narratorVoiceType === 'custom' && customVoiceDescription
        ? customVoiceDescription
        : selectedVoicePreset.promptText
      
      // Truncate long narration to ~80 words max for Veo
      const words = narrationText.split(/\s+/)
      const truncatedNarration = words.length > 80 
        ? words.slice(0, 80).join(' ') + '...'
        : narrationText
      
      // Format: "[Voice Anchor]: "[Narration Text]""
      if (voiceAnchor) {
        promptParts.push(`${voiceAnchor}: "${truncatedNarration}"`)
      } else {
        promptParts.push(`Narrator: "${truncatedNarration}"`)
      }
    }
    
    // 5. AMBIENT AUDIO (SFX that Veo can generate)
    const sfxElements = selectedElements.filter(el => el.type === 'sfx')
    if (sfxElements.length > 0) {
      const sfxDescriptions = sfxElements
        .map(s => getTextPortion(s.content, s.portionStart, s.portionEnd))
        .join(', ')
      promptParts.push(`Ambient: ${sfxDescriptions}`)
    }
    
    // 6. CUSTOM NOTES (user additions)
    if (customAddition.trim()) {
      promptParts.push(customAddition.trim())
    }
    
    // Join with periods for clean sentence structure
    return promptParts.join('. ').replace(/\.\./g, '.').replace(/\s+/g, ' ').trim()
  }, [elements, customAddition, narratorVoiceType, customVoiceDescription, selectedVoicePreset])
  
  // Raw concatenated version for preview/debugging
  const rawConcatenatedPrompt = useMemo(() => {
    const selectedElements = elements.filter(el => el.selected)
    const parts: string[] = []
    
    const directions = selectedElements.filter(el => el.type === 'direction')
    if (directions.length > 0) {
      parts.push(`[SCENE DIRECTION]\n${directions.map(d => getTextPortion(d.content, d.portionStart, d.portionEnd)).join('\n')}`)
    }
    
    const narrations = selectedElements.filter(el => el.type === 'narration')
    if (narrations.length > 0) {
      parts.push(`[NARRATION]\n${narrations.map(n => getTextPortion(n.content, n.portionStart, n.portionEnd)).join('\n')}`)
    }
    
    const dialogues = selectedElements.filter(el => el.type === 'dialogue')
    if (dialogues.length > 0) {
      const dialogueText = dialogues
        .map(d => `${d.character}: "${getTextPortion(d.content, d.portionStart, d.portionEnd)}"`)
        .join('\n')
      parts.push(`[DIALOGUE]\n${dialogueText}`)
    }
    
    const sfx = selectedElements.filter(el => el.type === 'sfx')
    if (sfx.length > 0) {
      parts.push(`[SOUND EFFECTS]\n${sfx.map(s => getTextPortion(s.content, s.portionStart, s.portionEnd)).join(', ')}`)
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
  
  // Check if element content is long enough to need portion selector
  const needsPortionSelector = (element: AudioElement): boolean => {
    return (element.type === 'narration' || element.type === 'dialogue') && 
           element.content.length > 120
  }

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
                    <div className="flex items-center gap-1.5 text-red-400 cursor-help">
                      <Ban className="w-3.5 h-3.5" /> Music
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Background music must be added as MP3 overlay in post-production</p>
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
              
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2 pr-2">
                  {elements.map((element) => {
                    const Icon = getTypeIcon(element.type)
                    const colorClass = getTypeColor(element.type)
                    const isMusic = element.type === 'music'
                    const showPortion = needsPortionSelector(element) && element.selected
                    const portionText = getTextPortion(element.content, element.portionStart, element.portionEnd)
                    const estimatedDuration = estimateSpeakingDuration(portionText)
                    
                    return (
                      <div
                        key={element.id}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          element.selected
                            ? "bg-slate-800 border-slate-600"
                            : "bg-slate-800/30 border-slate-700/50 opacity-60",
                          isMusic && "border-amber-500/30"
                        )}
                      >
                        <div 
                          className="flex items-start gap-3 cursor-pointer"
                          onClick={() => !isMusic && toggleElement(element.id)}
                        >
                          {/* Checkbox */}
                          <Checkbox
                            checked={element.selected}
                            onCheckedChange={() => !isMusic && toggleElement(element.id)}
                            disabled={isMusic}
                            className={cn("mt-0.5", isMusic && "opacity-50")}
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
                              {element.type === 'sfx' && (
                                <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-300">
                                  Veo Native
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 whitespace-pre-wrap break-words select-text cursor-text">
                              {element.content}
                            </p>
                            
                            {/* Music Warning */}
                            {isMusic && (
                              <div className="mt-2 flex items-center gap-2 px-2 py-1.5 bg-amber-500/10 rounded text-xs text-amber-300">
                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                <span>Music must be added as MP3 overlay in post-production</span>
                              </div>
                            )}
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
                        
                        {/* Portion Selector for Long Content */}
                        {showPortion && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Scissors className="w-3 h-3 text-amber-400" />
                                <span className="text-xs text-slate-400">Content portion for this clip:</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>~{estimatedDuration}s speaking</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Slider
                                value={[element.portionStart, element.portionEnd]}
                                min={0}
                                max={100}
                                step={5}
                                onValueChange={([start, end]) => updateElementPortion(element.id, start, end)}
                                className="flex-1"
                              />
                              <span className="text-xs text-slate-500 w-24 text-right">
                                {element.portionStart}% – {element.portionEnd}%
                              </span>
                            </div>
                            {(element.portionStart > 0 || element.portionEnd < 100) && (
                              <p className="text-xs text-slate-500 mt-2 italic line-clamp-2 pl-1 border-l-2 border-slate-600">
                                "{portionText.slice(0, 150)}{portionText.length > 150 ? '...' : ''}"
                              </p>
                            )}
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
