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
import {
  applyPolicyComplianceToPrompt,
  type ReferenceStillKind,
} from '@/lib/intelligence/reference-still-director-fallback'
import { escalateImagePromptForRetry } from '@/lib/generation/imagePolicyEscalation'
import type { ReferenceStillDirectorContext } from '@/lib/intelligence/reference-still-director-fallback'

export interface ReferenceStillDirectorSavePayload {
  prompt: string
  generate: boolean
}

export interface ReferenceStillDirectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  kind: ReferenceStillKind
  label: string
  currentPrompt: string
  context?: ReferenceStillDirectorContext
  isGenerating?: boolean
  onSave: (payload: ReferenceStillDirectorSavePayload) => void | Promise<void>
}

function appendChipText(current: string, addition: string): string {
  const trimmed = current.trim()
  if (!trimmed) return addition
  if (trimmed.includes(addition)) return trimmed
  return `${trimmed.replace(/[. ]*$/, '')}. ${addition}`
}

const CHIP_IDS: Record<ReferenceStillKind, string[]> = {
  cast: ['headshot', 'neutral', 'studio', 'lens', 'likeness'],
  wardrobe: ['fullBody', 'emptyHands', 'sameFace', 'front', 'studio'],
  location: ['wide', 'empty', 'tod', 'architecture'],
  locationVersion: ['architecture', 'setState', 'empty', 'noProps'],
  object: ['isolated', 'entire', 'scale', 'studio'],
}

export function ReferenceStillDirectorDialog({
  open,
  onOpenChange,
  projectId,
  kind,
  label,
  currentPrompt,
  context,
  isGenerating = false,
  onSave,
}: ReferenceStillDirectorDialogProps) {
  const t = useTranslations('production.direction.referenceDirector')
  const tp = useTranslations('production.direction.stillPolicy')
  const tc = useTranslations('common.actions')
  const [instruction, setInstruction] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [rewrittenPrompt, setRewrittenPrompt] = useState('')
  const [safety, setSafety] = useState(false)

  const safetyPrompt = useMemo(() => {
    const source = rewrittenPrompt || currentPrompt
    if (!source) return ''
    return escalateImagePromptForRetry(source, 1, { skipProductionStillFraming: true })
  }, [rewrittenPrompt, currentPrompt])

  const displayedPrompt = safety ? safetyPrompt || rewrittenPrompt : rewrittenPrompt

  useEffect(() => {
    if (!open) {
      setInstruction('')
      setRewrittenPrompt('')
      setSafety(false)
    }
  }, [open])

  const chips = useMemo(
    () =>
      CHIP_IDS[kind].map((id) => ({
        id,
        label: t(`chips.${kind}.${id}`),
        text: t(`chips.${kind}.${id}Text`),
      })),
    [kind, t]
  )

  const handleRewrite = async () => {
    if (!projectId || !currentPrompt.trim()) return
    setIsRewriting(true)
    try {
      const response = await fetch('/api/vision/direct-reference-still', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          kind,
          mode: instruction.trim() ? 'rewrite' : 'optimize',
          currentPrompt,
          userDirection: instruction.trim() || undefined,
          policyCompliance: safety || undefined,
          context,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Rewrite failed')
      if (!data.prompt || typeof data.prompt !== 'string') throw new Error('No rewrite returned')
      setRewrittenPrompt(data.prompt)
      toast.success('Prompt rewritten — save it before generating')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Rewrite failed')
    } finally {
      setIsRewriting(false)
    }
  }

  const handleSave = async (generate: boolean) => {
    if (!generate && !rewrittenPrompt) return
    const source = rewrittenPrompt || currentPrompt
    const prompt = safety ? applyPolicyComplianceToPrompt(source) : source
    await onSave({ prompt, generate })
    onOpenChange(false)
  }

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
            <Label className="text-slate-300">{t('currentPrompt')}</Label>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              {currentPrompt || '—'}
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

          {rewrittenPrompt && (
            <div className="space-y-1">
              <Label className="text-slate-300">{t('rewrittenPrompt')}</Label>
              <p className="text-xs text-teal-100 leading-relaxed whitespace-pre-wrap rounded-lg border border-teal-700/50 bg-teal-950/20 p-3">
                {displayedPrompt}
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
          {safety && <p className="text-[11px] text-slate-500">{tp('safetyHint')}</p>}

          {safety && safetyPrompt && (
            <div className="space-y-1">
              <Label className="text-slate-300">{tp('rewrittenPreview')}</Label>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                {safetyPrompt}
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {tc('cancel')}
            </Button>
            <Button variant="outline" onClick={() => void handleRewrite()} disabled={busy || !projectId}>
              {isRewriting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1" />
              )}
              {isRewriting ? t('rewriting') : t('rewrite')}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleSave(false)}
              disabled={!rewrittenPrompt || busy}
            >
              <Save className="w-4 h-4 mr-1" />
              {t('savePrompt')}
            </Button>
            <Button onClick={() => void handleSave(true)} disabled={busy || !currentPrompt.trim()}>
              {rewrittenPrompt ? t('saveAndGenerate') : tp('retryStill')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
