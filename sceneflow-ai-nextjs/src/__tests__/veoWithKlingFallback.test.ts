import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { generateVideoWithVeoKlingFallback } from '@/lib/generation/veoWithKlingFallback'

vi.mock('@/lib/gemini/productionVideoClient', () => ({
  generateProductionVideo: vi.fn(),
  waitForProductionVideoCompletion: vi.fn(),
  downloadProductionVideo: vi.fn(),
}))

vi.mock('@/lib/fal/klingPolicyClient', () => ({
  runFalKlingVideo: vi.fn(),
}))

import {
  generateProductionVideo,
  waitForProductionVideoCompletion,
} from '@/lib/gemini/productionVideoClient'
import { runFalKlingVideo } from '@/lib/fal/klingPolicyClient'

describe('generateVideoWithVeoKlingFallback', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.FAL_KEY = process.env.FAL_KEY
    envBackup.VEO_POLICY_MAX_ATTEMPTS = process.env.VEO_POLICY_MAX_ATTEMPTS
    process.env.FAL_KEY = 'test-fal-key'
    process.env.VEO_POLICY_MAX_ATTEMPTS = '3'
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.FAL_KEY = envBackup.FAL_KEY
    process.env.VEO_POLICY_MAX_ATTEMPTS = envBackup.VEO_POLICY_MAX_ATTEMPTS
  })

  it('invokes Kling after Vertex policy exhaustion', async () => {
    vi.mocked(generateProductionVideo).mockResolvedValue({
      status: 'FAILED',
      error: 'Content Safety Filter Triggered',
    })
    vi.mocked(waitForProductionVideoCompletion).mockResolvedValue({
      status: 'FAILED',
      error: 'rai media filtered',
    })

    vi.mocked(runFalKlingVideo).mockResolvedValue(Buffer.from('kling-video'))

    const result = await generateVideoWithVeoKlingFallback({
      prompt: 'test prompt',
      method: 'T2V',
      videoOptions: {
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
    })

    expect(runFalKlingVideo).toHaveBeenCalledTimes(1)
    expect(result.generationProvider).toBe('fal')
    expect(result.wasPolicyFallback).toBe(true)
    expect(result.videoBuffer?.toString()).toBe('kling-video')
  })

  it('returns Vertex result without invoking Kling on success', async () => {
    vi.mocked(generateProductionVideo).mockResolvedValue({
      status: 'COMPLETED',
      videoUrl: 'data:video/mp4;base64,YWJj',
      operationName: 'op-1',
    })

    const result = await generateVideoWithVeoKlingFallback({
      prompt: 'clean prompt',
      method: 'T2V',
      videoOptions: {
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
    })

    expect(runFalKlingVideo).not.toHaveBeenCalled()
    expect(result.generationProvider).toBe('vertex')
    expect(result.wasPolicyFallback).toBe(false)
  })
})
