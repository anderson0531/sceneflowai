'use client'

import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Video, Image, Mic, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function SpendingAnalyticsWidget() {
  // Mock data
  const thisMonth = 2100
  const lastMonth = 1800
  const percentChange = Math.round(((thisMonth - lastMonth) / lastMonth) * 100)

  const topConsumers = [
    { name: 'Video Generation', credits: 1200, icon: <Video className="w-4 h-4 text-purple-400" /> },
    { name: 'Storyboards', credits: 600, icon: <Image className="w-4 h-4 text-blue-400" /> },
    { name: 'Voice Acting', credits: 200, icon: <Mic className="w-4 h-4 text-green-400" /> },
    { name: 'Ideation', credits: 100, icon: <Sparkles className="w-4 h-4 text-yellow-400" /> },
  ]

  // Simple 7-day trend visualization
  const weeklyData = [40, 65, 85, 55, 70, 95, 80]
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const maxValue = Math.max(...weeklyData)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-purple-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Spending Analytics</h2>
      </div>

      {/* Month Comparison */}
      <div className="flex items-baseline gap-4 mb-4">
        <div>
          <span className="text-2xl font-bold text-white">{thisMonth.toLocaleString()}</span>
          <span className="text-sm text-gray-400 ml-2">credits this month</span>
        </div>
        <div className={`flex items-center gap-1 text-sm ${percentChange > 0 ? 'text-red-400' : 'text-green-400'}`}>
          <TrendingUp className={`w-4 h-4 ${percentChange < 0 ? 'rotate-180' : ''}`} />
          <span>{percentChange > 0 ? '+' : ''}{percentChange}% vs last month</span>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">7-Day Trend</div>
        <div className="flex items-end gap-1 h-16">
          {weeklyData.map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-indigo-500/60 rounded-t transition-all duration-300 hover:bg-indigo-400"
                style={{ height: `${(value / maxValue) * 100}%` }}
              />
              <span className="text-xs text-gray-500 mt-1">{days[index]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Consumers */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">Top Consumers</div>
        <div className="space-y-2">
          {topConsumers.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {item.icon}
                <span className="text-sm text-gray-300">{item.name}</span>
              </div>
              <span className="text-sm font-medium text-white">{item.credits.toLocaleString()} cr</span>
            </div>
          ))}
        </div>
      </div>

      <Link href="/dashboard/analytics" className="block">
        <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
          Full Analytics
        </Button>
      </Link>
    </motion.div>
  )
}
