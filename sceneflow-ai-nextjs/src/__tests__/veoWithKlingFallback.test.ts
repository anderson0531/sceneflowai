import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { generateVideoWithVeoKlingFallback } from '@/lib/generation/veoWithKlingFallback'
import type { VideoGenerationOptions } from '@/lib/gemini/videoClient'
import { ContentPolicyExhaustedError } from '@/lib/generation/contentPolicy'

vi.mock('@/lib/gemini/productionVideoClient', () => ({
  generateProductionVideo: vi.fn(),
  waitForProductionVideoCompletion: vi.fn(),
  downloadProductionVideo: vi.fn(),
}))

vi.mock('@/lib/kling/klingDirectClient', () => ({
  runKlingVideo: vi.fn(),
}))

import {
  generateProductionVideo,
  waitForProductionVideoCompletion,
} from '@/lib/gemini/productionVideoClient'
import { runKlingVideo } from '@/lib/kling/klingDirectClient'

describe('generateVideoWithVeoKlingFallback', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.KLING_API_KEY = process.env.KLING_API_KEY
    envBackup.VEO_POLICY_MAX_ATTEMPTS = process.env.VEO_POLICY_MAX_ATTEMPTS
    envBackup.VEO_POLICY_FAST_FALLBACK = process.env.VEO_POLICY_FAST_FALLBACK
    process.env.KLING_API_KEY = 'api-key-kling-test'
    process.env.VEO_POLICY_MAX_ATTEMPTS = '3'
    delete process.env.VEO_POLICY_FAST_FALLBACK
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.KLING_API_KEY = envBackup.KLING_API_KEY
    process.env.VEO_POLICY_MAX_ATTEMPTS = envBackup.VEO_POLICY_MAX_ATTEMPTS
    process.env.VEO_POLICY_FAST_FALLBACK = envBackup.VEO_POLICY_FAST_FALLBACK
  })

  it('invokes direct Kling after Vertex policy exhaustion', async () => {
    vi.mocked(generateProductionVideo).mockResolvedValue({
      status: 'FAILED',
      error: 'Content Safety Filter Triggered',
    })
    vi.mocked(waitForProductionVideoCompletion).mockResolvedValue({
      status: 'FAILED',
      error: 'rai media filtered',
    })

    vi.mocked(runKlingVideo).mockResolvedValue(Buffer.from('kling-video'))

    const result = await generateVideoWithVeoKlingFallback({
      prompt: 'test prompt',
      method: 'T2V',
      allowPolicyFallback: true,
      videoOptions: {
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
    })

    expect(runKlingVideo).toHaveBeenCalledTimes(1)
    expect(result.generationProvider).toBe('kling')
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

    expect(runKlingVideo).not.toHaveBeenCalled()
    expect(result.generationProvider).toBe('vertex')
    expect(result.wasPolicyFallback).toBe(false)
  })

  it('keeps reference images through policy retries and only strips on last-resort downgrade', async () => {
    delete process.env.KLING_API_KEY
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
    const urls = ['https://example.com/id.png', 'https://example.com/prop.png']
    for (const call of calls) {
      expect(call.options.referenceImages?.map((ref) => ref.url)).toEqual(urls)
    }
    expect(calls[3].prompt).not.toContain('Neutral scene without references')
  })

  it('uses direct Kling when configured', async () => {
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

    vi.mocked(runKlingVideo).mockResolvedValue(Buffer.from('kling-video'))

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

  it('does not start another Vertex attempt for a non-policy Omni 400', async () => {
    vi.mocked(generateProductionVideo).mockResolvedValue({
      status: 'FAILED',
      error: 'Vertex AI Interactions error 400: Unknown field delivery',
    })

    const result = await generateVideoWithVeoKlingFallback({
      prompt: 'a quiet street at dusk',
      method: 'I2V',
      allowPolicyFallback: false,
      videoOptions: { durationSeconds: 8, aspectRatio: '16:9' },
    })

    expect(generateProductionVideo).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('FAILED')
    expect(result.vertexAttempts).toBe(1)
  })

  it('does not start another Vertex attempt when the interaction has no video file', async () => {
    vi.mocked(generateProductionVideo).mockResolvedValue({
      status: 'COMPLETED',
      operationName: 'interaction:abc',
    })

    const result = await generateVideoWithVeoKlingFallback({
      prompt: 'a quiet street at dusk',
      method: 'I2V',
      videoOptions: { durationSeconds: 8, aspectRatio: '16:9' },
    })

    expect(generateProductionVideo).toHaveBeenCalledTimes(1)
    expect(waitForProductionVideoCompletion).not.toHaveBeenCalled()
    expect(result.status).toBe('FAILED')
    expect(result.error).toMatch(/downloadable file/)
  })

  it('polls an accepted Omni interaction every 20 seconds', async () => {
    vi.mocked(generateProductionVideo).mockResolvedValue({
      status: 'QUEUED',
      operationName: 'interaction:abc',
    })
    vi.mocked(waitForProductionVideoCompletion).mockResolvedValue({
      status: 'COMPLETED',
      operationName: 'interaction:abc',
      videoUrl: 'data:video/mp4;base64,AAAA',
    })

    const result = await generateVideoWithVeoKlingFallback({
      prompt: 'a quiet street at dusk',
      method: 'T2V',
      videoOptions: { durationSeconds: 8, aspectRatio: '16:9' },
    })

    expect(waitForProductionVideoCompletion).toHaveBeenCalledWith(
      'interaction:abc',
      'vertex',
      240,
      20
    )
    expect(result.status).toBe('COMPLETED')
  })

  it('does not invoke Kling when allowPolicyFallback is false', async () => {
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
  })

  it('retries Omni content_blocked errors with sanitized prompt and stripped outfit parentheticals while keeping reference URLs', async () => {
    const calls: Array<{ prompt: string; options: VideoGenerationOptions }> = []

    vi.mocked(generateProductionVideo).mockResolvedValue({
      status: 'QUEUED',
      operationName: 'interaction:ChBhMDY1N2NhZDUwNTJlOGZmEAgaAjAzKgRtYWlu',
    })
    vi.mocked(waitForProductionVideoCompletion)
      .mockResolvedValueOnce({
        status: 'FAILED',
        operationName: 'interaction:ChBhMDY1N2NhZDUwNTJlOGZmEAgaAjAzKgRtYWlu',
        error:
          '[content_blocked] Request blocked for an unspecified policy reason. Please modify your input and retry.',
      })
      .mockResolvedValueOnce({
        status: 'FAILED',
        operationName: 'interaction:ChBhMDY1N2NhZDUwNTJlOGZmEAgaAjAzKgRtYWlu',
        error:
          '[content_blocked] Request blocked for an unspecified policy reason. Please modify your input and retry.',
      })
      .mockResolvedValueOnce({
        status: 'COMPLETED',
        operationName: 'interaction:ChBhMDY1N2NhZDUwNTJlOGZmEAgaAjAzKgRtYWlu',
        videoUrl: 'data:video/mp4;base64,AAAA',
      })

    vi.mocked(generateProductionVideo).mockImplementation(async (prompt, opts) => {
      calls.push({ prompt, options: opts as VideoGenerationOptions })
      return {
        status: 'QUEUED',
        operationName: 'interaction:ChBhMDY1N2NhZDUwNTJlOGZmEAgaAjAzKgRtYWlu',
      }
    })

    const result = await generateVideoWithVeoKlingFallback({
      prompt:
        'Use the images above.\nperson [1] is braced while person [2] sags against his side in her blood-stained torn canvas parka, hauling person [2] forward by her upper arm.',
      method: 'REF',
      allowPolicyFallback: false,
      videoOptions: {
        durationSeconds: 10,
        aspectRatio: '16:9',
        referenceImages: [
          {
            url: 'https://example.com/piper.jpg',
            type: 'character',
            label:
              'The next image is the identity and wardrobe of person [2]. Extract exact facial identity from the face close-up and outfit (Thoroughly waterlogged canvas parka with bloodied gauze dressing) from the full-body standing figure; do not render the character-card layout or headshot overlay.',
            role: 'character',
          } as unknown as NonNullable<VideoGenerationOptions['referenceImages']>[number],
        ],
      },
    })

    expect(result.status).toBe('COMPLETED')
    expect(result.vertexAttempts).toBe(3)
    expect(calls).toHaveLength(3)
    expect(calls[1].options.referenceImages?.[0]?.url).toBe('https://example.com/piper.jpg')
    const retry1Label = (calls[1].options.referenceImages?.[0] as { label?: string })?.label
    expect(retry1Label).not.toContain('bloodied')
    expect(retry1Label).not.toContain('waterlogged')
    expect(retry1Label).toContain('The next image is the identity and wardrobe of person [2].')
    expect(calls[1].prompt).not.toContain('blood-stained')
    expect(calls[2].prompt).toContain('steadying person [2] forward by the arm')
    expect(calls[2].prompt).toContain('leans beside')
    expect(calls[2].prompt).toContain('weathered canvas')
  })
})
