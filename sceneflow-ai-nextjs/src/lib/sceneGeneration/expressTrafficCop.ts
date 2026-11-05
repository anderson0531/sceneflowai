/**
 * Per-run traffic cop for Storyboard Express.
 *
 * Caps concurrent Vertex/TTS work across all scenes in a single `runExpress`
 * invocation. On 429 bursts, halves lane capacity and applies a short cooldown.
 * When significant 429s occur, enters a regulated state with tighter global caps.
 *
 * Capacity ladder (EXPRESS_IMAGE_CONCURRENCY):
 * - Shared Vertex identity-ref: default 2 (fail-fast + isolated siblings)
 * - Dedicated GCP / higher quota: set env to 6–12
 */

import { isRetryableError } from '../utils/retry'
import { sleep } from '../utils/retry'
import {
  isExpressFailFastRateLimitError,
  isExpressImageRateLimitError,
} from './expressImageErrors'

function createAbortError(): Error {
  const err = new Error('The operation was aborted')
  err.name = 'AbortError'
  return err
}

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) return sleep(ms)
  if (signal.aborted) return Promise.reject(createAbortError())
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(createAbortError())
    }
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export type ExpressLane = 'text' | 'image' | 'audio'

export interface ExpressLaneSnapshot {
  inFlight: number
  max: number
  cooldownUntil: number | null
  waiting: number
}

export interface ExpressTrafficCopOptions {
  onThrottle?: (lane: ExpressLane, max: number, cooldownMs: number) => void
  onRegulator?: (
    engaged: boolean,
    lanes: Record<ExpressLane, { max: number; inFlight: number }>,
    reason?: string
  ) => void
  laneMax?: Partial<Record<ExpressLane, number>>
  cooldownMs?: number
  /** 429 count within the run that triggers regulated mode. */
  rateLimitThreshold?: number
  /** Minimum gap between dispatches per lane. Defaults to image-only staggering. */
  minSpacingMs?: Partial<Record<ExpressLane, number>>
  /** Quiet delay (ms) after a lane slot is released before the next task in that lane may start. */
  postReleaseDelayMs?: Partial<Record<ExpressLane, number>>
  /** Optional 60s rolling-window RPM ceiling per lane to prevent batch quota exhaustion. */
  rollingWindowRpm?: Partial<Record<ExpressLane, number>>
}

const EXPRESS_LANES: ExpressLane[] = ['text', 'image', 'audio']
export const EXPRESS_ROLLING_WINDOW_MS = 60_000
const EXPRESS_BURST_ALLOWANCE = 6

/** Default image in-flight cap — two concurrent still jobs, fail-fast isolated. */
export const DEFAULT_EXPRESS_IMAGE_CONCURRENCY = 2

/**
 * Draft beats share the same two-wide cap as pro identity-ref frames.
 * Frame Agent pins the pool to this default.
 */
export const DEFAULT_EXPRESS_FLASH_IMAGE_CONCURRENCY = 2

/** Default TTS in-flight cap for Express Audio / Storyboard Express audio lane. */
export const DEFAULT_EXPRESS_AUDIO_CONCURRENCY = 8

/**
 * Minimum gap between image-lane dispatches.
 *
 * Concurrency caps how many calls are open at once; they say nothing about how
 * close together the calls start. Staggering the starts turns simultaneous
 * calls into a smooth ramp without lowering the cap.
 * Set 0 to disable.
 */
export const DEFAULT_EXPRESS_IMAGE_MIN_SPACING_MS = 150

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

export function getExpressImageMinSpacingMs(): number {
  return parseNonNegativeInt(
    process.env.EXPRESS_IMAGE_MIN_SPACING_MS,
    DEFAULT_EXPRESS_IMAGE_MIN_SPACING_MS
  )
}

export function getExpressSceneConcurrency(): number {
  return parsePositiveInt(process.env.EXPRESS_SCENE_CONCURRENCY, 3)
}

/** Image-lane max; override via EXPRESS_IMAGE_CONCURRENCY when dedicated GCP arrives. */
export function getExpressImageConcurrency(opts?: { flashAnimatic?: boolean }): number {
  return parsePositiveInt(
    process.env.EXPRESS_IMAGE_CONCURRENCY,
    opts?.flashAnimatic
      ? DEFAULT_EXPRESS_FLASH_IMAGE_CONCURRENCY
      : DEFAULT_EXPRESS_IMAGE_CONCURRENCY
  )
}

export function getExpressAudioConcurrency(): number {
  return parsePositiveInt(
    process.env.EXPRESS_AUDIO_CONCURRENCY,
    DEFAULT_EXPRESS_AUDIO_CONCURRENCY
  )
}

function defaultLaneMax(lane: ExpressLane, overrides?: Partial<Record<ExpressLane, number>>): number {
  if (overrides?.[lane] !== undefined) return overrides[lane]!
  switch (lane) {
    case 'text':
      return parsePositiveInt(process.env.EXPRESS_TEXT_CONCURRENCY, 3)
    case 'image':
      return getExpressImageConcurrency()
    case 'audio':
      return getExpressAudioConcurrency()
  }
}

interface LaneState {
  inFlight: number
  max: number
  initialMax: number
  cooldownUntil: number | null
  /**
   * When the next dispatch in this lane is allowed to start. Claimed ahead of
   * the sleep so simultaneous acquirers each take their own slot in the ramp
   * instead of all waking into the same millisecond.
   */
  nextDispatchAt: number
  minSpacingMs: number
  postReleaseDelayMs: number
  rollingWindowRpm: number
  rollingStarts: number[]
}

export class ExpressTrafficCop {
  private readonly lanes: Record<ExpressLane, LaneState>
  private readonly cooldownMs: number
  private readonly regulatedCooldownMs: number
  private readonly onThrottle?: ExpressTrafficCopOptions['onThrottle']
  private readonly onRegulator?: ExpressTrafficCopOptions['onRegulator']
  private readonly waiters: Record<ExpressLane, Array<() => void>>
  private readonly rateLimitThreshold: number
  private rateLimitCount = 0
  private regulated = false
  private lastRateLimitAt = 0

  constructor(options: ExpressTrafficCopOptions = {}) {
    this.cooldownMs = options.cooldownMs ?? parsePositiveInt(
      process.env.EXPRESS_RATE_LIMIT_COOLDOWN_MS,
      10_000
    )
    this.regulatedCooldownMs = Math.max(this.cooldownMs, 20_000)
    this.onThrottle = options.onThrottle
    this.onRegulator = options.onRegulator
    this.rateLimitThreshold = options.rateLimitThreshold ?? 3
    this.waiters = { text: [], image: [], audio: [] }
    const spacingFor = (lane: ExpressLane): number => {
      const override = options.minSpacingMs?.[lane]
      if (override !== undefined) return Math.max(0, override)
      return lane === 'image' ? getExpressImageMinSpacingMs() : 0
    }
    const postReleaseFor = (lane: ExpressLane): number => {
      const override = options.postReleaseDelayMs?.[lane]
      if (override !== undefined) return Math.max(0, Math.floor(override))
      return 0
    }
    const rollingRpmFor = (lane: ExpressLane): number => {
      const override = options.rollingWindowRpm?.[lane]
      if (override !== undefined) return Math.max(0, Math.floor(override))
      if (lane === 'image') {
        return parseNonNegativeInt(process.env.EXPRESS_IMAGE_ROLLING_RPM, 0)
      }
      return 0
    }
    this.lanes = {
      text: {
        inFlight: 0,
        max: defaultLaneMax('text', options.laneMax),
        initialMax: defaultLaneMax('text', options.laneMax),
        cooldownUntil: null,
        nextDispatchAt: 0,
        minSpacingMs: spacingFor('text'),
        postReleaseDelayMs: postReleaseFor('text'),
        rollingWindowRpm: rollingRpmFor('text'),
        rollingStarts: [],
      },
      image: {
        inFlight: 0,
        max: defaultLaneMax('image', options.laneMax),
        initialMax: defaultLaneMax('image', options.laneMax),
        cooldownUntil: null,
        nextDispatchAt: 0,
        minSpacingMs: spacingFor('image'),
        postReleaseDelayMs: postReleaseFor('image'),
        rollingWindowRpm: rollingRpmFor('image'),
        rollingStarts: [],
      },
      audio: {
        inFlight: 0,
        max: defaultLaneMax('audio', options.laneMax),
        initialMax: defaultLaneMax('audio', options.laneMax),
        cooldownUntil: null,
        nextDispatchAt: 0,
        minSpacingMs: spacingFor('audio'),
        postReleaseDelayMs: postReleaseFor('audio'),
        rollingWindowRpm: rollingRpmFor('audio'),
        rollingStarts: [],
      },
    }
  }

  async runInLane<T>(
    lane: ExpressLane,
    fn: () => Promise<T>,
    signal?: AbortSignal
  ): Promise<T> {
    await this.acquire(lane, signal)
    try {
      if (signal?.aborted) {
        throw createAbortError()
      }
      return await fn()
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError'
      if (!isAbort && lane === 'image') {
        const msg = String((err as Error)?.message ?? err)
        // A shot that failed after policy-ladder escalation/retry spent 2 Vertex
        // runs inside the 60s window; record the second run against rollingStarts.
        if (/(?:policy|safety|blocked|after [2-9]\d* attempt)/i.test(msg)) {
          this.lanes.image.rollingStarts.push(Date.now())
        }
      }
      const failFastImage429 =
        isExpressFailFastRateLimitError(err) ||
        (lane === 'image' && isExpressImageRateLimitError(err))
      if (failFastImage429) {
        this.reportRateLimit(lane, { countTowardRegulator: false })
      } else if (isRetryableError(err)) {
        this.reportRateLimit(lane)
      } else if (!isAbort && lane === 'image' && this.lanes.image.postReleaseDelayMs > 0) {
        const state = this.lanes.image
        state.max = Math.max(1, Math.floor(state.max / 2))
        const failureCooldownMs = state.postReleaseDelayMs * 2
        state.cooldownUntil = Math.max(state.cooldownUntil ?? 0, Date.now() + failureCooldownMs)
        this.onThrottle?.('image', state.max, failureCooldownMs)
      }
      throw err
    } finally {
      this.release(lane)
    }
  }

  reportRateLimit(
    lane: ExpressLane,
    options?: { cooldown?: boolean; countTowardRegulator?: boolean }
  ): void {
    const applyCooldown = options?.cooldown !== false
    const countTowardRegulator = options?.countTowardRegulator !== false
    if (countTowardRegulator) {
      this.rateLimitCount += 1
      this.lastRateLimitAt = Date.now()
    }

    const state = this.lanes[lane]
    state.max = Math.max(1, Math.floor(state.max / 2))
    const cooldownMs = this.regulated ? this.regulatedCooldownMs : this.cooldownMs
    if (applyCooldown) {
      state.cooldownUntil = Date.now() + cooldownMs
    }
    console.warn(
      `[ExpressTrafficCop] ${lane} throttled to max=${state.max}${
        applyCooldown ? `, cooldown ${cooldownMs}ms` : ', no cooldown (fail-fast)'
      } (429 count=${this.rateLimitCount})`
    )
    this.onThrottle?.(lane, state.max, applyCooldown ? cooldownMs : 0)

    if (
      countTowardRegulator &&
      !this.regulated &&
      this.rateLimitCount >= this.rateLimitThreshold
    ) {
      this.engageRegulator('significant 429 burst')
    }
  }

  private engageRegulator(reason: string): void {
    if (this.regulated) return
    this.regulated = true
    for (const lane of EXPRESS_LANES) {
      const state = this.lanes[lane]
      state.max = Math.max(1, Math.min(state.max, 2))
      state.cooldownUntil = Date.now() + this.regulatedCooldownMs
    }
    console.warn(`[ExpressTrafficCop] Regulator engaged: ${reason}`)
    this.emitRegulator(reason)
  }

  private tryRecoverRegulator(): void {
    if (!this.regulated) return
    const quietMs = Date.now() - this.lastRateLimitAt
    if (quietMs < this.regulatedCooldownMs) return

    this.regulated = false
    for (const lane of EXPRESS_LANES) {
      const state = this.lanes[lane]
      state.max = Math.max(1, Math.floor(state.initialMax / 2))
    }
    console.info('[ExpressTrafficCop] Regulator disengaged after quiet period')
    this.emitRegulator('quiet period')
  }

  private emitRegulator(reason?: string): void {
    if (!this.onRegulator) return
    const lanes = {} as Record<ExpressLane, { max: number; inFlight: number }>
    for (const lane of EXPRESS_LANES) {
      lanes[lane] = {
        max: this.lanes[lane].max,
        inFlight: this.lanes[lane].inFlight,
      }
    }
    this.onRegulator(this.regulated, lanes, reason)
  }

  getSnapshot(): Record<ExpressLane, ExpressLaneSnapshot> {
    const out = {} as Record<ExpressLane, ExpressLaneSnapshot>
    for (const lane of EXPRESS_LANES) {
      const s = this.lanes[lane]
      out[lane] = {
        inFlight: s.inFlight,
        max: s.max,
        cooldownUntil: s.cooldownUntil,
        waiting: this.waiters[lane].length,
      }
    }
    return out
  }

  isRegulated(): boolean {
    return this.regulated
  }

  getRateLimitCount(): number {
    return this.rateLimitCount
  }

  private async acquire(lane: ExpressLane, signal?: AbortSignal): Promise<void> {
    while (true) {
      if (signal?.aborted) {
        throw createAbortError()
      }
      this.tryRecoverRegulator()
      const state = this.lanes[lane]
      const now = Date.now()

      if (state.cooldownUntil !== null && now < state.cooldownUntil) {
        await sleepWithAbort(state.cooldownUntil - now, signal)
        continue
      }

      if (state.inFlight < state.max) {
        state.inFlight++
        const cutoff = now - EXPRESS_ROLLING_WINDOW_MS
        while (state.rollingStarts.length > 0 && state.rollingStarts[0] <= cutoff) {
          state.rollingStarts.shift()
        }

        let effectiveSpacingMs = state.minSpacingMs
        if (
          state.minSpacingMs > 0 &&
          state.rollingStarts.length >= EXPRESS_BURST_ALLOWANCE
        ) {
          const overBurst = state.rollingStarts.length - EXPRESS_BURST_ALLOWANCE + 1
          effectiveSpacingMs = Math.min(
            5_000,
            Math.round(state.minSpacingMs * (1 + overBurst * 0.25))
          )
        }

        if (
          state.rollingWindowRpm > 0 &&
          state.rollingStarts.length >= state.rollingWindowRpm
        ) {
          const oldestInWindow =
            state.rollingStarts[state.rollingStarts.length - state.rollingWindowRpm]
          if (oldestInWindow !== undefined) {
            state.nextDispatchAt = Math.max(
              state.nextDispatchAt,
              oldestInWindow + EXPRESS_ROLLING_WINDOW_MS
            )
          }
        }

        // The slot is taken before the stagger sleep, so the wait cannot be
        // raced by another acquirer and `release` stays balanced either way.
        if (effectiveSpacingMs > 0 || state.nextDispatchAt > now) {
          const startAt = Math.max(now, state.nextDispatchAt)
          state.nextDispatchAt = startAt + effectiveSpacingMs
          state.rollingStarts.push(startAt)
          if (startAt > now) {
            try {
              await sleepWithAbort(startAt - now, signal)
            } catch (err) {
              this.release(lane)
              throw err
            }
          }
        } else {
          state.rollingStarts.push(now)
        }
        return
      }

      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(createAbortError())
          return
        }
        let settled = false
        const onAbort = () => {
          if (settled) return
          settled = true
          const idx = this.waiters[lane].indexOf(onWake)
          if (idx >= 0) this.waiters[lane].splice(idx, 1)
          reject(createAbortError())
        }
        const onWake = () => {
          if (settled) return
          settled = true
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }
        signal?.addEventListener('abort', onAbort, { once: true })
        this.waiters[lane].push(onWake)
      })
    }
  }

  private release(lane: ExpressLane): void {
    const state = this.lanes[lane]
    state.inFlight = Math.max(0, state.inFlight - 1)
    const releaseDelayMs = Math.max(state.minSpacingMs, state.postReleaseDelayMs)
    if (releaseDelayMs > 0) {
      const now = Date.now()
      if (state.postReleaseDelayMs > 0) {
        state.nextDispatchAt = Math.max(state.nextDispatchAt, now + releaseDelayMs)
      } else if (now > state.nextDispatchAt) {
        state.nextDispatchAt = now + releaseDelayMs
      }
    }
    const next = this.waiters[lane].shift()
    if (next) next()
  }
}
