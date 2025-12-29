'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  HardDrive, Download, Trash2, FolderOpen, Image, Video, Music, 
  FileText, Search, Filter, ArrowUpDown, AlertTriangle, CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'

// Placeholder asset data - will be replaced with API data
const mockAssets = [
  { id: '1', name: 'scene_001_final.mp4', type: 'video', size: 245.6, project: 'The Arrival', createdAt: '2024-12-28' },
  { id: '2', name: 'character_hero_ref.png', type: 'image', size: 2.4, project: 'The Arrival', createdAt: '2024-12-27' },
  { id: '3', name: 'scene_002_draft.mp4', type: 'video', size: 189.2, project: 'The Arrival', createdAt: '2024-12-26' },
  { id: '4', name: 'background_music.mp3', type: 'audio', size: 8.5, project: 'YouTube Promo', createdAt: '2024-12-25' },
  { id: '5', name: 'thumbnail_v2.png', type: 'image', size: 1.2, project: 'YouTube Promo', createdAt: '2024-12-24' },
]

export default function StorageSettingsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  // Storage stats - would come from API
  const storageUsed = 0.45 // GB
  const storageLimit = 10 // GB
  const percentageUsed = (storageUsed / storageLimit) * 100

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-purple-400" />
      case 'image': return <Image className="w-4 h-4 text-blue-400" />
      case 'audio': return <Music className="w-4 h-4 text-green-400" />
      default: return <FileText className="w-4 h-4 text-gray-400" />
    }
  }

  const formatSize = (mb: number) => {
    if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`
    return `${mb.toFixed(1)} MB`
  }

  const toggleAssetSelection = (id: string) => {
    setSelectedAssets(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const selectAllAssets = () => {
    if (selectedAssets.length === mockAssets.length) {
      setSelectedAssets([])
    } else {
      setSelectedAssets(mockAssets.map(a => a.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedAssets.length === 0) return
    setIsDeleting(true)
    // Simulate deletion
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsDeleting(false)
    setSelectedAssets([])
    // Would refresh asset list here
  }

  const filteredAssets = mockAssets.filter(asset => 
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.project.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Storage Management</h1>
              <p className="text-gray-400 mt-1">
                Manage your cloud storage and downloadable assets
              </p>
            </div>
          </div>
        </motion.div>

        {/* Storage Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Storage Usage</h2>
            <Link href="/dashboard/settings/billing">
              <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:text-white">
                Upgrade Storage
              </Button>
            </Link>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">{storageUsed.toFixed(2)} GB used</span>
              <span className="text-gray-400">{storageLimit} GB total</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ${
                  percentageUsed >= 90 ? 'bg-red-500' :
                  percentageUsed >= 75 ? 'bg-yellow-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${percentageUsed}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {percentageUsed.toFixed(1)}% of storage used • {(storageLimit - storageUsed).toFixed(2)} GB available
            </p>
          </div>

          {/* Storage Breakdown */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div className="text-center">
              <Video className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <p className="text-lg font-semibold text-white">0.4 GB</p>
              <p className="text-xs text-gray-500">Videos</p>
            </div>
            <div className="text-center">
              <Image className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-semibold text-white">0.04 GB</p>
              <p className="text-xs text-gray-500">Images</p>
            </div>
            <div className="text-center">
              <Music className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="text-lg font-semibold text-white">0.01 GB</p>
              <p className="text-xs text-gray-500">Audio</p>
            </div>
          </div>
        </motion.div>

        {/* Asset Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden"
        >
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-700 flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="pl-10 bg-gray-900 border-gray-600 text-white"
              />
            </div>
            
            {selectedAssets.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{selectedAssets.length} selected</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-gray-600 text-gray-300 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-red-600/50 text-red-400 hover:text-red-300 hover:border-red-500"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-600 text-gray-300 hover:text-white"
                onClick={selectAllAssets}
              >
                Select All
              </Button>
            )}
          </div>

          {/* Asset List */}
          <div className="divide-y divide-gray-700/50">
            {filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => (
                <div 
                  key={asset.id}
                  className={`flex items-center gap-4 p-4 hover:bg-gray-700/30 transition-colors cursor-pointer ${
                    selectedAssets.includes(asset.id) ? 'bg-gray-700/50' : ''
                  }`}
                  onClick={() => toggleAssetSelection(asset.id)}
                >
                  <input 
                    type="checkbox"
                    checked={selectedAssets.includes(asset.id)}
                    onChange={() => toggleAssetSelection(asset.id)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  
                  <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                    {getFileIcon(asset.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{asset.name}</p>
                    <p className="text-xs text-gray-500">{asset.project} • {asset.createdAt}</p>
                  </div>
                  
                  <span className="text-sm text-gray-400">{formatSize(asset.size)}</span>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-2 text-gray-500 hover:text-white transition-colors"
                      onClick={(e) => { e.stopPropagation(); /* download */ }}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                      onClick={(e) => { e.stopPropagation(); /* delete */ }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400">No assets found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery ? 'Try a different search term' : 'Generated assets will appear here'}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-blue-900/20 border border-blue-700/30 rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold text-blue-300 mb-2">💡 Storage Tips</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Download assets you want to keep, then delete from cloud to free space</li>
            <li>• Video files take the most storage - consider exporting only final versions</li>
            <li>• Upgrade your plan for more storage and priority processing</li>
          </ul>
        </motion.div>

        {/* Back to Dashboard */}
        <div className="mt-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
