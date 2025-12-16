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
  Library
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SceneSegment, SceneSegmentTake, VideoGenerationMethod } from './types'
import { VisualReference } from '@/types/visionReferences'
import { toast } from 'sonner'

// ============================================
// Types & Interfaces
// ============================================

export type VideoEditingTab = 'extend' | 'interpolate' | 'reference' | 'audio' | 'inpaint'

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
// Tab Components
// ============================================

interface TabContentProps {
  segment: SceneSegment
  allSegments?: SceneSegment[]
  sceneReferences?: VisualReference[]
  objectReferences?: VisualReference[]
  characters?: Array<{
    name: string
    description?: string
    referenceImage?: string
  }>
  sceneImageUrl?: string
  previousSegmentLastFrame?: string | null
  prompt: string
  setPrompt: (p: string) => void
  negativePrompt: string
  setNegativePrompt: (p: string) => void
  duration: number
  setDuration: (d: number) => void
  aspectRatio: '16:9' | '9:16'
  setAspectRatio: (a: '16:9' | '9:16') => void
  resolution: '720p' | '1080p'
  setResolution: (r: '720p' | '1080p') => void
  // Extend-specific
  sourceVideoUrl: string
  setSourceVideoUrl: (u: string) => void
  // Frame control
  startFrameUrl: string
  setStartFrameUrl: (u: string) => void
  endFrameUrl: string
  setEndFrameUrl: (u: string) => void
  // Reference images
  selectedReferences: SelectedReference[]
  setSelectedReferences: (refs: SelectedReference[]) => void
}

// ============================================
// Scene Extension Tab
// ============================================

function SceneExtensionTab({ 
  segment, 
  allSegments = [],
  prompt,
  setPrompt,
  sourceVideoUrl,
  setSourceVideoUrl,
  duration,
  setDuration
}: TabContentProps) {
  // Find takes with veoVideoRef for extension
  const extensibleTakes = useMemo(() => {
    const takes: Array<SceneSegmentTake & { segmentIndex: number }> = []
    allSegments.forEach((seg, idx) => {
      seg.takes?.forEach(take => {
        if (take.veoVideoRef && take.assetUrl) {
          takes.push({ ...take, segmentIndex: idx })
        }
      })
    })
    return takes
  }, [allSegments])

  // Current segment's extensible takes
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
            Extend your video beyond its original length. Veo uses the context of the last frames to generate new footage that continues the action seamlessly.
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
              Video extension only works with Veo-generated videos still in the system cache (2-day retention). Generate a new video first, or use Frame Control to create a continuation from the last frame.
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
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tip: Be specific about actions, camera movements, or dialogue to guide the extension.
        </p>
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

function FrameControlTab({
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
}: TabContentProps) {
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
          <h4 className="font-medium text-cyan-900 dark:text-cyan-100">Frame Control (First & Last Frame)</h4>
          <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-0.5">
            Upload a starting image and an ending image. Veo will generate the video transition between them, giving you control over the narrative arc.
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
// Reference Images Tab (REF - Ingredients-to-Video)
// Coming Soon - REST API doesn't support referenceImages yet
// ============================================

function ReferenceImagesTab() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
        <Users className="w-5 h-5 text-pink-600 dark:text-pink-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-pink-900 dark:text-pink-100">Reference Images (Ingredients-to-Video)</h4>
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded">Coming Soon</span>
          </div>
          <p className="text-sm text-pink-700 dark:text-pink-300 mt-0.5">
            Supply up to 3 reference images to ensure visual consistency. Use character images for actor consistency or style images for visual coherence.
          </p>
        </div>
      </div>

      {/* API Limitation Notice */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">API Limitation</p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            The Veo 3.1 <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">referenceImages</code> feature is currently only available through Google's Python SDK, not the REST API we use. 
            We're monitoring for REST API support. In the meantime, use <strong>Image-to-Video</strong> with a scene frame as the starting image for visual consistency.
          </p>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="space-y-3">
        <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reference-Guided Video</h5>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            When available, this feature will let you provide character portraits and style references to maintain visual consistency across generated videos.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h6 className="text-xs font-medium text-purple-900 dark:text-purple-100 mb-1">Character Consistency</h6>
            <p className="text-[10px] text-purple-700 dark:text-purple-300">
              "Use Alex's portrait to keep the same face throughout"
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h6 className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Style Matching</h6>
            <p className="text-[10px] text-blue-700 dark:text-blue-300">
              "Match the lighting and color grading of this reference"
            </p>
          </div>
        </div>
      </div>

      {/* Workaround Suggestion */}
      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h6 className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">💡 Current Workaround</h6>
        <p className="text-xs text-green-700 dark:text-green-300">
          Use the <strong>Frames tab</strong> with a scene reference image as the first frame. This anchors the video's visual style to your reference and provides better consistency than text-only generation.
        </p>
      </div>
    </div>
  )
}

// ============================================
// Audio Sync Tab
// ============================================

function AudioSyncTab({ prompt, setPrompt }: TabContentProps) {
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

      {/* Multi-language Dubbing Placeholder */}
      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Multi-language Dubbing</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">Coming Soon</span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Future integration with ElevenLabs will allow generating synchronized audio in multiple languages, perfect for international distribution.
        </p>
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
// Object Editing Tab (Inpainting Placeholder)
// ============================================

function ObjectEditingTab() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <Wand2 className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-700 dark:text-gray-300">Object Editing (Inpainting)</h4>
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded">Coming Soon</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Mask specific areas of a video to add new objects or remove existing ones.
          </p>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="space-y-3">
        <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <Wand2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Video Inpainting</h5>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            This feature will allow you to select areas in a video and use text prompts to add or remove objects. For example: "remove the car from the street" or "add a hat to the character".
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h6 className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">Add Objects</h6>
            <p className="text-[10px] text-green-700 dark:text-green-300">
              "Add a glowing sword to the character's hand"
            </p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <h6 className="text-xs font-medium text-red-900 dark:text-red-100 mb-1">Remove Objects</h6>
            <p className="text-[10px] text-red-700 dark:text-red-300">
              "Remove the modern car from the medieval scene"
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center italic">
          Note: Video inpainting is not currently available in the Veo 3.1 API. This feature will be enabled when Google releases the capability.
        </p>
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
  initialTab = 'extend',
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
      // Pre-select source video for extension
      const currentVideoTake = segment.takes?.find(t => t.assetUrl === segment.activeAssetUrl && t.veoVideoRef)
      if (currentVideoTake) {
        setSourceVideoUrl(currentVideoTake.assetUrl)
      }
      // Pre-select start frame
      if (sceneImageUrl) {
        setStartFrameUrl(sceneImageUrl)
      }
    }
  }, [open, initialTab, segment, sceneImageUrl])

  // Handle generation based on active tab
  const handleGenerate = async () => {
    let method: VideoGenerationMethod = 'T2V'
    let data: Parameters<typeof onGenerate>[0] = {
      method,
      prompt,
      negativePrompt,
      duration,
      aspectRatio,
      resolution
    }

    switch (activeTab) {
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
      case 'reference':
        method = 'REF'
        data = {
          ...data,
          method,
          referenceImages: selectedReferences.map(r => ({
            url: r.imageUrl,
            type: r.type
          }))
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
      case 'inpaint':
        // Not implemented yet
        toast.error('Object editing is not yet available')
        return
    }

    await onGenerate(data)
  }

  // Check if generation is possible
  const canGenerate = useMemo(() => {
    if (!prompt.trim()) return false
    
    switch (activeTab) {
      case 'extend':
        return !!sourceVideoUrl
      case 'interpolate':
        return !!startFrameUrl && !!endFrameUrl
      case 'reference':
        return selectedReferences.length > 0
      case 'audio':
        return true
      case 'inpaint':
        return false
    }
  }, [activeTab, prompt, sourceVideoUrl, startFrameUrl, endFrameUrl, selectedReferences])

  // Shared props for tab components - use null fallback for segment to satisfy TypeScript
  const tabProps: TabContentProps = {
    segment: segment!,
    allSegments,
    sceneReferences,
    objectReferences,
    characters,
    sceneImageUrl,
    previousSegmentLastFrame,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    duration,
    setDuration,
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
    sourceVideoUrl,
    setSourceVideoUrl,
    startFrameUrl,
    setStartFrameUrl,
    endFrameUrl,
    setEndFrameUrl,
    selectedReferences,
    setSelectedReferences
  }

  // Early return after all hooks if segment is not available
  if (!segment) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !isGenerating && !value && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-sf-primary" />
            Video Editing
          </DialogTitle>
          <DialogDescription>
            Use Veo 3.1's advanced editing features to refine your video content
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VideoEditingTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="extend" className="text-xs gap-1">
              <Film className="w-3.5 h-3.5" />
              Extend
            </TabsTrigger>
            <TabsTrigger value="interpolate" className="text-xs gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              Frames
            </TabsTrigger>
            <TabsTrigger value="reference" className="text-xs gap-1">
              <Users className="w-3.5 h-3.5" />
              Reference
            </TabsTrigger>
            <TabsTrigger value="audio" className="text-xs gap-1">
              <Music className="w-3.5 h-3.5" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="inpaint" className="text-xs gap-1">
              <Wand2 className="w-3.5 h-3.5" />
              Objects
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2">
            <TabsContent value="extend" className="mt-0">
              <SceneExtensionTab {...tabProps} />
            </TabsContent>
            <TabsContent value="interpolate" className="mt-0">
              <FrameControlTab {...tabProps} />
            </TabsContent>
            <TabsContent value="reference" className="mt-0">
              <ReferenceImagesTab />
            </TabsContent>
            <TabsContent value="audio" className="mt-0">
              <AudioSyncTab {...tabProps} />
            </TabsContent>
            <TabsContent value="inpaint" className="mt-0">
              <ObjectEditingTab />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer with Settings and Generate */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <Clock className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 seconds</SelectItem>
                <SelectItem value="6">6 seconds</SelectItem>
                <SelectItem value="8">8 seconds</SelectItem>
              </SelectContent>
            </Select>
            <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as '16:9' | '9:16')}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resolution} onValueChange={(v) => setResolution(v as '720p' | '1080p')}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="720p">720p</SelectItem>
                <SelectItem value="1080p">1080p</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating || activeTab === 'inpaint' || activeTab === 'reference'}
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
