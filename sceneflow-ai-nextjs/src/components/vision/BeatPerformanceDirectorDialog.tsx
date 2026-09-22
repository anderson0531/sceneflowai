'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Clapperboard, Loader2, Save, Sparkles } from 'lucide-react'
import type { BeatPerformancePatch } from '@/lib/intelligence/beat-performance-director-fallback'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { applyBeatPerformanceDirectorToScene } from '@/lib/intelligence/beat-performance-director-fallback'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'

export interface BeatPerformanceDirectorControlProps {
  beat: SceneBeat
  label: string
  sceneIdx: number
  scenes: Array<Record<string, unknown>>
  script: { script?: { scenes?: unknown[] } } | null | undefined
  projectId?: string
  onScriptChange?: (script: unknown) => void | Promise<void>
  onGenerateStill?: (beatId: string) => void | Promise<void>
  promptComposition?: {
    artStyleAnchor?: string
    lookbook?: ProjectLookbook
  }
}

function appendChipText(current: string, addition: string): string {
  const trimmed = current.trim()
  if (!trimmed) return addition
  if (trimmed.includes(addition)) return trimmed
  return `${trimmed.replace(/[. ]*$/, '')}. ${addition}`
}

function currentProse(beat: SceneBeat): string {
  if (beat.kind === 'action') return beat.actionDescription?.trim() || ''
  const voice = beat.voiceDirection?.trim()
  const line = beat.line?.trim() || ''
  return voice ? `${line}\n${voice}` : line
}

export function BeatPerformanceDirectorControl({
  beat,
  label,
  sceneIdx,
  scenes,
  script,
  projectId,
  onScriptChange,
  onGenerateStill,
  promptComposition,
}: BeatPerformanceDirectorControlProps) {
  const t = useTranslations('production.direction.beatDirector')
  const tc = useTranslations('common.actions')
  const [open, setOpen] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [patch, setPatch] = useState<BeatPerformancePatch | null>(null)
  const [rewrittenProse, setRewrittenProse] = useState('')
  const [rewrittenFraming, setRewrittenFraming] = useState('')

  useEffect(() => {
    if (!open) {
      setInstruction('')
      setPatch(null)
      setRewrittenProse('')
      setRewrittenFraming('')
    }
  }, [open])

  const chips = useMemo(
    () => [
      { id: 'quieter', label: t('chipQuieter'), text: t('chipQuieterText') },
      { id: 'sharper', label: t('chipSharper'), text: t('chipSharperText') },
      { id: 'hold', label: t('chipHold'), text: t('chipHoldText') },
      { id: 'action', label: t('chipAction'), text: t('chipActionText') },
    ],
    [t]
  )

  if (!projectId) return null

  const handleRewrite = async () => {
    setIsRewriting(true)
    try {
      const response = await fetch('/api/scene/direct-beat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex: sceneIdx,
          beatId: beat.beatId,
          mode: instruction.trim() ? 'rewrite' : 'optimize',
          userDirection: instruction.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Rewrite failed')
      if (!data.patch) throw new Error('No rewrite returned')
      setPatch(data.patch as BeatPerformancePatch)
      setRewrittenProse(typeof data.prose === 'string' ? data.prose : '')
      setRewrittenFraming(typeof data.actionFraming === 'string' ? data.actionFraming : '')
      toast.success('Beat rewritten — save it before generating')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Rewrite failed')
    } finally {
      setIsRewriting(false)
    }
  }

  const handleSave = async (generate: boolean) => {
    if (!patch || !onScriptChange || !script?.script) return
    const scene = scenes[sceneIdx]
    if (!scene) return
    setIsSaving(true)
    try {
      const applied = applyBeatPerformanceDirectorToScene(scene, beat.beatId, patch, {
        generatedBy: 'user',
        lookbook: promptComposition?.lookbook,
        sceneIndex: sceneIdx,
        artStyleAnchor: promptComposition?.artStyleAnchor,
      })
      if (!applied.applied) {
        toast.error('Beat not found')
        return
      }
      const updatedScenes = [...(script.script.scenes || [])]
      updatedScenes[sceneIdx] = applied.scene
      await onScriptChange({
        ...script,
        script: { ...script.script, scenes: updatedScenes },
      })
      toast.success('Beat direction saved')
      setOpen(false)
      if (generate && onGenerateStill) {
        await onGenerateStill(beat.beatId)
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const busy = isRewriting || isSaving
  const prose = currentProse(beat)

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
        className="text-[10px] px-2 py-0.5 rounded-full border border-teal-600/60 text-teal-200 hover:bg-teal-900/40 inline-flex items-center gap-1"
      >
        <Clapperboard className="w-3 h-3" />
        {t('open')}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-teal-400" />
            {t('title', { label })}
          </DialogTitle>
          <DialogDescription className="text-slate-400">{t('description')}</DialogDescription>

          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-slate-300">{t('currentBeat')}</Label>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                {prose || '—'}
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

            {rewrittenProse && (
              <div className="space-y-1">
                <Label className="text-slate-300">{t('rewrittenBeat')}</Label>
                <p className="text-xs text-teal-100 leading-relaxed whitespace-pre-wrap rounded-lg border border-teal-700/50 bg-teal-950/20 p-3">
                  {rewrittenProse}
                </p>
              </div>
            )}

            {rewrittenFraming && (
              <div className="space-y-1">
                <Label className="text-slate-300">{t('rewrittenDirection')}</Label>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                  {rewrittenFraming}
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
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
              <Button onClick={() => void handleSave(true)} disabled={!patch || busy || !onGenerateStill}>
                {t('saveAndGenerate')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
