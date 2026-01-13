/**
 * GuidePromptEditor - Audio & Scene Direction Context for Video Generation
 * 
 * Displays all audio elements (narration, dialogue, music, SFX) and scene direction
 * for the current segment, allowing users to select which elements to include
 * in the video generation guide prompt.
 * 
 * Features:
 * - Shows narration text for the segment
 * - Lists dialogue lines assigned to the segment (from dialogueLineIds)
 * - Displays music and SFX descriptions
 * - Scene direction/action text
 * - Toggle checkboxes to include/exclude each element
 * - Composes a unified guide prompt from selected elements
 * - Audio preview buttons when audio URLs exist
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
import { cn } from '@/lib/utils'
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
  RefreshCw,
  AlertCircle,
  Check,
  FileText,
} from 'lucide-react'
import type { SceneSegment, SegmentDialogueLine } from './types'

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
): Array<{ id: string; character: string; line: string; index: number }> {
  if (!sceneDialogue || sceneDialogue.length === 0) return []
  
  const dialogueLineIds = segment.dialogueLineIds || []
  
  // If segment has specific dialogue line IDs, use those
  if (dialogueLineIds.length > 0) {
    return dialogueLineIds
      .map((id, idx) => {
        const dialogueItem = sceneDialogue.find((d, i) => 
          (d.id === id) || (`dialogue-${i}` === id)
        )
        if (!dialogueItem) return null
        return {
          id,
          character: dialogueItem.character || 'Unknown',
          line: dialogueItem.line || dialogueItem.text || '',
          index: sceneDialogue.indexOf(dialogueItem),
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
  }
  
  // Fallback: Use segment.dialogueLines if available
  if (segment.dialogueLines && segment.dialogueLines.length > 0) {
    return segment.dialogueLines.map((dl, idx) => ({
      id: dl.id,
      character: dl.character,
      line: dl.line,
      index: idx,
    }))
  }
  
  // No specific dialogue assigned - return empty (user can still select from scene)
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
  // Check new multi-language format
  if (scene.narrationAudio && scene.narrationAudio[language]?.url) {
    return scene.narrationAudio[language].url
  }
  
  // Legacy fallback
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
  className,
}: GuidePromptEditorProps) {
  const { playingUrl, toggle, stop } = useAudioPlayer()
  const [isExpanded, setIsExpanded] = useState(true)
  const [elements, setElements] = useState<AudioElement[]>([])
  const [customAddition, setCustomAddition] = useState('')
  
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
        selected: true, // Default selected
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
        selected: true, // Default selected
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
          selected: false, // Not selected by default since not assigned to segment
        })
      })
    }
    
    // 4. Music
    const musicDesc = getMusicDescription(scene.music)
    if (musicDesc) {
      newElements.push({
        id: 'music',
        type: 'music',
        label: 'Music',
        content: musicDesc,
        audioUrl: scene.musicAudio,
        selected: false, // Usually don't include music description in video prompt
      })
    }
    
    // 5. SFX
    if (scene.sfx && scene.sfx.length > 0) {
      scene.sfx.forEach((sfx, idx) => {
        if (sfx.description) {
          newElements.push({
            id: `sfx-${idx}`,
            type: 'sfx',
            label: `SFX ${idx + 1}`,
            content: sfx.description,
            audioUrl: sfx.audioUrl,
            selected: false, // Usually don't include SFX in video prompt
          })
        }
      })
    }
    
    // 6. Scene Direction / Action
    const directionParts: string[] = []
    
    // From segment
    if (segment.actionPrompt) {
      directionParts.push(segment.actionPrompt)
    } else if (segment.action) {
      directionParts.push(segment.action)
    }
    
    // From scene
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
        selected: true, // Default selected
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
  
  // Compose guide prompt from selected elements
  const composedPrompt = useMemo(() => {
    const parts: string[] = []
    
    // Group by type for better organization
    const selectedElements = elements.filter(el => el.selected)
    
    // Direction first (sets the scene)
    const directions = selectedElements.filter(el => el.type === 'direction')
    if (directions.length > 0) {
      parts.push(`[SCENE DIRECTION]\n${directions.map(d => d.content).join('\n')}`)
    }
    
    // Narration
    const narrations = selectedElements.filter(el => el.type === 'narration')
    if (narrations.length > 0) {
      parts.push(`[NARRATION]\n${narrations.map(n => n.content).join('\n')}`)
    }
    
    // Dialogue
    const dialogues = selectedElements.filter(el => el.type === 'dialogue')
    if (dialogues.length > 0) {
      const dialogueText = dialogues
        .map(d => `${d.character}: "${d.content}"`)
        .join('\n')
      parts.push(`[DIALOGUE]\n${dialogueText}`)
    }
    
    // Music (if selected)
    const music = selectedElements.filter(el => el.type === 'music')
    if (music.length > 0) {
      parts.push(`[MUSIC]\n${music.map(m => m.content).join('\n')}`)
    }
    
    // SFX (if selected)
    const sfx = selectedElements.filter(el => el.type === 'sfx')
    if (sfx.length > 0) {
      parts.push(`[SOUND EFFECTS]\n${sfx.map(s => s.content).join(', ')}`)
    }
    
    // Custom addition
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
    <div className={cn("rounded-lg border border-slate-700 overflow-hidden", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-cyan-400" />
          <span className="font-medium text-slate-200">Guide Prompt Builder</span>
          <Badge variant="secondary" className="text-xs bg-slate-700">
            {selectedCount}/{totalCount} selected
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
          {/* Element Cards */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400 uppercase tracking-wider">
              Audio & Direction Elements
            </Label>
            <p className="text-xs text-slate-500 mb-2">
              Select elements to include in the video generation context. The video model will use this to guide motion and timing.
            </p>
            
            <ScrollArea className="max-h-[250px]">
              <div className="space-y-2 pr-2">
                {elements.map((element) => {
                  const Icon = getTypeIcon(element.type)
                  const colorClass = getTypeColor(element.type)
                  
                  return (
                    <div
                      key={element.id}
                      className={cn(
                        "p-3 rounded-lg border transition-colors cursor-pointer",
                        element.selected
                          ? "bg-slate-800 border-slate-600"
                          : "bg-slate-800/30 border-slate-700/50 opacity-60"
                      )}
                      onClick={() => toggleElement(element.id)}
                    >
                      <div className="flex items-start gap-3">
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
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">
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
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
          
          {/* Custom Addition */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">
              Additional Notes (optional)
            </Label>
            <Textarea
              value={customAddition}
              onChange={(e) => setCustomAddition(e.target.value)}
              placeholder="Add custom instructions for video generation..."
              className="min-h-[60px] text-sm bg-slate-800 border-slate-700"
            />
          </div>
          
          {/* Composed Preview */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="preview" className="border-slate-700">
              <AccordionTrigger className="text-sm text-slate-300 hover:text-white py-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Preview Composed Prompt
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="p-3 bg-slate-900 rounded-lg">
                  <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono max-h-[200px] overflow-y-auto">
                    {composedPrompt || '(No elements selected)'}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  )
}

export default GuidePromptEditor
