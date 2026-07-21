'use client'

import React from 'react'
import { Radar, TrendingUp, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ProductScoreChip } from '@/components/product'
import { BLUEPRINT_COPY } from '@/lib/blueprint/blueprintGlossary'
import type { BlueprintProgressResult } from '@/lib/blueprint/blueprintProgress'

interface BlueprintResonanceStripProps {
  progress: BlueprintProgressResult
  onOpenResonance: () => void
  onImproveWeakest: () => void
  className?: string
}

export function BlueprintResonanceStrip({
  progress,
  onOpenResonance,
  onImproveWeakest,
  className,
}: BlueprintResonanceStripProps) {
  if (!progress.arScore && progress.arScore !== 0) {
    return (
      <button
        type="button"
        onClick={onOpenResonance}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
          'border border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20',
          className
        )}
      >
        <Radar className="w-3.5 h-3.5" />
        Run {BLUEPRINT_COPY.audienceResonance}
      </button>
    )
  }

  return (
    <div className={cn('inline-flex flex-wrap items-center gap-2', className)}>
      <ProductScoreChip
        score={progress.arScore!}
        label="Blueprint AR"
        suffix={`→ target ${progress.arTarget}+`}
        onClick={onOpenResonance}
      />
      <Radar className="hidden" aria-hidden />
      {!progress.isAtTarget && progress.pointsToTarget > 0 && (
        <>
          <span className="text-xs text-gray-500">·</span>
          <span className="inline-flex items-center gap-1 text-xs text-cyan-300/90">
            <TrendingUp className="w-3 h-3" />
            {progress.pointsToTarget} pts
          </span>
          {progress.weakestCategory && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-cyan-300 hover:text-white hover:bg-cyan-500/20"
              onClick={onImproveWeakest}
            >
              Improve weakest
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </Button>
          )}
        </>
      )}
    </div>
  )
}
