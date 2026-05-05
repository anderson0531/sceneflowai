'use client'

import React from 'react'
import { Film } from 'lucide-react'
import { ProductionSectionHeader } from '@/components/vision/scene-production/ProductionSectionHeader'
import { FinalCutEditorWorkspace, type FinalCutEditorWorkspaceProps } from './FinalCutEditorWorkspace'
import { cn } from '@/lib/utils'

export interface FinalCutTimelineProps extends FinalCutEditorWorkspaceProps {
  /** When the page already supplies a section header, hide the inner mixer header. */
  hideMixerSectionHeader?: boolean
}

export function FinalCutTimeline({
  hideMixerSectionHeader = false,
  ...workspaceProps
}: FinalCutTimelineProps) {
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
            title="Final Cut Viewer"
            titleClassName="font-semibold tracking-tight"
            badge={workspaceProps.clips.length}
            rightHint="Read-only preview of rendered scenes"
          />
        </div>
      ) : null}

      <FinalCutEditorWorkspace {...workspaceProps} />
    </div>
  )
}
