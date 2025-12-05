'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { SceneSegment, SceneProductionReferences, SceneSegmentStatus } from './types'
import { Upload, Video, Image as ImageIcon, CheckCircle2, Link as LinkIcon, Sparkles, Loader2, Info, Film, Play, X, Maximize2, Volume2, VolumeX, Mic, Music, Zap, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentPromptBuilder, GeneratePromptData, VideoGenerationMethod } from './SegmentPromptBuilder'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

// Audio asset option for selection
interface AudioAssetOption {
  id: string
  label: string
  url: string
  type: 'voiceover' | 'dialogue' | 'music' | 'sfx'
  duration?: number
  source: 'scene' | 'take' | 'library'
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
  // Audio props
  audioTracks?: AudioTracksData
  availableAudioAssets?: AudioAssetOption[]
  onAudioTrackChange?: (trackType: 'voiceover' | 'dialogue' | 'music' | 'sfx', assetId: string | null) => void
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
  availableAudioAssets = [],
  onAudioTrackChange,
}: SegmentStudioProps) {
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isTakesGalleryOpen, setIsTakesGalleryOpen] = useState(false)
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null)
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false)
  
  // Prompt Builder State
  const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false)
  const [promptBuilderMode, setPromptBuilderMode] = useState<'image' | 'video'>('video')
  
  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set())
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  
  // Selected audio assets per track
  const [selectedAudio, setSelectedAudio] = useState<{
    voiceover: string | null
    dialogue: string | null
    music: string | null
    sfx: string | null
  }>({
    voiceover: null,
    dialogue: null,
    music: null,
    sfx: null,
  })
  
  // Filter available assets by type
  const voiceoverAssets = useMemo(() => 
    availableAudioAssets.filter(a => a.type === 'voiceover'), [availableAudioAssets])
  const dialogueAssets = useMemo(() => 
    availableAudioAssets.filter(a => a.type === 'dialogue'), [availableAudioAssets])
  const musicAssets = useMemo(() => 
    availableAudioAssets.filter(a => a.type === 'music'), [availableAudioAssets])
  const sfxAssets = useMemo(() => 
    availableAudioAssets.filter(a => a.type === 'sfx'), [availableAudioAssets])
  
  // Get current audio clips from audioTracks prop or selected assets
  const currentAudioClips = useMemo(() => {
    const clips: Array<{ type: string; clip: AudioTrackClip }> = []
    
    // Use audioTracks prop if available, otherwise use selected assets
    if (audioTracks?.voiceover?.url) {
      clips.push({ type: 'voiceover', clip: audioTracks.voiceover })
    } else if (selectedAudio.voiceover) {
      const asset = voiceoverAssets.find(a => a.id === selectedAudio.voiceover)
      if (asset) clips.push({ type: 'voiceover', clip: { id: asset.id, url: asset.url, startTime: 0, duration: asset.duration || 5, label: asset.label } })
    }
    
    if (audioTracks?.dialogue?.length) {
      audioTracks.dialogue.forEach(d => d.url && clips.push({ type: 'dialogue', clip: d }))
    } else if (selectedAudio.dialogue) {
      const asset = dialogueAssets.find(a => a.id === selectedAudio.dialogue)
      if (asset) clips.push({ type: 'dialogue', clip: { id: asset.id, url: asset.url, startTime: 0, duration: asset.duration || 5, label: asset.label } })
    }
    
    if (audioTracks?.music?.url) {
      clips.push({ type: 'music', clip: audioTracks.music })
    } else if (selectedAudio.music) {
      const asset = musicAssets.find(a => a.id === selectedAudio.music)
      if (asset) clips.push({ type: 'music', clip: { id: asset.id, url: asset.url, startTime: 0, duration: asset.duration || 30, label: asset.label } })
    }
    
    if (audioTracks?.sfx?.length) {
      audioTracks.sfx.forEach(s => s.url && clips.push({ type: 'sfx', clip: s }))
    } else if (selectedAudio.sfx) {
      const asset = sfxAssets.find(a => a.id === selectedAudio.sfx)
      if (asset) clips.push({ type: 'sfx', clip: { id: asset.id, url: asset.url, startTime: 0, duration: asset.duration || 3, label: asset.label } })
    }
    
    return clips
  }, [audioTracks, selectedAudio, voiceoverAssets, dialogueAssets, musicAssets, sfxAssets])
  
  // Sync audio with video playback
  const handleVideoPlay = () => {
    setIsPlaying(true)
    currentAudioClips.forEach(({ type, clip }) => {
      if (!mutedTracks.has(type) && clip.url) {
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
  
  const toggleMute = (trackType: string) => {
    setMutedTracks(prev => {
      const next = new Set(prev)
      if (next.has(trackType)) {
        next.delete(trackType)
        // Resume audio if playing
        if (isPlaying) {
          currentAudioClips.filter(c => c.type === trackType).forEach(({ clip }) => {
            const audio = audioRefs.current.get(clip.id)
            if (audio && videoRef.current) {
              audio.currentTime = videoRef.current.currentTime
              audio.play().catch(() => {})
            }
          })
        }
      } else {
        next.add(trackType)
        // Pause audio for this track
        currentAudioClips.filter(c => c.type === trackType).forEach(({ clip }) => {
          audioRefs.current.get(clip.id)?.pause()
        })
      }
      return next
    })
  }
  
  const handleAudioSelect = (trackType: 'voiceover' | 'dialogue' | 'music' | 'sfx', assetId: string | null) => {
    setSelectedAudio(prev => ({ ...prev, [trackType]: assetId }))
    onAudioTrackChange?.(trackType, assetId)
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
    <div className="space-y-6">
      {/* Current Generation/Upload Status - Above Everything */}
      {segment.status === 'GENERATING' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Generating Segment {segment.sequenceIndex + 1}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Generating... · {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Segment Header with Inline Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Segment {segment.sequenceIndex + 1} Studio
            </h4>
            {/* Generation Method Badge */}
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
            {/* Trigger Reason Badge */}
            {segment.triggerReason && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:inline">
                • {segment.triggerReason}
              </span>
            )}
          </div>
          <p className={cn("text-xs font-medium", getStatusColor(segment.status))}>
            {displayStatus(segment.status)} · {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s
          </p>
        </div>
        
        {/* Generation Action Buttons - Inline Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Video Button */}
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
          
          {/* Image Button */}
          <Button
            onClick={handleOpenImageBuilder}
            disabled={segment.status === 'GENERATING'}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Image
          </Button>
          
          {/* Upload Button */}
          <label className="inline-flex cursor-pointer">
            <input type="file" className="hidden" accept="video/*,image/*" onChange={handleUploadChange} />
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${segment.status === 'GENERATING' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </span>
          </label>
          
          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 hidden sm:block" />
          
          {/* Details Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDetailDialogOpen(true)}
            className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"
          >
            <Info className="w-3.5 h-3.5" />
            Details
          </Button>
          
          {/* Takes Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTakesGalleryOpen(true)}
            className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"
          >
            <Film className="w-3.5 h-3.5" />
            Takes ({segment.takes.length})
          </Button>
        </div>
      </div>

      {/* Video/Image Preview - Centered with Audio Controls */}
      {segment.activeAssetUrl && (segment.status === 'COMPLETE' || segment.status === 'UPLOADED') && (
        <div className="flex flex-col items-center">
          {/* Audio Track Selectors */}
          {(availableAudioAssets.length > 0 || currentAudioClips.length > 0) && (
            <div className="w-full max-w-xl mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* V.O. Track */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1">
                    <Mic className="w-3 h-3" /> V.O.
                  </span>
                  <button
                    onClick={() => toggleMute('voiceover')}
                    className={cn("p-1 rounded transition-colors", mutedTracks.has('voiceover') ? "text-gray-400" : "text-blue-500")}
                  >
                    {mutedTracks.has('voiceover') ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                </div>
                <Select
                  value={selectedAudio.voiceover || 'none'}
                  onValueChange={(v) => handleAudioSelect('voiceover', v === 'none' ? null : v)}
                >
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue placeholder="Select V.O." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {voiceoverAssets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.label} ({asset.source})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Dialogue Track */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1">
                    <Mic className="w-3 h-3" /> Dialogue
                  </span>
                  <button
                    onClick={() => toggleMute('dialogue')}
                    className={cn("p-1 rounded transition-colors", mutedTracks.has('dialogue') ? "text-gray-400" : "text-emerald-500")}
                  >
                    {mutedTracks.has('dialogue') ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                </div>
                <Select
                  value={selectedAudio.dialogue || 'none'}
                  onValueChange={(v) => handleAudioSelect('dialogue', v === 'none' ? null : v)}
                >
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue placeholder="Select Dialogue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {dialogueAssets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.label} ({asset.source})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Music Track */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1">
                    <Music className="w-3 h-3" /> Music
                  </span>
                  <button
                    onClick={() => toggleMute('music')}
                    className={cn("p-1 rounded transition-colors", mutedTracks.has('music') ? "text-gray-400" : "text-purple-500")}
                  >
                    {mutedTracks.has('music') ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                </div>
                <Select
                  value={selectedAudio.music || 'none'}
                  onValueChange={(v) => handleAudioSelect('music', v === 'none' ? null : v)}
                >
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue placeholder="Select Music" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {musicAssets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.label} ({asset.source})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* SFX Track */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3" /> SFX
                  </span>
                  <button
                    onClick={() => toggleMute('sfx')}
                    className={cn("p-1 rounded transition-colors", mutedTracks.has('sfx') ? "text-gray-400" : "text-amber-500")}
                  >
                    {mutedTracks.has('sfx') ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                </div>
                <Select
                  value={selectedAudio.sfx || 'none'}
                  onValueChange={(v) => handleAudioSelect('sfx', v === 'none' ? null : v)}
                >
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue placeholder="Select SFX" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {sfxAssets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.label} ({asset.source})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Centered Video Player - 10% larger */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-black w-full max-w-xl">
            {segment.assetType === 'video' ? (
              <video
                ref={videoRef}
                key={segment.activeAssetUrl}
                src={segment.activeAssetUrl}
                controls
                className="w-full aspect-video"
                poster={segment.takes[0]?.thumbnailUrl}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onSeeked={handleVideoSeeked}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <img
                src={segment.activeAssetUrl}
                alt={`Segment ${segment.sequenceIndex + 1} preview`}
                className="w-full aspect-video object-contain"
              />
            )}
            <div className="bg-gray-900 px-3 py-1.5 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                {segment.assetType === 'video' ? 'Video' : 'Image'} · Seg {segment.sequenceIndex + 1}
                {currentAudioClips.length > 0 && ` · ${currentAudioClips.length} audio track${currentAudioClips.length > 1 ? 's' : ''}`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreenPreview(true)}
                  className="text-[10px] text-gray-400 hover:text-white h-6 px-2"
                >
                  <Maximize2 className="w-3 h-3 mr-1" />
                  Expand
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTakesGalleryOpen(true)}
                  className="text-[10px] text-gray-400 hover:text-white h-6 px-2"
                >
                  Takes ({segment.takes.length})
                </Button>
              </div>
            </div>
          </div>
          
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
        </div>
      )}

      {/* Credits Estimate */}
      {typeof estimatedCredits === 'number' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-2 bg-white/50 dark:bg-gray-900/30">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Estimated cost: <span className="font-semibold text-sf-primary">{estimatedCredits.toFixed(2)} credits</span>
          </span>
        </div>
      )}

      {/* Segment Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Segment {segment.sequenceIndex + 1} Details</DialogTitle>
            <DialogDescription>
              {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s · Duration: {(segment.endTime - segment.startTime).toFixed(1)}s
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Veo 3.1 Generation Metadata - NEW */}
            {(segment.generationMethod || segment.triggerReason || segment.emotionalBeat) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {segment.generationMethod && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400 mb-1">Method</div>
                    <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                      {segment.generationMethod === 'I2V' ? 'Image-to-Video' :
                       segment.generationMethod === 'EXT' ? 'Extend' :
                       segment.generationMethod === 'FTV' ? 'Frame-to-Video' :
                       segment.generationMethod === 'REF' ? 'Reference' : 'Text-to-Video'}
                    </div>
                  </div>
                )}
                {segment.triggerReason && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400 mb-1">Cut Trigger</div>
                    <div className="text-xs text-amber-900 dark:text-amber-100">{segment.triggerReason}</div>
                  </div>
                )}
                {segment.emotionalBeat && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-[10px] font-semibold uppercase text-purple-600 dark:text-purple-400 mb-1">Emotional Beat</div>
                    <div className="text-xs text-purple-900 dark:text-purple-100">{segment.emotionalBeat}</div>
                  </div>
                )}
                {segment.cameraMovement && (
                  <div className="bg-slate-50 dark:bg-slate-900/20 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">Camera</div>
                    <div className="text-xs text-slate-900 dark:text-slate-100">{segment.cameraMovement}</div>
                  </div>
                )}
              </div>
            )}

            {/* End Frame Description - Lookahead */}
            {segment.endFrameDescription && (
              <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-[10px] font-semibold uppercase text-green-600 dark:text-green-400 mb-1">End Frame (Lookahead for Next Segment)</div>
                <div className="text-sm text-green-900 dark:text-green-100">{segment.endFrameDescription}</div>
              </div>
            )}

            {/* Scene Segment Description */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scene Segment Description</h3>
                {onOpenPromptBuilder && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenPromptBuilder()
                      setIsDetailDialogOpen(false)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Edit
                  </Button>
                )}
              </div>
              
              {promptSummary?.platform && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{promptSummary.platform}</span>
                  {promptSummary.promptType && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {promptSummary.promptType}
                    </span>
                  )}
                </div>
              )}
              
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                {promptSummary?.promptText || 'No description available. Generate or edit the segment description.'}
              </p>
              
              {(promptSummary?.characterNames?.length || promptSummary?.sceneRefNames?.length || promptSummary?.objectNames?.length) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
                  <div>
                    <div className="font-semibold uppercase text-[11px] text-gray-500 dark:text-gray-400 mb-1">Characters</div>
                    <p className="text-gray-600 dark:text-gray-300">{promptSummary?.characterNames?.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <div className="font-semibold uppercase text-[11px] text-gray-500 dark:text-gray-400 mb-1">Scene Refs</div>
                    <p className="text-gray-600 dark:text-gray-300">{promptSummary?.sceneRefNames?.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <div className="font-semibold uppercase text-[11px] text-gray-500 dark:text-gray-400 mb-1">Objects</div>
                    <p className="text-gray-600 dark:text-gray-300">{promptSummary?.objectNames?.join(', ') || 'None'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Continuity */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Continuity</h3>
              <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                {previousSegmentLastFrame ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Previous segment has a last frame available for I2V</span>
                    </div>
                    <img src={previousSegmentLastFrame} alt="Previous frame" className="w-full max-w-xs rounded-md border border-gray-200 dark:border-gray-700" />
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">
                    No previous segment frame available. Use the Video button to access I2V, F2F, and Reference options.
                  </div>
                )}
              </div>
            </div>

            {/* Linked References */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Linked References</h3>
              <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg space-y-2">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">Characters:</span>{' '}
                  {references.characters.length > 0
                    ? references.characters.map((char: any) => char.name || char.id).join(', ')
                    : <span className="italic text-gray-400">None linked</span>}
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">Scene References:</span>{' '}
                  {references.sceneReferences.length > 0
                    ? references.sceneReferences.map((ref) => ref.name).join(', ')
                    : <span className="italic text-gray-400">None linked</span>}
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">Objects:</span>{' '}
                  {references.objectReferences.length > 0
                    ? references.objectReferences.map((ref) => ref.name).join(', ')
                    : <span className="italic text-gray-400">None linked</span>}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Takes Gallery Dialog */}
      <Dialog open={isTakesGalleryOpen} onOpenChange={(open) => {
        setIsTakesGalleryOpen(open)
        if (!open) setPlayingVideoUrl(null)
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Takes Gallery - Segment {segment.sequenceIndex + 1}</DialogTitle>
            <DialogDescription>
              All generated and uploaded takes for this segment. Click to play.
            </DialogDescription>
          </DialogHeader>
          
          {/* Video Player */}
          {playingVideoUrl && (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <video
                src={playingVideoUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
              <button
                onClick={() => setPlayingVideoUrl(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="py-4">
            {segment.takes.length === 0 ? (
              <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-12 text-sm text-gray-500 dark:text-gray-400 text-center">
                No takes yet. Generate or upload media to populate this gallery.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {segment.takes.map((take) => (
                  <div
                    key={take.id}
                    className={cn(
                      'border rounded-lg p-3 space-y-2 transition-all hover:shadow-lg cursor-pointer',
                      take.status === 'COMPLETE'
                        ? 'border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
                      playingVideoUrl === take.assetUrl && 'ring-2 ring-primary'
                    )}
                    onClick={() => take.assetUrl && setPlayingVideoUrl(take.assetUrl)}
                  >
                    <div className="aspect-video rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center relative group">
                      {take.thumbnailUrl ? (
                        <>
                          <img src={take.thumbnailUrl} alt="Take preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-10 h-10 text-white" />
                          </div>
                        </>
                      ) : take.assetUrl ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                          <Play className="w-10 h-10 text-white/80 group-hover:text-white transition-colors" />
                        </div>
                      ) : (
                        <Video className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{new Date(take.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="font-medium capitalize">Status: {take.status.toLowerCase()}</div>
                      {take.durationSec && <div>Duration: {take.durationSec}s</div>}
                      {take.notes && <div className="italic text-gray-400 text-xs">{take.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Preview Dialog */}
      <Dialog open={isFullscreenPreview} onOpenChange={setIsFullscreenPreview}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 bg-black">
          <button
            onClick={() => setIsFullscreenPreview(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {segment.activeAssetUrl && (
            segment.assetType === 'video' ? (
              <video
                key={segment.activeAssetUrl}
                src={segment.activeAssetUrl}
                controls
                autoPlay
                className="w-full h-full max-h-[85vh] object-contain"
              />
            ) : (
              <img
                src={segment.activeAssetUrl}
                alt={`Segment ${segment.sequenceIndex + 1} fullscreen`}
                className="w-full h-full max-h-[85vh] object-contain"
              />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* New Segment Prompt Builder (replaces ShotPromptBuilder) */}
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
