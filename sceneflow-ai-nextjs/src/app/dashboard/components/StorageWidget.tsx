'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HardDrive, Download, Trash2, FolderOpen, Image, Video, Music, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface StorageData {
  used_gb: number
  total_gb: number
  breakdown: {
    images: number
    videos: number
    audio: number
    other: number
  }
}

interface StorageWidgetProps {
  storageUsedGb?: number
  storageLimitGb?: number
}

export function StorageWidget({ storageUsedGb = 0, storageLimitGb = 10 }: StorageWidgetProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  // Calculate percentage
  const usedGb = storageUsedGb
  const totalGb = storageLimitGb
  const percentageUsed = totalGb > 0 ? Math.min(100, (usedGb / totalGb) * 100) : 0
  
  // Determine status color
  const getStatusColor = () => {
    if (percentageUsed >= 90) return 'bg-red-500'
    if (percentageUsed >= 75) return 'bg-yellow-500'
    return 'bg-emerald-500'
  }

  // Estimate breakdown (placeholder - would be from API)
  const estimatedBreakdown = {
    images: usedGb * 0.3,
    videos: usedGb * 0.5,
    audio: usedGb * 0.15,
    other: usedGb * 0.05
  }

  const formatSize = (gb: number) => {
    if (gb < 0.01) return '< 10 MB'
    if (gb < 1) return `${Math.round(gb * 1000)} MB`
    return `${gb.toFixed(1)} GB`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
          <HardDrive className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Storage</h2>
          <p className="text-xs text-gray-400">Cloud asset storage</p>
        </div>
      </div>

      {/* Storage Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">{formatSize(usedGb)} used</span>
          <span className="text-gray-400">{formatSize(totalGb)} total</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${getStatusColor()}`}
            style={{ width: `${percentageUsed}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 text-center">
          {percentageUsed.toFixed(0)}% of storage used
        </p>
      </div>

      {/* Breakdown */}
      {usedGb > 0 && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300">Videos</span>
            </div>
            <span className="text-gray-400">{formatSize(estimatedBreakdown.videos)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">Images</span>
            </div>
            <span className="text-gray-400">{formatSize(estimatedBreakdown.images)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Audio</span>
            </div>
            <span className="text-gray-400">{formatSize(estimatedBreakdown.audio)}</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {usedGb === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p>No assets stored yet</p>
          <p className="text-xs mt-1">Assets are created when you generate content</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <Link href="/dashboard/settings/storage" className="flex-1" prefetch={false}>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Manage Storage
          </Button>
        </Link>
      </div>

      {/* Upgrade hint for low storage */}
      {percentageUsed >= 75 && (
        <p className="text-xs text-yellow-400 mt-3 text-center">
          ⚠️ Storage running low. <Link href="/dashboard/settings/billing" className="underline hover:text-yellow-300">Upgrade plan</Link> for more space.
        </p>
      )}
    </motion.div>
  )
}
