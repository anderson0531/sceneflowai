'use client'

import React, { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Youtube,
  Check,
  Loader2,
  Image as ImageIcon,
  Link2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { appendSceneFlowCta } from '@/lib/premiere/distributionMetadata'

const LOCALES = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
]

interface PublishingWizardProps {
  projectId?: string
  videoUrl?: string
  title?: string
  thumbnailUrl?: string
  onPublished?: (platformUrl: string) => void
  className?: string
}

type WizardStep = 'video' | 'thumbnail' | 'metadata' | 'settings' | 'review'

export function PublishingWizard({
  projectId,
  videoUrl,
  title: initialTitle,
  thumbnailUrl: initialThumbnail,
  onPublished,
  className,
}: PublishingWizardProps) {
  const [step, setStep] = useState<WizardStep>('video')
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [youtubeConnected, setYoutubeConnected] = useState(false)
  const [config, setConfig] = useState({
    title: initialTitle || '',
    description: '',
    locale: 'en',
    privacyStatus: 'private',
    tags: 'SceneFlow,video',
    categoryId: '22',
    madeForKids: false,
    includeSceneFlowCta: true,
    thumbnailUrl: initialThumbnail || '',
  })

  React.useEffect(() => {
    fetch('/api/publish/youtube')
      .then((r) => r.json())
      .then((d) => setYoutubeConnected(!!d.connected))
      .catch(() => {})
  }, [])

  const steps: WizardStep[] = ['video', 'thumbnail', 'metadata', 'settings', 'review']
  const stepIndex = steps.indexOf(step)

  const handleDownload = async () => {
    if (!videoUrl) return
    setIsDownloading(true)
    try {
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${config.title || 'master'}.mp4`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }

  const generateMetadata = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/inspiration/descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: config.title || initialTitle,
          locale: config.locale,
          includeSceneFlowCta: config.includeSceneFlowCta,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setConfig((c) => ({
        ...c,
        title: data.title || c.title,
        description: data.description || c.description,
      }))
      toast.success('Metadata generated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (!projectId || !videoUrl) return
    setIsPublishing(true)
    try {
      const res = await fetch('/api/publish/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          videoUrl,
          title: config.title,
          description: appendSceneFlowCta(
            config.description,
            config.locale,
            config.includeSceneFlowCta
          ),
          locale: config.locale,
          privacyStatus: config.privacyStatus,
          thumbnailUrl: config.thumbnailUrl,
          tags: config.tags.split(',').map((t) => t.trim()).filter(Boolean),
          categoryId: config.categoryId,
          madeForKids: config.madeForKids,
          includeSceneFlowCta: config.includeSceneFlowCta,
        }),
      })
      const data = await res.json()
      if (!res.ok && !data.job) throw new Error(data.error || 'Publish failed')
      if (data.job?.platformUrl) {
        toast.success('Published to YouTube', {
          action: { label: 'Open', onClick: () => window.open(data.job.platformUrl, '_blank') },
        })
        onPublished?.(data.job.platformUrl)
      } else {
        toast.message('Publish job saved', { description: data.message || 'Connect YouTube to complete.' })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className={cn('rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-500" />
          YouTube publish
        </h3>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
          Step {stepIndex + 1}/{steps.length}
        </span>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          disabled={!videoUrl || isDownloading}
          onClick={handleDownload}
          className="border-zinc-700"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span className="ml-1.5 hidden sm:inline">Download MP4</span>
        </Button>
        {!youtubeConnected && (
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700"
            onClick={() => toast.message('YouTube connect', { description: 'Set GOOGLE_CLIENT_ID to enable OAuth.' })}
          >
            <Link2 className="w-4 h-4 mr-1.5" />
            Connect channel
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
          {step === 'video' && (
            <div className="space-y-2 text-sm text-zinc-400">
              <p>Master video ready for publish.</p>
              {videoUrl ? (
                <video src={videoUrl} controls className="w-full rounded-lg max-h-40 bg-black" />
              ) : (
                <p className="text-amber-300">Export from Final Cut first.</p>
              )}
            </div>
          )}
          {step === 'thumbnail' && (
            <div className="space-y-3">
              <label className="text-xs text-zinc-400">Thumbnail URL</label>
              <input
                value={config.thumbnailUrl}
                onChange={(e) => setConfig({ ...config, thumbnailUrl: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                placeholder="Billboard or custom thumbnail URL"
              />
              {config.thumbnailUrl && (
                <img src={config.thumbnailUrl} alt="" className="rounded-lg max-h-32 object-cover" />
              )}
            </div>
          )}
          {step === 'metadata' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {LOCALES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setConfig({ ...config, locale: l.id })}
                    className={cn(
                      'px-2 py-1 rounded text-xs',
                      config.locale === l.id ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <input
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                placeholder="Title"
              />
              <textarea
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                placeholder="Description (SceneFlow CTA appended on publish)"
              />
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={config.includeSceneFlowCta}
                  onChange={(e) => setConfig({ ...config, includeSceneFlowCta: e.target.checked })}
                />
                Include SceneFlow attribution in description
              </label>
              <Button size="sm" variant="outline" onClick={generateMetadata} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Generate with AI
              </Button>
            </div>
          )}
          {step === 'settings' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400">Visibility</label>
                <select
                  value={config.privacyStatus}
                  onChange={(e) => setConfig({ ...config, privacyStatus: e.target.value })}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400">Category</label>
                <select
                  value={config.categoryId}
                  onChange={(e) => setConfig({ ...config, categoryId: e.target.value })}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
                >
                  <option value="22">People & Blogs</option>
                  <option value="27">Education</option>
                  <option value="24">Entertainment</option>
                </select>
              </div>
              <label className="col-span-2 flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={config.madeForKids}
                  onChange={(e) => setConfig({ ...config, madeForKids: e.target.checked })}
                />
                Made for kids
              </label>
            </div>
          )}
          {step === 'review' && (
            <div className="space-y-2 text-sm">
              <p className="text-white font-medium">{config.title}</p>
              <p className="text-zinc-400 line-clamp-4">{config.description}</p>
              <p className="text-xs text-zinc-500">
                {config.locale.toUpperCase()} · {config.privacyStatus}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-4 pt-3 border-t border-zinc-800">
        <Button
          size="sm"
          variant="ghost"
          disabled={stepIndex === 0}
          onClick={() => setStep(steps[stepIndex - 1])}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {step === 'review' ? (
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-500 text-white"
            disabled={!videoUrl || !projectId || isPublishing}
            onClick={handlePublish}
          >
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            Publish
          </Button>
        ) : (
          <Button size="sm" onClick={() => setStep(steps[stepIndex + 1])}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

/** @deprecated Use PublishingWizard */
export const PublishingHub = PublishingWizard
