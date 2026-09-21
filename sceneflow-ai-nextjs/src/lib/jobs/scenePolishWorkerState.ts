import type { ScenePolishAnalysis } from '@/lib/script/scenePolish/types'

/**
 * How long a claimed polish step may run before another invocation may take it
 * over. Must exceed the worker route maxDuration (180s).
 */
export const POLISH_STEP_LEASE_MS = 4 * 60 * 1000

export type ScenePolishWorkerState = {
  phase: 'analyze' | 'persist'
  inFlightAt?: string | null
  analysis?: ScenePolishAnalysis
}

export function readPolishWorkerState(
  payload: Record<string, unknown>
): ScenePolishWorkerState | null {
  const worker = payload._worker
  if (!worker || typeof worker !== 'object') return null
  return worker as ScenePolishWorkerState
}

export function writePolishWorkerState(
  payload: Record<string, unknown>,
  worker: ScenePolishWorkerState
): Record<string, unknown> {
  return { ...payload, _worker: worker }
}

export function isPolishStepLeaseHeld(
  worker: ScenePolishWorkerState,
  now = Date.now()
): boolean {
  if (!worker.inFlightAt) return false
  const started = new Date(worker.inFlightAt).getTime()
  if (!Number.isFinite(started)) return false
  return now - started < POLISH_STEP_LEASE_MS
}
