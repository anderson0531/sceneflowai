'use client'

import { cn } from '@/lib/utils'
import type { StillGenerationMode } from '@/lib/generation/stillPolicy'
import { useStillCreativeAvailable } from '@/components/vision/useStillCreativeAvailable'

export interface StoryboardGenerationModeToggleProps {
  value: StillGenerationMode
  onChange: (value: StillGenerationMode) => void
  standardLabel: string
  creativeLabel: string
  disabled?: boolean
  /** Toolbar height (`h-7 text-[10px]`) vs dialog (`text-xs py-1.5`). */
  size?: 'default' | 'compact'
  className?: string
  ariaLabel?: string
}

/**
 * Teal Standard/Creative segmented control used on the Frames toolbar and in
 * the Frame Agent confirm dialog so the two do not drift.
 */
export function StoryboardGenerationModeToggle({
  value,
  onChange,
  standardLabel,
  creativeLabel,
  disabled = false,
  size = 'default',
  className,
  ariaLabel = 'Frame generation mode',
}: StoryboardGenerationModeToggleProps) {
  const compact = size === 'compact'
  const creative = useStillCreativeAvailable()
  const creativeDisabled = disabled || creative.disabled

  return (
    <div
      className={cn(
        'inline-flex rounded-md border border-teal-600/40 overflow-hidden',
        compact && 'h-7',
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {(['standard', 'creative'] as StillGenerationMode[]).map((option) => {
        const selected = value === option
        const optionDisabled = option === 'creative' ? creativeDisabled : disabled
        return (
          <button
            key={option}
            type="button"
            disabled={optionDisabled}
            title={
              option === 'creative' && creative.disabled ? creative.hint : undefined
            }
            onClick={() => onChange(option)}
            className={cn(
              'flex items-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              compact ? 'gap-1 px-2 text-[10px]' : 'gap-1.5 px-3 py-1.5 text-xs',
              selected
                ? 'bg-teal-600 text-white'
                : 'bg-transparent text-teal-200/80 hover:bg-teal-900/30'
            )}
          >
            {option === 'standard' ? standardLabel : creativeLabel}
          </button>
        )
      })}
    </div>
  )
}
