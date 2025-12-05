'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { 
  Play, Pause, Volume2, VolumeX, Mic, Music, Zap, 
  SkipBack, SkipForward, Film, Download
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { SceneSegment } from './types'

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

export function SceneTimeline({
  segments,
  selectedSegmentId,
  onSegmentSelect,
  audioTracks,
  onPlayheadChange,
  onGenerateSceneMp4,
  onVisualClipChange,
  onAudioClipChange,
}: SceneTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set())
  
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
  const TRACK_LABEL_WIDTH = 80
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

  // Collect all audio clips
  const allAudioClips = useMemo(() => {
    const clips: Array<{ type: string; clip: AudioTrackClip }> = []
    if (audioTracks?.voiceover?.url) {
      clips.push({ type: 'voiceover', clip: audioTracks.voiceover })
    }
    audioTracks?.dialogue?.forEach(d => d.url && clips.push({ type: 'dialogue', clip: d }))
    if (audioTracks?.music?.url) {
      clips.push({ type: 'music', clip: audioTracks.music })
    }
    audioTracks?.sfx?.forEach(s => s.url && clips.push({ type: 'sfx', clip: s }))
    return clips
  }, [audioTracks])

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
        
        // Sync audio tracks
        allAudioClips.forEach(({ type, clip }) => {
          const audio = audioRefs.current.get(clip.id)
          if (audio && !mutedTracks.has(type)) {
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
  }, [isPlaying, currentTime, sceneDuration, getCurrentVisualClip, allAudioClips, mutedTracks, onPlayheadChange])

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
    if (currentClip && videoRef.current && currentClip.url) {
      videoRef.current.src = currentClip.url
      videoRef.current.currentTime = newTime - currentClip.startTime + currentClip.trimStart
    }
    
    allAudioClips.forEach(({ type, clip }) => {
      const audio = audioRefs.current.get(clip.id)
      if (audio) {
        const clipStart = clip.startTime
        const clipEnd = clip.startTime + clip.duration
        if (newTime >= clipStart && newTime < clipEnd) {
          audio.currentTime = newTime - clipStart + (clip.trimStart || 0)
          if (isPlaying && !mutedTracks.has(type)) {
            audio.play().catch(() => {})
          }
        } else {
          audio.pause()
          audio.currentTime = 0
        }
      }
    })
    
    onPlayheadChange?.(newTime, currentClip?.segmentId)
  }, [dragState, sceneDuration, pixelsPerSecond, getCurrentVisualClip, allAudioClips, isPlaying, mutedTracks, onPlayheadChange])

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
    clip: { id: string; startTime: number; duration: number; label?: string; url?: string; thumbnailUrl?: string; sequenceIndex?: number },
    trackType: 'visual' | 'voiceover' | 'dialogue' | 'music' | 'sfx',
    color: string,
    showThumbnail: boolean = false
  ) => {
    const left = clip.startTime * pixelsPerSecond
    const width = Math.max(clip.duration * pixelsPerSecond, 20)
    const isSelected = trackType === 'visual' && clip.id === selectedSegmentId
    const isDragging = dragState?.clipId === clip.id
    
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
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 hover:bg-white/30 flex items-center justify-center"
          onMouseDown={(e) => handleClipMouseDown(e, trackType, clip.id, 'resize-left', clip.startTime, clip.duration)}
        >
          <div className="w-0.5 h-4 bg-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        {/* Right resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 hover:bg-white/30 flex items-center justify-center"
          onMouseDown={(e) => handleClipMouseDown(e, trackType, clip.id, 'resize-right', clip.startTime, clip.duration)}
        >
          <div className="w-0.5 h-4 bg-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <div className="relative z-10 h-full flex items-end justify-between px-1 py-0.5 pointer-events-none">
          <span className="text-[8px] font-bold text-white/90 truncate">
            {clip.label || (trackType === 'visual' && typeof clip.sequenceIndex === 'number' ? `Seg ${clip.sequenceIndex + 1}` : '')}
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

  const renderVisualTrack = () => (
    <div className="flex items-stretch h-16 group">
      <div 
        className="flex-shrink-0 flex items-center gap-1.5 px-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700"
        style={{ width: TRACK_LABEL_WIDTH }}
      >
        <Film className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Visual
        </span>
      </div>
      <div className="flex-1 relative bg-gray-900 border-b border-gray-700">
        {visualClips.map(clip => renderClip(
          { ...clip, thumbnailUrl: clip.thumbnailUrl },
          'visual',
          clip.status === 'COMPLETE' || clip.status === 'UPLOADED'
            ? 'bg-gradient-to-b from-gray-600 to-gray-700'
            : clip.status === 'GENERATING'
            ? 'bg-gradient-to-r from-amber-700 to-amber-800 animate-pulse'
            : 'bg-gradient-to-b from-gray-500 to-gray-600 border border-dashed border-gray-400',
          true
        ))}
      </div>
    </div>
  )

  const renderAudioTrack = (
    label: string,
    icon: React.ReactNode,
    trackType: 'voiceover' | 'dialogue' | 'music' | 'sfx',
    clips: AudioTrackClip[],
    color: string
  ) => {
    const isMuted = mutedTracks.has(trackType)
    
    return (
      <div className="flex items-stretch h-10 group">
        <div 
          className="flex-shrink-0 flex items-center gap-1 px-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700"
          style={{ width: TRACK_LABEL_WIDTH }}
        >
          <button
            onClick={() => toggleMute(trackType)}
            className={cn("p-0.5 rounded transition-colors", isMuted ? "text-gray-400" : "text-gray-600 dark:text-gray-300")}
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : icon}
          </button>
          <span className={cn("text-[10px] font-medium truncate", isMuted ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300")}>
            {label}
          </span>
        </div>
        <div className={cn("flex-1 relative border-b border-gray-200 dark:border-gray-800", isMuted ? "bg-gray-200 dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900")}>
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
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
      {/* Video Preview + Transport Controls */}
      <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="relative w-32 aspect-video bg-black rounded overflow-hidden flex-shrink-0">
          {currentVisualClip?.url ? (
            <video ref={videoRef} className="w-full h-full object-contain" src={currentVisualClip.url} muted />
          ) : currentVisualClip?.thumbnailUrl ? (
            <img src={currentVisualClip.thumbnailUrl} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-6 h-6 text-gray-600" />
            </div>
          )}
          <div className="absolute bottom-0.5 right-0.5 px-1 py-0.5 bg-black/70 rounded text-[8px] text-white font-mono">
            {formatTimeShort(currentTime)}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => skipTo(0)} className="h-7 w-7 p-0">
            <SkipBack className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={togglePlayback} className="h-8 w-8 p-0">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => skipTo(sceneDuration)} className="h-7 w-7 p-0">
            <SkipForward className="w-3.5 h-3.5" />
          </Button>
        </div>
        
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
        
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
          {formatTime(currentTime)} / {formatTime(sceneDuration)}
        </span>
        
        <div className="flex-1" />
        
        {onGenerateSceneMp4 && (
          <Button variant="outline" size="sm" onClick={onGenerateSceneMp4} className="h-7 text-xs gap-1.5">
            <Download className="w-3 h-3" />
            Generate MP4
          </Button>
        )}
      </div>

      {/* Timeline Header */}
      <div 
        ref={timelineRef}
        className="flex items-center h-5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 cursor-pointer"
        onClick={handleTimelineClick}
      >
        <div className="flex-shrink-0" style={{ width: TRACK_LABEL_WIDTH }} />
        <div className="flex-1 relative">
          {timeMarkers.map(t => (
            <div key={t} className="absolute text-[9px] text-gray-500 font-mono" style={{ left: t * pixelsPerSecond - 8 }}>
              {formatTimeShort(t)}
            </div>
          ))}
        </div>
      </div>

      {/* Tracks Container */}
      <div ref={tracksContainerRef} className="relative" onClick={handleTimelineClick}>
        {renderVisualTrack()}
        {renderAudioTrack('V.O.', <Mic className="w-3 h-3" />, 'voiceover', audioTracks?.voiceover ? [audioTracks.voiceover] : [], 'bg-blue-500')}
        {renderAudioTrack('Dialogue', <Mic className="w-3 h-3" />, 'dialogue', audioTracks?.dialogue || [], 'bg-emerald-500')}
        {renderAudioTrack('Music', <Music className="w-3 h-3" />, 'music', audioTracks?.music ? [audioTracks.music] : [], 'bg-purple-500')}
        {renderAudioTrack('SFX', <Zap className="w-3 h-3" />, 'sfx', audioTracks?.sfx || [], 'bg-amber-500')}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
          style={{ left: TRACK_LABEL_WIDTH + currentTime * pixelsPerSecond }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rounded-full shadow-md" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-500" />
        </div>
      </div>

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
    </div>
  )
}
