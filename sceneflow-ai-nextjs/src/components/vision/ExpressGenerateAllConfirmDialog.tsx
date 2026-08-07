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
import { Image as ImageIcon, Loader, Sparkles, Zap } from 'lucide-react'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import { resolveAutoSfxDuration } from '@/lib/elevenlabs/sfxDuration'
import {
  defaultExpressAudioSelection,
  type ExpressAudioItem,
  type ExpressAudioScope,
} from '@/lib/audio/buildExpressAudioItems'
import type { ExpressAudioConfirmOptions } from '@/components/vision/ExpressAudioConfirmDialog'
import {
  type ExpressSceneConfirmOptions,
  type ExpressSceneScope,
} from '@/components/vision/ExpressSceneConfirmDialog'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import {
  enumerateStoryboardFrameSlots,
  filterStoryboardSlotsForExpressChecklist,
  type StoryboardFrameSlot,
} from '@/lib/storyboard/types'
import { estimateExpressVeoSfxCredits } from '@/lib/sfx/clientExpressVeoSfx'
import { VEO_SFX_CREDIT_HINT } from '@/lib/sfx/clientGenerateVeoSfx'
import {
  resolveAutoVeoSfxDuration,
  veoSfxCoversFullBeat,
} from '@/lib/sfx/veoSfxDuration'

export interface ExpressGenerateAllConfirmOptions {
  audio: ExpressAudioConfirmOptions
  frames: ExpressSceneConfirmOptions
}

interface ExpressGenerateAllConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scene: Record<string, unknown>
  audioItems: ExpressAudioItem[]
  segmentDurationSeconds?: number
  isRunning?: boolean
  onConfirm: (options: ExpressGenerateAllConfirmOptions) => void
}

function slotEligibleForScope(slot: StoryboardFrameSlot, scope: ExpressSceneScope): boolean {
  if (scope === 'missing') return !slot.ownImageUrl
  return !!slot.ownImageUrl
}

function audioTypeBadgeClass(kind: ExpressAudioItem['kind']): string {
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

export function ExpressGenerateAllConfirmDialog({
  open,
  onOpenChange,
  scene,
  audioItems,
  segmentDurationSeconds,
  isRunning = false,
  onConfirm,
}: ExpressGenerateAllConfirmDialogProps) {
  const [audioScope, setAudioScope] = useState<ExpressAudioScope>('missing')
  const [frameScope, setFrameScope] = useState<ExpressSceneScope>('missing')
  const [selectedAudioIds, setSelectedAudioIds] = useState<string[]>([])
  const [selectedFrameKeys, setSelectedFrameKeys] = useState<string[]>([])
  const [durationPreset, setDurationPreset] = useState<SfxDurationOverride>('auto')

  const allSlots = useMemo(
    () => enumerateStoryboardFrameSlots(scene, undefined, { startFramesOnly: true }),
    [scene]
  )

  const checklistSlots = useMemo(
    () => filterStoryboardSlotsForExpressChecklist(allSlots, { includeEndFrames: false }),
    [allSlots]
  )

  useEffect(() => {
    if (!open) return
    setAudioScope('missing')
    setFrameScope('missing')
    setDurationPreset('auto')
  }, [open])

  useEffect(() => {
    if (!open) return
    setSelectedAudioIds(defaultExpressAudioSelection(audioItems, audioScope))
  }, [open, audioScope, audioItems])

  useEffect(() => {
    if (!open) return
    setSelectedFrameKeys(
      checklistSlots.filter((slot) => slotEligibleForScope(slot, frameScope)).map((slot) => slot.key)
    )
  }, [open, frameScope, checklistSlots])

  const selectedAudioSet = useMemo(() => new Set(selectedAudioIds), [selectedAudioIds])
  const selectedFrameSet = useMemo(() => new Set(selectedFrameKeys), [selectedFrameKeys])
  const selectedSfxCount = useMemo(
    () => audioItems.filter((item) => item.kind === 'sfx' && selectedAudioSet.has(item.id)).length,
    [audioItems, selectedAudioSet]
  )

  const autoSeconds = resolveAutoSfxDuration(segmentDurationSeconds)
  const veoAutoSeconds = resolveAutoVeoSfxDuration(segmentDurationSeconds)
  const showPartialVeoHint = !veoSfxCoversFullBeat(segmentDurationSeconds, durationPreset)
  const sfxCreditTotal = estimateExpressVeoSfxCredits(selectedSfxCount)
  const frameCreditTotal = selectedFrameKeys.length * IMAGE_CREDITS.FAL_KLING_IMAGE

  const chips: Array<{ id: SfxDurationOverride; label: string }> = [
    {
      id: 'auto',
      label: `Auto (${Number.isInteger(autoSeconds) ? autoSeconds : autoSeconds.toFixed(1)}s · Veo ${veoAutoSeconds}s)`,
    },
    { id: 'short', label: 'Short 3s / Veo 4s' },
    { id: 'medium', label: 'Medium 8s' },
    { id: 'long', label: 'Long 15s / Veo 8s max' },
  ]

  const toggleAudioItem = (id: string, checked: boolean) => {
    setSelectedAudioIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id]
      return prev.filter((entry) => entry !== id)
    })
  }

  const toggleFrameSlot = (key: string, checked: boolean) => {
    setSelectedFrameKeys((prev) => {
      if (checked) return prev.includes(key) ? prev : [...prev, key]
      return prev.filter((id) => id !== key)
    })
  }

  const nothingSelected = selectedAudioIds.length === 0 && selectedFrameKeys.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-gray-900 border-gray-700 text-gray-100">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sky-200">
            <Zap className="w-5 h-5" />
            Generate All
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Run Express Audio and Express Scene frames in parallel. Defaults match each pipeline’s
            “missing only” selection — adjust scope if you need to regenerate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 py-2">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-violet-200">
              <Sparkles className="w-4 h-4" />
              <p className="text-sm font-semibold">Audio</p>
            </div>
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
                    onClick={() => setAudioScope(value)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      audioScope === value
                        ? 'bg-violet-600 text-white'
                        : 'bg-transparent text-violet-200/80 hover:bg-violet-900/30'
                    }`}
                  >
                    {value === 'missing' ? 'Missing only' : 'All (regenerate)'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Audio to generate
              </p>
              {audioItems.length === 0 ? (
                <p className="text-sm text-gray-500 py-2 text-center">No audio items for this scene.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                  {audioItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex w-full min-w-0 box-border items-start gap-2 rounded border border-gray-700/80 bg-gray-800/40 p-2 cursor-pointer hover:bg-gray-800/70"
                    >
                      <Checkbox
                        checked={selectedAudioSet.has(item.id)}
                        onCheckedChange={(checked) => toggleAudioItem(item.id, checked === true)}
                        disabled={isRunning}
                        className="mt-0.5 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="block text-sm text-gray-100 truncate flex-1 min-w-0">
                            {item.label}
                          </span>
                          <span
                            className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${audioTypeBadgeClass(item.kind)}`}
                          >
                            {item.typeLabel}
                          </span>
                        </span>
                        <span
                          className={`text-[10px] ${item.hasAudio ? 'text-green-400' : 'text-amber-400'}`}
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
                  <p className="text-[11px] text-amber-200/70 mt-2">{VEO_SFX_CREDIT_HINT}</p>
                )}
                <p className="text-[11px] text-violet-300/60 mt-2">
                  Veo SFX credits (est.): {sfxCreditTotal}
                </p>
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-gray-700/60 pt-4">
            <div className="flex items-center gap-2 text-amber-200">
              <ImageIcon className="w-4 h-4" />
              <p className="text-sm font-semibold">Frames</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Scope
              </p>
              <div className="inline-flex rounded-md border border-amber-600/40 overflow-hidden">
                {(['missing', 'selected'] as ExpressSceneScope[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setFrameScope(value)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      frameScope === value
                        ? 'bg-amber-600 text-white'
                        : 'bg-transparent text-amber-200/80 hover:bg-amber-900/30'
                    }`}
                  >
                    {value === 'missing' ? 'Missing only' : 'Regenerate selected'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Frames
              </p>
              {checklistSlots.length === 0 ? (
                <p className="text-sm text-gray-500 py-2 text-center">No frames available.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                  {checklistSlots.map((slot) => (
                    <label
                      key={slot.key}
                      className="flex items-start gap-2 rounded border border-gray-700/80 bg-gray-800/40 p-2 cursor-pointer hover:bg-gray-800/70"
                    >
                      <Checkbox
                        checked={selectedFrameSet.has(slot.key)}
                        onCheckedChange={(checked) => toggleFrameSlot(slot.key, checked === true)}
                        disabled={isRunning}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm text-gray-100 truncate">
                          <ImageIcon className="w-3.5 h-3.5 shrink-0 text-amber-300/80" />
                          {slot.label}
                        </span>
                        <span
                          className={`text-[10px] ${
                            slot.ownImageUrl ? 'text-green-400' : 'text-amber-400'
                          }`}
                        >
                          {slot.ownImageUrl ? 'Has image' : 'Missing'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {selectedFrameKeys.length > 0 && (
                <p className="text-[11px] text-amber-300/60 mt-2">
                  Image credits (est.): {frameCreditTotal} ({selectedFrameKeys.length} frame
                  {selectedFrameKeys.length === 1 ? '' : 's'} × {IMAGE_CREDITS.FAL_KLING_IMAGE})
                </p>
              )}
            </div>
          </section>
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
                audio: {
                  scope: audioScope,
                  selectedIds: selectedAudioIds,
                  durationOverride: durationPreset,
                },
                frames: {
                  scope: frameScope,
                  includeEndFrames: false,
                  selectedFrameKeys,
                },
              })
            }
            disabled={isRunning || nothingSelected}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            {isRunning ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate All
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
