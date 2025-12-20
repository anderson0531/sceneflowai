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
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { SceneSegment } from './types'

interface SceneVideoPlayerProps {
  segments: SceneSegment[]
  sceneNumber: number
  sceneHeading?: string
  isOpen: boolean
  onClose: () => void
  /** Optional: Start playback at specific segment index */
  startAtSegment?: number
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
}) => {
  // Current playback state
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(startAtSegment)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [segmentProgress, setSegmentProgress] = useState(0)
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  
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
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handlePlayPause, handleSkipBack, handleSkipForward, handleMuteToggle, onClose])
  
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
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-gray-800 flex flex-col">
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
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Video Area */}
        <div className="flex-1 flex items-center justify-center p-4 min-h-[50vh]">
          <div className="relative w-full max-w-5xl aspect-video bg-slate-900 rounded-lg overflow-hidden">
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
          </div>
          
          {/* Keyboard shortcuts hint */}
          <div className="text-center mt-4 text-xs text-slate-500">
            <span className="px-2">Space to play/pause</span>
            <span className="px-2">← → to skip</span>
            <span className="px-2">M to mute</span>
            <span className="px-2">Esc to close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SceneVideoPlayer
