'use client'

import React from 'react'
import { CheckCircle2, Circle, AlertTriangle, Clapperboard, Video as VideoIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FLAG_EMOJIS } from '@/constants/languages'
import type { FinalCutSceneClip } from '@/lib/types/finalCut'

export interface SceneBlockProps {
  clip: FinalCutSceneClip
  pixelsPerSecond: number
  isSelected: boolean
  onSelect: () => void
  onFocusAssembly?: () => void
  productionHref?: string
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
    return <AlertTriangle className="w-3 h-3 text-amber-300" aria-label="Pending" />
  }
  return <AlertTriangle className="w-3 h-3 text-rose-300" aria-label="Missing" />
}

export function SceneBlock({
  clip,
  pixelsPerSecond,
  isSelected,
  onSelect,
  onFocusAssembly,
  productionHref,
}: SceneBlockProps) {
  const left = clip.startTime * pixelsPerSecond
  const width = (clip.endTime - clip.startTime) * pixelsPerSecond
  const isAnimatic = clip.streamType === 'animatic'
  const lang = clip.language
  const isMissing = clip.status === 'missing'

  const handleClick = () => {
    if (isMissing && productionHref) {
      window.location.href = productionHref
      return
    }
    onSelect()
    onFocusAssembly?.()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'absolute top-1 bottom-1 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 border-2 text-left',
        isSelected
          ? 'border-violet-500 ring-2 ring-violet-500/25 z-10 shadow-lg shadow-violet-950/40'
          : STATUS_RING[clip.status]
      )}
      style={{ left: `${left}px`, width: `${width}px`, minWidth: '48px' }}
      aria-label={`Scene ${clip.sceneNumber}${clip.heading ? `: ${clip.heading}` : ''}`}
    >
      <div
        className={cn(
          'absolute inset-0',
          isAnimatic
            ? 'bg-gradient-to-br from-violet-950/70 to-zinc-900'
            : 'bg-gradient-to-br from-cyan-950/50 to-zinc-900'
        )}
        aria-hidden
      />

      <div className="relative h-full flex flex-col justify-between p-1.5 z-10 gap-0.5">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium text-white bg-black/50 px-1.5 py-0.5 rounded">
            {clip.sceneNumber}
          </span>
          {clip.streamType && (
            <span
              className={cn(
                'text-[9px] px-1 py-0.5 rounded inline-flex items-center gap-0.5',
                isAnimatic ? 'bg-violet-500/30 text-violet-200' : 'bg-cyan-500/30 text-cyan-200'
              )}
            >
              {isAnimatic ? (
                <Clapperboard className="w-2.5 h-2.5" />
              ) : (
                <VideoIcon className="w-2.5 h-2.5" />
              )}
            </span>
          )}
          {lang && width > 70 && (
            <span className="text-[9px] text-zinc-300 bg-black/40 px-1 rounded">
              {FLAG_EMOJIS[lang] ?? '🌐'}
            </span>
          )}
          {clip.streamVersion && (
            <span className="text-[9px] text-zinc-400 tabular-nums">v{clip.streamVersion}</span>
          )}
          <span className="ml-auto" aria-hidden>
            <StatusIcon status={clip.status} />
          </span>
        </div>

        {width > 100 ? (
          <div className="text-[10px] text-white/75 truncate">
            {clip.heading || `Scene ${clip.sceneNumber}`}
          </div>
        ) : null}
      </div>
    </button>
  )
}
