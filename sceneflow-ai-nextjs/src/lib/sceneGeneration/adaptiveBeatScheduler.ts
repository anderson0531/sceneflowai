/**
 * Adaptive (AIMD) beat image pool for Scene Express.
 *
 * Runs beat indices with a dynamic concurrency target: multiplicative decrease
 * on retryable failures, additive increase after a success streak, per-beat
 * exponential backoff retries.
 */

import { calculateBackoffDelay, isRetryableError, sleep } from '../utils/retry'
import { createFrameAgentCancelledError } from './expressImageErrors'

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

/**
 * Hard cap for Frame Agent stills. The pool pins initial = max to this so
 * up to six stills render concurrently across a 20-30 shot scene.
 */
export const FRAME_AGENT_STILL_CONCURRENCY = 6

/** Runtime beat concurrency for Scene Express, aligned with the image lane. */
export const DEFAULT_SCENE_EXPRESS_BEAT_CONCURRENCY = FRAME_AGENT_STILL_CONCURRENCY

/** Draft beats share the same six-wide cap as pro identity-ref frames. */
export const DEFAULT_SCENE_EXPRESS_FLASH_BEAT_CONCURRENCY = FRAME_AGENT_STILL_CONCURRENCY

/**
 * Attempts per beat before it is reported as failed.
 *
 * Frame Agent Express fail-fast: one shot, then stamp the error and keep
 * sibling beats moving. In-run 429/policy retries delay the scene for a
 * frame the user will usually regenerate anyway. Ops can raise this with
 * `SCENE_EXPRESS_BEAT_MAX_ATTEMPTS` if a run must self-heal.
 *
 * Auth/config canary abort still stops a genuinely broken configuration on
 * its first 401/403.
 */
export const DEFAULT_SCENE_EXPRESS_BEAT_MAX_ATTEMPTS = 1

export function getSceneExpressBeatMaxAttempts(): number {
  return parsePositiveInt(
    process.env.SCENE_EXPRESS_BEAT_MAX_ATTEMPTS,
    DEFAULT_SCENE_EXPRESS_BEAT_MAX_ATTEMPTS
  )
}

export function getSceneExpressBeat429CooldownMs(): number {
  return parseNonNegativeInt(
    process.env.SCENE_EXPRESS_BEAT_429_COOLDOWN_MS,
    DEFAULT_SCENE_EXPRESS_BEAT_429_COOLDOWN_MS
  )
}

/**
 * Quiet delay after a shot completes before starting a new shot run, giving
 * Vertex Gemini Image quota buckets time to replenish between shots.
 */
export const DEFAULT_SCENE_EXPRESS_POST_SHOT_DELAY_MS = 500

export function getSceneExpressPostShotDelayMs(): number {
  return parseNonNegativeInt(
    process.env.SCENE_EXPRESS_POST_SHOT_DELAY_MS,
    DEFAULT_SCENE_EXPRESS_POST_SHOT_DELAY_MS
  )
}

/**
 * Stagger delay between initial concurrent worker launches at t=0 so
 * multi-reference Gemini Image calls do not hit the Vertex endpoint on the
 * exact same millisecond.
 */
export const DEFAULT_SCENE_EXPRESS_INITIAL_STAGGER_MS = 400

export function getSceneExpressInitialStaggerMs(): number {
  return parseNonNegativeInt(
    process.env.SCENE_EXPRESS_INITIAL_STAGGER_MS,
    DEFAULT_SCENE_EXPRESS_INITIAL_STAGGER_MS
  )
}

/**
 * Per-beat 429 backoff, laddering 5s/10s/20s across the retries above.
 *
 * This replaces the image client's own 5s/15s/30s ladder, which was served
 * inside an ExpressTrafficCop lane slot and so blocked frames that had no
 * quota problem at all. The same wait taken here is a `readyAt` timestamp in
 * the queue: the beat is not running, and its slot is free.
 */
export const DEFAULT_SCENE_EXPRESS_BEAT_BACKOFF_MS = 5_000
export const DEFAULT_SCENE_EXPRESS_BEAT_MAX_BACKOFF_MS = 30_000
/**
 * After a fail-fast identity-ref 429, wait before the next beat so a hung
 * sibling's Vertex call can drain instead of stacking another 429.
 */
export const DEFAULT_SCENE_EXPRESS_BEAT_429_COOLDOWN_MS = 15_000

export function getSceneExpressBeatConcurrency(opts?: {
  flashAnimatic?: boolean
}): number {
  return parsePositiveInt(
    process.env.SCENE_EXPRESS_BEAT_CONCURRENCY ?? process.env.EXPRESS_IMAGE_CONCURRENCY,
    opts?.flashAnimatic
      ? DEFAULT_SCENE_EXPRESS_FLASH_BEAT_CONCURRENCY
      : DEFAULT_SCENE_EXPRESS_BEAT_CONCURRENCY
  )
}

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

export interface AdaptiveBeatPoolOptions {
  initialConcurrency?: number
  minConcurrency?: number
  maxConcurrency?: number
  maxAttempts?: number
  baseBackoffMs?: number
  maxBackoffMs?: number
  successesToIncrease?: number
  isRetryable?: (err: unknown) => boolean
  /** When set, only these errors trigger canary abort (auth/config). Defaults to !isRetryable. */
  isCanaryAbort?: (err: unknown) => boolean
  onConcurrencyChange?: (next: number, reason: 'decrease' | 'increase') => void
  /** When true, abort the pool on the first non-retryable failure (canary). */
  abortOnNonRetryableCanary?: boolean
  /** When aborted, stop scheduling and fail remaining queued beats. */
  signal?: AbortSignal
  /**
   * After a non-retryable failure, delay remaining queued beats by this many ms
   * so a hung sibling's Vertex call can drain before the next dispatch.
   */
  cooldownMsAfterError?: (err: unknown) => number
  /**
   * Quiet delay (ms) after any shot completes before starting the next queued
   * shot run. Prevents back-to-back Vertex image bursts within a single agent.
   */
  postShotDelayMs?: number
  /**
   * Stagger delay (ms) between initial concurrent worker admissions at t=0 so
   * two multi-reference image requests never hit Vertex on the same millisecond.
   */
  initialLaunchStaggerMs?: number
  /**
   * Fired when a beat is recorded as failed, including queued beats dropped
   * because the run aborted. Not fired for an attempt that will be retried.
   * The dock listens here so a 90s stall leaves "processing" before siblings finish.
   */
  onBeatFailed?: (beatIndex: number, err: unknown) => void | Promise<void>
}

export interface AdaptiveBeatPoolResult {
  succeeded: Set<number>
  failed: Map<number, unknown>
  aborted?: { beatIndex: number; error: unknown }
}

interface QueueEntry {
  beatIndex: number
  attempt: number
  readyAt: number
}

function waitForAbort(signal?: AbortSignal): Promise<void> {
  if (!signal) return new Promise(() => {})
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
}

export async function runAdaptiveBeatPool(
  beatIndices: number[],
  runOne: (beatIndex: number, attempt: number) => Promise<void>,
  options: AdaptiveBeatPoolOptions = {}
): Promise<AdaptiveBeatPoolResult> {
  const maxConcurrency =
    options.maxConcurrency ??
    options.initialConcurrency ??
    getSceneExpressBeatConcurrency()
  const minConcurrency = options.minConcurrency ?? parsePositiveInt(
    process.env.SCENE_EXPRESS_BEAT_MIN_CONCURRENCY,
    1
  )
  const maxAttempts =
    options.maxAttempts ?? getSceneExpressBeatMaxAttempts()
  const baseBackoffMs =
    options.baseBackoffMs ??
    parseNonNegativeInt(
      process.env.SCENE_EXPRESS_BEAT_BACKOFF_MS,
      DEFAULT_SCENE_EXPRESS_BEAT_BACKOFF_MS
    )
  const maxBackoffMs =
    options.maxBackoffMs ??
    parseNonNegativeInt(
      process.env.SCENE_EXPRESS_BEAT_MAX_BACKOFF_MS,
      DEFAULT_SCENE_EXPRESS_BEAT_MAX_BACKOFF_MS
    )
  const successesToIncrease = options.successesToIncrease ?? 3
  const isRetryable = options.isRetryable ?? isRetryableError
  const isCanaryAbort =
    options.isCanaryAbort ?? ((err: unknown) => !isRetryable(err))
  const abortOnNonRetryableCanary = options.abortOnNonRetryableCanary ?? true
  const postShotDelayMs = Math.max(0, options.postShotDelayMs ?? 0)
  const initialLaunchStaggerMs = Math.max(0, options.initialLaunchStaggerMs ?? 0)
  const runSignal = options.signal

  const succeeded = new Set<number>()
  const failed = new Map<number, unknown>()
  let aborted: AdaptiveBeatPoolResult['aborted']
  let stopScheduling = false
  let nextAllowedDispatchAt = 0

  if (beatIndices.length === 0) {
    return { succeeded, failed }
  }

  let target = Math.max(
    minConcurrency,
    Math.min(maxConcurrency, options.initialConcurrency ?? maxConcurrency)
  )
  let successStreak = 0
  let canaryChecked = false

  const queue: QueueEntry[] = beatIndices.map((beatIndex) => ({
    beatIndex,
    attempt: 1,
    readyAt: 0,
  }))

  const inFlight = new Set<Promise<void>>()
  const failureNotices: Promise<void>[] = []

  const recordFailure = (beatIndex: number, err: unknown): void => {
    if (succeeded.has(beatIndex) || failed.has(beatIndex)) return
    failed.set(beatIndex, err)
    const notice = options.onBeatFailed?.(beatIndex, err)
    if (notice) failureNotices.push(Promise.resolve(notice))
  }

  const failRemainingQueued = (err: unknown): void => {
    if (aborted) return
    aborted = {
      beatIndex: queue[0]?.beatIndex ?? beatIndices[0] ?? -1,
      error: err,
    }
    for (const entry of queue) {
      recordFailure(entry.beatIndex, err)
    }
    queue.length = 0
    stopScheduling = true
  }

  const applyRunAbort = () => {
    failRemainingQueued(createFrameAgentCancelledError())
  }
  if (runSignal?.aborted) {
    applyRunAbort()
  } else {
    runSignal?.addEventListener('abort', applyRunAbort, { once: true })
  }
  const abortedWait = waitForAbort(runSignal)

  const scheduleRetry = (beatIndex: number, attempt: number, err: unknown): boolean => {
    if (attempt >= maxAttempts) {
      recordFailure(beatIndex, err)
      return false
    }
    const delay = calculateBackoffDelay(attempt - 1, baseBackoffMs, maxBackoffMs)
    queue.push({
      beatIndex,
      attempt: attempt + 1,
      readyAt: Date.now() + delay,
    })
    return true
  }

  const handleFailure = (beatIndex: number, attempt: number, err: unknown): void => {
    if (!canaryChecked && abortOnNonRetryableCanary && isCanaryAbort(err)) {
      canaryChecked = true
      aborted = { beatIndex, error: err }
      recordFailure(beatIndex, err)
      for (const entry of queue) {
        recordFailure(entry.beatIndex, err)
      }
      queue.length = 0
      stopScheduling = true
      return
    }
    canaryChecked = true

    if (isRetryable(err)) {
      successStreak = 0
      const nextTarget = Math.max(minConcurrency, Math.floor(target / 2))
      if (nextTarget < target) {
        target = nextTarget
        options.onConcurrencyChange?.(target, 'decrease')
      }
      scheduleRetry(beatIndex, attempt, err)
      return
    }

    recordFailure(beatIndex, err)
    const cooldownMs = options.cooldownMsAfterError?.(err) ?? 0
    // When postShotDelayMs > 0 (production Frame Agent), any failed shot has
    // already consumed 1–2+ Vertex runs against the 60s rolling quota window.
    // Drop target concurrency to 1 and apply a cooldown so the failing worker
    // does not immediately launch a 3rd shot while the sibling worker's 2nd
    // shot is still running in the same minute.
    const effectiveCooldownMs = Math.max(cooldownMs, postShotDelayMs * 2)
    if (effectiveCooldownMs > 0) {
      successStreak = 0
      const nextTarget = Math.max(minConcurrency, Math.floor(target / 2))
      if (nextTarget < target) {
        target = nextTarget
        options.onConcurrencyChange?.(target, 'decrease')
      }
      const readyAt = Date.now() + effectiveCooldownMs
      nextAllowedDispatchAt = Math.max(nextAllowedDispatchAt, readyAt)
      for (const entry of queue) {
        entry.readyAt = Math.max(entry.readyAt, readyAt)
      }
    }
  }

  const runEntry = async (entry: QueueEntry): Promise<void> => {
    try {
      await runOne(entry.beatIndex, entry.attempt)
      succeeded.add(entry.beatIndex)
      successStreak += 1
      if (successStreak >= successesToIncrease && target < maxConcurrency) {
        target = Math.min(maxConcurrency, target + 1)
        successStreak = 0
        options.onConcurrencyChange?.(target, 'increase')
      }
    } catch (err) {
      handleFailure(entry.beatIndex, entry.attempt, err)
    } finally {
      if (postShotDelayMs > 0 && !stopScheduling) {
        const readyAt = Date.now() + postShotDelayMs
        nextAllowedDispatchAt = Math.max(nextAllowedDispatchAt, readyAt)
      }
    }
  }

  while (queue.length > 0 || inFlight.size > 0) {
    const now = Date.now()

    while (!stopScheduling && inFlight.size < target && queue.length > 0) {
      if (nextAllowedDispatchAt > now) break
      queue.sort((a, b) => a.readyAt - b.readyAt)
      const nextIdx = queue.findIndex((e) => e.readyAt <= now)
      if (nextIdx < 0) break

      const [entry] = queue.splice(nextIdx, 1)
      if (postShotDelayMs > 0 && nextAllowedDispatchAt > 0) {
        nextAllowedDispatchAt = now + postShotDelayMs
      } else if (initialLaunchStaggerMs > 0) {
        nextAllowedDispatchAt = Math.max(nextAllowedDispatchAt, now + initialLaunchStaggerMs)
      }
      const task = runEntry(entry).finally(() => {
        inFlight.delete(task)
      })
      inFlight.add(task)
    }

    if (!stopScheduling && inFlight.size < target && queue.length > 0) {
      queue.sort((a, b) => a.readyAt - b.readyAt)
      const nextReadyAt = Math.max(queue[0]!.readyAt, nextAllowedDispatchAt)
      const waitMs = Math.max(0, nextReadyAt - Date.now())
      if (waitMs > 0) {
        await Promise.race(
          inFlight.size > 0
            ? [sleep(waitMs), ...inFlight, abortedWait]
            : [sleep(waitMs), abortedWait]
        )
        continue
      }
    }

    if (inFlight.size > 0) {
      await Promise.race(stopScheduling ? inFlight : [...inFlight, abortedWait])
    } else if (queue.length > 0) {
      // Yield when delayed entries are not yet ready (clock edge case).
      await Promise.resolve()
    } else {
      break
    }
  }

  if (inFlight.size > 0) {
    await Promise.allSettled(inFlight)
  }
  if (failureNotices.length > 0) {
    await Promise.all(failureNotices)
  }

  return { succeeded, failed, aborted }
}
