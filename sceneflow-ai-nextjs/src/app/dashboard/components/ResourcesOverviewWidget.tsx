'use client'

import { motion } from 'framer-motion'
import { HardDrive, FileText, Eye, Camera, Film, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function ResourcesOverviewWidget() {
  // Mock data - replace with real backend data
  const resources = {
    storage: {
      used: '2.4 GB',
      total: '10 GB',
      percentage: 24
    },
    assets: {
      scripts: 24,
      storyboards: 18,
      sceneDirection: 12,
      videos: 8
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Resources Overview</h3>
            <p className="text-sm text-gray-400">Storage & Assets</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Storage Usage */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-gray-300">Storage Usage</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xl font-bold text-white">{resources.storage.used}</div>
            <div className="text-sm text-gray-400">of {resources.storage.total}</div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
            <div 
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${resources.storage.percentage}%` }}
            ></div>
          </div>
          
          <div className="text-sm text-gray-400 mb-3">{resources.storage.percentage}% used</div>
          
          <div className="mt-3">
            <Link href="/dashboard/settings/storage">
              <Button variant="outline" size="sm" className="w-full border-cyan-500/50 text-cyan-300 hover:text-white hover:border-cyan-400/70">
                Manage Storage
              </Button>
            </Link>
          </div>
        </div>

        {/* Asset Counts */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Production Assets</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{resources.assets.scripts}</div>
                <div className="text-xs text-gray-400">Scripts</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <Eye className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{resources.assets.storyboards}</div>
                <div className="text-xs text-gray-400">Storyboards</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{resources.assets.sceneDirection}</div>
                <div className="text-xs text-gray-400">Scene Direction</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center">
                <Film className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{resources.assets.videos}</div>
                <div className="text-xs text-gray-400">Videos</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Link href="/dashboard/settings/integrations">
              <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
                <Download className="w-4 h-4 mr-2" />
                Manage Assets
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <Link href="/dashboard/settings/storage">
            <Button variant="ghost" size="sm" className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800/50">
              <HardDrive className="w-4 h-4 mr-2" />
              Storage Settings
            </Button>
          </Link>
          <Link href="/dashboard/settings/integrations">
            <Button variant="ghost" size="sm" className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800/50">
              <Download className="w-4 h-4 mr-2" />
              Asset Management
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
