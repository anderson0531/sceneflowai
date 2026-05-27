'use client'

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
  if (!gate) return null

  const { checklist, reasons, allowed, hardBlock } = gate
  const showOverride = !allowed && !hardBlock && reasons.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-cyan-400" />
            {BLUEPRINT_COPY.startProduction}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Review your Blueprint before opening Production.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
              <dt className="text-xs text-gray-500">Beats</dt>
              <dd className="text-lg font-semibold text-white">{checklist.beatsCount}</dd>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
              <dt className="text-xs text-gray-500">Characters</dt>
              <dd className="text-lg font-semibold text-white">{checklist.characterCount}</dd>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
              <dt className="text-xs text-gray-500">AR score</dt>
              <dd className="text-lg font-semibold text-white">
                {checklist.arScore ?? '—'}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
              <dt className="text-xs text-gray-500">Runtime</dt>
              <dd className="text-lg font-semibold text-white">
                {checklist.runtimeEstimate ?? '—'}
              </dd>
            </div>
          </dl>

          {reasons.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-200 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {hardBlock ? 'Cannot start yet' : 'Recommendations before Production'}
              </div>
              <ul className="text-xs text-amber-100/90 space-y-1 list-disc list-inside">
                {reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isStarting}>
            Cancel
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
              Start anyway
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
