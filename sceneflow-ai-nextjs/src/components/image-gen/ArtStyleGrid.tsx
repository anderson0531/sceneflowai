'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Palette } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'
import type { ArtStyleGridProps } from './types'

/**
 * Unified art style selection grid for image generation dialogs.
 * Responsive 4-column layout with thumbnail previews.
 */
export function ArtStyleGrid({
  artStyle,
  onArtStyleChange,
  className,
}: ArtStyleGridProps) {
  return (
    <div className={cn('space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50', className)}>
      <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
        <Palette className="w-4 h-4 text-cyan-400" />
        Art Style
      </h4>
      <div className="grid grid-cols-4 gap-2">
        {artStylePresets.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => onArtStyleChange(style.id)}
            className={cn(
              'relative p-2 rounded-lg border cursor-pointer transition-all text-left',
              artStyle === style.id
                ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/50'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            )}
          >
            {/* Thumbnail */}
            {style.thumbnail && (
              <div className="aspect-square rounded overflow-hidden mb-1.5 bg-slate-900">
                <img
                  src={style.thumbnail}
                  alt={style.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Hide broken images gracefully
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}
            <div className="text-xs font-medium text-slate-200 truncate">{style.name}</div>
            <div className="text-[10px] text-slate-400 truncate">{style.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
