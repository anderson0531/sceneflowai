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
