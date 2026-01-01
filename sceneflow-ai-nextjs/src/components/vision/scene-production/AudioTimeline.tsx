'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Play, Pause, Volume2, VolumeX, Mic, Music, Zap, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

export interface AudioTrackClip {
  id: string
  url?: string
  startTime: number  // In seconds, relative to scene start
  duration: number   // In seconds
  label?: string     // e.g., character name for dialogue, description for SFX
  volume?: number    // 0-1
}

export interface AudioTracksData {
  voiceover?: AudioTrackClip[]  // Array to support Description + Narration
  dialogue?: AudioTrackClip[]
  music?: AudioTrackClip[]      // Array to support multiple music clips
  sfx?: AudioTrackClip[]
}

interface AudioTimelineProps {
  sceneDuration: number  // Total scene duration in seconds
  segments?: Array<{ startTime: number; endTime: number; segmentId: string }>
  audioTracks?: AudioTracksData
  onPlayheadChange?: (time: number) => void
  onTrackUpdate?: (trackType: keyof AudioTracksData, clips: AudioTrackClip | AudioTrackClip[]) => void
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
  onPlayheadChange,
  onTrackUpdate,
}: AudioTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set())
  
  // Ref to capture mutedTracks for use in animation frames (avoids minification closure issues)
  const mutedTracksRef = useRef<Set<string>>(mutedTracks)
  useEffect(() => {
    mutedTracksRef.current = mutedTracks
  }, [mutedTracks])
  
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
      const currentMutedTracks = mutedTracksRef.current
      allClips.forEach(({ type, clip }) => {
        const audio = audioRefs.current.get(clip.id)
        if (audio && !currentMutedTracks.has(type)) {
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
        const animMutedTracks = mutedTracksRef.current
        allClips.forEach(({ type, clip }) => {
          const audio = audioRefs.current.get(clip.id)
          if (audio && !animMutedTracks.has(type)) {
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
    if (!timelineRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - 80 // Account for labels
    const newTime = Math.max(0, Math.min(sceneDuration, x / pixelsPerSecond))
    setCurrentTime(newTime)
    onPlayheadChange?.(newTime)
    startTimeRef.current = performance.now() - newTime * 1000
    
    // Sync audio to new time - use ref to avoid minification closure issues
    const seekMutedTracks = mutedTracksRef.current
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
    const isMuted = mutedTracks.has(trackType)
    
    return (
      <div className="flex items-stretch h-8 group">
        {/* Track Label */}
        <div className="w-20 flex-shrink-0 flex items-center gap-1 px-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700">
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
            isMuted ? "text-gray-400" : "text-gray-700 dark:text-gray-300"
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
          
          {/* Audio clips */}
          {clips.map((clip) => (
            <div
              key={clip.id}
              className={cn(
                "absolute top-1 bottom-1 rounded-sm flex items-center px-1 overflow-hidden",
                isMuted ? "opacity-40" : "opacity-90",
                color
              )}
              style={{
                left: clip.startTime * pixelsPerSecond,
                width: Math.max(clip.duration * pixelsPerSecond, 4),
              }}
            >
              {clip.label && clip.duration * pixelsPerSecond > 40 && (
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
        
        <span className="text-[10px] text-gray-400">
          Audio Preview · Sync to Final Cut
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
        {/* Voiceover Track (Description + Narration) */}
        {renderTrack(
          'V.O.',
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

      {/* Empty State */}
      {allClips.length === 0 && (
        <div className="px-3 py-4 text-center text-xs text-gray-400">
          No audio tracks configured. Add voiceover, dialogue, music, or sound effects to preview timing.
        </div>
      )}
    </div>
  )
}
