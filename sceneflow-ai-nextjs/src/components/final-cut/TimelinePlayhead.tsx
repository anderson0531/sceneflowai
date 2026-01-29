'use client'

import React from 'react'

// ============================================================================
// Types
// ============================================================================

export interface TimelinePlayheadProps {
  /** Current time in seconds */
  currentTime: number
  /** Pixels per second */
  pixelsPerSecond: number
  /** Height of playhead (CSS value) */
  height: string | number
}

// ============================================================================
// TimelinePlayhead Component
// ============================================================================

export function TimelinePlayhead({
  currentTime,
  pixelsPerSecond,
  height
}: TimelinePlayheadProps) {
  const left = 128 + (currentTime * pixelsPerSecond) // 128px = track label width (w-32)
  
  return (
    <div
      className="absolute top-0 z-30 pointer-events-none"
      style={{ 
        left: `${left}px`, 
        height: typeof height === 'number' ? `${height}px` : height 
      }}
    >
      {/* Playhead line */}
      <div className="w-0.5 h-full bg-red-500" />
      
      {/* Playhead handle */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2">
        <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-red-400 shadow-lg" />
      </div>
    </div>
  )
}
