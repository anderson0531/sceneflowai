'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { SceneSegment, SceneProductionReferences, SceneSegmentStatus } from './types'
import { Upload, Video, Image as ImageIcon, CheckCircle2, Sparkles, Loader2, Film, Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentPromptBuilder, GeneratePromptData, VideoGenerationMethod } from './SegmentPromptBuilder'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AudioTrackClip, AudioTracksData } from './SceneTimeline'

export type GenerationType = 'T2V' | 'I2V' | 'T2I' | 'UPLOAD'

interface SegmentPromptSummary {
  promptText: string
  platform?: string
  promptType?: GenerationType
  characterNames?: string[]
  sceneRefNames?: string[]
  objectNames?: string[]
}

interface SegmentStudioProps {
  segment: SceneSegment | null
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
  estimatedCredits?: number | null
  promptSummary?: SegmentPromptSummary | null
  onOpenPromptBuilder?: () => void
  onOpenScenePreview?: () => void
  sceneImageUrl?: string
  // Audio props for concurrent playback
  audioTracks?: AudioTracksData
}

export function SegmentStudio({
  segment,
  previousSegmentLastFrame,
  onGenerate,
  onUploadMedia,
  onPromptChange,
  references,
  estimatedCredits,
  promptSummary,
  onOpenPromptBuilder,
  onOpenScenePreview,
  sceneImageUrl,
  audioTracks,
}: SegmentStudioProps) {
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null)
  
  // Prompt Builder State
  const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false)
  const [promptBuilderMode, setPromptBuilderMode] = useState<'image' | 'video'>('video')
  
  // Audio playback state for segment preview
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  
  // Get audio clips from audioTracks prop for segment preview
  const currentAudioClips = useMemo(() => {
    const clips: Array<{ type: string; clip: AudioTrackClip }> = []
    
    if (audioTracks?.voiceover?.url) {
      clips.push({ type: 'voiceover', clip: audioTracks.voiceover })
    }
    
    if (audioTracks?.dialogue?.length) {
      audioTracks.dialogue.forEach(d => d.url && clips.push({ type: 'dialogue', clip: d }))
    }
    
    if (audioTracks?.music?.url) {
      clips.push({ type: 'music', clip: audioTracks.music })
    }
    
    if (audioTracks?.sfx?.length) {
      audioTracks.sfx.forEach(s => s.url && clips.push({ type: 'sfx', clip: s }))
    }
    
    return clips
  }, [audioTracks])
  
  // Sync audio with video playback
  const handleVideoPlay = () => {
    setIsPlaying(true)
    currentAudioClips.forEach(({ clip }) => {
      if (clip.url) {
        const audio = audioRefs.current.get(clip.id)
        if (audio && videoRef.current) {
          audio.currentTime = videoRef.current.currentTime
          audio.play().catch(() => {})
        }
      }
    })
  }
  
  const handleVideoPause = () => {
    setIsPlaying(false)
    audioRefs.current.forEach(audio => audio.pause())
  }
  
  const handleVideoSeeked = () => {
    if (videoRef.current) {
      currentAudioClips.forEach(({ clip }) => {
        const audio = audioRefs.current.get(clip.id)
        if (audio) {
          audio.currentTime = videoRef.current!.currentTime
        }
      })
    }
  }

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
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 space-y-4">
      {/* Segment Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Segment {segment.sequenceIndex + 1}
          </h4>
          {segment.generationMethod && (
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded",
              segment.generationMethod === 'I2V' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
              segment.generationMethod === 'EXT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
              segment.generationMethod === 'FTV' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            )}>
              {segment.generationMethod}
            </span>
          )}
        </div>
        <p className={cn("text-xs font-medium", getStatusColor(segment.status))}>
          {displayStatus(segment.status)} · {(segment.endTime - segment.startTime).toFixed(1)}s
        </p>
      </div>

      {/* Generation Status Banner */}
      {segment.status === 'GENERATING' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
            <span className="text-sm text-blue-900 dark:text-blue-100">
              Generating segment...
            </span>
          </div>
        </div>
      )}

      {/* Generation Controls - At Top */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={handleOpenVideoBuilder}
          disabled={segment.status === 'GENERATING'}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
        >
          {segment.status === 'GENERATING' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Video className="w-3.5 h-3.5" />
          )}
          Video
        </Button>
        
        <Button
          onClick={handleOpenImageBuilder}
          disabled={segment.status === 'GENERATING'}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Image
        </Button>
        
        <label className="inline-flex cursor-pointer">
          <input type="file" className="hidden" accept="video/*,image/*" onChange={handleUploadChange} />
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${segment.status === 'GENERATING' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </span>
        </label>
      </div>

      {/* Inline Segment Details */}
      <div className="space-y-3">
        {/* Veo 3.1 Generation Metadata */}
        {(segment.generationMethod || segment.triggerReason || segment.emotionalBeat || segment.cameraMovement) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {segment.triggerReason && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                <div className="text-[9px] font-semibold uppercase text-amber-600 dark:text-amber-400">Cut Trigger</div>
                <div className="text-xs text-amber-900 dark:text-amber-100 truncate">{segment.triggerReason}</div>
              </div>
            )}
            {segment.emotionalBeat && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded border border-purple-200 dark:border-purple-800">
                <div className="text-[9px] font-semibold uppercase text-purple-600 dark:text-purple-400">Emotional Beat</div>
                <div className="text-xs text-purple-900 dark:text-purple-100 truncate">{segment.emotionalBeat}</div>
              </div>
            )}
            {segment.cameraMovement && (
              <div className="bg-slate-50 dark:bg-slate-900/20 p-2 rounded border border-slate-200 dark:border-slate-800">
                <div className="text-[9px] font-semibold uppercase text-slate-600 dark:text-slate-400">Camera</div>
                <div className="text-xs text-slate-900 dark:text-slate-100 truncate">{segment.cameraMovement}</div>
              </div>
            )}
            {segment.endFrameDescription && (
              <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                <div className="text-[9px] font-semibold uppercase text-green-600 dark:text-green-400">End Frame</div>
                <div className="text-xs text-green-900 dark:text-green-100 truncate">{segment.endFrameDescription}</div>
              </div>
            )}
          </div>
        )}

        {/* Segment Description */}
        {(promptSummary?.promptText || segment.prompt) && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Segment Description</div>
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
              {promptSummary?.promptText || segment.prompt || 'No description available'}
            </p>
          </div>
        )}
      </div>

      {/* Takes Gallery - Inline */}
      {segment.takes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Takes ({segment.takes.length})</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {segment.takes.map((take) => (
              <div
                key={take.id}
                className={cn(
                  'flex-shrink-0 w-24 cursor-pointer rounded-md overflow-hidden border-2 transition-all hover:border-primary',
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
                      <Video className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  {take.assetUrl === segment.activeAssetUrl && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden Audio Elements for concurrent playback */}
      {currentAudioClips.map(({ clip }) => (
        clip.url && (
          <audio
            key={clip.id}
            ref={(el) => {
              if (el) audioRefs.current.set(clip.id, el)
              else audioRefs.current.delete(clip.id)
            }}
            src={clip.url}
            preload="auto"
          />
        )
      ))}

      {/* Takes Gallery Dialog - Opens when clicking a take */}
      <Dialog open={playingVideoUrl !== null} onOpenChange={(open) => {
        if (!open) setPlayingVideoUrl(null)
      }}>
        <DialogContent className="sm:max-w-[800px] p-0 bg-black overflow-hidden">
          <button
            onClick={() => setPlayingVideoUrl(null)}
            className="absolute top-3 right-3 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          {playingVideoUrl && (
            <video
              src={playingVideoUrl}
              controls
              autoPlay
              className="w-full aspect-video"
            />
          )}
          
          {/* Other takes thumbnails */}
          {segment.takes.length > 1 && (
            <div className="p-3 bg-gray-900 border-t border-gray-800">
              <div className="flex gap-2 overflow-x-auto">
                {segment.takes.map((take) => (
                  <div
                    key={take.id}
                    className={cn(
                      'flex-shrink-0 w-20 cursor-pointer rounded overflow-hidden border-2 transition-all',
                      playingVideoUrl === take.assetUrl
                        ? 'border-white'
                        : 'border-transparent hover:border-gray-600'
                    )}
                    onClick={() => take.assetUrl && setPlayingVideoUrl(take.assetUrl)}
                  >
                    <div className="aspect-video bg-gray-800 relative">
                      {take.thumbnailUrl ? (
                        <img src={take.thumbnailUrl} alt="Take" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-4 h-4 text-gray-500" />
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
        />
      )}
    </div>
  )
}
