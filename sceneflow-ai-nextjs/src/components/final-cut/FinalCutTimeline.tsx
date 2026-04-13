'use client'

import React from 'react'
import { Film } from 'lucide-react'
import { ProductionSectionHeader } from '@/components/vision/scene-production/ProductionSectionHeader'
import { FinalCutEditorWorkspace } from './FinalCutEditorWorkspace'
import { cn } from '@/lib/utils'
import type {
  FinalCutStream,
  Overlay,
  TransitionEffect,
  StreamSettings,
} from '@/lib/types/finalCut'

export interface FinalCutTimelineProps {
  projectId: string
  streams: FinalCutStream[]
  selectedStreamId: string | null
  onSceneReorder: (sceneIds: string[]) => void
  onTransitionUpdate: (sceneId: string, transition: TransitionEffect) => void
  onOverlayUpdate: (segmentId: string, overlays: Overlay[]) => void
  onExport: (streamId: string, settings: unknown) => Promise<void>
  totalDuration: number
  isProcessing?: boolean
  sceneProductionState?: Record<string, unknown>
  productionVisionHref?: string
  onStreamSettingsChange?: (updates: Partial<StreamSettings>) => void
  hideMixerSectionHeader?: boolean
}

export function FinalCutTimeline({
  hideMixerSectionHeader = false,
  ...workspaceProps
}: FinalCutTimelineProps) {
  const selectedStream =
    workspaceProps.streams.find((s) => s.id === workspaceProps.selectedStreamId) || null

  return (
    <div
      className={cn(
        'flex flex-col flex-1 min-h-0 text-zinc-100 overflow-hidden',
        !hideMixerSectionHeader &&
          'rounded-xl border border-purple-500/30 bg-zinc-950/60 shadow-[inset_0_1px_0_0_rgba(168,85,247,0.06)]',
        hideMixerSectionHeader && 'rounded-none border-0 bg-transparent shadow-none'
      )}
    >
      {!hideMixerSectionHeader ? (
        <div className="shrink-0 border-b border-purple-500/25 bg-zinc-950/90">
          <ProductionSectionHeader
            icon={Film}
            title="Final Cut Mixer"
            badge={selectedStream ? selectedStream.scenes.length : 0}
            rightHint="Assembly timeline — select scenes and trim"
          />
        </div>
      ) : null}

      <FinalCutEditorWorkspace {...workspaceProps} />
    </div>
  )
}
