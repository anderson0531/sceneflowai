'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Loader2, Sparkles, Wand2, Film, Camera, Lightbulb, Users, 
  Volume2, VolumeX, Play, Square, ChevronDown, ChevronUp,
  CheckCircle2, Mic, MicOff, RefreshCw, Settings2, Zap,
  Eye, Heart, Target, Layers, Palette, Wind
} from 'lucide-react'
import { toast } from 'sonner'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import type { DetailedSceneDirection, PerformanceDirection, VeoOptimization, NarrativeLighting } from '@/types/scene-direction'

// ============================================================================
// Optimization Templates - Predefined professional direction enhancements
// ============================================================================

const DIRECTION_OPTIMIZATION_TEMPLATES = [
  {
    id: 'cinematic-performance',
    icon: <Users className="w-4 h-4" />,
    label: 'Cinematic Performance',
    description: 'Add micro-expressions, emotional transitions, and subtext motivation',
    category: 'performance',
    instruction: `Transform talent direction from generic acting to cinematic performance:
- Add specific micro-expressions (trembling lip, widening eyes, jaw tension)
- Define emotional transitions as sequences (Recognition → Grief → Comfort)
- Include subtext motivation (what the character is really feeling beneath the surface)
- Add physiological cues (breathing patterns, swallowing, blinking rate)
- Focus on the HOW and WHY of the performance, not just WHAT happens`
  },
  {
    id: 'physics-weight',
    icon: <Zap className="w-4 h-4" />,
    label: 'Physics & Weight',
    description: 'Add realistic physical interactions with weight and gravity',
    category: 'performance',
    instruction: `Enhance physical realism in talent and prop interactions:
- Add muscle tension descriptions (strain in neck tendons, fingers digging in)
- Include implied weight and gravity (knees buckling, doubled over)
- Describe physical texture interactions (sweat glistening, dust disturbed)
- Add physiological responses to effort (grunting, heavy breathing)
- Make objects feel real (thudding impact, material resistance)`
  },
  {
    id: 'emotional-transitions',
    icon: <Heart className="w-4 h-4" />,
    label: 'Emotional Transitions',
    description: 'Convert binary emotions to nuanced transitional sequences',
    category: 'performance',
    instruction: `Transform simple emotional states into transitional sequences:
- Replace binary emotions (sad/happy) with transition arcs
- Add progression: initial recognition, building emotion, peak, resolution
- Include micro-beats within the emotional journey
- Layer contradictory emotions where appropriate
- Show emotion through physical manifestation, not just facial expression`
  },
  {
    id: 'narrative-lighting',
    icon: <Lightbulb className="w-4 h-4" />,
    label: 'Narrative Lighting',
    description: 'Enhance lighting to tell the story and define mood',
    category: 'visual',
    instruction: `Elevate lighting from technical to narrative:
- Define practical light sources that tell the story (single lamp = isolation)
- Add atmospheric elements visible in light (dust motes, steam, haze)
- Create color temperature contrast stories (cool screens vs warm lamp)
- Describe shadow narrative (what shadows reveal about the scene)
- Include light quality that matches emotional tone`
  },
  {
    id: 'camera-choreography',
    icon: <Camera className="w-4 h-4" />,
    label: 'Camera Choreography',
    description: 'Optimize camera movement for cinematic storytelling',
    category: 'visual',
    instruction: `Transform camera direction into choreographed sequences:
- Add motivated camera movements that follow emotional beats
- Include pull-back reveals for establishing isolation/environment
- Add push-in moments for emotional emphasis
- Describe camera behavior relative to character psychology
- Include specific frame composition motivations`
  },
  {
    id: 'veo3-optimization',
    icon: <Sparkles className="w-4 h-4" />,
    label: 'Veo-3 Enhancement',
    description: 'Add keywords optimized for Veo-3 video generation',
    category: 'technical',
    instruction: `Add Veo-3 specific optimization keywords:
- Enable subsurface scattering for realistic skin rendering
- Add motion quality descriptors (fluid, weighted, deliberate)
- Include object interaction specifics (acts WITH not NEAR objects)
- Add texture and materiality hints
- Include anti-mannequin negative prompts`
  },
  {
    id: 'continuity-consistency',
    icon: <Layers className="w-4 h-4" />,
    label: 'Continuity & Consistency',
    description: 'Ensure visual consistency across segments',
    category: 'technical',
    instruction: `Optimize for segment and keyframe consistency:
- Lock in specific prop positions and states
- Define exact costume/wardrobe details
- Specify character positioning markers
- Include lighting setup persistence details
- Add environment state continuity notes`
  },
  {
    id: 'atmosphere-immersion',
    icon: <Wind className="w-4 h-4" />,
    label: 'Atmosphere & Immersion',
    description: 'Deepen environmental atmosphere and sensory details',
    category: 'visual',
    instruction: `Enhance atmospheric and sensory immersion:
- Add specific environmental textures and materials
- Include ambient sound implications in visual descriptions
- Describe air quality and particle effects
- Add temperature and tactile suggestions
- Include smell/taste implications through visual cues`
  }
]

// Default Veo-3 negative prompts to prevent stiff renders
const DEFAULT_NEGATIVE_PROMPTS = [
  'stiff posture',
  'frozen expression',
  'robotic movement',
  'digital mask',
  'mannequin-like',
  'uncanny valley',
  'plastic skin',
  'dead eyes',
  'mechanical motion',
  'unnatural pose'
]

// ============================================================================
// Component Types
// ============================================================================

interface SceneForOptimization {
  sceneId?: string
  id?: string
  heading?: string | { text: string }
  action?: string
  visualDescription?: string
  narration?: string
  narrationAudioUrl?: string
  dialogue?: Array<{ character: string; text?: string; line?: string }>
  sceneDirection?: DetailedSceneDirection
}

export interface DirectionOptimizationConfig {
  selectedTemplates: string[]
  customInstruction: string
  propagateToSegments: boolean
  enableSubsurfaceScattering: boolean
  includeNegativePrompts: boolean
  negativePrompts: string[]
  targetGeneration: 'keyframe' | 'video' | 'both'
}

interface SceneDirectionOptimizeDialogProps {
  isOpen: boolean
  onClose: () => void
  sceneNumber: number
  scene: SceneForOptimization
  onOptimize: (config: DirectionOptimizationConfig) => Promise<DetailedSceneDirection | null>
  isOptimizing?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function SceneDirectionOptimizeDialog({
  isOpen,
  onClose,
  sceneNumber,
  scene,
  onOptimize,
  isOptimizing = false
}: SceneDirectionOptimizeDialogProps) {
  // State
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [customInstruction, setCustomInstruction] = useState('')
  const [propagateToSegments, setPropagateToSegments] = useState(true)
  const [enableSubsurfaceScattering, setEnableSubsurfaceScattering] = useState(true)
  const [includeNegativePrompts, setIncludeNegativePrompts] = useState(true)
  const [negativePrompts, setNegativePrompts] = useState<string[]>(DEFAULT_NEGATIVE_PROMPTS)
  const [targetGeneration, setTargetGeneration] = useState<'keyframe' | 'video' | 'both'>('both')
  const [activeTab, setActiveTab] = useState('quick')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['performance', 'visual', 'technical']))
  
  // Audio playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Speech recognition
  const {
    supported: sttSupported,
    isSecure: sttSecure,
    isRecording: isMicRecording,
    transcript: micTranscript,
    start: startMic,
    stop: stopMic,
    setTranscript: setMicTranscript
  } = useSpeechRecognition()
  
  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplates(new Set())
      setCustomInstruction('')
      setPropagateToSegments(true)
      setEnableSubsurfaceScattering(true)
      setIncludeNegativePrompts(true)
      setNegativePrompts(DEFAULT_NEGATIVE_PROMPTS)
      setTargetGeneration('both')
      setActiveTab('quick')
    }
    return () => {
      // Cleanup audio on close
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setIsPlayingAudio(false)
    }
  }, [isOpen, sceneNumber])
  
  // Update custom instruction with speech transcript
  useEffect(() => {
    if (isMicRecording && micTranscript) {
      setCustomInstruction(prev => prev ? `${prev} ${micTranscript}` : micTranscript)
    }
  }, [isMicRecording, micTranscript])
  
  // Get scene heading text
  const sceneHeading = typeof scene.heading === 'string' 
    ? scene.heading 
    : scene.heading?.text || `Scene ${sceneNumber}`
  
  // Get existing direction status
  const hasExistingDirection = !!scene.sceneDirection
  const isProductionOptimized = scene.sceneDirection?.productionOptimized
  
  // Audio playback
  const handlePlayAudio = useCallback(() => {
    const audioUrl = scene.narrationAudioUrl
    if (!audioUrl) {
      toast.error('No audio available for this scene')
      return
    }
    
    if (isPlayingAudio) {
      audioRef.current?.pause()
      setIsPlayingAudio(false)
      return
    }
    
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => setIsPlayingAudio(false)
      audioRef.current.onerror = () => {
        setIsPlayingAudio(false)
        toast.error('Failed to play audio')
      }
    } else {
      audioRef.current.src = audioUrl
    }
    
    audioRef.current.play()
      .then(() => setIsPlayingAudio(true))
      .catch(() => {
        setIsPlayingAudio(false)
        toast.error('Failed to play audio')
      })
  }, [scene.narrationAudioUrl, isPlayingAudio])
  
  // Voice input toggle
  const handleVoiceToggle = () => {
    if (!sttSupported || !sttSecure) {
      toast.error('Voice input not available in this browser')
      return
    }
    if (isMicRecording) {
      stopMic()
      setMicTranscript('')
    } else {
      setMicTranscript('')
      startMic()
    }
  }
  
  // Template toggle
  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      return next
    })
  }
  
  // Category toggle
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }
  
  // Remove negative prompt
  const removeNegativePrompt = (prompt: string) => {
    setNegativePrompts(prev => prev.filter(p => p !== prompt))
  }
  
  // Add negative prompt
  const addNegativePrompt = (prompt: string) => {
    const trimmed = prompt.trim().toLowerCase()
    if (trimmed && !negativePrompts.includes(trimmed)) {
      setNegativePrompts(prev => [...prev, trimmed])
    }
  }
  
  // Handle optimize
  const handleOptimize = async () => {
    const config: DirectionOptimizationConfig = {
      selectedTemplates: Array.from(selectedTemplates),
      customInstruction: customInstruction.trim(),
      propagateToSegments,
      enableSubsurfaceScattering,
      includeNegativePrompts,
      negativePrompts,
      targetGeneration
    }
    
    if (config.selectedTemplates.length === 0 && !config.customInstruction) {
      toast.error('Please select optimization options or provide custom instructions')
      return
    }
    
    await onOptimize(config)
  }
  
  const hasSelections = selectedTemplates.size > 0 || customInstruction.trim().length > 0
  
  // Group templates by category
  const performanceTemplates = DIRECTION_OPTIMIZATION_TEMPLATES.filter(t => t.category === 'performance')
  const visualTemplates = DIRECTION_OPTIMIZATION_TEMPLATES.filter(t => t.category === 'visual')
  const technicalTemplates = DIRECTION_OPTIMIZATION_TEMPLATES.filter(t => t.category === 'technical')
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500" />
            Optimize Scene Direction
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span className="truncate max-w-[400px]">Scene {sceneNumber}: {sceneHeading}</span>
            <div className="flex items-center gap-2">
              {hasExistingDirection && (
                <Badge variant={isProductionOptimized ? 'default' : 'secondary'} className="text-xs">
                  {isProductionOptimized ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Production Ready
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Enhanced
                    </>
                  )}
                </Badge>
              )}
              {scene.narrationAudioUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayAudio}
                  className="h-7 px-2"
                  title="Play scene narration"
                >
                  {isPlayingAudio ? (
                    <Square className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-green-500" />
                  )}
                  <span className="ml-1 text-xs">Audio</span>
                </Button>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 mb-2">
            <TabsTrigger value="quick" className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Quick Optimize
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              Custom Direction
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto">
            {/* Quick Optimize Tab */}
            <TabsContent value="quick" className="mt-0 space-y-4">
              {/* Performance Category */}
              <div className="space-y-2">
                <button
                  onClick={() => toggleCategory('performance')}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 dark:text-gray-200"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-500" />
                    Performance & Acting
                  </span>
                  {expandedCategories.has('performance') ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {expandedCategories.has('performance') && (
                  <div className="grid grid-cols-1 gap-2 pl-1">
                    {performanceTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplates.has(template.id)}
                        onToggle={() => toggleTemplate(template.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Visual Category */}
              <div className="space-y-2">
                <button
                  onClick={() => toggleCategory('visual')}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 dark:text-gray-200"
                >
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-500" />
                    Visual & Atmosphere
                  </span>
                  {expandedCategories.has('visual') ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {expandedCategories.has('visual') && (
                  <div className="grid grid-cols-1 gap-2 pl-1">
                    {visualTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplates.has(template.id)}
                        onToggle={() => toggleTemplate(template.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Technical Category */}
              <div className="space-y-2">
                <button
                  onClick={() => toggleCategory('technical')}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 dark:text-gray-200"
                >
                  <span className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-purple-500" />
                    Technical & Consistency
                  </span>
                  {expandedCategories.has('technical') ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {expandedCategories.has('technical') && (
                  <div className="grid grid-cols-1 gap-2 pl-1">
                    {technicalTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplates.has(template.id)}
                        onToggle={() => toggleTemplate(template.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Custom Direction Tab */}
            <TabsContent value="custom" className="mt-0 space-y-4">
              {/* Custom Instructions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-instruction" className="text-sm font-medium">
                    Specific Direction Instructions
                  </Label>
                  {sttSupported && sttSecure && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleVoiceToggle}
                      className={`h-7 ${isMicRecording ? 'text-red-500' : ''}`}
                    >
                      {isMicRecording ? (
                        <MicOff className="w-3.5 h-3.5" />
                      ) : (
                        <Mic className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                </div>
                <Textarea
                  id="custom-instruction"
                  placeholder="Enter specific direction instructions for this scene... (e.g., 'Add a moment where she hesitates before opening the letter, her fingers trembling as she recognizes the handwriting')"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  className="min-h-[120px] text-sm"
                />
              </div>
              
              {/* Current Scene Context */}
              {(scene.visualDescription || scene.action || scene.narration) && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Current Scene Context
                  </span>
                  {scene.visualDescription && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      "{scene.visualDescription}"
                    </p>
                  )}
                  {scene.action && !scene.visualDescription && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {scene.action}
                    </p>
                  )}
                  {scene.narration && (
                    <div className="flex items-start gap-2 pt-1">
                      <Volume2 className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {scene.narration}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
        
        {/* Settings Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Target Generation */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Optimize For
              </Label>
              <div className="flex gap-1">
                {(['keyframe', 'video', 'both'] as const).map(target => (
                  <Button
                    key={target}
                    variant={targetGeneration === target ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTargetGeneration(target)}
                    className="flex-1 text-xs capitalize"
                  >
                    {target === 'both' ? 'Both' : target === 'keyframe' ? 'Keyframes' : 'Video'}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Propagation */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Apply To
              </Label>
              <div className="flex items-center gap-2 h-8">
                <Switch
                  id="propagate"
                  checked={propagateToSegments}
                  onCheckedChange={setPropagateToSegments}
                />
                <Label htmlFor="propagate" className="text-xs cursor-pointer">
                  Propagate to all segments
                </Label>
              </div>
            </div>
          </div>
          
          {/* Veo-3 Optimizations */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="subsurface"
                checked={enableSubsurfaceScattering}
                onCheckedChange={setEnableSubsurfaceScattering}
              />
              <Label htmlFor="subsurface" className="text-xs cursor-pointer">
                Subsurface Scattering
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="negative"
                checked={includeNegativePrompts}
                onCheckedChange={setIncludeNegativePrompts}
              />
              <Label htmlFor="negative" className="text-xs cursor-pointer">
                Anti-Mannequin Prompts
              </Label>
            </div>
          </div>
          
          {/* Negative Prompts Preview */}
          {includeNegativePrompts && (
            <div className="flex flex-wrap gap-1">
              {negativePrompts.slice(0, 5).map(prompt => (
                <Badge
                  key={prompt}
                  variant="secondary"
                  className="text-[10px] cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30"
                  onClick={() => removeNegativePrompt(prompt)}
                >
                  {prompt} ×
                </Badge>
              ))}
              {negativePrompts.length > 5 && (
                <Badge variant="outline" className="text-[10px]">
                  +{negativePrompts.length - 5} more
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isOptimizing}>
            Cancel
          </Button>
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing || !hasSelections}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Optimize Direction
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Template Card Sub-component
// ============================================================================

interface TemplateCardProps {
  template: typeof DIRECTION_OPTIMIZATION_TEMPLATES[0]
  isSelected: boolean
  onToggle: () => void
}

function TemplateCard({ template, isSelected, onToggle }: TemplateCardProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-start gap-3 p-3 rounded-lg border text-left transition-all
        ${isSelected 
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      <div className={`
        p-2 rounded-md
        ${isSelected 
          ? 'bg-purple-500 text-white' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        }
      `}>
        {template.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'}`}>
            {template.label}
          </span>
          {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-500" />}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {template.description}
        </p>
      </div>
    </button>
  )
}

// Export types and constants
export { DIRECTION_OPTIMIZATION_TEMPLATES, DEFAULT_NEGATIVE_PROMPTS }
