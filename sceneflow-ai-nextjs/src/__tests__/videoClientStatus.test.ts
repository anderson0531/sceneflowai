import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('google-auth-library', () => ({
  JWT: vi.fn().mockImplementation(() => ({
    getAccessToken: vi.fn().mockResolvedValue({ token: 'test-token' }),
  })),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('checkVideoGenerationStatus Veo LRO polling', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    mockFetch.mockReset()
    process.env = {
      ...originalEnv,
      VERTEX_PROJECT_ID: 'test-project',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: JSON.stringify({
        client_email: 'test@test.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
        project_id: 'test-project',
      }),
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ done: false }),
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('polls fetchPredictOperation with model and region from operation name', async () => {
    const { checkVideoGenerationStatus } = await import('@/lib/gemini/videoClient')

    const operationName =
      'projects/test-project/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/op-id'

    const result = await checkVideoGenerationStatus(operationName)

    expect(result.status).not.toBe('FAILED')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('us-central1-aiplatform.googleapis.com')
    expect(url).toContain('/models/veo-3.1-generate-001:fetchPredictOperation')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ operationName })
  })
})

describe('Omni Interactions request', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    mockFetch.mockReset()
    process.env = {
      ...originalEnv,
      VERTEX_PROJECT_ID: 'test-project',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: JSON.stringify({
        client_email: 'test@test.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
        project_id: 'test-project',
      }),
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('does not send frame_rate, thinking_level, or multi_shot', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'v1_ok', status: 'in_progress' }),
      text: async () => '',
    })
    const { generateVideoWithVeo } = await import('@/lib/gemini/videoClient')
    await generateVideoWithVeo('A quiet alley at dusk.', {
      preferOmni: true,
      frameRate: 24,
      thinkingLevel: 'low',
      omniMultiShot: true,
      durationSeconds: 8,
    })
    const body = JSON.parse(String(mockFetch.mock.calls[0][1].body)) as Record<string, unknown>
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain('frame_rate')
    expect(serialized).not.toContain('thinking_level')
    expect(serialized).not.toContain('multi_shot')
    expect(String(body.input)).toContain('Cinematic multi-shot sequence')
    expect((body.response_format as { delivery?: string }).delivery).toBe('inline')
  })

  it('retries a delivery 400 once without delivery', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: 'Unknown field: delivery' } }),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'v1_retry', status: 'in_progress' }),
        text: async () => '',
      })
    const { generateVideoWithVeo } = await import('@/lib/gemini/videoClient')
    const result = await generateVideoWithVeo('A quiet alley at dusk.', {
      preferOmni: true,
      durationSeconds: 8,
    })
    expect(result.status).not.toBe('FAILED')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const retryBody = JSON.parse(String(mockFetch.mock.calls[1][1].body)) as {
      response_format: Record<string, unknown>
    }
    expect(retryBody.response_format.delivery).toBeUndefined()
  })
})
