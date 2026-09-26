/**
 * Shared leaky-bucket dispatcher for Vertex image and video submits.
 *
 * Each acquire claims `max(now, nextAllowed)` and pushes the next start forward
 * by one interval. Callers that arrive together therefore wait 0, interval,
 * 2×interval, … instead of passing Google's gateway in the same instant.
 *
 * Redis (Upstash REST, same credentials as `src/lib/collab/kv.ts`) makes the
 * claim global across Vercel instances. When Redis is unset or errors, an
 * in-process metronome still spaces the current instance. An interval of 0
 * disables the lane.
 *
 * The Lua script and `reserveDispatchSlot` are the same reservation. Keep them
 * in lockstep: claim `max(now, next)`, refuse without writing when the wait
 * exceeds the deadline, otherwise store `start + interval`.
 */

export type VertexDispatchLane = 'image' | 'video'

export interface ReserveDispatchSlotInput {
  now: number
  nextAt: number
  intervalMs: number
  maxWaitMs: number
}

export interface ReserveDispatchSlotResult {
  /** Next stored start time. Unchanged when the wait was refused. */
  nextAt: number
  /** Milliseconds until the claimed start. The refused wait, when `reserved` is false. */
  waitMs: number
  reserved: boolean
}

export interface AcquireVertexDispatchOptions {
  /** Override the lane's max wait. Image calls pass the remaining deadline. */
  maxWaitMs?: number
  signal?: AbortSignal
  /** Test clock. Production uses `Date.now()`. */
  now?: number
}

const DEFAULT_INTERVAL_MS: Record<VertexDispatchLane, number> = {
  image: 2_000,
  video: 5_000,
}

const INTERVAL_ENV: Record<VertexDispatchLane, string> = {
  image: 'VERTEX_IMAGE_DISPATCH_INTERVAL_MS',
  video: 'VERTEX_VIDEO_DISPATCH_INTERVAL_MS',
}

const DEFAULT_MAX_WAIT_MS = 20_000
const REDIS_EVAL_TIMEOUT_MS = 2_000
const REDIS_KEY_TTL_MS = 120_000

/**
 * Redis EVAL body. Returns `{wait, nextAt, reserved}` where reserved is 1 or 0.
 * A refused claim does not SET, so the next caller still sees the old start.
 */
export const VERTEX_DISPATCH_EVAL_SCRIPT = `
local now = tonumber(ARGV[1])
local interval = tonumber(ARGV[2])
local maxWait = tonumber(ARGV[3])
local nextAt = tonumber(redis.call('GET', KEYS[1]) or '0')
local start = math.max(now, nextAt)
local wait = start - now
if wait > maxWait then
  return {wait, nextAt, 0}
end
local updated = start + interval
redis.call('SET', KEYS[1], tostring(updated), 'PX', '${REDIS_KEY_TTL_MS}')
return {wait, updated, 1}
`.trim()

const memoryNextAt: Record<VertexDispatchLane, number> = {
  image: 0,
  video: 0,
}

let redisFallbackLogged = false

export class VertexDispatchDeferredError extends Error {
  readonly lane: VertexDispatchLane
  readonly retryAfterMs: number

  constructor(lane: VertexDispatchLane, retryAfterMs: number) {
    super(`Vertex dispatch deferred (${lane}): rate limit`)
    this.name = 'VertexDispatchDeferredError'
    this.lane = lane
    this.retryAfterMs = retryAfterMs
  }
}

export function vertexDispatchKey(lane: VertexDispatchLane): string {
  return `vertex:dispatch:${lane}`
}

function parseNonNegativeMs(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.floor(n)
}

export function getVertexDispatchIntervalMs(lane: VertexDispatchLane): number {
  return parseNonNegativeMs(process.env[INTERVAL_ENV[lane]], DEFAULT_INTERVAL_MS[lane])
}

export function getVertexDispatchMaxWaitMs(): number {
  return parseNonNegativeMs(process.env.VERTEX_DISPATCH_MAX_WAIT_MS, DEFAULT_MAX_WAIT_MS)
}

/**
 * Pure reservation used by the in-process metronome and by tests.
 * A refused wait leaves `nextAt` unchanged.
 */
export function reserveDispatchSlot(input: ReserveDispatchSlotInput): ReserveDispatchSlotResult {
  const start = Math.max(input.now, input.nextAt)
  const waitMs = start - input.now
  if (waitMs > input.maxWaitMs) {
    return { nextAt: input.nextAt, waitMs, reserved: false }
  }
  return {
    nextAt: start + input.intervalMs,
    waitMs,
    reserved: true,
  }
}

export function reservationFromEvalResult(result: unknown): ReserveDispatchSlotResult {
  if (!Array.isArray(result) || result.length < 3) {
    throw new Error('Vertex dispatch eval returned an unexpected payload')
  }
  const waitMs = Number(result[0])
  const nextAt = Number(result[1])
  const reserved = Number(result[2]) === 1
  if (!Number.isFinite(waitMs) || !Number.isFinite(nextAt)) {
    throw new Error('Vertex dispatch eval returned non-numeric timing')
  }
  return { waitMs, nextAt, reserved }
}

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ''), token }
}

function reserveInProcess(
  lane: VertexDispatchLane,
  now: number,
  intervalMs: number,
  maxWaitMs: number
): ReserveDispatchSlotResult {
  const reserved = reserveDispatchSlot({
    now,
    nextAt: memoryNextAt[lane],
    intervalMs,
    maxWaitMs,
  })
  if (reserved.reserved) memoryNextAt[lane] = reserved.nextAt
  return reserved
}

async function reserveWithRedis(
  lane: VertexDispatchLane,
  now: number,
  intervalMs: number,
  maxWaitMs: number,
  config: { url: string; token: string }
): Promise<ReserveDispatchSlotResult> {
  const response = await fetch(`${config.url}/eval`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: VERTEX_DISPATCH_EVAL_SCRIPT,
      keys: [vertexDispatchKey(lane)],
      arguments: [String(now), String(intervalMs), String(maxWaitMs)],
    }),
    signal: AbortSignal.timeout(REDIS_EVAL_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Vertex dispatch eval failed: ${response.status}`)
  }
  const payload = (await response.json()) as { result?: unknown }
  const reserved = reservationFromEvalResult(payload.result)
  if (reserved.reserved) {
    memoryNextAt[lane] = Math.max(memoryNextAt[lane], reserved.nextAt)
  }
  return reserved
}

function sleepMs(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      const aborted = new Error('The operation was aborted')
      aborted.name = 'AbortError'
      reject(aborted)
    }
    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Wait for this lane's next start time.
 * Throws `VertexDispatchDeferredError` when the claimed wait is past the deadline,
 * without reserving that slot.
 */
export async function acquireVertexDispatchSlot(
  lane: VertexDispatchLane,
  options: AcquireVertexDispatchOptions = {}
): Promise<void> {
  const intervalMs = getVertexDispatchIntervalMs(lane)
  if (intervalMs <= 0) return

  const now = options.now ?? Date.now()
  const maxWaitMs = options.maxWaitMs ?? getVertexDispatchMaxWaitMs()
  const redis = redisConfig()
  let reserved: ReserveDispatchSlotResult
  if (redis) {
    try {
      reserved = await reserveWithRedis(lane, now, intervalMs, maxWaitMs, redis)
    } catch (err) {
      if (!redisFallbackLogged) {
        redisFallbackLogged = true
        console.warn('[Vertex Dispatch] Redis unavailable; pacing this instance only', err)
      }
      reserved = reserveInProcess(lane, now, intervalMs, maxWaitMs)
    }
  } else {
    reserved = reserveInProcess(lane, now, intervalMs, maxWaitMs)
  }

  if (!reserved.reserved) {
    throw new VertexDispatchDeferredError(lane, reserved.waitMs)
  }
  if (reserved.waitMs > 0) {
    console.log(`[Vertex Dispatch] ${lane} slot in ${reserved.waitMs}ms`)
    await sleepMs(reserved.waitMs, options.signal)
  }
}

/** Test-only. Clears the in-process metronome and the Redis-fallback log. */
export function resetVertexDispatchBucketForTests(): void {
  memoryNextAt.image = 0
  memoryNextAt.video = 0
  redisFallbackLogged = false
}
