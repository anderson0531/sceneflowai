/**
 * Veo 3.1 continuous beat planning: initial clip (4–8s) + chained extensions (+7s each).
 *
 * Gemini API: extension requires durationSeconds=8, 720p, Veo-generated sourceVideo ref.
 * Planning values 10/12 in veoDuration.ts are not used on the EXT path.
 */

import {
  estimateSpokenDurationSeconds,
  planDialogueLineSplits,
  splitSpokenTextAtBoundaries,
  VEO_DIALOGUE_CLIP_MAX_SEC,
} from '@/lib/scene/dialogueSegmentSplit'
import { snapToVeoDuration } from '@/lib/scene/veoDuration'

/** Seconds added to timeline per Veo extension API call. */
export const VEO_EXTENSION_DELTA_SEC = 7

/** Max initial generation length for extension-first dialogue chains. */
export const VEO_INITIAL_CLIP_MAX_SEC = 8

/**
 * Spoken dialogue budget per initial clip before chaining EXT steps.
 * Split/planning uses 6s; Gemini EXT API still sends 8s per call (+7s timeline each).
 */
export const VEO_SPOKEN_CHUNK_SEC = 6

/** Max chained extensions per beat (Gemini API limit ~20). */
export const VEO_MAX_EXTENSIONS_PER_BEAT = 20

export type VeoChainPartMethod = 'I2V' | 'FTV' | 'EXT'

export interface VeoChainPartPlan {
  partIndex: number
  partCount: number
  excerpt: string
  method: VeoChainPartMethod
  /** Requested duration for API (8 for EXT per Gemini requirement). */
  requestedDurationSeconds: 4 | 6 | 8
  /** Timeline contribution for segment startTime/endTime. */
  timelineSeconds: number
  chainMethod: 'initial' | 'extension'
  extensionStep?: number
  estimatedSpokenSeconds: number
}

export interface VeoExtensionChainPlan {
  parts: VeoChainPartPlan[]
  totalVideoSeconds: number
  totalSpokenSeconds: number
  extensionCount: number
  usesExtensionChain: boolean
}

export function extensionCountForSpokenSeconds(spokenSeconds: number): number {
  const spoken = Math.max(0, spokenSeconds)
  if (spoken <= VEO_SPOKEN_CHUNK_SEC) return 0
  return Math.min(
    VEO_MAX_EXTENSIONS_PER_BEAT,
    Math.ceil((spoken - VEO_SPOKEN_CHUNK_SEC) / VEO_EXTENSION_DELTA_SEC)
  )
}

export function totalVideoSecondsForChain(
  initialSeconds: number,
  extensionCount: number
): number {
  const initial = snapToVeoDuration(Math.min(initialSeconds, VEO_SPOKEN_CHUNK_SEC))
  return initial + extensionCount * VEO_EXTENSION_DELTA_SEC
}

/**
 * Map spoken excerpts to extension chain parts (initial + N extensions).
 */
export function planVeoExtensionChain(
  spokenSeconds: number,
  excerptParts?: string[],
  options?: { preferFtv?: boolean }
): VeoExtensionChainPlan {
  const totalSpoken = Math.max(0, spokenSeconds)
  const extCount = extensionCountForSpokenSeconds(totalSpoken)
  const usesExtensionChain = extCount > 0

  const initialTimeline = snapToVeoDuration(
    Math.min(totalSpoken, VEO_SPOKEN_CHUNK_SEC)
  ) as 4 | 6 | 8
  const initialMethod: VeoChainPartMethod = options?.preferFtv ? 'FTV' : 'I2V'

  if (!usesExtensionChain) {
    const excerpt = excerptParts?.[0]?.trim() ?? ''
    return {
      parts: [
        {
          partIndex: 0,
          partCount: 1,
          excerpt,
          method: initialMethod,
          requestedDurationSeconds: initialTimeline,
          timelineSeconds: initialTimeline,
          chainMethod: 'initial',
          estimatedSpokenSeconds: totalSpoken,
        },
      ],
      totalVideoSeconds: initialTimeline,
      totalSpokenSeconds: totalSpoken,
      extensionCount: 0,
      usesExtensionChain: false,
    }
  }

  const excerpts =
    excerptParts && excerptParts.length > 0
      ? excerptParts
      : ['']

  const partCount = 1 + extCount
  const parts: VeoChainPartPlan[] = []

  parts.push({
    partIndex: 0,
    partCount,
    excerpt: excerpts[0] ?? '',
    method: initialMethod,
    requestedDurationSeconds: 8,
    timelineSeconds: initialTimeline,
    chainMethod: 'initial',
    estimatedSpokenSeconds: estimateSpokenDurationSeconds(excerpts[0] ?? ''),
  })

  for (let i = 0; i < extCount; i++) {
    const excerptIndex = Math.min(i + 1, excerpts.length - 1)
    const excerpt = excerpts[excerptIndex] ?? excerpts[excerpts.length - 1] ?? ''
    parts.push({
      partIndex: i + 1,
      partCount,
      excerpt,
      method: 'EXT',
      requestedDurationSeconds: 8,
      timelineSeconds: VEO_EXTENSION_DELTA_SEC,
      chainMethod: 'extension',
      extensionStep: i + 1,
      estimatedSpokenSeconds: estimateSpokenDurationSeconds(excerpt),
    })
  }

  return {
    parts,
    totalVideoSeconds: totalVideoSecondsForChain(initialTimeline, extCount),
    totalSpokenSeconds: totalSpoken,
    extensionCount: extCount,
    usesExtensionChain: true,
  }
}

/**
 * Plan dialogue line with text splits + extension chain (preferred for long lines).
 */
export function planContinuousDialogueBeat(
  fullText: string,
  options?: {
    preferFtv?: boolean
    maxSecondsPerExcerpt?: number
    spokenSeconds?: number
  }
): VeoExtensionChainPlan {
  const maxSec = options?.maxSecondsPerExcerpt ?? VEO_SPOKEN_CHUNK_SEC
  const spoken =
    typeof options?.spokenSeconds === 'number' && options.spokenSeconds > 0
      ? options.spokenSeconds
      : estimateSpokenDurationSeconds(fullText)
  const splitParts = planDialogueLineSplits(fullText, maxSec)

  if (spoken <= VEO_SPOKEN_CHUNK_SEC && splitParts.length <= 1) {
    return planVeoExtensionChain(spoken, [splitParts[0]?.excerpt ?? fullText], options)
  }

  const extCount = extensionCountForSpokenSeconds(spoken)
  if (extCount === 0) {
    return planVeoExtensionChain(spoken, [splitParts[0]?.excerpt ?? fullText], options)
  }

  const targetParts = 1 + extCount
  let excerpts = splitParts.map((p) => p.excerpt)
  if (excerpts.length < targetParts) {
    const extra = splitSpokenTextAtBoundaries(fullText, maxSec)
    excerpts = extra.length >= targetParts ? extra : excerpts
  }
  while (excerpts.length < targetParts && excerpts.length > 0) {
    excerpts.push(excerpts[excerpts.length - 1])
  }
  if (excerpts.length > targetParts) {
    const head = excerpts.slice(0, targetParts - 1)
    const tail = excerpts.slice(targetParts - 1).join(' ')
    excerpts = [...head, tail]
  }

  return planVeoExtensionChain(spoken, excerpts, options)
}

/** Whether spoken beat should use extension chain (auto-split). */
export function shouldAutoSplitForExtensionChain(
  line: string,
  durationSeconds?: number
): boolean {
  const spoken =
    typeof durationSeconds === 'number' && durationSeconds > 0
      ? durationSeconds
      : estimateSpokenDurationSeconds(line)
  return spoken > VEO_DIALOGUE_CLIP_MAX_SEC || spoken > VEO_SPOKEN_CHUNK_SEC
}
