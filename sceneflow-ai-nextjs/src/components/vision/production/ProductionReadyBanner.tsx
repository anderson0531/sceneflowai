'use client'

import React from 'react'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ProductionReadyChecklist } from '@/lib/production/productionReadinessGate'

interface ProductionReadyBannerProps {
  checklist: ProductionReadyChecklist
  className?: string
  id?: string
  onOpenReferences?: () => void
  onOpenGenerateAudio?: () => void
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

export function ProductionReadyBanner({
  checklist,
  className,
  id,
  onOpenReferences,
  onOpenGenerateAudio,
}: ProductionReadyBannerProps) {
  if (checklist.isPreVisReady) {
    return (
      <div
        id={id}
        className={cn(
          'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2',
          className
        )}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Pre-Vis ready — run Express on one scene or all scenes.
      </div>
    )
  }

  const missingVoiceLabel =
    checklist.missingVoices.length > 0
      ? `Character voices assigned (${checklist.missingVoices.slice(0, 3).join(', ')}${checklist.missingVoices.length > 3 ? '…' : ''} missing)`
      : 'Character voices assigned'

  return (
    <div
      id={id}
      className={cn(
        'rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2',
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-200 mb-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Pre-Vis ready checklist
      </div>
      <ul className="space-y-1 mb-2">
        <Item ok={checklist.voicesReady} label={missingVoiceLabel} />
        <Item
          ok={checklist.hasReferences}
          label="Reference library started (cast, props, or locations)"
        />
      </ul>
      <div className="flex flex-wrap gap-2">
        {!checklist.voicesReady && onOpenGenerateAudio && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[11px] border-amber-500/40 text-amber-200"
            onClick={onOpenGenerateAudio}
          >
            Assign voices
          </Button>
        )}
        {!checklist.hasReferences && onOpenReferences && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[11px] border-amber-500/40 text-amber-200"
            onClick={onOpenReferences}
          >
            Open Reference Library
          </Button>
        )}
      </div>
    </div>
  )
}
