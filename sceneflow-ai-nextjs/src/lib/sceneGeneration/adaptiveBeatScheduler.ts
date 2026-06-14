/**
 * Adaptive (AIMD) beat image pool for Scene Express.
 *
 * Runs beat indices with a dynamic concurrency target: multiplicative decrease
 * on retryable failures, additive increase after a success streak, per-beat
 * exponential backoff retries.
 */

import { calculateBackoffDelay, isRetryableError, sleep } from '../utils/retry'

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

/** Runtime beat concurrency for Scene Express (default 3). */
export function getSceneExpressBeatConcurrency(): number {
  return parsePositiveInt(
    process.env.SCENE_EXPRESS_BEAT_CONCURRENCY ??
      process.env.VERTEX_GEMINI_FLASH_IMAGE_CONCURRENCY,
    3
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
    options.maxAttempts ??
    parsePositiveInt(process.env.SCENE_EXPRESS_BEAT_MAX_ATTEMPTS, 3)
  const baseBackoffMs =
    options.baseBackoffMs ??
    parseNonNegativeInt(process.env.SCENE_EXPRESS_BEAT_BACKOFF_MS, 2000)
  const maxBackoffMs =
    options.maxBackoffMs ??
    parseNonNegativeInt(process.env.SCENE_EXPRESS_BEAT_MAX_BACKOFF_MS, 15_000)
  const successesToIncrease = options.successesToIncrease ?? 3
  const isRetryable = options.isRetryable ?? isRetryableError
  const isCanaryAbort =
    options.isCanaryAbort ?? ((err: unknown) => !isRetryable(err))
  const abortOnNonRetryableCanary = options.abortOnNonRetryableCanary ?? true

  const succeeded = new Set<number>()
  const failed = new Map<number, unknown>()
  let aborted: AdaptiveBeatPoolResult['aborted']
  let stopScheduling = false

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

  const scheduleRetry = (beatIndex: number, attempt: number, err: unknown): boolean => {
    if (attempt >= maxAttempts) {
      failed.set(beatIndex, err)
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
      failed.set(beatIndex, err)
      for (const entry of queue) {
        if (!succeeded.has(entry.beatIndex) && !failed.has(entry.beatIndex)) {
          failed.set(entry.beatIndex, err)
        }
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

    failed.set(beatIndex, err)
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
    }
  }

  while (queue.length > 0 || inFlight.size > 0) {
    const now = Date.now()

    while (!stopScheduling && inFlight.size < target && queue.length > 0) {
      queue.sort((a, b) => a.readyAt - b.readyAt)
      const nextIdx = queue.findIndex((e) => e.readyAt <= now)
      if (nextIdx < 0) break

      const [entry] = queue.splice(nextIdx, 1)
      const task = runEntry(entry).finally(() => {
        inFlight.delete(task)
      })
      inFlight.add(task)
    }

    if (inFlight.size === 0 && queue.length > 0) {
      queue.sort((a, b) => a.readyAt - b.readyAt)
      const waitMs = Math.max(0, queue[0]!.readyAt - Date.now())
      if (waitMs > 0) {
        await sleep(waitMs)
        continue
      }
    }

    if (inFlight.size > 0) {
      await Promise.race(inFlight)
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

  return { succeeded, failed, aborted }
}
