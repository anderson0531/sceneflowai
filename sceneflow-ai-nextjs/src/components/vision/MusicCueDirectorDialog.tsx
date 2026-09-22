'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Clapperboard, Loader2, Save, Sparkles } from 'lucide-react'
import type { MusicCueDirectionPatch } from '@/lib/intelligence/music-cue-director-fallback'
import type { SceneMusicCue } from '@/lib/script/segmentTypes'

export interface MusicCueDirectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  sceneIndex: number
  cue: SceneMusicCue | null
  label: string
  playSeconds: number
  generationSeconds: number
  creditCost: number
  onSave: (patch: MusicCueDirectionPatch, score: boolean) => void | Promise<void>
}

export function MusicCueDirectorDialog({
  open,
  onOpenChange,
  projectId,
  sceneIndex,
  cue,
  label,
  playSeconds,
  generationSeconds,
  creditCost,
  onSave,
}: MusicCueDirectorDialogProps) {
  const t = useTranslations('production.direction.musicDirector')
  const tc = useTranslations('common.actions')
  const [instruction, setInstruction] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [patch, setPatch] = useState<MusicCueDirectionPatch | null>(null)

  useEffect(() => {
    if (!open) {
      setInstruction('')
      setPatch(null)
    }
  }, [open])

  if (!cue) return null

  const handleRewrite = async () => {
    setIsRewriting(true)
    try {
      const response = await fetch('/api/scene/direct-music-cue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          cueId: cue.cueId,
          mode: instruction.trim() ? 'rewrite' : 'optimize',
          userDirection: instruction.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Rewrite failed')
      if (!data.patch?.description || !data.patch?.intent) throw new Error('No rewrite returned')
      setPatch({
        description: data.patch.description,
        intent: data.patch.intent,
      })
      toast.success('Score brief rewritten — save it before scoring')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Rewrite failed')
    } finally {
      setIsRewriting(false)
    }
  }

  const handleSave = async (score: boolean) => {
    if (!patch) return
    setIsSaving(true)
    try {
      await onSave(patch, score)
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const busy = isRewriting || isSaving
  const capped = playSeconds > generationSeconds

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-teal-400" />
          {t('title', { label })}
        </DialogTitle>
        <DialogDescription className="text-slate-400">{t('description')}</DialogDescription>

        <div className="space-y-4 mt-2">
          <p className="text-xs text-slate-300">
            {capped
              ? t('durationCapped', { play: playSeconds, generation: generationSeconds })
              : t('duration', { seconds: generationSeconds })}
          </p>

          <div className="space-y-1">
            <Label className="text-slate-300">{t('currentIntent')}</Label>
            <p className="text-xs text-purple-200">{cue.intent || '—'}</p>
            <Label className="text-slate-300">{t('currentBrief')}</Label>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              {cue.description || '—'}
            </p>
          </div>

          <DictationTextarea
            value={instruction}
            onChange={setInstruction}
            placeholder={t('instructionPlaceholder')}
            rows={4}
            className="text-sm"
          />

          {patch && (
            <div className="space-y-1">
              <Label className="text-slate-300">{t('rewrittenIntent')}</Label>
              <p className="text-xs text-teal-100">{patch.intent}</p>
              <Label className="text-slate-300">{t('rewrittenBrief')}</Label>
              <p className="text-xs text-teal-100 leading-relaxed whitespace-pre-wrap rounded-lg border border-teal-700/50 bg-teal-950/20 p-3">
                {patch.description}
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
            <Button variant="outline" onClick={() => void handleSave(false)} disabled={!patch || busy}>
              <Save className="w-4 h-4 mr-1" />
              {t('save')}
            </Button>
            <Button onClick={() => void handleSave(true)} disabled={!patch || busy}>
              {t('saveAndScore', { credits: creditCost })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
