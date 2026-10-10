import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  buildPromoPreviewSequence,
  promoNarrationCue,
  promoPreviewNarrationOn,
} from '@/lib/publish/promoPreviewSequence'
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

describe('promo narration cue', () => {
  const shots = [{ durationSec: 6 }, { durationSec: 12 }, { durationSec: 8 }]

  it('stays off before the chosen shot and on for every shot after it', () => {
    expect(promoPreviewNarrationOn(shots, 0, 6)).toBe(false)
    expect(promoPreviewNarrationOn(shots, 1, 6)).toBe(true)
    expect(promoPreviewNarrationOn(shots, 2, 6)).toBe(true)
    expect(promoPreviewNarrationOn(shots, 0, 0)).toBe(true)
  })

  it('starts once, then holds across later shots even when paused or finished', () => {
    expect(promoNarrationCue({ started: false, voiceOn: false, ended: false })).toBe('wait')
    expect(promoNarrationCue({ started: false, voiceOn: true, ended: false })).toBe('start')
    expect(promoNarrationCue({ started: true, voiceOn: true, ended: false })).toBe('hold')
    expect(promoNarrationCue({ started: true, voiceOn: true, ended: true })).toBe('hold')
    expect(promoNarrationCue({ started: true, voiceOn: false, ended: false })).toBe('hold')
  })

  it('does not start a read again because it is longer than 10 seconds', () => {
    let started = false
    const cues = shots.map((shot, index) => {
      const cue = promoNarrationCue({
        started,
        voiceOn: promoPreviewNarrationOn(shots, index, 6),
        ended: false,
      })
      if (cue === 'start') started = true
      return cue
    })
    expect(shots[1]?.durationSec).toBeGreaterThan(10)
    expect(cues).toEqual(['wait', 'start', 'hold'])
    expect(
      promoNarrationCue({
        started: true,
        voiceOn: promoPreviewNarrationOn(shots, 2, 6),
        ended: true,
      })
    ).toBe('hold')
  })
})
