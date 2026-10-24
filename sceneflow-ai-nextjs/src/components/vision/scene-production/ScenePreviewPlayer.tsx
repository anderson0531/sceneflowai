'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Film,
  Clock,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Repeat,
  Crosshair,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  computeClipAudioTime,
  loopingDrift,
  clampAudioPlaybackRate,
  computeCueMusicGain,
} from '@/lib/audio/loopingAudioSync'
import { isMusicActiveInBeatWindow } from '@/lib/scene/mixerMusicTiming'
import {
  scoreSpan,
  scoreStemEnvelopeGain,
  type MixerMusicClip,
} from '@/lib/scene/mixerScoreMusic'
import { resolveBeatPreviewVolume } from '@/lib/scene/segmentAudioPreview'
import { DEFAULT_MUSIC_FILE_DURATION_SEC } from '@/lib/storyboard/musicPlayback'
import { getFrameCropClipPath } from '@/lib/video/segmentVideoCrop'
import {
  resolveSegmentSourceDurationSec,
  resolveVideoTrimWindow,
} from '@/lib/video/segmentVideoTrim'
import { videoWallDurationSec } from '@/lib/scene/languageShotLocalize'
import { resolveShotJoin } from '@/lib/storyboard/transitions'
import type {
  MixerAudioTracks,
  MixerDialogueClipConfig,
  MixerSegmentAudioConfig,
  SceneSegment,
  TextOverlay,
  WatermarkConfig,
} from './types'

type AudioClipConfig = MixerDialogueClipConfig
type SegmentAudioConfig = MixerSegmentAudioConfig

function mixerDialogueStart(clip: { startTime?: number }, idx: number, fallbackStep: number): number {
  if (clip.startTime != null && Number.isFinite(clip.startTime)) return clip.startTime
  return idx * fallbackStep
}

function dialogueClipConfigKey(clip: { id?: string; clipId?: string }, idx: number): string {
  return clip.id ?? clip.clipId ?? `dialogue-${idx}`
}

function clampDialoguePlaybackRate(r: number | undefined): number {
  if (r == null || !Number.isFinite(r) || r <= 0) return 1
  return Math.min(1.5, Math.max(0.5, r))
}

function dialogueClipWallDuration(sourceSeconds: number | undefined, playbackRate: number | undefined): number {
  const src = sourceSeconds ?? 3
  return src / clampDialoguePlaybackRate(playbackRate)
}

function formatTime(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Broadcast SMPTE timecode MM:SS:FF at 24fps */
function formatSmpteTimecode(secs: number, fps = 24): string {
  if (!Number.isFinite(secs) || secs < 0) return '00:00:00'
  const totalFrames = Math.floor(secs * fps)
  const ff = totalFrames % fps
  const totalSecs = Math.floor(secs)
  const ss = totalSecs % 60
  const mm = Math.floor(totalSecs / 60)
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}:${ff.toString().padStart(2, '0')}`
}

function animaticKeyframeUrl(segment: SceneSegment): string | null {
  const ext = segment as SceneSegment & { keyframeUrl?: string | null; thumbnailUrl?: string | null }
  const u =
    segment.startFrameUrl ||
    segment.references?.startFrameUrl ||
    segment.visualFrame ||
    (segment.assetType === 'image' ? segment.activeAssetUrl : null) ||
    ext.keyframeUrl ||
    ext.thumbnailUrl ||
    null
  return u && String(u).trim() ? String(u) : null
}

/**
 * ScenePreviewPlayer - Video player with concatenated segments and audio sync
 * 
 * Implements "Elastic Timing" - audio can extend beyond video duration
 * by freezing the last video frame while audio continues.
 */
export function ScenePreviewPlayer({
  segments,
  audioTracks,
  currentAudioUrls,
  totalDuration,
  isMuted,
  onToggleMute,
  segmentAudioConfigs,
  masterSegmentVolume,
  textOverlays = [],
  onEditOverlay,
  onDeleteOverlay,
  watermarkConfig,
  playbackKind = 'video',
  dialogueClipConfigs,
  getPlaybackSegmentDuration,
  getVideoPlaybackRate,
  getSegmentDuration,
  measuredSegmentDurations,
  onMeasuredDurationsChange,
  onPlaybackTimeChange,
  musicFileDuration = DEFAULT_MUSIC_FILE_DURATION_SEC,
  scoreStemFade = false,
  focusBeatSegmentId,
  onFocusBeatHandled,
  autoPlay = false,
  onPlaybackComplete,
  sceneEnd,
  nextSceneFrameUrl = null,
  fillScreen = false,
  externalSeekRequest = null,
}: {
  segments: SceneSegment[]
  audioTracks: MixerAudioTracks
  currentAudioUrls: {
    narration?: string
    narrationDuration?: number
    dialogue: Array<{ id?: string; audioUrl?: string; duration?: number; startTime?: number }>
    music?: string
    musicClips?: MixerMusicClip[]
    sfx: Array<{ audioUrl?: string; duration?: number; startTime?: number }>
  }
  totalDuration: number // max(metadata video, audio) from parent — scrubber uses max of this and measured video
  isMuted: boolean
  onToggleMute: () => void
  segmentAudioConfigs: Record<string, SegmentAudioConfig>
  /** Global multiplier for embedded beat video audio in preview (0–1). */
  masterSegmentVolume: number
  textOverlays?: TextOverlay[]
  onEditOverlay?: (overlay: TextOverlay) => void
  onDeleteOverlay?: (overlayId: string) => void
  watermarkConfig?: WatermarkConfig
  /** Keyframe / still preview timed by segment metadata (animatic target) */
  playbackKind?: 'video' | 'image-sequence'
  /** Per-line volume / enable; keys match dialogue clip ids from the layout engine */
  dialogueClipConfigs?: Record<string, AudioClipConfig>
  /** Lifted helpers and state for consistency */
  getPlaybackSegmentDuration: (segment: SceneSegment) => number
  /** Picture speed for the selected language. Omitted means 1. */
  getVideoPlaybackRate?: (segmentId: string) => number
  getSegmentDuration: (segment: SceneSegment) => number
  measuredSegmentDurations: Record<string, number>
  onMeasuredDurationsChange: (durations: Record<string, number>) => void
  onPlaybackTimeChange?: (time: number) => void
  /** Probed WAV length for modulo loop sync (legacy single-track fallback). */
  musicFileDuration?: number
  /**
   * When true, musicConfig fadeIn/fadeOut is a stem envelope across every cue.
   * Legacy beds already store those fades on the single clip.
   */
  scoreStemFade?: boolean
  /** When set, jump preview to this beat (e.g. from Beat Trim panel) */
  focusBeatSegmentId?: string | null
  onFocusBeatHandled?: () => void
  /** Start playback after mount. Used when the Screening Room advances scenes. */
  autoPlay?: boolean
  /**
   * Called when the timeline ends on its own.
   * Return true when the parent advanced to another scene.
   * Otherwise the player restarts, matching the Mixer.
   */
  onPlaybackComplete?: () => boolean | void
  /** End-of-scene join. Fade holds black; dissolve crossfades the next opening frame. */
  sceneEnd?: { effect: 'cut' | 'dissolve' | 'fade'; durationSec: number; holdSec: number }
  nextSceneFrameUrl?: string | null
  /**
   * Parent view is already fullscreen. Grow the picture to that stage and
   * hide the always-on bar, segment badges, and this player's own fullscreen
   * control so it cannot take the fullscreen element.
   */
  fillScreen?: boolean
  /** External seek command from NLE timeline scrubber or shot strip */
  externalSeekRequest?: { time: number; seq: number } | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const dissolveVideoRef = useRef<HTMLVideoElement>(null)
  const narrationRef = useRef<HTMLAudioElement>(null)
  const musicRefsById = useRef<Map<string, HTMLAudioElement | null>>(new Map())
  const dialogueRefsById = useRef<Map<string, HTMLAudioElement | null>>(new Map())
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLooping, setIsLooping] = useState(false)
  const [showSafeGuides, setShowSafeGuides] = useState(false)

  useEffect(() => {
    onPlaybackTimeChange?.(currentTime)
  }, [currentTime, onPlaybackTimeChange])
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [isVideoFrozen, setIsVideoFrozen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const onPlaybackCompleteRef = useRef(onPlaybackComplete)
  onPlaybackCompleteRef.current = onPlaybackComplete
  const isLoopingRef = useRef(isLooping)
  isLoopingRef.current = isLooping
  const playbackEndedRef = useRef(false)

  const finishPlayback = useCallback(() => {
    if (playbackEndedRef.current) return
    playbackEndedRef.current = true
    setIsVideoFrozen(false)
    if (isLoopingRef.current) {
      playbackEndedRef.current = false
      setCurrentTime(0)
      setCurrentSegmentIndex(0)
      loadedVideoUrlRef.current = null
      setIsPlaying(true)
      return
    }
    setIsPlaying(false)
    if (onPlaybackCompleteRef.current?.()) return
    setCurrentTime(0)
    setCurrentSegmentIndex(0)
  }, [])

  useEffect(() => {
    if (isPlaying) playbackEndedRef.current = false
  }, [isPlaying])

  useEffect(() => {
    if (autoPlay) setIsPlaying(true)
  }, [autoPlay])
  
  // Track container width for proportional overlay scaling
  // Text overlays use vh units (viewport-relative) but need to be scaled
  // proportionally to the player width so they match the rendered output.
  const [containerWidth, setContainerWidth] = useState(0)
  
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  
  // Track loaded video URL to prevent duplicate loads
  const loadedVideoUrlRef = useRef<string | null>(null)
  const segmentIdForLoadedVideoRef = useRef<string | null>(null)
  const segmentEndHandledRef = useRef(false)
  
  // Timer for audio-extended playback (when video is frozen)
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    segmentEndHandledRef.current = false
  }, [currentSegmentIndex])

  const getTrimForSegment = useCallback(
    (seg: SceneSegment) => {
      const source = resolveSegmentSourceDurationSec(
        seg,
        measuredSegmentDurations[seg.segmentId]
      )
      return resolveVideoTrimWindow(seg, source)
    },
    [measuredSegmentDurations]
  )
  
  // Helper: Start time on the playback timeline (uses measured segment lengths)
  const getSegmentStartTime = useCallback(
    (segmentIndex: number) => {
      let elapsed = 0
      for (let i = 0; i < Math.min(segmentIndex, segments.length); i++) {
        elapsed += getPlaybackSegmentDuration(segments[i])
      }
      return elapsed
    },
    [segments, getPlaybackSegmentDuration]
  )

  // Helper: End time on the playback timeline
  const getSegmentEndTime = useCallback(
    (segmentIndex: number) => {
      let elapsed = 0
      for (let i = 0; i <= Math.min(segmentIndex, segments.length - 1); i++) {
        elapsed += getPlaybackSegmentDuration(segments[i])
      }
      return elapsed
    },
    [segments, getPlaybackSegmentDuration]
  )

  const timelineVideoDuration = useMemo(
    () => segments.reduce((sum, s) => sum + getPlaybackSegmentDuration(s), 0),
    [segments, getPlaybackSegmentDuration]
  )

  // Scrubber/timeline length: at least as long as decoded video and at least parent total (audio/elastic)
  const scrubberTotalDuration = Math.max(timelineVideoDuration, totalDuration, 0.001)

  // Calculate progress percentage (clamped — denominator tracks real media + elastic audio)
  const progressPercent =
    scrubberTotalDuration > 0 ? Math.min(100, (currentTime / scrubberTotalDuration) * 100) : 0
  
  // Current segment (based on segment index, not time-based calculation)
  const imageSequenceIndex = useMemo(() => {
    if (playbackKind !== 'image-sequence' || segments.length === 0) return 0
    if (currentTime >= timelineVideoDuration) return segments.length - 1
    let elapsed = 0
    for (let i = 0; i < segments.length; i++) {
      const d = getPlaybackSegmentDuration(segments[i])
      if (currentTime < elapsed + d) return i
      elapsed += d
    }
    return Math.max(0, segments.length - 1)
  }, [playbackKind, segments, currentTime, timelineVideoDuration, getPlaybackSegmentDuration])

  const activeSegmentIndex = playbackKind === 'image-sequence' ? imageSequenceIndex : currentSegmentIndex

  const currentSegment = useMemo(() => {
    if (activeSegmentIndex >= 0 && activeSegmentIndex < segments.length) {
      return { segment: segments[activeSegmentIndex], index: activeSegmentIndex }
    }
    return { segment: segments[0], index: 0 }
  }, [segments, activeSegmentIndex])
  
  const segmentStartTime = useMemo(
    () => getSegmentStartTime(activeSegmentIndex),
    [activeSegmentIndex, getSegmentStartTime]
  )
  const activeSegmentDuration = useMemo(
    () => (segments[activeSegmentIndex] ? getPlaybackSegmentDuration(segments[activeSegmentIndex]) : 0),
    [segments, activeSegmentIndex, getPlaybackSegmentDuration]
  )
  const animaticFrameProgress = useMemo(() => {
    if (playbackKind !== 'image-sequence' || activeSegmentDuration <= 0) return 0
    const local = currentTime - segmentStartTime
    return Math.max(0, Math.min(1, local / activeSegmentDuration))
  }, [playbackKind, currentTime, segmentStartTime, activeSegmentDuration])

  const animaticStartFrameSrc = useMemo(
    () => (currentSegment.segment ? animaticKeyframeUrl(currentSegment.segment) : null),
    [currentSegment.segment]
  )

  // Image-sequence playback: advance global time (last frame holds while audio extends past visual length)
  useEffect(() => {
    if (playbackKind !== 'image-sequence') return
    if (!isPlaying || isVideoFrozen) return
    
    let lastTime = performance.now()
    let frameId: number
    
    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000 // in seconds
      lastTime = now
      
      setCurrentTime(prev => {
        const next = prev + delta
        if (next >= scrubberTotalDuration) {
          finishPlayback()
          return onPlaybackCompleteRef.current ? prev : 0
        }
        return next
      })
      
      frameId = requestAnimationFrame(tick)
    }
    
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [playbackKind, isPlaying, isVideoFrozen, scrubberTotalDuration, finishPlayback])

  // Handle video time updates
  useEffect(() => {
    if (playbackKind === 'image-sequence') return
    const video = videoRef.current
    if (!video) return
    
    const completeCurrentSegment = () => {
      if (segmentEndHandledRef.current) return
      segmentEndHandledRef.current = true

      const config = segmentAudioConfigs[segments[currentSegmentIndex].segmentId]
      const trim = getTrimForSegment(segments[currentSegmentIndex])
      const videoRate = getVideoPlaybackRate?.(segments[currentSegmentIndex].segmentId) ?? 1
      const videoWall = videoWallDurationSec(trim.playableSec, videoRate)
      const autoPauseVal = audioTracks?.dialogue?.enabled
        ? Math.max(0, getPlaybackSegmentDuration(segments[currentSegmentIndex]) - videoWall)
        : 0.0
      const pauseDuration = (config?.postSegmentPause || 0) + autoPauseVal

      const advanceOrEnd = () => {
        // Check if we should advance to next segment or freeze
        if (currentSegmentIndex < segments.length - 1) {
          // Move to next segment
          setCurrentSegmentIndex(prev => prev + 1)
        } else {
          // Last segment ended - check if audio extends beyond video
          const dialogueStartBase = getSegmentStartTime(audioTracks.dialogue.startSegment)
          const dialogueEnds =
            audioTracks.dialogue.enabled && currentAudioUrls.dialogue.length > 0
              ? currentAudioUrls.dialogue.map((d, i) => {
                  const cfg = dialogueClipConfigs?.[dialogueClipConfigKey(d, i)]
                  if (cfg?.enabled === false) return 0
                  const t0 = dialogueStartBase + mixerDialogueStart(d, i, 3)
                  return t0 + dialogueClipWallDuration(d.duration, cfg?.playbackRate)
                })
              : [0]
          const narrEnd =
            audioTracks.narration.enabled &&
            currentAudioUrls.narration &&
            (currentAudioUrls.narrationDuration ?? 0) > 0
              ? getSegmentStartTime(audioTracks.narration.startSegment) +
                (currentAudioUrls.narrationDuration ?? 0)
              : 0
          const audioEndTime = Math.max(
            narrEnd,
            ...dialogueEnds,
            audioTracks.music.enabled &&
              (currentAudioUrls.musicClips?.length || currentAudioUrls.music)
              ? totalDuration
              : 0
          )
          
          if (audioEndTime > timelineVideoDuration && currentTime < audioEndTime) {
            // Freeze video on last frame, continue audio
            setIsVideoFrozen(true)
            
            // Start timer to continue advancing currentTime for audio playback
            const startFreezeTime = timelineVideoDuration
            const remainingTime = audioEndTime - startFreezeTime
            const startTimeMs = performance.now()
            
            const tick = () => {
              const elapsedFrozen = (performance.now() - startTimeMs) / 1000
              setCurrentTime(startFreezeTime + elapsedFrozen)
              
              if (elapsedFrozen >= remainingTime) {
                // Audio complete - end playback
                if (audioTimerRef.current) {
                  cancelAnimationFrame(audioTimerRef.current)
                  audioTimerRef.current = null
                }
                finishPlayback()
              } else {
                audioTimerRef.current = requestAnimationFrame(tick) as unknown as NodeJS.Timeout
              }
            }
            audioTimerRef.current = requestAnimationFrame(tick) as unknown as NodeJS.Timeout
          } else {
            // No audio extension - normal end
            finishPlayback()
          }
        }
      }

      if (pauseDuration > 0) {
        setIsVideoFrozen(true)
        
        const startFreezeTime = segmentStartTime + (getPlaybackSegmentDuration(segments[currentSegmentIndex]) - pauseDuration)
        const remainingTime = pauseDuration
        const startTimeMs = performance.now()
        
        const tick = () => {
          const elapsedFrozen = (performance.now() - startTimeMs) / 1000
          setCurrentTime(startFreezeTime + elapsedFrozen)
          
          if (elapsedFrozen >= remainingTime) {
            if (audioTimerRef.current) {
              cancelAnimationFrame(audioTimerRef.current as unknown as number)
              audioTimerRef.current = null
            }
            setIsVideoFrozen(false)
            advanceOrEnd()
          } else {
            audioTimerRef.current = requestAnimationFrame(tick) as unknown as NodeJS.Timeout
          }
        }
        audioTimerRef.current = requestAnimationFrame(tick) as unknown as NodeJS.Timeout
      } else {
        advanceOrEnd()
      }
    }

    const handleTimeUpdate = () => {
      if (isVideoFrozen) return // Don't update from video when frozen
      
      const seg = segments[currentSegmentIndex]
      const trim = getTrimForSegment(seg)
      const videoRate = getVideoPlaybackRate?.(seg.segmentId) ?? 1
      if (Math.abs(video.playbackRate - videoRate) > 0.01) {
        video.playbackRate = videoRate
      }
      // Source time advances at `videoRate`; the timeline stays in wall-clock seconds.
      const globalTime = segmentStartTime + Math.max(0, video.currentTime - trim.inSec) / videoRate
      setCurrentTime(globalTime)

      if (video.currentTime >= trim.outSec - 0.05 && !isVideoFrozen) {
        video.pause()
        completeCurrentSegment()
      }
    }
    
    const handleEnded = () => {
      completeCurrentSegment()
    }
    
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [
    playbackKind,
    currentSegmentIndex,
    segments,
    segmentStartTime,
    isVideoFrozen,
    audioTracks,
    currentAudioUrls,
    dialogueClipConfigs,
    totalDuration,
    timelineVideoDuration,
    currentTime,
    segmentAudioConfigs,
    getPlaybackSegmentDuration,
    getVideoPlaybackRate,
    getSegmentStartTime,
    getTrimForSegment,
    finishPlayback,
  ])
  
  // Sync audio tracks with video playback
  useEffect(() => {
    // Narration sync — only when a real narration URL exists (avoids enabled + empty track)
    if (
      narrationRef.current &&
      audioTracks.narration.enabled &&
      currentAudioUrls.narration
    ) {
      narrationRef.current.volume = isMuted ? 0 : audioTracks.narration.volume
      const narrationStartTime = getSegmentStartTime(audioTracks.narration.startSegment)
      
      if (isPlaying && currentTime >= narrationStartTime) {
        const narrationLocalTime = currentTime - narrationStartTime
        const drift = Math.abs(narrationRef.current.currentTime - narrationLocalTime)
        if (drift > 0.85) {
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
    
    // Music sync — Score cues (or a single legacy clip) placed on the mixer timeline
    const musicClips = currentAudioUrls.musicClips ?? []
    const musicCfg = audioTracks.music
    if (musicCfg.enabled && musicClips.length > 0) {
      const rate = clampAudioPlaybackRate(musicCfg.playbackRate)
      const activeIds = new Set<string>()
      musicClips.forEach((clip) => {
        const audioEl = musicRefsById.current.get(clip.id)
        if (!audioEl) return
        if (Math.abs(audioEl.playbackRate - rate) > 0.01) {
          audioEl.playbackRate = rate
        }
        const musicEndTime = clip.startTime + clip.duration
        const withinWindow = isMusicActiveInBeatWindow(
          currentTime,
          clip.startTime,
          musicEndTime,
          isPlaying
        )
        if (!withinWindow) {
          if (!audioEl.paused) audioEl.pause()
          return
        }
        activeIds.add(clip.id)
        const musicLocalTime = currentTime - clip.startTime
        const fileDuration =
          clip.actualDuration > 0 ? clip.actualDuration : musicFileDuration
        const trimStart = clip.trimStart ?? 0
        const expectedAudioTime = clip.loop
          ? computeClipAudioTime(
              { startTime: 0, trimStart, loop: true },
              musicLocalTime * rate,
              fileDuration
            )
          : Math.min(trimStart + musicLocalTime * rate, fileDuration)
        const drift = clip.loop
          ? loopingDrift(expectedAudioTime, audioEl.currentTime, fileDuration)
          : Math.abs(audioEl.currentTime - expectedAudioTime)
        if (drift > 0.85) {
          audioEl.currentTime = expectedAudioTime
        }
        const gain = computeCueMusicGain({
          localTimeSec: musicLocalTime,
          playDurationSec: clip.duration,
          volume: clip.volume,
          fadeInSec: clip.fadeInSec,
          fadeOutSec: clip.fadeOutSec,
        })
        const span = scoreStemFade ? scoreSpan(musicClips) : null
        const stem = span
          ? scoreStemEnvelopeGain(
              currentTime,
              span.start,
              span.end,
              musicCfg.fadeInSec ?? 0,
              musicCfg.fadeOutSec ?? 0
            )
          : 1
        audioEl.volume = isMuted ? 0 : Math.max(0, Math.min(1, musicCfg.volume * gain * stem))
        if (audioEl.paused) {
          audioEl.play().catch(() => {})
        }
      })
      musicRefsById.current.forEach((el, id) => {
        if (el && !activeIds.has(id) && !el.paused) el.pause()
      })
    } else {
      musicRefsById.current.forEach((el) => el?.pause())
    }
    
    // Dialogue sync — refs keyed by clip id so order matches layout after sort/regeneration
    if (audioTracks.dialogue.enabled && currentAudioUrls.dialogue.length > 0) {
      const dialogueStartTime = getSegmentStartTime(audioTracks.dialogue.startSegment)
      const EPS = 0.03

      currentAudioUrls.dialogue.forEach((clip, idx) => {
        const clipKey = clip.id ?? `__dialogue_${idx}`
        const audioEl = dialogueRefsById.current.get(clipKey)
        if (!audioEl || !clip.audioUrl) return

        const lineCfg = dialogueClipConfigs?.[dialogueClipConfigKey(clip, idx)]
        if (lineCfg?.enabled === false) {
          audioEl.pause()
          return
        }
        const lineVol = lineCfg?.volume ?? 1
        const rate = clampDialoguePlaybackRate(lineCfg?.playbackRate)
        
        // Only set playbackRate if it has actually changed to avoid interrupting audio decoding
        if (Math.abs(audioEl.playbackRate - rate) > 0.01) {
          audioEl.playbackRate = rate
        }
        
        audioEl.volume = isMuted ? 0 : lineVol * audioTracks.dialogue.volume
        const clipStart = dialogueStartTime + mixerDialogueStart(clip, idx, 3)
        const wallDur = dialogueClipWallDuration(clip.duration, lineCfg?.playbackRate)
        const clipEnd = clipStart + wallDur + EPS

        if (isPlaying && currentTime >= clipStart && currentTime < clipEnd) {
          // When adjusting playbackRate on HTMLAudioElement, it naturally plays faster/slower.
          // The currentTime of the audio element tracks the *audio file's* time.
          // Therefore, we do NOT multiply our wall-clock delta by rate when checking drift,
          // because HTMLAudioElement.currentTime already advances at `rate` times real-time.
          const expectedAudioTime = Math.max(0, (currentTime - clipStart) * rate)
          const drift = Math.abs(audioEl.currentTime - expectedAudioTime)
          
          // Use a looser drift threshold to prevent stuttering
          if (drift > 0.85) {
            audioEl.currentTime = expectedAudioTime
          }
          if (audioEl.paused) {
            audioEl.play().catch(() => {})
          }
        } else if (!audioEl.paused) {
          audioEl.pause()
        }
      })
    } else {
      dialogueRefsById.current.forEach(el => el?.pause())
    }
  }, [isPlaying, currentTime, audioTracks, currentAudioUrls, dialogueClipConfigs, isMuted, getSegmentStartTime, musicFileDuration, segments, getPlaybackSegmentDuration])

  // Sync embedded beat video audio volume with Beat Audio panel sliders
  useEffect(() => {
    if (playbackKind === 'image-sequence') return
    const video = videoRef.current
    if (!video) return
    const segId = segments[currentSegmentIndex]?.segmentId
    const cfg = segId ? segmentAudioConfigs[segId] : undefined
    const { muted, volume } = resolveBeatPreviewVolume(cfg, masterSegmentVolume, isMuted)
    video.muted = muted
    video.volume = volume
  }, [
    playbackKind,
    currentSegmentIndex,
    segments,
    segmentAudioConfigs,
    masterSegmentVolume,
    isMuted,
  ])
  
  // Load new segment video when segment index changes
  useEffect(() => {
    if (playbackKind === 'image-sequence') return
    const video = videoRef.current
    const newUrl = currentSegment.segment?.activeAssetUrl
    const segmentId = currentSegment.segment?.segmentId ?? null
    const isNewUrl = newUrl !== loadedVideoUrlRef.current
    const isNewSegment = segmentId !== segmentIdForLoadedVideoRef.current
    
    if (video && newUrl && currentSegment.segment && (isNewUrl || isNewSegment)) {
      loadedVideoUrlRef.current = newUrl
      segmentIdForLoadedVideoRef.current = segmentId
      const seekToTrimIn = () => {
        if (!currentSegment.segment) return
        const trim = getTrimForSegment(currentSegment.segment)
        const videoRate = getVideoPlaybackRate?.(currentSegment.segment.segmentId) ?? 1
        video.playbackRate = videoRate
        video.currentTime = trim.inSec
      }
      if (isNewUrl) {
        video.src = newUrl
        video.load()
        if (video.readyState >= 1) {
          seekToTrimIn()
        } else {
          video.addEventListener('loadedmetadata', seekToTrimIn, { once: true })
        }
      } else {
        seekToTrimIn()
      }
      if (isPlaying && !isVideoFrozen && !segmentEndHandledRef.current) {
        video.play().catch(() => {})
      }
    } else if (video && newUrl && currentSegment.segment) {
      const trim = getTrimForSegment(currentSegment.segment)
      if (video.currentTime < trim.inSec - 0.05 || video.currentTime > trim.outSec) {
        video.currentTime = trim.inSec
      }
      if (isPlaying && !isVideoFrozen && !segmentEndHandledRef.current) {
        video.play().catch(() => {})
      }
    }
  }, [playbackKind, currentSegmentIndex, currentSegment.segment, isPlaying, isVideoFrozen, getTrimForSegment, getVideoPlaybackRate])

  useEffect(() => {
    if (!focusBeatSegmentId || playbackKind === 'image-sequence') return
    const idx = segments.findIndex((s) => s.segmentId === focusBeatSegmentId)
    if (idx < 0) {
      onFocusBeatHandled?.()
      return
    }
    setIsVideoFrozen(false)
    if (audioTimerRef.current) {
      cancelAnimationFrame(audioTimerRef.current as unknown as number)
      audioTimerRef.current = null
    }
    setCurrentSegmentIndex(idx)
    setCurrentTime(getSegmentStartTime(idx))
    loadedVideoUrlRef.current = null
    onFocusBeatHandled?.()
  }, [focusBeatSegmentId, segments, playbackKind, getSegmentStartTime, onFocusBeatHandled])
  
  // Comprehensive cleanup on unmount - prevents memory leaks
  useEffect(() => {
    return () => {
      // Clear audio timer
      if (audioTimerRef.current) {
        cancelAnimationFrame(audioTimerRef.current as unknown as number)
        audioTimerRef.current = null
      }
      
      // Pause and clear video
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
        videoRef.current.load()
      }
      
      // Pause and clear all audio
      if (narrationRef.current) {
        narrationRef.current.pause()
        narrationRef.current.src = ''
      }
      musicRefsById.current.forEach(el => {
        if (el) {
          el.pause()
          el.src = ''
        }
      })
      musicRefsById.current.clear()
      dialogueRefsById.current.forEach(el => {
        if (el) {
          el.pause()
          el.src = ''
        }
      })
      dialogueRefsById.current.clear()
      
      // Clear loaded URL ref
      loadedVideoUrlRef.current = null
      
      console.log('[ScenePreviewPlayer] Cleanup complete')
    }
  }, [])
  
  const handlePlayPause = () => {
    if (playbackKind === 'image-sequence') {
      if (isPlaying) {
        setIsPlaying(false)
        setIsVideoFrozen(false)
        if (audioTimerRef.current) {
          cancelAnimationFrame(audioTimerRef.current as unknown as number)
          audioTimerRef.current = null
        }
      } else {
        setIsPlaying(true)
      }
      return
    }

    const video = videoRef.current
    if (!video) return
    
    if (isPlaying) {
      video.pause()
      narrationRef.current?.pause()
      musicRefsById.current.forEach(el => el?.pause())
      dialogueRefsById.current.forEach(el => el?.pause())
      if (audioTimerRef.current) {
        cancelAnimationFrame(audioTimerRef.current as unknown as number)
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
  
  const seekToTime = useCallback(
    (rawTargetTime: number) => {
      const targetTime = Math.max(0, Math.min(scrubberTotalDuration, rawTargetTime))

      // Clear any frozen state
      setIsVideoFrozen(false)
      if (audioTimerRef.current) {
        cancelAnimationFrame(audioTimerRef.current as unknown as number)
        audioTimerRef.current = null
      }

      if (playbackKind === 'image-sequence') {
        setCurrentTime(targetTime)
        const clamped = Math.min(targetTime, timelineVideoDuration)
        let elapsed = 0
        for (let i = 0; i < segments.length; i++) {
          const segDuration = getPlaybackSegmentDuration(segments[i])
          if (clamped < elapsed + segDuration) {
            setCurrentSegmentIndex(i)
            return
          }
          elapsed += segDuration
        }
        setCurrentSegmentIndex(Math.max(0, segments.length - 1))
        return
      }

      const videoTargetTime = Math.min(targetTime, timelineVideoDuration)
      let elapsed = 0
      for (let i = 0; i < segments.length; i++) {
        const segDuration = getPlaybackSegmentDuration(segments[i])
        if (videoTargetTime < elapsed + segDuration) {
          setCurrentSegmentIndex(i)
          const localTime = videoTargetTime - elapsed
          const trim = getTrimForSegment(segments[i])
          const rate = getVideoPlaybackRate?.(segments[i].segmentId) ?? 1
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              trim.outSec - 0.01,
              trim.inSec + localTime * rate
            )
          }
          setCurrentTime(targetTime)
          return
        }
        elapsed += segDuration
      }

      setCurrentSegmentIndex(Math.max(0, segments.length - 1))
      if (videoRef.current && segments.length > 0) {
        const lastSegDuration = getPlaybackSegmentDuration(segments[segments.length - 1])
        videoRef.current.currentTime = lastSegDuration
      }
      setCurrentTime(targetTime)
    },
    [
      scrubberTotalDuration,
      playbackKind,
      timelineVideoDuration,
      segments,
      getPlaybackSegmentDuration,
      getTrimForSegment,
      getVideoPlaybackRate,
    ]
  )

  const handleSeek = (percent: number) => {
    const clampedPct = Math.max(0, Math.min(100, percent))
    seekToTime((clampedPct / 100) * scrubberTotalDuration)
  }

  const stepBySeconds = (deltaSec: number) => {
    seekToTime(currentTime + deltaSec)
  }

  const lastExternalSeekSeqRef = useRef<number | null>(null)
  useEffect(() => {
    if (!externalSeekRequest) return
    if (lastExternalSeekSeqRef.current === externalSeekRequest.seq) return
    lastExternalSeekSeqRef.current = externalSeekRequest.seq
    seekToTime(externalSeekRequest.time)
  }, [externalSeekRequest, seekToTime])

  const shotBoundaryPercents = useMemo(() => {
    if (segments.length <= 1 || scrubberTotalDuration <= 0) return []
    const marks: Array<{ pct: number; shotNum: number }> = []
    let elapsed = 0
    for (let i = 0; i < segments.length - 1; i++) {
      elapsed += getPlaybackSegmentDuration(segments[i])
      const pct = (elapsed / scrubberTotalDuration) * 100
      if (pct > 1 && pct < 99) {
        marks.push({ pct, shotNum: i + 2 })
      }
    }
    return marks
  }, [segments, scrubberTotalDuration, getPlaybackSegmentDuration])
  
  const skipToBeat = (direction: 'prev' | 'next') => {
    // Clear frozen state
    setIsVideoFrozen(false)
    if (audioTimerRef.current) {
      cancelAnimationFrame(audioTimerRef.current as unknown as number)
      audioTimerRef.current = null
    }

    const baseIdx = playbackKind === 'image-sequence' ? imageSequenceIndex : currentSegmentIndex
    const nextIdx =
      direction === 'prev'
        ? Math.max(0, baseIdx - 1)
        : Math.min(segments.length - 1, baseIdx + 1)

    setCurrentTime(getSegmentStartTime(nextIdx))
    setCurrentSegmentIndex(nextIdx)

    if (playbackKind === 'image-sequence') {
      return
    }

    if (videoRef.current && segments[nextIdx]) {
      const trim = getTrimForSegment(segments[nextIdx])
      videoRef.current.currentTime = trim.inSec
    }
    loadedVideoUrlRef.current = null // Force reload
  }
  
  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.warn('Fullscreen error:', err)
    }
  }, [])
  
  // Listen for fullscreen changes (e.g., user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])
  
  const shotJoinVisual = (() => {
    if (playbackKind === 'image-sequence') return null
    const index = activeSegmentIndex
    const segment = segments[index]
    if (!segment) return null
    const duration = getPlaybackSegmentDuration(segment)
    const local = Math.max(0, currentTime - getSegmentStartTime(index))
    const incoming =
      index > 0
        ? resolveShotJoin(segments[index - 1]?.shotJoin, getPlaybackSegmentDuration(segments[index - 1]))
        : null
    const outgoing =
      index < segments.length - 1 ? resolveShotJoin(segment.shotJoin, duration) : null
    let fadeBlack = 0
    if (incoming?.effect === 'fade' && incoming.durationSec > 0) {
      fadeBlack = Math.max(fadeBlack, Math.max(0, 1 - local / incoming.durationSec))
    }
    if (outgoing?.effect === 'fade' && outgoing.durationSec > 0) {
      fadeBlack = Math.max(fadeBlack, Math.max(0, 1 - (duration - local) / outgoing.durationSec))
    }
    const next = index + 1 < segments.length ? segments[index + 1] : undefined
    const nextUrl = next?.activeAssetUrl?.trim()
    let dissolve: { url: string; opacity: number; trimIn: number; rate: number } | null = null
    if (outgoing?.effect === 'dissolve' && outgoing.durationSec > 0 && next && nextUrl) {
      const start = Math.max(0, duration - outgoing.durationSec)
      if (local >= start) {
        dissolve = {
          url: nextUrl,
          opacity: Math.min(1, (local - start) / outgoing.durationSec),
          trimIn: getTrimForSegment(next).inSec,
          rate: getVideoPlaybackRate?.(next.segmentId) ?? 1,
        }
      }
    }
    if (fadeBlack <= 0 && !dissolve) return null
    return { fadeBlack, dissolve }
  })()

  const dissolveJoin = shotJoinVisual?.dissolve ?? null
  const dissolveUrl = dissolveJoin?.url ?? null
  const dissolveTrimIn = dissolveJoin?.trimIn ?? 0
  const dissolveRate = dissolveJoin?.rate ?? 1
  useEffect(() => {
    const video = dissolveVideoRef.current
    if (!video || !dissolveUrl) return
    if (video.getAttribute('data-join-src') !== dissolveUrl) {
      video.setAttribute('data-join-src', dissolveUrl)
      video.src = dissolveUrl
      const seekTo = dissolveTrimIn
      const seek = () => {
        video.currentTime = seekTo
      }
      video.addEventListener('loadedmetadata', seek, { once: true })
    }
    video.playbackRate = dissolveRate
    if (isPlaying) {
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [dissolveUrl, dissolveTrimIn, dissolveRate, isPlaying])

  const sceneEndOverlay = (() => {
    if (!sceneEnd || sceneEnd.effect === 'cut' || !(sceneEnd.durationSec > 0)) return null
    const contentEnd = Math.max(0, totalDuration - (sceneEnd.holdSec || 0))
    const fadeStart = Math.max(0, contentEnd - sceneEnd.durationSec)
    if (currentTime <= fadeStart) return null
    const progress =
      currentTime >= contentEnd ? 1 : (currentTime - fadeStart) / sceneEnd.durationSec
    if (sceneEnd.effect === 'dissolve' && nextSceneFrameUrl) {
      return { kind: 'dissolve' as const, opacity: progress }
    }
    return { kind: 'fade' as const, opacity: progress }
  })()

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      onKeyDown={(e) => {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if (e.key === ' ') {
          e.preventDefault()
          handlePlayPause()
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          stepBySeconds(-0.25)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          stepBySeconds(0.25)
        } else if (e.key === 'm' || e.key === 'M') {
          e.preventDefault()
          onToggleMute()
        } else if (e.key === 'l' || e.key === 'L') {
          e.preventDefault()
          setIsLooping((prev) => !prev)
        } else if (e.key === 'g' || e.key === 'G') {
          e.preventDefault()
          setShowSafeGuides((prev) => !prev)
        }
      }}
      className={`bg-zinc-950 overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40 ${
        fillScreen
          ? 'flex h-full w-full flex-col rounded-none border-0'
          : `rounded-lg border border-zinc-800/90 shadow-xl ${isFullscreen ? 'flex flex-col' : ''}`
      }`}
    >
      {/* Video Display Area */}
      <div className={`relative bg-black flex items-center justify-center ${
        fillScreen || isFullscreen ? 'min-h-0 flex-1' : 'aspect-video'
      }`}>
        {currentSegment.segment?.activeAssetUrl ? (
          playbackKind === 'image-sequence' ? (
            <div className="relative w-full h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={animaticStartFrameSrc || currentSegment.segment.activeAssetUrl || ''}
                alt=""
                className="absolute inset-0 w-full h-full object-contain select-none opacity-100"
                draggable={false}
                style={{
                  transform: `scale(${1 + animaticFrameProgress * 0.02})`,
                  transformOrigin: 'center center',
                }}
              />
            </div>
          ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            muted={isMuted || !segmentAudioConfigs[currentSegment.segment.segmentId]?.includeAudio}
            playsInline
            style={{
              clipPath: getFrameCropClipPath(currentSegment.segment.watermarkCropPercent),
            }}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget
              const id = segmentIdForLoadedVideoRef.current
              if (!id) return
              const d = video.duration
              if (!Number.isFinite(d) || d <= 0) return
              onMeasuredDurationsChange({ ...measuredSegmentDurations, [id]: d })
            }}
          />
          )
        ) : (
          <div className="text-gray-500 text-sm flex flex-col items-center gap-2">
            <Film className="w-12 h-12 opacity-30" />
            <span>No video preview available</span>
          </div>
        )}

        {dissolveJoin && (
          <video
            ref={dissolveVideoRef}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            muted
            playsInline
            style={{ opacity: dissolveJoin.opacity }}
          />
        )}
        {shotJoinVisual && shotJoinVisual.fadeBlack > 0 && (
          <div
            className="absolute inset-0 bg-black pointer-events-none"
            style={{ opacity: shotJoinVisual.fadeBlack }}
          />
        )}
        {sceneEndOverlay?.kind === 'dissolve' && nextSceneFrameUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={nextSceneFrameUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ opacity: sceneEndOverlay.opacity }}
            draggable={false}
          />
        )}
        {sceneEndOverlay?.kind === 'fade' && (
          <div
            className="absolute inset-0 bg-black pointer-events-none"
            style={{ opacity: sceneEndOverlay.opacity }}
          />
        )}
        
        {/* Broadcast Safe Area Guides (90% Action Safe & 80% Title Safe + Center Crosshair) */}
        {showSafeGuides && !fillScreen && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* 90% Action Safe */}
            <div className="absolute inset-[5%] border border-dashed border-cyan-400/45">
              <span className="absolute -top-3.5 left-1 text-[8px] font-mono uppercase tracking-wider text-cyan-300/75 bg-zinc-950/80 px-1 rounded">
                Action Safe 90%
              </span>
            </div>
            {/* 80% Title Safe */}
            <div className="absolute inset-[10%] border border-amber-400/40">
              <span className="absolute -top-3.5 left-1 text-[8px] font-mono uppercase tracking-wider text-amber-300/75 bg-zinc-950/80 px-1 rounded">
                Title Safe 80%
              </span>
            </div>
            {/* Center Crosshair */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-px bg-white/35" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-px bg-white/35" />
          </div>
        )}

        {/* Overlay Info — hidden when the parent stage is the fullscreen view */}
        {!fillScreen && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-20">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="bg-zinc-950/85 backdrop-blur-md border-zinc-700/80 text-zinc-100 text-[11px] font-mono tabular-nums px-2 py-0.5 shadow-sm">
              <Clock className="w-3 h-3 mr-1.5 text-cyan-400" />
              {formatSmpteTimecode(currentTime)} <span className="text-zinc-500 mx-1">/</span> {formatSmpteTimecode(scrubberTotalDuration)}
            </Badge>
            <Badge variant="outline" className="bg-zinc-950/85 backdrop-blur-md border-cyan-500/40 text-cyan-200 text-[11px] font-mono tabular-nums px-2 py-0.5 shadow-sm">
              Seg {activeSegmentIndex + 1}/{segments.length}
            </Badge>
            {currentSegment.segment && getTrimForSegment(currentSegment.segment).isTrimmed && (
              <Badge variant="outline" className="bg-amber-950/80 backdrop-blur-md border-amber-500/40 text-amber-300 text-[10px] uppercase tracking-wider px-2 py-0.5">
                Trimmed
              </Badge>
            )}
            {currentSegment.segment?.shotJoin && currentSegment.segment.shotJoin !== 'cut' && (
              <Badge variant="outline" className="bg-violet-950/80 backdrop-blur-md border-violet-500/40 text-violet-200 text-[10px] uppercase tracking-wider px-2 py-0.5">
                {currentSegment.segment.shotJoin}
              </Badge>
            )}
            {isVideoFrozen && (
              <Badge variant="outline" className="bg-amber-500/20 backdrop-blur-md border-amber-500/50 text-amber-300 text-[11px] animate-pulse">
                <Pause className="w-3 h-3 mr-1" />
                Extended Audio
              </Badge>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            {isLooping && (
              <Badge variant="outline" className="bg-emerald-950/80 backdrop-blur-md border-emerald-500/40 text-emerald-300 text-[10px] uppercase tracking-wider px-2 py-0.5">
                Loop
              </Badge>
            )}
            <Badge variant="outline" className="bg-zinc-950/80 backdrop-blur-md border-zinc-800 text-zinc-400 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5">
              24 FPS • REC.709
            </Badge>
          </div>
        </div>
        )}
        
        {/* Text Overlays - Rendered on top of video */}
        {textOverlays.map((overlay) => {
          // Check if overlay should be visible based on timing
          const isVisible = overlay.timing.duration === -1 
            || (currentTime >= overlay.timing.startTime && currentTime < overlay.timing.startTime + overlay.timing.duration)
          
          if (!isVisible) return null
          
          // Calculate position based on anchor
          const getPositionStyles = () => {
            const { x, y, anchor } = overlay.position
            const base: React.CSSProperties = { position: 'absolute' }
            
            switch (anchor) {
              case 'top-left':
                return { ...base, left: `${x}%`, top: `${y}%` }
              case 'top-center':
                return { ...base, left: `${x}%`, top: `${y}%`, transform: 'translateX(-50%)' }
              case 'center':
                return { ...base, left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }
              case 'bottom-left':
                return { ...base, left: `${x}%`, bottom: `${100 - y}%` }
              case 'bottom-center':
                return { ...base, left: `${x}%`, bottom: `${100 - y}%`, transform: 'translateX(-50%)' }
              case 'bottom-right':
                return { ...base, right: `${100 - x}%`, bottom: `${100 - y}%` }
              default:
                return { ...base, left: `${x}%`, top: `${y}%` }
            }
          }
          
          // Convert hex color to rgba with opacity
          const hexToRgba = (hex: string, opacity: number) => {
            const cleanHex = hex.replace('#', '')
            const r = parseInt(cleanHex.substring(0, 2), 16)
            const g = parseInt(cleanHex.substring(2, 4), 16)
            const b = parseInt(cleanHex.substring(4, 6), 16)
            return `rgba(${r}, ${g}, ${b}, ${opacity})`
          }
          
          // Map font family to CSS variable for next/font/google loaded fonts
          const getFontFamily = (font: string): string => {
            switch (font) {
              case 'Inter':
                return 'var(--font-inter), Inter, system-ui, sans-serif'
              case 'Montserrat':
                return 'var(--font-montserrat), Montserrat, system-ui, sans-serif'
              case 'Roboto':
                return 'Roboto, var(--font-inter), system-ui, sans-serif'
              case 'Georgia':
                return 'var(--font-lora), Georgia, serif'
              case 'monospace':
                return 'var(--font-roboto-mono), "Roboto Mono", ui-monospace, monospace'
              default:
                return 'var(--font-inter), system-ui, sans-serif'
            }
          }
          
          // Calculate proportional font size based on container height
          // Overlays use fontSize as a percentage of video height (like vh units).
          // In fullscreen, the container IS the viewport, so vh works naturally.
          // In normal/theater mode, we compute pixels from the container's actual height.
          const playerHeight = containerWidth * (9 / 16) // 16:9 aspect ratio
          const computedFontSize = isFullscreen 
            ? `${overlay.style.fontSize}vh`
            : `${(overlay.style.fontSize / 100) * playerHeight}px`
          
          return (
            <div
              key={overlay.id}
              style={{
                ...getPositionStyles(),
                fontFamily: getFontFamily(overlay.style.fontFamily),
                fontSize: computedFontSize,
                fontWeight: overlay.style.fontWeight as number,
                color: overlay.style.color,
                backgroundColor: overlay.style.backgroundColor && (overlay.style.backgroundOpacity ?? 0) > 0
                  ? hexToRgba(overlay.style.backgroundColor, overlay.style.backgroundOpacity ?? 0.7)
                  : undefined,
                padding: overlay.style.padding ? `${overlay.style.padding}px` : undefined,
                textShadow: overlay.style.textShadow 
                  ? '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' 
                  : undefined,
                zIndex: 10,
                pointerEvents: 'none',
                borderRadius: overlay.style.padding ? '4px' : undefined,
                // Ensure styles aren't overridden by Tailwind preflight
                lineHeight: 1.2,
                letterSpacing: 'normal',
              }}
              className="transition-opacity duration-300"
            >
              <span style={{ 
                color: 'inherit', 
                fontSize: 'inherit', 
                fontWeight: 'inherit',
                fontFamily: 'inherit',
              }}>
                {overlay.text}
              </span>
              {overlay.subtext && (
                <div style={{ 
                  fontSize: '0.75em', 
                  opacity: 0.9,
                  color: 'inherit',
                  fontFamily: 'inherit',
                }}>
                  {overlay.subtext}
                </div>
              )}
            </div>
          )
        })}
        
        {/* Watermark Preview Overlay */}
        {watermarkConfig?.enabled && watermarkConfig.type && (
          <div
            className="absolute pointer-events-none"
            style={{
              // Calculate position based on anchor and padding
              ...(watermarkConfig.anchor === 'top-left' && { 
                top: `${watermarkConfig.padding ?? 20}px`, 
                left: `${watermarkConfig.padding ?? 20}px` 
              }),
              ...(watermarkConfig.anchor === 'top-center' && { 
                top: `${watermarkConfig.padding ?? 20}px`, 
                left: '50%', 
                transform: 'translateX(-50%)' 
              }),
              ...(watermarkConfig.anchor === 'top-right' && { 
                top: `${watermarkConfig.padding ?? 20}px`, 
                right: `${watermarkConfig.padding ?? 20}px` 
              }),
              ...(watermarkConfig.anchor === 'bottom-left' && { 
                bottom: `${watermarkConfig.padding ?? 20}px`, 
                left: `${watermarkConfig.padding ?? 20}px` 
              }),
              ...(watermarkConfig.anchor === 'bottom-center' && { 
                bottom: `${watermarkConfig.padding ?? 20}px`, 
                left: '50%', 
                transform: 'translateX(-50%)' 
              }),
              ...(watermarkConfig.anchor === 'bottom-right' && { 
                bottom: `${watermarkConfig.padding ?? 20}px`, 
                right: `${watermarkConfig.padding ?? 20}px` 
              }),
              zIndex: 15,
            }}
          >
            {watermarkConfig.type === 'text' && watermarkConfig.text && (
              <span
                style={{
                  fontFamily: watermarkConfig.textStyle?.fontFamily || 'Inter, sans-serif',
                  fontSize: isFullscreen 
                    ? `${watermarkConfig.textStyle?.fontSize ?? 2.5}vh`
                    : `${((watermarkConfig.textStyle?.fontSize ?? 2.5) / 100) * (containerWidth * 9 / 16)}px`,
                  fontWeight: watermarkConfig.textStyle?.fontWeight || 500,
                  color: watermarkConfig.textStyle?.color || '#FFFFFF',
                  opacity: watermarkConfig.textStyle?.opacity ?? 0.6,
                  textShadow: watermarkConfig.textStyle?.textShadow 
                    ? '1px 1px 3px rgba(0,0,0,0.7)' 
                    : undefined,
                  backgroundColor: watermarkConfig.textStyle?.background 
                    ? `${watermarkConfig.textStyle.backgroundColor || '#000000'}${Math.round((watermarkConfig.textStyle.backgroundOpacity ?? 0.5) * 255).toString(16).padStart(2, '0')}`
                    : undefined,
                  padding: watermarkConfig.textStyle?.background ? '4px 8px' : undefined,
                  borderRadius: watermarkConfig.textStyle?.background ? '4px' : undefined,
                }}
              >
                {watermarkConfig.text}
              </span>
            )}
            {watermarkConfig.type === 'image' && watermarkConfig.imageUrl && (
              <img
                src={watermarkConfig.imageUrl}
                alt="Watermark"
                style={{
                  width: `${watermarkConfig.imageStyle?.width ?? 10}%`,
                  height: 'auto',
                  opacity: watermarkConfig.imageStyle?.opacity ?? 0.7,
                  filter: 'drop-shadow(1px 1px 3px rgba(0,0,0,0.5))',
                }}
              />
            )}
          </div>
        )}
        
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
      
      {/* Controls Bar — hidden in parent fullscreen so only the hover play button remains */}
      {!fillScreen && (
      <div className="px-3 py-2.5 bg-zinc-950 border-t border-zinc-800/90 flex items-center gap-2 sm:gap-2.5">
        {/* Skip Prev Shot */}
        <button
          onClick={() => skipToBeat('prev')}
          disabled={activeSegmentIndex === 0}
          title="Previous shot"
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Fine Step Back (-0.25s) */}
        <button
          onClick={() => stepBySeconds(-0.25)}
          disabled={currentTime <= 0}
          title="Step back 6 frames (-0.25s) [←]"
          className="hidden sm:inline-flex p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        
        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause [Space]' : 'Play [Space]'}
          className="p-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold transition-colors shadow-sm"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Fine Step Forward (+0.25s) */}
        <button
          onClick={() => stepBySeconds(0.25)}
          disabled={currentTime >= scrubberTotalDuration}
          title="Step forward 6 frames (+0.25s) [→]"
          className="hidden sm:inline-flex p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        
        {/* Skip Next Shot */}
        <button
          onClick={() => skipToBeat('next')}
          disabled={activeSegmentIndex === segments.length - 1}
          title="Next shot"
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
        
        <span className="text-[11px] text-zinc-300 font-mono tabular-nums min-w-[42px]">
          {formatTime(currentTime)}
        </span>
        
        {/* Progress Bar with Shot Boundary Markers */}
        <div 
          className="flex-1 h-2 bg-zinc-800 rounded-full cursor-pointer relative group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const percent = ((e.clientX - rect.left) / rect.width) * 100
            handleSeek(percent)
          }}
        >
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
          {shotBoundaryPercents.map((mark) => (
            <div
              key={mark.shotNum}
              className="absolute top-0 bottom-0 w-0.5 bg-zinc-950/90 z-10 pointer-events-none"
              style={{ left: `${mark.pct}%` }}
              title={`Shot #${mark.shotNum}`}
            />
          ))}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-cyan-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>
        
        <span className="text-[11px] text-zinc-400 font-mono tabular-nums min-w-[42px] text-right">
          {formatTime(scrubberTotalDuration)}
        </span>

        <div className="h-4 w-px bg-zinc-800 mx-0.5 hidden sm:block" />

        {/* Loop Toggle */}
        <button
          type="button"
          onClick={() => setIsLooping((prev) => !prev)}
          title={isLooping ? 'Disable loop playback [L]' : 'Loop scene playback [L]'}
          className={`p-1.5 rounded-md transition-colors ${
            isLooping
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
        </button>

        {/* Safe Guides Toggle */}
        <button
          type="button"
          onClick={() => setShowSafeGuides((prev) => !prev)}
          title={showSafeGuides ? 'Hide broadcast safe guides [G]' : 'Show broadcast safe guides (Action 90% / Title 80%) [G]'}
          className={`p-1.5 rounded-md transition-colors ${
            showSafeGuides
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
        
        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute monitor [M]' : 'Mute monitor [M]'}
          className={`p-1.5 rounded-md transition-colors ${
            isMuted
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        
        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      )}
      
      {/* Hidden Audio Elements for sync playback */}
      {currentAudioUrls.narration && (
        <audio ref={narrationRef} src={currentAudioUrls.narration} preload="auto" />
      )}
      {(currentAudioUrls.musicClips ?? []).map((clip) => (
        <audio
          key={clip.id}
          ref={el => {
            if (el) musicRefsById.current.set(clip.id, el)
            else musicRefsById.current.delete(clip.id)
          }}
          src={clip.url}
          preload="auto"
        />
      ))}
      {/* Dialogue audio elements - one per clip */}
      {currentAudioUrls.dialogue.map((clip, idx) => {
        if (!clip?.audioUrl) return null
        const clipKey = clip.id ?? `__dialogue_${idx}`
        return (
          <audio
            key={clipKey}
            ref={el => {
              if (el) dialogueRefsById.current.set(clipKey, el)
              else dialogueRefsById.current.delete(clipKey)
            }}
            src={clip.audioUrl}
            preload="auto"
          />
        )
      })}
    </div>
  )
}
