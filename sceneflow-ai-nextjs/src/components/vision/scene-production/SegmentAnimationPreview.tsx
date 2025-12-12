'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Play, Pause, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { SegmentKeyframeSettings } from './types'
import { getKenBurnsConfigFromKeyframes, generateKenBurnsKeyframes } from '@/lib/animation/kenBurns'

interface SegmentAnimationPreviewProps {
  imageUrl: string
  duration: number
  keyframeSettings?: SegmentKeyframeSettings
  onClose?: () => void
  className?: string
}

// Default keyframe settings for when none are provided
const defaultKeyframeSettings: SegmentKeyframeSettings = {
  zoomStart: 1.0,
  zoomEnd: 1.1,
  panStartX: 0,
  panStartY: 0,
  panEndX: 0,
  panEndY: 0,
  easingType: 'smooth',
  direction: 'right',
  useAutoDetect: true,
}

export function SegmentAnimationPreview({
  imageUrl,
  duration,
  keyframeSettings = defaultKeyframeSettings,
  onClose,
  className,
}: SegmentAnimationPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [animationKey, setAnimationKey] = useState(0)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  // Get Ken Burns config from keyframe settings
  const kenBurnsConfig = useMemo(() => {
    return getKenBurnsConfigFromKeyframes(keyframeSettings, duration)
  }, [keyframeSettings, duration])

  // Generate unique animation name
  const animationName = `segmentPreview-${animationKey}`

  // Generate keyframes CSS
  const keyframesCSS = useMemo(() => {
    return generateKenBurnsKeyframes(animationName, kenBurnsConfig)
  }, [animationName, kenBurnsConfig])

  // Animation loop for time display
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    startTimeRef.current = performance.now() - (currentTime * 1000)

    const animate = (timestamp: number) => {
      const elapsed = (timestamp - startTimeRef.current) / 1000
      const loopedTime = elapsed % duration
      setCurrentTime(loopedTime)
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, duration])

  // Reset animation key when keyframe settings change
  useEffect(() => {
    setAnimationKey(prev => prev + 1)
    setCurrentTime(0)
    startTimeRef.current = performance.now()
  }, [keyframeSettings])

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const restart = () => {
    setAnimationKey(prev => prev + 1)
    setCurrentTime(0)
    startTimeRef.current = performance.now()
    setIsPlaying(true)
  }

  const formatTime = (seconds: number) => {
    return seconds.toFixed(1) + 's'
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-black", className)}>
      {/* Animation Keyframes */}
      <style jsx>{`
        ${keyframesCSS}
        
        .ken-burns-preview {
          animation: ${animationName} ${duration}s ${kenBurnsConfig.easing} infinite alternate;
          animation-play-state: ${isPlaying ? 'running' : 'paused'};
          transform-origin: center center;
          will-change: transform;
        }
      `}</style>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-20 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Preview Container */}
      <div className="relative aspect-video overflow-hidden">
        {imageUrl ? (
          <div
            key={animationKey}
            className="absolute inset-0 bg-cover bg-center ken-burns-preview"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: '120%',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <span className="text-gray-500 text-sm">No image available</span>
          </div>
        )}

        {/* Overlay gradient for controls visibility */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Playback Controls */}
        <div className="absolute bottom-0 inset-x-0 p-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlayPause}
            className="h-7 w-7 bg-white/20 hover:bg-white/30 text-white"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={restart}
            className="h-7 w-7 bg-white/20 hover:bg-white/30 text-white"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>

          {/* Time Display */}
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-white/80 font-mono min-w-[40px] text-right">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Animation Settings Badge */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-500/80 text-white font-medium">
            {keyframeSettings.direction || 'custom'}
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/80 text-white font-medium">
            {keyframeSettings.easingType}
          </span>
          {keyframeSettings.zoomEnd !== keyframeSettings.zoomStart && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/80 text-white font-medium">
              {keyframeSettings.zoomStart.toFixed(1)}x → {keyframeSettings.zoomEnd.toFixed(1)}x
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default SegmentAnimationPreview
