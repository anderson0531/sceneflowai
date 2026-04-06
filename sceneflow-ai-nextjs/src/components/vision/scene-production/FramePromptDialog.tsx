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
  MapPin,
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
import { prioritizeCharacterReferences } from './defaults'
import { artStylePresets } from '@/constants/artStylePresets'
import { findSceneCharacters, findSceneObjects } from '@/lib/character/matching'
import {
  LocationSettingSection,
  CharacterSelectionSection,
  PropSelectionSection,
  CameraCompositionSection,
  ArtStyleGrid,
  QualityModeSection,
  TalentDirectionSection,
} from '@/components/image-gen'
import type { VisualSetup, TalentDirection as TalentDirectionType } from '@/components/image-gen'

import {
  MODEL_TIERS,
  NEGATIVE_PROMPT_PRESETS,
  DEFAULT_NEGATIVE_PRESETS as SHARED_DEFAULT_NEGATIVE_PRESETS,
  type ModelTier,
  type ThinkingLevel,
} from '@/components/image-gen'

// Re-export for backward compatibility
export type { ModelTier, ThinkingLevel }

const DEFAULT_NEGATIVE_PRESETS = SHARED_DEFAULT_NEGATIVE_PRESETS

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
  /** Characters for identity context - ENHANCED: now includes referenceImage + wardrobes */
  characters?: Array<{
    name: string
    referenceImage?: string
    appearance?: string
    ethnicity?: string
    age?: string
    wardrobe?: string
    wardrobes?: Array<{
      id: string
      name: string
      description: string
      fullBodyUrl?: string
      headshotUrl?: string
    }>
  }>
  /** Object/prop references from the reference library for consistent image generation */
  objectReferences?: Array<{
    id: string
    name: string
    imageUrl: string
    description?: string
    importance?: 'critical' | 'secondary'
  }>
  /** Location references for environment/setting consistency */
  locationReferences?: Array<{
    id: string
    location: string
    locationDisplay: string
    imageUrl: string
    description?: string
    sceneNumbers?: number[]
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
  /** Indicates this came from the dialog (user made explicit selections).
   *  When true, empty selectedCharacters/selectedObjectReferences means user chose NONE.
   *  When false/absent, batch generation should auto-populate references. */
  fromDialog?: boolean
  /** NEW: Selected characters with reference images for generation */
  selectedCharacters?: CharacterReference[]
  /** NEW: Selected object/prop references for consistent generation */
  selectedObjectReferences?: Array<{
    id: string
    name: string
    imageUrl: string
    description?: string
  }>
  /** NEW: Selected location references for environment consistency */
  selectedLocationReferences?: Array<{
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
  locationReferences = [],
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
  
  // No-talent detection state — when true, Characters section is hidden
  const [isNoTalentSegment, setIsNoTalentSegment] = useState(false)
  
  // Object reference selection state
  const [selectedObjectRefIds, setSelectedObjectRefIds] = useState<string[]>([])
  
  // Location reference selection state
  const [selectedLocationRefIds, setSelectedLocationRefIds] = useState<string[]>([])
  
  // Auto-matched location ref IDs from scene heading
  const [autoMatchedLocationRefIds, setAutoMatchedLocationRefIds] = useState<Set<string>>(new Set())
  
  // Art style state (default to photorealistic for backward compatibility)
  const [artStyle, setArtStyle] = useState<string>('photorealistic')
  
  // Model quality tier and thinking level state
  // Default to 'eco' (Draft) for cost-optimized iteration — users upgrade to 'designer' (Final) when ready
  const [modelTier, setModelTier] = useState<ModelTier>('eco')
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('low')
  
  // State - Initialize customPrompt from segment data immediately to prevent race conditions
  const initialPrompt = useMemo(() => {
    if (!segment) return ''
    if (frameType === 'start') {
      return segment.startFramePrompt || segment.references?.startFrameDescription || segment.userEditedPrompt || segment.generatedPrompt || ''
    }
    if (frameType === 'end') {
      return segment.endFramePrompt || segment.references?.endFrameDescription || segment.userEditedPrompt || segment.generatedPrompt || ''
    }
    if (frameType === 'both') {
      return segment.startFramePrompt || segment.references?.startFrameDescription || segment.userEditedPrompt || segment.generatedPrompt || ''
    }
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
  
  // Talent direction state (NEW — unified with ScenePromptBuilder)
  const [talentDirection, setTalentDirection] = useState<TalentDirectionType>({
    talentBlocking: '',
    emotionalBeat: '',
    keyProps: '',
  })
  
  // Auto-detected object IDs for suggestion badges (NEW)
  const [autoDetectedObjectIds, setAutoDetectedObjectIds] = useState<Set<string>>(new Set())
  
  // Wardrobe selection per character (NEW — unified with ScenePromptBuilder)
  const [selectedWardrobes, setSelectedWardrobes] = useState<Record<string, string>>({})
  
  // Collapsible section states for reference sections (all default closed)
  const [talentSectionCollapsed, setTalentSectionCollapsed] = useState(true)
  const [locationSectionCollapsed, setLocationSectionCollapsed] = useState(true)
  const [propsSectionCollapsed, setPropsSectionCollapsed] = useState(true)
  
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
    if (frameType === 'start') {
      basePrompt = segment.startFramePrompt || segment.references?.startFrameDescription || segment.userEditedPrompt || segment.generatedPrompt || ''
    } else if (frameType === 'end') {
      basePrompt = segment.endFramePrompt || segment.references?.endFrameDescription || segment.userEditedPrompt || segment.generatedPrompt || ''
    } else if (frameType === 'both') {
      basePrompt = segment.startFramePrompt || segment.references?.startFrameDescription || segment.userEditedPrompt || segment.generatedPrompt || ''
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
    
    // Check if the segment indicates an abstract or non-physical space
    const segmentTextForLocation = [
      segment.action,
      segment.subject,
      segment.actionPrompt,
      segment.generatedPrompt,
      segment.startFramePrompt,
      segment.endFramePrompt,
      segment.references?.startFrameDescription,
      segment.references?.endFrameDescription,
    ].filter(Boolean).join(' ').toLowerCase()
    
    const abstractIndicators = [
      'non-physical', 'abstract space', 'void', 'digital canvas', 'vfx only', 
      'entirely vfx/cgi', 'visual effects only', 'black space', 'white space', 
      'abstract environment', 'cyberspace'
    ]
    const isAbstractSpace = abstractIndicators.some(ind => segmentTextForLocation.includes(ind))

    // Initialize visual setup from scene direction
    if (sceneDirection) {
      const setup = { ...visualSetup }
      
      // Location from scene direction
      if (isAbstractSpace) {
        setup.location = segmentTextForLocation.includes('digital canvas') ? 'Abstract digital canvas' : 'Abstract space / Void'
      } else if (sceneDirection.scene?.location) {
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
    
    // Auto-detect characters from segment action text using intelligent matching
    // CRITICAL: Check SEGMENT-LEVEL character data first, then fall back to scene-level detection
    // This ensures no-talent segments (title sequences, VFX-only, etc.) don't get characters injected
    
    // 1. Check segment-level character data (most authoritative — from approved segment direction)
    const segmentHasCharacters = segment.characters && segment.characters.length > 0
    const segmentCharacterNames = segment.characters?.map(c => c.name) || []
    const segmentIsNoTalent = (segment.characters !== undefined && segment.characters.length === 0) || 
      segment.segmentDirection?.isNoTalent === true
    
    // 2. Check scene-level talent direction with comprehensive detection
    // Matches the indicators used by keyframe-prompt-builder.ts isNoTalentScene()
    const talentText = typeof sceneDirection?.talent === 'string' 
      ? sceneDirection.talent
      : (sceneDirection?.talent?.blocking || sceneDirection?.talent?.emotionalBeat || '')
    const talentLower = talentText.toLowerCase()
    const noTalentIndicators = [
      'n/a', 'no on-screen talent', 'no talent', 'no actors', 'no characters',
      'no people', 'abstract', 'title sequence', 'text only', 'graphics only',
      'vfx only', 'visual effects only', 'no performers'
    ]
    const isNoTalentScene = noTalentIndicators.some(ind => talentLower.includes(ind))
    
    // 3. Determine if this segment should have characters
    const shouldSkipCharacters = segmentIsNoTalent || isNoTalentScene
    setIsNoTalentSegment(shouldSkipCharacters)
    
    if (!shouldSkipCharacters && characters.length > 0) {
      // If segment has explicit character assignments, use those
      if (segmentHasCharacters && segmentCharacterNames.length > 0) {
        // Match segment character names to available characters (case-insensitive)
        const matched = characters
          .filter(c => segmentCharacterNames.some(
            sn => sn.toLowerCase() === c.name.toLowerCase()
          ))
          .map(c => c.name)
        if (matched.length > 0) {
          setSelectedCharacterNames(matched)
        } else {
          // Segment says characters exist but names don't match — use broader text detection
          const segmentText = [
            segment.action,
            segment.subject,
            segment.actionPrompt,
            segment.generatedPrompt,
            segment.emotionalBeat,
            segment.endFrameDescription,
          ].filter(Boolean).join(' ')
          const detected = findSceneCharacters(segmentText, characters.map(c => ({ name: c.name })))
          setSelectedCharacterNames(detected.map(c => c.name))
          // NO FALLBACK — if nobody detected, nobody selected (matches ScenePromptBuilder behavior)
        }
      } else {
        // No explicit segment characters — detect from comprehensive text (matches ScenePromptBuilder approach)
        const segmentText = [
          segment.action,
          segment.subject,
          segment.actionPrompt,
          segment.generatedPrompt,
          segment.emotionalBeat,
          segment.endFrameDescription,
        ].filter(Boolean).join(' ')
        const detected = findSceneCharacters(segmentText, characters.map(c => ({ name: c.name })))
        setSelectedCharacterNames(detected.map(c => c.name))
        // NO FALLBACK — if nobody detected, nobody selected (matches ScenePromptBuilder behavior)
      }
    } else if (shouldSkipCharacters) {
      setSelectedCharacterNames([])
      // Keep talent section collapsed for no-talent segments but still visible
      setTalentSectionCollapsed(true)
      console.log('[FramePromptDialog] No-talent segment detected — section visible but collapsed, no auto-selection')
    }

    // Auto-detect props/objects from segment text
    if (objectReferences.length > 0) {
      const segmentText = segment.action || segment.subject || segment.actionPrompt || ''
      const detected = findSceneObjects(segmentText, objectReferences.map(o => ({
        id: o.id,
        name: o.name,
        description: o.description,
      })))
      setAutoDetectedObjectIds(new Set(detected.map(o => o.id)))
    }

    // Auto-match location references from scene heading
    if (!isAbstractSpace && locationReferences.length > 0 && sceneHeading) {
      // Parse location from heading: "INT. LOCATION - TIME"
      const headingStr = typeof sceneHeading === 'string' ? sceneHeading : ''
      const headingLower = headingStr.toLowerCase()
      const matchedIds: string[] = []
      const matchedIdSet = new Set<string>()
      
      for (const loc of locationReferences) {
        const locLower = loc.location.toLowerCase()
        // Match if the heading contains the location name or vice versa
        if (headingLower.includes(locLower) || locLower.includes(headingLower.replace(/^(int|ext)\.?\s*/i, '').replace(/\s*-\s*(day|night|dawn|dusk|evening|morning).*$/i, '').trim())) {
          matchedIds.push(loc.id)
          matchedIdSet.add(loc.id)
        }
      }
      setAutoMatchedLocationRefIds(matchedIdSet)
      // Auto-select matched locations
      if (matchedIds.length > 0) {
        setSelectedLocationRefIds(matchedIds)
        // Auto-expand location section when auto-matches found
        setLocationSectionCollapsed(false)
      } else {
        setSelectedLocationRefIds([])
        setLocationSectionCollapsed(true)
      }
    } else {
      setAutoMatchedLocationRefIds(new Set())
      setSelectedLocationRefIds([])
      setLocationSectionCollapsed(true)
      
      if (isAbstractSpace) {
        console.log('[FramePromptDialog] Abstract space detected, skipping location auto-matching')
      }
    }

    // Reset collapse states on dialog open (default all closed)
    setTalentSectionCollapsed(true)
    setPropsSectionCollapsed(true)

    // Initialize talent direction from scene direction
    if (sceneDirection?.talent) {
      setTalentDirection(prev => ({
        ...prev,
        emotionalBeat: sceneDirection.talent?.emotionalBeat || prev.emotionalBeat,
        talentBlocking: sceneDirection.talent?.blocking || prev.talentBlocking,
      }))
    }
  }, [segment, open, previousEndFrameUrl, frameType, sceneDirection, sceneHeading, characters, locationReferences])

  // Build intelligent prompt using keyframe prompt builder
  // Priority: 1. Pasted prompts, 2. Segment direction keyframe descriptions, 3. Generic builder
  const intelligentPrompt = useMemo(() => {
    if (!segment || !useIntelligentPrompt) return null
    
    // Priority 1: Pasted frame-specific prompts (from paste operations)
    const pastedPrompt = frameType === 'start' || frameType === 'both' 
      ? segment.startFramePrompt 
      : segment.endFramePrompt
    
    if (pastedPrompt) {
      return {
        prompt: pastedPrompt,
        injectedDirection: {
          shotType: segment.shotType || 'medium',
          cameraMovement: segment.cameraMovement || 'static',
          lighting: null,
          emotionalBeat: segment.emotionalBeat || null,
        },
        confidence: 1.0,
      }
    }
    
    // Priority 2: Segment direction keyframe descriptions (from AI Phase 1)
    // These are rich, specific descriptions generated by Gemini during segment analysis
    const segDir = segment.segmentDirection
    if (segDir) {
      const keyframeDesc = (frameType === 'start' || frameType === 'both')
        ? segDir.keyframeStartDescription
        : segDir.keyframeEndDescription
      
      if (keyframeDesc && keyframeDesc.trim().length > 20) {
        // Enrich with environment and color palette if available
        let enrichedPrompt = keyframeDesc.trim()
        
        // Add color palette if not already in the description
        if (segDir.colorPalette && !enrichedPrompt.toLowerCase().includes('color palette')) {
          enrichedPrompt += ` Color palette: ${segDir.colorPalette}.`
        }
        
        // Add DOF if not already specified
        if (segDir.depthOfField && !enrichedPrompt.toLowerCase().includes('dof') && !enrichedPrompt.toLowerCase().includes('depth of field')) {
          enrichedPrompt += ` ${segDir.depthOfField}.`
        }
        
        return {
          prompt: enrichedPrompt,
          injectedDirection: {
            shotType: segDir.shotType || segment.shotType || 'medium',
            cameraMovement: segDir.cameraMovement || segment.cameraMovement || 'static',
            lighting: segDir.lightingMood || null,
            emotionalBeat: segDir.emotionalBeat || segment.emotionalBeat || null,
          },
          confidence: 0.95, // High confidence from AI-generated segment direction
        }
      }
      
      // For no-talent segments, use environment description
      if (segDir.isNoTalent && segDir.environmentDescription && segDir.environmentDescription.trim().length > 20) {
        let envPrompt = segDir.environmentDescription.trim()
        if (segDir.colorPalette) {
          envPrompt += ` Color palette: ${segDir.colorPalette}.`
        }
        envPrompt += ' No people, no human figures. 8K photorealistic, cinematic.'
        
        return {
          prompt: envPrompt,
          injectedDirection: {
            shotType: segDir.shotType || 'wide-shot',
            cameraMovement: segDir.cameraMovement || 'static',
            lighting: segDir.lightingMood || null,
            emotionalBeat: segDir.emotionalBeat || null,
          },
          confidence: 0.90,
        }
      }
    }
    
    // Priority 3: Generic keyframe prompt builder (legacy fallback)
    const keyframeContext: KeyframeContext = {
      segmentIndex,
      transitionType: (segment.transitionType as 'CONTINUE' | 'CUT') || 'CUT',
      previousEndFrameUrl: previousEndFrameUrl || undefined,
      previousShotType: segment.shotType,
      isPanTransition: segment.cameraMovement?.toLowerCase().includes('pan') || false,
    }
    
    try {
      // Phase 11: Build segment content for end frame intelligence
      const segDir = segment.segmentDirection
      const contentForEnd = (frameType === 'end' || frameType === 'both') ? {
        dialogueLines: segment.dialogueLines
          ?.filter(d => d.covered !== false)
          ?.map(d => ({ character: d.character || 'Unknown', text: d.line || '' })),
        cameraMovement: segDir?.cameraMovement || segment.cameraMovement || undefined,
        talentAction: segDir?.talentAction || undefined,
        emotionalArc: segDir?.emotionalBeat 
          ? { start: segDir.emotionalBeat, end: segDir.emotionalBeat }
          : undefined,
        startFrameDescription: segDir?.keyframeStartDescription || undefined,
      } : undefined
      
      return buildKeyframePrompt({
        actionPrompt: segment.actionPrompt || segment.generatedPrompt || '',
        framePosition: frameType === 'both' ? 'start' : frameType,
        duration: segment.endTime - segment.startTime,
        sceneDirection,
        keyframeContext,
        characters: characters.length > 0 ? characters : undefined,
        previousFrameDescription: segment.references?.startFrameDescription || undefined,
        segmentContent: contentForEnd,
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
    
    // Get selected location references
    const selectedLocationRefs = locationReferences.filter(loc => selectedLocationRefIds.includes(loc.id))

    // Build selected characters with wardrobe-specific reference images
    // When a wardrobe is selected and has a fullBody/headshot image, use that instead of the base portrait
    const dialogSelectedCharacters = selectedCharacters.map(c => {
      const charData = characters.find(ch => ch.name === c.name)
      const selectedWardrobeId = selectedWardrobes[c.name]
      const selectedWardrobe = selectedWardrobeId && charData?.wardrobes?.find(w => w.id === selectedWardrobeId)
      
      // Wardrobe image replaces base portrait (same character in correct outfit)
      const wardrobeImageUrl = selectedWardrobe?.fullBodyUrl || selectedWardrobe?.headshotUrl
      
      return {
        ...c,
        referenceImageUrl: wardrobeImageUrl || c.referenceImageUrl,
        wardrobe: selectedWardrobe?.description || c.wardrobe,
      }
    })

    const options: FrameGenerationOptions = {
      segmentId: segment.segmentId,
      frameType,
      customPrompt,
      negativePrompt: buildNegativePrompt(),
      usePreviousEndFrame,
      previousEndFrameUrl: usePreviousEndFrame ? previousEndFrameUrl : undefined,
      // CRITICAL: fromDialog=true means the user explicitly chose which references to include.
      // Empty arrays = user chose NONE. This prevents auto-population from overriding selections.
      fromDialog: true,
      // Pass selected characters — empty array means user deselected all (send no char refs)
      selectedCharacters: dialogSelectedCharacters,
      // Pass selected object references — empty array means user deselected all
      selectedObjectReferences: selectedObjectRefs.map(obj => ({
        id: obj.id,
        name: obj.name,
        imageUrl: obj.imageUrl,
        description: obj.description,
      })),
      // Pass selected location references
      selectedLocationReferences: selectedLocationRefs.map(loc => ({
        id: loc.id,
        name: loc.location,
        imageUrl: loc.imageUrl,
        description: loc.description,
      })),
      // Pass visual setup for prompt construction
      visualSetup: mode === 'guided' ? visualSetup : undefined,
      // Pass art style for generation
      artStyle,
      // Pass model tier and thinking level
      modelTier,
      thinkingLevel,
    }

    onGenerate(options)
  }, [segment, frameType, customPrompt, buildNegativePrompt, usePreviousEndFrame, previousEndFrameUrl, onGenerate, selectedCharacters, characters, selectedWardrobes, objectReferences, selectedObjectRefIds, locationReferences, selectedLocationRefIds, mode, visualSetup, artStyle, modelTier, thinkingLevel])

  if (!segment) return null

  const transitionType = segment.transitionType || 'CUT'
  const canUsePreviousFrame = !!previousEndFrameUrl && (frameType === 'start' || frameType === 'both')

  const isGenerateDisabled = useMemo(() => {
    if (isGenerating) return true
    if (usePreviousEndFrame && frameType === 'start') return false
    
    // In guided mode, there is always some default setup structure (from characters, location, action),
    // so we don't block on customPrompt being empty.
    if (mode === 'guided') return false
    
    // In advanced mode, the custom prompt must have content
    return !customPrompt.trim()
  }, [isGenerating, usePreviousEndFrame, frameType, mode, customPrompt])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
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

          {/* End Frame Content Context Banner */}
          {(frameType === 'end' || frameType === 'both') && segment?.dialogueLines?.length ? (
            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg flex-shrink-0">
              <div className="flex items-start gap-2">
                <Film className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-purple-300">
                  <p className="font-medium mb-1">Content-Aware End Frame</p>
                  <p className="text-purple-400/80">
                    The end frame will reflect {segment.dialogueLines.filter(d => d.covered !== false).length} dialogue line{segment.dialogueLines.filter(d => d.covered !== false).length !== 1 ? 's' : ''} spoken during this segment
                    {segment.segmentDirection?.talentAction ? ` and action: "${segment.segmentDirection.talentAction.substring(0, 60)}"` : ''}.
                    Characters will show appropriate reactions and expressions.
                  </p>
                </div>
              </div>
            </div>
          ) : null}          {/* Visual Setup Tab */}
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

                {/* Location & Setting — Shared Component */}
                <LocationSettingSection
                  visualSetup={visualSetup}
                  onVisualSetupChange={(update) => setVisualSetup(prev => ({ ...prev, ...update }))}
                />

                {/* ===== TALENT COSTUME REFERENCES (moved above Location References) ===== */}
                {/* Always shown when project has characters — collapsed with hint for no-talent segments */}
                {/* Users can still manually attach costume refs to title sequences if desired */}
                <CharacterSelectionSection
                  characters={characters}
                  selectedCharacterNames={selectedCharacterNames}
                  onSelectionChange={setSelectedCharacterNames}
                  selectedWardrobes={selectedWardrobes}
                  onWardrobeChange={(name, wardrobeId) => setSelectedWardrobes(prev => ({ ...prev, [name]: wardrobeId }))}
                  isCollapsed={talentSectionCollapsed}
                  onToggleCollapsed={() => setTalentSectionCollapsed(prev => !prev)}
                  noTalentHint={isNoTalentSegment}
                />

                {/* ===== LOCATION REFERENCES (collapsible) ===== */}
                {locationReferences.length > 0 && (
                  <div className="space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50">
                    {/* Collapsible header */}
                    <button
                      type="button"
                      onClick={() => setLocationSectionCollapsed(prev => !prev)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <MapPin className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-medium text-slate-200 flex-1">Location References</h4>
                      {selectedLocationRefIds.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-0">
                          {selectedLocationRefIds.length} selected
                        </Badge>
                      )}
                      {locationSectionCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {!locationSectionCollapsed && (
                      <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">Select location images for environment/setting consistency</p>
                      <div className="flex items-center gap-2">
                        {autoMatchedLocationRefIds.size > 0 && (
                          <button
                            onClick={() => setSelectedLocationRefIds(
                              locationReferences.filter(l => autoMatchedLocationRefIds.has(l.id)).map(l => l.id)
                            )}
                            className="h-6 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 px-2 rounded"
                          >
                            Select Matched
                          </button>
                        )}
                        {selectedLocationRefIds.length > 0 && (
                          <button
                            onClick={() => setSelectedLocationRefIds([])}
                            className="h-6 text-[10px] text-slate-400 hover:text-slate-300 px-2 rounded"
                          >
                            Unselect All
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {locationReferences.map((loc) => {
                        const isSelected = selectedLocationRefIds.includes(loc.id)
                        const isMatched = autoMatchedLocationRefIds.has(loc.id)
                        return (
                          <button
                            key={loc.id}
                            onClick={() => {
                              setSelectedLocationRefIds(prev =>
                                prev.includes(loc.id)
                                  ? prev.filter(id => id !== loc.id)
                                  : [...prev, loc.id]
                              )
                            }}
                            className={cn(
                              'relative rounded-lg overflow-hidden border-2 transition-all aspect-video',
                              isSelected
                                ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                                : 'border-slate-700 hover:border-slate-500'
                            )}
                          >
                            <img
                              src={loc.imageUrl}
                              alt={loc.location}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {isMatched && !isSelected && (
                              <div className="absolute top-1 left-1">
                                <Badge variant="secondary" className="text-[8px] bg-cyan-500/80 text-white border-0 px-1 py-0">
                                  Match
                                </Badge>
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                              <p className="text-[10px] text-white font-medium truncate">{loc.location}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Selected locations will be included as reference images for visual consistency.
                    </p>
                      </>
                    )}
                  </div>
                )}

                {/* ===== PROPS & OBJECTS (collapsible) ===== */}
                <PropSelectionSection
                  objectReferences={objectReferences}
                  selectedObjectIds={selectedObjectRefIds}
                  onSelectionChange={setSelectedObjectRefIds}
                  autoDetectedObjectIds={autoDetectedObjectIds}
                  isCollapsed={propsSectionCollapsed}
                  onToggleCollapsed={() => setPropsSectionCollapsed(prev => !prev)}
                />

                {/* Camera & Composition — Shared Component */}
                <CameraCompositionSection
                  visualSetup={visualSetup}
                  onVisualSetupChange={(update) => setVisualSetup(prev => ({ ...prev, ...update }))}
                  hasCharacterReferences={hasCharacterReferences}
                />

                {/* Talent Direction — Shared Component (collapsed by default) */}
                <TalentDirectionSection
                  talentDirection={talentDirection}
                  onTalentDirectionChange={(update) => setTalentDirection(prev => ({ ...prev, ...update }))}
                  defaultCollapsed={true}
                />

                {/* Art Style — Shared Component */}
                <ArtStyleGrid
                  artStyle={artStyle}
                  onArtStyleChange={setArtStyle}
                />

                {/* Quality Mode — Shared Component */}
                <QualityModeSection
                  modelTier={modelTier}
                  onModelTierChange={setModelTier}
                  thinkingLevel={thinkingLevel}
                  onThinkingLevelChange={setThinkingLevel}
                />

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

                {/* Quality Mode (Custom Prompt Tab) — Shared Component (compact) */}
                <QualityModeSection
                  modelTier={modelTier}
                  onModelTierChange={setModelTier}
                  thinkingLevel={thinkingLevel}
                  onThinkingLevelChange={setThinkingLevel}
                  compact={true}
                />
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
            disabled={isGenerateDisabled}
            className={cn("gap-2", isGenerateDisabled ? "opacity-50 cursor-not-allowed" : "")}
          >
            <Wand2 className="w-4 h-4" />
            {isGenerating ? 'Generating...' : `Generate ${frameType === 'both' ? 'Frames' : 'Frame'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
