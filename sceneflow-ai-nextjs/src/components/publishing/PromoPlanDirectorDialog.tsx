'use client'

import { useState } from 'react'
import { Clapperboard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { promoRecommendationNotes, type PromoPlanFinding } from '@/lib/publish/promoPlanFindings'
import { slimPromoProductionState } from '@/lib/publish/promoShotCatalog'
import type { AudienceDefinition } from '@/lib/types/audienceResonance'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'
import type { SceneProductionData } from '@/components/vision/scene-production/types'

export interface PromoPlanDirectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  targetDurationSec: number
  audienceDefinition?: AudienceDefinition
  scenes: unknown[]
  sceneProductionState?: Record<string, SceneProductionData>
  sceneScores?: Record<number, number>
  currentPlan: PromoTrailerBeatPlan[]
  findings?: PromoPlanFinding[]
  onAnalysis?: (findings: PromoPlanFinding[]) => void
  onApply: (plan: PromoTrailerBeatPlan[]) => Promise<void>
}

interface DirectorTurn {
  note: string
  shotCount: number
  seconds: number
}

export function PromoPlanDirectorDialog({
  open,
  onOpenChange,
  projectId,
  targetDurationSec,
  audienceDefinition,
  scenes,
  sceneProductionState,
  sceneScores,
  currentPlan,
  findings,
  onAnalysis,
  onApply,
}: PromoPlanDirectorDialogProps) {
  const [note, setNote] = useState('')
  const [draft, setDraft] = useState<PromoTrailerBeatPlan[] | null>(null)
  const [turns, setTurns] = useState<DirectorTurn[]>([])
  const [remoteFindings, setRemoteFindings] = useState<PromoPlanFinding[] | null>(null)
  const [sending, setSending] = useState(false)
  const [applying, setApplying] = useState(false)

  const shown = draft ?? currentPlan
  const shownFindings = remoteFindings ?? findings ?? []
  const recommendationNote = promoRecommendationNotes(shownFindings)

  const revise = async (directionText?: string) => {
    const direction = (directionText ?? note).trim()
    if (!direction) return
    setSending(true)
    try {
      const res = await fetch('/api/publish/promo/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'plan',
          targetDurationSec,
          directorNotes: direction,
          audienceDefinition: audienceDefinition?.description?.trim() ? audienceDefinition : undefined,
          sceneScores,
          scenes,
          beatPlan: shown,
          sceneProductionState: slimPromoProductionState(sceneProductionState),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Plan direction failed')
      const next = Array.isArray(data.beatPlan) ? (data.beatPlan as PromoTrailerBeatPlan[]) : []
      if (next.length === 0) throw new Error('The director returned an empty plan')
      const analysis = Array.isArray(data.analysis) ? (data.analysis as PromoPlanFinding[]) : null
      if (analysis) {
        setRemoteFindings(analysis)
        onAnalysis?.(analysis)
      }
      setDraft(next)
      setTurns((current) => [
        ...current,
        {
          note: direction,
          shotCount: next.length,
          seconds: Math.round(data.totalDurationSec ?? targetDurationSec),
        },
      ])
      setNote('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Plan direction failed')
    } finally {
      setSending(false)
    }
  }

  const apply = async () => {
    if (!draft?.length) return
    setApplying(true)
    try {
      await onApply(draft)
      setDraft(null)
      setTurns([])
      setNote('')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not apply the plan')
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[min(42rem,calc(100vw-2rem))] max-w-none min-w-0 max-h-[90vh] flex-col gap-3 overflow-x-hidden overflow-y-auto bg-slate-900 border-slate-700 text-slate-100">
        <DialogTitle className="flex min-w-0 items-center gap-2 text-base font-semibold text-white">
          <Clapperboard className="h-4 w-4 shrink-0 text-fuchsia-300" />
          Promo Director
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-400">
          Audience Resonance reviews this cut. Apply recommendations revises the shot plan. A
          note does the same for anything you add.
        </DialogDescription>

        {shownFindings.length > 0 ? (
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {shownFindings.map((finding, index) => (
              <div
                key={`${finding.category}-${index}`}
                className="rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
              >
                <p className="text-[10px] uppercase tracking-wide text-fuchsia-300/80">
                  {finding.category} · {finding.priority}
                </p>
                <p className="mt-1 text-xs text-slate-200">{finding.text}</p>
              </div>
            ))}
          </div>
        ) : null}

        {turns.length > 0 ? (
          <div className="space-y-2">
            {turns.map((turn, index) => (
              <div key={`${index}-${turn.note}`} className="rounded border border-slate-700 bg-slate-950/70 px-3 py-2">
                <p className="text-xs text-slate-200">{turn.note}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Revised plan · {turn.shotCount} shots · ~{turn.seconds}s
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {shown.length > 0 ? (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-slate-800 bg-slate-950/50 p-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              {draft ? 'Draft plan' : 'Current plan'}
            </p>
            {shown.map((beat, index) => (
              <p key={`${beat.sceneIndex}-${beat.beatId}-${index}`} className="truncate text-[11px] text-slate-300">
                {index + 1}. S{beat.sceneIndex + 1}
                {beat.trailerRole ? ` · ${beat.trailerRole}` : ''} · {beat.durationSec ?? beat.endSec - beat.startSec}s
                {beat.label ? ` · ${beat.label}` : ''}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No plan yet. A note still composes one from the production.
          </p>
        )}

        <label className="flex min-w-0 flex-col gap-1 text-xs">
          <span className="text-[10px] uppercase text-slate-500">Direction</span>
          <DictationTextarea
            value={note}
            onChange={setNote}
            rows={3}
            disabled={sending || applying}
            placeholder="Open on the chase. Keep it warmer for this audience. End on the title."
            className="min-w-0"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-fuchsia-800/80 px-3 py-1.5 text-xs text-fuchsia-100 hover:bg-fuchsia-950/40 disabled:opacity-50"
            disabled={sending || applying || !recommendationNote}
            onClick={() => void revise(recommendationNote)}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Apply recommendations
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-fuchsia-800/80 px-3 py-1.5 text-xs text-fuchsia-100 hover:bg-fuchsia-950/40 disabled:opacity-50"
            disabled={sending || applying || !note.trim()}
            onClick={() => void revise()}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Revise plan
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded bg-fuchsia-700 px-3 py-1.5 text-xs text-white hover:bg-fuchsia-600 disabled:opacity-50"
            disabled={!draft?.length || sending || applying}
            onClick={() => void apply()}
          >
            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Apply plan
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
