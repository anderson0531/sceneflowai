/**
 * Reference Express batch shapes.
 *
 * Items are planned server-side at enqueue and stored on
 * `generation_jobs.payload.items`, so a run survives a cold start, a missing
 * Inngest key, and a browser refresh.
 */

export type ReferenceExpressKind = 'cast' | 'location' | 'prop'

/** One unit of work: exactly one reference image. */
export type ReferenceExpressItem = {
  kind: ReferenceExpressKind
  /** Id of the target character or reference within `visionPhase`. */
  targetId: string
  /** Display label for progress copy. */
  label: string
  /**
   * Digest of the fields that drive this item's prompt, taken at enqueue.
   * Re-derived at persist time: a mismatch means the user edited the source
   * while the batch ran, which is reported rather than treated as an error.
   */
  sourceFingerprint: string
}

export type ReferenceExpressItemResult = {
  kind: ReferenceExpressKind
  targetId: string
  label: string
  status: 'succeeded' | 'failed' | 'skipped'
  imageUrl?: string
  error?: string
  /** Why the item was left alone (target deleted, or already filled by hand). */
  skippedReason?: 'missing' | 'already-generated'
  /**
   * The prompt source was edited between this image being generated and being
   * saved, so the image may not match the text the user now sees.
   */
  staleSource?: boolean
}

/** Aggregate written to `generation_jobs.result` when the run finishes. */
export type ReferenceExpressResult = {
  total: number
  succeeded: number
  failed: number
  skipped: number
  staleCount: number
  items: ReferenceExpressItemResult[]
  dispatch?: 'inngest' | 'step_worker'
}

/**
 * Order-independent digest of the prompt inputs for one item.
 *
 * FNV-1a rather than node `crypto` so the same helper runs in tests and in any
 * future client-side preview without pulling a node builtin into the bundle.
 */
export function fingerprintSource(parts: Array<string | undefined | null>): string {
  const normalized = parts
    .map((part) => (part ?? '').replace(/\s+/g, ' ').trim().toLowerCase())
    .join('\u0000')

  let hash = 0x811c9dc5
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function summarizeItemResults(
  items: ReferenceExpressItemResult[]
): Omit<ReferenceExpressResult, 'items' | 'dispatch'> {
  return {
    total: items.length,
    succeeded: items.filter((item) => item.status === 'succeeded').length,
    failed: items.filter((item) => item.status === 'failed').length,
    skipped: items.filter((item) => item.status === 'skipped').length,
    staleCount: items.filter((item) => item.staleSource).length,
  }
}
