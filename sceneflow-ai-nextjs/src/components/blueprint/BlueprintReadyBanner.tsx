'use client'

import React from 'react'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlueprintReadyChecklist } from '@/lib/blueprint/blueprintReadinessGate'
import { READY_FOR_PRODUCTION_THRESHOLD_V3 } from '@/lib/types/audienceResonance'

interface BlueprintReadyBannerProps {
  checklist: BlueprintReadyChecklist
  className?: string
}

function Item({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      ) : (
        <Circle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      )}
      <span className={ok ? 'text-gray-300' : 'text-amber-200'}>{label}</span>
    </li>
  )
}

export function BlueprintReadyBanner({ checklist, className }: BlueprintReadyBannerProps) {
  if (checklist.isBlueprintReady) {
    return (
      <div
        className={cn(
          'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2',
          className
        )}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Blueprint Ready — you can Start Production.
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2',
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-200 mb-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Blueprint Ready checklist
      </div>
      <ul className="space-y-1">
        <Item ok={checklist.blueprintGenerated} label="Blueprint generated" />
        <Item ok={checklist.audienceSaved} label="Target audience saved" />
        <Item ok={checklist.arRunAtLeastOnce} label="Audience Resonance run at least once" />
        <Item
          ok={checklist.scoreAtTarget}
          label={`Score ${READY_FOR_PRODUCTION_THRESHOLD_V3}+ (current: ${checklist.arScore ?? '—'})`}
        />
      </ul>
    </div>
  )
}
