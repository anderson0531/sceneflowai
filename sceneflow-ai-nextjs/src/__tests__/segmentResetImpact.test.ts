import { describe, it, expect } from 'vitest'
import { computeSegmentResetImpact } from '@/components/vision/scene-production/ResetSegmentsConfirmDialog'

describe('computeSegmentResetImpact', () => {
  it('counts keyframes, videos, and takes', () => {
    const impact = computeSegmentResetImpact({
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [
        {
          segmentId: 'seg_1',
          sequenceIndex: 0,
          startTime: 0,
          endTime: 8,
          status: 'COMPLETE',
          assetType: 'video',
          activeAssetUrl: 'https://example.com/v.mp4',
          references: {
            startFrameUrl: 'https://example.com/start.png',
            endFrameUrl: 'https://example.com/end.png',
          },
          takes: [{ id: 't1' }, { id: 't2' }],
        },
      ],
      productionStreams: [{ id: 's1', streamType: 'video', language: 'en', languageLabel: 'English', mp4Url: 'https://x/render.mp4' }],
    } as any)

    expect(impact.segmentCount).toBe(1)
    expect(impact.keyframeImageCount).toBe(2)
    expect(impact.videoCount).toBe(1)
    expect(impact.alternateTakeCount).toBe(2)
    expect(impact.hasRenderedScene).toBe(true)
    expect(impact.productionStreamCount).toBe(1)
  })
})
