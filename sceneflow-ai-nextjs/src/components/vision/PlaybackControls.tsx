'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Loader, Music, PlayCircle, Sparkles, ChevronDown, ChevronUp, AudioLines, VolumeX } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PlaybackControlsProps {
  isPlaying: boolean
  currentSceneIndex: number
  totalScenes: number
  playbackSpeed: number
  musicVolume: number
  autoAdvance: boolean
  kenBurnsIntensity?: 'subtle' | 'medium' | 'dramatic'
  narrationEnabled?: boolean
  onTogglePlay: () => void
  onPrevious: () => void
  onNext: () => void
  onJumpToScene: (sceneIndex: number) => void
  onSpeedChange: (speed: number) => void
  onMusicVolumeChange: (volume: number) => void
  onAutoAdvanceToggle: () => void
  onKenBurnsIntensityChange?: (intensity: 'subtle' | 'medium' | 'dramatic') => void
  onNarrationToggle?: () => void
  isLoading: boolean
}

export function PlaybackControls({
  isPlaying,
  currentSceneIndex,
  totalScenes,
  playbackSpeed,
  musicVolume,
  autoAdvance,
  kenBurnsIntensity = 'medium',
  narrationEnabled = true,
  onTogglePlay,
  onPrevious,
  onNext,
  onJumpToScene,
  onSpeedChange,
  onMusicVolumeChange,
  onAutoAdvanceToggle,
  onKenBurnsIntensityChange,
  onNarrationToggle,
  isLoading
}: PlaybackControlsProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const targetScene = Math.floor(percentage * totalScenes)
    onJumpToScene(Math.max(0, Math.min(targetScene, totalScenes - 1)))
  }

  const handleTimelineDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !timelineRef.current) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const rect = timelineRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const targetScene = Math.floor(percentage * totalScenes)
    onJumpToScene(Math.max(0, Math.min(targetScene, totalScenes - 1)))
  }, [isDragging, totalScenes, onJumpToScene])

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent | TouchEvent) => handleTimelineDrag(e)
      const handleEnd = () => setIsDragging(false)
      
      window.addEventListener('mousemove', handleMove as EventListener)
      window.addEventListener('touchmove', handleMove as EventListener, { passive: false })
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchend', handleEnd)
      
      return () => {
        window.removeEventListener('mousemove', handleMove as EventListener)
        window.removeEventListener('touchmove', handleMove as EventListener)
        window.removeEventListener('mouseup', handleEnd)
        window.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isDragging, handleTimelineDrag])

  const progress = totalScenes > 0 ? (currentSceneIndex / totalScenes) * 100 : 0

  return (
    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {/* Timeline Scrubber */}
      <div className="flex items-center gap-2 sm:gap-4">
        <span className="text-xs sm:text-sm text-gray-400 font-medium min-w-[50px] sm:min-w-[60px]">
          {currentSceneIndex + 1}/{totalScenes}
        </span>
        
        <div
          ref={timelineRef}
          className="flex-1 h-2.5 sm:h-2 bg-gray-700 rounded-full cursor-pointer relative group touch-none"
          onClick={handleTimelineClick}
          onMouseDown={(e) => {
            setIsDragging(true)
            handleTimelineClick(e)
          }}
          onTouchStart={(e) => {
            setIsDragging(true)
            const touch = e.touches[0]
            const rect = timelineRef.current?.getBoundingClientRect()
            if (rect) {
              const x = touch.clientX - rect.left
              const percentage = Math.max(0, Math.min(1, x / rect.width))
              const targetScene = Math.floor(percentage * totalScenes)
              onJumpToScene(Math.max(0, Math.min(targetScene, totalScenes - 1)))
            }
          }}
        >
          {/* Progress Bar */}
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
          
          {/* Scrubber Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 sm:w-4 sm:h-4 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-all group-hover:scale-125 touch-none"
            style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
          />

          {/* Scene Markers */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: totalScenes }).map((_, idx) => (
              <div
                key={idx}
                className="flex-1 border-r border-gray-600/50 last:border-r-0"
              />
            ))}
          </div>
        </div>

        <span className="text-xs sm:text-sm text-gray-400 font-medium min-w-[35px] sm:min-w-[40px] text-right hidden sm:block">
          {playbackSpeed}x
        </span>
      </div>

      {/* Primary Playback Controls */}
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          disabled={currentSceneIndex === 0}
          className="p-2.5 sm:p-3 rounded-full hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Previous Scene (←)"
          aria-label="Previous scene"
        >
          <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          disabled={isLoading}
          className="p-3.5 sm:p-4 rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg min-h-[56px] min-w-[56px] sm:min-h-[64px] sm:min-w-[64px] flex items-center justify-center"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <Loader className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-7 h-7 sm:w-8 sm:h-8" />
          ) : (
            <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-0.5 sm:ml-1" />
          )}
        </button>

        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={currentSceneIndex >= totalScenes - 1}
          className="p-2.5 sm:p-3 rounded-full hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Next Scene (→)"
          aria-label="Next scene"
        >
          <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Secondary Controls Row - Mobile: Collapsible, Desktop: Always visible */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-400">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="bg-gray-800 text-white text-xs sm:text-sm rounded-lg px-2 sm:px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-h-[36px] sm:min-h-[32px]"
          >
            {speedOptions.map(speed => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </div>

        {/* Mobile: Collapsible Advanced Controls */}
        <div className="sm:hidden w-full">
          <button
            onClick={() => setShowAdvancedControls(!showAdvancedControls)}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-white py-2"
            aria-label={showAdvancedControls ? 'Hide advanced controls' : 'Show advanced controls'}
          >
            {showAdvancedControls ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Hide Advanced</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Show Advanced</span>
              </>
            )}
          </button>
          {showAdvancedControls && (
            <div className="mt-2 space-y-3 pt-3 border-t border-gray-700">
              {/* Narration Toggle */}
              {onNarrationToggle && (
                <button
                  onClick={onNarrationToggle}
                  className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-all min-h-[44px] ${
                    narrationEnabled 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                  }`}
                  title={narrationEnabled ? 'Narration: ON' : 'Narration: OFF'}
                  aria-label={narrationEnabled ? 'Disable narration' : 'Enable narration'}
                >
                  {narrationEnabled ? (
                    <AudioLines className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                  <span className="text-xs">Narration: {narrationEnabled ? 'ON' : 'OFF'}</span>
                </button>
              )}

              {/* Music Volume Control */}
              <div className="flex items-center gap-3">
                <Music className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  title={`Music Volume: ${Math.round(musicVolume * 100)}%`}
                />
                <span className="text-xs text-gray-400 w-10 text-right">{Math.round(musicVolume * 100)}%</span>
              </div>

              {/* Pan Intensity Control */}
              {onKenBurnsIntensityChange && (
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Pan:</span>
                  <Select value={kenBurnsIntensity} onValueChange={(value: 'subtle' | 'medium' | 'dramatic') => onKenBurnsIntensityChange(value)}>
                    <SelectTrigger className="flex-1 h-9 bg-gray-800 text-white text-xs border border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtle">Subtle</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="dramatic">Dramatic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Auto-Advance Toggle */}
              <button
                onClick={onAutoAdvanceToggle}
                className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-all min-h-[44px] ${
                  autoAdvance 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                }`}
                title={autoAdvance ? 'Auto-Advance: ON' : 'Auto-Advance: OFF'}
                aria-label={autoAdvance ? 'Disable auto-advance' : 'Enable auto-advance'}
              >
                <PlayCircle className="w-4 h-4" />
                <span className="text-xs">Auto-Advance: {autoAdvance ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Desktop: Always visible advanced controls */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Narration Toggle */}
          {onNarrationToggle && (
            <button
              onClick={onNarrationToggle}
              className={`p-2 rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center ${
                narrationEnabled 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
              }`}
              title={narrationEnabled ? 'Narration: ON' : 'Narration: OFF'}
              aria-label={narrationEnabled ? 'Disable narration' : 'Enable narration'}
            >
              {narrationEnabled ? (
                <AudioLines className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Music Volume Control */}
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
              className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              title={`Music Volume: ${Math.round(musicVolume * 100)}%`}
            />
            <span className="text-xs text-gray-400 w-8">{Math.round(musicVolume * 100)}%</span>
          </div>

          {/* Pan Intensity Control */}
          {onKenBurnsIntensityChange && (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Pan:</span>
              <Select value={kenBurnsIntensity} onValueChange={(value: 'subtle' | 'medium' | 'dramatic') => onKenBurnsIntensityChange(value)}>
                <SelectTrigger className="w-24 h-8 bg-gray-800 text-white text-sm border border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subtle">Subtle</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="dramatic">Dramatic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Auto-Advance Toggle */}
          <button
            onClick={onAutoAdvanceToggle}
            className={`p-2 rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center ${
              autoAdvance 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
            }`}
            title={autoAdvance ? 'Auto-Advance: ON' : 'Auto-Advance: OFF'}
            aria-label={autoAdvance ? 'Disable auto-advance' : 'Enable auto-advance'}
          >
            <PlayCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Keyboard Shortcut Hints - Desktop only */}
      <div className="hidden sm:flex items-center justify-center gap-4 text-xs text-gray-500">
        <span>Space: Play/Pause</span>
        <span>←/→: Navigate</span>
        <span>V: Voices</span>
        <span>ESC: Exit</span>
      </div>
    </div>
  )
}

