'use client'

import React from 'react'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductionReadyChecklist } from '@/lib/production/productionReadinessGate'

interface ProductionReadyBannerProps {
  checklist: ProductionReadyChecklist
  className?: string
}

function Item({
  ok,
  label,
}: {
  ok: boolean
  label: string
}) {
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

export function ProductionReadyBanner({ checklist, className }: ProductionReadyBannerProps) {
  if (checklist.isProductionReady) {
    return (
      <div
        className={cn(
          'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2',
          className
        )}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Production Ready — you can run Build Storyboard (Express).
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
        Production Ready checklist
      </div>
      <ul className="space-y-1">
        <Item ok={checklist.scriptLocked} label="Script locked" />
        <Item ok={checklist.voicesReady} label="Character voices assigned" />
        <Item ok={checklist.hasReferences} label="Reference library started (cast, props, or locations)" />
      </ul>
    </div>
  )
}
