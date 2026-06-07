'use client'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface StoryboardReviewHeaderProps {
  title: string
  storyboardVersion: number
  revisionLabel?: string
  reviewedCount: number
  totalScenes: number
  audienceScore?: number
  onOpenAudienceResonance?: () => void
  onSubmitClick: () => void
  canSubmit: boolean
  isSubmitting: boolean
  submitSuccess: boolean
}

export function StoryboardReviewHeader({
  title,
  storyboardVersion,
  revisionLabel,
  reviewedCount,
  totalScenes,
  audienceScore,
  onOpenAudienceResonance,
  onSubmitClick,
  canSubmit,
  isSubmitting,
  submitSuccess,
}: StoryboardReviewHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-900 border-b border-gray-800 gap-3">
      <div className="w-full sm:w-auto min-w-0 flex-1">
        <h1 className="text-base sm:text-lg font-semibold text-white truncate">{title}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400">Pre-vis Review</p>
          <span className="text-[11px] text-gray-500">
            v{storyboardVersion}
            {revisionLabel ? ` · ${revisionLabel}` : ''}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-emerald-400 border border-emerald-500/30">
            {reviewedCount} of {totalScenes} scenes reviewed
          </span>
          {typeof audienceScore === 'number' && onOpenAudienceResonance && (
            <button
              type="button"
              onClick={onOpenAudienceResonance}
              className="text-[11px] px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/40 hover:bg-purple-900/80 transition-colors"
            >
              Audience Resonance {audienceScore}
            </button>
          )}
        </div>
      </div>
      <Button
        onClick={onSubmitClick}
        disabled={!canSubmit || isSubmitting}
        className={cn(
          'w-full sm:w-auto shrink-0',
          submitSuccess ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500',
          'text-white'
        )}
      >
        {isSubmitting ? 'Submitting…' : submitSuccess ? 'Submitted!' : 'Submit All Feedback'}
      </Button>
    </div>
  )
}
