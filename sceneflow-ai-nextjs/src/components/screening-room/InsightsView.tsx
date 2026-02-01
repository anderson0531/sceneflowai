/**
 * Behavioral Analytics Insights View
 * 
 * Comprehensive analytics dashboard for creators to understand
 * audience engagement with their screenings.
 * 
 * Features:
 * - Master Timeline Heatmap (engagement over time)
 * - Retention Graph (viewer drop-off analysis)
 * - Emotion Timeline (biometric data visualization)
 * - Demographic Filters
 * - A/B Comparison Cards
 * - High/Low Engagement Moments
 * 
 * @see /src/lib/types/behavioralAnalytics.ts for types
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Clock,
  Activity,
  Filter,
  Smile,
  Frown,
  Meh,
  Camera,
  FlaskConical,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type {
  BehavioralAnalyticsSummary,
  TimelineHeatmapData,
  HeatmapBucket,
  HeatmapFilters,
  EmotionTimelinePoint,
  RetentionCurvePoint,
  DropOffAnalysis,
  MomentHighlight,
  ABTestResults,
  SessionDemographics,
} from '@/lib/types/behavioralAnalytics'

// ============================================================================
// Types
// ============================================================================

interface InsightsViewProps {
  screeningId: string
  screeningTitle?: string
  videoDuration?: number
  
  // Analytics data
  summary: BehavioralAnalyticsSummary
  heatmapData?: TimelineHeatmapData
  
  // Callbacks
  onFilterChange?: (filters: HeatmapFilters) => void
  onSeekToMoment?: (timestamp: number) => void
  onExportData?: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Metric Card
 */
function MetricCard({
  icon,
  label,
  value,
  subValue,
  trend,
  color = 'gray',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'stable'
  color?: 'gray' | 'green' | 'blue' | 'purple' | 'amber' | 'red'
}) {
  const colorClasses = {
    gray: 'text-gray-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  }
  
  return (
    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
      <div className="flex items-center gap-2 mb-2">
        <span className={colorClasses[color]}>{icon}</span>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          {subValue && (
            <div className="text-xs text-gray-500">{subValue}</div>
          )}
        </div>
        {trend && (
          <span className={cn(
            "text-xs flex items-center gap-1",
            trend === 'up' ? 'text-green-400' : 
            trend === 'down' ? 'text-red-400' : 'text-gray-400'
          )}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
             trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
             <Activity className="w-3 h-3" />}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Timeline Heatmap
 */
function TimelineHeatmap({
  data,
  onSeek,
}: {
  data: TimelineHeatmapData
  onSeek?: (timestamp: number) => void
}) {
  if (!data.buckets.length) {
    return (
      <div className="h-20 flex items-center justify-center text-gray-500 text-sm">
        No engagement data available
      </div>
    )
  }
  
  const maxViewers = Math.max(...data.buckets.map(b => b.viewerCount))
  
  return (
    <div className="space-y-2">
      {/* Heatmap Bars */}
      <div className="flex h-16 gap-0.5 items-end">
        {data.buckets.map((bucket, index) => {
          const heightPercent = maxViewers > 0 
            ? (bucket.viewerCount / maxViewers) * 100 
            : 0
          
          const bgColor = bucket.colorType === 'positive'
            ? 'bg-green-500'
            : bucket.colorType === 'negative'
            ? 'bg-red-500'
            : 'bg-gray-600'
          
          return (
            <button
              key={index}
              onClick={() => onSeek?.(bucket.startTime)}
              className={cn(
                "flex-1 rounded-t transition-all hover:opacity-80",
                bgColor
              )}
              style={{ 
                height: `${Math.max(heightPercent, 5)}%`,
                opacity: 0.3 + (bucket.colorIntensity * 0.7),
              }}
              title={`${formatTime(bucket.startTime)} - ${formatTime(bucket.endTime)}\nEngagement: ${Math.round(bucket.engagementScore * 100)}%\nViewers: ${bucket.viewerCount}`}
            />
          )
        })}
      </div>
      
      {/* Time Labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>0:00</span>
        <span>{formatTime(data.videoDuration / 2)}</span>
        <span>{formatTime(data.videoDuration)}</span>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-gray-400">High Engagement</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-600" />
          <span className="text-gray-400">Neutral</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-gray-400">Low / Confusion</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Retention Graph
 */
function RetentionGraph({
  data,
  dropOffs,
  onSeek,
}: {
  data: RetentionCurvePoint[]
  dropOffs: DropOffAnalysis[]
  onSeek?: (timestamp: number) => void
}) {
  if (!data.length) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
        No retention data available
      </div>
    )
  }
  
  const maxTime = Math.max(...data.map(d => d.timestamp))
  
  return (
    <div className="space-y-2">
      {/* SVG Graph */}
      <div className="relative h-32 bg-gray-800/30 rounded-lg overflow-hidden">
        <svg
          viewBox={`0 0 100 100`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid Lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#374151" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#374151" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#374151" strokeWidth="0.5" />
          
          {/* Retention Line */}
          <polyline
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            points={data.map((point, i) => {
              const x = (point.timestamp / maxTime) * 100
              const y = 100 - point.percentage
              return `${x},${y}`
            }).join(' ')}
          />
          
          {/* Fill Under Curve */}
          <polygon
            fill="url(#retentionGradient)"
            points={`0,100 ${data.map((point, i) => {
              const x = (point.timestamp / maxTime) * 100
              const y = 100 - point.percentage
              return `${x},${y}`
            }).join(' ')} 100,100`}
          />
          
          {/* Gradient Definition */}
          <defs>
            <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Drop-off Markers */}
          {dropOffs.slice(0, 3).map((dropOff, i) => {
            const x = (dropOff.timestamp / maxTime) * 100
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1="0"
                  x2={x}
                  y2="100"
                  stroke="#EF4444"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              </g>
            )
          })}
        </svg>
        
        {/* Y-Axis Labels */}
        <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 py-1">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
      </div>
      
      {/* Drop-off Points */}
      {dropOffs.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-medium">Major Drop-offs:</p>
          <div className="flex flex-wrap gap-2">
            {dropOffs.slice(0, 3).map((dropOff, i) => (
              <button
                key={i}
                onClick={() => onSeek?.(dropOff.timestamp)}
                className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 hover:bg-red-500/20 transition-colors"
              >
                {formatTime(dropOff.timestamp)} ({Math.round(dropOff.dropOffPercentage)}% drop)
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Emotion Timeline (Biometric)
 */
function EmotionTimeline({
  data,
  onSeek,
}: {
  data: EmotionTimelinePoint[]
  onSeek?: (timestamp: number) => void
}) {
  if (!data.length) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
        No biometric data collected
      </div>
    )
  }
  
  const maxTime = Math.max(...data.map(d => d.timestamp))
  
  return (
    <div className="space-y-3">
      {/* Happiness Line */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Smile className="w-3 h-3 text-green-400" />
          <span>Happiness</span>
        </div>
        <div className="h-8 flex gap-px">
          {data.map((point, i) => (
            <button
              key={i}
              onClick={() => onSeek?.(point.timestamp)}
              className="flex-1 rounded-sm transition-opacity hover:opacity-80"
              style={{ 
                backgroundColor: `rgba(34, 197, 94, ${0.2 + point.happiness * 0.8})` 
              }}
              title={`${formatTime(point.timestamp)}: ${Math.round(point.happiness * 100)}% happiness`}
            />
          ))}
        </div>
      </div>
      
      {/* Confusion Line */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Frown className="w-3 h-3 text-red-400" />
          <span>Confusion</span>
        </div>
        <div className="h-8 flex gap-px">
          {data.map((point, i) => (
            <button
              key={i}
              onClick={() => onSeek?.(point.timestamp)}
              className="flex-1 rounded-sm transition-opacity hover:opacity-80"
              style={{ 
                backgroundColor: `rgba(239, 68, 68, ${0.2 + point.confusion * 0.8})` 
              }}
              title={`${formatTime(point.timestamp)}: ${Math.round(point.confusion * 100)}% confusion`}
            />
          ))}
        </div>
      </div>
      
      {/* Engagement Line */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Eye className="w-3 h-3 text-blue-400" />
          <span>Attention</span>
        </div>
        <div className="h-8 flex gap-px">
          {data.map((point, i) => (
            <button
              key={i}
              onClick={() => onSeek?.(point.timestamp)}
              className="flex-1 rounded-sm transition-opacity hover:opacity-80"
              style={{ 
                backgroundColor: `rgba(59, 130, 246, ${0.2 + point.engagement * 0.8})` 
              }}
              title={`${formatTime(point.timestamp)}: ${Math.round(point.engagement * 100)}% attention`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Moment Highlight Card
 */
function MomentCard({
  moment,
  type,
  onSeek,
}: {
  moment: MomentHighlight
  type: 'high' | 'low'
  onSeek?: (timestamp: number) => void
}) {
  const isHigh = type === 'high'
  
  return (
    <button
      onClick={() => onSeek?.(moment.timestamp)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors text-left w-full",
        isHigh
          ? "bg-green-500/5 border-green-500/30 hover:bg-green-500/10"
          : "bg-red-500/5 border-red-500/30 hover:bg-red-500/10"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center",
        isHigh ? "bg-green-500/20" : "bg-red-500/20"
      )}>
        {isHigh ? (
          <Sparkles className="w-5 h-5 text-green-400" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-400" />
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            "text-sm font-medium",
            isHigh ? "text-green-400" : "text-red-400"
          )}>
            {formatTime(moment.timestamp)}
          </span>
          <span className="text-xs text-gray-500">
            ({formatDuration(moment.durationSeconds)})
          </span>
        </div>
        <p className="text-xs text-gray-400 capitalize">
          {moment.type.replace('-', ' ')}
          {moment.description && ` • ${moment.description}`}
        </p>
      </div>
      
      <div className={cn(
        "text-xs font-medium px-2 py-0.5 rounded",
        isHigh ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
      )}>
        {Math.round(moment.score * 100)}%
      </div>
    </button>
  )
}

/**
 * A/B Comparison Card
 */
function ABComparisonCard({ results }: { results: ABTestResults }) {
  const { variantAStats, variantBStats, winningVariant } = results
  
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <FlaskConical className="w-5 h-5 text-purple-400" />
        <h3 className="font-semibold text-white">A/B Test Results</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Variant A */}
        <div className={cn(
          "p-3 rounded-lg border",
          winningVariant === 'A'
            ? "border-green-500/50 bg-green-500/5"
            : "border-gray-700"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-400">A</span>
              </div>
              <span className="text-sm font-medium text-white">Version A</span>
            </div>
            {winningVariant === 'A' && (
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                Winner
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Sessions</span>
              <span className="text-white font-medium">{variantAStats.sessionCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Completion</span>
              <span className="text-white font-medium">{Math.round(variantAStats.averageCompletionRate)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Engagement</span>
              <span className="text-white font-medium">{Math.round(variantAStats.averageEngagementScore)}</span>
            </div>
          </div>
        </div>
        
        {/* Variant B */}
        <div className={cn(
          "p-3 rounded-lg border",
          winningVariant === 'B'
            ? "border-green-500/50 bg-green-500/5"
            : "border-gray-700"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-purple-400">B</span>
              </div>
              <span className="text-sm font-medium text-white">Version B</span>
            </div>
            {winningVariant === 'B' && (
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                Winner
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Sessions</span>
              <span className="text-white font-medium">{variantBStats.sessionCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Completion</span>
              <span className="text-white font-medium">{Math.round(variantBStats.averageCompletionRate)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Engagement</span>
              <span className="text-white font-medium">{Math.round(variantBStats.averageEngagementScore)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {!results.sampleSizeReached && (
        <p className="text-xs text-amber-400 mt-3 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Need more data. Recommended: {results.recommendedSampleSize} sessions per variant.
        </p>
      )}
    </div>
  )
}

/**
 * Demographic Filter Bar
 */
function DemographicFilters({
  filters,
  onChange,
}: {
  filters: HeatmapFilters
  onChange: (filters: HeatmapFilters) => void
}) {
  const [expanded, setExpanded] = useState(false)
  
  const ageOptions: (SessionDemographics['ageRange'] | undefined)[] = [
    undefined, '13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
  ]
  
  const genderOptions: (SessionDemographics['gender'] | undefined)[] = [
    undefined, 'male', 'female', 'non-binary'
  ]
  
  return (
    <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-sm"
      >
        <div className="flex items-center gap-2 text-gray-300">
          <Filter className="w-4 h-4" />
          <span>Demographic Filters</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-3">
          {/* Age Filter */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Age Range</label>
            <div className="flex flex-wrap gap-1">
              {ageOptions.map((age) => (
                <button
                  key={age || 'all'}
                  onClick={() => onChange({ ...filters, ageRange: age })}
                  className={cn(
                    "px-2 py-1 text-xs rounded transition-colors",
                    filters.ageRange === age
                      ? "bg-blue-500 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  )}
                >
                  {age || 'All'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Gender Filter */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Gender</label>
            <div className="flex flex-wrap gap-1">
              {genderOptions.map((gender) => (
                <button
                  key={gender || 'all'}
                  onClick={() => onChange({ ...filters, gender })}
                  className={cn(
                    "px-2 py-1 text-xs rounded capitalize transition-colors",
                    filters.gender === gender
                      ? "bg-blue-500 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  )}
                >
                  {gender || 'All'}
                </button>
              ))}
            </div>
          </div>
          
          {/* A/B Variant Filter */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">A/B Variant</label>
            <div className="flex gap-1">
              {(['all', 'A', 'B'] as const).map((variant) => (
                <button
                  key={variant}
                  onClick={() => onChange({ 
                    ...filters, 
                    variant: variant === 'all' ? undefined : variant 
                  })}
                  className={cn(
                    "px-2 py-1 text-xs rounded transition-colors",
                    (variant === 'all' && !filters.variant) || filters.variant === variant
                      ? "bg-purple-500 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  )}
                >
                  {variant === 'all' ? 'All' : `Version ${variant}`}
                </button>
              ))}
            </div>
          </div>
          
          {/* Camera Only Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Biometric sessions only</label>
            <button
              onClick={() => onChange({ 
                ...filters, 
                cameraConsentOnly: !filters.cameraConsentOnly 
              })}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors",
                filters.cameraConsentOnly ? "bg-blue-500" : "bg-gray-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                  filters.cameraConsentOnly ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function InsightsView({
  screeningId,
  screeningTitle,
  videoDuration,
  summary,
  heatmapData,
  onFilterChange,
  onSeekToMoment,
  onExportData,
}: InsightsViewProps) {
  const [filters, setFilters] = useState<HeatmapFilters>({})
  
  const handleFilterChange = (newFilters: HeatmapFilters) => {
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Audience Insights
          </h2>
          {screeningTitle && (
            <p className="text-sm text-gray-400 mt-1">{screeningTitle}</p>
          )}
        </div>
        
        {onExportData && (
          <Button variant="outline" onClick={onExportData}>
            Export Data
          </Button>
        )}
      </div>
      
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users className="w-5 h-5" />}
          label="Total Sessions"
          value={summary.totalSessions}
          subValue={`${summary.activeSessions} active`}
          color="blue"
        />
        <MetricCard
          icon={<Eye className="w-5 h-5" />}
          label="Completion Rate"
          value={formatPercent(summary.averageCompletionRate)}
          trend={summary.averageCompletionRate > 70 ? 'up' : summary.averageCompletionRate < 40 ? 'down' : 'stable'}
          color="green"
        />
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          label="Engagement Score"
          value={Math.round(summary.averageEngagementScore)}
          subValue="out of 100"
          color="purple"
        />
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Watch Time"
          value={formatDuration(summary.averageWatchTime)}
          subValue={summary.biometricSessionCount > 0 ? `${summary.biometricSessionCount} with camera` : undefined}
          color="amber"
        />
      </div>
      
      {/* Demographic Filters */}
      <DemographicFilters filters={filters} onChange={handleFilterChange} />
      
      {/* A/B Comparison (if applicable) */}
      {summary.abTestResults && (
        <ABComparisonCard results={summary.abTestResults} />
      )}
      
      {/* Timeline Heatmap */}
      <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          Engagement Timeline
        </h3>
        <TimelineHeatmap
          data={heatmapData || { 
            screeningId, 
            videoDuration: videoDuration || 0, 
            bucketSizeSeconds: 5, 
            buckets: [],
            filters: {}
          }}
          onSeek={onSeekToMoment}
        />
      </div>
      
      {/* Retention Graph */}
      <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          Viewer Retention
        </h3>
        <RetentionGraph
          data={summary.retentionCurve}
          dropOffs={summary.dropOffPoints}
          onSeek={onSeekToMoment}
        />
      </div>
      
      {/* Biometric Emotion Timeline */}
      {summary.biometricSessionCount > 0 && (
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-green-400" />
            Emotion Analysis
            <span className="text-xs text-gray-500 font-normal">
              ({summary.biometricSessionCount} camera sessions)
            </span>
          </h3>
          <EmotionTimeline
            data={summary.emotionTimeline}
            onSeek={onSeekToMoment}
          />
        </div>
      )}
      
      {/* Key Moments */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* High Engagement */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-400" />
            Top Moments
          </h3>
          <div className="space-y-2">
            {summary.highEngagementMoments.length > 0 ? (
              summary.highEngagementMoments.map((moment, i) => (
                <MomentCard
                  key={i}
                  moment={moment}
                  type="high"
                  onSeek={onSeekToMoment}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No high engagement moments detected
              </p>
            )}
          </div>
        </div>
        
        {/* Low Engagement / Problem Areas */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Areas to Improve
          </h3>
          <div className="space-y-2">
            {summary.lowEngagementMoments.length > 0 ? (
              summary.lowEngagementMoments.map((moment, i) => (
                <MomentCard
                  key={i}
                  moment={moment}
                  type="low"
                  onSeek={onSeekToMoment}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No problem areas detected
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InsightsView
