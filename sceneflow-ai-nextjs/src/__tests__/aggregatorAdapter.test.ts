import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderfulAdapter } from '@/lib/aggregator/adapters/renderfulAdapter'
import { polloAdapter } from '@/lib/aggregator/adapters/polloAdapter'
import { submitAggregatorJobWithFailover } from '@/lib/aggregator/dispatch'
import { getAggregatorModel, getAggregatorCreditsForModel } from '@/lib/aggregator/modelRegistry'
import { clearRenderfulCatalogCache } from '@/lib/aggregator/renderfulCatalog'

describe('aggregator adapters', () => {
  beforeEach(() => {
    clearRenderfulCatalogCache()
  })

  it('maps methods to SceneFlow model ids for Renderful', () => {
    expect(renderfulAdapter.mapMethodToModel('T2V', 'kling-2.6')).toBe('kling-2.6')
  })

  it('maps methods to Pollo endpoints', () => {
    expect(polloAdapter.mapMethodToModel('T2V', 'kling-2.6')).toContain('/generation/')
  })

  it('submits Renderful jobs with top-level prompt fields and matched slug', async () => {
    process.env.VIDEO_AGGREGATOR_API_KEY = 'test-renderful'

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ id: 'kling-v2-6-text-to-video', name: 'Kling v2.6', type: 'text-to-video' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'gen_test_1' }),
      })

    vi.stubGlobal('fetch', fetchMock)

    const result = await renderfulAdapter.submitJob({
      prompt: 'A detective walks through rain',
      method: 'T2V',
      videoModel: 'kling-2.6',
      durationSeconds: 8,
      aspectRatio: '16:9',
    })

    expect(result.jobId).toBe('gen_test_1')
    expect(result.vendorModelId).toBe('kling-v2-6-text-to-video')

    const submitCall = fetchMock.mock.calls[1]
    expect(submitCall[0]).toContain('/generations')
    const body = JSON.parse(String(submitCall[1]?.body))
    expect(body.type).toBe('text-to-video')
    expect(body.model).toBe('kling-v2-6-text-to-video')
    expect(body.prompt).toBe('A detective walks through rain')
    expect(body.aspect_ratio).toBe('16:9')
    expect(body.duration).toBe(8)
    expect(body.input).toBeUndefined()

    vi.unstubAllGlobals()
  })

  it('degrades REF to image-to-video when reference image is present', async () => {
    process.env.VIDEO_AGGREGATOR_API_KEY = 'test-renderful'

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          models: [
            {
              id: 'kling-v2-6-image-to-video',
              name: 'Kling v2.6',
              type: 'image-to-video',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'gen_ref_i2v' }),
      })

    vi.stubGlobal('fetch', fetchMock)

    const result = await renderfulAdapter.submitJob({
      prompt: 'Detective close-up',
      method: 'REF',
      videoModel: 'kling-2.6',
      durationSeconds: 8,
      aspectRatio: '16:9',
      referenceImages: [{ url: 'https://cdn.example.com/char-ref.png', type: 'character' }],
    })

    expect(result.jobId).toBe('gen_ref_i2v')
    expect(result.vendorModelId).toBe('kling-v2-6-image-to-video')

    const submitCall = fetchMock.mock.calls[1]
    const body = JSON.parse(String(submitCall[1]?.body))
    expect(body.type).toBe('image-to-video')
    expect(body.image_url).toBe('https://cdn.example.com/char-ref.png')

    vi.unstubAllGlobals()
  })

  it('degrades REF to text-to-video when no reference image is available', async () => {
    process.env.VIDEO_AGGREGATOR_API_KEY = 'test-renderful'

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          models: [
            {
              id: 'kling-v2-6-text-to-video',
              name: 'Kling v2.6',
              type: 'text-to-video',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'gen_ref_t2v' }),
      })

    vi.stubGlobal('fetch', fetchMock)

    const result = await renderfulAdapter.submitJob({
      prompt: 'Detective close-up',
      method: 'REF',
      videoModel: 'kling-2.6',
      durationSeconds: 8,
      aspectRatio: '16:9',
    })

    expect(result.jobId).toBe('gen_ref_t2v')
    const submitCall = fetchMock.mock.calls[1]
    const body = JSON.parse(String(submitCall[1]?.body))
    expect(body.type).toBe('text-to-video')
    expect(body.image_url).toBeUndefined()

    vi.unstubAllGlobals()
  })

  it('parses Renderful webhook payload', () => {
    const payload = renderfulAdapter.parseWebhook({
      event: 'generation.completed',
      data: {
        id: 'gen_abc',
        status: 'completed',
        outputs: ['https://cdn.example.com/video.mp4'],
        model: 'kling-v2-6-text-to-video',
      },
    })
    expect(payload?.jobId).toBe('gen_abc')
    expect(payload?.status).toBe('completed')
    expect(payload?.videoUrl).toContain('video.mp4')
  })

  it('computes credits from model registry', () => {
    const credits = getAggregatorCreditsForModel('kling-2.6', 8)
    expect(credits).toBeGreaterThanOrEqual(120)
    expect(getAggregatorModel('kling-2.6')?.label).toBe('Kling 2.6')
  })
})

describe('submitAggregatorJobWithFailover', () => {
  const envBackup = { ...process.env }

  beforeEach(() => {
    clearRenderfulCatalogCache()
    process.env.VIDEO_AGGREGATOR_VENDOR = 'renderful'
    process.env.VIDEO_AGGREGATOR_FAILOVER_VENDOR = 'pollo'
    process.env.VIDEO_AGGREGATOR_API_KEY = 'test-renderful'
    process.env.VIDEO_AGGREGATOR_FAILOVER_API_KEY = 'test-pollo'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(
        Object.assign(new Error('server error'), {
          status: 503,
          name: 'AggregatorHttpError',
        })
      )
    )
  })

  afterEach(() => {
    process.env = { ...envBackup }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('failover is configured for distinct vendors', () => {
    expect(process.env.VIDEO_AGGREGATOR_VENDOR).toBe('renderful')
    expect(process.env.VIDEO_AGGREGATOR_FAILOVER_VENDOR).toBe('pollo')
  })

  it('does not failover when failover API key is unset', async () => {
    delete process.env.VIDEO_AGGREGATOR_FAILOVER_API_KEY
    const { AggregatorHttpError } = await import('@/lib/aggregator/types')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'upstream error',
      })
    )

    await expect(
      submitAggregatorJobWithFailover({
        prompt: 'test',
        method: 'T2V',
        videoModel: 'kling-2.6',
        durationSeconds: 8,
        aspectRatio: '16:9',
      })
    ).rejects.toBeInstanceOf(AggregatorHttpError)
  })
})
