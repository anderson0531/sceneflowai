'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Film,
  Camera,
  Plus,
  ArrowRight,
  Sparkles,
  Wand2,
  Eye,
  ChevronRight,
  RotateCcw,
  Lightbulb,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { SceneSegment } from './types'

// ============================================================================
// Types
// ============================================================================

export type SegmentPurpose = 
  | 'standard'      // Normal scene segment
  | 'extend'        // Extend from previous segment's end frame
  | 'title'         // Title sequence with text overlay
  | 'match-cut'     // Match cut transition between scenes
  | 'establishing'  // Establishing/location shot
  | 'broll'         // B-Roll/visual breather
  | 'outro'         // Outro/credits

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

export interface AddSegmentTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sceneId: string
  sceneNumber: number
  existingSegments: SceneSegment[]
  adjacentContext?: AdjacentSceneContext
  onAddSegment: (segment: Partial<SceneSegment> & { 
    segmentPurpose: SegmentPurpose
    insertPosition: 'before' | 'after' | 'start' | 'end'
    insertIndex?: number 
  }) => void
  /** Optional callback to regenerate all segments (opens KeyframeRegenerationDialog) */
  onRegenerateAll?: () => void
  /** Film context for AI prompt generation */
  filmContext?: {
    title?: string
    logline?: string
    genre?: string[]
    tone?: string
    targetAudience?: string
  }
}

// ============================================================================
// Segment Type Definitions
// ============================================================================

interface SegmentTypeConfig {
  id: SegmentPurpose
  name: string
  icon: React.ElementType
  description: string
  defaultDuration: number
  defaultPromptTemplate: string
  presetSettings: {
    shotType?: string
    cameraMovement?: string
    transitionType?: 'CUT' | 'CONTINUE'
    actionType?: string
  }
  contextPromptBuilder?: (context: AdjacentSceneContext) => string
}

// Standard segment types for keyframe-based video generation
// Special segments (title, match-cut, establishing, broll, outro) are now handled
// by AddSpecialSegmentDialog with AI-powered prompt generation
const SEGMENT_TYPES: SegmentTypeConfig[] = [
  {
    id: 'standard',
    name: 'Standard Segment',
    icon: Film,
    description: 'Scene segment with start/end keyframes for AI video generation. Full control over shot composition.',
    defaultDuration: 6,
    defaultPromptTemplate: 'Cinematic shot. Professional lighting and composition.',
    presetSettings: {
      transitionType: 'CUT',
      actionType: 'gesture'
    },
    contextPromptBuilder: (ctx) => {
      const parts: string[] = ['Cinematic shot.']
      
      if (ctx.currentScene.action) {
        const actionPreview = ctx.currentScene.action.substring(0, 150)
        parts.push(`Action: ${actionPreview}...`)
      }
      
      parts.push('Professional lighting, cinematic composition.')
      return parts.join(' ')
    }
  },
  {
    id: 'extend',
    name: 'Continue Shot',
    icon: ArrowRight,
    description: 'Continue from previous segment\'s end frame. Maintains visual continuity across cuts.',
    defaultDuration: 6,
    defaultPromptTemplate: 'Continue the action from the previous shot. Maintain camera angle, lighting, and visual style.',
    presetSettings: {
      transitionType: 'CONTINUE',
      actionType: 'movement'
    },
    contextPromptBuilder: (ctx) => {
      const parts: string[] = []
      if (ctx.previousScene?.lastSegment?.endFramePrompt) {
        parts.push(`Continue from: ${ctx.previousScene.lastSegment.endFramePrompt}`)
      }
      parts.push('Maintain visual continuity, match camera angle and lighting.')
      if (ctx.currentScene.action) {
        const actionPreview = ctx.currentScene.action.substring(0, 150)
        parts.push(`Action: ${actionPreview}...`)
      }
      return parts.join(' ')
    }
  }
]

// ============================================================================
// Position Options
// ============================================================================

type InsertPosition = 'start' | 'before' | 'after' | 'end'

const POSITION_OPTIONS: { value: InsertPosition; label: string; description: string }[] = [
  { value: 'start', label: 'At Start', description: 'Insert as first segment' },
  { value: 'before', label: 'Before Selected', description: 'Insert before selected segment' },
  { value: 'after', label: 'After Selected', description: 'Insert after selected segment' },
  { value: 'end', label: 'At End', description: 'Append as last segment' }
]

// ============================================================================
// Main Component
// ============================================================================

export function AddSegmentTypeDialog({
  open,
  onOpenChange,
  sceneId,
  sceneNumber,
  existingSegments,
  adjacentContext,
  onAddSegment,
  onRegenerateAll,
  filmContext,
}: AddSegmentTypeDialogProps) {
  // State
  const [selectedType, setSelectedType] = useState<SegmentPurpose>('standard')
  const [insertPosition, setInsertPosition] = useState<InsertPosition>('end')
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number>(0)
  const [duration, setDuration] = useState<number>(6)
  const [customPrompt, setCustomPrompt] = useState<string>('')
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [activeTab, setActiveTab] = useState<'type' | 'position' | 'prompt'>('type')
  const [aiError, setAiError] = useState<string | null>(null)
  
  // Get selected type config
  const typeConfig = useMemo(() => 
    SEGMENT_TYPES.find(t => t.id === selectedType) || SEGMENT_TYPES[0],
    [selectedType]
  )
  
  // Generate context-aware prompt using static builder (fallback)
  const contextAwarePrompt = useMemo(() => {
    if (!adjacentContext) return typeConfig.defaultPromptTemplate
    
    if (typeConfig.contextPromptBuilder) {
      return typeConfig.contextPromptBuilder(adjacentContext)
    }
    return typeConfig.defaultPromptTemplate
  }, [typeConfig, adjacentContext])

  // Generate AI-powered prompt using Gemini 2.5
  const generateAIPrompt = useCallback(async () => {
    if (!adjacentContext) {
      setCustomPrompt(contextAwarePrompt)
      return
    }

    setIsGeneratingPrompt(true)
    setAiError(null)

    try {
      const response = await fetch('/api/intelligence/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'segment',
          segmentPurpose: selectedType,
          adjacentScenes: {
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
          },
          filmContext: filmContext,
          thinkingLevel: 'low', // Fast generation for interactive use
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate prompt')
      }

      const data = await response.json()
      
      if (data.prompt) {
        setCustomPrompt(data.prompt)
        // Update duration if AI suggests one
        if (data.suggestedDuration) {
          setDuration(data.suggestedDuration)
        }
        console.log('[AddSegmentTypeDialog] AI generated prompt, confidence:', data.confidence)
      } else {
        // Fallback to static prompt
        setCustomPrompt(contextAwarePrompt)
      }
    } catch (error) {
      console.error('[AddSegmentTypeDialog] AI prompt generation failed:', error)
      setAiError(error instanceof Error ? error.message : 'AI unavailable')
      // Use static fallback
      setCustomPrompt(contextAwarePrompt)
    } finally {
      setIsGeneratingPrompt(false)
    }
  }, [selectedType, adjacentContext, filmContext, contextAwarePrompt])
  
  // Initialize prompt when type changes - use AI for special segment types
  useEffect(() => {
    setDuration(typeConfig.defaultDuration)
    
    // For title sequences, establishing shots, and outros - use AI prompt generation
    const aiEnabledTypes: SegmentPurpose[] = ['title', 'establishing', 'outro', 'match-cut', 'broll']
    
    if (aiEnabledTypes.includes(selectedType) && adjacentContext) {
      // Generate AI prompt (async)
      generateAIPrompt()
    } else {
      // Use static context-aware prompt
      setCustomPrompt(contextAwarePrompt)
    }
  }, [selectedType, typeConfig.defaultDuration, adjacentContext, generateAIPrompt, contextAwarePrompt])
  
  // Calculate insert index based on position
  const calculateInsertIndex = useCallback((): number => {
    switch (insertPosition) {
      case 'start':
        return 0
      case 'before':
        return selectedSegmentIndex
      case 'after':
        return selectedSegmentIndex + 1
      case 'end':
      default:
        return existingSegments.length
    }
  }, [insertPosition, selectedSegmentIndex, existingSegments.length])
  
  // Handle submit
  const handleSubmit = useCallback(() => {
    const insertIndex = calculateInsertIndex()
    const startTime = insertIndex > 0 
      ? existingSegments[insertIndex - 1]?.endTime || 0 
      : 0
    
    const newSegment: Partial<SceneSegment> & { 
      segmentPurpose: SegmentPurpose
      insertPosition: InsertPosition
      insertIndex: number 
    } = {
      segmentId: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sequenceIndex: insertIndex,
      startTime: startTime,
      endTime: startTime + duration,
      status: 'DRAFT',
      generatedPrompt: customPrompt,
      transitionType: typeConfig.presetSettings.transitionType || 'CUT',
      actionType: (typeConfig.presetSettings.actionType as any) || 'gesture',
      anchorStatus: 'pending',
      segmentPurpose: selectedType,
      insertPosition: insertPosition,
      insertIndex: insertIndex
    }
    
    onAddSegment(newSegment)
    onOpenChange(false)
    
    // Reset state
    setSelectedType('standard')
    setInsertPosition('end')
    setActiveTab('type')
  }, [
    calculateInsertIndex, 
    existingSegments, 
    duration, 
    customPrompt, 
    typeConfig, 
    selectedType, 
    insertPosition, 
    onAddSegment, 
    onOpenChange
  ])
  
  // Reset prompt to default
  const resetPrompt = useCallback(() => {
    setCustomPrompt(contextAwarePrompt)
  }, [contextAwarePrompt])
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            Add Segment to Scene {sceneNumber}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a keyframe-based segment for AI video generation. For cinematic elements (titles, transitions, B-roll), use the Cinematic Elements button.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-2">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800">
            <TabsTrigger value="type" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
              <Film className="w-4 h-4 mr-2" />
              Type
            </TabsTrigger>
            <TabsTrigger value="position" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
              <MapPin className="w-4 h-4 mr-2" />
              Position
            </TabsTrigger>
            <TabsTrigger value="prompt" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
              <Sparkles className="w-4 h-4 mr-2" />
              Prompt
            </TabsTrigger>
          </TabsList>
          
          {/* Type Selection Tab */}
          <TabsContent value="type" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid gap-3">
                {SEGMENT_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = selectedType === type.id
                  
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border transition-all",
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          isSelected ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-700 text-slate-400"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className={cn(
                              "font-medium",
                              isSelected ? "text-cyan-300" : "text-white"
                            )}>
                              {type.name}
                            </h4>
                            <Badge variant="outline" className="text-[10px] py-0 h-5 text-slate-400 border-slate-600">
                              {type.defaultDuration}s default
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400 mt-1">
                            {type.description}
                          </p>
                        </div>
                        {isSelected && (
                          <ChevronRight className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
                
                {/* Regenerate All Segments Section */}
                {onRegenerateAll && existingSegments.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 pt-4 pb-2">
                      <div className="flex-1 h-px bg-slate-700" />
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">or</span>
                      <div className="flex-1 h-px bg-slate-700" />
                    </div>
                    <button
                      onClick={() => {
                        onOpenChange(false)
                        onRegenerateAll()
                      }}
                      className="w-full text-left p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/20 text-amber-400">
                          <RefreshCw className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-amber-300">Regenerate All Segments</h4>
                            <Badge variant="outline" className="text-[10px] py-0 h-5 text-amber-400 border-amber-500/30">
                              {existingSegments.length} segments
                            </Badge>
                          </div>
                          <p className="text-sm text-amber-300/70 mt-1">
                            Re-analyze the scene and generate new segments with AI. This will replace existing segments.
                          </p>
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Position Tab */}
          <TabsContent value="position" className="mt-4">
            <div className="space-y-6">
              {/* Insert Position */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-300">Insert Position</Label>
                <RadioGroup 
                  value={insertPosition} 
                  onValueChange={(v) => setInsertPosition(v as InsertPosition)}
                  className="grid grid-cols-2 gap-3"
                >
                  {POSITION_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        insertPosition === option.value
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                      )}
                    >
                      <RadioGroupItem value={option.value} className="border-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-white">{option.label}</p>
                        <p className="text-xs text-slate-400">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              
              {/* Segment Selector (for before/after) */}
              {(insertPosition === 'before' || insertPosition === 'after') && existingSegments.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-300">Reference Segment</Label>
                  <Select 
                    value={selectedSegmentIndex.toString()} 
                    onValueChange={(v) => setSelectedSegmentIndex(parseInt(v))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Select segment" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {existingSegments.map((seg, idx) => (
                        <SelectItem key={seg.segmentId} value={idx.toString()}>
                          Segment {idx + 1} ({(seg.endTime - seg.startTime).toFixed(1)}s)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Duration Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-slate-300">Duration</Label>
                  <span className="text-sm font-mono text-cyan-400">{duration}s</span>
                </div>
                <Slider
                  value={[duration]}
                  onValueChange={([v]) => setDuration(v)}
                  min={2}
                  max={12}
                  step={0.5}
                  className="[&_[role=slider]]:bg-cyan-500"
                />
                <p className="text-xs text-slate-500">
                  Recommended: {typeConfig.defaultDuration}s for {typeConfig.name}
                </p>
              </div>
              
              {/* Visual Preview */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Preview</Label>
                <div className="flex items-center gap-2 mt-3">
                  {existingSegments.slice(0, calculateInsertIndex()).map((_, idx) => (
                    <div key={idx} className="h-8 flex-1 rounded bg-slate-700 flex items-center justify-center">
                      <span className="text-[10px] text-slate-400">{idx + 1}</span>
                    </div>
                  ))}
                  <div className="h-8 flex-1 rounded bg-cyan-500/30 border-2 border-cyan-500 border-dashed flex items-center justify-center">
                    <span className="text-[10px] text-cyan-400 font-medium">NEW</span>
                  </div>
                  {existingSegments.slice(calculateInsertIndex()).map((_, idx) => (
                    <div key={idx} className="h-8 flex-1 rounded bg-slate-700 flex items-center justify-center">
                      <span className="text-[10px] text-slate-400">{calculateInsertIndex() + idx + 2}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Prompt Tab */}
          <TabsContent value="prompt" className="mt-4">
            <div className="space-y-4">
              {/* AI Generation Status */}
              {isGeneratingPrompt && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                    <Wand2 className="w-4 h-4 animate-pulse" />
                    Generating intelligent prompt with Gemini 2.5...
                  </div>
                </div>
              )}
              
              {/* AI Error */}
              {aiError && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1">
                    <AlertCircle className="w-4 h-4" />
                    AI Unavailable
                  </div>
                  <p className="text-xs text-amber-300/70">
                    Using template prompt. {aiError}
                  </p>
                </div>
              )}
              
              {/* Context Awareness Info - Now AI-powered */}
              {!isGeneratingPrompt && !aiError && adjacentContext && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-1">
                    <Lightbulb className="w-4 h-4" />
                    Context-Aware Prompt
                  </div>
                  <p className="text-xs text-emerald-300/70">
                    This prompt was generated based on adjacent scene analysis. Edit as needed.
                  </p>
                </div>
              )}
              
              {/* Prompt Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-slate-300">Generation Prompt</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={generateAIPrompt}
                      disabled={isGeneratingPrompt}
                      className="h-7 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      {isGeneratingPrompt ? 'Generating...' : 'AI Generate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={resetPrompt}
                      className="h-7 px-2 text-xs text-slate-400 hover:text-cyan-400"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe the visual content..."
                  className="h-[200px] bg-slate-800 border-slate-600 text-white resize-none"
                  disabled={isGeneratingPrompt}
                />
                <p className="text-xs text-slate-500">
                  {customPrompt.length} characters • This prompt will be used for frame generation
                </p>
              </div>
              
              {/* Preset Settings Preview */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Preset Settings</Label>
                <div className="flex flex-wrap gap-2 mt-3">
                  {typeConfig.presetSettings.shotType && (
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                      <Camera className="w-3 h-3 mr-1" />
                      {typeConfig.presetSettings.shotType}
                    </Badge>
                  )}
                  {typeConfig.presetSettings.cameraMovement && (
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                      <Eye className="w-3 h-3 mr-1" />
                      {typeConfig.presetSettings.cameraMovement}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                    {typeConfig.presetSettings.transitionType || 'CUT'}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                    {typeConfig.presetSettings.actionType || 'gesture'}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {typeConfig.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddSegmentTypeDialog
