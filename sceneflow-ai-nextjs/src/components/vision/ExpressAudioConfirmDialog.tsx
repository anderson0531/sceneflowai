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
import { Loader, MessageSquare, Music, Sparkles, Waves } from 'lucide-react'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import { resolveAutoSfxDuration } from '@/lib/elevenlabs/sfxDuration'
import { estimateExpressVeoSfxCredits } from '@/lib/sfx/clientExpressVeoSfx'
import { VEO_SFX_CREDIT_HINT } from '@/lib/sfx/clientGenerateVeoSfx'
import {
  resolveAutoVeoSfxDuration,
  resolveVeoSfxTargetSeconds,
  veoSfxCoversFullBeat,
} from '@/lib/sfx/veoSfxDuration'

export type ExpressAudioScope = 'missing' | 'all'

export interface ExpressAudioConfirmOptions {
  scope: ExpressAudioScope
  includeDialogue: boolean
  includeMusic: boolean
  includeSfx: boolean
  sfxBeatIds: string[]
  durationOverride: SfxDurationOverride
}

export interface ExpressAudioBeatOption {
  beatId: string
  label: string
  hasAudio: boolean
}

export interface ExpressAudioDialogueSummary {
  total: number
  missing: number
}

export interface ExpressAudioTrackSummary {
  present: boolean
  missing: boolean
}

interface ExpressAudioConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  beats: ExpressAudioBeatOption[]
  dialogue?: ExpressAudioDialogueSummary
  narration?: ExpressAudioTrackSummary
  music?: ExpressAudioTrackSummary
  segmentDurationSeconds?: number
  isRunning?: boolean
  onConfirm: (options: ExpressAudioConfirmOptions) => void
}

export function ExpressAudioConfirmDialog({
  open,
  onOpenChange,
  beats,
  dialogue,
  narration,
  music,
  segmentDurationSeconds,
  isRunning = false,
  onConfirm,
}: ExpressAudioConfirmDialogProps) {
  const [scope, setScope] = useState<ExpressAudioScope>('missing')
  const [includeDialogue, setIncludeDialogue] = useState(true)
  const [includeMusic, setIncludeMusic] = useState(true)
  const [includeSfx, setIncludeSfx] = useState(true)
  const [selectedBeatIds, setSelectedBeatIds] = useState<string[]>([])
  const [durationPreset, setDurationPreset] = useState<SfxDurationOverride>('auto')

  const hasDialogueOrNarration =
    (dialogue?.total ?? 0) > 0 || !!narration?.present
  const hasMusic = !!music?.present
  const hasSfx = beats.length > 0

  // Reset state whenever the dialog opens or scope changes so the SFX beat
  // selection matches the chosen scope (missing = beats without audio).
  useEffect(() => {
    if (!open) return
    setDurationPreset('auto')
    setIncludeDialogue(hasDialogueOrNarration)
    setIncludeMusic(hasMusic)
    setIncludeSfx(hasSfx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const selected =
      scope === 'all'
        ? beats.map((beat) => beat.beatId)
        : beats.filter((beat) => !beat.hasAudio).map((beat) => beat.beatId)
    setSelectedBeatIds(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scope, beats])

  const selectedSet = useMemo(() => new Set(selectedBeatIds), [selectedBeatIds])
  const autoSeconds = resolveAutoSfxDuration(segmentDurationSeconds)
  const veoAutoSeconds = resolveAutoVeoSfxDuration(segmentDurationSeconds)
  const showPartialVeoHint = !veoSfxCoversFullBeat(segmentDurationSeconds, durationPreset)
  const creditTotal = estimateExpressVeoSfxCredits(
    includeSfx ? selectedBeatIds.length : 0
  )

  const chips: Array<{ id: SfxDurationOverride; label: string }> = [
    {
      id: 'auto',
      label: `Auto (${Number.isInteger(autoSeconds) ? autoSeconds : autoSeconds.toFixed(1)}s · Veo ${veoAutoSeconds}s)`,
    },
    { id: 'short', label: 'Short 3s / Veo 4s' },
    { id: 'medium', label: 'Medium 8s' },
    { id: 'long', label: 'Long 15s / Veo 8s max' },
  ]

  const toggleBeat = (beatId: string, checked: boolean) => {
    setSelectedBeatIds((prev) => {
      if (checked) return prev.includes(beatId) ? prev : [...prev, beatId]
      return prev.filter((id) => id !== beatId)
    })
  }

  const dialogueCount =
    scope === 'all' ? dialogue?.total ?? 0 : dialogue?.missing ?? 0
  const narrationNeeded =
    !!narration?.present && (scope === 'all' || !!narration?.missing)
  const musicNeeded = hasMusic && (scope === 'all' || !!music?.missing)

  const nothingSelected =
    (!includeDialogue || (dialogueCount === 0 && !narrationNeeded)) &&
    (!includeMusic || !musicNeeded) &&
    (!includeSfx || selectedBeatIds.length === 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-violet-200">
            <Sparkles className="w-5 h-5" />
            Express Audio
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Generate dialogue, sound effects, and music for this scene concurrently. Dialogue
            uses TTS, action beats use Veo native audio, and music uses Lyria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Scope */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Scope
            </p>
            <div className="inline-flex rounded-md border border-violet-600/40 overflow-hidden">
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
                Existing audio for the selected types will be deleted and regenerated.
              </p>
            )}
          </div>

          {/* Audio types */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Audio types
            </p>

            {hasDialogueOrNarration && (
              <label className="flex items-center justify-between gap-2 rounded border border-gray-700/80 bg-gray-800/40 p-2 cursor-pointer hover:bg-gray-800/70">
                <span className="flex items-center gap-2 text-sm text-gray-100">
                  <Checkbox
                    checked={includeDialogue}
                    onCheckedChange={(checked) => setIncludeDialogue(checked === true)}
                    disabled={isRunning}
                  />
                  <MessageSquare className="w-4 h-4 text-emerald-300" />
                  Dialogue &amp; narration
                </span>
                <span className="text-[11px] text-gray-400">
                  {dialogueCount + (narrationNeeded ? 1 : 0)}{' '}
                  {scope === 'all' ? 'line(s)' : 'missing'}
                </span>
              </label>
            )}

            {hasMusic && (
              <label className="flex items-center justify-between gap-2 rounded border border-gray-700/80 bg-gray-800/40 p-2 cursor-pointer hover:bg-gray-800/70">
                <span className="flex items-center gap-2 text-sm text-gray-100">
                  <Checkbox
                    checked={includeMusic}
                    onCheckedChange={(checked) => setIncludeMusic(checked === true)}
                    disabled={isRunning}
                  />
                  <Music className="w-4 h-4 text-purple-300" />
                  Background music
                </span>
                <span className="text-[11px] text-gray-400">
                  {musicNeeded ? (scope === 'all' ? 'regenerate' : 'missing') : 'ready'}
                </span>
              </label>
            )}

            {hasSfx && (
              <label className="flex items-center justify-between gap-2 rounded border border-gray-700/80 bg-gray-800/40 p-2 cursor-pointer hover:bg-gray-800/70">
                <span className="flex items-center gap-2 text-sm text-gray-100">
                  <Checkbox
                    checked={includeSfx}
                    onCheckedChange={(checked) => setIncludeSfx(checked === true)}
                    disabled={isRunning}
                  />
                  <Waves className="w-4 h-4 text-violet-300" />
                  Action-beat SFX (Veo)
                </span>
                <span className="text-[11px] text-gray-400">
                  {selectedBeatIds.length} beat(s)
                </span>
              </label>
            )}
          </div>

          {/* SFX beat list */}
          {includeSfx && hasSfx && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Action beats
              </p>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
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
                        <span className="text-[10px] text-green-400">Audio ready</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  SFX duration preset
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
                    Veo covers up to 8s (Auto target{' '}
                    {resolveVeoSfxTargetSeconds({ segmentDurationSeconds, override: durationPreset })}s
                    ).
                  </p>
                )}
                {selectedBeatIds.length > 0 && (
                  <p className="text-[11px] text-violet-300/60 mt-2">
                    SFX credits: {creditTotal}. {VEO_SFX_CREDIT_HINT}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
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
                includeDialogue,
                includeMusic,
                includeSfx,
                sfxBeatIds: includeSfx ? selectedBeatIds : [],
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
                Express Audio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
