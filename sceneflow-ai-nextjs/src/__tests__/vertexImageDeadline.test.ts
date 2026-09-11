import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/vertexai/client', () => ({
  getVertexAIAuthToken: vi.fn().mockResolvedValue('test-token'),
}))

import { generateVertexGeminiImage } from '@/lib/vertexai/vertexImageClient'

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
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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
})
