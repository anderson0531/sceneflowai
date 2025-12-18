'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Film, 
  ArrowRight, 
  Image as ImageIcon, 
  Users, 
  Music, 
  Wand2,
  Clock,
  Info,
  Loader2,
  Check,
  AlertTriangle,
  Plus,
  X,
  Upload,
  Play,
  Volume2,
  Quote,
  Sparkles,
  Library,
  Settings2,
  History,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SceneSegment, SceneSegmentTake, VideoGenerationMethod, SmartPromptSettings, createDefaultSmartPromptSettings } from './types'
import { VisualReference } from '@/types/visionReferences'
import { toast } from 'sonner'
import { SmartPromptControlDeck } from './SmartPromptModules'
import { compileVideoPrompt } from './videoPromptCompiler'

// ============================================
// Types & Interfaces
// ============================================

export type VideoEditingTab = 'smart-prompt' | 'extend' | 'interpolate' | 'audio' | 'history'

export interface SelectedReference {
  id: string
  type: 'style' | 'character'
  name: string
  imageUrl: string
  description?: string
  promptConnection?: string
}

export interface VideoEditingDialogProps {
  open: boolean
  onClose: () => void
  segment: SceneSegment
  initialTab?: VideoEditingTab
  // Video takes for extension
  allSegments?: SceneSegment[]
  // Reference library
  sceneReferences?: VisualReference[]
  objectReferences?: VisualReference[]
  // Character references
  characters?: Array<{
    name: string
    description?: string
    referenceImage?: string
    appearanceDescription?: string
  }>
  // Scene context
  sceneImageUrl?: string
  previousSegmentLastFrame?: string | null
  // Generation callback
  onGenerate: (data: {
    method: VideoGenerationMethod
    prompt: string
    negativePrompt?: string
    duration?: number
    aspectRatio?: '16:9' | '9:16'
    resolution?: '720p' | '1080p'
    startFrameUrl?: string
    endFrameUrl?: string
    sourceVideoUrl?: string
    referenceImages?: Array<{ url: string; type: 'style' | 'character' }>
  }) => Promise<void>
  isGenerating?: boolean
}

// ============================================
// Smart Prompt Tab (Main Generation Mode)
// ============================================

interface SmartPromptTabProps {
  segment: SceneSegment
  characters?: Array<{ name: string }>
  sceneImageUrl?: string
  previousSegmentLastFrame?: string | null
  prompt: string
  setPrompt: (p: string) => void
  smartPromptSettings: SmartPromptSettings
  setSmartPromptSettings: (s: SmartPromptSettings) => void
  duration: number
  setDuration: (d: number) => void
  aspectRatio: '16:9' | '9:16'
  setAspectRatio: (a: '16:9' | '9:16') => void
  useStartFrame: boolean
  setUseStartFrame: (u: boolean) => void
  startFrameUrl: string
  setStartFrameUrl: (u: string) => void
  // NEW: General instruction for quick text-based guidance
  generalInstruction: string
  setGeneralInstruction: (i: string) => void
}

function SmartPromptTab({
  segment,
  characters = [],
  sceneImageUrl,
  previousSegmentLastFrame,
  prompt,
  setPrompt,
  smartPromptSettings,
  setSmartPromptSettings,
  duration,
  setDuration,
  aspectRatio,
  setAspectRatio,
  useStartFrame,
  setUseStartFrame,
  startFrameUrl,
  setStartFrameUrl,
  generalInstruction,
  setGeneralInstruction,
}: SmartPromptTabProps) {
  const [showCompiledPrompt, setShowCompiledPrompt] = useState(false)

  // Compile prompt for preview - prepend general instruction if provided
  const compiledPayload = useMemo(() => {
    const baseWithInstruction = generalInstruction 
      ? `${generalInstruction}. ${prompt}`.trim()
      : prompt
    return compileVideoPrompt({
      basePrompt: baseWithInstruction,
      settings: smartPromptSettings,
      method: useStartFrame && startFrameUrl ? 'I2V' : 'T2V',
      durationSeconds: duration,
      aspectRatio,
      startFrameUrl: useStartFrame ? startFrameUrl : undefined,
      preserveCharacters: characters.map(c => c.name),
    })
  }, [prompt, generalInstruction, smartPromptSettings, useStartFrame, startFrameUrl, duration, aspectRatio, characters])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-sf-primary/10 to-transparent rounded-lg border border-sf-primary/20 mb-4">
        <Sparkles className="w-5 h-5 text-sf-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Smart Prompt</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Configure camera, performance, and style. Your settings are compiled into an optimized prompt.
          </p>
        </div>
        <button
          onClick={() => setShowCompiledPrompt(!showCompiledPrompt)}
          className="text-xs text-sf-primary hover:text-sf-primary/80 flex items-center gap-1"
        >
          {showCompiledPrompt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showCompiledPrompt ? 'Hide' : 'Show'} Compiled
        </button>
      </div>

      {/* General Instruction - Quick text-based guidance (most effective) */}
      <div className="space-y-2 mb-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-sf-primary" />
          General Instruction
          <span className="text-xs font-normal text-gray-500">(Optional - most effective)</span>
        </label>
        <Textarea
          value={generalInstruction}
          onChange={(e) => setGeneralInstruction(e.target.value)}
          placeholder="e.g., Make it more dramatic, Add slow motion, Darker mood, More intimate framing..."
          className="min-h-[50px] resize-none text-sm bg-gradient-to-r from-sf-primary/5 to-transparent border-sf-primary/30 focus:border-sf-primary/50"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          This instruction is prepended to the prompt and takes priority. Use natural language to guide the generation.
        </p>
      </div>

      {/* Base Prompt */}
      <div className="space-y-2 mb-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Base Prompt
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the scene action, characters, and key moments..."
          className="min-h-[80px] resize-none"
        />
      </div>

      {/* Start Frame Option */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <input
          type="checkbox"
          id="use-start-frame"
          checked={useStartFrame}
          onChange={(e) => setUseStartFrame(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300"
        />
        <label htmlFor="use-start-frame" className="text-sm text-gray-700 dark:text-gray-300 flex-1">
          Use starting image (Image-to-Video)
        </label>
        {useStartFrame && (
          <Select value={startFrameUrl} onValueChange={setStartFrameUrl}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {sceneImageUrl && (
                <SelectItem value={sceneImageUrl} className="text-xs">Scene Image</SelectItem>
              )}
              {previousSegmentLastFrame && (
                <SelectItem value={previousSegmentLastFrame} className="text-xs">Previous Frame</SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Control Deck (Accordion Modules) */}
      <div className="flex-1 overflow-y-auto pr-1">
        <SmartPromptControlDeck
          cameraSettings={smartPromptSettings.camera}
          onCameraChange={(camera) => setSmartPromptSettings({ ...smartPromptSettings, camera })}
          performanceSettings={smartPromptSettings.performance}
          onPerformanceChange={(performance) => setSmartPromptSettings({ ...smartPromptSettings, performance })}
          visualStyleSettings={smartPromptSettings.visualStyle}
          onVisualStyleChange={(visualStyle) => setSmartPromptSettings({ ...smartPromptSettings, visualStyle })}
          magicEditSettings={smartPromptSettings.magicEdit}
          onMagicEditChange={(magicEdit) => setSmartPromptSettings({ ...smartPromptSettings, magicEdit })}
          characters={characters}
          defaultOpen={['camera']}
        />
      </div>

      {/* Compiled Prompt Preview (collapsible) */}
      {showCompiledPrompt && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg text-xs font-mono text-gray-300 max-h-32 overflow-y-auto">
          <div className="text-green-400 mb-1">// Compiled Prompt</div>
          {compiledPayload.basePrompt}
          <div className="text-yellow-400 mt-2 mb-1">// Negative Prompt</div>
          {compiledPayload.negativePrompt}
        </div>
      )}
    </div>
  )
}

// ============================================
// Scene Extension Tab
// ============================================

interface ExtendTabProps {
  segment: SceneSegment
  allSegments?: SceneSegment[]
  prompt: string
  setPrompt: (p: string) => void
  sourceVideoUrl: string
  setSourceVideoUrl: (u: string) => void
  duration: number
  setDuration: (d: number) => void
}

function ExtendTab({ 
  segment, 
  allSegments = [],
  prompt,
  setPrompt,
  sourceVideoUrl,
  setSourceVideoUrl,
  duration,
  setDuration
}: ExtendTabProps) {
  // Find takes with veoVideoRef for extension
  const currentTakes = segment.takes?.filter(t => t.veoVideoRef) || []
  const hasExtensibleVideo = currentTakes.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <Film className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-green-900 dark:text-green-100">Scene Extension</h4>
          <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
            Extend your video beyond its original length using the context of the last frames.
          </p>
        </div>
      </div>

      {/* Warning if no extensible videos */}
      {!hasExtensibleVideo && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-100">No Extensible Videos</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
              Video extension only works with Veo-generated videos still in the system cache (2-day retention). Generate a new video first, or use Smart Prompt with a starting frame.
            </p>
          </div>
        </div>
      )}

      {/* Source Video Selection */}
      {hasExtensibleVideo && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Source Video to Extend
          </label>
          <Select value={sourceVideoUrl} onValueChange={setSourceVideoUrl}>
            <SelectTrigger>
              <SelectValue placeholder="Select a video take..." />
            </SelectTrigger>
            <SelectContent>
              {currentTakes.map((take, idx) => (
                <SelectItem key={take.id} value={take.assetUrl}>
                  Take {idx + 1} ({take.durationSec || 5}s)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Extension Duration */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Extension Duration
        </label>
        <div className="flex items-center gap-2">
          <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 seconds</SelectItem>
              <SelectItem value="6">6 seconds</SelectItem>
              <SelectItem value="8">8 seconds</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Can extend up to 20 times (max 148s total)
          </span>
        </div>
      </div>

      {/* Extension Prompt */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Extension Prompt (Optional)
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what should happen next... Leave empty to let AI continue naturally."
          className="min-h-[100px]"
        />
      </div>

      {/* Current Duration Display */}
      {sourceVideoUrl && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Current: {currentTakes.find(t => t.assetUrl === sourceVideoUrl)?.durationSec || 5}s
          </span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            Extended: {(currentTakes.find(t => t.assetUrl === sourceVideoUrl)?.durationSec || 5) + duration}s
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// Frame Control Tab (FTV - Interpolation)
// ============================================

interface InterpolateTabProps {
  segment: SceneSegment
  sceneImageUrl?: string
  previousSegmentLastFrame?: string | null
  sceneReferences?: VisualReference[]
  prompt: string
  setPrompt: (p: string) => void
  startFrameUrl: string
  setStartFrameUrl: (u: string) => void
  endFrameUrl: string
  setEndFrameUrl: (u: string) => void
}

function InterpolateTab({
  segment,
  sceneImageUrl,
  previousSegmentLastFrame,
  sceneReferences = [],
  prompt,
  setPrompt,
  startFrameUrl,
  setStartFrameUrl,
  endFrameUrl,
  setEndFrameUrl
}: InterpolateTabProps) {
  const [startFrameSource, setStartFrameSource] = useState<'scene' | 'previous' | 'library' | 'custom'>('scene')
  const [endFrameSource, setEndFrameSource] = useState<'library' | 'custom'>('library')

  // Update start frame URL when source changes
  useEffect(() => {
    if (startFrameSource === 'scene' && sceneImageUrl) {
      setStartFrameUrl(sceneImageUrl)
    } else if (startFrameSource === 'previous' && previousSegmentLastFrame) {
      setStartFrameUrl(previousSegmentLastFrame)
    }
  }, [startFrameSource, sceneImageUrl, previousSegmentLastFrame, setStartFrameUrl])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
        <ImageIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-cyan-900 dark:text-cyan-100">Frame-to-Frame (Interpolation)</h4>
          <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-0.5">
            Define start and end frames. Veo generates the video transition between them.
          </p>
        </div>
      </div>

      {/* First Frame */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          First Frame (Starting Image)
        </label>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setStartFrameSource('scene')}
            className={cn(
              "p-2 rounded-lg border text-xs transition-all",
              startFrameSource === 'scene' 
                ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
                : "border-gray-200 dark:border-gray-700 hover:border-cyan-300"
            )}
            disabled={!sceneImageUrl}
          >
            Scene Image
          </button>
          <button
            onClick={() => setStartFrameSource('previous')}
            className={cn(
              "p-2 rounded-lg border text-xs transition-all",
              startFrameSource === 'previous' 
                ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
                : "border-gray-200 dark:border-gray-700 hover:border-cyan-300"
            )}
            disabled={!previousSegmentLastFrame}
          >
            Previous Frame
          </button>
          <button
            onClick={() => setStartFrameSource('library')}
            className={cn(
              "p-2 rounded-lg border text-xs transition-all",
              startFrameSource === 'library' 
                ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
                : "border-gray-200 dark:border-gray-700 hover:border-cyan-300"
            )}
          >
            Library
          </button>
          <button
            onClick={() => setStartFrameSource('custom')}
            className={cn(
              "p-2 rounded-lg border text-xs transition-all",
              startFrameSource === 'custom' 
                ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
                : "border-gray-200 dark:border-gray-700 hover:border-cyan-300"
            )}
          >
            Upload
          </button>
        </div>
        
        {/* Start Frame Preview */}
        {startFrameUrl && (
          <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img src={startFrameUrl} alt="Start frame" className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
              Start
            </div>
          </div>
        )}

        {/* Library selector when source is library */}
        {startFrameSource === 'library' && sceneReferences.length > 0 && (
          <Select value={startFrameUrl} onValueChange={setStartFrameUrl}>
            <SelectTrigger>
              <SelectValue placeholder="Select from reference library..." />
            </SelectTrigger>
            <SelectContent>
              {sceneReferences.filter(r => r.imageUrl).map(ref => (
                <SelectItem key={ref.id} value={ref.imageUrl!}>
                  {ref.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Last Frame */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Last Frame (Ending Image)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setEndFrameSource('library')}
            className={cn(
              "p-2 rounded-lg border text-xs transition-all",
              endFrameSource === 'library' 
                ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
                : "border-gray-200 dark:border-gray-700 hover:border-cyan-300"
            )}
          >
            From Library
          </button>
          <button
            onClick={() => setEndFrameSource('custom')}
            className={cn(
              "p-2 rounded-lg border text-xs transition-all",
              endFrameSource === 'custom' 
                ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
                : "border-gray-200 dark:border-gray-700 hover:border-cyan-300"
            )}
          >
            Upload
          </button>
        </div>

        {/* End Frame Preview */}
        {endFrameUrl && (
          <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img src={endFrameUrl} alt="End frame" className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
              End
            </div>
          </div>
        )}

        {/* Library selector for end frame */}
        {endFrameSource === 'library' && sceneReferences.length > 0 && (
          <Select value={endFrameUrl} onValueChange={setEndFrameUrl}>
            <SelectTrigger>
              <SelectValue placeholder="Select from reference library..." />
            </SelectTrigger>
            <SelectContent>
              {sceneReferences.filter(r => r.imageUrl).map(ref => (
                <SelectItem key={ref.id} value={ref.imageUrl!}>
                  {ref.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Transition Prompt */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Transition Description
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the transition between frames... e.g., 'Camera slowly pulls back as the sun rises over the mountains'"
          className="min-h-[100px]"
        />
      </div>
    </div>
  )
}

// ============================================
// Audio Sync Tab
// ============================================

interface AudioTabProps {
  prompt: string
  setPrompt: (p: string) => void
}

function AudioTab({ prompt, setPrompt }: AudioTabProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
        <Music className="w-5 h-5 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-violet-900 dark:text-violet-100">Synchronized Audio</h4>
          <p className="text-sm text-violet-700 dark:text-violet-300 mt-0.5">
            Veo 3.1 generates synchronized audio (dialogue, sound effects, ambient noise) based on your prompt cues.
          </p>
        </div>
      </div>

      {/* Audio Types Guide */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Audio Prompt Guide</h5>
        
        {/* Dialogue */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-2">
            <Quote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Dialogue</span>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Use quotes for specific speech. Veo will generate character voices.
          </p>
          <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
            The hero says "We need to find the key before sunset."
          </div>
        </div>

        {/* Sound Effects */}
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-900 dark:text-green-100">Sound Effects</span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300">
            Explicitly describe sounds you want in the scene.
          </p>
          <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
            A door creaks open with a loud metallic screech.
          </div>
        </div>

        {/* Ambient Noise */}
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Ambient Noise</span>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Describe the environment's soundscape.
          </p>
          <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
            A busy marketplace with distant chatter and clinking coins.
          </div>
        </div>
      </div>

      {/* Prompt with Audio Cues */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Video Prompt with Audio Cues
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='A medieval knight enters the castle. He says "The enemy approaches from the east." Sound of swords clashing in the distance. Ambient sounds of wind howling through stone corridors.'
          className="min-h-[120px]"
        />
      </div>
    </div>
  )
}

// ============================================
// History Tab (Take Management)
// ============================================

interface HistoryTabProps {
  segment: SceneSegment
  onSelectTake?: (take: SceneSegmentTake) => void
}

function HistoryTab({ segment, onSelectTake }: HistoryTabProps) {
  const takes = segment.takes || []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <History className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Generation History</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            View and manage previous takes for this segment.
          </p>
        </div>
      </div>

      {/* Takes List */}
      {takes.length === 0 ? (
        <div className="text-center py-8">
          <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No takes generated yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Generate your first video using Smart Prompt
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {takes.map((take, idx) => (
            <div
              key={take.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                segment.activeAssetUrl === take.assetUrl
                  ? "border-sf-primary bg-sf-primary/5"
                  : "border-gray-200 dark:border-gray-700 hover:border-sf-primary/50"
              )}
              onClick={() => onSelectTake?.(take)}
            >
              {/* Thumbnail */}
              <div className="w-20 h-12 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                {take.thumbnailUrl ? (
                  <img src={take.thumbnailUrl} alt={`Take ${idx + 1}`} className="w-full h-full object-cover" />
                ) : take.assetUrl ? (
                  <video src={take.assetUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Take {idx + 1}
                  </span>
                  {segment.activeAssetUrl === take.assetUrl && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-sf-primary/10 text-sf-primary rounded">
                      Active
                    </span>
                  )}
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded",
                    take.status === 'COMPLETE' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    take.status === 'GENERATING' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                    take.status === 'ERROR' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  )}>
                    {take.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{take.durationSec || 5}s</span>
                  <span>•</span>
                  <span>{new Date(take.createdAt).toLocaleString()}</span>
                </div>
                {take.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    {take.notes}
                  </p>
                )}
              </div>

              {/* Extensible indicator */}
              {take.veoVideoRef && (
                <div className="flex-shrink-0" title="Can be extended">
                  <Plus className="w-4 h-4 text-green-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Preview Panel (Right Side)
// ============================================

interface PreviewPanelProps {
  segment: SceneSegment
  sceneImageUrl?: string
  startFrameUrl?: string
  isGenerating?: boolean
}

function PreviewPanel({ segment, sceneImageUrl, startFrameUrl, isGenerating }: PreviewPanelProps) {
  const currentAsset = segment.activeAssetUrl
  const hasVideo = currentAsset && segment.assetType === 'video'

  return (
    <div className="h-full flex flex-col">
      {/* Preview Area */}
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative">
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 border-4 border-sf-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-sf-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-white mt-4 text-sm">Generating video...</p>
            <p className="text-gray-400 text-xs mt-1">This may take a few minutes</p>
          </div>
        ) : hasVideo ? (
          <video
            src={currentAsset}
            controls
            className="w-full h-full object-contain"
            poster={segment.takes?.find(t => t.assetUrl === currentAsset)?.thumbnailUrl}
          />
        ) : startFrameUrl ? (
          <div className="w-full h-full relative">
            <img src={startFrameUrl} alt="Start frame" className="w-full h-full object-contain" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="text-center text-white">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-60" />
                <p className="text-sm">Start frame selected</p>
                <p className="text-xs text-gray-300 mt-1">Generate to create video</p>
              </div>
            </div>
          </div>
        ) : sceneImageUrl ? (
          <div className="w-full h-full relative">
            <img src={sceneImageUrl} alt="Scene" className="w-full h-full object-contain" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="text-center text-white">
                <Film className="w-12 h-12 mx-auto mb-2 opacity-60" />
                <p className="text-sm">No video generated yet</p>
                <p className="text-xs text-gray-300 mt-1">Configure settings and generate</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Film className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No content</p>
            </div>
          </div>
        )}
      </div>

      {/* Segment Info Bar */}
      <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-gray-500">Segment {segment.sequenceIndex + 1}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600 dark:text-gray-400">
            {(segment.endTime - segment.startTime).toFixed(1)}s duration
          </span>
          {segment.cameraMovement && (
            <>
              <span className="text-gray-400">|</span>
              <span className="text-sf-primary">{segment.cameraMovement}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {segment.takes && segment.takes.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
              {segment.takes.length} take{segment.takes.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Main Dialog Component
// ============================================

export function VideoEditingDialog({
  open,
  onClose,
  segment,
  initialTab = 'smart-prompt',
  allSegments = [],
  sceneReferences = [],
  objectReferences = [],
  characters = [],
  sceneImageUrl,
  previousSegmentLastFrame,
  onGenerate,
  isGenerating = false
}: VideoEditingDialogProps) {
  const [activeTab, setActiveTab] = useState<VideoEditingTab>(initialTab)
  
  // Shared state
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [duration, setDuration] = useState(6)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')
  
  // Smart Prompt state
  const [smartPromptSettings, setSmartPromptSettings] = useState<SmartPromptSettings>(createDefaultSmartPromptSettings())
  const [useStartFrame, setUseStartFrame] = useState(false)
  const [generalInstruction, setGeneralInstruction] = useState('')
  
  // Tab-specific state
  const [sourceVideoUrl, setSourceVideoUrl] = useState('')
  const [startFrameUrl, setStartFrameUrl] = useState('')
  const [endFrameUrl, setEndFrameUrl] = useState('')
  const [selectedReferences, setSelectedReferences] = useState<SelectedReference[]>([])

  // Reset state when dialog opens or tab changes
  useEffect(() => {
    if (open && segment) {
      setActiveTab(initialTab)
      setPrompt(segment.userEditedPrompt || segment.generatedPrompt || '')
      // Pre-load general instruction from segment if saved
      setGeneralInstruction(segment.userInstruction || '')
      // Pre-select source video for extension
      const currentVideoTake = segment.takes?.find(t => t.assetUrl === segment.activeAssetUrl && t.veoVideoRef)
      if (currentVideoTake) {
        setSourceVideoUrl(currentVideoTake.assetUrl)
      }
      // Pre-select start frame
      if (sceneImageUrl) {
        setStartFrameUrl(sceneImageUrl)
      }
      // Reset smart prompt settings
      setSmartPromptSettings(createDefaultSmartPromptSettings())
    }
  }, [open, initialTab, segment, sceneImageUrl])

  // Handle generation based on active tab
  const handleGenerate = async () => {
    let method: VideoGenerationMethod = 'T2V'
    let finalPrompt = prompt
    let data: Parameters<typeof onGenerate>[0] = {
      method,
      prompt: finalPrompt,
      negativePrompt,
      duration,
      aspectRatio,
      resolution
    }

    switch (activeTab) {
      case 'smart-prompt':
        // Compile the smart prompt settings with general instruction prepended
        const baseWithInstruction = generalInstruction 
          ? `${generalInstruction}. ${prompt}`.trim()
          : prompt
        const payload = compileVideoPrompt({
          basePrompt: baseWithInstruction,
          settings: smartPromptSettings,
          method: useStartFrame && startFrameUrl ? 'I2V' : 'T2V',
          durationSeconds: duration,
          aspectRatio,
          startFrameUrl: useStartFrame ? startFrameUrl : undefined,
          preserveCharacters: characters.map(c => c.name),
        })
        method = payload.method
        finalPrompt = payload.basePrompt
        data = {
          method,
          prompt: finalPrompt,
          negativePrompt: payload.negativePrompt,
          duration,
          aspectRatio,
          resolution,
          startFrameUrl: useStartFrame ? startFrameUrl : undefined,
        }
        break
      case 'extend':
        method = 'EXT'
        data = {
          ...data,
          method,
          sourceVideoUrl
        }
        break
      case 'interpolate':
        method = 'FTV'
        data = {
          ...data,
          method,
          startFrameUrl,
          endFrameUrl
        }
        break
      case 'audio':
        // Audio is just T2V with audio cues in prompt
        method = 'T2V'
        data = {
          ...data,
          method
        }
        break
      case 'history':
        // History tab doesn't generate
        return
    }

    await onGenerate(data)
  }

  // Check if generation is possible
  const canGenerate = useMemo(() => {
    if (activeTab === 'history') return false
    if (!prompt.trim() && activeTab !== 'extend') return false
    
    switch (activeTab) {
      case 'smart-prompt':
        return true
      case 'extend':
        return !!sourceVideoUrl
      case 'interpolate':
        return !!startFrameUrl && !!endFrameUrl
      case 'audio':
        return true
    }
    return false
  }, [activeTab, prompt, sourceVideoUrl, startFrameUrl, endFrameUrl])

  // Early return after all hooks if segment is not available
  if (!segment) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !isGenerating && !value && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Film className="w-5 h-5 text-sf-primary" />
                Video Editor
              </DialogTitle>
              <DialogDescription>
                Configure and generate video with Veo 3.1 advanced features
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 sec</SelectItem>
                  <SelectItem value="6">6 sec</SelectItem>
                  <SelectItem value="8">8 sec</SelectItem>
                </SelectContent>
              </Select>
              <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as '16:9' | '9:16')}>
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9</SelectItem>
                  <SelectItem value="9:16">9:16</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {/* Split View: Tabs/Controls Left, Preview Right */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Controls (40%) */}
          <div className="w-[40%] border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VideoEditingTab)} className="flex flex-col h-full">
              <TabsList className="grid grid-cols-5 m-4 mb-0">
                <TabsTrigger value="smart-prompt" className="text-xs gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Smart
                </TabsTrigger>
                <TabsTrigger value="extend" className="text-xs gap-1">
                  <Film className="w-3.5 h-3.5" />
                  Extend
                </TabsTrigger>
                <TabsTrigger value="interpolate" className="text-xs gap-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Frames
                </TabsTrigger>
                <TabsTrigger value="audio" className="text-xs gap-1">
                  <Music className="w-3.5 h-3.5" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs gap-1">
                  <History className="w-3.5 h-3.5" />
                  History
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-4">
                <TabsContent value="smart-prompt" className="mt-0 h-full">
                  <SmartPromptTab
                    segment={segment}
                    characters={characters}
                    sceneImageUrl={sceneImageUrl}
                    previousSegmentLastFrame={previousSegmentLastFrame}
                    prompt={prompt}
                    setPrompt={setPrompt}
                    smartPromptSettings={smartPromptSettings}
                    setSmartPromptSettings={setSmartPromptSettings}
                    duration={duration}
                    setDuration={setDuration}
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                    useStartFrame={useStartFrame}
                    setUseStartFrame={setUseStartFrame}
                    startFrameUrl={startFrameUrl}
                    setStartFrameUrl={setStartFrameUrl}
                    generalInstruction={generalInstruction}
                    setGeneralInstruction={setGeneralInstruction}
                  />
                </TabsContent>
                <TabsContent value="extend" className="mt-0">
                  <ExtendTab
                    segment={segment}
                    allSegments={allSegments}
                    prompt={prompt}
                    setPrompt={setPrompt}
                    sourceVideoUrl={sourceVideoUrl}
                    setSourceVideoUrl={setSourceVideoUrl}
                    duration={duration}
                    setDuration={setDuration}
                  />
                </TabsContent>
                <TabsContent value="interpolate" className="mt-0">
                  <InterpolateTab
                    segment={segment}
                    sceneImageUrl={sceneImageUrl}
                    previousSegmentLastFrame={previousSegmentLastFrame}
                    sceneReferences={sceneReferences}
                    prompt={prompt}
                    setPrompt={setPrompt}
                    startFrameUrl={startFrameUrl}
                    setStartFrameUrl={setStartFrameUrl}
                    endFrameUrl={endFrameUrl}
                    setEndFrameUrl={setEndFrameUrl}
                  />
                </TabsContent>
                <TabsContent value="audio" className="mt-0">
                  <AudioTab prompt={prompt} setPrompt={setPrompt} />
                </TabsContent>
                <TabsContent value="history" className="mt-0">
                  <HistoryTab segment={segment} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right Panel - Preview (60%) */}
          <div className="w-[60%] p-4 flex flex-col min-h-0">
            <PreviewPanel
              segment={segment}
              sceneImageUrl={sceneImageUrl}
              startFrameUrl={useStartFrame ? startFrameUrl : undefined}
              isGenerating={isGenerating}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Info className="w-3.5 h-3.5" />
            <span>
              {activeTab === 'smart-prompt' && 'Configure camera, performance, and style settings for optimal results'}
              {activeTab === 'extend' && 'Extend existing Veo-generated videos up to 148 seconds total'}
              {activeTab === 'interpolate' && 'Generate smooth transitions between two key frames'}
              {activeTab === 'audio' && 'Include dialogue in quotes and describe sounds for audio generation'}
              {activeTab === 'history' && 'View and manage all generated takes for this segment'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            {activeTab !== 'history' && (
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Generate Video
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
