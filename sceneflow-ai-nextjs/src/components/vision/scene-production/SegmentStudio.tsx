'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { SceneSegment, SceneProductionReferences, SceneSegmentStatus } from './types'
import { Upload, Video, Image as ImageIcon, CheckCircle2, Loader2, Film, Play, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentPromptBuilder, GeneratePromptData, VideoGenerationMethod } from './SegmentPromptBuilder'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AudioTrackClip, AudioTracksData } from './SceneTimeline'

export type GenerationType = 'T2V' | 'I2V' | 'T2I' | 'UPLOAD'

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
  references: SceneProductionReferences
  sceneImageUrl?: string
  audioTracks?: AudioTracksData
}

export function SegmentStudio({
  segment,
  segments = [],
  onSegmentChange,
  previousSegmentLastFrame,
  onGenerate,
  onUploadMedia,
  onPromptChange,
  references,
  sceneImageUrl,
  audioTracks,
}: SegmentStudioProps) {
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Prompt Builder State
  const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false)
  const [promptBuilderMode, setPromptBuilderMode] = useState<'image' | 'video'>('video')
  
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
              <button
                onClick={() => setIsFullscreen(true)}
                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded text-white transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Segment Details - Compact Cards */}
        {(segment.triggerReason || segment.emotionalBeat || segment.cameraMovement) && (
          <div className="space-y-1.5">
            <div className="text-[9px] font-semibold uppercase text-gray-500 dark:text-gray-400">Details</div>
            <div className="grid grid-cols-2 gap-1.5">
              {segment.triggerReason && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-1.5 rounded border border-amber-200 dark:border-amber-800">
                  <div className="text-[8px] font-semibold uppercase text-amber-600 dark:text-amber-400">Cut</div>
                  <div className="text-[10px] text-amber-900 dark:text-amber-100 truncate">{segment.triggerReason}</div>
                </div>
              )}
              {segment.emotionalBeat && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-1.5 rounded border border-purple-200 dark:border-purple-800">
                  <div className="text-[8px] font-semibold uppercase text-purple-600 dark:text-purple-400">Emotion</div>
                  <div className="text-[10px] text-purple-900 dark:text-purple-100 truncate">{segment.emotionalBeat}</div>
                </div>
              )}
              {segment.cameraMovement && (
                <div className="bg-slate-50 dark:bg-slate-900/20 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                  <div className="text-[8px] font-semibold uppercase text-slate-600 dark:text-slate-400">Camera</div>
                  <div className="text-[10px] text-slate-900 dark:text-slate-100 truncate">{segment.cameraMovement}</div>
                </div>
              )}
              {segment.endFrameDescription && (
                <div className="bg-green-50 dark:bg-green-900/20 p-1.5 rounded border border-green-200 dark:border-green-800">
                  <div className="text-[8px] font-semibold uppercase text-green-600 dark:text-green-400">End Frame</div>
                  <div className="text-[10px] text-green-900 dark:text-green-100 truncate">{segment.endFrameDescription}</div>
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
