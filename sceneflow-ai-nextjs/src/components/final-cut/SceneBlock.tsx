'use client'

import React from 'react'
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FinalCutSceneClip } from '@/lib/types/finalCut'

export interface SceneBlockProps {
  /** Resolved scene clip. */
  clip: FinalCutSceneClip
  /** Pixels per second for timeline scaling. */
  pixelsPerSecond: number
  /** Whether this scene is selected. */
  isSelected: boolean
  /** Callback when scene is clicked (selects + seeks to start). */
  onSelect: () => void
}

const STATUS_RING: Record<FinalCutSceneClip['status'], string> = {
  ready: 'border-zinc-700/90 hover:border-zinc-500',
  pending: 'border-amber-500/60',
  missing: 'border-rose-500/60',
}

function StatusIcon({ status }: { status: FinalCutSceneClip['status'] }) {
  if (status === 'ready') {
    return <CheckCircle2 className="w-3 h-3 text-emerald-300" aria-label="Ready" />
  }
  if (status === 'pending') {
    return <Loader2 className="w-3 h-3 text-amber-300 animate-spin" aria-label="Rendering" />
  }
  return <AlertTriangle className="w-3 h-3 text-rose-300" aria-label="Missing" />
}

/**
 * Read-only block on the Final Cut timeline. Shows scene number, heading,
 * version, and render status. No trim handles, no transition handles —
 * editing happens in the Production Scene Mixer.
 */
export function SceneBlock({ clip, pixelsPerSecond, isSelected, onSelect }: SceneBlockProps) {
  const left = clip.startTime * pixelsPerSecond
  const width = (clip.endTime - clip.startTime) * pixelsPerSecond

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'absolute top-1 bottom-1 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 border-2 text-left',
        isSelected
          ? 'border-violet-500 ring-2 ring-violet-500/25 z-10 shadow-lg shadow-violet-950/40'
          : STATUS_RING[clip.status]
      )}
      style={{ left: `${left}px`, width: `${width}px`, minWidth: '40px' }}
      aria-label={`Scene ${clip.sceneNumber}${clip.heading ? `: ${clip.heading}` : ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/60 to-zinc-900" aria-hidden />

      <div className="relative h-full flex flex-col justify-between p-1.5 z-10">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-white bg-black/50 px-1.5 py-0.5 rounded">
            {clip.sceneNumber}
          </span>
          {clip.streamVersion ? (
            <span className="text-[10px] text-zinc-200 bg-black/50 px-1 py-0.5 rounded tabular-nums">
              v{clip.streamVersion}
            </span>
          ) : null}
          <span className="ml-auto" aria-hidden>
            <StatusIcon status={clip.status} />
          </span>
        </div>

        {width > 100 ? (
          <div className="text-xs text-white/80 truncate">
            {clip.heading || `Scene ${clip.sceneNumber}`}
          </div>
        ) : null}
      </div>
    </button>
  )
}
