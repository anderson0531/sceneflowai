'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * StatCard - Atomic Stat Display Component
 * 
 * Displays a metric with optional:
 * - Trend indicator (percentage change with direction)
 * - Inline sparkline for historical context
 * - Status coloring (healthy/warning/critical)
 * - Comparison text ("vs last month")
 */

export interface TrendData {
  /** Percentage change value */
  value: number
  /** Trend direction */
  direction: 'up' | 'down' | 'neutral'
  /** Comparison text (e.g., "vs last month") */
  comparison?: string
  /** Whether up is good (true) or bad (false) */
  upIsGood?: boolean
}

export interface SparklineData {
  /** Array of values for the sparkline */
  values: number[]
  /** Color for the sparkline */
  color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'purple' | 'blue'
}

export interface StatCardProps {
  /** Main value to display */
  value: string | number
  /** Label describing the value */
  label: string
  /** Optional trend data */
  trend?: TrendData
  /** Optional sparkline data */
  sparkline?: SparklineData
  /** Status for color coding */
  status?: 'healthy' | 'warning' | 'critical' | 'neutral'
  /** Optional icon */
  icon?: React.ReactNode
  /** Compact mode */
  compact?: boolean
  /** Custom class name */
  className?: string
}

const statusColorMap = {
  healthy: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  neutral: 'text-white',
}

const sparklineColorMap = {
  indigo: '#818cf8',
  emerald: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  purple: '#a78bfa',
  blue: '#60a5fa',
}

/**
 * Inline SVG Sparkline - lightweight, no external deps
 */
function Sparkline({ 
  values, 
  color = 'indigo',
  width = 64,
  height = 20 
}: { 
  values: number[]
  color?: SparklineData['color']
  width?: number
  height?: number
}) {
  if (!values || values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  // Normalize values to SVG coordinates
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const strokeColor = sparklineColorMap[color || 'indigo']

  return (
    <svg
      width={width}
      height={height}
      className="shrink-0"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={(values.length - 1) / (values.length - 1) * width}
        cy={height - ((values[values.length - 1] - min) / range) * (height - 4) - 2}
        r="2"
        fill={strokeColor}
      />
    </svg>
  )
}

/**
 * Trend Indicator - shows percentage change with arrow
 */
function TrendIndicator({ trend }: { trend: TrendData }) {
  const { value, direction, comparison, upIsGood = true } = trend
  
  // Determine color based on direction and whether up is good
  const isPositive = direction === 'up'
  const isGood = (isPositive && upIsGood) || (!isPositive && !upIsGood)
  
  const colorClass = direction === 'neutral' 
    ? 'text-gray-400'
    : isGood 
      ? 'text-emerald-400' 
      : 'text-red-400'

  const Icon = direction === 'up' 
    ? TrendingUp 
    : direction === 'down' 
      ? TrendingDown 
      : Minus

  return (
    <div className={cn('flex items-center gap-1 text-xs', colorClass)}>
      <Icon className="w-3 h-3" />
      <span>
        {value > 0 ? '+' : ''}{value}%
        {comparison && <span className="text-gray-500 ml-1">{comparison}</span>}
      </span>
    </div>
  )
}

export function StatCard({
  value,
  label,
  trend,
  sparkline,
  status = 'neutral',
  icon,
  compact = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-gray-900/50 rounded-lg border border-gray-700/30',
        compact ? 'p-3' : 'p-4',
        className
      )}
    >
      {/* Top row: Icon/Sparkline + Trend */}
      {(icon || sparkline || trend) && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon && (
              <span className="text-gray-400">{icon}</span>
            )}
            {sparkline && (
              <Sparkline 
                values={sparkline.values} 
                color={sparkline.color}
                width={compact ? 48 : 64}
                height={compact ? 16 : 20}
              />
            )}
          </div>
          {trend && <TrendIndicator trend={trend} />}
        </div>
      )}

      {/* Value */}
      <div
        className={cn(
          'font-bold leading-tight',
          compact ? 'text-xl' : 'text-2xl',
          statusColorMap[status]
        )}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {/* Label */}
      <div className="text-xs text-gray-400 mt-1 leading-tight">
        {label}
      </div>

      {/* Trend below value (alternative layout when no sparkline) */}
      {trend && !sparkline && !icon && (
        <div className="mt-2">
          <TrendIndicator trend={trend} />
        </div>
      )}
    </div>
  )
}

/**
 * StatCardGrid - Helper for displaying multiple stats
 */
export function StatCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode
  columns?: 2 | 3 | 4
  className?: string
}) {
  const colsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-3', colsClass[columns], className)}>
      {children}
    </div>
  )
}

export default StatCard
