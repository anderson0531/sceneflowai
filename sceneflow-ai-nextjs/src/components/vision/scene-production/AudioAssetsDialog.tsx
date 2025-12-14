'use client'

import { useState, useRef } from 'react'
import { 
  Mic, Music, Zap, Volume2, Trash2, Plus, Upload, X, Clock, Play, Pause, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface AudioTrackClip {
  id: string
  url?: string
  startTime: number
  duration: number
  label?: string
  volume?: number
  trimStart?: number
  trimEnd?: number
}

export interface AudioTracksData {
  voiceover?: AudioTrackClip
  dialogue?: AudioTrackClip[]
  music?: AudioTrackClip
  sfx?: AudioTrackClip[]
}

interface AudioAssetsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  audioTracks: AudioTracksData
  sceneId: string
  sceneNumber: number
  onAddAudioClip: (trackType: 'voiceover' | 'dialogue' | 'music' | 'sfx', clip: AudioTrackClip) => void
  onRemoveAudioClip: (trackType: 'voiceover' | 'dialogue' | 'music' | 'sfx', clipId: string, url?: string) => void
  onClearTrack: (trackType: 'voiceover' | 'dialogue' | 'music' | 'sfx') => void
  onSyncFromScript: () => void
  projectId: string
}

// Track type configuration
const TRACK_CONFIG = {
  voiceover: {
    label: 'Voiceover / Narration',
    icon: Mic,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    description: 'Scene narration and voiceover audio',
    acceptMultiple: false,
  },
  dialogue: {
    label: 'Dialogue',
    icon: Volume2,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    description: 'Character dialogue lines',
    acceptMultiple: true,
  },
  music: {
    label: 'Music',
    icon: Music,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    description: 'Background music and score',
    acceptMultiple: false,
  },
  sfx: {
    label: 'Sound Effects',
    icon: Zap,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'Sound effects and ambience',
    acceptMultiple: true,
  },
}

type TrackType = keyof typeof TRACK_CONFIG

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Single audio clip row
function AudioClipRow({
  clip,
  trackType,
  onRemove,
  isPlaying,
  onTogglePlay,
}: {
  clip: AudioTrackClip
  trackType: TrackType
  onRemove: () => void
  isPlaying: boolean
  onTogglePlay: () => void
}) {
  const config = TRACK_CONFIG[trackType]
  const Icon = config.icon
  
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border',
      config.bgColor,
      config.borderColor
    )}>
      <div className={cn('p-2 rounded-full', config.bgColor)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {clip.label || `${config.label} Clip`}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          <span>Start: {formatDuration(clip.startTime)}</span>
          <span>•</span>
          <span>Duration: {formatDuration(clip.duration)}</span>
        </div>
        {clip.url && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
            {clip.url.split('/').pop()?.slice(-30) || 'audio file'}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {clip.url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePlay}
            className="h-8 w-8 p-0"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
          title="Remove clip"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// Empty state for a track
function EmptyTrackState({ trackType, onUpload }: { trackType: TrackType; onUpload: () => void }) {
  const config = TRACK_CONFIG[trackType]
  const Icon = config.icon
  
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed',
      'text-gray-400 dark:text-gray-500',
      config.borderColor
    )}>
      <Icon className={cn('w-8 h-8 mb-2', config.color, 'opacity-50')} />
      <p className="text-sm mb-3">No {config.label.toLowerCase()} clips</p>
      <Button
        variant="outline"
        size="sm"
        onClick={onUpload}
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Upload Audio
      </Button>
    </div>
  )
}

// Track section component
function TrackSection({
  trackType,
  clips,
  onRemoveClip,
  onUpload,
  onClearAll,
  playingClipId,
  onTogglePlay,
}: {
  trackType: TrackType
  clips: AudioTrackClip[]
  onRemoveClip: (clipId: string, url?: string) => void
  onUpload: () => void
  onClearAll: () => void
  playingClipId: string | null
  onTogglePlay: (clipId: string, url?: string) => void
}) {
  const config = TRACK_CONFIG[trackType]
  const Icon = config.icon
  const hasClips = clips.length > 0
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-5 h-5', config.color)} />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {config.label}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({clips.length} {clips.length === 1 ? 'clip' : 'clips'})
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {config.acceptMultiple && hasClips && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUpload}
              className="gap-1 h-7 text-xs"
            >
              <Plus className="w-3 h-3" />
              Add
            </Button>
          )}
          {hasClips && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="gap-1 h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
            >
              <Trash2 className="w-3 h-3" />
              Clear All
            </Button>
          )}
        </div>
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {config.description}
      </p>
      
      {hasClips ? (
        <div className="space-y-2">
          {clips.map((clip) => (
            <AudioClipRow
              key={clip.id}
              clip={clip}
              trackType={trackType}
              onRemove={() => onRemoveClip(clip.id, clip.url)}
              isPlaying={playingClipId === clip.id}
              onTogglePlay={() => onTogglePlay(clip.id, clip.url)}
            />
          ))}
        </div>
      ) : (
        <EmptyTrackState trackType={trackType} onUpload={onUpload} />
      )}
    </div>
  )
}

export function AudioAssetsDialog({
  open,
  onOpenChange,
  audioTracks,
  sceneId,
  sceneNumber,
  onAddAudioClip,
  onRemoveAudioClip,
  onClearTrack,
  onSyncFromScript,
  projectId,
}: AudioAssetsDialogProps) {
  const [playingClipId, setPlayingClipId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadTrackType, setUploadTrackType] = useState<TrackType | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Get clips for each track type
  const getClipsForTrack = (trackType: TrackType): AudioTrackClip[] => {
    switch (trackType) {
      case 'voiceover':
        return audioTracks.voiceover ? [audioTracks.voiceover] : []
      case 'dialogue':
        return audioTracks.dialogue || []
      case 'music':
        return audioTracks.music ? [audioTracks.music] : []
      case 'sfx':
        return audioTracks.sfx || []
      default:
        return []
    }
  }
  
  // Handle play/pause for clips
  const handleTogglePlay = (clipId: string, url?: string) => {
    if (!url) return
    
    if (playingClipId === clipId) {
      audioRef.current?.pause()
      setPlayingClipId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(url)
      audioRef.current = audio
      audio.play()
      audio.onended = () => setPlayingClipId(null)
      setPlayingClipId(clipId)
    }
  }
  
  // Handle removing a clip
  const handleRemoveClip = (trackType: TrackType, clipId: string, url?: string) => {
    // Stop playing if this clip is playing
    if (playingClipId === clipId) {
      audioRef.current?.pause()
      setPlayingClipId(null)
    }
    onRemoveAudioClip(trackType, clipId, url)
  }
  
  // Handle clearing a track
  const handleClearTrack = (trackType: TrackType) => {
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      setPlayingClipId(null)
    }
    onClearTrack(trackType)
  }
  
  // Handle upload button click
  const handleUploadClick = (trackType: TrackType) => {
    setUploadTrackType(trackType)
    fileInputRef.current?.click()
  }
  
  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTrackType) return
    
    // Validate audio file
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file')
      return
    }
    
    setIsUploading(true)
    
    try {
      // Upload to blob storage via existing audio upload API
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }
      
      const { audioUrl } = await response.json()
      
      // Get audio duration
      const audio = new Audio(audioUrl)
      await new Promise<void>((resolve) => {
        audio.onloadedmetadata = () => resolve()
        audio.onerror = () => resolve() // Resolve anyway, duration will be 0
      })
      const duration = audio.duration || 0
      
      // Create clip
      const newClip: AudioTrackClip = {
        id: `${uploadTrackType}-manual-${Date.now()}`,
        url: audioUrl,
        startTime: 0,
        duration,
        label: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        volume: 1,
      }
      
      onAddAudioClip(uploadTrackType, newClip)
      toast.success(`Added ${TRACK_CONFIG[uploadTrackType].label.toLowerCase()} clip`)
    } catch (error) {
      console.error('[AudioAssetsDialog] Upload error:', error)
      toast.error('Failed to upload audio file')
    } finally {
      setIsUploading(false)
      setUploadTrackType(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  // Calculate totals
  const totalClips = 
    (audioTracks.voiceover ? 1 : 0) +
    (audioTracks.dialogue?.length || 0) +
    (audioTracks.music ? 1 : 0) +
    (audioTracks.sfx?.length || 0)
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-purple-500" />
            Audio Assets - Scene {sceneNumber}
          </DialogTitle>
          <DialogDescription>
            Manage audio tracks for this scene. Add, remove, or re-sync audio clips from the script.
          </DialogDescription>
        </DialogHeader>
        
        {/* Summary Bar */}
        <div className="flex items-center justify-between py-2 px-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            <strong className="text-gray-900 dark:text-gray-100">{totalClips}</strong> total audio clips
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onSyncFromScript}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Sync from Script
          </Button>
        </div>
        
        {/* Track Sections */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {(Object.keys(TRACK_CONFIG) as TrackType[]).map((trackType) => (
            <TrackSection
              key={trackType}
              trackType={trackType}
              clips={getClipsForTrack(trackType)}
              onRemoveClip={(clipId, url) => handleRemoveClip(trackType, clipId, url)}
              onUpload={() => handleUploadClick(trackType)}
              onClearAll={() => handleClearTrack(trackType)}
              playingClipId={playingClipId}
              onTogglePlay={handleTogglePlay}
            />
          ))}
        </div>
        
        {/* Hidden file input for uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />
        
        {/* Loading overlay for uploads */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500" />
              <span className="text-sm">Uploading audio...</span>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
