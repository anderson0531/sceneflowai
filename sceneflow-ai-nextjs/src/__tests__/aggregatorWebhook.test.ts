import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/webhooks/video-aggregator/route'
import { renderfulAdapter } from '@/lib/aggregator/adapters/renderfulAdapter'

vi.mock('@/lib/aggregator/processAggregatorCompletion', () => ({
  parseAggregatorWebhookFromVendor: vi.fn(),
  processAggregatorWebhookPayload: vi.fn(),
}))

import {
  parseAggregatorWebhookFromVendor,
  processAggregatorWebhookPayload,
} from '@/lib/aggregator/processAggregatorCompletion'

describe('POST /api/webhooks/video-aggregator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.VIDEO_AGGREGATOR_WEBHOOK_SECRET = 'test-secret'
  })

  it('processes valid webhook payload', async () => {
    vi.mocked(parseAggregatorWebhookFromVendor).mockReturnValue({
      jobId: 'gen_abc',
      status: 'completed',
      videoUrl: 'https://cdn.example.com/v.mp4',
    })
    vi.mocked(processAggregatorWebhookPayload).mockResolvedValue({
      assetUrl: 'https://storage.googleapis.com/v.mp4',
    })

    const req = new NextRequest('http://localhost/api/webhooks/video-aggregator', {
      method: 'POST',
      body: JSON.stringify({
        event: 'generation.completed',
        data: { id: 'gen_abc', status: 'completed', outputs: ['https://cdn.example.com/v.mp4'] },
      }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.assetUrl).toContain('storage.googleapis.com')
  })

  it('renderful adapter verifies signature when secret set', () => {
    const body = '{"test":true}'
    const headers = new Headers()
    expect(renderfulAdapter.verifyWebhookSignature(headers, body)).toBe(false)
  })
})
