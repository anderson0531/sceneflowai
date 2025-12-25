'use client'

import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ReviewScores {
  director: number | null
  audience: number | null
}

interface ReviewScoresPanelProps {
  scores: ReviewScores
  isOpen: boolean
  onToggle: () => void
  className?: string
}

/**
 * Get stoplight gradient colors for score cards based on score value
 * - Green: >= 85 (Excellent)
 * - Yellow: >= 75 (Good)
 * - Red: < 75 (Needs improvement)
 */
export function getScoreCardClasses(score: number): {
  gradient: string
  border: string
  text: string
  label: string
} {
  if (score >= 85) {
    return {
      gradient: 'bg-gradient-to-br from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10',
      border: 'border-green-200/50 dark:border-green-500/20',
      text: 'text-green-600 dark:text-green-400',
      label: 'text-green-500/70 dark:text-green-400/60',
    }
  } else if (score >= 75) {
    return {
      gradient: 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 dark:from-yellow-500/20 dark:to-yellow-600/10',
      border: 'border-yellow-200/50 dark:border-yellow-500/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      label: 'text-yellow-500/70 dark:text-yellow-400/60',
    }
  } else {
    return {
      gradient: 'bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-red-600/10',
      border: 'border-red-200/50 dark:border-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      label: 'text-red-500/70 dark:text-red-400/60',
    }
  }
}

/**
 * Review Scores Panel - Displays Director and Audience scores with stoplight color coding
 * Used in the global sidebar for Production and later workflow phases
 */
export function ReviewScoresPanel({
  scores,
  isOpen,
  onToggle,
  className,
}: ReviewScoresPanelProps) {
  const hasScores = scores.director !== null || scores.audience !== null

  if (!hasScores) {
    return null
  }

  return (
    <div className={cn('p-4 border-b border-gray-200 dark:border-gray-700', className)}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <span>Review Scores</span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {isOpen && (
        <div className="grid grid-cols-2 gap-2">
          {/* Director Score Card */}
          {(() => {
            const directorColors = getScoreCardClasses(scores.director || 0)
            return (
              <div
                className={cn(
                  'rounded-lg p-2.5 border text-center',
                  directorColors.gradient,
                  directorColors.border
                )}
              >
                <div className={cn('text-xl font-bold', directorColors.text)}>
                  {scores.director ?? '-'}
                </div>
                <div className={cn('text-xs uppercase tracking-wide font-medium', directorColors.label)}>
                  Director
                </div>
              </div>
            )
          })()}
          {/* Audience Score Card */}
          {(() => {
            const audienceColors = getScoreCardClasses(scores.audience || 0)
            return (
              <div
                className={cn(
                  'rounded-lg p-2.5 border text-center',
                  audienceColors.gradient,
                  audienceColors.border
                )}
              >
                <div className={cn('text-xl font-bold', audienceColors.text)}>
                  {scores.audience ?? '-'}
                </div>
                <div className={cn('text-xs uppercase tracking-wide font-medium', audienceColors.label)}>
                  Audience
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default ReviewScoresPanel
