/**
 * SceneVideoPlayer - Full Scene Video Playback Modal
 * 
 * Plays all rendered video segments sequentially as a continuous scene preview.
 * Part of the Director's Console workflow for reviewing generated videos.
 * 
 * Features:
 * - Sequential playback: plays segment 1, then auto-advances to segment 2, etc.
 * - Progress bar showing overall scene playback position
 * - Controls: play/pause, skip forward/back, close
 * - Segment indicator (e.g., "Segment 2 of 5")
 * - Fallback: shows start frame for incomplete segments
 * - Audio overlay with timeline sync (start time, duration, volume per track)
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  X,
  Volume2,
  VolumeX,
  Film,
  Maximize,
  Minimize,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { SceneSegment, SelectedAudioTracks, AudioClipConfig, SceneAudioConfig, AudioVolumes } from './types'

/**
 * Audio URLs for scene playback overlay (legacy support)
 */
interface SceneAudioUrls {
  narrationUrl?: string
  musicUrl?: string
  dialogueUrls?: string[]
  sfxUrls?: string[]
}

interface SceneVideoPlayerProps {
  segments: SceneSegment[]
  sceneNumber: number
  sceneHeading?: string
  isOpen: boolean
  onClose: () => void
  /** Optional: Start playback at specific segment index */
  startAtSegment?: number
  /** Audio track selection for overlay playback */
  audioTracks?: SelectedAudioTracks
  /** Audio URLs for overlay (legacy) */
  sceneAudio?: SceneAudioUrls
  /** Enhanced audio config with timeline settings */
  audioConfig?: SceneAudioConfig
  /** Volume settings per track (0-1) */
  audioVolumes?: AudioVolumes
}

interface PlayableSegment {
  segment: SceneSegment
  index: number
  hasVideo: boolean
  videoUrl: string | null
  fallbackImageUrl: string | null
  duration: number  // Estimated or actual duration in seconds
}

export const SceneVideoPlayer: React.FC<SceneVideoPlayerProps> = ({
  segments,
  sceneNumber,
  sceneHeading,
  isOpen,
  onClose,
  startAtSegment = 0,
  audioTracks,
  sceneAudio,
  audioConfig,
  audioVolumes,
}) => {
  // Default volumes if not provided
  const defaultVolumes: AudioVolumes = {
    narration: 0.8,
    dialogue: 0.9,
    music: 0.5,
    sfx: 0.6,
  }
  const volumes = audioVolumes || defaultVolumes
  
  // Current playback state
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(startAtSegment)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [segmentProgress, setSegmentProgress] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const sceneStartTimeRef = useRef<number>(0)  // Scene playback start timestamp
  
  // Audio overlay refs with timeline sync
  const narrationAudioRef = useRef<HTMLAudioElement | null>(null)
  const musicAudioRef = useRef<HTMLAudioElement | null>(null)
  const dialogueAudiosRef = useRef<HTMLAudioElement[]>([])
  const sfxAudiosRef = useRef<HTMLAudioElement[]>([])
  
  // Build audio config from legacy sceneAudio if audioConfig not provided
  const effectiveAudioConfig: SceneAudioConfig | undefined = audioConfig || (sceneAudio ? {
    narration: sceneAudio.narrationUrl ? {
      url: sceneAudio.narrationUrl,
      startTime: 0,
      duration: 999, // Play for entire scene
      volume: volumes.narration,
    } : undefined,
    music: sceneAudio.musicUrl ? {
      url: sceneAudio.musicUrl,
      startTime: 0,
      duration: 999, // Will be clamped to total scene duration
      volume: volumes.music,
      loop: false,  // Don't loop - play for scene duration
    } : undefined,
    dialogue: sceneAudio.dialogueUrls?.map((url, i) => ({
      url,
      startTime: 0, // Legacy: no timing info
      duration: 999,
      volume: volumes.dialogue,
    })),
    sfx: sceneAudio.sfxUrls?.map((url, i) => ({
      url,
      startTime: 0,
      duration: 999,
      volume: volumes.sfx,
    })),
  } : undefined)
  
  // Initialize audio elements when modal opens
  useEffect(() => {
    if (isOpen && effectiveAudioConfig) {
      // Narration audio
      if (effectiveAudioConfig.narration?.url && audioTracks?.narration) {
        const config = effectiveAudioConfig.narration
        narrationAudioRef.current = new Audio(config.url)
        narrationAudioRef.current.volume = config.volume
      }
      
      // Music audio - DON'T use loop, we control duration via timeline
      if (effectiveAudioConfig.music?.url && audioTracks?.music) {
        const config = effectiveAudioConfig.music
        musicAudioRef.current = new Audio(config.url)
        musicAudioRef.current.volume = config.volume
        // Loop only if explicitly set AND duration exceeds audio file length
        musicAudioRef.current.loop = config.loop || false
      }
      
      // Dialogue audios with timeline support
      if (effectiveAudioConfig.dialogue && audioTracks?.dialogue) {
        dialogueAudiosRef.current = effectiveAudioConfig.dialogue.map(config => {
          const audio = new Audio(config.url)
          audio.volume = config.volume
          return audio
        })
      }
      
      // SFX audios with timeline support
      if (effectiveAudioConfig.sfx && audioTracks?.sfx) {
        sfxAudiosRef.current = effectiveAudioConfig.sfx.map(config => {
          const audio = new Audio(config.url)
          audio.volume = config.volume
          return audio
        })
      }
    }
    
    // Cleanup on close
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      narrationAudioRef.current?.pause()
      musicAudioRef.current?.pause()
      dialogueAudiosRef.current.forEach(a => a.pause())
      sfxAudiosRef.current.forEach(a => a.pause())
      
      narrationAudioRef.current = null
      musicAudioRef.current = null
      dialogueAudiosRef.current = []
      sfxAudiosRef.current = []
    }
  }, [isOpen, effectiveAudioConfig, audioTracks, volumes])
  
  // Apply volume changes dynamically
  useEffect(() => {
    if (narrationAudioRef.current) {
      narrationAudioRef.current.volume = isMuted ? 0 : volumes.narration
    }
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = isMuted ? 0 : volumes.music
    }
    dialogueAudiosRef.current.forEach(a => {
      a.volume = isMuted ? 0 : volumes.dialogue
    })
    sfxAudiosRef.current.forEach(a => {
      a.volume = isMuted ? 0 : volumes.sfx
    })
  }, [volumes, isMuted])
  
  // Mute/unmute audio tracks with video
  useEffect(() => {
    if (narrationAudioRef.current) {
      narrationAudioRef.current.muted = isMuted
    }
    if (musicAudioRef.current) {
      musicAudioRef.current.muted = isMuted
    }
    dialogueAudiosRef.current.forEach(a => a.muted = isMuted)
    sfxAudiosRef.current.forEach(a => a.muted = isMuted)
  }, [isMuted])
  
  // Build playable segments list with fallbacks
  const playableSegments: PlayableSegment[] = segments
    .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
    .map((segment, idx) => {
      const hasVideo = segment.status === 'COMPLETE' && 
                       segment.assetType === 'video' && 
                       !!segment.activeAssetUrl
      
      const fallbackImage = segment.startFrameUrl || 
                            segment.references?.startFrameUrl || 
                            null
      
      return {
        segment,
        index: idx,
        hasVideo,
        videoUrl: hasVideo ? segment.activeAssetUrl : null,
        fallbackImageUrl: fallbackImage,
        duration: hasVideo ? 
          (segment.endTime - segment.startTime) : 
          Math.max(3, segment.endTime - segment.startTime), // Min 3s for images
      }
    })
  
  const currentPlayable = playableSegments[currentSegmentIndex] || null
  const totalSegments = playableSegments.length
  const completedCount = playableSegments.filter(p => p.hasVideo).length
  
  // Calculate total duration
  const totalDuration = playableSegments.reduce((sum, p) => sum + p.duration, 0)
  const elapsedBeforeCurrent = playableSegments
    .slice(0, currentSegmentIndex)
    .reduce((sum, p) => sum + p.duration, 0)
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSegmentIndex(startAtSegment)
      setIsPlaying(false)
      setCurrentTime(0)
      setSegmentProgress(0)
    }
  }, [isOpen, startAtSegment])
  
  // Handle video time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && currentPlayable?.hasVideo) {
      const video = videoRef.current
      setCurrentTime(elapsedBeforeCurrent + video.currentTime)
      setSegmentProgress((video.currentTime / video.duration) * 100)
    }
  }, [elapsedBeforeCurrent, currentPlayable])
  
  // Handle video ended - auto-advance to next segment
  const handleVideoEnded = useCallback(() => {
    if (currentSegmentIndex < totalSegments - 1) {
      setCurrentSegmentIndex(prev => prev + 1)
      setSegmentProgress(0)
    } else {
      // End of all segments
      setIsPlaying(false)
      setSegmentProgress(100)
    }
  }, [currentSegmentIndex, totalSegments])
  
  // Handle image fallback timing (auto-advance after duration)
  useEffect(() => {
    if (!isOpen || !currentPlayable || currentPlayable.hasVideo || !isPlaying) {
      return
    }
    
    // For image fallbacks, advance after estimated duration
    const duration = currentPlayable.duration * 1000  // Convert to ms
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 100
      setSegmentProgress((elapsed / duration) * 100)
      setCurrentTime(elapsedBeforeCurrent + (elapsed / 1000))
      
      if (elapsed >= duration) {
        clearInterval(interval)
        handleVideoEnded()
      }
    }, 100)
    
    return () => clearInterval(interval)
  }, [isOpen, currentPlayable, isPlaying, elapsedBeforeCurrent, handleVideoEnded])
  
  // Sync video playback with isPlaying state
  useEffect(() => {
    if (videoRef.current && currentPlayable?.hasVideo) {
      if (isPlaying) {
        videoRef.current.play().catch(console.error)
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, currentPlayable, currentSegmentIndex])
  
  // Timeline-based audio sync - syncs all audio tracks to scene time
  // This ensures music plays for the full scene duration, not per-segment
  useEffect(() => {
    if (!isPlaying || !effectiveAudioConfig) {
      // Pause all audio when not playing
      narrationAudioRef.current?.pause()
      musicAudioRef.current?.pause()
      dialogueAudiosRef.current.forEach(a => a.pause())
      sfxAudiosRef.current.forEach(a => a.pause())
      return
    }
    
    // Helper to sync a single audio clip to scene timeline
    const syncAudioToTimeline = (
      audio: HTMLAudioElement | null,
      config: AudioClipConfig | undefined,
      sceneTime: number
    ) => {
      if (!audio || !config) return
      
      const clipStart = config.startTime
      const clipEnd = config.startTime + Math.min(config.duration, totalDuration - config.startTime)
      
      // Check if we're within this clip's time window
      if (sceneTime >= clipStart && sceneTime < clipEnd) {
        const clipTime = sceneTime - clipStart
        
        // Sync audio position if drifted more than 0.3s
        if (Math.abs(audio.currentTime - clipTime) > 0.3) {
          audio.currentTime = Math.min(clipTime, audio.duration || clipTime)
        }
        
        // Start if paused
        if (audio.paused) {
          audio.play().catch(() => {})
        }
      } else {
        // Outside clip window - pause
        if (!audio.paused) {
          audio.pause()
        }
      }
    }
    
    // Start music immediately and sync
    if (effectiveAudioConfig.music && musicAudioRef.current && audioTracks?.music) {
      syncAudioToTimeline(musicAudioRef.current, effectiveAudioConfig.music, currentTime)
    }
    
    // Sync narration
    if (effectiveAudioConfig.narration && narrationAudioRef.current && audioTracks?.narration) {
      syncAudioToTimeline(narrationAudioRef.current, effectiveAudioConfig.narration, currentTime)
    }
    
    // Sync dialogue clips
    if (effectiveAudioConfig.dialogue && audioTracks?.dialogue) {
      effectiveAudioConfig.dialogue.forEach((config, i) => {
        syncAudioToTimeline(dialogueAudiosRef.current[i], config, currentTime)
      })
    }
    
    // Sync SFX clips
    if (effectiveAudioConfig.sfx && audioTracks?.sfx) {
      effectiveAudioConfig.sfx.forEach((config, i) => {
        syncAudioToTimeline(sfxAudiosRef.current[i], config, currentTime)
      })
    }
  }, [isPlaying, currentTime, effectiveAudioConfig, audioTracks, totalDuration])
  
  // Skip to next segment
  const handleSkipForward = useCallback(() => {
    if (currentSegmentIndex < totalSegments - 1) {
      setCurrentSegmentIndex(prev => prev + 1)
      setSegmentProgress(0)
    }
  }, [currentSegmentIndex, totalSegments])
  
  // Skip to previous segment
  const handleSkipBack = useCallback(() => {
    if (videoRef.current && videoRef.current.currentTime > 2) {
      // If more than 2s into video, restart current segment
      videoRef.current.currentTime = 0
      setSegmentProgress(0)
    } else if (currentSegmentIndex > 0) {
      setCurrentSegmentIndex(prev => prev - 1)
      setSegmentProgress(0)
    }
  }, [currentSegmentIndex])
  
  // Toggle play/pause
  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])
  
  // Toggle mute
  const handleMuteToggle = useCallback(() => {
    setIsMuted(prev => !prev)
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
    }
  }, [isMuted])
  
  // Toggle fullscreen - use document.documentElement for true browser fullscreen (like Screening Room)
  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      // Request fullscreen on the document element for true fullscreen experience
      document.documentElement.requestFullscreen().catch(() => {
        // Fallback to container if document fullscreen fails
        containerRef.current?.requestFullscreen()
      })
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])
  
  // Listen for fullscreen changes (e.g., user presses Esc to exit)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          handlePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleSkipBack()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleSkipForward()
          break
        case 'm':
          e.preventDefault()
          handleMuteToggle()
          break
        case 'f':
          e.preventDefault()
          handleFullscreenToggle()
          break
        case 'Escape':
          e.preventDefault()
          if (document.fullscreenElement) {
            document.exitFullscreen()
          } else {
            onClose()
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handlePlayPause, handleSkipBack, handleSkipForward, handleMuteToggle, handleFullscreenToggle, onClose])
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Calculate overall progress percentage
  const overallProgress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        ref={containerRef}
        className={cn(
          "p-0 bg-black border-gray-800 flex flex-col",
          isFullscreen 
            ? "max-w-none max-h-none w-screen h-screen rounded-none border-none" 
            : "max-w-[95vw] max-h-[95vh]"
        )}
      >
        <DialogTitle className="sr-only">Scene {sceneNumber} Video Preview</DialogTitle>
        <DialogDescription className="sr-only">
          Playing {completedCount} of {totalSegments} rendered video segments
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <Film className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-white font-semibold">
                Scene {sceneNumber} Preview
              </h2>
              {sceneHeading && (
                <p className="text-sm text-slate-400 line-clamp-1">{sceneHeading}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {completedCount} of {totalSegments} segments rendered
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreenToggle}
              className="text-white hover:bg-white/10"
              title="Toggle fullscreen (F)"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Video Area */}
        <div className={cn(
          "flex-1 flex items-center justify-center min-h-[50vh]",
          isFullscreen ? "p-0" : "p-4"
        )}>
          <div className={cn(
            "relative bg-slate-900 overflow-hidden",
            isFullscreen 
              ? "w-full h-full" 
              : "w-full max-w-5xl aspect-video rounded-lg"
          )}>
            {currentPlayable?.hasVideo ? (
              <video
                ref={videoRef}
                src={currentPlayable.videoUrl!}
                className="w-full h-full object-contain"
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                onLoadedMetadata={() => {
                  if (isPlaying && videoRef.current) {
                    videoRef.current.play().catch(console.error)
                  }
                }}
              />
            ) : currentPlayable?.fallbackImageUrl ? (
              <div className="relative w-full h-full">
                <img 
                  src={currentPlayable.fallbackImageUrl}
                  alt={`Segment ${currentSegmentIndex + 1}`}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="text-center">
                    <Film className="w-12 h-12 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className="text-slate-300 text-sm">Video not yet rendered</p>
                    <p className="text-slate-500 text-xs mt-1">Showing start frame</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <div className="text-center">
                  <Film className="w-16 h-16 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500">No video or frame available</p>
                </div>
              </div>
            )}
            
            {/* Segment Indicator Badge */}
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 rounded-full backdrop-blur-sm">
              <span className="text-white text-sm font-medium">
                Segment {currentSegmentIndex + 1} of {totalSegments}
              </span>
              {!currentPlayable?.hasVideo && (
                <span className="text-amber-400 text-xs ml-2">(preview)</span>
              )}
            </div>
            
            {/* Center Play Button (when paused) */}
            {!isPlaying && (
              <button
                onClick={handlePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
              >
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="px-6 pb-6 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress Bar */}
          <div className="mb-4">
            {/* Segment markers */}
            <div className="relative h-1 bg-slate-700 rounded-full overflow-hidden mb-2">
              {/* Overall progress */}
              <div 
                className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-100"
                style={{ width: `${overallProgress}%` }}
              />
              {/* Segment dividers */}
              {playableSegments.slice(0, -1).map((p, idx) => {
                const position = playableSegments
                  .slice(0, idx + 1)
                  .reduce((sum, s) => sum + s.duration, 0) / totalDuration * 100
                return (
                  <div 
                    key={p.segment.segmentId}
                    className="absolute top-0 w-0.5 h-full bg-slate-500"
                    style={{ left: `${position}%` }}
                  />
                )
              })}
            </div>
            
            {/* Time display */}
            <div className="flex justify-between text-xs text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipBack}
              disabled={currentSegmentIndex === 0 && segmentProgress < 5}
              className="text-white hover:bg-white/10 disabled:opacity-30"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              className="text-white hover:bg-white/10 w-14 h-14 rounded-full"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 ml-0.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipForward}
              disabled={currentSegmentIndex >= totalSegments - 1}
              className="text-white hover:bg-white/10 disabled:opacity-30"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
            
            <div className="w-px h-6 bg-slate-600 mx-2" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMuteToggle}
              className="text-white hover:bg-white/10"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreenToggle}
              className="text-white hover:bg-white/10"
              title="Fullscreen (F)"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </Button>
          </div>
          
          {/* Keyboard shortcuts hint */}
          <div className="text-center mt-4 text-xs text-slate-500">
            <span className="px-2">Space to play/pause</span>
            <span className="px-2">← → to skip</span>
            <span className="px-2">M to mute</span>
            <span className="px-2">F for fullscreen</span>
            <span className="px-2">Esc to close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SceneVideoPlayer
