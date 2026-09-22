'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Clapperboard, Loader2, Save, Sparkles } from 'lucide-react'

export interface BeatVideoDirectorSavePayload {
  prompt: string
  generate: boolean
}

export interface BeatVideoDirectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  sceneIndex: number
  beatId?: string
  label: string
  currentPrompt: string
  isGenerating?: boolean
  onSave: (payload: BeatVideoDirectorSavePayload) => void | Promise<void>
}

function appendChipText(current: string, addition: string): string {
  const trimmed = current.trim()
  if (!trimmed) return addition
  if (trimmed.includes(addition)) return trimmed
  return `${trimmed.replace(/[. ]*$/, '')}. ${addition}`
}

export function BeatVideoDirectorDialog({
  open,
  onOpenChange,
  projectId,
  sceneIndex,
  beatId,
  label,
  currentPrompt,
  isGenerating = false,
  onSave,
}: BeatVideoDirectorDialogProps) {
  const t = useTranslations('production.direction.videoDirector')
  const tc = useTranslations('common.actions')
  const [instruction, setInstruction] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [rewrittenPrompt, setRewrittenPrompt] = useState('')

  useEffect(() => {
    if (!open) {
      setInstruction('')
      setRewrittenPrompt('')
    }
  }, [open])

  const chips = useMemo(
    () => [
      { id: 'camera', label: t('chipCamera'), text: t('chipCameraText') },
      { id: 'hold-start', label: t('chipHoldStart'), text: t('chipHoldStartText') },
      { id: 'action', label: t('chipAction'), text: t('chipActionText') },
      { id: 'slower', label: t('chipSlower'), text: t('chipSlowerText') },
      { id: 'end-frame', label: t('chipMatchEnd'), text: t('chipMatchEndText') },
      { id: 'faces', label: t('chipKeepFaces'), text: t('chipKeepFacesText') },
    ],
    [t]
  )

  const displayedPrompt = rewrittenPrompt || currentPrompt

  const handleRewrite = async () => {
    setIsRewriting(true)
    try {
      const response = await fetch('/api/scene/direct-beat-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          beatId,
          currentPrompt,
          mode: instruction.trim() ? 'rewrite' : 'optimize',
          userDirection: instruction.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Rewrite failed')
      const next = typeof data.videoPrompt === 'string' ? data.videoPrompt.trim() : ''
      if (!next) throw new Error('No rewrite returned')
      setRewrittenPrompt(next)
      toast.success(t('rewrittenToast'))
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Rewrite failed')
    } finally {
      setIsRewriting(false)
    }
  }

  const handleSave = async (generate: boolean) => {
    const prompt = (rewrittenPrompt || currentPrompt).trim()
    if (!generate && !rewrittenPrompt.trim()) return
    if (!prompt) return
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
                {rewrittenPrompt}
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {tc('cancel')}
            </Button>
            <Button variant="outline" onClick={() => void handleRewrite()} disabled={busy}>
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
              disabled={!rewrittenPrompt.trim() || busy}
            >
              <Save className="w-4 h-4 mr-1" />
              {t('savePrompt')}
            </Button>
            <Button onClick={() => void handleSave(true)} disabled={busy || !displayedPrompt.trim()}>
              {t('saveAndGenerate')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
