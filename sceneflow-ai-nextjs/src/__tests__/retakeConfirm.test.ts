import { describe, it, expect } from 'vitest'
import {
  resolveRetakeConfirmation,
  segmentHasCompletedTake,
} from '@/components/vision/scene-production/retakeConfirm'
import type { SceneSegment } from '@/components/vision/scene-production/types'

const baseSegment: SceneSegment = {
  segmentId: 'seg_1',
  sequenceIndex: 0,
  startTime: 0,
  endTime: 8,
  status: 'COMPLETE',
} as SceneSegment

describe('segmentHasCompletedTake', () => {
  it('is true when queue item is complete and segment has an active asset', () => {
    expect(
      segmentHasCompletedTake(
        { ...baseSegment, activeAssetUrl: 'https://example.com/v.mp4' },
        { status: 'complete' }
      )
    ).toBe(true)
  })

  it('is false when queue item is not complete', () => {
    expect(
      segmentHasCompletedTake(
        { ...baseSegment, activeAssetUrl: 'https://example.com/v.mp4' },
        { status: 'queued' }
      )
    ).toBe(false)
  })

  it('is false when segment has no active asset', () => {
    expect(segmentHasCompletedTake(baseSegment, { status: 'complete' })).toBe(false)
  })

  it('is false when queue item is missing', () => {
    expect(
      segmentHasCompletedTake(
        { ...baseSegment, activeAssetUrl: 'https://example.com/v.mp4' },
        undefined
      )
    ).toBe(false)
  })
})

describe('resolveRetakeConfirmation', () => {
  it('returns pending action when a completed take exists', () => {
    expect(
      resolveRetakeConfirmation(
        { ...baseSegment, activeAssetUrl: 'https://example.com/v.mp4' },
        { status: 'complete' },
        'openDialog'
      )
    ).toEqual({ segmentId: 'seg_1', action: 'openDialog' })
  })

  it('returns null when no completed take exists', () => {
    expect(
      resolveRetakeConfirmation(baseSegment, { status: 'queued' }, 'upload')
    ).toBeNull()
  })
})
