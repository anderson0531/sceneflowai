'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Loader, Sparkles } from 'lucide-react'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import { resolveAutoSfxDuration } from '@/lib/elevenlabs/sfxDuration'
import {
  defaultExpressAudioSelection,
  type ExpressAudioItem,
  type ExpressAudioScope,
} from '@/lib/audio/buildExpressAudioItems'
import { estimateExpressVeoSfxCredits } from '@/lib/sfx/clientExpressVeoSfx'
import { VEO_SFX_CREDIT_HINT } from '@/lib/sfx/clientGenerateVeoSfx'
import {
  resolveAutoVeoSfxDuration,
  resolveVeoSfxTargetSeconds,
  veoSfxCoversFullBeat,
} from '@/lib/sfx/veoSfxDuration'

export type { ExpressAudioScope } from '@/lib/audio/buildExpressAudioItems'

export interface ExpressAudioConfirmOptions {
  scope: ExpressAudioScope
  selectedIds: string[]
  durationOverride: SfxDurationOverride
}

interface ExpressAudioConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ExpressAudioItem[]
  segmentDurationSeconds?: number
  isRunning?: boolean
  onConfirm: (options: ExpressAudioConfirmOptions) => void
}

function typeBadgeClass(kind: ExpressAudioItem['kind']): string {
  switch (kind) {
    case 'music':
      return 'bg-purple-500/15 text-purple-200 border-purple-500/30'
    case 'narration':
    case 'dialogue':
      return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
    case 'sfx':
      return 'bg-violet-500/15 text-violet-200 border-violet-500/30'
  }
}

export function ExpressAudioConfirmDialog({
  open,
  onOpenChange,
  items,
  segmentDurationSeconds,
  isRunning = false,
  onConfirm,
}: ExpressAudioConfirmDialogProps) {
  const [scope, setScope] = useState<ExpressAudioScope>('missing')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [durationPreset, setDurationPreset] = useState<SfxDurationOverride>('auto')

  useEffect(() => {
    if (!open) return
    setDurationPreset('auto')
    setScope('missing')
  }, [open])

  useEffect(() => {
    if (!open) return
    setSelectedIds(defaultExpressAudioSelection(items, scope))
  }, [open, scope, items])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedSfxCount = useMemo(
    () => items.filter((item) => item.kind === 'sfx' && selectedSet.has(item.id)).length,
    [items, selectedSet]
  )
  const autoSeconds = resolveAutoSfxDuration(segmentDurationSeconds)
  const veoAutoSeconds = resolveAutoVeoSfxDuration(segmentDurationSeconds)
  const showPartialVeoHint = !veoSfxCoversFullBeat(segmentDurationSeconds, durationPreset)
  const creditTotal = estimateExpressVeoSfxCredits(selectedSfxCount)

  const chips: Array<{ id: SfxDurationOverride; label: string }> = [
    {
      id: 'auto',
      label: `Auto (${Number.isInteger(autoSeconds) ? autoSeconds : autoSeconds.toFixed(1)}s · Veo ${veoAutoSeconds}s)`,
    },
    { id: 'short', label: 'Short 3s / Veo 4s' },
    { id: 'medium', label: 'Medium 8s' },
    { id: 'long', label: 'Long 15s / Veo 8s max' },
  ]

  const toggleItem = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id]
      return prev.filter((entry) => entry !== id)
    })
  }

  const nothingSelected = selectedIds.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-gray-900 border-gray-700 text-gray-100">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-violet-200">
            <Sparkles className="w-5 h-5" />
            Express Audio
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Generate dialogue, sound effects, and music for this scene concurrently. Dialogue
            uses TTS, action beats use Veo native audio, and music uses Lyria.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Scope
            </p>
            <div className="inline-flex max-w-full rounded-md border border-violet-600/40 overflow-hidden">
              {(['missing', 'all'] as ExpressAudioScope[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setScope(value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    scope === value
                      ? 'bg-violet-600 text-white'
                      : 'bg-transparent text-violet-200/80 hover:bg-violet-900/30'
                  }`}
                >
                  {value === 'missing' ? 'Missing only' : 'All (regenerate)'}
                </button>
              ))}
            </div>
            {scope === 'all' && (
              <p className="text-[11px] text-amber-200/70 mt-2">
                Existing audio for the selected items will be deleted and regenerated.
              </p>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Audio to generate
            </p>
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No audio items available for this scene.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {items.map((item) => (
                  <label
                    key={item.id}
                    className="flex w-full min-w-0 box-border items-start gap-2 rounded border border-gray-700/80 bg-gray-800/40 p-2 cursor-pointer hover:bg-gray-800/70"
                  >
                    <Checkbox
                      checked={selectedSet.has(item.id)}
                      onCheckedChange={(checked) => toggleItem(item.id, checked === true)}
                      disabled={isRunning}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="block text-sm text-gray-100 truncate flex-1 min-w-0">
                          {item.label}
                        </span>
                        <span
                          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${typeBadgeClass(item.kind)}`}
                        >
                          {item.typeLabel}
                        </span>
                      </span>
                      <span
                        className={`text-[10px] ${
                          item.hasAudio ? 'text-green-400' : 'text-amber-400'
                        }`}
                      >
                        {item.hasAudio ? 'Ready' : 'Missing'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedSfxCount > 0 && (
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                SFX duration preset
              </p>
              <div className="flex min-w-0 flex-wrap gap-1.5">
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
                  Veo covers up to 8s (Auto target{' '}
                  {resolveVeoSfxTargetSeconds({
                    segmentDurationSeconds,
                    override: durationPreset,
                  })}
                  s).
                </p>
              )}
              <p className="text-[11px] text-violet-300/60 mt-2">
                SFX credits: {creditTotal}. {VEO_SFX_CREDIT_HINT}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() =>
              onConfirm({
                scope,
                selectedIds,
                durationOverride: durationPreset,
              })
            }
            disabled={isRunning || nothingSelected}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isRunning ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Express Audio ({selectedIds.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
