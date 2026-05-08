'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Palette } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'
import type { ArtStyleGridProps } from './types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Unified art style selection dropdown for image generation dialogs.
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
      <Select value={artStyle} onValueChange={onArtStyleChange}>
        <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white">
          <SelectValue placeholder="Select an art style" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-white">
          {artStylePresets.map((style) => (
            <SelectItem key={style.id} value={style.id}>
              <div className="flex items-center gap-3">
                {style.thumbnail && (
                  <div className="w-8 h-8 rounded overflow-hidden bg-slate-900 flex-shrink-0">
                    <img
                      src={style.thumbnail}
                      alt={style.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{style.name}</span>
                  <span className="text-xs text-slate-400 truncate max-w-[250px]">{style.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
