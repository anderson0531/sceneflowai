import React from 'react'
import {
  Eye,
  Users,
  TrendingUp,
  Clock,
  Smile,
  Activity,
  TrendingDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AggregatedStats {
  totalScreenings: number
  totalViewers: number
  averageCompletion: number
  averageWatchTime: number
  emotionBreakdown: {
    happy: number
    surprised: number
    engaged: number
    neutral: number
    confused: number
    bored: number
  }
  completionTrend?: 'up' | 'down' | 'stable'
  viewerTrend?: 'up' | 'down' | 'stable'
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

export function StatCard({
  icon,
  label,
  value,
  subValue,
  trend,
  color = 'emerald',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'stable'
  color?: 'emerald' | 'blue' | 'purple' | 'amber' | 'gray' | 'violet'
}) {
  const colorClasses = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    gray: 'text-zinc-400',
    violet: 'text-violet-400',
  }

  return (
    <div className="p-4 bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-700/70 hover:border-zinc-600 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <span className={colorClasses[color]}>{icon}</span>
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
          {subValue && <div className="text-xs text-zinc-500 mt-1">{subValue}</div>}
        </div>
        {trend && (
          <span
            className={cn(
              'text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full',
              trend === 'up' ? 'text-green-400 bg-green-500/10' : 
              trend === 'down' ? 'text-red-400 bg-red-500/10' : 
              'text-zinc-400 bg-zinc-500/10'
            )}
          >
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
             trend === 'down' ? <TrendingDown className="w-3 h-3" /> : 
             <Activity className="w-3 h-3" />}
            {trend === 'up' ? '+12%' : trend === 'down' ? '-5%' : '0%'}
          </span>
        )}
      </div>
    </div>
  )
}

export function EmotionBreakdown({ data }: { data: AggregatedStats['emotionBreakdown'] }) {
  const emotions = [
    { key: 'engaged', label: 'Engaged', emoji: '🎯', color: 'bg-emerald-500' },
    { key: 'happy', label: 'Happy', emoji: '😊', color: 'bg-yellow-500' },
    { key: 'surprised', label: 'Surprised', emoji: '😲', color: 'bg-blue-500' },
    { key: 'neutral', label: 'Neutral', emoji: '😐', color: 'bg-zinc-500' },
    { key: 'confused', label: 'Confused', emoji: '😕', color: 'bg-orange-500' },
    { key: 'bored', label: 'Bored', emoji: '🥱', color: 'bg-red-500' },
  ]
  
  const total = Object.values(data).reduce((sum, val) => sum + val, 0)

  return (
    <div className="p-4 bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-700/70 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Smile className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-medium text-white">Audience Emotions</span>
      </div>
      
      {/* Stacked Bar */}
      <div className="h-3 rounded-full overflow-hidden flex mb-4">
        {emotions.map(({ key, color }) => {
          const percentage = total > 0 ? (data[key as keyof typeof data] / total) * 100 : 0
          return (
            <div
              key={key}
              className={cn(color, 'transition-all duration-300')}
              style={{ width: `${percentage}%` }}
            />
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="grid grid-cols-3 gap-2">
        {emotions.map(({ key, label, emoji }) => {
          const percentage = total > 0 ? Math.round((data[key as keyof typeof data] / total) * 100) : 0
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <span>{emoji}</span>
              <span className="text-zinc-400">{label}</span>
              <span className="text-white font-medium ml-auto tabular-nums">{percentage}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
