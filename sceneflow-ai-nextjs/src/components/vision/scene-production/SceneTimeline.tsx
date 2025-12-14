'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { 
  Play, Pause, Volume2, VolumeX, Mic, Music, Zap, 
  SkipBack, SkipForward, Film, Download, Plus, Trash2, X, Maximize2, Minimize2, Info, MessageSquare, GripVertical
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { SceneSegment } from './types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
// Phase 7: Drag-and-drop segment reordering
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface AudioTrackClip {
  id: string
  url?: string
  startTime: number  // In seconds, relative to scene start
  duration: number   // In seconds
  label?: string
  volume?: number    // 0-1
  trimStart?: number // Offset from start of source
  trimEnd?: number   // Offset from end of source
}

export interface VisualClip {
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
  // Establishing shot metadata
  isEstablishingShot?: boolean
  establishingShotType?: string
  shotNumber?: number
}

export interface AudioTracksData {
  voiceover?: AudioTrackClip
  dialogue?: AudioTrackClip[]
  music?: AudioTrackClip
  sfx?: AudioTrackClip[]
}

interface SceneTimelineProps {
  segments: SceneSegment[]
  selectedSegmentId?: string
  onSegmentSelect: (segmentId: string) => void
  audioTracks?: AudioTracksData
  onPlayheadChange?: (time: number, segmentId?: string) => void
  onGenerateSceneMp4?: () => void
  onVisualClipChange?: (clipId: string, changes: { startTime?: number; duration?: number; trimStart?: number; trimEnd?: number }) => void
  onAudioClipChange?: (trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => void
  onAddSegment?: (afterSegmentId: string | null, duration: number) => void
  onDeleteSegment?: (segmentId: string) => void
  // Phase 2: Dialogue coverage indicators
  dialogueAssignments?: Record<string, Set<string>>
  // Phase 7: Segment reordering
  onReorderSegments?: (oldIndex: number, newIndex: number) => void
  // Establishing Shot support
  onAddEstablishingShot?: () => void
  sceneFrameUrl?: string | null
}

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

// Phase 7: Sortable wrapper for visual clips
interface SortableClipWrapperProps {
  id: string
  children: React.ReactNode
  disabled?: boolean
}

function SortableClipWrapper({ id, children, disabled }: SortableClipWrapperProps) {
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

export function SceneTimeline({
  segments,
  selectedSegmentId,
  onSegmentSelect,
  audioTracks,
  onPlayheadChange,
  onGenerateSceneMp4,
  onVisualClipChange,
  onAudioClipChange,
  onAddSegment,
  onDeleteSegment,
  dialogueAssignments,
  onReorderSegments,
  onAddEstablishingShot,
  sceneFrameUrl,
}: SceneTimelineProps) {
  // Capture callbacks in stable refs to avoid closure issues
  const addSegmentCallback = typeof onAddSegment === 'function' ? onAddSegment : undefined
  const deleteSegmentCallback = typeof onDeleteSegment === 'function' ? onDeleteSegment : undefined
  const reorderSegmentsCallback = typeof onReorderSegments === 'function' ? onReorderSegments : undefined
  const addEstablishingShotCallback = typeof onAddEstablishingShot === 'function' ? onAddEstablishingShot : undefined
  
  // Phase 7: DnD sensors for segment reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before activating
      },
    })
  )
  
  // Phase 7: Handle drag end for segment reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !reorderSegmentsCallback) return
    
    const oldIndex = segments.findIndex(s => s.segmentId === active.id)
    const newIndex = segments.findIndex(s => s.segmentId === over.id)
    
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderSegmentsCallback(oldIndex, newIndex)
    }
  }, [segments, reorderSegmentsCallback])
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)
  const [showAddSegmentDialog, setShowAddSegmentDialog] = useState(false)
  const [newSegmentDuration, setNewSegmentDuration] = useState(4)
  
  // Tooltip state for hovering over clips (visual segments and audio)
  const [hoveredClip, setHoveredClip] = useState<{ id: string; trackType: string; label?: string; startTime: number; duration: number; prompt?: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sceneflow-muted-tracks')
      if (saved) return new Set(JSON.parse(saved))
    }
    return new Set()
  })
  
  // Track volume and enabled state - persist to localStorage
  const [trackVolumes, setTrackVolumes] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sceneflow-track-volumes')
      if (saved) return JSON.parse(saved)
    }
    return { voiceover: 1, dialogue: 1, music: 0.6, sfx: 0.8 }
  })
  const [trackEnabled, setTrackEnabled] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sceneflow-track-enabled')
      if (saved) return JSON.parse(saved)
    }
    return { voiceover: true, dialogue: true, music: true, sfx: true }
  })
  
  // Persist track settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneflow-muted-tracks', JSON.stringify([...mutedTracks]))
    }
  }, [mutedTracks])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneflow-track-volumes', JSON.stringify(trackVolumes))
    }
  }, [trackVolumes])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sceneflow-track-enabled', JSON.stringify(trackEnabled))
    }
  }, [trackEnabled])
  
  // Portal mount state for tooltips (needed to render outside Dialog transform context)
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Drag/resize state
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-left' | 'resize-right'
    trackType: 'visual' | 'voiceover' | 'dialogue' | 'music' | 'sfx'
    clipId: string
    startX: number
    originalStart: number
    originalDuration: number
  } | null>(null)
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const tracksContainerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  
  // Build visual clips from segments
  const visualClips = useMemo<VisualClip[]>(() => {
    return segments.map(seg => ({
      id: seg.segmentId,
      segmentId: seg.segmentId,
      url: seg.activeAssetUrl || undefined,
      thumbnailUrl: seg.references.thumbnailUrl || seg.activeAssetUrl || undefined,
      startTime: seg.startTime,
      duration: seg.endTime - seg.startTime,
      originalDuration: seg.endTime - seg.startTime,
      trimStart: 0,
      trimEnd: 0,
      status: seg.status,
      sequenceIndex: seg.sequenceIndex,
      prompt: seg.prompt,
      // Establishing shot metadata
      isEstablishingShot: seg.isEstablishingShot,
      establishingShotType: seg.establishingShotType,
      shotNumber: seg.shotNumber,
    }))
  }, [segments])
  
  // Calculate scene duration
  const sceneDuration = useMemo(() => {
    if (visualClips.length === 0) return 10
    const lastClip = visualClips[visualClips.length - 1]
    return lastClip.startTime + lastClip.duration
  }, [visualClips])
  
  // Calculate pixels per second
  const [containerWidth, setContainerWidth] = useState(600)
  const TRACK_LABEL_WIDTH = 80  // Base label width (audio tracks add +20 for controls)
  const AUDIO_TRACK_LABEL_WIDTH = TRACK_LABEL_WIDTH + 20
  const timelineWidth = containerWidth - AUDIO_TRACK_LABEL_WIDTH
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

  // Collect all audio clips with resolved durations
  const [resolvedDurations, setResolvedDurations] = useState<Record<string, number>>({})
  
  // Load actual durations from audio files when they're 0 or missing
  useEffect(() => {
    const loadDurations = async () => {
      const toResolve: Array<{ id: string; url: string }> = []
      
      // Check voiceover
      if (audioTracks?.voiceover?.url && (!audioTracks.voiceover.duration || audioTracks.voiceover.duration === 0)) {
        toResolve.push({ id: 'vo-' + audioTracks.voiceover.id, url: audioTracks.voiceover.url })
      }
      
      // Check dialogue
      audioTracks?.dialogue?.forEach(d => {
        if (d.url && (!d.duration || d.duration === 0)) {
          toResolve.push({ id: 'dialogue-' + d.id, url: d.url })
        }
      })
      
      // Check sfx
      audioTracks?.sfx?.forEach(s => {
        if (s.url && (!s.duration || s.duration === 0)) {
          toResolve.push({ id: 'sfx-' + s.id, url: s.url })
        }
      })
      
      if (toResolve.length === 0) return
      
      const newDurations: Record<string, number> = { ...resolvedDurations }
      
      await Promise.all(toResolve.map(async ({ id, url }) => {
        if (newDurations[id]) return // Already resolved
        
        try {
          const audio = new Audio(url)
          await new Promise<void>((resolve, reject) => {
            audio.addEventListener('loadedmetadata', () => {
              newDurations[id] = audio.duration
              resolve()
            })
            audio.addEventListener('error', () => reject(new Error('Failed to load audio')))
            audio.load()
            setTimeout(() => reject(new Error('Timeout')), 10000)
          })
        } catch (error) {
          console.warn(`[Timeline] Failed to get duration for ${id}:`, error)
          newDurations[id] = 3 // Default fallback
        }
      }))
      
      setResolvedDurations(newDurations)
    }
    
    loadDurations()
  }, [audioTracks])
  
  const allAudioClips = useMemo(() => {
    const clips: Array<{ type: string; clip: AudioTrackClip }> = []
    if (audioTracks?.voiceover?.url) {
      const resolvedDuration = resolvedDurations['vo-' + audioTracks.voiceover.id]
      clips.push({ 
        type: 'voiceover', 
        clip: {
          ...audioTracks.voiceover,
          duration: audioTracks.voiceover.duration || resolvedDuration || 0
        }
      })
    }
    audioTracks?.dialogue?.forEach(d => {
      if (d.url) {
        const resolvedDuration = resolvedDurations['dialogue-' + d.id]
        clips.push({ 
          type: 'dialogue', 
          clip: {
            ...d,
            duration: d.duration || resolvedDuration || 0
          }
        })
      }
    })
    if (audioTracks?.music?.url) {
      clips.push({ type: 'music', clip: audioTracks.music })
    }
    audioTracks?.sfx?.forEach(s => {
      if (s.url) {
        const resolvedDuration = resolvedDurations['sfx-' + s.id]
        clips.push({ 
          type: 'sfx', 
          clip: {
            ...s,
            duration: s.duration || resolvedDuration || 0
          }
        })
      }
    })
    return clips
  }, [audioTracks, resolvedDurations])

  // Find current visual clip at playhead
  const getCurrentVisualClip = useCallback((time: number): VisualClip | undefined => {
    for (const clip of visualClips) {
      if (time >= clip.startTime && time < clip.startTime + clip.duration) {
        return clip
      }
    }
    return visualClips[visualClips.length - 1]
  }, [visualClips])

  // Playback control
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
        
        // Find and play current visual
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
        
        // Sync audio tracks - respect enabled state, mute, and volume
        allAudioClips.forEach(({ type, clip }) => {
          const audio = audioRefs.current.get(clip.id)
          const isEnabled = trackEnabled[type] ?? true
          const isMuted = mutedTracks.has(type)
          const volume = trackVolumes[type] ?? 1
          
          if (audio) {
            // Set volume
            audio.volume = isMuted ? 0 : volume
            
            // Only play if track is enabled and not muted
            if (!isEnabled || isMuted) {
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
  }, [isPlaying, currentTime, sceneDuration, getCurrentVisualClip, allAudioClips, mutedTracks, trackEnabled, trackVolumes, onPlayheadChange])

  // Seek control
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - (TRACK_LABEL_WIDTH + 20)
    if (x < 0) return
    
    const newTime = Math.max(0, Math.min(sceneDuration, x / pixelsPerSecond))
    setCurrentTime(newTime)
    startTimeRef.current = performance.now() - newTime * 1000
    
    const currentClip = getCurrentVisualClip(newTime)
    if (currentClip && videoRef.current && currentClip.url) {
      videoRef.current.src = currentClip.url
      videoRef.current.currentTime = newTime - currentClip.startTime + currentClip.trimStart
    }
    
    allAudioClips.forEach(({ type, clip }) => {
      const audio = audioRefs.current.get(clip.id)
      const isEnabled = trackEnabled[type] ?? true
      const isMuted = mutedTracks.has(type)
      const volume = trackVolumes[type] ?? 1
      
      if (audio) {
        audio.volume = isMuted ? 0 : volume
        const clipStart = clip.startTime
        const clipEnd = clip.startTime + clip.duration
        if (newTime >= clipStart && newTime < clipEnd) {
          audio.currentTime = newTime - clipStart + (clip.trimStart || 0)
          if (isPlaying && isEnabled && !isMuted) {
            audio.play().catch(() => {})
          }
        } else {
          audio.pause()
          audio.currentTime = 0
        }
      }
    })
    
    onPlayheadChange?.(newTime, currentClip?.segmentId)
  }, [dragState, sceneDuration, pixelsPerSecond, getCurrentVisualClip, allAudioClips, isPlaying, mutedTracks, trackEnabled, trackVolumes, onPlayheadChange])

  // Drag handlers for clip editing
  const handleClipMouseDown = useCallback((
    e: React.MouseEvent,
    trackType: 'visual' | 'voiceover' | 'dialogue' | 'music' | 'sfx',
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

  // Mouse move/up handlers for dragging
  useEffect(() => {
    if (!dragState) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX
      const deltaTime = deltaX / pixelsPerSecond
      
      if (dragState.type === 'move') {
        const newStart = Math.max(0, dragState.originalStart + deltaTime)
        if (dragState.trackType === 'visual') {
          onVisualClipChange?.(dragState.clipId, { startTime: newStart })
        } else {
          onAudioClipChange?.(dragState.trackType, dragState.clipId, { startTime: newStart })
        }
      } else if (dragState.type === 'resize-left') {
        const newStart = Math.max(0, Math.min(dragState.originalStart + dragState.originalDuration - 0.5, dragState.originalStart + deltaTime))
        const newDuration = dragState.originalDuration - (newStart - dragState.originalStart)
        if (dragState.trackType === 'visual') {
          onVisualClipChange?.(dragState.clipId, { 
            startTime: newStart, 
            duration: newDuration,
            trimStart: newStart - dragState.originalStart 
          })
        } else {
          onAudioClipChange?.(dragState.trackType, dragState.clipId, { startTime: newStart, duration: newDuration })
        }
      } else if (dragState.type === 'resize-right') {
        const newDuration = Math.max(0.5, dragState.originalDuration + deltaTime)
        if (dragState.trackType === 'visual') {
          onVisualClipChange?.(dragState.clipId, { duration: newDuration })
        } else {
          onAudioClipChange?.(dragState.trackType, dragState.clipId, { duration: newDuration })
        }
      }
    }
    
    const handleMouseUp = () => setDragState(null)
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, pixelsPerSecond, onVisualClipChange, onAudioClipChange])

  const toggleMute = useCallback((trackType: string) => {
    setMutedTracks(prev => {
      const next = new Set(prev)
      if (next.has(trackType)) {
        next.delete(trackType)
      } else {
        next.add(trackType)
        allAudioClips.filter(c => c.type === trackType).forEach(({ clip }) => {
          audioRefs.current.get(clip.id)?.pause()
        })
      }
      return next
    })
  }, [allAudioClips])

  const skipTo = useCallback((time: number) => {
    const newTime = Math.max(0, Math.min(sceneDuration, time))
    setCurrentTime(newTime)
    startTimeRef.current = performance.now() - newTime * 1000
    onPlayheadChange?.(newTime, getCurrentVisualClip(newTime)?.segmentId)
  }, [sceneDuration, getCurrentVisualClip, onPlayheadChange])

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const timeMarkers = useMemo(() => {
    const markers: number[] = []
    const interval = sceneDuration > 60 ? 15 : sceneDuration > 30 ? 10 : sceneDuration > 10 ? 5 : 2
    for (let t = 0; t <= sceneDuration; t += interval) {
      markers.push(t)
    }
    return markers
  }, [sceneDuration])

  const currentVisualClip = getCurrentVisualClip(currentTime)

  // Render a draggable/resizable clip
  const renderClip = (
    clip: { id: string; startTime: number; duration: number; label?: string; url?: string; thumbnailUrl?: string; sequenceIndex?: number; prompt?: string; status?: string; isEstablishingShot?: boolean; establishingShotType?: string; shotNumber?: number },
    trackType: 'visual' | 'voiceover' | 'dialogue' | 'music' | 'sfx',
    color: string,
    showThumbnail: boolean = false
  ) => {
    const left = clip.startTime * pixelsPerSecond
    const width = Math.max(clip.duration * pixelsPerSecond, 20)
    const isSelected = trackType === 'visual' && clip.id === selectedSegmentId
    const isDragging = dragState?.clipId === clip.id
    const canDelete = trackType === 'visual' && visualClips.length > 1
    const isHovered = hoveredClip?.id === clip.id
    
    return (
      <div
        key={clip.id}
        className={cn(
          "absolute rounded-sm overflow-hidden transition-shadow",
          "group cursor-move select-none",
          isSelected && "ring-2 ring-sf-primary ring-offset-1 ring-offset-gray-900 z-10",
          isDragging && "opacity-70 shadow-lg z-20",
          !isDragging && "hover:shadow-md"
        )}
        style={{ left, width, top: '2px', bottom: '2px' }}
        onMouseDown={(e) => {
          if (trackType === 'visual') onSegmentSelect(clip.id)
          handleClipMouseDown(e, trackType, clip.id, 'move', clip.startTime, clip.duration)
        }}
        onMouseEnter={(e) => {
          setHoveredClip({
            id: clip.id,
            trackType,
            label: clip.label,
            startTime: clip.startTime,
            duration: clip.duration,
            prompt: clip.prompt,
          })
          const rect = e.currentTarget.getBoundingClientRect()
          setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 8 })
        }}
        onMouseLeave={() => {
          setHoveredClip(null)
          setTooltipPosition(null)
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
        
        {/* Delete button for visual clips */}
        {trackType === 'visual' && canDelete && deleteSegmentCallback && (
          <button
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-30 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              deleteSegmentCallback(clip.id)
            }}
            title="Delete segment"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
        
        {/* Dialogue indicator badge for visual clips */}
        {trackType === 'visual' && dialogueAssignments && dialogueAssignments[clip.id] && dialogueAssignments[clip.id].size > 0 && (
          <div
            className="absolute top-0.5 left-0.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-purple-500/90 text-white z-20"
            title={`${dialogueAssignments[clip.id].size} dialogue line(s) assigned`}
          >
            <MessageSquare className="w-2.5 h-2.5" />
            <span className="text-[7px] font-bold">{dialogueAssignments[clip.id].size}</span>
          </div>
        )}
        
        {/* Left resize handle - more visible */}
        <div
          className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 bg-blue-500/0 hover:bg-blue-500/40 flex items-center justify-center transition-colors"
          onMouseDown={(e) => handleClipMouseDown(e, trackType, clip.id, 'resize-left', clip.startTime, clip.duration)}
        >
          <div className="w-1 h-6 bg-blue-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity shadow-sm" />
        </div>
        
        {/* Right resize handle - more visible */}
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 bg-blue-500/0 hover:bg-blue-500/40 flex items-center justify-center transition-colors"
          onMouseDown={(e) => handleClipMouseDown(e, trackType, clip.id, 'resize-right', clip.startTime, clip.duration)}
        >
          <div className="w-1 h-6 bg-blue-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity shadow-sm" />
        </div>
        
        <div className="relative z-10 h-full flex items-end justify-between px-1 py-0.5 pointer-events-none">
          <span className="text-[8px] font-bold text-white/90 truncate flex items-center gap-1">
            {clip.isEstablishingShot ? (
              <>
                <Film className="w-2.5 h-2.5 text-purple-200" />
                {clip.establishingShotType === 'b-roll-cutaway' 
                  ? `B-Roll ${clip.shotNumber || ''}`
                  : clip.establishingShotType === 'living-painting'
                    ? 'Ambient'
                    : 'Estab.'}
              </>
            ) : (
              clip.label || (trackType === 'visual' && typeof clip.sequenceIndex === 'number' ? `Seg ${clip.sequenceIndex + 1}` : '')
            )}
          </span>
          {width > 40 && (
            <span className="text-[7px] text-white/70 font-mono">
              {clip.duration.toFixed(1)}s
            </span>
          )}
        </div>
      </div>
    )
  }

  const renderVisualTrack = () => {
    const lastClip = visualClips[visualClips.length - 1]
    const addButtonLeft = lastClip ? (lastClip.startTime + lastClip.duration) * pixelsPerSecond + 4 : 4
    const clipIds = visualClips.map(clip => clip.segmentId)
    
    // Check if there's already an establishing shot
    const hasEstablishingShot = visualClips.some(clip => clip.isEstablishingShot)
    
    const trackContent = (
      <div className="flex items-stretch h-16 group">
        <div 
          className="flex-shrink-0 flex items-center gap-1.5 px-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700"
          style={{ width: AUDIO_TRACK_LABEL_WIDTH }}
        >
          <Film className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Visual
          </span>
          {reorderSegmentsCallback && (
            <GripVertical className="w-3 h-3 text-gray-400 ml-auto" title="Drag segments to reorder" />
          )}
        </div>
        <div className="flex-1 relative bg-gray-900 border-b border-gray-700">
          {visualClips.map(clip => {
            // Determine color based on establishing shot status and generation status
            let clipColor: string
            if (clip.isEstablishingShot) {
              // Purple gradient for establishing shots
              clipColor = clip.status === 'COMPLETE' || clip.status === 'UPLOADED'
                ? 'bg-gradient-to-b from-purple-600 to-purple-700'
                : clip.status === 'GENERATING'
                ? 'bg-gradient-to-r from-purple-700 to-purple-800 animate-pulse'
                : 'bg-gradient-to-b from-purple-500 to-purple-600 border border-dashed border-purple-400'
            } else {
              // Standard colors for dialogue segments
              clipColor = clip.status === 'COMPLETE' || clip.status === 'UPLOADED'
                ? 'bg-gradient-to-b from-gray-600 to-gray-700'
                : clip.status === 'GENERATING'
                ? 'bg-gradient-to-r from-amber-700 to-amber-800 animate-pulse'
                : 'bg-gradient-to-b from-gray-500 to-gray-600 border border-dashed border-gray-400'
            }
            return renderClip(
              { ...clip, thumbnailUrl: clip.thumbnailUrl },
              'visual',
              clipColor,
              true
            )
          })}
          
          {/* Add Segment Button */}
          {addSegmentCallback && (
            <button
              className="absolute top-1/2 -translate-y-1/2 h-10 px-2 rounded bg-gray-700 hover:bg-gray-600 border border-dashed border-gray-500 hover:border-gray-400 text-gray-400 hover:text-gray-200 transition-all flex items-center gap-1 text-[10px] font-medium"
              style={{ left: addButtonLeft }}
              onClick={() => setShowAddSegmentDialog(true)}
              title="Add new segment"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    )
    
    // Phase 7: Wrap in DndContext only if reordering is enabled
    if (reorderSegmentsCallback) {
      return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={clipIds} strategy={horizontalListSortingStrategy}>
            {trackContent}
          </SortableContext>
        </DndContext>
      )
    }
    
    return trackContent
  }

  const renderAudioTrack = (
    label: string,
    icon: React.ReactNode,
    trackType: 'voiceover' | 'dialogue' | 'music' | 'sfx',
    clips: AudioTrackClip[],
    color: string
  ) => {
    const isMuted = mutedTracks.has(trackType)
    const isEnabled = trackEnabled[trackType] ?? true
    const volume = trackVolumes[trackType] ?? 1
    
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value)
      setTrackVolumes(prev => ({ ...prev, [trackType]: newVolume }))
      // Update audio element volumes
      clips.forEach(clip => {
        const audio = audioRefs.current.get(clip.id)
        if (audio) audio.volume = newVolume
      })
    }
    
    const toggleEnabled = () => {
      const newEnabled = !isEnabled
      setTrackEnabled(prev => ({ ...prev, [trackType]: newEnabled }))
      if (!newEnabled) {
        // Pause audio when disabled
        clips.forEach(clip => {
          audioRefs.current.get(clip.id)?.pause()
        })
      }
    }
    
    return (
      <div className={cn("flex items-stretch h-12 group", !isEnabled && "opacity-50")}>
        <div 
          className="flex-shrink-0 flex flex-col justify-center gap-0.5 px-1.5 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700"
          style={{ width: TRACK_LABEL_WIDTH + 20 }}
        >
          <div className="flex items-center gap-1">
            {/* On/Off Toggle */}
            <button
              onClick={toggleEnabled}
              className={cn(
                "p-0.5 rounded transition-colors",
                isEnabled ? "text-green-500 hover:text-green-400" : "text-gray-400 hover:text-gray-300"
              )}
              title={isEnabled ? 'Disable track' : 'Enable track'}
            >
              <div className={cn("w-2 h-2 rounded-full", isEnabled ? "bg-green-500" : "bg-gray-400")} />
            </button>
            {/* Mute Button */}
            <button
              onClick={() => toggleMute(trackType)}
              disabled={!isEnabled}
              className={cn("p-0.5 rounded transition-colors", isMuted || !isEnabled ? "text-gray-400" : "text-gray-600 dark:text-gray-300")}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : icon}
            </button>
            <span className={cn("text-[9px] font-medium truncate flex-1", !isEnabled ? "text-gray-400" : isMuted ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300")}>
              {label}
            </span>
          </div>
          {/* Volume Slider */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            disabled={!isEnabled}
            className="w-full h-1 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
        </div>
        <div className={cn("flex-1 relative border-b border-gray-200 dark:border-gray-800", !isEnabled || isMuted ? "bg-gray-200 dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900")}>
          {visualClips.map(clip => (
            <div
              key={`marker-${clip.id}`}
              className="absolute top-0 bottom-0 border-r border-dashed border-gray-300 dark:border-gray-700 opacity-30"
              style={{ left: (clip.startTime + clip.duration) * pixelsPerSecond }}
            />
          ))}
          
          {clips.map(clip => renderClip(clip, trackType, color, false))}
          
          {clips.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] text-gray-400 italic">No {label.toLowerCase()}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (segments.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        No segments yet. Initialize scene production to create segments.
      </div>
    )
  }

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
      
      {/* Timeline Tracks */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden flex flex-col">

      {/* Timeline Header */}
      <div 
        ref={timelineRef}
        className="flex items-center h-5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 cursor-pointer"
        onClick={handleTimelineClick}
      >
        <div className="flex-shrink-0" style={{ width: AUDIO_TRACK_LABEL_WIDTH }} />
        <div className="flex-1 relative">
          {timeMarkers.map(t => (
            <div key={t} className="absolute text-[9px] text-gray-500 font-mono" style={{ left: t * pixelsPerSecond - 8 }}>
              {formatTimeShort(t)}
            </div>
          ))}
        </div>
      </div>

      {/* Tracks Container - Fixed height to show all 5 tracks */}
      <div ref={tracksContainerRef} className="relative flex-1 min-h-[200px]" onClick={handleTimelineClick}>
        {renderVisualTrack()}
        {renderAudioTrack('Narration', <Mic className="w-3 h-3" />, 'voiceover', audioTracks?.voiceover ? [audioTracks.voiceover] : [], 'bg-blue-500')}
        {renderAudioTrack('Dialogue', <Mic className="w-3 h-3" />, 'dialogue', audioTracks?.dialogue || [], 'bg-emerald-500')}
        {renderAudioTrack('Music', <Music className="w-3 h-3" />, 'music', audioTracks?.music ? [audioTracks.music] : [], 'bg-purple-500')}
        {renderAudioTrack('SFX', <Zap className="w-3 h-3" />, 'sfx', audioTracks?.sfx || [], 'bg-amber-500')}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
          style={{ left: AUDIO_TRACK_LABEL_WIDTH + currentTime * pixelsPerSecond }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rounded-full shadow-md" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-500" />
        </div>
      </div>
      </div>

      {/* Clip Hover Tooltip - rendered via portal to escape Dialog transform context */}
      {isMounted && hoveredClip && tooltipPosition && createPortal(
        (() => {
        // For visual clips, get extra info from visualClips
        const visualInfo = hoveredClip.trackType === 'visual' 
          ? visualClips.find(c => c.id === hoveredClip.id) 
          : null
        
        const getTrackLabel = (trackType: string) => {
          switch (trackType) {
            case 'visual': return 'Segment'
            case 'voiceover': return 'Narration'
            case 'dialogue': return 'Dialogue'
            case 'music': return 'Music'
            case 'sfx': return 'SFX'
            default: return 'Clip'
          }
        }
        
        const getTrackColor = (trackType: string) => {
          switch (trackType) {
            case 'visual': return 'bg-gray-600'
            case 'voiceover': return 'bg-blue-600'
            case 'dialogue': return 'bg-emerald-600'
            case 'music': return 'bg-purple-600'
            case 'sfx': return 'bg-amber-600'
            default: return 'bg-gray-600'
          }
        }
        
        return (
          <div 
            className="fixed z-[9999] bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 max-w-xs pointer-events-none"
            style={{ 
              left: tooltipPosition.x, 
              top: tooltipPosition.y,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded text-white", getTrackColor(hoveredClip.trackType))}>
                {getTrackLabel(hoveredClip.trackType)}
              </span>
              {visualInfo && (
                <>
                  <span className="text-xs font-bold text-white">
                    #{(visualInfo.sequenceIndex ?? 0) + 1}
                  </span>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded",
                    visualInfo.status === 'COMPLETE' || visualInfo.status === 'UPLOADED'
                      ? 'bg-green-900/50 text-green-400'
                      : visualInfo.status === 'GENERATING'
                      ? 'bg-amber-900/50 text-amber-400'
                      : 'bg-gray-700 text-gray-400'
                  )}>
                    {visualInfo.status || 'PENDING'}
                  </span>
                </>
              )}
            </div>
            <div className="text-[10px] text-gray-400 mb-2">
              {hoveredClip.startTime.toFixed(1)}s – {(hoveredClip.startTime + hoveredClip.duration).toFixed(1)}s ({hoveredClip.duration.toFixed(1)}s)
            </div>
            {hoveredClip.label && hoveredClip.trackType !== 'visual' && (
              <p className="text-xs text-gray-300 leading-relaxed line-clamp-3 mb-1">
                <span className="text-gray-500">Label:</span> {hoveredClip.label}
              </p>
            )}
            {hoveredClip.prompt && (
              <p className="text-xs text-gray-300 leading-relaxed line-clamp-4">
                {hoveredClip.prompt}
              </p>
            )}
            {!hoveredClip.prompt && !hoveredClip.label && hoveredClip.trackType !== 'visual' && (
              <p className="text-xs text-gray-500 italic">Audio clip</p>
            )}
            {!hoveredClip.prompt && hoveredClip.trackType === 'visual' && (
              <p className="text-xs text-gray-500 italic">No description</p>
            )}
          </div>
        )
      })(),
        document.body
      )}

      {/* Hidden Audio Elements */}
      {allAudioClips.map(({ clip }) => (
        clip.url && (
          <audio
            key={clip.id}
            ref={el => {
              if (el) audioRefs.current.set(clip.id, el)
              else audioRefs.current.delete(clip.id)
            }}
            src={clip.url}
            preload="auto"
          />
        )
      ))}
      
      {/* Add Segment Dialog */}
      {addSegmentCallback && (
        <Dialog open={showAddSegmentDialog} onOpenChange={setShowAddSegmentDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Add New Segment</DialogTitle>
              <DialogDescription>
                Create a new visual segment to extend the scene timeline.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={newSegmentDuration}
                  onChange={(e) => setNewSegmentDuration(parseFloat(e.target.value) || 4)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500">Recommended: 3-5 seconds for smooth pacing</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddSegmentDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (typeof addSegmentCallback === 'function') {
                    const lastSegment = visualClips[visualClips.length - 1]
                    addSegmentCallback(lastSegment?.id || null, newSegmentDuration)
                    setShowAddSegmentDialog(false)
                    setNewSegmentDuration(4)
                  }
                }}
              >
                Add Segment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
