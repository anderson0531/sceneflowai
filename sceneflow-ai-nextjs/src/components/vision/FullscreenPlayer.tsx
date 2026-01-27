'use client'

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { 
  X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  SlidersHorizontal, Mic, MessageSquare, Music, Zap,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Move
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { SegmentData } from '@/types/screenplay'
import { buildAudioTracksForLanguage, flattenAudioTracks, type AudioTrackClipV2 } from '@/components/vision/scene-production/audioTrackBuilder'

// ============================================================================
// Volume Settings Types & Persistence
// ============================================================================

interface TrackVolumes {
  voiceover: number
  dialogue: number
  music: number
  sfx: number
  master: number
}

const DEFAULT_VOLUMES: TrackVolumes = {
  voiceover: 1,
  dialogue: 1,
  music: 0.5,
  sfx: 0.7,
  master: 1,
}

const VOLUME_STORAGE_KEY = 'sceneflow-fullscreen-player-volumes'

function loadVolumeSettings(): TrackVolumes {
  if (typeof window === 'undefined') return DEFAULT_VOLUMES
  try {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_VOLUMES, ...parsed }
    }
  } catch (e) {
    console.warn('Failed to load volume settings:', e)
  }
  return DEFAULT_VOLUMES
}

function saveVolumeSettings(volumes: TrackVolumes): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, JSON.stringify(volumes))
  } catch (e) {
    console.warn('Failed to save volume settings:', e)
  }
}

// ============================================================================
// Ken Burns / Pan Settings
// ============================================================================

type PanIntensity = 'off' | 'subtle' | 'medium' | 'dramatic'

const PAN_STORAGE_KEY = 'sceneflow-fullscreen-player-pan'

const PAN_SETTINGS: Record<PanIntensity, { scale: number; translate: number; duration: number }> = {
  off: { scale: 1, translate: 0, duration: 0 },
  subtle: { scale: 1.05, translate: 2, duration: 20 },
  medium: { scale: 1.1, translate: 4, duration: 15 },
  dramatic: { scale: 1.15, translate: 6, duration: 10 },
}

function loadPanSettings(): PanIntensity {
  if (typeof window === 'undefined') return 'subtle'
  try {
    const stored = localStorage.getItem(PAN_STORAGE_KEY)
    if (stored && ['off', 'subtle', 'medium', 'dramatic'].includes(stored)) {
      return stored as PanIntensity
    }
  } catch (e) {
    console.warn('Failed to load pan settings:', e)
  }
  return 'subtle'
}

function savePanSettings(intensity: PanIntensity): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PAN_STORAGE_KEY, intensity)
  } catch (e) {
    console.warn('Failed to save pan settings:', e)
  }
}

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
  // Scene navigation
  currentSceneIndex?: number
  totalScenes?: number
  onNextScene?: () => void
  onPreviousScene?: () => void
  autoAdvance?: boolean
  sceneTransitionDelay?: number
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
  currentSceneIndex = 0,
  totalScenes = 1,
  onNextScene,
  onPreviousScene,
  autoAdvance = true,
  sceneTransitionDelay = 3,
}: FullscreenPlayerProps) {
  // ============================================================================
  // State
  // ============================================================================
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(initialTime)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showVolumeMixer, setShowVolumeMixer] = useState(false)
  const [trackVolumes, setTrackVolumes] = useState<TrackVolumes>(DEFAULT_VOLUMES)
  
  // Scene transition state
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionCountdown, setTransitionCountdown] = useState(0)
  
  // Ken Burns / Pan effect state
  const [panIntensity, setPanIntensity] = useState<PanIntensity>('subtle')
  const [showPanControls, setShowPanControls] = useState(false)
  
  // Refs for transition cancellation
  const transitionCancelledRef = useRef(false)
  
  // Load persisted settings on mount
  useEffect(() => {
    const savedVolumes = loadVolumeSettings()
    setTrackVolumes(savedVolumes)
    const savedPan = loadPanSettings()
    setPanIntensity(savedPan)
  }, [])
  
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
  // Get Volume for Track Type
  // ============================================================================
  const getVolumeForTrack = useCallback((trackType: string): number => {
    if (isMuted) return 0
    const master = trackVolumes.master
    switch (trackType) {
      case 'voiceover':
      case 'description':
        return trackVolumes.voiceover * master
      case 'dialogue':
        return trackVolumes.dialogue * master
      case 'music':
        return trackVolumes.music * master
      case 'sfx':
        return trackVolumes.sfx * master
      default:
        return master
    }
  }, [trackVolumes, isMuted])
  
  // ============================================================================
  // Update Volume and Persist
  // ============================================================================
  const updateTrackVolume = useCallback((track: keyof TrackVolumes, value: number) => {
    setTrackVolumes(prev => {
      const updated = { ...prev, [track]: value }
      saveVolumeSettings(updated)
      return updated
    })
  }, [])
  
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
  // Reactively Update Audio Volumes (fixes volume control not affecting playback)
  // ============================================================================
  useEffect(() => {
    audioRefs.current.forEach((audio, key) => {
      // Extract clip ID from key format "clipId:url"
      const clipId = key.split(':')[0]
      const clip = allAudioClips.find(c => c.id === clipId)
      if (clip) {
        audio.volume = getVolumeForTrack(clip.type)
      }
    })
  }, [trackVolumes, isMuted, allAudioClips, getVolumeForTrack])
  
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
  // Transition Countdown for Auto-Advance
  // ============================================================================
  const runTransitionCountdown = useCallback(async () => {
    transitionCancelledRef.current = false
    setIsTransitioning(true)
    setTransitionCountdown(sceneTransitionDelay)
    
    for (let i = sceneTransitionDelay; i > 0; i--) {
      if (transitionCancelledRef.current) {
        setIsTransitioning(false)
        setTransitionCountdown(0)
        return
      }
      setTransitionCountdown(i)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    setIsTransitioning(false)
    setTransitionCountdown(0)
    
    // Final check before advancing
    if (!transitionCancelledRef.current && onNextScene) {
      onNextScene()
    }
  }, [sceneTransitionDelay, onNextScene])
  
  // Cancel transition on close
  const handleClose = useCallback(() => {
    transitionCancelledRef.current = true
    setIsTransitioning(false)
    setTransitionCountdown(0)
    onClose()
  }, [onClose])
  
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
          
          // Auto-advance to next scene with transition countdown
          if (autoAdvance && onNextScene && currentSceneIndex < totalScenes - 1) {
            runTransitionCountdown()
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
            // Apply per-track volume
            audio.volume = getVolumeForTrack(clip.type)
            
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
  }, [isPlaying, currentTime, sceneDuration, allAudioClips, getVolumeForTrack, getCurrentVisualClip, onPlayheadChange])
  
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
  // Scene Navigation (cancel transition on manual navigation)
  // ============================================================================
  const goToPreviousScene = useCallback(() => {
    transitionCancelledRef.current = true
    setIsTransitioning(false)
    setTransitionCountdown(0)
    onPreviousScene?.()
  }, [onPreviousScene])
  
  const goToNextScene = useCallback(() => {
    transitionCancelledRef.current = true
    setIsTransitioning(false)
    setTransitionCountdown(0)
    onNextScene?.()
  }, [onNextScene])
  
  // ============================================================================
  // Update Pan Intensity
  // ============================================================================
  const updatePanIntensity = useCallback((intensity: PanIntensity) => {
    setPanIntensity(intensity)
    savePanSettings(intensity)
  }, [])
  
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
          handleClose()
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
        case 'PageUp':
        case '[':
          e.preventDefault()
          goToPreviousScene()
          break
        case 'PageDown':
        case ']':
          e.preventDefault()
          goToNextScene()
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlayback, handleClose, seekTo, currentTime, goToPreviousScene, goToNextScene])
  
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
      {/* Ken Burns Animation Styles */}
      <style jsx>{`
        @keyframes kenburns-pan {
          0% {
            transform: scale(${PAN_SETTINGS[panIntensity].scale}) translate(0%, 0%);
          }
          100% {
            transform: scale(${PAN_SETTINGS[panIntensity].scale}) translate(${PAN_SETTINGS[panIntensity].translate}%, ${PAN_SETTINGS[panIntensity].translate * 0.5}%);
          }
        }
        .kenburns-animated {
          animation: kenburns-pan ${PAN_SETTINGS[panIntensity].duration}s ease-in-out infinite alternate;
          transform-origin: center center;
          will-change: transform;
        }
      `}</style>
      
      {/* Image Display - Full Screen with Ken Burns */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {currentClip?.thumbnailUrl ? (
          <img
            src={currentClip.thumbnailUrl}
            alt={`Segment ${currentClipIndex + 1}`}
            className={`w-full h-full object-cover ${panIntensity !== 'off' ? 'kenburns-animated' : ''}`}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <span>No image available</span>
          </div>
        )}
      </div>
      
      {/* Scene Transition Countdown Overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 rounded-2xl px-8 py-6 flex flex-col items-center gap-3 backdrop-blur-sm border border-white/10">
            <div className="text-white/80 text-sm font-medium">Next scene in</div>
            <div className="text-white text-5xl font-bold tabular-nums">
              {transitionCountdown}
            </div>
            <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(transitionCountdown / sceneTransitionDelay) * 100}%` }}
              />
            </div>
            <button
              onClick={() => {
                transitionCancelledRef.current = true
                setIsTransitioning(false)
                setTransitionCountdown(0)
              }}
              className="mt-2 text-white/60 text-xs hover:text-white transition-colors pointer-events-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ cursor: showControls ? 'auto' : 'none' }}
      >
        {/* Top Bar - Close Button + Scene Info */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
          
          {/* Scene indicator */}
          {totalScenes > 1 && (
            <div className="text-white/80 text-sm">
              Scene {currentSceneIndex + 1} of {totalScenes}
            </div>
          )}
          
          <div className="w-10" /> {/* Spacer for balance */}
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
            <div className="text-white text-sm font-mono min-w-[120px]">
              {formatTime(currentTime)} / {formatTime(sceneDuration)}
            </div>
            
            {/* Center: Playback Controls */}
            <div className="flex items-center gap-2">
              {/* Previous Scene */}
              {onPreviousScene && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousScene}
                  disabled={currentSceneIndex <= 0}
                  className="text-white hover:bg-white/20 disabled:opacity-30"
                  title="Previous Scene"
                >
                  <ChevronsLeft className="h-5 w-5" />
                </Button>
              )}
              
              {/* Previous Segment */}
              <Button
                variant="ghost"
                size="icon"
                onClick={skipToPreviousSegment}
                className="text-white hover:bg-white/20"
                title="Previous Segment"
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              
              {/* Play/Pause */}
              <button
                onClick={togglePlayback}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors mx-2"
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7 ml-1" />
                )}
              </button>
              
              {/* Next Segment */}
              <Button
                variant="ghost"
                size="icon"
                onClick={skipToNextSegment}
                className="text-white hover:bg-white/20"
                title="Next Segment"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
              
              {/* Next Scene */}
              {onNextScene && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextScene}
                  disabled={currentSceneIndex >= totalScenes - 1}
                  className="text-white hover:bg-white/20 disabled:opacity-30"
                  title="Next Scene"
                >
                  <ChevronsRight className="h-5 w-5" />
                </Button>
              )}
            </div>
            
            {/* Right: Pan Controls + Volume Controls + Segment Info */}
            <div className="flex items-center gap-2 min-w-[200px] justify-end">
              {/* Pan/Ken Burns Control */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPanControls(v => !v)}
                className={`text-white hover:bg-white/20 ${showPanControls ? 'bg-white/20' : ''}`}
                title="Pan Effect (Ken Burns)"
              >
                <Move className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowVolumeMixer(v => !v)}
                className={`text-white hover:bg-white/20 ${showVolumeMixer ? 'bg-white/20' : ''}`}
                title="Volume Mixer"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(m => !m)}
                className="text-white hover:bg-white/20"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              
              <span className="text-white text-sm ml-2">
                {currentClipIndex + 1} / {visualClips.length}
              </span>
            </div>
          </div>
        </div>
        
        {/* Volume Mixer Panel */}
        {showVolumeMixer && (
          <div 
            className="absolute bottom-32 right-4 bg-gray-900/95 backdrop-blur-sm rounded-lg p-4 w-72 shadow-xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Volume Mixer
            </div>
            
            {/* Master Volume */}
            <div className="mb-4 pb-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Volume2 className="h-4 w-4" />
                  Master
                </div>
                <span className="text-gray-400 text-xs">{Math.round(trackVolumes.master * 100)}%</span>
              </div>
              <Slider
                value={[trackVolumes.master]}
                max={1}
                step={0.01}
                onValueChange={(v) => updateTrackVolume('master', v[0])}
                className="w-full"
              />
            </div>
            
            {/* Voiceover/Narration */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Mic className="h-4 w-4" />
                  Narration
                </div>
                <span className="text-gray-400 text-xs">{Math.round(trackVolumes.voiceover * 100)}%</span>
              </div>
              <Slider
                value={[trackVolumes.voiceover]}
                max={1}
                step={0.01}
                onValueChange={(v) => updateTrackVolume('voiceover', v[0])}
                className="w-full"
              />
            </div>
            
            {/* Dialogue */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-purple-400 text-sm">
                  <MessageSquare className="h-4 w-4" />
                  Dialogue
                </div>
                <span className="text-gray-400 text-xs">{Math.round(trackVolumes.dialogue * 100)}%</span>
              </div>
              <Slider
                value={[trackVolumes.dialogue]}
                max={1}
                step={0.01}
                onValueChange={(v) => updateTrackVolume('dialogue', v[0])}
                className="w-full"
              />
            </div>
            
            {/* Music */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-orange-400 text-sm">
                  <Music className="h-4 w-4" />
                  Music
                </div>
                <span className="text-gray-400 text-xs">{Math.round(trackVolumes.music * 100)}%</span>
              </div>
              <Slider
                value={[trackVolumes.music]}
                max={1}
                step={0.01}
                onValueChange={(v) => updateTrackVolume('music', v[0])}
                className="w-full"
              />
            </div>
            
            {/* SFX */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <Zap className="h-4 w-4" />
                  Sound Effects
                </div>
                <span className="text-gray-400 text-xs">{Math.round(trackVolumes.sfx * 100)}%</span>
              </div>
              <Slider
                value={[trackVolumes.sfx]}
                max={1}
                step={0.01}
                onValueChange={(v) => updateTrackVolume('sfx', v[0])}
                className="w-full"
              />
            </div>
            
            {/* Reset Button */}
            <button
              onClick={() => {
                setTrackVolumes(DEFAULT_VOLUMES)
                saveVolumeSettings(DEFAULT_VOLUMES)
              }}
              className="mt-4 w-full text-center text-gray-400 text-xs hover:text-white transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        )}
        
        {/* Pan/Ken Burns Control Panel */}
        {showPanControls && (
          <div 
            className="absolute bottom-32 right-20 bg-gray-900/95 backdrop-blur-sm rounded-lg p-4 w-56 shadow-xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              <Move className="h-4 w-4" />
              Pan Effect
            </div>
            
            <div className="space-y-2">
              {(['off', 'subtle', 'medium', 'dramatic'] as PanIntensity[]).map((intensity) => (
                <button
                  key={intensity}
                  onClick={() => updatePanIntensity(intensity)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    panIntensity === intensity 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{intensity}</span>
                    {intensity !== 'off' && (
                      <span className="text-xs text-gray-400">
                        {PAN_SETTINGS[intensity].duration}s
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {intensity === 'off' && 'No motion'}
                    {intensity === 'subtle' && 'Gentle, slow drift'}
                    {intensity === 'medium' && 'Moderate movement'}
                    {intensity === 'dramatic' && 'Strong, cinematic'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FullscreenPlayer
