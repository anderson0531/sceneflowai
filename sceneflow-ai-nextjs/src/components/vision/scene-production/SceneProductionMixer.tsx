/**
 * SceneProductionMixer - Unified Audio/Video Production Console
 * 
 * Replaces the separate "Audio Tracks" section and "Render Scene" dialog
 * with a single, cohesive "Studio Monitor" experience.
 * 
 * Key Features:
 * - Stream-First Logic: Select language BEFORE mixing to preview the correct audio
 * - WYHIWYG: What You Hear Is What You Get - configure on the timeline
 * - Integrated Preview: Video player with real-time audio sync
 * - Direct Render: No confirmation dialogs - single-click render
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Globe,
  Film,
  Mic2,
  MessageSquare,
  Music,
  Sparkles,
  Download,
  Loader2,
  CheckCircle2,
  Settings2,
  Clock,
  SkipBack,
  SkipForward,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import type { SceneSegment, SceneProductionData, ProductionStream } from './types'

// ============================================================================
// Types
// ============================================================================

export interface AudioTrackConfig {
  enabled: boolean
  volume: number      // 0 to 1
  startOffset: number // Start time in seconds
}

export interface MixerAudioTracks {
  narration: AudioTrackConfig
  dialogue: AudioTrackConfig
  music: AudioTrackConfig
  sfx: AudioTrackConfig
}

export interface SceneAudioAssets {
  /** Narration audio per language: { en: { url, duration }, th: { url, duration } } */
  narrationAudio?: Record<string, { url?: string; duration?: number }>
  /** Legacy narration URL */
  narrationAudioUrl?: string
  /** Narration text for display */
  narration?: string
  /** Dialogue audio per language */
  dialogueAudio?: Record<string, Array<{
    audioUrl?: string
    duration?: number
    character?: string
    line?: string
  }>>
  /** Dialogue lines (text) */
  dialogue?: Array<{ character?: string; line?: string; text?: string }>
  /** Music audio URL (global, not language-specific) */
  musicAudio?: string
  /** Music description */
  music?: string | { description?: string }
  /** SFX entries (global, not language-specific) */
  sfx?: Array<{
    audioUrl?: string
    description?: string
    startTime?: number
    duration?: number
  }>
}

export interface SegmentAudioConfig {
  includeAudio: boolean
  volume: number
}

type RenderStatus = 'idle' | 'preparing' | 'rendering' | 'complete' | 'error'

interface SceneProductionMixerProps {
  sceneId: string
  sceneNumber: number
  projectId: string
  segments: SceneSegment[]
  productionData: SceneProductionData | null
  audioAssets: SceneAudioAssets
  /** Callback when render completes successfully */
  onRenderComplete?: (downloadUrl: string, language: string) => void
  /** Callback to update production streams in parent */
  onProductionStreamsChange?: (streams: ProductionStream[]) => void
  /** Whether segment generation is in progress */
  isGeneratingSegments?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const FLAG_EMOJIS: Record<string, string> = {
  en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', pt: '🇧🇷',
  zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', th: '🇹🇭', hi: '🇮🇳', ar: '🇸🇦', ru: '🇷🇺'
}

const TRACK_COLORS = {
  narration: { icon: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', slider: 'bg-purple-500' },
  dialogue: { icon: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', slider: 'bg-blue-500' },
  sfx: { icon: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', slider: 'bg-amber-500' },
  music: { icon: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', slider: 'bg-green-500' },
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * ProductionStreamSelector - Language selection for the active mix
 */
function ProductionStreamSelector({
  selectedLanguage,
  onLanguageChange,
  availableLanguages,
  disabled,
}: {
  selectedLanguage: string
  onLanguageChange: (lang: string) => void
  availableLanguages: string[]
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-purple-400" />
      <span className="text-xs text-gray-400 uppercase tracking-wide hidden sm:inline">Active Stream</span>
      <Select value={selectedLanguage} onValueChange={onLanguageChange} disabled={disabled}>
        <SelectTrigger className="w-[140px] sm:w-[160px] h-9 bg-gray-800/80 border-purple-500/40 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          {SUPPORTED_LANGUAGES.filter(l => 
            availableLanguages.length === 0 || availableLanguages.includes(l.code)
          ).map(lang => (
            <SelectItem key={lang.code} value={lang.code} className="text-gray-200">
              <span className="flex items-center gap-2">
                <span>{FLAG_EMOJIS[lang.code] || '🌐'}</span>
                <span>{lang.name}</span>
                {lang.code === 'en' && <span className="text-xs text-gray-500">(Default)</span>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * ResolutionSelector - Output resolution dropdown
 */
function ResolutionSelector({
  resolution,
  onResolutionChange,
  disabled,
}: {
  resolution: '720p' | '1080p' | '4K'
  onResolutionChange: (res: '720p' | '1080p' | '4K') => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Settings2 className="w-4 h-4 text-gray-400" />
      <span className="text-xs text-gray-400 uppercase tracking-wide hidden sm:inline">Output</span>
      <Select value={resolution} onValueChange={onResolutionChange as (v: string) => void} disabled={disabled}>
        <SelectTrigger className="w-[120px] sm:w-[140px] h-9 bg-gray-800/80 border-gray-600 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          <SelectItem value="720p" className="text-gray-200">720p (1280×720)</SelectItem>
          <SelectItem value="1080p" className="text-gray-200">1080p (1920×1080)</SelectItem>
          <SelectItem value="4K" className="text-gray-200">4K (3840×2160)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * ScenePreviewPlayer - Video player with concatenated segments and audio sync
 * 
 * Implements "Elastic Timing" - audio can extend beyond video duration
 * by freezing the last video frame while audio continues.
 */
function ScenePreviewPlayer({
  segments,
  audioTracks,
  currentAudioUrls,
  totalDuration,
  videoTotalDuration,
  isMuted,
  onToggleMute,
  segmentAudioConfigs,
}: {
  segments: SceneSegment[]
  audioTracks: MixerAudioTracks
  currentAudioUrls: {
    narration?: string
    dialogue: Array<{ audioUrl?: string; duration?: number; startTime?: number }>
    music?: string
    sfx: Array<{ audioUrl?: string; duration?: number; startTime?: number }>
  }
  totalDuration: number      // Scene duration (max of video/audio)
  videoTotalDuration: number // Video-only duration
  isMuted: boolean
  onToggleMute: () => void
  segmentAudioConfigs: Record<string, SegmentAudioConfig>
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const narrationRef = useRef<HTMLAudioElement>(null)
  const musicRef = useRef<HTMLAudioElement>(null)
  const dialogueRefs = useRef<(HTMLAudioElement | null)[]>([])
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [isVideoFrozen, setIsVideoFrozen] = useState(false)
  
  // Track loaded video URL to prevent duplicate loads
  const loadedVideoUrlRef = useRef<string | null>(null)
  
  // Timer for audio-extended playback (when video is frozen)
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Calculate progress percentage
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0
  
  // Current segment (based on segment index, not time-based calculation)
  const currentSegment = useMemo(() => {
    if (currentSegmentIndex >= 0 && currentSegmentIndex < segments.length) {
      return { segment: segments[currentSegmentIndex], index: currentSegmentIndex }
    }
    return { segment: segments[0], index: 0 }
  }, [segments, currentSegmentIndex])
  
  // Calculate cumulative start time for current segment
  const segmentStartTime = useMemo(() => {
    let elapsed = 0
    for (let i = 0; i < currentSegmentIndex; i++) {
      elapsed += segments[i].endTime - segments[i].startTime
    }
    return elapsed
  }, [segments, currentSegmentIndex])

  // Handle video time updates
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    const handleTimeUpdate = () => {
      if (isVideoFrozen) return // Don't update from video when frozen
      
      // Calculate global time based on segment position + local time
      const globalTime = segmentStartTime + video.currentTime
      setCurrentTime(globalTime)
    }
    
    const handleEnded = () => {
      // Check if we should advance to next segment or freeze
      if (currentSegmentIndex < segments.length - 1) {
        // Move to next segment
        setCurrentSegmentIndex(prev => prev + 1)
      } else {
        // Last segment ended - check if audio extends beyond video
        const audioEndTime = Math.max(
          audioTracks.narration.enabled && currentAudioUrls.narration 
            ? audioTracks.narration.startOffset + (currentAudioUrls.dialogue[0]?.duration || totalDuration)
            : 0,
          ...(audioTracks.dialogue.enabled 
            ? currentAudioUrls.dialogue.map(d => (d.startTime || 0) + (d.duration || 0))
            : [0]),
          audioTracks.music.enabled && currentAudioUrls.music ? totalDuration : 0
        )
        
        if (audioEndTime > videoTotalDuration && currentTime < audioEndTime) {
          // Freeze video on last frame, continue audio
          setIsVideoFrozen(true)
          
          // Start timer to continue advancing currentTime for audio playback
          const startFreezeTime = videoTotalDuration
          const remainingTime = audioEndTime - startFreezeTime
          let elapsedFrozen = 0
          
          audioTimerRef.current = setInterval(() => {
            elapsedFrozen += 0.1
            setCurrentTime(startFreezeTime + elapsedFrozen)
            
            if (elapsedFrozen >= remainingTime) {
              // Audio complete - end playback
              if (audioTimerRef.current) {
                clearInterval(audioTimerRef.current)
                audioTimerRef.current = null
              }
              setIsPlaying(false)
              setIsVideoFrozen(false)
              setCurrentTime(0)
              setCurrentSegmentIndex(0)
            }
          }, 100)
        } else {
          // No audio extension - normal end
          setIsPlaying(false)
          setCurrentTime(0)
          setCurrentSegmentIndex(0)
        }
      }
    }
    
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [currentSegmentIndex, segments, segmentStartTime, isVideoFrozen, audioTracks, currentAudioUrls, totalDuration, videoTotalDuration, currentTime])
  
  // Sync audio tracks with video playback
  useEffect(() => {
    // Narration sync
    if (narrationRef.current && audioTracks.narration.enabled) {
      narrationRef.current.volume = isMuted ? 0 : audioTracks.narration.volume
      const narrationStartTime = audioTracks.narration.startOffset
      
      if (isPlaying && currentTime >= narrationStartTime) {
        const narrationLocalTime = currentTime - narrationStartTime
        if (Math.abs(narrationRef.current.currentTime - narrationLocalTime) > 0.5) {
          narrationRef.current.currentTime = narrationLocalTime
        }
        if (narrationRef.current.paused) {
          narrationRef.current.play().catch(() => {})
        }
      } else {
        narrationRef.current.pause()
      }
    } else if (narrationRef.current) {
      narrationRef.current.pause()
    }
    
    // Music sync
    if (musicRef.current && audioTracks.music.enabled) {
      musicRef.current.volume = isMuted ? 0 : audioTracks.music.volume
      const musicStartTime = audioTracks.music.startOffset
      
      if (isPlaying && currentTime >= musicStartTime) {
        const musicLocalTime = currentTime - musicStartTime
        if (Math.abs(musicRef.current.currentTime - musicLocalTime) > 0.5) {
          musicRef.current.currentTime = musicLocalTime
        }
        if (musicRef.current.paused) {
          musicRef.current.play().catch(() => {})
        }
      } else {
        musicRef.current.pause()
      }
    } else if (musicRef.current) {
      musicRef.current.pause()
    }
    
    // Dialogue sync - play clips based on their start times
    if (audioTracks.dialogue.enabled && currentAudioUrls.dialogue.length > 0) {
      currentAudioUrls.dialogue.forEach((clip, idx) => {
        const audioEl = dialogueRefs.current[idx]
        if (!audioEl || !clip.audioUrl) return
        
        audioEl.volume = isMuted ? 0 : audioTracks.dialogue.volume
        const clipStart = clip.startTime || (idx * 3) // Default spacing if no startTime
        const clipEnd = clipStart + (clip.duration || 3)
        
        if (isPlaying && currentTime >= clipStart && currentTime < clipEnd) {
          const clipLocalTime = currentTime - clipStart
          if (Math.abs(audioEl.currentTime - clipLocalTime) > 0.5) {
            audioEl.currentTime = clipLocalTime
          }
          if (audioEl.paused) {
            audioEl.play().catch(() => {})
          }
        } else {
          audioEl.pause()
        }
      })
    } else {
      // Pause all dialogue
      dialogueRefs.current.forEach(el => el?.pause())
    }
  }, [isPlaying, currentTime, audioTracks, currentAudioUrls, isMuted])
  
  // Load new segment video when segment index changes
  useEffect(() => {
    const video = videoRef.current
    const newUrl = currentSegment.segment?.activeAssetUrl
    
    if (video && newUrl && newUrl !== loadedVideoUrlRef.current) {
      loadedVideoUrlRef.current = newUrl
      video.src = newUrl
      video.load()
      if (isPlaying && !isVideoFrozen) {
        video.play().catch(() => {})
      }
    }
  }, [currentSegmentIndex, currentSegment.segment?.activeAssetUrl, isPlaying, isVideoFrozen])
  
  // Cleanup audio timer on unmount
  useEffect(() => {
    return () => {
      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current)
      }
    }
  }, [])
  
  const handlePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    
    if (isPlaying) {
      video.pause()
      narrationRef.current?.pause()
      musicRef.current?.pause()
      dialogueRefs.current.forEach(el => el?.pause())
      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current)
        audioTimerRef.current = null
      }
      setIsPlaying(false)
      setIsVideoFrozen(false)
    } else {
      if (!isVideoFrozen) {
        video.play().catch(() => {})
      }
      setIsPlaying(true)
    }
  }
  
  const handleSeek = (percent: number) => {
    const targetTime = (percent / 100) * totalDuration
    
    // Clear any frozen state
    setIsVideoFrozen(false)
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current)
      audioTimerRef.current = null
    }
    
    // Find target segment based on video time (capped to video duration)
    const videoTargetTime = Math.min(targetTime, videoTotalDuration)
    let elapsed = 0
    for (let i = 0; i < segments.length; i++) {
      const segDuration = segments[i].endTime - segments[i].startTime
      if (videoTargetTime < elapsed + segDuration) {
        setCurrentSegmentIndex(i)
        const localTime = videoTargetTime - elapsed
        if (videoRef.current) {
          videoRef.current.currentTime = localTime
        }
        setCurrentTime(targetTime)
        return
      }
      elapsed += segDuration
    }
    
    // If seeking beyond video, seek to end of last segment
    setCurrentSegmentIndex(segments.length - 1)
    if (videoRef.current) {
      const lastSegDuration = segments[segments.length - 1].endTime - segments[segments.length - 1].startTime
      videoRef.current.currentTime = lastSegDuration
    }
    setCurrentTime(targetTime)
  }
  
  const skipToSegment = (direction: 'prev' | 'next') => {
    // Clear frozen state
    setIsVideoFrozen(false)
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current)
      audioTimerRef.current = null
    }
    
    if (direction === 'prev') {
      setCurrentSegmentIndex(Math.max(0, currentSegmentIndex - 1))
    } else {
      setCurrentSegmentIndex(Math.min(segments.length - 1, currentSegmentIndex + 1))
    }
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
    loadedVideoUrlRef.current = null // Force reload
  }
  
  return (
    <div className="bg-black rounded-lg overflow-hidden border border-gray-700">
      {/* Video Display Area */}
      <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
        {currentSegment.segment?.activeAssetUrl ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            muted={isMuted || !segmentAudioConfigs[currentSegment.segment.segmentId]?.includeAudio}
            playsInline
          />
        ) : (
          <div className="text-gray-500 text-sm flex flex-col items-center gap-2">
            <Film className="w-12 h-12 opacity-30" />
            <span>No video preview available</span>
          </div>
        )}
        
        {/* Overlay Info */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge variant="outline" className="bg-black/60 border-gray-600 text-white text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {formatTime(totalDuration)}
          </Badge>
          <Badge variant="outline" className="bg-black/60 border-purple-500/50 text-purple-300 text-xs">
            Seg {currentSegmentIndex + 1}/{segments.length}
          </Badge>
          {isVideoFrozen && (
            <Badge variant="outline" className="bg-amber-500/20 border-amber-500/50 text-amber-300 text-xs animate-pulse">
              <Pause className="w-3 h-3 mr-1" />
              Extended Audio
            </Badge>
          )}
        </div>
        
        {/* Play Button Overlay */}
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-purple-600/80 flex items-center justify-center">
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </div>
        </button>
      </div>
      
      {/* Controls Bar */}
      <div className="p-3 bg-gray-800/50 flex items-center gap-3">
        {/* Skip Prev */}
        <button
          onClick={() => skipToSegment('prev')}
          disabled={currentSegmentIndex === 0}
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        
        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        
        {/* Skip Next */}
        <button
          onClick={() => skipToSegment('next')}
          disabled={currentSegmentIndex === segments.length - 1}
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        
        <span className="text-xs text-gray-400 font-mono w-10">
          {formatTime(currentTime)}
        </span>
        
        {/* Progress Bar */}
        <div 
          className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer relative group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const percent = ((e.clientX - rect.left) / rect.width) * 100
            handleSeek(percent)
          }}
        >
          <div 
            className="h-full bg-purple-500 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>
        
        <span className="text-xs text-gray-400 font-mono w-10 text-right">
          {formatTime(totalDuration)}
        </span>
        
        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
      
      {/* Hidden Audio Elements for sync playback */}
      {currentAudioUrls.narration && (
        <audio ref={narrationRef} src={currentAudioUrls.narration} preload="auto" />
      )}
      {currentAudioUrls.music && (
        <audio ref={musicRef} src={currentAudioUrls.music} preload="auto" loop />
      )}
      {/* Dialogue audio elements - one per clip */}
      {currentAudioUrls.dialogue.map((clip, idx) => clip.audioUrl && (
        <audio 
          key={idx} 
          ref={el => { dialogueRefs.current[idx] = el }} 
          src={clip.audioUrl} 
          preload="auto" 
        />
      ))}
    </div>
  )
}

/**
 * AudioTrackRow - Individual track control with volume/timing
 */
function AudioTrackRow({
  type,
  label,
  icon: Icon,
  config,
  onConfigChange,
  audioUrl,
  audioDuration,
  videoTotalDuration,
  subtitle,
  clipCount,
  hasAudio,
  disabled,
}: {
  type: 'narration' | 'dialogue' | 'music' | 'sfx'
  label: string
  icon: React.ElementType
  config: AudioTrackConfig
  onConfigChange: (config: AudioTrackConfig) => void
  audioUrl?: string
  audioDuration?: number
  videoTotalDuration?: number
  subtitle?: string
  clipCount?: number
  hasAudio: boolean
  disabled?: boolean
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const colors = TRACK_COLORS[type]
  
  // Calculate time delta for elastic timing warning
  const timeDelta = (audioDuration && videoTotalDuration && audioDuration > videoTotalDuration) 
    ? audioDuration - videoTotalDuration 
    : 0
  
  const togglePreview = () => {
    if (!audioRef.current) return
    if (isPreviewPlaying) {
      audioRef.current.pause()
      setIsPreviewPlaying(false)
    } else {
      audioRef.current.currentTime = config.startOffset
      audioRef.current.volume = config.volume
      audioRef.current.play().catch(() => {})
      setIsPreviewPlaying(true)
    }
  }
  
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      const handleEnded = () => setIsPreviewPlaying(false)
      audio.addEventListener('ended', handleEnded)
      return () => audio.removeEventListener('ended', handleEnded)
    }
  }, [])
  
  const bgClass = config.enabled ? `${colors.bg} ${colors.border}` : 'bg-gray-800/30 border-gray-700/50 opacity-60'
  
  return (
    <div className={`p-4 rounded-lg border transition-all ${bgClass}`}>
      {/* Header Row */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-full bg-gray-700/50 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${colors.icon}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${config.enabled ? 'text-white' : 'text-gray-400'}`}>
              {label}
            </span>
            {hasAudio ? (
              <Badge variant="outline" className={`text-[10px] ${colors.icon} border-current/30 bg-current/10`}>
                Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-600">
                No Audio
              </Badge>
            )}
            {clipCount && clipCount > 1 && (
              <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-600">
                {clipCount} clips
              </Badge>
            )}
            {audioDuration && (
              <span className="text-xs text-gray-500">
                {formatTime(audioDuration)}
              </span>
            )}
            {timeDelta > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 bg-amber-500/10 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                +{timeDelta.toFixed(1)}s extended
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
          )}
          {timeDelta > 0 && (
            <p className="text-xs text-amber-400/80 mt-0.5">
              Audio exceeds video • Video will freeze on last frame
            </p>
          )}
        </div>
        
        {/* Preview Button */}
        {hasAudio && audioUrl && (
          <button
            onClick={togglePreview}
            disabled={disabled}
            className={`
              p-2 rounded-lg transition-colors
              ${isPreviewPlaying 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}
        
        {/* Enable Toggle */}
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => onConfigChange({ ...config, enabled })}
          disabled={disabled || !hasAudio}
        />
      </div>
      
      {/* Controls Row - Only visible when enabled */}
      {config.enabled && hasAudio && (
        <div className="flex items-center gap-4 sm:gap-6 pt-3 border-t border-gray-700/50">
          {/* Start Offset */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase w-8 sm:w-10">Start</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onConfigChange({ ...config, startOffset: Math.max(0, config.startOffset - 0.5) })}
                className="w-6 h-6 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                disabled={disabled}
              >
                −
              </button>
              <Input
                type="number"
                step="0.1"
                value={config.startOffset}
                onChange={(e) => onConfigChange({ ...config, startOffset: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-12 sm:w-14 h-7 text-center text-xs bg-gray-800 border-gray-600"
                disabled={disabled}
              />
              <button
                onClick={() => onConfigChange({ ...config, startOffset: config.startOffset + 0.5 })}
                className="w-6 h-6 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                disabled={disabled}
              >
                +
              </button>
              <span className="text-[10px] text-gray-500">s</span>
            </div>
          </div>
          
          {/* Volume */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase w-10 sm:w-12">Volume</span>
            <Slider
              value={[config.volume * 100]}
              onValueChange={([v]) => onConfigChange({ ...config, volume: v / 100 })}
              max={100}
              step={1}
              className="flex-1"
              disabled={disabled}
            />
            <span className="text-xs text-gray-400 w-10 text-right font-mono">
              {Math.round(config.volume * 100)}%
            </span>
          </div>
        </div>
      )}
      
      {/* Hidden Audio Element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
    </div>
  )
}

/**
 * SegmentAudioControls - Mute/unmute individual segment audio
 */
function SegmentAudioControls({
  segments,
  segmentConfigs,
  onConfigChange,
  disabled,
}: {
  segments: SceneSegment[]
  segmentConfigs: Record<string, SegmentAudioConfig>
  onConfigChange: (configs: Record<string, SegmentAudioConfig>) => void
  disabled?: boolean
}) {
  const allMuted = Object.values(segmentConfigs).every(c => !c.includeAudio)
  
  const toggleAll = () => {
    const newConfigs = { ...segmentConfigs }
    Object.keys(newConfigs).forEach(k => {
      newConfigs[k] = { ...newConfigs[k], includeAudio: allMuted }
    })
    onConfigChange(newConfigs)
  }
  
  const toggleSegment = (segmentId: string) => {
    const current = segmentConfigs[segmentId] || { includeAudio: true, volume: 1.0 }
    onConfigChange({
      ...segmentConfigs,
      [segmentId]: { ...current, includeAudio: !current.includeAudio }
    })
  }
  
  return (
    <div className="p-3 bg-gray-800/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">Segment Audio</span>
        <button
          onClick={toggleAll}
          disabled={disabled}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          {allMuted ? 'Unmute All' : 'Mute All'}
        </button>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2">
        {segments.map((seg, i) => {
          const config = segmentConfigs[seg.segmentId] || { includeAudio: true, volume: 1.0 }
          return (
            <button
              key={seg.segmentId}
              onClick={() => toggleSegment(seg.segmentId)}
              disabled={disabled}
              className={`
                p-2 rounded text-xs font-medium transition-colors
                ${config.includeAudio 
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' 
                  : 'bg-gray-700/50 text-gray-500 border border-gray-600/50'
                }
              `}
            >
              #{i + 1} {config.includeAudio ? '🔊' : '🔇'}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SceneProductionMixer({
  sceneId,
  sceneNumber,
  projectId,
  segments,
  productionData,
  audioAssets,
  onRenderComplete,
  onProductionStreamsChange,
  isGeneratingSegments,
}: SceneProductionMixerProps) {
  // === Language/Stream State ===
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4K'>('1080p')
  
  // === Audio Track Configs ===
  const [audioTracks, setAudioTracks] = useState<MixerAudioTracks>({
    narration: { enabled: true, volume: 0.8, startOffset: 0 },
    dialogue: { enabled: true, volume: 0.9, startOffset: 0 },
    music: { enabled: false, volume: 0.4, startOffset: 0 },
    sfx: { enabled: false, volume: 0.6, startOffset: 0 },
  })
  
  // === Segment Audio Configs ===
  const [segmentAudioConfigs, setSegmentAudioConfigs] = useState<Record<string, SegmentAudioConfig>>({})
  
  // Initialize segment configs
  useEffect(() => {
    const configs: Record<string, SegmentAudioConfig> = {}
    segments.forEach(seg => {
      configs[seg.segmentId] = segmentAudioConfigs[seg.segmentId] || { includeAudio: true, volume: 1.0 }
    })
    setSegmentAudioConfigs(configs)
  }, [segments]) // eslint-disable-line react-hooks/exhaustive-deps
  
  // === Preview State ===
  const [isMuted, setIsMuted] = useState(false)
  
  // === Render State ===
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('idle')
  const [renderProgress, setRenderProgress] = useState(0)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [lastRenderedUrl, setLastRenderedUrl] = useState<string | null>(null)
  
  // === Derived Data ===
  
  // Get available languages from audio assets
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>(['en'])
    if (audioAssets.narrationAudio) {
      Object.keys(audioAssets.narrationAudio).forEach(l => langs.add(l))
    }
    if (audioAssets.dialogueAudio) {
      Object.keys(audioAssets.dialogueAudio).forEach(l => langs.add(l))
    }
    return Array.from(langs)
  }, [audioAssets])
  
  // Get audio URLs for selected language
  const currentAudioUrls = useMemo(() => {
    const narrationUrl = audioAssets.narrationAudio?.[selectedLanguage]?.url 
      || audioAssets.narrationAudio?.en?.url 
      || audioAssets.narrationAudioUrl
    
    const dialogueEntries = audioAssets.dialogueAudio?.[selectedLanguage] 
      || audioAssets.dialogueAudio?.en 
      || []
    
    const musicUrl = audioAssets.musicAudio
    
    const sfxEntries = audioAssets.sfx?.filter(s => s.audioUrl) || []
    
    return {
      narration: narrationUrl,
      narrationDuration: audioAssets.narrationAudio?.[selectedLanguage]?.duration,
      dialogue: dialogueEntries,
      music: musicUrl,
      sfx: sfxEntries,
    }
  }, [audioAssets, selectedLanguage])
  
  // Rendered segments
  const renderedSegments = useMemo(() => {
    return segments.filter(s => s.status === 'COMPLETE' && s.activeAssetUrl)
  }, [segments])
  
  // Calculate video-only duration from segments
  const videoTotalDuration = useMemo(() => {
    return renderedSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
  }, [renderedSegments])
  
  // Calculate max audio duration across all enabled tracks
  const maxAudioDuration = useMemo(() => {
    let maxDuration = 0
    
    // Narration duration
    if (audioTracks.narration.enabled && currentAudioUrls.narrationDuration) {
      maxDuration = Math.max(maxDuration, audioTracks.narration.startOffset + currentAudioUrls.narrationDuration)
    }
    
    // Dialogue duration - sum of all clips or last clip end time
    if (audioTracks.dialogue.enabled && currentAudioUrls.dialogue.length > 0) {
      const dialogueEndTimes = currentAudioUrls.dialogue.map((clip, idx) => {
        const startTime = clip.startTime || (idx * 3) // Default spacing if no startTime
        const duration = clip.duration || 3
        return startTime + duration
      })
      maxDuration = Math.max(maxDuration, ...dialogueEndTimes)
    }
    
    // Music typically loops, so doesn't extend duration
    // SFX duration
    if (audioTracks.sfx.enabled && currentAudioUrls.sfx.length > 0) {
      const sfxEndTimes = currentAudioUrls.sfx.map(clip => {
        const startTime = clip.startTime || 0
        const duration = clip.duration || 2
        return startTime + duration
      })
      maxDuration = Math.max(maxDuration, ...sfxEndTimes)
    }
    
    return maxDuration
  }, [audioTracks, currentAudioUrls])
  
  // Total duration = max of video and audio (Elastic Timing)
  const totalDuration = useMemo(() => {
    return Math.max(videoTotalDuration, maxAudioDuration)
  }, [videoTotalDuration, maxAudioDuration])
  
  // Get language label
  const languageLabel = useMemo(() => {
    return SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage.toUpperCase()
  }, [selectedLanguage])
  
  // === Handlers ===
  
  const updateTrackConfig = useCallback((
    track: keyof MixerAudioTracks, 
    config: AudioTrackConfig
  ) => {
    setAudioTracks(prev => ({ ...prev, [track]: config }))
  }, [])
  
  // Render Scene Handler
  const handleRender = useCallback(async () => {
    if (renderedSegments.length === 0) {
      setRenderError('No rendered video segments available')
      return
    }
    
    setRenderStatus('preparing')
    setRenderProgress(0)
    setRenderError(null)
    
    try {
      // Build segment data
      const segmentData = renderedSegments.map(seg => {
        const audioConfig = segmentAudioConfigs[seg.segmentId] || { includeAudio: true, volume: 1.0 }
        return {
          segmentId: seg.segmentId,
          sequenceIndex: seg.sequenceIndex,
          videoUrl: seg.activeAssetUrl!,
          startTime: seg.startTime,
          endTime: seg.endTime,
          audioSource: audioConfig.includeAudio ? 'original' : 'none',
          audioVolume: audioConfig.volume,
        }
      })
      
      // Build audio tracks payload
      const audioTracksPayload: Record<string, Array<{ url: string; startTime: number; duration: number; volume: number; character?: string }>> = {}
      
      if (audioTracks.narration.enabled && currentAudioUrls.narration) {
        audioTracksPayload.narration = [{
          url: currentAudioUrls.narration,
          startTime: audioTracks.narration.startOffset,
          duration: currentAudioUrls.narrationDuration || totalDuration,
          volume: audioTracks.narration.volume,
        }]
      }
      
      if (audioTracks.dialogue.enabled && currentAudioUrls.dialogue.length > 0) {
        audioTracksPayload.dialogue = currentAudioUrls.dialogue
          .filter(d => d.audioUrl)
          .map((d, i) => ({
            url: d.audioUrl!,
            startTime: audioTracks.dialogue.startOffset + (i * 2),
            duration: (d as any).duration || 3,
            volume: audioTracks.dialogue.volume,
            character: (d as any).character,
          }))
      }
      
      if (audioTracks.music.enabled && currentAudioUrls.music) {
        audioTracksPayload.music = [{
          url: currentAudioUrls.music,
          startTime: audioTracks.music.startOffset,
          duration: totalDuration,
          volume: audioTracks.music.volume,
        }]
      }
      
      if (audioTracks.sfx.enabled && currentAudioUrls.sfx.length > 0) {
        audioTracksPayload.sfx = currentAudioUrls.sfx.map(s => ({
          url: s.audioUrl!,
          startTime: audioTracks.sfx.startOffset + (s.startTime || 0),
          duration: s.duration || 5,
          volume: audioTracks.sfx.volume,
        }))
      }
      
      setRenderStatus('rendering')
      setRenderProgress(20)
      
      // Call render API
      const response = await fetch(`/api/scene/${sceneId}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneId,
          sceneNumber,
          resolution,
          audioConfig: {
            includeNarration: audioTracks.narration.enabled,
            includeDialogue: audioTracks.dialogue.enabled,
            includeMusic: audioTracks.music.enabled,
            includeSfx: audioTracks.sfx.enabled,
            includeSegmentAudio: Object.values(segmentAudioConfigs).some(c => c.includeAudio),
            language: selectedLanguage,
            narrationVolume: audioTracks.narration.volume,
            dialogueVolume: audioTracks.dialogue.volume,
            musicVolume: audioTracks.music.volume,
            sfxVolume: audioTracks.sfx.volume,
            segmentAudioVolume: 1.0,
          },
          segments: segmentData,
          audioTracks: audioTracksPayload,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Render failed: ${response.status}`)
      }
      
      const result = await response.json()
      setRenderProgress(40)
      
      // Poll for job status
      await pollJobStatus(result.jobId)
      
    } catch (err) {
      console.error('[SceneProductionMixer] Render error:', err)
      setRenderError(err instanceof Error ? err.message : 'Unknown error')
      setRenderStatus('error')
    }
  }, [
    renderedSegments, segmentAudioConfigs, audioTracks, currentAudioUrls,
    totalDuration, sceneId, projectId, sceneNumber, resolution, selectedLanguage
  ])
  
  // Poll job status
  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 120
    let attempts = 0
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
      
      try {
        const response = await fetch(`/api/scene/${sceneId}/render?jobId=${jobId}`)
        if (!response.ok) continue
        
        const data = await response.json()
        
        if (data.status === 'COMPLETED') {
          setRenderStatus('complete')
          setRenderProgress(100)
          setLastRenderedUrl(data.downloadUrl)
          onRenderComplete?.(data.downloadUrl, selectedLanguage)
          return
        }
        
        if (data.status === 'FAILED') {
          throw new Error(data.error || 'Render job failed')
        }
        
        setRenderProgress(40 + (data.progress || 0) * 0.6)
      } catch (err) {
        console.warn('[SceneProductionMixer] Poll error:', err)
      }
    }
    
    throw new Error('Render job timed out')
  }
  
  // === Render ===
  
  const isRendering = renderStatus === 'preparing' || renderStatus === 'rendering'
  const hasRenderedSegments = renderedSegments.length > 0
  
  return (
    <div className="bg-gray-900/50 rounded-xl border border-purple-500/30 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 bg-purple-900/20 border-b border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <Film className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Scene Production Mixer</h3>
            <p className="text-xs text-gray-400">Configure audio tracks and render your scene</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <ProductionStreamSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            availableLanguages={availableLanguages}
            disabled={isRendering}
          />
          <ResolutionSelector
            resolution={resolution}
            onResolutionChange={setResolution}
            disabled={isRendering}
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-4 sm:p-5">
        {hasRenderedSegments ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column: Preview Player */}
            <div className="space-y-4">
              <ScenePreviewPlayer
                segments={renderedSegments}
                audioTracks={audioTracks}
                currentAudioUrls={currentAudioUrls}
                totalDuration={totalDuration}
                videoTotalDuration={videoTotalDuration}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted(prev => !prev)}
                segmentAudioConfigs={segmentAudioConfigs}
              />
              
              <SegmentAudioControls
                segments={renderedSegments}
                segmentConfigs={segmentAudioConfigs}
                onConfigChange={setSegmentAudioConfigs}
                disabled={isRendering}
              />
            </div>
            
            {/* Right Column: Audio Track Controls */}
            <div className="space-y-3">
              <AudioTrackRow
                type="narration"
                label="Narration"
                icon={Mic2}
                config={audioTracks.narration}
                onConfigChange={(c) => updateTrackConfig('narration', c)}
                audioUrl={currentAudioUrls.narration}
                audioDuration={currentAudioUrls.narrationDuration}
                videoTotalDuration={videoTotalDuration}
                subtitle={audioAssets.narration ? `"${audioAssets.narration.slice(0, 60)}..."` : undefined}
                hasAudio={!!currentAudioUrls.narration}
                disabled={isRendering}
              />
              
              <AudioTrackRow
                type="dialogue"
                label="Dialogue"
                icon={MessageSquare}
                config={audioTracks.dialogue}
                onConfigChange={(c) => updateTrackConfig('dialogue', c)}
                audioUrl={currentAudioUrls.dialogue[0]?.audioUrl}
                clipCount={currentAudioUrls.dialogue.length}
                subtitle={currentAudioUrls.dialogue.length > 0 
                  ? `${currentAudioUrls.dialogue.length} clip${currentAudioUrls.dialogue.length > 1 ? 's' : ''} • ${languageLabel}`
                  : undefined
                }
                hasAudio={currentAudioUrls.dialogue.length > 0}
                disabled={isRendering}
              />
              
              <AudioTrackRow
                type="sfx"
                label="Sound Effects"
                icon={Sparkles}
                config={audioTracks.sfx}
                onConfigChange={(c) => updateTrackConfig('sfx', c)}
                audioUrl={currentAudioUrls.sfx[0]?.audioUrl}
                clipCount={currentAudioUrls.sfx.length}
                subtitle={currentAudioUrls.sfx.length > 0 
                  ? currentAudioUrls.sfx.map(s => s.description).filter(Boolean).join(', ').slice(0, 50)
                  : undefined
                }
                hasAudio={currentAudioUrls.sfx.length > 0}
                disabled={isRendering}
              />
              
              <AudioTrackRow
                type="music"
                label="Background Music"
                icon={Music}
                config={audioTracks.music}
                onConfigChange={(c) => updateTrackConfig('music', c)}
                audioUrl={currentAudioUrls.music}
                subtitle={typeof audioAssets.music === 'string' 
                  ? audioAssets.music.slice(0, 50) 
                  : audioAssets.music?.description?.slice(0, 50)
                }
                hasAudio={!!currentAudioUrls.music}
                disabled={isRendering}
              />
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="py-12 text-center">
            <Film className="w-16 h-16 mx-auto mb-4 text-gray-600 opacity-40" />
            <h4 className="text-lg font-medium text-gray-300 mb-2">No Rendered Segments</h4>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Generate video segments in the Director's Console above to enable the production mixer.
              Once segments are rendered, you can configure audio tracks and create final productions.
            </p>
          </div>
        )}
      </div>
      
      {/* Footer - Render Action */}
      {hasRenderedSegments && (
        <div className="px-4 sm:px-5 py-4 bg-gray-800/50 border-t border-gray-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {renderStatus === 'complete' && lastRenderedUrl && (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm text-green-400">Render complete!</span>
                <a 
                  href={lastRenderedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-400 hover:text-purple-300 underline"
                >
                  Download MP4
                </a>
              </>
            )}
            {renderStatus === 'error' && renderError && (
              <>
                <span className="text-sm text-red-400">Error: {renderError}</span>
                <button
                  onClick={() => setRenderStatus('idle')}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Dismiss
                </button>
              </>
            )}
            {isRendering && (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                <div className="w-32 sm:w-48">
                  <Progress value={renderProgress} className="h-2" />
                </div>
                <span className="text-sm text-gray-400">{Math.round(renderProgress)}%</span>
              </div>
            )}
          </div>
          
          <Button
            onClick={handleRender}
            disabled={isRendering || !hasRenderedSegments}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 w-full sm:w-auto"
          >
            {isRendering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Render {languageLabel} Scene
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
