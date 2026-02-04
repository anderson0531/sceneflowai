'use client'

import React from 'react'
import { ChevronUp, ChevronDown, BarChart3, FileText, Sparkles, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ReviewScores {
  director: number | null // Deprecated - user is the director
  audience: number | null // Audience Resonance score
}

interface ReviewScoresPanelProps {
  scores: ReviewScores
  isOpen: boolean
  onToggle: () => void
  isGenerating?: boolean
  className?: string
}

/**
 * Get stoplight gradient colors for score cards based on score value
 * Calibrated for deduction-based scoring where 60-70 is a typical first draft
 * - Green: >= 80 (Professional quality)
 * - Blue: >= 70 (Solid draft)
 * - Yellow: >= 60 (Working draft)
 * - Red: < 60 (Needs significant work)
 */
export function getScoreCardClasses(score: number): {
  gradient: string
  border: string
  text: string
  label: string
  qualityLabel: string
} {
  if (score >= 80) {
    return {
      gradient: 'bg-gradient-to-br from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10',
      border: 'border-green-200/50 dark:border-green-500/20',
      text: 'text-green-600 dark:text-green-400',
      label: 'text-green-500/70 dark:text-green-400/60',
      qualityLabel: 'Professional'
    }
  } else if (score >= 70) {
    return {
      gradient: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10',
      border: 'border-blue-200/50 dark:border-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      label: 'text-blue-500/70 dark:text-blue-400/60',
      qualityLabel: 'Solid Draft'
    }
  } else if (score >= 60) {
    return {
      gradient: 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 dark:from-yellow-500/20 dark:to-yellow-600/10',
      border: 'border-yellow-200/50 dark:border-yellow-500/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      label: 'text-yellow-500/70 dark:text-yellow-400/60',
      qualityLabel: 'Working Draft'
    }
  } else {
    return {
      gradient: 'bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-red-600/10',
      border: 'border-red-200/50 dark:border-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      label: 'text-red-500/70 dark:text-red-400/60',
      qualityLabel: 'Early Draft'
    }
  }
}

/**
 * Review Scores Panel - Displays Audience Resonance score with color coding
 * Used in the global sidebar for Production and later workflow phases
 * Shows "Generate Review" button when no scores exist yet
 * 
 * Note: Director review has been deprecated - the user IS the director.
 * Only Audience Resonance (how the script will resonate with audiences) is shown.
 */
export function ReviewScoresPanel({
  scores,
  isOpen,
  onToggle,
  isGenerating = false,
  className,
}: ReviewScoresPanelProps) {
  // Only check audience score since director is deprecated
  const hasScores = scores.audience !== null

  const handleUpdateReviews = () => {
    window.dispatchEvent(new CustomEvent('production:update-reviews'))
  }

  const handleReviewAnalysis = () => {
    window.dispatchEvent(new CustomEvent('production:review-analysis'))
  }

  // Always show the panel, with different content based on whether scores exist
  return (
    <div className={cn('p-4 border-b border-gray-200 dark:border-gray-700', className)}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider mb-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-purple-500" />
          <span>Audience Resonance</span>
        </div>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {isOpen && (
        <div className="space-y-3">
          {!hasScores ? (
            /* No scores yet - show Generate Review button */
            <div className="text-center py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Analyze how your script will resonate with audiences
              </p>
              <button
                onClick={handleUpdateReviews}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4" />
                    <span>Analyze Resonance</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Has scores - show single Audience Resonance card and action buttons */
            <>
              {/* Single Audience Resonance Score Card */}
              {(() => {
                const colors = getScoreCardClasses(scores.audience || 0)
                return (
                  <div
                    className={cn(
                      'rounded-lg p-4 border text-center',
                      colors.gradient,
                      colors.border
                    )}
                  >
                    <div className={cn('text-3xl font-bold', colors.text)}>
                      {scores.audience ?? '-'}
                    </div>
                    <div className={cn('text-xs uppercase tracking-wide font-medium mt-1', colors.label)}>
                      {colors.qualityLabel}
                    </div>
                  </div>
                )
              })()}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleUpdateReviews}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                  ) : (
                    <BarChart3 className="w-3.5 h-3.5" />
                  )}
                  <span>Re-analyze</span>
                </button>
                <button
                  onClick={handleReviewAnalysis}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Full Report</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ReviewScoresPanel
