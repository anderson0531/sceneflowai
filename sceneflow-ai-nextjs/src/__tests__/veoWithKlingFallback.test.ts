import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { generateVideoWithVeoKlingFallback } from '@/lib/generation/veoWithKlingFallback'
import type { VideoGenerationOptions } from '@/lib/gemini/videoClient'
import { ContentPolicyExhaustedError } from '@/lib/generation/contentPolicy'

vi.mock('@/lib/gemini/productionVideoClient', () => ({
  generateProductionVideo: vi.fn(),
  waitForProductionVideoCompletion: vi.fn(),
  downloadProductionVideo: vi.fn(),
}))

vi.mock('@/lib/fal/klingPolicyClient', () => ({
  runFalKlingVideo: vi.fn(),
}))

vi.mock('@/lib/kling/klingDirectClient', () => ({
  runKlingVideo: vi.fn(),
}))

import {
  generateProductionVideo,
  waitForProductionVideoCompletion,
} from '@/lib/gemini/productionVideoClient'
import { runFalKlingVideo } from '@/lib/fal/klingPolicyClient'
import { runKlingVideo } from '@/lib/kling/klingDirectClient'

describe('generateVideoWithVeoKlingFallback', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.FAL_KEY = process.env.FAL_KEY
    envBackup.KLING_API_KEY = process.env.KLING_API_KEY
    envBackup.VEO_POLICY_MAX_ATTEMPTS = process.env.VEO_POLICY_MAX_ATTEMPTS
    envBackup.VEO_POLICY_FAST_FALLBACK = process.env.VEO_POLICY_FAST_FALLBACK
    delete process.env.KLING_API_KEY
    process.env.FAL_KEY = 'test-fal-key'
    process.env.VEO_POLICY_MAX_ATTEMPTS = '3'
    delete process.env.VEO_POLICY_FAST_FALLBACK
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.FAL_KEY = envBackup.FAL_KEY
    process.env.KLING_API_KEY = envBackup.KLING_API_KEY
    process.env.VEO_POLICY_MAX_ATTEMPTS = envBackup.VEO_POLICY_MAX_ATTEMPTS
    process.env.VEO_POLICY_FAST_FALLBACK = envBackup.VEO_POLICY_FAST_FALLBACK
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
      allowPolicyFallback: true,
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

  it('keeps reference images through policy retries and only strips on last-resort downgrade', async () => {
    process.env.FAL_KEY = ''
    process.env.VEO_POLICY_MAX_ATTEMPTS = '4'
    const calls: Array<{ prompt: string; options: VideoGenerationOptions }> = []

    vi.mocked(generateProductionVideo).mockImplementation(async (prompt, opts) => {
      calls.push({ prompt, options: opts as VideoGenerationOptions })
      return {
        status: 'FAILED',
        error: 'The prompt is blocked due to prohibited contents',
      }
    })

    await expect(
      generateVideoWithVeoKlingFallback({
        prompt: 'References: keep the subject consistent with the provided images.',
        referenceFallbackPrompt: 'Neutral scene without references.',
        method: 'REF',
        videoOptions: {
          durationSeconds: 10,
          aspectRatio: '16:9',
          referenceImages: [
            {
              url: 'https://example.com/id.png',
              type: 'character',
              label: 'Identity reference 1: Elara Vance',
              role: 'identity',
            },
            {
              url: 'https://example.com/prop.png',
              type: 'character',
              label: 'Prop reference 2: False Evidence Folder',
              role: 'prop-important',
            },
          ],
        },
      })
    ).rejects.toBeInstanceOf(ContentPolicyExhaustedError)

    expect(calls.length).toBe(4)
    expect(calls[0].options.referenceImages?.length).toBe(2)
    expect(calls[1].options.referenceImages?.length).toBe(2)
    expect(calls[2].options.referenceImages?.length).toBe(1)
    expect(calls[2].options.referenceImages?.[0].label).toContain('Identity reference')
    expect(calls[3].options.referenceImages).toBeUndefined()
    expect(calls[3].prompt).toContain('Neutral scene without references')
  })

  it('prefers direct Kling over Fal when both are configured', async () => {
    process.env.KLING_API_KEY = 'api-key-kling-test'

    vi.mocked(generateProductionVideo).mockResolvedValue({
      status: 'FAILED',
      error: 'The prompt is blocked due to prohibited contents',
    })

    vi.mocked(runKlingVideo).mockResolvedValue(Buffer.from('direct-kling-video'))

    const result = await generateVideoWithVeoKlingFallback({
      prompt: 'blocked prompt',
      method: 'T2V',
      allowPolicyFallback: true,
      videoOptions: { durationSeconds: 5, aspectRatio: '16:9' },
    })

    expect(runKlingVideo).toHaveBeenCalledTimes(1)
    expect(runFalKlingVideo).not.toHaveBeenCalled()
    expect(result.generationProvider).toBe('kling')
    expect(result.videoBuffer?.toString()).toBe('direct-kling-video')
  })

  it('fast-fallback skips remaining Vertex attempts after first policy block', async () => {
    process.env.VEO_POLICY_FAST_FALLBACK = 'true'
    process.env.VEO_POLICY_MAX_ATTEMPTS = '3'

    vi.mocked(generateProductionVideo).mockResolvedValue({
      status: 'FAILED',
      error: 'Content Safety Filter Triggered',
    })

    vi.mocked(runFalKlingVideo).mockResolvedValue(Buffer.from('kling-video'))

    const result = await generateVideoWithVeoKlingFallback({
      prompt: 'test prompt',
      method: 'T2V',
      allowPolicyFallback: true,
      videoOptions: { durationSeconds: 5, aspectRatio: '16:9' },
    })

    expect(generateProductionVideo).toHaveBeenCalledTimes(1)
    expect(result.vertexAttempts).toBe(1)
    expect(result.wasPolicyFallback).toBe(true)
  })

  it('does not invoke Kling when allowPolicyFallback is false', async () => {
    process.env.KLING_API_KEY = 'api-key-kling-test'

    vi.mocked(generateProductionVideo).mockResolvedValue({
      status: 'FAILED',
      error: 'Content Safety Filter Triggered',
    })

    await expect(
      generateVideoWithVeoKlingFallback({
        prompt: 'blocked prompt',
        method: 'T2V',
        allowPolicyFallback: false,
        videoOptions: { durationSeconds: 5, aspectRatio: '16:9' },
      })
    ).rejects.toBeInstanceOf(ContentPolicyExhaustedError)

    expect(runKlingVideo).not.toHaveBeenCalled()
    expect(runFalKlingVideo).not.toHaveBeenCalled()
  })
})
