'use client'

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { SegmentData } from '@/types/screenplay'
import { buildAudioTracksForLanguage, flattenAudioTracks, type AudioTrackClipV2 } from '@/components/vision/scene-production/audioTrackBuilder'

// ============================================================================
// Types
// ============================================================================

interface VisualClip {
  id: string
  segmentId: string
  thumbnailUrl?: string
  endThumbnailUrl?: string
  startTime: number
  duration: number
}

interface FullscreenPlayerProps {
  segments: SegmentData[]
  scene: any
  sceneId: string
  language?: string
  initialTime?: number
  onClose: () => void
  onPlayheadChange?: (time: number, segmentId?: string) => void
}

// ============================================================================
// Component
// ============================================================================

export function FullscreenPlayer({
  segments,
  scene,
  sceneId,
  language = 'en',
  initialTime = 0,
  onClose,
  onPlayheadChange,
}: FullscreenPlayerProps) {
  // ============================================================================
  // State
  // ============================================================================
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(initialTime)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  
  // ============================================================================
  // Refs (critical for avoiding re-render loops)
  // ============================================================================
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // ============================================================================
  // Build Visual Clips from Segments
  // ============================================================================
  const visualClips = useMemo<VisualClip[]>(() => {
    return segments.map(seg => ({
      id: seg.segmentId,
      segmentId: seg.segmentId,
      thumbnailUrl: seg.references?.startFrameUrl || seg.activeAssetUrl || undefined,
      endThumbnailUrl: seg.references?.endFrameUrl || seg.endFrameUrl || undefined,
      startTime: seg.startTime,
      duration: seg.endTime - seg.startTime,
    }))
  }, [segments])
  
  // ============================================================================
  // Build Audio Tracks from Scene (like SceneTimelineV2)
  // ============================================================================
  const audioTracks = useMemo(() => {
    if (!scene) return null
    return buildAudioTracksForLanguage(scene, language)
  }, [scene, language])
  
  // ============================================================================
  // Flatten Audio Tracks to Clips (using flattenAudioTracks like SceneTimelineV2)
  // ============================================================================
  const allAudioClips = useMemo<AudioTrackClipV2[]>(() => {
    if (!audioTracks) return []
    return flattenAudioTracks(audioTracks)
  }, [audioTracks])
  
  // ============================================================================
  // Calculate Scene Duration
  // ============================================================================
  const sceneDuration = useMemo(() => {
    if (visualClips.length === 0) return 10
    const lastClip = visualClips[visualClips.length - 1]
    return lastClip.startTime + lastClip.duration
  }, [visualClips])
  
  // ============================================================================
  // Get Current Visual Clip
  // ============================================================================
  const getCurrentVisualClip = useCallback((time: number): VisualClip | undefined => {
    for (const clip of visualClips) {
      if (time >= clip.startTime && time < clip.startTime + clip.duration) {
        return clip
      }
    }
    return visualClips[visualClips.length - 1]
  }, [visualClips])
  
  // ============================================================================
  // Current Clip for Display
  // ============================================================================
  const currentClip = getCurrentVisualClip(currentTime)
  const currentClipIndex = visualClips.findIndex(c => c.id === currentClip?.id)
  
  // ============================================================================
  // Audio Element Management
  // ============================================================================
  useEffect(() => {
    // Preload audio elements - only for clips with valid URLs
    allAudioClips.forEach(clip => {
      if (!clip.url) return // Skip clips without URLs
      const audioKey = `${clip.id}:${clip.url}`
      if (!audioRefs.current.has(audioKey)) {
        const audio = new Audio(clip.url)
        audio.preload = 'auto'
        audioRefs.current.set(audioKey, audio)
      }
    })
    
    return () => {
      // Cleanup audio elements on unmount
      audioRefs.current.forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      audioRefs.current.clear()
    }
  }, [allAudioClips])
  
  // ============================================================================
  // Cleanup animation on unmount
  // ============================================================================
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])
  
  // ============================================================================
  // Auto-hide Controls
  // ============================================================================
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }, [isPlaying])
  
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying])
  
  // ============================================================================
  // CORE PLAYBACK - Using inline animate function (SceneTimelineV2 pattern)
  // ============================================================================
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      // PAUSE
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      
      // Pause all audio
      audioRefs.current.forEach(audio => {
        if (!audio.paused) audio.pause()
      })
      
      setIsPlaying(false)
    } else {
      // PLAY
      // Check if at end - restart from beginning
      let startFrom = currentTime
      if (currentTime >= sceneDuration - 0.1) {
        startFrom = 0
        setCurrentTime(0)
      }
      
      startTimeRef.current = performance.now() - startFrom * 1000
      setIsPlaying(true)
      
      // INLINE animate function - this is the key pattern that avoids re-render loops
      const animate = () => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000
        
        if (elapsed >= sceneDuration) {
          // End of playback
          setCurrentTime(sceneDuration)
          setIsPlaying(false)
          
          // Pause all audio
          audioRefs.current.forEach(audio => {
            if (!audio.paused) audio.pause()
          })
          
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
            animationRef.current = null
          }
          return
        }
        
        setCurrentTime(elapsed)
        
        // Sync audio clips
        allAudioClips.forEach(clip => {
          if (!clip.url) return // Skip clips without URLs
          const audioKey = `${clip.id}:${clip.url}`
          const audio = audioRefs.current.get(audioKey)
          
          if (audio) {
            audio.volume = isMuted ? 0 : 1
            
            const clipStart = clip.startTime
            const clipEnd = clip.startTime + clip.duration
            
            if (elapsed >= clipStart && elapsed < clipEnd) {
              const audioTime = elapsed - clipStart + (clip.trimStart || 0)
              if (audio.paused) {
                audio.currentTime = audioTime
                audio.play().catch(() => {})
              } else {
                // Drift correction
                const drift = Math.abs(audio.currentTime - audioTime)
                if (drift > 0.2) {
                  audio.currentTime = audioTime
                }
              }
            } else if (!audio.paused) {
              audio.pause()
            }
          }
        })
        
        // Get current visual clip for callback
        const currentVisual = getCurrentVisualClip(elapsed)
        onPlayheadChange?.(elapsed, currentVisual?.segmentId)
        
        animationRef.current = requestAnimationFrame(animate)
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [isPlaying, currentTime, sceneDuration, allAudioClips, isMuted, getCurrentVisualClip, onPlayheadChange])
  
  // ============================================================================
  // Seek to Time
  // ============================================================================
  const seekTo = useCallback((time: number) => {
    const newTime = Math.max(0, Math.min(sceneDuration, time))
    setCurrentTime(newTime)
    startTimeRef.current = performance.now() - newTime * 1000
    
    // Sync audio to new position
    allAudioClips.forEach(clip => {
      const audioKey = `${clip.id}:${clip.url}`
      const audio = audioRefs.current.get(audioKey)
      
      if (audio) {
        const clipStart = clip.startTime
        const clipEnd = clip.startTime + clip.duration
        
        if (newTime >= clipStart && newTime < clipEnd) {
          audio.currentTime = newTime - clipStart + (clip.trimStart || 0)
        } else if (!audio.paused) {
          audio.pause()
        }
      }
    })
    
    const currentVisual = getCurrentVisualClip(newTime)
    onPlayheadChange?.(newTime, currentVisual?.segmentId)
  }, [sceneDuration, allAudioClips, getCurrentVisualClip, onPlayheadChange])
  
  // ============================================================================
  // Skip to Previous/Next Segment
  // ============================================================================
  const skipToPreviousSegment = useCallback(() => {
    if (currentClipIndex <= 0) {
      seekTo(0)
    } else {
      const prevClip = visualClips[currentClipIndex - 1]
      seekTo(prevClip.startTime)
    }
  }, [currentClipIndex, visualClips, seekTo])
  
  const skipToNextSegment = useCallback(() => {
    if (currentClipIndex >= visualClips.length - 1) {
      return
    }
    const nextClip = visualClips[currentClipIndex + 1]
    seekTo(nextClip.startTime)
  }, [currentClipIndex, visualClips, seekTo])
  
  // ============================================================================
  // Handle Slider Change
  // ============================================================================
  const handleSliderChange = useCallback((value: number[]) => {
    seekTo(value[0])
  }, [seekTo])
  
  // ============================================================================
  // Format Time Display
  // ============================================================================
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // ============================================================================
  // Keyboard Controls
  // ============================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlayback()
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'ArrowLeft':
          e.preventDefault()
          seekTo(currentTime - 5)
          break
        case 'ArrowRight':
          e.preventDefault()
          seekTo(currentTime + 5)
          break
        case 'm':
          e.preventDefault()
          setIsMuted(m => !m)
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlayback, onClose, seekTo, currentTime])
  
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black"
      onMouseMove={showControlsTemporarily}
      onClick={showControlsTemporarily}
    >
      {/* Image Display - Full Screen */}
      <div className="absolute inset-0 flex items-center justify-center">
        {currentClip?.thumbnailUrl ? (
          <img
            src={currentClip.thumbnailUrl}
            alt={`Segment ${currentClipIndex + 1}`}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <span>No image available</span>
          </div>
        )}
      </div>
      
      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ cursor: showControls ? 'auto' : 'none' }}
      >
        {/* Top Bar - Close Button */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress Bar */}
          <div className="mb-4 px-4">
            <Slider
              value={[currentTime]}
              max={sceneDuration}
              step={0.1}
              onValueChange={handleSliderChange}
              className="w-full"
            />
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center justify-between px-4">
            {/* Left: Time Display */}
            <div className="text-white text-sm font-mono min-w-[100px]">
              {formatTime(currentTime)} / {formatTime(sceneDuration)}
            </div>
            
            {/* Center: Playback Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={skipToPreviousSegment}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-6 w-6" />
              </Button>
              
              <button
                onClick={togglePlayback}
                className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8 ml-1" />
                )}
              </button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={skipToNextSegment}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-6 w-6" />
              </Button>
            </div>
            
            {/* Right: Mute Button + Segment Info */}
            <div className="flex items-center gap-4 min-w-[100px] justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(m => !m)}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              
              <span className="text-white text-sm">
                {currentClipIndex + 1} / {visualClips.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FullscreenPlayer
