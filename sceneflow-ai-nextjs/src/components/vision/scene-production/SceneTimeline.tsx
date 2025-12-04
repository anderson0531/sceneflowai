'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { 
  Play, Pause, Volume2, VolumeX, Mic, Music, Zap, 
  SkipBack, SkipForward, Film, Eye, Download
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { SceneSegment } from './types'

export interface AudioTrackClip {
  id: string
  url?: string
  startTime: number  // In seconds, relative to scene start
  duration: number   // In seconds
  label?: string     // e.g., character name for dialogue, description for SFX
  volume?: number    // 0-1
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
}: SceneTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set())
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  
  // Calculate scene duration from segments
  const sceneDuration = useMemo(() => {
    if (segments.length === 0) return 10
    return segments[segments.length - 1].endTime
  }, [segments])
  
  // Calculate pixels per second based on container width
  const [containerWidth, setContainerWidth] = useState(600)
  const TRACK_LABEL_WIDTH = 80
  const pixelsPerSecond = useMemo(() => 
    (containerWidth - TRACK_LABEL_WIDTH) / Math.max(sceneDuration, 1), 
    [containerWidth, sceneDuration]
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
  const allClips = useMemo(() => {
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

  // Find which segment the playhead is currently in
  const getCurrentSegmentId = useCallback((time: number): string | undefined => {
    for (const seg of segments) {
      if (time >= seg.startTime && time < seg.endTime) {
        return seg.segmentId
      }
    }
    return segments[segments.length - 1]?.segmentId
  }, [segments])

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
      
      // Start/sync all audio elements
      allClips.forEach(({ type, clip }) => {
        const audio = audioRefs.current.get(clip.id)
        if (audio && !mutedTracks.has(type)) {
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
        const currentSegId = getCurrentSegmentId(elapsed)
        onPlayheadChange?.(elapsed, currentSegId)
        
        // Check audio timing
        allClips.forEach(({ type, clip }) => {
          const audio = audioRefs.current.get(clip.id)
          if (audio && !mutedTracks.has(type)) {
            const clipStart = clip.startTime
            const clipEnd = clip.startTime + clip.duration
            
            if (elapsed >= clipStart && elapsed < clipEnd && audio.paused) {
              audio.currentTime = elapsed - clipStart
              audio.play().catch(() => {})
            } else if ((elapsed < clipStart || elapsed >= clipEnd) && !audio.paused) {
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
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - TRACK_LABEL_WIDTH
    if (x < 0) return
    const newTime = Math.max(0, Math.min(sceneDuration, x / pixelsPerSecond))
    setCurrentTime(newTime)
    const currentSegId = getCurrentSegmentId(newTime)
    onPlayheadChange?.(newTime, currentSegId)
    startTimeRef.current = performance.now() - newTime * 1000
    
    // Sync audio to new time
    allClips.forEach(({ type, clip }) => {
      const audio = audioRefs.current.get(clip.id)
      if (audio) {
        const clipStart = clip.startTime
        const clipEnd = clip.startTime + clip.duration
        if (newTime >= clipStart && newTime < clipEnd) {
          audio.currentTime = newTime - clipStart
          if (isPlaying && !mutedTracks.has(type)) {
            audio.play().catch(() => {})
          }
        } else {
          audio.pause()
          audio.currentTime = 0
        }
      }
    })
  }

  const handleSegmentClick = (segmentId: string, startTime: number) => {
    onSegmentSelect(segmentId)
    setCurrentTime(startTime)
    startTimeRef.current = performance.now() - startTime * 1000
  }

  const toggleMute = (trackType: string) => {
    setMutedTracks(prev => {
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
    const currentSegId = getCurrentSegmentId(newTime)
    onPlayheadChange?.(newTime, currentSegId)
    startTimeRef.current = performance.now() - newTime * 1000
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // Time markers
  const timeMarkers = useMemo(() => {
    const markers: number[] = []
    const interval = sceneDuration > 60 ? 15 : sceneDuration > 30 ? 10 : sceneDuration > 10 ? 5 : 2
    for (let t = 0; t <= sceneDuration; t += interval) {
      markers.push(t)
    }
    return markers
  }, [sceneDuration])

  // Render Visual Track with segment thumbnails
  const renderVisualTrack = () => {
    return (
      <div className="flex items-stretch h-14 group">
        {/* Track Label */}
        <div 
          className="flex-shrink-0 flex items-center gap-1.5 px-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700"
          style={{ width: TRACK_LABEL_WIDTH }}
        >
          <Film className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Visual
          </span>
        </div>
        
        {/* Track Timeline with Segments */}
        <div className="flex-1 relative bg-gray-900 border-b border-gray-700">
          {/* Segment thumbnails/blocks */}
          {segments.map((segment) => {
            const width = (segment.endTime - segment.startTime) * pixelsPerSecond
            const left = segment.startTime * pixelsPerSecond
            const isSelected = segment.segmentId === selectedSegmentId
            const hasVideo = segment.assetType === 'video' && segment.references.mediaUrl
            const hasImage = segment.assetType === 'image' && segment.references.mediaUrl
            const thumbnailUrl = segment.references.thumbnailUrl || segment.references.mediaUrl
            
            return (
              <button
                key={segment.segmentId}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSegmentClick(segment.segmentId, segment.startTime)
                }}
                className={cn(
                  "absolute top-1 bottom-1 rounded-sm overflow-hidden transition-all",
                  "flex items-end justify-center",
                  isSelected 
                    ? "ring-2 ring-sf-primary ring-offset-1 ring-offset-gray-900 z-10" 
                    : "hover:ring-1 hover:ring-white/50",
                  segment.status === 'COMPLETE' || segment.status === 'UPLOADED'
                    ? "bg-gradient-to-b from-gray-700 to-gray-800"
                    : segment.status === 'GENERATING'
                    ? "bg-gradient-to-r from-amber-900/50 to-amber-800/50 animate-pulse"
                    : "bg-gradient-to-b from-gray-600 to-gray-700 border border-dashed border-gray-500"
                )}
                style={{
                  left,
                  width: Math.max(width - 2, 20),
                }}
              >
                {/* Thumbnail background */}
                {thumbnailUrl && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-70"
                    style={{ backgroundImage: `url(${thumbnailUrl})` }}
                  />
                )}
                
                {/* Segment label */}
                <div className="relative z-10 w-full px-1 py-0.5 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-bold text-white/90 uppercase">
                      {segment.sequenceIndex + 1}
                    </span>
                    {width > 40 && (
                      <span className="text-[8px] text-white/70 font-mono">
                        {(segment.endTime - segment.startTime).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Status indicator */}
                {segment.status === 'GENERATING' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                {(segment.status === 'DRAFT' || segment.status === 'READY') && !thumbnailUrl && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white/40" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Render Audio Track row
  const renderAudioTrack = (
    label: string,
    icon: React.ReactNode,
    trackType: string,
    clips: AudioTrackClip[],
    color: string
  ) => {
    const isMuted = mutedTracks.has(trackType)
    
    return (
      <div className="flex items-stretch h-8 group">
        {/* Track Label */}
        <div 
          className="flex-shrink-0 flex items-center gap-1 px-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700"
          style={{ width: TRACK_LABEL_WIDTH }}
        >
          <button
            onClick={() => toggleMute(trackType)}
            className={cn(
              "p-0.5 rounded transition-colors",
              isMuted ? "text-gray-400" : "text-gray-600 dark:text-gray-300"
            )}
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : icon}
          </button>
          <span className={cn(
            "text-[10px] font-medium truncate",
            isMuted ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"
          )}>
            {label}
          </span>
        </div>
        
        {/* Track Timeline */}
        <div className="flex-1 relative bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          {/* Segment boundary markers */}
          {segments.map((seg) => (
            <div
              key={`marker-${seg.segmentId}`}
              className="absolute top-0 bottom-0 border-r border-dashed border-gray-300 dark:border-gray-700 opacity-30"
              style={{ left: seg.endTime * pixelsPerSecond }}
            />
          ))}
          
          {/* Audio clips */}
          {clips.map((clip) => (
            <div
              key={clip.id}
              className={cn(
                "absolute top-1 bottom-1 rounded-sm flex items-center px-1 overflow-hidden cursor-pointer",
                "hover:brightness-110 transition-all",
                isMuted ? "opacity-40" : "opacity-90",
                color
              )}
              style={{
                left: clip.startTime * pixelsPerSecond,
                width: Math.max(clip.duration * pixelsPerSecond, 4),
              }}
              title={clip.label || trackType}
            >
              {clip.label && clip.duration * pixelsPerSecond > 50 && (
                <span className="text-[8px] text-white font-medium truncate">
                  {clip.label}
                </span>
              )}
            </div>
          ))}
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
          className="h-8 w-8 p-0"
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
        
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400 min-w-[90px]">
          {formatTime(currentTime)} / {formatTime(sceneDuration)}
        </span>
        
        <div className="flex-1" />
        
        {onGenerateSceneMp4 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateSceneMp4}
            className="h-7 text-xs gap-1.5"
          >
            <Download className="w-3 h-3" />
            Generate MP4
          </Button>
        )}
        
        <span className="text-[10px] text-gray-400 hidden sm:inline">
          Scene Timeline
        </span>
      </div>

      {/* Timeline Header with time markers */}
      <div 
        ref={timelineRef}
        className="flex items-center h-5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 cursor-pointer"
        onClick={handleTimelineClick}
      >
        <div className="flex-shrink-0" style={{ width: TRACK_LABEL_WIDTH }} />
        <div className="flex-1 relative">
          {timeMarkers.map((t) => (
            <div
              key={t}
              className="absolute text-[9px] text-gray-500 dark:text-gray-500 font-mono"
              style={{ left: t * pixelsPerSecond - 8 }}
            >
              {formatTimeShort(t)}
            </div>
          ))}
        </div>
      </div>

      {/* Tracks Container */}
      <div 
        className="relative cursor-pointer"
        onClick={handleTimelineClick}
      >
        {/* Visual Track */}
        {renderVisualTrack()}
        
        {/* Audio Tracks */}
        {renderAudioTrack(
          'V.O.',
          <Mic className="w-3 h-3" />,
          'voiceover',
          audioTracks?.voiceover ? [audioTracks.voiceover] : [],
          'bg-blue-500'
        )}
        
        {renderAudioTrack(
          'Dialogue',
          <Mic className="w-3 h-3" />,
          'dialogue',
          audioTracks?.dialogue || [],
          'bg-emerald-500'
        )}
        
        {renderAudioTrack(
          'Music',
          <Music className="w-3 h-3" />,
          'music',
          audioTracks?.music ? [audioTracks.music] : [],
          'bg-purple-500'
        )}
        
        {renderAudioTrack(
          'SFX',
          <Zap className="w-3 h-3" />,
          'sfx',
          audioTracks?.sfx || [],
          'bg-amber-500'
        )}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
          style={{ left: TRACK_LABEL_WIDTH + currentTime * pixelsPerSecond }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rounded-full shadow-md" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-500" />
        </div>
      </div>

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
          />
        )
      ))}
    </div>
  )
}
