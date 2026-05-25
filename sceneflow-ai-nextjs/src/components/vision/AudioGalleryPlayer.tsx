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
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Globe, X, Maximize, Minimize, Share2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { cn } from '@/lib/utils'
import { formatSceneHeading } from '@/lib/script/formatSceneHeading'
import {
  getEstablishingFrameUrl,
} from '@/lib/storyboard/types'
import { useStoryboardPlayback } from '@/hooks/useStoryboardPlayback'
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
  GALLERY_KEN_BURNS_CYCLE_DURATION,
  type GalleryImageEffectPrefs,
} from '@/lib/storyboard/storyboardImageEffects'
import { StoryboardImageEffectControl } from '@/components/vision/StoryboardImageEffectControl'

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
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
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
}: AudioGalleryPlayerProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [visualFrameKey, setVisualFrameKey] = useState(0)
  const kenBurnsCycleOrigin = useRef(0)
  const lastImageUrlRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoAdvanceRef = useRef(autoAdvance)
  autoAdvanceRef.current = autoAdvance

  const [imageEffectPrefs, setImageEffectPrefs] = useState<GalleryImageEffectPrefs>(() =>
    loadGalleryImageEffectPrefs()
  )
  const [crossfadeFromUrl, setCrossfadeFromUrl] = useState<string | null>(null)

  const updateImageEffectPrefs = useCallback((prefs: GalleryImageEffectPrefs) => {
    setImageEffectPrefs(prefs)
    saveGalleryImageEffectPrefs(prefs)
  }, [])

  const currentScene = scenes[currentSceneIndex]

  const playAfterSceneChangeRef = useRef<() => void>(() => {})

  const goToNextScene = useCallback(() => {
    setCurrentSceneIndex((prev) => {
      if (prev >= scenes.length - 1) return prev
      const next = prev + 1
      onSceneChange?.(next)
      return next
    })
  }, [scenes.length, onSceneChange])

  const handlePlaybackEnd = useCallback(() => {
    if (autoAdvanceRef.current && currentSceneIndex < scenes.length - 1) {
      setTimeout(() => {
        goToNextScene()
        setTimeout(() => playAfterSceneChangeRef.current(), 100)
      }, 100)
    }
  }, [currentSceneIndex, scenes.length, goToNextScene])

  const playback = useStoryboardPlayback({
    scene: currentScene,
    language: selectedLanguage,
    volume,
    isMuted,
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

  const displayImageUrl =
    currentVisualFrame?.imageUrl ?? getEstablishingFrameUrl(currentScene)

  const speakerLabel = currentVisualFrame?.character ?? currentVisualFrame?.label
  const currentTimeRef = useRef(currentTime)
  currentTimeRef.current = currentTime
  
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

  // Reset Ken Burns direction when the visible frame changes
  useEffect(() => {
    const next =
      currentSceneIndex * 100 +
      (currentVisualFrame?.dialogueIndex ?? 0) +
      (currentVisualFrame?.frameType === 'establishing' ? 0 : 50)
    setVisualFrameKey(prev => (prev === next ? prev : next))
  }, [currentSceneIndex, currentVisualFrame?.clipId, currentVisualFrame?.dialogueIndex, currentVisualFrame?.frameType])

  // Reset Ken Burns cycle phase when dialogue frame changes
  useEffect(() => {
    kenBurnsCycleOrigin.current = currentTimeRef.current
  }, [currentSceneIndex, currentVisualFrame?.clipId])

  // Crossfade between dialogue frames
  useEffect(() => {
    if (!displayImageUrl) {
      lastImageUrlRef.current = null
      setCrossfadeFromUrl(null)
      return
    }
    const prev = lastImageUrlRef.current
    if (
      prev &&
      prev !== displayImageUrl &&
      imageEffectPrefs.mode === 'crossfade'
    ) {
      setCrossfadeFromUrl(prev)
      const timer = setTimeout(() => setCrossfadeFromUrl(null), CROSSFADE_DURATION_MS)
      lastImageUrlRef.current = displayImageUrl
      return () => clearTimeout(timer)
    }
    lastImageUrlRef.current = displayImageUrl
  }, [displayImageUrl, imageEffectPrefs.mode])
  
  const goToScene = useCallback(
    (index: number) => {
      if (index >= 0 && index < scenes.length) {
        pause()
        reset()
        setCurrentSceneIndex(index)
        onSceneChange?.(index)
      }
    },
    [scenes.length, pause, reset, onSceneChange]
  )

  const goToPrevScene = useCallback(() => {
    goToScene(currentSceneIndex - 1)
  }, [currentSceneIndex, goToScene])

  const sceneHeading =
    typeof currentScene?.heading === 'string'
      ? currentScene.heading
      : currentScene?.heading?.text
  const formattedHeading = formatSceneHeading(sceneHeading) || sceneHeading || 'Untitled Scene'

  const hasAudio =
    hasVoiceAudio ||
    !!currentScene?.musicAudio ||
    !!(currentScene?.music as { url?: string } | undefined)?.url ||
    (Array.isArray(currentScene?.sfxAudio) && currentScene!.sfxAudio.length > 0)

  // Image motion transform
  const kenBurnsProgress = useMemo(() => {
    const cycleTime = currentTime - kenBurnsCycleOrigin.current
    return computeKenBurnsProgress(cycleTime, GALLERY_KEN_BURNS_CYCLE_DURATION)
  }, [currentTime, visualFrameKey])

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

  const motionControl = (
    <StoryboardImageEffectControl
      prefs={imageEffectPrefs}
      onChange={updateImageEffectPrefs}
      compact={sharedCompact}
    />
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
          isFullscreen && "fixed inset-0 z-50 rounded-none border-none flex flex-col"
        )}
      >
        {/* Header with language selector — hidden in landing embed */}
        {!embedMode && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-white">Storyboard Player</span>
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
              Scene {currentSceneIndex + 1} of {scenes.length}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Share button */}
            {onShare && !isSharedView && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="h-7 text-xs bg-gray-800 border-gray-700 hover:bg-gray-700 hover:text-white"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Share
              </Button>
            )}
            
            {/* Language selector */}
            {availableLanguages.length > 1 && (
              <div className="flex items-center gap-2">
                <GroupedLanguageSelector
                  value={selectedLanguage}
                  onValueChange={onLanguageChange}
                  filterCodes={availableLanguages}
                  size="sm"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            )}
            
            {/* Auto-advance toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setAutoAdvance(!autoAdvance)}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium transition-colors",
                    autoAdvance 
                      ? "bg-emerald-600 text-white" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
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
            
            {/* Fullscreen toggle */}
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
            
            {/* Close button */}
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
        )}
        
        {/* Main content area */}
        <div
          className={cn(
            'flex gap-4 p-4',
            isFullscreen && 'flex-1 flex-col items-center justify-center w-full',
            sharedCompact && 'flex-col items-center w-full gap-3 py-2 px-2 sm:px-4',
            landingWide ? 'max-w-none mx-0' : sharedCompact && 'max-w-4xl mx-auto'
          )}
        >
          {/* Scene image with Ken Burns effect */}
          <div className={cn(
            "relative rounded-lg overflow-hidden bg-black flex-shrink-0 w-full",
            isFullscreen 
              ? "max-w-7xl aspect-video" 
              : landingWide
                ? "max-w-none aspect-video shadow-lg"
                : sharedCompact
                  ? "max-w-3xl sm:max-w-4xl aspect-video shadow-lg"
                  : "max-w-[500px] aspect-video shadow-xl"
          )}>
            {displayImageUrl ? (
              <>
                {crossfadeFromUrl && imageEffectPrefs.mode === 'crossfade' && (
                  renderSceneImage(crossfadeFromUrl, 'previous')
                )}
                {renderSceneImage(displayImageUrl, 'current')}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <span className="text-sm">No image</span>
              </div>
            )}
            
            {/* Watermark overlay */}
            <div className="absolute top-4 right-4 pointer-events-none opacity-60 mix-blend-overlay">
              <span className="text-white font-bold tracking-widest uppercase" style={{ fontSize: isFullscreen ? '1.5rem' : '0.875rem' }}>
                SceneFlow AI Studio
              </span>
            </div>

            {/* Language pill — landing embed only (header removed) */}
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
            
            {/* Current clip label overlay — speaker name only (no dialogue caption) */}
            {speakerLabel && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/70 rounded px-2 py-1">
                <span className={cn("text-white", isFullscreen && !sharedCompact ? "text-base" : "text-xs")}>
                  {speakerLabel}
                </span>
              </div>
            )}
          </div>
          
          {/* Scene title below video in fullscreen or shared view */}
          {isFullscreen && !sharedCompact && (
            <div className={cn("mt-4 text-center w-full max-w-7xl")}>
              <span className="text-white/50 text-xs uppercase tracking-wide font-semibold">SCENE {currentSceneIndex + 1}</span>
              <h2 className="text-white text-lg font-medium truncate mt-1">{formattedHeading}</h2>
            </div>
          )}
          {sharedCompact && (
            <div className={cn('text-center w-full px-1', landingWide ? 'max-w-4xl mx-auto' : 'max-w-2xl mx-auto')}>
              <span className="text-white/45 text-[10px] uppercase tracking-wider font-medium">
                Scene {currentSceneIndex + 1}
              </span>
              <p className="text-white text-sm sm:text-base font-medium leading-snug mt-1 line-clamp-3 break-words">
                {formattedHeading}
              </p>
            </div>
          )}
          
          {/* Playback controls and info */}
          <div className={cn(
            "flex flex-col justify-between min-w-0 w-full",
            isFullscreen ? "max-w-7xl mt-3" : sharedCompact ? cn('mx-auto mt-2', landingWide ? 'max-w-4xl' : 'max-w-2xl') : "flex-1"
          )}>
            {/* Scene info - hide in fullscreen / shared compact (heading shown above) */}
            {(!isFullscreen && !isSharedView) && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  SCENE {currentSceneIndex + 1}
                </h4>
                <p className="text-sm text-gray-300 truncate">{formattedHeading}</p>
                {!hasAudio && (
                  <p className="text-xs text-amber-400 mt-2">No audio generated for this scene</p>
                )}
              </div>
            )}
            
            {/* Progress bar */}
            <div className={cn("mt-3", (isFullscreen || sharedCompact) && "mt-0")}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 w-10">{formatTime(currentTime)}</span>
                <div 
                  className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer overflow-hidden"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const percent = x / rect.width
                    seekTo(percent * sceneDuration)
                  }}
                >
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-100"
                    style={{ width: `${(currentTime / sceneDuration) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-10">{formatTime(sceneDuration)}</span>
              </div>
              
              {/* Controls row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {/* Previous scene */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={goToPrevScene}
                        disabled={currentSceneIndex === 0}
                        className={cn(
                          "rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
                          isFullscreen ? "p-3" : "p-2"
                        )}
                      >
                        <SkipBack className={cn("text-white", isFullscreen ? "w-5 h-5" : "w-4 h-4")} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Previous scene</TooltipContent>
                  </Tooltip>
                  
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlayback}
                    className={cn(
                      "rounded-full bg-emerald-600 hover:bg-emerald-500 transition-colors",
                      isFullscreen ? "p-4" : "p-3"
                    )}
                  >
                    {isPlaying ? (
                      <Pause className={cn("text-white", isFullscreen ? "w-6 h-6" : "w-5 h-5")} />
                    ) : (
                      <Play className={cn("text-white ml-0.5", isFullscreen ? "w-6 h-6" : "w-5 h-5")} />
                    )}
                  </button>
                  
                  {/* Next scene */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => goToScene(currentSceneIndex + 1)}
                        disabled={currentSceneIndex === scenes.length - 1}
                        className={cn(
                          "rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
                          isFullscreen ? "p-3" : "p-2"
                        )}
                      >
                        <SkipForward className={cn("text-white", isFullscreen ? "w-5 h-5" : "w-4 h-4")} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Next scene</TooltipContent>
                  </Tooltip>
                </div>
                
                {/* Volume + embed view controls */}
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {(sharedCompact || isFullscreen) && motionControl}
                  {embedMode && (
                    <>
                      <span className="text-[10px] text-gray-500 tabular-nums hidden sm:inline">
                        {currentSceneIndex + 1}/{scenes.length}
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
                          <TooltipContent>Open full storyboard player</TooltipContent>
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
                  <Slider
                    value={[volume * 100]}
                    onValueChange={([val]) => setVolume(val / 100)}
                    max={100}
                    step={1}
                    className="w-20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scene thumbnails row */}
        <div className={cn(
          "px-4 pb-4",
          isFullscreen && "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8"
        )}>
          <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
            {scenes.map((scene, idx) => {
              const hasSceneAudio = scene.narrationAudio?.en?.url || scene.narrationAudioUrl || 
                (scene.dialogueAudio?.en && scene.dialogueAudio.en.length > 0) ||
                scene.musicAudio || scene.music?.url ||
                (Array.isArray(scene.sfxAudio) && scene.sfxAudio.length > 0)
              
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
                  {scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
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
      </div>
    </TooltipProvider>
  )
}

export default AudioGalleryPlayer