'use client'

import { cn } from '@/lib/utils'
import type { StillGenerationMode } from '@/lib/generation/stillPolicy'
import type { VideoSourceMethod } from '@/lib/video/videoGenerationPolicy'
import { useStillCreativeAvailable } from '@/components/vision/useStillCreativeAvailable'

export interface VideoSourceMethodToggleProps {
  value: VideoSourceMethod
  onChange: (value: VideoSourceMethod) => void
  referenceLabel?: string
  frameLabel?: string
  disabled?: boolean
  referenceDisabled?: boolean
  referenceDisabledHint?: string
  size?: 'default' | 'compact'
  className?: string
  ariaLabel?: string
}

/**
 * Indigo Reference/Frame segmented control used on the Clips toolbar, Direct Clip modal,
 * and in the Clips Agent confirm dialog.
 * - Reference: Ingredients / Continuity Library references-to-video (REF)
 * - Frame: Frame-to-Video (F2V / I2V) using Start + End action frames
 */
export function VideoSourceMethodToggle({
  value,
  onChange,
  referenceLabel = 'Reference',
  frameLabel = 'Frame',
  disabled = false,
  referenceDisabled = false,
  referenceDisabledHint = 'Creative (Kling) clip generation requires Frame-to-Video (F2V)',
  size = 'default',
  className,
  ariaLabel = 'Video source method',
}: VideoSourceMethodToggleProps) {
  const compact = size === 'compact'

  return (
    <div
      className={cn(
        'inline-flex rounded-md border border-indigo-500/40 overflow-hidden',
        compact && 'h-7',
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {(['reference', 'frame'] as VideoSourceMethod[]).map((option) => {
        const selected = value === option
        const optionDisabled =
          disabled || (option === 'reference' && referenceDisabled)
        return (
          <button
            key={option}
            type="button"
            disabled={optionDisabled}
            title={
              option === 'reference' && referenceDisabled
                ? referenceDisabledHint
                : option === 'reference'
                  ? 'Reference-to-Video (Ingredients): sends Continuity Library reference plates with optimized direction'
                  : 'Frame-to-Video (F2V): sends Start and End action frames with transition motion prompt'
            }
            onClick={() => onChange(option)}
            className={cn(
              'flex items-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              compact ? 'gap-1 px-2 text-[10px]' : 'gap-1.5 px-3 py-1.5 text-xs',
              selected
                ? 'bg-indigo-600 text-white'
                : 'bg-transparent text-indigo-200/80 hover:bg-indigo-900/30'
            )}
          >
            {option === 'reference' ? referenceLabel : frameLabel}
          </button>
        )
      })}
    </div>
  )
}

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
