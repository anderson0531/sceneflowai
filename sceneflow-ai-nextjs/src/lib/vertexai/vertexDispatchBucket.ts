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
 * Every key and in-memory state map is scoped by `bucketNamespace` (default
 * `'platform'`, or `'byok:<hash>'` for BYOK keys) so BYOK credentials have
 * completely isolated cooldowns, leases, and rolling RPM counters.
 *
 * The Lua script and `reserveDispatchSlot` / `reserveImageLease` are the same
 * reservation. Keep them in lockstep.
 */

import { randomUUID } from 'node:crypto'
import { getVertexImageMaxConcurrency } from '@/lib/vertexai/vertexImageGate'

export type VertexDispatchLane = 'image' | 'video'

export const DEFAULT_BUCKET_NAMESPACE = 'platform'

export function normalizeBucketNamespace(bucketNamespace?: string): string {
  const trimmed = bucketNamespace?.trim()
  return trimmed ? trimmed : DEFAULT_BUCKET_NAMESPACE
}

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
  /** Distributed 60s rolling RPM count returned by Redis when available. */
  distributedRpmCount?: number
}

export interface AcquireVertexDispatchOptions {
  /** Override the lane's max wait. Image calls pass the remaining deadline. */
  maxWaitMs?: number
  signal?: AbortSignal
  /** Test clock. Production uses `Date.now()`. */
  now?: number
  /** Estimated prompt/reference tokens for 60s rolling-window TPM pacing. */
  estimatedTokens?: number
  /** Isolated dispatch bucket namespace ('platform' or 'byok:<hash>'). Defaults to 'platform'. */
  bucketNamespace?: string
  /** Optional per-call max in-flight override (e.g., 1 for BYOK sequential pacing). */
  maxInFlight?: number
}

export const VERTEX_ROLLING_WINDOW_MS = 60_000
export const VERTEX_ROLLING_RPM_KEY_TTL_SEC = 70
export const DEFAULT_VERTEX_IMAGE_RPM_CAP = 60
export const DEFAULT_VERTEX_VIDEO_RPM_CAP = 30
export const DEFAULT_VERTEX_IMAGE_TPM_CAP = 300_000

const BURST_ALLOWANCE: Record<VertexDispatchLane, number> = {
  image: 12,
  video: 10,
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
  image: 250,
  video: 500,
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
 * Redis EVAL body. Returns `{wait, nextAt, reserved, rpmCount}` where reserved is 1 or 0.
 * A refused claim does not SET, so the next caller still sees the old start.
 * On admission, atomically increments a distributed per-minute RPM counter with EXPIRE 70.
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
local rpmKey = KEYS[1] .. ':rpm:' .. tostring(math.floor(now / 60000))
local rpmCount = redis.call('INCR', rpmKey)
if rpmCount == 1 then
  redis.call('EXPIRE', rpmKey, ${VERTEX_ROLLING_RPM_KEY_TTL_SEC})
end
return {wait, updated, 1, rpmCount}
`.trim()

/** Standalone distributed rolling-minute RPM increment script (`INCR` + `EXPIRE 70`). */
export const VERTEX_ROLLING_RPM_INCR_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ${VERTEX_ROLLING_RPM_KEY_TTL_SEC})
end
return count
`.trim()

export const VERTEX_ROLLING_RPM_READ_SCRIPT = `
return redis.call('GET', KEYS[1])
`.trim()

interface RollingWindowEntry {
  startAt: number
  tokens: number
}

interface DistributedRpmSnapshot {
  minuteBucket: number
  count: number
}

interface MemoryImageLease {
  token: string
  expiresAt: number
}

interface NamespaceBucketState {
  nextAt: Record<VertexDispatchLane, number>
  rollingWindow: Record<VertexDispatchLane, RollingWindowEntry[]>
  distributedRpm: Record<VertexDispatchLane, DistributedRpmSnapshot | null>
  lastOutboundFetchAt: Record<VertexDispatchLane, number>
  imageLeases: MemoryImageLease[]
  cooldownUntil: Record<VertexDispatchLane, number>
}

const namespaceBuckets = new Map<string, NamespaceBucketState>()

function getNamespaceBucket(bucketNamespace?: string): NamespaceBucketState {
  const ns = normalizeBucketNamespace(bucketNamespace)
  let bucket = namespaceBuckets.get(ns)
  if (!bucket) {
    bucket = {
      nextAt: { image: 0, video: 0 },
      rollingWindow: { image: [], video: [] },
      distributedRpm: { image: null, video: null },
      lastOutboundFetchAt: { image: 0, video: 0 },
      imageLeases: [],
      cooldownUntil: { image: 0, video: 0 },
    }
    namespaceBuckets.set(ns, bucket)
  }
  return bucket
}

/** Tokens whose heartbeat may still refresh the score. Abandon and release clear this. */
const heldLeaseTokens = new Set<string>()
const heartbeatTimers = new Set<ReturnType<typeof setInterval>>()

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
  /** Distributed 60s rolling RPM count returned by Redis when available. */
  distributedRpmCount?: number
}

/**
 * Image lease eval. Returns `{wait, nextAt, reserved, token, reason, rpmCount}`
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
local rpmKey = KEYS[1] .. ':rpm:' .. tostring(math.floor(now / 60000))
local rpmCount = redis.call('INCR', rpmKey)
if rpmCount == 1 then
  redis.call('EXPIRE', rpmKey, ${VERTEX_ROLLING_RPM_KEY_TTL_SEC})
end
return {wait, updated, 1, token, 1, rpmCount}
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

export function vertexDispatchKey(
  lane: VertexDispatchLane,
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): string {
  const ns = normalizeBucketNamespace(bucketNamespace)
  return `${ns}:vertex:dispatch:${lane}`
}

export function vertexImageLeaseKey(
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): string {
  const ns = normalizeBucketNamespace(bucketNamespace)
  return `${ns}:vertex:inflight:image`
}

export function vertexImageCooldownKey(
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): string {
  const ns = normalizeBucketNamespace(bucketNamespace)
  return `${ns}:vertex:image:cooldown-until`
}

export function vertexVideoCooldownKey(
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): string {
  const ns = normalizeBucketNamespace(bucketNamespace)
  return `${ns}:vertex:video:cooldown-until`
}

export function vertexCooldownKey(
  lane: VertexDispatchLane,
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): string {
  return lane === 'video'
    ? vertexVideoCooldownKey(bucketNamespace)
    : vertexImageCooldownKey(bucketNamespace)
}

export function vertexRollingRpmKey(
  lane: VertexDispatchLane,
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE,
  now: number = Date.now()
): string {
  const minuteBucket = Math.floor(now / VERTEX_ROLLING_WINDOW_MS)
  return `${vertexDispatchKey(lane, bucketNamespace)}:rpm:${minuteBucket}`
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

function pruneRollingWindow(
  lane: VertexDispatchLane,
  now: number,
  bucketNamespace?: string
): RollingWindowEntry[] {
  const bucket = getNamespaceBucket(bucketNamespace)
  const cutoff = now - VERTEX_ROLLING_WINDOW_MS
  const entries = bucket.rollingWindow[lane]
  const kept = entries.filter((entry) => entry.startAt > cutoff)
  if (kept.length !== entries.length) {
    entries.length = 0
    entries.push(...kept)
  }
  return entries
}

function syncDistributedRpmSnapshot(
  lane: VertexDispatchLane,
  now: number,
  count: number | undefined,
  bucketNamespace?: string
): void {
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) return
  const bucket = getNamespaceBucket(bucketNamespace)
  const minuteBucket = Math.floor(now / VERTEX_ROLLING_WINDOW_MS)
  const existing = bucket.distributedRpm[lane]
  if (!existing || existing.minuteBucket < minuteBucket) {
    bucket.distributedRpm[lane] = { minuteBucket, count }
  } else if (existing.minuteBucket === minuteBucket) {
    existing.count = Math.max(existing.count, count)
  }
}

function getEffectiveRollingRequestCount(
  lane: VertexDispatchLane,
  now: number,
  localCount: number,
  bucketNamespace?: string
): number {
  const bucket = getNamespaceBucket(bucketNamespace)
  const snapshot = bucket.distributedRpm[lane]
  const currentMinute = Math.floor(now / VERTEX_ROLLING_WINDOW_MS)
  if (snapshot && snapshot.minuteBucket === currentMinute) {
    return Math.max(localCount, snapshot.count)
  }
  return localCount
}

export function getVertexRollingWindowSnapshot(
  lane: VertexDispatchLane,
  now: number = Date.now(),
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): { requestsInWindow: number; tokensInWindow: number } {
  const recent = pruneRollingWindow(lane, now, bucketNamespace)
  const tokensInWindow = recent.reduce((sum, entry) => sum + entry.tokens, 0)
  const requestsInWindow = getEffectiveRollingRequestCount(
    lane,
    now,
    recent.length,
    bucketNamespace
  )
  return { requestsInWindow, tokensInWindow }
}

/**
 * Increment the distributed Redis fixed/sliding-minute RPM counter (`INCR` + `EXPIRE 70`)
 * when Upstash Redis is configured, falling back to the per-namespace in-memory window.
 */
export async function incrementDistributedRollingRpm(
  lane: VertexDispatchLane,
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE,
  now: number = Date.now()
): Promise<number> {
  const ns = normalizeBucketNamespace(bucketNamespace)
  const redis = redisConfig()
  if (redis) {
    try {
      const response = await fetch(`${redis.url}/eval`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redis.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: VERTEX_ROLLING_RPM_INCR_SCRIPT,
          keys: [vertexRollingRpmKey(lane, ns, now)],
          arguments: [],
        }),
        signal: AbortSignal.timeout(REDIS_EVAL_TIMEOUT_MS),
      })
      if (!response.ok) {
        throw new Error(`Vertex rolling RPM incr failed: ${response.status}`)
      }
      const payload = (await response.json()) as { result?: unknown }
      const count = Number(payload.result)
      if (Number.isFinite(count) && count >= 0) {
        syncDistributedRpmSnapshot(lane, now, count, ns)
        return count
      }
    } catch (err) {
      if (!redisFallbackLogged) {
        redisFallbackLogged = true
        console.warn('[Vertex Dispatch] Redis unavailable; rolling RPM is local to this instance', err)
      }
    }
  }
  recordRollingDispatchStart(lane, now, 0, ns)
  return pruneRollingWindow(lane, now, ns).length
}

/**
 * Read the distributed Redis rolling-minute RPM counter for a lane/namespace,
 * falling back to the per-namespace in-memory rolling window if Redis is unavailable.
 */
export async function getDistributedRollingRpmCount(
  lane: VertexDispatchLane,
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE,
  now: number = Date.now()
): Promise<number> {
  const ns = normalizeBucketNamespace(bucketNamespace)
  const localCount = pruneRollingWindow(lane, now, ns).length
  const redis = redisConfig()
  if (!redis) {
    return getEffectiveRollingRequestCount(lane, now, localCount, ns)
  }
  try {
    const response = await fetch(`${redis.url}/eval`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redis.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: VERTEX_ROLLING_RPM_READ_SCRIPT,
        keys: [vertexRollingRpmKey(lane, ns, now)],
        arguments: [],
      }),
      signal: AbortSignal.timeout(REDIS_EVAL_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Vertex rolling RPM read failed: ${response.status}`)
    }
    const payload = (await response.json()) as { result?: unknown }
    const raw = payload.result
    const remote = raw == null || raw === false ? 0 : Number(raw)
    if (Number.isFinite(remote) && remote >= 0) {
      syncDistributedRpmSnapshot(lane, now, remote, ns)
      return Math.max(localCount, remote)
    }
  } catch (err) {
    if (!redisFallbackLogged) {
      redisFallbackLogged = true
      console.warn('[Vertex Dispatch] Redis unavailable; rolling RPM read is local to this instance', err)
    }
  }
  return getEffectiveRollingRequestCount(lane, now, localCount, ns)
}

/**
 * Record actual or estimated prompt/reference token consumption in the 60s
 * rolling window. When cumulative tokens exceed `VERTEX_IMAGE_TPM_CAP`,
 * advances `nextAt` so subsequent dispatches pace inside the rolling quota.
 */
export function recordVertexRollingTokens(
  lane: VertexDispatchLane,
  tokens: number,
  now: number = Date.now(),
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): void {
  if (!Number.isFinite(tokens) || tokens <= 0) return
  const ns = normalizeBucketNamespace(bucketNamespace)
  const bucket = getNamespaceBucket(ns)
  const normalized = Math.floor(tokens)
  const recent = pruneRollingWindow(lane, now, ns)
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
        bucket.nextAt.image = Math.max(bucket.nextAt.image, releaseAt)
      }
    }
  }
}

function computeRollingWindowPacing(
  lane: VertexDispatchLane,
  now: number,
  baseIntervalMs: number,
  bucketNamespace?: string
): { effectiveNextAt: number; effectiveIntervalMs: number } {
  const ns = normalizeBucketNamespace(bucketNamespace)
  const bucket = getNamespaceBucket(ns)
  if (baseIntervalMs <= 0) {
    return { effectiveNextAt: bucket.nextAt[lane], effectiveIntervalMs: 0 }
  }
  const recent = pruneRollingWindow(lane, now, ns)
  const effectiveRequests = getEffectiveRollingRequestCount(lane, now, recent.length, ns)
  const burst = BURST_ALLOWANCE[lane]
  const explicitRpmSet = Boolean(process.env[RPM_CAP_ENV[lane]]?.trim())
  const explicitTpmSet = lane === 'image' && Boolean(process.env.VERTEX_IMAGE_TPM_CAP?.trim())

  let effectiveIntervalMs = baseIntervalMs
  let effectiveNextAt = bucket.nextAt[lane]

  // Progressive cadence scaling for later runs in a batch sequence (beyond initial burst)
  if (effectiveRequests >= burst && (baseIntervalMs >= 100 || explicitRpmSet || explicitTpmSet)) {
    const overBurst = effectiveRequests - burst + 1
    effectiveIntervalMs = Math.min(15_000, Math.round(baseIntervalMs * (1 + overBurst * 0.5)))
  }

  // Rolling 60s RPM ceiling (counts all admitted attempts in the 60s window, including failures)
  const rpmCap = getVertexRollingRpmCap(lane)
  if (
    rpmCap > 0 &&
    effectiveRequests >= rpmCap &&
    (explicitRpmSet || (effectiveRequests >= burst && baseIntervalMs >= 100))
  ) {
    const oldestInCap = recent.length >= rpmCap ? recent[recent.length - rpmCap] : undefined
    if (oldestInCap) {
      const rpmFloorAt = oldestInCap.startAt + VERTEX_ROLLING_WINDOW_MS
      effectiveNextAt = Math.max(effectiveNextAt, rpmFloorAt)
    } else {
      // Distributed Redis counter hit the minute cap across isolates: pace to next minute boundary
      const nextMinuteBoundary = (Math.floor(now / VERTEX_ROLLING_WINDOW_MS) + 1) * VERTEX_ROLLING_WINDOW_MS
      effectiveNextAt = Math.max(effectiveNextAt, nextMinuteBoundary)
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
  estimatedTokens = 0,
  bucketNamespace?: string
): void {
  const recent = pruneRollingWindow(lane, startAt, bucketNamespace)
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
  now = Date.now(),
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): void {
  const ns = normalizeBucketNamespace(bucketNamespace)
  const bucket = getNamespaceBucket(ns)
  recordRollingDispatchStart(lane, now, estimatedTokens, ns)
  const intervalMs = getVertexDispatchIntervalMs(lane)
  if (intervalMs > 0) {
    const { effectiveNextAt, effectiveIntervalMs } = computeRollingWindowPacing(
      lane,
      now,
      intervalMs,
      ns
    )
    bucket.nextAt[lane] = Math.max(bucket.nextAt[lane], effectiveNextAt, now + effectiveIntervalMs)
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
  const distributedRpmCount =
    result.length >= 6 && Number.isFinite(Number(result[5])) ? Number(result[5]) : undefined
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
    ...(distributedRpmCount !== undefined ? { distributedRpmCount } : {}),
  }
}

export function reservationFromEvalResult(result: unknown): ReserveDispatchSlotResult {
  if (!Array.isArray(result) || result.length < 3) {
    throw new Error('Vertex dispatch eval returned an unexpected payload')
  }
  const waitMs = Number(result[0])
  const nextAt = Number(result[1])
  const reserved = Number(result[2]) === 1
  const distributedRpmCount =
    result.length >= 4 && Number.isFinite(Number(result[3])) ? Number(result[3]) : undefined
  if (!Number.isFinite(waitMs) || !Number.isFinite(nextAt)) {
    throw new Error('Vertex dispatch eval returned non-numeric timing')
  }
  return {
    waitMs,
    nextAt,
    reserved,
    ...(distributedRpmCount !== undefined ? { distributedRpmCount } : {}),
  }
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
  estimatedTokens = 0,
  bucketNamespace?: string
): ReserveDispatchSlotResult {
  const ns = normalizeBucketNamespace(bucketNamespace)
  const bucket = getNamespaceBucket(ns)
  const { effectiveNextAt, effectiveIntervalMs } = computeRollingWindowPacing(
    lane,
    now,
    intervalMs,
    ns
  )
  const reserved = reserveDispatchSlot({
    now,
    nextAt: effectiveNextAt,
    intervalMs: effectiveIntervalMs,
    maxWaitMs,
  })
  if (reserved.reserved) {
    bucket.nextAt[lane] = reserved.nextAt
    recordRollingDispatchStart(lane, now + reserved.waitMs, estimatedTokens, ns)
  }
  return reserved
}

async function reserveWithRedis(
  lane: VertexDispatchLane,
  now: number,
  intervalMs: number,
  maxWaitMs: number,
  config: { url: string; token: string },
  estimatedTokens = 0,
  bucketNamespace?: string
): Promise<ReserveDispatchSlotResult> {
  const ns = normalizeBucketNamespace(bucketNamespace)
  const bucket = getNamespaceBucket(ns)
  const priorMemoryNextAt = bucket.nextAt[lane]
  const { effectiveNextAt, effectiveIntervalMs } = computeRollingWindowPacing(
    lane,
    now,
    intervalMs,
    ns
  )
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
      keys: [vertexDispatchKey(lane, ns)],
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
    bucket.nextAt[lane] = Math.max(bucket.nextAt[lane], reserved.nextAt)
    recordRollingDispatchStart(lane, now + reserved.waitMs, estimatedTokens, ns)
    syncDistributedRpmSnapshot(lane, now, reserved.distributedRpmCount, ns)
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

  const ns = normalizeBucketNamespace(options.bucketNamespace)
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
        estimatedTokens,
        ns
      )
    } catch (err) {
      if (!redisFallbackLogged) {
        redisFallbackLogged = true
        console.warn('[Vertex Dispatch] Redis unavailable; pacing this instance only', err)
      }
      reserved = reserveInProcess(lane, now, intervalMs, maxWaitMs, estimatedTokens, ns)
    }
  } else {
    reserved = reserveInProcess(lane, now, intervalMs, maxWaitMs, estimatedTokens, ns)
  }

  if (!reserved.reserved) {
    throw new VertexDispatchDeferredError(lane, reserved.waitMs)
  }
  if (reserved.waitMs > 0) {
    console.log(`[Vertex Dispatch] ${ns}:${lane} slot in ${reserved.waitMs}ms`)
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
  bucketNamespace?: string
}): ReserveImageLeaseResult {
  const ns = normalizeBucketNamespace(input.bucketNamespace)
  const bucket = getNamespaceBucket(ns)
  const { effectiveNextAt, effectiveIntervalMs } = computeRollingWindowPacing(
    'image',
    input.now,
    input.intervalMs,
    ns
  )
  const reserved = reserveImageLease({
    now: input.now,
    nextAt: effectiveNextAt,
    leases: bucket.imageLeases,
    intervalMs: effectiveIntervalMs,
    maxWaitMs: input.maxWaitMs,
    maxInFlight: input.maxInFlight,
    leaseTtlMs: input.leaseTtlMs,
    token: input.token,
  })
  bucket.imageLeases.length = 0
  bucket.imageLeases.push(...reserved.leases)
  if (reserved.reserved) {
    bucket.nextAt.image = reserved.nextAt
    recordRollingDispatchStart('image', input.now + reserved.waitMs, input.estimatedTokens ?? 0, ns)
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
    bucketNamespace?: string
  },
  config: { url: string; token: string }
): Promise<ReserveImageLeaseResult> {
  const ns = normalizeBucketNamespace(input.bucketNamespace)
  const bucket = getNamespaceBucket(ns)
  const priorMemoryNextAt = bucket.nextAt.image
  const { effectiveNextAt, effectiveIntervalMs } = computeRollingWindowPacing(
    'image',
    input.now,
    input.intervalMs,
    ns
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
      keys: [vertexDispatchKey('image', ns), vertexImageLeaseKey(ns)],
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
    bucket.nextAt.image = Math.max(bucket.nextAt.image, reserved.nextAt)
    recordRollingDispatchStart('image', input.now + reserved.waitMs, input.estimatedTokens ?? 0, ns)
    syncDistributedRpmSnapshot('image', input.now, reserved.distributedRpmCount, ns)
    const expiresAt = input.now + input.leaseTtlMs
    const kept = bucket.imageLeases.filter(
      (lease) => lease.expiresAt > input.now && lease.token !== input.token
    )
    bucket.imageLeases.length = 0
    bucket.imageLeases.push(...kept, { token: input.token, expiresAt })
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
  bucketNamespace?: string
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

function releaseImageLeaseInProcess(token: string, bucketNamespace?: string): void {
  const ns = normalizeBucketNamespace(bucketNamespace)
  const bucket = getNamespaceBucket(ns)
  const hadLease = bucket.imageLeases.some((lease) => lease.token === token)
  const kept = bucket.imageLeases.filter((lease) => lease.token !== token)
  bucket.imageLeases.length = 0
  bucket.imageLeases.push(...kept)
  // Post-completion spacing: when a still completes after a long render inside an
  // active batch, ensure the next queued still does not fire at 0ms gap.
  if (hadLease) {
    const intervalMs = getVertexDispatchIntervalMs('image')
    if (intervalMs > 0) {
      const now = Date.now()
      const recent = pruneRollingWindow('image', now, ns)
      if (recent.length >= BURST_ALLOWANCE.image && now > bucket.nextAt.image) {
        bucket.nextAt.image = now + Math.min(intervalMs, 500)
      }
    }
  }
}

async function releaseImageLeaseToken(token: string, bucketNamespace?: string): Promise<void> {
  if (!token) return
  const ns = normalizeBucketNamespace(bucketNamespace)
  console.log(`[Vertex Dispatch] ${ns}:image lease released`)
  releaseImageLeaseInProcess(token, ns)
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
        keys: [vertexImageLeaseKey(ns)],
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

function renewImageLeaseInProcess(
  token: string,
  now: number,
  leaseTtlMs: number,
  bucketNamespace?: string
): boolean {
  const bucket = getNamespaceBucket(bucketNamespace)
  const lease = bucket.imageLeases.find((entry) => entry.token === token)
  if (!lease) return false
  lease.expiresAt = now + leaseTtlMs
  return true
}

async function renewImageLeaseToken(token: string, bucketNamespace?: string): Promise<void> {
  if (!heldLeaseTokens.has(token)) return
  const ns = normalizeBucketNamespace(bucketNamespace)
  const now = Date.now()
  const leaseTtlMs = getImageLeaseTtlMs()
  // A missing in-process mirror must not skip the Redis refresh. That is how
  // a long still expired out of the global set while this isolate still counted it.
  renewImageLeaseInProcess(token, now, leaseTtlMs, ns)
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
        keys: [vertexImageLeaseKey(ns)],
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

function startImageLeaseHeartbeat(token: string, bucketNamespace?: string): () => void {
  const ns = normalizeBucketNamespace(bucketNamespace)
  heldLeaseTokens.add(token)
  const timer = setInterval(() => {
    void renewImageLeaseToken(token, ns)
  }, getImageLeaseHeartbeatMs())
  heartbeatTimers.add(timer)
  return () => {
    clearInterval(timer)
    heartbeatTimers.delete(timer)
    heldLeaseTokens.delete(token)
  }
}

async function noteLaneCooldown(
  lane: VertexDispatchLane,
  cooldownMs: number,
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): Promise<void> {
  if (cooldownMs <= 0) return
  const ns = normalizeBucketNamespace(bucketNamespace)
  const bucket = getNamespaceBucket(ns)
  const now = Date.now()
  const until = now + cooldownMs
  bucket.cooldownUntil[lane] = Math.max(bucket.cooldownUntil[lane], until)
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
        keys: [vertexCooldownKey(lane, ns)],
        arguments: [String(Date.now()), String(cooldownMs)],
      }),
      signal: AbortSignal.timeout(REDIS_EVAL_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Vertex ${lane} cooldown note failed: ${response.status}`)
    }
  } catch (err) {
    console.warn(`[Vertex Dispatch] ${lane} cooldown note failed`, err)
  }
}

async function currentLaneCooldownUntil(
  lane: VertexDispatchLane,
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): Promise<number> {
  const ns = normalizeBucketNamespace(bucketNamespace)
  const bucket = getNamespaceBucket(ns)
  const redis = redisConfig()
  if (!redis) return bucket.cooldownUntil[lane]
  try {
    const response = await fetch(`${redis.url}/eval`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redis.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: VERTEX_IMAGE_COOLDOWN_READ_SCRIPT,
        keys: [vertexCooldownKey(lane, ns)],
        arguments: [],
      }),
      signal: AbortSignal.timeout(REDIS_EVAL_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Vertex ${lane} cooldown read failed: ${response.status}`)
    }
    const payload = (await response.json()) as { result?: unknown }
    const raw = payload.result
    const remote = raw == null || raw === false ? 0 : Number(raw)
    if (Number.isFinite(remote)) {
      bucket.cooldownUntil[lane] = Math.max(bucket.cooldownUntil[lane], remote)
    }
  } catch (err) {
    if (!redisFallbackLogged) {
      redisFallbackLogged = true
      console.warn(
        `[Vertex Dispatch] Redis unavailable; ${lane} cooldown is local to this instance`,
        err
      )
    }
  }
  return bucket.cooldownUntil[lane]
}

/**
 * Pause new image admits for a namespace. The holder of a lease is unaffected;
 * the next acquire waits. A later shorter note does not pull an existing pause forward.
 */
export async function noteImageGenerationCooldown(
  cooldownMs: number = getImageAdmissionCooldownMs(),
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): Promise<void> {
  await noteLaneCooldown('image', cooldownMs, bucketNamespace)
}

/**
 * Pause new video submits for a namespace after a 429 / RESOURCE_EXHAUSTED response.
 * A later shorter note does not pull an existing pause forward.
 */
export async function noteVideoGenerationCooldown(
  cooldownMs: number,
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): Promise<void> {
  await noteLaneCooldown('video', cooldownMs, bucketNamespace)
}

/**
 * Query remaining distributed cooldown in milliseconds for a lane and bucket namespace.
 * Returns 0 when no cooldown is active.
 */
export async function getBucketCooldownRemainingMs(
  lane: VertexDispatchLane,
  bucketNamespace: string = DEFAULT_BUCKET_NAMESPACE
): Promise<number> {
  const until = await currentLaneCooldownUntil(lane, bucketNamespace)
  return Math.max(0, until - Date.now())
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

  const ns = normalizeBucketNamespace(options.bucketNamespace)
  const maxInFlight =
    typeof options.maxInFlight === 'number' && Number.isFinite(options.maxInFlight)
      ? Math.max(0, Math.floor(options.maxInFlight))
      : getVertexImageMaxConcurrency()
  if (maxInFlight <= 0) {
    await acquireVertexDispatchSlot('image', { ...options, bucketNamespace: ns })
    return async () => {}
  }

  const leaseTtlMs = getImageLeaseTtlMs()
  const token = randomUUID()
  const frozenNow = options.now != null
  let now = options.now ?? Date.now()
  const { effectiveNextAt } = computeRollingWindowPacing('image', now, intervalMs, ns)
  const rollingFloorWaitMs = Math.max(0, effectiveNextAt - now)
  const maxWaitMs =
    options.maxWaitMs ?? Math.max(getVertexDispatchMaxWaitMs(), rollingFloorWaitMs + 1_000)
  const deadline = now + maxWaitMs

  while (true) {
    if (options.signal?.aborted) throw abortError()
    const remaining = Math.max(0, deadline - now)
    const cooldownUntil = await currentLaneCooldownUntil('image', ns)
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
      bucketNamespace: ns,
    })
    if (reserved.reserved) {
      const stopHeartbeat = startImageLeaseHeartbeat(token, ns)
      try {
        if (reserved.waitMs > 0) {
          console.log(`[Vertex Dispatch] ${ns}:image lease in ${reserved.waitMs}ms`)
          await sleepMs(reserved.waitMs, options.signal)
        }
      } catch (err) {
        stopHeartbeat()
        await releaseImageLeaseToken(token, ns)
        throw err
      }
      return async (mode: ImageLeaseReleaseMode = 'release') => {
        stopHeartbeat()
        if (mode === 'abandon') {
          console.warn(`[Vertex Dispatch] ${ns}:image lease abandoned`)
          return
        }
        await releaseImageLeaseToken(token, ns)
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
  options: { signal?: AbortSignal; now?: number; bucketNamespace?: string } = {}
): Promise<void> {
  const intervalMs = getVertexDispatchIntervalMs(lane)
  if (intervalMs <= 0) return

  const ns = normalizeBucketNamespace(options.bucketNamespace)
  const bucket = getNamespaceBucket(ns)
  const now = options.now ?? Date.now()
  const lastAt = bucket.lastOutboundFetchAt[lane]
  if (lastAt <= 0 || now >= lastAt + intervalMs) {
    bucket.lastOutboundFetchAt[lane] = now
    return
  }

  const startAt = lastAt + intervalMs
  const waitMs = startAt - now
  bucket.lastOutboundFetchAt[lane] = startAt
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
  namespaceBuckets.clear()
  heldLeaseTokens.clear()
  for (const timer of heartbeatTimers) clearInterval(timer)
  heartbeatTimers.clear()
  redisFallbackLogged = false
}
