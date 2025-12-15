'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Check, Sparkles, Info, Loader2, Video, Image as ImageIcon, Clock, ArrowRight, Film, Link as LinkIcon, Upload, Camera, Wand2, Library, Users, Box, Clapperboard, X, Plus, MessageSquare } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'
import { SceneSegment, SceneSegmentTake } from './types'
import { VisualReference } from '@/types/visionReferences'
import { cn } from '@/lib/utils'

// ============================================
// Types & Interfaces
// ============================================

export type VideoGenerationMethod = 'T2V' | 'I2V' | 'FTV' | 'EXT' | 'REF'

// Reference selection types
export type ReferenceType = 'scene' | 'character' | 'object'

export interface SelectedReference {
  id: string
  type: ReferenceType
  name: string
  imageUrl: string
  description?: string
  // Connection to prompt - which character or element this reference represents
  promptConnection?: string
}

export interface VideoTakeReference {
  segmentId: string
  segmentIndex: number
  takeId: string
  assetUrl: string
  thumbnailUrl?: string
  lastFrameUrl?: string  // The last frame of the video - required for I2V/EXT mode
  durationSec?: number
}

export interface PromptStructure {
  // Location & Setting
  location: string
  timeOfDay: string
  weather: string
  atmosphere: string
  
  // Camera & Composition
  shotType: string
  cameraAngle: string
  cameraMovement: string
  lensChoice: string
  
  // Lighting
  lighting: string
  lightingMood: string
  
  // Characters & Action
  characters: string[]
  characterActions: string
  talentBlocking: string
  emotionalBeat: string
  keyProps: string
  
  // Style
  artStyle: string
  additionalDetails: string
  negativePrompt: string
}

interface SegmentPromptBuilderProps {
  open: boolean
  onClose: () => void
  segment: SceneSegment
  mode: 'image' | 'video'
  availableCharacters?: Array<{ 
    name: string
    description?: string
    referenceImage?: string
    appearanceDescription?: string
  }>
  sceneImageUrl?: string
  previousSegmentLastFrame?: string | null
  onGenerate: (promptData: GeneratePromptData) => void
  isGenerating?: boolean
  // Enhanced: All segments for accessing takes from any segment
  allSegments?: SceneSegment[]
  // Enhanced: Reference library data
  sceneReferences?: VisualReference[]
  objectReferences?: VisualReference[]
  // Backdrop mode: Pre-fills prompt with scene context for establishing shots
  isBackdropMode?: boolean
  sceneHeading?: string
  sceneDescription?: string
  sceneNarration?: string
}

export interface GeneratePromptData {
  prompt: string
  negativePrompt: string
  mode: 'image' | 'video'
  // Video-specific
  duration?: number
  aspectRatio?: '16:9' | '9:16'
  resolution?: '720p' | '1080p'
  generationMethod?: VideoGenerationMethod
  startFrameUrl?: string
  endFrameUrl?: string
  referenceImages?: Array<{ url: string; type: 'style' | 'character'; name?: string; promptConnection?: string }>
  // Enhanced: Video reference for Extend mode
  videoReferenceUrl?: string
  videoReferenceTakeId?: string
  // Enhanced: Selected references with connections
  selectedReferences?: SelectedReference[]
  // Enhanced: Character dialog guidance
  characterDialogGuidance?: Array<{ characterName: string; referenceImageUrl?: string; dialogLines?: string[] }>
  // Style data
  artStyle?: string
  shotType?: string
  cameraAngle?: string
  cameraMovement?: string
}

// ============================================
// Main Component
// ============================================

export function SegmentPromptBuilder({
  open,
  onClose,
  segment,
  mode,
  availableCharacters = [],
  sceneImageUrl,
  previousSegmentLastFrame,
  onGenerate,
  isGenerating = false,
  allSegments = [],
  sceneReferences = [],
  objectReferences = [],
  isBackdropMode = false,
  sceneHeading,
  sceneDescription,
  sceneNarration,
}: SegmentPromptBuilderProps) {
  const [activeTab, setActiveTab] = useState<'guided' | 'advanced'>('guided')
  
  // Video generation method (only for video mode)
  const [generationMethod, setGenerationMethod] = useState<VideoGenerationMethod>('T2V')
  const [startFrameUrl, setStartFrameUrl] = useState<string | null>(null)
  const [endFrameUrl, setEndFrameUrl] = useState<string | null>(null)
  const [referenceImages, setReferenceImages] = useState<Array<{ url: string; type: 'style' | 'character' }>>([])
  
  // Enhanced: Selected references with prompt connections
  const [selectedReferences, setSelectedReferences] = useState<SelectedReference[]>([])
  const [showReferenceSelector, setShowReferenceSelector] = useState(false)
  const [referenceSelectorContext, setReferenceSelectorContext] = useState<'startFrame' | 'endFrame' | 'reference'>('reference')
  
  // Enhanced: Selected video take for Extend mode
  const [selectedVideoTake, setSelectedVideoTake] = useState<VideoTakeReference | null>(null)
  const [showVideoTakeSelector, setShowVideoTakeSelector] = useState(false)
  
  // Enhanced: Character dialog connections
  const [characterDialogConnections, setCharacterDialogConnections] = useState<Map<string, string>>(new Map())
  
  // Compute all available video takes from all segments
  const allVideoTakes = useMemo((): VideoTakeReference[] => {
    const takes: VideoTakeReference[] = []
    allSegments.forEach((seg) => {
      seg.takes.forEach((take) => {
        if (take.assetUrl && take.status === 'COMPLETE') {
          takes.push({
            segmentId: seg.segmentId,
            segmentIndex: seg.sequenceIndex,
            takeId: take.id,
            assetUrl: take.assetUrl,
            thumbnailUrl: take.thumbnailUrl,
            // For I2V/EXT mode: use thumbnailUrl (which stores lastFrame for videos), 
            // or fall back to segment's endFrameUrl
            lastFrameUrl: take.thumbnailUrl || seg.references.endFrameUrl || undefined,
            durationSec: take.durationSec,
          })
        }
      })
    })
    return takes
  }, [allSegments])

  // Combined reference library for easy selection
  const combinedReferenceLibrary = useMemo(() => {
    const library: Array<{ id: string; type: ReferenceType; name: string; imageUrl: string; description?: string }> = []
    
    // Add scene references
    sceneReferences.forEach(ref => {
      if (ref.imageUrl) {
        library.push({
          id: ref.id,
          type: 'scene',
          name: ref.name,
          imageUrl: ref.imageUrl,
          description: ref.description,
        })
      }
    })
    
    // Add character references
    availableCharacters.forEach(char => {
      if (char.referenceImage) {
        library.push({
          id: `char-${char.name}`,
          type: 'character',
          name: char.name,
          imageUrl: char.referenceImage,
          description: char.description || char.appearanceDescription,
        })
      }
    })
    
    // Add object references
    objectReferences.forEach(ref => {
      if (ref.imageUrl) {
        library.push({
          id: ref.id,
          type: 'object',
          name: ref.name,
          imageUrl: ref.imageUrl,
          description: ref.description,
        })
      }
    })
    
    return library
  }, [sceneReferences, objectReferences, availableCharacters])

  // Handle reference selection from library
  const handleSelectReference = (ref: typeof combinedReferenceLibrary[0]) => {
    if (referenceSelectorContext === 'startFrame') {
      setStartFrameUrl(ref.imageUrl)
    } else if (referenceSelectorContext === 'endFrame') {
      setEndFrameUrl(ref.imageUrl)
    } else {
      // Add to selected references (max 3)
      if (selectedReferences.length < 3 && !selectedReferences.find(r => r.id === ref.id)) {
        setSelectedReferences(prev => [...prev, { ...ref, promptConnection: '' }])
      }
    }
    setShowReferenceSelector(false)
  }

  // Handle video take selection
  const handleSelectVideoTake = (take: VideoTakeReference) => {
    setSelectedVideoTake(take)
    setShowVideoTakeSelector(false)
  }

  // Remove a selected reference
  const handleRemoveReference = (id: string) => {
    setSelectedReferences(prev => prev.filter(r => r.id !== id))
  }

  // Update prompt connection for a reference
  const handleUpdatePromptConnection = (id: string, connection: string) => {
    setSelectedReferences(prev => prev.map(r => r.id === id ? { ...r, promptConnection: connection } : r))
  }

  // Update character dialog connection
  const handleUpdateCharacterDialogConnection = (charName: string, referenceId: string) => {
    setCharacterDialogConnections(prev => new Map(prev).set(charName, referenceId))
  }
  
  // Video settings
  const [duration, setDuration] = useState<number>(8)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')
  
  // Prompt structure
  const [structure, setStructure] = useState<PromptStructure>({
    location: '',
    timeOfDay: 'day',
    weather: 'clear',
    atmosphere: 'neutral',
    shotType: segment.shotType || 'medium-shot',
    cameraAngle: segment.cameraAngle || 'eye-level',
    cameraMovement: segment.cameraMovement || 'static',
    lensChoice: 'standard',
    lighting: 'natural',
    lightingMood: '',
    characters: [],
    characterActions: segment.action || '',
    talentBlocking: '',
    emotionalBeat: '',
    keyProps: '',
    artStyle: 'photorealistic',
    additionalDetails: '',
    negativePrompt: 'blurry, low quality, distorted, poor composition, bad anatomy'
  })
  
  const [advancedPrompt, setAdvancedPrompt] = useState('')
  const [copied, setCopied] = useState(false)

  // Initialize from segment data
  useEffect(() => {
    if (open && segment) {
      // Initialize prompt from segment's generated prompt or user edited prompt
      const initialPrompt = segment.userEditedPrompt || segment.generatedPrompt || ''
      if (initialPrompt) {
        setAdvancedPrompt(initialPrompt)
        // Switch to advanced mode if there's an AI-generated cinematic prompt
        setActiveTab('advanced')
      } else {
        // Reset to guided mode if no AI prompt
        setActiveTab('guided')
      }
      
      // Set generation method from segment metadata
      if (segment.generationMethod) {
        setGenerationMethod(segment.generationMethod as VideoGenerationMethod)
      }
      
      // Set start frame based on segment configuration:
      // 1. For segment 1 with useSceneFrame, use sceneImageUrl
      // 2. For other segments, use previousSegmentLastFrame
      // 3. If segment has references.startFrameUrl, use that
      if (mode === 'video') {
        if (segment.references?.startFrameUrl) {
          setStartFrameUrl(segment.references.startFrameUrl)
        } else if (segment.sequenceIndex === 0 && segment.references?.useSceneFrame && sceneImageUrl) {
          setStartFrameUrl(sceneImageUrl)
          if (!segment.generationMethod) setGenerationMethod('I2V')
        } else if (previousSegmentLastFrame) {
          setStartFrameUrl(previousSegmentLastFrame)
          if (!segment.generationMethod) setGenerationMethod('I2V')
        }
      }
      
      // Parse segment data for structure
      setStructure(prev => ({
        ...prev,
        shotType: segment.shotType || prev.shotType,
        cameraAngle: segment.cameraAngle || prev.cameraAngle,
        cameraMovement: segment.cameraMovement || prev.cameraMovement,
        characterActions: segment.action || prev.characterActions,
        emotionalBeat: segment.emotionalBeat || prev.emotionalBeat,
      }))
      
      // Set duration from segment
      const segmentDuration = Math.round(segment.endTime - segment.startTime)
      if ([4, 6, 8].includes(segmentDuration)) {
        setDuration(segmentDuration as 4 | 6 | 8)
      }
      
      // Backdrop mode: Pre-fill prompt with scene context for establishing shots
      if (isBackdropMode && (sceneHeading || sceneDescription || sceneNarration)) {
        const backdropParts: string[] = []
        
        // Parse location from scene heading (e.g., "INT. COFFEE SHOP - DAY")
        if (sceneHeading) {
          const headingClean = sceneHeading
            .replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*/i, '')
            .replace(/\s*-\s*(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|CONTINUOUS|LATER)$/i, '')
            .trim()
          if (headingClean) {
            backdropParts.push(`Establishing shot of ${headingClean}`)
          }
        }
        
        // Add atmosphere from scene description
        if (sceneDescription) {
          backdropParts.push(sceneDescription.slice(0, 200))
        }
        
        // Create cinematic backdrop prompt
        const backdropPrompt = backdropParts.length > 0
          ? `Cinematic establishing shot. ${backdropParts.join('. ')}. Atmospheric, moody lighting. Slow, gentle camera movement. No people in frame. Perfect for scene transition or narration backdrop.`
          : 'Cinematic establishing shot with atmospheric lighting and gentle camera movement. Perfect for scene transition or narration backdrop.'
        
        setAdvancedPrompt(backdropPrompt)
        setActiveTab('advanced')
        
        // Set structure for guided mode
        setStructure(prev => ({
          ...prev,
          shotType: 'wide-shot',
          cameraMovement: 'slow-push',
          atmosphere: 'cinematic',
          location: sceneHeading?.replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '').replace(/\s*-\s*(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING)$/i, '').trim() || '',
        }))
      }
    }
  }, [open, segment, previousSegmentLastFrame, sceneImageUrl, mode, isBackdropMode, sceneHeading, sceneDescription, sceneNarration])

  // Auto-detect characters from segment
  useEffect(() => {
    if (open && segment && availableCharacters.length > 0) {
      const segmentText = segment.action || segment.subject || ''
      const detectedChars = availableCharacters
        .filter(char => segmentText.toLowerCase().includes(char.name.toLowerCase()))
        .map(char => char.name)
      
      if (detectedChars.length > 0) {
        setStructure(prev => ({ ...prev, characters: detectedChars }))
      }
    }
  }, [open, segment, availableCharacters])

  // Construct prompt from structure
  const constructPrompt = (): string => {
    const parts: string[] = []
    
    // Shot type
    const shotTypes: Record<string, string> = {
      'wide-shot': 'Wide establishing shot',
      'medium-shot': 'Medium shot',
      'medium-close-up': 'Medium close-up shot',
      'close-up': 'Close-up shot',
      'extreme-close-up': 'Extreme close-up shot',
      'extreme-wide': 'Extreme wide shot',
      'over-shoulder': 'Over the shoulder shot'
    }
    if (structure.shotType) parts.push(shotTypes[structure.shotType] || structure.shotType)
    
    // Location
    if (structure.location) parts.push(`of ${structure.location}`)
    
    // Time and weather
    const timeWeather: string[] = []
    if (structure.timeOfDay && structure.timeOfDay !== 'day') {
      const timeLabels: Record<string, string> = {
        'dawn': 'at dawn',
        'day': 'during the day',
        'dusk': 'at dusk',
        'night': 'at night',
        'golden-hour': 'during golden hour'
      }
      timeWeather.push(timeLabels[structure.timeOfDay] || structure.timeOfDay)
    }
    if (structure.weather && structure.weather !== 'clear') timeWeather.push(structure.weather)
    if (timeWeather.length) parts.push(timeWeather.join(', '))
    
    // Characters and actions
    if (structure.characters.length > 0) {
      const charList = structure.characters.join(', ')
      const actionParts: string[] = []
      if (structure.talentBlocking) actionParts.push(structure.talentBlocking)
      if (structure.characterActions) actionParts.push(structure.characterActions)
      
      if (actionParts.length > 0) {
        parts.push(`featuring ${charList} - ${actionParts.join(', ')}`)
      } else {
        parts.push(`featuring ${charList}`)
      }
    }
    
    // Emotional beat
    if (structure.emotionalBeat) parts.push(`conveying ${structure.emotionalBeat}`)
    
    // Atmosphere
    if (structure.atmosphere && structure.atmosphere !== 'neutral') {
      parts.push(`${structure.atmosphere} atmosphere`)
    }
    
    // Camera angle
    const angles: Record<string, string> = {
      'eye-level': 'eye level camera angle',
      'low-angle': 'low angle camera',
      'high-angle': 'high angle camera',
      'birds-eye': "bird's eye view",
      'dutch-angle': 'dutch angle'
    }
    if (structure.cameraAngle && structure.cameraAngle !== 'eye-level') {
      parts.push(angles[structure.cameraAngle] || structure.cameraAngle)
    }
    
    // Camera movement (video only)
    if (mode === 'video' && structure.cameraMovement && structure.cameraMovement !== 'static') {
      parts.push(`${structure.cameraMovement} camera movement`)
    }
    
    // Lens choice
    if (structure.lensChoice && structure.lensChoice !== 'standard') {
      parts.push(`shot with ${structure.lensChoice}`)
    }
    
    // Lighting
    const lightingTypes: Record<string, string> = {
      'natural': 'natural lighting',
      'golden-hour': 'golden hour lighting',
      'dramatic': 'dramatic cinematic lighting',
      'soft': 'soft diffused lighting',
      'harsh': 'harsh contrast lighting',
      'backlit': 'backlit scene'
    }
    if (structure.lighting) parts.push(lightingTypes[structure.lighting] || structure.lighting)
    
    // Lighting mood
    if (structure.lightingMood) parts.push(`${structure.lightingMood} mood`)
    
    // Key props
    if (structure.keyProps) parts.push(`with ${structure.keyProps}`)
    
    // Additional details
    if (structure.additionalDetails) parts.push(structure.additionalDetails)
    
    // Art style
    const stylePreset = artStylePresets.find(s => s.id === structure.artStyle)
    if (stylePreset) parts.push(stylePreset.promptSuffix)
    
    return parts.filter(Boolean).join(', ')
  }

  const getRawPrompt = (): string => {
    return activeTab === 'advanced' ? advancedPrompt : constructPrompt()
  }

  const handleGenerate = () => {
    const rawPrompt = getRawPrompt()
    
    const promptData: GeneratePromptData = {
      prompt: rawPrompt,
      negativePrompt: structure.negativePrompt,
      mode,
      artStyle: structure.artStyle,
      shotType: structure.shotType,
      cameraAngle: structure.cameraAngle,
      cameraMovement: structure.cameraMovement
    }
    
    // Add video-specific data
    if (mode === 'video') {
      promptData.duration = duration
      promptData.aspectRatio = aspectRatio
      promptData.resolution = resolution
      promptData.generationMethod = generationMethod
      
      if (generationMethod === 'I2V' && startFrameUrl) {
        promptData.startFrameUrl = startFrameUrl
      }
      
      if (generationMethod === 'FTV') {
        if (startFrameUrl) promptData.startFrameUrl = startFrameUrl
        if (endFrameUrl) promptData.endFrameUrl = endFrameUrl
      }
      
      if (generationMethod === 'EXT') {
        // Enhanced: Use selected video take or fallback to previous segment last frame
        if (selectedVideoTake) {
          promptData.videoReferenceUrl = selectedVideoTake.assetUrl
          promptData.videoReferenceTakeId = selectedVideoTake.takeId
          // Use the last frame (image) from the video take, NOT the video URL itself
          // The Veo API requires an image for I2V/EXT mode, not a video file
          promptData.startFrameUrl = selectedVideoTake.lastFrameUrl || selectedVideoTake.thumbnailUrl || previousSegmentLastFrame
        } else if (previousSegmentLastFrame) {
          promptData.startFrameUrl = previousSegmentLastFrame
        }
      }
      
      if (generationMethod === 'REF') {
        // Enhanced: Use selected references with prompt connections
        if (selectedReferences.length > 0) {
          promptData.referenceImages = selectedReferences.map(ref => ({
            url: ref.imageUrl,
            type: ref.type === 'character' ? 'character' : 'style',
            name: ref.name,
            promptConnection: ref.promptConnection,
          }))
          promptData.selectedReferences = selectedReferences
        } else if (referenceImages.length > 0) {
          promptData.referenceImages = referenceImages
        }
        if (startFrameUrl) promptData.startFrameUrl = startFrameUrl
      }
      
      // Enhanced: Add character dialog guidance
      const dialogGuidance = structure.characters
        .map(charName => {
          const char = availableCharacters.find(c => c.name === charName)
          const connectedRefId = characterDialogConnections.get(charName)
          const connectedRef = connectedRefId ? selectedReferences.find(r => r.id === connectedRefId) : null
          return {
            characterName: charName,
            referenceImageUrl: char?.referenceImage || connectedRef?.imageUrl,
            dialogLines: segment.action?.includes(charName) ? [segment.action] : undefined,
          }
        })
        .filter(g => g.referenceImageUrl)
      
      if (dialogGuidance.length > 0) {
        promptData.characterDialogGuidance = dialogGuidance
      }
    }
    
    onGenerate(promptData)
    onClose()
  }

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(getRawPrompt())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const constructedPrompt = getRawPrompt()

  // Method labels for video generation
  const methodLabels: Record<VideoGenerationMethod, { label: string; description: string; icon: React.ReactNode }> = {
    'T2V': { 
      label: 'Text-to-Video', 
      description: 'Generate video from text prompt only',
      icon: <Video className="w-4 h-4" />
    },
    'I2V': { 
      label: 'Image-to-Video', 
      description: 'Animate from a start frame image',
      icon: <Camera className="w-4 h-4" />
    },
    'FTV': { 
      label: 'Frame-to-Video', 
      description: 'Use start frame and optional end frame',
      icon: <ArrowRight className="w-4 h-4" />
    },
    'EXT': { 
      label: 'Extend', 
      description: 'Continue from previous segment\'s last frame',
      icon: <Film className="w-4 h-4" />
    },
    'REF': { 
      label: 'Reference Images', 
      description: 'Use up to 3 reference images for style/character',
      icon: <Wand2 className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] bg-gray-900 text-white border-gray-700 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white">
            {mode === 'video' ? <Video className="w-5 h-5 text-blue-400" /> : <ImageIcon className="w-5 h-5 text-purple-400" />}
            {mode === 'video' ? 'Video Prompt Builder' : 'Image Prompt Builder'}
            <span className="text-sm font-normal text-gray-400 ml-2">
              Segment {segment.sequenceIndex + 1} · {(segment.endTime - segment.startTime).toFixed(1)}s
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {/* Video Generation Method Selector */}
          {mode === 'video' && (
            <div className="mb-4 p-4 rounded-lg border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <Film className="w-4 h-4" />
                Generation Method
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(Object.keys(methodLabels) as VideoGenerationMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => setGenerationMethod(method)}
                    className={cn(
                      'p-3 rounded-lg border transition-all text-left',
                      generationMethod === method
                        ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500'
                        : 'border-gray-700 hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {methodLabels[method].icon}
                      <span className="text-sm font-medium">{methodLabels[method].label}</span>
                    </div>
                    <div className="text-[10px] text-gray-400">{methodLabels[method].description}</div>
                  </button>
                ))}
              </div>
              
              {/* Frame Selectors based on method */}
              {generationMethod === 'I2V' && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Start Frame</label>
                    <button
                      onClick={() => { setReferenceSelectorContext('startFrame'); setShowReferenceSelector(true) }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Library className="w-3 h-3" /> Browse Library
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {previousSegmentLastFrame && (
                      <button
                        onClick={() => setStartFrameUrl(previousSegmentLastFrame)}
                        className={cn(
                          'aspect-video rounded-lg border overflow-hidden relative',
                          startFrameUrl === previousSegmentLastFrame ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-700 hover:border-gray-600'
                        )}
                      >
                        <img src={previousSegmentLastFrame} alt="Previous frame" className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">Previous</div>
                      </button>
                    )}
                    {sceneImageUrl && (
                      <button
                        onClick={() => setStartFrameUrl(sceneImageUrl)}
                        className={cn(
                          'aspect-video rounded-lg border overflow-hidden relative',
                          startFrameUrl === sceneImageUrl ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-700 hover:border-gray-600'
                        )}
                      >
                        <img src={sceneImageUrl} alt="Scene image" className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">Scene</div>
                      </button>
                    )}
                    {/* Show character reference images */}
                    {availableCharacters.filter(c => c.referenceImage).slice(0, 2).map(char => (
                      <button
                        key={char.name}
                        onClick={() => setStartFrameUrl(char.referenceImage!)}
                        className={cn(
                          'aspect-video rounded-lg border overflow-hidden relative',
                          startFrameUrl === char.referenceImage ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-700 hover:border-gray-600'
                        )}
                      >
                        <img src={char.referenceImage} alt={char.name} className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" /> {char.name}
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => { setReferenceSelectorContext('startFrame'); setShowReferenceSelector(true) }}
                      className="aspect-video rounded-lg border border-dashed border-gray-700 flex flex-col items-center justify-center hover:border-gray-600 cursor-pointer"
                    >
                      <Library className="w-5 h-5 text-gray-500 mb-1" />
                      <span className="text-[10px] text-gray-500">Library</span>
                    </button>
                  </div>
                  {startFrameUrl && !previousSegmentLastFrame?.includes(startFrameUrl) && !sceneImageUrl?.includes(startFrameUrl) && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="aspect-video w-24 rounded-lg border border-blue-500 overflow-hidden">
                        <img src={startFrameUrl} alt="Selected" className="w-full h-full object-cover" />
                      </div>
                      <button onClick={() => setStartFrameUrl(null)} className="text-xs text-red-400 hover:text-red-300">Clear</button>
                    </div>
                  )}
                </div>
              )}
              
              {generationMethod === 'FTV' && (
                <div className="mt-4">
                  <div className="text-xs text-blue-400 mb-3">Start frame required. End frame optional for controlled transitions.</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400">Start Frame <span className="text-red-400">*</span></label>
                        <button
                          onClick={() => { setReferenceSelectorContext('startFrame'); setShowReferenceSelector(true) }}
                          className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Library className="w-3 h-3" /> Library
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {previousSegmentLastFrame && (
                          <button
                            onClick={() => setStartFrameUrl(previousSegmentLastFrame)}
                            className={cn(
                              'aspect-video rounded-lg border overflow-hidden relative',
                              startFrameUrl === previousSegmentLastFrame ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-700 hover:border-gray-600'
                            )}
                          >
                            <img src={previousSegmentLastFrame} alt="Previous frame" className="w-full h-full object-cover" />
                            <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">Previous</div>
                          </button>
                        )}
                        {sceneImageUrl && (
                          <button
                            onClick={() => setStartFrameUrl(sceneImageUrl)}
                            className={cn(
                              'aspect-video rounded-lg border overflow-hidden relative',
                              startFrameUrl === sceneImageUrl ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-700 hover:border-gray-600'
                            )}
                          >
                            <img src={sceneImageUrl} alt="Scene image" className="w-full h-full object-cover" />
                            <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">Scene</div>
                          </button>
                        )}
                        <button
                          onClick={() => { setReferenceSelectorContext('startFrame'); setShowReferenceSelector(true) }}
                          className="aspect-video rounded-lg border border-dashed border-gray-700 flex flex-col items-center justify-center hover:border-gray-600 cursor-pointer"
                        >
                          <Library className="w-5 h-5 text-gray-500 mb-1" />
                          <span className="text-[10px] text-gray-500">Browse</span>
                        </button>
                      </div>
                      {startFrameUrl && (
                        <div className="aspect-video rounded-lg border border-blue-500 overflow-hidden relative">
                          <img src={startFrameUrl} alt="Selected start" className="w-full h-full object-cover" />
                          <button onClick={() => setStartFrameUrl(null)} className="absolute top-1 right-1 p-1 bg-black/60 rounded hover:bg-black/80">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400">End Frame <span className="text-gray-600">(optional)</span></label>
                        <button
                          onClick={() => { setReferenceSelectorContext('endFrame'); setShowReferenceSelector(true) }}
                          className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Library className="w-3 h-3" /> Library
                        </button>
                      </div>
                      <button
                        onClick={() => { setReferenceSelectorContext('endFrame'); setShowReferenceSelector(true) }}
                        className="w-full aspect-video rounded-lg border border-dashed border-gray-700 flex flex-col items-center justify-center hover:border-gray-600 cursor-pointer"
                      >
                        {endFrameUrl ? (
                          <div className="relative w-full h-full">
                            <img src={endFrameUrl} alt="End" className="w-full h-full object-cover rounded-lg" />
                            <button onClick={(e) => { e.stopPropagation(); setEndFrameUrl(null) }} className="absolute top-1 right-1 p-1 bg-black/60 rounded hover:bg-black/80">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Library className="w-6 h-6 text-gray-500 mb-1" />
                            <span className="text-xs text-gray-500">Select End Frame</span>
                            <span className="text-[10px] text-gray-600">From library or upload</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {generationMethod === 'EXT' && (
                <div className="mt-4">
                  <div className="text-xs text-green-400 mb-3 flex items-center justify-between">
                    <span>Select a video take to extend from any segment</span>
                    <button
                      onClick={() => setShowVideoTakeSelector(true)}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Clapperboard className="w-3 h-3" /> Browse All Takes
                    </button>
                  </div>
                  
                  {/* Selected Video Take */}
                  {selectedVideoTake ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400">Selected Video Reference</label>
                        <button onClick={() => setSelectedVideoTake(null)} className="text-xs text-red-400 hover:text-red-300">Clear</button>
                      </div>
                      <div className="relative aspect-video max-w-sm rounded-lg border border-green-500 overflow-hidden bg-black">
                        <video 
                          src={selectedVideoTake.assetUrl} 
                          className="w-full h-full object-contain"
                          controls
                          muted
                        />
                        <div className="absolute top-2 left-2 text-[10px] bg-green-500/80 px-2 py-0.5 rounded">
                          Segment {selectedVideoTake.segmentIndex + 1} · Take
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500">This video will be used as the reference for extension</div>
                    </div>
                  ) : previousSegmentLastFrame ? (
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">Or use Previous Segment Last Frame (default)</label>
                      <div className="aspect-video max-w-xs rounded-lg border border-green-500/50 overflow-hidden">
                        <img src={previousSegmentLastFrame} alt="Previous segment last frame" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-[10px] text-gray-500">Select a video take above for better continuity</div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                      <div className="text-sm text-yellow-400 font-medium">No video takes available</div>
                      <div className="text-xs text-gray-400 mt-1">Generate some video takes first, then use Extend mode.</div>
                    </div>
                  )}
                  
                  {/* Quick Video Take Grid */}
                  {allVideoTakes.length > 0 && (
                    <div className="mt-3">
                      <label className="text-xs text-gray-400 mb-2 block">Recent Video Takes</label>
                      <div className="grid grid-cols-4 gap-2">
                        {allVideoTakes.slice(0, 4).map(take => (
                          <button
                            key={take.takeId}
                            onClick={() => setSelectedVideoTake(take)}
                            className={cn(
                              'aspect-video rounded-lg border overflow-hidden relative bg-black',
                              selectedVideoTake?.takeId === take.takeId ? 'border-green-500 ring-2 ring-green-500' : 'border-gray-700 hover:border-gray-600'
                            )}
                          >
                            {take.thumbnailUrl ? (
                              <img src={take.thumbnailUrl} alt="Take" className="w-full h-full object-cover" />
                            ) : (
                              <video src={take.assetUrl} className="w-full h-full object-cover" muted />
                            )}
                            <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">
                              Seg {take.segmentIndex + 1}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {generationMethod === 'REF' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400">Reference Images (max 3)</label>
                    <button
                      onClick={() => { setReferenceSelectorContext('reference'); setShowReferenceSelector(true) }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Library className="w-3 h-3" /> Browse Library
                    </button>
                  </div>
                  
                  {/* Selected References with Prompt Connections */}
                  {selectedReferences.length > 0 && (
                    <div className="space-y-3 mb-3">
                      {selectedReferences.map((ref, idx) => (
                        <div key={ref.id} className="flex gap-3 p-2 rounded-lg border border-gray-700 bg-gray-800/50">
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover rounded" />
                            <button 
                              onClick={() => handleRemoveReference(ref.id)}
                              className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full hover:bg-red-600"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                            <div className={cn(
                              "absolute bottom-0 left-0 right-0 text-[8px] text-center py-0.5 rounded-b",
                              ref.type === 'character' ? 'bg-purple-500/80' : ref.type === 'scene' ? 'bg-blue-500/80' : 'bg-amber-500/80'
                            )}>
                              {ref.type === 'character' ? <Users className="w-2 h-2 inline mr-0.5" /> : ref.type === 'scene' ? <ImageIcon className="w-2 h-2 inline mr-0.5" /> : <Box className="w-2 h-2 inline mr-0.5" />}
                              {ref.type}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{ref.name}</div>
                            <div className="mt-1">
                              <Input
                                value={ref.promptConnection || ''}
                                onChange={(e) => handleUpdatePromptConnection(ref.id, e.target.value)}
                                placeholder={`How should "${ref.name}" appear in the video?`}
                                className="h-7 text-xs bg-gray-900 border-gray-600"
                              />
                              <div className="text-[9px] text-gray-500 mt-0.5">
                                <LinkIcon className="w-2.5 h-2.5 inline mr-0.5" />
                                Connect this reference to elements in your prompt
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Reference Slots */}
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2].map((idx) => {
                      const ref = selectedReferences[idx]
                      return (
                        <button
                          key={idx}
                          onClick={() => { setReferenceSelectorContext('reference'); setShowReferenceSelector(true) }}
                          disabled={!!ref}
                          className={cn(
                            "aspect-square rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all",
                            ref 
                              ? 'border-blue-500 bg-blue-500/10 cursor-default' 
                              : 'border-dashed border-gray-700 hover:border-gray-600'
                          )}
                        >
                          {ref ? (
                            <div className="relative w-full h-full">
                              <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover rounded-lg" />
                              <div className="absolute bottom-1 left-1 text-[8px] bg-black/60 px-1 py-0.5 rounded truncate max-w-[90%]">{ref.name}</div>
                            </div>
                          ) : (
                            <>
                              <Plus className="w-5 h-5 text-gray-500 mb-1" />
                              <span className="text-[10px] text-gray-500">Ref {idx + 1}</span>
                            </>
                          )}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => { setReferenceSelectorContext('startFrame'); setShowReferenceSelector(true) }}
                      className="aspect-square rounded-lg border border-gray-700 flex flex-col items-center justify-center text-[10px] text-gray-500 hover:border-gray-600"
                    >
                      {startFrameUrl ? (
                        <div className="relative w-full h-full">
                          <img src={startFrameUrl} alt="Start" className="w-full h-full object-cover rounded-lg" />
                          <div className="absolute bottom-1 left-1 text-[8px] bg-black/60 px-1 py-0.5 rounded">Start</div>
                        </div>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mb-0.5" />
                          <span>+ Start Frame</span>
                          <span className="text-gray-600">(optional)</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Character Dialog Guidance */}
                  {structure.characters.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-purple-400" />
                        <label className="text-xs text-purple-300 font-medium">Character Dialog Guidance</label>
                      </div>
                      <div className="text-[10px] text-gray-400 mb-2">Connect characters to reference images for accurate dialog delivery</div>
                      <div className="space-y-2">
                        {structure.characters.map(charName => {
                          const char = availableCharacters.find(c => c.name === charName)
                          const connectedRefId = characterDialogConnections.get(charName)
                          return (
                            <div key={charName} className="flex items-center gap-2">
                              {char?.referenceImage && (
                                <img src={char.referenceImage} alt={charName} className="w-8 h-8 rounded-full object-cover border border-purple-500/50" />
                              )}
                              <span className="text-xs text-white flex-shrink-0">{charName}</span>
                              <Select 
                                value={connectedRefId || 'auto'} 
                                onValueChange={(v) => handleUpdateCharacterDialogConnection(charName, v)}
                              >
                                <SelectTrigger className="h-7 text-xs flex-1">
                                  <SelectValue placeholder="Auto-detect" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auto">Auto-detect from prompt</SelectItem>
                                  {selectedReferences.filter(r => r.type === 'character').map(ref => (
                                    <SelectItem key={ref.id} value={ref.id}>{ref.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Video Settings */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Duration</label>
                  <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v) as 4 | 6 | 8)}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 seconds</SelectItem>
                      <SelectItem value="6">6 seconds</SelectItem>
                      <SelectItem value="8">8 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Aspect Ratio</label>
                  <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as '16:9' | '9:16')}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                      <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Resolution</label>
                  <Select value={resolution} onValueChange={(v) => setResolution(v as '720p' | '1080p')}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p</SelectItem>
                      <SelectItem value="1080p">1080p</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'guided' | 'advanced')}>
            <TabsList className="w-full">
              <TabsTrigger value="guided" className="flex-1">Guided Mode</TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">Advanced Mode</TabsTrigger>
            </TabsList>

            {/* Guided Mode */}
            <TabsContent value="guided" className="space-y-4 mt-4">
              {/* Location & Setting */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Location & Setting</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-400">Location/Setting</label>
                    <Input
                      value={structure.location}
                      onChange={(e) => setStructure(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="beach at sunrise, urban street, mountain peak"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400">Time of Day</label>
                      <Select value={structure.timeOfDay} onValueChange={(v) => setStructure(prev => ({ ...prev, timeOfDay: v }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dawn">Dawn</SelectItem>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="dusk">Dusk</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                          <SelectItem value="golden-hour">Golden Hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Weather</label>
                      <Select value={structure.weather} onValueChange={(v) => setStructure(prev => ({ ...prev, weather: v }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clear">Clear</SelectItem>
                          <SelectItem value="overcast">Overcast</SelectItem>
                          <SelectItem value="rainy">Rainy</SelectItem>
                          <SelectItem value="stormy">Stormy</SelectItem>
                          <SelectItem value="foggy">Foggy</SelectItem>
                          <SelectItem value="snowy">Snowy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Atmosphere/Mood</label>
                    <Select value={structure.atmosphere} onValueChange={(v) => setStructure(prev => ({ ...prev, atmosphere: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="serene">Serene</SelectItem>
                        <SelectItem value="tense">Tense</SelectItem>
                        <SelectItem value="mysterious">Mysterious</SelectItem>
                        <SelectItem value="energetic">Energetic</SelectItem>
                        <SelectItem value="melancholic">Melancholic</SelectItem>
                        <SelectItem value="hopeful">Hopeful</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Characters */}
              {availableCharacters.length > 0 && (
                <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                  <h3 className="text-sm font-semibold text-gray-200">Characters in Scene</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-400">Select Characters</label>
                      <div className="mt-1 space-y-2">
                        {availableCharacters.map(char => (
                          <label 
                            key={char.name} 
                            className={cn(
                              'flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors',
                              structure.characters.includes(char.name)
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-700 hover:border-gray-600'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={structure.characters.includes(char.name)}
                              onChange={(e) => {
                                setStructure(prev => ({
                                  ...prev,
                                  characters: e.target.checked
                                    ? [...prev.characters, char.name]
                                    : prev.characters.filter(n => n !== char.name)
                                }))
                              }}
                              className="rounded"
                            />
                            {char.referenceImage && (
                              <img
                                src={char.referenceImage}
                                alt={char.name}
                                className="w-8 h-8 rounded-full object-cover border border-gray-600"
                              />
                            )}
                            <div className="flex-1">
                              <div className="text-sm text-gray-200">{char.name}</div>
                              {char.referenceImage && (
                                <div className="text-[10px] text-green-400">✓ Has reference</div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">What are they doing?</label>
                      <Input
                        value={structure.characterActions}
                        onChange={(e) => setStructure(prev => ({ ...prev, characterActions: e.target.value }))}
                        placeholder="walking along the shore, engaged in conversation"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Camera & Composition */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Camera & Composition 🎬</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Shot Type</label>
                    <Select value={structure.shotType} onValueChange={(v) => setStructure(prev => ({ ...prev, shotType: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="extreme-close-up">Extreme Close-Up (ECU)</SelectItem>
                        <SelectItem value="close-up">Close-Up (CU)</SelectItem>
                        <SelectItem value="medium-close-up">Medium Close-Up (MCU)</SelectItem>
                        <SelectItem value="medium-shot">Medium Shot (MS)</SelectItem>
                        <SelectItem value="over-shoulder">Over Shoulder</SelectItem>
                        <SelectItem value="wide-shot">Wide Shot (WS)</SelectItem>
                        <SelectItem value="extreme-wide">Extreme Wide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Camera Angle</label>
                    <Select value={structure.cameraAngle} onValueChange={(v) => setStructure(prev => ({ ...prev, cameraAngle: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eye-level">Eye Level</SelectItem>
                        <SelectItem value="low-angle">Low Angle</SelectItem>
                        <SelectItem value="high-angle">High Angle</SelectItem>
                        <SelectItem value="birds-eye">Bird's Eye</SelectItem>
                        <SelectItem value="dutch-angle">Dutch Angle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Camera Movement</label>
                    <Select value={structure.cameraMovement} onValueChange={(v) => setStructure(prev => ({ ...prev, cameraMovement: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Static</SelectItem>
                        <SelectItem value="handheld">Handheld</SelectItem>
                        <SelectItem value="steadicam">Steadicam</SelectItem>
                        <SelectItem value="dolly-in">Dolly In</SelectItem>
                        <SelectItem value="dolly-out">Dolly Out</SelectItem>
                        <SelectItem value="pan-left">Pan Left</SelectItem>
                        <SelectItem value="pan-right">Pan Right</SelectItem>
                        <SelectItem value="tilt-up">Tilt Up</SelectItem>
                        <SelectItem value="tilt-down">Tilt Down</SelectItem>
                        <SelectItem value="crane-shot">Crane Shot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Lens Choice</label>
                    <Select value={structure.lensChoice} onValueChange={(v) => setStructure(prev => ({ ...prev, lensChoice: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (50mm)</SelectItem>
                        <SelectItem value="wide-angle">Wide-Angle (24mm)</SelectItem>
                        <SelectItem value="telephoto">Telephoto (85mm+)</SelectItem>
                        <SelectItem value="macro">Macro</SelectItem>
                        <SelectItem value="anamorphic">Anamorphic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Lighting</label>
                    <Select value={structure.lighting} onValueChange={(v) => setStructure(prev => ({ ...prev, lighting: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural">Natural</SelectItem>
                        <SelectItem value="golden-hour">Golden Hour</SelectItem>
                        <SelectItem value="dramatic">Dramatic</SelectItem>
                        <SelectItem value="soft">Soft Diffused</SelectItem>
                        <SelectItem value="harsh">Harsh Contrast</SelectItem>
                        <SelectItem value="backlit">Backlit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Lighting Mood</label>
                    <Input
                      value={structure.lightingMood}
                      onChange={(e) => setStructure(prev => ({ ...prev, lightingMood: e.target.value }))}
                      placeholder="e.g., High-Key, Low-Key, Film Noir"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Talent Direction */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Talent Direction 🎭</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-400">Blocking/Positioning</label>
                    <Input
                      value={structure.talentBlocking}
                      onChange={(e) => setStructure(prev => ({ ...prev, talentBlocking: e.target.value }))}
                      placeholder="e.g., Actor A at window, Actor B enters from left"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Emotional Beat</label>
                    <Input
                      value={structure.emotionalBeat}
                      onChange={(e) => setStructure(prev => ({ ...prev, emotionalBeat: e.target.value }))}
                      placeholder="e.g., Convey anxiety, Moment of realization"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Key Props</label>
                    <Input
                      value={structure.keyProps}
                      onChange={(e) => setStructure(prev => ({ ...prev, keyProps: e.target.value }))}
                      placeholder="e.g., steaming coffee mug, flickering neon sign"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Art Style */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Art Style 🎨</h3>
                <div className="grid grid-cols-5 gap-2">
                  {artStylePresets.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setStructure(prev => ({ ...prev, artStyle: style.id }))}
                      className={cn(
                        'p-2 rounded border transition-all',
                        structure.artStyle === style.id
                          ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      )}
                      title={style.description}
                    >
                      <div className="aspect-square bg-gray-700 rounded mb-1 flex items-center justify-center overflow-hidden">
                        {style.thumbnail ? (
                          <img src={style.thumbnail} alt={style.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl text-gray-400">{style.name[0]}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-300 truncate">{style.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Additional Details</h3>
                <Textarea
                  value={structure.additionalDetails}
                  onChange={(e) => setStructure(prev => ({ ...prev, additionalDetails: e.target.value }))}
                  placeholder="Add any specific details: props, visual effects, special elements..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </TabsContent>

            {/* Advanced Mode */}
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400">Custom Prompt</label>
                </div>
                <Textarea
                  value={advancedPrompt || constructPrompt()}
                  onChange={(e) => setAdvancedPrompt(e.target.value)}
                  rows={12}
                  placeholder="Enter your custom prompt here..."
                  className="resize-vertical"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Edit the prompt directly. The API will optimize it with safety filters.
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Negative Prompt</label>
                <Textarea
                  value={structure.negativePrompt}
                  onChange={(e) => setStructure(prev => ({ ...prev, negativePrompt: e.target.value }))}
                  rows={3}
                  placeholder="blurry, low quality, distorted, poor composition..."
                  className="resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">
              {activeTab === 'guided' ? 'Prompt Preview' : 'Custom Prompt'}
              {mode === 'video' && ` · ${methodLabels[generationMethod].label}`}
            </label>
          </div>
          <div className="text-sm text-gray-200 p-2 bg-gray-800 rounded border border-gray-700 max-h-24 overflow-y-auto leading-relaxed">
            {constructedPrompt || <span className="text-gray-500 italic">Fill in the fields above to build your prompt...</span>}
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className={cn(
                "flex-1 disabled:opacity-50 disabled:cursor-not-allowed",
                mode === 'video' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate {mode === 'video' ? 'Video' : 'Image'}
                </>
              )}
            </Button>
            <Button onClick={handleCopy} variant="outline" className="px-3">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center rounded-lg">
            <div className={cn(
              "border-2 rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-sm",
              mode === 'video' ? 'border-blue-500 bg-gray-900' : 'border-purple-500 bg-gray-900'
            )}>
              <div className="relative mb-4">
                <Loader2 className={cn("w-16 h-16 animate-spin", mode === 'video' ? 'text-blue-500' : 'text-purple-500')} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={cn("w-12 h-12 rounded-full border-4 animate-pulse", mode === 'video' ? 'border-blue-300' : 'border-purple-300')}></div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Generating {mode === 'video' ? 'Video' : 'Image'}
              </h3>
              <p className="text-sm text-gray-300 text-center">
                {mode === 'video' ? 'Creating your video clip...' : 'Creating your scene visualization...'}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {mode === 'video' ? 'This may take 1-3 minutes' : 'This may take 10-15 seconds'}
              </p>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Reference Library Selector Dialog */}
      <Dialog open={showReferenceSelector} onOpenChange={setShowReferenceSelector}>
        <DialogContent className="max-w-2xl max-h-[70vh] bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Library className="w-5 h-5 text-blue-400" />
              Select from Reference Library
              <span className="text-sm font-normal text-gray-400 ml-2">
                {referenceSelectorContext === 'startFrame' ? 'Start Frame' : referenceSelectorContext === 'endFrame' ? 'End Frame' : 'Reference Image'}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="h-[50vh] overflow-y-auto pr-4">
            {combinedReferenceLibrary.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Library className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No reference images available</p>
                <p className="text-xs mt-1">Add scene images, character references, or object references to your project</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Characters Section */}
                {combinedReferenceLibrary.filter(r => r.type === 'character').length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Characters
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {combinedReferenceLibrary.filter(r => r.type === 'character').map(ref => (
                        <button
                          key={ref.id}
                          onClick={() => handleSelectReference(ref)}
                          className="group relative aspect-square rounded-lg border border-gray-700 overflow-hidden hover:border-purple-500 transition-all"
                        >
                          <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-0 left-0 right-0 p-1.5 text-left">
                            <div className="text-[10px] text-white font-medium truncate">{ref.name}</div>
                          </div>
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-5 h-5 text-white bg-purple-500 rounded-full p-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Scenes Section */}
                {combinedReferenceLibrary.filter(r => r.type === 'scene').length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" /> Scene References
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {combinedReferenceLibrary.filter(r => r.type === 'scene').map(ref => (
                        <button
                          key={ref.id}
                          onClick={() => handleSelectReference(ref)}
                          className="group relative aspect-video rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500 transition-all"
                        >
                          <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-0 left-0 right-0 p-1.5 text-left">
                            <div className="text-[10px] text-white font-medium truncate">{ref.name}</div>
                            {ref.description && <div className="text-[9px] text-gray-300 truncate">{ref.description}</div>}
                          </div>
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-5 h-5 text-white bg-blue-500 rounded-full p-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Objects Section */}
                {combinedReferenceLibrary.filter(r => r.type === 'object').length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1">
                      <Box className="w-3.5 h-3.5" /> Object References
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {combinedReferenceLibrary.filter(r => r.type === 'object').map(ref => (
                        <button
                          key={ref.id}
                          onClick={() => handleSelectReference(ref)}
                          className="group relative aspect-square rounded-lg border border-gray-700 overflow-hidden hover:border-amber-500 transition-all"
                        >
                          <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-0 left-0 right-0 p-1.5 text-left">
                            <div className="text-[10px] text-white font-medium truncate">{ref.name}</div>
                          </div>
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-5 h-5 text-white bg-amber-500 rounded-full p-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
            <Button variant="outline" onClick={() => setShowReferenceSelector(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Take Selector Dialog */}
      <Dialog open={showVideoTakeSelector} onOpenChange={setShowVideoTakeSelector}>
        <DialogContent className="max-w-3xl max-h-[70vh] bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Clapperboard className="w-5 h-5 text-green-400" />
              Select Video Take
              <span className="text-sm font-normal text-gray-400 ml-2">
                Choose a video take to extend from
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="h-[50vh] overflow-y-auto pr-4">
            {allVideoTakes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No video takes available</p>
                <p className="text-xs mt-1">Generate some video segments first to use Extend mode</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group by segment */}
                {Array.from(new Set(allVideoTakes.map(t => t.segmentIndex))).sort((a, b) => a - b).map(segIdx => {
                  const segmentTakes = allVideoTakes.filter(t => t.segmentIndex === segIdx)
                  return (
                    <div key={segIdx}>
                      <h3 className="text-xs font-semibold text-green-400 mb-2">
                        Segment {segIdx + 1}
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {segmentTakes.map(take => (
                          <button
                            key={take.takeId}
                            onClick={() => handleSelectVideoTake(take)}
                            className={cn(
                              "group relative aspect-video rounded-lg border overflow-hidden transition-all bg-black",
                              selectedVideoTake?.takeId === take.takeId 
                                ? 'border-green-500 ring-2 ring-green-500' 
                                : 'border-gray-700 hover:border-green-500'
                            )}
                          >
                            {take.thumbnailUrl ? (
                              <img src={take.thumbnailUrl} alt="Take" className="w-full h-full object-cover" />
                            ) : (
                              <video 
                                src={take.assetUrl} 
                                className="w-full h-full object-cover"
                                muted
                                onMouseEnter={(e) => e.currentTarget.play()}
                                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-0 left-0 right-0 p-2 text-left">
                              <div className="text-xs text-white font-medium">
                                Take · {take.durationSec ? `${take.durationSec}s` : 'Video'}
                              </div>
                            </div>
                            {selectedVideoTake?.takeId === take.takeId && (
                              <div className="absolute top-2 right-2">
                                <Check className="w-5 h-5 text-green-400 bg-green-900/80 rounded-full p-1" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
            <Button variant="outline" onClick={() => setShowVideoTakeSelector(false)}>
              Cancel
            </Button>
            {selectedVideoTake && (
              <Button 
                onClick={() => setShowVideoTakeSelector(false)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Confirm Selection
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
