'use client'

import { Move } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  IMAGE_EFFECT_OPTIONS,
  type GalleryImageEffectPrefs,
  type KenBurnsIntensity,
  type StoryboardImageEffectMode,
  getImageEffectLabel,
} from '@/lib/storyboard/storyboardImageEffects'

const INTENSITY_OPTIONS: { value: KenBurnsIntensity; label: string }[] = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'medium', label: 'Medium' },
  { value: 'dramatic', label: 'Dramatic' },
]

interface StoryboardImageEffectControlProps {
  prefs: GalleryImageEffectPrefs
  onChange: (prefs: GalleryImageEffectPrefs) => void
  /** Compact pill for embed / shared controls row */
  compact?: boolean
  className?: string
}

export function StoryboardImageEffectControl({
  prefs,
  onChange,
  compact = false,
  className,
}: StoryboardImageEffectControlProps) {
  const activeLabel = getImageEffectLabel(prefs.mode)

  const setMode = (mode: StoryboardImageEffectMode) => {
    onChange({ ...prefs, mode })
  }

  const setIntensity = (kenBurnsIntensity: KenBurnsIntensity) => {
    onChange({ mode: 'kenBurns', kenBurnsIntensity })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Image motion settings"
          aria-haspopup="menu"
          className={cn(
            'inline-flex items-center gap-1.5 rounded font-medium transition-colors',
            compact
              ? 'px-2 py-1 text-[10px] bg-gray-700 text-gray-200 hover:bg-gray-600'
              : 'px-2 py-1 text-xs bg-gray-700 text-gray-200 hover:bg-gray-600',
            prefs.mode !== 'kenBurns' && prefs.mode !== 'off' && 'ring-1 ring-emerald-500/40',
            prefs.mode === 'off' && 'text-gray-400',
            className
          )}
        >
          <Move className={cn(compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
          <span className="hidden sm:inline">{activeLabel}</span>
          <span className="sm:hidden">Motion</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="w-64 bg-gray-900 border-gray-700 text-white p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-xs font-semibold text-gray-300 mb-2">Image motion</p>
        <div role="menu" className="space-y-1">
          {IMAGE_EFFECT_OPTIONS.map(({ mode, label, description }) => (
            <button
              key={mode}
              type="button"
              role="menuitemradio"
              aria-checked={prefs.mode === mode}
              onClick={() => setMode(mode)}
              className={cn(
                'w-full text-left px-2.5 py-2 rounded-md text-sm transition-colors',
                prefs.mode === mode
                  ? 'bg-emerald-600/90 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              <span className="font-medium">{label}</span>
              <span className="block text-[11px] text-gray-400 mt-0.5 leading-snug">{description}</span>
            </button>
          ))}
        </div>

        {prefs.mode === 'kenBurns' && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-wide">Intensity</p>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Ken Burns intensity">
              {INTENSITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={prefs.kenBurnsIntensity === value}
                  onClick={() => setIntensity(value)}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs transition-colors',
                    prefs.kenBurnsIntensity === value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
