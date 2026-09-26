import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_IMAGE_LEASE_TTL_MS,
  IMAGE_LEASE_POLL_MS,
  VERTEX_DISPATCH_EVAL_SCRIPT,
  VERTEX_IMAGE_LEASE_EVAL_SCRIPT,
  acquireImageGenerationLease,
  acquireVertexDispatchSlot,
  getImageLeaseTtlMs,
  getVertexDispatchIntervalMs,
  getVertexDispatchMaxWaitMs,
  reserveDispatchSlot,
  reserveImageLease,
  resetVertexDispatchBucketForTests,
  vertexDispatchKey,
  vertexImageLeaseKey,
  VertexDispatchDeferredError,
} from '@/lib/vertexai/vertexDispatchBucket'

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

describe('reserveDispatchSlot', () => {
  it('gives simultaneous callers 0, interval, and 2×interval', () => {
    const now = 1_700_000_000_000
    const intervalMs = 2_000
    const first = reserveDispatchSlot({ now, nextAt: 0, intervalMs, maxWaitMs: 20_000 })
    const second = reserveDispatchSlot({
      now,
      nextAt: first.nextAt,
      intervalMs,
      maxWaitMs: 20_000,
    })
    const third = reserveDispatchSlot({
      now,
      nextAt: second.nextAt,
      intervalMs,
      maxWaitMs: 20_000,
    })

    expect(first).toEqual({ nextAt: now + intervalMs, waitMs: 0, reserved: true })
    expect(second).toEqual({ nextAt: now + intervalMs * 2, waitMs: intervalMs, reserved: true })
    expect(third.waitMs).toBe(intervalMs * 2)
    expect(third.reserved).toBe(true)
  })

  it('refuses a wait past the deadline without moving the next start', () => {
    const now = 5_000
    const nextAt = 9_000
    const refused = reserveDispatchSlot({
      now,
      nextAt,
      intervalMs: 2_000,
      maxWaitMs: 1_000,
    })
    expect(refused.reserved).toBe(false)
    expect(refused.nextAt).toBe(nextAt)
    expect(refused.waitMs).toBe(4_000)

    const accepted = reserveDispatchSlot({
      now,
      nextAt,
      intervalMs: 2_000,
      maxWaitMs: 4_000,
    })
    expect(accepted.reserved).toBe(true)
    expect(accepted.waitMs).toBe(4_000)
  })
})

describe('acquireVertexDispatchSlot', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS
    envBackup.VERTEX_VIDEO_DISPATCH_INTERVAL_MS = process.env.VERTEX_VIDEO_DISPATCH_INTERVAL_MS
    envBackup.VERTEX_DISPATCH_MAX_WAIT_MS = process.env.VERTEX_DISPATCH_MAX_WAIT_MS
    envBackup.KV_REST_API_URL = process.env.KV_REST_API_URL
    envBackup.KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN
    envBackup.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
    envBackup.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    resetVertexDispatchBucketForTests()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    restoreEnv('VERTEX_IMAGE_DISPATCH_INTERVAL_MS', envBackup.VERTEX_IMAGE_DISPATCH_INTERVAL_MS)
    restoreEnv('VERTEX_VIDEO_DISPATCH_INTERVAL_MS', envBackup.VERTEX_VIDEO_DISPATCH_INTERVAL_MS)
    restoreEnv('VERTEX_DISPATCH_MAX_WAIT_MS', envBackup.VERTEX_DISPATCH_MAX_WAIT_MS)
    restoreEnv('KV_REST_API_URL', envBackup.KV_REST_API_URL)
    restoreEnv('KV_REST_API_TOKEN', envBackup.KV_REST_API_TOKEN)
    restoreEnv('UPSTASH_REDIS_REST_URL', envBackup.UPSTASH_REDIS_REST_URL)
    restoreEnv('UPSTASH_REDIS_REST_TOKEN', envBackup.UPSTASH_REDIS_REST_TOKEN)
    resetVertexDispatchBucketForTests()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('defaults to 2000ms for images and 5000ms for video, and 0 disables the lane', () => {
    delete process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS
    delete process.env.VERTEX_VIDEO_DISPATCH_INTERVAL_MS
    delete process.env.VERTEX_DISPATCH_MAX_WAIT_MS
    expect(getVertexDispatchIntervalMs('image')).toBe(2_000)
    expect(getVertexDispatchIntervalMs('video')).toBe(5_000)
    expect(getVertexDispatchMaxWaitMs()).toBe(20_000)

    process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = '0'
    return acquireVertexDispatchSlot('image', { now: 1 }).then(() =>
      acquireVertexDispatchSlot('image', { now: 1, maxWaitMs: 0 })
    )
  })

  it('sleeps the second in-process caller and does not reserve a slot past the deadline', async () => {
    vi.useFakeTimers()
    process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = '2000'
    const now = 1_700_000_000_000

    await acquireVertexDispatchSlot('image', { now, maxWaitMs: 20_000 })

    let finished = false
    const second = acquireVertexDispatchSlot('image', { now, maxWaitMs: 20_000 }).then(() => {
      finished = true
    })
    await Promise.resolve()
    expect(finished).toBe(false)
    await vi.advanceTimersByTimeAsync(2_000)
    await second
    expect(finished).toBe(true)

    await expect(
      acquireVertexDispatchSlot('image', { now, maxWaitMs: 1_000 })
    ).rejects.toBeInstanceOf(VertexDispatchDeferredError)

    const afterRefuse = acquireVertexDispatchSlot('image', { now, maxWaitMs: 4_000 })
    await vi.advanceTimersByTimeAsync(4_000)
    await afterRefuse
  })

  it('posts the shared eval script and sleeps the wait Redis returns', async () => {
    vi.useFakeTimers()
    process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = '2000'
    process.env.KV_REST_API_URL = 'https://example.upstash.io'
    process.env.KV_REST_API_TOKEN = 'token'
    const now = 1_700_000_000_000
    let nextAt = 0
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(String(url)).toBe('https://example.upstash.io/eval')
      const body = JSON.parse(String(init?.body)) as {
        script: string
        keys: string[]
        arguments: string[]
      }
      expect(body.script).toBe(VERTEX_DISPATCH_EVAL_SCRIPT)
      expect(body.keys).toEqual([vertexDispatchKey('image')])
      const reserved = reserveDispatchSlot({
        now: Number(body.arguments[0]),
        nextAt,
        intervalMs: Number(body.arguments[1]),
        maxWaitMs: Number(body.arguments[2]),
      })
      if (reserved.reserved) nextAt = reserved.nextAt
      return new Response(
        JSON.stringify({
          result: [reserved.waitMs, reserved.nextAt, reserved.reserved ? 1 : 0],
        }),
        { status: 200 }
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const refuseAt = VERTEX_DISPATCH_EVAL_SCRIPT.indexOf('if wait > maxWait then')
    const writeAt = VERTEX_DISPATCH_EVAL_SCRIPT.indexOf("redis.call('SET'")
    expect(refuseAt).toBeGreaterThan(-1)
    expect(writeAt).toBeGreaterThan(refuseAt)
    expect(VERTEX_DISPATCH_EVAL_SCRIPT).toContain('math.max(now, nextAt)')
    expect(VERTEX_DISPATCH_EVAL_SCRIPT).toContain('start + interval')

    await acquireVertexDispatchSlot('image', { now, maxWaitMs: 20_000 })
    const second = acquireVertexDispatchSlot('image', { now, maxWaitMs: 20_000 })
    await vi.advanceTimersByTimeAsync(2_000)
    await second
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(nextAt).toBe(now + 4_000)
  })

  it('falls back to the in-process metronome when Redis eval fails', async () => {
    vi.useFakeTimers()
    process.env.VERTEX_VIDEO_DISPATCH_INTERVAL_MS = '5000'
    process.env.KV_REST_API_URL = 'https://example.upstash.io'
    process.env.KV_REST_API_TOKEN = 'token'
    const fetchMock = vi.fn().mockRejectedValue(new Error('redis down'))
    vi.stubGlobal('fetch', fetchMock)
    const now = 50_000

    await acquireVertexDispatchSlot('video', { now, maxWaitMs: 20_000 })
    const second = acquireVertexDispatchSlot('video', { now, maxWaitMs: 20_000 })
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(5_000)
    await second
    expect(fetchMock).toHaveBeenCalled()
  })
})

describe('reserveImageLease', () => {
  const now = 1_700_000_000_000
  const leaseTtlMs = 300_000

  it('holds two, keeps the start gap, and does not admit a third', () => {
    const first = reserveImageLease({
      now,
      nextAt: 0,
      leases: [],
      intervalMs: 2_000,
      maxWaitMs: 20_000,
      maxInFlight: 2,
      leaseTtlMs,
      token: 'a',
    })
    const second = reserveImageLease({
      now,
      nextAt: first.nextAt,
      leases: first.leases,
      intervalMs: 2_000,
      maxWaitMs: 20_000,
      maxInFlight: 2,
      leaseTtlMs,
      token: 'b',
    })
    const third = reserveImageLease({
      now,
      nextAt: second.nextAt,
      leases: second.leases,
      intervalMs: 2_000,
      maxWaitMs: 20_000,
      maxInFlight: 2,
      leaseTtlMs,
      token: 'c',
    })

    expect(first.reserved).toBe(true)
    expect(first.waitMs).toBe(0)
    expect(second.reserved).toBe(true)
    expect(second.waitMs).toBe(2_000)
    expect(second.leases.map((lease) => lease.token)).toEqual(['a', 'b'])
    expect(third.reserved).toBe(false)
    expect(third.reason).toBe('full')
    expect(third.leases.map((lease) => lease.token)).toEqual(['a', 'b'])
    expect(third.nextAt).toBe(second.nextAt)
  })

  it('refuses a start gap past the deadline without taking a lease', () => {
    const refused = reserveImageLease({
      now: 5_000,
      nextAt: 9_000,
      leases: [],
      intervalMs: 2_000,
      maxWaitMs: 1_000,
      maxInFlight: 2,
      leaseTtlMs,
      token: 'a',
    })
    expect(refused.reason).toBe('gap')
    expect(refused.reserved).toBe(false)
    expect(refused.leases).toEqual([])
    expect(refused.nextAt).toBe(9_000)
  })

  it('frees an expired lease before admitting the next still', () => {
    const expired = reserveImageLease({
      now: now + leaseTtlMs,
      nextAt: now + 2_000,
      leases: [{ token: 'a', expiresAt: now + leaseTtlMs }],
      intervalMs: 2_000,
      maxWaitMs: 20_000,
      maxInFlight: 1,
      leaseTtlMs,
      token: 'b',
    })
    expect(expired.reserved).toBe(true)
    expect(expired.leases.map((lease) => lease.token)).toEqual(['b'])
  })

  it('checks the lease before writing the start gap', () => {
    const fullAt = VERTEX_IMAGE_LEASE_EVAL_SCRIPT.indexOf('if inflight >= maxInFlight then')
    const gapAt = VERTEX_IMAGE_LEASE_EVAL_SCRIPT.indexOf('if wait > maxWait then')
    const writeAt = VERTEX_IMAGE_LEASE_EVAL_SCRIPT.indexOf("redis.call('SET'")
    const addAt = VERTEX_IMAGE_LEASE_EVAL_SCRIPT.indexOf("redis.call('ZADD'")
    expect(fullAt).toBeGreaterThan(-1)
    expect(gapAt).toBeGreaterThan(fullAt)
    expect(writeAt).toBeGreaterThan(gapAt)
    expect(addAt).toBeGreaterThan(writeAt)
    expect(VERTEX_IMAGE_LEASE_EVAL_SCRIPT).toContain('ZREMRANGEBYSCORE')
    expect(VERTEX_IMAGE_LEASE_EVAL_SCRIPT).toContain(vertexImageLeaseKey() ? 'ZCARD' : 'ZCARD')
  })
})

describe('acquireImageGenerationLease', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS
    envBackup.VERTEX_IMAGE_MAX_CONCURRENCY = process.env.VERTEX_IMAGE_MAX_CONCURRENCY
    envBackup.VERTEX_IMAGE_LEASE_TTL_MS = process.env.VERTEX_IMAGE_LEASE_TTL_MS
    envBackup.KV_REST_API_URL = process.env.KV_REST_API_URL
    envBackup.KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN
    envBackup.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
    envBackup.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.VERTEX_IMAGE_MAX_CONCURRENCY
    delete process.env.VERTEX_IMAGE_LEASE_TTL_MS
    process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = '1000'
    resetVertexDispatchBucketForTests()
    vi.useFakeTimers()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    restoreEnv('VERTEX_IMAGE_DISPATCH_INTERVAL_MS', envBackup.VERTEX_IMAGE_DISPATCH_INTERVAL_MS)
    restoreEnv('VERTEX_IMAGE_MAX_CONCURRENCY', envBackup.VERTEX_IMAGE_MAX_CONCURRENCY)
    restoreEnv('VERTEX_IMAGE_LEASE_TTL_MS', envBackup.VERTEX_IMAGE_LEASE_TTL_MS)
    restoreEnv('KV_REST_API_URL', envBackup.KV_REST_API_URL)
    restoreEnv('KV_REST_API_TOKEN', envBackup.KV_REST_API_TOKEN)
    restoreEnv('UPSTASH_REDIS_REST_URL', envBackup.UPSTASH_REDIS_REST_URL)
    restoreEnv('UPSTASH_REDIS_REST_TOKEN', envBackup.UPSTASH_REDIS_REST_TOKEN)
    resetVertexDispatchBucketForTests()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('defaults the lease ttl to the generate-image route budget', () => {
    expect(DEFAULT_IMAGE_LEASE_TTL_MS).toBe(300_000)
    expect(getImageLeaseTtlMs()).toBe(300_000)
    expect(IMAGE_LEASE_POLL_MS).toBe(250)
  })

  it('lets the first completion start one still and the second completion start one more', async () => {
    const first = await acquireImageGenerationLease({ maxWaitMs: 20_000 })
    const secondPromise = acquireImageGenerationLease({ maxWaitMs: 20_000 })
    await vi.advanceTimersByTimeAsync(1_000)
    const second = await secondPromise

    const started: string[] = []
    const thirdPromise = acquireImageGenerationLease({ maxWaitMs: 20_000 }).then((release) => {
      started.push('third')
      return release
    })
    const fourthPromise = acquireImageGenerationLease({ maxWaitMs: 20_000 }).then((release) => {
      started.push('fourth')
      return release
    })

    await vi.advanceTimersByTimeAsync(100)
    expect(started).toEqual([])

    await first()
    await vi.advanceTimersByTimeAsync(IMAGE_LEASE_POLL_MS + 1_000)
    expect(started).toEqual(['third'])

    await second()
    await vi.advanceTimersByTimeAsync(IMAGE_LEASE_POLL_MS + 1_000)
    expect(started).toEqual(['third', 'fourth'])

    const third = await thirdPromise
    const fourth = await fourthPromise
    await third()
    await fourth()
  })
})
