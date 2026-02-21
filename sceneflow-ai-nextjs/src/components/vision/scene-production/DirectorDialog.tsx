/**
 * DirectorDialog - Video Generation Configuration Modal
 * 
 * Part of the Director's Console "Pre-Flight" workflow.
 * Allows users to review and edit auto-drafted generation settings
 * before batch rendering.
 * 
 * Features:
 * - 4-tab interface: Text-to-Video | Image-to-Video | Frame-to-Video | Extend
 * - Visual preview area showing Start → End frames for FTV mode
 * - Prompt editing with contextual tips
 * - Advanced settings accordion (aspect ratio, resolution, negative prompts)
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { 
  ArrowRight, 
  CheckCircle, 
  Info,
  Wand2,
  ImageIcon,
  Film,
  FastForward,
  Type,
  AlertCircle,
  Play,
  Clapperboard,
  Sparkles,
  Loader2,
} from 'lucide-react'
import type { 
  SceneSegment, 
  VideoGenerationMethod, 
  VideoGenerationConfig 
} from './types'
import { useSegmentConfig } from '@/hooks/useSegmentConfig'
import { GuidePromptEditor, type SceneAudioData } from './GuidePromptEditor'
import { cn } from '@/lib/utils'
import {
  CINEMATIC_ELEMENT_TYPES,
  type SpecialSegmentType,
  getCinematicElementConfig,
  generateFallbackPrompt,
} from './cinematic-elements'

interface DirectorDialogProps {
  segment: SceneSegment
  sceneImageUrl?: string
  scene?: SceneAudioData
  isOpen: boolean
  onSaveConfig: (config: VideoGenerationConfig) => void
  onGenerate?: (segmentId: string, config: VideoGenerationConfig) => void
  onClose: () => void
}

// Map internal mode names to VideoGenerationMethod
const modeToMethod: Record<string, VideoGenerationMethod> = {
  'TEXT_TO_VIDEO': 'T2V',
  'IMAGE_TO_VIDEO': 'I2V',
  'FRAME_TO_VIDEO': 'FTV',
  'EXTEND': 'EXT',
  'CINEMATIC': 'CIN',
}

const methodToMode: Record<VideoGenerationMethod, string> = {
  'T2V': 'TEXT_TO_VIDEO',
  'I2V': 'IMAGE_TO_VIDEO',
  'FTV': 'FRAME_TO_VIDEO',
  'EXT': 'EXTEND',
  'REF': 'IMAGE_TO_VIDEO', // Fallback
  'CIN': 'CINEMATIC',
}

export const DirectorDialog: React.FC<DirectorDialogProps> = ({ 
  segment, 
  sceneImageUrl,
  scene,
  isOpen, 
  onSaveConfig,
  onGenerate,
  onClose 
}) => {
  // Get auto-drafted config
  const { config: autoConfig, methodLabel, methodReason } = useSegmentConfig(segment, sceneImageUrl)
  
  // Local state initialized with auto-drafted values
  const [mode, setMode] = useState<string>(methodToMode[autoConfig.mode])
  const [prompt, setPrompt] = useState(autoConfig.prompt)
  const [motionPrompt, setMotionPrompt] = useState(autoConfig.motionPrompt)
  const [visualPrompt, setVisualPrompt] = useState(autoConfig.visualPrompt)
  const [negativePrompt, setNegativePrompt] = useState(autoConfig.negativePrompt)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>(autoConfig.aspectRatio)
  const [resolution, setResolution] = useState<'720p' | '1080p'>(autoConfig.resolution)
  const [duration, setDuration] = useState(autoConfig.duration)
  const [guidePrompt, setGuidePrompt] = useState('')
  
  // Cinematic Element state
  const [cinematicType, setCinematicType] = useState<SpecialSegmentType>('title')
  const [cinematicPrompt, setCinematicPrompt] = useState('')
  const [cinematicDuration, setCinematicDuration] = useState(4)
  const [isGeneratingCinematicPrompt, setIsGeneratingCinematicPrompt] = useState(false)
  
  // Credits/Title Card entries - included in AI prompt generation
  const [creditsTitle, setCreditsTitle] = useState(scene?.filmTitle || '')
  const [creditsDirector, setCreditsDirector] = useState('')
  const [creditsWriter, setCreditsWriter] = useState('')
  const [creditsProducer, setCreditsProducer] = useState('')
  const [creditsCustomText, setCreditsCustomText] = useState('')
  
  // Generate AI-powered cinematic prompt
  const generateCinematicPrompt = useCallback(async () => {
    setIsGeneratingCinematicPrompt(true)
    try {
      // Build film context from scene data - supports both array and string genres
      const filmTitle = scene?.filmTitle || 'Untitled Project'
      const genre = scene?.genre 
        ? (Array.isArray(scene.genre) ? scene.genre : [scene.genre])
        : ['drama']
      const logline = scene?.logline || ''
      const tone = scene?.tone || 'cinematic'
      const visualStyle = scene?.visualStyle || ''
      
      console.log('[DirectorDialog] Generating cinematic prompt with context:', { filmTitle, genre, logline, tone })
      
      // Build credits object for title/outro sequences
      const credits = {
        title: creditsTitle || filmTitle,
        director: creditsDirector,
        writer: creditsWriter,
        producer: creditsProducer,
        customText: creditsCustomText,
      }
      
      const response = await fetch('/api/intelligence/generate-special-segment-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentType: cinematicType,
          filmContext: {
            title: creditsTitle || filmTitle,
            logline: logline,
            genre: genre,
            tone: tone,
            visualStyle: visualStyle,
          },
          credits: credits,
          adjacentContext: {
            currentScene: {
              heading: scene?.sceneHeading,
              action: scene?.action,
              narration: scene?.narration,
            },
          },
          segmentContext: {
            action: segment.action,
            dialogue: segment.dialogue,
            emotionalBeat: segment.emotionalBeat,
          },
          duration: cinematicDuration,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('[DirectorDialog] Raw API response:', JSON.stringify(data).substring(0, 200))
        if (data.prompt) {
          // Handle case where AI returns JSON-formatted string instead of plain text
          let promptText = data.prompt
          console.log('[DirectorDialog] Initial promptText type:', typeof promptText, 'starts with {:', promptText?.trim?.()?.startsWith('{'))
          
          // Try to parse if it looks like JSON
          if (typeof promptText === 'string' && promptText.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(promptText)
              promptText = parsed.prompt || promptText
              console.log('[DirectorDialog] Successfully parsed JSON, extracted prompt')
            } catch (e) {
              console.log('[DirectorDialog] JSON parse failed, using as-is:', e)
            }
          }
          
          console.log('[DirectorDialog] Final promptText:', promptText?.substring?.(0, 100))
          setCinematicPrompt(promptText)
          setVisualPrompt(promptText) // Sync with main prompt
        }
      } else {
        // Use fallback
        const fallback = generateFallbackPrompt(cinematicType)
        setCinematicPrompt(fallback)
        setVisualPrompt(fallback)
      }
    } catch (error) {
      const fallback = generateFallbackPrompt(cinematicType)
      setCinematicPrompt(fallback)
      setVisualPrompt(fallback)
    } finally {
      setIsGeneratingCinematicPrompt(false)
    }
  }, [cinematicType, cinematicDuration, scene, segment])
  
  // Update cinematic duration when type changes
  useEffect(() => {
    if (mode === 'CINEMATIC') {
      const config = getCinematicElementConfig(cinematicType)
      setCinematicDuration(config.defaultDuration)
    }
  }, [cinematicType, mode])
  
  // Calculate dynamic Visual Fidelity based on currently selected mode
  const visualFidelity = useMemo(() => {
    const hasStartFrame = !!(segment.startFrameUrl || segment.references?.startFrameUrl)
    const hasEndFrame = !!(segment.endFrameUrl || segment.references?.endFrameUrl)
    const activePrompt = mode === 'FRAME_TO_VIDEO' ? motionPrompt : visualPrompt
    
    // Base scores by method (reflects retake risk)
    const baseScores: Record<string, number> = {
      'FRAME_TO_VIDEO': 92,   // Best: both frames constrain output
      'IMAGE_TO_VIDEO': 75,   // Good: start frame anchors generation
      'EXTEND': 68,           // Moderate: uses existing video context
      'TEXT_TO_VIDEO': 35,    // Lowest: no visual reference
    }
    
    let score = baseScores[mode] || 50
    
    // Prompt quality bonus (based on length and specificity)
    const wordCount = (activePrompt || '').split(/\s+/).filter(w => w).length
    if (wordCount >= 20 && wordCount <= 80) score += 4
    else if (wordCount >= 10) score += 2
    
    // Specific motion/visual terms improve fidelity
    const promptLower = (activePrompt || '').toLowerCase()
    if (promptLower.includes('camera')) score += 2
    if (promptLower.includes('slowly') || promptLower.includes('smoothly')) score += 1
    if (promptLower.includes('cinematic') || promptLower.includes('photorealistic')) score += 1
    
    // Frame availability bonuses - suggest better method
    if (mode === 'IMAGE_TO_VIDEO' && hasEndFrame) score += 5
    if (mode === 'TEXT_TO_VIDEO' && hasStartFrame) score += 10
    
    return Math.min(100, Math.max(10, Math.round(score)))
  }, [mode, segment, motionPrompt, visualPrompt])
  
  // Sync prompt based on mode
  useEffect(() => {
    const method = modeToMethod[mode]
    if (method === 'FTV') {
      setPrompt(motionPrompt)
    } else {
      setPrompt(visualPrompt)
    }
  }, [mode, motionPrompt, visualPrompt])
  
  // Reset state when dialog opens with new segment
  useEffect(() => {
    if (isOpen) {
      setMode(methodToMode[autoConfig.mode])
      setPrompt(autoConfig.prompt)
      setMotionPrompt(autoConfig.motionPrompt)
      setVisualPrompt(autoConfig.visualPrompt)
      setNegativePrompt(autoConfig.negativePrompt)
      setAspectRatio(autoConfig.aspectRatio)
      setResolution(autoConfig.resolution)
      setDuration(autoConfig.duration)
    }
  }, [isOpen, autoConfig])
  
  const handleSave = () => {
    const method = modeToMethod[mode]
    // Use directly resolved frame URLs (not from autoConfig which may be stale)
    const resolvedStartFrameUrl = segment.startFrameUrl || segment.references?.startFrameUrl || null
    const resolvedEndFrameUrl = segment.endFrameUrl || segment.references?.endFrameUrl || null
    
    const savedConfig: VideoGenerationConfig = {
      mode: method,
      prompt: method === 'FTV' ? motionPrompt : visualPrompt,
      motionPrompt,
      visualPrompt,
      negativePrompt,
      guidePrompt: guidePrompt || undefined,
      aspectRatio,
      resolution,
      duration,
      startFrameUrl: resolvedStartFrameUrl,
      endFrameUrl: resolvedEndFrameUrl,
      sourceVideoUrl: autoConfig.sourceVideoUrl,
      approvalStatus: 'auto-ready',
      confidence: autoConfig.confidence,
    }
    onSaveConfig(savedConfig)
  }
  
  // Handle generate - saves config AND triggers generation
  const handleGenerate = () => {
    const method = modeToMethod[mode]
    // Use directly resolved frame URLs (not from autoConfig which may be stale)
    const resolvedStartFrameUrl = segment.startFrameUrl || segment.references?.startFrameUrl || null
    const resolvedEndFrameUrl = segment.endFrameUrl || segment.references?.endFrameUrl || null
    
    // For Cinematic mode, use cinematic-specific values
    const isCinematic = mode === 'CINEMATIC'
    const finalPrompt = isCinematic ? cinematicPrompt : (method === 'FTV' ? motionPrompt : visualPrompt)
    const finalDuration = isCinematic ? cinematicDuration : duration
    
    const savedConfig: VideoGenerationConfig = {
      mode: method,
      prompt: finalPrompt,
      motionPrompt: isCinematic ? cinematicPrompt : motionPrompt,
      visualPrompt: isCinematic ? cinematicPrompt : visualPrompt,
      negativePrompt,
      guidePrompt: guidePrompt || undefined,
      aspectRatio,
      resolution,
      duration: finalDuration,
      startFrameUrl: resolvedStartFrameUrl,
      endFrameUrl: resolvedEndFrameUrl,
      sourceVideoUrl: autoConfig.sourceVideoUrl,
      approvalStatus: 'auto-ready',
      confidence: autoConfig.confidence,
      // Add cinematic-specific metadata
      ...(isCinematic && {
        cinematicElementType: cinematicType,
      }),
    }
    
    // Debug: Log FTV config to verify frame URLs are passed
    if (method === 'FTV') {
      console.log('[DirectorDialog] FTV generation config:', {
        method,
        startFrameUrl: resolvedStartFrameUrl,
        endFrameUrl: resolvedEndFrameUrl,
        prompt: savedConfig.prompt?.substring(0, 50) + '...'
      })
    }
    
    // Debug: Log Cinematic config
    if (isCinematic) {
      console.log('[DirectorDialog] Cinematic generation config:', {
        method,
        elementType: cinematicType,
        duration: finalDuration,
        prompt: finalPrompt?.substring(0, 50) + '...'
      })
    }
    
    onSaveConfig(savedConfig)
    if (onGenerate) {
      onGenerate(segment.segmentId, savedConfig)
    }
    onClose()
  }
  
  const startFrameUrl = segment.startFrameUrl || segment.references?.startFrameUrl
  const endFrameUrl = segment.endFrameUrl || segment.references?.endFrameUrl
  const hasExistingVideo = segment.activeAssetUrl && segment.assetType === 'video'
  
  // FRAME-FIRST WORKFLOW: Determine which tabs should be enabled
  // I2V requires a start frame, FTV requires both frames
  // These prerequisites ensure character consistency via frame anchoring
  const tabStates = {
    TEXT_TO_VIDEO: true, // Always available (but not recommended if frames exist)
    IMAGE_TO_VIDEO: !!startFrameUrl || !!sceneImageUrl,
    FRAME_TO_VIDEO: !!startFrameUrl && !!endFrameUrl,
    EXTEND: !!hasExistingVideo,
    CINEMATIC: true, // Always available - for cinematic elements
  }
  
  // Messaging for disabled tabs
  const tabDisabledReasons: Record<string, string> = {
    IMAGE_TO_VIDEO: !tabStates.IMAGE_TO_VIDEO ? 'Generate a Start Frame first (Frame step)' : '',
    FRAME_TO_VIDEO: !tabStates.FRAME_TO_VIDEO 
      ? (!startFrameUrl ? 'Generate Start Frame first' : 'Generate End Frame to enable interpolation')
      : '',
    EXTEND: !tabStates.EXTEND ? 'Render a video first' : '',
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-slate-700">
        
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-400" />
            Generate Video: Segment {segment.sequenceIndex + 1}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            Review and customize generation parameters before rendering.
          </DialogDescription>
        </DialogHeader>

        {/* Guide Prompt Editor - Audio & Scene Direction Context */}
        {scene && (
          <GuidePromptEditor
            segment={segment}
            scene={scene}
            onGuidePromptChange={setGuidePrompt}
            onNegativePromptChange={setNegativePrompt}
            className="mt-2"
          />
        )}

        <div className="grid grid-cols-12 gap-6 mt-4">
          
          {/* Mode Selection Tabs */}
          <div className="col-span-12">
            {/* Frame-First Recommendation Banner */}
            {tabStates.FRAME_TO_VIDEO && mode !== 'FRAME_TO_VIDEO' && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm">
                <Film className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Recommended:</strong> Frame-to-Video mode uses both keyframes for best character consistency.
                </span>
              </div>
            )}
            
            {/* Missing Frame Warning */}
            {!tabStates.IMAGE_TO_VIDEO && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Frame-First Workflow:</strong> Generate keyframes in the Frame step for better character consistency. 
                  Text-to-Video is available but may result in character drift.
                </span>
              </div>
            )}
            
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="bg-slate-800/80 w-full grid grid-cols-3 md:grid-cols-5 gap-1 p-1">
                <TabsTrigger 
                  value="TEXT_TO_VIDEO" 
                  className="gap-2 data-[state=active]:bg-indigo-600"
                  disabled={!tabStates.TEXT_TO_VIDEO}
                >
                  <Type className="w-4 h-4" />
                  <span className="hidden sm:inline">Text-to-Video</span>
                  <span className="sm:hidden">T2V</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="IMAGE_TO_VIDEO" 
                  className="gap-2 data-[state=active]:bg-indigo-600 disabled:opacity-50"
                  disabled={!tabStates.IMAGE_TO_VIDEO}
                  title={tabDisabledReasons.IMAGE_TO_VIDEO}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Image-to-Video</span>
                  <span className="sm:hidden">I2V</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="FRAME_TO_VIDEO" 
                  className="gap-2 data-[state=active]:bg-purple-600 disabled:opacity-50"
                  disabled={!tabStates.FRAME_TO_VIDEO}
                  title={tabDisabledReasons.FRAME_TO_VIDEO}
                >
                  <Film className="w-4 h-4" />
                  <span className="hidden sm:inline">Frame-to-Video</span>
                  <span className="sm:hidden">FTV</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="EXTEND" 
                  className="gap-2 data-[state=active]:bg-indigo-600 disabled:opacity-50"
                  disabled={!tabStates.EXTEND}
                  title={tabDisabledReasons.EXTEND}
                >
                  <FastForward className="w-4 h-4" />
                  <span>Extend</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="CINEMATIC" 
                  className="gap-2 data-[state=active]:bg-amber-600"
                >
                  <Clapperboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Cinematic</span>
                  <span className="sm:hidden">CIN</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Preview Area */}
          <div className="col-span-7 bg-black rounded-lg min-h-[300px] flex items-center justify-center relative overflow-hidden">
            {/* Visual Logic based on Mode */}
            {mode === 'CINEMATIC' ? (
              /* Cinematic Element Preview */
              <div className="p-6 w-full flex flex-col items-center justify-center">
                {(() => {
                  const config = getCinematicElementConfig(cinematicType)
                  const IconComponent = config.icon
                  return (
                    <>
                      <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 border border-amber-500/30">
                        <IconComponent className="w-12 h-12 text-amber-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">{config.name}</h3>
                      <p className="text-sm text-slate-400 text-center max-w-md">{config.description}</p>
                      <div className="flex items-center gap-2 mt-4">
                        <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/50">
                          {cinematicDuration}s duration
                        </Badge>
                        <Badge variant="outline" className="bg-slate-700 text-slate-300">
                          AI-Optimized Prompt
                        </Badge>
                      </div>
                    </>
                  )
                })()}
              </div>
            ) : mode === 'FRAME_TO_VIDEO' && startFrameUrl && endFrameUrl ? (
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 relative">
                  <img 
                    src={startFrameUrl} 
                    alt="Start Frame"
                    className="w-full rounded-lg opacity-90 border border-slate-700" 
                  />
                  <Badge className="absolute top-2 left-2 bg-slate-800">Start</Badge>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="flex-1 relative">
                  <img 
                    src={endFrameUrl} 
                    alt="End Frame"
                    className="w-full rounded-lg opacity-90 border border-slate-700" 
                  />
                  <Badge className="absolute top-2 left-2 bg-slate-800">End</Badge>
                </div>
              </div>
            ) : mode === 'EXTEND' && hasExistingVideo ? (
              <div className="p-4 w-full">
                <video 
                  src={segment.activeAssetUrl!}
                  className="w-full rounded-lg border border-slate-700"
                  controls
                  muted
                />
                <Badge className="absolute top-2 left-2 bg-slate-800">Source Video</Badge>
              </div>
            ) : (startFrameUrl || sceneImageUrl) ? (
              <div className="p-4 w-full">
                <img 
                  src={startFrameUrl || sceneImageUrl} 
                  alt="Reference Frame"
                  className="w-full rounded-lg opacity-90 border border-slate-700" 
                />
                <Badge className="absolute top-2 left-2 bg-slate-800">Reference Image</Badge>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 p-8">
                <Type className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm">Text-Only Generation</p>
                <p className="text-xs mt-1 opacity-60">No reference image available</p>
              </div>
            )}
            
            {/* Mode Badge */}
            {mode !== 'CINEMATIC' && (
              <div className="absolute top-2 right-2">
                <Badge 
                  variant="outline" 
                  className={`
                    ${mode === 'FRAME_TO_VIDEO' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : ''}
                    ${mode === 'IMAGE_TO_VIDEO' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : ''}
                    ${mode === 'TEXT_TO_VIDEO' ? 'bg-green-500/20 text-green-300 border-green-500/50' : ''}
                    ${mode === 'EXTEND' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : ''}
                  `}
                >
                  {mode === 'FRAME_TO_VIDEO' ? 'Interpolation Mode' : 'Generation Mode'}
                </Badge>
              </div>
            )}
            
            {/* Visual Fidelity indicator - predicts generation accuracy and consistency */}
            {mode !== 'CINEMATIC' && (
              <div className="absolute bottom-2 left-2">
                <Badge 
                  variant="outline" 
                  className={`bg-slate-800/80 border-slate-600 ${
                    visualFidelity >= 85 ? 'text-green-400' :
                    visualFidelity >= 70 ? 'text-yellow-400' :
                    'text-orange-400'
                  }`}
                >
                  Visual Fidelity: {visualFidelity}%
                </Badge>
              </div>
            )}
          </div>

          {/* Right Panel: Controls & Prompt */}
          <div className="col-span-5 flex flex-col gap-4">
            
            {/* Cinematic Mode Controls */}
            {mode === 'CINEMATIC' ? (
              <>
                {/* Element Type Selector */}
                <div className="flex flex-col gap-2">
                  <Label className="text-slate-300">Cinematic Element Type</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {CINEMATIC_ELEMENT_TYPES.map((config) => {
                      const IconComponent = config.icon
                      return (
                        <button
                          key={config.id}
                          onClick={() => setCinematicType(config.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all',
                            cinematicType === config.id
                              ? 'border-amber-500 bg-amber-500/20'
                              : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                          )}
                        >
                          <IconComponent className="w-5 h-5 text-amber-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{config.name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{config.defaultDuration}s</Badge>
                            </div>
                            <p className="text-xs text-slate-400 truncate">{config.shortDescription}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                {/* Duration Slider for Cinematic */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300">Duration</Label>
                    <span className="text-sm text-amber-400 font-medium">{cinematicDuration}s</span>
                  </div>
                  <Slider
                    value={[cinematicDuration]}
                    onValueChange={(v) => setCinematicDuration(v[0])}
                    min={3}
                    max={8}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">
                    Recommended: {getCinematicElementConfig(cinematicType).defaultDuration}s for {getCinematicElementConfig(cinematicType).name}
                  </p>
                </div>
                
                {/* Credits/Title Card Entry Fields - shown for title and outro */}
                {(cinematicType === 'title' || cinematicType === 'outro') && (
                  <div className="flex flex-col gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-amber-400" />
                      <Label className="text-slate-300 text-sm font-medium">
                        {cinematicType === 'title' ? 'Opening Credits' : 'Closing Credits'}
                      </Label>
                    </div>
                    
                    {/* Film Title */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-slate-400 text-xs">Film Title</Label>
                      <input
                        type="text"
                        value={creditsTitle}
                        onChange={(e) => setCreditsTitle(e.target.value)}
                        placeholder={scene?.filmTitle || 'Enter film title...'}
                        className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    
                    {/* Director */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-slate-400 text-xs">Directed by</Label>
                      <input
                        type="text"
                        value={creditsDirector}
                        onChange={(e) => setCreditsDirector(e.target.value)}
                        placeholder="Director name (optional)"
                        className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    
                    {/* Producer - show for both title and outro */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-slate-400 text-xs">Produced by</Label>
                      <input
                        type="text"
                        value={creditsProducer}
                        onChange={(e) => setCreditsProducer(e.target.value)}
                        placeholder="Producer name (optional)"
                        className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    
                    {/* Writer - only show for outro */}
                    {cinematicType === 'outro' && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-slate-400 text-xs">Written by</Label>
                        <input
                          type="text"
                          value={creditsWriter}
                          onChange={(e) => setCreditsWriter(e.target.value)}
                          placeholder="Writer name (optional)"
                          className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    )}
                    
                    {/* Custom Text */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-slate-400 text-xs">
                        {cinematicType === 'title' ? 'Tagline / Subtitle' : 'Additional Credits'}
                      </Label>
                      <input
                        type="text"
                        value={creditsCustomText}
                        onChange={(e) => setCreditsCustomText(e.target.value)}
                        placeholder={cinematicType === 'title' ? 'Optional tagline...' : 'Additional credits text...'}
                        className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    
                    <p className="text-xs text-slate-500 mt-1">
                      These details will be incorporated into the AI-generated prompt.
                    </p>
                  </div>
                )}
                
                {/* AI Prompt Generation */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300">Video Generation Prompt</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={generateCinematicPrompt}
                      disabled={isGeneratingCinematicPrompt}
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-7 px-2"
                    >
                      {isGeneratingCinematicPrompt ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1" />
                      )}
                      {cinematicPrompt ? 'Regenerate' : 'Generate'}
                    </Button>
                  </div>
                  <Textarea 
                    value={cinematicPrompt}
                    onChange={(e) => {
                      setCinematicPrompt(e.target.value)
                      setVisualPrompt(e.target.value)
                    }}
                    className="h-28 bg-slate-800 border-slate-700 text-white placeholder-slate-500 resize-none text-sm"
                    placeholder="Click Generate to create an AI-optimized prompt based on your script and scene context..."
                  />
                </div>
              </>
            ) : (
              <>
                {/* Standard Prompt Input */}
                <div className="flex flex-col gap-2">
                  <Label className="text-slate-300">
                    {mode === 'FRAME_TO_VIDEO' ? 'Motion Instructions' : 'Visual Description'}
                  </Label>
                  <Textarea 
                    value={mode === 'FRAME_TO_VIDEO' ? motionPrompt : visualPrompt}
                    onChange={(e) => {
                      if (mode === 'FRAME_TO_VIDEO') {
                        setMotionPrompt(e.target.value)
                      } else {
                        setVisualPrompt(e.target.value)
                      }
                    }}
                    className="h-32 bg-slate-800 border-slate-700 text-white placeholder-slate-500 resize-none"
                    placeholder={
                      mode === 'FRAME_TO_VIDEO' 
                        ? "Describe the motion between frames..." 
                        : "Describe the scene and atmosphere..."
                    }
                  />
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {mode === 'FRAME_TO_VIDEO' 
                        ? "✨ AI-Optimized: Your prompt is automatically enhanced for end-frame alignment. Conflicting motion is filtered." 
                        : "Tip: Describe the scene visuals, lighting, and atmosphere. Be specific about what you want to see."}
                    </span>
                  </div>
                </div>

                {/* Duration Selector */}
                <div className="flex flex-col gap-2">
                  <Label className="text-slate-300">Duration</Label>
                  <div className="flex gap-2">
                    {[4, 6, 8].map((d) => (
                      <Button
                        key={d}
                        variant={duration === d ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDuration(d)}
                        className={`flex-1 ${duration === d ? 'bg-indigo-600' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                      >
                        {d}s
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Advanced Settings Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced" className="border-slate-700">
                <AccordionTrigger className="text-slate-300 hover:text-white text-sm">
                  Advanced Settings
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {/* Aspect Ratio */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-slate-400 text-xs">Aspect Ratio</Label>
                      <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as '16:9' | '9:16')}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="16:9">16:9 Landscape</SelectItem>
                          <SelectItem value="9:16">9:16 Portrait</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Resolution */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-slate-400 text-xs">Resolution</Label>
                      <Select value={resolution} onValueChange={(v) => setResolution(v as '720p' | '1080p')}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="720p">720p HD</SelectItem>
                          <SelectItem value="1080p">1080p Full HD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Negative Prompt */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-slate-400 text-xs">Negative Prompt</Label>
                      <Textarea 
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        className="h-16 bg-slate-800 border-slate-700 text-white text-sm resize-none"
                        placeholder="What to avoid..."
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Footer Actions */}
            <div className="mt-auto flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleGenerate}
              >
                <Play className="w-4 h-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DirectorDialog
