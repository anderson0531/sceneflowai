'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SceneSegment, SceneProductionReferences, SceneSegmentStatus, SegmentKeyframeSettings, KeyframeEasingType, KeyframePanDirection } from './types'
import { Upload, Video, Image as ImageIcon, CheckCircle2, Loader2, Film, Play, X, ChevronLeft, ChevronRight, Maximize2, Clock, Timer, MessageSquare, User, Check, Move, ZoomIn, ZoomOut, RotateCcw, Pencil, Layers, Info, Clapperboard, Camera, Sparkles, Users, FileText, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentPromptBuilder, GeneratePromptData, VideoGenerationMethod } from './SegmentPromptBuilder'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AudioTrackClip, AudioTracksData } from './SceneTimeline'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BackdropVideoModal, SceneForBackdrop, CharacterForBackdrop } from '@/components/vision/BackdropVideoModal'
import { BackdropMode } from '@/lib/vision/backdropGenerator'

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
    sourceVideoUrl?: string
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
  // Phase 3: Keyframe settings (kept for legacy/export compatibility, UI removed)
  onKeyframeChange?: (settings: SegmentKeyframeSettings) => void
  // Image editing (reuses same modal as Frame step)
  onEditImage?: (imageUrl: string) => void
  // Generate Backdrop Video handler (replaces Add Establishing Shot)
  onGenerateBackdrop?: () => void
  // Establishing Shot handlers (legacy - kept for existing establishing shots)
  onAddEstablishingShot?: (style: 'single-shot' | 'beat-matched' | 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => void
  onEstablishingShotStyleChange?: (style: 'single-shot' | 'beat-matched' | 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => void
  // Take selection - allows user to choose which take to use as active asset
  onSelectTake?: (takeId: string, takeAssetUrl: string) => void
  // Take deletion - allows user to delete a take
  onDeleteTake?: (takeId: string) => void
  // Scene direction text for backdrop generation
  sceneDirection?: string
  // Scene data for backdrop prompt building
  sceneHeading?: string
  sceneDescription?: string
  sceneNarration?: string
  // Backdrop Video Modal data
  sceneForBackdrop?: SceneForBackdrop
  charactersForBackdrop?: CharacterForBackdrop[]
  // Callback when backdrop video is generated - inserts segment before current
  onBackdropVideoGenerated?: (result: {
    videoUrl: string
    prompt: string
    backdropMode: BackdropMode
    duration: number
  }) => void
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
  onGenerateBackdrop,
  onAddEstablishingShot,
  onEstablishingShotStyleChange,
  onSelectTake,
  onDeleteTake,
  sceneDirection,
  sceneHeading,
  sceneDescription,
  sceneNarration,
  sceneForBackdrop,
  charactersForBackdrop = [],
  onBackdropVideoGenerated,
}: SegmentStudioProps) {
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('generate')
  
  // Prompt Builder State
  const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false)
  const [promptBuilderMode, setPromptBuilderMode] = useState<'image' | 'video'>('video')
  const [isBackdropMode, setIsBackdropMode] = useState(false)
  
  // Backdrop Video Modal State
  const [isBackdropVideoModalOpen, setIsBackdropVideoModalOpen] = useState(false)
  
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
    setIsBackdropMode(false)
    setIsPromptBuilderOpen(true)
  }

  // Open Image Prompt Builder
  const handleOpenImageBuilder = () => {
    setPromptBuilderMode('image')
    setIsBackdropMode(false)
    setIsPromptBuilderOpen(true)
  }
  
  // Open Backdrop Video Prompt Builder (new)
  const handleOpenBackdropBuilder = () => {
    setPromptBuilderMode('video')
    setIsBackdropMode(true)
    setIsPromptBuilderOpen(true)
  }
  
  // Handle generation from the SegmentPromptBuilder
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
      // For EXT mode: pass source video URL so Veo can extend directly
      sourceVideoUrl: promptData.videoReferenceUrl,
    })
  }

  const displayStatus = (status: SceneSegmentStatus) => {
    switch (status) {
      case 'GENERATING':
        return 'Generating...'
      case 'COMPLETE':
        return 'Ready'
      case 'UPLOADED':
        return 'Uploaded'
      case 'ERROR':
        return 'Error'
      default:
        return 'Draft'
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
  
  const getStatusBadgeClasses = (status: SceneSegmentStatus) => {
    switch (status) {
      case 'GENERATING':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
      case 'COMPLETE':
        return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
      case 'UPLOADED':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
      case 'ERROR':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }
  
  // Format time as mm:ss.s
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(1)
    return mins > 0 ? `${mins}:${secs.padStart(4, '0')}` : `${secs}s`
  }

  // Count dialogue assigned to this segment
  const assignedDialogueCount = segmentDialogueLines.filter(d => d.covered).length
  
  // Get characters in this segment from dialogue
  const segmentCharacters = useMemo(() => {
    const chars = new Set<string>()
    segmentDialogueLines.forEach(d => {
      if (d.covered) chars.add(d.character)
    })
    return Array.from(chars)
  }, [segmentDialogueLines])

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
          <div className="flex items-center gap-1.5">
            {segment.generationMethod && (
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded",
                segment.generationMethod === 'I2V' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                segment.generationMethod === 'EXT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                segment.generationMethod === 'FTV' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              )}>
                {segment.generationMethod}
              </span>
            )}
            <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded", getStatusBadgeClasses(segment.status))}>
              {displayStatus(segment.status)}
            </span>
          </div>
        </div>
        {/* Compact timing info in header */}
        <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
          <span>{formatTime(segment.startTime)} – {formatTime(segment.endTime)}</span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="font-medium">{(segment.endTime - segment.startTime).toFixed(1)}s</span>
        </div>
      </div>

      {/* Preview Section - Always Visible */}
      {segment.activeAssetUrl && (segment.status === 'COMPLETE' || segment.status === 'UPLOADED') && (
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
          <div className="relative aspect-video bg-black">
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
      
      {/* Generation Status Banner - Below Preview */}
      {segment.status === 'GENERATING' && (
        <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-2">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Generating video...</span>
          </div>
        </div>
      )}

      {/* Tabbed Content Area */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        {/* Large Icon-Only Tab Controls */}
        <div className="flex-shrink-0 flex items-center justify-center gap-3 px-3 py-3 border-b border-gray-200 dark:border-gray-800">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab('generate')}
                  className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-200",
                    activeTab === 'generate'
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400"
                  )}
                >
                  <Sparkles className="w-7 h-7" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
                <p className="font-medium">Generate</p>
                <p className="text-xs text-gray-400">Create video or image</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab('details')}
                  className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-200",
                    activeTab === 'details'
                      ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400"
                  )}
                >
                  <Info className="w-7 h-7" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
                <p className="font-medium">Details</p>
                <p className="text-xs text-gray-400">Timing & shot info</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab('takes')}
                  className={cn(
                    "relative flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-200",
                    activeTab === 'takes'
                      ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-105"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400"
                  )}
                >
                  <Layers className="w-7 h-7" />
                  {segment.takes.length > 0 && (
                    <span className={cn(
                      "absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center text-[10px] font-bold rounded-full px-1",
                      activeTab === 'takes'
                        ? "bg-white text-amber-600"
                        : "bg-amber-500 text-white"
                    )}>
                      {segment.takes.length}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
                <p className="font-medium">Takes</p>
                <p className="text-xs text-gray-400">{segment.takes.length} generated version{segment.takes.length !== 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Hidden TabsList for Tabs component state management */}
        <TabsList className="hidden">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="takes">Takes</TabsTrigger>
        </TabsList>
        
        {/* Generate Tab */}
        <TabsContent value="generate" className="flex-1 overflow-y-auto p-3 space-y-3 m-0">
          {/* Generation Controls */}
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
              Generate Asset
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                onClick={handleOpenVideoBuilder}
                disabled={segment.status === 'GENERATING'}
                size="sm"
                className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
              >
                <Video className="w-4 h-4" />
                Video
              </Button>
              <Button
                onClick={handleOpenImageBuilder}
                disabled={segment.status === 'GENERATING'}
                size="sm"
                className="flex-1 h-9 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
              >
                <ImageIcon className="w-4 h-4" />
                Image
              </Button>
              <label className="flex-1">
                <input type="file" className="hidden" accept="video/*,image/*" onChange={handleUploadChange} />
                <span className={cn(
                  "flex items-center justify-center gap-1.5 h-9 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors",
                  segment.status === 'GENERATING' && 'opacity-50 cursor-not-allowed'
                )}>
                  <Upload className="w-4 h-4" />
                  Upload
                </span>
              </label>
            </div>
          </div>

          {/* Generate Backdrop Video - Show for all segments, inserts before current segment */}
          {sceneForBackdrop && onBackdropVideoGenerated && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-indigo-500 rounded">
                  <Film className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">
                    Generate Backdrop Video
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">
                    Inserts before segment #{segmentIndex + 1}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-2.5">
                Create an atmospheric video backdrop using Veo 3.1. Choose from 4 modes: 
                Atmospheric B-Roll, Silent Portrait, Establishing Master, or Storybeat Animatic.
              </p>
              <Button
                onClick={() => setIsBackdropVideoModalOpen(true)}
                disabled={segment.status === 'GENERATING'}
                size="sm"
                className="w-full h-9 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs gap-2"
              >
                <Clapperboard className="w-4 h-4" />
                Generate Backdrop Video
              </Button>
            </div>
          )}

          {/* Segment Prompt Preview */}
          {(segment.generatedPrompt || segment.userEditedPrompt) && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Current Prompt</span>
              </div>
              <p className="text-[11px] text-gray-700 dark:text-gray-300 line-clamp-4 leading-relaxed">
                {segment.userEditedPrompt || segment.generatedPrompt}
              </p>
            </div>
          )}
        </TabsContent>
        
        {/* Details Tab */}
        <TabsContent value="details" className="flex-1 overflow-y-auto p-3 space-y-3 m-0">
          {/* Timing Settings */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Timing</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Position</span>
                <div className="flex items-center h-8 px-2.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium text-gray-700 dark:text-gray-300">
                  #{segment.sequenceIndex + 1}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Start</span>
                <div className="flex items-center h-8 px-2.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatTime(segment.startTime)}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Duration</span>
                <div className="flex items-center h-8 px-2.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium text-gray-700 dark:text-gray-300">
                  {(segment.endTime - segment.startTime).toFixed(1)}s
                </div>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-2 text-center">
              Max 8s per segment • Duration changes cascade to following segments
            </p>
          </div>

          {/* Shot Metadata Cards */}
          {(segment.triggerReason || segment.emotionalBeat || segment.cameraMovement || segment.endFrameDescription || segment.shotType) && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Shot Details</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {segment.shotType && (
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-0.5">Shot Type</div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">{segment.shotType}</div>
                  </div>
                )}
                {segment.triggerReason && (
                  <div className="bg-amber-50 dark:bg-amber-900/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-700">
                    <div className="text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400 mb-0.5">Cut Reason</div>
                    <div className="text-sm font-medium text-amber-900 dark:text-amber-100">{segment.triggerReason}</div>
                  </div>
                )}
                {segment.emotionalBeat && (
                  <div className="bg-purple-50 dark:bg-purple-900/30 p-2.5 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="text-[10px] font-semibold uppercase text-purple-600 dark:text-purple-400 mb-0.5">Emotion</div>
                    <div className="text-sm font-medium text-purple-900 dark:text-purple-100">{segment.emotionalBeat}</div>
                  </div>
                )}
                {segment.cameraMovement && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400 mb-0.5">Camera</div>
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100">{segment.cameraMovement}</div>
                  </div>
                )}
                {segment.endFrameDescription && (
                  <div className="col-span-2 bg-green-50 dark:bg-green-900/30 p-2.5 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="text-[10px] font-semibold uppercase text-green-600 dark:text-green-400 mb-0.5">End Frame</div>
                    <div className="text-sm font-medium text-green-900 dark:text-green-100">{segment.endFrameDescription}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Characters in Segment */}
          {segmentCharacters.length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Characters</span>
                <span className="ml-auto text-[10px] text-indigo-600 dark:text-indigo-400">
                  {segmentCharacters.length} in segment
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {segmentCharacters.map((char) => (
                  <span
                    key={char}
                    className="text-xs font-medium px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300"
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dialogue Coverage */}
          {sceneDialogueLines.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Dialogue</span>
                <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400">
                  {assignedDialogueCount}/{sceneDialogueLines.length} assigned
                </span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {sceneDialogueLines.map((dialogue) => {
                  const isAssigned = segmentDialogueLines.some(d => d.id === dialogue.id && d.covered)
                  
                  return (
                    <div 
                      key={dialogue.id}
                      onClick={() => onToggleDialogue?.(dialogue.id)}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded cursor-pointer transition-all",
                        isAssigned 
                          ? "bg-emerald-100 dark:bg-emerald-800/40 ring-1 ring-emerald-300 dark:ring-emerald-700"
                          : "bg-white dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border mt-0.5",
                        isAssigned 
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-gray-300 dark:border-gray-600"
                      )}>
                        {isAssigned && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          {dialogue.character}
                        </span>
                        <p className="text-[11px] text-gray-700 dark:text-gray-300 line-clamp-2">
                          "{dialogue.line}"
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Establishing Shot Info (if applicable) */}
          {segment.isEstablishingShot && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Film className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Establishing Shot</span>
                {segment.shotNumber && (
                  <span className="text-[10px] bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">
                    Beat {segment.shotNumber}
                  </span>
                )}
              </div>
              <div className="text-sm text-purple-900 dark:text-purple-100 capitalize">
                {segment.establishingShotType?.replace('-', ' ') || 'Single Shot'}
              </div>
              {segment.emotionalBeat && (
                <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1.5">
                  Visual focus: {segment.emotionalBeat}
                </p>
              )}
            </div>
          )}
        </TabsContent>
        
        {/* Takes Tab */}
        <TabsContent value="takes" className="flex-1 overflow-y-auto p-3 m-0">
          {segment.takes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Layers className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No takes yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Generate a video or image to create your first take
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {segment.takes.length} Take{segment.takes.length !== 1 ? 's' : ''}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  Click to preview • Select best take
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {segment.takes.map((take, idx) => {
                  const isActive = take.assetUrl === segment.activeAssetUrl
                  return (
                  <div
                    key={take.id}
                    className={cn(
                      'rounded-lg overflow-hidden border-2 transition-all relative group',
                      isActive
                        ? 'border-green-500 ring-2 ring-green-500/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                    )}
                  >
                    {/* Clickable thumbnail area */}
                    <div 
                      className="aspect-video bg-gray-100 dark:bg-gray-800 relative cursor-pointer"
                      onClick={() => take.assetUrl && setPlayingVideoUrl(take.assetUrl)}
                    >
                      {take.thumbnailUrl ? (
                        <img src={take.thumbnailUrl} alt={`Take ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                      {isActive && (
                        <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                        Take {idx + 1}
                      </div>
                    </div>
                    
                    {/* Action buttons row */}
                    <div className="flex items-center justify-between px-1.5 py-1 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                      {/* Select button */}
                      {onSelectTake && !isActive && take.assetUrl ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectTake(take.id, take.assetUrl!)
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded transition-colors"
                          title="Use this take in timeline"
                        >
                          <Check className="w-3 h-3" />
                          Select
                        </button>
                      ) : isActive ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span />
                      )}
                      
                      {/* Delete button */}
                      {onDeleteTake && !isActive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Delete Take ${idx + 1}? This cannot be undone.`)) {
                              onDeleteTake(take.id)
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Delete this take"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

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
          onClose={() => {
            setIsPromptBuilderOpen(false)
            setIsBackdropMode(false)
          }}
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
          // Pass backdrop context when in backdrop mode
          isBackdropMode={isBackdropMode}
          sceneHeading={sceneHeading}
          sceneDescription={sceneDescription}
          sceneNarration={sceneNarration}
        />
      )}

      {/* Backdrop Video Modal */}
      {sceneForBackdrop && onBackdropVideoGenerated && (
        <BackdropVideoModal
          open={isBackdropVideoModalOpen}
          onClose={() => setIsBackdropVideoModalOpen(false)}
          scene={sceneForBackdrop}
          characters={charactersForBackdrop}
          onGenerated={onBackdropVideoGenerated}
          currentSegmentIndex={segmentIndex}
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
