/**
 * AudioGalleryPlayer - Scene-by-scene audio playback with visual display
 * 
 * Displays scene images with Ken Burns effect while playing audio tracks.
 * Supports multi-language audio and auto-advance between scenes.
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */
'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Globe, X, Maximize, Minimize, Share2, ExternalLink, Film, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { cn } from '@/lib/utils'
import { resolvePreVisSceneDisplay } from '@/lib/storyboard/preVisSceneDisplay'
import {
  translatePlayerLabel,
  resolveBeatCaptionText,
  type PlayerLabelMap,
  type SceneTranslation,
} from '@/lib/storyboard/playerTranslations'
import { BeatCaptionOverlay } from '@/components/vision/BeatCaptionOverlay'
import { PreVisSceneInfoPanel } from '@/components/vision/PreVisSceneInfoPanel'
import {
  getEstablishingFrameUrl,
  getScenePlayableThumbnailUrl,
  getScreeningPosterUrl,
  sceneHasPlayablePreVisAudio,
  SCENE_FADE_TO_BLACK_SEC,
} from '@/lib/storyboard/types'
import { useStoryboardPlayback } from '@/hooks/useStoryboardPlayback'
import {
  clampMusicIntroFadeConfig,
  DEFAULT_MUSIC_INTRO_FADE,
  MUSIC_INTRO_FADE_DURATION_MAX,
  MUSIC_INTRO_FADE_DURATION_MIN,
  MUSIC_INTRO_FADE_START_MAX,
  MUSIC_INTRO_FADE_START_MIN,
  type MusicIntroFadeConfig,
} from '@/lib/storyboard/musicIntroFade'
import { Switch } from '@/components/ui/switch'
import {
  computeKenBurnsProgress,
  computeKenBurnsTransform,
  computeLineZoomTransform,
  getImageObjectFit,
  getStaticTransform,
  loadGalleryImageEffectPrefs,
  saveGalleryImageEffectPrefs,
  transformToCss,
  CROSSFADE_DURATION_MS,
  type GalleryImageEffectPrefs,
} from '@/lib/storyboard/storyboardImageEffects'
import { StoryboardImageEffectControl } from '@/components/vision/StoryboardImageEffectControl'
import type { SceneProductionData } from '@/components/vision/scene-production/types'
import type { FinalCutSelection } from '@/lib/types/finalCut'
import { resolveScreeningVideoStreamUrl } from '@/lib/final-cut/resolveScreeningVideoStreamUrl'
import {
  findStreamMaster,
  getReadyStreamLanguages,
  type ProjectStream,
} from '@/lib/streams/projectStreams'

type PreVisPlaybackMode = 'animatic' | 'video' | 'stream'

function resolveSceneVideoUrl(
  scene: any,
  sceneIndex: number,
  language: string,
  sceneProductionState?: Record<string, SceneProductionData>,
  finalCutSelection?: FinalCutSelection | null
): string | null {
  const sceneId = scene?.id || scene?.sceneId || `scene-${sceneIndex}`
  if (!sceneProductionState) return null
  return resolveScreeningVideoStreamUrl(
    sceneId,
    sceneProductionState as Record<string, unknown>,
    language,
    finalCutSelection
  )
}

function getVideoSceneIndices(
  scenes: any[],
  language: string,
  sceneProductionState?: Record<string, SceneProductionData>,
  finalCutSelection?: FinalCutSelection | null
): number[] {
  return scenes
    .map((scene, idx) =>
      resolveSceneVideoUrl(scene, idx, language, sceneProductionState, finalCutSelection) ? idx : -1
    )
    .filter((idx) => idx >= 0)
}

function findNextVideoSceneIndex(indices: number[], currentIndex: number): number | null {
  const pos = indices.indexOf(currentIndex)
  if (pos >= 0 && pos < indices.length - 1) return indices[pos + 1]!
  const next = indices.find((idx) => idx > currentIndex)
  return next ?? null
}

function findPrevVideoSceneIndex(indices: number[], currentIndex: number): number | null {
  const pos = indices.indexOf(currentIndex)
  if (pos > 0) return indices[pos - 1]!
  for (let i = indices.length - 1; i >= 0; i--) {
    if (indices[i]! < currentIndex) return indices[i]!
  }
  return null
}

function findNearestForwardVideoSceneIndex(
  indices: number[],
  currentIndex: number
): number | null {
  if (indices.length === 0) return null
  if (indices.includes(currentIndex)) return currentIndex
  const next = indices.find((idx) => idx >= currentIndex)
  return next ?? indices[0]!
}

interface AudioGalleryPlayerProps {
  scenes: any[]
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  availableLanguages: string[]
  onClose?: () => void
  onShare?: () => void
  onSceneChange?: (index: number) => void
  isSharedView?: boolean
  /** Landing embed: hide player header; language pill overlays image area. */
  embedMode?: boolean
  /** Open full-screen embed route (landing sample expand). */
  expandHref?: string
  /** Landing full-width embed: use full pane width for scene image and controls. */
  fullWidthEmbed?: boolean
  /** Landing use-case embed: show Screening Room title + Animatic/Video/Stream toolbar. */
  landingEmbedToolbar?: boolean
  /** Trigger full-project cloud animatic render (matches player timeline). */
  onGenVideo?: (language: string) => void | Promise<void>
  isGenVideoRunning?: boolean
  exportedAnimaticUrl?: string | null
  /** Per-scene translated script text for the active language. */
  sceneTranslations?: Record<number, SceneTranslation>
  playerLabels?: PlayerLabelMap
  /** Per-scene production data for resolving completed video streams. */
  sceneProductionState?: Record<string, SceneProductionData>
  /** Screening Room / Assemble version pins (metadata.finalCut) */
  finalCutSelection?: FinalCutSelection | null
  /** Production Screening tab: large player on top, title and controls below. */
  screeningLayout?: boolean
  /** When false, beat caption overlays are hidden for the active language stream. */
  beatCaptionsEnabled?: boolean
  /** Screening tab: toggle beat captions for the currently selected language. */
  onBeatCaptionsEnabledChange?: (enabled: boolean) => void
  /** Project-level language stream masters. */
  projectStreams?: ProjectStream[]
  /** Share rendered stream master (stream playback mode). */
  onShareStream?: (language: string) => void | Promise<void>
  /** One-shot open hint from Streams tab preview. */
  screeningPlaybackHint?: { mode: 'stream'; language: string } | null
  onScreeningPlaybackHintConsumed?: () => void
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const GALLERY_MUSIC_VOLUME_STORAGE_KEY = 'sceneflow-gallery-music-volume'
const GALLERY_MUSIC_INTRO_FADE_STORAGE_KEY = 'sceneflow-gallery-music-intro-fade'
const DEFAULT_GALLERY_MUSIC_VOLUME = 0.15

function loadGalleryMusicIntroFade(): MusicIntroFadeConfig {
  if (typeof window === 'undefined') return DEFAULT_MUSIC_INTRO_FADE
  try {
    const raw = sessionStorage.getItem(GALLERY_MUSIC_INTRO_FADE_STORAGE_KEY)
    if (!raw) return DEFAULT_MUSIC_INTRO_FADE
    return clampMusicIntroFadeConfig(JSON.parse(raw))
  } catch {
    return DEFAULT_MUSIC_INTRO_FADE
  }
}

function saveGalleryMusicIntroFade(config: MusicIntroFadeConfig): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(GALLERY_MUSIC_INTRO_FADE_STORAGE_KEY, JSON.stringify(config))
}

function loadGalleryMusicVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_GALLERY_MUSIC_VOLUME
  const raw = sessionStorage.getItem(GALLERY_MUSIC_VOLUME_STORAGE_KEY)
  const parsed = raw != null ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : DEFAULT_GALLERY_MUSIC_VOLUME
}

export function AudioGalleryPlayer({
  scenes,
  selectedLanguage,
  onLanguageChange,
  availableLanguages,
  onClose,
  onShare,
  onSceneChange,
  isSharedView = false,
  embedMode = false,
  expandHref,
  fullWidthEmbed = false,
  landingEmbedToolbar = false,
  onGenVideo,
  isGenVideoRunning = false,
  exportedAnimaticUrl,
  sceneTranslations,
  playerLabels,
  sceneProductionState,
  finalCutSelection,
  screeningLayout = false,
  beatCaptionsEnabled = true,
  onBeatCaptionsEnabledChange,
  projectStreams,
  onShareStream,
  screeningPlaybackHint,
  onScreeningPlaybackHintConsumed,
}: AudioGalleryPlayerProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [playbackMode, setPlaybackMode] = useState<PreVisPlaybackMode>('animatic')
  const [volume, setVolume] = useState(0.8)
  const [musicVolume, setMusicVolume] = useState(loadGalleryMusicVolume)
  const [musicIntroFade, setMusicIntroFade] = useState<MusicIntroFadeConfig>(loadGalleryMusicIntroFade)
  const [isMuted, setIsMuted] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [visualFrameKey, setVisualFrameKey] = useState(0)
  const lastImageUrlRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoAdvanceRef = useRef(autoAdvance)
  autoAdvanceRef.current = autoAdvance

  const [imageEffectPrefs, setImageEffectPrefs] = useState<GalleryImageEffectPrefs>(() =>
    loadGalleryImageEffectPrefs()
  )
  const [crossfadeFromUrl, setCrossfadeFromUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const shouldAutoPlayVideoRef = useRef(false)

  const updateImageEffectPrefs = useCallback((prefs: GalleryImageEffectPrefs) => {
    setImageEffectPrefs(prefs)
    saveGalleryImageEffectPrefs(prefs)
  }, [])

  const currentScene = scenes[currentSceneIndex]
  const screeningPosterUrl = getScreeningPosterUrl(currentScene)

  const currentSceneVideoUrl = useMemo(
    () => resolveSceneVideoUrl(currentScene, currentSceneIndex, selectedLanguage, sceneProductionState, finalCutSelection),
    [currentScene, currentSceneIndex, selectedLanguage, sceneProductionState, finalCutSelection]
  )

  const hasAnySceneVideo = useMemo(
    () =>
      scenes.some((scene, idx) =>
        !!resolveSceneVideoUrl(scene, idx, selectedLanguage, sceneProductionState, finalCutSelection)
      ),
    [scenes, selectedLanguage, sceneProductionState, finalCutSelection]
  )

  const videoSceneIndices = useMemo(
    () => getVideoSceneIndices(scenes, selectedLanguage, sceneProductionState, finalCutSelection),
    [scenes, selectedLanguage, sceneProductionState, finalCutSelection]
  )

  const videoScenePosition = useMemo(() => {
    const pos = videoSceneIndices.indexOf(currentSceneIndex)
    return pos >= 0 ? pos + 1 : 0
  }, [videoSceneIndices, currentSceneIndex])

  const streamReadyLanguages = useMemo(
    () => getReadyStreamLanguages(projectStreams ?? []),
    [projectStreams]
  )

  const hasReadyStreamForLanguage = useMemo(
    () => !!findStreamMaster(projectStreams ?? [], selectedLanguage),
    [projectStreams, selectedLanguage]
  )

  const activeStreamMaster = useMemo(
    () => findStreamMaster(projectStreams ?? [], selectedLanguage),
    [projectStreams, selectedLanguage]
  )

  const streamMasterUrl = activeStreamMaster?.mp4Url ?? null

  const useStreamMaster = playbackMode === 'stream' && !!streamMasterUrl

  const useVideoForCurrentScene =
    playbackMode === 'video' && videoSceneIndices.includes(currentSceneIndex)

  const playAfterSceneChangeRef = useRef<() => void>(() => {})
  const pausePlaybackRef = useRef<() => void>(() => {})
  const resetPlaybackRef = useRef<() => void>(() => {})

  const goToScene = useCallback(
    (index: number) => {
      if (index >= 0 && index < scenes.length) {
        pausePlaybackRef.current()
        resetPlaybackRef.current()
        if (videoRef.current) {
          videoRef.current.pause()
        }
        setVideoPlaying(false)
        setVideoCurrentTime(0)
        setVideoDuration(0)
        setCurrentSceneIndex(index)
        onSceneChange?.(index)
      }
    },
    [scenes.length, onSceneChange]
  )

  const goToNextScene = useCallback(() => {
    if (playbackMode === 'video') {
      const next = findNextVideoSceneIndex(videoSceneIndices, currentSceneIndex)
      if (next != null) goToScene(next)
      return
    }
    setCurrentSceneIndex((prev) => {
      if (prev >= scenes.length - 1) return prev
      const next = prev + 1
      onSceneChange?.(next)
      return next
    })
  }, [playbackMode, videoSceneIndices, currentSceneIndex, goToScene, scenes.length, onSceneChange])

  const handlePlaybackEnd = useCallback(() => {
    if (playbackMode === 'stream') return
    if (autoAdvanceRef.current && currentSceneIndex < scenes.length - 1) {
      setTimeout(() => {
        goToNextScene()
        setTimeout(() => playAfterSceneChangeRef.current(), 100)
      }, 100)
    }
  }, [playbackMode, currentSceneIndex, scenes.length, goToNextScene])

  const playback = useStoryboardPlayback({
    scene: currentScene,
    language: selectedLanguage,
    volume,
    musicVolume,
    isMuted,
    musicIntroFade,
    onPlaybackEnd: handlePlaybackEnd,
  })

  playAfterSceneChangeRef.current = playback.play

  const {
    isPlaying,
    currentTime,
    sceneDuration,
    currentVisualFrame,
    hasVoiceAudio,
    pause,
    togglePlayback,
    seekTo,
    reset,
  } = playback

  pausePlaybackRef.current = pause
  resetPlaybackRef.current = reset

  const displayImageUrl =
    currentVisualFrame?.imageUrl ?? getEstablishingFrameUrl(currentScene)

  const inBeatVisual = useMemo(() => {
    const frame = currentVisualFrame
    if (!frame?.imageUrl) {
      return { primaryUrl: displayImageUrl, overlayUrl: null as string | null, blend: 0, fadeBlack: 0 }
    }
    const frameStart = frame.startTime
    const frameDuration = Math.max(frame.duration, 0.1)
    const t = Math.max(0, currentTime - frameStart)
    const primaryUrl = frame.imageUrl

    let fadeBlack = 0
    if (frame.isSceneStart && t < SCENE_FADE_TO_BLACK_SEC) {
      fadeBlack = Math.max(fadeBlack, 1 - t / SCENE_FADE_TO_BLACK_SEC)
    }
    if (frame.isSceneEnd) {
      const fadeStart = Math.max(0, frameDuration - SCENE_FADE_TO_BLACK_SEC)
      if (t >= fadeStart) {
        fadeBlack = Math.max(
          fadeBlack,
          Math.min(1, (t - fadeStart) / SCENE_FADE_TO_BLACK_SEC)
        )
      }
    }

    return { primaryUrl, overlayUrl: null as string | null, blend: 0, fadeBlack }
  }, [currentVisualFrame, currentTime, displayImageUrl])

  const useActiveVideoPlayback = useStreamMaster || useVideoForCurrentScene

  const videoFadeBlack = useMemo(() => {
    if (!useActiveVideoPlayback || videoDuration <= 0) return 0
    const fadeIn = Math.max(0, 1 - videoCurrentTime / SCENE_FADE_TO_BLACK_SEC)
    const fadeOut = Math.max(
      0,
      1 - (videoDuration - videoCurrentTime) / SCENE_FADE_TO_BLACK_SEC
    )
    return Math.min(1, Math.max(fadeIn, fadeOut))
  }, [useActiveVideoPlayback, videoCurrentTime, videoDuration])

  const rawSpeakerLabel = currentVisualFrame?.character ?? currentVisualFrame?.label
  const speakerLabel = translatePlayerLabel(rawSpeakerLabel, playerLabels)

  const activeCaption = useMemo(() => {
    if (!beatCaptionsEnabled) return null
    const sceneTranslation = sceneTranslations?.[currentSceneIndex]
    const text = resolveBeatCaptionText(
      sceneTranslation,
      currentVisualFrame?.beatId,
      currentVisualFrame?.overlayText
    )
    if (!text) return null
    return {
      text,
      overlayType: currentVisualFrame?.overlayType || 'signage',
    }
  }, [
    beatCaptionsEnabled,
    sceneTranslations,
    currentSceneIndex,
    currentVisualFrame?.beatId,
    currentVisualFrame?.overlayText,
    currentVisualFrame?.overlayType,
  ])
  
  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }, [isFullscreen])
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    sessionStorage.setItem(GALLERY_MUSIC_VOLUME_STORAGE_KEY, String(musicVolume))
  }, [musicVolume])

  useEffect(() => {
    saveGalleryMusicIntroFade(musicIntroFade)
  }, [musicIntroFade])

  const updateMusicIntroFade = useCallback((partial: Partial<MusicIntroFadeConfig>) => {
    setMusicIntroFade((prev) => clampMusicIntroFadeConfig({ ...prev, ...partial }))
  }, [])

  // Reset Ken Burns direction when the visible frame changes
  useEffect(() => {
    const next =
      currentSceneIndex * 100 +
      (currentVisualFrame?.dialogueIndex ?? 0) +
      (currentVisualFrame?.frameType === 'establishing' ? 0 : 50)
    setVisualFrameKey(prev => (prev === next ? prev : next))
  }, [currentSceneIndex, currentVisualFrame?.clipId, currentVisualFrame?.dialogueIndex, currentVisualFrame?.frameType])

  // Crossfade between dialogue frames (inter-beat); in-beat start→end uses inBeatVisual
  useEffect(() => {
    const url = inBeatVisual.primaryUrl
    if (!url) {
      lastImageUrlRef.current = null
      setCrossfadeFromUrl(null)
      return
    }
    const prev = lastImageUrlRef.current
    if (
      prev &&
      prev !== url &&
      imageEffectPrefs.mode === 'crossfade' &&
      !inBeatVisual.overlayUrl
    ) {
      setCrossfadeFromUrl(prev)
      const timer = setTimeout(() => setCrossfadeFromUrl(null), CROSSFADE_DURATION_MS)
      lastImageUrlRef.current = url
      return () => clearTimeout(timer)
    }
    lastImageUrlRef.current = url
  }, [inBeatVisual.primaryUrl, inBeatVisual.overlayUrl, imageEffectPrefs.mode])

  const goToPrevScene = useCallback(() => {
    if (playbackMode === 'video') {
      const prev = findPrevVideoSceneIndex(videoSceneIndices, currentSceneIndex)
      if (prev != null) goToScene(prev)
      return
    }
    goToScene(currentSceneIndex - 1)
  }, [playbackMode, videoSceneIndices, currentSceneIndex, goToScene])

  const sceneDisplay = useMemo(
    () =>
      resolvePreVisSceneDisplay(currentScene, currentSceneIndex, {
        language: selectedLanguage,
        sceneTranslation: sceneTranslations?.[currentSceneIndex],
        playerLabels,
      }),
    [currentScene, currentSceneIndex, selectedLanguage, sceneTranslations, playerLabels]
  )

  const hasAudio =
    hasVoiceAudio ||
    !!currentScene?.musicAudio ||
    !!(currentScene?.music as { url?: string } | undefined)?.url ||
    (Array.isArray(currentScene?.sfxAudio) && currentScene!.sfxAudio.length > 0)

  useEffect(() => {
    if (!screeningPlaybackHint || screeningPlaybackHint.mode !== 'stream') return
    setPlaybackMode('stream')
    onLanguageChange(screeningPlaybackHint.language)
    onScreeningPlaybackHintConsumed?.()
  }, [screeningPlaybackHint, onLanguageChange, onScreeningPlaybackHintConsumed])

  useEffect(() => {
    if (playbackMode === 'video' && !hasAnySceneVideo) {
      setPlaybackMode('animatic')
    }
  }, [playbackMode, hasAnySceneVideo])

  useEffect(() => {
    if (playbackMode === 'stream' && streamReadyLanguages.length === 0) {
      setPlaybackMode('animatic')
      return
    }
    if (playbackMode === 'stream' && !hasReadyStreamForLanguage && streamReadyLanguages.length > 0) {
      onLanguageChange(streamReadyLanguages[0]!)
    }
  }, [
    playbackMode,
    streamReadyLanguages,
    hasReadyStreamForLanguage,
    onLanguageChange,
  ])

  useEffect(() => {
    if (playbackMode !== 'video' || videoSceneIndices.length === 0) return
    if (!videoSceneIndices.includes(currentSceneIndex)) {
      const target = findNearestForwardVideoSceneIndex(videoSceneIndices, currentSceneIndex)
      if (target != null && target !== currentSceneIndex) {
        setCurrentSceneIndex(target)
        onSceneChange?.(target)
      }
    }
  }, [playbackMode, videoSceneIndices, currentSceneIndex, onSceneChange])

  useEffect(() => {
    if (useStreamMaster || useVideoForCurrentScene) {
      pause()
      reset()
    } else if (videoRef.current) {
      videoRef.current.pause()
      setVideoPlaying(false)
    }
  }, [useStreamMaster, useVideoForCurrentScene, currentSceneIndex, currentSceneVideoUrl, pause, reset])

  useEffect(() => {
    if (!shouldAutoPlayVideoRef.current || (!useVideoForCurrentScene && !useStreamMaster)) return
    shouldAutoPlayVideoRef.current = false
    const el = videoRef.current
    if (!el) return
    void el.play().then(() => setVideoPlaying(true)).catch(() => setVideoPlaying(false))
  }, [useStreamMaster, useVideoForCurrentScene, currentSceneIndex, currentSceneVideoUrl, streamMasterUrl])

  const handleVideoEnded = useCallback(() => {
    setVideoPlaying(false)
    if (useStreamMaster) return
    if (autoAdvanceRef.current) {
      const next = findNextVideoSceneIndex(videoSceneIndices, currentSceneIndex)
      if (next != null) {
        setTimeout(() => {
          shouldAutoPlayVideoRef.current = true
          goToScene(next)
        }, 100)
      }
    }
  }, [useStreamMaster, videoSceneIndices, currentSceneIndex, goToScene])

  const activeVideoUrl = useStreamMaster ? streamMasterUrl : currentSceneVideoUrl

  const toggleVideoPlayback = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      void el.play().then(() => setVideoPlaying(true)).catch(() => setVideoPlaying(false))
    } else {
      el.pause()
      setVideoPlaying(false)
    }
  }, [])

  const effectiveIsPlaying = useStreamMaster || useVideoForCurrentScene ? videoPlaying : isPlaying
  const effectiveCurrentTime = useStreamMaster || useVideoForCurrentScene ? videoCurrentTime : currentTime
  const effectiveDuration = useStreamMaster || useVideoForCurrentScene
    ? Math.max(videoDuration, 0.1)
    : sceneDuration

  const showPosterStill =
    !effectiveIsPlaying && effectiveCurrentTime < 0.1 && !!screeningPosterUrl

  const toggleEffectivePlayback = useCallback(() => {
    if (useStreamMaster || useVideoForCurrentScene) {
      toggleVideoPlayback()
    } else {
      togglePlayback()
    }
  }, [useStreamMaster, useVideoForCurrentScene, toggleVideoPlayback, togglePlayback])

  const seekEffective = useCallback(
    (time: number) => {
      if (useActiveVideoPlayback && videoRef.current) {
        videoRef.current.currentTime = time
        setVideoCurrentTime(time)
      } else {
        seekTo(time)
      }
    },
    [useActiveVideoPlayback, seekTo]
  )

  const languageFilterCodes =
    playbackMode === 'stream' && streamReadyLanguages.length > 0
      ? streamReadyLanguages
      : availableLanguages

  // Image motion transform — one Ken Burns cycle per storyboard cut
  const kenBurnsProgress = useMemo(() => {
    const frameStart = currentVisualFrame?.startTime ?? 0
    const frameDuration = Math.max(currentVisualFrame?.duration ?? sceneDuration, 2)
    const cycleTime = Math.max(0, currentTime - frameStart)
    return computeKenBurnsProgress(cycleTime, frameDuration)
  }, [currentTime, currentVisualFrame?.startTime, currentVisualFrame?.duration, sceneDuration])

  const imageTransform = useMemo(() => {
    switch (imageEffectPrefs.mode) {
      case 'kenBurns':
        return computeKenBurnsTransform({
          intensity: imageEffectPrefs.kenBurnsIntensity,
          progress: kenBurnsProgress,
          directionIndex: visualFrameKey,
        })
      case 'lineZoom':
        return computeLineZoomTransform({
          frameStart: currentVisualFrame?.startTime ?? 0,
          frameDuration: currentVisualFrame?.duration ?? sceneDuration,
          currentTime,
        })
      case 'off':
      case 'fit':
      case 'crossfade':
      default:
        return getStaticTransform()
    }
  }, [
    imageEffectPrefs,
    kenBurnsProgress,
    visualFrameKey,
    currentVisualFrame?.startTime,
    currentVisualFrame?.duration,
    currentTime,
    sceneDuration,
  ])

  const imageObjectFit = getImageObjectFit(imageEffectPrefs.mode)
  const imageTransformCss = transformToCss(imageTransform)
  const imageAlt = `Scene ${currentSceneIndex + 1}${currentVisualFrame?.dialogueIndex != null ? ` — line ${currentVisualFrame.dialogueIndex + 1}` : ''}`

  const renderSceneImage = (url: string, layer: 'current' | 'previous') => {
    const isPrevious = layer === 'previous'
    const fitClass = imageObjectFit === 'contain' ? 'object-contain' : 'object-cover'
    return (
      <img
        key={isPrevious ? `prev-${url}` : `cur-${url}`}
        src={url}
        alt={isPrevious ? '' : imageAlt}
        aria-hidden={isPrevious}
        className={cn('w-full h-full', fitClass, isPrevious && 'absolute inset-0')}
        style={{
          transform: isPrevious ? undefined : imageTransformCss,
          transition: isPrevious
            ? undefined
            : isPlaying
              ? 'transform 0.1s linear'
              : 'transform 0.2s ease-out',
          animation: isPrevious
            ? `galleryCrossfadeOut ${CROSSFADE_DURATION_MS}ms ease-in-out forwards`
            : crossfadeFromUrl && imageEffectPrefs.mode === 'crossfade'
              ? `galleryCrossfadeIn ${CROSSFADE_DURATION_MS}ms ease-in-out forwards`
              : undefined,
        }}
      />
    )
  }


  /** Public share / landing embed: compact stacked layout. */
  const sharedCompact = (isSharedView || embedMode) && !isFullscreen
  const landingWide = embedMode && fullWidthEmbed && !isFullscreen
  const useScreeningLayout = screeningLayout && !isFullscreen
  const showToolbar = (!embedMode || landingEmbedToolbar) && !useScreeningLayout

  const motionControl = (
    <StoryboardImageEffectControl
      prefs={imageEffectPrefs}
      onChange={updateImageEffectPrefs}
      compact={sharedCompact}
    />
  )

  const playerToolbar = (
    <div
      className={cn(
        'px-3 py-2',
        useScreeningLayout
          ? 'w-full shrink-0 border-b border-white/10 flex flex-col items-stretch gap-2'
          : 'flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/10'
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center gap-2',
          useScreeningLayout && 'w-full'
        )}
      >
        <Volume2 className="w-5 h-5 text-emerald-400" />
        <span className="font-semibold text-white">Screening Room</span>
        <div className="flex items-center rounded-md border border-white/10 bg-gray-800/80 p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setPlaybackMode('animatic')}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                  playbackMode === 'animatic'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                Animatic
              </button>
            </TooltipTrigger>
            <TooltipContent>Storyboard frames with synced audio</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => hasAnySceneVideo && setPlaybackMode('video')}
                disabled={!hasAnySceneVideo}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                  playbackMode === 'video'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white',
                  !hasAnySceneVideo && 'opacity-40 cursor-not-allowed hover:text-gray-400'
                )}
              >
                Video
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {hasAnySceneVideo
                ? 'Play completed scene videos back-to-back'
                : 'Render at least one scene video to enable Video mode'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => streamReadyLanguages.length > 0 && setPlaybackMode('stream')}
                disabled={streamReadyLanguages.length === 0}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                  playbackMode === 'stream'
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-white',
                  streamReadyLanguages.length === 0 && 'opacity-40 cursor-not-allowed hover:text-gray-400'
                )}
              >
                Stream
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {streamReadyLanguages.length > 0
                ? 'Play stitched master MP4 for the selected language'
                : 'Render a language master in Streams to enable Stream mode'}
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
          {playbackMode === 'stream'
            ? 'Language master'
            : playbackMode === 'video'
            ? `Video ${videoScenePosition} of ${videoSceneIndices.length}`
            : `Scene ${currentSceneIndex + 1} of ${scenes.length}`}
        </span>
      </div>

      <div
        className={cn(
          'flex flex-wrap items-center gap-2',
          useScreeningLayout && 'w-full'
        )}
      >
        {onGenVideo && !isSharedView && (
          <Button
            variant="outline"
            size="sm"
            disabled={isGenVideoRunning}
            onClick={() => void onGenVideo(selectedLanguage)}
            className="h-7 text-xs bg-indigo-900/40 border-indigo-500/40 hover:bg-indigo-800/50 hover:text-white"
          >
            {isGenVideoRunning ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Film className="w-3.5 h-3.5 mr-1.5" />
            )}
            Gen Video
          </Button>
        )}
        {exportedAnimaticUrl && !isSharedView && (
          <a
            href={exportedAnimaticUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Animatic
          </a>
        )}
        {(onShare || onShareStream) && !isSharedView && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (playbackMode === 'stream' && onShareStream) {
                void onShareStream(selectedLanguage)
              } else if (onShare) {
                onShare()
              }
            }}
            className="h-7 text-xs bg-gray-800 border-gray-700 hover:bg-gray-700 hover:text-white"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Share
          </Button>
        )}
        {languageFilterCodes.length > 1 && (
          <div className="flex items-center gap-2">
            <GroupedLanguageSelector
              value={selectedLanguage}
              onValueChange={onLanguageChange}
              filterCodes={languageFilterCodes}
              size="sm"
              className="bg-gray-800 border-gray-700"
            />
          </div>
        )}
        {screeningLayout && onBeatCaptionsEnabledChange && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={beatCaptionsEnabled}
                  onCheckedChange={onBeatCaptionsEnabledChange}
                  className="scale-75"
                  aria-label="Beat captions"
                />
                <span className="text-[10px] text-gray-400 whitespace-nowrap">Beat captions</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Show on-screen beat titles and signage for this language stream
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setAutoAdvance(!autoAdvance)}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium transition-colors',
                autoAdvance
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              )}
            >
              Auto
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {autoAdvance ? 'Auto-advance enabled' : 'Auto-advance disabled'}
          </TooltipContent>
        </Tooltip>
        {!isSharedView && motionControl}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</TooltipContent>
        </Tooltip>
        {onClose && !isFullscreen && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )

  const videoStageContent = (
    <>
      {useActiveVideoPlayback ? (
        <>
          <video
            ref={videoRef}
            key={activeVideoUrl || `scene-${currentSceneIndex}`}
            src={activeVideoUrl || undefined}
            poster={screeningPosterUrl || displayImageUrl || getScenePlayableThumbnailUrl(currentScene) || undefined}
            className="w-full h-full object-contain"
            onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
            onEnded={handleVideoEnded}
          />
          {videoFadeBlack > 0 && !useStreamMaster && effectiveIsPlaying && (
            <div
              className="absolute inset-0 bg-black z-[2] pointer-events-none"
              style={{ opacity: videoFadeBlack }}
            />
          )}
        </>
      ) : inBeatVisual.primaryUrl ? (
        <>
          {crossfadeFromUrl && imageEffectPrefs.mode === 'crossfade' && (
            renderSceneImage(crossfadeFromUrl, 'previous')
          )}
          {renderSceneImage(
            showPosterStill ? screeningPosterUrl! : inBeatVisual.primaryUrl,
            'current'
          )}
          {inBeatVisual.fadeBlack > 0 && effectiveIsPlaying && (
            <div
              className="absolute inset-0 bg-black z-[2] pointer-events-none"
              style={{ opacity: inBeatVisual.fadeBlack }}
            />
          )}
          {activeCaption && (
            <BeatCaptionOverlay
              text={activeCaption.text}
              overlayType={activeCaption.overlayType}
              isPlaying={isPlaying}
              isFullscreen={isFullscreen}
              hasSpeakerLabel={!!speakerLabel && activeCaption.overlayType === 'lower_third'}
            />
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          <span className="text-sm">No image</span>
        </div>
      )}
      <div className="absolute bottom-4 right-4 z-[3] pointer-events-none select-none opacity-70">
        <span
          className="inline-block rounded-md bg-black/25 px-2.5 py-1 text-white font-bold tracking-widest uppercase backdrop-blur-[2px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
          style={{ fontSize: isFullscreen ? '1.5rem' : '0.875rem' }}
        >
          SceneFlow AI Studio
        </span>
      </div>
      {embedMode && availableLanguages.length > 1 && (
        <div className="absolute top-3 left-3 z-10 pointer-events-auto">
          <GroupedLanguageSelector
            value={selectedLanguage}
            onValueChange={onLanguageChange}
            filterCodes={availableLanguages}
            size="sm"
            className="bg-black/70 border-white/20 backdrop-blur-sm"
          />
        </div>
      )}
      {speakerLabel && (
        <div className="absolute bottom-2 left-2 right-auto max-w-[70%] bg-black/70 rounded px-2 py-1 z-[2]">
          <span className={cn('text-white', isFullscreen && !sharedCompact ? 'text-base' : 'text-xs')}>
            {speakerLabel}
          </span>
        </div>
      )}
    </>
  )

  const sceneThumbnailsRow = (
    <div className="flex gap-2 overflow-x-auto pb-1 justify-start">
      {(playbackMode === 'video' ? videoSceneIndices : scenes.map((_, idx) => idx)).map((idx) => {
        const scene = scenes[idx]
        const hasSceneAudio = sceneHasPlayablePreVisAudio(scene, selectedLanguage)
        const thumbUrl = getScenePlayableThumbnailUrl(scene)

        return (
          <button
            key={idx}
            onClick={() => goToScene(idx)}
            className={cn(
              'flex-shrink-0 rounded overflow-hidden border-2 transition-all relative',
              isFullscreen ? 'w-24 h-14' : 'w-14 h-9',
              idx === currentSceneIndex
                ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                : 'border-transparent hover:border-gray-500'
            )}
          >
            {thumbUrl ? (
              <img src={thumbUrl} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                <span className="text-[10px] text-gray-400">{idx + 1}</span>
              </div>
            )}
            {hasSceneAudio && (
              <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        )
      })}
    </div>
  )

  const playbackControlsBlock = (
    <>
      <div className={cn('mt-3', (isFullscreen || sharedCompact) && 'mt-0', useScreeningLayout && 'mt-0')}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400 w-10">{formatTime(effectiveCurrentTime)}</span>
          <div
            className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const percent = x / rect.width
              seekEffective(percent * effectiveDuration)
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-100"
              style={{ width: `${(effectiveCurrentTime / effectiveDuration) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-10">{formatTime(effectiveDuration)}</span>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={goToPrevScene}
                  disabled={
                    playbackMode === 'video'
                      ? findPrevVideoSceneIndex(videoSceneIndices, currentSceneIndex) == null
                      : currentSceneIndex === 0
                  }
                  className={cn(
                    'rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors',
                    isFullscreen ? 'p-3' : 'p-2'
                  )}
                >
                  <SkipBack className={cn('text-white', isFullscreen ? 'w-5 h-5' : 'w-4 h-4')} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Previous scene</TooltipContent>
            </Tooltip>

            <button
              onClick={toggleEffectivePlayback}
              className={cn(
                'rounded-full bg-emerald-600 hover:bg-emerald-500 transition-colors',
                isFullscreen ? 'p-4' : 'p-3'
              )}
            >
              {effectiveIsPlaying ? (
                <Pause className={cn('text-white', isFullscreen ? 'w-6 h-6' : 'w-5 h-5')} />
              ) : (
                <Play className={cn('text-white ml-0.5', isFullscreen ? 'w-6 h-6' : 'w-5 h-5')} />
              )}
            </button>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => goToNextScene()}
                  disabled={
                    playbackMode === 'video'
                      ? findNextVideoSceneIndex(videoSceneIndices, currentSceneIndex) == null
                      : currentSceneIndex === scenes.length - 1
                  }
                  className={cn(
                    'rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors',
                    isFullscreen ? 'p-3' : 'p-2'
                  )}
                >
                  <SkipForward className={cn('text-white', isFullscreen ? 'w-5 h-5' : 'w-4 h-4')} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Next scene</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(sharedCompact || isFullscreen) && motionControl}
            {embedMode && (
              <>
                <span className="text-[10px] text-gray-500 tabular-nums hidden sm:inline">
                  {playbackMode === 'video'
                    ? `${videoScenePosition}/${videoSceneIndices.length}`
                    : `${currentSceneIndex + 1}/${scenes.length}`}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setAutoAdvance(!autoAdvance)}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] font-medium transition-colors',
                        autoAdvance
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      )}
                    >
                      Auto
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {autoAdvance ? 'Auto-advance enabled' : 'Auto-advance disabled'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                    >
                      {isFullscreen ? (
                        <Minimize className="w-3.5 h-3.5" />
                      ) : (
                        <Maximize className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  </TooltipContent>
                </Tooltip>
                {expandHref && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={expandHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors inline-flex"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Open full screening player</TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 rounded hover:bg-gray-700 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
            </Tooltip>
            <span className="text-[10px] text-gray-500 shrink-0">Master</span>
            <Slider
              value={[volume * 100]}
              onValueChange={([val]) => setVolume(val / 100)}
              max={100}
              step={1}
              className="w-20"
            />
            <span className="text-[10px] text-gray-500 shrink-0">Music</span>
            <Slider
              value={[musicVolume * 100]}
              onValueChange={([val]) => setMusicVolume(val / 100)}
              max={100}
              step={1}
              className="w-16"
              title={`Music volume: ${Math.round(musicVolume * 100)}%`}
            />
            <div className="flex items-center gap-1.5 shrink-0 border-l border-gray-600 pl-2 ml-1">
              <Switch
                checked={musicIntroFade.enabled}
                onCheckedChange={(enabled) => updateMusicIntroFade({ enabled })}
                className="scale-75"
                aria-label="Music intro fade"
              />
              <span className="text-[10px] text-gray-500 whitespace-nowrap">Intro fade</span>
              {musicIntroFade.enabled && (
                <>
                  <span className="text-[10px] text-gray-500 shrink-0">Start</span>
                  <Slider
                    value={[Math.round(musicIntroFade.startLevel * 100)]}
                    onValueChange={([val]) =>
                      updateMusicIntroFade({
                        startLevel: val / 100,
                      })
                    }
                    min={MUSIC_INTRO_FADE_START_MIN * 100}
                    max={MUSIC_INTRO_FADE_START_MAX * 100}
                    step={5}
                    className="w-12"
                    title={`Intro start level: ${Math.round(musicIntroFade.startLevel * 100)}%`}
                  />
                  <span className="text-[10px] text-gray-500 shrink-0">
                    {Math.round(musicIntroFade.durationSec)}s
                  </span>
                  <Slider
                    value={[musicIntroFade.durationSec]}
                    onValueChange={([val]) => updateMusicIntroFade({ durationSec: val })}
                    min={MUSIC_INTRO_FADE_DURATION_MIN}
                    max={MUSIC_INTRO_FADE_DURATION_MAX}
                    step={1}
                    className="w-12"
                    title={`Intro fade duration: ${musicIntroFade.durationSec}s`}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <TooltipProvider>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes galleryCrossfadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes galleryCrossfadeOut {
              from { opacity: 1; }
              to { opacity: 0; }
            }
          `,
        }}
      />
      <div 
        ref={containerRef}
        className={cn(
          "rounded-xl border border-emerald-500/30 bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/20 overflow-hidden",
          useScreeningLayout && "w-full h-full min-h-0 flex flex-col",
          isFullscreen && "fixed inset-0 z-50 rounded-none border-none flex flex-col"
        )}
      >
        {/* Header with language selector — hidden in landing embed and screening layout */}
        {showToolbar && playerToolbar}
        
        {/* Main content area */}
        <div
          className={cn(
            'flex gap-4 p-4',
            useScreeningLayout && 'flex-1 flex-row items-stretch h-full min-h-0 w-full',
            isFullscreen && 'flex-1 flex-col items-center justify-center w-full',
            sharedCompact && 'flex-col items-center w-full gap-3 py-2 px-2 sm:px-4',
            landingWide ? 'max-w-none mx-0' : sharedCompact && 'max-w-4xl mx-auto'
          )}
        >
          {useScreeningLayout ? (
            <>
              <div className="flex w-[75%] min-w-0 flex-col min-h-0 gap-2 self-stretch">
                <div className="flex flex-1 min-h-0 items-center justify-center">
                  <div className="relative w-full max-h-full aspect-video rounded-lg overflow-hidden bg-black shadow-xl">
                    {videoStageContent}
                  </div>
                </div>
                <div className="shrink-0 px-1">{sceneThumbnailsRow}</div>
              </div>
              <div className="flex flex-1 min-w-[260px] min-h-0 flex-col gap-3 overflow-hidden">
                {playerToolbar}
                <PreVisSceneInfoPanel
                  display={sceneDisplay}
                  variant="inline"
                  totalScenes={scenes.length}
                  playerLabels={playerLabels}
                />
                {!hasAudio && !useVideoForCurrentScene && (
                  <p className="text-xs text-amber-400 shrink-0">No audio generated for this scene</p>
                )}
                <div className="mt-auto flex flex-col gap-2 shrink-0 min-h-0">
                  {playbackControlsBlock}
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className={cn(
                  'relative rounded-lg overflow-hidden bg-black flex-shrink-0 w-full',
                  isFullscreen
                    ? 'max-w-7xl aspect-video'
                    : landingWide
                      ? 'max-w-none aspect-video shadow-lg'
                      : sharedCompact
                        ? 'max-w-3xl sm:max-w-4xl aspect-video shadow-lg'
                        : 'max-w-[500px] aspect-video shadow-xl'
                )}
              >
                {videoStageContent}
              </div>

              {isFullscreen && !sharedCompact && (
                <PreVisSceneInfoPanel
                  display={sceneDisplay}
                  variant="fullscreen"
                  totalScenes={scenes.length}
                  playerLabels={playerLabels}
                />
              )}
              {sharedCompact && !landingEmbedToolbar && (
                <PreVisSceneInfoPanel
                  display={sceneDisplay}
                  variant="compact"
                  totalScenes={scenes.length}
                  className={landingWide ? 'max-w-4xl mx-auto' : 'max-w-2xl mx-auto'}
                  playerLabels={playerLabels}
                />
              )}

              <div
                className={cn(
                  'flex flex-col justify-between min-w-0 w-full',
                  isFullscreen
                    ? 'max-w-7xl mt-3'
                    : sharedCompact
                      ? cn('mx-auto mt-2', landingWide ? 'max-w-4xl' : 'max-w-2xl')
                      : 'flex-1'
                )}
              >
                {!isFullscreen && !isSharedView && (
                  <div>
                    <PreVisSceneInfoPanel
                      display={sceneDisplay}
                      variant="inline"
                      totalScenes={scenes.length}
                      playerLabels={playerLabels}
                    />
                    {!hasAudio && !useVideoForCurrentScene && (
                      <p className="text-xs text-amber-400 mt-2">No audio generated for this scene</p>
                    )}
                  </div>
                )}
                {playbackControlsBlock}
              </div>
            </>
          )}
        </div>        
        {/* Scene thumbnails row — hidden in screening tab (thumbnails live under video) */}
        {!useScreeningLayout && (
        <div className={cn(
          "px-4 pb-4",
          isFullscreen && "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8"
        )}>
          <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
            {(playbackMode === 'video' ? videoSceneIndices : scenes.map((_, idx) => idx)).map(
              (idx) => {
              const scene = scenes[idx]
              const hasSceneAudio = sceneHasPlayablePreVisAudio(scene, selectedLanguage)
              const thumbUrl = getScenePlayableThumbnailUrl(scene)

              return (
                <button
                  key={idx}
                  onClick={() => goToScene(idx)}
                  className={cn(
                    "flex-shrink-0 rounded overflow-hidden border-2 transition-all relative",
                    isFullscreen ? "w-24 h-14" : "w-16 h-10",
                    idx === currentSceneIndex
                      ? "border-emerald-500 ring-2 ring-emerald-500/30"
                      : "border-transparent hover:border-gray-500"
                  )}
                >
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={`Scene ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <span className="text-[10px] text-gray-400">{idx + 1}</span>
                    </div>
                  )}
                  
                  {/* Audio indicator dot */}
                  {hasSceneAudio && (
                    <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default AudioGalleryPlayer