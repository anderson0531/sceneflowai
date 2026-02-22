'use client'

import React from 'react'
import { ChevronUp, ChevronDown, BarChart3, Wand2, Sparkles, Target, Users, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  const size = 180
  const center = size / 2
  const radius = 50
  const levels = 5

  // Filter out any categories without valid scores
  const validCategories = categories.filter(cat => typeof cat.score === 'number' && !isNaN(cat.score))
  
  if (validCategories.length === 0) {
    return null
  }

  // Calculate points for each category
  const angleStep = (2 * Math.PI) / validCategories.length
  
  // Generate polygon points for each level (grid lines)
  const getLevelPoints = (level: number) => {
    const levelRadius = (radius * level) / levels
    return validCategories.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2
      return {
        x: center + levelRadius * Math.cos(angle),
        y: center + levelRadius * Math.sin(angle)
      }
    })
  }

  // Get score color for individual scores
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e' // green
    if (score >= 70) return '#3b82f6' // blue  
    if (score >= 60) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  // Generate data polygon points - ensure score is treated as number
  const dataPoints = validCategories.map((cat, i) => {
    const angle = i * angleStep - Math.PI / 2
    const score = Number(cat.score) || 0
    const normalizedScore = (score / 100) * radius
    return {
      x: center + normalizedScore * Math.cos(angle),
      y: center + normalizedScore * Math.sin(angle),
      score,
      color: getScoreColor(score),
      name: cat.name
    }
  })

  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  const avgScore = validCategories.reduce((sum, c) => sum + (Number(c.score) || 0), 0) / validCategories.length
  const fillColor = getScoreColor(avgScore)

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
        {validCategories.map((_, i) => {
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

        {/* Data polygon - with higher opacity for visibility */}
        <polygon
          points={dataPolygon}
          fill={fillColor}
          fillOpacity={0.35}
          stroke={fillColor}
          strokeWidth={2.5}
        />

        {/* Data points with colored scores */}
        {dataPoints.map((point, i) => {
          const angle = i * angleStep - Math.PI / 2
          const labelRadius = radius + 22
          const labelX = center + labelRadius * Math.cos(angle)
          const labelY = center + labelRadius * Math.sin(angle)
          
          // Adjust text anchor based on position
          let textAnchor: 'start' | 'middle' | 'end' = 'middle'
          if (Math.cos(angle) > 0.3) textAnchor = 'start'
          else if (Math.cos(angle) < -0.3) textAnchor = 'end'
          
          return (
            <g key={i}>
              {/* Larger invisible hit area for tooltip on data point */}
              <circle
                cx={point.x}
                cy={point.y}
                r={12}
                fill="transparent"
                style={{ cursor: 'help' }}
              >
                <title>{point.name}: {point.score}</title>
              </circle>
              {/* Data point circle */}
              <circle
                cx={point.x}
                cy={point.y}
                r={4}
                fill={point.color}
                stroke="white"
                strokeWidth={1.5}
                style={{ pointerEvents: 'none' }}
              />
              {/* Larger invisible hit area for tooltip on score label */}
              <rect
                x={labelX - 15}
                y={labelY - 10}
                width={30}
                height={20}
                fill="transparent"
                style={{ cursor: 'help' }}
              >
                <title>{point.name}: {point.score}</title>
              </rect>
              {/* Score label with color */}
              <text
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fill={point.color}
                style={{ fontSize: '10px', fontWeight: 600, pointerEvents: 'none' }}
              >
                {point.score}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/**
 * Get stoplight colors for score cards based on score value
 * Simple 3-tier stoplight system:
 * - Green: >= 75 (Strong/Professional)
 * - Yellow: 60-74 (Needs Work)
 * - Red: < 60 (Needs Significant Work)
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
      qualityLabel: 'Ready for Production'
    }
  } else if (score >= 75) {
    return {
      gradient: 'bg-gradient-to-br from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10',
      border: 'border-green-200/50 dark:border-green-500/20',
      text: 'text-green-600 dark:text-green-400',
      label: 'text-green-500/70 dark:text-green-400/60',
      qualityLabel: 'Ready for Scenes'
    }
  } else if (score >= 60) {
    return {
      gradient: 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 dark:from-yellow-500/20 dark:to-yellow-600/10',
      border: 'border-yellow-200/50 dark:border-yellow-500/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      label: 'text-yellow-500/70 dark:text-yellow-400/60',
      qualityLabel: 'Review Recommendations'
    }
  } else {
    return {
      gradient: 'bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-red-600/10',
      border: 'border-red-200/50 dark:border-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      label: 'text-red-500/70 dark:text-red-400/60',
      qualityLabel: 'Revisions Needed'
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

              {/* Quick Insights - Icon buttons with tooltips */}
              {(reviewDetails?.targetDemographic || reviewDetails?.emotionalImpact) && (
                <TooltipProvider delayDuration={200}>
                  <div className="flex items-center gap-2 pt-1">
                    {/* Target Demographic Tooltip */}
                    {reviewDetails?.targetDemographic && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 border border-blue-200/50 dark:border-blue-500/30 transition-colors group"
                            aria-label="View target audience"
                          >
                            <Users className="w-4 h-4 text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          align="start"
                          className="max-w-[280px] p-3"
                        >
                          <div className="space-y-1">
                            <p className="font-semibold text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                              <Users className="w-3 h-3" />
                              Target Audience
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                              {reviewDetails.targetDemographic}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Emotional Impact Tooltip */}
                    {reviewDetails?.emotionalImpact && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 border border-rose-200/50 dark:border-rose-500/30 transition-colors group"
                            aria-label="View emotional impact"
                          >
                            <Heart className="w-4 h-4 text-rose-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          align="start"
                          className="max-w-[280px] p-3"
                        >
                          <div className="space-y-1">
                            <p className="font-semibold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                              <Heart className="w-3 h-3" />
                              Emotional Impact
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                              {reviewDetails.emotionalImpact}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Label hint */}
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">Hover for insights</span>
                  </div>
                </TooltipProvider>
              )}

              {/* Action Button - Opens script review modal */}
              <div className="pt-1">
                <button
                  onClick={handleReviewAnalysis}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Wand2 className="w-5 h-5" />
                  <span>Script Editor</span>
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
