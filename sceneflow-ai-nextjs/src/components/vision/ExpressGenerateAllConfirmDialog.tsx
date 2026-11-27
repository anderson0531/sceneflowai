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
import { Switch } from '@/components/ui/switch'
import { Image as ImageIcon, Loader, Sparkles, Zap } from 'lucide-react'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import { resolveAutoVeoSfxDuration } from '@/lib/sfx/veoSfxDuration'
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
import { AUDIO_CREDITS, IMAGE_CREDITS, VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import {
  GEMINI_PRO_STILL_MODEL_ID,
  GEMINI_STILL_MODEL_ID,
  quoteGenerationCredits,
  quoteOperationFromRateCard,
} from '@/lib/credits/quoteGenerationCredits'
import { useLiveRateCard } from '@/hooks/useLiveRateCard'
import { StoryboardQualityToggle } from './StoryboardQualityToggle'
import type { StoryboardQuality } from '@/lib/storyboard/storyboardQuality'
import {
  enumerateStoryboardFrameSlots,
  filterStoryboardSlotsForExpressChecklist,
  type StoryboardFrameSlot,
} from '@/lib/storyboard/types'

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
  defaultIncludeSfx?: boolean
  defaultQuality?: StoryboardQuality
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
  defaultIncludeSfx = false,
  defaultQuality = 'draft',
  onConfirm,
}: ExpressGenerateAllConfirmDialogProps) {
  const t = useTranslations('production.expressGenerateAll')
  const tScene = useTranslations('production.expressScene')
  const tCommon = useTranslations('common')
  const { rateCard } = useLiveRateCard()
  const [audioScope, setAudioScope] = useState<ExpressAudioScope>('missing')
  const [includeSfx, setIncludeSfx] = useState<boolean>(defaultIncludeSfx)
  const [frameScope, setFrameScope] = useState<ExpressSceneScope>('missing')
  const [frameQuality, setFrameQuality] = useState<StoryboardQuality>(defaultQuality)
  const [selectedAudioIds, setSelectedAudioIds] = useState<string[]>([])
  const [selectedFrameKeys, setSelectedFrameKeys] = useState<string[]>([])
  const [durationPreset, setDurationPreset] = useState<SfxDurationOverride>('auto')
  const hasSfxItems = useMemo(() => audioItems.some((item) => item.kind === 'sfx'), [audioItems])

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
    setIncludeSfx(defaultIncludeSfx)
    setFrameScope('missing')
    setFrameQuality(defaultQuality)
    setDurationPreset('auto')
  }, [open, defaultIncludeSfx, defaultQuality])

  useEffect(() => {
    if (!open) return
    setSelectedAudioIds(defaultExpressAudioSelection(audioItems, audioScope, { includeSfx }))
  }, [open, audioScope, audioItems, includeSfx])

  useEffect(() => {
    if (!open) return
    setSelectedFrameKeys(
      checklistSlots.filter((slot) => slotEligibleForScope(slot, frameScope)).map((slot) => slot.key)
    )
  }, [open, frameScope, checklistSlots])

  const selectedAudioSet = useMemo(() => new Set(selectedAudioIds), [selectedAudioIds])
  const selectedFrameSet = useMemo(() => new Set(selectedFrameKeys), [selectedFrameKeys])
  const selectedAudioCounts = useMemo(() => {
    let sfx = 0
    let spoken = 0
    let music = 0
    for (const item of audioItems) {
      if (!selectedAudioSet.has(item.id)) continue
      if (item.kind === 'sfx') sfx += 1
      else if (item.kind === 'music') music += 1
      else spoken += 1
    }
    return { sfx, spoken, music }
  }, [audioItems, selectedAudioSet])

  const selectedSfxCount = selectedAudioCounts.sfx
  const autoSeconds = resolveAutoVeoSfxDuration(segmentDurationSeconds)

  const creditEstimate = useMemo(() => {
    const perFrame =
      frameQuality === 'final'
        ? quoteGenerationCredits({
            kind: 'still',
            model: GEMINI_PRO_STILL_MODEL_ID,
            resolution: '2k',
            rateCard,
            floorCredits: IMAGE_CREDITS.FINAL_FRAME_GENERATION,
          }).credits
        : quoteGenerationCredits({
            kind: 'still',
            model: GEMINI_STILL_MODEL_ID,
            rateCard,
            floorCredits: IMAGE_CREDITS.IMAGEN_4,
          }).credits
    const sfxPerClip = quoteOperationFromRateCard({
      operation: 'veo_lite_sfx',
      units: 1,
      rateCard,
      floorCredits: VIDEO_CREDITS.VEO_LITE,
    }).credits
    const geminiTtsPerLine = quoteOperationFromRateCard({
      operation: 'gemini_tts',
      units: 0.15,
      rateCard,
      floorCredits: AUDIO_CREDITS.DIALOGUE_PER_LINE,
    }).credits
    const elevenLabsTtsPerLine = quoteOperationFromRateCard({
      operation: 'elevenlabs_tts',
      units: 0.15,
      rateCard,
      floorCredits: AUDIO_CREDITS.DIALOGUE_PER_LINE,
    }).credits
    const ttsPerLine = Math.max(geminiTtsPerLine, elevenLabsTtsPerLine)
    const musicPerCue = quoteOperationFromRateCard({
      operation: 'lyria_music',
      units: 1,
      rateCard,
      floorCredits: AUDIO_CREDITS.MUSIC_TRACK,
    }).credits

    const sfx =
      selectedAudioCounts.sfx > 0
        ? quoteOperationFromRateCard({
            operation: 'veo_lite_sfx',
            units: selectedAudioCounts.sfx,
            rateCard,
            floorCredits: VIDEO_CREDITS.VEO_LITE * selectedAudioCounts.sfx,
          }).credits
        : 0
    const spoken = selectedAudioCounts.spoken * ttsPerLine
    const music =
      selectedAudioCounts.music > 0
        ? quoteOperationFromRateCard({
            operation: 'lyria_music',
            units: selectedAudioCounts.music,
            rateCard,
            floorCredits: AUDIO_CREDITS.MUSIC_TRACK * selectedAudioCounts.music,
          }).credits
        : 0
    const frames = selectedFrameKeys.length * perFrame

    return {
      perFrame,
      sfxPerClip,
      ttsPerLine,
      musicPerCue,
      sfx,
      spoken,
      music,
      frames,
      total: sfx + spoken + music + frames,
    }
  }, [frameQuality, rateCard, selectedAudioCounts, selectedFrameKeys.length])

  const sfxCreditTotal = creditEstimate.sfx
  const frameCreditTotal = creditEstimate.frames
  const autoSecondsLabel = Number.isInteger(autoSeconds) ? autoSeconds : autoSeconds.toFixed(1)

  const chips: Array<{ id: SfxDurationOverride; label: string }> = [
    { id: 'auto', label: t('durationAuto', { seconds: autoSecondsLabel }) },
    { id: 'short', label: t('durationShort') },
    { id: 'medium', label: t('durationMedium') },
    { id: 'long', label: t('durationLong') },
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
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 py-2">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-violet-200">
              <Sparkles className="w-4 h-4" />
              <p className="text-sm font-semibold">{t('audioSection')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                {t('scope')}
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
                    {value === 'missing' ? t('scopeMissing') : t('scopeAll')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t('audioToGenerate')}
                </p>
                {hasSfxItems && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-violet-200">
                    <span>Include optional SFX</span>
                    <Switch
                      checked={includeSfx}
                      onCheckedChange={setIncludeSfx}
                      disabled={isRunning}
                      className="scale-75 origin-right"
                      aria-label="Include optional SFX"
                    />
                  </label>
                )}
              </div>
              {hasSfxItems && !includeSfx && (
                <p className="text-[11px] text-slate-400 mb-2">
                  SFX is optional — leaving it off saves {creditEstimate.sfxPerClip} credits per shot for Pre-Vis production.
                </p>
              )}
              {audioItems.length === 0 ? (
                <p className="text-sm text-gray-500 py-2 text-center">{t('noAudioItems')}</p>
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
                          {item.kind === 'sfx' && !item.hasAudio
                            ? t('recommended')
                            : item.hasAudio
                                ? t('statusReady')
                                : t('statusMissing')}
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
                  {t('sfxDurationPreset')}
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
                <p className="text-[11px] text-violet-300/60 mt-2">
                  {t('sfxCredits', { credits: sfxCreditTotal })}
                </p>
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-gray-700/60 pt-4">
            <div className="flex items-center gap-2 text-amber-200">
              <ImageIcon className="w-4 h-4" />
              <p className="text-sm font-semibold">{t('framesSection')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                {tScene('quality')}
              </p>
              <StoryboardQualityToggle
                value={frameQuality}
                onChange={setFrameQuality}
                draftLabel={tScene('qualityDraft')}
                finalLabel={tScene('qualityFinal')}
                disabled={isRunning}
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                {t('scope')}
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
                    {value === 'missing' ? t('scopeMissing') : t('scopeRegenerate')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                {t('frames')}
              </p>
              {checklistSlots.length === 0 ? (
                <p className="text-sm text-gray-500 py-2 text-center">{t('noFrames')}</p>
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
                          {slot.ownImageUrl ? t('hasImage') : t('missing')}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {selectedFrameKeys.length > 0 && (
                <p className="text-[11px] text-amber-300/60 mt-2">
                  {t('imageCredits', {
                    credits: frameCreditTotal,
                    count: selectedFrameKeys.length,
                    perFrame: creditEstimate.perFrame,
                  })}
                </p>
              )}
            </div>
          </section>

          {!nothingSelected && (
            <div className="rounded-md border border-sky-700/40 bg-sky-950/20 px-3 py-2 text-[11px] text-sky-200/90 space-y-0.5">
              <div className="font-semibold text-sky-100">
                Estimated total: ~{creditEstimate.total.toLocaleString()} credits
              </div>
              <div className="text-sky-300/75 flex flex-wrap gap-x-3 gap-y-0.5">
                {selectedFrameKeys.length > 0 && (
                  <span>
                    Frames ({selectedFrameKeys.length} × {creditEstimate.perFrame}): ~{creditEstimate.frames} cr
                  </span>
                )}
                {selectedAudioCounts.spoken > 0 && (
                  <span>
                    TTS ({selectedAudioCounts.spoken} {selectedAudioCounts.spoken === 1 ? 'line' : 'lines'} × {creditEstimate.ttsPerLine}): ~{creditEstimate.spoken} cr
                  </span>
                )}
                {selectedAudioCounts.music > 0 && (
                  <span>
                    Music ({selectedAudioCounts.music} {selectedAudioCounts.music === 1 ? 'cue' : 'cues'} × {creditEstimate.musicPerCue}): ~{creditEstimate.music} cr
                  </span>
                )}
                {selectedAudioCounts.sfx > 0 && (
                  <span>
                    SFX ({selectedAudioCounts.sfx} {selectedAudioCounts.sfx === 1 ? 'shot' : 'shots'} × {creditEstimate.sfxPerClip}): ~{creditEstimate.sfx} cr
                  </span>
                )}
              </div>
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
            {tCommon('actions.cancel')}
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
                  quality: frameQuality,
                },
              })
            }
            disabled={isRunning || nothingSelected}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            {isRunning ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {t('running')}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {t('confirm')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
