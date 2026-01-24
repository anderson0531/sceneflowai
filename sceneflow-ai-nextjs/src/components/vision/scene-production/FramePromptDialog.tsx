'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Copy,
} from 'lucide-react'
import type { SceneSegment, TransitionType } from './types'
import type { DetailedSceneDirection } from '@/types/scene-direction'
import { useSceneDirectionOptional } from '@/contexts/SceneDirectionContext'
import { 
  buildKeyframePrompt, 
  validateDirectionAdherence,
  type KeyframeContext 
} from '@/lib/intelligence/keyframe-prompt-builder'

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
  /** Characters for identity context */
  characters?: Array<{
    name: string
    appearance?: string
    ethnicity?: string
    age?: string
    wardrobe?: string
  }>
}

export interface FrameGenerationOptions {
  segmentId: string
  frameType: 'start' | 'end' | 'both'
  customPrompt: string
  negativePrompt: string
  usePreviousEndFrame: boolean
  previousEndFrameUrl?: string | null
}

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
}: FramePromptDialogProps) {
  // Try to get scene direction from context if not passed as prop
  const contextDirection = useSceneDirectionOptional()
  const sceneDirection = propSceneDirection || contextDirection?.direction || null
  
  // State
  const [customPrompt, setCustomPrompt] = useState('')
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [selectedNegativePresets, setSelectedNegativePresets] = useState<Set<string>>(
    new Set(DEFAULT_NEGATIVE_PRESETS)
  )
  const [customNegativePrompt, setCustomNegativePrompt] = useState('')
  const [usePreviousEndFrame, setUsePreviousEndFrame] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showDirectionPanel, setShowDirectionPanel] = useState(false)
  const [useIntelligentPrompt, setUseIntelligentPrompt] = useState(true)

  // Initialize prompt from segment when dialog opens
  useEffect(() => {
    if (segment && open) {
      // Priority: Use pasted frame-specific prompts first, then fall back to other prompts
      let basePrompt = ''
      
      if (frameType === 'start' && segment.startFramePrompt) {
        // Use the AI-generated start frame prompt from pasted results
        basePrompt = segment.startFramePrompt
      } else if (frameType === 'end' && segment.endFramePrompt) {
        // Use the AI-generated end frame prompt from pasted results
        basePrompt = segment.endFramePrompt
      } else if (frameType === 'both' && segment.startFramePrompt) {
        // For 'both' mode, start with the start frame prompt
        basePrompt = segment.startFramePrompt
      } else {
        // Fall back to existing prompts
        basePrompt = segment.userEditedPrompt || segment.generatedPrompt || segment.actionPrompt || ''
      }
      
      setCustomPrompt(basePrompt)
      
      // Auto-check "use previous end frame" for CONTINUE transitions when available
      if (segment.transitionType === 'CONTINUE' && previousEndFrameUrl && frameType !== 'end') {
        setUsePreviousEndFrame(true)
      } else {
        setUsePreviousEndFrame(false)
      }
    }
  }, [segment, open, previousEndFrameUrl, frameType])

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

  // Apply intelligent prompt
  const applyIntelligentPrompt = useCallback(() => {
    if (intelligentPrompt) {
      setCustomPrompt(intelligentPrompt.prompt)
    }
  }, [intelligentPrompt])

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

    const options: FrameGenerationOptions = {
      segmentId: segment.segmentId,
      frameType,
      customPrompt,
      negativePrompt: buildNegativePrompt(),
      usePreviousEndFrame,
      previousEndFrameUrl: usePreviousEndFrame ? previousEndFrameUrl : undefined,
    }

    onGenerate(options)
  }, [segment, frameType, customPrompt, buildNegativePrompt, usePreviousEndFrame, previousEndFrameUrl, onGenerate])

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
          <DialogDescription>
            Customize the generation prompt and settings for the keyframe image.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={applyIntelligentPrompt}
                    className="h-7 text-xs text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/20"
                  >
                    Apply Suggestion
                  </Button>
                </div>
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
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t border-slate-700">
          {/* Copy Prompt for external generation */}
          <Button
            variant="outline"
            onClick={async () => {
              const promptToCopy = customPrompt.trim() || intelligentPrompt?.prompt || ''
              if (promptToCopy) {
                try {
                  await navigator.clipboard.writeText(promptToCopy)
                  setCopiedPrompt(true)
                  setTimeout(() => setCopiedPrompt(false), 2000)
                } catch (err) {
                  console.error('Failed to copy prompt:', err)
                }
              }
            }}
            disabled={!customPrompt.trim() && !intelligentPrompt?.prompt}
            className="mr-auto gap-2 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
          >
            <Copy className="w-4 h-4" />
            {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
          </Button>
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
