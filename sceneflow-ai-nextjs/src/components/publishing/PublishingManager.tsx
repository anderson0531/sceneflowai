'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Film, Package, Share2 } from 'lucide-react'
import { ProductTabList } from '@/components/product/ProductTabList'
import { PublishingReadinessBanner } from './PublishingReadinessBanner'
import { PublishingFinalStreamsTab } from './PublishingFinalStreamsTab'
import { PublishingScreeningTab } from './PublishingScreeningTab'
import { PublishingPackageShipTab } from './PublishingPackageShipTab'
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
  layout = 'inline',
  hideTitle = false,
  initialTab,
}: PublishingManagerProps) {
  const libraryTab = (tab?: PublishingLibraryTab): PublishingLibraryTab =>
    !tab || tab === 'promo' ? 'streams' : tab
  const [activeTab, setActiveTab] = useState<PublishingLibraryTab>(libraryTab(initialTab))
  const visibleTab = activeTab === 'youtube' ? 'ship' : activeTab

  useEffect(() => {
    if (initialTab && initialTab !== 'promo') setActiveTab(initialTab)
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
  const packageCount = (publishingState.units ?? []).filter((unit) => unit.mp4Url).length

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
      key: 'ship',
      label: 'Package & Ship',
      icon: <Package />,
      count: packageCount,
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
        activeKey={visibleTab}
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
        {visibleTab === 'ship' ? (
          <PublishingPackageShipTab
            projectId={projectId}
            projectTitle={projectTitle}
            metadata={metadata}
            script={script}
            streams={streams}
            userId={userId}
            sceneProductionState={sceneProductionState}
            onSaveMetadata={onSaveMetadata}
          />
        ) : null}
      </div>
    </div>
  )
}
