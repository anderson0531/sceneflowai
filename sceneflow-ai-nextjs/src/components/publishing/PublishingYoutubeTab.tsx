'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Youtube,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { ProductionPublishPanel } from '@/components/production/ProductionPublishPanel'
import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import { getPublishingState, upsertYoutubeBundle } from '@/lib/publish/publishingState'
import type { YoutubePublishBundle } from '@/types/publishingAssets'
import type { ProjectStream } from '@/lib/streams/projectStreams'

export interface PublishingYoutubeTabProps {
  projectId: string
  projectTitle?: string
  metadata: unknown
  streams: ProjectStream[]
  userId?: string
  onSaveMetadata: (metadata: Record<string, unknown>) => Promise<void>
}

export function PublishingYoutubeTab({
  projectId,
  projectTitle,
  metadata,
  streams,
  userId,
  onSaveMetadata,
}: PublishingYoutubeTabProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  const [generatingThumb, setGeneratingThumb] = useState(false)
  const [generatingMeta, setGeneratingMeta] = useState(false)

  const publishingState = useMemo(() => getPublishingState(metadata), [metadata])
  const publishingStreams = publishingState.streams

  const languages = useMemo(() => {
    const langs = publishingStreams.map((s) => s.language)
    return langs.length > 0 ? langs : streams.map((s) => s.language)
  }, [publishingStreams, streams])

  useEffect(() => {
    if (languages.length > 0 && !languages.includes(selectedLanguage)) {
      setSelectedLanguage(languages[0])
    }
  }, [languages, selectedLanguage])

  const stream = useMemo(
    () => publishingStreams.find((s) => s.language === selectedLanguage),
    [publishingStreams, selectedLanguage]
  )

  const bundle = useMemo(
    (): YoutubePublishBundle =>
      publishingState.youtubeByLanguage[selectedLanguage] ?? {
        language: selectedLanguage,
        title: projectTitle || '',
        description: '',
        privacyStatus: 'private',
        status: 'draft',
      },
    [publishingState.youtubeByLanguage, selectedLanguage, projectTitle]
  )

  const persistBundle = useCallback(
    async (patch: Partial<YoutubePublishBundle>) => {
      const nextMetadata = upsertYoutubeBundle(
        (metadata as Record<string, unknown>) || {},
        selectedLanguage,
        patch
      )
      await onSaveMetadata(nextMetadata)
    },
    [metadata, selectedLanguage, onSaveMetadata]
  )

  const handleGenerateMetadata = useCallback(async () => {
    setGeneratingMeta(true)
    try {
      const res = await fetch('/api/inspiration/descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: bundle.title || projectTitle,
          locale: selectedLanguage,
          includeSceneFlowCta: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await persistBundle({
        title: data.title || bundle.title,
        description: data.description || bundle.description,
        status: 'ready',
      })
      toast.success('Metadata generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGeneratingMeta(false)
    }
  }, [bundle, projectTitle, selectedLanguage, persistBundle])

  const handleGenerateThumbnail = useCallback(async () => {
    if (!userId) {
      toast.error('Sign in to generate thumbnails.')
      return
    }
    setGeneratingThumb(true)
    try {
      const res = await fetch('/api/thumbnails/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ideas: [
            {
              id: 'publish-thumb',
              thumbnail_prompt: `YouTube thumbnail for "${bundle.title || projectTitle}" — cinematic, high contrast, readable at small size, language: ${selectedLanguage}`,
            },
          ],
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Thumbnail generation failed')
      const thumbUrl = data.thumbnails?.['publish-thumb']?.imageUrl
      if (!thumbUrl) throw new Error('No thumbnail returned')
      await persistBundle({ thumbnailUrl: thumbUrl, status: 'ready' })
      toast.success('Thumbnail generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thumbnail failed')
    } finally {
      setGeneratingThumb(false)
    }
  }, [userId, bundle.title, projectTitle, selectedLanguage, persistBundle])

  const assetBadges = [
    { label: 'Video', ok: !!stream?.mp4Url },
    { label: 'Thumbnail', ok: !!bundle.thumbnailUrl },
    { label: 'Metadata', ok: !!(bundle.title && bundle.description) },
  ]

  return (
    <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 pr-1">
      <div className="flex flex-wrap gap-1 shrink-0">
        {languages.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setSelectedLanguage(lang)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              selectedLanguage === lang
                ? 'border-red-500/40 bg-red-500/15 text-red-200'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
            )}
          >
            {getLanguageDisplayName(lang)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 shrink-0">
        {assetBadges.map((badge) => (
          <span
            key={badge.label}
            className={cn(
              'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border',
              badge.ok
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-zinc-700 text-zinc-500'
            )}
          >
            {badge.ok ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : null}
            {badge.label}
          </span>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 p-4 space-y-3 shrink-0">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-500" />
          YouTube assets · {getLanguageDisplayName(selectedLanguage)}
        </h3>

        <div className="grid gap-2">
          <input
            type="text"
            value={bundle.title}
            onChange={(e) => void persistBundle({ title: e.target.value })}
            placeholder="Video title"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white"
          />
          <textarea
            value={bundle.description}
            onChange={(e) => void persistBundle({ description: e.target.value })}
            placeholder="Description"
            rows={4}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white resize-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleGenerateMetadata} disabled={generatingMeta}>
            {generatingMeta ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            AI title & description
          </Button>
          <Button size="sm" variant="outline" onClick={handleGenerateThumbnail} disabled={generatingThumb}>
            {generatingThumb ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <ImageIcon className="w-4 h-4 mr-1" />
            )}
            Generate thumbnail
          </Button>
        </div>

        {bundle.thumbnailUrl ? (
          <img
            src={bundle.thumbnailUrl}
            alt="YouTube thumbnail"
            className="rounded-lg border border-zinc-700 max-h-32 object-cover"
          />
        ) : null}
      </div>

      <ProductionPublishPanel
        projectId={projectId}
        userId={userId}
        videoUrl={stream?.mp4Url}
        title={bundle.title}
        projectTitle={projectTitle}
        metadata={metadata}
        masterLanguage={selectedLanguage}
        onYoutubePublished={async (result) => {
          await persistBundle({
            youtubeUrl: result.youtubeUrl,
            publishedAt: new Date().toISOString(),
            status: 'published',
          })
        }}
        onShareCreated={async (result) => {
          if (stream) {
            // share handled in screening tab; no-op here
          }
          void result
        }}
      />
    </div>
  )
}
