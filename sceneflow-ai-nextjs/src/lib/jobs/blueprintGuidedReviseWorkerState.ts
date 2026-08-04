import type { BlueprintChangePlan } from '@/lib/treatment/blueprintRevisionTypes'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'

/** Intermediate state persisted on generation_jobs.payload._worker between step invocations. */
export type BlueprintGuidedReviseWorkerState = {
  phase: 'rewrite-all' | 'rewrite' | 'finalize'
  plan: BlueprintChangePlan
  sections: BlueprintFixSection[]
  sectionIndex?: number
  mergedPatch?: Record<string, unknown>
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
