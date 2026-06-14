import { getSceneBeats } from '@/lib/script/beatMigration'
import type { ExpressPhase } from '@/lib/sceneGeneration/types'
import {
  enumerateStoryboardFrameSlots,
  filterStoryboardSlotsForExpressChecklist,
  type StoryboardFrameSlot,
} from '@/lib/storyboard/types'
import {
  beatEndFrameNeedsGeneration,
  beatFrameNeedsGeneration,
  type BeatFrameGenerationContext,
} from '@/lib/storyboard/storyboardQuality'

export type ExpressBeatFrameStatus = 'pending' | 'running' | 'done' | 'error'

export interface ExpressBeatFrameItem {
  key: string
  label: string
  beatIndex: number
  frameRole: 'start' | 'end'
  status: ExpressBeatFrameStatus
  error?: string
}

export interface BuildExpressBeatFrameItemsOptions {
  selectedFrameKeys?: string[]
  includeEndFrames?: boolean
  scope?: 'missing' | 'selected'
  finalizeOnly?: boolean
  storyboardQuality?: 'draft' | 'final'
}

function slotToItem(slot: StoryboardFrameSlot): ExpressBeatFrameItem {
  return {
    key: slot.key,
    label: slot.label,
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
  const allSlots = filterStoryboardSlotsForExpressChecklist(
    enumerateStoryboardFrameSlots(scene),
    { includeEndFrames: options.includeEndFrames }
  )

  if (options.selectedFrameKeys?.length) {
    const keySet = new Set(options.selectedFrameKeys)
    return allSlots.filter((slot) => keySet.has(slot.key)).map(slotToItem)
  }

  const genCtx = buildGenerationContext(options)
  const beats = getSceneBeats(scene)

  return allSlots
    .filter((slot) => {
      const beat = slot.beatIndex != null ? beats[slot.beatIndex] : undefined
      if (!beat) return false
      if (slot.frameRole === 'end') {
        return beatEndFrameNeedsGeneration(beat, genCtx)
      }
      return beatFrameNeedsGeneration(beat, genCtx)
    })
    .map(slotToItem)
}

/** Map SSE beatIndex + frameRole to the overlay item key. */
export function slotKeyFromBeat(
  scene: Record<string, unknown> | null | undefined,
  beatIndex: number,
  frameRole: 'start' | 'end' = 'start'
): string {
  const beats = getSceneBeats(scene)
  const beat = beats[beatIndex]
  if (!beat?.beatId) return `${beatIndex}-${frameRole}`
  return frameRole === 'end' ? `${beat.beatId}-end` : beat.beatId
}

export function countCompletedFrames(items: ExpressBeatFrameItem[]): number {
  return items.filter((item) => item.status === 'done').length
}

export function hasFrameErrors(items: ExpressBeatFrameItem[]): boolean {
  return items.some((item) => item.status === 'error')
}

export function estimateRemainingSec(params: {
  elapsedSec: number
  completedFrames: number
  totalFrames: number
  currentPhase: ExpressPhase | null
  imagePhaseStarted?: boolean
}): number | null {
  const { elapsedSec, completedFrames, totalFrames, currentPhase, imagePhaseStarted } = params

  if (totalFrames === 0) return null

  const remaining = totalFrames - completedFrames
  if (remaining <= 0) return 0

  if (imagePhaseStarted || currentPhase === 'image') {
    if (completedFrames >= 1) {
      const secPerFrame = elapsedSec / completedFrames
      return Math.ceil(secPerFrame * remaining)
    }
    return Math.ceil(8 * remaining)
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

export function updateBeatFrameItemStatus(
  items: ExpressBeatFrameItem[],
  key: string,
  status: ExpressBeatFrameStatus,
  error?: string
): ExpressBeatFrameItem[] {
  return items.map((item) =>
    item.key === key ? { ...item, status, ...(error ? { error } : {}) } : item
  )
}
