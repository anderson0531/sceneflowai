'use client'

import { useTranslations } from 'next-intl'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, Clapperboard, Loader2 } from 'lucide-react'
import type { StartProductionGateResult } from '@/lib/blueprint/blueprintReadinessGate'
import { BLUEPRINT_COPY } from '@/lib/blueprint/blueprintGlossary'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'

interface StartProductionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gate: StartProductionGateResult | null
  isStarting: boolean
  onConfirm: (override?: boolean) => void
  onCancel: () => void
}

export function StartProductionDialog({
  open,
  onOpenChange,
  gate,
  isStarting,
  onConfirm,
  onCancel,
}: StartProductionDialogProps) {
  const t = useTranslations('blueprint.startProduction')
  const tGate = useTranslations('blueprint.gate')
  if (!gate) return null

  const { checklist, reasonKeys, allowed, hardBlock } = gate
  const showOverride = !allowed && !hardBlock && reasonKeys.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-cyan-400" />
            {BLUEPRINT_COPY.startProduction}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {hardBlock
              ? 'Your Blueprint is not ready for Production yet.'
              : `This closes ${STUDIO_DISPLAY_NAMES.blueprint} and opens ${STUDIO_DISPLAY_NAMES.production}. Your Blueprint is saved first, and you can come back to it.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
              <dt className="text-xs text-gray-500">{t('beats')}</dt>
              <dd className="text-lg font-semibold text-white">{checklist.beatsCount}</dd>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
              <dt className="text-xs text-gray-500">{t('characters')}</dt>
              <dd className="text-lg font-semibold text-white">{checklist.characterCount}</dd>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
              <dt className="text-xs text-gray-500">{t('arScore')}</dt>
              <dd className="text-lg font-semibold text-white">
                {checklist.arScore ?? '—'}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
              <dt className="text-xs text-gray-500">{t('runtime')}</dt>
              <dd className="text-lg font-semibold text-white">
                {checklist.runtimeEstimate ?? '—'}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
              <dt className="text-xs text-gray-500">{t('artStyle')}</dt>
              <dd className="text-sm font-semibold text-white truncate">
                {checklist.artStyleLabel ?? '—'}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
              <dt className="text-xs text-gray-500">{t('aspectRatio')}</dt>
              <dd className="text-lg font-semibold text-white">
                {checklist.aspectRatioLabel ?? '—'}
              </dd>
            </div>
          </dl>

          {reasonKeys.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-200 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {hardBlock ? t('cannotStart') : t('recommendationsBefore')}
              </div>
              <ul className="text-xs text-amber-100/90 space-y-1 list-disc list-inside">
                {reasonKeys.map((reason) => (
                  <li key={reason.key}>{tGate(reason.key, reason.values)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isStarting}>
            {hardBlock ? 'Close' : `Stay in ${STUDIO_DISPLAY_NAMES.blueprint}`}
          </Button>
          {allowed && !hardBlock && (
            <Button
              onClick={() => onConfirm(false)}
              disabled={isStarting}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isStarting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {BLUEPRINT_COPY.startProduction}
            </Button>
          )}
          {showOverride && (
            <Button
              variant="destructive"
              onClick={() => onConfirm(true)}
              disabled={isStarting}
            >
              {isStarting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {t('startAnyway')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
