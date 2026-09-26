/**
 * Shared dispatcher for Vertex image and video submits.
 *
 * Each acquire claims `max(now, nextAllowed)` and pushes the next start forward
 * by one interval. Callers that arrive together therefore wait 0, interval,
 * 2×interval, … instead of passing Google's gateway in the same instant.
 *
 * Image stills also take a distributed in-flight lease (a Redis sorted set of
 * tokens scored by expiry). The start gap is claimed in the same eval, and the
 * token stays until the caller releases it. A crashed isolate's lease expires
 * on its own. Video keeps the start gap only.
 *
 * Redis (Upstash REST, same credentials as `src/lib/collab/kv.ts`) makes the
 * claim global across Vercel instances. When Redis is unset or errors, an
 * in-process metronome still spaces the current instance. An interval of 0
 * disables the lane, including the image lease.
 *
 * The Lua script and `reserveDispatchSlot` / `reserveImageLease` are the same
 * reservation. Keep them in lockstep.
 */

import { randomUUID } from 'node:crypto'
import { getVertexImageMaxConcurrency } from '@/lib/vertexai/vertexImageGate'

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
/** Matches `/api/scene/generate-image` maxDuration so a dead isolate cannot pin a slot. */
export const DEFAULT_IMAGE_LEASE_TTL_MS = 300_000
/** How often a full lease is rechecked so an early release is not missed. */
export const IMAGE_LEASE_POLL_MS = 250

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

interface MemoryImageLease {
  token: string
  expiresAt: number
}

const memoryImageLeases: MemoryImageLease[] = []

let redisFallbackLogged = false

export type ImageLeaseRefuseReason = 'ok' | 'gap' | 'full'

export interface ImageLeaseMember {
  token: string
  expiresAt: number
}

export interface ReserveImageLeaseInput {
  now: number
  nextAt: number
  leases: readonly ImageLeaseMember[]
  intervalMs: number
  maxWaitMs: number
  maxInFlight: number
  leaseTtlMs: number
  token: string
}

export interface ReserveImageLeaseResult {
  nextAt: number
  waitMs: number
  reserved: boolean
  reason: ImageLeaseRefuseReason
  leases: ImageLeaseMember[]
  token: string
}

/**
 * Image lease eval. Returns `{wait, nextAt, reserved, token, reason}`
 * where reason is 1 (held), 0 (start gap past the deadline), or 2 (lease full).
 * A refusal does not SET or ZADD.
 */
export const VERTEX_IMAGE_LEASE_EVAL_SCRIPT = `
local now = tonumber(ARGV[1])
local interval = tonumber(ARGV[2])
local maxWait = tonumber(ARGV[3])
local maxInFlight = tonumber(ARGV[4])
local leaseTtl = tonumber(ARGV[5])
local token = ARGV[6]
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)
local inflight = redis.call('ZCARD', KEYS[2])
if inflight >= maxInFlight then
  local soonest = redis.call('ZRANGE', KEYS[2], 0, 0, 'WITHSCORES')
  local retryIn = 0
  if soonest[2] ~= nil then
    retryIn = tonumber(soonest[2]) - now
    if retryIn < 0 then retryIn = 0 end
  end
  local nextAt = tonumber(redis.call('GET', KEYS[1]) or '0')
  return {retryIn, nextAt, 0, '', 2}
end
local nextAt = tonumber(redis.call('GET', KEYS[1]) or '0')
local start = math.max(now, nextAt)
local wait = start - now
if wait > maxWait then
  return {wait, nextAt, 0, '', 0}
end
local updated = start + interval
redis.call('SET', KEYS[1], tostring(updated), 'PX', '${REDIS_KEY_TTL_MS}')
redis.call('ZADD', KEYS[2], now + leaseTtl, token)
redis.call('PEXPIRE', KEYS[2], tostring(leaseTtl))
return {wait, updated, 1, token, 1}
`.trim()

export const VERTEX_IMAGE_LEASE_RELEASE_SCRIPT = `
return redis.call('ZREM', KEYS[1], ARGV[1])
`.trim()

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

export function vertexImageLeaseKey(): string {
  return 'vertex:inflight:image'
}

export function getImageLeaseTtlMs(): number {
  const n = parseNonNegativeMs(
    process.env.VERTEX_IMAGE_LEASE_TTL_MS,
    DEFAULT_IMAGE_LEASE_TTL_MS
  )
  return n > 0 ? n : DEFAULT_IMAGE_LEASE_TTL_MS
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

/**
 * Pure image lease. Drop expired members, refuse when `maxInFlight` are still
 * held, otherwise claim the start gap and add `token`. A refusal leaves both
 * the gap cursor and the live members unchanged (expired members are pruned).
 */
export function reserveImageLease(input: ReserveImageLeaseInput): ReserveImageLeaseResult {
  const active = input.leases.filter((lease) => lease.expiresAt > input.now)
  if (active.length >= input.maxInFlight) {
    const soonest = active.reduce((min, lease) => Math.min(min, lease.expiresAt), Infinity)
    const waitMs = Number.isFinite(soonest) ? Math.max(0, soonest - input.now) : 0
    return {
      nextAt: input.nextAt,
      waitMs,
      reserved: false,
      reason: 'full',
      leases: active,
      token: '',
    }
  }

  const gap = reserveDispatchSlot({
    now: input.now,
    nextAt: input.nextAt,
    intervalMs: input.intervalMs,
    maxWaitMs: input.maxWaitMs,
  })
  if (!gap.reserved) {
    return {
      nextAt: input.nextAt,
      waitMs: gap.waitMs,
      reserved: false,
      reason: 'gap',
      leases: active,
      token: '',
    }
  }

  return {
    nextAt: gap.nextAt,
    waitMs: gap.waitMs,
    reserved: true,
    reason: 'ok',
    leases: [...active, { token: input.token, expiresAt: input.now + input.leaseTtlMs }],
    token: input.token,
  }
}

export function imageLeaseClaimFromEvalResult(result: unknown): ReserveImageLeaseResult {
  if (!Array.isArray(result) || result.length < 5) {
    throw new Error('Vertex image lease eval returned an unexpected payload')
  }
  const waitMs = Number(result[0])
  const nextAt = Number(result[1])
  const reserved = Number(result[2]) === 1
  const token = result[3] == null ? '' : String(result[3])
  const reasonCode = Number(result[4])
  if (!Number.isFinite(waitMs) || !Number.isFinite(nextAt)) {
    throw new Error('Vertex image lease eval returned non-numeric timing')
  }
  const reason: ImageLeaseRefuseReason =
    reasonCode === 2 ? 'full' : reasonCode === 0 ? 'gap' : 'ok'
  return {
    waitMs,
    nextAt,
    reserved,
    reason: reserved ? 'ok' : reason,
    leases: [],
    token: reserved ? token : '',
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

function abortError(): Error {
  const aborted = new Error('The operation was aborted')
  aborted.name = 'AbortError'
  return aborted
}

function claimImageLeaseInProcess(input: {
  now: number
  intervalMs: number
  maxWaitMs: number
  maxInFlight: number
  leaseTtlMs: number
  token: string
}): ReserveImageLeaseResult {
  const reserved = reserveImageLease({
    now: input.now,
    nextAt: memoryNextAt.image,
    leases: memoryImageLeases,
    intervalMs: input.intervalMs,
    maxWaitMs: input.maxWaitMs,
    maxInFlight: input.maxInFlight,
    leaseTtlMs: input.leaseTtlMs,
    token: input.token,
  })
  memoryImageLeases.length = 0
  memoryImageLeases.push(...reserved.leases)
  if (reserved.reserved) memoryNextAt.image = reserved.nextAt
  return reserved
}

async function claimImageLeaseWithRedis(
  input: {
    now: number
    intervalMs: number
    maxWaitMs: number
    maxInFlight: number
    leaseTtlMs: number
    token: string
  },
  config: { url: string; token: string }
): Promise<ReserveImageLeaseResult> {
  const response = await fetch(`${config.url}/eval`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: VERTEX_IMAGE_LEASE_EVAL_SCRIPT,
      keys: [vertexDispatchKey('image'), vertexImageLeaseKey()],
      arguments: [
        String(input.now),
        String(input.intervalMs),
        String(input.maxWaitMs),
        String(input.maxInFlight),
        String(input.leaseTtlMs),
        input.token,
      ],
    }),
    signal: AbortSignal.timeout(REDIS_EVAL_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Vertex image lease eval failed: ${response.status}`)
  }
  const payload = (await response.json()) as { result?: unknown }
  const reserved = imageLeaseClaimFromEvalResult(payload.result)
  if (reserved.reserved) {
    memoryNextAt.image = Math.max(memoryNextAt.image, reserved.nextAt)
    const expiresAt = input.now + input.leaseTtlMs
    const kept = memoryImageLeases.filter(
      (lease) => lease.expiresAt > input.now && lease.token !== input.token
    )
    memoryImageLeases.length = 0
    memoryImageLeases.push(...kept, { token: input.token, expiresAt })
  }
  return reserved
}

async function claimImageLeaseOnce(input: {
  now: number
  intervalMs: number
  maxWaitMs: number
  maxInFlight: number
  leaseTtlMs: number
  token: string
}): Promise<ReserveImageLeaseResult> {
  const redis = redisConfig()
  if (!redis) return claimImageLeaseInProcess(input)
  try {
    return await claimImageLeaseWithRedis(input, redis)
  } catch (err) {
    if (!redisFallbackLogged) {
      redisFallbackLogged = true
      console.warn('[Vertex Dispatch] Redis unavailable; image lease is local to this instance', err)
    }
    return claimImageLeaseInProcess(input)
  }
}

function releaseImageLeaseInProcess(token: string): void {
  const kept = memoryImageLeases.filter((lease) => lease.token !== token)
  memoryImageLeases.length = 0
  memoryImageLeases.push(...kept)
}

async function releaseImageLeaseToken(token: string): Promise<void> {
  if (!token) return
  releaseImageLeaseInProcess(token)
  const redis = redisConfig()
  if (!redis) return
  try {
    const response = await fetch(`${redis.url}/eval`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redis.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: VERTEX_IMAGE_LEASE_RELEASE_SCRIPT,
        keys: [vertexImageLeaseKey()],
        arguments: [token],
      }),
      signal: AbortSignal.timeout(REDIS_EVAL_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Vertex image lease release failed: ${response.status}`)
    }
  } catch (err) {
    console.warn('[Vertex Dispatch] image lease release failed', err)
  }
}

/**
 * Hold one shared image-still slot through the start gap and the provider call.
 * A full lease is polled until `maxWaitMs` instead of failing every sibling at
 * once. A start gap that itself exceeds the deadline throws
 * `VertexDispatchDeferredError` without taking a slot.
 * An interval of 0 or `VERTEX_IMAGE_MAX_CONCURRENCY=0` skips the lease; the
 * latter still applies the start gap.
 */
export async function acquireImageGenerationLease(
  options: AcquireVertexDispatchOptions = {}
): Promise<() => Promise<void>> {
  const intervalMs = getVertexDispatchIntervalMs('image')
  if (intervalMs <= 0) return async () => {}

  const maxInFlight = getVertexImageMaxConcurrency()
  if (maxInFlight <= 0) {
    await acquireVertexDispatchSlot('image', options)
    return async () => {}
  }

  const leaseTtlMs = getImageLeaseTtlMs()
  const token = randomUUID()
  const frozenNow = options.now != null
  let now = options.now ?? Date.now()
  const maxWaitMs = options.maxWaitMs ?? getVertexDispatchMaxWaitMs()
  const deadline = now + maxWaitMs

  while (true) {
    if (options.signal?.aborted) throw abortError()
    const remaining = Math.max(0, deadline - now)
    const reserved = await claimImageLeaseOnce({
      now,
      intervalMs,
      maxWaitMs: remaining,
      maxInFlight,
      leaseTtlMs,
      token,
    })
    if (reserved.reserved) {
      try {
        if (reserved.waitMs > 0) {
          console.log(`[Vertex Dispatch] image lease in ${reserved.waitMs}ms`)
          await sleepMs(reserved.waitMs, options.signal)
        }
      } catch (err) {
        await releaseImageLeaseToken(token)
        throw err
      }
      return () => releaseImageLeaseToken(token)
    }
    if (reserved.reason === 'gap' || remaining <= 0) {
      throw new VertexDispatchDeferredError('image', reserved.waitMs)
    }
    const nap = Math.min(IMAGE_LEASE_POLL_MS, remaining, Math.max(1, reserved.waitMs))
    if (nap <= 0) {
      throw new VertexDispatchDeferredError('image', reserved.waitMs)
    }
    await sleepMs(nap, options.signal)
    now = frozenNow ? now + nap : Date.now()
  }
}

/** Acquire an image lease, run `fn`, and release the lease when `fn` settles. */
export async function withImageGenerationLease<T>(
  fn: () => Promise<T>,
  options: AcquireVertexDispatchOptions = {}
): Promise<T> {
  const release = await acquireImageGenerationLease(options)
  try {
    return await fn()
  } finally {
    await release()
  }
}

/** Test-only. Clears the in-process metronome, image leases, and the Redis-fallback log. */
export function resetVertexDispatchBucketForTests(): void {
  memoryNextAt.image = 0
  memoryNextAt.video = 0
  memoryImageLeases.length = 0
  redisFallbackLogged = false
}
