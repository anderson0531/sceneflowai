/**
 * Shared dispatcher for Vertex image and video submits.
 *
 * Each acquire claims `max(now, nextAllowed)` and pushes the next start forward
 * by one interval. Callers that arrive together therefore wait 0, interval,
 * 2×interval, … instead of passing Google's gateway in the same instant.
 *
 * Image stills also take a distributed in-flight lease (a Redis sorted set of
 * tokens scored by expiry). The start gap is claimed in the same eval. A live
 * call heartbeats the same token so a long still stays inside the cap. The
 * caller releases the token when Vertex has answered. A self-inflicted timeout
 * leaves the score in place so the orphaned provider call still occupies a
 * slot; a user cancel removes it immediately. A crashed isolate's lease
 * expires on its own once heartbeats stop. Video keeps the start gap only.
 *
 * Redis (Upstash REST, same credentials as `src/lib/collab/kv.ts`) makes the
 * claim global across Vercel instances. When Redis is unset, an in-process
 * metronome still spaces the current instance. An image-lease eval error
 * refuses the admit instead of granting a private slot the next isolate cannot
 * see. The video start gap still falls back in-process. An interval of 0
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
  /** Estimated prompt/reference tokens for 60s rolling-window TPM pacing. */
  estimatedTokens?: number
}

export const VERTEX_ROLLING_WINDOW_MS = 60_000
export const DEFAULT_VERTEX_IMAGE_RPM_CAP = 10
export const DEFAULT_VERTEX_VIDEO_RPM_CAP = 6
export const DEFAULT_VERTEX_IMAGE_TPM_CAP = 60_000

const BURST_ALLOWANCE: Record<VertexDispatchLane, number> = {
  image: 4,
  video: 3,
}

const RPM_CAP_ENV: Record<VertexDispatchLane, string> = {
  image: 'VERTEX_IMAGE_RPM_CAP',
  video: 'VERTEX_VIDEO_RPM_CAP',
}

const DEFAULT_RPM_CAP: Record<VertexDispatchLane, number> = {
  image: DEFAULT_VERTEX_IMAGE_RPM_CAP,
  video: DEFAULT_VERTEX_VIDEO_RPM_CAP,
}

const DEFAULT_INTERVAL_MS: Record<VertexDispatchLane, number> = {
  image: 500,
  video: 1_500,
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
/**
 * Refresh a held lease well inside the TTL. A still that runs longer than the
 * original score stays counted; a dead isolate stops heartbeating and the
 * score expires.
 */
export const DEFAULT_IMAGE_LEASE_HEARTBEAT_MS = 30_000
/**
 * After a Vertex image 429, new admits wait this long. Same order as the
 * Stills Agent beat-pool cooldown.
 */
export const DEFAULT_IMAGE_ADMISSION_COOLDOWN_MS = 15_000
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

interface RollingWindowEntry {
  startAt: number
  tokens: number
}

const memoryRollingWindow: Record<VertexDispatchLane, RollingWindowEntry[]> = {
  image: [],
  video: [],
}

const memoryLastOutboundFetchAt: Record<VertexDispatchLane, number> = {
  image: 0,
  video: 0,
}

interface MemoryImageLease {
  token: string
  expiresAt: number
}

const memoryImageLeases: MemoryImageLease[] = []
/** Tokens whose heartbeat may still refresh the score. Abandon and release clear this. */
const heldLeaseTokens = new Set<string>()
const heartbeatTimers = new Set<ReturnType<typeof setInterval>>()
let memoryImageCooldownUntil = 0

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

/**
 * Extend one held token. A missing token is left missing so a release that
 * already removed it cannot be undone by a late heartbeat.
 */
export const VERTEX_IMAGE_LEASE_HEARTBEAT_SCRIPT = `
local now = tonumber(ARGV[1])
local leaseTtl = tonumber(ARGV[2])
local token = ARGV[3]
if redis.call('ZSCORE', KEYS[1], token) == false then
  return 0
end
redis.call('ZADD', KEYS[1], now + leaseTtl, token)
redis.call('PEXPIRE', KEYS[1], tostring(leaseTtl))
return 1
`.trim()

/** Push the admission pause forward. A shorter note does not shorten a longer one. */
export const VERTEX_IMAGE_COOLDOWN_NOTE_SCRIPT = `
local now = tonumber(ARGV[1])
local cooldown = tonumber(ARGV[2])
local untilTs = now + cooldown
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current > untilTs then
  untilTs = current
end
local ttl = untilTs - now
if ttl < 1 then ttl = 1 end
redis.call('SET', KEYS[1], tostring(untilTs), 'PX', tostring(math.floor(ttl)))
return untilTs
`.trim()

export const VERTEX_IMAGE_COOLDOWN_READ_SCRIPT = `
return redis.call('GET', KEYS[1])
`.trim()

export type ImageLeaseReleaseMode = 'release' | 'abandon'

/** `release` drops the slot. `abandon` stops heartbeats and leaves the score. */
export type ImageLeaseRelease = (mode?: ImageLeaseReleaseMode) => Promise<void>

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

export function vertexImageCooldownKey(): string {
  return 'vertex:image:cooldown-until'
}

export function getImageLeaseTtlMs(): number {
  const n = parseNonNegativeMs(
    process.env.VERTEX_IMAGE_LEASE_TTL_MS,
    DEFAULT_IMAGE_LEASE_TTL_MS
  )
  return n > 0 ? n : DEFAULT_IMAGE_LEASE_TTL_MS
}

export function getImageLeaseHeartbeatMs(): number {
  const n = parseNonNegativeMs(
    process.env.VERTEX_IMAGE_LEASE_HEARTBEAT_MS,
    DEFAULT_IMAGE_LEASE_HEARTBEAT_MS
  )
  return n > 0 ? n : DEFAULT_IMAGE_LEASE_HEARTBEAT_MS
}

export function getImageAdmissionCooldownMs(): number {
  return parseNonNegativeMs(
    process.env.VERTEX_IMAGE_ADMISSION_COOLDOWN_MS,
    DEFAULT_IMAGE_ADMISSION_COOLDOWN_MS
  )
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

export function getVertexRollingRpmCap(lane: VertexDispatchLane): number {
  return parseNonNegativeMs(process.env[RPM_CAP_ENV[lane]], DEFAULT_RPM_CAP[lane])
}

export function getVertexImageTpmCap(): number {
  return parseNonNegativeMs(process.env.VERTEX_IMAGE_TPM_CAP, DEFAULT_VERTEX_IMAGE_TPM_CAP)
}

function pruneRollingWindow(lane: VertexDispatchLane, now: number): RollingWindowEntry[] {
  const cutoff = now - VERTEX_ROLLING_WINDOW_MS
  const entries = memoryRollingWindow[lane]
  const kept = entries.filter((entry) => entry.startAt > cutoff)
  if (kept.length !== entries.length) {
    entries.length = 0
    entries.push(...kept)
  }
  return entries
}

export function getVertexRollingWindowSnapshot(
  lane: VertexDispatchLane,
  now: number = Date.now()
): { requestsInWindow: number; tokensInWindow: number } {
  const recent = pruneRollingWindow(lane, now)
  const tokensInWindow = recent.reduce((sum, entry) => sum + entry.tokens, 0)
  return { requestsInWindow: recent.length, tokensInWindow }
}

/**
 * Record actual or estimated prompt/reference token consumption in the 60s
 * rolling window. When cumulative tokens exceed `VERTEX_IMAGE_TPM_CAP`,
 * advances `nextAt` so subsequent dispatches pace inside the rolling quota.
 */
export function recordVertexRollingTokens(
  lane: VertexDispatchLane,
  tokens: number,
  now: number = Date.now()
): void {
  if (!Number.isFinite(tokens) || tokens <= 0) return
  const normalized = Math.floor(tokens)
  const recent = pruneRollingWindow(lane, now)
  if (recent.length > 0) {
    const latest = recent[recent.length - 1]
    latest.tokens = Math.max(latest.tokens, normalized)
  } else {
    recent.push({ startAt: now, tokens: normalized })
  }
  if (lane === 'image') {
    const tpmCap = getVertexImageTpmCap()
    const totalTokens = recent.reduce((sum, e) => sum + e.tokens, 0)
    if (tpmCap > 0 && totalTokens >= tpmCap && recent.length > 0) {
      let running = totalTokens
      let releaseAt = now
      for (const entry of recent) {
        releaseAt = Math.max(releaseAt, entry.startAt + VERTEX_ROLLING_WINDOW_MS)
        running -= entry.tokens
        if (running < tpmCap) break
      }
      const intervalMs = getVertexDispatchIntervalMs('image')
      if (intervalMs > 0) {
        memoryNextAt.image = Math.max(memoryNextAt.image, releaseAt)
      }
    }
  }
}

function computeRollingWindowPacing(
  lane: VertexDispatchLane,
  now: number,
  baseIntervalMs: number
): { effectiveNextAt: number; effectiveIntervalMs: number } {
  if (baseIntervalMs <= 0) {
    return { effectiveNextAt: memoryNextAt[lane], effectiveIntervalMs: 0 }
  }
  const recent = pruneRollingWindow(lane, now)
  const burst = BURST_ALLOWANCE[lane]
  const explicitRpmSet = Boolean(process.env[RPM_CAP_ENV[lane]]?.trim())
  const explicitTpmSet = lane === 'image' && Boolean(process.env.VERTEX_IMAGE_TPM_CAP?.trim())

  let effectiveIntervalMs = baseIntervalMs
  let effectiveNextAt = memoryNextAt[lane]

  // Progressive cadence scaling for later runs in a batch sequence (beyond initial burst)
  if (recent.length >= burst && (baseIntervalMs >= 100 || explicitRpmSet || explicitTpmSet)) {
    const overBurst = recent.length - burst + 1
    effectiveIntervalMs = Math.min(15_000, Math.round(baseIntervalMs * (1 + overBurst * 0.5)))
  }

  // Rolling 60s RPM ceiling (counts all admitted attempts in the 60s window, including failures)
  const rpmCap = getVertexRollingRpmCap(lane)
  if (
    rpmCap > 0 &&
    recent.length >= rpmCap &&
    (explicitRpmSet || (recent.length >= burst && baseIntervalMs >= 100))
  ) {
    const oldestInCap = recent[recent.length - rpmCap]
    if (oldestInCap) {
      const rpmFloorAt = oldestInCap.startAt + VERTEX_ROLLING_WINDOW_MS
      effectiveNextAt = Math.max(effectiveNextAt, rpmFloorAt)
    }
  }

  // Rolling 60s TPM ceiling (image lane)
  if (lane === 'image') {
    const tpmCap = getVertexImageTpmCap()
    const totalTokens = recent.reduce((sum, e) => sum + e.tokens, 0)
    if (
      tpmCap > 0 &&
      totalTokens >= tpmCap &&
      recent.length > 0 &&
      (explicitTpmSet || (recent.length >= burst && baseIntervalMs >= 100))
    ) {
      let running = totalTokens
      let tpmFloorAt = now
      for (const entry of recent) {
        tpmFloorAt = Math.max(tpmFloorAt, entry.startAt + VERTEX_ROLLING_WINDOW_MS)
        running -= entry.tokens
        if (running < tpmCap) break
      }
      effectiveNextAt = Math.max(effectiveNextAt, tpmFloorAt)
    }
  }

  return { effectiveNextAt, effectiveIntervalMs }
}

function recordRollingDispatchStart(
  lane: VertexDispatchLane,
  startAt: number,
  estimatedTokens = 0
): void {
  const recent = pruneRollingWindow(lane, startAt)
  recent.push({ startAt, tokens: Math.max(0, Math.floor(estimatedTokens)) })
}

/**
 * Record an additional outbound Vertex attempt that occurs inside an already-held
 * image lease (e.g., safety escalation from Flash to Pro, or inner retry after a
 * failed attempt). Vertex bills RPM and input TPM at request admission even when
 * an attempt fails or is refused, so nested attempts must count as runs in the
 * 60s rolling window.
 */
export function recordNestedVertexDispatchAttempt(
  lane: VertexDispatchLane,
  estimatedTokens = 0,
  now = Date.now()
): void {
  recordRollingDispatchStart(lane, now, estimatedTokens)
  const intervalMs = getVertexDispatchIntervalMs(lane)
  if (intervalMs > 0) {
    const { effectiveNextAt, effectiveIntervalMs } = computeRollingWindowPacing(
      lane,
      now,
      intervalMs
    )
    memoryNextAt[lane] = Math.max(memoryNextAt[lane], effectiveNextAt, now + effectiveIntervalMs)
  }
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
  maxWaitMs: number,
  estimatedTokens = 0
): ReserveDispatchSlotResult {
  const { effectiveNextAt, effectiveIntervalMs } = computeRollingWindowPacing(
    lane,
    now,
    intervalMs
  )
  const reserved = reserveDispatchSlot({
    now,
    nextAt: effectiveNextAt,
    intervalMs: effectiveIntervalMs,
    maxWaitMs,
  })
  if (reserved.reserved) {
    memoryNextAt[lane] = reserved.nextAt
    recordRollingDispatchStart(lane, now + reserved.waitMs, estimatedTokens)
  }
  return reserved
}

async function reserveWithRedis(
  lane: VertexDispatchLane,
  now: number,
  intervalMs: number,
  maxWaitMs: number,
  config: { url: string; token: string },
  estimatedTokens = 0
): Promise<ReserveDispatchSlotResult> {
  const priorMemoryNextAt = memoryNextAt[lane]
  const { effectiveNextAt, effectiveIntervalMs } = computeRollingWindowPacing(lane, now, intervalMs)
  const rollingFloorWaitMs =
    effectiveNextAt > priorMemoryNextAt ? Math.max(0, effectiveNextAt - now) : 0
  if (rollingFloorWaitMs > maxWaitMs) {
    return { nextAt: effectiveNextAt, waitMs: rollingFloorWaitMs, reserved: false }
  }
  const response = await fetch(`${config.url}/eval`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: VERTEX_DISPATCH_EVAL_SCRIPT,
      keys: [vertexDispatchKey(lane)],
      arguments: [String(now), String(effectiveIntervalMs), String(maxWaitMs)],
    }),
    signal: AbortSignal.timeout(REDIS_EVAL_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Vertex dispatch eval failed: ${response.status}`)
  }
  const payload = (await response.json()) as { result?: unknown }
  const reserved = reservationFromEvalResult(payload.result)
  if (reserved.reserved) {
    if (rollingFloorWaitMs > reserved.waitMs) {
      reserved.waitMs = rollingFloorWaitMs
      reserved.nextAt = Math.max(reserved.nextAt, effectiveNextAt + effectiveIntervalMs)
    }
    memoryNextAt[lane] = Math.max(memoryNextAt[lane], reserved.nextAt)
    recordRollingDispatchStart(lane, now + reserved.waitMs, estimatedTokens)
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
  const estimatedTokens = options.estimatedTokens ?? 0
  const redis = redisConfig()
  let reserved: ReserveDispatchSlotResult
  if (redis) {
    try {
      reserved = await reserveWithRedis(
        lane,
        now,
        intervalMs,
        maxWaitMs,
        redis,
        estimatedTokens
      )
    } catch (err) {
      if (!redisFallbackLogged) {
        redisFallbackLogged = true
        console.warn('[Vertex Dispatch] Redis unavailable; pacing this instance only', err)
      }
      reserved = reserveInProcess(lane, now, intervalMs, maxWaitMs, estimatedTokens)
    }
  } else {
    reserved = reserveInProcess(lane, now, intervalMs, maxWaitMs, estimatedTokens)
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
  estimatedTokens?: number
}): ReserveImageLeaseResult {
  const { effectiveNextAt, effectiveIntervalMs } = computeRollingWindowPacing(
    'image',
    input.now,
    input.intervalMs
  )
  const reserved = reserveImageLease({
    now: input.now,
    nextAt: effectiveNextAt,
    leases: memoryImageLeases,
    intervalMs: effectiveIntervalMs,
    maxWaitMs: input.maxWaitMs,
    maxInFlight: input.maxInFlight,
    leaseTtlMs: input.leaseTtlMs,
    token: input.token,
  })
  memoryImageLeases.length = 0
  memoryImageLeases.push(...reserved.leases)
  if (reserved.reserved) {
    memoryNextAt.image = reserved.nextAt
    recordRollingDispatchStart('image', input.now + reserved.waitMs, input.estimatedTokens ?? 0)
  }
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
    estimatedTokens?: number
  },
  config: { url: string; token: string }
): Promise<ReserveImageLeaseResult> {
  const priorMemoryNextAt = memoryNextAt.image
  const { effectiveNextAt, effectiveIntervalMs } = computeRollingWindowPacing(
    'image',
    input.now,
    input.intervalMs
  )
  const rollingFloorWaitMs =
    effectiveNextAt > priorMemoryNextAt ? Math.max(0, effectiveNextAt - input.now) : 0
  if (rollingFloorWaitMs > input.maxWaitMs) {
    return {
      nextAt: effectiveNextAt,
      waitMs: rollingFloorWaitMs,
      reserved: false,
      reason: 'gap',
      leases: [],
      token: '',
    }
  }
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
        String(effectiveIntervalMs),
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
    if (rollingFloorWaitMs > reserved.waitMs) {
      reserved.waitMs = rollingFloorWaitMs
      reserved.nextAt = Math.max(reserved.nextAt, effectiveNextAt + effectiveIntervalMs)
    }
    memoryNextAt.image = Math.max(memoryNextAt.image, reserved.nextAt)
    recordRollingDispatchStart('image', input.now + reserved.waitMs, input.estimatedTokens ?? 0)
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
  estimatedTokens?: number
}): Promise<ReserveImageLeaseResult> {
  const redis = redisConfig()
  if (!redis) return claimImageLeaseInProcess(input)
  try {
    return await claimImageLeaseWithRedis(input, redis)
  } catch (err) {
    console.warn(
      '[Vertex Dispatch] Redis image lease eval failed; refusing a private admit',
      err
    )
    throw new VertexDispatchDeferredError('image', IMAGE_LEASE_POLL_MS)
  }
}

function releaseImageLeaseInProcess(token: string): void {
  const hadLease = memoryImageLeases.some((lease) => lease.token === token)
  const kept = memoryImageLeases.filter((lease) => lease.token !== token)
  memoryImageLeases.length = 0
  memoryImageLeases.push(...kept)
  // Post-completion spacing: when a still completes after a long render inside an
  // active batch, ensure the next queued still does not fire at 0ms gap.
  if (hadLease) {
    const intervalMs = getVertexDispatchIntervalMs('image')
    if (intervalMs > 0) {
      const now = Date.now()
      const recent = pruneRollingWindow('image', now)
      if (recent.length >= BURST_ALLOWANCE.image && now > memoryNextAt.image) {
        memoryNextAt.image = now + Math.min(intervalMs, 500)
      }
    }
  }
}

async function releaseImageLeaseToken(token: string): Promise<void> {
  if (!token) return
  console.log('[Vertex Dispatch] image lease released')
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

function renewImageLeaseInProcess(token: string, now: number, leaseTtlMs: number): boolean {
  const lease = memoryImageLeases.find((entry) => entry.token === token)
  if (!lease) return false
  lease.expiresAt = now + leaseTtlMs
  return true
}

async function renewImageLeaseToken(token: string): Promise<void> {
  if (!heldLeaseTokens.has(token)) return
  const now = Date.now()
  const leaseTtlMs = getImageLeaseTtlMs()
  // A missing in-process mirror must not skip the Redis refresh. That is how
  // a long still expired out of the global set while this isolate still counted it.
  renewImageLeaseInProcess(token, now, leaseTtlMs)
  if (!heldLeaseTokens.has(token)) return
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
        script: VERTEX_IMAGE_LEASE_HEARTBEAT_SCRIPT,
        keys: [vertexImageLeaseKey()],
        arguments: [String(now), String(leaseTtlMs), token],
      }),
      signal: AbortSignal.timeout(REDIS_EVAL_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Vertex image lease heartbeat failed: ${response.status}`)
    }
  } catch (err) {
    console.warn('[Vertex Dispatch] image lease heartbeat failed', err)
  }
}

function startImageLeaseHeartbeat(token: string): () => void {
  heldLeaseTokens.add(token)
  const timer = setInterval(() => {
    void renewImageLeaseToken(token)
  }, getImageLeaseHeartbeatMs())
  heartbeatTimers.add(timer)
  return () => {
    clearInterval(timer)
    heartbeatTimers.delete(timer)
    heldLeaseTokens.delete(token)
  }
}

/**
 * Pause new image admits. The holder of a lease is unaffected; the next
 * acquire waits. A later shorter note does not pull an existing pause forward.
 */
export async function noteImageGenerationCooldown(
  cooldownMs: number = getImageAdmissionCooldownMs()
): Promise<void> {
  if (cooldownMs <= 0) return
  const until = Date.now() + cooldownMs
  memoryImageCooldownUntil = Math.max(memoryImageCooldownUntil, until)
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
        script: VERTEX_IMAGE_COOLDOWN_NOTE_SCRIPT,
        keys: [vertexImageCooldownKey()],
        arguments: [String(Date.now()), String(cooldownMs)],
      }),
      signal: AbortSignal.timeout(REDIS_EVAL_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Vertex image cooldown note failed: ${response.status}`)
    }
  } catch (err) {
    console.warn('[Vertex Dispatch] image cooldown note failed', err)
  }
}

async function currentImageCooldownUntil(): Promise<number> {
  const redis = redisConfig()
  if (!redis) return memoryImageCooldownUntil
  try {
    const response = await fetch(`${redis.url}/eval`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redis.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: VERTEX_IMAGE_COOLDOWN_READ_SCRIPT,
        keys: [vertexImageCooldownKey()],
        arguments: [],
      }),
      signal: AbortSignal.timeout(REDIS_EVAL_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Vertex image cooldown read failed: ${response.status}`)
    }
    const payload = (await response.json()) as { result?: unknown }
    const raw = payload.result
    const remote = raw == null || raw === false ? 0 : Number(raw)
    if (Number.isFinite(remote)) {
      memoryImageCooldownUntil = Math.max(memoryImageCooldownUntil, remote)
    }
  } catch (err) {
    if (!redisFallbackLogged) {
      redisFallbackLogged = true
      console.warn('[Vertex Dispatch] Redis unavailable; image cooldown is local to this instance', err)
    }
  }
  return memoryImageCooldownUntil
}

/**
 * Hold one shared image-still slot through the start gap and the provider call.
 * A full lease is polled until `maxWaitMs` instead of failing every sibling at
 * once. A start gap that itself exceeds the deadline throws
 * `VertexDispatchDeferredError` without taking a slot.
 * An interval of 0 or `VERTEX_IMAGE_MAX_CONCURRENCY=0` skips the lease; the
 * latter still applies the start gap.
 * The returned function releases the slot. Pass `'abandon'` to stop the
 * heartbeat and leave the score so a timed-out provider call still counts.
 */
export async function acquireImageGenerationLease(
  options: AcquireVertexDispatchOptions = {}
): Promise<ImageLeaseRelease> {
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
  const { effectiveNextAt } = computeRollingWindowPacing('image', now, intervalMs)
  const rollingFloorWaitMs = Math.max(0, effectiveNextAt - now)
  const maxWaitMs =
    options.maxWaitMs ?? Math.max(getVertexDispatchMaxWaitMs(), rollingFloorWaitMs + 1_000)
  const deadline = now + maxWaitMs

  while (true) {
    if (options.signal?.aborted) throw abortError()
    const remaining = Math.max(0, deadline - now)
    const cooldownUntil = await currentImageCooldownUntil()
    if (cooldownUntil > now) {
      const wait = cooldownUntil - now
      if (wait > remaining) {
        throw new VertexDispatchDeferredError('image', wait)
      }
      await sleepMs(wait, options.signal)
      now = frozenNow ? now + wait : Date.now()
      continue
    }
    const reserved = await claimImageLeaseOnce({
      now,
      intervalMs,
      maxWaitMs: remaining,
      maxInFlight,
      leaseTtlMs,
      token,
      estimatedTokens: options.estimatedTokens,
    })
    if (reserved.reserved) {
      const stopHeartbeat = startImageLeaseHeartbeat(token)
      try {
        if (reserved.waitMs > 0) {
          console.log(`[Vertex Dispatch] image lease in ${reserved.waitMs}ms`)
          await sleepMs(reserved.waitMs, options.signal)
        }
      } catch (err) {
        stopHeartbeat()
        await releaseImageLeaseToken(token)
        throw err
      }
      return async (mode: ImageLeaseReleaseMode = 'release') => {
        stopHeartbeat()
        if (mode === 'abandon') {
          console.warn('[Vertex Dispatch] image lease abandoned')
          return
        }
        await releaseImageLeaseToken(token)
      }
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

/**
 * Prevent outbound HTTP `fetch(endpoint)` convergence when parallel requests
 * spend different durations downloading reference images into cache before
 * hitting Vertex's gateway. The first outbound fetch in a batch passes with
 * 0ms delay; concurrent sibling fetches that arrive inside `intervalMs` are
 * spaced apart.
 */
export async function paceOutboundVertexFetch(
  lane: VertexDispatchLane,
  options: { signal?: AbortSignal; now?: number } = {}
): Promise<void> {
  const intervalMs = getVertexDispatchIntervalMs(lane)
  if (intervalMs <= 0) return

  const now = options.now ?? Date.now()
  const lastAt = memoryLastOutboundFetchAt[lane]
  if (lastAt <= 0 || now >= lastAt + intervalMs) {
    memoryLastOutboundFetchAt[lane] = now
    return
  }

  const startAt = lastAt + intervalMs
  const waitMs = startAt - now
  memoryLastOutboundFetchAt[lane] = startAt
  if (waitMs > 0) {
    await sleepMs(waitMs, options.signal)
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
  memoryRollingWindow.image.length = 0
  memoryRollingWindow.video.length = 0
  memoryLastOutboundFetchAt.image = 0
  memoryLastOutboundFetchAt.video = 0
  memoryImageLeases.length = 0
  heldLeaseTokens.clear()
  for (const timer of heartbeatTimers) clearInterval(timer)
  heartbeatTimers.clear()
  memoryImageCooldownUntil = 0
  redisFallbackLogged = false
}
