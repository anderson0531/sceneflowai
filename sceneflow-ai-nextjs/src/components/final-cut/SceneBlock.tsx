'use client'

import React, { useMemo } from 'react'
import { Film, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StreamScene, TimelineEditMode, TransitionType } from '@/lib/types/finalCut'

// ============================================================================
// Types
// ============================================================================

export interface SceneBlockProps {
  /** Scene data */
  scene: StreamScene
  /** Scene index in timeline */
  index: number
  /** Pixels per second for timeline scaling */
  pixelsPerSecond: number
  /** Whether this scene is selected */
  isSelected: boolean
  /** Callback when scene is clicked */
  onSelect: () => void
  /** Callback when transition handle is clicked */
  onTransitionClick: () => void
  /** Current edit mode */
  editMode: TimelineEditMode
}

// ============================================================================
// Constants
// ============================================================================

const TRANSITION_COLORS: Record<TransitionType, string> = {
  'cut': 'bg-gray-600',
  'crossfade': 'bg-purple-500',
  'fade-to-black': 'bg-gray-900',
  'fade-from-black': 'bg-gray-900',
  'dip-to-color': 'bg-amber-500',
  'wipe': 'bg-blue-500',
  'slide': 'bg-cyan-500',
  'zoom': 'bg-pink-500'
}

// ============================================================================
// SceneBlock Component
// ============================================================================

export function SceneBlock({
  scene,
  index,
  pixelsPerSecond,
  isSelected,
  onSelect,
  onTransitionClick,
  editMode
}: SceneBlockProps) {
  // Calculate position and width
  const left = scene.startTime * pixelsPerSecond
  const width = (scene.endTime - scene.startTime) * pixelsPerSecond
  
  // Get thumbnail from first segment
  const thumbnail = useMemo(() => {
    if (scene.segments.length > 0) {
      return scene.segments[0].assetUrl
    }
    return null
  }, [scene.segments])
  
  // Transition handle width
  const transitionWidth = scene.transition?.duration 
    ? (scene.transition.duration / 1000) * pixelsPerSecond 
    : 0
  
  return (
    <div
      className={cn(
        "absolute top-1 bottom-1 rounded overflow-hidden cursor-pointer transition-all",
        "border-2",
        isSelected 
          ? "border-blue-500 ring-2 ring-blue-500/30 z-10" 
          : "border-gray-600 hover:border-gray-500"
      )}
      style={{ 
        left: `${left}px`, 
        width: `${width}px`,
        minWidth: '40px'
      }}
      onClick={onSelect}
    >
      {/* Thumbnail Background */}
      {thumbnail ? (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnail})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-indigo-900/50" />
      )}
      
      {/* Scene Info Overlay */}
      <div className="relative h-full flex flex-col justify-between p-1.5 z-10">
        {/* Top: Scene number */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-white bg-black/50 px-1.5 py-0.5 rounded">
            {scene.sceneNumber}
          </span>
        </div>
        
        {/* Bottom: Heading (if space allows) */}
        {width > 100 && (
          <div className="text-xs text-white/80 truncate">
            {scene.heading || `Scene ${scene.sceneNumber}`}
          </div>
        )}
      </div>
      
      {/* Transition Handle (In) */}
      {scene.transition && index > 0 && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 cursor-ew-resize",
            TRANSITION_COLORS[scene.transition.type],
            "opacity-60 hover:opacity-100 transition-opacity"
          )}
          style={{ width: `${Math.max(transitionWidth, 4)}px` }}
          onClick={(e) => {
            e.stopPropagation()
            onTransitionClick()
          }}
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-white/30" />
        </div>
      )}
      
      {/* Segment Dividers */}
      {scene.segments.length > 1 && (
        <div className="absolute inset-0 pointer-events-none">
          {scene.segments.slice(1).map((segment, i) => {
            const segmentLeft = ((segment.startTime - scene.startTime) / (scene.endTime - scene.startTime)) * 100
            return (
              <div
                key={segment.id}
                className="absolute top-0 bottom-0 w-px bg-white/20"
                style={{ left: `${segmentLeft}%` }}
              />
            )
          })}
        </div>
      )}
      
      {/* Edit Mode Indicators */}
      {editMode === 'trim' && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500/50 cursor-ew-resize hover:bg-blue-500/80" />
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-blue-500/50 cursor-ew-resize hover:bg-blue-500/80" />
        </>
      )}
      
      {editMode === 'razor' && (
        <div className="absolute inset-0 cursor-crosshair" />
      )}
    </div>
  )
}
