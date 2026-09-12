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

/**
 * How much of the project a run covers.
 *
 * Scoping is a planning concern only: the worker, the job row and the browser
 * rehydration all behave identically on a shorter `payload.items`.
 */
export type ReferenceExpressScope = {
  /** 0-based scene indices. Omit to plan the whole project. */
  sceneIndices?: number[]
  /**
   * Narrow to single rows, as `kind:id` requirement keys from
   * `sceneReferenceRequirements` — a character id or name, or a library row id.
   * The planner still resolves item identity itself, so the worker never sees
   * a key the client invented.
   */
  itemKeys?: string[]
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

export { fingerprintSource } from '@/lib/utils/fingerprint'

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
