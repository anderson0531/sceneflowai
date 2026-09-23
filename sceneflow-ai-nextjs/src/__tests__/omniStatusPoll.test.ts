import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('google-auth-library', () => {
  class JWT {
    getAccessToken = vi.fn(async () => ({ token: 'test-token' }))
  }
  return { JWT }
})

import { waitForVideoCompletion } from '@/lib/gemini/videoClient'

const completedBody = {
  id: 'abc',
  status: 'completed',
  steps: [
    {
      type: 'model_output',
      content: [{ type: 'video', uri: 'https://example.com/clip.mp4', mime_type: 'video/mp4' }],
    },
  ],
}

describe('waitForVideoCompletion Omni status 429', () => {
  beforeEach(() => {
    process.env.VERTEX_PROJECT_ID = 'omni-poll-test'
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify({
      client_email: 'sa@example.com',
      private_key: 'test-key',
      project_id: 'omni-poll-test',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete process.env.VERTEX_PROJECT_ID
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  })

  it('waits retryAfter after a status 429 and then accepts the completed interaction', async () => {
    vi.useFakeTimers()
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1
        if (calls === 1) {
          return new Response(
            JSON.stringify({
              error: {
                message: 'Resource has been exhausted (e.g. check quota).',
                code: 'too_many_requests',
                retryAfter: 60,
              },
            }),
            { status: 429, headers: { 'retry-after': '60' } }
          )
        }
        return new Response(JSON.stringify(completedBody), { status: 200 })
      })
    )

    const pending = waitForVideoCompletion('interaction:abc', 240, 20)
    await vi.waitFor(() => expect(calls).toBe(1))
    await vi.advanceTimersByTimeAsync(59_000)
    expect(calls).toBe(1)
    await vi.advanceTimersByTimeAsync(1_000)
    const result = await pending

    expect(calls).toBe(2)
    expect(result.status).toBe('COMPLETED')
    expect(result.videoUrl).toBe('https://example.com/clip.mp4')
  })

  it('still fails immediately when the status check is not a 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not found', { status: 404 }))
    )

    const result = await waitForVideoCompletion('interaction:abc', 240, 20)

    expect(result.status).toBe('FAILED')
    expect(result.error).toContain('404')
  })
})
