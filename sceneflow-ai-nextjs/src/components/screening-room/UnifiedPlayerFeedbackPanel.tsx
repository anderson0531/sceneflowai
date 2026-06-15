'use client'

import React, { useMemo, useState } from 'react'
import { MessageSquare, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StoryboardReviewPanel } from '@/components/vision/storyboard-review/StoryboardReviewPanel'
import { FeedbackPanel } from '@/components/premiere/FeedbackPanel'
import type { SceneFeedbackState } from '@/lib/storyboard/feedbackChips'
import type { TimestampedComment, ScreeningReaction } from '@/lib/types/finalCut'

export type UnifiedFeedbackMode = 'collect' | 'triage'

export interface UnifiedPlayerFeedbackPanelProps {
  mode?: UnifiedFeedbackMode
  sceneIndex: number
  /** Scene-level reviewer feedback (Pre-Vis / shared player) */
  sceneFeedback?: SceneFeedbackState
  audienceAnalysis?: Record<string, unknown> | null
  onRatingChange?: (rating: number) => void
  onCommentChange?: (comment: string) => void
  onTagsChange?: (tags: string[]) => void
  /** Timestamped producer/audience comments (Screening Room video) */
  comments?: TimestampedComment[]
  reactions?: ScreeningReaction[]
  currentTimestamp?: number
  onSeekToTimestamp?: (timestamp: number) => void
  onResolveComment?: (commentId: string) => void
  onReplyToComment?: (commentId: string, text: string) => void
  className?: string
}

/**
 * Shared feedback surface for Pre-Vis and Screening Room players.
 * - collect: scene chips, stars, and comments (reviewer-facing)
 * - triage: timestamped comments with seek + resolve (producer-facing)
 */
export function UnifiedPlayerFeedbackPanel({
  mode = 'collect',
  sceneIndex,
  sceneFeedback,
  audienceAnalysis,
  onRatingChange,
  onCommentChange,
  onTagsChange,
  comments = [],
  reactions = [],
  currentTimestamp = 0,
  onSeekToTimestamp,
  onResolveComment,
  onReplyToComment,
  className,
}: UnifiedPlayerFeedbackPanelProps) {
  const [activeTab, setActiveTab] = useState<'scene' | 'timeline'>(
    mode === 'triage' ? 'timeline' : 'scene'
  )

  const hasTimelineFeedback = comments.length > 0 || reactions.length > 0
  const hasSceneFeedback = !!sceneFeedback

  const tabs = useMemo(() => {
    const items: Array<{ id: 'scene' | 'timeline'; label: string }> = []
    if (hasSceneFeedback || mode === 'collect') items.push({ id: 'scene', label: 'Scene' })
    if (hasTimelineFeedback || mode === 'triage') items.push({ id: 'timeline', label: 'Timeline' })
    return items
  }, [hasSceneFeedback, hasTimelineFeedback, mode])

  const resolvedTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id ?? 'scene'

  return (
    <div className={cn('flex flex-col min-h-0 bg-zinc-950/90 border-l border-zinc-800', className)}>
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Feedback
        </h3>
        {tabs.length > 1 && (
          <div className="flex gap-2 mt-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-md border transition-colors',
                  resolvedTab === tab.id
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-200'
                    : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {resolvedTab === 'scene' && sceneFeedback && onRatingChange && onCommentChange && onTagsChange ? (
          <StoryboardReviewPanel
            sceneIndex={sceneIndex}
            feedback={sceneFeedback}
            audienceAnalysis={audienceAnalysis}
            onRatingChange={onRatingChange}
            onCommentChange={onCommentChange}
            onTagsChange={onTagsChange}
          />
        ) : resolvedTab === 'timeline' ? (
          <FeedbackPanel
            comments={comments}
            reactions={reactions}
            currentTimestamp={currentTimestamp}
            onSeekToTimestamp={onSeekToTimestamp}
            onResolveComment={onResolveComment}
            onReplyToComment={onReplyToComment}
          />
        ) : (
          <div className="text-sm text-zinc-500 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            No feedback yet for this scene.
          </div>
        )}
      </div>
    </div>
  )
}
