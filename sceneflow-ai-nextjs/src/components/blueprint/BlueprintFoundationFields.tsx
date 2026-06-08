'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ArtStyleGrid } from '@/components/image-gen/ArtStyleGrid'
import { OUTPUT_FORMATS } from '@/config/landing/outputFormatsCopy'
import {
  type BlueprintAspectRatio,
  DEFAULT_ART_STYLE,
  DEFAULT_ASPECT_RATIO,
} from '@/lib/treatment/blueprintFoundation'
import { Monitor } from 'lucide-react'

type Props = {
  artStyle: string
  aspectRatio: BlueprintAspectRatio
  onArtStyleChange: (value: string) => void
  onAspectRatioChange: (value: BlueprintAspectRatio) => void
  className?: string
  highlightArtStyle?: boolean
  highlightAspectRatio?: boolean
}

export function BlueprintFoundationFields({
  artStyle,
  aspectRatio,
  onArtStyleChange,
  onAspectRatioChange,
  className,
  highlightArtStyle,
  highlightAspectRatio,
}: Props) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className={cn(highlightArtStyle && 'ring-2 ring-amber-500/50 rounded-lg p-1')}>
        <ArtStyleGrid
          artStyle={artStyle || DEFAULT_ART_STYLE}
          onArtStyleChange={onArtStyleChange}
        />
      </div>

      <div
        className={cn(
          'space-y-2 p-3 rounded border border-slate-700 bg-slate-800/50',
          highlightAspectRatio && 'ring-2 ring-amber-500/50'
        )}
      >
        <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-cyan-400" />
          Aspect Ratio
        </h4>
        <p className="text-xs text-gray-400">
          Locks framing and scene direction for script generation and export.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {OUTPUT_FORMATS.map((format) => (
            <button
              key={format.id}
              type="button"
              onClick={() => onAspectRatioChange(format.ratio as BlueprintAspectRatio)}
              className={cn(
                'text-left p-2.5 rounded-lg border text-xs transition-all',
                aspectRatio === format.ratio
                  ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200'
                  : 'border-slate-700 bg-slate-900/50 text-gray-400 hover:border-slate-600 hover:text-gray-300'
              )}
            >
              <div className="font-medium text-sm">{format.label}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{format.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export { DEFAULT_ART_STYLE, DEFAULT_ASPECT_RATIO }
