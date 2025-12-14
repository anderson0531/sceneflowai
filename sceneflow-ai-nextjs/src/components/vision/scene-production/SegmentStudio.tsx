'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SceneSegment, SceneProductionReferences, SceneSegmentStatus, SegmentKeyframeSettings, KeyframeEasingType, KeyframePanDirection } from './types'
import { Upload, Video, Image as ImageIcon, CheckCircle2, Loader2, Film, Play, X, ChevronLeft, ChevronRight, Maximize2, Clock, Timer, MessageSquare, User, Check, Move, ZoomIn, ZoomOut, RotateCcw, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentPromptBuilder, GeneratePromptData, VideoGenerationMethod } from './SegmentPromptBuilder'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AudioTrackClip, AudioTracksData } from './SceneTimeline'
import { SegmentAnimationPreview } from './SegmentAnimationPreview'

export type GenerationType = 'T2V' | 'I2V' | 'T2I' | 'UPLOAD'

// Dialogue line from scene (for display)
interface SceneDialogueLine {
  id: string
  character: string
  line: string
}

// Dialogue line assigned to segment (with coverage status)
interface SegmentDialogueAssignment {
  id: string
  character: string
  line: string
  covered: boolean
}

interface SegmentStudioProps {
  segment: SceneSegment | null
  segments?: SceneSegment[]
  onSegmentChange?: (segmentId: string) => void
  previousSegmentLastFrame?: string | null
  onGenerate: (mode: GenerationType, options?: { 
    startFrameUrl?: string
    endFrameUrl?: string
    referenceImages?: Array<{ url: string; type: 'style' | 'character' }>
    generationMethod?: VideoGenerationMethod
    prompt?: string
    negativePrompt?: string
    duration?: number
    aspectRatio?: '16:9' | '9:16'
    resolution?: '720p' | '1080p'
  }) => Promise<void>
  onUploadMedia: (file: File) => Promise<void>
  onPromptChange?: (prompt: string) => void
  onDurationChange?: (segmentId: string, newDuration: number) => void
  references: SceneProductionReferences
  sceneImageUrl?: string
  audioTracks?: AudioTracksData
  // Segment position for establishing shot logic
  segmentIndex?: number
  // Phase 2: Dialogue coverage
  sceneDialogueLines?: SceneDialogueLine[]
  segmentDialogueLines?: SegmentDialogueAssignment[]
  onToggleDialogue?: (dialogueId: string) => void
  // Phase 3: Keyframe settings
  onKeyframeChange?: (settings: SegmentKeyframeSettings) => void
  // Image editing (reuses same modal as Frame step)
  onEditImage?: (imageUrl: string) => void
  // Establishing Shot handlers
  onAddEstablishingShot?: (style: 'single-shot' | 'beat-matched' | 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => void
  onEstablishingShotStyleChange?: (style: 'single-shot' | 'beat-matched' | 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => void
  // Take selection - allows user to choose which take to use as active asset
  onSelectTake?: (takeId: string, takeAssetUrl: string) => void
  // Scene direction text for backdrop generation
  sceneDirection?: string
}

export function SegmentStudio({
  segment,
  segments = [],
  onSegmentChange,
  previousSegmentLastFrame,
  onGenerate,
  onUploadMedia,
  onPromptChange,
  onDurationChange,
  references,
  sceneImageUrl,
  audioTracks,
  segmentIndex = 0,
  sceneDialogueLines = [],
  segmentDialogueLines = [],
  onToggleDialogue,
  onKeyframeChange,
  onEditImage,
  onAddEstablishingShot,
  onEstablishingShotStyleChange,
  onSelectTake,
  sceneDirection,
}: SegmentStudioProps) {
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Prompt Builder State
  const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false)
  const [promptBuilderMode, setPromptBuilderMode] = useState<'image' | 'video'>('video')
  
  // Phase 4: Animation preview state
  const [showAnimationPreview, setShowAnimationPreview] = useState(false)
  
  // Phase 3: Default keyframe settings
  const defaultKeyframeSettings: SegmentKeyframeSettings = {
    zoomStart: 1.0,
    zoomEnd: 1.1,
    panStartX: 0,
    panStartY: 0,
    panEndX: 0,
    panEndY: 0,
    easingType: 'smooth',
    direction: 'none',
    useAutoDetect: true,
  }
  
  // Get current keyframe settings (from segment or defaults)
  const keyframeSettings = segment?.keyframeSettings || defaultKeyframeSettings
  
  // Direction presets with pan values
  const directionPresets: Record<KeyframePanDirection, { panEndX: number; panEndY: number }> = {
    'none': { panEndX: 0, panEndY: 0 },
    'left': { panEndX: -5, panEndY: 0 },
    'right': { panEndX: 5, panEndY: 0 },
    'up': { panEndX: 0, panEndY: -5 },
    'down': { panEndX: 0, panEndY: 5 },
    'up-left': { panEndX: -4, panEndY: -4 },
    'up-right': { panEndX: 4, panEndY: -4 },
    'down-left': { panEndX: -4, panEndY: 4 },
    'down-right': { panEndX: 4, panEndY: 4 },
  }
  
  // Update keyframe settings
  const updateKeyframe = useCallback((updates: Partial<SegmentKeyframeSettings>) => {
    const newSettings: SegmentKeyframeSettings = {
      ...keyframeSettings,
      ...updates,
      useAutoDetect: false, // Manual edit disables auto-detect
    }
    // If direction is set, apply preset pan values
    if (updates.direction && updates.direction !== 'none') {
      const preset = directionPresets[updates.direction]
      newSettings.panEndX = preset.panEndX
      newSettings.panEndY = preset.panEndY
    }
    onKeyframeChange?.(newSettings)
  }, [keyframeSettings, onKeyframeChange])
  
  // Reset to auto-detect
  const resetToAutoDetect = useCallback(() => {
    onKeyframeChange?.({
      ...defaultKeyframeSettings,
      useAutoDetect: true,
    })
  }, [onKeyframeChange])
  
  // Audio playback state
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  
  // Segment navigation
  const currentIndex = segment ? segments.findIndex(s => s.segmentId === segment.segmentId) : -1
  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < segments.length - 1
  
  const goToPrev = () => {
    if (canGoPrev && onSegmentChange) {
      onSegmentChange(segments[currentIndex - 1].segmentId)
    }
  }
  
  const goToNext = () => {
    if (canGoNext && onSegmentChange) {
      onSegmentChange(segments[currentIndex + 1].segmentId)
    }
  }
  
  // Get audio clips from audioTracks prop
  const currentAudioClips = useMemo(() => {
    const clips: Array<{ type: string; clip: AudioTrackClip }> = []
    if (audioTracks?.voiceover?.url) clips.push({ type: 'voiceover', clip: audioTracks.voiceover })
    if (audioTracks?.dialogue?.length) audioTracks.dialogue.forEach(d => d.url && clips.push({ type: 'dialogue', clip: d }))
    if (audioTracks?.music?.url) clips.push({ type: 'music', clip: audioTracks.music })
    if (audioTracks?.sfx?.length) audioTracks.sfx.forEach(s => s.url && clips.push({ type: 'sfx', clip: s }))
    return clips
  }, [audioTracks])

  if (!segment) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Select a segment from the timeline to review prompts, references, and takes.
      </div>
    )
  }

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await onUploadMedia(file)
    }
  }

  // Open Video Prompt Builder
  const handleOpenVideoBuilder = () => {
    setPromptBuilderMode('video')
    setIsPromptBuilderOpen(true)
  }

  // Open Image Prompt Builder
  const handleOpenImageBuilder = () => {
    setPromptBuilderMode('image')
    setIsPromptBuilderOpen(true)
  }
  
  // Handle generation from the new SegmentPromptBuilder
  const handlePromptBuilderGenerate = async (promptData: GeneratePromptData) => {
    // Determine generation type based on mode and method
    let genType: GenerationType = 'T2V'
    if (promptData.mode === 'image') {
      genType = 'T2I'
    } else if (promptData.startFrameUrl) {
      genType = 'I2V'
    }
    
    await onGenerate(genType, {
      prompt: promptData.prompt,
      negativePrompt: promptData.negativePrompt,
      duration: promptData.duration,
      aspectRatio: promptData.aspectRatio,
      resolution: promptData.resolution,
      startFrameUrl: promptData.startFrameUrl,
      endFrameUrl: promptData.endFrameUrl,
      referenceImages: promptData.referenceImages,
      generationMethod: promptData.generationMethod,
      // For EXT mode: pass source video URL so Veo can extend directly (no FFmpeg needed)
      sourceVideoUrl: promptData.videoReferenceUrl,
    })
  }

  const displayStatus = (status: SceneSegmentStatus) => {
    switch (status) {
      case 'GENERATING':
        return 'Generating asset…'
      case 'COMPLETE':
        return 'Segment locked'
      case 'UPLOADED':
        return 'Custom media uploaded'
      case 'ERROR':
        return 'Needs attention'
      default:
        return 'In progress'
    }
  }

  const getStatusColor = (status: SceneSegmentStatus) => {
    switch (status) {
      case 'GENERATING':
        return 'text-blue-600 dark:text-blue-400'
      case 'COMPLETE':
        return 'text-green-600 dark:text-green-400'
      case 'UPLOADED':
        return 'text-purple-600 dark:text-purple-400'
      case 'ERROR':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="h-full flex flex-col rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
      {/* Panel Header with Segment Navigation */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrev}
              disabled={!canGoPrev}
              className={cn(
                "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                !canGoPrev && "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 min-w-[80px] text-center">
              Seg {segment.sequenceIndex + 1}/{segments.length}
            </span>
            <button
              onClick={goToNext}
              disabled={!canGoNext}
              className={cn(
                "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                !canGoNext && "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {segment.generationMethod && (
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded",
              segment.generationMethod === 'I2V' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
              segment.generationMethod === 'EXT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            )}>
              {segment.generationMethod}
            </span>
          )}
        </div>
        <p className={cn("text-[10px] text-center mt-0.5", getStatusColor(segment.status))}>
          {displayStatus(segment.status)} · {(segment.endTime - segment.startTime).toFixed(1)}s
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Generation Status Banner */}
        {segment.status === 'GENERATING' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
              <span className="text-xs text-blue-900 dark:text-blue-100">Generating...</span>
            </div>
          </div>
        )}

        {/* Timing Settings Panel */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Timing</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* Order (Read-only) */}
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">#</span>
              <div className="flex items-center h-7 px-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                {segment.sequenceIndex + 1}
              </div>
            </div>
            {/* Start Time (Read-only) */}
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Start</span>
              <div className="flex items-center h-7 px-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                {segment.startTime.toFixed(1)}s
              </div>
            </div>
            {/* Duration (Editable) */}
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Duration</span>
              <Input
                type="number"
                min={0.5}
                max={8}
                step={0.5}
                defaultValue={(segment.endTime - segment.startTime).toFixed(1)}
                key={`duration-${segment.id}-${segment.endTime - segment.startTime}`}
                onBlur={(e) => {
                  const newDuration = Math.min(8, Math.max(0.5, parseFloat(e.target.value) || 0.5))
                  if (newDuration !== (segment.endTime - segment.startTime)) {
                    onDurationChange?.(segment.id, newDuration)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const newDuration = Math.min(8, Math.max(0.5, parseFloat((e.target as HTMLInputElement).value) || 0.5))
                    if (newDuration !== (segment.endTime - segment.startTime)) {
                      onDurationChange?.(segment.id, newDuration)
                    }
                    (e.target as HTMLInputElement).blur()
                  }
                }}
                disabled={!onDurationChange}
                className="h-7 px-2 text-xs font-medium text-center bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>
          <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1.5 text-center">
            Max 8s per segment · Changing duration cascades to following segments
          </p>
        </div>

        {/* Generation Controls - Compact */}
        <div className="flex items-center gap-1.5">
          <Button
            onClick={handleOpenVideoBuilder}
            disabled={segment.status === 'GENERATING'}
            size="sm"
            className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1"
          >
            <Video className="w-3.5 h-3.5" />
            Video
          </Button>
          <Button
            onClick={handleOpenImageBuilder}
            disabled={segment.status === 'GENERATING'}
            size="sm"
            className="flex-1 h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Image
          </Button>
          <label className="flex-1">
            <input type="file" className="hidden" accept="video/*,image/*" onChange={handleUploadChange} />
            <span className={cn(
              "flex items-center justify-center gap-1 h-8 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors",
              segment.status === 'GENERATING' && 'opacity-50 cursor-not-allowed'
            )}>
              <Upload className="w-3.5 h-3.5" />
              Upload
            </span>
          </label>
        </div>

        {/* Add Establishing Shot Button - Only show when segment index is 0 and not already an establishing shot */}
        {segmentIndex === 0 && !segment.isEstablishingShot && onAddEstablishingShot && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Film className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                Add Establishing Shot
              </span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
              Add AI-generated video backdrop for narrated scene introductions.
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {([
                { value: 'single-shot' as const, label: '🎬 Single Shot', desc: 'One continuous video clip (loops if needed)' },
                { value: 'beat-matched' as const, label: '🎯 Beat Matched', desc: 'AI splits narration into visual beats' },
              ]).map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onAddEstablishingShot(option.value)}
                  className="w-full text-left p-2 rounded-lg border border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
                >
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Segment Preview */}
        {segment.activeAssetUrl && (segment.status === 'COMPLETE' || segment.status === 'UPLOADED') && (
          <div className="rounded overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
            <div className="relative aspect-video">
              {segment.assetType === 'video' ? (
                <video
                  ref={videoRef}
                  src={segment.activeAssetUrl}
                  className="w-full h-full object-contain"
                  controls
                />
              ) : (
                <img
                  src={segment.activeAssetUrl}
                  alt="Segment preview"
                  className="w-full h-full object-contain"
                />
              )}
              <div className="absolute top-1 right-1 flex gap-1">
                {/* Edit button - only for images */}
                {segment.assetType !== 'video' && onEditImage && (
                  <button
                    onClick={() => onEditImage(segment.activeAssetUrl!)}
                    className="p-1 bg-black/60 hover:bg-black/80 rounded text-white transition-colors"
                    title="Edit Image"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-1 bg-black/60 hover:bg-black/80 rounded text-white transition-colors"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Establishing Shot Style Selector - Only show for establishing shots */}
        {segment.isEstablishingShot && onEstablishingShotStyleChange && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Film className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                Establishing Shot Style
              </span>
              {segment.shotNumber && (
                <span className="text-[9px] bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">
                  Beat {segment.shotNumber}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {([
                { 
                  value: 'single-shot' as const, 
                  label: '🎬 Single Shot', 
                  desc: 'One continuous video clip',
                  keyframes: { direction: 'in' as const, zoomStart: 1.0, zoomEnd: 1.2 }
                },
                { 
                  value: 'beat-matched' as const, 
                  label: '🎯 Beat Matched', 
                  desc: 'AI-generated visual beat (current)',
                  keyframes: { direction: 'none' as const, zoomStart: 1.0, zoomEnd: 1.0 }
                },
              ]).map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onEstablishingShotStyleChange(option.value)
                    // Also update keyframe settings for preview
                    if (onKeyframeChange) {
                      onKeyframeChange({
                        ...keyframeSettings,
                        direction: option.keyframes.direction,
                        zoomStart: option.keyframes.zoomStart,
                        zoomEnd: option.keyframes.zoomEnd,
                        useAutoDetect: false,
                      })
                    }
                  }}
                  className={cn(
                    "w-full text-left p-2 rounded-lg border transition-all",
                    segment.establishingShotType === option.value
                      ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                  )}
                >
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{option.desc}</p>
                </button>
              ))}
            </div>
            {segment.emotionalBeat && (
              <div className="mt-2 p-2 bg-purple-100 dark:bg-purple-900/30 rounded text-[10px]">
                <span className="font-medium text-purple-700 dark:text-purple-300">Visual Focus:</span>{' '}
                <span className="text-purple-600 dark:text-purple-400">{segment.emotionalBeat}</span>
              </div>
            )}
          </div>
        )}

        {/* Segment Details - Readable Cards */}
        {(segment.triggerReason || segment.emotionalBeat || segment.cameraMovement) && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-200 tracking-wide">Details</div>
            <div className="grid grid-cols-2 gap-2">
              {segment.triggerReason && (
                <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg border border-amber-200 dark:border-amber-700">
                  <div className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300 mb-1">Cut</div>
                  <div className="text-sm font-medium text-amber-900 dark:text-amber-100 break-words">{segment.triggerReason}</div>
                </div>
              )}
              {segment.emotionalBeat && (
                <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="text-xs font-semibold uppercase text-purple-700 dark:text-purple-300 mb-1">Emotion</div>
                  <div className="text-sm font-medium text-purple-900 dark:text-purple-100 break-words">{segment.emotionalBeat}</div>
                </div>
              )}
              {segment.cameraMovement && (
                <div className="bg-slate-50 dark:bg-slate-900/30 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Camera</div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words">{segment.cameraMovement}</div>
                </div>
              )}
              {segment.endFrameDescription && (
                <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="text-xs font-semibold uppercase text-green-700 dark:text-green-300 mb-1">End Frame</div>
                  <div className="text-sm font-medium text-green-900 dark:text-green-100 break-words">{segment.endFrameDescription}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Segment Prompt */}
        {segment.prompt && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
            <div className="text-[9px] font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Prompt</div>
            <p className="text-[10px] text-gray-700 dark:text-gray-300 line-clamp-4">{segment.prompt}</p>
          </div>
        )}

        {/* Phase 2: Dialogue Coverage Panel */}
        {sceneDialogueLines.length > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                Dialogue Coverage
              </span>
              <span className="ml-auto text-[9px] text-emerald-600 dark:text-emerald-400">
                {segmentDialogueLines.filter(d => d.covered).length}/{sceneDialogueLines.length} covered
              </span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {sceneDialogueLines.map((dialogue) => {
                const isAssigned = segmentDialogueLines.some(d => d.id === dialogue.id)
                const isCovered = segmentDialogueLines.find(d => d.id === dialogue.id)?.covered ?? false
                
                // Character color based on name hash
                const charHash = dialogue.character.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
                const charColors = [
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                  'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
                  'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
                  'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
                ]
                const charColor = charColors[charHash % charColors.length]
                
                return (
                  <div 
                    key={dialogue.id}
                    onClick={() => onToggleDialogue?.(dialogue.id)}
                    className={cn(
                      "flex items-start gap-2 p-1.5 rounded cursor-pointer transition-all",
                      isAssigned 
                        ? "bg-emerald-100 dark:bg-emerald-800/40 ring-1 ring-emerald-300 dark:ring-emerald-700"
                        : "bg-white dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors",
                      isAssigned 
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-gray-300 dark:border-gray-600"
                    )}>
                      {isAssigned && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded", charColor)}>
                        {dialogue.character}
                      </span>
                      <p className="text-[10px] text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-2">
                        "{dialogue.line}"
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[9px] text-emerald-600 dark:text-emerald-500 mt-2 text-center">
              Click to assign dialogue to this segment
            </p>
          </div>
        )}

        {/* Phase 3: Keyframe Settings Panel */}
        {onKeyframeChange && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Move className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                Animation (Ken Burns)
              </span>
              {keyframeSettings.useAutoDetect ? (
                <span className="ml-auto text-[9px] text-indigo-500 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-800/50 px-1.5 py-0.5 rounded">
                  Auto
                </span>
              ) : (
                <button
                  onClick={resetToAutoDetect}
                  className="ml-auto text-[9px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-0.5"
                  title="Reset to auto-detect"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset
                </button>
              )}
            </div>

            {/* Direction Presets */}
            <div className="mb-2">
              <div className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 mb-1">Direction</div>
              <div className="grid grid-cols-5 gap-1">
                {(['none', 'left', 'right', 'up', 'down'] as KeyframePanDirection[]).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => updateKeyframe({ direction: dir })}
                    className={cn(
                      "text-[8px] py-1 px-1.5 rounded transition-colors capitalize",
                      keyframeSettings.direction === dir
                        ? "bg-indigo-500 text-white"
                        : "bg-indigo-100 dark:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800"
                    )}
                  >
                    {dir === 'none' ? 'Static' : dir}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {(['up-left', 'up-right', 'down-left', 'down-right'] as KeyframePanDirection[]).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => updateKeyframe({ direction: dir })}
                    className={cn(
                      "text-[8px] py-1 px-1 rounded transition-colors",
                      keyframeSettings.direction === dir
                        ? "bg-indigo-500 text-white"
                        : "bg-indigo-100 dark:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800"
                    )}
                  >
                    {dir.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="mb-2">
              <div className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                <ZoomIn className="w-3 h-3" />
                Zoom
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <div className="text-[8px] text-indigo-500 dark:text-indigo-400 mb-0.5">Start: {keyframeSettings.zoomStart.toFixed(1)}x</div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.05"
                    value={keyframeSettings.zoomStart}
                    onChange={(e) => updateKeyframe({ zoomStart: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-indigo-200 dark:bg-indigo-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[8px] text-indigo-500 dark:text-indigo-400 mb-0.5">End: {keyframeSettings.zoomEnd.toFixed(1)}x</div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.05"
                    value={keyframeSettings.zoomEnd}
                    onChange={(e) => updateKeyframe({ zoomEnd: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-indigo-200 dark:bg-indigo-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Easing */}
            <div className="mb-2">
              <div className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 mb-1">Easing</div>
              <div className="grid grid-cols-4 gap-1">
                {(['smooth', 'drift', 'push', 'dramatic'] as KeyframeEasingType[]).map((easing) => (
                  <button
                    key={easing}
                    onClick={() => updateKeyframe({ easingType: easing })}
                    className={cn(
                      "text-[8px] py-1 px-1.5 rounded transition-colors capitalize",
                      keyframeSettings.easingType === easing
                        ? "bg-indigo-500 text-white"
                        : "bg-indigo-100 dark:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800"
                    )}
                  >
                    {easing}
                  </button>
                ))}
              </div>
            </div>

            {/* Animation Preview */}
            <div className="pt-2 border-t border-indigo-200 dark:border-indigo-800">
              {showAnimationPreview ? (
                <SegmentAnimationPreview
                  imageUrl={segment.activeAssetUrl || sceneImageUrl || ''}
                  duration={segment.endTime - segment.startTime}
                  keyframeSettings={keyframeSettings}
                  onClose={() => setShowAnimationPreview(false)}
                />
              ) : (
                <button
                  onClick={() => setShowAnimationPreview(true)}
                  disabled={!segment.activeAssetUrl && !sceneImageUrl}
                  className={cn(
                    "w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors",
                    segment.activeAssetUrl || sceneImageUrl
                      ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                      : "bg-indigo-200 dark:bg-indigo-800/30 text-indigo-400 cursor-not-allowed"
                  )}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Preview Animation</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Takes Gallery */}
        {segment.takes.length > 0 && (
          <div>
            <div className="text-[9px] font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
              Takes ({segment.takes.length})
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {segment.takes.map((take) => (
                <div
                  key={take.id}
                  className={cn(
                    'cursor-pointer rounded overflow-hidden border-2 transition-all hover:border-primary',
                    take.assetUrl === segment.activeAssetUrl
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-transparent'
                  )}
                  onClick={() => take.assetUrl && setPlayingVideoUrl(take.assetUrl)}
                >
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative group">
                    {take.thumbnailUrl ? (
                      <img src={take.thumbnailUrl} alt="Take" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                    {take.assetUrl === segment.activeAssetUrl && (
                      <CheckCircle2 className="absolute top-0.5 right-0.5 w-3 h-3 text-green-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Take Player Dialog */}
      <Dialog open={playingVideoUrl !== null} onOpenChange={(open) => !open && setPlayingVideoUrl(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 bg-black overflow-hidden">
          <button
            onClick={() => setPlayingVideoUrl(null)}
            className="absolute top-2 right-2 z-10 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white"
          >
            <X className="w-4 h-4" />
          </button>
          {playingVideoUrl && (
            <video src={playingVideoUrl} controls autoPlay className="w-full aspect-video" />
          )}
          {/* Use This Take Button */}
          {playingVideoUrl && onSelectTake && playingVideoUrl !== segment.activeAssetUrl && (
            <div className="px-3 py-2 bg-gray-900/80 border-t border-gray-800">
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  const selectedTake = segment.takes.find(t => t.assetUrl === playingVideoUrl)
                  if (selectedTake && selectedTake.assetUrl) {
                    onSelectTake(selectedTake.id, selectedTake.assetUrl)
                    setPlayingVideoUrl(null)
                  }
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Use This Take
              </Button>
            </div>
          )}
          {playingVideoUrl && playingVideoUrl === segment.activeAssetUrl && (
            <div className="px-3 py-2 bg-gray-900/80 border-t border-gray-800">
              <div className="flex items-center justify-center text-green-400 text-sm">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Currently Active Take
              </div>
            </div>
          )}
          {segment.takes.length > 1 && (
            <div className="p-2 bg-gray-900 border-t border-gray-800">
              <div className="flex gap-1.5 overflow-x-auto">
                {segment.takes.map((take) => (
                  <div
                    key={take.id}
                    className={cn(
                      'flex-shrink-0 w-16 cursor-pointer rounded overflow-hidden border-2',
                      playingVideoUrl === take.assetUrl ? 'border-white' : 'border-transparent hover:border-gray-600'
                    )}
                    onClick={() => take.assetUrl && setPlayingVideoUrl(take.assetUrl)}
                  >
                    <div className="aspect-video bg-gray-800">
                      {take.thumbnailUrl ? (
                        <img src={take.thumbnailUrl} alt="Take" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-3 h-3 text-gray-500" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Preview Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 bg-black">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-3 right-3 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white"
          >
            <X className="w-5 h-5" />
          </button>
          {segment.activeAssetUrl && (
            segment.assetType === 'video' ? (
              <video src={segment.activeAssetUrl} controls autoPlay className="w-full h-full max-h-[85vh] object-contain" />
            ) : (
              <img src={segment.activeAssetUrl} alt="Fullscreen" className="w-full h-full max-h-[85vh] object-contain" />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Segment Prompt Builder */}
      {segment && (
        <SegmentPromptBuilder
          open={isPromptBuilderOpen}
          onClose={() => setIsPromptBuilderOpen(false)}
          segment={segment}
          mode={promptBuilderMode}
          availableCharacters={references.characters}
          sceneImageUrl={sceneImageUrl}
          previousSegmentLastFrame={previousSegmentLastFrame}
          onGenerate={handlePromptBuilderGenerate}
          isGenerating={segment.status === 'GENERATING'}
          allSegments={segments}
          sceneReferences={references.sceneReferences}
          objectReferences={references.objectReferences}
        />
      )}

      {/* Hidden Audio Elements */}
      {currentAudioClips.map(({ clip }) => clip.url && (
        <audio
          key={clip.id}
          ref={(el) => el ? audioRefs.current.set(clip.id, el) : audioRefs.current.delete(clip.id)}
          src={clip.url}
          preload="auto"
        />
      ))}
    </div>
  )
}
