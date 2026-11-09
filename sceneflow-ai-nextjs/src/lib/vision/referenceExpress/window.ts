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
  Partial<Pick<ReferenceExpressItem, 'wardrobeId' | 'targetId' | 'parentTargetId'>>

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
 *
 * Location bases and set versions never share a window so a version is not
 * drawn against a base that has not persisted yet. Furthermore:
 * - A child sub-location base item (`parentTargetId`) never shares a window
 *   with its parent complex location base (`targetId === parentTargetId`), so
 *   the parent complex persists its `imageUrl` before the child anchors to it.
 * - Two set-version items (`versionId`) for the *same* location (`targetId`)
 *   never share a window, so Set Version 1 finishes and persists its `imageUrl`
 *   before Set Version 2 draws on top of Set Version 1.
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
  const seenLocationBaseTargetIds = new Set<string>()
  if (startIsBase && start.targetId) {
    seenLocationBaseTargetIds.add(start.targetId)
  }
  const seenLocationVersionTargetIds = new Set<string>()
  if (startIsVersion && start.targetId) {
    seenLocationVersionTargetIds.add(start.targetId)
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
    if (isLocationBaseItem(next)) {
      if (next.targetId && seenLocationBaseTargetIds.has(next.targetId)) break
      if (next.parentTargetId && seenLocationBaseTargetIds.has(next.parentTargetId)) break
      if (next.targetId) seenLocationBaseTargetIds.add(next.targetId)
    }
    if (isLocationVersionItem(next) && next.targetId) {
      if (seenLocationVersionTargetIds.has(next.targetId)) break
      seenLocationVersionTargetIds.add(next.targetId)
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
