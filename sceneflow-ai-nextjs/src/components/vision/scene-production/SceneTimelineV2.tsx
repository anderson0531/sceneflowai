'use client'

/**
 * Scene Timeline V2 - Clean rewrite with single source of truth
 * 
 * Key improvements over V1:
 * 1. Single source of truth - derives audio tracks from scene prop directly
 * 2. Proper audio element lifecycle - keys include URL to force re-mount on change
 * 3. Multi-language support - language selector with proper fallback
 * 4. Optimistic editing - local state for immediate visual feedback
 * 5. Audio error handling - removes stale clips that 404
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { 
  Play, Pause, Volume2, VolumeX, Mic, Music, Zap, 
  SkipBack, SkipForward, Film, Plus, Trash2, X, Maximize2, Minimize2, 
  MessageSquare, GripVertical, Globe, AlertCircle, Download
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { 
  SceneSegment, 
  SceneTimelineV2Props,
  AudioTrackClipV2,
  AudioTracksDataV2,
  AudioTrackType,
} from './types'
import {
  buildAudioTracksForLanguage,
  detectAvailableLanguages,
  hashAudioUrls,
  flattenAudioTracks,
  hasAudioForLanguage,
} from './audioTrackBuilder'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// Phase 7: Drag-and-drop segment reordering
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ============================================================================
// Types
// ============================================================================

interface VisualClip {
  id: string
  segmentId: string
  url?: string
  thumbnailUrl?: string
  startTime: number
  duration: number
  originalDuration: number
  trimStart: number
  trimEnd: number
  status: 'DRAFT' | 'READY' | 'GENERATING' | 'COMPLETE' | 'UPLOADED' | 'ERROR'
  sequenceIndex: number
  prompt?: string
  isEstablishingShot?: boolean
  establishingShotType?: string
  shotNumber?: number
}

interface DragState {
  type: 'move' | 'resize-left' | 'resize-right'
  trackType: 'visual' | AudioTrackType
  clipId: string
  startX: number
  originalStart: number
  originalDuration: number
}

// ============================================================================
// Utilities
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
}

function formatTimeShort(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  th: 'ไทย',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
}

// ============================================================================
// Sortable Clip Wrapper
// ============================================================================

function SortableClipWrapper({ id, children, disabled }: { id: string; children: React.ReactNode; disabled?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  }
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SceneTimelineV2({
  segments,
  scene,
  selectedSegmentId,
  selectedLanguage,
  onLanguageChange,
  onSegmentSelect,
  onPlayheadChange,
  onGenerateSceneMp4,
  onVisualClipChange,
  onAudioClipChange,
  onAddSegment,
  onDeleteSegment,
  onReorderSegments,
  onAddEstablishingShot,
  onAudioError,
  sceneFrameUrl,
  dialogueAssignments,
  isSidePanelVisible = true,
  onToggleSidePanel,
}: SceneTimelineV2Props & {
  isSidePanelVisible?: boolean
  onToggleSidePanel?: () => void
}) {
  // ============================================================================
  // Audio Tracks - Single Source of Truth (derived from scene prop)
  // ============================================================================
  
  const availableLanguages = useMemo(() => detectAvailableLanguages(scene), [scene])
  
  const audioTracks = useMemo(() => {
    return buildAudioTracksForLanguage(scene, selectedLanguage)
  }, [scene, selectedLanguage])
  
  const audioHash = useMemo(() => hashAudioUrls(audioTracks), [audioTracks])
  
  // Track stale URLs that have errored (404)
  const [staleUrls, setStaleUrls] = useState<Set<string>>(new Set())
  
  // Filter out stale clips
  const filteredAudioTracks = useMemo((): AudioTracksDataV2 => {
    const filterClip = (clip: AudioTrackClipV2 | null): AudioTrackClipV2 | null => {
      if (!clip?.url) return null
      if (staleUrls.has(clip.url)) return null
      return clip
    }
    
    return {
      voiceover: filterClip(audioTracks.voiceover),
      description: filterClip(audioTracks.description),
      dialogue: audioTracks.dialogue.filter(d => d.url && !staleUrls.has(d.url)),
      music: filterClip(audioTracks.music),
      sfx: audioTracks.sfx.filter(s => s.url && !staleUrls.has(s.url)),
    }
  }, [audioTracks, staleUrls])
  
  // Track actual audio durations from loaded metadata
  const [actualDurations, setActualDurations] = useState<Record<string, number>>({})
  
  // Handle audio metadata loaded - capture actual duration
  const handleAudioLoaded = useCallback((clipId: string, url: string, actualDuration: number) => {
    const key = `${clipId}:${url}`
    setActualDurations(prev => {
      // Only update if duration is valid and different
      if (actualDuration > 0 && actualDuration !== Infinity && prev[key] !== actualDuration) {
        console.log(`[SceneTimelineV2] Audio ${clipId} actual duration: ${actualDuration.toFixed(2)}s`)
        return { ...prev, [key]: actualDuration }
      }
      return prev
    })
  }, [])
  
  // Flatten to array for playback, using actual durations when available
  const allAudioClips = useMemo(() => {
    const clips = flattenAudioTracks(filteredAudioTracks)
    // Apply actual durations from loaded audio metadata
    return clips.map(clip => {
      const key = `${clip.id}:${clip.url}`
      const actualDuration = actualDurations[key]
      if (actualDuration && actualDuration > 0 && Math.abs(actualDuration - clip.duration) > 0.1) {
        // Use actual duration if significantly different
        return { ...clip, duration: actualDuration }
      }
      return clip
    })
  }, [filteredAudioTracks, actualDurations])
  
  // Handle audio load errors
  const handleAudioError = useCallback((clipId: string, url: string) => {
    console.warn(`[SceneTimelineV2] Audio failed to load: ${url}`)
    setStaleUrls(prev => new Set(prev).add(url))
    onAudioError?.(clipId, url)
  }, [onAudioError])
  
  // Clean up stale URLs that are no longer in current tracks
  // Don't reset entirely - keep tracking URLs that already 404'd
  useEffect(() => {
    // Get all current URLs in the tracks
    const currentUrls = new Set<string>()
    if (audioTracks.voiceover?.url) currentUrls.add(audioTracks.voiceover.url)
    if (audioTracks.description?.url) currentUrls.add(audioTracks.description.url)
    if (audioTracks.music?.url) currentUrls.add(audioTracks.music.url)
    audioTracks.dialogue.forEach(d => { if (d.url) currentUrls.add(d.url) })
    audioTracks.sfx.forEach(s => { if (s.url) currentUrls.add(s.url) })
    
    // Only remove stale entries that are no longer in current tracks
    // This keeps tracking 404'd URLs that are still being referenced
    setStaleUrls(prev => {
      const updated = new Set<string>()
      prev.forEach(url => {
        if (currentUrls.has(url)) {
          // URL is still in current tracks, keep it marked as stale
          updated.add(url)
        }
        // URLs no longer in tracks are automatically dropped
      })
      return updated
    })
  }, [audioTracks])
  
  // ============================================================================
  // Refs (defined early so they're available for effects)
  // ============================================================================
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  
  // ============================================================================
  // Playback State
  // ============================================================================
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false)
  const [isTimelineWide, setIsTimelineWide] = useState(false)
  
  // Track volume and enabled state - persist to localStorage
  // Note: description is now a separate track from voiceover (narration)
  const [trackVolumes, setTrackVolumes] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sceneflow-track-volumes-v3')
      if (saved) return JSON.parse(saved)
    }
    return { voiceover: 1, description: 1, dialogue: 1, music: 0.6, sfx: 0.8 }
  })
  
  const [trackEnabled, setTrackEnabled] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sceneflow-track-enabled-v3')
      if (saved) return JSON.parse(saved)
    }
    return { voiceover: true, description: true, dialogue: true, music: true, sfx: true }
  })
  
  // Persist track settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneflow-track-volumes-v3', JSON.stringify(trackVolumes))
    }
  }, [trackVolumes])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneflow-track-enabled-v3', JSON.stringify(trackEnabled))
    }
  }, [trackEnabled])
  
  // Immediately mute/pause audio when track is disabled
  useEffect(() => {
    // Apply mute/pause to all audio elements when trackEnabled changes
    allAudioClips.forEach(clip => {
      const trackType = clip.id.startsWith('vo-') ? 'voiceover' 
        : clip.id.startsWith('desc-') ? 'description'
        : clip.id.startsWith('dialogue-') ? 'dialogue'
        : clip.id.startsWith('music-') ? 'music'
        : 'sfx'
      
      const audioKey = `${clip.id}:${clip.url}`
      const audio = audioRefs.current.get(audioKey)
      const isEnabled = trackEnabled[trackType] ?? true
      const volume = trackVolumes[trackType] ?? 1
      
      if (audio) {
        audio.volume = isEnabled ? volume : 0
        if (!isEnabled && !audio.paused) {
          audio.pause()
        }
      }
    })
  }, [trackEnabled, trackVolumes, allAudioClips])
  
  // ============================================================================
  // Visual Clips (from segments)
  // ============================================================================
  
  const visualClips = useMemo<VisualClip[]>(() => {
    return segments.map(seg => ({
      id: seg.segmentId,
      segmentId: seg.segmentId,
      url: seg.activeAssetUrl || undefined,
      thumbnailUrl: seg.references?.startFrameUrl || seg.activeAssetUrl || undefined,
      startTime: seg.startTime,
      duration: seg.endTime - seg.startTime,
      originalDuration: seg.endTime - seg.startTime,
      trimStart: 0,
      trimEnd: 0,
      status: seg.status,
      sequenceIndex: seg.sequenceIndex,
      prompt: seg.generatedPrompt || seg.userEditedPrompt,
      isEstablishingShot: seg.isEstablishingShot,
      establishingShotType: seg.establishingShotType,
      shotNumber: seg.shotNumber,
    }))
  }, [segments])
  
  const sceneDuration = useMemo(() => {
    if (visualClips.length === 0) return 10
    const lastClip = visualClips[visualClips.length - 1]
    return lastClip.startTime + lastClip.duration
  }, [visualClips])
  
  // ============================================================================
  // Timeline Layout
  // ============================================================================
  
  const [containerWidth, setContainerWidth] = useState(600)
  const TRACK_LABEL_WIDTH = 100
  const timelineWidth = containerWidth - TRACK_LABEL_WIDTH
  const pixelsPerSecond = useMemo(() => 
    timelineWidth / Math.max(sceneDuration, 1), 
    [timelineWidth, sceneDuration]
  )
  
  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setContainerWidth(timelineRef.current.clientWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])
  
  // ============================================================================
  // Optimistic Editing State (for drag operations)
  // ============================================================================
  
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [localClipOffsets, setLocalClipOffsets] = useState<Record<string, { startDelta: number; durationDelta: number }>>({})
  
  // Debounce timer for persisting changes
  const persistTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get effective clip values (base + local offsets)
  const getEffectiveClipValues = useCallback((clipId: string, baseStart: number, baseDuration: number) => {
    const offset = localClipOffsets[clipId]
    if (!offset) return { startTime: baseStart, duration: baseDuration }
    return {
      startTime: Math.max(0, baseStart + offset.startDelta),
      duration: Math.max(0.5, baseDuration + offset.durationDelta),
    }
  }, [localClipOffsets])
  
  // ============================================================================
  // Drag Handlers
  // ============================================================================
  
  const handleClipMouseDown = useCallback((
    e: React.MouseEvent,
    trackType: 'visual' | AudioTrackType,
    clipId: string,
    resizeType: 'move' | 'resize-left' | 'resize-right',
    clipStart: number,
    clipDuration: number
  ) => {
    e.stopPropagation()
    e.preventDefault()
    
    setDragState({
      type: resizeType,
      trackType,
      clipId,
      startX: e.clientX,
      originalStart: clipStart,
      originalDuration: clipDuration,
    })
  }, [])
  
  useEffect(() => {
    if (!dragState) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX
      const deltaTime = deltaX / pixelsPerSecond
      
      let startDelta = 0
      let durationDelta = 0
      
      if (dragState.type === 'move') {
        startDelta = deltaTime
      } else if (dragState.type === 'resize-left') {
        startDelta = Math.max(-dragState.originalStart, Math.min(deltaTime, dragState.originalDuration - 0.5))
        durationDelta = -startDelta
      } else if (dragState.type === 'resize-right') {
        durationDelta = Math.max(0.5 - dragState.originalDuration, deltaTime)
      }
      
      // Update local state immediately for responsive feedback
      setLocalClipOffsets(prev => ({
        ...prev,
        [dragState.clipId]: { startDelta, durationDelta }
      }))
    }
    
    const handleMouseUp = () => {
      // Persist the changes after drag ends
      const offset = localClipOffsets[dragState.clipId]
      if (offset && (offset.startDelta !== 0 || offset.durationDelta !== 0)) {
        const newStart = Math.max(0, dragState.originalStart + offset.startDelta)
        const newDuration = Math.max(0.5, dragState.originalDuration + offset.durationDelta)
        
        // Debounce persistence
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
        persistTimerRef.current = setTimeout(() => {
          if (dragState.trackType === 'visual') {
            onVisualClipChange?.(dragState.clipId, { startTime: newStart, duration: newDuration })
          } else {
            onAudioClipChange?.(dragState.trackType as AudioTrackType, dragState.clipId, { startTime: newStart, duration: newDuration })
          }
        }, 100)
      }
      
      // Clear local offsets after a brief delay (wait for prop update)
      setTimeout(() => {
        setLocalClipOffsets(prev => {
          const next = { ...prev }
          delete next[dragState.clipId]
          return next
        })
      }, 200)
      
      setDragState(null)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, pixelsPerSecond, localClipOffsets, onVisualClipChange, onAudioClipChange])
  
  // ============================================================================
  // Segment Reordering (DnD)
  // ============================================================================
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !onReorderSegments) return
    
    const oldIndex = segments.findIndex(s => s.segmentId === active.id)
    const newIndex = segments.findIndex(s => s.segmentId === over.id)
    
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderSegments(oldIndex, newIndex)
    }
  }, [segments, onReorderSegments])
  
  // ============================================================================
  // Playback Control
  // ============================================================================
  
  const getCurrentVisualClip = useCallback((time: number): VisualClip | undefined => {
    for (const clip of visualClips) {
      if (time >= clip.startTime && time < clip.startTime + clip.duration) {
        return clip
      }
    }
    return visualClips[visualClips.length - 1]
  }, [visualClips])
  
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      videoRef.current?.pause()
      audioRefs.current.forEach(audio => audio.pause())
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      setIsPlaying(false)
    } else {
      startTimeRef.current = performance.now() - currentTime * 1000
      setIsPlaying(true)
      
      const animate = () => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000
        
        if (elapsed >= sceneDuration) {
          setCurrentTime(0)
          setIsPlaying(false)
          videoRef.current?.pause()
          audioRefs.current.forEach(audio => {
            audio.pause()
            audio.currentTime = 0
          })
          return
        }
        
        setCurrentTime(elapsed)
        
        // Sync video
        const currentClip = getCurrentVisualClip(elapsed)
        if (currentClip && videoRef.current && currentClip.url) {
          const clipLocalTime = elapsed - currentClip.startTime + currentClip.trimStart
          
          if (videoRef.current.src !== currentClip.url) {
            videoRef.current.src = currentClip.url
            videoRef.current.currentTime = clipLocalTime
            videoRef.current.play().catch(() => {})
          } else {
            const drift = Math.abs(videoRef.current.currentTime - clipLocalTime)
            if (drift > 0.2) {
              videoRef.current.currentTime = clipLocalTime
            }
            if (videoRef.current.paused) {
              videoRef.current.play().catch(() => {})
            }
          }
        }
        
        // Sync audio
        allAudioClips.forEach(clip => {
          const trackType = clip.id.startsWith('vo-') ? 'voiceover' 
            : clip.id.startsWith('desc-') ? 'description'
            : clip.id.startsWith('dialogue-') ? 'dialogue'
            : clip.id.startsWith('music-') ? 'music'
            : 'sfx'
          
          // Use unique key that includes URL to get correct audio element
          const audioKey = `${clip.id}:${clip.url}`
          const audio = audioRefs.current.get(audioKey)
          const isEnabled = trackEnabled[trackType] ?? true
          const volume = trackVolumes[trackType] ?? 1
          
          if (audio) {
            audio.volume = isEnabled ? volume : 0
            
            if (!isEnabled) {
              if (!audio.paused) audio.pause()
              return
            }
            
            const clipStart = clip.startTime
            const clipEnd = clip.startTime + clip.duration
            
            if (elapsed >= clipStart && elapsed < clipEnd) {
              const audioTime = elapsed - clipStart + (clip.trimStart || 0)
              if (audio.paused) {
                audio.currentTime = audioTime
                audio.play().catch(() => {})
              } else {
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
        
        onPlayheadChange?.(elapsed, currentClip?.segmentId)
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [isPlaying, currentTime, sceneDuration, getCurrentVisualClip, allAudioClips, trackEnabled, trackVolumes, onPlayheadChange])
  
  // Seek control
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - TRACK_LABEL_WIDTH
    if (x < 0) return
    
    const newTime = Math.max(0, Math.min(sceneDuration, x / pixelsPerSecond))
    setCurrentTime(newTime)
    startTimeRef.current = performance.now() - newTime * 1000
    
    const currentClip = getCurrentVisualClip(newTime)
    onPlayheadChange?.(newTime, currentClip?.segmentId)
  }, [dragState, sceneDuration, pixelsPerSecond, getCurrentVisualClip, onPlayheadChange])
  
  const skipTo = useCallback((time: number) => {
    const newTime = Math.max(0, Math.min(sceneDuration, time))
    setCurrentTime(newTime)
    startTimeRef.current = performance.now() - newTime * 1000
    onPlayheadChange?.(newTime, getCurrentVisualClip(newTime)?.segmentId)
  }, [sceneDuration, getCurrentVisualClip, onPlayheadChange])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    }
  }, [])
  
  // ============================================================================
  // Time Markers
  // ============================================================================
  
  const timeMarkers = useMemo(() => {
    const markers: number[] = []
    const interval = sceneDuration > 60 ? 15 : sceneDuration > 30 ? 10 : sceneDuration > 10 ? 5 : 2
    for (let t = 0; t <= sceneDuration; t += interval) {
      markers.push(t)
    }
    return markers
  }, [sceneDuration])
  
  // ============================================================================
  // Render Helpers
  // ============================================================================
  
  const toggleTrack = useCallback((trackType: string) => {
    setTrackEnabled(prev => ({
      ...prev,
      [trackType]: !prev[trackType]
    }))
  }, [])
  
  const renderClip = (
    clip: { id: string; startTime: number; duration: number; label?: string; url?: string; thumbnailUrl?: string },
    trackType: 'visual' | AudioTrackType,
    color: string,
    showThumbnail: boolean = false
  ) => {
    const { startTime, duration } = getEffectiveClipValues(clip.id, clip.startTime, clip.duration)
    const left = startTime * pixelsPerSecond
    const width = Math.max(duration * pixelsPerSecond, 20)
    const isSelected = trackType === 'visual' && clip.id === selectedSegmentId
    const isDragging = dragState?.clipId === clip.id
    
    return (
      <div
        key={`${clip.id}:${clip.url || 'no-url'}`}
        className={cn(
          "absolute rounded-sm overflow-hidden transition-shadow",
          "group cursor-move select-none",
          isSelected && "ring-2 ring-sf-primary ring-offset-1 ring-offset-gray-900 z-10",
          isDragging && "opacity-80 shadow-lg z-20",
          !isDragging && "hover:shadow-md"
        )}
        style={{ left, width, top: '2px', bottom: '2px' }}
        onMouseDown={(e) => {
          if (trackType === 'visual') onSegmentSelect(clip.id)
          handleClipMouseDown(e, trackType, clip.id, 'move', clip.startTime, clip.duration)
        }}
      >
        <div className={cn("absolute inset-0", color)}>
          {showThumbnail && clip.thumbnailUrl && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-60"
              style={{ backgroundImage: `url(${clip.thumbnailUrl})` }}
            />
          )}
        </div>
        
        {/* Left resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 hover:bg-white/20"
          onMouseDown={(e) => handleClipMouseDown(e, trackType, clip.id, 'resize-left', clip.startTime, clip.duration)}
        />
        
        {/* Right resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 hover:bg-white/20"
          onMouseDown={(e) => handleClipMouseDown(e, trackType, clip.id, 'resize-right', clip.startTime, clip.duration)}
        />
        
        <div className="relative z-10 h-full flex items-center justify-between px-1 pointer-events-none">
          <span className="text-[9px] font-medium text-white/90 truncate">
            {clip.label}
          </span>
          {width > 50 && (
            <span className="text-[8px] text-white/70 font-mono">
              {duration.toFixed(1)}s
            </span>
          )}
        </div>
      </div>
    )
  }
  
  const renderAudioTrack = (
    trackType: AudioTrackType,
    label: string,
    icon: React.ReactNode,
    clips: AudioTrackClipV2[],
    color: string
  ) => {
    const isEnabled = trackEnabled[trackType] ?? true
    
    return (
      <div className={cn("flex items-stretch border-t border-gray-200 dark:border-gray-700 transition-all duration-200", isTimelineExpanded ? "h-14" : "h-10")}>
        <div 
          className="flex-shrink-0 flex items-center justify-between px-2 bg-gray-100 dark:bg-gray-800"
          style={{ width: TRACK_LABEL_WIDTH }}
        >
          <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">{label}</span>
          </div>
          <button
            className={cn(
              "p-1 rounded transition-colors",
              isEnabled 
                ? "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
                : "text-red-400 hover:text-red-500"
            )}
            onClick={() => toggleTrack(trackType)}
            title={isEnabled ? 'Mute track' : 'Unmute track'}
          >
            {isEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          </button>
        </div>
        
        <div className="flex-1 relative bg-gray-50 dark:bg-gray-900/50">
          {clips.map(clip => renderClip(
            { 
              id: clip.id, 
              startTime: clip.startTime, 
              duration: clip.duration, 
              label: clip.label || clip.characterName,
              url: clip.url || undefined,
            },
            trackType,
            color
          ))}
          
          {clips.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] text-gray-400 italic">No audio</span>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Render
  // ============================================================================
  
  const currentVisualClip = getCurrentVisualClip(currentTime)
  const hasAudio = hasAudioForLanguage(filteredAudioTracks)
  
  return (
    <div className="space-y-4">
      {/* Scene Video Player - Above Timeline */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-black overflow-hidden">
        <div className={cn(
          "relative mx-auto aspect-video bg-black transition-all duration-200",
          isPlayerExpanded ? "w-full max-w-3xl" : "w-full max-w-sm"
        )}>
          {currentVisualClip?.url ? (
            <video 
              ref={videoRef} 
              className="w-full h-full object-contain" 
              src={currentVisualClip.url}
            />
          ) : currentVisualClip?.thumbnailUrl ? (
            <img src={currentVisualClip.thumbnailUrl} alt="Preview" className="w-full h-full object-contain" />
          ) : sceneFrameUrl ? (
            <img src={sceneFrameUrl} alt="Scene Frame" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-12 h-12 text-gray-600" />
            </div>
          )}
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPlayerExpanded(!isPlayerExpanded)}
            className="absolute top-2 right-2 h-7 w-7 p-0 bg-black/50 hover:bg-black/70 text-white"
          >
            {isPlayerExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
        
        {/* Transport Controls Bar */}
        <div className="flex items-center justify-center gap-4 px-4 py-2 bg-gray-900 border-t border-gray-800">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => skipTo(0)} className="h-8 w-8 p-0 text-white hover:bg-gray-800">
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={togglePlayback} className="h-10 w-10 p-0 text-white hover:bg-gray-800">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => skipTo(sceneDuration)} className="h-8 w-8 p-0 text-white hover:bg-gray-800">
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="w-px h-5 bg-gray-700" />
          
          <span className="text-sm font-mono text-gray-300">
            {formatTime(currentTime)} / {formatTime(sceneDuration)}
          </span>
          
          <div className="w-px h-5 bg-gray-700" />
          
          <span className="text-xs text-gray-400">
            Seg {(visualClips.findIndex(c => c.id === currentVisualClip?.id) ?? 0) + 1} / {visualClips.length}
          </span>
          
          {/* Language selector in transport bar */}
          {availableLanguages.length > 1 && (
            <>
              <div className="w-px h-5 bg-gray-700" />
              <Select value={selectedLanguage} onValueChange={onLanguageChange}>
                <SelectTrigger className="h-7 w-[100px] text-xs bg-gray-800 border-gray-700 text-gray-300">
                  <Globe className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map(lang => (
                    <SelectItem key={lang} value={lang} className="text-xs">
                      {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          
          {onGenerateSceneMp4 && (
            <>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={onGenerateSceneMp4} className="h-8 text-xs gap-1.5 border-gray-700 text-gray-300 hover:bg-gray-800">
                <Download className="w-3.5 h-3.5" />
                Generate MP4
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Timeline Tracks Section */}
      <div className="w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* Playback controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => skipTo(0)}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={togglePlayback}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => skipTo(sceneDuration)}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </Button>
          </div>
          
          {/* Time display */}
          <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
            {formatTime(currentTime)} / {formatTime(sceneDuration)}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Add/Delete Segment Controls */}
          {onAddSegment && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 px-2"
              onClick={() => onAddSegment(selectedSegmentId || null, 4)}
              title="Add new segment"
            >
              <Plus className="w-3 h-3" />
              Add
            </Button>
          )}
          {onDeleteSegment && selectedSegmentId && segments.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={() => onDeleteSegment(selectedSegmentId)}
              title="Delete selected segment"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          )}
          
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
          
          {/* Language selector */}
          {availableLanguages.length > 1 && (
            <Select value={selectedLanguage} onValueChange={onLanguageChange}>
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <Globe className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map(lang => (
                  <SelectItem key={lang} value={lang} className="text-xs">
                    {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Timeline expand toggle - increases track heights for better visibility */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setIsTimelineExpanded(!isTimelineExpanded)
              setIsTimelineWide(!isTimelineWide)
            }}
            title={isTimelineExpanded ? 'Collapse timeline' : 'Expand timeline'}
          >
            {isTimelineExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          
          {/* Side panel toggle */}
          {onToggleSidePanel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 px-2"
              onClick={onToggleSidePanel}
              title={isSidePanelVisible ? 'Hide details panel' : 'Show details panel'}
            >
              {isSidePanelVisible ? (
                <><X className="w-3.5 h-3.5" /> Panel</>
              ) : (
                <><MessageSquare className="w-3.5 h-3.5" /> Panel</>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Timeline tracks - horizontal scroll enabled */}
      <div ref={timelineRef} className="relative overflow-x-auto" onClick={handleTimelineClick}>
        <div className={cn("min-w-[600px]", isTimelineWide && "min-w-[1000px]")}>
        {/* Time ruler */}
        <div className="flex items-stretch h-6 border-b border-gray-200 dark:border-gray-700">
          <div 
            className="flex-shrink-0 bg-gray-100 dark:bg-gray-800"
            style={{ width: TRACK_LABEL_WIDTH }}
          />
          <div className="flex-1 relative bg-gray-50 dark:bg-gray-900/30">
            {timeMarkers.map(t => (
              <div
                key={t}
                className="absolute top-0 bottom-0 border-l border-gray-300 dark:border-gray-600"
                style={{ left: t * pixelsPerSecond }}
              >
                <span className="absolute top-0.5 left-1 text-[8px] text-gray-500 dark:text-gray-400 font-mono">
                  {formatTimeShort(t)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Visual track */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className={cn("flex items-stretch transition-all duration-200", isTimelineExpanded ? "h-24" : "h-16")}>
            <div 
              className="flex-shrink-0 flex items-center gap-1.5 px-2 bg-gray-100 dark:bg-gray-800"
              style={{ width: TRACK_LABEL_WIDTH }}
            >
              <Film className="w-3.5 h-3.5 text-sf-primary" />
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Video</span>
            </div>
            
            <div className="flex-1 relative bg-gray-50 dark:bg-gray-900/50">
              <SortableContext items={visualClips.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                {visualClips.map(clip => (
                  <SortableClipWrapper key={clip.id} id={clip.id} disabled={!onReorderSegments}>
                    {renderClip(
                      { 
                        id: clip.id, 
                        startTime: clip.startTime, 
                        duration: clip.duration, 
                        label: clip.isEstablishingShot ? 'Estab.' : `Seg ${clip.sequenceIndex + 1}`,
                        url: clip.url,
                        thumbnailUrl: clip.thumbnailUrl,
                      },
                      'visual',
                      'bg-gradient-to-r from-blue-500 to-blue-600',
                      true
                    )}
                  </SortableClipWrapper>
                ))}
              </SortableContext>
              
              {/* Add segment button */}
              {onAddSegment && (
                <button
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-500 dark:text-gray-400 transition-colors"
                  style={{ left: (visualClips[visualClips.length - 1]?.startTime + visualClips[visualClips.length - 1]?.duration || 0) * pixelsPerSecond + 4 }}
                  onClick={() => onAddSegment(null, 4)}
                  title="Add segment"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </DndContext>
        
        {/* Audio tracks - separate Narration and Description tracks */}
        {filteredAudioTracks.voiceover && renderAudioTrack(
          'voiceover',
          'Narration',
          <Mic className="w-3.5 h-3.5 text-green-500" />,
          [filteredAudioTracks.voiceover],
          'bg-gradient-to-r from-green-500 to-green-600'
        )}
        
        {filteredAudioTracks.description && renderAudioTrack(
          'description',
          'Description',
          <Film className="w-3.5 h-3.5 text-teal-500" />,
          [filteredAudioTracks.description],
          'bg-gradient-to-r from-teal-500 to-teal-600'
        )}
        
        {filteredAudioTracks.dialogue.length > 0 && renderAudioTrack(
          'dialogue',
          'Dialogue',
          <MessageSquare className="w-3.5 h-3.5 text-purple-500" />,
          filteredAudioTracks.dialogue,
          'bg-gradient-to-r from-purple-500 to-purple-600'
        )}
        
        {filteredAudioTracks.music && renderAudioTrack(
          'music',
          'Music',
          <Music className="w-3.5 h-3.5 text-amber-500" />,
          [filteredAudioTracks.music],
          'bg-gradient-to-r from-amber-500 to-amber-600'
        )}
        
        {filteredAudioTracks.sfx.length > 0 && renderAudioTrack(
          'sfx',
          'SFX',
          <Zap className="w-3.5 h-3.5 text-red-500" />,
          filteredAudioTracks.sfx,
          'bg-gradient-to-r from-red-500 to-red-600'
        )}
        
        {/* No audio indicator */}
        {!hasAudio && (
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              No audio tracks for {LANGUAGE_LABELS[selectedLanguage] || selectedLanguage}. 
              Generate audio using the Update Audio button.
            </span>
          </div>
        )}
        
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-30"
          style={{ left: TRACK_LABEL_WIDTH + currentTime * pixelsPerSecond }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rotate-45" />
        </div>
        </div>{/* End scrollable min-width container */}
      </div>
      
      {/* Hidden audio elements - keyed by ID:URL to force re-mount when URL changes */}
      {allAudioClips.map(clip => clip.url && (
        <audio
          key={`${clip.id}:${clip.url}`}
          ref={el => {
            const key = `${clip.id}:${clip.url}`
            if (el) {
              audioRefs.current.set(key, el)
            } else {
              audioRefs.current.delete(key)
            }
          }}
          src={clip.url}
          preload="auto"
          onLoadedMetadata={(e) => {
            const audio = e.currentTarget
            if (audio.duration && audio.duration !== Infinity) {
              handleAudioLoaded(clip.id, clip.url!, audio.duration)
            }
          }}
          onError={() => handleAudioError(clip.id, clip.url!)}
        />
      ))}
      </div>{/* End Timeline Tracks Section */}
    </div>
  )
}

export default SceneTimelineV2
