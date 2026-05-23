'use client'

import { cn } from '@/lib/utils'
import {
  STORYBOARD_FEEDBACK_CHIPS,
  type StoryboardFeedbackChipPolarity,
} from '@/lib/storyboard/feedbackChips'

const POLARITY_STYLES: Record<
  StoryboardFeedbackChipPolarity,
  { active: string; idle: string }
> = {
  strength: {
    active: 'bg-emerald-600/90 text-white border-emerald-500',
    idle: 'bg-gray-800 text-gray-300 border-gray-700 hover:border-emerald-500/50',
  },
  concern: {
    active: 'bg-amber-600/90 text-white border-amber-500',
    idle: 'bg-gray-800 text-gray-300 border-gray-700 hover:border-amber-500/50',
  },
  suggestion: {
    active: 'bg-purple-600/90 text-white border-purple-500',
    idle: 'bg-gray-800 text-gray-300 border-gray-700 hover:border-purple-500/50',
  },
}

interface FeedbackChipRowProps {
  selectedTags: string[]
  onToggle: (chipId: string) => void
  className?: string
}

export function FeedbackChipRow({ selectedTags, onToggle, className }: FeedbackChipRowProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)} role="group" aria-label="Quick feedback">
      {STORYBOARD_FEEDBACK_CHIPS.map((chip) => {
        const selected = selectedTags.includes(chip.id)
        const styles = POLARITY_STYLES[chip.polarity]
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(chip.id)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border transition-colors',
              selected ? styles.active : styles.idle
            )}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
