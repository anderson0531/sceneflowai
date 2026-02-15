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
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Globe, X, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { cn } from '@/lib/utils'
import { formatSceneHeading } from '@/lib/script/formatSceneHeading'

// Ken Burns animation configurations - different pan directions
const KEN_BURNS_CONFIGS = [
  { scale: 1.15, x: -5, y: -3 },   // Zoom in, pan left-up
  { scale: 1.12, x: 5, y: -2 },    // Zoom in, pan right-up
  { scale: 1.18, x: -3, y: 4 },    // Zoom in, pan left-down
  { scale: 1.14, x: 4, y: 3 },     // Zoom in, pan right-down
  { scale: 1.1, x: 0, y: -5 },     // Zoom in, pan up
  { scale: 1.16, x: 0, y: 4 },     // Zoom in, pan down
]

interface AudioGalleryPlayerProps {
  scenes: any[]
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  availableLanguages: string[]
  onClose?: () => void
}

interface AudioClip {
  id: string
  url: string
  startTime: number
  duration: number
  type: 'narration' | 'dialogue'
  label?: string
}

export function AudioGalleryPlayer({
  scenes,
  selectedLanguage,
  onLanguageChange,
  availableLanguages,
  onClose,
}: AudioGalleryPlayerProps) {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Ken Burns effect - pick a config per scene for variety
  const kenBurnsConfig = useMemo(() => {
    return KEN_BURNS_CONFIGS[currentSceneIndex % KEN_BURNS_CONFIGS.length]
  }, [currentSceneIndex])
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get current scene
  const currentScene = scenes[currentSceneIndex]
  
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
  
  // Build audio clips for current scene
  const audioClips = useMemo((): AudioClip[] => {
    if (!currentScene) return []
    
    const clips: AudioClip[] = []
    let currentStartTime = 0
    
    // Add narration clip
    const narrationUrl = currentScene.narrationAudio?.[selectedLanguage]?.url 
      || currentScene.narrationAudio?.en?.url 
      || currentScene.narrationAudioUrl
    const narrationDuration = currentScene.narrationAudio?.[selectedLanguage]?.duration
      || currentScene.narrationAudio?.en?.duration
      || currentScene.narrationDuration
      || 0
    
    if (narrationUrl) {
      clips.push({
        id: 'narration',
        url: narrationUrl,
        startTime: currentStartTime,
        duration: narrationDuration,
        type: 'narration',
        label: 'Narration'
      })
      currentStartTime += narrationDuration + 0.5 // 0.5s buffer between clips
    }
    
    // Add dialogue clips
    const dialogueAudio = currentScene.dialogueAudio?.[selectedLanguage] 
      || currentScene.dialogueAudio?.en 
      || []
    
    if (Array.isArray(dialogueAudio)) {
      dialogueAudio.forEach((d: any, idx: number) => {
        if (d.audioUrl || d.url) {
          clips.push({
            id: `dialogue-${idx}`,
            url: d.audioUrl || d.url,
            startTime: currentStartTime,
            duration: d.duration || 3,
            type: 'dialogue',
            label: d.character || `Dialogue ${idx + 1}`
          })
          currentStartTime += (d.duration || 3) + 0.3 // 0.3s buffer between dialogue lines
        }
      })
    }
    
    return clips
  }, [currentScene, selectedLanguage])
  
  // Total duration for current scene
  const sceneDuration = useMemo(() => {
    if (audioClips.length === 0) return 5 // Default 5s for scenes without audio
    const lastClip = audioClips[audioClips.length - 1]
    return lastClip.startTime + lastClip.duration
  }, [audioClips])
  
  // Current audio clip based on playback time
  const currentClip = useMemo(() => {
    return audioClips.find(clip => 
      currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration
    )
  }, [audioClips, currentTime])
  
  // Handle scene navigation
  const goToScene = useCallback((index: number) => {
    if (index >= 0 && index < scenes.length) {
      setCurrentSceneIndex(index)
      setCurrentTime(0)
      setIsPlaying(false)
      
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [scenes.length])
  
  const goToPrevScene = useCallback(() => {
    goToScene(currentSceneIndex - 1)
  }, [currentSceneIndex, goToScene])
  
  const goToNextScene = useCallback(() => {
    if (currentSceneIndex < scenes.length - 1) {
      goToScene(currentSceneIndex + 1)
      if (autoAdvance) {
        // Start playing next scene automatically
        setTimeout(() => setIsPlaying(true), 100)
      }
    } else {
      // End of all scenes
      setIsPlaying(false)
    }
  }, [currentSceneIndex, scenes.length, goToScene, autoAdvance])
  
  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }
    
    let lastTime = performance.now()
    
    const animate = () => {
      const now = performance.now()
      const delta = (now - lastTime) / 1000
      lastTime = now
      
      setCurrentTime(prev => {
        const newTime = prev + delta
        
        // Check if scene has ended
        if (newTime >= sceneDuration) {
          if (autoAdvance && currentSceneIndex < scenes.length - 1) {
            // Go to next scene
            setTimeout(() => goToNextScene(), 100)
          } else {
            setIsPlaying(false)
          }
          return sceneDuration
        }
        
        return newTime
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, sceneDuration, autoAdvance, currentSceneIndex, scenes.length, goToNextScene])
  
  // Sync audio element with playback state
  useEffect(() => {
    if (!currentClip || !audioRef.current) return
    
    const audio = audioRef.current
    const clipLocalTime = currentTime - currentClip.startTime
    
    // Only update if audio source changed
    if (audio.src !== currentClip.url) {
      audio.src = currentClip.url
      audio.currentTime = Math.max(0, clipLocalTime)
    }
    
    // Sync playback state
    if (isPlaying && audio.paused) {
      audio.play().catch(() => {})
    } else if (!isPlaying && !audio.paused) {
      audio.pause()
    }
    
    // Apply volume
    audio.volume = isMuted ? 0 : volume
    
    // Drift correction
    const drift = Math.abs(audio.currentTime - clipLocalTime)
    if (drift > 0.3 && !audio.paused) {
      audio.currentTime = clipLocalTime
    }
  }, [currentClip, currentTime, isPlaying, volume, isMuted])
  
  // Stop audio when clip ends
  useEffect(() => {
    if (!currentClip && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
    }
  }, [currentClip])
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Get scene heading
  const sceneHeading = typeof currentScene?.heading === 'string' 
    ? currentScene.heading 
    : currentScene?.heading?.text
  const formattedHeading = formatSceneHeading(sceneHeading) || sceneHeading || 'Untitled Scene'
  
  // Check if current scene has audio
  const hasAudio = audioClips.length > 0
  
  // Language display names
  const getLanguageName = (code: string) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code)
    return lang?.name || code.toUpperCase()
  }
  
  // Calculate Ken Burns progress (0 to 1)
  const kenBurnsProgress = sceneDuration > 0 ? currentTime / sceneDuration : 0
  
  return (
    <TooltipProvider>
      <div 
        ref={containerRef}
        className={cn(
          "rounded-xl border border-emerald-500/30 bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/20 overflow-hidden",
          isFullscreen && "fixed inset-0 z-50 rounded-none border-none flex flex-col"
        )}
      >
        {/* Header with language selector */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-white">Audio Preview</span>
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
              Scene {currentSceneIndex + 1} of {scenes.length}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Language selector */}
            {availableLanguages.length > 1 && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <Select value={selectedLanguage} onValueChange={onLanguageChange}>
                  <SelectTrigger className="w-32 h-8 bg-gray-800 border-gray-700 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map(lang => (
                      <SelectItem key={lang} value={lang}>
                        {getLanguageName(lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        
        {/* Main content area */}
        <div className={cn(
          "flex gap-4 p-4",
          isFullscreen && "flex-1 flex-col items-center justify-center"
        )}>
          {/* Scene image with Ken Burns effect */}
          <div className={cn(
            "relative rounded-lg overflow-hidden bg-black flex-shrink-0",
            isFullscreen 
              ? "w-[75vw] max-w-6xl aspect-video" 
              : "w-64 aspect-video"
          )}>
            {currentScene?.imageUrl ? (
              <img
                src={currentScene.imageUrl}
                alt={`Scene ${currentSceneIndex + 1}`}
                className="w-full h-full object-cover"
                style={{
                  transform: isPlaying 
                    ? `scale(${1 + (kenBurnsConfig.scale - 1) * kenBurnsProgress}) translate(${kenBurnsConfig.x * kenBurnsProgress}%, ${kenBurnsConfig.y * kenBurnsProgress}%)`
                    : 'scale(1) translate(0%, 0%)',
                  transition: isPlaying ? 'none' : 'transform 0.3s ease-out',
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <span className="text-sm">No image</span>
              </div>
            )}
            
            {/* Current clip label overlay */}
            {currentClip && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/70 rounded px-2 py-1">
                <span className={cn("text-white", isFullscreen ? "text-base" : "text-xs")}>{currentClip.label}</span>
              </div>
            )}
          </div>
          
          {/* Scene title below video in fullscreen */}
          {isFullscreen && (
            <div className="w-[75vw] max-w-6xl mt-3 text-center">
              <span className="text-white/60 text-sm">SCENE {currentSceneIndex + 1}</span>
              <h2 className="text-white text-xl font-semibold truncate">{formattedHeading}</h2>
            </div>
          )}
          
          {/* Playback controls and info */}
          <div className={cn(
            "flex flex-col justify-between min-w-0",
            isFullscreen ? "w-[75vw] max-w-6xl mt-4" : "flex-1"
          )}>
            {/* Scene info - hide in fullscreen (shown below video) */}
            {!isFullscreen && (
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
            <div className={cn("mt-3", isFullscreen && "mt-0")}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 w-10">{formatTime(currentTime)}</span>
                <div 
                  className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer overflow-hidden"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const percent = x / rect.width
                    setCurrentTime(percent * sceneDuration)
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
              <div className="flex items-center justify-between">
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
                    onClick={() => setIsPlaying(!isPlaying)}
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
                        onClick={goToNextScene}
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
                
                {/* Volume control */}
                <div className="flex items-center gap-2">
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
                (scene.dialogueAudio?.en && scene.dialogueAudio.en.length > 0)
              
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
        
        {/* Hidden audio element */}
        <audio ref={audioRef} preload="auto" />
      </div>
    </TooltipProvider>
  )
}

export default AudioGalleryPlayer