import { describe, it, expect } from 'vitest'
import { toSceneRenderVideoSegment } from '@/lib/video/renderTypes'

describe('toSceneRenderVideoSegment', () => {
  it('passes watermarkCropPercent through to the job spec segment', () => {
    const mapped = toSceneRenderVideoSegment({
      segmentId: 'seg-1',
      sequenceIndex: 0,
      videoUrl: 'https://example.com/beat.mp4',
      startTime: 0,
      endTime: 5,
      watermarkCropPercent: 5,
      videoTrimInSec: 0.5,
      videoTrimOutSec: 4.5,
    })

    expect(mapped.watermarkCropPercent).toBe(5)
    expect(mapped.videoTrimInSec).toBe(0.5)
    expect(mapped.videoTrimOutSec).toBe(4.5)
    expect(mapped.duration).toBe(5)
  })

  it('omits watermarkCropPercent when not set on the request segment', () => {
    const mapped = toSceneRenderVideoSegment({
      segmentId: 'seg-2',
      sequenceIndex: 1,
      videoUrl: 'https://example.com/beat2.mp4',
      startTime: 5,
      endTime: 10,
    })

    expect(mapped.watermarkCropPercent).toBeUndefined()
  })
})
