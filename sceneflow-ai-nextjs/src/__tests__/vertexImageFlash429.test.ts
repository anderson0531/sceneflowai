import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/vertexai/client', () => ({
  getVertexAIAuthToken: vi.fn().mockResolvedValue('test-token'),
}))

import { generateVertexGeminiImage } from '@/lib/vertexai/vertexImageClient'
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig'

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
