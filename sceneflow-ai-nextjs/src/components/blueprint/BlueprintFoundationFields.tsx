'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ArtStyleDirectorField } from '@/components/art-style/ArtStyleDirectorField'
import { OUTPUT_FORMATS } from '@/config/landing/outputFormatsCopy'
import {
  type BlueprintAspectRatio,
  DEFAULT_ART_STYLE,
  DEFAULT_ASPECT_RATIO,
} from '@/lib/treatment/blueprintFoundation'
import type { ArtStyleSpec, ArtStyleStoryContext } from '@/lib/artStyle/globalArtStyle'
import { Monitor } from 'lucide-react'

type Props = {
  artStyle: string
  artStyleSpec?: ArtStyleSpec | null
  aspectRatio: BlueprintAspectRatio
  onArtStyleChange: (value: string, spec?: ArtStyleSpec) => void
  onAspectRatioChange: (value: BlueprintAspectRatio) => void
  storyContext?: ArtStyleStoryContext
  lockedBySeries?: {
    seriesId: string
    seriesTitle?: string
  } | null
  className?: string
  highlightArtStyle?: boolean
  highlightAspectRatio?: boolean
  /** Inception dialogs show art style alongside the synopsis. Aspect ratio stays here. */
  showArtStyle?: boolean
  /** Match the New Series dialog chrome. Reimagine keeps the slate surface. */
  surface?: 'slate' | 'gray'
}

export function BlueprintFoundationFields({
  artStyle,
  artStyleSpec,
  aspectRatio,
  onArtStyleChange,
  onAspectRatioChange,
  storyContext,
  lockedBySeries,
  className,
  highlightArtStyle,
  highlightAspectRatio,
  showArtStyle = true,
  surface = 'slate',
}: Props) {
  const panel =
    surface === 'gray'
      ? 'border-gray-700 bg-gray-800/50'
      : 'border-slate-700 bg-slate-800/50'
  const idleButton =
    surface === 'gray'
      ? 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
      : 'border-slate-700 bg-slate-900/50 text-gray-400 hover:border-slate-600 hover:text-gray-300'
  return (
    <div className={cn('space-y-4', className)}>
      {showArtStyle ? (
        <div className={cn(highlightArtStyle && 'ring-2 ring-amber-500/50 rounded-lg p-1')}>
          <ArtStyleDirectorField
            artStyle={artStyle || DEFAULT_ART_STYLE}
            artStyleSpec={artStyleSpec}
            onArtStyleChange={onArtStyleChange}
            storyContext={storyContext}
            lockedBySeries={lockedBySeries}
            scopeLabel="blueprint"
            surface={surface}
          />
        </div>
      ) : null}

      <div
        className={cn(
          'space-y-2 p-3 rounded border',
          panel,
          highlightAspectRatio && 'ring-2 ring-amber-500/50'
        )}
      >
        <h4 className="text-sm font-medium text-gray-200 flex items-center gap-2">
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
                  : idleButton
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
