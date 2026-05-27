'use client'

import React from 'react'
import { ArrowRight, Sparkles, Eye, PencilLine, Clapperboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { BlueprintProgressResult } from '@/lib/blueprint/blueprintProgress'

interface BlueprintNextStepBannerProps {
  progress: BlueprintProgressResult
  onAction?: () => void
  className?: string
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  generate: <Sparkles className="w-4 h-4" />,
  review: <Eye className="w-4 h-4" />,
  iterate: <PencilLine className="w-4 h-4" />,
  startProduction: <Clapperboard className="w-4 h-4" />,
}

export function BlueprintNextStepBanner({
  progress,
  onAction,
  className,
}: BlueprintNextStepBannerProps) {
  if (!progress.nextStepEvent && progress.currentStep === 'generate' && !progress.nextStepLabel) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/25',
        'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 shrink-0">
          {STEP_ICONS[progress.currentStep] ?? <Sparkles className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Next step</p>
          <p className="text-sm font-medium text-white truncate">{progress.nextStepLabel}</p>
        </div>
      </div>
      {progress.nextStepEvent && onAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white"
        >
          Go
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  )
}
