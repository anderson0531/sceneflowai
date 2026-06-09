/**
 * Per-run traffic cop for Storyboard Express.
 *
 * Caps concurrent Vertex/TTS work across all scenes in a single `runExpress`
 * invocation. On 429 bursts, halves lane capacity and applies a short cooldown.
 */

import { isRetryableError } from '../utils/retry'
import { sleep } from '../utils/retry'

export type ExpressLane = 'text' | 'image' | 'audio'

export interface ExpressLaneSnapshot {
  inFlight: number
  max: number
  cooldownUntil: number | null
}

export interface ExpressTrafficCopOptions {
  onThrottle?: (lane: ExpressLane, max: number, cooldownMs: number) => void
  laneMax?: Partial<Record<ExpressLane, number>>
  cooldownMs?: number
}

const EXPRESS_LANES: ExpressLane[] = ['text', 'image', 'audio']

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

export function getExpressSceneConcurrency(): number {
  return parsePositiveInt(process.env.EXPRESS_SCENE_CONCURRENCY, 3)
}

function defaultLaneMax(lane: ExpressLane, overrides?: Partial<Record<ExpressLane, number>>): number {
  if (overrides?.[lane] !== undefined) return overrides[lane]!
  switch (lane) {
    case 'text':
      return parsePositiveInt(process.env.EXPRESS_TEXT_CONCURRENCY, 3)
    case 'image':
      return parsePositiveInt(process.env.EXPRESS_IMAGE_CONCURRENCY, 6)
    case 'audio':
      return parsePositiveInt(process.env.EXPRESS_AUDIO_CONCURRENCY, 3)
  }
}

interface LaneState {
  inFlight: number
  max: number
  cooldownUntil: number | null
}

export class ExpressTrafficCop {
  private readonly lanes: Record<ExpressLane, LaneState>
  private readonly cooldownMs: number
  private readonly onThrottle?: ExpressTrafficCopOptions['onThrottle']
  private readonly waiters: Record<ExpressLane, Array<() => void>>

  constructor(options: ExpressTrafficCopOptions = {}) {
    this.cooldownMs = options.cooldownMs ?? parsePositiveInt(
      process.env.EXPRESS_RATE_LIMIT_COOLDOWN_MS,
      10_000
    )
    this.onThrottle = options.onThrottle
    this.waiters = { text: [], image: [], audio: [] }
    this.lanes = {
      text: { inFlight: 0, max: defaultLaneMax('text', options.laneMax), cooldownUntil: null },
      image: { inFlight: 0, max: defaultLaneMax('image', options.laneMax), cooldownUntil: null },
      audio: { inFlight: 0, max: defaultLaneMax('audio', options.laneMax), cooldownUntil: null },
    }
  }

  async runInLane<T>(lane: ExpressLane, fn: () => Promise<T>): Promise<T> {
    await this.acquire(lane)
    try {
      return await fn()
    } catch (err) {
      if (isRetryableError(err)) {
        this.reportRateLimit(lane)
      }
      throw err
    } finally {
      this.release(lane)
    }
  }

  reportRateLimit(lane: ExpressLane): void {
    const state = this.lanes[lane]
    state.max = Math.max(1, Math.floor(state.max / 2))
    state.cooldownUntil = Date.now() + this.cooldownMs
    console.warn(
      `[ExpressTrafficCop] ${lane} throttled to max=${state.max}, cooldown ${this.cooldownMs}ms`
    )
    this.onThrottle?.(lane, state.max, this.cooldownMs)
  }

  getSnapshot(): Record<ExpressLane, ExpressLaneSnapshot> {
    const out = {} as Record<ExpressLane, ExpressLaneSnapshot>
    for (const lane of EXPRESS_LANES) {
      const s = this.lanes[lane]
      out[lane] = {
        inFlight: s.inFlight,
        max: s.max,
        cooldownUntil: s.cooldownUntil,
      }
    }
    return out
  }

  private async acquire(lane: ExpressLane): Promise<void> {
    while (true) {
      const state = this.lanes[lane]
      const now = Date.now()

      if (state.cooldownUntil !== null && now < state.cooldownUntil) {
        await sleep(state.cooldownUntil - now)
        continue
      }

      if (state.inFlight < state.max) {
        state.inFlight++
        return
      }

      await new Promise<void>((resolve) => {
        this.waiters[lane].push(resolve)
      })
    }
  }

  private release(lane: ExpressLane): void {
    const state = this.lanes[lane]
    state.inFlight = Math.max(0, state.inFlight - 1)
    const next = this.waiters[lane].shift()
    if (next) next()
  }
}
