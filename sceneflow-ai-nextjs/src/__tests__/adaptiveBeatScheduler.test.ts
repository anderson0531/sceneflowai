import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  getSceneExpressBeatConcurrency,
  getSceneExpressBeatMaxAttempts,
  runAdaptiveBeatPool,
} from '@/lib/sceneGeneration/adaptiveBeatScheduler'
import {
  isExpressBeatPoolRetryable,
  isExpressImageCanaryAbortError,
  isTransientExpressImageError,
} from '@/lib/sceneGeneration/expressImageErrors'

function rateLimitError() {
  return new Error('HTTP 429: RESOURCE_EXHAUSTED')
}

function gatewayTimeoutError() {
  const err = new Error('Scene image generation failed (HTTP 504)') as Error & {
    status: number
  }
  err.status = 504
  return err
}

function authError() {
  return new Error('HTTP 403: forbidden')
}

describe('getSceneExpressBeatConcurrency', () => {
  const prevBeat = process.env.SCENE_EXPRESS_BEAT_CONCURRENCY
  const prevFlash = process.env.VERTEX_GEMINI_FLASH_IMAGE_CONCURRENCY
  const prevImage = process.env.EXPRESS_IMAGE_CONCURRENCY
  const prevAttempts = process.env.SCENE_EXPRESS_BEAT_MAX_ATTEMPTS

  afterEach(() => {
    if (prevBeat === undefined) delete process.env.SCENE_EXPRESS_BEAT_CONCURRENCY
    else process.env.SCENE_EXPRESS_BEAT_CONCURRENCY = prevBeat
    if (prevFlash === undefined) delete process.env.VERTEX_GEMINI_FLASH_IMAGE_CONCURRENCY
    else process.env.VERTEX_GEMINI_FLASH_IMAGE_CONCURRENCY = prevFlash
    if (prevImage === undefined) delete process.env.EXPRESS_IMAGE_CONCURRENCY
    else process.env.EXPRESS_IMAGE_CONCURRENCY = prevImage
    if (prevAttempts === undefined) delete process.env.SCENE_EXPRESS_BEAT_MAX_ATTEMPTS
    else process.env.SCENE_EXPRESS_BEAT_MAX_ATTEMPTS = prevAttempts
  })

  it('defaults to 2 so two identity-ref frames can overlap', () => {
    delete process.env.SCENE_EXPRESS_BEAT_CONCURRENCY
    delete process.env.VERTEX_GEMINI_FLASH_IMAGE_CONCURRENCY
    delete process.env.EXPRESS_IMAGE_CONCURRENCY
    expect(getSceneExpressBeatConcurrency()).toBe(2)
  })

  it('defaults maxAttempts to 1', () => {
    delete process.env.SCENE_EXPRESS_BEAT_MAX_ATTEMPTS
    expect(getSceneExpressBeatMaxAttempts()).toBe(1)
  })

  it('reads SCENE_EXPRESS_BEAT_CONCURRENCY env', () => {
    process.env.SCENE_EXPRESS_BEAT_CONCURRENCY = '5'
    expect(getSceneExpressBeatConcurrency()).toBe(5)
  })
})

describe('runAdaptiveBeatPool', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs all beats successfully without exceeding max concurrency', async () => {
    let peak = 0
    let inFlight = 0

    const promise = runAdaptiveBeatPool(
      [0, 1, 2, 3],
      async () => {
        inFlight++
        peak = Math.max(peak, inFlight)
        await Promise.resolve()
        inFlight--
      },
      { initialConcurrency: 3, maxConcurrency: 3, maxAttempts: 2 }
    )

    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.succeeded.size).toBe(4)
    expect(result.failed.size).toBe(0)
    expect(peak).toBeLessThanOrEqual(3)
  })

  it('retries retryable errors and eventually succeeds', async () => {
    const attempts = new Map<number, number>()

    const promise = runAdaptiveBeatPool(
      [0],
      async () => {
        const n = (attempts.get(0) ?? 0) + 1
        attempts.set(0, n)
        if (n < 2) throw rateLimitError()
      },
      {
        initialConcurrency: 1,
        maxAttempts: 3,
        baseBackoffMs: 100,
        maxBackoffMs: 500,
        isRetryable: (err) => String(err).includes('429'),
      }
    )

    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.succeeded.has(0)).toBe(true)
    expect(attempts.get(0)).toBe(2)
  })

  it('records failed beats after exhausting attempts while others succeed', async () => {
    const promise = runAdaptiveBeatPool(
      [0, 1],
      async (beatIndex) => {
        if (beatIndex === 0) throw rateLimitError()
      },
      {
        initialConcurrency: 2,
        maxAttempts: 2,
        baseBackoffMs: 50,
        maxBackoffMs: 100,
        isRetryable: (err) => String(err).includes('429'),
      }
    )

    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.succeeded.has(1)).toBe(true)
    expect(result.failed.has(0)).toBe(true)
  })

  it('aborts on first non-retryable failure when canary enabled', async () => {
    const ran: number[] = []

    const promise = runAdaptiveBeatPool(
      [0, 1, 2],
      async (beatIndex) => {
        ran.push(beatIndex)
        if (beatIndex === 0) throw authError()
      },
      {
        initialConcurrency: 1,
        maxAttempts: 3,
        isRetryable: (err) => String(err).includes('429'),
        abortOnNonRetryableCanary: true,
      }
    )

    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.aborted?.beatIndex).toBe(0)
    expect(result.failed.has(0)).toBe(true)
    expect(ran).toEqual([0])
  })

  it('decreases concurrency on retryable failure and emits callback', async () => {
    const changes: Array<{ max: number; reason: string }> = []
    let call = 0

    const promise = runAdaptiveBeatPool(
      [0, 1],
      async () => {
        call++
        if (call === 1) throw rateLimitError()
      },
      {
        initialConcurrency: 3,
        maxConcurrency: 3,
        minConcurrency: 1,
        maxAttempts: 3,
        baseBackoffMs: 10,
        maxBackoffMs: 50,
        isRetryable: (err) => String(err).includes('429'),
        onConcurrencyChange: (max, reason) => changes.push({ max, reason }),
      }
    )

    await vi.runAllTimersAsync()
    await promise

    expect(changes.some((c) => c.reason === 'decrease')).toBe(true)
  })

  it('increases concurrency after success streak', async () => {
    const changes: Array<{ max: number; reason: string }> = []

    const promise = runAdaptiveBeatPool(
      [0, 1, 2, 3],
      async () => {},
      {
        initialConcurrency: 1,
        maxConcurrency: 3,
        minConcurrency: 1,
        successesToIncrease: 2,
        onConcurrencyChange: (max, reason) => changes.push({ max, reason }),
      }
    )

    await vi.runAllTimersAsync()
    await promise

    expect(changes.some((c) => c.reason === 'increase')).toBe(true)
  })

  it('retries 504 gateway timeout like 429', async () => {
    const attempts = new Map<number, number>()

    const promise = runAdaptiveBeatPool(
      [0],
      async () => {
        const n = (attempts.get(0) ?? 0) + 1
        attempts.set(0, n)
        if (n < 2) throw gatewayTimeoutError()
      },
      {
        initialConcurrency: 1,
        maxAttempts: 3,
        baseBackoffMs: 100,
        maxBackoffMs: 500,
        isRetryable: isTransientExpressImageError,
        isCanaryAbort: isExpressImageCanaryAbortError,
      }
    )

    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.succeeded.has(0)).toBe(true)
    expect(result.aborted).toBeUndefined()
    expect(attempts.get(0)).toBe(2)
  })

  it('does not canary abort on 504 and continues other beats', async () => {
    const ran: number[] = []

    const promise = runAdaptiveBeatPool(
      [0, 1, 2],
      async (beatIndex) => {
        ran.push(beatIndex)
        if (beatIndex === 0) throw gatewayTimeoutError()
      },
      {
        initialConcurrency: 2,
        maxAttempts: 1,
        isRetryable: isTransientExpressImageError,
        isCanaryAbort: isExpressImageCanaryAbortError,
      }
    )

    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.aborted).toBeUndefined()
    expect(result.failed.has(0)).toBe(true)
    expect(result.succeeded.has(1)).toBe(true)
    expect(result.succeeded.has(2)).toBe(true)
    expect(ran).toContain(1)
    expect(ran).toContain(2)
  })

  it('fails queued beats on canary abort and drains in-flight at concurrency 2', async () => {
    const ran: number[] = []

    const promise = runAdaptiveBeatPool(
      [0, 1, 2, 3, 4],
      async (beatIndex) => {
        ran.push(beatIndex)
        if (beatIndex === 0) throw authError()
      },
      {
        initialConcurrency: 2,
        maxAttempts: 3,
        isRetryable: isTransientExpressImageError,
        isCanaryAbort: isExpressImageCanaryAbortError,
      }
    )

    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.aborted?.beatIndex).toBe(0)
    expect(result.failed.has(0)).toBe(true)
    expect(result.failed.has(2)).toBe(true)
    expect(result.failed.has(3)).toBe(true)
    expect(result.failed.has(4)).toBe(true)
    expect(ran).toContain(1)
  })

  it('fail-fast maxAttempts=1 records a 429 and continues sibling beats', async () => {
    const ran: number[] = []

    const promise = runAdaptiveBeatPool(
      [0, 1, 2],
      async (beatIndex) => {
        ran.push(beatIndex)
        if (beatIndex === 0) throw rateLimitError()
      },
      {
        initialConcurrency: 1,
        maxAttempts: 1,
        isRetryable: isExpressBeatPoolRetryable,
        isCanaryAbort: isExpressImageCanaryAbortError,
      }
    )

    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.aborted).toBeUndefined()
    expect(result.failed.has(0)).toBe(true)
    expect(result.succeeded.has(1)).toBe(true)
    expect(result.succeeded.has(2)).toBe(true)
    expect(ran).toEqual([0, 1, 2])
  })

  it('does not retry identity-ref rate limit exhausted errors', async () => {
    let attempts = 0
    const exhausted = new Error(
      'Vertex Gemini Image error 429: identity-ref rate limit exhausted after 3 retries: RESOURCE_EXHAUSTED'
    )

    const promise = runAdaptiveBeatPool(
      [0],
      async () => {
        attempts += 1
        throw exhausted
      },
      {
        initialConcurrency: 1,
        maxAttempts: 3,
        isRetryable: isExpressBeatPoolRetryable,
        isCanaryAbort: isExpressImageCanaryAbortError,
      }
    )

    await vi.runAllTimersAsync()
    const result = await promise

    expect(attempts).toBe(1)
    expect(result.failed.has(0)).toBe(true)
    expect(result.aborted).toBeUndefined()
  })
})
