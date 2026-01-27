'use client'

/**
 * useTimelinePlayback - Shared playback hook for Screening Room and Timeline
 * 
 * Provides unified timing logic that keeps audio and visual frames synchronized.
 * Uses the same approach as SceneTimelineV2:
 * 1. requestAnimationFrame loop for smooth playhead updates
 * 2. HTMLAudioElement per clip for direct seeking/drift correction
 * 3. Single source of truth for currentTime
 * 
 * Features:
 * - Per-track volume and mute controls
 * - Drift correction (resyncs if audio drifts > 0.2s)
 * - Seeking to arbitrary positions
 * - Multi-track support (voiceover, dialogue, music, sfx)
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface AudioClip {
  id: string
  url: string
  startTime: number       // When clip starts in scene timeline (seconds)
  duration: number        // Clip duration (seconds)
  trimStart?: number      // Offset into the audio file (seconds)
  trackType: 'voiceover' | 'dialogue' | 'music' | 'sfx'
  label?: string          // e.g., character name for dialogue
  loop?: boolean          // For background music
}

export interface VisualClip {
  id: string
  segmentId: string
  startTime: number       // When segment starts in timeline
  duration: number        // Segment duration
  thumbnailUrl?: string   // Start frame
  endThumbnailUrl?: string // End frame (optional)
}

export interface TrackVolumes {
  voiceover: number
  dialogue: number
  music: number
  sfx: number
}

export interface TrackEnabled {
  voiceover: boolean
  dialogue: boolean
  music: boolean
  sfx: boolean
}

export interface UseTimelinePlaybackOptions {
  sceneDuration: number
  audioClips: AudioClip[]
  visualClips: VisualClip[]
  initialVolumes?: Partial<TrackVolumes>
  initialEnabled?: Partial<TrackEnabled>
  onPlaybackEnd?: () => void
  onTimeUpdate?: (time: number, segmentId?: string) => void
}

export interface UseTimelinePlaybackReturn {
  // State
  isPlaying: boolean
  currentTime: number
  currentVisualClip: VisualClip | undefined
  displayFrameUrl: string | undefined
  trackVolumes: TrackVolumes
  trackEnabled: TrackEnabled
  audioRefs: React.MutableRefObject<Map<string, HTMLAudioElement>>
  
  // Controls
  play: () => void
  pause: () => void
  togglePlayback: () => void
  seekTo: (time: number) => void
  setTrackVolume: (track: keyof TrackVolumes, volume: number) => void
  setTrackEnabled: (track: keyof TrackEnabled, enabled: boolean) => void
  reset: () => void
}

// ============================================================================
// Constants
// ============================================================================

const DRIFT_THRESHOLD = 0.2 // Resync audio if drifts more than 200ms

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTimelinePlayback({
  sceneDuration,
  audioClips,
  visualClips,
  initialVolumes = {},
  initialEnabled = {},
  onPlaybackEnd,
  onTimeUpdate,
}: UseTimelinePlaybackOptions): UseTimelinePlaybackReturn {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  
  // Track controls
  const [trackVolumes, setTrackVolumes] = useState<TrackVolumes>({
    voiceover: initialVolumes.voiceover ?? 1,
    dialogue: initialVolumes.dialogue ?? 1,
    music: initialVolumes.music ?? 0.3,
    sfx: initialVolumes.sfx ?? 1,
  })
  
  const [trackEnabled, setTrackEnabledState] = useState<TrackEnabled>({
    voiceover: initialEnabled.voiceover ?? true,
    dialogue: initialEnabled.dialogue ?? true,
    music: initialEnabled.music ?? true,
    sfx: initialEnabled.sfx ?? true,
  })
  
  // Refs for animation and timing
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  
  // ============================================================================
  // Audio Element Management
  // ============================================================================
  
  // Create/update audio elements for clips
  useEffect(() => {
    const existingKeys = new Set(audioRefs.current.keys())
    const neededKeys = new Set<string>()
    
    audioClips.forEach(clip => {
      const key = `${clip.id}:${clip.url}`
      neededKeys.add(key)
      
      if (!audioRefs.current.has(key)) {
        const audio = new Audio(clip.url)
        audio.preload = 'auto'
        audio.loop = clip.loop ?? false
        audioRefs.current.set(key, audio)
      }
    })
    
    // Remove stale audio elements
    existingKeys.forEach(key => {
      if (!neededKeys.has(key)) {
        const audio = audioRefs.current.get(key)
        if (audio) {
          audio.pause()
          audio.src = ''
        }
        audioRefs.current.delete(key)
      }
    })
  }, [audioClips])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      audioRefs.current.forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      audioRefs.current.clear()
    }
  }, [])
  
  // ============================================================================
  // Visual Clip Selection
  // ============================================================================
  
  const getCurrentVisualClip = useCallback((time: number): VisualClip | undefined => {
    for (const clip of visualClips) {
      if (time >= clip.startTime && time < clip.startTime + clip.duration) {
        return clip
      }
    }
    // Return last clip if past all clips
    return visualClips[visualClips.length - 1]
  }, [visualClips])
  
  const currentVisualClip = useMemo(
    () => getCurrentVisualClip(currentTime),
    [getCurrentVisualClip, currentTime]
  )
  
  // Display frame URL - switches between start/end at half duration
  const displayFrameUrl = useMemo((): string | undefined => {
    if (!currentVisualClip) return undefined
    
    const positionInClip = currentTime - currentVisualClip.startTime
    const halfDuration = currentVisualClip.duration / 2
    
    if (positionInClip < halfDuration) {
      return currentVisualClip.thumbnailUrl
    } else {
      return currentVisualClip.endThumbnailUrl || currentVisualClip.thumbnailUrl
    }
  }, [currentVisualClip, currentTime])
  
  // ============================================================================
  // Animation Loop (Core Timing Logic)
  // ============================================================================
  
  const animate = useCallback(() => {
    const elapsed = (performance.now() - startTimeRef.current) / 1000
    
    // Check if playback should end
    if (elapsed >= sceneDuration) {
      setCurrentTime(0)
      setIsPlaying(false)
      
      // Stop all audio
      audioRefs.current.forEach(audio => {
        audio.pause()
        audio.currentTime = 0
      })
      
      onPlaybackEnd?.()
      return
    }
    
    setCurrentTime(elapsed)
    
    // Sync audio clips with drift correction
    audioClips.forEach(clip => {
      const key = `${clip.id}:${clip.url}`
      const audio = audioRefs.current.get(key)
      if (!audio) return
      
      const isEnabled = trackEnabled[clip.trackType]
      const volume = trackVolumes[clip.trackType]
      
      // Apply volume (0 if track disabled)
      audio.volume = isEnabled ? volume : 0
      
      if (!isEnabled) {
        if (!audio.paused) audio.pause()
        return
      }
      
      const clipStart = clip.startTime
      const clipEnd = clip.startTime + clip.duration
      
      // Check if current time is within this clip's range
      if (elapsed >= clipStart && elapsed < clipEnd) {
        const audioTime = elapsed - clipStart + (clip.trimStart || 0)
        
        if (audio.paused) {
          // Start playing from correct position
          audio.currentTime = audioTime
          audio.play().catch(() => {
            // Ignore autoplay errors - user hasn't interacted yet
          })
        } else {
          // Check for drift and correct if needed
          const drift = Math.abs(audio.currentTime - audioTime)
          if (drift > DRIFT_THRESHOLD) {
            audio.currentTime = audioTime
          }
        }
      } else if (!audio.paused) {
        // Clip not in range, pause it
        audio.pause()
      }
    })
    
    // Notify listeners
    const clip = getCurrentVisualClip(elapsed)
    onTimeUpdate?.(elapsed, clip?.segmentId)
    
    // Continue animation loop
    animationRef.current = requestAnimationFrame(animate)
  }, [sceneDuration, audioClips, trackEnabled, trackVolumes, getCurrentVisualClip, onPlaybackEnd, onTimeUpdate])
  
  // ============================================================================
  // Playback Controls
  // ============================================================================
  
  const play = useCallback(() => {
    if (isPlaying) return
    
    // Anchor start time to current position
    startTimeRef.current = performance.now() - currentTime * 1000
    setIsPlaying(true)
    animationRef.current = requestAnimationFrame(animate)
  }, [isPlaying, currentTime, animate])
  
  const pause = useCallback(() => {
    if (!isPlaying) return
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    // Pause all audio
    audioRefs.current.forEach(audio => audio.pause())
    setIsPlaying(false)
  }, [isPlaying])
  
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])
  
  const seekTo = useCallback((time: number) => {
    const newTime = Math.max(0, Math.min(sceneDuration, time))
    setCurrentTime(newTime)
    startTimeRef.current = performance.now() - newTime * 1000
    
    // If playing, audio will resync on next animate frame
    // If paused, seek audio elements directly
    if (!isPlaying) {
      audioClips.forEach(clip => {
        const key = `${clip.id}:${clip.url}`
        const audio = audioRefs.current.get(key)
        if (!audio) return
        
        const clipStart = clip.startTime
        const clipEnd = clip.startTime + clip.duration
        
        if (newTime >= clipStart && newTime < clipEnd) {
          audio.currentTime = newTime - clipStart + (clip.trimStart || 0)
        }
      })
    }
    
    onTimeUpdate?.(newTime, getCurrentVisualClip(newTime)?.segmentId)
  }, [sceneDuration, isPlaying, audioClips, getCurrentVisualClip, onTimeUpdate])
  
  const reset = useCallback(() => {
    pause()
    setCurrentTime(0)
    startTimeRef.current = performance.now()
    
    audioRefs.current.forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })
  }, [pause])
  
  // ============================================================================
  // Track Volume/Enable Controls
  // ============================================================================
  
  const setTrackVolume = useCallback((track: keyof TrackVolumes, volume: number) => {
    setTrackVolumes(prev => ({
      ...prev,
      [track]: Math.max(0, Math.min(1, volume)),
    }))
  }, [])
  
  const setTrackEnabled = useCallback((track: keyof TrackEnabled, enabled: boolean) => {
    setTrackEnabledState(prev => ({
      ...prev,
      [track]: enabled,
    }))
  }, [])
  
  // ============================================================================
  // Effect: Stop animation when component using this unmounts or deps change
  // ============================================================================
  
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])
  
  // ============================================================================
  // Return
  // ============================================================================
  
  return {
    // State
    isPlaying,
    currentTime,
    currentVisualClip,
    displayFrameUrl,
    trackVolumes,
    trackEnabled,
    audioRefs,
    
    // Controls
    play,
    pause,
    togglePlayback,
    seekTo,
    setTrackVolume,
    setTrackEnabled,
    reset,
  }
}

// ============================================================================
// Utility: Convert segment data to VisualClip format
// ============================================================================

export function segmentsToVisualClips(
  segments: Array<{
    segmentId: string
    startTime?: number
    endTime?: number
    startFrameUrl?: string
    endFrameUrl?: string
    references?: {
      startFrameUrl?: string
      endFrameUrl?: string
    }
  }>,
  sceneDuration: number
): VisualClip[] {
  if (!segments || segments.length === 0) {
    return []
  }
  
  return segments.map((segment, index) => {
    // Get timing from segment bounds or distribute evenly
    const hasValidTiming = (segment.startTime ?? 0) > 0 || (segment.endTime ?? 0) > 0
    
    let startTime: number
    let duration: number
    
    if (hasValidTiming) {
      startTime = segment.startTime ?? 0
      duration = (segment.endTime ?? sceneDuration) - startTime
    } else {
      // Distribute evenly across scene duration
      const perSegmentDuration = sceneDuration / segments.length
      startTime = index * perSegmentDuration
      duration = perSegmentDuration
    }
    
    // Get frame URLs from multiple possible locations
    const thumbnailUrl = segment.startFrameUrl || segment.references?.startFrameUrl
    const endThumbnailUrl = segment.endFrameUrl || segment.references?.endFrameUrl
    
    return {
      id: `visual-${segment.segmentId}`,
      segmentId: segment.segmentId,
      startTime,
      duration,
      thumbnailUrl,
      endThumbnailUrl,
    }
  })
}

// ============================================================================
// Utility: Convert audio track data to AudioClip format
// ============================================================================

export interface AudioTracksInput {
  voiceover?: Array<{ id?: string; url: string; startTime: number; duration: number; label?: string }>
  dialogue?: Array<{ id?: string; url: string; startTime: number; duration: number; label?: string }>
  music?: Array<{ id?: string; url: string; startTime: number; duration: number; loop?: boolean }>
  sfx?: Array<{ id?: string; url: string; startTime: number; duration: number }>
}

export function audioTracksToClips(tracks: AudioTracksInput): AudioClip[] {
  const clips: AudioClip[] = []
  
  // Voiceover (narration)
  tracks.voiceover?.forEach((clip, index) => {
    if (clip.url) {
      clips.push({
        id: clip.id || `vo-${index}`,
        url: clip.url,
        startTime: clip.startTime,
        duration: clip.duration,
        trackType: 'voiceover',
        label: clip.label,
      })
    }
  })
  
  // Dialogue
  tracks.dialogue?.forEach((clip, index) => {
    if (clip.url) {
      clips.push({
        id: clip.id || `dialogue-${index}`,
        url: clip.url,
        startTime: clip.startTime,
        duration: clip.duration,
        trackType: 'dialogue',
        label: clip.label,
      })
    }
  })
  
  // Music
  tracks.music?.forEach((clip, index) => {
    if (clip.url) {
      clips.push({
        id: clip.id || `music-${index}`,
        url: clip.url,
        startTime: clip.startTime,
        duration: clip.duration,
        trackType: 'music',
        loop: clip.loop,
      })
    }
  })
  
  // SFX
  tracks.sfx?.forEach((clip, index) => {
    if (clip.url) {
      clips.push({
        id: clip.id || `sfx-${index}`,
        url: clip.url,
        startTime: clip.startTime,
        duration: clip.duration,
        trackType: 'sfx',
      })
    }
  })
  
  return clips
}
