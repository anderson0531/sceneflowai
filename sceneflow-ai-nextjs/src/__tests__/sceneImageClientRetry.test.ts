import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchSceneGenerateImageWith429Retry,
  isSceneImageQuotaResponse,
  MAX_SCENE_IMAGE_CLIENT_429_RETRIES,
} from '@/lib/vision/sceneImageClientRetry'

describe('sceneImageClientRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('detects quota responses', () => {
    expect(isSceneImageQuotaResponse(429, {})).toBe(true)
    expect(isSceneImageQuotaResponse(500, { errorType: 'quota' })).toBe(true)
    expect(isSceneImageQuotaResponse(500, { retryable: true })).toBe(true)
    expect(isSceneImageQuotaResponse(500, { errorType: 'api' })).toBe(false)
  })

  it('retries on 429 then succeeds', async () => {
    let call = 0
    const fetchMock = vi.fn().mockImplementation(() => {
      call += 1
      if (call === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'quota', retryable: true }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      }
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, imageUrl: 'https://example.com/a.png' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const onRetryScheduled = vi.fn()
    const promise = fetchSceneGenerateImageWith429Retry(
      { projectId: 'p1', sceneIndex: 0 },
      { onRetryScheduled }
    )

    await vi.runAllTimersAsync()
    const { response, data } = await promise

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(onRetryScheduled).toHaveBeenCalledWith(
      1,
      MAX_SCENE_IMAGE_CLIENT_429_RETRIES,
      expect.any(Number)
    )
    expect(response.status).toBe(200)
    expect(data.imageUrl).toBe('https://example.com/a.png')
  })

  it('returns final 429 after retries exhausted', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ errorType: 'quota', retryable: true }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const promise = fetchSceneGenerateImageWith429Retry({ projectId: 'p1' })
    await vi.runAllTimersAsync()
    const { response, data } = await promise

    expect(fetchMock).toHaveBeenCalledTimes(MAX_SCENE_IMAGE_CLIENT_429_RETRIES + 1)
    expect(response.status).toBe(429)
    expect(data.errorType).toBe('quota')
  })
})
