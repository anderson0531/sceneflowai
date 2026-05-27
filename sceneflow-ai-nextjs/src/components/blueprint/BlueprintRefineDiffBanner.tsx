'use client'

import React from 'react'
import { X, GitCompare } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RefineDiffSummary {
  label: string
  before?: string
  after?: string
}

interface BlueprintRefineDiffBannerProps {
  diffs: RefineDiffSummary[]
  onDismiss: () => void
  className?: string
}

export function BlueprintRefineDiffBanner({
  diffs,
  onDismiss,
  className,
}: BlueprintRefineDiffBannerProps) {
  if (diffs.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-cyan-200 font-medium text-xs uppercase tracking-wide">
          <GitCompare className="w-4 h-4" />
          Blueprint updated
        </div>
        <button type="button" onClick={onDismiss} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="space-y-1.5 text-xs text-gray-300">
        {diffs.slice(0, 6).map((d) => (
          <li key={d.label}>
            <span className="text-cyan-300">{d.label}</span>
            {d.after ? `: ${String(d.after).slice(0, 80)}${String(d.after).length > 80 ? '…' : ''}` : ' changed'}
          </li>
        ))}
      </ul>
    </div>
  )
}
