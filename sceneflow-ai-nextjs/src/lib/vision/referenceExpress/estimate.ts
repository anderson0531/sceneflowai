/**
 * What a Reference Express run will cost, in time and credits.
 *
 * The scene card has to say this *before* the user commits — "4 items, ~3 min,
 * 45 credits" is the difference between just-in-time generation and an
 * open-ended wait. The route quotes the same numbers back when it queues the
 * job, so both must come from here: a client estimate that disagrees with the
 * server's charge is worse than no estimate.
 *
 * Client-safe — `creditCosts` and `window` are constants and pure functions.
 */

import { getCreditCost, IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import {
  DEFAULT_REFERENCE_EXPRESS_CONCURRENCY,
  forEachReferenceExpressWindow,
} from './window'
import type { ReferenceExpressItem, ReferenceExpressKind } from './types'

/** Cast costs two designer-tier generations plus a vision pass, hence the gap. */
export const SECONDS_PER_ITEM: Record<ReferenceExpressKind, number> = {
  cast: 90,
  location: 30,
  prop: 30,
}

export const CAST_ITEM_CREDITS = IMAGE_CREDITS.CHARACTER_IDENTITY_WITH_ENHANCE

export type ReferenceExpressEstimate = {
  itemCount: number
  seconds: number
  credits: number
}

const creditsForKind = (kind: ReferenceExpressKind): number =>
  kind === 'cast' ? CAST_ITEM_CREDITS : getCreditCost('IMAGE_GENERATION')

/**
 * Walks the items the way the worker will: cast portraits one at a time, and
 * locations and props in windows that cost as much as their slowest member.
 * Quoting a serial sum here would over-promise the wait by roughly half on a
 * prop-heavy library, which is exactly the number the user decides on.
 */
export function estimateReferenceExpressSeconds(
  items: Array<Pick<ReferenceExpressItem, 'kind'>>,
  concurrency: number = DEFAULT_REFERENCE_EXPRESS_CONCURRENCY
): number {
  let total = 0
  forEachReferenceExpressWindow(items, concurrency, (window) => {
    total += Math.max(...window.map((item) => SECONDS_PER_ITEM[item.kind]))
  })
  return total
}

export function estimateReferenceExpressCredits(
  items: Array<Pick<ReferenceExpressItem, 'kind'>>
): number {
  return items.reduce((total, item) => total + creditsForKind(item.kind), 0)
}

export function estimateReferenceExpress(
  items: Array<Pick<ReferenceExpressItem, 'kind'>>
): ReferenceExpressEstimate {
  return {
    itemCount: items.length,
    seconds: estimateReferenceExpressSeconds(items),
    credits: estimateReferenceExpressCredits(items),
  }
}

/** "~3 min" / "~45 sec" — a duration the user can decide against. */
export function formatEstimatedDuration(seconds: number): string {
  if (seconds <= 0) return '0 sec'
  if (seconds < 90) return `~${Math.round(seconds)} sec`
  return `~${Math.round(seconds / 60)} min`
}

/** "4 items, ~3 min, 45 credits" — the whole commitment in one line. */
export function formatReferenceExpressEstimate(estimate: ReferenceExpressEstimate): string {
  const items = `${estimate.itemCount} item${estimate.itemCount === 1 ? '' : 's'}`
  return `${items}, ${formatEstimatedDuration(estimate.seconds)}, ${estimate.credits} credits`
}
