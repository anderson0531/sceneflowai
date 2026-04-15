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
          'rounded-2xl border border-violet-500/25 bg-zinc-950/55 backdrop-blur-xl shadow-[0_0_0_1px_rgba(139,92,246,0.12),inset_0_1px_0_0_rgba(255,255,255,0.05)]',
        hideMixerSectionHeader && 'rounded-none border-0 bg-transparent shadow-none'
      )}
    >
      {!hideMixerSectionHeader ? (
        <div className="shrink-0 border-b border-violet-500/20 bg-zinc-950/85">
          <ProductionSectionHeader
            icon={Film}
            title="Final Cut Mixer"
            titleClassName="font-semibold tracking-tight"
            badge={selectedStream ? selectedStream.scenes.length : 0}
            rightHint="Assembly timeline — select scenes and trim"
          />
        </div>
      ) : null}

      <FinalCutEditorWorkspace {...workspaceProps} />
    </div>
  )
}
