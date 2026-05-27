'use client'

import React from 'react'
import { ArrowRight, Film, Layers, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { FinalCutProgressResult } from '@/lib/final-cut/finalCutProgress'

interface FinalCutNextStepBannerProps {
  progress: FinalCutProgressResult
  onAction?: () => void
  className?: string
}

export function FinalCutNextStepBanner({
  progress,
  onAction,
  className,
}: FinalCutNextStepBannerProps) {
  if (!progress.nextStepEvent) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/25',
        'bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-violet-500/15 text-violet-400 shrink-0">
          {progress.isAssemblyReady ? (
            <Film className="w-4 h-4" />
          ) : (
            <Layers className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Next step</p>
          <p className="text-sm font-medium text-white truncate">{progress.nextStepLabel}</p>
        </div>
      </div>
      {onAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white"
        >
          Go
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  )
}

interface FinalCutReadinessStripProps {
  progress: FinalCutProgressResult
  totalDurationSec: number
  formatDuration: (sec: number) => string
  className?: string
}

export function FinalCutReadinessStrip({
  progress,
  totalDurationSec,
  formatDuration,
  className,
}: FinalCutReadinessStripProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 flex-wrap rounded-full border px-3 py-1.5 text-xs',
        progress.isAssemblyReady
          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
          : 'border-amber-500/35 bg-amber-500/10 text-amber-200',
        className
      )}
    >
      <Sparkles className="w-3.5 h-3.5 shrink-0" />
      <span>
        Ready {progress.readyCount}/{progress.totalCount}
        {totalDurationSec > 0 ? ` · ${formatDuration(totalDurationSec)}` : ''}
      </span>
      {progress.isMixedFormat && (
        <span className="text-violet-300">· Mixed assembly</span>
      )}
    </div>
  )
}
