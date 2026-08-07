'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Film, Share2, Smartphone, Youtube } from 'lucide-react'
import { ProductTabList } from '@/components/product/ProductTabList'
import { PublishingReadinessBanner } from './PublishingReadinessBanner'
import { PublishingFinalStreamsTab } from './PublishingFinalStreamsTab'
import { PublishingScreeningTab } from './PublishingScreeningTab'
import { PublishingPromoTab } from './PublishingPromoTab'
import { PublishingYoutubeTab } from './PublishingYoutubeTab'
import { computePublishingReadiness, getPublishingState } from '@/lib/publish/publishingState'
import type { PublishingLibraryTab } from '@/types/publishingAssets'
import type { ProjectStream } from '@/lib/streams/projectStreams'
import type { SceneProductionData } from '@/components/vision/scene-production/types'

export interface PublishingManagerProps {
  projectId: string
  projectTitle?: string
  metadata: unknown
  script?: unknown
  userId?: string
  streams: ProjectStream[]
  onSaveStreams: (
    streams: ProjectStream[],
    compat?: { exportedVideoUrl?: string; exportedAnimaticUrl?: string }
  ) => Promise<void>
  onSaveMetadata: (metadata: Record<string, unknown>) => Promise<void>
  onPreviewStream: (language: string) => void
  sceneProductionState: Record<string, SceneProductionData>
  onOpenScreeningView?: () => void
  onPreviewPromo?: () => void
  onScriptScenesUpdated?: (scenes: unknown[]) => void
  onOpenPromoInStudio?: (sceneId: string) => void
  layout?: 'dialog' | 'inline'
  hideTitle?: boolean
  initialTab?: PublishingLibraryTab
}

export function PublishingManager({
  projectId,
  projectTitle,
  metadata,
  script,
  userId,
  streams,
  onSaveStreams,
  onSaveMetadata,
  onPreviewStream,
  sceneProductionState,
  onOpenScreeningView,
  onPreviewPromo,
  onScriptScenesUpdated,
  onOpenPromoInStudio,
  layout = 'inline',
  hideTitle = false,
  initialTab,
}: PublishingManagerProps) {
  const [activeTab, setActiveTab] = useState<PublishingLibraryTab>(initialTab ?? 'streams')

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab)
  }, [initialTab])

  const publishingState = useMemo(() => getPublishingState(metadata), [metadata])

  const readiness = useMemo(
    () =>
      computePublishingReadiness(
        {
          id: projectId,
          metadata,
          script:
            (script as { script?: { scenes?: unknown } } | undefined)?.script ??
            (script as { scenes?: unknown } | undefined),
        },
        publishingState.streams
      ),
    [projectId, metadata, script, publishingState.streams]
  )

  const screeningCount = publishingState.streams.filter((s) => s.publish?.shareUrl).length
  const youtubeConfigured = Object.values(publishingState.youtubeByLanguage).filter(
    (b) => b.title && b.description
  ).length
  const trailerReady = publishingState.promo?.trailer?.status === 'ready' ? 1 : 0

  const tabs = [
    {
      key: 'streams',
      label: 'Final Streams',
      icon: <Film />,
      count: readiness.readyStreamCount > 0 ? readiness.readyStreamCount : readiness.totalStreamCount,
    },
    {
      key: 'screening',
      label: 'Screening',
      icon: <Share2 />,
      count: screeningCount,
    },
    {
      key: 'promo',
      label: 'Promo',
      icon: <Smartphone />,
      count: trailerReady,
    },
    {
      key: 'youtube',
      label: 'YouTube',
      icon: <Youtube />,
      count: youtubeConfigured,
    },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {layout === 'dialog' ? (
        <PublishingReadinessBanner
          readiness={readiness}
          onOpenStreamsTab={() => setActiveTab('streams')}
        />
      ) : null}

      {!hideTitle ? (
        <h2 className="text-sm font-semibold text-white shrink-0">Publishing</h2>
      ) : null}

      <ProductTabList
        tabs={tabs}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as PublishingLibraryTab)}
        accent="ready"
        variant="folder"
        className="shrink-0"
      />

      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'streams' ? (
          <PublishingFinalStreamsTab
            projectId={projectId}
            projectTitle={projectTitle}
            metadata={metadata}
            script={script}
            streams={streams}
            onSaveStreams={onSaveStreams}
            onPreviewStream={onPreviewStream}
            sceneProductionState={sceneProductionState}
          />
        ) : null}
        {activeTab === 'screening' ? (
          <PublishingScreeningTab
            projectId={projectId}
            projectTitle={projectTitle}
            metadata={metadata}
            streams={streams}
            onSaveStreams={onSaveStreams}
            onOpenScreeningView={onOpenScreeningView}
          />
        ) : null}
        {activeTab === 'promo' ? (
          <PublishingPromoTab
            projectId={projectId}
            projectTitle={projectTitle}
            metadata={metadata}
            script={script}
            streams={streams}
            userId={userId}
            sceneProductionState={sceneProductionState}
            onSaveMetadata={onSaveMetadata}
            onScriptScenesUpdated={onScriptScenesUpdated}
            onPreviewPromo={onPreviewPromo}
            onOpenPromoInStudio={onOpenPromoInStudio}
          />
        ) : null}
        {activeTab === 'youtube' ? (
          <PublishingYoutubeTab
            projectId={projectId}
            projectTitle={projectTitle}
            metadata={metadata}
            streams={streams}
            userId={userId}
            onSaveMetadata={onSaveMetadata}
          />
        ) : null}
      </div>
    </div>
  )
}
