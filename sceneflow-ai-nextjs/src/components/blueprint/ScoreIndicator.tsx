'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface ScoreIndicatorProps {
  label: string
  score: number
  previousScore?: number
  showBar?: boolean
  showTrend?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Score thresholds
const getScoreColor = (score: number): { bg: string; text: string; fill: string } => {
  if (score >= 85) {
    return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      fill: 'bg-emerald-500'
    }
  }
  if (score >= 75) {
    return {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      fill: 'bg-amber-500'
    }
  }
  return {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    fill: 'bg-red-500'
  }
}

const getScoreLabel = (score: number): string => {
  if (score >= 90) return 'Excellent'
  if (score >= 85) return 'Great'
  if (score >= 75) return 'Good'
  if (score >= 65) return 'Fair'
  return 'Needs Work'
}

export function ScoreIndicator({
  label,
  score,
  previousScore,
  showBar = false,
  showTrend = false,
  size = 'md',
  className
}: ScoreIndicatorProps) {
  const colors = getScoreColor(score)
  const scoreLabel = getScoreLabel(score)
  const trend = previousScore !== undefined ? score - previousScore : 0

  const sizeClasses = {
    sm: {
      container: 'gap-1',
      label: 'text-xs',
      score: 'text-sm font-medium',
      bar: 'h-1'
    },
    md: {
      container: 'gap-1.5',
      label: 'text-xs',
      score: 'text-base font-semibold',
      bar: 'h-1.5'
    },
    lg: {
      container: 'gap-2',
      label: 'text-sm',
      score: 'text-xl font-bold',
      bar: 'h-2'
    }
  }

  const sizing = sizeClasses[size]

  return (
    <div className={cn('flex flex-col', sizing.container, className)}>
      {/* Label and Score */}
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-white/50 uppercase tracking-wide', sizing.label)}>
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn(colors.text, sizing.score)}>
            {score}
          </span>
          <span className={cn('text-white/30', sizing.label)}>
            / 100
          </span>
          
          {/* Trend indicator */}
          {showTrend && previousScore !== undefined && (
            <span className={cn(
              'flex items-center gap-0.5 ml-1',
              sizing.label,
              trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-white/30'
            )}>
              {trend > 0 ? (
                <>
                  <TrendingUp className="w-3 h-3" />
                  <span>+{trend}</span>
                </>
              ) : trend < 0 ? (
                <>
                  <TrendingDown className="w-3 h-3" />
                  <span>{trend}</span>
                </>
              ) : (
                <Minus className="w-3 h-3" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {showBar && (
        <div className={cn(
          'relative w-full rounded-full overflow-hidden',
          sizing.bar,
          'bg-white/5'
        )}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(score, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn('absolute inset-y-0 left-0 rounded-full', colors.fill)}
          />
        </div>
      )}

      {/* Score label badge */}
      {size === 'lg' && (
        <span className={cn(
          'self-end px-2 py-0.5 rounded-full text-xs font-medium mt-1',
          colors.bg,
          colors.text
        )}>
          {scoreLabel}
        </span>
      )}
    </div>
  )
}

// Compact inline variant
export function ScoreIndicatorInline({
  score,
  className
}: {
  score: number
  className?: string
}) {
  const colors = getScoreColor(score)
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      colors.bg,
      colors.text,
      className
    )}>
      {score}%
    </span>
  )
}

// Card-style variant for prominent display
export function ScoreCard({
  label,
  score,
  description,
  className
}: {
  label: string
  score: number
  description?: string
  className?: string
}) {
  const colors = getScoreColor(score)
  const scoreLabel = getScoreLabel(score)

  return (
    <div className={cn(
      'rounded-xl p-4 border transition-all',
      colors.bg,
      'border-white/5 hover:border-white/10',
      className
    )}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-white/50 uppercase tracking-wide">
          {label}
        </span>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium',
          colors.bg,
          colors.text
        )}>
          {scoreLabel}
        </span>
      </div>
      
      <div className="flex items-baseline gap-1 mb-3">
        <span className={cn('text-3xl font-bold', colors.text)}>
          {score}
        </span>
        <span className="text-sm text-white/30">/ 100</span>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-2 rounded-full overflow-hidden bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className={cn('absolute inset-y-0 left-0 rounded-full', colors.fill)}
        />
      </div>

      {description && (
        <p className="text-xs text-white/40 mt-2 line-clamp-2">
          {description}
        </p>
      )}
    </div>
  )
}

export default ScoreIndicator
