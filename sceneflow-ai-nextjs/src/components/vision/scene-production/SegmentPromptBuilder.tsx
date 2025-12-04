'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Check, Sparkles, Info, Loader2, Video, Image as ImageIcon, Clock, ArrowRight, Film, Link as LinkIcon, Upload, Camera, Wand2 } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'
import { SceneSegment } from './types'
import { cn } from '@/lib/utils'

// ============================================
// Types & Interfaces
// ============================================

export type VideoGenerationMethod = 'T2V' | 'I2V' | 'FTV' | 'EXT' | 'REF'

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
  referenceImages?: Array<{ url: string; type: 'style' | 'character' }>
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
  isGenerating = false
}: SegmentPromptBuilderProps) {
  const [activeTab, setActiveTab] = useState<'guided' | 'advanced'>('guided')
  
  // Video generation method (only for video mode)
  const [generationMethod, setGenerationMethod] = useState<VideoGenerationMethod>('T2V')
  const [startFrameUrl, setStartFrameUrl] = useState<string | null>(null)
  const [endFrameUrl, setEndFrameUrl] = useState<string | null>(null)
  const [referenceImages, setReferenceImages] = useState<Array<{ url: string; type: 'style' | 'character' }>>([])
  
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
      // Set start frame if previous segment has last frame
      if (previousSegmentLastFrame && mode === 'video') {
        setStartFrameUrl(previousSegmentLastFrame)
        setGenerationMethod('I2V')
      }
      
      // Parse segment data
      setStructure(prev => ({
        ...prev,
        shotType: segment.shotType || prev.shotType,
        cameraAngle: segment.cameraAngle || prev.cameraAngle,
        cameraMovement: segment.cameraMovement || prev.cameraMovement,
        characterActions: segment.action || prev.characterActions,
      }))
      
      // Set duration from segment
      const segmentDuration = Math.round(segment.endTime - segment.startTime)
      if ([4, 6, 8].includes(segmentDuration)) {
        setDuration(segmentDuration as 4 | 6 | 8)
      }
    }
  }, [open, segment, previousSegmentLastFrame, mode])

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
      
      if (generationMethod === 'EXT' && previousSegmentLastFrame) {
        promptData.startFrameUrl = previousSegmentLastFrame
      }
      
      if (generationMethod === 'REF' && referenceImages.length > 0) {
        promptData.referenceImages = referenceImages
        if (startFrameUrl) promptData.startFrameUrl = startFrameUrl
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
                  <label className="text-xs text-gray-400">Start Frame</label>
                  <div className="grid grid-cols-3 gap-2">
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
                    <div className="aspect-video rounded-lg border border-dashed border-gray-700 flex flex-col items-center justify-center hover:border-gray-600 cursor-pointer">
                      <Upload className="w-6 h-6 text-gray-500 mb-1" />
                      <span className="text-[10px] text-gray-500">Upload</span>
                    </div>
                  </div>
                </div>
              )}
              
              {generationMethod === 'FTV' && (
                <div className="mt-4">
                  <div className="text-xs text-blue-400 mb-3">Start frame required. End frame optional for controlled transitions.</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">Start Frame <span className="text-red-400">*</span></label>
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
                        <div className="aspect-video rounded-lg border border-dashed border-gray-700 flex flex-col items-center justify-center hover:border-gray-600 cursor-pointer">
                          <Upload className="w-5 h-5 text-gray-500 mb-1" />
                          <span className="text-[10px] text-gray-500">Upload</span>
                        </div>
                      </div>
                      {startFrameUrl && (
                        <div className="aspect-video rounded-lg border border-blue-500 overflow-hidden">
                          <img src={startFrameUrl} alt="Selected start" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">End Frame <span className="text-gray-600">(optional)</span></label>
                      <div className="aspect-video rounded-lg border border-dashed border-gray-700 flex flex-col items-center justify-center hover:border-gray-600 cursor-pointer">
                        {endFrameUrl ? (
                          <img src={endFrameUrl} alt="End" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-gray-500 mb-1" />
                            <span className="text-xs text-gray-500">Select End Frame</span>
                            <span className="text-[10px] text-gray-600">Optional transition target</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {generationMethod === 'EXT' && (
                <div className="mt-4">
                  <div className="text-xs text-green-400 mb-3">Automatically uses the last frame from the previous segment</div>
                  {previousSegmentLastFrame ? (
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">Previous Segment Last Frame</label>
                      <div className="aspect-video max-w-xs rounded-lg border border-green-500 overflow-hidden">
                        <img src={previousSegmentLastFrame} alt="Previous segment last frame" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-[10px] text-gray-500">This frame will be used to continue the video seamlessly</div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                      <div className="text-sm text-yellow-400 font-medium">No previous segment available</div>
                      <div className="text-xs text-gray-400 mt-1">This is the first segment. Use Image-to-Video or Text-to-Video instead.</div>
                    </div>
                  )}
                </div>
              )}
              
              {generationMethod === 'REF' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400">Reference Images (max 3)</label>
                    <span className="text-[10px] text-yellow-400">Cannot use with End Frame</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-lg border border-dashed border-gray-700 flex flex-col items-center justify-center hover:border-gray-600 cursor-pointer"
                      >
                        {referenceImages[idx] ? (
                          <img src={referenceImages[idx].url} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-gray-500 mb-1" />
                            <span className="text-[10px] text-gray-500">Ref {idx + 1}</span>
                          </>
                        )}
                      </div>
                    ))}
                    <div className="aspect-square rounded-lg border border-gray-700 flex flex-col items-center justify-center text-[10px] text-gray-500">
                      <span>+ Start Frame</span>
                      <span className="text-gray-600">(optional)</span>
                    </div>
                  </div>
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
    </Dialog>
  )
}
