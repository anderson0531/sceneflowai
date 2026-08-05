'use client'

import React, { useState } from 'react'
import {
  ArrowRight,
  Sparkles,
  Eye,
  Clapperboard,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { BlueprintProgressResult } from '@/lib/blueprint/blueprintProgress'
import type { BlueprintReadyChecklist } from '@/lib/blueprint/blueprintReadinessGate'
import { READY_FOR_PRODUCTION_THRESHOLD_V3 } from '@/lib/types/audienceResonance'
import { ASSISTANT_ICON } from '@/lib/constants/assistantIcon'

interface BlueprintNextStepBannerProps {
  progress: BlueprintProgressResult
  /** When provided, the banner also owns the readiness checklist. */
  checklist?: BlueprintReadyChecklist
  onAction?: () => void
  className?: string
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  generate: <Sparkles className="w-4 h-4" />,
  review: <Eye className="w-4 h-4" />,
  iterate: <ASSISTANT_ICON className="w-4 h-4" />,
  startProduction: <Clapperboard className="w-4 h-4" />,
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      ) : (
        <Circle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      )}
      <span className={ok ? 'text-gray-400' : 'text-amber-200'}>{label}</span>
    </li>
  )
}

/**
 * The single readiness surface for Blueprint Studio.
 *
 * Previously the next step and the readiness checklist were two stacked banners
 * that could disagree, on top of the header score chip and the sidebar guide.
 * They are one bar now: the next action stays visible, the blockers are one
 * click away.
 */
export function BlueprintNextStepBanner({
  progress,
  checklist,
  onAction,
  className,
}: BlueprintNextStepBannerProps) {
  const [expanded, setExpanded] = useState(false)

  if (!progress.nextStepEvent && progress.currentStep === 'generate' && !progress.nextStepLabel) {
    return null
  }

  const isReady = checklist?.isBlueprintReady ?? false
  // Only count what the gate actually enforces, so the summary cannot claim
  // ready while StartProductionDialog blocks.
  const items = checklist
    ? [
        { ok: checklist.blueprintGenerated, label: 'Blueprint generated' },
        { ok: checklist.audienceSaved, label: 'Target audience saved' },
        { ok: checklist.arRunAtLeastOnce, label: 'Audience Resonance run at least once' },
        {
          ok: checklist.scoreAtTarget,
          label: `Score ${READY_FOR_PRODUCTION_THRESHOLD_V3}+ (current: ${checklist.arScore ?? '—'})`,
        },
        {
          ok: checklist.artStyleSet,
          label: `Art style${checklist.artStyleLabel ? ` (${checklist.artStyleLabel})` : ''}`,
        },
        {
          ok: checklist.aspectRatioSet,
          label: `Aspect ratio${checklist.aspectRatioLabel ? ` (${checklist.aspectRatioLabel})` : ''}`,
        },
      ]
    : []
  const remaining = items.filter((i) => !i.ok).length

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3',
        isReady
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-cyan-500/25 bg-gradient-to-r from-cyan-500/10 to-purple-500/10',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'p-2 rounded-lg shrink-0',
              isReady ? 'bg-emerald-500/15 text-emerald-400' : 'bg-cyan-500/15 text-cyan-400'
            )}
          >
            {isReady ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              STEP_ICONS[progress.currentStep] ?? <Sparkles className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">
              {isReady ? 'Ready for Production' : 'Next step'}
            </p>
            <p className="text-sm font-medium text-white truncate">{progress.nextStepLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {checklist && remaining > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1 text-xs text-amber-200/90 hover:text-amber-100"
            >
              {remaining} to finish
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {progress.nextStepEvent && onAction && (
            <Button
              size="sm"
              onClick={onAction}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Go
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {checklist && expanded && (
        <ul className="mt-3 space-y-1 border-t border-white/10 pt-3">
          {items.map((item) => (
            <ChecklistItem key={item.label} ok={item.ok} label={item.label} />
          ))}
        </ul>
      )}
    </div>
  )
}
