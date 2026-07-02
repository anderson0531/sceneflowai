'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Download,
  Youtube,
  Loader2,
  Link as LinkIcon,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface ProductionPublishPanelProps {
  projectId: string
  userId?: string
  videoUrl?: string | null
  title?: string
  projectTitle?: string
}

export function ProductionPublishPanel({
  projectId,
  userId,
  videoUrl,
  title,
  projectTitle,
}: ProductionPublishPanelProps) {
  const [youtubeConnected, setYoutubeConnected] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showYoutubeConfig, setShowYoutubeConfig] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [youtubeConfig, setYoutubeConfig] = useState({
    title: title || projectTitle || 'My SceneFlow Production',
    description: '',
    privacyStatus: 'private' as 'private' | 'unlisted' | 'public',
    language: 'en',
  })

  useEffect(() => {
    setYoutubeConfig((c) => ({ ...c, title: title || projectTitle || c.title }))
  }, [title, projectTitle])

  useEffect(() => {
    if (!userId) {
      setCheckingAuth(false)
      return
    }
    fetch(`/api/publish/youtube/upload?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => setYoutubeConnected(!!d.connected))
      .catch(() => setYoutubeConnected(false))
      .finally(() => setCheckingAuth(false))
  }, [userId])

  const handleConnectYouTube = () => {
    if (!userId) {
      toast.error('Sign in to connect YouTube')
      return
    }
    const returnTo = `${window.location.pathname}${window.location.search}`
    window.location.href = `/api/publish/youtube/auth?userId=${encodeURIComponent(userId)}&returnTo=${encodeURIComponent(returnTo)}`
  }

  const handleDownload = async () => {
    if (!videoUrl) return
    setIsDownloading(true)
    try {
      const a = document.createElement('a')
      a.href = videoUrl
      a.download = `${youtubeConfig.title || 'production'}.mp4`
      a.rel = 'noopener'
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      toast.error('Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePublishToYoutube = async () => {
    if (!videoUrl || !userId) return
    setIsPublishing(true)
    try {
      const res = await fetch('/api/publish/youtube/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          videoUrl,
          title: youtubeConfig.title,
          description: youtubeConfig.description,
          privacyStatus: youtubeConfig.privacyStatus,
          language: youtubeConfig.language,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setPublishedUrl(data.url)
      setShowYoutubeConfig(false)
      toast.success('Published to YouTube')
    } catch (err: any) {
      toast.error(err?.message || 'YouTube publish failed')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleCreateShareLink = useCallback(async () => {
    try {
      const res = await fetch('/api/vision/create-share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, linkType: 'screening-room' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create share link')
      const url = data.shareUrl || data.url
      if (url) {
        setShareUrl(url)
        await navigator.clipboard.writeText(url)
        toast.success('Screening room link copied')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not create share link')
    }
  }, [projectId])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          Publish
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Download your production render, share a screening room link, or publish to YouTube.
        </p>
      </div>

      {!videoUrl ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Run a Production Render first to generate the master MP4 for download and publishing.
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1 bg-zinc-800 border-zinc-700"
          disabled={!videoUrl || isDownloading}
          onClick={handleDownload}
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Download MP4
        </Button>
        <Button
          variant="outline"
          className="flex-1 bg-zinc-800 border-zinc-700"
          onClick={handleCreateShareLink}
        >
          <LinkIcon className="w-4 h-4 mr-2" />
          Share Screening Room
        </Button>
      </div>

      {shareUrl ? (
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1"
        >
          Open share link <ExternalLink className="w-3 h-3" />
        </a>
      ) : null}

      <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-3">
        {checkingAuth ? (
          <p className="text-sm text-zinc-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking YouTube connection…
          </p>
        ) : youtubeConnected ? (
          <p className="text-sm text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> YouTube connected
          </p>
        ) : (
          <Button variant="outline" className="w-full" onClick={handleConnectYouTube}>
            <Youtube className="w-4 h-4 mr-2 text-red-500" />
            Connect YouTube Account
          </Button>
        )}

        <Button
          variant="outline"
          className={cn(
            'w-full',
            showYoutubeConfig && 'bg-red-500/20 border-red-500/50 text-red-300'
          )}
          disabled={!videoUrl || !youtubeConnected}
          onClick={() => setShowYoutubeConfig((v) => !v)}
        >
          <Youtube className="w-4 h-4 mr-2" />
          Publish to YouTube
        </Button>

        {showYoutubeConfig ? (
          <div className="space-y-3 pt-2 border-t border-zinc-700">
            <input
              type="text"
              value={youtubeConfig.title}
              onChange={(e) => setYoutubeConfig({ ...youtubeConfig, title: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
              placeholder="Title"
            />
            <textarea
              value={youtubeConfig.description}
              onChange={(e) =>
                setYoutubeConfig({ ...youtubeConfig, description: e.target.value })
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
              rows={3}
              placeholder="Description"
            />
            <select
              value={youtubeConfig.privacyStatus}
              onChange={(e) =>
                setYoutubeConfig({
                  ...youtubeConfig,
                  privacyStatus: e.target.value as 'private' | 'unlisted' | 'public',
                })
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={!videoUrl || isPublishing}
              onClick={handlePublishToYoutube}
            >
              {isPublishing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Youtube className="w-4 h-4 mr-2" />
              )}
              Upload to YouTube
            </Button>
          </div>
        ) : null}

        {publishedUrl ? (
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1"
          >
            View on YouTube <ExternalLink className="w-3 h-3" />
          </a>
        ) : null}
      </div>
    </div>
  )
}
