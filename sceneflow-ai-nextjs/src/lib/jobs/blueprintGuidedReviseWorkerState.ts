import type { BlueprintChangePlan } from '@/lib/treatment/blueprintRevisionTypes'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'

/**
 * How long a claimed step may run before another invocation may take it over.
 * Must exceed the worker route maxDuration so a live step is never double-run.
 */
export const STEP_LEASE_MS = 3 * 60 * 1000

/** Intermediate state persisted on generation_jobs.payload._worker between step invocations. */
export type BlueprintGuidedReviseWorkerState = {
  phase: 'rewrite-all' | 'rewrite' | 'finalize'
  plan: BlueprintChangePlan
  sections: BlueprintFixSection[]
  sectionIndex?: number
  mergedPatch?: Record<string, unknown>
  /** ISO timestamp of the invocation currently executing this phase. */
  inFlightAt?: string | null
}

export function readWorkerState(
  payload: Record<string, unknown>
): BlueprintGuidedReviseWorkerState | null {
  const worker = payload._worker
  if (!worker || typeof worker !== 'object') return null
  return worker as BlueprintGuidedReviseWorkerState
}

export function writeWorkerState(
  payload: Record<string, unknown>,
  worker: BlueprintGuidedReviseWorkerState
): Record<string, unknown> {
  return { ...payload, _worker: worker }
}

/** True when another invocation holds an unexpired lease on this phase. */
export function isStepLeaseHeld(
  worker: BlueprintGuidedReviseWorkerState,
  now = Date.now()
): boolean {
  if (!worker.inFlightAt) return false
  const started = new Date(worker.inFlightAt).getTime()
  if (!Number.isFinite(started)) return false
  return now - started < STEP_LEASE_MS
}
