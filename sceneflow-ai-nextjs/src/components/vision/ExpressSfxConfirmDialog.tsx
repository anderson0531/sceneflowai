'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader, Waves, Zap } from 'lucide-react'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import { resolveAutoSfxDuration } from '@/lib/elevenlabs/sfxDuration'
import { estimateExpressVeoSfxCredits } from '@/lib/sfx/clientExpressVeoSfx'
import { VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import {
  resolveAutoVeoSfxDuration,
  resolveVeoSfxTargetSeconds,
  veoSfxCoversFullBeat,
} from '@/lib/sfx/veoSfxDuration'

export interface ExpressSfxConfirmOptions {
  beatIds: string[]
  durationOverride: SfxDurationOverride
  regenerate: boolean
}

export interface ExpressSfxBeatOption {
  beatId: string
  label: string
  hasAudio: boolean
}

interface ExpressSfxConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  beats: ExpressSfxBeatOption[]
  initialBeatIds?: string[]
  segmentDurationSeconds?: number
  isRunning?: boolean
  onConfirm: (options: ExpressSfxConfirmOptions) => void
}

export function ExpressSfxConfirmDialog({
  open,
  onOpenChange,
  beats,
  initialBeatIds,
  segmentDurationSeconds,
  isRunning = false,
  onConfirm,
}: ExpressSfxConfirmDialogProps) {
  const t = useTranslations('production.expressSfx')
  const tCommon = useTranslations('common')
  const [selectedBeatIds, setSelectedBeatIds] = useState<string[]>([])
  const [durationPreset, setDurationPreset] = useState<SfxDurationOverride>('auto')
  const [regenerate, setRegenerate] = useState(false)

  useEffect(() => {
    if (!open) return
    setDurationPreset('auto')
    setRegenerate(false)
    const defaultSelected =
      initialBeatIds && initialBeatIds.length > 0
        ? initialBeatIds.filter((id) => beats.some((beat) => beat.beatId === id))
        : beats.filter((beat) => !beat.hasAudio).map((beat) => beat.beatId)
    setSelectedBeatIds(defaultSelected)
  }, [open, beats, initialBeatIds])

  const selectedSet = useMemo(() => new Set(selectedBeatIds), [selectedBeatIds])
  const autoSeconds = resolveAutoSfxDuration(segmentDurationSeconds)
  const veoAutoSeconds = resolveAutoVeoSfxDuration(segmentDurationSeconds)
  const showPartialVeoHint = !veoSfxCoversFullBeat(segmentDurationSeconds, durationPreset)
  const creditTotal = estimateExpressVeoSfxCredits(selectedBeatIds.length)
  const autoSecondsLabel = Number.isInteger(autoSeconds) ? autoSeconds : autoSeconds.toFixed(1)

  const chips: Array<{ id: SfxDurationOverride; label: string }> = [
    {
      id: 'auto',
      label: t('durationAuto', { seconds: autoSecondsLabel, veoSeconds: veoAutoSeconds }),
    },
    { id: 'short', label: t('durationShort') },
    { id: 'medium', label: t('durationMedium') },
    { id: 'long', label: t('durationLong') },
  ]

  const toggleBeat = (beatId: string, checked: boolean) => {
    setSelectedBeatIds((prev) => {
      if (checked) return prev.includes(beatId) ? prev : [...prev, beatId]
      return prev.filter((id) => id !== beatId)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-violet-200">
            <Zap className="w-5 h-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-violet-500/30 bg-violet-950/20 p-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-300">{t('selectedBeats')}</span>
              <span className="font-medium text-violet-200">{selectedBeatIds.length}</span>
            </div>
            <div className="flex justify-between gap-4 mt-1">
              <span className="text-gray-300">{t('estimatedCredits')}</span>
              <span className="font-medium text-violet-200">{creditTotal}</span>
            </div>
            <p className="text-[11px] text-violet-300/60 mt-2">
              {t('creditHint', { credits: VIDEO_CREDITS.VEO_LITE })}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {t('actionBeats')}
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {beats.map((beat) => (
                <label
                  key={beat.beatId}
                  className="flex items-start gap-2 rounded border border-gray-700/80 bg-gray-800/40 p-2 cursor-pointer hover:bg-gray-800/70"
                >
                  <Checkbox
                    checked={selectedSet.has(beat.beatId)}
                    onCheckedChange={(checked) => toggleBeat(beat.beatId, checked === true)}
                    disabled={isRunning}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-gray-100 truncate">{beat.label}</span>
                    {beat.hasAudio && (
                      <span className="text-[10px] text-green-400">{t('audioReady')}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {t('durationPreset')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setDurationPreset(chip.id)}
                  className={`text-[10px] leading-none px-2 py-1 rounded border transition-colors ${
                    durationPreset === chip.id
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'bg-transparent border-violet-600/40 text-violet-200/80 hover:bg-violet-900/30'
                  } disabled:opacity-50`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            {showPartialVeoHint && (
              <p className="text-[10px] text-amber-200/60 mt-2">
                {t('veoPartialHint', {
                  seconds: resolveVeoSfxTargetSeconds({
                    segmentDurationSeconds,
                    override: durationPreset,
                  }),
                })}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <Checkbox
              checked={regenerate}
              onCheckedChange={(checked) => setRegenerate(checked === true)}
              disabled={isRunning}
            />
            {t('regenerateWithAudio')}
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
          >
            {tCommon('actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() =>
              onConfirm({
                beatIds: selectedBeatIds,
                durationOverride: durationPreset,
                regenerate,
              })
            }
            disabled={isRunning || selectedBeatIds.length === 0}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isRunning ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {t('running')}
              </>
            ) : (
              <>
                <Waves className="w-4 h-4 mr-2" />
                {t('generateSfx', { count: selectedBeatIds.length })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
