'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StoryboardQuality } from '@/lib/storyboard/storyboardQuality'

export interface StoryboardQualityToggleProps {
  value: StoryboardQuality
  onChange: (value: StoryboardQuality) => void
  draftLabel: string
  finalLabel: string
  disabled?: boolean
  /** Toolbar height (`h-7 text-[10px]`) vs dialog (`text-xs py-1.5`). */
  size?: 'default' | 'compact'
  className?: string
}

/**
 * Emerald Draft/Final segmented control used on the Frames toolbar and in the
 * Frame Agent confirm dialog so the two do not drift.
 */
export function StoryboardQualityToggle({
  value,
  onChange,
  draftLabel,
  finalLabel,
  disabled = false,
  size = 'default',
  className,
}: StoryboardQualityToggleProps) {
  const compact = size === 'compact'
  return (
    <div
      className={cn(
        'inline-flex rounded-md border border-emerald-600/40 overflow-hidden',
        compact && 'h-7',
        className
      )}
      role="group"
      aria-label="Frame generation quality"
    >
      {(['draft', 'final'] as StoryboardQuality[]).map((option) => {
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cn(
              'flex items-center font-medium transition-colors disabled:opacity-50',
              compact ? 'gap-1 px-2 text-[10px]' : 'gap-1.5 px-3 py-1.5 text-xs',
              selected
                ? 'bg-emerald-600 text-white'
                : 'bg-transparent text-emerald-200/80 hover:bg-emerald-900/30'
            )}
          >
            {option === 'final' && <Sparkles className="w-3 h-3" />}
            {option === 'draft' ? draftLabel : finalLabel}
          </button>
        )
      })}
    </div>
  )
}
