/**
 * How the worker groups items into steps.
 *
 * Lives here rather than beside the worker because the pre-commit estimate has
 * to quote the same grouping: a run that says "~8 min" and takes four is a
 * worse promise than no promise. Type-only imports keep this client-safe.
 */

import type { ReferenceExpressItem } from './types'

/**
 * How many location or prop images a single step may draw at once.
 *
 * Two, because the 429 bursts that made this worker serial come from the
 * identity-reference lane that cast portraits use; a location or a prop is one
 * plain image call. Kept low so the default is barely a change from serial,
 * and raisable via `REFERENCE_EXPRESS_CONCURRENCY` on dedicated quota.
 */
export const DEFAULT_REFERENCE_EXPRESS_CONCURRENCY = 2

function isLocationBaseItem(item: Pick<ReferenceExpressItem, 'kind' | 'versionId'>): boolean {
  return item.kind === 'location' && !item.versionId
}

function isLocationVersionItem(item: Pick<ReferenceExpressItem, 'kind' | 'versionId'>): boolean {
  return item.kind === 'location' && !!item.versionId
}

/**
 * The run of items a step starting at `cursor` should take.
 *
 * A cast item is always alone: it costs two designer-tier generations plus a
 * vision pass, so pairing it with anything risks the step's time budget as well
 * as the identity lane's quota. Location bases and set versions never share a
 * window, so a version is not drawn against a base that has not persisted yet.
 * Everything else batches up to the concurrency cap, stopping at the next cast
 * item so a window is never mixed with portraits.
 */
export function resolveReferenceExpressWindow(
  items: Array<Pick<ReferenceExpressItem, 'kind' | 'versionId'>>,
  cursor: number,
  concurrency: number = DEFAULT_REFERENCE_EXPRESS_CONCURRENCY
): number {
  if (cursor < 0 || cursor >= items.length) return 0
  if (items[cursor]!.kind === 'cast') return 1

  const start = items[cursor]!
  const startIsBase = isLocationBaseItem(start)
  const startIsVersion = isLocationVersionItem(start)

  let size = 1
  while (
    size < concurrency &&
    cursor + size < items.length &&
    items[cursor + size]!.kind !== 'cast'
  ) {
    const next = items[cursor + size]!
    if (startIsBase && isLocationVersionItem(next)) break
    if (startIsVersion && isLocationBaseItem(next)) break
    size += 1
  }
  return size
}

/** Walk the items the way the worker will, one window at a time. */
export function forEachReferenceExpressWindow<
  T extends Pick<ReferenceExpressItem, 'kind' | 'versionId'>,
>(
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
