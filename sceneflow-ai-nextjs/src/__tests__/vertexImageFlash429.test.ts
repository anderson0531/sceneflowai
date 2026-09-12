import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/vertexai/client', () => ({
  getVertexAIAuthToken: vi.fn().mockResolvedValue('test-token'),
}))

import {
  generateVertexGeminiImage,
  IDENTITY_REF_RATE_LIMIT_EXHAUSTED,
} from '@/lib/vertexai/vertexImageClient'
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig'
import { isExpressBeatPoolRetryable } from '@/lib/sceneGeneration/expressImageErrors'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

function imageResponse(): Response {
  return jsonResponse({
    candidates: [
      {
        content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } }] },
      },
    ],
  })
}

function rateLimitResponse(retryAfterSeconds?: number): Response {
  return jsonResponse(
    {
      error: {
        code: 429,
        message: 'Resource exhausted. Please try again later.',
        status: 'RESOURCE_EXHAUSTED',
      },
    },
    {
      status: 429,
      headers: retryAfterSeconds != null ? { 'retry-after': String(retryAfterSeconds) } : undefined,
    }
  )
}

/** Abort timeouts stay real; 429 sleeps are recorded and flushed immediately. */
function captureBackoffDelays() {
  const delays: number[] = []
  const nativeSetTimeout = globalThis.setTimeout.bind(globalThis)
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
    handler: TimerHandler,
    ms?: number,
    ...args: unknown[]
  ) => {
    if (
      typeof handler === 'function' &&
      typeof ms === 'number' &&
      ms >= 1_000 &&
      ms < 90_000
    ) {
      delays.push(ms)
      handler()
      return 0 as unknown as ReturnType<typeof setTimeout>
    }
    return nativeSetTimeout(handler, ms, ...args)
  }) as typeof setTimeout)
  return delays
}

describe('flash 429 backoff uses the long ladder', () => {
  beforeEach(() => {
    process.env.VERTEX_PROJECT_ID = 'sceneflowai-test'
    delete process.env.VERTEX_GEMINI_IMAGE_PRO_MODEL
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('waits 5s then 15s between flash 429s before a successful retry', async () => {
    const delays = captureBackoffDelays()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rateLimitResponse())
      .mockResolvedValueOnce(rateLimitResponse())
      .mockResolvedValueOnce(imageResponse())
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateVertexGeminiImage({
      prompt: 'olive-drab aluminum cylinder on a studio sweep',
      modelTier: 'eco',
      aspectRatio: '1:1',
    })

    expect(result.imageBase64).toBe('aW1hZ2U=')
    expect(result.modelId).toBe(GEMINI_IMAGE_MODELS.flash)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(delays).toEqual([5_000, 15_000])
  })

  it('honors Retry-After when it is longer than the scheduled flash step', async () => {
    const delays = captureBackoffDelays()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rateLimitResponse(12))
      .mockResolvedValueOnce(imageResponse())
    vi.stubGlobal('fetch', fetchMock)

    await generateVertexGeminiImage({
      prompt: 'twin copper knife-switches',
      modelTier: 'eco',
    })

    expect(delays).toEqual([12_000])
  })

  it('does not fall back to the 2s/4s/8s generic ladder on flash', async () => {
    const delays = captureBackoffDelays()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rateLimitResponse())
      .mockResolvedValueOnce(imageResponse())
    vi.stubGlobal('fetch', fetchMock)

    await generateVertexGeminiImage({
      prompt: 'heavy gauge copper busbar',
      modelTier: 'eco',
    })

    expect(delays[0]).toBeGreaterThanOrEqual(5_000)
    expect(delays).not.toContain(2_000)
    expect(delays).not.toContain(4_000)
    expect(delays).not.toContain(8_000)
  })
})

describe('failFastOnRateLimit surrenders the lane on the first 429', () => {
  beforeEach(() => {
    process.env.VERTEX_PROJECT_ID = 'sceneflowai-test'
    delete process.env.VERTEX_GEMINI_IMAGE_PRO_MODEL
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('throws on the first eco 429 without sleeping', async () => {
    const delays = captureBackoffDelays()
    const fetchMock = vi.fn().mockResolvedValueOnce(rateLimitResponse())
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateVertexGeminiImage({
        prompt: 'pressure gauge needle at redline',
        modelTier: 'eco',
        failFastOnRateLimit: true,
        referenceImages: [{ base64Image: 'aW1hZ2U=', mimeType: 'image/jpeg', name: 'Elara' }],
      })
    ).rejects.toThrow(/after 1 attempt\(s\)/)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(delays).toEqual([])
  })

  it('throws on the first 503 without retrying', async () => {
    const delays = captureBackoffDelays()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('upstream unavailable', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateVertexGeminiImage({
        prompt: 'pressure gauge needle at redline',
        modelTier: 'eco',
        failFastOnRateLimit: true,
      })
    ).rejects.toThrow(/503/)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(delays).toEqual([])
  })

  it('throws on timeout without eco fallback or inner retry', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    const fetchMock = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateVertexGeminiImage({
        prompt: 'empty hall, no figures',
        modelTier: 'designer',
        failFastOnRateLimit: true,
      })
    ).rejects.toThrow(/aborted/i)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('marks identity-ref fail-fast 429s as pool-retryable', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(rateLimitResponse())
    vi.stubGlobal('fetch', fetchMock)

    let thrown: unknown
    try {
      await generateVertexGeminiImage({
        prompt: 'pressure gauge needle at redline',
        modelTier: 'eco',
        failFastOnRateLimit: true,
        referenceImages: [{ base64Image: 'aW1hZ2U=', mimeType: 'image/jpeg', name: 'Elara' }],
      })
    } catch (err) {
      thrown = err
    }

    expect(String((thrown as Error).message)).toContain(IDENTITY_REF_RATE_LIMIT_EXHAUSTED)
    expect(isExpressBeatPoolRetryable(thrown)).toBe(true)
  })
})
