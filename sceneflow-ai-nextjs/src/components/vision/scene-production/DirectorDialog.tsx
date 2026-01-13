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

import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import type { 
  SceneSegment, 
  VideoGenerationMethod, 
  VideoGenerationConfig 
} from './types'
import { useSegmentConfig } from '@/hooks/useSegmentConfig'
import { GuidePromptEditor, type SceneAudioData } from './GuidePromptEditor'

interface DirectorDialogProps {
  segment: SceneSegment
  sceneImageUrl?: string
  scene?: SceneAudioData
  isOpen: boolean
  onSaveConfig: (config: VideoGenerationConfig) => void
  onClose: () => void
}

// Map internal mode names to VideoGenerationMethod
const modeToMethod: Record<string, VideoGenerationMethod> = {
  'TEXT_TO_VIDEO': 'T2V',
  'IMAGE_TO_VIDEO': 'I2V',
  'FRAME_TO_VIDEO': 'FTV',
  'EXTEND': 'EXT',
}

const methodToMode: Record<VideoGenerationMethod, string> = {
  'T2V': 'TEXT_TO_VIDEO',
  'I2V': 'IMAGE_TO_VIDEO',
  'FTV': 'FRAME_TO_VIDEO',
  'EXT': 'EXTEND',
  'REF': 'IMAGE_TO_VIDEO', // Fallback
}

export const DirectorDialog: React.FC<DirectorDialogProps> = ({ 
  segment, 
  sceneImageUrl,
  scene,
  isOpen, 
  onSaveConfig, 
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
      startFrameUrl: autoConfig.startFrameUrl,
      endFrameUrl: autoConfig.endFrameUrl,
      sourceVideoUrl: autoConfig.sourceVideoUrl,
      approvalStatus: 'user-approved',
      confidence: autoConfig.confidence,
    }
    onSaveConfig(savedConfig)
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
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-400" />
            Generate Video: Segment {segment.sequenceIndex + 1}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
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
              <TabsList className="bg-slate-800 w-full grid grid-cols-4">
                <TabsTrigger 
                  value="TEXT_TO_VIDEO" 
                  className="data-[state=active]:bg-indigo-600"
                  disabled={!tabStates.TEXT_TO_VIDEO}
                >
                  <Type className="w-4 h-4 mr-2" />
                  Text-to-Video
                </TabsTrigger>
                <TabsTrigger 
                  value="IMAGE_TO_VIDEO" 
                  className="data-[state=active]:bg-indigo-600 disabled:opacity-50"
                  disabled={!tabStates.IMAGE_TO_VIDEO}
                  title={tabDisabledReasons.IMAGE_TO_VIDEO}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Image-to-Video
                </TabsTrigger>
                <TabsTrigger 
                  value="FRAME_TO_VIDEO" 
                  className="data-[state=active]:bg-purple-600 disabled:opacity-50"
                  disabled={!tabStates.FRAME_TO_VIDEO}
                  title={tabDisabledReasons.FRAME_TO_VIDEO}
                >
                  <Film className="w-4 h-4 mr-2" />
                  Frame-to-Video
                </TabsTrigger>
                <TabsTrigger 
                  value="EXTEND" 
                  className="data-[state=active]:bg-indigo-600 disabled:opacity-50"
                  disabled={!tabStates.EXTEND}
                  title={tabDisabledReasons.EXTEND}
                >
                  <FastForward className="w-4 h-4 mr-2" />
                  Extend
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Preview Area */}
          <div className="col-span-7 bg-black rounded-lg min-h-[300px] flex items-center justify-center relative overflow-hidden">
            {/* Visual Logic based on Mode */}
            {mode === 'FRAME_TO_VIDEO' && startFrameUrl && endFrameUrl ? (
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
            
            {/* Confidence indicator */}
            <div className="absolute bottom-2 left-2">
              <Badge variant="outline" className="bg-slate-800/80 text-slate-300 border-slate-600">
                AI Confidence: {autoConfig.confidence}%
              </Badge>
            </div>
          </div>

          {/* Right Panel: Controls & Prompt */}
          <div className="col-span-5 flex flex-col gap-4">
            
            {/* Prompt Input */}
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
                    ? "Tip: Describe the movement, not the scene. Focus on camera motion and character actions." 
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
                onClick={handleSave}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Settings
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DirectorDialog
