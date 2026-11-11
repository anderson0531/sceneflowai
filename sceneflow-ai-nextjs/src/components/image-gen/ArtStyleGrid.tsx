'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Palette, Sparkles } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'
import { buildArtStyleSpecFromValue, findArtStylePreset } from '@/lib/artStyle/globalArtStyle'
import type { ArtStyleGridProps } from './types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Art style selector for individual shot/reference prompt builder dialogs.
 * Preserves custom / AI-directed Global Art Styles that aren't in the static preset list.
 */
export function ArtStyleGrid({
  artStyle,
  onArtStyleChange,
  className,
}: ArtStyleGridProps) {
  const matchedPreset = findArtStylePreset(artStyle)
  const customSpec = !matchedPreset && artStyle?.trim() ? buildArtStyleSpecFromValue(artStyle) : null
  const selectValue = matchedPreset ? matchedPreset.id : artStyle?.trim() || 'photorealistic'

  return (
    <div className={cn('space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50', className)}>
      <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
        <Palette className="w-4 h-4 text-cyan-400" />
        Art Style
      </h4>
      <Select value={selectValue} onValueChange={onArtStyleChange}>
        <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white">
          <SelectValue placeholder="Select an art style" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-white">
          {customSpec ? (
            <SelectItem value={artStyle.trim()}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Global: {customSpec.title}</span>
                  <span className="text-xs text-slate-400 truncate max-w-[250px]">
                    {customSpec.stylePrompt}
                  </span>
                </div>
              </div>
            </SelectItem>
          ) : null}
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
