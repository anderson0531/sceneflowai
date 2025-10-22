'use client'

import React, { useState } from 'react'
import { Zap, Sparkles, Info, Key } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ImageQualitySelectorProps {
  value: 'max' | 'auto'
  onChange: (quality: 'max' | 'auto') => void
  disabled?: boolean
}

export function ImageQualitySelector({ value, onChange, disabled = false }: ImageQualitySelectorProps) {
  const [showComparison, setShowComparison] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      {/* Main Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Image Quality:
        </label>
        
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => onChange('auto')}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              value === 'auto'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Zap className="w-4 h-4" />
            Auto
          </button>
          
          <button
            onClick={() => onChange('max')}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              value === 'max'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Sparkles className="w-4 h-4" />
            Max
          </button>
        </div>

        {/* Info Tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Info className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="text-sm">
                <div className="font-semibold mb-1">Quality Settings</div>
                <div className="space-y-1">
                  <div><strong>Auto:</strong> Imagen 3 - Fast, efficient, good quality</div>
                  <div><strong>Max:</strong> Imagen 4 Ultra - Highest quality, best for character cloning</div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* BYOK indicator */}
        <Badge variant="outline" className="opacity-50 text-xs">
          BYOK Ready
        </Badge>
      </div>

      {/* Comparison Panel Toggle */}
      <button
        onClick={() => setShowComparison(!showComparison)}
        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 self-start"
      >
        {showComparison ? 'Hide' : 'Show'} comparison details
      </button>

      {/* Expandable Comparison Panel */}
      {showComparison && (
        <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
          <div className="text-sm">
            <div className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
              Quality Settings Comparison
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Auto Setting */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Auto (Imagen 3)</span>
                </div>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Speed: ~5-10 seconds</li>
                  <li>• Cost: Lower</li>
                  <li>• Quality: High</li>
                  <li>• Best for: General scenes, no character references</li>
                </ul>
              </div>

              {/* Max Setting */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">Max (Imagen 4 Ultra)</span>
                </div>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Speed: ~15-30 seconds</li>
                  <li>• Cost: Higher (~3-5x more expensive)</li>
                  <li>• Quality: Highest</li>
                  <li>• Best for: Character portraits, reference images, key scenes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Future BYOK Support */}
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-dashed opacity-60">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Key className="w-4 h-4" />
          <span>BYOK: Use your own API keys (Coming Soon)</span>
        </div>
      </div>
    </div>
  )
}
