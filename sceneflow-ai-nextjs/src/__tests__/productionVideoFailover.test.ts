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
  resetProductionVideoQuotaStateForTests,
} from '@/lib/gemini/productionVideoClient'

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
    resetProductionVideoQuotaStateForTests()
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
    expect(result.error).toMatch(/429/)
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
})
