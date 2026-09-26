import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/gemini/videoClient', () => ({
  generateVideoWithVeo: vi.fn(),
  waitForVideoCompletion: vi.fn(),
  downloadVideoFile: vi.fn(),
}))

vi.mock('@/lib/gemini/geminiStudioVideoClient', () => ({
  generateVideoWithGeminiStudio: vi.fn(),
  waitForGeminiVideoCompletion: vi.fn(),
  downloadGeminiVideoFile: vi.fn(),
}))

import { generateVideoWithVeo } from '@/lib/gemini/videoClient'
import {
  generateProductionVideo,
  getEndpointStatus,
  resetProductionVideoQuotaStateForTests,
} from '@/lib/gemini/productionVideoClient'
import {
  acquireVertexDispatchSlot,
  resetVertexDispatchBucketForTests,
} from '@/lib/vertexai/vertexDispatchBucket'
import { VERTEX_INTERACTIONS_TOO_MANY_REQUESTS } from '@/lib/gemini/vertexRateLimit'

describe('generateProductionVideo failover', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.VERTEX_PROJECT_ID = process.env.VERTEX_PROJECT_ID
    envBackup.VERTEX_PROJECT_IDS = process.env.VERTEX_PROJECT_IDS
    envBackup.VEO_REGIONS = process.env.VEO_REGIONS
    envBackup.VEO_LOCATION = process.env.VEO_LOCATION
    envBackup.USE_GEMINI_PRIMARY = process.env.USE_GEMINI_PRIMARY
    process.env.VERTEX_PROJECT_ID = 'omni-failover-test-project'
    delete process.env.VERTEX_PROJECT_IDS
    process.env.VEO_REGIONS = 'us-central1'
    delete process.env.USE_GEMINI_PRIMARY
    process.env.VERTEX_VIDEO_DISPATCH_INTERVAL_MS = '0'
    delete process.env.VERTEX_DISPATCH_MAX_WAIT_MS
    resetProductionVideoQuotaStateForTests()
    resetVertexDispatchBucketForTests()
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.VERTEX_PROJECT_ID = envBackup.VERTEX_PROJECT_ID
    process.env.VERTEX_PROJECT_IDS = envBackup.VERTEX_PROJECT_IDS
    process.env.VEO_REGIONS = envBackup.VEO_REGIONS
    process.env.VEO_LOCATION = envBackup.VEO_LOCATION
    process.env.USE_GEMINI_PRIMARY = envBackup.USE_GEMINI_PRIMARY
    resetProductionVideoQuotaStateForTests()
  })

  it('does not POST Omni again when the only region returns 429', async () => {
    vi.mocked(generateVideoWithVeo).mockResolvedValue({
      status: 'FAILED',
      error: 'Vertex AI Interactions error 429: rate limit',
    })

    const result = await generateProductionVideo('a quiet street', {
      forceProvider: 'vertex',
      preferOmni: true,
    })

    expect(generateVideoWithVeo).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('FAILED')
    expect(result.region).toBe('global')
    expect(result.error).toMatch(/429/)
  })

  it('records an Interactions too_many_requests 429 on global and does not POST again', async () => {
    process.env.VEO_REGIONS = 'us-central1,europe-west1'
    vi.mocked(generateVideoWithVeo).mockResolvedValue({
      status: 'FAILED',
      error: VERTEX_INTERACTIONS_TOO_MANY_REQUESTS,
    })

    const result = await generateProductionVideo('a quiet street', {
      forceProvider: 'vertex',
      preferOmni: true,
    })

    expect(generateVideoWithVeo).toHaveBeenCalledTimes(1)
    expect(result.region).toBe('global')
    expect(result.error).toBe(VERTEX_INTERACTIONS_TOO_MANY_REQUESTS)
    expect(result.error).toContain('too_many_requests')

    const status = getEndpointStatus(['global'])
    expect(status['omni-failover-test-project']?.global?.rateLimited).toBe(true)
    expect(status['omni-failover-test-project']?.global?.available).toBe(false)

    vi.mocked(generateVideoWithVeo).mockClear()
    const followUp = await generateProductionVideo('a quiet street', {
      forceProvider: 'vertex',
      preferOmni: true,
    })

    expect(generateVideoWithVeo).not.toHaveBeenCalled()
    expect(followUp.status).toBe('FAILED')
    expect(followUp.error).toBe(VERTEX_INTERACTIONS_TOO_MANY_REQUESTS)
    expect(followUp.region).toBe('global')
  })

  it('tries each untried region once when every region returns 429', async () => {
    process.env.VEO_REGIONS = 'us-central1,europe-west1'
    vi.mocked(generateVideoWithVeo).mockResolvedValue({
      status: 'FAILED',
      error: '429 rate limit',
    })

    const result = await generateProductionVideo('a quiet street', {
      forceProvider: 'vertex',
    })

    expect(generateVideoWithVeo).toHaveBeenCalledTimes(2)
    expect(result.status).toBe('FAILED')
    expect(result.error).toMatch(/429/)
  })

  it('does not POST when the video dispatch wait exceeds the pacing deadline', async () => {
    const kvBackup = {
      KV_REST_API_URL: process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    }
    process.env.VERTEX_VIDEO_DISPATCH_INTERVAL_MS = '30000'
    process.env.VERTEX_DISPATCH_MAX_WAIT_MS = '1000'
    delete process.env.KV_REST_API_URL
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.KV_REST_API_TOKEN
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    resetVertexDispatchBucketForTests()
    try {
      await acquireVertexDispatchSlot('video')

      const result = await generateProductionVideo('a quiet street', {
        forceProvider: 'vertex',
        preferOmni: true,
      })

      expect(generateVideoWithVeo).not.toHaveBeenCalled()
      expect(result.status).toBe('FAILED')
      expect(result.error).toMatch(/429/)
      expect(result.error).toMatch(/rate limit/)
      expect(result.region).toBe('global')
      const status = getEndpointStatus(['global'])
      expect(status['omni-failover-test-project']?.global?.rateLimited).toBe(false)
    } finally {
      for (const [key, value] of Object.entries(kvBackup)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    }
  })
})
