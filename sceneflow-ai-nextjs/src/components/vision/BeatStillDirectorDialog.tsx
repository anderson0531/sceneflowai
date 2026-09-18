'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Clapperboard, Loader2, Save, Sparkles } from 'lucide-react'
import { composeBeatActionFraming } from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  applyPolicyComplianceToPatch,
  type StillDirectorPatch,
} from '@/lib/intelligence/beat-still-director-fallback'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { escalateImagePromptForRetry } from '@/lib/generation/imagePolicyEscalation'
import {
  scoreBeatDirectionFidelity,
  type DirectionFidelityScore,
} from '@/lib/intelligence/beatDirectionFidelity'
import { cn } from '@/lib/utils'

export interface BeatStillDirectorSavePayload {
  patch?: StillDirectorPatch | null
  generate: boolean
}

export interface BeatStillDirectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  sceneIndex: number
  beat: SceneBeat | null
  label: string
  isGenerating?: boolean
  onSave: (payload: BeatStillDirectorSavePayload) => void | Promise<void>
}

function appendChipText(current: string, addition: string): string {
  const trimmed = current.trim()
  if (!trimmed) return addition
  if (trimmed.includes(addition)) return trimmed
  return `${trimmed.replace(/[. ]*$/, '')}. ${addition}`
}

function DirectionStrengthMeter({
  score,
  t,
}: {
  score: DirectionFidelityScore
  t: ReturnType<typeof useTranslations>
}) {
  const bandHint =
    score.band === 'strong'
      ? t('directionStrengthStrong')
      : score.band === 'moderate'
        ? t('directionStrengthModerate')
        : t('directionStrengthDrifted')
  const barColor =
    score.band === 'strong'
      ? 'bg-emerald-500'
      : score.band === 'moderate'
        ? 'bg-amber-500'
        : 'bg-rose-500'

  return (
    <div className="space-y-1.5 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-slate-200">
          {t('directionStrength', { score: score.score })}
        </p>
        <p className="text-[10px] text-slate-400">{bandHint}</p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${Math.max(4, Math.min(100, score.score))}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{score.note}</p>
    </div>
  )
}

export function BeatStillDirectorDialog({
  open,
  onOpenChange,
  projectId,
  sceneIndex,
  beat,
  label,
  isGenerating = false,
  onSave,
}: BeatStillDirectorDialogProps) {
  const t = useTranslations('production.direction.stillDirector')
  const tp = useTranslations('production.direction.stillPolicy')
  const tc = useTranslations('common.actions')
  const [instruction, setInstruction] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [patch, setPatch] = useState<StillDirectorPatch | null>(null)
  const [rewrittenFraming, setRewrittenFraming] = useState('')
  const [safety, setSafety] = useState(false)
  const [apiDirectionStrength, setApiDirectionStrength] = useState<DirectionFidelityScore | null>(
    null
  )

  const currentFraming = useMemo(
    () => (beat ? composeBeatActionFraming(beat) : ''),
    [beat]
  )
  const safetyFraming = useMemo(() => {
    const source = rewrittenFraming || currentFraming
    if (!source) return ''
    return escalateImagePromptForRetry(source, 1, { skipProductionStillFraming: true })
  }, [rewrittenFraming, currentFraming])

  const displayedFraming = safety ? safetyFraming || rewrittenFraming : rewrittenFraming

  const directionStrength = useMemo(() => {
    if (!beat || !displayedFraming) return null
    if (apiDirectionStrength && !safety) return apiDirectionStrength
    return scoreBeatDirectionFidelity({
      beat,
      rewrittenFraming: displayedFraming,
      patch,
    })
  }, [beat, displayedFraming, patch, apiDirectionStrength, safety])

  useEffect(() => {
    if (!open) {
      setInstruction('')
      setPatch(null)
      setRewrittenFraming('')
      setSafety(false)
      setApiDirectionStrength(null)
    }
  }, [open])

  const chips = useMemo(
    () => [
      { id: 'two-shot', label: t('chipTwoShot'), text: t('chipTwoShotText') },
      { id: 'plant-prop', label: t('chipPlantProp'), text: t('chipPlantPropText') },
      { id: 'faces', label: t('chipDistinctFaces'), text: t('chipDistinctFacesText') },
      { id: 'sides', label: t('chipScreenSides'), text: t('chipScreenSidesText') },
      { id: 'insert', label: t('chipInsert'), text: t('chipInsertText') },
      { id: 'weight', label: t('chipWeight'), text: t('chipWeightText') },
    ],
    [t]
  )

  const handleRewrite = async () => {
    if (!beat?.beatId) return
    setIsRewriting(true)
    try {
      const response = await fetch('/api/scene/direct-beat-still', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          beatId: beat.beatId,
          mode: instruction.trim() ? 'rewrite' : 'optimize',
          userDirection: instruction.trim() || undefined,
          policyCompliance: safety || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Rewrite failed')
      if (!data.patch) throw new Error('No rewrite returned')
      setPatch(data.patch as StillDirectorPatch)
      setRewrittenFraming(
        typeof data.actionFraming === 'string' ? data.actionFraming : ''
      )
      if (data.directionStrength && typeof data.directionStrength.score === 'number') {
        setApiDirectionStrength(data.directionStrength as DirectionFidelityScore)
      } else {
        setApiDirectionStrength(null)
      }
      toast.success('Prompt rewritten — save it before generating')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Rewrite failed')
    } finally {
      setIsRewriting(false)
    }
  }

  const handleSave = async (generate: boolean) => {
    if (!generate && !patch) return
    const savePatch = safety && patch ? applyPolicyComplianceToPatch(patch) : patch
    await onSave({ patch: savePatch ?? null, generate })
    onOpenChange(false)
  }

  if (!beat) return null

  const busy = isRewriting || isGenerating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-teal-400" />
          {t('title', { label })}
        </DialogTitle>
        <DialogDescription className="text-slate-400">{t('description')}</DialogDescription>

        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label className="text-slate-300">{t('currentFraming')}</Label>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              {currentFraming || '—'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setInstruction((prev) => appendChipText(prev, chip.text))}
                  className="text-[10px] px-2 py-1 rounded-full border border-slate-600 text-slate-300 hover:border-teal-500 hover:text-teal-200"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <DictationTextarea
              value={instruction}
              onChange={setInstruction}
              placeholder={t('instructionPlaceholder')}
              rows={4}
              className="text-sm"
            />
          </div>

          {rewrittenFraming && (
            <div className="space-y-1">
              <Label className="text-slate-300">{t('rewrittenFraming')}</Label>
              <p className="text-xs text-teal-100 leading-relaxed whitespace-pre-wrap rounded-lg border border-teal-700/50 bg-teal-950/20 p-3">
                {rewrittenFraming}
              </p>
            </div>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer w-fit">
                  <Checkbox
                    checked={safety}
                    onCheckedChange={(checked) => setSafety(checked === true)}
                    disabled={busy}
                  />
                  {t('safetyOption')}
                </label>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{t('safetyOptionTooltip')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {safety && (
            <p className="text-[11px] text-slate-500">{tp('safetyHint')}</p>
          )}

          {safety && safetyFraming && (
            <div className="space-y-1">
              <Label className="text-slate-300">{tp('rewrittenPreview')}</Label>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                {safetyFraming}
              </p>
            </div>
          )}

          {directionStrength && displayedFraming && (
            <DirectionStrengthMeter score={directionStrength} t={t} />
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {tc('cancel')}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleRewrite()}
              disabled={busy}
            >
              {isRewriting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1" />
              )}
              {isRewriting ? t('rewriting') : t('rewrite')}
            </Button>
            <Button variant="outline" onClick={() => void handleSave(false)} disabled={!patch || busy}>
              <Save className="w-4 h-4 mr-1" />
              {t('savePrompt')}
            </Button>
            <Button onClick={() => void handleSave(true)} disabled={busy}>
              {patch ? t('saveAndGenerate') : tp('retryStill')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
