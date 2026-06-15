'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { ScreeningRoomDashboard } from '@/components/screening-room/ScreeningRoomDashboard'
import { PublishingWizard } from '@/components/premiere/PublishingWizard'
import { PremiereInsightsPanel } from '@/components/premiere/PremiereInsightsPanel'
import { ShortFormPublishPanel } from '@/components/premiere/ShortFormPublishPanel'
import { ExportBundlePanel } from '@/components/premiere/ExportBundlePanel'
import { usePremiereScreenings } from '@/hooks/premiere/usePremiereScreenings'
import { usePremiereAnalytics, type PremiereFeedback } from '@/hooks/premiere/usePremiereAnalytics'
import { premiereSharePath } from '@/lib/premiere/screeningLookup'
import { cn } from '@/lib/utils'

interface ScreeningRoomPublishPanelProps {
  projectId?: string
  isDemo?: boolean
  initialTab?: 'screenings' | 'youtube' | 'shorts' | 'bundle' | 'insights'
}

export function ScreeningRoomPublishPanel({
  projectId,
  isDemo = false,
  initialTab = 'screenings',
}: ScreeningRoomPublishPanelProps) {
  const currentProject = useStore((s) => s.currentProject)
  const [publishTab, setPublishTab] = useState<'screenings' | 'youtube' | 'shorts' | 'bundle' | 'insights'>(initialTab)

  const projectBillboard = useMemo(
    () =>
      ((currentProject?.metadata as { billboardUrl?: string; billboardImageUrl?: string } | undefined)
        ?.billboardUrl ||
        (currentProject?.metadata as { billboardUrl?: string; billboardImageUrl?: string } | undefined)
          ?.billboardImageUrl ||
        '')?.trim() || undefined,
    [currentProject?.metadata]
  )

  const {
    screenings: finalCutScreenings,
    masterVideoUrl,
    activePremiereScreeningId,
    refreshPersistedScreenings,
  } = usePremiereScreenings({
    projectId,
    isDemo,
    projectMetadata: currentProject?.metadata,
    projectBillboard,
  })

  const { analytics, allFeedback, loading: analyticsLoading, refreshAnalytics } = usePremiereAnalytics(
    projectId,
    isDemo,
    activePremiereScreeningId,
    finalCutScreenings.filter((s) => s.id.startsWith('premiere-')).length
  )

  const handleCreateScreening = useCallback(async () => {
    if (!projectId || isDemo) {
      toast.message('Demo mode', { description: 'Screening creation is disabled in demo.' })
      return
    }
    const videoUrl = masterVideoUrl
    if (!videoUrl) {
      toast.error('Render a master in Assemble first.')
      return
    }
    try {
      const res = await fetch('/api/premiere/screenings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: `${currentProject?.title || 'Project'} · Screening`,
          videoUrl,
          source: 'final_cut_export',
          sourceType: 'video',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create screening')
      await refreshPersistedScreenings()
      await refreshAnalytics()
      const sharePath = premiereSharePath(data.item?.id || '')
      const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${sharePath}` : sharePath
      toast.success('Screening created', {
        description: 'Share the link with reviewers.',
        action: {
          label: 'Copy link',
          onClick: () => navigator.clipboard.writeText(fullUrl),
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create screening')
    }
  }, [projectId, isDemo, masterVideoUrl, currentProject?.title, refreshPersistedScreenings, refreshAnalytics])

  const handleUploadExternal = useCallback(async (file: File) => {
    if (!projectId || isDemo) throw new Error('Upload requires a saved non-demo project')

    const { upload } = await import('@vercel/blob/client')
    const safeProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, '-')
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const pathname = `premiere/uploads/${safeProjectId}/${Date.now()}-${safeFileName}`

    const uploadedBlob = await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/premiere/upload-url',
    })

    const createRes = await fetch('/api/premiere/screenings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        title: `External upload · ${file.name}`,
        videoUrl: uploadedBlob.url,
        streamLabel: 'External upload',
        locale: 'und',
        sourceType: 'video',
        source: 'external_upload',
      }),
    })
    const createData = await createRes.json()
    if (!createRes.ok || !createData.success) {
      throw new Error(createData.error || 'Screening creation failed')
    }

    await refreshPersistedScreenings()
    toast.success('Upload complete')
    return uploadedBlob.url
  }, [isDemo, projectId, refreshPersistedScreenings])

  const handleListFeedback = useCallback(
    async (screeningId: string) => {
      if (!projectId || isDemo) return []
      const res = await fetch(
        `/api/premiere/feedback?projectId=${encodeURIComponent(projectId)}&screeningId=${encodeURIComponent(screeningId)}`,
        { cache: 'no-store' }
      )
      const payload = (await res.json()) as { items?: PremiereFeedback[]; error?: string }
      if (!res.ok) throw new Error(payload.error || 'Failed to load feedback')
      return payload.items || []
    },
    [isDemo, projectId]
  )

  const handleCreateFeedback = useCallback(
    async (input: {
      screeningId: string
      streamId?: string
      author?: string
      rating: number
      comment: string
      tags?: string[]
    }) => {
      if (!projectId || isDemo) throw new Error('Feedback requires a saved non-demo project')
      const res = await fetch('/api/premiere/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...input, tags: input.tags || [] }),
      })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !payload.success) throw new Error(payload.error || 'Failed to submit feedback')
      await refreshPersistedScreenings()
    },
    [isDemo, projectId, refreshPersistedScreenings]
  )

  const handleUpdateFeedback = useCallback(
    async (
      screeningId: string,
      feedbackId: string,
      updates: { status?: 'open' | 'in_review' | 'resolved'; tags?: string[]; owner?: string }
    ) => {
      if (!projectId || isDemo) throw new Error('Feedback requires a saved non-demo project')
      const res = await fetch('/api/premiere/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, screeningId, feedbackId, ...updates }),
      })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !payload.success) throw new Error(payload.error || 'Failed to update feedback')
      await refreshPersistedScreenings()
    },
    [isDemo, projectId, refreshPersistedScreenings]
  )

  const handleExportFeedback = useCallback(
    async (screeningId: string) => {
      if (!projectId || isDemo) return
      const url = `/api/premiere/feedback/export?projectId=${encodeURIComponent(projectId)}&screeningId=${encodeURIComponent(screeningId)}&format=csv`
      window.open(url, '_blank', 'noopener,noreferrer')
    },
    [isDemo, projectId]
  )

  if (!currentProject && !isDemo) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading project…
      </div>
    )
  }

  const tabs = [
    { id: 'screenings' as const, label: 'Screenings' },
    { id: 'insights' as const, label: 'Insights' },
    { id: 'youtube' as const, label: 'YouTube' },
    { id: 'shorts' as const, label: 'Shorts' },
    { id: 'bundle' as const, label: 'Export' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 sm:px-6 pt-4 pb-2 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white">Publish & Distribute</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Share screenings, review audience feedback, and publish to YouTube or export bundles.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPublishTab(tab.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                publishTab === tab.id
                  ? 'bg-violet-600/20 border-violet-500/50 text-violet-200'
                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {publishTab === 'screenings' && projectId && (
          <ScreeningRoomDashboard
            projectId={projectId}
            projectName={currentProject?.title}
            finalCutScreenings={finalCutScreenings}
            onCreateScreening={() => void handleCreateScreening()}
            onUploadExternal={handleUploadExternal}
            onListFeedback={handleListFeedback}
            onCreateFeedback={handleCreateFeedback}
            onUpdateFeedback={handleUpdateFeedback}
            onExportFeedback={handleExportFeedback}
          />
        )}

        {publishTab === 'insights' && projectId && (
          <PremiereInsightsPanel
            projectId={projectId}
            screeningId={activePremiereScreeningId}
            feedbackItems={allFeedback.map((f) => ({
              id: f.id,
              author: f.author,
              rating: f.rating,
              comment: f.comment,
              tags: f.tags,
              status: f.status,
              createdAt: f.createdAt,
            }))}
            analytics={analytics}
            loading={analyticsLoading}
            onUpdateFeedback={(id, patch) => {
              const item = allFeedback.find((f) => f.id === id)
              if (!item) return
              void handleUpdateFeedback(item.screeningId, id, {
                status: patch.status as 'open' | 'in_review' | 'resolved' | undefined,
              })
            }}
          />
        )}

        {publishTab === 'youtube' && projectId && (
          <PublishingWizard projectId={projectId} videoUrl={masterVideoUrl ?? undefined} title={currentProject?.title} />
        )}

        {publishTab === 'shorts' && projectId && (
          <ShortFormPublishPanel projectId={projectId} videoUrl={masterVideoUrl ?? undefined} />
        )}

        {publishTab === 'bundle' && projectId && (
          <ExportBundlePanel projectId={projectId} videoUrl={masterVideoUrl ?? undefined} title={currentProject?.title} />
        )}
      </div>
    </div>
  )
}
