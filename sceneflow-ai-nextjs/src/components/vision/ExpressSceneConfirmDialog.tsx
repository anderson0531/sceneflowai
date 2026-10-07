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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Image as ImageIcon, Library, Loader, Zap } from 'lucide-react'
import { StatusFilterBar } from '@/components/vision/StatusFilterBar'
import { StoryboardQualityToggle } from './StoryboardQualityToggle'
import { StoryboardGenerationModeToggle } from './StoryboardGenerationModeToggle'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import {
  enumerateStoryboardFrameSlots,
  filterStoryboardSlotsForExpressChecklist,
} from '@/lib/storyboard/types'
import {
  expressFrameChecklistStatus,
  slotEligibleForScope,
} from '@/lib/storyboard/expressBeatFrameProgress'
import { type StoryboardQuality } from '@/lib/storyboard/storyboardQuality'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { isBeatFrameStale } from '@/lib/storyboard/syncBeatStillPrompt'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  frameMatchesFilters,
  type FrameAttentionFilter,
  type FrameListFacts,
  type FrameTypeFilter,
} from '@/lib/vision/frameListFilters'
import type { StoryboardFrameSlot } from '@/lib/storyboard/types'
import type { StillGenerationMode } from '@/lib/generation/stillPolicy'
import {
  estimateReferenceExpress,
  formatReferenceExpressEstimate,
} from '@/lib/vision/referenceExpress/estimate'
import {
  estimateItemForRequirement,
  expressKindForRequirement,
  type SceneReferenceRequirement,
  type SceneReferenceRequirementKind,
} from '@/lib/vision/sceneReferenceRequirements'

/**
 * Static keys rather than a `referenceKind.${kind}` template, so the catalog
 * check can see every message this dialog can render.
 */
const REFERENCE_KIND_LABEL_KEY: Record<SceneReferenceRequirementKind, string> = {
  cast: 'referenceKindCast',
  wardrobe: 'referenceKindWardrobe',
  location: 'referenceKindLocation',
  prop: 'referenceKindProp',
}

const frameShowLabels: Record<FrameAttentionFilter, string> = {
  all: 'All',
  needs_action: 'Needs action',
  final: 'Final',
  draft: 'Draft',
  prompt_changed: 'Prompt changed',
  missing: 'Missing',
  placeholder: 'Placeholder',
}

const frameShowTooltips: Record<FrameAttentionFilter, string> = {
  all: 'Every frame in this scene.',
  needs_action: 'Frames that are missing, still a draft, or out of date.',
  final: 'Frames approved as final.',
  draft: 'Frames generated as a draft.',
  prompt_changed: 'Frames whose prompt changed after the image was made.',
  missing: 'Frames with no image yet.',
  placeholder: 'Frames still using a stand-in image.',
}

const frameTypeLabels: Record<FrameTypeFilter, string> = {
  all: 'All',
  action: 'Action',
  dialogue: 'Dialogue',
  narration: 'Narration',
}

const frameTypeTooltips: Record<FrameTypeFilter, string> = {
  all: 'Action, dialogue, and narration frames.',
  action: 'Frames for shots with no spoken line.',
  dialogue: 'Frames for shots spoken by a character.',
  narration: 'Frames for voiceover shots.',
}

function stillFacts(
  slot: StoryboardFrameSlot,
  beat: SceneBeat | undefined
): FrameListFacts {
  return {
    key: slot.key,
    kind: slot.kind,
    imageTier: slot.imageTier,
    isMissing: slot.isMissing,
    isPlaceholder: slot.isPlaceholder,
    promptChanged: !!beat && slot.frameRole !== 'end' && isBeatFrameStale(beat),
    hasImageError: !!slot.imageError,
    hasOwnImage: !!slot.ownImageUrl,
    referenceStatus: slot.referenceStatus,
  }
}

function stillDescription(slot: StoryboardFrameSlot, beat: SceneBeat | undefined): string {
  if (!beat) return slot.label
  if (beat.kind === 'action') return beat.actionDescription?.trim() || 'Action'
  if (beat.kind === 'narration') return beat.line?.trim() || 'Narrator'
  return beat.line?.trim() || String(beat.character || 'Dialogue')
}

function numberedShotLine(number: number, description: string): { visible: string; full: string } {
  const full = description.replace(/\s+/g, ' ').trim()
  const body = full.length > 48 ? `${full.slice(0, 48)}…` : full
  return { visible: body ? `${number}: ${body}` : String(number), full }
}

export type ExpressSceneScope = 'missing' | 'selected'

export interface ExpressSceneConfirmOptions {
  scope: ExpressSceneScope
  includeEndFrames: boolean
  selectedFrameKeys: string[]
  /**
   * Draft is storyboard coverage; Final is what the animatic and the video
   * need. This used to be a separate `Finalize` button, which read as a
   * different operation rather than the same one at a different quality.
   */
  quality: StoryboardQuality
  generationMode?: StillGenerationMode
}

interface ExpressSceneConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scene: Record<string, unknown>
  isRunning?: boolean
  onConfirm: (options: ExpressSceneConfirmOptions) => void
  /**
   * References this scene needs that have no image yet. Confirming draws them
   * first and then runs the frames, so the commitment has to be stated up
   * front — it is the difference between a 60-second run and a five-minute one.
   */
  missingReferences?: SceneReferenceRequirement[]
  /**
   * Seeds the per-run quality control when the dialog opens. Changing quality
   * here does not write back to the Frames toolbar default.
   */
  defaultQuality?: StoryboardQuality
  defaultGenerationMode?: StillGenerationMode
}

export function ExpressSceneConfirmDialog({
  open,
  onOpenChange,
  scene,
  isRunning = false,
  onConfirm,
  missingReferences = [],
  defaultQuality = 'draft',
  defaultGenerationMode = 'standard',
}: ExpressSceneConfirmDialogProps) {
  const t = useTranslations('production.expressScene')
  const tCommon = useTranslations('common')
  const [scope, setScope] = useState<ExpressSceneScope>('missing')
  const [quality, setQuality] = useState<StoryboardQuality>(defaultQuality)
  const [generationMode, setGenerationMode] = useState<StillGenerationMode>(defaultGenerationMode)
  const [selectedFrameKeys, setSelectedFrameKeys] = useState<string[]>([])
  const [frameAttention, setFrameAttention] = useState<FrameAttentionFilter>('all')
  const [frameType, setFrameType] = useState<FrameTypeFilter>('all')

  /**
   * Split rather than filtered: Scene Ref Agent draws cast, wardrobe, location
   * bases, set versions, and props. Anything without an express kind still has
   * to be named so a frame does not invent it.
   */
  const { drawableReferences, libraryOnlyReferences } = useMemo(() => {
    const drawable: SceneReferenceRequirement[] = []
    const libraryOnly: SceneReferenceRequirement[] = []
    for (const requirement of missingReferences) {
      if (expressKindForRequirement(requirement.kind)) drawable.push(requirement)
      else libraryOnly.push(requirement)
    }
    return { drawableReferences: drawable, libraryOnlyReferences: libraryOnly }
  }, [missingReferences])

  const referenceEstimate = useMemo(
    () =>
      estimateReferenceExpress(
        drawableReferences
          .map((requirement) => estimateItemForRequirement(requirement))
          .filter((item): item is NonNullable<typeof item> => !!item)
      ),
    [drawableReferences]
  )

  const sceneBeats = useMemo(() => getSceneBeats(scene), [scene])

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
    setScope('missing')
    setQuality(defaultQuality)
    setGenerationMode(defaultGenerationMode)
    setFrameAttention('all')
    setFrameType('all')
  }, [open, defaultQuality, defaultGenerationMode])

  const frameFilterActive = frameAttention !== 'all' || frameType !== 'all'

  useEffect(() => {
    if (!open) return
    const selected = checklistSlots
      .filter((slot) => {
        const beat = slot.beatId
          ? sceneBeats.find((entry) => entry.beatId === slot.beatId)
          : undefined
        if (frameFilterActive) return frameMatchesFilters(stillFacts(slot, beat), frameAttention, frameType)
        return slotEligibleForScope(slot, scope)
      })
      .map((slot) => slot.key)
    setSelectedFrameKeys(selected)
  }, [open, scope, checklistSlots, sceneBeats, frameAttention, frameType, frameFilterActive])

  const selectedSet = useMemo(() => new Set(selectedFrameKeys), [selectedFrameKeys])

  const visibleStillSlots = useMemo(
    () =>
      frameFilterActive
        ? checklistSlots.filter((slot) => {
            const beat = slot.beatId
              ? sceneBeats.find((entry) => entry.beatId === slot.beatId)
              : undefined
            return frameMatchesFilters(stillFacts(slot, beat), frameAttention, frameType)
          })
        : checklistSlots,
    [checklistSlots, sceneBeats, frameAttention, frameType, frameFilterActive]
  )

  const toggleSlot = (key: string, checked: boolean) => {
    setSelectedFrameKeys((prev) => {
      if (checked) return prev.includes(key) ? prev : [...prev, key]
      return prev.filter((id) => id !== key)
    })
  }

  const creditTotal = selectedFrameKeys.length * IMAGE_CREDITS.FAL_KLING_IMAGE
  const nothingSelected = selectedFrameKeys.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-200">
            <Zap className="w-5 h-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {missingReferences.length > 0 && (
            <div className="rounded-md border border-cyan-700/50 bg-cyan-950/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300 mb-1.5 flex items-center gap-1.5">
                <Library className="w-3.5 h-3.5" />
                {t('referencesTitle')}
              </p>
              <p className="text-[11px] text-cyan-100/80">
                {drawableReferences.length > 0
                  ? t('referencesMissing', {
                      count: drawableReferences.length,
                      estimate: formatReferenceExpressEstimate(referenceEstimate),
                    })
                  : t('referencesNoneDrawable')}
              </p>
              <ul className="mt-2 space-y-1">
                {drawableReferences.map((requirement) => (
                  <li
                    key={`${requirement.kind}:${requirement.id}`}
                    className="text-[11px] text-cyan-50/90 flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />
                    <span className="truncate">{requirement.name}</span>
                    <span className="text-cyan-300/60">
                      {t(REFERENCE_KIND_LABEL_KEY[requirement.kind])}
                    </span>
                  </li>
                ))}
              </ul>
              {libraryOnlyReferences.length > 0 && (
                <p className="text-[11px] text-amber-300/80 mt-2">
                  {t('referencesLibraryOnly', {
                    names: libraryOnlyReferences
                      .map((requirement) => requirement.name)
                      .join(', '),
                    count: libraryOnlyReferences.length,
                  })}
                </p>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {t('quality')}
            </p>
            <StoryboardQualityToggle
              value={quality}
              onChange={setQuality}
              draftLabel={t('qualityDraft')}
              finalLabel={t('qualityFinal')}
              disabled={isRunning}
            />
            <p className="text-[11px] text-emerald-200/70 mt-2">
              {quality === 'final' ? t('qualityFinalHint') : t('qualityDraftHint')}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {t('generationMode')}
            </p>
            <StoryboardGenerationModeToggle
              value={generationMode}
              onChange={setGenerationMode}
              standardLabel={t('modeStandard')}
              creativeLabel={t('modeCreative')}
              disabled={isRunning}
            />
            <p className="text-[11px] text-teal-200/70 mt-2">
              {generationMode === 'creative' ? t('modeCreativeHint') : t('modeStandardHint')}
            </p>
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
                  onClick={() => {
                    setFrameAttention('all')
                    setFrameType('all')
                    setScope(value)
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    scope === value
                      ? 'bg-amber-600 text-white'
                      : 'bg-transparent text-amber-200/80 hover:bg-amber-900/30'
                  }`}
                >
                  {value === 'selected' ? t('scopeRegenerate') : t('scopeMissing')}
                </button>
              ))}
            </div>
            {scope === 'selected' && (
              <p className="text-[11px] text-amber-200/70 mt-2">
                {t('scopeRegenerateHint')}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t('frames')}
                </p>
                {scope === 'selected' && (
                  <button
                    type="button"
                    disabled={isRunning || selectedFrameKeys.length === 0}
                    onClick={() => setSelectedFrameKeys([])}
                    className="text-[11px] font-medium text-amber-200/80 hover:text-amber-100 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {t('clearSelections')}
                  </button>
                )}
              </div>
              <StatusFilterBar
                activeSummary={[
                  frameAttention === 'all' ? '' : frameShowLabels[frameAttention],
                  frameType === 'all' ? '' : frameTypeLabels[frameType],
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onClear={() => {
                  setFrameAttention('all')
                  setFrameType('all')
                }}
                groups={[
                  {
                    label: 'Show',
                    onSelect: (id) => setFrameAttention(id as FrameAttentionFilter),
                    chips: (
                      [
                        ['all', 'All'],
                        ['needs_action', 'Needs action'],
                        ['final', 'Final'],
                        ['draft', 'Draft'],
                        ['prompt_changed', 'Prompt changed'],
                        ['missing', 'Missing'],
                        ['placeholder', 'Placeholder'],
                      ] as Array<[FrameAttentionFilter, string]>
                    ).map(([id, label]) => ({
                      id,
                      label,
                      tooltip: frameShowTooltips[id],
                      active: frameAttention === id,
                      count:
                        id === 'all'
                          ? checklistSlots.length
                          : checklistSlots.filter((slot) => {
                              const beat = slot.beatId
                                ? sceneBeats.find((entry) => entry.beatId === slot.beatId)
                                : undefined
                              return frameMatchesFilters(stillFacts(slot, beat), id, frameType)
                            }).length,
                    })),
                  },
                  {
                    label: 'Type',
                    onSelect: (id) => setFrameType(id as FrameTypeFilter),
                    chips: (
                      [
                        ['all', 'All'],
                        ['action', 'Action'],
                        ['dialogue', 'Dialogue'],
                        ...(checklistSlots.some((slot) => slot.kind === 'narration')
                          ? [['narration', 'Narration'] as [FrameTypeFilter, string]]
                          : []),
                      ] as Array<[FrameTypeFilter, string]>
                    ).map(([id, label]) => ({
                      id,
                      label,
                      tooltip: frameTypeTooltips[id],
                      active: frameType === id,
                      count:
                        id === 'all'
                          ? checklistSlots.length
                          : checklistSlots.filter((slot) => {
                              const beat = slot.beatId
                                ? sceneBeats.find((entry) => entry.beatId === slot.beatId)
                                : undefined
                              return frameMatchesFilters(stillFacts(slot, beat), frameAttention, id)
                            }).length,
                    })),
                  },
                ]}
              />
            </div>
            {checklistSlots.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                {t('noFrames')}
              </p>
            ) : visibleStillSlots.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                {t('filterEmpty')}
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {visibleStillSlots.map((slot) => {
                  const beat = slot.beatId
                    ? sceneBeats.find((entry) => entry.beatId === slot.beatId)
                    : undefined
                  const status = expressFrameChecklistStatus({
                    ownImageUrl: slot.ownImageUrl,
                    imageError: slot.imageError,
                    stale: !!beat && slot.frameRole !== 'end' && isBeatFrameStale(beat),
                    imageTier: slot.imageTier,
                  })
                  const statusLabel =
                    status === 'direction_changed'
                      ? t('directionChanged')
                      : status === 'failed'
                        ? t('failed')
                        : status === 'missing'
                          ? t('missing')
                          : `${t('hasImage')} · ${
                              status === 'final' ? t('qualityFinal') : t('qualityDraft')
                            }`
                  const line = numberedShotLine(slot.beatNumber ?? 0, stillDescription(slot, beat))
                  return (
                  <label
                    key={slot.key}
                    className="flex items-start gap-2 rounded border border-gray-700/80 bg-gray-800/40 p-2 cursor-pointer hover:bg-gray-800/70"
                  >
                    <Checkbox
                      checked={selectedSet.has(slot.key)}
                      onCheckedChange={(checked) => toggleSlot(slot.key, checked === true)}
                      disabled={isRunning}
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1.5 text-sm text-gray-100 truncate">
                              <ImageIcon className="w-3.5 h-3.5 shrink-0 text-amber-300/80" />
                              {line.visible}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm bg-gray-900 text-white border border-gray-700">
                            {line.full}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span
                        className={`text-[10px] ${
                          status === 'final' || status === 'draft'
                            ? 'text-green-400'
                            : status === 'failed'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </span>
                  </label>
                  )
                })}
              </div>
            )}
            {selectedFrameKeys.length > 0 && (
              <p className="text-[11px] text-amber-300/60 mt-2">
                {t('imageCredits', {
                  credits: creditTotal,
                  count: selectedFrameKeys.length,
                  perFrame: IMAGE_CREDITS.FAL_KLING_IMAGE,
                })}
              </p>
            )}
          </div>
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
                scope,
                includeEndFrames: false,
                selectedFrameKeys,
                quality,
                generationMode,
              })
            }
            disabled={isRunning || nothingSelected}
            className="bg-amber-600 hover:bg-amber-700 text-white"
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
