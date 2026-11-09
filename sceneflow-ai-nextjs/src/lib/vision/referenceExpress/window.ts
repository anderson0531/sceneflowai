/**
 * How the worker groups items into steps.
 *
 * Lives here rather than beside the worker because the pre-commit estimate has
 * to quote the same grouping: a run that says "~8 min" and takes four is a
 * worse promise than no promise. Type-only imports keep this client-safe.
 */

import type { ReferenceExpressItem } from './types'

/**
 * How many reference images (wardrobe full-body stills, locations, or props)
 * a single step may draw at once.
 *
 * Raised to 6 for higher Vertex/Gemini quotas; cast identity portraits still
 * run in their own step because they perform two designer-tier generations
 * plus a vision pass and must land before any wardrobe stills for that cast member.
 * Raisable via `REFERENCE_EXPRESS_CONCURRENCY`.
 */
export const DEFAULT_REFERENCE_EXPRESS_CONCURRENCY = 6

export type ReferenceExpressWindowItem = Pick<ReferenceExpressItem, 'kind' | 'versionId'> &
  Partial<Pick<ReferenceExpressItem, 'wardrobeId' | 'targetId'>>

function isCastIdentityItem(item: ReferenceExpressWindowItem): boolean {
  return item.kind === 'cast' && !item.wardrobeId
}

function isCastWardrobeItem(item: ReferenceExpressWindowItem): boolean {
  return item.kind === 'cast' && !!item.wardrobeId
}

function isLocationBaseItem(item: ReferenceExpressWindowItem): boolean {
  return item.kind === 'location' && !item.versionId
}

function isLocationVersionItem(item: ReferenceExpressWindowItem): boolean {
  return item.kind === 'location' && !!item.versionId
}

/**
 * The run of items a step starting at `cursor` should take.
 *
 * A cast identity portrait is always alone: it costs two designer-tier
 * generations plus a vision pass, and must persist before any wardrobe stills.
 * Cast wardrobe full-body items batch concurrently up to the concurrency cap,
 * except two wardrobe items for the *same* character (`targetId`) never share
 * a window so the character's base/preceding wardrobe finishes and persists its
 * `fullBodyUrl` before a transition wardrobe for that character draws.
 * Location bases and set versions also never share a window so a version is not
 * drawn against a base that has not persisted yet.
 */
export function resolveReferenceExpressWindow(
  items: ReferenceExpressWindowItem[],
  cursor: number,
  concurrency: number = DEFAULT_REFERENCE_EXPRESS_CONCURRENCY
): number {
  if (cursor < 0 || cursor >= items.length) return 0
  const start = items[cursor]!
  if (isCastIdentityItem(start)) return 1

  const startIsBase = isLocationBaseItem(start)
  const startIsVersion = isLocationVersionItem(start)
  const seenWardrobeTargetIds = new Set<string>()
  if (isCastWardrobeItem(start) && start.targetId) {
    seenWardrobeTargetIds.add(start.targetId)
  }

  let size = 1
  while (
    size < concurrency &&
    cursor + size < items.length &&
    !isCastIdentityItem(items[cursor + size]!)
  ) {
    const next = items[cursor + size]!
    if (startIsBase && isLocationVersionItem(next)) break
    if (startIsVersion && isLocationBaseItem(next)) break
    if (isCastWardrobeItem(next) && next.targetId) {
      if (seenWardrobeTargetIds.has(next.targetId)) break
      seenWardrobeTargetIds.add(next.targetId)
    }
    size += 1
  }
  return size
}

/** Walk the items the way the worker will, one window at a time. */
export function forEachReferenceExpressWindow<T extends ReferenceExpressWindowItem>(
  items: T[],
  concurrency: number,
  visit: (window: T[]) => void
): void {
  let cursor = 0
  while (cursor < items.length) {
    const size = resolveReferenceExpressWindow(items, cursor, concurrency)
    if (size <= 0) return
    visit(items.slice(cursor, cursor + size))
    cursor += size
  }
}
