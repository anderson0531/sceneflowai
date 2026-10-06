import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/vertexai/client', () => ({
  getVertexAIAuthToken: vi.fn().mockResolvedValue('test-token'),
}))

import { generateVertexGeminiImage } from '@/lib/vertexai/vertexImageClient'
import {
  acquireImageGenerationLease,
  IMAGE_LEASE_POLL_MS,
  resetVertexDispatchBucketForTests,
} from '@/lib/vertexai/vertexDispatchBucket'

function imageResponse() {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } }],
          },
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

describe('generateVertexGeminiImage deadlines', () => {
  beforeEach(() => {
    process.env.VERTEX_PROJECT_ID = 'sceneflowai-test'
  })

  afterEach(() => {
    resetVertexDispatchBucketForTests()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS
  })

  it('refuses to start a request after the caller deadline has passed', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateVertexGeminiImage({
        prompt: 'a lantern on a workbench',
        deadlineAt: Date.now() - 1,
      })
    ).rejects.toThrow(/deadline exceeded/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shortens its request timeout to land inside the deadline', async () => {
    let abortAfterMs = -1
    const originalSetTimeout = globalThis.setTimeout
    vi.stubGlobal('setTimeout', ((fn: () => void, ms?: number) => {
      if (abortAfterMs < 0) abortAfterMs = ms ?? 0
      return originalSetTimeout(fn, ms)
    }) as typeof setTimeout)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse()))

    await generateVertexGeminiImage({
      prompt: 'a lantern on a workbench',
      deadlineAt: Date.now() + 30_000,
    })

    // The client's own 90s ceiling would have outlived the caller's 30s window.
    expect(abortAfterMs).toBeGreaterThan(25_000)
    expect(abortAfterMs).toBeLessThanOrEqual(30_000)
  })

  it('holds a fail-fast identity-ref pro still until the route deadline', async () => {
    let abortAfterMs = -1
    const originalSetTimeout = globalThis.setTimeout
    vi.stubGlobal('setTimeout', ((fn: () => void, ms?: number) => {
      if (abortAfterMs < 0) abortAfterMs = ms ?? 0
      return originalSetTimeout(fn, ms)
    }) as typeof setTimeout)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse()))

    await generateVertexGeminiImage({
      prompt: 'Gideon at the mail tube',
      modelTier: 'designer',
      failFastOnRateLimit: true,
      referenceImages: [{ base64Image: 'aW1hZ2U=', mimeType: 'image/png', name: 'identity' }],
      deadlineAt: Date.now() + 180_000,
    })

    expect(abortAfterMs).toBeGreaterThan(90_000)
    expect(abortAfterMs).toBeLessThanOrEqual(180_000)
  })

  it('keeps its full timeout when no deadline is given', async () => {
    let abortAfterMs = -1
    const originalSetTimeout = globalThis.setTimeout
    vi.stubGlobal('setTimeout', ((fn: () => void, ms?: number) => {
      if (abortAfterMs < 0) abortAfterMs = ms ?? 0
      return originalSetTimeout(fn, ms)
    }) as typeof setTimeout)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse()))

    await generateVertexGeminiImage({ prompt: 'a lantern on a workbench' })

    expect(abortAfterMs).toBe(90_000)
  })

  it('stops retrying a 503 once the deadline has passed', async () => {
    // The upstream call itself consumes the deadline, so by the time the 503
    // comes back there is no budget left for the backoff ladder.
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(new Response('upstream unavailable', { status: 503 })), 40)
        )
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateVertexGeminiImage({
        prompt: 'a lantern on a workbench',
        deadlineAt: Date.now() + 20,
      })
    ).rejects.toThrow(/503/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries a 503 while the deadline still allows it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('upstream unavailable', { status: 503 }))
      .mockResolvedValueOnce(imageResponse())
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateVertexGeminiImage({
      prompt: 'a lantern on a workbench',
      deadlineAt: Date.now() + 60_000,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.imageBase64).toBe('aW1hZ2U=')
  })

  it('cancels the outbound Vertex fetch when the parent signal aborts', async () => {
    const parent = new AbortController()
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const onAbort = () => {
          const err = new Error('The operation was aborted')
          err.name = 'AbortError'
          reject(err)
        }
        if (init?.signal?.aborted) {
          onAbort()
          return
        }
        init?.signal?.addEventListener('abort', onAbort, { once: true })
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const pending = generateVertexGeminiImage({
      prompt: 'a lantern on a workbench',
      signal: parent.signal,
    })
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    parent.abort()
    await expect(pending).rejects.toThrow(/abortedByClient/)
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('keeps the shared slot after its own timeout and frees it on cancel', async () => {
    process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = '1'
    resetVertexDispatchBucketForTests()
    vi.useFakeTimers()

    const hangUntilAbort = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const onAbort = () => {
          const err = new Error('The operation was aborted')
          err.name = 'AbortError'
          reject(err)
        }
        if (init?.signal?.aborted) {
          onAbort()
          return
        }
        init?.signal?.addEventListener('abort', onAbort, { once: true })
      })
    })
    vi.stubGlobal('fetch', hangUntilAbort)

    const timedOut = generateVertexGeminiImage({
      prompt: 'a slow identity still',
      modelTier: 'designer',
      failFastOnRateLimit: true,
      referenceImages: [{ base64Image: 'aW1hZ2U=', mimeType: 'image/png', name: 'identity' }],
      deadlineAt: Date.now() + 500,
    })
    const timeoutResult = timedOut.then(
      () => 'resolved',
      (err: unknown) => err
    )
    await vi.advanceTimersByTimeAsync(500)
    const timeoutError = await timeoutResult
    expect(timeoutError).toBeInstanceOf(Error)
    expect((timeoutError as Error).name).toBe('AbortError')

    const secondPromise = acquireImageGenerationLease({ maxWaitMs: 1_000 })
    await vi.advanceTimersByTimeAsync(20)
    const second = await secondPromise
    let thirdStarted = false
    const third = acquireImageGenerationLease({ maxWaitMs: 1_000 }).then((release) => {
      thirdStarted = true
      return release
    })
    await vi.advanceTimersByTimeAsync(IMAGE_LEASE_POLL_MS + 20)
    expect(thirdStarted).toBe(false)
    await second()
    await vi.advanceTimersByTimeAsync(IMAGE_LEASE_POLL_MS + 20)
    const thirdRelease = await third
    expect(thirdStarted).toBe(true)
    await thirdRelease()
    vi.useRealTimers()
  })

  it('frees the shared slot when the Stills Agent cancels', async () => {
    process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = '1'
    resetVertexDispatchBucketForTests()
    vi.useFakeTimers()

    const hangUntilAbort = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const onAbort = () => {
          const err = new Error('The operation was aborted')
          err.name = 'AbortError'
          reject(err)
        }
        if (init?.signal?.aborted) {
          onAbort()
          return
        }
        init?.signal?.addEventListener('abort', onAbort, { once: true })
      })
    })
    vi.stubGlobal('fetch', hangUntilAbort)

    const parent = new AbortController()
    const cancelled = generateVertexGeminiImage({
      prompt: 'a cancelled still',
      signal: parent.signal,
      deadlineAt: Date.now() + 60_000,
    })
    const cancelResult = cancelled.then(
      () => 'resolved',
      (err: unknown) => err
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(hangUntilAbort).toHaveBeenCalled()
    parent.abort()
    await vi.advanceTimersByTimeAsync(0)
    const cancelError = await cancelResult
    expect(cancelError).toBeInstanceOf(Error)
    expect(String((cancelError as Error).message)).toMatch(/abortedByClient/)

    let admitted = 0
    const firstAdmit = acquireImageGenerationLease({ maxWaitMs: 1_000 }).then((release) => {
      admitted += 1
      return release
    })
    const secondAdmit = acquireImageGenerationLease({ maxWaitMs: 1_000 }).then((release) => {
      admitted += 1
      return release
    })
    await vi.advanceTimersByTimeAsync(20)
    expect(admitted).toBe(2)
    const releaseFirst = await firstAdmit
    const releaseSecond = await secondAdmit
    await releaseFirst()
    await releaseSecond()
    vi.useRealTimers()
  })

  it('pauses the next admit after a fail-fast identity-ref 429', async () => {
    process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = '1'
    resetVertexDispatchBucketForTests()
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('RESOURCE_EXHAUSTED', { status: 429 }))
    )

    const failed = generateVertexGeminiImage({
      prompt: 'Gideon at the mail tube',
      modelTier: 'designer',
      failFastOnRateLimit: true,
      referenceImages: [{ base64Image: 'aW1hZ2U=', mimeType: 'image/png', name: 'identity' }],
      deadlineAt: Date.now() + 60_000,
    })
    const failure = failed.then(
      () => 'resolved',
      (err: unknown) => err
    )
    await vi.advanceTimersByTimeAsync(0)
    const error = await failure
    expect(error).toBeInstanceOf(Error)
    expect(String((error as Error).message)).toMatch(/identity-ref rate limit exhausted/)

    let started = false
    const next = acquireImageGenerationLease({ maxWaitMs: 20_000 }).then((release) => {
      started = true
      return release
    })
    await vi.advanceTimersByTimeAsync(14_000)
    expect(started).toBe(false)
    await vi.advanceTimersByTimeAsync(1_050)
    const release = await next
    expect(started).toBe(true)
    await release()
    vi.useRealTimers()
  })

  it('refuses to dispatch when the parent signal is already aborted', async () => {
    const parent = new AbortController()
    parent.abort()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateVertexGeminiImage({
        prompt: 'a lantern on a workbench',
        signal: parent.signal,
      })
    ).rejects.toThrow(/abortedByClient/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
