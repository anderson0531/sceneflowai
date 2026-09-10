import type { ReferenceExpressItemResult } from '@/lib/vision/referenceExpress/types'

/**
 * How long a claimed step may run before another invocation may take it over.
 * Must exceed the worker route's maxDuration so a live step is never double-run.
 * Cast items generate, enhance and then vision-analyse a portrait, which the
 * character route already budgets 300s for — hence six minutes, not the three
 * that Audience Resonance chunks need.
 */
export const REFERENCE_EXPRESS_STEP_LEASE_MS = 6 * 60 * 1000

/** Attempts per item before it is recorded as failed and the batch moves on. */
export const DEFAULT_REFERENCE_EXPRESS_MAX_ATTEMPTS = 3

/** Backoff bounds between attempts on the same item. */
export const REFERENCE_EXPRESS_BACKOFF_MS = 4000
export const REFERENCE_EXPRESS_MAX_BACKOFF_MS = 60_000

export function getReferenceExpressMaxAttempts(): number {
  const raw = Number(
    process.env.REFERENCE_EXPRESS_MAX_ATTEMPTS ??
      DEFAULT_REFERENCE_EXPRESS_MAX_ATTEMPTS
  )
  return Number.isFinite(raw) && raw >= 1
    ? Math.floor(raw)
    : DEFAULT_REFERENCE_EXPRESS_MAX_ATTEMPTS
}

/**
 * Intermediate state on `generation_jobs.payload._worker` between invocations.
 *
 * Retries live here rather than inside a single item's execution: one cast
 * image can already consume most of a function's budget, so a rate limit is
 * better handled by deferring the item to a fresh isolate than by sleeping
 * inside the current one and being killed mid-retry.
 */
export type ReferenceExpressWorkerState = {
  /** Index into `payload.items` of the item still to be done. */
  cursor: number
  /** Attempts already spent on `items[cursor]`. */
  attempt: number
  /** ISO timestamp before which the next attempt should not start. */
  nextAttemptAt?: string | null
  /** Outcomes for items already resolved. */
  results: ReferenceExpressItemResult[]
  /** ISO timestamp of the invocation currently executing this item. */
  inFlightAt?: string | null
}

export function readReferenceExpressWorkerState(
  payload: Record<string, unknown>
): ReferenceExpressWorkerState | null {
  const worker = payload._worker
  if (!worker || typeof worker !== 'object') return null
  const state = worker as Partial<ReferenceExpressWorkerState>
  if (typeof state.cursor !== 'number') return null
  return {
    cursor: state.cursor,
    attempt: typeof state.attempt === 'number' ? state.attempt : 0,
    nextAttemptAt: state.nextAttemptAt ?? null,
    results: Array.isArray(state.results) ? state.results : [],
    inFlightAt: state.inFlightAt ?? null,
  }
}

/** True when another invocation holds an unexpired lease on this item. */
export function isReferenceExpressLeaseHeld(
  worker: ReferenceExpressWorkerState,
  now = Date.now()
): boolean {
  if (!worker.inFlightAt) return false
  const started = new Date(worker.inFlightAt).getTime()
  if (!Number.isFinite(started)) return false
  return now - started < REFERENCE_EXPRESS_STEP_LEASE_MS
}

/** Milliseconds until the current item may be attempted again. */
export function millisUntilNextAttempt(
  worker: ReferenceExpressWorkerState,
  now = Date.now()
): number {
  if (!worker.nextAttemptAt) return 0
  const readyAt = new Date(worker.nextAttemptAt).getTime()
  if (!Number.isFinite(readyAt)) return 0
  return Math.max(0, readyAt - now)
}
