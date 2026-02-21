'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SceneSegment, SceneSegmentTake, VideoGenerationMethod, SmartPromptSettings, createDefaultSmartPromptSettings } from './types'
import { VisualReference } from '@/types/visionReferences'
import { toast } from 'sonner'
import { SmartPromptControlDeck } from './SmartPromptModules'
import { compileVideoPrompt } from './videoPromptCompiler'
import { moderatePrompt, ModerationResult, buildRegenerationSystemPrompt, buildRegenerationUserPrompt } from '@/utils/promptModerator'
import { ContentPolicyAlert, PolicyFixedBanner } from './ContentPolicyAlert'

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
  prompt: string
  setPrompt: (p: string) => void
  smartPromptSettings: SmartPromptSettings
  setSmartPromptSettings: (s: SmartPromptSettings) => void
  generalInstruction: string
  setGeneralInstruction: (i: string) => void
}

function SmartPromptTab({
  segment,
  characters = [],
  prompt,
  setPrompt,
  smartPromptSettings,
  setSmartPromptSettings,
  generalInstruction,
  setGeneralInstruction,
}: SmartPromptTabProps & {
  moderationResult?: ModerationResult
  onApplyModerationFix?: (fixedPrompt: string) => void
  showPolicyFixed?: boolean
  onDismissPolicyFixed?: () => void
}) {
  const [showCompiledPrompt, setShowCompiledPrompt] = useState(false)

  // Compile prompt for preview - prepend general instruction if provided
  const compiledPayload = useMemo(() => {
    const baseWithInstruction = generalInstruction 
      ? `${generalInstruction}. ${prompt}`.trim()
      : prompt
    return compileVideoPrompt({
      basePrompt: baseWithInstruction,
      settings: smartPromptSettings,
      method: 'T2V',
      durationSeconds: 6,
      aspectRatio: '16:9',
      preserveCharacters: characters.map(c => c.name),
    })
  }, [prompt, generalInstruction, smartPromptSettings, characters])

  return (
    <div className="h-full flex flex-col">
      {/* Simplified Header - cleaner typography */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-sf-primary" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Smart Prompt</h3>
        </div>
        <button
          onClick={() => setShowCompiledPrompt(!showCompiledPrompt)}
          className="text-xs text-sf-text-secondary hover:text-sf-primary flex items-center gap-1 transition-colors"
        >
          {showCompiledPrompt ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showCompiledPrompt ? 'Hide' : 'View'} Compiled
        </button>
      </div>

      {/* General Instruction - Quick text-based guidance (most effective) */}
      <div className="space-y-1.5 mb-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          General Instruction
          <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500">(Optional - highest priority)</span>
        </label>
        <Textarea
          value={generalInstruction}
          onChange={(e) => setGeneralInstruction(e.target.value)}
          placeholder="e.g., Make it more dramatic, Add slow motion, Darker mood..."
          className="min-h-[44px] resize-none text-sm"
        />
      </div>

      {/* Base Prompt */}
      <div className="space-y-1.5 mb-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Base Prompt
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the scene action, characters, and key moments..."
          className="min-h-[64px] resize-none text-sm"
        />
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
                <SelectItem key={take.id} value={take.veoVideoRef || ''}>
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
            Current: {currentTakes.find(t => t.veoVideoRef === sourceVideoUrl)?.durationSec || 5}s
          </span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            Extended: {(currentTakes.find(t => t.veoVideoRef === sourceVideoUrl)?.durationSec || 5) + duration}s
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
  characters = [],
  sceneImageUrl,
  onGenerate,
  isGenerating = false
}: VideoEditingDialogProps) {
  // Tab state - which mode is active
  const [activeTab, setActiveTab] = useState<VideoEditingTab>(initialTab)
  
  // Shared state
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [duration, setDuration] = useState(6)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')
  
  // Extend Tab state - stores Gemini Files API reference for video extension
  const [sourceVideoRef, setSourceVideoRef] = useState('')
  
  // Smart Prompt state
  const [smartPromptSettings, setSmartPromptSettings] = useState<SmartPromptSettings>(createDefaultSmartPromptSettings())
  const [generalInstruction, setGeneralInstruction] = useState('')

  // Content moderation state
  const [showPolicyAlert, setShowPolicyAlert] = useState(false)
  const [showPolicyFixed, setShowPolicyFixed] = useState(false)
  const [policyAlertDismissed, setPolicyAlertDismissed] = useState(false)

  // Compute moderation result whenever prompt or general instruction changes
  const moderationResult = useMemo(() => {
    const fullPrompt = generalInstruction 
      ? `${generalInstruction}. ${prompt}`.trim()
      : prompt
    return moderatePrompt(fullPrompt)
  }, [prompt, generalInstruction])

  // Reset policy alert dismissed state when prompt changes significantly
  useEffect(() => {
    if (!moderationResult.isClean && !policyAlertDismissed) {
      setShowPolicyAlert(true)
    }
  }, [moderationResult.isClean, policyAlertDismissed])

  // Handle applying moderation fix
  const handleApplyModerationFix = useCallback((fixedPrompt: string) => {
    // The fixed prompt includes both general instruction and base prompt
    // We need to split them back if general instruction was set
    if (generalInstruction) {
      const instructionPart = generalInstruction + '. '
      if (fixedPrompt.startsWith(instructionPart)) {
        setPrompt(fixedPrompt.slice(instructionPart.length))
      } else {
        // If the structure changed, put everything in the prompt
        setPrompt(fixedPrompt)
        setGeneralInstruction('')
      }
    } else {
      setPrompt(fixedPrompt)
    }
    setShowPolicyAlert(false)
    setShowPolicyFixed(true)
    // Auto-dismiss the success banner after 3 seconds
    setTimeout(() => setShowPolicyFixed(false), 3000)
  }, [generalInstruction])

  // AI regeneration handler using Gemini
  const handleRegenerateWithAI = useCallback(async (originalPrompt: string): Promise<string> => {
    try {
      const response = await fetch('/api/prompt/rephrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: originalPrompt,
          flaggedTerms: moderationResult.flaggedTerms.map(ft => ft.term),
          systemPrompt: buildRegenerationSystemPrompt(),
          userPrompt: buildRegenerationUserPrompt(
            originalPrompt, 
            moderationResult.flaggedTerms.map(ft => ft.term)
          ),
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to regenerate prompt')
      }
      
      const data = await response.json()
      return data.rephrasedPrompt
    } catch (error) {
      console.error('[Video Editor] AI regeneration failed:', error)
      throw error
    }
  }, [moderationResult.flaggedTerms])

  // Reset state when dialog opens
  useEffect(() => {
    if (open && segment) {
      setPrompt(segment.userEditedPrompt || segment.generatedPrompt || '')
      // Pre-load general instruction from segment if saved
      setGeneralInstruction(segment.userInstruction || '')
      // Reset smart prompt settings
      setSmartPromptSettings(createDefaultSmartPromptSettings())
      // Reset policy alert state
      setShowPolicyAlert(false)
      setShowPolicyFixed(false)
      setPolicyAlertDismissed(false)
    }
  }, [open, segment])

  // Handle generation based on active tab
  const handleGenerate = async () => {
    // Handle EXTEND tab - Video Extension via Gemini API
    if (activeTab === 'extend' && sourceVideoRef) {
      console.log('[Video Editor] Using EXT mode with Gemini API, veoVideoRef:', sourceVideoRef)
      const data: Parameters<typeof onGenerate>[0] = {
        method: 'EXT',
        prompt: prompt || 'Continue the video naturally',
        duration,
        aspectRatio,
        resolution,
        sourceVideoUrl: sourceVideoRef, // Pass the Gemini Files API reference
      }
      await onGenerate(data)
      return
    }
    
    // Handle SMART-PROMPT tab - Standard T2V generation
    // Compile the smart prompt settings with general instruction prepended
    const baseWithInstruction = generalInstruction 
      ? `${generalInstruction}. ${prompt}`.trim()
      : prompt
    const payload = compileVideoPrompt({
      basePrompt: baseWithInstruction,
      settings: smartPromptSettings,
      method: 'T2V',
      durationSeconds: duration,
      aspectRatio,
      preserveCharacters: characters.map(c => c.name),
    })
    
    const data: Parameters<typeof onGenerate>[0] = {
      method: payload.method,
      prompt: payload.basePrompt,
      negativePrompt: payload.negativePrompt,
      duration,
      aspectRatio,
      resolution,
    }

    await onGenerate(data)
  }

  // Check if generation is possible based on active tab
  const canGenerate = useMemo(() => {
    if (activeTab === 'extend') {
      // For extension, need a valid veoVideoRef
      return !!sourceVideoRef
    }
    // For smart-prompt, need a prompt
    return prompt.trim().length > 0
  }, [activeTab, prompt, sourceVideoRef])

  // Early return after all hooks if segment is not available
  if (!segment) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !isGenerating && !value && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Film className="w-4 h-4 text-sf-primary" />
            Video Editor
          </DialogTitle>
        </DialogHeader>

        {/* Split View: Controls Left (50%), Preview Right (50%) - Balanced layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Controls (50%) */}
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VideoEditingTab)} className="flex flex-col h-full">
              <TabsList className="mx-4 mt-4 mb-2 grid grid-cols-2 w-auto">
                <TabsTrigger value="smart-prompt" className="gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  Smart Prompt
                </TabsTrigger>
                <TabsTrigger value="extend" className="gap-1.5">
                  <Film className="w-3.5 h-3.5" />
                  Extend Video
                </TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-y-auto p-4 pt-2">
                {/* Content Policy Alert - shown at top of controls */}
                {showPolicyAlert && !moderationResult.isClean && !policyAlertDismissed && (
                  <ContentPolicyAlert
                    moderationResult={moderationResult}
                    onApplyFix={handleApplyModerationFix}
                    onDismiss={() => {
                      setShowPolicyAlert(false)
                      setPolicyAlertDismissed(true)
                    }}
                    enableAIRegeneration={true}
                    onRegenerateWithAI={handleRegenerateWithAI}
                    className="mb-4"
                  />
                )}
                
                {/* Success banner after fix applied */}
                {showPolicyFixed && (
                  <PolicyFixedBanner
                    onDismiss={() => setShowPolicyFixed(false)}
                    className="mb-4"
                  />
                )}

                {/* Smart Prompt Tab Content */}
                <TabsContent value="smart-prompt" className="mt-0">
                  <SmartPromptTab
                    segment={segment}
                    characters={characters}
                    prompt={prompt}
                    setPrompt={setPrompt}
                    smartPromptSettings={smartPromptSettings}
                    setSmartPromptSettings={setSmartPromptSettings}
                    generalInstruction={generalInstruction}
                    setGeneralInstruction={setGeneralInstruction}
                  />
                </TabsContent>
                
                {/* Extend Video Tab Content */}
                <TabsContent value="extend" className="mt-0">
                  <ExtendTab
                    segment={segment}
                    allSegments={allSegments}
                    prompt={prompt}
                    setPrompt={setPrompt}
                    sourceVideoUrl={sourceVideoRef}
                    setSourceVideoUrl={setSourceVideoRef}
                    duration={duration}
                    setDuration={setDuration}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right Panel - Preview (50%) with vertical centering */}
          <div className="w-1/2 p-4 flex flex-col min-h-0">
            {/* Preview container with aspect ratio preservation */}
            <div className="flex-1 flex flex-col justify-center">
              <PreviewPanel
                segment={segment}
                sceneImageUrl={sceneImageUrl}
                isGenerating={isGenerating}
              />
            </div>
            
            {/* Generation settings below preview */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Duration</label>
                  <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4s</SelectItem>
                      <SelectItem value="6">6s</SelectItem>
                      <SelectItem value="8">8s</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Resolution</label>
                  <Select value={resolution} onValueChange={(v) => setResolution(v as '720p' | '1080p')}>
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p</SelectItem>
                      <SelectItem value="1080p">1080p</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Aspect</label>
                  <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as '16:9' | '9:16')}>
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="9:16">9:16</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - streamlined */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Info className="w-3 h-3" />
            <span>Configure camera, performance, and style for optimal results</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="gap-1.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Generate Video
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
