'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  Share2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import { getPublishingState } from '@/lib/publish/publishingState'
import { premiereSharePath } from '@/lib/premiere/screeningLookup'
import type { PublishingStreamRecord } from '@/types/publishingAssets'
import type { ProjectStream } from '@/lib/streams/projectStreams'

export interface PublishingScreeningTabProps {
  projectId: string
  projectTitle?: string
  metadata: unknown
  streams: ProjectStream[]
  onSaveStreams: (streams: ProjectStream[]) => Promise<void>
  onOpenScreeningView?: () => void
}

export function PublishingScreeningTab({
  projectId,
  projectTitle,
  metadata,
  streams,
  onSaveStreams,
  onOpenScreeningView,
}: PublishingScreeningTabProps) {
  const [creatingFor, setCreatingFor] = useState<string | null>(null)

  const publishingStreams = useMemo(
    () => getPublishingState(metadata).streams,
    [metadata, streams]
  )

  const readyStreams = publishingStreams.filter((s) => s.status === 'ready' && s.mp4Url)

  const persistStream = useCallback(
    async (next: PublishingStreamRecord) => {
      const updated = publishingStreams.map((s) =>
        s.language === next.language ? next : s
      )
      await onSaveStreams(updated)
    },
    [publishingStreams, onSaveStreams]
  )

  const handleCreateScreening = useCallback(
    async (stream: PublishingStreamRecord) => {
      if (!stream.mp4Url) {
        toast.error('Render a master first in Final Streams.')
        return
      }
      setCreatingFor(stream.language)
      try {
        const res = await fetch('/api/premiere/screenings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            title: `${projectTitle || 'Project'} · ${getLanguageDisplayName(stream.language)}`,
            videoUrl: stream.mp4Url,
            streamId: stream.id,
            streamLabel: getLanguageDisplayName(stream.language),
            locale: stream.language,
            sourceType: stream.format === 'animatic' ? 'animatic' : 'video',
            source: 'final_cut_export',
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create screening')

        const screeningId = data.item?.id as string | undefined
        const sharePath = premiereSharePath(screeningId || '')
        const shareUrl =
          typeof window !== 'undefined'
            ? `${window.location.origin}${sharePath}`
            : sharePath

        await persistStream({
          ...stream,
          screeningId,
          publish: {
            ...stream.publish,
            shareUrl,
            shareSlug: screeningId,
            publishedAt: new Date().toISOString(),
          },
        })

        toast.success('Screening created', {
          description: 'Share the link with reviewers.',
          action: {
            label: 'Copy link',
            onClick: () => navigator.clipboard.writeText(shareUrl),
          },
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not create screening')
      } finally {
        setCreatingFor(null)
      }
    },
    [projectId, projectTitle, persistStream]
  )

  if (readyStreams.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 p-8 text-center">
        <Users className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-400">No ready streams for screening.</p>
        <p className="text-xs text-zinc-500 mt-1">
          Render a master in Final Streams, then create a shareable premiere here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
      <p className="text-xs text-zinc-500 shrink-0">
        Create a Screening Room premiere from a ready language stream and share the /s/ link.
      </p>
      {readyStreams.map((stream) => {
        const shareUrl = stream.publish?.shareUrl
        const isCreating = creatingFor === stream.language
        return (
          <div
            key={stream.id || stream.language}
            className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white">
                {getLanguageDisplayName(stream.language)}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {stream.format === 'animatic' ? 'Animatic' : 'Video'} master
              </p>
              {shareUrl ? (
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 mt-1"
                >
                  <LinkIcon className="w-3 h-3" />
                  {shareUrl.replace(/^https?:\/\/[^/]+/, '')}
                </a>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onOpenScreeningView ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenScreeningView}
                  className="border-zinc-700 text-zinc-300"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Open Screening
                </Button>
              ) : null}
              {shareUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  className="border-cyan-500/30 text-cyan-300"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1" />
                  Copy link
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleCreateScreening(stream)}
                  disabled={isCreating}
                  className="bg-cyan-600 hover:bg-cyan-500"
                >
                  {isCreating ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Users className="w-3.5 h-3.5 mr-1" />
                  )}
                  Create screening
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
