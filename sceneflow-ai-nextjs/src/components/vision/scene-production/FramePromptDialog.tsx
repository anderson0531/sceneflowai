'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
  Wand2,
  Image as ImageIcon,
  Link2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Camera,
  Sun,
  Users,
  Wind,
  Sparkles,
  CheckCircle2,
  Info,
  Palette,
  Check,
  Box,
  Zap,
  Brush,
  Film,
  Brain,
} from 'lucide-react'
import type { SceneSegment, TransitionType, CharacterReference } from './types'
import type { DetailedSceneDirection } from '@/types/scene-direction'
import { useSceneDirectionOptional } from '@/contexts/SceneDirectionContext'
import { 
  buildKeyframePrompt, 
  validateDirectionAdherence,
  type KeyframeContext 
} from '@/lib/intelligence/keyframe-prompt-builder'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { prioritizeCharacterReferences } from './types'
import { artStylePresets } from '@/constants/artStylePresets'

// ============================================================================
// Types
// ============================================================================

export interface FramePromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: SceneSegment | null
  segmentIndex: number
  frameType: 'start' | 'end' | 'both'
  previousEndFrameUrl?: string | null
  sceneImageUrl?: string | null
  onGenerate: (options: FrameGenerationOptions) => void
  isGenerating?: boolean
  /** Scene direction for intelligent prompt building */
  sceneDirection?: DetailedSceneDirection | null
  /** Characters for identity context - ENHANCED: now includes referenceImage */
  characters?: Array<{
    name: string
    referenceImage?: string
    appearance?: string
    ethnicity?: string
    age?: string
    wardrobe?: string
  }>
  /** Object/prop references from the reference library for consistent image generation */
  objectReferences?: Array<{
    id: string
    name: string
    imageUrl: string
    description?: string
    importance?: 'critical' | 'secondary'
  }>
  /** Scene heading for location parsing */
  sceneHeading?: string
}

export interface FrameGenerationOptions {
  segmentId: string
  frameType: 'start' | 'end' | 'both'
  customPrompt: string
  negativePrompt: string
  usePreviousEndFrame: boolean
  previousEndFrameUrl?: string | null
  /** NEW: Selected characters with reference images for generation */
  selectedCharacters?: CharacterReference[]
  /** NEW: Selected object/prop references for consistent generation */
  selectedObjectReferences?: Array<{
    id: string
    name: string
    imageUrl: string
    description?: string
  }>
  /** NEW: Visual setup data */
  visualSetup?: {
    location: string
    timeOfDay: string
    weather: string
    atmosphere: string
    shotType: string
    cameraAngle: string
    lighting: string
  }
  /** Art style for frame generation (default: photorealistic) */
  artStyle?: string
  /** Model quality tier for generation */
  modelTier?: 'eco' | 'designer' | 'director'
  /** Thinking level for complex prompts */
  thinkingLevel?: 'low' | 'high'
}

// ============================================================================
// Model Quality Tiers
// ============================================================================

export type ModelTier = 'eco' | 'designer' | 'director'
export type ThinkingLevel = 'low' | 'high'

export const MODEL_TIERS = [
  {
    id: 'eco' as const,
    name: 'Eco Mode',
    icon: Zap,
    description: 'Fast & Affordable',
    details: 'Quick ideation and simple prompts. ~3-5 seconds, lowest cost.',
    model: 'Nano Banana',
    resolution: 'Up to 2K',
    cost: '~$0.025/image',
    color: 'emerald',
  },
  {
    id: 'designer' as const,
    name: 'Designer Mode',
    icon: Brush,
    description: 'High Precision',
    details: 'Complex prompts with high-fidelity text and 4K resolution.',
    model: 'Nano Banana Pro',
    resolution: 'Up to 4K',
    cost: '~$0.05/image',
    color: 'purple',
  },
  {
    id: 'director' as const,
    name: 'Director Mode',
    icon: Film,
    description: 'Cinematic Scene',
    details: 'Professional video sequence with native audio. Coming Soon.',
    model: 'Veo 3.1',
    resolution: '4K+',
    cost: 'Credit-based',
    color: 'amber',
    comingSoon: true,
  },
] as const

// ============================================================================
// Negative Prompt Presets
// ============================================================================

export const NEGATIVE_PROMPT_PRESETS = [
  {
    id: 'quality',
    label: 'Low Quality',
    value: 'blurry, low quality, pixelated, noisy, grainy, jpeg artifacts, compression artifacts',
  },
  {
    id: 'anatomy',
    label: 'Bad Anatomy',
    value: 'bad anatomy, extra limbs, missing limbs, deformed, mutated, disfigured, malformed hands, extra fingers, missing fingers',
  },
  {
    id: 'text',
    label: 'Text & Watermarks',
    value: 'text, watermark, logo, signature, username, copyright, words, letters',
  },
  {
    id: 'lighting',
    label: 'Bad Lighting',
    value: 'overexposed, underexposed, harsh lighting, flat lighting, washed out, oversaturated',
  },
  {
    id: 'composition',
    label: 'Poor Composition',
    value: 'cropped, out of frame, bad framing, awkward angle, distorted perspective',
  },
  {
    id: 'style',
    label: 'Non-Cinematic',
    value: 'cartoon, anime, illustration, painting, drawing, sketch, 3D render, CGI, video game',
  },
  {
    id: 'cartoon',
    label: 'Cartoon Style',
    value: 'cartoon, animated, disney style, pixar style, anime, manga, comic book style',
  },
  {
    id: 'stock',
    label: 'Stock Photo Look',
    value: 'stock photo, generic, corporate, posed, fake smile, staged, artificial',
  },
  {
    id: 'cgi',
    label: 'CGI/3D Look',
    value: 'CGI, 3D rendered, unreal engine, video game graphics, plastic skin, uncanny valley',
  },
  {
    id: 'motion',
    label: 'Motion Blur',
    value: 'motion blur, camera shake, unfocused, blurry movement, ghosting',
  },
] as const

const DEFAULT_NEGATIVE_PRESETS = ['quality', 'anatomy']

// ============================================================================
// FramePromptDialog Component
// ============================================================================

export function FramePromptDialog({
  open,
  onOpenChange,
  segment,
  segmentIndex,
  frameType,
  previousEndFrameUrl,
  sceneImageUrl,
  onGenerate,
  isGenerating = false,
  sceneDirection: propSceneDirection,
  characters = [],
  objectReferences = [],
  sceneHeading,
}: FramePromptDialogProps) {
  // Try to get scene direction from context if not passed as prop
  const contextDirection = useSceneDirectionOptional()
  const sceneDirection = propSceneDirection || contextDirection?.direction || null
  
  // Mode: Visual Setup (guided) or Custom Prompt (advanced)
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')
  
  // Visual Setup state
  const [visualSetup, setVisualSetup] = useState({
    location: '',
    timeOfDay: 'day',
    weather: 'clear',
    atmosphere: 'neutral',
    shotType: 'medium-close-up',
    cameraAngle: 'eye-level',
    lighting: 'natural',
  })
  
  // Character selection state
  const [selectedCharacterNames, setSelectedCharacterNames] = useState<string[]>([])
  
  // Object reference selection state
  const [selectedObjectRefIds, setSelectedObjectRefIds] = useState<string[]>([])
  
  // Art style state (default to photorealistic for backward compatibility)
  const [artStyle, setArtStyle] = useState<string>('photorealistic')
  
  // Model quality tier and thinking level state
  const [modelTier, setModelTier] = useState<ModelTier>('designer')
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('high')
  
  // State - Initialize customPrompt from segment data immediately to prevent race conditions
  const initialPrompt = useMemo(() => {
    if (!segment) return ''
    if (frameType === 'start' && segment.startFramePrompt) return segment.startFramePrompt
    if (frameType === 'end' && segment.endFramePrompt) return segment.endFramePrompt
    if (frameType === 'both' && segment.startFramePrompt) return segment.startFramePrompt
    return segment.userEditedPrompt || segment.generatedPrompt || segment.actionPrompt || ''
  }, [segment, frameType])
  
  const [customPrompt, setCustomPrompt] = useState(initialPrompt)
  const [selectedNegativePresets, setSelectedNegativePresets] = useState<Set<string>>(
    new Set(DEFAULT_NEGATIVE_PRESETS)
  )
  const [customNegativePrompt, setCustomNegativePrompt] = useState('')
  const [usePreviousEndFrame, setUsePreviousEndFrame] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showDirectionPanel, setShowDirectionPanel] = useState(false)
  const [useIntelligentPrompt, setUseIntelligentPrompt] = useState(true)
  
  // Get selected characters with their reference images
  const selectedCharacters = useMemo(() => {
    return characters
      .filter(c => selectedCharacterNames.includes(c.name))
      .map(c => ({
        name: c.name,
        referenceImageUrl: c.referenceImage,
        appearance: c.appearance,
        ethnicity: c.ethnicity,
        age: c.age,
        wardrobe: c.wardrobe,
      }))
  }, [characters, selectedCharacterNames])
  
  // Check if any selected characters have reference images
  const hasCharacterReferences = selectedCharacters.some(c => c.referenceImageUrl)

  // Track previous open state to detect dialog opening
  const wasOpen = useRef(false)

  // Initialize state from segment when dialog OPENS (not on every dependency change)
  useEffect(() => {
    const justOpened = open && !wasOpen.current
    wasOpen.current = open
    
    if (!segment || !justOpened) return
    
    // Reset customPrompt to segment's prompt when dialog opens
    let basePrompt = ''
    if (frameType === 'start' && segment.startFramePrompt) {
      basePrompt = segment.startFramePrompt
    } else if (frameType === 'end' && segment.endFramePrompt) {
      basePrompt = segment.endFramePrompt
    } else if (frameType === 'both' && segment.startFramePrompt) {
      basePrompt = segment.startFramePrompt
    } else {
      basePrompt = segment.userEditedPrompt || segment.generatedPrompt || segment.actionPrompt || ''
    }
    setCustomPrompt(basePrompt)
    
    // Auto-check "use previous end frame" for CONTINUE transitions when available
    if (segment.transitionType === 'CONTINUE' && previousEndFrameUrl && frameType !== 'end') {
      setUsePreviousEndFrame(true)
    } else {
      setUsePreviousEndFrame(false)
    }
    
    // Initialize visual setup from scene direction
    if (sceneDirection) {
      const setup = { ...visualSetup }
      
      // Location from scene direction
      if (sceneDirection.scene?.location) {
        setup.location = sceneDirection.scene.location
      } else if (sceneHeading) {
        // Parse from heading: "INT./EXT. LOCATION - TIME"
        const match = sceneHeading.match(/(INT|EXT)\.\s+(.+?)\s+-\s+(.+)/i)
        if (match) setup.location = match[2].trim()
      }
      
      // Time of day
      if (sceneDirection.lighting?.timeOfDay) {
        const tod = sceneDirection.lighting.timeOfDay.toLowerCase()
        if (tod.includes('night')) setup.timeOfDay = 'night'
        else if (tod.includes('golden') || tod.includes('sunset')) setup.timeOfDay = 'golden-hour'
        else if (tod.includes('dawn') || tod.includes('morning')) setup.timeOfDay = 'dawn'
        else if (tod.includes('dusk')) setup.timeOfDay = 'dusk'
        else setup.timeOfDay = 'day'
      }
      
      // Atmosphere
      if (sceneDirection.scene?.atmosphere) {
        const atmo = sceneDirection.scene.atmosphere.toLowerCase()
        if (atmo.includes('tense')) setup.atmosphere = 'tense'
        else if (atmo.includes('energetic')) setup.atmosphere = 'energetic'
        else if (atmo.includes('serene')) setup.atmosphere = 'serene'
        else if (atmo.includes('melancholic')) setup.atmosphere = 'melancholic'
        else if (atmo.includes('hopeful')) setup.atmosphere = 'hopeful'
        else if (atmo.includes('mysterious')) setup.atmosphere = 'mysterious'
      }
      
      // Shot type from segment or scene direction
      if (segment.shotType) {
        setup.shotType = segment.shotType
      } else if (sceneDirection.camera?.shots?.[0]) {
        const shot = sceneDirection.camera.shots[0].toLowerCase()
        if (shot.includes('extreme close')) setup.shotType = 'extreme-close-up'
        else if (shot.includes('close-up') || shot.includes('close up')) setup.shotType = 'close-up'
        else if (shot.includes('medium close')) setup.shotType = 'medium-close-up'
        else if (shot.includes('medium')) setup.shotType = 'medium-shot'
        else if (shot.includes('wide')) setup.shotType = 'wide-shot'
      }
      
      // Camera angle
      if (sceneDirection.camera?.angle) {
        const angle = sceneDirection.camera.angle.toLowerCase()
        if (angle.includes('low')) setup.cameraAngle = 'low-angle'
        else if (angle.includes('high')) setup.cameraAngle = 'high-angle'
        else if (angle.includes('dutch')) setup.cameraAngle = 'dutch-angle'
        else setup.cameraAngle = 'eye-level'
      }
      
      // Lighting
      if (sceneDirection.lighting?.overallMood) {
        const mood = sceneDirection.lighting.overallMood.toLowerCase()
        if (mood.includes('dramatic') || mood.includes('noir')) setup.lighting = 'dramatic'
        else if (mood.includes('soft') || mood.includes('high-key')) setup.lighting = 'soft'
        else if (mood.includes('harsh')) setup.lighting = 'harsh'
        else setup.lighting = 'natural'
      }
      
      setVisualSetup(setup)
    }
    
    // Auto-detect characters from segment action text
    if (characters.length > 0) {
      const segmentText = (segment.action || segment.subject || segment.actionPrompt || '').toLowerCase()
      const detectedNames = characters
        .filter(c => segmentText.includes(c.name.toLowerCase()))
        .map(c => c.name)
      
      if (detectedNames.length > 0) {
        setSelectedCharacterNames(detectedNames)
      } else {
        // Default: select all characters with reference images
        const withRefs = characters.filter(c => c.referenceImage).map(c => c.name)
        setSelectedCharacterNames(withRefs.slice(0, 3)) // Max 3 for image generation
      }
    }
  }, [segment, open, previousEndFrameUrl, frameType, sceneDirection, sceneHeading, characters])

  // Build intelligent prompt using keyframe prompt builder
  // If pasted prompts exist (startFramePrompt/endFramePrompt), return those directly
  const intelligentPrompt = useMemo(() => {
    if (!segment || !useIntelligentPrompt) return null
    
    // If we have pasted frame-specific prompts, use them directly instead of building
    const pastedPrompt = frameType === 'start' || frameType === 'both' 
      ? segment.startFramePrompt 
      : segment.endFramePrompt
    
    if (pastedPrompt) {
      // Return the pasted prompt as the "intelligent" suggestion
      return {
        prompt: pastedPrompt,
        injectedDirection: {
          shotType: segment.shotType || 'medium',
          cameraMovement: segment.cameraMovement || 'static',
          lighting: null,
          emotionalBeat: segment.emotionalBeat || null,
        },
        confidence: 1.0, // High confidence since it's from AI-generated paste
      }
    }
    
    const keyframeContext: KeyframeContext = {
      segmentIndex,
      transitionType: (segment.transitionType as 'CONTINUE' | 'CUT') || 'CUT',
      previousEndFrameUrl: previousEndFrameUrl || undefined,
      previousShotType: segment.shotType,
      isPanTransition: segment.cameraMovement?.toLowerCase().includes('pan') || false,
    }
    
    try {
      return buildKeyframePrompt({
        actionPrompt: segment.actionPrompt || segment.generatedPrompt || '',
        framePosition: frameType === 'both' ? 'start' : frameType,
        duration: segment.endTime - segment.startTime,
        sceneDirection,
        keyframeContext,
        characters: characters.length > 0 ? characters : undefined,
        previousFrameDescription: segment.references?.startFrameDescription || undefined,
      })
    } catch (err) {
      console.error('[FramePromptDialog] Error building intelligent prompt:', err)
      return null
    }
  }, [segment, segmentIndex, frameType, previousEndFrameUrl, sceneDirection, characters, useIntelligentPrompt])

  // Validate current prompt against scene direction
  const directionAdherence = useMemo(() => {
    return validateDirectionAdherence(customPrompt, sceneDirection)
  }, [customPrompt, sceneDirection])

  // State for AI enhancement
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false)
  const [aiEnhanceError, setAiEnhanceError] = useState<string | null>(null)

  // Apply intelligent prompt (local builder)
  const applyIntelligentPrompt = useCallback(() => {
    if (intelligentPrompt) {
      setCustomPrompt(intelligentPrompt.prompt)
    }
  }, [intelligentPrompt])

  // Enhance prompt with Gemini 2.5 AI
  const enhancePromptWithAI = useCallback(async () => {
    if (!segment || !customPrompt) return
    
    setIsEnhancingPrompt(true)
    setAiEnhanceError(null)
    
    try {
      const response = await fetch('/api/intelligence/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'keyframe',
          basePrompt: customPrompt,
          framePosition: frameType === 'both' ? 'start' : frameType,
          duration: segment.endTime - segment.startTime,
          sceneContext: {
            heading: sceneHeading,
            action: segment.action || segment.subject,
          },
          sceneDirection,
          characters: selectedCharacters.map(c => ({
            name: c.name,
            appearance: c.appearance,
            ethnicity: c.ethnicity,
            age: c.age,
            wardrobe: c.wardrobe,
          })),
          segmentPurpose: segment.segmentPurpose,
          thinkingLevel: thinkingLevel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to enhance prompt')
      }

      const data = await response.json()
      
      if (data.prompt) {
        setCustomPrompt(data.prompt)
        console.log('[FramePromptDialog] AI enhanced prompt, confidence:', data.confidence)
      }
    } catch (error) {
      console.error('[FramePromptDialog] AI enhancement failed:', error)
      setAiEnhanceError(error instanceof Error ? error.message : 'Enhancement failed')
    } finally {
      setIsEnhancingPrompt(false)
    }
  }, [segment, customPrompt, frameType, sceneHeading, sceneDirection, selectedCharacters, thinkingLevel])

  // Build negative prompt from selected presets + custom
  const buildNegativePrompt = useCallback((): string => {
    const presetValues = NEGATIVE_PROMPT_PRESETS
      .filter(p => selectedNegativePresets.has(p.id))
      .map(p => p.value)
    
    const allParts = [...presetValues]
    if (customNegativePrompt.trim()) {
      allParts.push(customNegativePrompt.trim())
    }
    
    return allParts.join(', ')
  }, [selectedNegativePresets, customNegativePrompt])

  // Toggle preset selection
  const togglePreset = useCallback((presetId: string) => {
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

  // Handle generate
  const handleGenerate = useCallback(() => {
    if (!segment) return

    // Get selected object references
    const selectedObjectRefs = objectReferences.filter(obj => selectedObjectRefIds.includes(obj.id))

    const options: FrameGenerationOptions = {
      segmentId: segment.segmentId,
      frameType,
      customPrompt,
      negativePrompt: buildNegativePrompt(),
      usePreviousEndFrame,
      previousEndFrameUrl: usePreviousEndFrame ? previousEndFrameUrl : undefined,
      // NEW: Pass selected characters with reference images
      selectedCharacters: selectedCharacters.length > 0 ? selectedCharacters : undefined,
      // NEW: Pass selected object references
      selectedObjectReferences: selectedObjectRefs.length > 0 ? selectedObjectRefs.map(obj => ({
        id: obj.id,
        name: obj.name,
        imageUrl: obj.imageUrl,
        description: obj.description,
      })) : undefined,
      // NEW: Pass visual setup for prompt construction
      visualSetup: mode === 'guided' ? visualSetup : undefined,
      // NEW: Pass art style for generation
      artStyle,
      // NEW: Pass model tier and thinking level
      modelTier,
      thinkingLevel,
    }

    onGenerate(options)
  }, [segment, frameType, customPrompt, buildNegativePrompt, usePreviousEndFrame, previousEndFrameUrl, onGenerate, selectedCharacters, objectReferences, selectedObjectRefIds, mode, visualSetup, artStyle, modelTier, thinkingLevel])

  if (!segment) return null

  const transitionType = segment.transitionType || 'CUT'
  const canUsePreviousFrame = !!previousEndFrameUrl && (frameType === 'start' || frameType === 'both')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-cyan-400" />
            Generate Frame{frameType === 'both' ? 's' : ''}
            <Badge variant="outline" className="ml-2 text-xs">
              Segment {segmentIndex + 1}
            </Badge>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs capitalize",
                frameType === 'start' ? 'bg-blue-500/20 text-blue-300' :
                frameType === 'end' ? 'bg-purple-500/20 text-purple-300' :
                'bg-cyan-500/20 text-cyan-300'
              )}
            >
              {frameType === 'both' ? 'Start + End' : `${frameType} Frame`}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'guided' | 'advanced')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full flex-shrink-0">
            <TabsTrigger value="guided" className="flex-1">
              Visual Setup
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex-1">
              Custom Prompt
            </TabsTrigger>
          </TabsList>

          {/* Character Reference Guidance Banner */}
          {hasCharacterReferences && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex-shrink-0">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-300">
                  <p className="font-medium mb-1">Character References Active</p>
                  <p className="text-blue-400/80">
                    For best results with character references, use <span className="font-medium">Close-Up</span> or{' '}
                    <span className="font-medium">Medium Shot</span> framing. Wide shots make characters too small 
                    for facial recognition.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Visual Setup Tab */}
          <TabsContent value="guided" className="flex-1 overflow-auto">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6 py-4">
                {/* Use Previous End Frame Option */}
                {canUsePreviousFrame && (
                  <div className={cn(
                    "p-4 rounded-lg border",
                    usePreviousEndFrame 
                      ? "border-blue-500/50 bg-blue-500/10" 
                      : "border-slate-700 bg-slate-800/50"
                  )}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="use-prev-frame-guided"
                        checked={usePreviousEndFrame}
                        onCheckedChange={(checked) => setUsePreviousEndFrame(checked === true)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor="use-prev-frame-guided" 
                          className="text-sm font-medium text-slate-200 cursor-pointer flex items-center gap-2"
                        >
                          <Link2 className="w-4 h-4 text-blue-400" />
                          Use Previous Segment's End Frame
                        </Label>
                        <p className="text-xs text-slate-400 mt-1">
                          Copy the end frame from Segment {segmentIndex} as this segment's start frame for seamless visual continuity.
                        </p>
                        
                        {previousEndFrameUrl && (
                          <div className="mt-3 flex items-center gap-3">
                            <img 
                              src={previousEndFrameUrl} 
                              alt="Previous end frame"
                              className="w-20 h-12 object-cover rounded border border-slate-600"
                            />
                            <span className="text-xs text-slate-500">
                              Previous segment's end frame
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {transitionType === 'CONTINUE' && (
                      <div className="mt-3 px-6 py-2 bg-blue-500/10 rounded text-xs text-blue-300 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        This segment uses CONTINUE transition – recommended for visual continuity
                      </div>
                    )}
                  </div>
                )}

                {/* Location & Setting */}
                <div className="space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50">
                  <h4 className="text-sm font-medium text-slate-200">Location & Setting</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-400">Location/Setting</Label>
                      <input
                        type="text"
                        value={visualSetup.location}
                        onChange={(e) => setVisualSetup(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g., Modern apartment living room"
                        className="w-full mt-1 px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-slate-400">Time of Day</Label>
                        <Select value={visualSetup.timeOfDay} onValueChange={(v) => setVisualSetup(prev => ({ ...prev, timeOfDay: v }))}>
                          <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Day</SelectItem>
                            <SelectItem value="night">Night</SelectItem>
                            <SelectItem value="dawn">Dawn</SelectItem>
                            <SelectItem value="dusk">Dusk</SelectItem>
                            <SelectItem value="golden-hour">Golden Hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-400">Weather</Label>
                        <Select value={visualSetup.weather} onValueChange={(v) => setVisualSetup(prev => ({ ...prev, weather: v }))}>
                          <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="clear">Clear</SelectItem>
                            <SelectItem value="cloudy">Cloudy</SelectItem>
                            <SelectItem value="rainy">Rainy</SelectItem>
                            <SelectItem value="stormy">Stormy</SelectItem>
                            <SelectItem value="foggy">Foggy</SelectItem>
                            <SelectItem value="snowy">Snowy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Atmosphere/Mood</Label>
                      <Select value={visualSetup.atmosphere} onValueChange={(v) => setVisualSetup(prev => ({ ...prev, atmosphere: v }))}>
                        <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="tense">Tense</SelectItem>
                          <SelectItem value="mysterious">Mysterious</SelectItem>
                          <SelectItem value="energetic">Energetic</SelectItem>
                          <SelectItem value="serene">Serene</SelectItem>
                          <SelectItem value="melancholic">Melancholic</SelectItem>
                          <SelectItem value="hopeful">Hopeful</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Characters in Scene */}
                {characters.length > 0 && (
                  <div className="space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50">
                    <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      Characters in Scene
                    </h4>
                    <p className="text-xs text-slate-400">Select Characters</p>
                    <div className="space-y-2">
                      {characters.map((char) => (
                        <div
                          key={char.name}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors",
                            selectedCharacterNames.includes(char.name)
                              ? "border-cyan-500/50 bg-cyan-500/10"
                              : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                          )}
                          onClick={() => {
                            setSelectedCharacterNames(prev => 
                              prev.includes(char.name)
                                ? prev.filter(n => n !== char.name)
                                : [...prev, char.name]
                            )
                          }}
                        >
                          <Checkbox
                            checked={selectedCharacterNames.includes(char.name)}
                            onCheckedChange={(checked) => {
                              setSelectedCharacterNames(prev =>
                                checked
                                  ? [...prev, char.name]
                                  : prev.filter(n => n !== char.name)
                              )
                            }}
                          />
                          {char.referenceImage ? (
                            <img
                              src={char.referenceImage}
                              alt={char.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                              <Users className="w-5 h-5 text-slate-500" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-200">{char.name}</p>
                            {char.referenceImage && (
                              <p className="text-xs text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Has reference image
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Props & Objects */}
                {objectReferences.length > 0 && (
                  <div className="space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50">
                    <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                      <Box className="w-4 h-4 text-cyan-400" />
                      Props & Objects
                    </h4>
                    <p className="text-xs text-slate-400">Select objects to include for visual consistency</p>
                    {selectedObjectRefIds.length > 5 && (
                      <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300">
                          You've selected {selectedObjectRefIds.length} objects. For best results, limit to 5 or fewer key props.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      {objectReferences.map((obj) => {
                        const isSelected = selectedObjectRefIds.includes(obj.id)
                        return (
                          <button
                            key={obj.id}
                            onClick={() => {
                              setSelectedObjectRefIds(prev =>
                                prev.includes(obj.id)
                                  ? prev.filter(id => id !== obj.id)
                                  : [...prev, obj.id]
                              )
                            }}
                            className={cn(
                              "relative aspect-square rounded-lg border cursor-pointer transition-all overflow-hidden",
                              isSelected
                                ? "border-purple-500 ring-2 ring-purple-500/50"
                                : "border-slate-700 hover:border-slate-600"
                            )}
                            title={obj.description || obj.name}
                          >
                            {obj.imageUrl ? (
                              <img
                                src={obj.imageUrl}
                                alt={obj.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                                <Box className="w-6 h-6 text-slate-500" />
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                              <div className="text-[10px] text-white truncate font-medium">{obj.name}</div>
                            </div>
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {obj.importance === 'critical' && (
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-500/90 rounded text-[9px] text-white font-medium">
                                Critical
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Selected objects will be included for visual consistency in the generated frame.
                    </p>
                  </div>
                )}

                {/* Camera & Lighting */}
                <div className="space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50">
                  <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    Camera & Lighting
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-400">Shot Type</Label>
                      <Select value={visualSetup.shotType} onValueChange={(v) => setVisualSetup(prev => ({ ...prev, shotType: v }))}>
                        <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="extreme-close-up">Extreme Close-Up</SelectItem>
                          <SelectItem value="close-up">Close-Up</SelectItem>
                          <SelectItem value="medium-close-up">Medium Close-Up</SelectItem>
                          <SelectItem value="medium-shot">Medium Shot</SelectItem>
                          <SelectItem value="wide-shot">Wide Shot</SelectItem>
                          <SelectItem value="extreme-wide">Extreme Wide</SelectItem>
                          <SelectItem value="over-shoulder">Over the Shoulder</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Camera Angle</Label>
                      <Select value={visualSetup.cameraAngle} onValueChange={(v) => setVisualSetup(prev => ({ ...prev, cameraAngle: v }))}>
                        <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eye-level">Eye Level</SelectItem>
                          <SelectItem value="low-angle">Low Angle</SelectItem>
                          <SelectItem value="high-angle">High Angle</SelectItem>
                          <SelectItem value="dutch-angle">Dutch Angle</SelectItem>
                          <SelectItem value="birds-eye">Bird's Eye</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Lighting</Label>
                    <Select value={visualSetup.lighting} onValueChange={(v) => setVisualSetup(prev => ({ ...prev, lighting: v }))}>
                      <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural">Natural</SelectItem>
                        <SelectItem value="soft">Soft / High-Key</SelectItem>
                        <SelectItem value="dramatic">Dramatic / Low-Key</SelectItem>
                        <SelectItem value="harsh">Harsh</SelectItem>
                        <SelectItem value="silhouette">Silhouette</SelectItem>
                        <SelectItem value="neon">Neon / Stylized</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Art Style Selection */}
                <div className="space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50">
                  <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    Art Style
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {artStylePresets.map((style) => (
                      <div
                        key={style.id}
                        onClick={() => setArtStyle(style.id)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all",
                          artStyle === style.id
                            ? "border-cyan-500 bg-cyan-500/10"
                            : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                        )}
                      >
                        <div className="text-sm font-medium text-slate-200">{style.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{style.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quality Mode Selection */}
                <div className="space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50">
                  <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Quality Mode
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {MODEL_TIERS.map((tier) => {
                      const Icon = tier.icon
                      const isSelected = modelTier === tier.id
                      const isDisabled = tier.comingSoon
                      return (
                        <div
                          key={tier.id}
                          onClick={() => !isDisabled && setModelTier(tier.id)}
                          className={cn(
                            "p-3 rounded-lg border transition-all relative",
                            isDisabled 
                              ? "border-slate-700/50 bg-slate-800/30 cursor-not-allowed opacity-60"
                              : isSelected
                                ? tier.color === 'emerald' ? "border-emerald-500 bg-emerald-500/10 cursor-pointer"
                                : tier.color === 'purple' ? "border-purple-500 bg-purple-500/10 cursor-pointer"
                                : "border-amber-500 bg-amber-500/10 cursor-pointer"
                                : "border-slate-700 bg-slate-800/50 hover:border-slate-600 cursor-pointer"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              tier.color === 'emerald' ? "bg-emerald-500/20 text-emerald-400"
                              : tier.color === 'purple' ? "bg-purple-500/20 text-purple-400"
                              : "bg-amber-500/20 text-amber-400"
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-200">{tier.name}</span>
                                <span className={cn(
                                  "text-xs px-1.5 py-0.5 rounded",
                                  tier.color === 'emerald' ? "bg-emerald-500/20 text-emerald-300"
                                  : tier.color === 'purple' ? "bg-purple-500/20 text-purple-300"
                                  : "bg-amber-500/20 text-amber-300"
                                )}>
                                  {tier.description}
                                </span>
                                {tier.comingSoon && (
                                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/50">
                                    Coming Soon
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{tier.details}</p>
                              <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                                <span>{tier.model}</span>
                                <span>•</span>
                                <span>{tier.resolution}</span>
                                <span>•</span>
                                <span>{tier.cost}</span>
                              </div>
                            </div>
                            {isSelected && !isDisabled && (
                              <Check className={cn(
                                "w-5 h-5",
                                tier.color === 'emerald' ? "text-emerald-400"
                                : tier.color === 'purple' ? "text-purple-400"
                                : "text-amber-400"
                              )} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Thinking Level Control */}
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400">Thinking Level</span>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
                        <button
                          onClick={() => setThinkingLevel('low')}
                          className={cn(
                            "px-3 py-1 text-xs rounded transition-colors",
                            thinkingLevel === 'low'
                              ? "bg-slate-700 text-white"
                              : "text-slate-400 hover:text-slate-300"
                          )}
                        >
                          Low
                        </button>
                        <button
                          onClick={() => setThinkingLevel('high')}
                          className={cn(
                            "px-3 py-1 text-xs rounded transition-colors",
                            thinkingLevel === 'high'
                              ? "bg-slate-700 text-white"
                              : "text-slate-400 hover:text-slate-300"
                          )}
                        >
                          High
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      {thinkingLevel === 'high' 
                        ? 'High thinking: Better for complex, multi-layered scenes. Takes longer but captures all details.'
                        : 'Low thinking: Faster generation for simple prompts. Good for quick iterations.'}
                    </p>
                  </div>
                </div>

                {/* Prompt Preview */}
                <div className="space-y-2 p-3 rounded border border-slate-700 bg-slate-800/50">
                  <h4 className="text-sm font-medium text-slate-200">Prompt Preview</h4>
                  <div className="p-3 bg-slate-900 rounded text-xs text-slate-300 font-mono leading-relaxed">
                    {(() => {
                      const parts: string[] = []
                      if (visualSetup.shotType) parts.push(visualSetup.shotType.replace(/-/g, ' '))
                      // Include the custom prompt from segment (title sequences, etc.)
                      const segmentPrompt = customPrompt || segment?.generatedPrompt || segment?.userEditedPrompt
                      if (segmentPrompt) {
                        // Truncate long prompts for preview
                        const previewPrompt = segmentPrompt.length > 200 
                          ? segmentPrompt.substring(0, 200) + '...'
                          : segmentPrompt
                        parts.push(previewPrompt)
                      } else {
                        if (visualSetup.location) parts.push(`of ${visualSetup.location}`)
                        if (visualSetup.timeOfDay && visualSetup.timeOfDay !== 'day') parts.push(`at ${visualSetup.timeOfDay.replace('-', ' ')}`)
                        if (selectedCharacterNames.length > 0) parts.push(`featuring ${selectedCharacterNames.join(', ')}`)
                        if (segment?.action) parts.push(segment.action)
                      }
                      if (visualSetup.atmosphere && visualSetup.atmosphere !== 'neutral') parts.push(`${visualSetup.atmosphere} atmosphere`)
                      if (visualSetup.lighting && visualSetup.lighting !== 'natural') parts.push(`${visualSetup.lighting} lighting`)
                      // Add art style to preview
                      const selectedStylePreset = artStylePresets.find(s => s.id === artStyle)
                      if (selectedStylePreset) parts.push(`[Style: ${selectedStylePreset.name}]`)
                      return parts.join(', ') || 'Configure settings above to preview prompt...'
                    })()}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Custom Prompt Tab */}
          <TabsContent value="advanced" className="flex-1 overflow-auto">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6 py-4">
                {/* Use Previous End Frame Option */}
                {canUsePreviousFrame && (
                  <div className={cn(
                    "p-4 rounded-lg border",
                    usePreviousEndFrame 
                      ? "border-blue-500/50 bg-blue-500/10" 
                      : "border-slate-700 bg-slate-800/50"
                  )}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="use-prev-frame"
                        checked={usePreviousEndFrame}
                        onCheckedChange={(checked) => setUsePreviousEndFrame(checked === true)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor="use-prev-frame" 
                          className="text-sm font-medium text-slate-200 cursor-pointer flex items-center gap-2"
                        >
                          <Link2 className="w-4 h-4 text-blue-400" />
                          Use Previous Segment's End Frame
                        </Label>
                        <p className="text-xs text-slate-400 mt-1">
                          Copy the end frame from Segment {segmentIndex} as this segment's start frame for seamless visual continuity.
                        </p>
                        
                        {previousEndFrameUrl && (
                          <div className="mt-3 flex items-center gap-3">
                            <img 
                              src={previousEndFrameUrl} 
                              alt="Previous end frame"
                              className="w-20 h-12 object-cover rounded border border-slate-600"
                            />
                            <span className="text-xs text-slate-500">
                              Previous segment's end frame
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {transitionType === 'CONTINUE' && (
                      <div className="mt-3 px-6 py-2 bg-blue-500/10 rounded text-xs text-blue-300 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        This segment uses CONTINUE transition – recommended for visual continuity
                      </div>
                    )}
                  </div>
                )}

                {/* Scene Direction Reference Panel */}
                {sceneDirection && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowDirectionPanel(!showDirectionPanel)}
                      className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors w-full"
                    >
                      {showDirectionPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <Camera className="w-4 h-4 text-amber-400" />
                      Scene Direction Reference
                      {directionAdherence.score < 0.75 && (
                        <Badge variant="secondary" className="ml-auto text-[10px] bg-amber-500/20 text-amber-300">
                          {directionAdherence.missingElements.length} missing
                        </Badge>
                      )}
                      {directionAdherence.score >= 0.75 && (
                        <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-400" />
                      )}
                    </button>
                    
                    {showDirectionPanel && (
                      <div className="grid grid-cols-2 gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        {/* Camera */}
                        {sceneDirection.camera && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                              <Camera className="w-3 h-3" />
                              Camera
                            </div>
                            <p className="text-xs text-slate-300">
                              {sceneDirection.camera.shots?.[0] || 'Medium Shot'}
                              {sceneDirection.camera.movement && sceneDirection.camera.movement !== 'Static' && 
                                ` • ${sceneDirection.camera.movement}`}
                            </p>
                          </div>
                        )}
                        
                        {/* Lighting */}
                        {sceneDirection.lighting && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                              <Sun className="w-3 h-3" />
                              Lighting
                            </div>
                            <p className="text-xs text-slate-300">
                              {sceneDirection.lighting.overallMood || 'Natural'}
                              {sceneDirection.lighting.timeOfDay && ` • ${sceneDirection.lighting.timeOfDay}`}
                            </p>
                          </div>
                        )}
                        
                        {/* Emotional Beat */}
                        {sceneDirection.talent?.emotionalBeat && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                              <Users className="w-3 h-3" />
                              Emotion
                            </div>
                            <p className="text-xs text-slate-300">
                              {sceneDirection.talent.emotionalBeat}
                            </p>
                          </div>
                        )}
                        
                        {/* Atmosphere */}
                        {sceneDirection.scene?.atmosphere && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                              <Wind className="w-3 h-3" />
                              Atmosphere
                            </div>
                            <p className="text-xs text-slate-300">
                              {sceneDirection.scene.atmosphere}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Direction Adherence Warning */}
                    {directionAdherence.score < 0.75 && directionAdherence.suggestions.length > 0 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-xs font-medium text-amber-300 mb-2">
                          Missing scene direction elements:
                        </p>
                        <ul className="space-y-1">
                          {directionAdherence.suggestions.slice(0, 3).map((suggestion, i) => (
                            <li key={i} className="text-xs text-amber-200/80 flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-amber-400" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Intelligent Prompt Builder */}
                {intelligentPrompt && (
                  <div className="p-4 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium text-cyan-300">AI-Enhanced Prompt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={enhancePromptWithAI}
                          disabled={isEnhancingPrompt || !customPrompt}
                          className="h-7 text-xs text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          {isEnhancingPrompt ? 'Enhancing...' : 'Gemini Enhance'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={applyIntelligentPrompt}
                          className="h-7 text-xs text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/20"
                        >
                          Apply Local
                        </Button>
                      </div>
                    </div>
                    {aiEnhanceError && (
                      <div className="mb-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                        <p className="text-xs text-amber-300">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          {aiEnhanceError}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mb-2">
                      Prompt enhanced with scene direction (camera, lighting, emotion):
                    </p>
                    <p className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded font-mono leading-relaxed max-h-24 overflow-auto">
                      {intelligentPrompt.prompt}
                    </p>
                    {intelligentPrompt.injectedDirection.emotion && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {intelligentPrompt.injectedDirection.camera && (
                          <Badge variant="secondary" className="text-[10px] bg-slate-700">
                            📷 {intelligentPrompt.injectedDirection.camera}
                          </Badge>
                        )}
                        {intelligentPrompt.injectedDirection.lighting && (
                          <Badge variant="secondary" className="text-[10px] bg-slate-700">
                            💡 {intelligentPrompt.injectedDirection.lighting}
                          </Badge>
                        )}
                        {intelligentPrompt.injectedDirection.emotion && (
                          <Badge variant="secondary" className="text-[10px] bg-slate-700">
                            ❤️ {intelligentPrompt.injectedDirection.emotion}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Prompt Editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      Generation Prompt
                    </Label>
                    <span className="text-xs text-slate-500">
                      {customPrompt.length} characters
                    </span>
                  </div>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe what should appear in the frame..."
                    className="min-h-[120px] font-mono text-sm"
                    disabled={usePreviousEndFrame && frameType === 'start'}
                  />
                  {usePreviousEndFrame && frameType === 'start' && (
                    <p className="text-xs text-amber-400">
                      Prompt is ignored when using previous end frame directly
                    </p>
                  )}
                </div>

                {/* Negative Prompt Presets */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Negative Prompts
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedNegativePresets.size} selected
                    </Badge>
                  </button>
                  
                  {showAdvanced && (
                    <div className="space-y-4 pl-6 border-l-2 border-slate-700">
                      <p className="text-xs text-slate-400">
                        Select elements to avoid in the generated image:
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {NEGATIVE_PROMPT_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => togglePreset(preset.id)}
                            className={cn(
                              "px-3 py-2 rounded-lg border text-left text-xs transition-colors",
                              selectedNegativePresets.has(preset.id)
                                ? "border-red-500/50 bg-red-500/10 text-red-300"
                                : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                            )}
                          >
                            <span className="font-medium">{preset.label}</span>
                          </button>
                        ))}
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Custom negative prompt:</Label>
                        <Textarea
                          value={customNegativePrompt}
                          onChange={(e) => setCustomNegativePrompt(e.target.value)}
                          placeholder="Add custom terms to avoid..."
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                      
                      {/* Preview combined negative prompt */}
                      {(selectedNegativePresets.size > 0 || customNegativePrompt) && (
                        <div className="p-3 bg-slate-900 rounded-lg">
                          <Label className="text-xs text-slate-500 mb-1 block">Combined negative prompt:</Label>
                          <p className="text-xs text-red-400/70 font-mono break-words">
                            {buildNegativePrompt() || '(none)'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quality Mode (Custom Prompt Tab) */}
                <div className="space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50">
                  <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Quality Mode
                  </h4>
                  <div className="flex items-center gap-2">
                    {MODEL_TIERS.filter(t => !t.comingSoon).map((tier) => {
                      const Icon = tier.icon
                      const isSelected = modelTier === tier.id
                      return (
                        <button
                          key={tier.id}
                          onClick={() => setModelTier(tier.id)}
                          className={cn(
                            "flex-1 flex items-center gap-2 p-2 rounded-lg border transition-all",
                            isSelected
                              ? tier.color === 'emerald' ? "border-emerald-500 bg-emerald-500/10"
                              : "border-purple-500 bg-purple-500/10"
                              : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                          )}
                        >
                          <Icon className={cn(
                            "w-4 h-4",
                            isSelected 
                              ? tier.color === 'emerald' ? "text-emerald-400" : "text-purple-400"
                              : "text-slate-400"
                          )} />
                          <div className="text-left">
                            <div className="text-xs font-medium text-slate-200">{tier.name}</div>
                            <div className="text-[10px] text-slate-500">{tier.cost}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-400">Thinking:</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5">
                      <button
                        onClick={() => setThinkingLevel('low')}
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded transition-colors",
                          thinkingLevel === 'low'
                            ? "bg-slate-700 text-white"
                            : "text-slate-400 hover:text-slate-300"
                        )}
                      >
                        Low
                      </button>
                      <button
                        onClick={() => setThinkingLevel('high')}
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded transition-colors",
                          thinkingLevel === 'high'
                            ? "bg-slate-700 text-white"
                            : "text-slate-400 hover:text-slate-300"
                        )}
                      >
                        High
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (!customPrompt.trim() && !usePreviousEndFrame)}
            className="gap-2"
          >
            <Wand2 className="w-4 h-4" />
            {isGenerating ? 'Generating...' : `Generate ${frameType === 'both' ? 'Frames' : 'Frame'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
