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
 * rather than advisory.
 *
 * Deliberately not a replacement for the traffic cop. This is a hard ceiling
 * and nothing more — the cop still owns AIMD halving, cooldowns, the regulator,
 * and the throttle events the UI renders. Deliberately not distributed either:
 * one process is the boundary. Concurrent serverless instances still have no
 * shared view, which needs Redis and is recorded as such in
 * docs/VERTEX_CAPACITY.md.
 */

/**
 * Concurrent generations allowed per process.
 *
 * Two, matching the Express flash image lane. The gate and the lane agreeing
 * is the point: a single run should never queue here, so the gate only bites
 * when something the cop cannot see is also generating.
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

let inFlight = 0
let peakInFlight = 0
let queuedTotal = 0
/** FIFO. A frame that has already waited is not made to wait again. */
const waiters: Array<() => void> = []

export interface VertexImageGateSnapshot {
  inFlight: number
  peakInFlight: number
  waiting: number
  max: number
  /** Generations that had to wait for a slot since process start. */
  queuedTotal: number
}

export function getVertexImageGateSnapshot(): VertexImageGateSnapshot {
  return {
    inFlight,
    peakInFlight,
    waiting: waiters.length,
    max: getVertexImageMaxConcurrency(),
    queuedTotal,
  }
}

/** Test-only. Module state is process-wide by design. */
export function resetVertexImageGateForTests(): void {
  inFlight = 0
  peakInFlight = 0
  queuedTotal = 0
  waiters.length = 0
}

/**
 * Hold a slot for the duration of `fn`.
 *
 * Must wrap the outbound request only, never a whole retry ladder.
 * `generateVertexGeminiImage` calls itself to retry — including paths that
 * reset the attempt counter — so a slot held across a retry would be waited on
 * by the very call that holds it. Keeping backoff sleeps outside the gate is
 * also the behavior we want: a frame waiting out a 429 is not generating, and
 * should not be occupying capacity that a ready frame could use.
 */
export async function runInVertexImageGate<T>(fn: () => Promise<T>): Promise<T> {
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
      `[Vertex Image Gate] ${inFlight}/${max} generating, ${waiters.length} queued (peak ${peakInFlight})`
    )
  }

  try {
    return await fn()
  } finally {
    inFlight = Math.max(0, inFlight - 1)
    waiters.shift()?.()
  }
}
