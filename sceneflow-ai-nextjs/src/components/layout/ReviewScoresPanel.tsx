'use client'

import React from 'react'
import { ChevronUp, ChevronDown, BarChart3, FileText, Sparkles, Target, Users, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ReviewScores {
  director: number | null // Deprecated - user is the director
  audience: number | null // Audience Resonance score
}

export interface AudienceReviewDetails {
  categories: { name: string; score: number; weight?: number }[]
  targetDemographic?: string
  emotionalImpact?: string
}

interface ReviewScoresPanelProps {
  scores: ReviewScores
  reviewDetails?: AudienceReviewDetails | null
  isOpen: boolean
  onToggle: () => void
  isGenerating?: boolean
  className?: string
}

// Compact Radar Chart Component for dimensional scores
function CompactRadarChart({ categories }: { categories: { name: string; score: number; weight?: number }[] }) {
  const size = 160
  const center = size / 2
  const radius = 55
  const levels = 5

  // Calculate points for each category
  const angleStep = (2 * Math.PI) / categories.length
  
  // Generate polygon points for each level (grid lines)
  const getLevelPoints = (level: number) => {
    const levelRadius = (radius * level) / levels
    return categories.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2
      return {
        x: center + levelRadius * Math.cos(angle),
        y: center + levelRadius * Math.sin(angle)
      }
    })
  }

  // Generate data polygon points
  const dataPoints = categories.map((cat, i) => {
    const angle = i * angleStep - Math.PI / 2
    const normalizedScore = (cat.score / 100) * radius
    return {
      x: center + normalizedScore * Math.cos(angle),
      y: center + normalizedScore * Math.sin(angle)
    }
  })

  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e' // green
    if (score >= 70) return '#3b82f6' // blue  
    if (score >= 60) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  const avgScore = categories.reduce((sum, c) => sum + c.score, 0) / categories.length
  const fillColor = getScoreColor(avgScore)

  // Truncate category names for compact display
  const truncateName = (name: string) => {
    if (name.length <= 8) return name
    return name.slice(0, 6) + '…'
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background levels */}
        {[1, 2, 3, 4, 5].map(level => {
          const points = getLevelPoints(level)
          const polygon = points.map(p => `${p.x},${p.y}`).join(' ')
          return (
            <polygon
              key={level}
              points={polygon}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
            />
          )
        })}

        {/* Axis lines */}
        {categories.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2
          const endX = center + radius * Math.cos(angle)
          const endY = center + radius * Math.sin(angle)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={endX}
              y2={endY}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={1}
            />
          )
        })}

        {/* Data polygon */}
        <polygon
          points={dataPolygon}
          fill={fillColor}
          fillOpacity={0.25}
          stroke={fillColor}
          strokeWidth={2}
        />

        {/* Data points */}
        {dataPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={3}
            fill={fillColor}
          />
        ))}

        {/* Labels */}
        {categories.map((cat, i) => {
          const angle = i * angleStep - Math.PI / 2
          const labelRadius = radius + 18
          const x = center + labelRadius * Math.cos(angle)
          const y = center + labelRadius * Math.sin(angle)
          
          // Adjust text anchor based on position
          let textAnchor: 'start' | 'middle' | 'end' = 'middle'
          if (Math.cos(angle) > 0.3) textAnchor = 'start'
          else if (Math.cos(angle) < -0.3) textAnchor = 'end'
          
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className="fill-current text-gray-500 dark:text-gray-400"
              style={{ fontSize: '8px' }}
              title={cat.name}
            >
              {truncateName(cat.name)}
            </text>
          )
        })}
      </svg>
    </div>
  )
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
  reviewDetails,
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
            /* Has scores - show Audience Resonance card, chart, details, and action buttons */
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

              {/* Dimensional Analysis Chart */}
              {reviewDetails?.categories && reviewDetails.categories.length > 0 && (
                <div className="pt-2">
                  <CompactRadarChart categories={reviewDetails.categories} />
                </div>
              )}

              {/* Target Demographic */}
              {reviewDetails?.targetDemographic && (
                <div className="flex items-start gap-2 text-xs">
                  <Users className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Target: </span>
                    <span className="text-gray-500 dark:text-gray-400">{reviewDetails.targetDemographic}</span>
                  </div>
                </div>
              )}

              {/* Emotional Impact */}
              {reviewDetails?.emotionalImpact && (
                <div className="flex items-start gap-2 text-xs">
                  <Heart className="w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Emotional Impact: </span>
                    <span className="text-gray-500 dark:text-gray-400">{reviewDetails.emotionalImpact}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons - Icon Only with Tooltips */}
              <div className="flex justify-center gap-2 pt-1">
                <button
                  onClick={handleUpdateReviews}
                  disabled={isGenerating}
                  title="Re-analyze script resonance"
                  className="flex items-center justify-center w-9 h-9 text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                  ) : (
                    <BarChart3 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleReviewAnalysis}
                  disabled={isGenerating}
                  title="View full analysis report"
                  className="flex items-center justify-center w-9 h-9 text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
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
