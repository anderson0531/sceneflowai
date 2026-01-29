'use client'

import React, { useState } from 'react'
import {
  X,
  ArrowRight,
  Clock,
  Palette,
  Move
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { StreamScene, TransitionEffect, TransitionType } from '@/lib/types/finalCut'

// ============================================================================
// Types
// ============================================================================

export interface TransitionPanelProps {
  /** Scene to configure transition for */
  scene: StreamScene
  /** Callback to close panel */
  onClose: () => void
  /** Callback when transition is updated */
  onUpdate: (transition: TransitionEffect) => void
}

// ============================================================================
// Constants
// ============================================================================

const TRANSITION_OPTIONS: Array<{
  type: TransitionType
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    type: 'cut',
    label: 'Cut',
    description: 'Instant transition (no effect)',
    icon: <ArrowRight className="w-4 h-4" />
  },
  {
    type: 'crossfade',
    label: 'Cross Dissolve',
    description: 'Smooth blend between scenes',
    icon: <div className="w-4 h-4 bg-gradient-to-r from-gray-800 to-gray-500 rounded" />
  },
  {
    type: 'fade-to-black',
    label: 'Fade to Black',
    description: 'Fade out to black, then in',
    icon: <div className="w-4 h-4 bg-gray-900 rounded" />
  },
  {
    type: 'fade-from-black',
    label: 'Fade from Black',
    description: 'Scene fades in from black',
    icon: <div className="w-4 h-4 bg-gradient-to-r from-gray-900 to-gray-500 rounded" />
  },
  {
    type: 'dip-to-color',
    label: 'Dip to Color',
    description: 'Fade through a color',
    icon: <Palette className="w-4 h-4" />
  },
  {
    type: 'wipe',
    label: 'Wipe',
    description: 'Wipe from one side',
    icon: <div className="w-4 h-4 relative overflow-hidden rounded">
      <div className="absolute inset-y-0 left-0 w-1/2 bg-blue-500" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gray-700" />
    </div>
  },
  {
    type: 'slide',
    label: 'Slide',
    description: 'Slide in from a direction',
    icon: <Move className="w-4 h-4" />
  },
  {
    type: 'zoom',
    label: 'Zoom',
    description: 'Zoom transition effect',
    icon: <div className="w-4 h-4 rounded border-2 border-pink-500 flex items-center justify-center">
      <div className="w-2 h-2 bg-pink-500 rounded" />
    </div>
  }
]

const EASING_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In/Out' }
] as const

const DIRECTION_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' }
] as const

// ============================================================================
// TransitionPanel Component
// ============================================================================

export function TransitionPanel({
  scene,
  onClose,
  onUpdate
}: TransitionPanelProps) {
  const [transition, setTransition] = useState<TransitionEffect>(
    scene.transition || {
      type: 'cut',
      duration: 500,
      easingFunction: 'ease-in-out'
    }
  )
  
  const handleTypeChange = (type: TransitionType) => {
    setTransition(prev => ({
      ...prev,
      type,
      // Reset duration for cut
      duration: type === 'cut' ? 0 : prev.duration || 500
    }))
  }
  
  const handleDurationChange = (value: number[]) => {
    setTransition(prev => ({
      ...prev,
      duration: value[0]
    }))
  }
  
  const needsDirection = transition.type === 'wipe' || transition.type === 'slide'
  const needsColor = transition.type === 'dip-to-color'
  
  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-800 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="font-semibold text-white">Scene Transition</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Scene Info */}
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-400">Transition into:</p>
          <p className="text-gray-200 font-medium">Scene {scene.sceneNumber}</p>
          {scene.heading && (
            <p className="text-xs text-gray-500 mt-1">{scene.heading}</p>
          )}
        </div>
        
        {/* Transition Type */}
        <div className="space-y-2">
          <Label>Transition Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {TRANSITION_OPTIONS.map((option) => (
              <button
                key={option.type}
                onClick={() => handleTypeChange(option.type)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border text-left transition-colors",
                  transition.type === option.type
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-700 hover:border-gray-600 bg-gray-800"
                )}
              >
                <div className="flex-shrink-0 text-gray-400">
                  {option.icon}
                </div>
                <span className="text-sm text-gray-200">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Duration (not for cut) */}
        {transition.type !== 'cut' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Duration</Label>
              <span className="text-sm text-gray-400">
                {transition.duration}ms
              </span>
            </div>
            <Slider
              value={[transition.duration]}
              onValueChange={handleDurationChange}
              min={100}
              max={2000}
              step={50}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>100ms</span>
              <span>2000ms</span>
            </div>
          </div>
        )}
        
        {/* Easing */}
        {transition.type !== 'cut' && (
          <div className="space-y-2">
            <Label>Easing</Label>
            <div className="grid grid-cols-2 gap-2">
              {EASING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTransition(prev => ({
                    ...prev,
                    easingFunction: option.value
                  }))}
                  className={cn(
                    "p-2 rounded-lg border text-sm transition-colors",
                    transition.easingFunction === option.value
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800 text-gray-300"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Direction (for wipe/slide) */}
        {needsDirection && (
          <div className="space-y-2">
            <Label>Direction</Label>
            <div className="grid grid-cols-2 gap-2">
              {DIRECTION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTransition(prev => ({
                    ...prev,
                    direction: option.value
                  }))}
                  className={cn(
                    "p-2 rounded-lg border text-sm transition-colors",
                    transition.direction === option.value
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800 text-gray-300"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Color (for dip-to-color) */}
        {needsColor && (
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={transition.color || '#000000'}
                onChange={(e) => setTransition(prev => ({
                  ...prev,
                  color: e.target.value
                }))}
                className="w-10 h-10 rounded border border-gray-700 cursor-pointer"
              />
              <input
                type="text"
                value={transition.color || '#000000'}
                onChange={(e) => setTransition(prev => ({
                  ...prev,
                  color: e.target.value
                }))}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200"
                placeholder="#000000"
              />
            </div>
          </div>
        )}
        
        {/* Preview */}
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
              Transition Preview
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-800 flex gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={() => onUpdate(transition)}
          className="flex-1"
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
