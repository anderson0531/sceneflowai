'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Film,
  Camera,
  Lightbulb,
  Users,
  Volume2,
  MessageSquare,
  Clock,
  Sparkles,
  Eye,
  Plus,
  MapPin,
  Mic,
} from 'lucide-react'
import { SceneSegment, VideoGenerationMethod } from './types'
import { VoiceSelector } from '@/components/tts/VoiceSelector'

// ============================================================================
// Types
// ============================================================================

export interface SceneDirection {
  camera?: string
  lighting?: string
  scene?: string
  talent?: string
  audio?: string
}

export interface DialogueLine {
  id: string
  character: string
  text: string
  emotion?: string
  durationEstimate?: number // Estimated duration in seconds
}

export interface AddSegmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sceneId: string
  sceneNumber: number
  // Script data
  visualDescription: string
  sceneDirection: SceneDirection
  narrationText: string | null
  dialogueLines: DialogueLine[]
  characters: Array<{ id: string; name: string; description?: string }>
  sceneFrameUrl: string | null
  // Existing segments for timing calculation
  existingSegments: SceneSegment[]
  // Callback when segment is created
  onAddSegment: (segment: SceneSegment) => void
}

// ============================================================================
// Shot Types & Lens Presets
// ============================================================================

const SHOT_TYPES = [
  { value: 'extreme-wide', label: 'Extreme Wide', description: 'Full environment, tiny subjects' },
  { value: 'wide', label: 'Wide Shot', description: 'Full body, environmental context' },
  { value: 'medium-wide', label: 'Medium Wide', description: 'Knee to head, some environment' },
  { value: 'medium', label: 'Medium Shot', description: 'Waist up, conversational' },
  { value: 'medium-close', label: 'Medium Close-up', description: 'Chest up, emotional focus' },
  { value: 'close-up', label: 'Close-up', description: 'Face only, intense emotion' },
  { value: 'extreme-close', label: 'Extreme Close-up', description: 'Eyes, mouth, or detail' },
  { value: 'two-shot', label: 'Two Shot', description: 'Two characters framed together' },
  { value: 'over-shoulder', label: 'Over the Shoulder', description: 'Perspective from behind one character' },
  { value: 'pov', label: 'POV', description: 'Point of view shot' },
] as const

const CAMERA_MOVEMENTS = [
  { value: 'static', label: 'Static', description: 'Locked-off, no movement' },
  { value: 'push-in', label: 'Push In', description: 'Slow dolly toward subject' },
  { value: 'pull-out', label: 'Pull Out', description: 'Slow dolly away from subject' },
  { value: 'pan-left', label: 'Pan Left', description: 'Camera pivots left' },
  { value: 'pan-right', label: 'Pan Right', description: 'Camera pivots right' },
  { value: 'tilt-up', label: 'Tilt Up', description: 'Camera angles upward' },
  { value: 'tilt-down', label: 'Tilt Down', description: 'Camera angles downward' },
  { value: 'tracking', label: 'Tracking', description: 'Following subject movement' },
  { value: 'handheld', label: 'Handheld', description: 'Slight shake, documentary feel' },
  { value: 'crane', label: 'Crane/Jib', description: 'Vertical movement, sweeping' },
] as const

const LENS_OPTIONS = [
  { value: '24mm', label: '24mm Wide', description: 'Environmental, expansive' },
  { value: '35mm', label: '35mm Anamorphic', description: 'Cinematic, slight distortion' },
  { value: '50mm', label: '50mm Standard', description: 'Natural perspective' },
  { value: '85mm', label: '85mm Portrait', description: 'Shallow DOF, intimate' },
  { value: '135mm', label: '135mm Telephoto', description: 'Compressed, isolated' },
] as const

// ============================================================================
// Prompt Builder Utility
// ============================================================================

interface PromptBuilderOptions {
  shotType: string
  cameraMovement: string
  lens: string
  visualDescription: string
  selectedDirection: {
    camera: boolean
    lighting: boolean
    scene: boolean
    talent: boolean
    audio: boolean
  }
  sceneDirection: SceneDirection
  selectedDialogueTexts: Map<string, string> // Map of line ID to edited text
  dialogueLines: DialogueLine[]
  includeNarration: boolean
  editedNarrationText: string // User-edited narration text
  narratorVoiceName: string | null // Selected narrator voice name
  characters: Array<{ id: string; name: string; description?: string }>
  additionalNotes: string
}

function buildSegmentPrompt(options: PromptBuilderOptions): string {
  const parts: string[] = []

  // 1. Shot Type + Lens
  const shotLabel = SHOT_TYPES.find(s => s.value === options.shotType)?.label || 'Medium Shot'
  const lensLabel = LENS_OPTIONS.find(l => l.value === options.lens)?.label || '50mm'
  parts.push(`${shotLabel}, ${lensLabel} lens.`)

  // 2. Scene/Environment Description (from selected direction)
  if (options.selectedDirection.scene && options.sceneDirection.scene) {
    parts.push(options.sceneDirection.scene)
  } else if (options.visualDescription) {
    // Fallback to visual description
    const truncated = options.visualDescription.length > 200 
      ? options.visualDescription.substring(0, 200) + '...'
      : options.visualDescription
    parts.push(truncated)
  }

  // 3. Character/Subject - extract from selected dialogue or talent direction
  const selectedDialogueIds = Array.from(options.selectedDialogueTexts.keys())
  const speakingCharacters = new Set(
    options.dialogueLines
      .filter(d => selectedDialogueIds.includes(d.id))
      .map(d => d.character)
  )
  
  if (speakingCharacters.size > 0) {
    const charDescriptions = Array.from(speakingCharacters).map(charName => {
      const charInfo = options.characters.find(c => c.name.toLowerCase() === charName.toLowerCase())
      if (charInfo?.description) {
        return `${charName} (${charInfo.description.substring(0, 100)})`
      }
      return charName
    })
    parts.push(`Subject: ${charDescriptions.join(' and ')}.`)
  } else if (options.selectedDirection.talent && options.sceneDirection.talent) {
    parts.push(options.sceneDirection.talent)
  }

  // 4. Dialogue - format for Veo 3.1 speech synthesis (using edited text)
  const selectedDialogueLines = options.dialogueLines.filter(d => 
    selectedDialogueIds.includes(d.id)
  )
  
  if (selectedDialogueLines.length > 0) {
    for (const line of selectedDialogueLines) {
      const editedText = options.selectedDialogueTexts.get(line.id) || line.text
      const emotionNote = line.emotion ? ` with ${line.emotion} delivery` : ''
      parts.push(`${line.character} speaks${emotionNote}, "${editedText}"`)
    }
  }

  // 4.5 Narration voiceover (if included)
  if (options.includeNarration && options.editedNarrationText.trim()) {
    const voiceNote = options.narratorVoiceName ? ` (${options.narratorVoiceName} voice)` : ''
    parts.push(`Voiceover narration${voiceNote}: "${options.editedNarrationText.trim()}"`)
  }

  // 5. Camera Movement
  const movementLabel = CAMERA_MOVEMENTS.find(m => m.value === options.cameraMovement)?.label
  if (movementLabel && options.cameraMovement !== 'static') {
    parts.push(`Camera: ${movementLabel}.`)
  } else if (options.cameraMovement === 'static') {
    parts.push('Camera: Locked-off, static frame.')
  }

  // 6. Camera Direction Notes
  if (options.selectedDirection.camera && options.sceneDirection.camera) {
    parts.push(`Camera notes: ${options.sceneDirection.camera}`)
  }

  // 7. Lighting
  if (options.selectedDirection.lighting && options.sceneDirection.lighting) {
    parts.push(`Lighting: ${options.sceneDirection.lighting}`)
  }

  // 8. Audio/SFX Notes (Veo 3.1 can generate ambient audio)
  if (options.selectedDirection.audio && options.sceneDirection.audio) {
    parts.push(`Ambient audio: ${options.sceneDirection.audio}`)
  }

  // 9. Additional user notes
  if (options.additionalNotes.trim()) {
    parts.push(options.additionalNotes.trim())
  }

  // 10. Technical specs
  parts.push('Cinematic quality, 8K, photorealistic.')

  return parts.join(' ')
}

// ============================================================================
// Estimate duration from dialogue
// ============================================================================

function estimateDuration(
  selectedDialogueTexts: Map<string, string>,
  dialogueLines: DialogueLine[],
  includeNarration: boolean,
  editedNarrationText: string
): number {
  const WORDS_PER_SECOND = 2.5
  let totalWords = 0

  // Count dialogue words from edited texts
  for (const [id, editedText] of selectedDialogueTexts) {
    totalWords += editedText.split(/\s+/).length
  }

  // Count narration words (now included in prompt as voiceover)
  if (includeNarration && editedNarrationText) {
    totalWords += editedNarrationText.split(/\s+/).length
  }

  // Estimate: words / 2.5 words per second, with minimum of 4s and max of 8s
  const estimated = Math.ceil(totalWords / WORDS_PER_SECOND)
  return Math.max(4, Math.min(8, estimated || 6))
}

// ============================================================================
// Main Component
// ============================================================================

export function AddSegmentDialog({
  open,
  onOpenChange,
  sceneId,
  sceneNumber,
  visualDescription,
  sceneDirection,
  narrationText,
  dialogueLines,
  characters,
  sceneFrameUrl,
  existingSegments,
  onAddSegment,
}: AddSegmentDialogProps) {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  
  // Shot configuration
  const [shotType, setShotType] = useState('medium')
  const [cameraMovement, setCameraMovement] = useState('static')
  const [lens, setLens] = useState('50mm')
  
  // Scene direction toggles
  const [selectedDirection, setSelectedDirection] = useState({
    camera: true,
    lighting: true,
    scene: true,
    talent: true,
    audio: true,
  })
  
  // Dialogue selection - Map of line ID to edited text (allows partial text editing)
  const [selectedDialogueTexts, setSelectedDialogueTexts] = useState<Map<string, string>>(new Map())
  
  // Narration - editable text and voice selection
  const [includeNarration, setIncludeNarration] = useState(false)
  const [editedNarrationText, setEditedNarrationText] = useState(narrationText || '')
  const [narratorVoiceId, setNarratorVoiceId] = useState<string | null>(null)
  const [narratorVoiceName, setNarratorVoiceName] = useState<string | null>(null)
  
  // Duration
  const [duration, setDuration] = useState(6)
  const [autoEstimateDuration, setAutoEstimateDuration] = useState(true)
  
  // Additional notes
  const [additionalNotes, setAdditionalNotes] = useState('')
  
  // Generation method
  const [generationMethod, setGenerationMethod] = useState<VideoGenerationMethod>(
    sceneFrameUrl && existingSegments.length === 0 ? 'I2V' : 'T2V'
  )

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------
  
  // Auto-estimate duration when dialogue/narration changes
  useEffect(() => {
    if (autoEstimateDuration) {
      const estimated = estimateDuration(selectedDialogueTexts, dialogueLines, includeNarration, editedNarrationText)
      setDuration(estimated)
    }
  }, [selectedDialogueTexts, dialogueLines, includeNarration, editedNarrationText, autoEstimateDuration])
  
  // Reset narration text when prop changes
  useEffect(() => {
    setEditedNarrationText(narrationText || '')
  }, [narrationText])

  // -------------------------------------------------------------------------
  // Computed
  // -------------------------------------------------------------------------
  
  // Build live prompt preview
  const promptPreview = useMemo(() => {
    return buildSegmentPrompt({
      shotType,
      cameraMovement,
      lens,
      visualDescription,
      selectedDirection,
      sceneDirection,
      selectedDialogueTexts,
      dialogueLines,
      includeNarration,
      editedNarrationText,
      narratorVoiceName,
      characters,
      additionalNotes,
    })
  }, [
    shotType, cameraMovement, lens, visualDescription, selectedDirection,
    sceneDirection, selectedDialogueTexts, dialogueLines, includeNarration,
    editedNarrationText, narratorVoiceName, characters, additionalNotes
  ])

  // Calculate start time from existing segments
  const nextStartTime = useMemo(() => {
    if (existingSegments.length === 0) return 0
    const lastSegment = existingSegments[existingSegments.length - 1]
    return lastSegment.endTime
  }, [existingSegments])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  
  const handleDirectionToggle = useCallback((key: keyof typeof selectedDirection) => {
    setSelectedDirection(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // Toggle dialogue selection and initialize/remove edited text
  const handleDialogueToggle = useCallback((id: string, originalText: string) => {
    setSelectedDialogueTexts(prev => {
      const newMap = new Map(prev)
      if (newMap.has(id)) {
        newMap.delete(id)
      } else {
        newMap.set(id, originalText)
      }
      return newMap
    })
  }, [])
  
  // Update edited dialogue text
  const handleDialogueTextChange = useCallback((id: string, newText: string) => {
    setSelectedDialogueTexts(prev => {
      const newMap = new Map(prev)
      newMap.set(id, newText)
      return newMap
    })
  }, [])

  const handleCreate = useCallback(() => {
    const selectedDialogueIds = Array.from(selectedDialogueTexts.keys())
    const newSegment: SceneSegment = {
      segmentId: `seg_${sceneId}_${existingSegments.length + 1}_${Date.now()}`,
      sequenceIndex: existingSegments.length,
      startTime: nextStartTime,
      endTime: nextStartTime + duration,
      status: 'READY',
      generatedPrompt: promptPreview,
      userEditedPrompt: null,
      activeAssetUrl: null,
      assetType: null,
      generationMethod,
      triggerReason: 'User-created segment',
      shotType: SHOT_TYPES.find(s => s.value === shotType)?.label,
      cameraMovement: CAMERA_MOVEMENTS.find(m => m.value === cameraMovement)?.label,
      dialogueLineIds: selectedDialogueIds,
      references: {
        startFrameUrl: generationMethod === 'I2V' ? sceneFrameUrl : null,
        endFrameUrl: null,
        useSceneFrame: generationMethod === 'I2V',
        characterRefs: characters
          .filter(c => selectedDialogueIds.some(id => {
            const line = dialogueLines.find(d => d.id === id)
            return line?.character.toLowerCase() === c.name.toLowerCase()
          }))
          .map(c => c.name),
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
      takes: [],
    }

    console.log('[AddSegmentDialog] Creating segment:', newSegment)
    onAddSegment(newSegment)
    console.log('[AddSegmentDialog] Segment callback fired, closing dialog')
    onOpenChange(false)
    
    // Reset form
    setShotType('medium')
    setCameraMovement('static')
    setLens('50mm')
    setSelectedDialogueTexts(new Map())
    setIncludeNarration(false)
    setEditedNarrationText(narrationText || '')
    setNarratorVoiceId(null)
    setNarratorVoiceName(null)
    setDuration(6)
    setAdditionalNotes('')
  }, [
    sceneId, existingSegments, nextStartTime, duration, promptPreview,
    generationMethod, shotType, cameraMovement, selectedDialogueTexts,
    dialogueLines, characters, sceneFrameUrl, onAddSegment, onOpenChange, narrationText
  ])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add Segment
            <Badge variant="outline" className="ml-2 text-xs">
              Scene {sceneNumber}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Build a video generation prompt by selecting shot type, scene elements, and dialogue.
            Veo 3.1 will generate voiceover and SFX directly from the prompt.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
          {/* Left Panel: Configuration */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Shot Configuration */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-400" />
                  Shot Configuration
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Shot Type</Label>
                    <Select value={shotType} onValueChange={setShotType}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHOT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="font-medium">{type.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {type.description}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Lens</Label>
                    <Select value={lens} onValueChange={setLens}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LENS_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Camera Movement</Label>
                  <Select value={cameraMovement} onValueChange={setCameraMovement}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_MOVEMENTS.map(mov => (
                        <SelectItem key={mov.value} value={mov.value}>
                          <span className="font-medium">{mov.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {mov.description}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Scene Direction Toggles */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Film className="w-4 h-4 text-amber-400" />
                  Include Scene Direction
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select which director's notes to include in the prompt
                </p>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'camera' as const, icon: Camera, label: 'Camera Notes', value: sceneDirection.camera },
                    { key: 'lighting' as const, icon: Lightbulb, label: 'Lighting', value: sceneDirection.lighting },
                    { key: 'scene' as const, icon: MapPin, label: 'Scene/Environment', value: sceneDirection.scene },
                    { key: 'talent' as const, icon: Users, label: 'Talent/Blocking', value: sceneDirection.talent },
                    { key: 'audio' as const, icon: Volume2, label: 'Audio/SFX', value: sceneDirection.audio },
                  ].map(({ key, icon: Icon, label, value }) => (
                    <div
                      key={key}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                        selectedDirection[key] 
                          ? "border-primary/50 bg-primary/10" 
                          : "border-border hover:border-muted-foreground/50",
                        !value && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => value && handleDirectionToggle(key)}
                    >
                      <Checkbox
                        checked={selectedDirection[key] && !!value}
                        disabled={!value}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{label}</span>
                        </div>
                        {value && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                            {value}
                          </p>
                        )}
                        {!value && (
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5 italic">
                            Not defined
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dialogue Selection with Editable Text */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  Dialogue Lines
                  <Badge variant="secondary" className="text-[10px]">
                    Veo 3.1 Speech
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select dialogue for this segment. Click to select, then edit the text to use only portions. Veo 3.1 will generate the character's voice.
                </p>
                
                {dialogueLines.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {dialogueLines.map((line, idx) => {
                      const isSelected = selectedDialogueTexts.has(line.id)
                      const editedText = selectedDialogueTexts.get(line.id) || line.text
                      return (
                        <div
                          key={line.id}
                          className={cn(
                            "rounded-lg border transition-colors",
                            isSelected
                              ? "border-emerald-500/50 bg-emerald-950/20"
                              : "border-border hover:border-muted-foreground/50"
                          )}
                        >
                          <div 
                            className="flex items-start gap-2 p-2 cursor-pointer"
                            onClick={() => handleDialogueToggle(line.id, line.text)}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-emerald-400">
                                  {line.character}
                                </span>
                                {line.emotion && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {line.emotion}
                                  </Badge>
                                )}
                              </div>
                              {!isSelected && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  "{line.text}"
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              #{idx + 1}
                            </span>
                          </div>
                          {/* Editable text area when selected */}
                          {isSelected && (
                            <div className="px-2 pb-2">
                              <Textarea
                                value={editedText}
                                onChange={(e) => handleDialogueTextChange(line.id, e.target.value)}
                                className="text-xs min-h-[60px] bg-background/50"
                                placeholder="Edit dialogue text to use in this segment..."
                                onClick={(e) => e.stopPropagation()}
                              />
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Edit to use only the portion needed for this segment (&lt;8s)
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground/50 italic p-3 text-center border border-dashed rounded-lg">
                    No dialogue in this scene
                  </div>
                )}
              </div>

              {/* Narration with Editable Text and Voice Selection */}
              {narrationText && (
                <div className="space-y-3">
                  <div
                    className={cn(
                      "rounded-lg border transition-colors",
                      includeNarration
                        ? "border-blue-500/50 bg-blue-950/20"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div 
                      className="flex items-start gap-2 p-3 cursor-pointer"
                      onClick={() => setIncludeNarration(!includeNarration)}
                    >
                      <Checkbox checked={includeNarration} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Mic className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs font-medium">Include Narration Voiceover</span>
                        </div>
                        {!includeNarration && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {narrationText}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Editable narration text and voice selector when enabled */}
                    {includeNarration && (
                      <div className="px-3 pb-3 space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1">Narration Text (editable)</Label>
                          <Textarea
                            value={editedNarrationText}
                            onChange={(e) => setEditedNarrationText(e.target.value)}
                            className="text-xs min-h-[80px] bg-background/50"
                            placeholder="Edit narration text for this segment..."
                            onClick={(e) => e.stopPropagation()}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Edit to use only the portion of narration for this segment
                          </p>
                        </div>
                        
                        {/* Narrator Voice Selection */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1">Narrator Voice</Label>
                          <div onClick={(e) => e.stopPropagation()}>
                            <VoiceSelector
                              provider="elevenlabs"
                              selectedVoiceId={narratorVoiceId || undefined}
                              onSelectVoice={(voiceId, voiceName) => {
                                setNarratorVoiceId(voiceId)
                                setNarratorVoiceName(voiceName)
                              }}
                              compact={true}
                              className="w-full"
                            />
                          </div>
                          {narratorVoiceName && (
                            <p className="text-[10px] text-blue-400 mt-1">
                              Selected: {narratorVoiceName}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Duration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    Duration
                  </h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="auto-duration"
                      checked={autoEstimateDuration}
                      onCheckedChange={(checked) => setAutoEstimateDuration(!!checked)}
                    />
                    <Label htmlFor="auto-duration" className="text-xs text-muted-foreground">
                      Auto-estimate
                    </Label>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Slider
                    value={[duration]}
                    onValueChange={([val]) => {
                      setAutoEstimateDuration(false)
                      setDuration(val)
                    }}
                    min={4}
                    max={8}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="w-12 justify-center">
                    {duration}s
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Veo 3.1 max: 8 seconds per segment
                </p>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Additional Notes</Label>
                <Textarea
                  placeholder="Any extra direction, visual details, or style notes..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {/* Generation Method */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Generation Method</Label>
                <Select 
                  value={generationMethod} 
                  onValueChange={(v) => setGenerationMethod(v as VideoGenerationMethod)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="T2V">
                      <span className="font-medium">T2V</span>
                      <span className="text-xs text-muted-foreground ml-2">Text-to-Video</span>
                    </SelectItem>
                    <SelectItem value="I2V" disabled={!sceneFrameUrl}>
                      <span className="font-medium">I2V</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        Image-to-Video {!sceneFrameUrl && '(No scene image)'}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>

          {/* Right Panel: Prompt Preview */}
          <div className="w-80 flex flex-col border-l pl-4">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-primary" />
              Prompt Preview
            </h3>
            
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-3 bg-muted/30 rounded-lg border border-border">
                  <p className="text-xs leading-relaxed whitespace-pre-wrap font-mono">
                    {promptPreview}
                  </p>
                </div>
              </ScrollArea>
            </div>

            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Start Time</span>
                <span className="font-mono">{nextStartTime.toFixed(1)}s</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">End Time</span>
                <span className="font-mono">{(nextStartTime + duration).toFixed(1)}s</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Duration</span>
                <Badge variant="secondary" className="text-[10px]">{duration}s</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Method</span>
                <Badge variant="outline" className="text-[10px]">{generationMethod}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Dialogue Lines</span>
                <span className="font-mono">{selectedDialogueTexts.size}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            <Sparkles className="w-4 h-4 mr-2" />
            Add Segment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddSegmentDialog
