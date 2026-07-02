'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Download,
  Youtube,
  Loader2,
  Link as LinkIcon,
  ExternalLink,
  CheckCircle2,
  Globe,
  AlertCircle,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  buildLanguageAudioTrack,
  getAvailablePublishLanguages,
  getLanguageDisplayName,
} from '@/lib/publish/buildLanguageAudioTrack'
import {
  stitchAudioTrack,
  uploadAudioTrackBlob,
  AudioTrackTooLongError,
} from '@/lib/publish/stitchAudioTrack'
import type { FinalCutSelection } from '@/lib/types/finalCut'

export interface AudioTrackPublishResult {
  languageCode: string
  status: 'uploaded' | 'manual_required' | 'error'
  audioUrl: string
  error?: string
}

export interface ProductionPublishPanelProps {
  projectId: string
  userId?: string
  videoUrl?: string | null
  title?: string
  projectTitle?: string
  metadata?: unknown
}

type PublishPhase = 'idle' | 'stitching' | 'uploading' | 'publishing'

export function ProductionPublishPanel({
  projectId,
  userId,
  videoUrl,
  title,
  projectTitle,
  metadata,
}: ProductionPublishPanelProps) {
  const [youtubeConnected, setYoutubeConnected] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [publishPhase, setPublishPhase] = useState<PublishPhase>('idle')
  const [publishProgress, setPublishProgress] = useState(0)
  const [publishStatusText, setPublishStatusText] = useState('')
  const [showYoutubeConfig, setShowYoutubeConfig] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [audioTrackResults, setAudioTrackResults] = useState<AudioTrackPublishResult[]>([])
  const [selectedMlaLanguages, setSelectedMlaLanguages] = useState<string[]>([])
  const [youtubeConfig, setYoutubeConfig] = useState({
    title: title || projectTitle || 'My SceneFlow Production',
    description: '',
    privacyStatus: 'private' as 'private' | 'unlisted' | 'public',
    language: 'en',
  })

  const masterLanguage = useMemo(() => {
    const stored = (metadata as { finalCut?: FinalCutSelection } | null)?.finalCut?.language
    return stored || 'en'
  }, [metadata])

  const availableLanguages = useMemo(
    () => getAvailablePublishLanguages(metadata),
    [metadata]
  )

  const mlaCandidateLanguages = useMemo(
    () => availableLanguages.filter((l) => l !== masterLanguage),
    [availableLanguages, masterLanguage]
  )

  useEffect(() => {
    setYoutubeConfig((c) => ({ ...c, title: title || projectTitle || c.title, language: masterLanguage }))
  }, [title, projectTitle, masterLanguage])

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

  const toggleMlaLanguage = (lang: string) => {
    setSelectedMlaLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
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

    setPublishPhase('stitching')
    setPublishProgress(0)
    setPublishStatusText('Preparing audio tracks…')
    setAudioTrackResults([])
    setPublishedUrl(null)

    const projectLike = { id: projectId, metadata }
    const preparedTracks: Array<{ languageCode: string; audioUrl: string }> = []

    try {
      for (let i = 0; i < selectedMlaLanguages.length; i++) {
        const lang = selectedMlaLanguages[i]
        const label = getLanguageDisplayName(lang)
        setPublishStatusText(`Stitching ${label} audio (${i + 1}/${selectedMlaLanguages.length})…`)

        const plan = buildLanguageAudioTrack(projectLike, lang)
        if (plan.clips.length === 0) {
          toast.warning(`No ${label} audio clips found — skipping`)
          continue
        }

        const blob = await stitchAudioTrack({
          clips: plan.clips,
          totalDuration: plan.totalDuration,
          onProgress: (pct) => {
            const base = (i / selectedMlaLanguages.length) * 70
            setPublishProgress(Math.round(base + (pct / selectedMlaLanguages.length) * 0.7))
          },
        })

        setPublishPhase('uploading')
        setPublishStatusText(`Uploading ${label} audio…`)
        const audioUrl = await uploadAudioTrackBlob(blob, projectId, lang)
        preparedTracks.push({ languageCode: lang, audioUrl })
      }

      setPublishPhase('publishing')
      setPublishProgress(80)
      setPublishStatusText('Uploading video to YouTube…')

      const res = await fetch('/api/publish/youtube/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          videoUrl,
          title: youtubeConfig.title,
          description: youtubeConfig.description,
          privacyStatus: youtubeConfig.privacyStatus,
          language: masterLanguage,
          audioTracks: preparedTracks,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setPublishedUrl(data.url)
      setAudioTrackResults(data.audioTracks || [])
      setShowYoutubeConfig(false)
      setPublishProgress(100)

      const uploaded = (data.audioTracks || []).filter(
        (t: AudioTrackPublishResult) => t.status === 'uploaded'
      ).length
      const manual = (data.audioTracks || []).filter(
        (t: AudioTrackPublishResult) => t.status === 'manual_required'
      ).length

      if (uploaded > 0 && manual === 0) {
        toast.success(`Published to YouTube with ${uploaded} audio track${uploaded > 1 ? 's' : ''}`)
      } else if (manual > 0) {
        toast.success('Video published — some audio tracks need manual upload in YouTube Studio')
      } else {
        toast.success('Published to YouTube')
      }
    } catch (err: unknown) {
      if (err instanceof AudioTrackTooLongError) {
        toast.error(err.message)
      } else {
        const message = err instanceof Error ? err.message : 'YouTube publish failed'
        toast.error(message)
      }
    } finally {
      setPublishPhase('idle')
      setPublishStatusText('')
      setPublishProgress(0)
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create share link'
      toast.error(message)
    }
  }, [projectId])

  const isPublishing = publishPhase !== 'idle'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          Publish
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Download your production render, share a screening room link, or publish to YouTube with
          multi-language audio tracks.
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

            {/* MLA language selection */}
            {mlaCandidateLanguages.length > 0 ? (
              <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/40 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Multi-Language Audio (MLA)
                </div>
                <p className="text-xs text-zinc-400">
                  Upload one video with the {getLanguageDisplayName(masterLanguage)} master audio,
                  then attach dubbed tracks for other languages. Requires YouTube advanced features.
                </p>
                <div className="flex flex-wrap gap-2">
                  {mlaCandidateLanguages.map((lang) => {
                    const selected = selectedMlaLanguages.includes(lang)
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleMlaLanguage(lang)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                          selected
                            ? 'bg-blue-500/20 border-blue-400/50 text-blue-200'
                            : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:text-white'
                        )}
                      >
                        {getLanguageDisplayName(lang)}
                      </button>
                    )
                  })}
                </div>
                {selectedMlaLanguages.length > 0 ? (
                  <p className="text-xs text-zinc-500 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Audio tracks are stitched from your TTS clips and aligned to the master video
                    timeline. If YouTube MLA is not enabled on your channel, you can download the
                    files and upload manually in Studio.
                  </p>
                ) : null}
              </div>
            ) : null}

            {isPublishing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {publishStatusText || 'Publishing…'}
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${publishProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={!videoUrl}
                onClick={handlePublishToYoutube}
              >
                <Youtube className="w-4 h-4 mr-2" />
                {selectedMlaLanguages.length > 0
                  ? `Upload Video + ${selectedMlaLanguages.length} Audio Track${selectedMlaLanguages.length > 1 ? 's' : ''}`
                  : 'Upload to YouTube'}
              </Button>
            )}
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

        {/* MLA track results */}
        {audioTrackResults.length > 0 ? (
          <div className="space-y-2 pt-2 border-t border-zinc-700">
            <p className="text-xs font-medium text-zinc-300">Audio track results</p>
            {audioTrackResults.map((track) => (
              <div
                key={track.languageCode}
                className="rounded-md border border-zinc-700/60 bg-zinc-900/50 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white">
                    {getLanguageDisplayName(track.languageCode)}
                  </span>
                  {track.status === 'uploaded' ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Attached
                    </span>
                  ) : track.status === 'manual_required' ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Manual upload
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Failed
                    </span>
                  )}
                </div>
                {track.status === 'manual_required' ? (
                  <div className="mt-2 text-zinc-400 space-y-1">
                    <p>Upload in YouTube Studio:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-zinc-500">
                      <li>Open your video → Languages</li>
                      <li>Add {getLanguageDisplayName(track.languageCode)}</li>
                      <li>Click Add next to Dub → Select file</li>
                      <li>Upload the MP3 below → Publish</li>
                    </ol>
                    <a
                      href={track.audioUrl}
                      download={`${youtubeConfig.title}-${track.languageCode}.mp3`}
                      className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 mt-1"
                    >
                      <Download className="w-3 h-3" /> Download {track.languageCode} audio track
                    </a>
                  </div>
                ) : null}
                {track.status === 'error' && track.error ? (
                  <p className="mt-1 text-red-400/80">{track.error}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
