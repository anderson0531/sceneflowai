'use client'

import { Star, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeedbackChipRow } from './FeedbackChipRow'
import { DictationTextarea } from './DictationTextarea'
import { SceneAudienceBadge } from './SceneAudienceBadge'
import {
  syncCommentWithTags,
  toggleChipInTags,
  type SceneFeedbackState,
} from '@/lib/storyboard/feedbackChips'

interface StoryboardReviewPanelProps {
  sceneIndex: number
  feedback: SceneFeedbackState
  audienceAnalysis?: Record<string, unknown> | null
  onRatingChange: (rating: number) => void
  onCommentChange: (comment: string) => void
  onTagsChange: (tags: string[]) => void
  className?: string
}

export function StoryboardReviewPanel({
  sceneIndex,
  feedback,
  audienceAnalysis,
  onRatingChange,
  onCommentChange,
  onTagsChange,
  className,
}: StoryboardReviewPanelProps) {
  const handleChipToggle = (chipId: string) => {
    const nextTags = toggleChipInTags(feedback.tags, chipId)
    onTagsChange(nextTags)
    onCommentChange(syncCommentWithTags(feedback.comment, nextTags))
  }

  return (
    <div className={cn('flex flex-col gap-4 min-h-0', className)}>
      <div className="px-1">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          Scene {sceneIndex + 1} feedback
        </h2>
      </div>

      <SceneAudienceBadge
        audienceAnalysis={
          audienceAnalysis as {
            score?: number
            pacing?: string
            tension?: string
            notes?: string
          } | null
        }
      />

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Quick feedback</label>
        <FeedbackChipRow selectedTags={feedback.tags} onToggle={handleChipToggle} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Rating</label>
        <div className="flex gap-1" role="group" aria-label="Scene rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              className="p-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                className={cn(
                  'w-6 h-6 transition-colors',
                  star <= feedback.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-600 hover:text-gray-400'
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <label className="block text-sm font-medium text-gray-300 mb-2">Comments</label>
        <DictationTextarea
          value={feedback.comment}
          onChange={onCommentChange}
          placeholder="Leave feedback for this scene…"
          className="flex-1"
        />
      </div>

      <p className="text-xs text-gray-500 text-center">
        Feedback is saved locally until you submit with verified email.
      </p>
    </div>
  )
}
