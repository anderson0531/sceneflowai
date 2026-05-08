'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Palette } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'
import type { ArtStyleGridProps } from './types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/**
 * Unified art style selection dropdown for image generation dialogs.
 * Converted from a grid to a dropdown for a cleaner UI.
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
        <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200">
          <SelectValue placeholder="Select an art style..." />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          {artStylePresets.map((style) => (
            <SelectItem key={style.id} value={style.id}>
              <div className="flex flex-col">
                <span className="font-medium text-slate-200">{style.name}</span>
                <span className="text-[10px] text-slate-400">{style.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
