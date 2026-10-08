import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { buildPromoPreviewSequence } from '@/lib/publish/promoPreviewSequence'
import {
  parsePromoRenderBody,
  pollPromoRenderJob,
  promoRenderPollStep,
} from '@/lib/publish/promoRenderPoll'

describe('trailer render returns a job', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src/app/api/publish/trailer/render/route.ts'),
    'utf8'
  )

  it('returns the stitch job id and does not poll inside the request', () => {
    expect(source).toContain('jobId: stitchData.jobId')
    expect(source).toContain("status: 'PROCESSING'")
    expect(source).not.toContain('setTimeout')
    expect(source).not.toContain('for (let i = 0; i < 24')
  })
})

describe('promo render poll', () => {
  it('accepts a completed stitch only when the file is playable', () => {
    expect(
      promoRenderPollStep({
        status: 'COMPLETED',
        downloadUrl: 'https://storage.example/trailer.mp4',
      })
    ).toEqual({ state: 'ready', mp4Url: 'https://storage.example/trailer.mp4' })

    expect(
      promoRenderPollStep({
        status: 'COMPLETED',
        downloadUrl: 'gs://bucket/outputs/job.mp4',
      })
    ).toEqual({ state: 'failed', error: 'Trailer render finished without a playable file' })

    expect(promoRenderPollStep({ status: 'PROCESSING' })).toEqual({ state: 'pending' })
  })

  it('turns a non-JSON body into a render failure', () => {
    expect(() => parsePromoRenderBody(504, '<html>gateway timeout</html>')).toThrow(
      'Trailer render failed (504)'
    )
  })

  it('returns the file once a poll says the stitch is complete', async () => {
    const sleeps: number[] = []
    const mp4Url = await pollPromoRenderJob({
      jobId: 'job-1',
      maxAttempts: 3,
      sleep: async (ms) => {
        sleeps.push(ms)
      },
      fetchStatus: async () => ({
        status: 200,
        body: JSON.stringify({
          status: sleeps.length < 2 ? 'PROCESSING' : 'COMPLETED',
          downloadUrl: 'https://storage.example/trailer.mp4',
        }),
      }),
    })
    expect(mp4Url).toBe('https://storage.example/trailer.mp4')
    expect(sleeps).toEqual([5000, 5000])
  })
})

describe('promo preview sequence', () => {
  it('uses a clip, then a still, then a label, and keeps each duration', () => {
    const sequence = buildPromoPreviewSequence([
      {
        key: 'a',
        label: 'Door',
        durationSec: 6,
        videoUrl: 'https://example.com/a.mp4',
        imageUrl: 'https://example.com/a.png',
      },
      { key: 'b', label: 'Rain', durationSec: 4, imageUrl: 'https://example.com/b.png' },
      { key: 'c', label: 'Sunrise', durationSec: 5 },
    ])
    expect(sequence).toEqual([
      {
        key: 'a',
        kind: 'clip',
        durationSec: 6,
        label: 'Door',
        videoUrl: 'https://example.com/a.mp4',
      },
      {
        key: 'b',
        kind: 'still',
        durationSec: 4,
        label: 'Rain',
        imageUrl: 'https://example.com/b.png',
      },
      { key: 'c', kind: 'label', durationSec: 5, label: 'Sunrise' },
    ])
  })
})
