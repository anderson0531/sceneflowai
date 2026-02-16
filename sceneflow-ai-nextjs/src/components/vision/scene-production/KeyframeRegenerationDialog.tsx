'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
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
  RefreshCw,
  Layers,
  Film,
  Clock,
  Camera,
  Sun,
  Palette,
  Users,
  AlertCircle,
  Info,
  Sparkles,
  ArrowRight,
  Scissors,
  Music,
  Volume2,
  ChevronDown,
  ChevronUp,
  Settings2,
  Zap,
} from 'lucide-react'
import type { SceneSegment } from './types'

// ============================================================================
// Types
// ============================================================================

export interface KeyframeRegenerationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Scene data for context */
  scene: {
    id?: string
    sceneId?: string
    heading?: string
    action?: string
    narration?: string
    dialogue?: Array<{ character: string; line: string }>
    duration?: number
    narrationAudio?: { en?: { duration?: number } }
    dialogueAudio?: any[] | { en?: any[] }
    sceneDirection?: any
  }
  /** Existing segments (if regenerating) */
  existingSegments?: SceneSegment[]
  /** Characters available in scene */
  characters?: Array<{
    name: string
    appearance?: string
    referenceImage?: string
  }>
  /** Callback when generation is confirmed */
  onGenerate: (config: KeyframeGenerationConfig) => Promise<void>
  /** Is generation in progress */
  isGenerating?: boolean
}

export interface KeyframeGenerationConfig {
  /** Target duration for scene */
  targetDuration: number
  /** Segment count (auto-calculated or manually set) */
  segmentCount: number | 'auto'
  /** Use narration for timing alignment */
  narrationDriven: boolean
  /** Use dialogue for timing alignment */
  dialogueDriven: boolean
  /** Pacing style */
  pacingStyle: 'slow' | 'moderate' | 'fast' | 'dynamic'
  /** Shot variety preference */
  shotVariety: 'minimal' | 'balanced' | 'high'
  /** Preserve manually edited prompts from existing segments */
  preserveManualEdits: boolean
  /** Scene direction overrides */
  directionOverrides?: {
    primaryShotType?: string
    cameraMovement?: string
    lightingMood?: string
    atmosphere?: string
  }
  /** Total audio duration for alignment */
  totalAudioDurationSeconds?: number
}

// ============================================================================
// Preset Configurations
// ============================================================================

const PACING_PRESETS = [
  {
    id: 'slow',
    label: 'Slow & Contemplative',
    description: 'Longer segments (6-8s), minimal cuts',
    icon: '🌙',
    segmentDuration: 7,
  },
  {
    id: 'moderate',
    label: 'Moderate',
    description: 'Balanced pacing (4-6s segments)',
    icon: '⏱️',
    segmentDuration: 5,
  },
  {
    id: 'fast',
    label: 'Fast & Dynamic',
    description: 'Quick cuts (3-4s segments)',
    icon: '⚡',
    segmentDuration: 3.5,
  },
  {
    id: 'dynamic',
    label: 'Dynamic (Audio-Matched)',
    description: 'Varies based on narration/dialogue beats',
    icon: '🎵',
    segmentDuration: 0, // Auto-calculated
  },
] as const

const SHOT_TYPE_OPTIONS = [
  { value: 'wide', label: 'Wide Shot', description: 'Establish space & context' },
  { value: 'medium', label: 'Medium Shot', description: 'Balance subject & environment' },
  { value: 'close-up', label: 'Close-Up', description: 'Focus on emotion & detail' },
  { value: 'extreme-close-up', label: 'Extreme Close-Up', description: 'Dramatic emphasis' },
  { value: 'two-shot', label: 'Two-Shot', description: 'Characters in conversation' },
  { value: 'over-the-shoulder', label: 'Over the Shoulder', description: 'POV in dialogue' },
  { value: 'varied', label: 'Varied (AI Decides)', description: 'Let AI pick per segment' },
]

const CAMERA_MOVEMENT_OPTIONS = [
  { value: 'static', label: 'Static', description: 'No movement, stable frame' },
  { value: 'pan', label: 'Pan', description: 'Horizontal sweep' },
  { value: 'tilt', label: 'Tilt', description: 'Vertical movement' },
  { value: 'dolly', label: 'Dolly', description: 'Move toward/away from subject' },
  { value: 'tracking', label: 'Tracking', description: 'Follow subject movement' },
  { value: 'handheld', label: 'Handheld', description: 'Naturalistic motion' },
  { value: 'varied', label: 'Varied (AI Decides)', description: 'Mix of movements' },
]

const LIGHTING_MOOD_OPTIONS = [
  { value: 'natural', label: 'Natural', description: 'Realistic, soft lighting' },
  { value: 'dramatic', label: 'Dramatic', description: 'High contrast, shadows' },
  { value: 'soft', label: 'Soft/Diffused', description: 'Gentle, flattering light' },
  { value: 'noir', label: 'Noir', description: 'Dark, mysterious, low-key' },
  { value: 'golden', label: 'Golden Hour', description: 'Warm, sunset/sunrise tones' },
  { value: 'cold', label: 'Cold/Blue', description: 'Cool, stark, clinical' },
]

const ATMOSPHERE_OPTIONS = [
  { value: 'neutral', label: 'Neutral', description: 'Standard mood' },
  { value: 'tense', label: 'Tense', description: 'Suspenseful, on-edge' },
  { value: 'serene', label: 'Serene', description: 'Peaceful, calm' },
  { value: 'energetic', label: 'Energetic', description: 'Dynamic, exciting' },
  { value: 'melancholic', label: 'Melancholic', description: 'Sad, reflective' },
  { value: 'mysterious', label: 'Mysterious', description: 'Intriguing, secretive' },
  { value: 'hopeful', label: 'Hopeful', description: 'Optimistic, uplifting' },
]

// ============================================================================
// KeyframeRegenerationDialog Component
// ============================================================================

export function KeyframeRegenerationDialog({
  open,
  onOpenChange,
  scene,
  existingSegments = [],
  characters = [],
  onGenerate,
  isGenerating = false,
}: KeyframeRegenerationDialogProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'alignment' | 'direction'>('alignment')
  
  // Alignment configuration state
  const [narrationDriven, setNarrationDriven] = useState(true)
  const [dialogueDriven, setDialogueDriven] = useState(true)
  const [pacingStyle, setPacingStyle] = useState<'slow' | 'moderate' | 'fast' | 'dynamic'>('moderate')
  const [segmentCountMode, setSegmentCountMode] = useState<'auto' | 'manual'>('auto')
  const [manualSegmentCount, setManualSegmentCount] = useState(4)
  const [targetDuration, setTargetDuration] = useState(scene.duration || 15)
  const [shotVariety, setShotVariety] = useState<'minimal' | 'balanced' | 'high'>('balanced')
  const [preserveManualEdits, setPreserveManualEdits] = useState(true)
  
  // Direction overrides state
  const [primaryShotType, setPrimaryShotType] = useState<string>('varied')
  const [cameraMovement, setCameraMovement] = useState<string>('varied')
  const [lightingMood, setLightingMood] = useState<string>('natural')
  const [atmosphere, setAtmosphere] = useState<string>('neutral')
  
  // Expanded sections
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Calculate audio duration
  const audioDuration = useMemo(() => {
    const narrationDuration = scene.narrationAudio?.en?.duration || 0
    const dialogueArray = Array.isArray(scene.dialogueAudio) 
      ? scene.dialogueAudio 
      : scene.dialogueAudio?.en || []
    const dialogueDuration = Array.isArray(dialogueArray)
      ? dialogueArray.reduce((acc: number, d: any) => acc + (d?.duration || 3), 0)
      : 0
    return Math.max(narrationDuration, dialogueDuration)
  }, [scene])
  
  // Auto-calculate segment count based on settings
  const calculatedSegmentCount = useMemo(() => {
    if (segmentCountMode === 'manual') return manualSegmentCount
    
    const effectiveDuration = Math.max(targetDuration, audioDuration + 2)
    const preset = PACING_PRESETS.find(p => p.id === pacingStyle)
    
    if (pacingStyle === 'dynamic' && audioDuration > 0) {
      // For dynamic pacing, estimate ~1 segment per 4-5 seconds of audio
      return Math.max(2, Math.ceil(audioDuration / 4.5))
    }
    
    const segmentDuration = preset?.segmentDuration || 5
    return Math.max(2, Math.ceil(effectiveDuration / segmentDuration))
  }, [segmentCountMode, manualSegmentCount, targetDuration, audioDuration, pacingStyle])
  
  // Initialize from scene data
  useEffect(() => {
    if (open && scene) {
      setTargetDuration(scene.duration || Math.max(15, audioDuration + 2))
      
      // Detect existing direction settings
      if (scene.sceneDirection) {
        if (scene.sceneDirection.camera?.shots?.[0]) {
          const shot = scene.sceneDirection.camera.shots[0].toLowerCase()
          if (shot.includes('close')) setPrimaryShotType('close-up')
          else if (shot.includes('wide')) setPrimaryShotType('wide')
          else if (shot.includes('medium')) setPrimaryShotType('medium')
        }
        if (scene.sceneDirection.lighting?.overallMood) {
          const mood = scene.sceneDirection.lighting.overallMood.toLowerCase()
          if (mood.includes('dramatic')) setLightingMood('dramatic')
          else if (mood.includes('soft')) setLightingMood('soft')
          else if (mood.includes('noir')) setLightingMood('noir')
        }
        if (scene.sceneDirection.scene?.atmosphere) {
          const atmo = scene.sceneDirection.scene.atmosphere.toLowerCase()
          if (atmo.includes('tense')) setAtmosphere('tense')
          else if (atmo.includes('serene')) setAtmosphere('serene')
          else if (atmo.includes('energetic')) setAtmosphere('energetic')
        }
      }
    }
  }, [open, scene, audioDuration])
  
  // Handle generate
  const handleGenerate = async () => {
    const config: KeyframeGenerationConfig = {
      targetDuration,
      segmentCount: segmentCountMode === 'auto' ? 'auto' : manualSegmentCount,
      narrationDriven,
      dialogueDriven,
      pacingStyle,
      shotVariety,
      preserveManualEdits,
      totalAudioDurationSeconds: audioDuration,
      directionOverrides: {
        primaryShotType: primaryShotType !== 'varied' ? primaryShotType : undefined,
        cameraMovement: cameraMovement !== 'varied' ? cameraMovement : undefined,
        lightingMood,
        atmosphere,
      },
    }
    
    await onGenerate(config)
    onOpenChange(false)
  }
  
  // Count manually edited segments
  const manuallyEditedCount = existingSegments.filter(s => s.userEditedPrompt).length
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] bg-gray-900 text-white border-gray-700 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Keyframe Generation Settings
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure how segments are created and aligned with your script and audio.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-4 pr-4">
            {/* Scene Summary Card */}
            <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-200">
                    {scene.heading || 'Scene'}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {scene.action || scene.narration || 'No description available'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    <Clock className="w-3 h-3 mr-1" />
                    {targetDuration.toFixed(1)}s
                  </Badge>
                  {audioDuration > 0 && (
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      <Volume2 className="w-3 h-3 mr-1" />
                      {audioDuration.toFixed(1)}s audio
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Existing segments warning */}
              {existingSegments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-2 text-amber-400 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>
                      {existingSegments.length} existing segment{existingSegments.length > 1 ? 's' : ''} will be replaced
                      {manuallyEditedCount > 0 && ` (${manuallyEditedCount} with manual edits)`}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'alignment' | 'direction')}>
              <TabsList className="w-full bg-gray-800/50">
                <TabsTrigger value="alignment" className="flex-1 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
                  <Scissors className="w-4 h-4 mr-2" />
                  Alignment & Pacing
                </TabsTrigger>
                <TabsTrigger value="direction" className="flex-1 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
                  <Camera className="w-4 h-4 mr-2" />
                  Scene Direction
                </TabsTrigger>
              </TabsList>
              
              {/* Alignment Tab */}
              <TabsContent value="alignment" className="space-y-4 mt-4">
                {/* Audio Alignment Section */}
                <div className="space-y-3 p-3 rounded-lg border border-gray-700 bg-gray-800/30">
                  <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                    <Music className="w-4 h-4 text-purple-400" />
                    Audio Alignment
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded bg-gray-800/50 border border-gray-700">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-blue-400" />
                        <div>
                          <Label className="text-sm">Narration-Driven</Label>
                          <p className="text-xs text-gray-500">Align cuts to narration beats</p>
                        </div>
                      </div>
                      <Switch
                        checked={narrationDriven}
                        onCheckedChange={setNarrationDriven}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded bg-gray-800/50 border border-gray-700">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-400" />
                        <div>
                          <Label className="text-sm">Dialogue-Driven</Label>
                          <p className="text-xs text-gray-500">Align cuts to dialogue</p>
                        </div>
                      </div>
                      <Switch
                        checked={dialogueDriven}
                        onCheckedChange={setDialogueDriven}
                        className="data-[state=checked]:bg-green-600"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Pacing Style */}
                <div className="space-y-3 p-3 rounded-lg border border-gray-700 bg-gray-800/30">
                  <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Pacing Style
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {PACING_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setPacingStyle(preset.id as any)}
                        className={cn(
                          'p-3 rounded-lg border text-left transition-all',
                          pacingStyle === preset.id
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                            : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{preset.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{preset.label}</p>
                            <p className="text-xs text-gray-500">{preset.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Segment Count */}
                <div className="space-y-3 p-3 rounded-lg border border-gray-700 bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      Segment Count
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSegmentCountMode('auto')}
                        className={cn(
                          'px-3 py-1 text-xs rounded-full transition-all',
                          segmentCountMode === 'auto'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                        )}
                      >
                        Auto
                      </button>
                      <button
                        onClick={() => setSegmentCountMode('manual')}
                        className={cn(
                          'px-3 py-1 text-xs rounded-full transition-all',
                          segmentCountMode === 'manual'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                        )}
                      >
                        Manual
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      {segmentCountMode === 'manual' ? (
                        <Slider
                          value={[manualSegmentCount]}
                          onValueChange={([v]) => setManualSegmentCount(v)}
                          min={2}
                          max={12}
                          step={1}
                          className="py-2"
                        />
                      ) : (
                        <div className="h-9 flex items-center text-sm text-gray-400">
                          Based on {pacingStyle} pacing & {audioDuration > 0 ? `${audioDuration.toFixed(1)}s audio` : `${targetDuration.toFixed(1)}s duration`}
                        </div>
                      )}
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 min-w-[80px] justify-center"
                    >
                      {calculatedSegmentCount} segments
                    </Badge>
                  </div>
                </div>
                
                {/* Advanced Options */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Advanced Options
                  </span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {showAdvanced && (
                  <div className="space-y-3 p-3 rounded-lg border border-gray-700/50 bg-gray-800/20">
                    {/* Shot Variety */}
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-300">Shot Variety</Label>
                      <Select value={shotVariety} onValueChange={(v) => setShotVariety(v as any)}>
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal - Consistent framing</SelectItem>
                          <SelectItem value="balanced">Balanced - Mix of shots</SelectItem>
                          <SelectItem value="high">High - Dynamic variety</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Preserve Manual Edits */}
                    {manuallyEditedCount > 0 && (
                      <div className="flex items-center justify-between p-3 rounded bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <div>
                            <Label className="text-sm text-amber-300">Preserve Manual Edits</Label>
                            <p className="text-xs text-amber-400/70">{manuallyEditedCount} edited prompt(s) found</p>
                          </div>
                        </div>
                        <Switch
                          checked={preserveManualEdits}
                          onCheckedChange={setPreserveManualEdits}
                          className="data-[state=checked]:bg-amber-600"
                        />
                      </div>
                    )}
                    
                    {/* Target Duration Override */}
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-300">Target Duration (seconds)</Label>
                      <Slider
                        value={[targetDuration]}
                        onValueChange={([v]) => setTargetDuration(v)}
                        min={5}
                        max={60}
                        step={0.5}
                        className="py-2"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>5s</span>
                        <span className="text-cyan-400">{targetDuration.toFixed(1)}s</span>
                        <span>60s</span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* Direction Tab */}
              <TabsContent value="direction" className="space-y-4 mt-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-purple-300">
                      <p className="font-medium mb-1">Scene Direction Overrides</p>
                      <p className="text-purple-400/80">
                        These settings influence how AI generates prompts for each segment.
                        Choose "Varied" to let AI decide per-segment.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Primary Shot Type */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-400" />
                    Primary Shot Type
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SHOT_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPrimaryShotType(opt.value)}
                        className={cn(
                          'p-2 rounded border text-left transition-all',
                          primaryShotType === opt.value
                            ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                            : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
                        )}
                      >
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Camera Movement */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300 flex items-center gap-2">
                    <Film className="w-4 h-4 text-green-400" />
                    Camera Movement
                  </Label>
                  <Select value={cameraMovement} onValueChange={setCameraMovement}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_MOVEMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <span>{opt.label}</span>
                            <span className="text-xs text-gray-500">- {opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Lighting Mood */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-400" />
                    Lighting Mood
                  </Label>
                  <Select value={lightingMood} onValueChange={setLightingMood}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIGHTING_MOOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <span>{opt.label}</span>
                            <span className="text-xs text-gray-500">- {opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Atmosphere */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Atmosphere
                  </Label>
                  <Select value={atmosphere} onValueChange={setAtmosphere}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATMOSPHERE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <span>{opt.label}</span>
                            <span className="text-xs text-gray-500">- {opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-700 p-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">
              {calculatedSegmentCount} segments • {targetDuration.toFixed(1)}s
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : existingSegments.length > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate Keyframes
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Keyframes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default KeyframeRegenerationDialog
