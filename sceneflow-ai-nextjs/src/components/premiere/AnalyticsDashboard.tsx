'use client'

import React, { useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Clock,
  MessageSquare,
  Heart,
  AlertTriangle,
  ThumbsUp,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScreeningAnalytics, RetentionPoint, DropOffPoint } from '@/lib/types/finalCut'

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsDashboardProps {
  /** Analytics data */
  analytics: ScreeningAnalytics
  /** Screening title for context */
  screeningTitle?: string
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

// ============================================================================
// Sub-components
// ============================================================================

function MetricCard({
  icon,
  label,
  value,
  subValue,
  trend,
  trendValue,
  color = 'gray'
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  color?: 'gray' | 'green' | 'blue' | 'purple' | 'amber'
}) {
  const colorClasses = {
    gray: 'text-gray-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400'
  }
  
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
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
        {trend && trendValue && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            trend === 'up' ? 'text-green-400' : 
            trend === 'down' ? 'text-red-400' : 'text-gray-400'
          )}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
             trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
             <Activity className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  )
}

function RetentionChart({ data }: { data: RetentionPoint[] }) {
  const maxPercentage = 100
  const chartHeight = 120
  
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-gray-200">Retention Curve</span>
      </div>
      
      {data.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
          Not enough data yet
        </div>
      ) : (
        <div className="relative" style={{ height: chartHeight }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>
          
          {/* Chart area */}
          <div className="ml-10 relative h-full">
            <svg 
              className="w-full h-full" 
              viewBox={`0 0 ${data.length * 10} ${chartHeight}`}
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              <line x1="0" y1={chartHeight / 2} x2={data.length * 10} y2={chartHeight / 2} 
                stroke="rgb(55, 65, 81)" strokeDasharray="4" />
              
              {/* Retention line */}
              <path
                d={`M 0 ${chartHeight - (data[0]?.percentage || 0) / maxPercentage * chartHeight} ${
                  data.map((point, i) => 
                    `L ${i * 10} ${chartHeight - (point.percentage / maxPercentage) * chartHeight}`
                  ).join(' ')
                }`}
                fill="none"
                stroke="rgb(59, 130, 246)"
                strokeWidth="2"
              />
              
              {/* Area fill */}
              <path
                d={`M 0 ${chartHeight} L 0 ${chartHeight - (data[0]?.percentage || 0) / maxPercentage * chartHeight} ${
                  data.map((point, i) => 
                    `L ${i * 10} ${chartHeight - (point.percentage / maxPercentage) * chartHeight}`
                  ).join(' ')
                } L ${(data.length - 1) * 10} ${chartHeight} Z`}
                fill="url(#retention-gradient)"
                opacity="0.3"
              />
              
              <defs>
                <linearGradient id="retention-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(59, 130, 246)" />
                  <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      )}
      
      <div className="flex justify-between text-xs text-gray-500 mt-2 ml-10">
        <span>0:00</span>
        <span>End</span>
      </div>
    </div>
  )
}

function DropOffList({ data }: { data: DropOffPoint[] }) {
  const topDropOffs = data
    .sort((a, b) => b.dropOffCount - a.dropOffCount)
    .slice(0, 5)
  
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-gray-200">Drop-off Points</span>
      </div>
      
      {topDropOffs.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-4">
          No significant drop-offs detected
        </div>
      ) : (
        <div className="space-y-2">
          {topDropOffs.map((point, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-2 bg-gray-900/50 rounded"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {formatDuration(point.timestamp)}
                </span>
                {point.sceneNumber && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded">
                    Scene {point.sceneNumber}
                  </span>
                )}
              </div>
              <span className="text-sm text-red-400">
                -{point.dropOffCount} viewers
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DeviceBreakdown({ data }: { data: ScreeningAnalytics['deviceBreakdown'] }) {
  const total = data.desktop + data.mobile + data.tablet + data.tv + data.unknown
  
  const devices = [
    { name: 'Desktop', count: data.desktop, color: 'bg-blue-500' },
    { name: 'Mobile', count: data.mobile, color: 'bg-green-500' },
    { name: 'Tablet', count: data.tablet, color: 'bg-purple-500' },
    { name: 'TV', count: data.tv, color: 'bg-amber-500' },
    { name: 'Other', count: data.unknown, color: 'bg-gray-500' }
  ].filter(d => d.count > 0)
  
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-gray-200">Devices</span>
      </div>
      
      {total === 0 ? (
        <div className="text-center text-gray-500 text-sm py-4">
          No device data yet
        </div>
      ) : (
        <>
          {/* Bar */}
          <div className="flex h-3 rounded-full overflow-hidden mb-3">
            {devices.map((device, i) => (
              <div
                key={device.name}
                className={cn(device.color, 'transition-all')}
                style={{ width: `${(device.count / total) * 100}%` }}
              />
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {devices.map((device) => (
              <div key={device.name} className="flex items-center gap-1.5 text-xs">
                <div className={cn('w-2 h-2 rounded-full', device.color)} />
                <span className="text-gray-400">{device.name}</span>
                <span className="text-gray-500">
                  {formatPercent((device.count / total) * 100)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// AnalyticsDashboard Component
// ============================================================================

export function AnalyticsDashboard({
  analytics,
  screeningTitle
}: AnalyticsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      {screeningTitle && (
        <div>
          <h3 className="text-lg font-semibold text-white">{screeningTitle}</h3>
          <p className="text-sm text-gray-400">Screening analytics and engagement metrics</p>
        </div>
      )}
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Eye className="w-5 h-5" />}
          label="Total Views"
          value={analytics.totalViews}
          subValue={`${analytics.uniqueViewers} unique`}
          color="blue"
        />
        
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg. Watch Time"
          value={formatDuration(analytics.averageWatchTime)}
          color="green"
        />
        
        <MetricCard
          icon={<ThumbsUp className="w-5 h-5" />}
          label="Completion Rate"
          value={formatPercent(analytics.completionRate)}
          color="purple"
        />
        
        <MetricCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="Engagement"
          value={formatPercent(analytics.engagementRate)}
          subValue={`${analytics.totalComments} comments`}
          color="amber"
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RetentionChart data={analytics.retentionCurve} />
        <DropOffList data={analytics.dropOffPoints} />
      </div>
      
      {/* Device Breakdown */}
      <DeviceBreakdown data={analytics.deviceBreakdown} />
    </div>
  )
}
