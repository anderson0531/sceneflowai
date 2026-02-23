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
import { extractVideoFrame } from '@/lib/video/clientVideoUtils'

// ============================================
// Types & Interfaces
// ============================================

export type VideoEditingTab = 'smart-prompt' | 'extend' | 'edit' | 'interpolate' | 'audio' | 'history'

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

interface PreviousSegmentInfo {
  segmentNumber: number
  segmentId: string
  takes: SceneSegmentTake[]
  endFrameUrl?: string | null
}

interface ExtendTabProps {
  segment: SceneSegment
  allSegments?: SceneSegment[]
  prompt: string
  setPrompt: (p: string) => void
  sourceVideoUrl: string
  setSourceVideoUrl: (u: string) => void
  duration: number
  setDuration: (d: number) => void
  previousSegmentLastFrame?: string | null
  creditLine1: string
  setCreditLine1: (c: string) => void
  creditLine2: string
  setCreditLine2: (c: string) => void
}

function ExtendTab({ 
  segment, 
  allSegments = [],
  prompt,
  setPrompt,
  sourceVideoUrl,
  setSourceVideoUrl,
  duration,
  setDuration,
  previousSegmentLastFrame,
  creditLine1,
  setCreditLine1,
  creditLine2,
  setCreditLine2,
}: ExtendTabProps) {
  // Find the current segment index and get previous segment info
  const currentSegmentIndex = allSegments.findIndex(s => s.segmentId === segment.segmentId)
  
  // Get previous segment with its takes
  const previousSegmentInfo: PreviousSegmentInfo | null = React.useMemo(() => {
    if (currentSegmentIndex <= 0) return null
    const prevSeg = allSegments[currentSegmentIndex - 1]
    const successfulTakes = prevSeg.takes?.filter(t => t.status === 'done') || []
    return {
      segmentNumber: currentSegmentIndex, // 1-indexed display
      segmentId: prevSeg.segmentId,
      takes: successfulTakes,
      endFrameUrl: prevSeg.references?.endFrameUrl
    }
  }, [allSegments, currentSegmentIndex])

  // Determine source frame based on selection
  const sourceFrameInfo = React.useMemo(() => {
    if (!sourceVideoUrl || sourceVideoUrl === 'auto') {
      // Auto mode: use the best available source
      if (previousSegmentInfo && previousSegmentInfo.takes.length > 0) {
        const latestTake = previousSegmentInfo.takes[previousSegmentInfo.takes.length - 1]
        return {
          type: 'previous-video' as const,
          url: latestTake.lastFrameUrl || latestTake.thumbnailUrl || previousSegmentLastFrame,
          label: `Segment ${previousSegmentInfo.segmentNumber} - Take ${previousSegmentInfo.takes.length} (Latest)`,
          takeInfo: latestTake
        }
      }
      if (previousSegmentLastFrame) {
        return {
          type: 'keyframe' as const,
          url: previousSegmentLastFrame,
          label: `Segment ${currentSegmentIndex} - End Keyframe`,
          takeInfo: null
        }
      }
      return null
    }
    
    // Specific take selection from previous segment
    if (sourceVideoUrl.startsWith('prev-take-')) {
      const takeIndex = parseInt(sourceVideoUrl.replace('prev-take-', ''))
      const take = previousSegmentInfo?.takes[takeIndex]
      if (take) {
        return {
          type: 'previous-video' as const,
          url: take.lastFrameUrl || take.thumbnailUrl,
          label: `Segment ${previousSegmentInfo?.segmentNumber} - Take ${takeIndex + 1}`,
          takeInfo: take
        }
      }
    }
    
    // Previous segment keyframe fallback
    if (sourceVideoUrl === 'prev-keyframe') {
      return {
        type: 'keyframe' as const,
        url: previousSegmentInfo?.endFrameUrl || previousSegmentLastFrame,
        label: `Segment ${currentSegmentIndex} - End Keyframe (Storyboard)`,
        takeInfo: null
      }
    }
    
    return null
  }, [sourceVideoUrl, previousSegmentInfo, previousSegmentLastFrame, currentSegmentIndex])

  const hasExtensibleSource = !!sourceFrameInfo?.url

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <Film className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-green-900 dark:text-green-100">Extend from Previous Segment</h4>
          <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
            Continue your video seamlessly by using the last frame of Segment {currentSegmentIndex} as the starting point for Segment {currentSegmentIndex + 1}.
          </p>
        </div>
      </div>

      {/* Source Selection */}
      {currentSegmentIndex > 0 ? (
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Source Frame from Segment {currentSegmentIndex}
          </label>
          
          <Select value={sourceVideoUrl || 'auto'} onValueChange={setSourceVideoUrl}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select source..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-green-500" />
                  <span>Auto (Best Available)</span>
                </div>
              </SelectItem>
              
              {previousSegmentInfo && previousSegmentInfo.takes.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs text-gray-500 border-t mt-1">
                    Video Takes from Segment {previousSegmentInfo.segmentNumber}
                  </div>
                  {previousSegmentInfo.takes.map((take, idx) => (
                    <SelectItem key={take.id} value={`prev-take-${idx}`}>
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-blue-500" />
                        <span>Take {idx + 1}</span>
                        <span className="text-xs text-gray-400">
                          ({take.durationSec || 5}s)
                        </span>
                        {take.lastFrameUrl && (
                          <Check className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
              
              {previousSegmentInfo?.endFrameUrl && (
                <>
                  <div className="px-2 py-1 text-xs text-gray-500 border-t mt-1">
                    Storyboard Keyframe
                  </div>
                  <SelectItem value="prev-keyframe">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-purple-500" />
                      <span>End Keyframe (Storyboard)</span>
                    </div>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          
          {/* Source Frame Preview */}
          {sourceFrameInfo && sourceFrameInfo.url && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <img 
                    src={sourceFrameInfo.url} 
                    alt="Source frame for extension" 
                    className="w-32 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                  <div className={cn(
                    "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-medium",
                    sourceFrameInfo.type === 'previous-video' 
                      ? "bg-blue-500 text-white" 
                      : "bg-purple-500 text-white"
                  )}>
                    {sourceFrameInfo.type === 'previous-video' ? 'Video Frame' : 'Keyframe'}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {sourceFrameInfo.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {sourceFrameInfo.type === 'previous-video' 
                      ? 'Last frame extracted from rendered video - best for visual continuity'
                      : 'Pre-generated storyboard keyframe - may differ from actual video'}
                  </p>
                  {sourceFrameInfo.takeInfo && (
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Source: {sourceFrameInfo.takeInfo.durationSec || 5}s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* First segment - no previous to extend from */
        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-100">First Segment</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
              This is the first segment - there's no previous segment to extend from. Use Text-to-Video or Image-to-Video mode instead.
            </p>
          </div>
        </div>
      )}

      {/* Extension Duration */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          New Segment Duration
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
        </div>
      </div>

      {/* Extension Prompt */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Visual Description
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what should happen next... The AI will animate from the source frame while following your direction."
          className="min-h-[80px]"
        />
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Tip: Describe the scene visuals, lighting, and atmosphere. Be specific about what you want to see.
        </p>
      </div>

      {/* Credit Lines Section */}
      <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <label className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Credit Lines (Optional)
          </label>
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Add credit text to be displayed as title card overlays in the generated video.
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={creditLine1}
            onChange={(e) => setCreditLine1(e.target.value)}
            placeholder="Line 1 (e.g., 'Created by: Your Name')"
            className="w-full px-3 py-2 text-sm rounded-md border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
          <input
            type="text"
            value={creditLine2}
            onChange={(e) => setCreditLine2(e.target.value)}
            placeholder="Line 2 (e.g., 'Production by: Studio Name')"
            className="w-full px-3 py-2 text-sm rounded-md border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Generation Info */}
      {hasExtensibleSource && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <ArrowRight className="w-4 h-4 text-green-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-green-600 dark:text-green-400">I2V Generation:</span>{' '}
            Starting from {sourceFrameInfo?.type === 'previous-video' ? 'video frame' : 'keyframe'} → {duration}s new video
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// Edit Video Tab (V2V Workaround via REF)
// ============================================

interface EditTabProps {
  segment: SceneSegment
  editSourceVideoUrl: string
  setEditSourceVideoUrl: (u: string) => void
  extractedFrames: string[]
  setExtractedFrames: (frames: string[]) => void
  editInstruction: string
  setEditInstruction: (i: string) => void
  editNegativePrompt: string
  setEditNegativePrompt: (n: string) => void
  isExtractingFrames: boolean
  setIsExtractingFrames: (v: boolean) => void
  basePrompt: string
}

function EditTab({
  segment,
  editSourceVideoUrl,
  setEditSourceVideoUrl,
  extractedFrames,
  setExtractedFrames,
  editInstruction,
  setEditInstruction,
  editNegativePrompt,
  setEditNegativePrompt,
  isExtractingFrames,
  setIsExtractingFrames,
  basePrompt
}: EditTabProps) {
  // Find takes with video URLs for editing
  const currentTakes = segment.takes?.filter(t => t.videoUrl) || []
  const hasEditableVideo = currentTakes.length > 0

  // Extract 3 frames from video (start, middle, end)
  const handleExtractFrames = async () => {
    if (!editSourceVideoUrl) {
      toast.error('Please select a source video first')
      return
    }

    setIsExtractingFrames(true)
    try {
      // Extract frames at start (0.1s), middle, and near-end
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.preload = 'metadata'
      
      const duration = await new Promise<number>((resolve, reject) => {
        video.onloadedmetadata = () => resolve(video.duration)
        video.onerror = () => reject(new Error('Failed to load video'))
        video.src = editSourceVideoUrl
        video.load()
      })

      const times = [
        0.1, // Start
        duration / 2, // Middle
        Math.max(0, duration - 0.1) // End
      ]

      const frames = await Promise.all(
        times.map(time => extractVideoFrame(editSourceVideoUrl, time))
      )

      setExtractedFrames(frames)
      toast.success('Extracted 3 reference frames')
    } catch (error) {
      console.error('Frame extraction error:', error)
      toast.error('Failed to extract frames from video')
    } finally {
      setIsExtractingFrames(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <SlidersHorizontal className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-purple-900 dark:text-purple-100">Edit Video (Reference-Based)</h4>
          <p className="text-sm text-purple-700 dark:text-purple-300 mt-0.5">
            Extract frames from existing video as references, then regenerate with your edits applied.
          </p>
        </div>
      </div>

      {/* Warning if no editable videos */}
      {!hasEditableVideo && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-100">No Videos Available</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
              Generate a video first using Smart Prompt, then you can edit it here.
            </p>
          </div>
        </div>
      )}

      {/* Source Video Selection */}
      {hasEditableVideo && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Source Video to Edit
          </label>
          <Select value={editSourceVideoUrl} onValueChange={(url) => {
            setEditSourceVideoUrl(url)
            setExtractedFrames([]) // Clear frames when source changes
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a video take..." />
            </SelectTrigger>
            <SelectContent>
              {currentTakes.map((take, idx) => (
                <SelectItem key={take.id} value={take.videoUrl || ''}>
                  Take {idx + 1} ({take.durationSec || 5}s)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Video Preview */}
          {editSourceVideoUrl && (
            <div className="mt-2">
              <video
                src={editSourceVideoUrl}
                controls
                className="w-full max-h-32 rounded-lg bg-black"
              />
            </div>
          )}
        </div>
      )}

      {/* Extract Frames Button */}
      {editSourceVideoUrl && (
        <div className="space-y-2">
          <Button
            onClick={handleExtractFrames}
            disabled={isExtractingFrames}
            className="w-full"
            variant="outline"
          >
            {isExtractingFrames ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting Frames...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 mr-2" />
                Extract 3 Reference Frames
              </>
            )}
          </Button>
          
          {/* Extracted Frames Preview */}
          {extractedFrames.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Reference Frames (Start, Middle, End)</label>
              <div className="grid grid-cols-3 gap-2">
                {extractedFrames.map((frame, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={frame} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {idx === 0 ? 'Start' : idx === 1 ? 'Middle' : 'End'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Instruction */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Edit Instruction <span className="text-red-500">*</span>
        </label>
        <Textarea
          value={editInstruction}
          onChange={(e) => setEditInstruction(e.target.value)}
          placeholder="Describe your edit... e.g., 'Change the sky to a golden sunset', 'Add rain falling', 'Make the lighting more dramatic'"
          className="min-h-[80px]"
        />
        <p className="text-xs text-gray-500">
          The AI will apply this edit while preserving the visual consistency from the reference frames.
        </p>
      </div>

      {/* Negative Prompt for Error Removal */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Remove from Result (Negative Prompt)
        </label>
        <Textarea
          value={editNegativePrompt}
          onChange={(e) => setEditNegativePrompt(e.target.value)}
          placeholder="What to avoid... e.g., 'original blue sky', 'daytime lighting', 'clear weather'"
          className="min-h-[60px]"
        />
        <p className="text-xs text-gray-500">
          Use this to remove unwanted elements from the original that conflict with your edit.
        </p>
      </div>

      {/* Base Prompt (read-only reference) */}
      {basePrompt && (
        <div className="space-y-2">
          <label className="text-xs text-gray-500">Original Scene Prompt (for reference)</label>
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 max-h-20 overflow-y-auto">
            {basePrompt}
          </div>
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
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p')
  
  // Extend Tab state - stores selected video/frame for I2V extension
  const [sourceVideoRef, setSourceVideoRef] = useState('')
  const [creditLine1, setCreditLine1] = useState('')
  const [creditLine2, setCreditLine2] = useState('')
  
  // Edit Tab state - V2V workaround via reference frames
  const [editSourceVideoUrl, setEditSourceVideoUrl] = useState('')
  const [extractedFrames, setExtractedFrames] = useState<string[]>([])
  const [editInstruction, setEditInstruction] = useState('')
  const [editNegativePrompt, setEditNegativePrompt] = useState('')
  const [isExtractingFrames, setIsExtractingFrames] = useState(false)
  
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

  // Helper to build prompt with credit lines
  const buildPromptWithCredits = (basePrompt: string): string => {
    let finalPrompt = basePrompt
    
    // Add credit lines if provided
    if (creditLine1 || creditLine2) {
      const creditParts: string[] = []
      if (creditLine1) creditParts.push(creditLine1)
      if (creditLine2) creditParts.push(creditLine2)
      
      // Intelligently add credits to the prompt
      const creditText = creditParts.join('. ')
      finalPrompt = `${finalPrompt}. Title card displays text: "${creditText}".`
    }
    
    return finalPrompt
  }

  // Helper to get the source frame URL for Extend mode based on selection
  const getExtendSourceFrameUrl = useCallback((): string | undefined => {
    // Find the current segment index and previous segment
    const currentIndex = allSegments?.findIndex(s => s.segmentId === segment.segmentId) ?? -1
    const previousSegment = currentIndex > 0 ? allSegments?.[currentIndex - 1] : null
    const previousTakes = previousSegment?.takes?.filter(t => t.status === 'done') || []
    
    // Handle different selection modes
    if (!sourceVideoRef || sourceVideoRef === 'auto') {
      // Auto mode: prefer latest video take's last frame, fallback to keyframe
      if (previousTakes.length > 0) {
        const latestTake = previousTakes[previousTakes.length - 1]
        return latestTake.lastFrameUrl || latestTake.thumbnailUrl || previousSegmentLastFrame || undefined
      }
      return previousSegmentLastFrame || undefined
    }
    
    // Specific take from previous segment
    if (sourceVideoRef.startsWith('prev-take-')) {
      const takeIndex = parseInt(sourceVideoRef.replace('prev-take-', ''))
      const take = previousTakes[takeIndex]
      if (take) {
        return take.lastFrameUrl || take.thumbnailUrl || undefined
      }
    }
    
    // Previous segment keyframe
    if (sourceVideoRef === 'prev-keyframe') {
      return previousSegment?.references?.endFrameUrl || previousSegmentLastFrame || undefined
    }
    
    // Legacy fallback for old selection format
    if (sourceVideoRef === 'previous-segment') {
      return previousSegmentLastFrame || undefined
    }
    
    return previousSegmentLastFrame || undefined
  }, [sourceVideoRef, allSegments, segment.segmentId, previousSegmentLastFrame])

  // Handle generation based on active tab
  const handleGenerate = async () => {
    // Handle EXTEND tab - I2V extension using end frame of previous video
    if (activeTab === 'extend') {
      // Get the start frame URL based on selection
      const startFrameUrl = getExtendSourceFrameUrl()
      
      if (!startFrameUrl) {
        toast.error('No source frame available for extension. Generate a video in the previous segment first.')
        return
      }
      
      // Build prompt with credits
      const extendPrompt = buildPromptWithCredits(prompt || 'Continue the video naturally, maintaining visual continuity')
      
      console.log('[Video Editor] Using I2V mode for extension with start frame:', startFrameUrl)
      console.log('[Video Editor] Source selection:', sourceVideoRef || 'auto')
      
      const data: Parameters<typeof onGenerate>[0] = {
        method: 'I2V',
        prompt: extendPrompt,
        duration,
        aspectRatio,
        resolution,
        startFrameUrl, // Use end frame of previous video as start frame for I2V
      }
      await onGenerate(data)
      return
    }
    
    // Handle EDIT tab - V2V workaround via REF mode with extracted frames
    if (activeTab === 'edit' && extractedFrames.length === 3 && editInstruction.trim()) {
      console.log('[Video Editor] Using REF mode for V2V edit workaround')
      console.log('[Video Editor] Edit instruction:', editInstruction)
      console.log('[Video Editor] Reference frames:', extractedFrames.length)
      
      // Build the edited prompt: prepend edit instruction to base prompt
      const editedPrompt = `${editInstruction}. ${prompt || segment.generatedPrompt || ''}`.trim()
      
      // Combine user's negative prompt with standard anti-artifacts
      const combinedNegative = editNegativePrompt 
        ? `${editNegativePrompt}, unnatural motion, morphing artifacts, temporal inconsistency`
        : 'unnatural motion, morphing artifacts, temporal inconsistency'
      
      const data: Parameters<typeof onGenerate>[0] = {
        method: 'REF',
        prompt: editedPrompt,
        negativePrompt: combinedNegative,
        duration,
        aspectRatio,
        resolution,
        // Pass extracted frames as reference images for visual consistency
        referenceImages: extractedFrames.map((frame, idx) => ({
          url: frame,
          type: 'style' as const // Use 'style' for visual consistency across the video
        })),
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

  // Get previous segment's last frame (passed from props)
  const previousSegmentLastFrame = (segment as any).previousSegmentLastFrame || null

  // Check if generation is possible based on active tab
  const canGenerate = useMemo(() => {
    if (activeTab === 'extend') {
      // For I2V extension, need either:
      // 1. A selected video take with end frame
      // 2. Previous segment's last frame available
      if (sourceVideoRef) {
        if (sourceVideoRef === 'previous-segment') {
          return !!previousSegmentLastFrame
        }
        const selectedTake = segment.takes?.find(t => t.id === sourceVideoRef || t.videoUrl === sourceVideoRef)
        return !!(selectedTake?.lastFrameUrl || selectedTake?.thumbnailUrl || previousSegmentLastFrame)
      }
      return !!previousSegmentLastFrame
    }
    if (activeTab === 'edit') {
      // For edit mode, need 3 extracted frames and an edit instruction
      return extractedFrames.length === 3 && editInstruction.trim().length > 0
    }
    // For smart-prompt, need a prompt
    return prompt.trim().length > 0
  }, [activeTab, prompt, sourceVideoRef, extractedFrames, editInstruction])

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
              <TabsList className="mx-4 mt-4 mb-2 grid grid-cols-3 w-auto">
                <TabsTrigger value="smart-prompt" className="gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  Smart Prompt
                </TabsTrigger>
                <TabsTrigger value="edit" className="gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Edit Video
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
                    previousSegmentLastFrame={previousSegmentLastFrame}
                    creditLine1={creditLine1}
                    setCreditLine1={setCreditLine1}
                    creditLine2={creditLine2}
                    setCreditLine2={setCreditLine2}
                  />
                </TabsContent>
                
                {/* Edit Video Tab Content */}
                <TabsContent value="edit" className="mt-0">
                  <EditTab
                    segment={segment}
                    editSourceVideoUrl={editSourceVideoUrl}
                    setEditSourceVideoUrl={setEditSourceVideoUrl}
                    extractedFrames={extractedFrames}
                    setExtractedFrames={setExtractedFrames}
                    editInstruction={editInstruction}
                    setEditInstruction={setEditInstruction}
                    editNegativePrompt={editNegativePrompt}
                    setEditNegativePrompt={setEditNegativePrompt}
                    isExtractingFrames={isExtractingFrames}
                    setIsExtractingFrames={setIsExtractingFrames}
                    basePrompt={prompt || segment.generatedPrompt || ''}
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
