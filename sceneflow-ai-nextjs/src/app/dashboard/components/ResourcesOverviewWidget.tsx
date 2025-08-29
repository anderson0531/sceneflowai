'use client'

import { motion } from 'framer-motion'
import { HardDrive, FileText, Eye, Camera, Film, Download, BarChart3, BookOpen, Cloud, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function ResourcesOverviewWidget() {
  // Mock data (Professional Plan Storage)
  const storage = { used: 120, total: 500 }; // GB
  const storagePercentage = (storage.used / storage.total) * 100;

  const seriesBibles = [
    { id: 1, title: 'The Crew', episodes: 12, lastUpdated: '2 days ago', collaborators: 3 },
    { id: 2, title: 'Space Frontier', episodes: 8, lastUpdated: '1 week ago', collaborators: 2 },
    { id: 3, title: 'Urban Legends', episodes: 6, lastUpdated: '3 days ago', collaborators: 4 }
  ]

  const assetLibrary = {
    videos: { count: 45, size: '2.1GB' },
    images: { count: 128, size: '856MB' },
    audio: { count: 23, size: '234MB' },
    templates: { count: 12, size: '89MB' }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
    >
      <h2 className="text-xl font-semibold mb-5 text-white">Production Resources</h2>

      {/* Quick Access Links */}
      <div className="space-y-4 mb-6">
        <Link href="/dashboard/series-bibles">
          <div className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-150 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white group-hover:text-blue-300 transition-colors">
                  📚 Series Bibles
                </h3>
                <p className="text-sm text-gray-400">Shared storylines, characters, and settings.</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{seriesBibles.length} active series</span>
                  <span>•</span>
                  <span>Latest: {seriesBibles[0]?.lastUpdated}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboard/asset-library">
          <div className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-150 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white group-hover:text-green-300 transition-colors">
                  ☁️ Asset Library
                </h3>
                <p className="text-sm text-gray-400">Manage reusable assets (video, images, audio).</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{assetLibrary.videos.count + assetLibrary.images.count} assets</span>
                  <span>•</span>
                  <span>Total: {assetLibrary.videos.size}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Storage Usage */}
      <div>
        <h3 className="text-base font-medium mb-2 text-gray-300">Cloud Storage Usage</h3>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">{storage.used} GB Used</span>
          <span className="text-gray-400">{storage.total} GB Total</span>
        </div>
        {/* Use a different color (Purple) than Credits (Indigo) */}
        <div className="w-full bg-gray-900 rounded-full h-2.5 mb-3">
          <div className="bg-purple-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${storagePercentage}%` }}></div>
        </div>
        <p className="text-xs text-gray-500 mb-4">{storagePercentage}% of storage used</p>
        
        <div className="flex gap-2">
          <Link href="/dashboard/settings/storage" className="flex-1">
            <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
              <HardDrive className="w-4 h-4 mr-2" />
              Storage Settings
            </Button>
          </Link>
          <Link href="/dashboard/analytics/resources" className="flex-1">
            <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
