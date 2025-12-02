'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Check, Sparkles, Info, Loader2, Video, Image as ImageIcon, Clock, ArrowRight } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'
import { SceneSegment } from './scene-production/types'

interface ShotPromptStructure {
  // Cinematic Intent
  shotType: string
  cameraAngle: string
  cameraMovement: string
  subjectEmphasis: string
  characterAction: string
  
  // Timing & Flow
  duration: number
  transition: string
  
  // Context
  location: string
  timeOfDay: string
  lighting: string
  atmosphere: string
  
  // Style
  artStyle: string
  additionalDetails: string
  negativePrompt: string
}

interface ShotPromptBuilderProps {
  open: boolean
  onClose: () => void
  segment: SceneSegment
  mode: 'image' | 'video'
  availableCharacters?: Array<{ 
    name: string
    description: string
    referenceImage?: string
    appearanceDescription?: string
    ethnicity?: string
    subject?: string
  }>
  onGenerate: (promptData: any) => void
  isGenerating?: boolean
}

export function ShotPromptBuilder({
  open,
  onClose,
  segment,
  mode,
  availableCharacters = [],
  onGenerate,
  isGenerating = false
}: ShotPromptBuilderProps) {
  const [activeTab, setActiveTab] = useState<'guided' | 'advanced'>('guided')
  const [structure, setStructure] = useState<ShotPromptStructure>({
    shotType: segment.shotType || 'medium-shot',
    cameraAngle: segment.cameraAngle || 'eye-level',
    cameraMovement: segment.cameraMovement || 'static',
    subjectEmphasis: segment.subject || '',
    characterAction: segment.action || '',
    
    duration: (segment.endTime - segment.startTime) || 4,
    transition: segment.transition || 'cut',
    
    location: '',
    timeOfDay: 'day',
    lighting: 'natural',
    atmosphere: 'neutral',
    
    artStyle: 'photorealistic',
    additionalDetails: '',
    negativePrompt: 'blurry, low quality, distorted, poor composition'
  })
  
  const [advancedPrompt, setAdvancedPrompt] = useState('')
  const [copied, setCopied] = useState(false)

  // Initialize from segment data
  useEffect(() => {
    if (open && segment) {
      setStructure(prev => ({
        ...prev,
        shotType: segment.shotType || prev.shotType,
        cameraAngle: segment.cameraAngle || prev.cameraAngle,
        cameraMovement: segment.cameraMovement || prev.cameraMovement,
        characterAction: segment.action || prev.characterAction,
        duration: (segment.endTime - segment.startTime) || prev.duration,
        transition: segment.transition || prev.transition
      }))
    }
  }, [open, segment])

  const constructPrompt = (): string => {
    const parts: string[] = []
    
    // 1. Cinematic Intent (Core)
    const shotTypes: Record<string, string> = {
      'wide-shot': 'Wide establishing shot',
      'medium-shot': 'Medium shot',
      'medium-close-up': 'Medium close-up shot',
      'close-up': 'Close-up shot',
      'extreme-close-up': 'Extreme close-up shot',
      'extreme-wide': 'Extreme wide shot',
      'over-shoulder': 'Over the shoulder shot'
    }
    parts.push(shotTypes[structure.shotType] || structure.shotType)
    
    if (structure.subjectEmphasis) {
      parts.push(`focus on ${structure.subjectEmphasis}`)
    }
    
    if (structure.characterAction) {
      parts.push(structure.characterAction)
    }
    
    // Camera Angle
    const angles: Record<string, string> = {
      'eye-level': 'eye level angle',
      'low-angle': 'low angle',
      'high-angle': 'high angle',
      'birds-eye': "bird's eye view",
      'dutch-angle': 'dutch angle'
    }
    if (structure.cameraAngle !== 'eye-level') {
      parts.push(angles[structure.cameraAngle] || structure.cameraAngle)
    }
    
    // Camera Movement (Video only)
    if (mode === 'video' && structure.cameraMovement !== 'static') {
      parts.push(`${structure.cameraMovement} camera movement`)
    }
    
    // 2. Context
    if (structure.location) parts.push(`in ${structure.location}`)
    if (structure.timeOfDay !== 'day') parts.push(structure.timeOfDay)
    if (structure.lighting !== 'natural') parts.push(`${structure.lighting} lighting`)
    if (structure.atmosphere !== 'neutral') parts.push(`${structure.atmosphere} atmosphere`)
    
    // 3. Style
    const stylePreset = artStylePresets.find(s => s.id === structure.artStyle)
    if (stylePreset) parts.push(stylePreset.promptSuffix)
    
    if (structure.additionalDetails) parts.push(structure.additionalDetails)
    
    return parts.filter(Boolean).join(', ')
  }

  const getRawPrompt = (): string => {
    return activeTab === 'advanced' ? advancedPrompt : constructPrompt()
  }

  const handleGenerate = () => {
    const rawPrompt = getRawPrompt()
    const promptData = {
      prompt: rawPrompt,
      negativePrompt: structure.negativePrompt,
      duration: structure.duration,
      transition: structure.transition,
      mode: mode,
      // Pass structured data for API optimization
      shotType: structure.shotType,
      cameraAngle: structure.cameraAngle,
      cameraMovement: structure.cameraMovement,
      artStyle: structure.artStyle
    }
    onGenerate(promptData)
    onClose()
  }

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(getRawPrompt())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] bg-gray-900 text-white border-gray-700 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white">
            {mode === 'video' ? <Video className="w-5 h-5 text-blue-400" /> : <ImageIcon className="w-5 h-5 text-purple-400" />}
            {mode === 'video' ? 'Video Shot Prompt Builder' : 'Image Shot Prompt Builder'}
            <span className="text-sm font-normal text-gray-400 ml-2">
              Shot {segment.sequenceIndex + 1}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="guided" className="flex-1">Guided Mode</TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">Advanced Mode</TabsTrigger>
            </TabsList>

            <TabsContent value="guided" className="space-y-4 mt-4">
              {/* 1. Cinematic Intent */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Video className="w-4 h-4" /> Cinematic Intent
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Shot Type</label>
                    <Select value={structure.shotType} onValueChange={(v) => setStructure(prev => ({ ...prev, shotType: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="extreme-close-up">Extreme Close-Up (ECU)</SelectItem>
                        <SelectItem value="close-up">Close-Up (CU)</SelectItem>
                        <SelectItem value="medium-close-up">Medium Close-Up (MCU)</SelectItem>
                        <SelectItem value="medium-shot">Medium Shot (MS)</SelectItem>
                        <SelectItem value="wide-shot">Wide Shot (WS)</SelectItem>
                        <SelectItem value="extreme-wide">Extreme Wide Shot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Camera Angle</label>
                    <Select value={structure.cameraAngle} onValueChange={(v) => setStructure(prev => ({ ...prev, cameraAngle: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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

                {mode === 'video' && (
                  <div>
                    <label className="text-xs text-gray-400">Camera Movement</label>
                    <Select value={structure.cameraMovement} onValueChange={(v) => setStructure(prev => ({ ...prev, cameraMovement: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Static</SelectItem>
                        <SelectItem value="pan-left">Pan Left</SelectItem>
                        <SelectItem value="pan-right">Pan Right</SelectItem>
                        <SelectItem value="tilt-up">Tilt Up</SelectItem>
                        <SelectItem value="tilt-down">Tilt Down</SelectItem>
                        <SelectItem value="dolly-in">Dolly In</SelectItem>
                        <SelectItem value="dolly-out">Dolly Out</SelectItem>
                        <SelectItem value="tracking">Tracking</SelectItem>
                        <SelectItem value="handheld">Handheld</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-400">Action / Description</label>
                  <Textarea 
                    value={structure.characterAction}
                    onChange={(e) => setStructure(prev => ({ ...prev, characterAction: e.target.value }))}
                    placeholder="Describe the action taking place..."
                    className="mt-1 h-20"
                  />
                </div>
              </div>

              {/* 2. Timing & Flow */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Timing & Flow
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Duration (seconds)</label>
                    <Input 
                      type="number" 
                      min={1} 
                      max={60}
                      value={structure.duration}
                      onChange={(e) => setStructure(prev => ({ ...prev, duration: parseInt(e.target.value) || 4 }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Transition</label>
                    <Select value={structure.transition} onValueChange={(v) => setStructure(prev => ({ ...prev, transition: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cut">Cut</SelectItem>
                        <SelectItem value="dissolve">Dissolve</SelectItem>
                        <SelectItem value="fade_out">Fade Out</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 3. Style & Atmosphere */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Style & Atmosphere
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Lighting</label>
                    <Select value={structure.lighting} onValueChange={(v) => setStructure(prev => ({ ...prev, lighting: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural">Natural</SelectItem>
                        <SelectItem value="dramatic">Dramatic</SelectItem>
                        <SelectItem value="soft">Soft</SelectItem>
                        <SelectItem value="harsh">Harsh</SelectItem>
                        <SelectItem value="backlit">Backlit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Art Style</label>
                    <Select value={structure.artStyle} onValueChange={(v) => setStructure(prev => ({ ...prev, artStyle: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {artStylePresets.map(style => (
                          <SelectItem key={style.id} value={style.id}>{style.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-4">
              <Textarea
                value={advancedPrompt || constructPrompt()}
                onChange={(e) => setAdvancedPrompt(e.target.value)}
                rows={10}
                className="font-mono text-sm"
                placeholder="Enter custom prompt..."
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t border-gray-700 p-4 bg-gray-900">
          <div className="text-sm text-gray-200 p-2 bg-gray-800 rounded border border-gray-700 max-h-24 overflow-y-auto mb-3">
            {getRawPrompt()}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className={`flex-1 ${mode === 'video' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <>{mode === 'video' ? <Video className="w-4 h-4 mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />} Generate {mode === 'video' ? 'Video' : 'Image'}</>
              )}
            </Button>
            <Button onClick={handleCopy} variant="outline" className="px-3">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
