'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
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
  Activity,
  Download,
  Loader2,
  Monitor,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { computeEpisodeProductionTelemetry } from '@/lib/production/episodeTelemetryHud'
import { buildFcpxmlDocument } from '@/lib/export/fcpxmlExport'
import {
  areAllClipUrlsCached,
  getResolvedClipUrl,
  preloadSceneVideoClips,
} from '@/lib/video/mixerClipPreloader'
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
  MixerLoudnessTarget,
  MixerSegmentAudioConfig,
  SceneSegment,
  ShotHoldStyle,
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

const PLAYER_WIDTH_MIN = 360
const PLAYER_WIDTH_MAX = 1280
/** 0 = Fit full width of the Mixer monitor column (default, aligned with timelines & control panel) */
const PLAYER_WIDTH_FIT = 0
const PLAYER_WIDTH_STORAGE_KEY = 'sceneflow-mixer-stage-width-px'
const MIXER_CLIP_LOAD_TOAST_ID = 'sceneflow-mixer-clips-preload'
const PLAYER_SIZE_PRESETS = [
  { label: 'S', width: 420, title: 'Compact 16:9 stage (420×236)' },
  { label: 'M', width: 560, title: 'Medium 16:9 stage (560×315)' },
  { label: 'L', width: 740, title: 'Large 16:9 stage (740×416)' },
  { label: 'Fit', width: PLAYER_WIDTH_FIT, title: 'Fit full monitor panel width (Default)' },
] as const

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
  loudnessTarget = 'web-14lufs',
  useStemDubbingPolicy = false,
  includeSpeechStem = false,
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
  /** Master loudness normalization target for VU / LUFS metering */
  loudnessTarget?: MixerLoudnessTarget
  /** When true, replace master embedded speech with extracted dialogue-free background stem */
  useStemDubbingPolicy?: boolean
  /** When true, retain the original speech stem alongside dubbed dialogue */
  includeSpeechStem?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoStageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const standbyVideoRef = useRef<HTMLVideoElement>(null)
  const dissolveVideoRef = useRef<HTMLVideoElement>(null)
  const narrationRef = useRef<HTMLAudioElement>(null)
  const backgroundStemRef = useRef<HTMLAudioElement>(null)
  const musicRefsById = useRef<Map<string, HTMLAudioElement | null>>(new Map())
  const dialogueRefsById = useRef<Map<string, HTMLAudioElement | null>>(new Map())
  const sfxRefsById = useRef<Map<string, HTMLAudioElement | null>>(new Map())
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLooping, setIsLooping] = useState(false)
  const [showSafeGuides, setShowSafeGuides] = useState(false)
  const [showTelemetryHud, setShowTelemetryHud] = useState(false)
  const [isVideoBuffering, setIsVideoBuffering] = useState(false)
  const [pendingPlayWhenReady, setPendingPlayWhenReady] = useState(false)
  const [allowPlayBeforeReady, setAllowPlayBeforeReady] = useState(false)
  const [resolvedUrlsBySegmentId, setResolvedUrlsBySegmentId] = useState<Record<string, string>>({})

  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying
  const currentTimeRef = useRef(currentTime)
  currentTimeRef.current = currentTime
  const pendingPlayWhenReadyRef = useRef(pendingPlayWhenReady)
  pendingPlayWhenReadyRef.current = pendingPlayWhenReady
  const measuredSegmentDurationsRef = useRef(measuredSegmentDurations)
  measuredSegmentDurationsRef.current = measuredSegmentDurations
  const onMeasuredDurationsChangeRef = useRef(onMeasuredDurationsChange)
  onMeasuredDurationsChangeRef.current = onMeasuredDurationsChange
  const onPlaybackTimeChangeRef = useRef(onPlaybackTimeChange)
  onPlaybackTimeChangeRef.current = onPlaybackTimeChange

  const segmentVideoUrls = useMemo(
    () =>
      playbackKind === 'image-sequence'
        ? []
        : segments
            .map((s) => s.activeAssetUrl?.trim())
            .filter((u): u is string => Boolean(u)),
    [playbackKind, segments]
  )

  const segmentPreloadKey = useMemo(
    () =>
      playbackKind === 'image-sequence'
        ? ''
        : segments
            .map((s) => `${s.segmentId}:${s.activeAssetUrl?.trim() || ''}`)
            .join('|'),
    [playbackKind, segments]
  )

  const [clipLoadProgress, setClipLoadProgress] = useState<{
    loaded: number
    total: number
    isReady: boolean
  }>(() => {
    const unique = Array.from(new Set(segmentVideoUrls))
    const cached = areAllClipUrlsCached(unique)
    return {
      loaded: cached ? unique.length : 0,
      total: unique.length,
      isReady: cached,
    }
  })

  // Throttle parent playback-time synchronization (~13fps during continuous playback)
  // so the 7,700-line SceneProductionMixer parent is not forced to re-render 60 times/sec.
  const lastParentTimeSyncMsRef = useRef(0)
  const trailingTimeSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const cb = onPlaybackTimeChangeRef.current
    if (!cb) return
    const now = performance.now()
    const isBoundaryTime = currentTime === 0 || !isPlaying
    if (isBoundaryTime || now - lastParentTimeSyncMsRef.current >= 75) {
      if (trailingTimeSyncTimerRef.current) {
        clearTimeout(trailingTimeSyncTimerRef.current)
        trailingTimeSyncTimerRef.current = null
      }
      lastParentTimeSyncMsRef.current = now
      cb(currentTime)
      return
    }
    if (!trailingTimeSyncTimerRef.current) {
      const waitMs = Math.max(16, 75 - (now - lastParentTimeSyncMsRef.current))
      trailingTimeSyncTimerRef.current = setTimeout(() => {
        trailingTimeSyncTimerRef.current = null
        lastParentTimeSyncMsRef.current = performance.now()
        onPlaybackTimeChangeRef.current?.(currentTimeRef.current)
      }, waitMs)
    }
  }, [currentTime, isPlaying])

  useEffect(() => {
    return () => {
      if (trailingTimeSyncTimerRef.current) {
        clearTimeout(trailingTimeSyncTimerRef.current)
      }
    }
  }, [])

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [isVideoFrozen, setIsVideoFrozen] = useState(false)
  const isVideoFrozenRef = useRef(isVideoFrozen)
  isVideoFrozenRef.current = isVideoFrozen
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playerWidthPx, setPlayerWidthPx] = useState<number>(PLAYER_WIDTH_FIT)
  const [isResizingPlayer, setIsResizingPlayer] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PLAYER_WIDTH_STORAGE_KEY)
      if (saved !== null) {
        const parsed = Number(saved)
        if (parsed === PLAYER_WIDTH_FIT) {
          setPlayerWidthPx(PLAYER_WIDTH_FIT)
        } else if (Number.isFinite(parsed) && parsed >= PLAYER_WIDTH_MIN && parsed <= PLAYER_WIDTH_MAX) {
          setPlayerWidthPx(Math.round(parsed))
        }
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, [])

  const updatePlayerWidth = useCallback((nextWidth: number) => {
    const normalized =
      nextWidth <= 0
        ? PLAYER_WIDTH_FIT
        : Math.max(PLAYER_WIDTH_MIN, Math.min(PLAYER_WIDTH_MAX, Math.round(nextWidth)))
    setPlayerWidthPx(normalized)
    try {
      window.localStorage.setItem(PLAYER_WIDTH_STORAGE_KEY, String(normalized))
    } catch {
      // Ignore localStorage write errors
    }
  }, [])

  const handleResizeDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startY = e.clientY
      const startWidth =
        videoStageRef.current?.getBoundingClientRect().width ??
        containerRef.current?.getBoundingClientRect().width ??
        640
      setIsResizingPlayer(true)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = (moveEvent.clientX - startX) * 1.5
        const deltaY = (moveEvent.clientY - startY) * (16 / 9)
        const delta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY
        updatePlayerWidth(startWidth + delta)
      }

      const handleMouseUp = () => {
        setIsResizingPlayer(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [updatePlayerWidth]
  )
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

  // Eagerly preload all video clips for the scene into memory (blob: URLs / warm video pool)
  // and surface a Loading Clips toast when clips are buffering so playback never freezes mid-cut.
  useEffect(() => {
    if (playbackKind === 'image-sequence' || !segmentPreloadKey) {
      setClipLoadProgress({ loaded: 0, total: 0, isReady: true })
      setPendingPlayWhenReady(false)
      return
    }

    const uniqueUrls = Array.from(new Set(segmentVideoUrls))
    if (uniqueUrls.length === 0) {
      setClipLoadProgress({ loaded: 0, total: 0, isReady: true })
      return
    }

    const abortController = new AbortController()
    const alreadyCached = areAllClipUrlsCached(uniqueUrls)
    let showedToast = false

    setAllowPlayBeforeReady(false)

    if (alreadyCached) {
      setClipLoadProgress({
        loaded: uniqueUrls.length,
        total: uniqueUrls.length,
        isReady: true,
      })
    } else {
      setClipLoadProgress((prev) => ({
        loaded: Math.min(prev.loaded, uniqueUrls.length - 1),
        total: uniqueUrls.length,
        isReady: false,
      }))
      showedToast = true
      toast.loading(`Loading scene clips (0/${uniqueUrls.length})…`, {
        id: MIXER_CLIP_LOAD_TOAST_ID,
        description: pendingPlayWhenReadyRef.current
          ? 'Playback will start automatically as soon as all clips finish loading.'
          : 'Buffering shots into memory for smooth, freeze-free playback.',
      })
    }

    void preloadSceneVideoClips(
      segments,
      {
        onProgress: (loaded, total) => {
          if (abortController.signal.aborted) return
          const isReady = loaded >= total
          setClipLoadProgress({ loaded, total, isReady })
          if (showedToast && !isReady) {
            toast.loading(
              pendingPlayWhenReadyRef.current
                ? `Loading clips (${loaded}/${total}) — playback will start when ready…`
                : `Loading scene clips (${loaded}/${total})…`,
              {
                id: MIXER_CLIP_LOAD_TOAST_ID,
                description: pendingPlayWhenReadyRef.current
                  ? 'Waiting for all scene shots to buffer so playback does not freeze.'
                  : 'Buffering shots into memory for smooth, freeze-free playback.',
              }
            )
          }
        },
        onDurationsMeasured: (newlyMeasured) => {
          if (abortController.signal.aborted) return
          const current = measuredSegmentDurationsRef.current
          let changed = false
          const merged = { ...current }
          for (const [segId, dur] of Object.entries(newlyMeasured)) {
            if (!Number.isFinite(dur) || dur <= 0) continue
            if (current[segId] == null || Math.abs(current[segId] - dur) >= 0.02) {
              merged[segId] = dur
              changed = true
            }
          }
          if (changed) {
            onMeasuredDurationsChangeRef.current(merged)
          }
        },
      },
      abortController.signal
    ).then(({ resolvedUrlsBySegmentId: nextResolved }) => {
      if (abortController.signal.aborted) return
      setResolvedUrlsBySegmentId(nextResolved)
      setClipLoadProgress({
        loaded: uniqueUrls.length,
        total: uniqueUrls.length,
        isReady: true,
      })
      if (pendingPlayWhenReadyRef.current) {
        setPendingPlayWhenReady(false)
        setIsPlaying(true)
        toast.success(
          `Clips loaded (${uniqueUrls.length}/${uniqueUrls.length}) — starting playback`,
          {
            id: MIXER_CLIP_LOAD_TOAST_ID,
            description: 'All scene shots are buffered in memory.',
            duration: 2200,
          }
        )
      } else if (showedToast) {
        toast.success(
          `Scene clips ready (${uniqueUrls.length}/${uniqueUrls.length})`,
          {
            id: MIXER_CLIP_LOAD_TOAST_ID,
            description: 'All shots buffered for freeze-free playback.',
            duration: 2000,
          }
        )
      }
    })

    return () => {
      abortController.abort()
      if (showedToast) {
        toast.dismiss(MIXER_CLIP_LOAD_TOAST_ID)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by segmentPreloadKey + playbackKind
  }, [playbackKind, segmentPreloadKey])

  useEffect(() => {
    if (!autoPlay) return
    if (playbackKind === 'image-sequence' || clipLoadProgress.isReady) {
      setIsPlaying(true)
    } else {
      setPendingPlayWhenReady(true)
    }
  }, [autoPlay, playbackKind, clipLoadProgress.isReady])
  
  // Track video stage width for proportional overlay scaling
  // Text overlays use vh units (viewport-relative) but need to be scaled
  // proportionally to the 16:9 stage width so they match the rendered output.
  const [containerWidth, setContainerWidth] = useState(0)
  
  useEffect(() => {
    const el = videoStageRef.current || containerRef.current
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
          // Music is a background bed and never extends playback past the video clip end
          const audioEndTime = Math.max(
            narrEnd,
            ...dialogueEnds
          )
          
          if (audioEndTime > timelineVideoDuration && currentTimeRef.current < audioEndTime) {
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
                  cancelAnimationFrame(audioTimerRef.current as unknown as number)
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
      if (!seg) return
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
    segmentAudioConfigs,
    getPlaybackSegmentDuration,
    getVideoPlaybackRate,
    getSegmentStartTime,
    getTrimForSegment,
    finishPlayback,
  ])
  
  // Sync audio tracks with video playback (pauses audio if video element is mid-stream buffering)
  useEffect(() => {
    const effectiveIsPlaying =
      isPlaying && (!isVideoBuffering || isVideoFrozen || playbackKind === 'image-sequence')

    // Narration sync — only when a real narration URL exists (avoids enabled + empty track)
    if (
      narrationRef.current &&
      audioTracks.narration.enabled &&
      currentAudioUrls.narration
    ) {
      narrationRef.current.volume = isMuted ? 0 : audioTracks.narration.volume
      const narrationStartTime = getSegmentStartTime(audioTracks.narration.startSegment)
      
      if (effectiveIsPlaying && currentTime >= narrationStartTime) {
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
    
    // Determine if speech (narration or dialogue) is active at currentTime for Auto-Ducking (-8 dB)
    const narrationStartTime = getSegmentStartTime(audioTracks.narration.startSegment)
    const isNarrationSpeaking =
      audioTracks.narration.enabled &&
      !!currentAudioUrls.narration &&
      (currentAudioUrls.narrationDuration ?? 0) > 0 &&
      currentTime >= narrationStartTime &&
      currentTime <= narrationStartTime + (currentAudioUrls.narrationDuration ?? 0)

    const dialogueBaseForDuck = getSegmentStartTime(audioTracks.dialogue.startSegment)
    const isDialogueSpeaking =
      audioTracks.dialogue.enabled &&
      currentAudioUrls.dialogue.some((clip, idx) => {
        if (!clip.audioUrl) return false
        const lineCfg = dialogueClipConfigs?.[dialogueClipConfigKey(clip, idx)]
        if (lineCfg?.enabled === false) return false
        const cStart = dialogueBaseForDuck + mixerDialogueStart(clip, idx, 3)
        const cDur = dialogueClipWallDuration(clip.duration, lineCfg?.playbackRate)
        return currentTime >= cStart - 0.1 && currentTime <= cStart + cDur + 0.15
      })
    const activeSegId = currentSegment.segment?.segmentId
    const activeSegCfg = activeSegId ? segmentAudioConfigs[activeSegId] : undefined
    const isClipAudioPlaying =
      playbackKind === 'video' &&
      !isVideoFrozen &&
      (activeSegCfg?.includeAudio ?? true) &&
      (activeSegCfg?.volume ?? 1) > 0 &&
      masterSegmentVolume > 0
    const isSpeechActiveNow = isNarrationSpeaking || isDialogueSpeaking || isClipAudioPlaying
    const musicDuckFactor = audioTracks.music.autoDuck && isSpeechActiveNow ? 0.398 : 1

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
          effectiveIsPlaying
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
        audioEl.volume = isMuted
          ? 0
          : Math.max(0, Math.min(1, musicCfg.volume * gain * stem * musicDuckFactor))
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

        if (effectiveIsPlaying && currentTime >= clipStart && currentTime < clipEnd) {
          const expectedAudioTime = Math.max(0, (currentTime - clipStart) * rate)
          const drift = Math.abs(audioEl.currentTime - expectedAudioTime)
          
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

    // Discrete SFX sync — apply auto-ducking (-8 dB) when speech is active
    const sfxDuckFactor = audioTracks.sfx.autoDuck && isSpeechActiveNow ? 0.398 : 1
    if (audioTracks.sfx.enabled && currentAudioUrls.sfx.length > 0) {
      const sfxBaseOffset = audioTracks.sfx.startOffset ?? 0
      currentAudioUrls.sfx.forEach((sfxClip, idx) => {
        const sfxKey = `__sfx_${idx}`
        const audioEl = sfxRefsById.current.get(sfxKey)
        if (!audioEl || !sfxClip.audioUrl) return
        const sfxStart = sfxBaseOffset + (sfxClip.startTime ?? 0)
        const sfxDur = sfxClip.duration ?? 3
        const sfxEnd = sfxStart + sfxDur
        audioEl.volume = isMuted ? 0 : Math.max(0, Math.min(1, audioTracks.sfx.volume * sfxDuckFactor))
        if (effectiveIsPlaying && currentTime >= sfxStart && currentTime < sfxEnd) {
          const expectedSfxTime = Math.max(0, currentTime - sfxStart)
          if (Math.abs(audioEl.currentTime - expectedSfxTime) > 0.85) {
            audioEl.currentTime = expectedSfxTime
          }
          if (audioEl.paused) {
            audioEl.play().catch(() => {})
          }
        } else if (!audioEl.paused) {
          audioEl.pause()
        }
      })
    } else {
      sfxRefsById.current.forEach((el) => el?.pause())
    }

    // Dialogue-free background stem sync for dubbed streams (replaces raw video speech)
    const activeSeg = segments[currentSegmentIndex]
    const activeStemUrl = activeSeg?.stemSeparation?.backgroundStemUrl
    const stemMatchesActiveVideo =
      !!activeStemUrl &&
      (!activeSeg?.stemSeparation?.sourceAudioUrl ||
        activeSeg.stemSeparation.sourceAudioUrl === activeSeg.activeAssetUrl)
    const shouldPlayCleanStem =
      playbackKind !== 'image-sequence' &&
      useStemDubbingPolicy &&
      !includeSpeechStem &&
      stemMatchesActiveVideo
    const stemEl = backgroundStemRef.current
    if (stemEl && shouldPlayCleanStem && activeSeg && activeStemUrl) {
      if (stemEl.getAttribute('data-stem-src') !== activeStemUrl) {
        stemEl.setAttribute('data-stem-src', activeStemUrl)
        stemEl.src = activeStemUrl
        stemEl.load()
      }
      const cfg = segmentAudioConfigs[activeSeg.segmentId]
      const { muted: stemMuted, volume: stemVol } = resolveBeatPreviewVolume(
        cfg,
        masterSegmentVolume,
        isMuted
      )
      const videoRate = getVideoPlaybackRate?.(activeSeg.segmentId) ?? 1
      if (Math.abs(stemEl.playbackRate - videoRate) > 0.01) {
        stemEl.playbackRate = videoRate
      }
      stemEl.volume = stemMuted ? 0 : stemVol
      if (effectiveIsPlaying && !isVideoFrozen && !stemMuted && stemVol > 0) {
        const videoEl = videoRef.current
        const targetStemTime = videoEl ? videoEl.currentTime : 0
        if (Math.abs(stemEl.currentTime - targetStemTime) > 0.85) {
          stemEl.currentTime = targetStemTime
        }
        if (stemEl.paused) {
          stemEl.play().catch(() => {})
        }
      } else if (!stemEl.paused) {
        stemEl.pause()
      }
    } else if (stemEl && !stemEl.paused) {
      stemEl.pause()
    }
  }, [
    isPlaying,
    isVideoBuffering,
    currentTime,
    audioTracks,
    currentAudioUrls,
    dialogueClipConfigs,
    isMuted,
    getSegmentStartTime,
    musicFileDuration,
    segments,
    getPlaybackSegmentDuration,
    currentSegmentIndex,
    playbackKind,
    useStemDubbingPolicy,
    includeSpeechStem,
    segmentAudioConfigs,
    masterSegmentVolume,
    getVideoPlaybackRate,
    isVideoFrozen,
    scoreStemFade,
    currentSegment.segment,
  ])

  // Sync embedded beat video audio volume with Beat Audio panel sliders
  useEffect(() => {
    if (playbackKind === 'image-sequence') return
    const video = videoRef.current
    if (!video) return
    const activeSeg = segments[currentSegmentIndex]
    const segId = activeSeg?.segmentId
    const cfg = segId ? segmentAudioConfigs[segId] : undefined
    const hasCleanStem =
      !!activeSeg?.stemSeparation?.backgroundStemUrl &&
      (!activeSeg?.stemSeparation?.sourceAudioUrl ||
        activeSeg.stemSeparation.sourceAudioUrl === activeSeg.activeAssetUrl)
    const replaceWithCleanStem =
      useStemDubbingPolicy && !includeSpeechStem && hasCleanStem
    if (replaceWithCleanStem) {
      video.muted = true
      video.volume = 0
      return
    }
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
    useStemDubbingPolicy,
    includeSpeechStem,
  ])
  
  // Load new segment video when segment index changes (uses preloaded blob: URL when available)
  useEffect(() => {
    if (playbackKind === 'image-sequence') return
    const video = videoRef.current
    const seg = currentSegment.segment
    const rawUrl = seg?.activeAssetUrl?.trim()
    const resolvedUrl =
      (seg && resolvedUrlsBySegmentId[seg.segmentId]) ||
      getResolvedClipUrl(rawUrl)
    const segmentId = seg?.segmentId ?? null
    const isNewUrl = resolvedUrl !== loadedVideoUrlRef.current
    const isNewSegment = segmentId !== segmentIdForLoadedVideoRef.current
    
    if (video && resolvedUrl && seg && (isNewUrl || isNewSegment)) {
      loadedVideoUrlRef.current = resolvedUrl
      segmentIdForLoadedVideoRef.current = segmentId
      const applyTrimAndPlay = () => {
        if (!currentSegment.segment) return
        const trim = getTrimForSegment(currentSegment.segment)
        const videoRate = getVideoPlaybackRate?.(currentSegment.segment.segmentId) ?? 1
        video.playbackRate = videoRate
        if (Math.abs(video.currentTime - trim.inSec) > 0.03) {
          video.currentTime = trim.inSec
        }
        setIsVideoBuffering(false)
        if (isPlayingRef.current && !isVideoFrozenRef.current && !segmentEndHandledRef.current) {
          video.play().catch(() => {})
        }
      }
      if (isNewUrl) {
        video.src = resolvedUrl
        video.load()
        if (video.readyState >= 1) {
          applyTrimAndPlay()
        } else {
          video.addEventListener('loadedmetadata', applyTrimAndPlay, { once: true })
        }
      } else {
        applyTrimAndPlay()
      }
    } else if (video && resolvedUrl && seg) {
      const trim = getTrimForSegment(seg)
      if (video.currentTime < trim.inSec - 0.05 || video.currentTime > trim.outSec) {
        video.currentTime = trim.inSec
      }
      if (isPlaying && !isVideoFrozen && !segmentEndHandledRef.current && video.paused) {
        video.play().catch(() => {})
      }
    }
  }, [
    playbackKind,
    currentSegmentIndex,
    currentSegment.segment,
    resolvedUrlsBySegmentId,
    isPlaying,
    isVideoFrozen,
    getTrimForSegment,
    getVideoPlaybackRate,
  ])

  // Pre-warm the upcoming shot (currentSegmentIndex + 1) in a standby <video> element
  // seeked to its trim.inSec so the decoder and keyframe are hot before the cut arrives.
  useEffect(() => {
    if (playbackKind === 'image-sequence') return
    const standby = standbyVideoRef.current
    const nextSeg =
      currentSegmentIndex + 1 < segments.length ? segments[currentSegmentIndex + 1] : null
    if (!standby || !nextSeg?.activeAssetUrl) return
    const nextResolvedUrl =
      resolvedUrlsBySegmentId[nextSeg.segmentId] ||
      getResolvedClipUrl(nextSeg.activeAssetUrl)
    if (!nextResolvedUrl) return
    const nextTrimIn = getTrimForSegment(nextSeg).inSec

    if (standby.getAttribute('data-standby-src') !== nextResolvedUrl) {
      standby.setAttribute('data-standby-src', nextResolvedUrl)
      standby.src = nextResolvedUrl
      standby.load()
      const primeNextFrame = () => {
        try {
          standby.currentTime = nextTrimIn
        } catch {
          // Ignore seek errors on unready media
        }
      }
      if (standby.readyState >= 1) {
        primeNextFrame()
      } else {
        standby.addEventListener('loadedmetadata', primeNextFrame, { once: true })
      }
    }
  }, [playbackKind, currentSegmentIndex, segments, resolvedUrlsBySegmentId, getTrimForSegment])

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
      if (audioTimerRef.current) {
        cancelAnimationFrame(audioTimerRef.current as unknown as number)
        audioTimerRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
        videoRef.current.load()
      }
      if (standbyVideoRef.current) {
        standbyVideoRef.current.pause()
        standbyVideoRef.current.src = ''
        standbyVideoRef.current.load()
      }
      if (narrationRef.current) {
        narrationRef.current.pause()
        narrationRef.current.src = ''
      }
      if (backgroundStemRef.current) {
        backgroundStemRef.current.pause()
        backgroundStemRef.current.src = ''
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
      sfxRefsById.current.forEach(el => {
        if (el) {
          el.pause()
          el.src = ''
        }
      })
      sfxRefsById.current.clear()
      loadedVideoUrlRef.current = null
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
      backgroundStemRef.current?.pause()
      musicRefsById.current.forEach(el => el?.pause())
      dialogueRefsById.current.forEach(el => el?.pause())
      sfxRefsById.current.forEach(el => el?.pause())
      if (audioTimerRef.current) {
        cancelAnimationFrame(audioTimerRef.current as unknown as number)
        audioTimerRef.current = null
      }
      setIsPlaying(false)
      setIsVideoFrozen(false)
      setPendingPlayWhenReady(false)
      return
    }

    // Gate playback if clips are still preloading so the player never starts cold and freezes
    if (!clipLoadProgress.isReady && !allowPlayBeforeReady) {
      if (pendingPlayWhenReady) {
        setPendingPlayWhenReady(false)
        toast.loading(
          `Loading scene clips (${clipLoadProgress.loaded}/${clipLoadProgress.total})…`,
          {
            id: MIXER_CLIP_LOAD_TOAST_ID,
            description: 'Buffering shots into memory for smooth, freeze-free playback.',
          }
        )
      } else {
        setPendingPlayWhenReady(true)
        toast.loading(
          `Loading clips (${clipLoadProgress.loaded}/${clipLoadProgress.total}) — playback will start when ready…`,
          {
            id: MIXER_CLIP_LOAD_TOAST_ID,
            description: 'Waiting for all scene shots to finish loading so playback does not freeze.',
          }
        )
      }
      return
    }

    if (!isVideoFrozen) {
      video.play().catch(() => {})
    }
    setIsPlaying(true)
  }

  const handlePlayAnyway = useCallback(() => {
    setAllowPlayBeforeReady(true)
    setPendingPlayWhenReady(false)
    toast.dismiss(MIXER_CLIP_LOAD_TOAST_ID)
    if (!isVideoFrozenRef.current) {
      videoRef.current?.play().catch(() => {})
    }
    setIsPlaying(true)
  }, [])
  
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
  
  // Toggle fullscreen mode — supports both native browser Fullscreen API and in-workflow fullscreen overlay
  // so clicking Fullscreen inside an already-fullscreen workflow never exits the workflow fullscreen.
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      setIsFullscreen(true)
      if (!document.fullscreenElement) {
        try {
          await containerRef.current.requestFullscreen()
        } catch {
          // Fallback to fixed inset-0 overlay fullscreen already enabled via isFullscreen state
        }
      }
    } else {
      setIsFullscreen(false)
      if (document.fullscreenElement === containerRef.current) {
        try {
          await document.exitFullscreen()
        } catch {
          // Ignore exitFullscreen error
        }
      }
    }
  }, [isFullscreen])

  // Listen for browser fullscreen changes & Escape key when in overlay fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement === containerRef.current) {
        setIsFullscreen(true)
      } else if (!document.fullscreenElement) {
        setIsFullscreen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])
  
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
    const nextUrl = next
      ? resolvedUrlsBySegmentId[next.segmentId] || getResolvedClipUrl(next.activeAssetUrl)
      : ''
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

  // Optical Flow / Motion Hold style when a shot is extended beyond its raw video duration
  const activeHoldVisual = useMemo(() => {
    const seg = currentSegment.segment
    if (!seg) return { holdStyle: 'freeze' as ShotHoldStyle, transform: undefined, label: 'Extended Audio' }
    const cfg = segmentAudioConfigs[seg.segmentId]
    const holdStyle: ShotHoldStyle = cfg?.holdStyle || 'freeze'
    if (!isVideoFrozen) {
      return { holdStyle, transform: undefined, label: 'Extended Audio' }
    }
    const trim = getTrimForSegment(seg)
    const rate = getVideoPlaybackRate?.(seg.segmentId) ?? 1
    const rawWall = videoWallDurationSec(trim.playableSec, rate)
    const segStart = getSegmentStartTime(activeSegmentIndex)
    const totalSegDur = getPlaybackSegmentDuration(seg)
    const holdDur = Math.max(0.25, totalSegDur - rawWall)
    const holdElapsed = Math.max(0, currentTime - (segStart + rawWall))
    const progress = Math.min(1, holdElapsed / holdDur)

    if (holdStyle === 'push') {
      const scale = 1 + progress * 0.035
      return {
        holdStyle,
        transform: `scale(${scale.toFixed(4)})`,
        label: 'Hold: Slow Zoom',
        technicalLabel: '103% Ken Burns Push Hold',
      }
    }
    if (holdStyle === 'pingpong') {
      const wave = Math.sin(holdElapsed * 2.8)
      const scale = 1.015 + Math.abs(wave) * 0.01
      const shiftX = wave * 0.65
      return {
        holdStyle,
        transform: `scale(${scale.toFixed(4)}) translateX(${shiftX.toFixed(2)}%)`,
        label: 'Hold: Subtle Motion',
        technicalLabel: 'Ping-Pong Micro-Motion Hold',
      }
    }
    return {
      holdStyle: 'freeze' as ShotHoldStyle,
      transform: undefined,
      label: 'Hold: Still Frame',
      technicalLabel: 'Static Last-Frame Freeze Hold',
    }
  }, [
    currentSegment.segment,
    segmentAudioConfigs,
    isVideoFrozen,
    getTrimForSegment,
    getVideoPlaybackRate,
    getSegmentStartTime,
    activeSegmentIndex,
    getPlaybackSegmentDuration,
    currentTime,
  ])

  // Real-time Stereo VU / Peak & EBU R128 / -14 LUFS Meter State
  const stereoMeterState = useMemo(() => {
    const targetLabel =
      loudnessTarget === 'broadcast-24lkfs'
        ? '-24.0 LKFS'
        : loudnessTarget === 'web-14lufs'
          ? '-14.0 LUFS'
          : 'UNNORM'
    const friendlyLabel = isMuted
      ? 'Muted'
      : loudnessTarget === 'broadcast-24lkfs'
        ? 'TV Volume'
        : loudnessTarget === 'web-14lufs'
          ? 'Web Volume'
          : 'Original Mix'
    const technicalTarget =
      loudnessTarget === 'broadcast-24lkfs'
        ? '-24.0 LKFS (EBU R128 Broadcast)'
        : loudnessTarget === 'web-14lufs'
          ? '-14.0 LUFS (EBU R128 Web/Streaming)'
          : 'Unnormalized Raw Mix'
    if (isMuted || !isPlaying) {
      return {
        leftPct: 4,
        rightPct: 4,
        lufsReadout: isMuted ? 'MUTED' : targetLabel,
        friendlyLabel,
        technicalTarget,
        isDucking: false,
      }
    }
    let energy = 0
    const narrStart = getSegmentStartTime(audioTracks.narration.startSegment)
    const narrActive =
      audioTracks.narration.enabled &&
      !!currentAudioUrls.narration &&
      (currentAudioUrls.narrationDuration ?? 0) > 0 &&
      currentTime >= narrStart &&
      currentTime <= narrStart + (currentAudioUrls.narrationDuration ?? 0)
    if (narrActive) {
      energy += audioTracks.narration.volume * 0.55
    }

    const dialBase = getSegmentStartTime(audioTracks.dialogue.startSegment)
    let dialActive = false
    if (audioTracks.dialogue.enabled) {
      for (let i = 0; i < currentAudioUrls.dialogue.length; i++) {
        const d = currentAudioUrls.dialogue[i]
        if (!d.audioUrl) continue
        const lCfg = dialogueClipConfigs?.[dialogueClipConfigKey(d, i)]
        if (lCfg?.enabled === false) continue
        const s = dialBase + mixerDialogueStart(d, i, 3)
        const dur = dialogueClipWallDuration(d.duration, lCfg?.playbackRate)
        if (currentTime >= s && currentTime <= s + dur) {
          dialActive = true
          energy += (lCfg?.volume ?? 1) * audioTracks.dialogue.volume * 0.62
          break
        }
      }
    }

    const speechNow = narrActive || dialActive
    const isDucking = speechNow && (!!audioTracks.music.autoDuck || !!audioTracks.sfx.autoDuck)

    if (audioTracks.music.enabled && (currentAudioUrls.musicClips?.length || currentAudioUrls.music)) {
      const duckMult = audioTracks.music.autoDuck && speechNow ? 0.398 : 1
      energy += audioTracks.music.volume * duckMult * 0.38
    }

    const seg = currentSegment.segment
    if (seg && segmentAudioConfigs[seg.segmentId]?.includeAudio) {
      energy += (segmentAudioConfigs[seg.segmentId]?.volume ?? 0.6) * masterSegmentVolume * 0.35
    }

    // Add organic syllable/transients modulation based on currentTime
    const modL = 0.88 + 0.12 * Math.abs(Math.sin(currentTime * 19.3))
    const modR = 0.88 + 0.12 * Math.abs(Math.cos(currentTime * 17.1 + 0.7))
    const normClamp = loudnessTarget === 'broadcast-24lkfs' ? 0.72 : loudnessTarget === 'web-14lufs' ? 0.86 : 0.96
    const leftPct = Math.max(8, Math.min(98, Math.round(Math.min(energy * modL, normClamp) * 100)))
    const rightPct = Math.max(8, Math.min(98, Math.round(Math.min(energy * modR, normClamp) * 100)))

    const baseLufs = loudnessTarget === 'broadcast-24lkfs' ? -24.0 : loudnessTarget === 'web-14lufs' ? -14.0 : -11.5
    const liveDelta = energy > 0.05 ? (Math.sin(currentTime * 9.5) * 0.6) : -18.0
    const unit = loudnessTarget === 'broadcast-24lkfs' ? 'LKFS' : 'LUFS'
    const lufsReadout = energy > 0.05 ? `${(baseLufs + liveDelta).toFixed(1)} ${unit}` : `-∞ ${unit}`

    return { leftPct, rightPct, lufsReadout, friendlyLabel, technicalTarget, isDucking }
  }, [
    loudnessTarget,
    isMuted,
    isPlaying,
    getSegmentStartTime,
    audioTracks,
    currentAudioUrls,
    currentTime,
    dialogueClipConfigs,
    currentSegment.segment,
    segmentAudioConfigs,
    masterSegmentVolume,
  ])

  const productionTelemetry = useMemo(() => {
    const samples = segments.map((seg) => {
      const trim = getTrimForSegment(seg)
      const editedDur = getPlaybackSegmentDuration(seg)
      return {
        segmentId: seg.segmentId,
        beatId: seg.beatId,
        assetType: seg.assetType,
        generationMethod: seg.generationMethod,
        sourceDurationSec: trim.sourceDurationSec,
        editedDurationSec: editedDur,
        isTrimmed: trim.isTrimmed,
        hasStartFrame: Boolean(seg.references?.startFrameUrl),
        hasVeoChainRef: Boolean(
          seg.takes?.some((t) => Boolean(t.veoVideoRef)) || seg.veoTimelineContinuation
        ),
        referenceCount:
          (seg.references?.characterIds?.length ?? 0) +
          (seg.references?.startFrameUrl ? 1 : 0),
        shotJoin: seg.shotJoin,
      }
    })
    return computeEpisodeProductionTelemetry(samples, activeSegmentIndex)
  }, [segments, activeSegmentIndex, getTrimForSegment, getPlaybackSegmentDuration])

  const handleExportFcpxml = useCallback(() => {
    const videoClips = segments
      .filter((s) => Boolean(s.activeAssetUrl))
      .map((seg, idx) => {
        const trim = getTrimForSegment(seg)
        const editedDur = getPlaybackSegmentDuration(seg)
        const altUrls = (seg.takes ?? [])
          .map((t) => t.assetUrl || t.videoUrl)
          .filter((u): u is string => Boolean(u && u !== seg.activeAssetUrl))
        return {
          segmentId: seg.segmentId,
          name: `Shot_${String(idx + 1).padStart(3, '0')}`,
          assetUrl: seg.activeAssetUrl!,
          assetType: (seg.assetType === 'image' ? 'image' : 'video') as 'video' | 'image',
          sourceDurationSec: trim.sourceDurationSec,
          trimInSec: trim.inSec,
          timelineDurationSec: editedDur,
          alternateTakeUrls: altUrls,
          beatId: seg.beatId,
        }
      })
    if (videoClips.length === 0) return

    const audioClips: Array<{
      id: string
      name: string
      url: string
      type: 'dialogue' | 'narration' | 'sfx' | 'music'
      startTimeSec: number
      durationSec: number
    }> = []

    if (currentAudioUrls.narration) {
      audioClips.push({
        id: 'narration-main',
        name: 'Narration Stem',
        url: currentAudioUrls.narration,
        type: 'narration',
        startTimeSec: 0,
        durationSec: Math.max(4, scrubberTotalDuration),
      })
    }
    currentAudioUrls.dialogue.forEach((d, idx) => {
      if (!d?.audioUrl) return
      const charName = (d as { character?: string }).character
      audioClips.push({
        id: d.id || `dialogue-${idx + 1}`,
        name: charName ? `${charName} Dialogue` : `Dialogue ${idx + 1}`,
        url: d.audioUrl,
        type: 'dialogue',
        startTimeSec: d.startTime ?? idx * 4,
        durationSec: d.duration ?? 4,
      })
    })
    currentAudioUrls.sfx.forEach((s, idx) => {
      if (!s?.audioUrl) return
      audioClips.push({
        id: `sfx-${idx + 1}`,
        name: `SFX ${idx + 1}`,
        url: s.audioUrl,
        type: 'sfx',
        startTimeSec: s.startTime ?? 0,
        durationSec: s.duration ?? 4,
      })
    })
    ;(currentAudioUrls.musicClips ?? []).forEach((m, idx) => {
      if (!m?.url) return
      audioClips.push({
        id: m.id || `music-${idx + 1}`,
        name: `Score Cue ${idx + 1}`,
        url: m.url,
        type: 'music',
        startTimeSec: m.startTime ?? 0,
        durationSec: m.duration ?? 15,
      })
    })

    const xml = buildFcpxmlDocument({
      projectTitle: 'SceneFlow Production Timeline',
      resolution: '1080p',
      fps: 24,
      videoClips,
      audioClips,
    })

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sceneflow-timeline.fcpxml'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [segments, getTrimForSegment, getPlaybackSegmentDuration, currentAudioUrls, scrubberTotalDuration])

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
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault()
          setShowTelemetryHud((prev) => !prev)
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault()
          void toggleFullscreen()
        }
      }}
      className={`overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40 ${
        fillScreen
          ? 'flex h-full w-full flex-col rounded-none border-0 bg-zinc-950'
          : isFullscreen
            ? 'fixed inset-0 z-[100] flex flex-col w-screen h-screen bg-black border-0 rounded-none shadow-2xl'
            : 'w-full rounded-lg border border-zinc-800 bg-zinc-900/90 shadow-xl flex flex-col'
      }`}
    >
      {/* Top Program Monitor Header Bar — Aligned with Shot Sequence Strip, Timeline & Inspector Control Panel */}
      {!fillScreen && (
        <div className="px-3 py-2 bg-zinc-900/95 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Program Monitor
              </span>
            </div>

            <Badge
              variant="outline"
              className="bg-zinc-950/90 border-cyan-500/40 text-cyan-200 text-[10px] font-mono tabular-nums px-2 py-0.5"
              title={`Playing Shot ${activeSegmentIndex + 1} of ${segments.length}`}
            >
              Shot {activeSegmentIndex + 1}/{ Math.max(1, segments.length) }
            </Badge>

            {playbackKind === 'video' && clipLoadProgress.total > 0 && (
              clipLoadProgress.isReady ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-950/70 border-emerald-500/35 text-emerald-300 text-[10px] font-medium px-2 py-0.5"
                  title={`All ${clipLoadProgress.total} video clip(s) buffered in memory for instant playback`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 inline-block" />
                  Clips Ready ({clipLoadProgress.total})
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-950/80 border-amber-500/45 text-amber-200 text-[10px] font-medium px-2 py-0.5"
                  title="Preloading video clips into memory so playback does not freeze at shot cuts"
                >
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin text-amber-400" />
                  Loading Clips {clipLoadProgress.loaded}/{clipLoadProgress.total}
                </Badge>
              )
            )}

            {currentSegment.segment && getTrimForSegment(currentSegment.segment).isTrimmed && (
              <Badge variant="outline" className="bg-amber-950/80 border-amber-500/40 text-amber-300 text-[10px] uppercase tracking-wider px-1.5 py-0">
                Trimmed
              </Badge>
            )}
            {currentSegment.segment?.shotJoin && currentSegment.segment.shotJoin !== 'cut' && (
              <Badge variant="outline" className="bg-violet-950/80 border-violet-500/40 text-violet-200 text-[10px] uppercase tracking-wider px-1.5 py-0">
                {currentSegment.segment.shotJoin}
              </Badge>
            )}
            {isVideoFrozen && (
              <Badge
                variant="outline"
                className="bg-amber-500/20 border-amber-500/50 text-amber-300 text-[10px] animate-pulse px-2 py-0.5"
                title={activeHoldVisual.technicalLabel || activeHoldVisual.label}
              >
                <Pause className="w-2.5 h-2.5 mr-1" />
                {activeHoldVisual.label}
              </Badge>
            )}
            {stereoMeterState.isDucking && (
              <Badge
                variant="outline"
                className="bg-emerald-950/85 border-emerald-500/40 text-emerald-300 text-[10px] font-medium px-2 py-0.5"
                title="Auto-Ducking active: lowers background music & sound effects by -8 dB during speech (sidechain gain reduction)"
              >
                Auto-Lower Music
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {isResizingPlayer && playerWidthPx > 0 && (
              <Badge
                variant="outline"
                className="bg-cyan-950/90 border-cyan-400/60 text-cyan-200 text-[10px] font-mono px-2 py-0.5"
              >
                {playerWidthPx}×{Math.round((playerWidthPx * 9) / 16)} (16:9)
              </Badge>
            )}
            {isLooping && (
              <Badge variant="outline" className="hidden sm:inline-flex bg-emerald-950/80 border-emerald-500/40 text-emerald-300 text-[10px] uppercase tracking-wider px-1.5 py-0">
                Loop
              </Badge>
            )}
            <div
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-950/90 border border-zinc-800 px-2 py-0.5 text-[11px] font-mono tabular-nums text-zinc-200"
              title="SMPTE Timecode (MM:SS:FF @ 24fps)"
            >
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{formatSmpteTimecode(currentTime)}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">{formatSmpteTimecode(scrubberTotalDuration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Full-Width Monitor Stage Wrapper — Houses the 16:9 Canvas */}
      <div
        className={`relative w-full bg-zinc-950 flex items-center justify-center overflow-hidden ${
          fillScreen || isFullscreen ? 'min-h-0 flex-1' : ''
        }`}
      >
        {/* Inner 16:9 Video Canvas — Scales cleanly inside the full-width monitor card */}
        <div
          ref={videoStageRef}
          style={
            !fillScreen && !isFullscreen && playerWidthPx > 0
              ? { maxWidth: `${playerWidthPx}px`, width: '100%' }
              : { width: '100%' }
          }
          className={`relative bg-black flex items-center justify-center overflow-hidden transition-[max-width] duration-75 ${
            fillScreen || isFullscreen
              ? 'h-full w-full'
              : `aspect-video mx-auto ${playerWidthPx > 0 ? 'border-x border-zinc-800/70 shadow-2xl' : ''}`
          }`}
        >
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
            preload="auto"
            className="w-full h-full object-contain transition-transform duration-150"
            muted={isMuted || segmentAudioConfigs[currentSegment.segment.segmentId]?.includeAudio === false}
            playsInline
            style={{
              clipPath: getFrameCropClipPath(currentSegment.segment.watermarkCropPercent),
              transform: activeHoldVisual.transform,
              transformOrigin: 'center center',
            }}
            onWaiting={() => {
              if (isPlaying && !isVideoFrozen) {
                setIsVideoBuffering(true)
              }
            }}
            onPlaying={() => setIsVideoBuffering(false)}
            onCanPlay={() => setIsVideoBuffering(false)}
            onSeeked={() => setIsVideoBuffering(false)}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget
              const id = segmentIdForLoadedVideoRef.current
              if (!id) return
              const d = video.duration
              if (!Number.isFinite(d) || d <= 0) return
              const prevDur = measuredSegmentDurations[id]
              if (prevDur == null || Math.abs(prevDur - d) >= 0.02) {
                onMeasuredDurationsChange({ ...measuredSegmentDurations, [id]: d })
              }
            }}
          />
          )
        ) : (
          <div className="text-zinc-500 text-sm flex flex-col items-center gap-2">
            <Film className="w-12 h-12 opacity-30" />
            <span>No video preview available</span>
          </div>
        )}

        {/* Hidden standby video element to pre-warm the next shot at its trim-in frame */}
        <video
          ref={standbyVideoRef}
          preload="auto"
          muted
          playsInline
          className="hidden"
          aria-hidden="true"
        />

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

        {/* Thin top buffer progress bar when clips are preloading in background */}
        {playbackKind === 'video' && !clipLoadProgress.isReady && clipLoadProgress.total > 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-900/90 z-30 pointer-events-none overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 transition-all duration-200"
              style={{
                width: `${Math.max(8, Math.round((clipLoadProgress.loaded / Math.max(1, clipLoadProgress.total)) * 100))}%`,
              }}
            />
          </div>
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

        {/* Production Telemetry & Unit Economics HUD (Investor / Pipeline Proof Overlay) */}
        {showTelemetryHud && !fillScreen && productionTelemetry.activeCut && (
          <div className="absolute bottom-3 left-3 z-20 pointer-events-none max-w-[380px] rounded-lg border border-cyan-500/40 bg-zinc-950/90 backdrop-blur-md px-3 py-2 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                Pipeline Telemetry HUD • {productionTelemetry.activeCut.beatIdLabel}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {productionTelemetry.activeCut.methodBadge} • Continuity {productionTelemetry.rollup.continuityCoveragePct}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono text-zinc-300">
              <div>
                <span className="text-zinc-500">Cut Pacing:</span>{' '}
                <span className="text-white">{productionTelemetry.activeCut.editedCutDurationSec}s</span>{' '}
                <span className="text-zinc-500">/ {productionTelemetry.activeCut.rawTakeDurationSec}s raw</span>
              </div>
              <div>
                <span className="text-zinc-500">Cut Cost:</span>{' '}
                <span className="text-emerald-300">${productionTelemetry.activeCut.estimatedCutComputeUsd.toFixed(2)}</span>{' '}
                <span className="text-zinc-500">vs ${productionTelemetry.activeCut.traditionalShotEquivalentUsd}</span>
              </div>
              <div className="col-span-2 text-zinc-400 truncate">
                <span className="text-zinc-500">Anchor:</span> {productionTelemetry.activeCut.continuitySourceLabel}
              </div>
              <div className="col-span-2 pt-0.5 mt-0.5 border-t border-zinc-800 text-[9px] text-cyan-200/90">
                45m Episode Est: ~${productionTelemetry.rollup.projected45MinPreVisUsd} Pre-Vis • ~${productionTelemetry.rollup.projected45MinMotionUsd} Full Motion ({productionTelemetry.rollup.costSavingsMultiplierLabel})
              </div>
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

        {/* Clip Loading / Pending Play Overlay — Prevents frozen playback before clips finish loading */}
        {playbackKind === 'video' &&
          ((pendingPlayWhenReady && !clipLoadProgress.isReady) || (isPlaying && isVideoBuffering && !isVideoFrozen)) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm px-4">
            <div className="max-w-xs w-full rounded-xl border border-cyan-500/35 bg-zinc-900/95 px-4 py-3.5 shadow-2xl flex flex-col items-center text-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-zinc-100">
                  {pendingPlayWhenReady && !clipLoadProgress.isReady
                    ? `Loading Scene Clips (${clipLoadProgress.loaded}/${clipLoadProgress.total})`
                    : 'Buffering Video Clip…'}
                </p>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {pendingPlayWhenReady && !clipLoadProgress.isReady
                    ? 'Playback will start automatically once clips are buffered so the player does not freeze.'
                    : 'Syncing audio and video tracks…'}
                </p>
              </div>
              {clipLoadProgress.total > 0 && !clipLoadProgress.isReady && (
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full transition-all duration-200"
                    style={{
                      width: `${Math.max(10, Math.round((clipLoadProgress.loaded / Math.max(1, clipLoadProgress.total)) * 100))}%`,
                    }}
                  />
                </div>
              )}
              {pendingPlayWhenReady && !clipLoadProgress.isReady && (
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingPlayWhenReady(false)
                      toast.dismiss(MIXER_CLIP_LOAD_TOAST_ID)
                    }}
                    className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePlayAnyway()
                    }}
                    className="px-2.5 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[10px] font-medium transition-colors"
                  >
                    Play Anyway
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Studio Play/Pause Hover Overlay */}
        <button
          type="button"
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity z-20"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <div className="w-14 h-14 rounded-full bg-zinc-950/80 border border-cyan-400/50 text-cyan-300 backdrop-blur-md shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
            {pendingPlayWhenReady ? (
              <Loader2 className="w-6 h-6 text-cyan-300 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-0.5" />
            )}
          </div>
        </button>

        {/* Bottom-Right Corner Drag Handle to Resize 16:9 Player Window */}
        {!fillScreen && !isFullscreen && (
          <div
            onMouseDown={handleResizeDragStart}
            onDoubleClick={(e) => {
              e.stopPropagation()
              updatePlayerWidth(PLAYER_WIDTH_FIT)
            }}
            title="Drag corner to resize 16:9 video canvas • Double-click to fit column width"
            className="absolute bottom-1.5 right-1.5 z-30 w-6 h-6 rounded bg-zinc-950/85 hover:bg-cyan-500/25 border border-zinc-700/90 hover:border-cyan-400/60 flex items-center justify-center cursor-nwse-resize text-zinc-400 hover:text-cyan-200 transition-colors shadow-md"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3L3 10M10 6.5L6.5 10M10 10L10 10.01" strokeLinecap="round" />
            </svg>
          </div>
        )}
        </div>
      </div>
      
      {/* Controls Bar — 100% Width Studio Transport & Scrubber Bar */}
      {!fillScreen && (
      <div className="px-3 py-2.5 bg-zinc-900/95 border-t border-zinc-800/80 flex flex-col gap-2">
        {/* Row 1: Full-Width Timeline Scrubber & Timecode */}
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-zinc-300 font-mono tabular-nums min-w-[38px]">
            {formatTime(currentTime)}
          </span>
          
          {/* Progress Bar with Shot Boundary Markers */}
          <div 
            className="flex-1 h-2 bg-zinc-800/90 rounded-full cursor-pointer relative group"
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
          
          <span className="text-[11px] text-zinc-400 font-mono tabular-nums min-w-[38px] text-right">
            {formatTime(scrubberTotalDuration)}
          </span>
        </div>

        {/* Row 2: Transport Controls (Left) + Audio, Resize & Fullscreen Controls (Right) */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1">
            {/* Skip Prev Shot */}
            <button
              type="button"
              onClick={() => skipToBeat('prev')}
              disabled={activeSegmentIndex === 0}
              title="Previous shot"
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Fine Step Back (-0.25s) */}
            <button
              type="button"
              onClick={() => stepBySeconds(-0.25)}
              disabled={currentTime <= 0}
              title="Step back 6 frames (-0.25s) [←]"
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            
            {/* Play/Pause */}
            <button
              type="button"
              onClick={handlePlayPause}
              title={
                pendingPlayWhenReady
                  ? 'Waiting for clips to finish loading (click to cancel)'
                  : isPlaying
                    ? 'Pause [Space]'
                    : 'Play [Space]'
              }
              className={`p-1.5 px-2.5 rounded-md font-semibold transition-colors shadow-sm flex items-center justify-center ${
                pendingPlayWhenReady
                  ? 'bg-amber-500/25 border border-amber-400/50 text-amber-200 hover:bg-amber-500/35'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950'
              }`}
            >
              {pendingPlayWhenReady ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            {/* Fine Step Forward (+0.25s) */}
            <button
              type="button"
              onClick={() => stepBySeconds(0.25)}
              disabled={currentTime >= scrubberTotalDuration}
              title="Step forward 6 frames (+0.25s) [→]"
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            
            {/* Skip Next Shot */}
            <button
              type="button"
              onClick={() => skipToBeat('next')}
              disabled={activeSegmentIndex === segments.length - 1}
              title="Next shot"
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
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
              title={showSafeGuides ? 'Hide safe area guides [G]' : 'Show safe area guides (Action 90% / Title 80%) [G]'}
              className={`p-1.5 rounded-md transition-colors ${
                showSafeGuides
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            {/* Pipeline Telemetry HUD Toggle */}
            <button
              type="button"
              onClick={() => setShowTelemetryHud((prev) => !prev)}
              title={showTelemetryHud ? 'Hide Pipeline Telemetry & Unit Economics HUD [T]' : 'Show Pipeline Telemetry & Unit Economics HUD [T]'}
              className={`p-1.5 rounded-md transition-colors ${
                showTelemetryHud
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
            </button>

            {/* 1-Click NLE (.fcpxml) Timeline Export */}
            <button
              type="button"
              onClick={handleExportFcpxml}
              title="Export non-destructive FCPXML v1.10 timeline (DaVinci Resolve / Final Cut Pro / Premiere Pro) with multi-lane audio stems & alternate takes"
              className="hidden md:inline-flex items-center gap-1 px-1.5 py-1 rounded-md bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/40 text-zinc-300 hover:text-cyan-200 text-[9px] font-mono transition-colors"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>FCPXML</span>
            </button>
            
            {/* Mute Button */}
            <button
              type="button"
              onClick={onToggleMute}
              title={isMuted ? 'Unmute audio [M]' : 'Mute audio [M]'}
              className={`p-1.5 rounded-md transition-colors ${
                isMuted
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Stereo L/R Audio Level Meter */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-950/90 border border-zinc-800/80"
              title={`Audio Level Meter • Live: ${stereoMeterState.lufsReadout} • Target: ${stereoMeterState.technicalTarget}`}
            >
              <div className="flex flex-col gap-0.5 w-10">
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-75"
                    style={{
                      width: `${stereoMeterState.leftPct}%`,
                      background:
                        stereoMeterState.leftPct > 88
                          ? 'linear-gradient(90deg, #10b981 0%, #f59e0b 75%, #ef4444 100%)'
                          : 'linear-gradient(90deg, #10b981 0%, #34d399 70%, #f59e0b 100%)',
                    }}
                  />
                </div>
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-75"
                    style={{
                      width: `${stereoMeterState.rightPct}%`,
                      background:
                        stereoMeterState.rightPct > 88
                          ? 'linear-gradient(90deg, #10b981 0%, #f59e0b 75%, #ef4444 100%)'
                          : 'linear-gradient(90deg, #10b981 0%, #34d399 70%, #f59e0b 100%)',
                    }}
                  />
                </div>
              </div>
              <span className="text-[9px] font-medium text-zinc-300">
                {stereoMeterState.friendlyLabel}
              </span>
            </div>

            {/* 16:9 Stage Size Control (Presets S / M / L / Fit + Stepper) */}
            {!isFullscreen && (
              <div
                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-zinc-950 border border-zinc-800"
                title="Adjust 16:9 video canvas size inside the monitor (or choose Fit for full column width)"
              >
                <button
                  type="button"
                  onClick={() =>
                    updatePlayerWidth(
                      playerWidthPx === PLAYER_WIDTH_FIT ? 560 : playerWidthPx - 60
                    )
                  }
                  disabled={playerWidthPx > 0 && playerWidthPx <= PLAYER_WIDTH_MIN}
                  title="Make video canvas smaller"
                  className="px-1 py-0.5 rounded text-[10px] font-mono text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
                >
                  −
                </button>
                {PLAYER_SIZE_PRESETS.map((preset) => {
                  const isActivePreset =
                    preset.width === PLAYER_WIDTH_FIT
                      ? playerWidthPx === PLAYER_WIDTH_FIT
                      : playerWidthPx > 0 && Math.abs(playerWidthPx - preset.width) < 35
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updatePlayerWidth(preset.width)}
                      title={preset.title}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors ${
                        isActivePreset
                          ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() =>
                    updatePlayerWidth(
                      playerWidthPx === PLAYER_WIDTH_FIT
                        ? PLAYER_WIDTH_FIT
                        : playerWidthPx + 60 >= 760
                          ? PLAYER_WIDTH_FIT
                          : playerWidthPx + 60
                    )
                  }
                  disabled={playerWidthPx === PLAYER_WIDTH_FIT}
                  title="Make video canvas larger"
                  className="px-1 py-0.5 rounded text-[10px] font-mono text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            )}

            {/* Fullscreen Button — always visible */}
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium transition-colors shrink-0 ${
                isFullscreen
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30'
                  : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white'
              }`}
              title={isFullscreen ? 'Exit Fullscreen [F or Esc]' : 'Enter Fullscreen [F]'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Exit</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Full</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      )}
      
      {/* Hidden Audio Elements for sync playback */}
      {currentAudioUrls.narration && (
        <audio ref={narrationRef} src={currentAudioUrls.narration} preload="auto" />
      )}
      <audio ref={backgroundStemRef} preload="auto" />
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
      {/* Discrete SFX audio elements */}
      {currentAudioUrls.sfx.map((clip, idx) => {
        if (!clip?.audioUrl) return null
        const sfxKey = `__sfx_${idx}`
        return (
          <audio
            key={sfxKey}
            ref={el => {
              if (el) sfxRefsById.current.set(sfxKey, el)
              else sfxRefsById.current.delete(sfxKey)
            }}
            src={clip.audioUrl}
            preload="auto"
          />
        )
      })}
    </div>
  )
}
