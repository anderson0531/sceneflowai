'use client'

import React, { useMemo, useCallback, useRef } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface TimelineRulerProps {
  /** Total duration in seconds */
  duration: number
  /** Pixels per second */
  pixelsPerSecond: number
  /** Current playhead time */
  currentTime: number
  /** Scroll position */
  scrollPosition: number
  /** Callback when ruler is clicked to seek */
  onSeek: (time: number) => void
}

// ============================================================================
// TimelineRuler Component
// ============================================================================

export function TimelineRuler({
  duration,
  pixelsPerSecond,
  currentTime,
  scrollPosition,
  onSeek
}: TimelineRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null)
  
  // Calculate tick interval based on zoom
  const { majorInterval, minorInterval } = useMemo(() => {
    if (pixelsPerSecond >= 100) {
      return { majorInterval: 1, minorInterval: 0.25 }
    } else if (pixelsPerSecond >= 50) {
      return { majorInterval: 5, minorInterval: 1 }
    } else if (pixelsPerSecond >= 25) {
      return { majorInterval: 10, minorInterval: 2 }
    } else {
      return { majorInterval: 30, minorInterval: 5 }
    }
  }, [pixelsPerSecond])
  
  // Generate tick marks
  const ticks = useMemo(() => {
    const result: Array<{ time: number; isMajor: boolean }> = []
    
    for (let time = 0; time <= duration; time += minorInterval) {
      const isMajor = time % majorInterval === 0
      result.push({ time, isMajor })
    }
    
    return result
  }, [duration, majorInterval, minorInterval])
  
  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    
    if (mins === 0) {
      return `${secs}s`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])
  
  // Handle click to seek
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!rulerRef.current) return
    
    const rect = rulerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollPosition
    const time = x / pixelsPerSecond
    
    onSeek(Math.max(0, Math.min(time, duration)))
  }, [pixelsPerSecond, scrollPosition, duration, onSeek])
  
  const totalWidth = duration * pixelsPerSecond
  
  return (
    <div 
      ref={rulerRef}
      className="relative h-8 bg-gray-900 border-b border-gray-800 cursor-pointer overflow-hidden"
      onClick={handleClick}
    >
      {/* Track label spacer */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gray-900 border-r border-gray-800 z-10" />
      
      {/* Ruler content */}
      <div 
        className="ml-32 relative h-full"
        style={{ width: totalWidth }}
      >
        {/* Tick marks */}
        {ticks.map(({ time, isMajor }) => {
          const left = time * pixelsPerSecond
          
          return (
            <div
              key={time}
              className="absolute top-0"
              style={{ left: `${left}px` }}
            >
              {/* Tick line */}
              <div
                className={`w-px ${isMajor ? 'h-4 bg-gray-500' : 'h-2 bg-gray-700'}`}
              />
              
              {/* Time label (major ticks only) */}
              {isMajor && (
                <span className="absolute top-4 left-1 text-xs text-gray-500 whitespace-nowrap">
                  {formatTime(time)}
                </span>
              )}
            </div>
          )
        })}
        
        {/* Playhead position indicator on ruler */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
          style={{ left: `${currentTime * pixelsPerSecond}px` }}
        >
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 transform rotate-45" />
        </div>
      </div>
    </div>
  )
}
