'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Mic, Music, Zap, SkipBack, SkipForward, X, RotateCcw, Pencil, AlertTriangle, Layers, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

export interface SegmentClip {
  segmentId: string
  startTime: number
  endTime: number
  duration: number
  label?: string
  sequenceIndex: number
}

export interface AudioTrackClip {
  id: string
  url?: string
  startTime: number  // In seconds, relative to scene start
  duration: number   // In seconds
  label?: string     // e.g., character name for dialogue, description for SFX
  volume?: number    // 0-1
  isStale?: boolean  // True if audio doesn't match current dialogue
  staleReason?: string  // Human-readable reason for stale status
}

export interface AudioTracksData {
  voiceover?: AudioTrackClip[]  // Array to support Description + Narration
  dialogue?: AudioTrackClip[]
  music?: AudioTrackClip[]      // Array to support multiple music clips
  sfx?: AudioTrackClip[]
}

interface AudioTimelineProps {
  sceneDuration: number  // Total scene duration in seconds
  segments?: Array<{ startTime: number; endTime: number; segmentId: string; sequenceIndex?: number }>
  audioTracks?: AudioTracksData
  selectedSegmentId?: string | null  // Externally controlled segment selection
  onSegmentSelect?: (segmentId: string | null) => void  // Callback when segment is selected
  onPlayheadChange?: (time: number) => void
  onTrackUpdate?: (trackType: keyof AudioTracksData, clips: AudioTrackClip | AudioTrackClip[]) => void
  onAudioClipChange?: (trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => void
  onSegmentChange?: (segmentId: string, changes: { startTime?: number; duration?: number }) => void
  onAudioError?: (clipId: string, url: string) => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
}

export function AudioTimeline({
  sceneDuration,
  segments = [],
  audioTracks,
  selectedSegmentId: externalSelectedSegmentId,
  onSegmentSelect,
  onPlayheadChange,
  onTrackUpdate,
  onAudioClipChange,
  onSegmentChange,
  onAudioError,
}: AudioTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  
  // Per-clip selection state (for audio)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [selectedClipTrackType, setSelectedClipTrackType] = useState<string | null>(null)
  
  // Segment selection - use external if provided, otherwise internal
  const [internalSelectedSegmentId, setInternalSelectedSegmentId] = useState<string | null>(null)
  const selectedSegmentId = externalSelectedSegmentId !== undefined ? externalSelectedSegmentId : internalSelectedSegmentId
  
  const handleSegmentSelect = useCallback((segmentId: string | null) => {
    if (onSegmentSelect) {
      onSegmentSelect(segmentId)
    } else {
      setInternalSelectedSegmentId(segmentId)
    }
  }, [onSegmentSelect])
  
  // Audio snap toggle - persisted to localStorage
  const [enableAudioSnap, setEnableAudioSnap] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sceneflow-audio-snap-enabled')
      return saved === 'true'
    }
    return false
  })
  
  // Persist audio snap setting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneflow-audio-snap-enabled', enableAudioSnap.toString())
    }
  }, [enableAudioSnap])
  
  // Per-clip mute state - persisted to localStorage
  const [mutedClips, setMutedClips] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sceneflow-muted-audio-clips')
      if (saved) return new Set(JSON.parse(saved))
    }
    return new Set()
  })
  
  // Local editing state for timing fields (prevents cursor jumping)
  const [editingStartTime, setEditingStartTime] = useState<string | null>(null)
  const [editingDuration, setEditingDuration] = useState<string | null>(null)
  
  // Local editing state for segment timing fields
  const [editingSegStartTime, setEditingSegStartTime] = useState<string | null>(null)
  const [editingSegDuration, setEditingSegDuration] = useState<string | null>(null)
  
  // Optimistic local values - updated immediately on +/- button clicks
  // This ensures the UI shows the new value immediately without waiting for parent re-render
  const [optimisticValues, setOptimisticValues] = useState<{ 
    clipId: string | null; 
    startTime: number | null; 
    duration: number | null 
  }>({ clipId: null, startTime: null, duration: null })
  
  // Track last known clip values to detect external changes
  const lastClipValuesRef = useRef<{ id: string | null; startTime: number; duration: number }>({ id: null, startTime: 0, duration: 0 })
  
  // Ref to capture mutedClips for animation frames
  const mutedClipsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    mutedClipsRef.current = mutedClips
  }, [mutedClips])
  
  // Persist mutedClips to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneflow-muted-audio-clips', JSON.stringify([...mutedClips]))
    }
  }, [mutedClips])
  
  // Toggle mute for a specific clip
  const toggleClipMute = useCallback((clipId: string) => {
    setMutedClips(prev => {
      const next = new Set(prev)
      if (next.has(clipId)) {
        next.delete(clipId)
      } else {
        next.add(clipId)
        audioRefs.current.get(clipId)?.pause()
      }
      return next
    })
  }, [])
  
  // Track-level mute state (legacy)
  const [audioMuteState, setAudioMuteState] = useState<Set<string>>(new Set())
  
  // Ref to capture audioMuteState for use in animation frames (avoids minification closure issues)
  const audioMuteStateRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    audioMuteStateRef.current = audioMuteState
  }, [audioMuteState])
  
  // Track volume state
  const [trackVolumes, setTrackVolumes] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sceneflow-audio-track-volumes')
      if (saved) return JSON.parse(saved)
    }
    return { voiceover: 1, dialogue: 1, music: 0.6, sfx: 0.8 }
  })
  
  // Persist track volumes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneflow-audio-track-volumes', JSON.stringify(trackVolumes))
    }
  }, [trackVolumes])
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  
  // Calculate pixels per second based on container width
  const [containerWidth, setContainerWidth] = useState(600)
  const pixelsPerSecond = useMemo(() => containerWidth / Math.max(sceneDuration, 1), [containerWidth, sceneDuration])
  
  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setContainerWidth(timelineRef.current.clientWidth - 80) // Account for track labels
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Collect all audio clips
  const allClips = useMemo(() => {
    const clips: Array<{ type: string; clip: AudioTrackClip }> = []
    // Voiceover is now an array (Description + Narration)
    audioTracks?.voiceover?.forEach(v => v.url && clips.push({ type: 'voiceover', clip: v }))
    audioTracks?.dialogue?.forEach(d => d.url && clips.push({ type: 'dialogue', clip: d }))
    // Music is now an array
    audioTracks?.music?.forEach(m => m.url && clips.push({ type: 'music', clip: m }))
    audioTracks?.sfx?.forEach(s => s.url && clips.push({ type: 'sfx', clip: s }))
    return clips
  }, [audioTracks])

  // Segment clips derived from segments prop
  const segmentClips = useMemo<SegmentClip[]>(() => {
    return segments.map((seg, idx) => ({
      segmentId: seg.segmentId,
      startTime: seg.startTime,
      endTime: seg.endTime,
      duration: seg.endTime - seg.startTime,
      label: `Seg ${(seg.sequenceIndex ?? idx) + 1}`,
      sequenceIndex: seg.sequenceIndex ?? idx,
    }))
  }, [segments])

  // Get selected segment data with optimistic values
  const getSelectedSegmentData = useCallback(() => {
    if (!selectedSegmentId) return null
    const seg = segmentClips.find(s => s.segmentId === selectedSegmentId)
    if (!seg) return null
    
    // Apply optimistic values if they exist for this segment
    if (optimisticValues.clipId === selectedSegmentId) {
      return {
        ...seg,
        startTime: optimisticValues.startTime ?? seg.startTime,
        duration: optimisticValues.duration ?? seg.duration,
        endTime: (optimisticValues.startTime ?? seg.startTime) + (optimisticValues.duration ?? seg.duration),
      }
    }
    return seg
  }, [selectedSegmentId, segmentClips, optimisticValues])

  // Find nearest audio boundary for snap functionality
  const findNearestAudioBoundary = useCallback((time: number, threshold: number = 0.15): number | null => {
    const boundaries: number[] = []
    
    // Collect all audio clip start/end times
    allClips.forEach(({ clip }) => {
      boundaries.push(clip.startTime)
      boundaries.push(clip.startTime + clip.duration)
    })
    
    // Find closest boundary within threshold
    let closest: number | null = null
    let closestDist = threshold
    
    for (const boundary of boundaries) {
      const dist = Math.abs(boundary - time)
      if (dist < closestDist) {
        closest = boundary
        closestDist = dist
      }
    }
    
    return closest
  }, [allClips])

  // Get the selected clip's data with optimistic values applied
  const getSelectedClipData = useCallback(() => {
    if (!selectedClipId || !selectedClipTrackType) return null
    const baseClip = allClips.find(c => c.clip.id === selectedClipId)?.clip || null
    if (!baseClip) return null
    
    // Apply optimistic values if they exist for this clip
    if (optimisticValues.clipId === selectedClipId) {
      return {
        ...baseClip,
        startTime: optimisticValues.startTime ?? baseClip.startTime,
        duration: optimisticValues.duration ?? baseClip.duration,
      }
    }
    return baseClip
  }, [selectedClipId, selectedClipTrackType, allClips, optimisticValues])

  // Clear optimistic values when props catch up, and handle clip switching
  useEffect(() => {
    const baseClip = allClips.find(c => c.clip.id === selectedClipId)?.clip
    if (!baseClip) {
      // No clip selected, reset everything
      lastClipValuesRef.current = { id: null, startTime: 0, duration: 0 }
      setOptimisticValues({ clipId: null, startTime: null, duration: null })
      return
    }
    
    // Check if the clip ID changed (user selected a different clip)
    if (lastClipValuesRef.current.id !== baseClip.id) {
      // Clear editing state and optimistic values when switching clips
      setEditingStartTime(null)
      setEditingDuration(null)
      setOptimisticValues({ clipId: null, startTime: null, duration: null })
      lastClipValuesRef.current = { id: baseClip.id, startTime: baseClip.startTime, duration: baseClip.duration }
      return
    }
    
    // Check if props caught up to our optimistic values
    // If the prop values now match our optimistic values, clear them
    if (optimisticValues.clipId === selectedClipId) {
      const propsCaughtUpStart = optimisticValues.startTime !== null && baseClip.startTime === optimisticValues.startTime
      const propsCaughtUpDuration = optimisticValues.duration !== null && baseClip.duration === optimisticValues.duration
      
      if (propsCaughtUpStart && propsCaughtUpDuration) {
        // Both values caught up
        setOptimisticValues({ clipId: null, startTime: null, duration: null })
      } else if (propsCaughtUpStart && optimisticValues.duration === null) {
        // Start time caught up, no pending duration
        setOptimisticValues({ clipId: null, startTime: null, duration: null })
      } else if (propsCaughtUpDuration && optimisticValues.startTime === null) {
        // Duration caught up, no pending start time  
        setOptimisticValues({ clipId: null, startTime: null, duration: null })
      }
    }
    
    // Update our ref tracking
    lastClipValuesRef.current = { id: baseClip.id, startTime: baseClip.startTime, duration: baseClip.duration }
    
    // Clear editing state when values change
    setEditingStartTime(null)
    setEditingDuration(null)
  }, [selectedClipId, allClips, optimisticValues])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedClipId(null)
        setSelectedClipTrackType(null)
        handleSegmentSelect(null)
        return
      }
      
      // M to toggle mute on selected clip
      if (e.key === 'm' || e.key === 'M') {
        if (selectedClipId) {
          e.preventDefault()
          toggleClipMute(selectedClipId)
        }
        return
      }
      
      // Arrow keys to adjust timing
      if (selectedClipId && selectedClipTrackType && onAudioClipChange) {
        const clipData = getSelectedClipData()
        if (!clipData) return
        
        const step = e.shiftKey ? 0.5 : 0.1
        
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          const newStart = Math.max(0, clipData.startTime - step)
          onAudioClipChange(selectedClipTrackType, selectedClipId, { startTime: newStart })
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          const newStart = clipData.startTime + step
          onAudioClipChange(selectedClipTrackType, selectedClipId, { startTime: newStart })
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipId, selectedClipTrackType, toggleClipMute, getSelectedClipData, onAudioClipChange])

  // Play/pause control
  const togglePlayback = () => {
    if (isPlaying) {
      // Pause all audio
      audioRefs.current.forEach(audio => audio.pause())
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      setIsPlaying(false)
    } else {
      // Start playback
      startTimeRef.current = performance.now() - currentTime * 1000
      setIsPlaying(true)
      
      // Start/sync all audio elements - use ref to avoid minification closure issues
      const currentMutedTracks = audioMuteStateRef.current
      const currentMutedClips = mutedClipsRef.current
      allClips.forEach(({ type, clip }) => {
        const audio = audioRefs.current.get(clip.id)
        const isClipMuted = currentMutedClips.has(clip.id)
        if (audio && !currentMutedTracks.has(type) && !isClipMuted) {
          audio.volume = trackVolumes[type] ?? 1
          const clipStartTime = clip.startTime
          const clipEndTime = clip.startTime + clip.duration
          
          if (currentTime >= clipStartTime && currentTime < clipEndTime) {
            audio.currentTime = currentTime - clipStartTime
            audio.play().catch(() => {})
          } else if (currentTime < clipStartTime) {
            audio.currentTime = 0
          }
        }
      })
      
      // Animation loop
      const animate = () => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000
        if (elapsed >= sceneDuration) {
          setCurrentTime(0)
          setIsPlaying(false)
          audioRefs.current.forEach(audio => {
            audio.pause()
            audio.currentTime = 0
          })
          return
        }
        setCurrentTime(elapsed)
        onPlayheadChange?.(elapsed)
        
        // Check audio timing - use ref to avoid minification closure issues
        const animMutedTracks = audioMuteStateRef.current
        const animMutedClips = mutedClipsRef.current
        allClips.forEach(({ type, clip }) => {
          const audio = audioRefs.current.get(clip.id)
          const isTrackMuted = animMutedTracks.has(type)
          const isClipMuted = animMutedClips.has(clip.id)
          
          if (audio) {
            audio.volume = (isTrackMuted || isClipMuted) ? 0 : (trackVolumes[type] ?? 1)
            
            if (!isTrackMuted && !isClipMuted) {
              const clipStart = clip.startTime
              const clipEnd = clip.startTime + clip.duration
              
              if (elapsed >= clipStart && elapsed < clipEnd && audio.paused) {
                audio.currentTime = elapsed - clipStart
                audio.play().catch(() => {})
              } else if ((elapsed < clipStart || elapsed >= clipEnd) && !audio.paused) {
                audio.pause()
              }
            } else if (!audio.paused) {
              audio.pause()
            }
          }
        })
        
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    }
  }

  // Seek control
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - 80 // Account for labels
    const newTime = Math.max(0, Math.min(sceneDuration, x / pixelsPerSecond))
    setCurrentTime(newTime)
    onPlayheadChange?.(newTime)
    startTimeRef.current = performance.now() - newTime * 1000
    
    // Sync audio to new time - use ref to avoid minification closure issues
    const seekMutedTracks = audioMuteStateRef.current
    allClips.forEach(({ type, clip }) => {
      const audio = audioRefs.current.get(clip.id)
      if (audio) {
        const clipStart = clip.startTime
        const clipEnd = clip.startTime + clip.duration
        if (newTime >= clipStart && newTime < clipEnd) {
          audio.currentTime = newTime - clipStart
          if (isPlaying && !seekMutedTracks.has(type)) {
            audio.play().catch(() => {})
          }
        } else {
          audio.pause()
          audio.currentTime = 0
        }
      }
    })
  }

  const toggleMute = (trackType: string) => {
    setAudioMuteState(prev => {
      const next = new Set(prev)
      if (next.has(trackType)) {
        next.delete(trackType)
      } else {
        next.add(trackType)
        // Pause audio for this track
        allClips.filter(c => c.type === trackType).forEach(({ clip }) => {
          audioRefs.current.get(clip.id)?.pause()
        })
      }
      return next
    })
  }

  const skipTo = (time: number) => {
    const newTime = Math.max(0, Math.min(sceneDuration, time))
    setCurrentTime(newTime)
    onPlayheadChange?.(newTime)
    startTimeRef.current = performance.now() - newTime * 1000
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // Render track row
  const renderTrack = (
    label: string,
    icon: React.ReactNode,
    trackType: string,
    clips: AudioTrackClip[],
    color: string
  ) => {
    // Use ref for muted state to avoid minification TDZ issues
    const currentMutedTracks = audioMuteStateRef.current
    const isTrackMuted = currentMutedTracks?.has(trackType) ?? false
    
    return (
      <div className="flex items-stretch h-10 group">
        {/* Track Label */}
        <div className="w-20 flex-shrink-0 flex items-center gap-1 px-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700">
          <button
            onClick={() => toggleMute(trackType)}
            className={cn(
              "p-0.5 rounded transition-colors",
              isTrackMuted ? "text-gray-400" : "text-gray-600 dark:text-gray-300"
            )}
          >
            {isTrackMuted ? <VolumeX className="w-3 h-3" /> : icon}
          </button>
          <span className={cn(
            "text-[10px] font-medium truncate",
            isTrackMuted ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"
          )}>
            {label}
          </span>
        </div>
        
        {/* Track Timeline */}
        <div 
          className="flex-1 relative bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
          style={{ width: containerWidth }}
        >
          {/* Segment markers */}
          {segments.map((seg, i) => (
            <div
              key={seg.segmentId}
              className="absolute top-0 bottom-0 border-r border-dashed border-gray-300 dark:border-gray-700 opacity-50"
              style={{ left: seg.endTime * pixelsPerSecond }}
            />
          ))}
          
          {/* Audio clips - show muted clips dimmed instead of hiding */}
          {clips.map((clip) => {
            const isSelected = selectedClipId === clip.id
            const isClipMuted = mutedClips.has(clip.id)
            
            return (
              <div
                key={clip.id}
                className={cn(
                  "absolute top-1 bottom-1 rounded-sm flex items-center px-1 overflow-hidden cursor-pointer transition-all group/clip",
                  isTrackMuted ? "opacity-40" : isClipMuted ? "opacity-30" : "opacity-90",
                  isClipMuted && "border border-dashed border-gray-500",
                  isSelected && "ring-2 ring-cyan-400 ring-offset-1 ring-offset-gray-900 z-10",
                  color
                )}
                style={{
                  left: clip.startTime * pixelsPerSecond,
                  width: Math.max(clip.duration * pixelsPerSecond, 4),
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedClipId(clip.id)
                  setSelectedClipTrackType(trackType)
                }}
              >
                {/* Stale warning icon */}
                {clip.isStale && (
                  <span 
                    className="flex-shrink-0 mr-0.5" 
                    title={clip.staleReason || 'Audio may be out of sync with script'}
                  >
                    <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  </span>
                )}
                {/* Clip label */}
                {clip.label && clip.duration * pixelsPerSecond > 40 && (
                  <span className="text-[8px] text-white font-medium truncate relative z-10">
                    {clip.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Render segment track row (above audio tracks)
  const renderSegmentTrack = () => {
    if (segmentClips.length === 0) return null
    
    return (
      <div className="flex items-stretch h-10 group border-b-2 border-cyan-500/30">
        {/* Track Label */}
        <div className="w-20 flex-shrink-0 flex items-center gap-1 px-2 bg-cyan-900/20 border-r border-gray-300 dark:border-gray-700">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-medium truncate text-cyan-300">Segments</span>
        </div>
        
        {/* Track Timeline */}
        <div 
          className="flex-1 relative bg-cyan-950/20 border-b border-gray-200 dark:border-gray-800"
          style={{ width: containerWidth }}
        >
          {/* Segment clips */}
          {segmentClips.map((seg) => {
            const isSelected = selectedSegmentId === seg.segmentId
            
            return (
              <div
                key={seg.segmentId}
                className={cn(
                  "absolute top-1 bottom-1 rounded-sm flex items-center px-1 overflow-hidden cursor-pointer transition-all",
                  "bg-gradient-to-r from-cyan-600 to-cyan-700 opacity-90",
                  isSelected && "ring-2 ring-cyan-400 ring-offset-1 ring-offset-gray-900 z-10"
                )}
                style={{
                  left: seg.startTime * pixelsPerSecond,
                  width: Math.max(seg.duration * pixelsPerSecond, 4),
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  // Deselect audio clip when selecting segment
                  setSelectedClipId(null)
                  setSelectedClipTrackType(null)
                  handleSegmentSelect(seg.segmentId)
                }}
              >
                {/* Segment label */}
                {seg.duration * pixelsPerSecond > 30 && (
                  <span className="text-[8px] text-white font-medium truncate relative z-10">
                    {seg.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Time markers
  const timeMarkers = useMemo(() => {
    const markers: number[] = []
    const interval = sceneDuration > 30 ? 10 : sceneDuration > 10 ? 5 : 2
    for (let t = 0; t <= sceneDuration; t += interval) {
      markers.push(t)
    }
    return markers
  }, [sceneDuration])

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
      {/* Transport Controls */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => skipTo(0)}
          className="h-7 w-7 p-0"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlayback}
          className="h-7 w-7 p-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => skipTo(sceneDuration)}
          className="h-7 w-7 p-0"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </Button>
        
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
        
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
          {formatTime(currentTime)} / {formatTime(sceneDuration)}
        </span>
        
        <div className="flex-1" />
        
        {/* Audio Snap Toggle */}
        {onSegmentChange && segmentClips.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEnableAudioSnap(!enableAudioSnap)}
            className={cn(
              "h-7 text-[10px] gap-1 px-2",
              enableAudioSnap 
                ? "text-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30" 
                : "text-gray-400 hover:text-gray-300"
            )}
            title={enableAudioSnap ? 'Disable audio snap' : 'Enable audio snap (segments snap to audio boundaries)'}
          >
            <Link2 className="w-3 h-3" />
            Snap
          </Button>
        )}
        
        <span className="text-[10px] text-gray-400">
          Scene Timeline
        </span>
      </div>

      {/* Timeline Header with time markers */}
      <div className="flex items-center h-5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
        <div className="w-20 flex-shrink-0" />
        <div 
          ref={timelineRef}
          className="flex-1 relative"
          onClick={handleTimelineClick}
        >
          {timeMarkers.map((t) => (
            <div
              key={t}
              className="absolute text-[9px] text-gray-500 dark:text-gray-500 font-mono"
              style={{ left: t * pixelsPerSecond - 8 }}
            >
              {formatTime(t).substring(0, 4)}
            </div>
          ))}
        </div>
      </div>

      {/* Audio Tracks */}
      <div 
        className="relative cursor-pointer"
        onClick={handleTimelineClick}
      >
        {/* Narration Track */}
        {renderTrack(
          'Narration',
          <Mic className="w-3 h-3" />,
          'voiceover',
          audioTracks?.voiceover || [],
          'bg-blue-500'
        )}
        
        {/* Dialogue Track */}
        {renderTrack(
          'Dialogue',
          <Mic className="w-3 h-3" />,
          'dialogue',
          audioTracks?.dialogue || [],
          'bg-emerald-500'
        )}
        
        {/* Music Track */}
        {renderTrack(
          'Music',
          <Music className="w-3 h-3" />,
          'music',
          audioTracks?.music || [],
          'bg-purple-500'
        )}
        
        {/* SFX Track */}
        {renderTrack(
          'SFX',
          <Zap className="w-3 h-3" />,
          'sfx',
          audioTracks?.sfx || [],
          'bg-amber-500'
        )}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
          style={{ left: 80 + currentTime * pixelsPerSecond }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Selected Clip Panel */}
      {selectedClipId && selectedClipTrackType && (() => {
        const clipData = getSelectedClipData()
        if (!clipData) return null
        
        const trackColors: Record<string, string> = {
          voiceover: 'border-blue-500 bg-blue-500/10',
          dialogue: 'border-emerald-500 bg-emerald-500/10',
          music: 'border-purple-500 bg-purple-500/10',
          sfx: 'border-amber-500 bg-amber-500/10',
        }
        const trackLabels: Record<string, string> = {
          voiceover: 'Narration',
          dialogue: 'Dialogue',
          music: 'Music',
          sfx: 'SFX',
        }
        const isClipMuted = mutedClips.has(selectedClipId)
        
        // Detect if this clip has user-edited timing (differs from auto-calculated)
        // For now, we show "Edited" if startTime > 0 (since auto-calc puts most at 0 or sequential)
        // A more robust approach would compare to a stored "autoStartTime" value
        const hasEditedTiming = clipData.startTime !== undefined && clipData.startTime > 0
        
        // Reset to auto handler - resets start time to 0 (or sequential position)
        const handleResetToAuto = () => {
          // Reset start time to 0 for voiceover/music, or maintain sequential for dialogue/sfx
          const autoStartTime = 0
          onAudioClipChange?.(selectedClipTrackType!, selectedClipId!, { startTime: autoStartTime })
        }
        
        return (
          <div className={cn(
            "border-t-2 p-3 transition-all",
            trackColors[selectedClipTrackType] || 'border-gray-500 bg-gray-500/10'
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-gray-400">{trackLabels[selectedClipTrackType] || 'Clip'}</span>
                <span className="text-xs font-medium text-white truncate max-w-[150px]">
                  {clipData.label || `Clip`}
                </span>
                {/* Edited indicator */}
                {hasEditedTiming && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-medium">
                    <Pencil className="w-2.5 h-2.5" />
                    Edited
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {/* Reset to Auto button */}
                {hasEditedTiming && (
                  <button
                    onClick={handleResetToAuto}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-[10px] font-medium transition-colors"
                    title="Reset timing to automated baseline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
                <button
                  onClick={() => toggleClipMute(selectedClipId)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                    isClipMuted 
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  )}
                >
                  {isClipMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  {isClipMuted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  onClick={() => {
                    setSelectedClipId(null)
                    setSelectedClipTrackType(null)
                  }}
                  className="p-1 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-xs">
              {/* Start Time - EDITABLE with +/- buttons */}
              <div>
                <label className="block text-[9px] font-medium text-gray-500 uppercase mb-0.5">Start</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const newStart = Math.max(0, clipData.startTime - 0.5)
                      // Optimistic update - show new value immediately
                      setOptimisticValues(prev => ({ 
                        clipId: selectedClipId!, 
                        startTime: newStart, 
                        duration: prev.clipId === selectedClipId ? prev.duration : null 
                      }))
                      onAudioClipChange?.(selectedClipTrackType!, selectedClipId!, { startTime: newStart })
                    }}
                    className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-300 text-xs font-bold"
                    title="-0.5s"
                  >−</button>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editingStartTime ?? clipData.startTime.toFixed(1)}
                    onFocus={() => setEditingStartTime(clipData.startTime.toFixed(1))}
                    onChange={(e) => setEditingStartTime(e.target.value)}
                    onBlur={() => {
                      if (editingStartTime !== null) {
                        const parsed = parseFloat(editingStartTime)
                        if (!isNaN(parsed)) {
                          const newStart = Math.max(0, Math.min(sceneDuration, parsed))
                          onAudioClipChange?.(selectedClipTrackType!, selectedClipId!, { startTime: newStart })
                        }
                      }
                      setEditingStartTime(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur()
                      } else if (e.key === 'Escape') {
                        setEditingStartTime(null)
                        ;(e.target as HTMLInputElement).blur()
                      }
                    }}
                    style={{ width: '100px' }}
                    className="px-2 py-0.5 bg-gray-800 border border-gray-600 hover:border-cyan-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded text-white font-mono text-[10px] text-center outline-none"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const newStart = Math.min(sceneDuration, clipData.startTime + 0.5)
                      // Optimistic update - show new value immediately
                      setOptimisticValues(prev => ({ 
                        clipId: selectedClipId!, 
                        startTime: newStart, 
                        duration: prev.clipId === selectedClipId ? prev.duration : null 
                      }))
                      onAudioClipChange?.(selectedClipTrackType!, selectedClipId!, { startTime: newStart })
                    }}
                    className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-300 text-xs font-bold"
                    title="+0.5s"
                  >+</button>
                  <span className="text-gray-500">s</span>
                </div>
              </div>
              
              {/* Duration - EDITABLE with +/- buttons */}
              <div>
                <label className="block text-[9px] font-medium text-gray-500 uppercase mb-0.5">Duration</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const newDuration = Math.max(0.1, clipData.duration - 0.5)
                      // Optimistic update - show new value immediately
                      setOptimisticValues(prev => ({ 
                        clipId: selectedClipId!, 
                        startTime: prev.clipId === selectedClipId ? prev.startTime : null, 
                        duration: newDuration 
                      }))
                      onAudioClipChange?.(selectedClipTrackType!, selectedClipId!, { duration: newDuration })
                    }}
                    className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-300 text-xs font-bold"
                    title="-0.5s"
                  >−</button>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editingDuration ?? clipData.duration.toFixed(1)}
                    onFocus={() => setEditingDuration(clipData.duration.toFixed(1))}
                    onChange={(e) => setEditingDuration(e.target.value)}
                    onBlur={() => {
                      if (editingDuration !== null) {
                        const parsed = parseFloat(editingDuration)
                        if (!isNaN(parsed)) {
                          const newDuration = Math.max(0.1, parsed)
                          onAudioClipChange?.(selectedClipTrackType!, selectedClipId!, { duration: newDuration })
                        }
                      }
                      setEditingDuration(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur()
                      } else if (e.key === 'Escape') {
                        setEditingDuration(null)
                        ;(e.target as HTMLInputElement).blur()
                      }
                    }}
                    style={{ width: '100px' }}
                    className="px-2 py-0.5 bg-gray-800 border border-gray-600 hover:border-cyan-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded text-white font-mono text-[10px] text-center outline-none"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const newDuration = clipData.duration + 0.5
                      // Optimistic update - show new value immediately
                      setOptimisticValues(prev => ({ 
                        clipId: selectedClipId!, 
                        startTime: prev.clipId === selectedClipId ? prev.startTime : null, 
                        duration: newDuration 
                      }))
                      onAudioClipChange?.(selectedClipTrackType!, selectedClipId!, { duration: newDuration })
                    }}
                    className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-300 text-xs font-bold"
                    title="+0.5s"
                  >+</button>
                  <span className="text-gray-500">s</span>
                </div>
              </div>
              
              {/* End Time - Calculated (read-only) */}
              <div>
                <label className="block text-[9px] font-medium text-gray-500 uppercase mb-0.5">End</label>
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-gray-900 border border-gray-800 rounded text-gray-400 font-mono text-[11px]">
                    {(clipData.startTime + clipData.duration).toFixed(1)}
                  </span>
                  <span className="text-gray-500">s</span>
                </div>
              </div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-800 flex flex-wrap items-center gap-2 text-[9px] text-gray-500">
              <span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">M</kbd> Mute</span>
              <span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">←</kbd><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">→</kbd> ±0.1s</span>
              <span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">Esc</kbd> Deselect</span>
            </div>
          </div>
        )
      })()}

      {/* Selected Segment Panel */}
      {selectedSegmentId && !selectedClipId && (() => {
        const segData = getSelectedSegmentData()
        if (!segData) return null
        
        // Apply snap to a value
        const applySnap = (value: number): number => {
          if (!enableAudioSnap) return value
          const snapped = findNearestAudioBoundary(value)
          return snapped !== null ? snapped : value
        }
        
        return (
          <div className="border-t-2 border-cyan-500 bg-cyan-500/10 p-3 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-cyan-400">SEGMENT</span>
                <span className="text-xs font-medium text-white truncate max-w-[150px]">
                  {segData.label || `Segment ${segData.sequenceIndex + 1}`}
                </span>
                {enableAudioSnap && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[9px] font-medium">
                    <Link2 className="w-2.5 h-2.5" />
                    Snap On
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    handleSegmentSelect(null)
                  }}
                  className="p-1 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-xs">
              {/* Start Time - EDITABLE with +/- buttons */}
              <div>
                <label className="block text-[9px] font-medium text-gray-500 uppercase mb-0.5">Start</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      let newStart = Math.max(0, segData.startTime - 0.5)
                      newStart = applySnap(newStart)
                      onSegmentChange?.(selectedSegmentId!, { startTime: newStart })
                    }}
                    className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-300 text-xs font-bold"
                    title="-0.5s"
                  >−</button>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editingSegStartTime ?? segData.startTime.toFixed(1)}
                    onFocus={() => setEditingSegStartTime(segData.startTime.toFixed(1))}
                    onChange={(e) => setEditingSegStartTime(e.target.value)}
                    onBlur={() => {
                      if (editingSegStartTime !== null) {
                        const parsed = parseFloat(editingSegStartTime)
                        if (!isNaN(parsed)) {
                          let newStart = Math.max(0, Math.min(sceneDuration, parsed))
                          newStart = applySnap(newStart)
                          onSegmentChange?.(selectedSegmentId!, { startTime: newStart })
                        }
                      }
                      setEditingSegStartTime(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur()
                      } else if (e.key === 'Escape') {
                        setEditingSegStartTime(null)
                        ;(e.target as HTMLInputElement).blur()
                      }
                    }}
                    style={{ width: '100px' }}
                    className="px-2 py-0.5 bg-gray-800 border border-gray-600 hover:border-cyan-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded text-white font-mono text-[10px] text-center outline-none"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      let newStart = Math.min(sceneDuration, segData.startTime + 0.5)
                      newStart = applySnap(newStart)
                      onSegmentChange?.(selectedSegmentId!, { startTime: newStart })
                    }}
                    className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-300 text-xs font-bold"
                    title="+0.5s"
                  >+</button>
                  <span className="text-gray-500">s</span>
                </div>
              </div>
              
              {/* Duration - EDITABLE with +/- buttons */}
              <div>
                <label className="block text-[9px] font-medium text-gray-500 uppercase mb-0.5">Duration</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const newDuration = Math.max(0.5, segData.duration - 0.5)
                      onSegmentChange?.(selectedSegmentId!, { duration: newDuration })
                    }}
                    className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-300 text-xs font-bold"
                    title="-0.5s"
                  >−</button>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editingSegDuration ?? segData.duration.toFixed(1)}
                    onFocus={() => setEditingSegDuration(segData.duration.toFixed(1))}
                    onChange={(e) => setEditingSegDuration(e.target.value)}
                    onBlur={() => {
                      if (editingSegDuration !== null) {
                        const parsed = parseFloat(editingSegDuration)
                        if (!isNaN(parsed)) {
                          const newDuration = Math.max(0.5, parsed)
                          onSegmentChange?.(selectedSegmentId!, { duration: newDuration })
                        }
                      }
                      setEditingSegDuration(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur()
                      } else if (e.key === 'Escape') {
                        setEditingSegDuration(null)
                        ;(e.target as HTMLInputElement).blur()
                      }
                    }}
                    style={{ width: '100px' }}
                    className="px-2 py-0.5 bg-gray-800 border border-gray-600 hover:border-cyan-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded text-white font-mono text-[10px] text-center outline-none"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const newDuration = segData.duration + 0.5
                      onSegmentChange?.(selectedSegmentId!, { duration: newDuration })
                    }}
                    className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-300 text-xs font-bold"
                    title="+0.5s"
                  >+</button>
                  <span className="text-gray-500">s</span>
                </div>
              </div>
              
              {/* End Time - Calculated (read-only) */}
              <div>
                <label className="block text-[9px] font-medium text-gray-500 uppercase mb-0.5">End</label>
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-gray-900 border border-gray-800 rounded text-gray-400 font-mono text-[11px]">
                    {segData.endTime.toFixed(1)}
                  </span>
                  <span className="text-gray-500">s</span>
                </div>
              </div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-800 flex flex-wrap items-center gap-2 text-[9px] text-gray-500">
              <span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">Esc</kbd> Deselect</span>
              {enableAudioSnap && (
                <span className="text-cyan-400">Snap enabled: timing snaps to audio boundaries</span>
              )}
            </div>
          </div>
        )
      })()}

      {/* Hidden Audio Elements */}
      {allClips.map(({ clip }) => (
        clip.url && (
          <audio
            key={clip.id}
            ref={(el) => {
              if (el) audioRefs.current.set(clip.id, el)
              else audioRefs.current.delete(clip.id)
            }}
            src={clip.url}
            preload="auto"
            onError={() => {
              console.warn(`[AudioTimeline] Audio failed to load: ${clip.url}`)
              onAudioError?.(clip.id, clip.url!)
            }}
          />
        )
      ))}

      {/* Empty State */}
      {allClips.length === 0 && (
        <div className="px-3 py-4 text-center text-xs text-gray-400">
          No audio tracks configured. Add voiceover, dialogue, music, or sound effects to preview timing.
        </div>
      )}
    </div>
  )
}
