'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Youtube,
  Settings,
  Image as ImageIcon,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface PublishingHubProps {
  videoUrl?: string
  title?: string
}

export function PublishingHub({ videoUrl, title }: PublishingHubProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showYoutubeConfig, setShowYoutubeConfig] = useState(false)
  const [youtubeConfig, setYoutubeConfig] = useState({
    title: title || '',
    description: '',
    language: 'en',
    privacyStatus: 'private',
  })

  const handleDownload = async () => {
    if (!videoUrl) return
    setIsDownloading(true)
    try {
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${title || 'video'}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePublishToYoutube = async () => {
    if (!videoUrl) return
    setIsPublishing(true)
    // Simulate YouTube publish
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsPublishing(false)
    setShowYoutubeConfig(false)
    alert('Published to YouTube successfully!')
  }

  return (
    <div className="p-4 bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-700/70">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
        <Youtube className="w-4 h-4 text-red-500" />
        Publishing Hub
      </h3>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:text-white"
          disabled={!videoUrl || isDownloading}
          onClick={handleDownload}
        >
          {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Download MP4
        </Button>
        <Button
          variant="outline"
          className={cn("flex-1", showYoutubeConfig ? "bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:text-white")}
          disabled={!videoUrl}
          onClick={() => setShowYoutubeConfig(!showYoutubeConfig)}
        >
          <Youtube className="w-4 h-4 mr-2" />
          Publish to YouTube
        </Button>
      </div>

      <AnimatePresence>
        {showYoutubeConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 border border-zinc-700 rounded-lg bg-zinc-950/50 space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Title</label>
                <input
                  type="text"
                  value={youtubeConfig.title}
                  onChange={e => setYoutubeConfig({ ...youtubeConfig, title: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Description</label>
                <textarea
                  value={youtubeConfig.description}
                  onChange={e => setYoutubeConfig({ ...youtubeConfig, description: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Visibility</label>
                  <select
                    value={youtubeConfig.privacyStatus}
                    onChange={e => setYoutubeConfig({ ...youtubeConfig, privacyStatus: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Language</label>
                  <select
                    value={youtubeConfig.language}
                    onChange={e => setYoutubeConfig({ ...youtubeConfig, language: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowYoutubeConfig(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-500 text-white border-transparent"
                  onClick={handlePublishToYoutube}
                  disabled={isPublishing}
                >
                  {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Confirm Publish
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
