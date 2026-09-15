'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Clapperboard, Loader2, Save, Sparkles } from 'lucide-react'
import { composeBeatActionFraming } from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { StillDirectorPatch } from '@/lib/intelligence/beat-still-director-fallback'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { StillPolicyModeControl } from '@/components/vision/StillPolicyModeControl'
import type { StillPolicyMode } from '@/lib/generation/stillPolicy'
import { escalateImagePromptForRetry } from '@/lib/generation/imagePolicyEscalation'

export interface BeatStillDirectorSavePayload {
  patch?: StillDirectorPatch | null
  generate: boolean
  stillPolicyMode: StillPolicyMode
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
  const [stillPolicyMode, setStillPolicyMode] = useState<StillPolicyMode>('safety')

  const currentFraming = useMemo(
    () => (beat ? composeBeatActionFraming(beat) : ''),
    [beat]
  )
  const safetyFraming = useMemo(() => {
    const source = rewrittenFraming || currentFraming
    if (!source) return ''
    return escalateImagePromptForRetry(source, 1, { skipProductionStillFraming: true })
  }, [rewrittenFraming, currentFraming])

  useEffect(() => {
    if (!open) {
      setInstruction('')
      setPatch(null)
      setRewrittenFraming('')
      setStillPolicyMode('safety')
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
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Rewrite failed')
      if (!data.patch) throw new Error('No rewrite returned')
      setPatch(data.patch as StillDirectorPatch)
      setRewrittenFraming(
        typeof data.actionFraming === 'string' ? data.actionFraming : ''
      )
      toast.success('Prompt rewritten — save it before generating')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Rewrite failed')
    } finally {
      setIsRewriting(false)
    }
  }

  const handleSave = async (generate: boolean) => {
    if (!generate && !patch) return
    await onSave({ patch: patch ?? null, generate, stillPolicyMode })
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

          <StillPolicyModeControl
            value={stillPolicyMode}
            onChange={setStillPolicyMode}
            disabled={busy}
          />

          {stillPolicyMode === 'safety' && safetyFraming && (
            <div className="space-y-1">
              <Label className="text-slate-300">{tp('rewrittenPreview')}</Label>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                {safetyFraming}
              </p>
            </div>
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
