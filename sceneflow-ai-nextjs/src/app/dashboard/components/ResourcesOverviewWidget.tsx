'use client'

import { motion } from 'framer-motion'
import { HardDrive, FileText, Eye, Camera, Film, Download, BarChart3, Database } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function ResourcesOverviewWidget() {
  // Mock data for resources overview
  const storageData = {
    used: 2.4, // GB
    total: 10, // GB
    percentage: 24
  }

  const assetsData = {
    scripts: 12,
    storyboards: 8,
    sceneDirection: 15,
    videos: 6
  }

  const recentActivity = [
    { type: 'script', name: 'Scene 3 Dialogue', size: '45KB', time: '2 hours ago' },
    { type: 'storyboard', name: 'Opening Sequence', size: '2.1MB', time: '1 day ago' },
    { type: 'video', name: 'Final Cut v2', size: '156MB', time: '3 days ago' }
  ]

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'script': return <FileText className="w-4 h-4 text-blue-400" />
      case 'storyboard': return <Eye className="w-4 h-4 text-green-400" />
      case 'sceneDirection': return <Camera className="w-4 h-4 text-purple-400" />
      case 'video': return <Film className="w-4 h-4 text-red-400" />
      default: return <FileText className="w-4 h-4 text-gray-400" />
    }
  }

  const getAssetColor = (type: string) => {
    switch (type) {
      case 'script': return 'bg-blue-600/20 text-blue-400'
      case 'storyboard': return 'bg-green-600/20 text-green-400'
      case 'sceneDirection': return 'bg-purple-600/20 text-purple-400'
      case 'video': return 'bg-red-600/20 text-red-400'
      default: return 'bg-gray-600/20 text-gray-400'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
    >
      <h2 className="text-xl font-semibold mb-4 text-white">Resources Overview</h2>
      
      {/* Storage Usage */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Storage Usage</span>
          </div>
          <span className="text-sm text-gray-400">{storageData.percentage}%</span>
        </div>
        
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-white">{storageData.used}GB</span>
          <span className="text-sm text-gray-400">of {storageData.total}GB</span>
        </div>
        
        {/* Storage Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${storageData.percentage}%` }}
          ></div>
        </div>
        
        <Link href="/dashboard/settings/storage">
          <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
            Manage Storage
          </Button>
        </Link>
      </div>

      {/* Production Assets Grid */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Production Assets</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white">{assetsData.scripts}</div>
            <div className="text-xs text-gray-400">Scripts</div>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Eye className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-lg font-bold text-white">{assetsData.storyboards}</div>
            <div className="text-xs text-gray-400">Storyboards</div>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Camera className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-lg font-bold text-white">{assetsData.sceneDirection}</div>
            <div className="text-xs text-gray-400">Scene Direction</div>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Film className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-lg font-bold text-white">{assetsData.videos}</div>
            <div className="text-xs text-gray-400">Videos</div>
          </div>
        </div>
        
        <Link href="/dashboard/assets" className="block mt-3">
          <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
            Manage Assets
          </Button>
        </Link>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center gap-3 p-2 bg-gray-900/30 rounded-lg">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getAssetColor(activity.type)}`}>
                {getAssetIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{activity.name}</div>
                <div className="text-xs text-gray-400">{activity.size} • {activity.time}</div>
              </div>
              <Download className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
            </div>
          ))}
        </div>
        
        <Link href="/dashboard/analytics" className="block mt-3">
          <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}
