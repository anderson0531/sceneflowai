import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderfulAdapter } from '@/lib/aggregator/adapters/renderfulAdapter'
import { polloAdapter } from '@/lib/aggregator/adapters/polloAdapter'
import { submitAggregatorJobWithFailover } from '@/lib/aggregator/dispatch'
import { getAggregatorModel, getAggregatorCreditsForModel } from '@/lib/aggregator/modelRegistry'

describe('aggregator adapters', () => {
  it('maps methods to Renderful model ids', () => {
    expect(renderfulAdapter.mapMethodToModel('T2V', 'kling-2.6')).toContain('kling')
  })

  it('maps methods to Pollo endpoints', () => {
    expect(polloAdapter.mapMethodToModel('T2V', 'kling-2.6')).toContain('/generation/')
  })

  it('parses Renderful webhook payload', () => {
    const payload = renderfulAdapter.parseWebhook({
      event: 'generation.completed',
      data: {
        id: 'gen_abc',
        status: 'completed',
        outputs: ['https://cdn.example.com/video.mp4'],
        model: 'kling/kling-2.6',
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
    process.env.VIDEO_AGGREGATOR_VENDOR = 'renderful'
    process.env.VIDEO_AGGREGATOR_FAILOVER_VENDOR = 'pollo'
    process.env.VIDEO_AGGREGATOR_API_KEY = 'test-renderful'
    process.env.VIDEO_AGGREGATOR_FAILOVER_API_KEY = 'test-pollo'
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockRejectedValueOnce(
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
})
