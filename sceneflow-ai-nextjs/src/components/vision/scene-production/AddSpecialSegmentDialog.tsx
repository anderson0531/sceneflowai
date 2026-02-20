'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
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
import { cn } from '@/lib/utils'
import {
  Clapperboard,
  Plus,
  Sparkles,
  Type,
  Scissors,
  MapPin,
  Coffee,
  CreditCard,
  Wand2,
  Eye,
  RotateCcw,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type { SceneSegment, SegmentPurpose } from './types'

// ============================================================================
// Types
// ============================================================================

/** Special segment types - excludes 'standard' and 'extend' which require keyframes */
export type SpecialSegmentType = 'title' | 'match-cut' | 'establishing' | 'broll' | 'outro'

export interface FilmContext {
  title?: string
  logline?: string
  genre?: string[]
  tone?: string
  targetAudience?: string
  visualStyle?: string
}

export interface AdjacentSceneContext {
  previousScene?: {
    heading?: string
    action?: string
    endFrameUrl?: string
    lastSegment?: SceneSegment
  }
  currentScene: {
    heading?: string
    action?: string
    narration?: string
  }
  nextScene?: {
    heading?: string
    action?: string
    startFrameUrl?: string
  }
}

export interface AddSpecialSegmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sceneId: string
  sceneNumber: number
  existingSegments: SceneSegment[]
  /** Position to insert the segment (between existing segments) */
  insertAfterIndex?: number
  adjacentContext?: AdjacentSceneContext
  onAddSegment: (segment: Partial<SceneSegment> & { 
    segmentPurpose: SegmentPurpose
    insertPosition: 'before' | 'after' | 'start' | 'end'
    insertIndex?: number 
  }) => void
  /** Film context for AI prompt generation */
  filmContext?: FilmContext
}

// ============================================================================
// Special Segment Type Configurations
// ============================================================================

interface SpecialSegmentConfig {
  id: SpecialSegmentType
  name: string
  icon: React.ElementType
  description: string
  defaultDuration: number
  /** Static fallback prompt if AI unavailable */
  fallbackPromptTemplate: string
  presetSettings: {
    shotType?: string
    cameraMovement?: string
    transitionType?: 'CUT' | 'CONTINUE'
    actionType?: string
  }
  /** Keywords for visual style matching */
  styleKeywords: string[]
  /** Generation hint for the AI */
  aiHint: string
}

const SPECIAL_SEGMENT_TYPES: SpecialSegmentConfig[] = [
  {
    id: 'title',
    name: 'Title Sequence',
    icon: Type,
    description: 'Cinematic title card with bold text overlay. Sets the tone and brands your video.',
    defaultDuration: 4,
    fallbackPromptTemplate: 'Cinematic title sequence. Bold white text centered on screen. Blurred cinematic background with subtle bokeh lights. Professional film title aesthetic. Slight camera drift or lens flare. 4K, photorealistic.',
    presetSettings: {
      shotType: 'wide',
      cameraMovement: 'slow-drift',
      transitionType: 'CUT',
      actionType: 'static'
    },
    styleKeywords: ['title', 'opening', 'intro', 'brand', 'text overlay'],
    aiHint: 'Generate a high-concept, genre-appropriate title sequence with the film title as text overlay'
  },
  {
    id: 'match-cut',
    name: 'Match Cut Bridge',
    icon: Scissors,
    description: 'Creative transition mimicking a shape or movement between scenes. E.g., spinning wheel → spinning clock.',
    defaultDuration: 3,
    fallbackPromptTemplate: 'Visual match cut transition. Object or shape transforms smoothly. Matching movement carries across the cut. Seamless visual bridge. 4K, cinematic.',
    presetSettings: {
      cameraMovement: 'static',
      transitionType: 'CUT',
      actionType: 'transformation'
    },
    styleKeywords: ['transition', 'match', 'transform', 'bridge', 'seamless'],
    aiHint: 'Create a match cut transition that finds visual similarity between adjacent scenes - matching shapes, movements, or colors'
  },
  {
    id: 'establishing',
    name: 'Establishing Shot',
    icon: MapPin,
    description: 'Wide drone or crane shot establishing geography, time of day, and mood for a new location.',
    defaultDuration: 5,
    fallbackPromptTemplate: 'Wide establishing shot. Drone or crane perspective. Full environment visible. Golden hour lighting. Cinematic depth and scale. 4K, photorealistic.',
    presetSettings: {
      shotType: 'extreme-wide',
      cameraMovement: 'crane',
      transitionType: 'CUT',
      actionType: 'static'
    },
    styleKeywords: ['establishing', 'location', 'wide', 'environment', 'aerial'],
    aiHint: 'Generate a wide establishing shot that sets the scene location, time of day, and atmospheric mood'
  },
  {
    id: 'broll',
    name: 'B-Roll (The Lull)',
    icon: Coffee,
    description: 'Atmospheric visual breather. Close-ups of environmental details that add texture and pacing.',
    defaultDuration: 4,
    fallbackPromptTemplate: 'Atmospheric B-roll shot. Close-up of environmental detail. Soft focus, slow motion. Contemplative mood. Ambient texture. 4K, cinematic.',
    presetSettings: {
      shotType: 'close-up',
      cameraMovement: 'static',
      transitionType: 'CUT',
      actionType: 'subtle'
    },
    styleKeywords: ['b-roll', 'detail', 'atmosphere', 'texture', 'breather'],
    aiHint: 'Generate an atmospheric B-roll shot that provides visual breathing room with close-up environmental details'
  },
  {
    id: 'outro',
    name: 'Outro / Credits',
    icon: CreditCard,
    description: 'Professional closing sequence. Elegant fade or scroll with production credits aesthetic.',
    defaultDuration: 6,
    fallbackPromptTemplate: 'Professional outro sequence. Elegant fade to black or slow vertical scroll. Production credits style. Clean typography on dark background. 4K, cinematic.',
    presetSettings: {
      shotType: 'medium',
      cameraMovement: 'tilt-up',
      transitionType: 'CUT',
      actionType: 'static'
    },
    styleKeywords: ['outro', 'credits', 'ending', 'fade', 'close'],
    aiHint: 'Generate a professional outro/credits sequence that provides closure matching the film tone'
  }
]

// ============================================================================
// Main Component
// ============================================================================

export function AddSpecialSegmentDialog({
  open,
  onOpenChange,
  sceneId,
  sceneNumber,
  existingSegments,
  insertAfterIndex,
  adjacentContext,
  onAddSegment,
  filmContext,
}: AddSpecialSegmentDialogProps) {
  // State
  const [selectedType, setSelectedType] = useState<SpecialSegmentType>('title')
  const [duration, setDuration] = useState<number>(4)
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('')
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [hasUserEdited, setHasUserEdited] = useState(false)
  
  // Get selected type config
  const typeConfig = useMemo(() => 
    SPECIAL_SEGMENT_TYPES.find(t => t.id === selectedType) || SPECIAL_SEGMENT_TYPES[0],
    [selectedType]
  )
  
  // Calculate insert position
  const insertPosition = useMemo((): 'start' | 'end' | 'after' => {
    if (insertAfterIndex === undefined || insertAfterIndex < 0) return 'end'
    if (insertAfterIndex === -1) return 'start'
    return 'after'
  }, [insertAfterIndex])
  
  const insertIndex = useMemo(() => {
    if (insertPosition === 'start') return 0
    if (insertPosition === 'end') return existingSegments.length
    return (insertAfterIndex ?? existingSegments.length - 1) + 1
  }, [insertPosition, insertAfterIndex, existingSegments.length])

  // Generate AI-powered cinematic prompt
  const generateAIPrompt = useCallback(async () => {
    setIsGeneratingPrompt(true)
    setAiError(null)

    try {
      const response = await fetch('/api/intelligence/generate-special-segment-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentType: selectedType,
          filmContext: {
            title: filmContext?.title || 'Untitled Project',
            logline: filmContext?.logline,
            genre: filmContext?.genre || ['drama'],
            tone: filmContext?.tone || 'cinematic',
            visualStyle: filmContext?.visualStyle,
            targetAudience: filmContext?.targetAudience,
          },
          adjacentScenes: adjacentContext ? {
            previousScene: adjacentContext.previousScene ? {
              heading: adjacentContext.previousScene.heading,
              action: adjacentContext.previousScene.action,
            } : undefined,
            currentScene: {
              heading: adjacentContext.currentScene.heading,
              action: adjacentContext.currentScene.action,
              narration: adjacentContext.currentScene.narration,
            },
            nextScene: adjacentContext.nextScene ? {
              heading: adjacentContext.nextScene.heading,
              action: adjacentContext.nextScene.action,
            } : undefined,
          } : undefined,
          typeConfig: {
            name: typeConfig.name,
            aiHint: typeConfig.aiHint,
            styleKeywords: typeConfig.styleKeywords,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate prompt')
      }

      const data = await response.json()
      
      if (data.prompt) {
        setGeneratedPrompt(data.prompt)
        setHasUserEdited(false)
        // Update duration if AI suggests one
        if (data.suggestedDuration && typeof data.suggestedDuration === 'number') {
          setDuration(Math.min(Math.max(data.suggestedDuration, 2), 12))
        }
        console.log('[AddSpecialSegmentDialog] AI generated prompt:', data.prompt.substring(0, 100) + '...')
      } else {
        // Fallback to static prompt
        setGeneratedPrompt(typeConfig.fallbackPromptTemplate)
      }
    } catch (error) {
      console.error('[AddSpecialSegmentDialog] AI prompt generation failed:', error)
      setAiError(error instanceof Error ? error.message : 'AI unavailable')
      // Use static fallback
      setGeneratedPrompt(typeConfig.fallbackPromptTemplate)
    } finally {
      setIsGeneratingPrompt(false)
    }
  }, [selectedType, filmContext, adjacentContext, typeConfig])
  
  // Generate prompt when type changes or dialog opens
  useEffect(() => {
    if (!open) return
    
    setDuration(typeConfig.defaultDuration)
    setHasUserEdited(false)
    
    // Always generate AI prompt for special segments
    generateAIPrompt()
  }, [selectedType, open]) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedType('title')
      setGeneratedPrompt('')
      setAiError(null)
      setHasUserEdited(false)
    }
  }, [open])
  
  // Handle submit
  const handleSubmit = useCallback(() => {
    const startTime = insertIndex > 0 
      ? existingSegments[insertIndex - 1]?.endTime || 0 
      : 0
    
    const newSegment: Partial<SceneSegment> & { 
      segmentPurpose: SegmentPurpose
      insertPosition: 'before' | 'after' | 'start' | 'end'
      insertIndex: number 
    } = {
      segmentId: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sequenceIndex: insertIndex,
      startTime: startTime,
      endTime: startTime + duration,
      status: 'DRAFT',
      generatedPrompt: generatedPrompt,
      transitionType: typeConfig.presetSettings.transitionType || 'CUT',
      actionType: (typeConfig.presetSettings.actionType as any) || 'static',
      anchorStatus: 'pending',
      segmentPurpose: selectedType,
      insertPosition: insertPosition === 'after' ? 'after' : insertPosition,
      insertIndex: insertIndex,
      // Special segments are video-only placeholders (no keyframes needed)
      isSpecialSegment: true,
    }
    
    onAddSegment(newSegment)
    onOpenChange(false)
  }, [
    insertIndex, 
    existingSegments, 
    duration, 
    generatedPrompt, 
    typeConfig, 
    selectedType, 
    insertPosition, 
    onAddSegment, 
    onOpenChange
  ])
  
  // Handle prompt edit
  const handlePromptChange = useCallback((value: string) => {
    setGeneratedPrompt(value)
    setHasUserEdited(true)
  }, [])
  
  // Reset prompt to AI-generated
  const resetPrompt = useCallback(() => {
    generateAIPrompt()
  }, [generateAIPrompt])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-purple-400" />
            Add Cinematic Element
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a special video segment. AI will generate an optimized prompt for video generation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Segment Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-300">Element Type</Label>
            <ScrollArea className="h-[280px] pr-2">
              <div className="grid gap-2">
                {SPECIAL_SEGMENT_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = selectedType === type.id
                  
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all",
                        isSelected
                          ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                          isSelected ? "bg-purple-500/20 text-purple-400" : "bg-slate-700 text-slate-400"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={cn(
                              "font-medium text-sm",
                              isSelected ? "text-purple-300" : "text-white"
                            )}>
                              {type.name}
                            </h4>
                            <Badge variant="outline" className="text-[10px] py-0 h-5 text-slate-400 border-slate-600">
                              {type.defaultDuration}s
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
          
          {/* Duration Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-300">Duration</Label>
              <span className="text-sm font-mono text-purple-400">{duration}s</span>
            </div>
            <Slider
              value={[duration]}
              onValueChange={([v]) => setDuration(v)}
              min={2}
              max={12}
              step={0.5}
              className="[&_[role=slider]]:bg-purple-500"
            />
            <p className="text-xs text-slate-500">
              Recommended: {typeConfig.defaultDuration}s for {typeConfig.name}
            </p>
          </div>
          
          {/* AI Generated Prompt */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Video Generation Prompt
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetPrompt}
                  disabled={isGeneratingPrompt}
                  className="h-7 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  {isGeneratingPrompt ? 'Generating...' : 'Regenerate'}
                </Button>
                {hasUserEdited && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => generateAIPrompt()}
                    className="h-7 px-2 text-xs text-slate-400 hover:text-slate-300"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
            
            {/* AI Generation Status */}
            {isGeneratingPrompt && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating cinematic prompt...
                </div>
              </div>
            )}
            
            {/* AI Error */}
            {aiError && !isGeneratingPrompt && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Using Template Prompt
                </div>
                <p className="text-xs text-amber-300/70">
                  AI unavailable: {aiError}
                </p>
              </div>
            )}
            
            <Textarea
              value={generatedPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="AI-generated prompt will appear here..."
              className="h-[120px] bg-slate-800 border-slate-600 text-white text-sm resize-none"
              disabled={isGeneratingPrompt}
            />
            <p className="text-xs text-slate-500">
              {generatedPrompt.length} characters • Edit to customize or click Regenerate for a new prompt
            </p>
          </div>
          
          {/* Preview Info */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Eye className="w-3.5 h-3.5" />
                <span>Insert at position {insertIndex + 1}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] py-0 h-5 text-purple-400 border-purple-500/30">
                  {typeConfig.presetSettings.transitionType || 'CUT'}
                </Badge>
                <Badge variant="outline" className="text-[10px] py-0 h-5 text-slate-400 border-slate-600">
                  No keyframes
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isGeneratingPrompt || !generatedPrompt.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {typeConfig.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddSpecialSegmentDialog
