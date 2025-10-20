'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Loader } from 'lucide-react'

interface PlaybackControlsProps {
  isPlaying: boolean
  currentSceneIndex: number
  totalScenes: number
  playbackSpeed: number
  onTogglePlay: () => void
  onPrevious: () => void
  onNext: () => void
  onJumpToScene: (sceneIndex: number) => void
  onSpeedChange: (speed: number) => void
  isLoading: boolean
}

export function PlaybackControls({
  isPlaying,
  currentSceneIndex,
  totalScenes,
  playbackSpeed,
  onTogglePlay,
  onPrevious,
  onNext,
  onJumpToScene,
  onSpeedChange,
  isLoading
}: PlaybackControlsProps) {
  const [isDragging, setIsDragging] = useState(false)
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

  const handleTimelineDrag = (e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const targetScene = Math.floor(percentage * totalScenes)
    onJumpToScene(Math.max(0, Math.min(targetScene, totalScenes - 1)))
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleTimelineDrag)
      window.addEventListener('mouseup', () => setIsDragging(false))
      return () => {
        window.removeEventListener('mousemove', handleTimelineDrag)
        window.removeEventListener('mouseup', () => setIsDragging(false))
      }
    }
  }, [isDragging])

  const progress = totalScenes > 0 ? (currentSceneIndex / totalScenes) * 100 : 0

  return (
    <div className="p-6 space-y-4">
      {/* Timeline Scrubber */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400 font-medium min-w-[60px]">
          {currentSceneIndex + 1}/{totalScenes}
        </span>
        
        <div
          ref={timelineRef}
          className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer relative group"
          onClick={handleTimelineClick}
          onMouseDown={(e) => {
            setIsDragging(true)
            handleTimelineClick(e)
          }}
        >
          {/* Progress Bar */}
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
          
          {/* Scrubber Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-all group-hover:scale-125"
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

        <span className="text-sm text-gray-400 font-medium min-w-[40px] text-right">
          {playbackSpeed}x
        </span>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-6">
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          disabled={currentSceneIndex === 0}
          className="p-3 rounded-full hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Previous Scene (←)"
        >
          <SkipBack className="w-6 h-6" />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          disabled={isLoading}
          className="p-4 rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isLoading ? (
            <Loader className="w-8 h-8 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-8 h-8" />
          ) : (
            <Play className="w-8 h-8 ml-1" />
          )}
        </button>

        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={currentSceneIndex >= totalScenes - 1}
          className="p-3 rounded-full hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Next Scene (→)"
        >
          <SkipForward className="w-6 h-6" />
        </button>

        {/* Speed Control */}
        <div className="ml-4 flex items-center gap-2">
          <span className="text-sm text-gray-400">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="bg-gray-800 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {speedOptions.map(speed => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Keyboard Shortcut Hints */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <span>Space: Play/Pause</span>
        <span>←/→: Navigate</span>
        <span>V: Voices</span>
        <span>ESC: Exit</span>
      </div>
    </div>
  )
}

