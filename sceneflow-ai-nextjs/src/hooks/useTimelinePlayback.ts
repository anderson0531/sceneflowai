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
import {
  computeMusicIntroFadeMultiplier,
  type MusicIntroFadeConfig,
} from '@/lib/storyboard/musicIntroFade'
import {
  computeClipAudioTime,
  loopingDrift,
} from '@/lib/audio/loopingAudioSync'

// ============================================================================
// Types
// ============================================================================

export interface AudioClip {
  id: string
  url: string
  startTime: number       // When clip starts in scene timeline (seconds)
  duration: number        // Clip duration (seconds)
  trimStart?: number      // Offset into the audio file (seconds)
  /** For music: scene start time for intro fade (defaults to clip startTime). */
  fadeAnchorTime?: number
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
  musicIntroFade?: MusicIntroFadeConfig
  /**
   * Per-frame multiplier (0–1) for music and SFX, evaluated inside the
   * animation loop. Callers that duck the score under a fade to black supply it
   * here instead of writing a track volume every frame, which would re-render
   * the whole player 60 times a second.
   */
  trackDuck?: (elapsed: number) => number
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

/** Whether a clip should be playing at the given timeline position. */
function isClipPlaybackActive(
  clip: AudioClip,
  elapsed: number,
  sceneDuration: number
): boolean {
  if (elapsed < clip.startTime) return false

  const clipEnd = clip.startTime + clip.duration
  if (clip.loop && clip.trackType === 'music') {
    // Merged scene music: keep looping for the full scene (matches FullscreenPlayer).
    if (clip.id === 'music-scene' || clip.id === 'music') {
      return elapsed < sceneDuration
    }
    // Split runs (disabled beat gap): still respect the run window.
    return elapsed < clipEnd
  }

  return elapsed < clipEnd
}

/** Ducking follows the picture, so it covers the score and the effects on it. */
function isDuckedTrack(trackType: AudioClip['trackType']): boolean {
  return trackType === 'music' || trackType === 'sfx'
}

/** A clip's URL can change under a stable id, so both belong in the key. */
function audioClipKey(clip: AudioClip): string {
  return `${clip.id}:${clip.url}`
}

function releaseAudioElement(audio: HTMLAudioElement): void {
  audio.pause()
  audio.loop = false
  audio.src = ''
  // Clearing the source alone leaves the buffered data; the reload drops it.
  audio.load()
}

function computeEffectiveClipVolume(
  clip: AudioClip,
  elapsed: number,
  baseVolume: number,
  musicIntroFade: MusicIntroFadeConfig | undefined,
  duck = 1
): number {
  const duckedVolume = isDuckedTrack(clip.trackType) ? baseVolume * duck : baseVolume
  if (clip.trackType !== 'music' || !musicIntroFade?.enabled) {
    return duckedVolume
  }
  const fadeAnchor = clip.fadeAnchorTime ?? clip.startTime
  const sinceFadeStart = elapsed - fadeAnchor
  const multiplier = computeMusicIntroFadeMultiplier(sinceFadeStart, musicIntroFade)
  return duckedVolume * multiplier
}

function syncAudioClipAtTime(
  clip: AudioClip,
  elapsed: number,
  audio: HTMLAudioElement,
  trackEnabled: TrackEnabled,
  trackVolumes: TrackVolumes,
  musicIntroFade: MusicIntroFadeConfig | undefined,
  sceneDuration: number,
  duck = 1
): void {
  const isEnabled = trackEnabled[clip.trackType]
  const baseVolume = trackVolumes[clip.trackType]

  if (!isEnabled || !isClipPlaybackActive(clip, elapsed, sceneDuration)) {
    audio.volume = 0
    return
  }

  audio.volume = computeEffectiveClipVolume(clip, elapsed, baseVolume, musicIntroFade, duck)
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTimelinePlayback({
  sceneDuration,
  audioClips,
  visualClips,
  initialVolumes = {},
  initialEnabled = {},
  musicIntroFade,
  trackDuck,
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
  /** Bumps when a clip is stopped so a stale audio.play() promise cannot restart it. */
  const playGenerationRef = useRef<Map<string, number>>(new Map())
  
  // Refs to avoid recreating animate callback (prevents infinite loops)
  const trackVolumesRef = useRef(trackVolumes)
  const trackEnabledRef = useRef(trackEnabled)
  const audioClipsRef = useRef(audioClips)
  const sceneDurationRef = useRef(sceneDuration)
  const onPlaybackEndRef = useRef(onPlaybackEnd)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const musicIntroFadeRef = useRef(musicIntroFade)
  const trackDuckRef = useRef(trackDuck)
  
  // Refs for play/pause stability - prevents callback recreation on every currentTime change
  const isPlayingRef = useRef(isPlaying)
  const currentTimeRef = useRef(currentTime)
  
  // Keep refs in sync with state/props
  useEffect(() => { trackVolumesRef.current = trackVolumes }, [trackVolumes])
  useEffect(() => { trackEnabledRef.current = trackEnabled }, [trackEnabled])
  useEffect(() => { audioClipsRef.current = audioClips }, [audioClips])
  useEffect(() => { sceneDurationRef.current = sceneDuration }, [sceneDuration])
  useEffect(() => { onPlaybackEndRef.current = onPlaybackEnd }, [onPlaybackEnd])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])
  useEffect(() => { musicIntroFadeRef.current = musicIntroFade }, [musicIntroFade])
  useEffect(() => { trackDuckRef.current = trackDuck }, [trackDuck])

  const applyVolumesAtElapsed = useCallback((elapsed: number) => {
    const currentAudioClips = audioClipsRef.current
    const currentTrackEnabled = trackEnabledRef.current
    const currentTrackVolumes = trackVolumesRef.current
    const fadeConfig = musicIntroFadeRef.current
    const duck = trackDuckRef.current?.(elapsed) ?? 1

    currentAudioClips.forEach((clip) => {
      const key = audioClipKey(clip)
      const audio = audioRefs.current.get(key)
      if (!audio) return
      syncAudioClipAtTime(
        clip,
        elapsed,
        audio,
        currentTrackEnabled,
        currentTrackVolumes,
        fadeConfig,
        sceneDurationRef.current,
        duck
      )
    })
  }, [])
  
  // ============================================================================
  // Audio Element Management
  // ============================================================================
  
  const ensureAudioElement = useCallback((clip: AudioClip): HTMLAudioElement => {
    const key = audioClipKey(clip)
    const existing = audioRefs.current.get(key)
    if (existing) {
      existing.loop = clip.loop ?? false
      return existing
    }
    const audio = new Audio(clip.url)
    audio.preload = 'auto'
    audio.loop = clip.loop ?? false
    audioRefs.current.set(key, audio)
    return audio
  }, [])

  /** Drops every element; the bumped token stops an in-flight play() promise. */
  const releaseAllAudio = useCallback(() => {
    audioRefs.current.forEach((audio, key) => {
      playGenerationRef.current.set(key, (playGenerationRef.current.get(key) ?? 0) + 1)
      releaseAudioElement(audio)
    })
    audioRefs.current.clear()
  }, [])

  // Create/update audio elements for clips
  useEffect(() => {
    const neededKeys = new Set(audioClips.map(audioClipKey))
    audioClips.forEach(ensureAudioElement)
    
    // Remove stale audio elements
    Array.from(audioRefs.current.keys()).forEach(key => {
      if (neededKeys.has(key)) return
      const audio = audioRefs.current.get(key)
      if (audio) releaseAudioElement(audio)
      audioRefs.current.delete(key)
      playGenerationRef.current.delete(key)
    })
  }, [audioClips, ensureAudioElement])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      releaseAllAudio()
    }
  }, [releaseAllAudio])

  /**
   * Swiping away an installed PWA — or just backgrounding the tab — normally
   * leaves the document alive, so React never unmounts and looping score plays
   * on with nothing on screen. Stop and drop the audio whenever the page goes
   * away, and rebuild the elements if the viewer returns. Never resume by
   * ourselves: the viewer pressed play on a player they can no longer see.
   */
  useEffect(() => {
    const stopForHiddenPage = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      releaseAllAudio()
      setIsPlaying(false)
    }

    const restoreAudioElements = () => {
      audioClipsRef.current.forEach(ensureAudioElement)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopForHiddenPage()
        return
      }
      restoreAudioElements()
    }

    window.addEventListener('pagehide', stopForHiddenPage)
    // Restores the elements a `pagehide` released when the page comes back out
    // of the back/forward cache.
    window.addEventListener('pageshow', restoreAudioElements)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', stopForHiddenPage)
      window.removeEventListener('pageshow', restoreAudioElements)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [ensureAudioElement, releaseAllAudio])
  
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
    
    // Read current values from refs to avoid stale closures
    const currentSceneDuration = sceneDurationRef.current
    const currentAudioClips = audioClipsRef.current
    const currentTrackEnabled = trackEnabledRef.current
    const currentTrackVolumes = trackVolumesRef.current
    const fadeConfig = musicIntroFadeRef.current
    const duck = trackDuckRef.current?.(elapsed) ?? 1
    
    // Check if playback should end
    if (elapsed >= currentSceneDuration) {
      setCurrentTime(0)
      setIsPlaying(false)
      
      // Stop all audio
      audioRefs.current.forEach(audio => {
        audio.pause()
        audio.currentTime = 0
      })
      
      onPlaybackEndRef.current?.()
      return
    }
    
    setCurrentTime(elapsed)
    
    // Sync audio clips with drift correction
    currentAudioClips.forEach(clip => {
      const key = audioClipKey(clip)
      const audio = audioRefs.current.get(key)
      if (!audio) return
      
      const isEnabled = currentTrackEnabled[clip.trackType]
      const baseVolume = currentTrackVolumes[clip.trackType]
      
      // Apply volume (0 if track disabled); music intro fade ramps per clip start
      audio.volume = isEnabled
        ? computeEffectiveClipVolume(clip, elapsed, baseVolume, fadeConfig, duck)
        : 0
      
      if (!isEnabled) {
        const nextGen = (playGenerationRef.current.get(key) ?? 0) + 1
        playGenerationRef.current.set(key, nextGen)
        audio.volume = 0
        if (!audio.paused) audio.pause()
        return
      }
      
      const currentSceneDuration = sceneDurationRef.current

      // Check if current time is within this clip's active window
      if (isClipPlaybackActive(clip, elapsed, currentSceneDuration)) {
        const audioDuration = audio.duration
        const audioTime = computeClipAudioTime(clip, elapsed, audioDuration)
        
        if (audio.paused) {
          // Start playing from correct position; token guards against stale play().
          const nextGen = (playGenerationRef.current.get(key) ?? 0) + 1
          playGenerationRef.current.set(key, nextGen)
          const thisGen = nextGen
          audio.currentTime = audioTime
          audio.play()
            .then(() => {
              if (playGenerationRef.current.get(key) !== thisGen) {
                audio.volume = 0
                audio.pause()
              }
            })
            .catch(() => {
              // Ignore autoplay errors - user hasn't interacted yet
            })
        } else {
          // Check for drift and correct if needed
          const drift = clip.loop
            ? loopingDrift(audioTime, audio.currentTime, audioDuration)
            : Math.abs(audio.currentTime - audioTime)
          if (drift > DRIFT_THRESHOLD) {
            audio.currentTime = audioTime
          }
        }
      } else {
        // Clip not in range — silence then pause; invalidate in-flight play().
        const nextGen = (playGenerationRef.current.get(key) ?? 0) + 1
        playGenerationRef.current.set(key, nextGen)
        audio.volume = 0
        if (!audio.paused) audio.pause()
      }
    })
    
    // Notify listeners
    const clip = getCurrentVisualClip(elapsed)
    onTimeUpdateRef.current?.(elapsed, clip?.segmentId)
    
    // Continue animation loop
    animationRef.current = requestAnimationFrame(animate)
  }, [getCurrentVisualClip]) // Only stable dependency
  
  // ============================================================================
  // Playback Controls
  // ============================================================================
  
  const play = useCallback(() => {
    if (isPlayingRef.current) return
    
    // Anchor start time to current position
    startTimeRef.current = performance.now() - currentTimeRef.current * 1000
    setIsPlaying(true)
    animationRef.current = requestAnimationFrame(animate)
  }, [animate]) // Only depends on animate which is stable
  
  const pause = useCallback(() => {
    if (!isPlayingRef.current) return
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    // Pause all audio
    audioRefs.current.forEach(audio => audio.pause())
    setIsPlaying(false)
  }, []) // No dependencies - uses refs
  
  const togglePlayback = useCallback(() => {
    if (isPlayingRef.current) {
      pause()
    } else {
      play()
    }
  }, [play, pause])
  
  const seekTo = useCallback((time: number) => {
    const currentSceneDuration = sceneDurationRef.current
    const newTime = Math.max(0, Math.min(currentSceneDuration, time))
    setCurrentTime(newTime)
    startTimeRef.current = performance.now() - newTime * 1000
    
    // If playing, audio will resync on next animate frame
    // If paused, seek audio elements directly
    if (!isPlayingRef.current) {
      audioClipsRef.current.forEach(clip => {
        const key = audioClipKey(clip)
        const audio = audioRefs.current.get(key)
        if (!audio) return
        
        const clipStart = clip.startTime
        const clipEnd = clip.startTime + clip.duration
        
        if (newTime >= clipStart && newTime < clipEnd) {
          const audioDuration = audio.duration
          audio.currentTime = computeClipAudioTime(clip, newTime, audioDuration)
        }
      })
      applyVolumesAtElapsed(newTime)
    }
    
    onTimeUpdateRef.current?.(newTime, getCurrentVisualClip(newTime)?.segmentId)
  }, [getCurrentVisualClip, applyVolumesAtElapsed]) // Only stable dependency - uses refs for isPlaying
  
  // Refresh volumes when paused and fade/volume settings change
  useEffect(() => {
    if (!isPlayingRef.current) {
      applyVolumesAtElapsed(currentTimeRef.current)
    }
  }, [trackVolumes, trackEnabled, musicIntroFade, applyVolumesAtElapsed])
  
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
  
  // Both bail out on an unchanged value so a repeated set does not allocate new
  // track state and re-render the player for nothing.
  const setTrackVolume = useCallback((track: keyof TrackVolumes, volume: number) => {
    const next = Math.max(0, Math.min(1, volume))
    setTrackVolumes(prev => (prev[track] === next ? prev : { ...prev, [track]: next }))
  }, [])
  
  const setTrackEnabled = useCallback((track: keyof TrackEnabled, enabled: boolean) => {
    setTrackEnabledState(prev => (prev[track] === enabled ? prev : { ...prev, [track]: enabled }))
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
  
  // Filter out any undefined or invalid segments
  const validSegments = segments.filter((s): s is typeof segments[number] => 
    s != null && typeof s.segmentId === 'string'
  )
  
  return validSegments.map((segment, index) => {
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
