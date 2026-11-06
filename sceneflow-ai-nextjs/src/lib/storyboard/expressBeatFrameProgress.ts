import { getSceneBeats } from '@/lib/script/beatMigration'
import { formatPromoSourceBadge } from '@/lib/publish/buildPromoScene'
import type { ExpressPhase } from '@/lib/sceneGeneration/types'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  beatFrameSlotKey,
  enumerateStoryboardFrameSlots,
  filterStoryboardSlotsForExpressChecklist,
  type StoryboardFrameSlot,
} from '@/lib/storyboard/types'
import {
  beatActionStartFrameNeedsGeneration,
  beatEndFrameNeedsGeneration,
  beatFrameNeedsGeneration,
  type BeatFrameGenerationContext,
} from '@/lib/storyboard/storyboardQuality'

export type ExpressBeatFrameStatus = 'pending' | 'running' | 'done' | 'error'

export interface ExpressBeatFrameItem {
  key: string
  label: string
  beatIndex: number
  frameRole: 'start' | 'action-start' | 'end'
  status: ExpressBeatFrameStatus
  error?: string
}

/**
 * Which frames the default Frame Agent scope covers.
 *
 * Missing covers slots with no image URL or whose prompt/direction changed
 * since the image was generated (`stale`). Drafts are not treated as missing —
 * Final is an explicit one-shot quality for empty, stale, or selected frames,
 * not an upgrade-all pass.
 */
export function slotEligibleForScope(
  slot: Pick<StoryboardFrameSlot, 'ownImageUrl'>,
  scope: 'missing' | 'selected',
  stale?: boolean
): boolean {
  if (scope === 'selected') return !!slot.ownImageUrl
  return !slot.ownImageUrl || Boolean(stale)
}

export type ExpressFrameChecklistStatus =
  | 'missing'
  | 'failed'
  | 'direction_changed'
  | 'final'
  | 'draft'

/**
 * Checklist line for one still.
 *
 * Final describes the current still only. A direction rewrite keeps the
 * previous image, and that image's final tier must not read as current.
 */
export function expressFrameChecklistStatus(args: {
  ownImageUrl?: string
  imageError?: string
  stale?: boolean
  imageTier?: 'draft' | 'final'
}): ExpressFrameChecklistStatus {
  if (!args.ownImageUrl?.trim()) {
    return args.imageError?.trim() ? 'failed' : 'missing'
  }
  if (args.stale) return 'direction_changed'
  return args.imageTier === 'final' ? 'final' : 'draft'
}

export interface BuildExpressBeatFrameItemsOptions {
  selectedFrameKeys?: string[]
  includeEndFrames?: boolean
  scope?: 'missing' | 'selected'
  finalizeOnly?: boolean
  storyboardQuality?: 'draft' | 'final'
}

function slotToItem(slot: StoryboardFrameSlot, beat?: SceneBeat): ExpressBeatFrameItem {
  const n = slot.beatNumber ?? (slot.beatIndex ?? 0) + 1
  const roleSuffix =
    slot.frameRole === 'end'
      ? ' (End)'
      : slot.frameRole === 'action-start'
        ? ' (Start)'
        : ''
  const promoBadge = formatPromoSourceBadge(beat)
  const promoSuffix = promoBadge ? ` · ${promoBadge}` : ''
  return {
    key: slot.key,
    label: `Shot ${n}${promoSuffix}${roleSuffix}`,
    beatIndex: slot.beatIndex ?? 0,
    frameRole: slot.frameRole ?? 'start',
    status: 'pending',
  }
}

function buildGenerationContext(
  options: BuildExpressBeatFrameItemsOptions
): BeatFrameGenerationContext {
  return {
    storyboardQuality: options.storyboardQuality ?? 'draft',
    finalizeOnly: options.finalizeOnly,
    regenerate: options.scope === 'selected',
    missingOnly: options.scope === 'missing',
  }
}

/** Build the beat frame rows shown in the Scene Express progress overlay. */
export function buildExpressBeatFrameItems(
  scene: Record<string, unknown>,
  options: BuildExpressBeatFrameItemsOptions = {}
): ExpressBeatFrameItem[] {
  const hasSupplementalSelected = Boolean(
    options.includeEndFrames ||
      options.selectedFrameKeys?.some((k) => k.endsWith('-start') || k.endsWith('-end'))
  )
  const allSlots = filterStoryboardSlotsForExpressChecklist(
    enumerateStoryboardFrameSlots(scene, undefined, {
      startFramesOnly: !hasSupplementalSelected,
    }),
    { includeEndFrames: hasSupplementalSelected }
  )
  const beats = getSceneBeats(scene)

  if (options.selectedFrameKeys?.length) {
    const keySet = new Set(options.selectedFrameKeys)
    return allSlots
      .filter((slot) => keySet.has(slot.key))
      .map((slot) => slotToItem(slot, slot.beatIndex != null ? beats[slot.beatIndex] : undefined))
  }

  const genCtx = buildGenerationContext(options)

  return allSlots
    .filter((slot) => {
      const beat = slot.beatIndex != null ? beats[slot.beatIndex] : undefined
      if (!beat) return false
      if (slot.frameRole === 'action-start') {
        return beatActionStartFrameNeedsGeneration(beat, genCtx)
      }
      if (slot.frameRole === 'end') {
        return beatEndFrameNeedsGeneration(beat, genCtx)
      }
      return beatFrameNeedsGeneration(beat, genCtx)
    })
    .map((slot) => slotToItem(slot, slot.beatIndex != null ? beats[slot.beatIndex] : undefined))
}

/** Map SSE beatIndex + frameRole to the overlay item key. */
export function slotKeyFromBeat(
  scene: Record<string, unknown> | null | undefined,
  beatIndex: number,
  frameRole: 'start' | 'action-start' | 'end' = 'start'
): string {
  const beats = getSceneBeats(scene)
  const beat = beats[beatIndex]
  if (!beat?.beatId) return `${beatIndex}-${frameRole}`
  return beatFrameSlotKey(beat.beatId, frameRole)
}

export function countCompletedFrames(items: ExpressBeatFrameItem[]): number {
  return items.filter((item) => item.status === 'done').length
}

export function hasFrameErrors(items: ExpressBeatFrameItem[]): boolean {
  return items.some((item) => item.status === 'error')
}

export function hasUnsettledFrames(items: ExpressBeatFrameItem[]): boolean {
  return items.some((item) => item.status === 'pending' || item.status === 'running')
}

/** Wall-clock seconds per Vertex identity-ref job (prior before any frame completes). */
export const EXPRESS_IMAGE_ETA_PRIOR_SEC = 55

/** Overlay default; keep in sync with DEFAULT_EXPRESS_IMAGE_CONCURRENCY. */
export const EXPRESS_IMAGE_ETA_CONCURRENCY_DEFAULT = 2

export function estimateRemainingSec(params: {
  /** Image-phase elapsed only — not overlay time including direction/audio. */
  elapsedSec: number
  completedFrames: number
  totalFrames: number
  currentPhase: ExpressPhase | null
  imagePhaseStarted?: boolean
  concurrency?: number
}): number | null {
  const { elapsedSec, completedFrames, totalFrames, currentPhase, imagePhaseStarted } = params

  if (totalFrames === 0) return null

  const remaining = totalFrames - completedFrames
  if (remaining <= 0) return 0

  if (imagePhaseStarted || currentPhase === 'image') {
    const concurrency = Math.max(1, params.concurrency ?? EXPRESS_IMAGE_ETA_CONCURRENCY_DEFAULT)
    if (completedFrames >= 1 && elapsedSec > 0) {
      const secPerFrame = elapsedSec / completedFrames
      return Math.ceil(secPerFrame * remaining)
    }
    const priorWallSecPerFrame = EXPRESS_IMAGE_ETA_PRIOR_SEC / concurrency
    return Math.ceil(priorWallSecPerFrame * remaining)
  }

  return null
}

export function formatEta(seconds: number | null): string {
  if (seconds === null) return 'Estimating…'
  if (seconds <= 0) return 'Almost done'
  if (seconds < 60) return `~${seconds}s remaining`
  const mins = Math.ceil(seconds / 60)
  return `~${mins} min remaining`
}

export function failedExpressFrameKeys(items: ExpressBeatFrameItem[]): string[] {
  return items.filter((item) => item.status === 'error').map((item) => item.key)
}

export function updateBeatFrameItemStatus(
  items: ExpressBeatFrameItem[],
  key: string,
  status: ExpressBeatFrameStatus,
  error?: string,
  fallback?: { beatIndex?: number; frameRole?: 'start' | 'action-start' | 'end' }
): ExpressBeatFrameItem[] {
  const hasExactMatch = items.some((item) => item.key === key)
  return items.map((item) => {
    const matches = hasExactMatch
      ? item.key === key
      : fallback?.beatIndex !== undefined &&
        item.beatIndex === fallback.beatIndex &&
        item.frameRole === (fallback.frameRole ?? 'start')
    return matches ? { ...item, status, ...(error ? { error } : {}) } : item
  })
}
