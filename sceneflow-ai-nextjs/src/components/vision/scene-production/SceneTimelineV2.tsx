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
  MessageSquare, GripVertical, Globe, AlertCircle, Download, Layers, Magnet, Link2, Pencil, Anchor, Clock
} from 'lucide-react'
import { toast } from 'sonner'
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
  buildAudioTracksWithBaselineTiming,
  detectAvailableLanguages,
  determineBaselineLanguage,
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
  endThumbnailUrl?: string  // End frame for FTV display
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
  anchorStatus?: 'pending' | 'start-locked' | 'end-pending' | 'fully-anchored'
  exceedsVideoLimit?: boolean  // true if duration > 8s (will need split for video generation)
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
  // Phase 8: Audio alignment features
  onSegmentTimeChange,
  onFitSegmentToDialogue,
  onOpenSegmentPromptDialog,
  // Phase 9: Intelligent audio anchoring
  onApplyIntelligentAlignment,
  // Phase 10: Language playback offset
  playbackOffset = 0,
  suggestedOffset,
  onPlaybackOffsetChange,
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
  
  // Determine baseline language (English if available, else first language with audio)
  const baselineLanguage = useMemo(() => determineBaselineLanguage(scene), [scene])
  
  // Build audio tracks with baseline timing (English positions) but target language URLs
  // This ensures timeline positions stay consistent when switching languages
  const audioTracks = useMemo(() => {
    return buildAudioTracksWithBaselineTiming(scene, selectedLanguage, baselineLanguage)
  }, [scene, selectedLanguage, baselineLanguage])
  
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
    // Only show toast if this is a new stale URL (not already tracked)
    setStaleUrls(prev => {
      if (!prev.has(url)) {
        // Show toast only once per stale URL
        toast.error('Audio file not found. Try regenerating the audio.', {
          description: 'The audio file may have expired or been deleted.',
          duration: 5000,
        })
      }
      return new Set(prev).add(url)
    })
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
  
  // Audio Snap feature - snap segment edges to audio clip boundaries
  const [enableAudioSnap, setEnableAudioSnap] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sceneflow-audio-snap') === 'true'
    }
    return false
  })
  
  // Persist audio snap preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneflow-audio-snap', String(enableAudioSnap))
    }
  }, [enableAudioSnap])
  
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
      const saved = localStorage.getItem('sceneflow-track-enabled-v4')
      if (saved) return JSON.parse(saved)
    }
    return { keyframes: true, voiceover: true, description: true, dialogue: true, music: true, sfx: true }
  })
  
  // Track if we've auto-applied alignment for this scene (prevent repeated auto-align)
  const [hasAutoAligned, setHasAutoAligned] = useState(false)
  const prevAudioHashRef = useRef<string>('')
  
  // Persist track settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneflow-track-volumes-v3', JSON.stringify(trackVolumes))
    }
  }, [trackVolumes])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneflow-track-enabled-v4', JSON.stringify(trackEnabled))
    }
  }, [trackEnabled])
  
  // Auto-apply intelligent alignment when audio tracks first become available
  useEffect(() => {
    // Only auto-align if:
    // 1. We have an alignment handler
    // 2. We haven't already auto-aligned for this audio state
    // 3. Audio hash has changed (new audio loaded)
    // 4. There is actual audio to align to
    if (!onApplyIntelligentAlignment) return
    if (hasAutoAligned && prevAudioHashRef.current === audioHash) return
    
    const hasAnyAudio = filteredAudioTracks.voiceover || 
                        filteredAudioTracks.dialogue.length > 0 ||
                        filteredAudioTracks.description
    
    if (hasAnyAudio && audioHash !== prevAudioHashRef.current) {
      console.log('[SceneTimelineV2] Auto-applying intelligent alignment for new audio')
      // Small delay to ensure audio durations are loaded
      const timer = setTimeout(() => {
        onApplyIntelligentAlignment()
        setHasAutoAligned(true)
      }, 500)
      prevAudioHashRef.current = audioHash
      return () => clearTimeout(timer)
    }
  }, [audioHash, filteredAudioTracks, hasAutoAligned, onApplyIntelligentAlignment])
  
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
    // Apply playback offset for non-baseline languages
    // This extends each segment's display duration for translated audio
    const effectiveOffset = selectedLanguage !== baselineLanguage ? playbackOffset : 0
    
    let cumulativeStart = 0
    return segments.map(seg => {
      const baseDuration = seg.endTime - seg.startTime
      // Display duration = base + offset (for animatic playback)
      const displayDuration = baseDuration + effectiveOffset
      
      const clip = {
        id: seg.segmentId,
        segmentId: seg.segmentId,
        url: seg.activeAssetUrl || undefined,
        thumbnailUrl: seg.references?.startFrameUrl || seg.activeAssetUrl || undefined,
        endThumbnailUrl: seg.references?.endFrameUrl || seg.endFrameUrl || undefined,
        startTime: cumulativeStart,  // Use cumulative start for offset display
        duration: displayDuration,
        originalDuration: baseDuration,  // Keep original for video generation reference
        trimStart: 0,
        trimEnd: 0,
        status: seg.status,
        sequenceIndex: seg.sequenceIndex,
        prompt: seg.generatedPrompt || seg.userEditedPrompt,
        isEstablishingShot: seg.isEstablishingShot,
        establishingShotType: seg.establishingShotType,
        shotNumber: seg.shotNumber,
        anchorStatus: seg.anchorStatus,
        exceedsVideoLimit: baseDuration > 8,  // Use original duration for video limit check
      }
      
      cumulativeStart += displayDuration
      return clip
    })
  }, [segments, playbackOffset, selectedLanguage, baselineLanguage])
  
  const sceneDuration = useMemo(() => {
    if (visualClips.length === 0) return 10
    const lastClip = visualClips[visualClips.length - 1]
    return lastClip.startTime + lastClip.duration
  }, [visualClips])
  
  // ============================================================================
  // Timeline Layout
  // ============================================================================
  
  const [containerWidth, setContainerWidth] = useState(600)
  const TRACK_LABEL_WIDTH = 160
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
  // Audio Snap Helper - Find nearest audio boundary to snap to
  // ============================================================================
  
  const SNAP_THRESHOLD = 0.15 // 150ms snap threshold
  
  const findNearestAudioBoundary = useCallback((time: number): number | null => {
    if (!enableAudioSnap) return null
    
    const boundaries: number[] = []
    
    // Collect all audio clip start and end times
    allAudioClips.forEach(clip => {
      boundaries.push(clip.startTime)
      boundaries.push(clip.startTime + clip.duration)
    })
    
    // Find nearest boundary within threshold
    let nearestBoundary: number | null = null
    let nearestDistance = SNAP_THRESHOLD
    
    boundaries.forEach(boundary => {
      const distance = Math.abs(time - boundary)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestBoundary = boundary
      }
    })
    
    return nearestBoundary
  }, [enableAudioSnap, allAudioClips])
  
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
        
        // Apply audio snap for segment moves (only for visual track)
        if (enableAudioSnap && dragState.trackType === 'visual') {
          const proposedStart = dragState.originalStart + startDelta
          const snappedStart = findNearestAudioBoundary(proposedStart)
          if (snappedStart !== null) {
            startDelta = snappedStart - dragState.originalStart
          }
        }
      } else if (dragState.type === 'resize-left') {
        startDelta = Math.max(-dragState.originalStart, Math.min(deltaTime, dragState.originalDuration - 0.5))
        
        // Snap left edge to audio boundary
        if (enableAudioSnap && dragState.trackType === 'visual') {
          const proposedStart = dragState.originalStart + startDelta
          const snappedStart = findNearestAudioBoundary(proposedStart)
          if (snappedStart !== null) {
            startDelta = snappedStart - dragState.originalStart
          }
        }
        durationDelta = -startDelta
      } else if (dragState.type === 'resize-right') {
        durationDelta = Math.max(0.5 - dragState.originalDuration, deltaTime)
        
        // Snap right edge to audio boundary
        if (enableAudioSnap && dragState.trackType === 'visual') {
          const proposedEnd = dragState.originalStart + dragState.originalDuration + durationDelta
          const snappedEnd = findNearestAudioBoundary(proposedEnd)
          if (snappedEnd !== null) {
            durationDelta = snappedEnd - dragState.originalStart - dragState.originalDuration
          }
        }
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
        }, 50) // Reduced from 100ms for faster persistence
      }
      
      // Clear local offsets after a longer delay to prevent snap-back
      // Wait for prop update to complete before clearing optimistic state
      setTimeout(() => {
        setLocalClipOffsets(prev => {
          const next = { ...prev }
          delete next[dragState.clipId]
          return next
        })
      }, 500) // Increased from 200ms to 500ms
      
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
    clip: { 
      id: string; 
      startTime: number; 
      duration: number; 
      label?: string; 
      url?: string; 
      thumbnailUrl?: string;
      endThumbnailUrl?: string;
      anchorStatus?: 'pending' | 'start-locked' | 'end-pending' | 'fully-anchored';
      exceedsVideoLimit?: boolean;
    },
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
          "absolute rounded-sm transition-shadow",
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
        {/* Background with thumbnail(s) */}
        <div className={cn("absolute inset-0", color)}>
          {showThumbnail && trackType === 'visual' && (clip.thumbnailUrl || clip.endThumbnailUrl) ? (
            // Visual segments always show both frames side by side
            <div className="absolute inset-0 flex">
              {/* Always show both frames - start on left, end on right */}
              <>
                {clip.thumbnailUrl && (
                  <div 
                    className={cn(
                      "h-full bg-cover bg-center opacity-70",
                      clip.endThumbnailUrl ? "w-1/2 border-r border-white/30" : "w-full"
                    )}
                    style={{ backgroundImage: `url(${clip.thumbnailUrl})` }}
                  >
                    {clip.endThumbnailUrl && (
                      <div className="absolute bottom-0.5 left-0.5 bg-black/60 px-1 rounded text-[7px] text-white/80">S</div>
                    )}
                  </div>
                )}
                {clip.endThumbnailUrl && (
                  <div 
                    className="w-1/2 h-full bg-cover bg-center opacity-70"
                    style={{ backgroundImage: `url(${clip.endThumbnailUrl})` }}
                  >
                    <div className="absolute bottom-0.5 right-0.5 bg-black/60 px-1 rounded text-[7px] text-white/80">E</div>
                  </div>
                )}
              </>
            </div>
          ) : showThumbnail && clip.thumbnailUrl ? (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-60"
              style={{ backgroundImage: `url(${clip.thumbnailUrl})` }}
            />
          ) : null}
          
          {/* Anchor status badge for visual clips */}
          {trackType === 'visual' && clip.anchorStatus && clip.anchorStatus !== 'pending' && (
            <div className={cn(
              "absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[7px] font-medium",
              clip.anchorStatus === 'fully-anchored' && "bg-green-500/90 text-white",
              clip.anchorStatus === 'start-locked' && "bg-amber-500/90 text-white",
              clip.anchorStatus === 'end-pending' && "bg-blue-500/90 text-white"
            )}>
              {clip.anchorStatus === 'fully-anchored' ? '✓ FTV' : clip.anchorStatus === 'start-locked' ? 'S✓' : 'E?'}
            </div>
          )}
          
          {/* Video limit warning badge */}
          {trackType === 'visual' && clip.exceedsVideoLimit && (
            <div className="absolute top-0.5 right-6 bg-amber-500/90 px-1 py-0.5 rounded text-[7px] font-medium text-white" title="Segment exceeds 8s - will be split for video generation">
              &gt;8s
            </div>
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
        
        {/* Edit/Delete buttons - visible on hover for visual segments only */}
        {trackType === 'visual' && (
          <div className="absolute top-1 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-30">
            <button
              type="button"
              onClick={(e) => { 
                e.stopPropagation(); 
                // Select segment to edit in side panel
                onSegmentSelect(clip.id);
              }}
              className="p-1 rounded bg-black/70 hover:bg-sf-primary/80 text-white transition-colors shadow-md"
              title="Edit segment"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {onDeleteSegment && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (segments.length <= 1) {
                    toast.error('Cannot delete the only segment');
                    return;
                  }
                  if (window.confirm('Delete this segment?')) onDeleteSegment(clip.id);
                }}
                className="p-1 rounded bg-black/70 hover:bg-red-500/80 text-white transition-colors shadow-md"
                title="Delete segment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
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
          className="flex-shrink-0 flex items-center justify-between px-3 bg-gray-100 dark:bg-gray-800 z-30 border-r border-gray-200 dark:border-gray-700"
          style={{ width: TRACK_LABEL_WIDTH, position: 'sticky', left: 0, marginLeft: -TRACK_LABEL_WIDTH }}
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
          </div>
          <button
            className={cn(
              "p-1.5 rounded transition-colors",
              isEnabled 
                ? "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
                : "text-red-400 hover:text-red-500"
            )}
            onClick={() => toggleTrack(trackType)}
            title={isEnabled ? 'Mute track' : 'Unmute track'}
          >
            {isEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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
              <span className="text-xs text-gray-400 italic">
                {staleUrls.size > 0 ? 'Audio file missing - regenerate' : 'No audio'}
              </span>
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
  
  // Always display both frames - start frame for first half of duration, end frame for second half
  const getDisplayFrameUrl = useCallback((): string | undefined => {
    if (!currentVisualClip) return undefined
    
    const clipStartTime = currentVisualClip.startTime
    const clipDuration = currentVisualClip.duration
    const positionInClip = currentTime - clipStartTime
    const halfDuration = clipDuration / 2
    
    // Always use "both" logic - switch from start to end frame at half duration
    if (positionInClip < halfDuration) {
      return currentVisualClip.thumbnailUrl
    } else {
      return currentVisualClip.endThumbnailUrl || currentVisualClip.thumbnailUrl
    }
  }, [currentVisualClip, currentTime])
  
  const displayFrameUrl = getDisplayFrameUrl()
  
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
          ) : displayFrameUrl ? (
            <img src={displayFrameUrl} alt="Preview" className="w-full h-full object-contain" />
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
              {/* Baseline timing indicator - shows when using non-baseline language */}
              {selectedLanguage !== baselineLanguage && (
                <div 
                  className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 border border-blue-700/50 rounded text-[10px] text-blue-300"
                  title={`Timeline positions anchored to ${LANGUAGE_LABELS[baselineLanguage] || baselineLanguage.toUpperCase()} timing`}
                >
                  <Anchor className="w-3 h-3" />
                  <span>{LANGUAGE_LABELS[baselineLanguage] || baselineLanguage.toUpperCase()}</span>
                </div>
              )}
              {/* Playback Offset Control - for translated audio alignment */}
              {selectedLanguage !== baselineLanguage && onPlaybackOffsetChange && (
                <div 
                  className="flex items-center gap-2 px-2 py-1 bg-purple-900/30 border border-purple-700/50 rounded"
                  title="Extend each segment for translated audio playback"
                >
                  <Clock className="w-3 h-3 text-purple-300" />
                  <span className="text-[10px] text-purple-300">Delay:</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={playbackOffset}
                    onChange={(e) => onPlaybackOffsetChange(parseFloat(e.target.value) || 0)}
                    className="w-12 h-5 px-1 text-[10px] text-center bg-purple-950 border border-purple-700 rounded text-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <span className="text-[10px] text-purple-300">s</span>
                  {suggestedOffset !== undefined && suggestedOffset > 0 && playbackOffset === 0 && (
                    <button
                      onClick={() => onPlaybackOffsetChange(suggestedOffset)}
                      className="text-[9px] px-1.5 py-0.5 bg-purple-700 hover:bg-purple-600 rounded text-purple-100 transition-colors"
                      title={`Apply suggested offset of +${suggestedOffset}s based on audio duration difference`}
                    >
                      +{suggestedOffset}s
                    </button>
                  )}
                </div>
              )}
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
          {/* Audio Snap Toggle - Align segments to audio boundaries */}
          <Button
            variant={enableAudioSnap ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs gap-1 px-2",
              enableAudioSnap && "bg-cyan-600 hover:bg-cyan-700 text-white"
            )}
            onClick={() => setEnableAudioSnap(!enableAudioSnap)}
            title={enableAudioSnap ? 'Disable audio snap (segments snap to audio boundaries)' : 'Enable audio snap (segments snap to audio boundaries)'}
          >
            <Link2 className="w-3 h-3" />
            Snap
          </Button>
          
          {/* Fit-to-Dialogue - Auto-size selected segment to match dialogue duration */}
          {onFitSegmentToDialogue && selectedSegmentId && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
              onClick={() => onFitSegmentToDialogue(selectedSegmentId)}
              title="Auto-size segment to fit assigned dialogue duration"
            >
              <Mic className="w-3 h-3" />
              Fit Audio
            </Button>
          )}
          
          {/* Auto-Align Keyframes to Audio */}
          {onApplyIntelligentAlignment && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
              onClick={onApplyIntelligentAlignment}
              title="Auto-align keyframes to narration/dialogue start positions"
            >
              <Magnet className="w-3 h-3" />
              Auto-Align
            </Button>
          )}
          
          {/* Open Segment Prompt Dialog */}
          {onOpenSegmentPromptDialog && selectedSegmentId && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 px-2"
              onClick={() => onOpenSegmentPromptDialog(selectedSegmentId)}
              title="Edit segment prompt and settings"
            >
              <MessageSquare className="w-3 h-3" />
              Edit
            </Button>
          )}
          
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
          
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
            <>
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
              {/* Baseline timing indicator */}
              {selectedLanguage !== baselineLanguage && (
                <div 
                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700/50 rounded text-[10px] text-blue-700 dark:text-blue-300"
                  title={`Timeline positions anchored to ${LANGUAGE_LABELS[baselineLanguage] || baselineLanguage.toUpperCase()} timing`}
                >
                  <Anchor className="w-3 h-3" />
                  <span>{LANGUAGE_LABELS[baselineLanguage] || baselineLanguage.toUpperCase()}</span>
                </div>
              )}
            </>
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
      <div ref={timelineRef} className="relative overflow-x-auto overflow-y-visible" onClick={handleTimelineClick}>
        <div className={cn("min-w-[600px]", isTimelineWide && "min-w-[1000px]")} style={{ marginLeft: TRACK_LABEL_WIDTH }}>
        {/* Time ruler */}
        <div className="flex items-stretch h-6 border-b border-gray-200 dark:border-gray-700">
          <div 
            className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 z-30 border-r border-gray-200 dark:border-gray-700"
            style={{ width: TRACK_LABEL_WIDTH, position: 'sticky', left: 0, marginLeft: -TRACK_LABEL_WIDTH }}
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
        
        {/* Segments Track - Primary visual segmentation (Keyframes/Video) */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className={cn(
            "flex items-stretch transition-all duration-200", 
            isTimelineExpanded ? "h-24" : "h-16",
            !(trackEnabled.keyframes ?? true) && "opacity-50"
          )}>
            <div 
              className="flex-shrink-0 flex items-center justify-between px-3 bg-gray-100 dark:bg-gray-800 z-30 border-r border-gray-200 dark:border-gray-700"
              style={{ width: TRACK_LABEL_WIDTH, position: 'sticky', left: 0, marginLeft: -TRACK_LABEL_WIDTH }}
            >
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Keyframes</span>
              </div>
              {/* Mute/Unmute toggle for Keyframes track */}
              <button
                className={cn(
                  "p-1.5 rounded transition-colors",
                  (trackEnabled.keyframes ?? true)
                    ? "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
                    : "text-red-400 hover:text-red-500"
                )}
                onClick={() => setTrackEnabled(prev => ({ ...prev, keyframes: !(prev.keyframes ?? true) }))}
                title={(trackEnabled.keyframes ?? true) ? 'Hide keyframes' : 'Show keyframes'}
              >
                {(trackEnabled.keyframes ?? true) ? <Layers className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </button>
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
                        label: clip.isEstablishingShot ? 'Estab.' : `KF ${clip.sequenceIndex + 1}`,
                        url: clip.url,
                        thumbnailUrl: clip.thumbnailUrl,
                        endThumbnailUrl: clip.endThumbnailUrl,
                        anchorStatus: clip.anchorStatus,
                        exceedsVideoLimit: clip.exceedsVideoLimit,
                      },
                      'visual',
                      'bg-gradient-to-r from-orange-500 to-amber-500',
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
        
        {/* Audio tracks - show based on original data, render valid clips only */}
        {/* Track rows stay visible even if audio 404'd, showing "file missing" state */}
        {(audioTracks.voiceover || filteredAudioTracks.voiceover) && renderAudioTrack(
          'voiceover',
          'Narration',
          <Mic className="w-4 h-4 text-green-500" />,
          filteredAudioTracks.voiceover ? [filteredAudioTracks.voiceover] : [],
          'bg-gradient-to-r from-green-500 to-green-600'
        )}
        
        {(audioTracks.dialogue.length > 0 || filteredAudioTracks.dialogue.length > 0) && renderAudioTrack(
          'dialogue',
          'Dialogue',
          <MessageSquare className="w-4 h-4 text-purple-500" />,
          filteredAudioTracks.dialogue,
          'bg-gradient-to-r from-purple-500 to-purple-600'
        )}
        
        {(audioTracks.music || filteredAudioTracks.music) && renderAudioTrack(
          'music',
          'Music',
          <Music className="w-4 h-4 text-amber-500" />,
          filteredAudioTracks.music ? [filteredAudioTracks.music] : [],
          'bg-gradient-to-r from-amber-500 to-amber-600'
        )}
        
        {(audioTracks.sfx.length > 0 || filteredAudioTracks.sfx.length > 0) && renderAudioTrack(
          'sfx',
          'SFX',
          <Zap className="w-4 h-4 text-red-500" />,
          filteredAudioTracks.sfx,
          'bg-gradient-to-r from-red-500 to-red-600'
        )}
        
        {/* Segment coverage warning - show when segments don't cover audio duration */}
        {(() => {
          // Calculate total audio duration
          let totalAudioDuration = 0
          if (filteredAudioTracks.voiceover) {
            totalAudioDuration = Math.max(totalAudioDuration, filteredAudioTracks.voiceover.startTime + filteredAudioTracks.voiceover.duration)
          }
          if (filteredAudioTracks.dialogue.length > 0) {
            const lastDialogueEnd = Math.max(...filteredAudioTracks.dialogue.map(d => d.startTime + d.duration))
            totalAudioDuration = Math.max(totalAudioDuration, lastDialogueEnd)
          }
          
          // Check if segments cover the audio
          const segmentCoverage = sceneDuration
          const coverageGap = totalAudioDuration - segmentCoverage
          const MAX_SEGMENT_SECONDS = 8
          const segmentsNeeded = Math.ceil(totalAudioDuration / MAX_SEGMENT_SECONDS)
          const segmentShortfall = segmentsNeeded - visualClips.length
          
          if (coverageGap > 0.5 && segmentShortfall > 0) {
            return (
              <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    {visualClips.length === 0 
                      ? `Audio is ${totalAudioDuration.toFixed(1)}s. Generate ${segmentsNeeded} segments (${segmentsNeeded} × 8s = ${segmentsNeeded * 8}s) to cover the audio.`
                      : `Audio is ${totalAudioDuration.toFixed(1)}s but segments only cover ${segmentCoverage.toFixed(1)}s. Add ${segmentShortfall} more segment${segmentShortfall > 1 ? 's' : ''} or click Auto-Align.`
                    }
                  </span>
                </div>
                {onApplyIntelligentAlignment && (
                  <button
                    onClick={onApplyIntelligentAlignment}
                    className="text-xs px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
                  >
                    Auto-Align
                  </button>
                )}
              </div>
            )
          }
          return null
        })()}
        
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
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
          style={{ left: currentTime * pixelsPerSecond }}
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
