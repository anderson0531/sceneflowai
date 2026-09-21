/**
 * Process-wide cap on concurrent Vertex image generations.
 *
 * `ExpressTrafficCop` caps a lane within one `runExpress` invocation, which is
 * the only scope it can see. Two overlapping Frame Agent runs build two cops
 * and each honors its own cap, so the pair issues twice the intended number of
 * calls; a manual frame regen goes straight to `/api/scene/generate-image` and
 * is counted by neither. The observable result is a run that reports a cap of
 * two while more than twice that many generations are open.
 *
 * Every Vertex image generation in the process funnels through
 * `generateVertexGeminiImage`, so gating there is what makes the cap true
 * rather than advisory. `/api/scene/generate-image` also takes a sibling
 * admission lock so overlapping HTTP stills cannot exceed the same cap.
 *
 * Deliberately not a replacement for the traffic cop. This is a hard ceiling
 * and nothing more — the cop still owns AIMD halving, cooldowns, the regulator,
 * and the throttle events the UI renders. Deliberately not distributed either:
 * one process is the boundary. Concurrent serverless instances still have no
 * shared view, which needs Redis and is recorded as such in
 * docs/VERTEX_CAPACITY.md.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Concurrent generations allowed per process.
 *
 * Two, matching the Express image lane. The gate and the lane agreeing
 * is the point: a single well-behaved run should never queue here, so the
 * gate only bites when something the cop cannot see is also generating.
 */
export const DEFAULT_VERTEX_IMAGE_MAX_CONCURRENCY = 2

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

/** Set 0 to disable the gate entirely. */
export function getVertexImageMaxConcurrency(): number {
  return parseNonNegativeInt(
    process.env.VERTEX_IMAGE_MAX_CONCURRENCY,
    DEFAULT_VERTEX_IMAGE_MAX_CONCURRENCY
  )
}

export interface VertexImageGateSnapshot {
  inFlight: number
  peakInFlight: number
  waiting: number
  max: number
  /** Generations that had to wait for a slot since process start. */
  queuedTotal: number
}

function createLimitGate(label: string) {
  let inFlight = 0
  let peakInFlight = 0
  let queuedTotal = 0
  const waiters: Array<() => void> = []
  const held = new AsyncLocalStorage<true>()

  function snapshot(): VertexImageGateSnapshot {
    return {
      inFlight,
      peakInFlight,
      waiting: waiters.length,
      max: getVertexImageMaxConcurrency(),
      queuedTotal,
    }
  }

  function reset(): void {
    inFlight = 0
    peakInFlight = 0
    queuedTotal = 0
    waiters.length = 0
  }

  /**
   * Hold a slot for the duration of `fn`. Nested acquires in the same async
   * context are no-ops so fail-fast can wrap a whole generateVertexGeminiImage
   * attempt (including IMAGE_SAFETY re-entry) without deadlocking on the
   * fetch-level wrap.
   */
  async function run<T>(fn: () => Promise<T>): Promise<T> {
    if (held.getStore()) return fn()

    const max = getVertexImageMaxConcurrency()
    if (max <= 0) return fn()

    while (inFlight >= max) {
      queuedTotal++
      await new Promise<void>((resolve) => {
        waiters.push(resolve)
      })
    }

    inFlight++
    if (inFlight > peakInFlight) peakInFlight = inFlight
    if (inFlight >= max || waiters.length > 0) {
      console.log(
        `[${label}] ${inFlight}/${max} generating, ${waiters.length} queued (peak ${peakInFlight})`
      )
    }

    try {
      return await held.run(true, fn)
    } finally {
      inFlight = Math.max(0, inFlight - 1)
      waiters.shift()?.()
    }
  }

  return { run, snapshot, reset }
}

const vertexImageGate = createLimitGate('Vertex Image Gate')
const sceneImageAdmission = createLimitGate('Scene Image Admission')

export function getVertexImageGateSnapshot(): VertexImageGateSnapshot {
  return vertexImageGate.snapshot()
}

/** Test-only. Module state is process-wide by design. */
export function resetVertexImageGateForTests(): void {
  vertexImageGate.reset()
  sceneImageAdmission.reset()
}

export function getSceneImageAdmissionSnapshot(): VertexImageGateSnapshot {
  return sceneImageAdmission.snapshot()
}

export function resetSceneImageAdmissionForTests(): void {
  sceneImageAdmission.reset()
}

/**
 * Process-wide Vertex generateContent cap. Fail-fast callers hold this for the
 * whole attempt; non-fail-fast callers keep wrapping the outbound fetch only
 * so backoff sleeps do not occupy a slot.
 */
export async function runInVertexImageGate<T>(fn: () => Promise<T>): Promise<T> {
  return vertexImageGate.run(fn)
}

/**
 * Sibling of the Vertex fetch gate: admits `/api/scene/generate-image`
 * requests so overlapping Frame Agent / Regen / Direct Frame stills in the
 * same Node process cannot exceed the process cap. Must not wrap a call that
 * already holds this lock — it is a different ALS from the Vertex gate, so
 * generateVertexGeminiImage can acquire the fetch gate while the route holds
 * admission.
 */
export async function runInSceneImageAdmission<T>(fn: () => Promise<T>): Promise<T> {
  return sceneImageAdmission.run(fn)
}
