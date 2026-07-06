import { describe, expect, it } from 'vitest'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import {
  applyStartFrameUrlToProductionSegments,
  resolveEffectiveStartFrameUrl,
  resolveSegmentFrameUrls,
} from '@/lib/vision/segmentConfigBuilder'

const STALE_SEGMENT_URL = 'https://example.com/stale-segment-1779527367000.jpeg'
const LIVE_BEAT_URL = 'https://example.com/live-beat-1779527368000.jpeg'
const NEWER_SEGMENT_URL = 'https://example.com/new-segment-1779527369000.jpeg'
const BEAT_ID = 'beat-1'

function makeSegment(overrides: Partial<SceneSegment> = {}): SceneSegment {
  return {
    segmentId: 'seg_1',
    sequenceIndex: 0,
    startTime: 0,
    endTime: 8,
    status: 'DRAFT',
    assetType: null,
    takes: [],
    segmentDirection: null,
    transitionType: 'CUT',
    beatId: BEAT_ID,
    startFrameUrl: STALE_SEGMENT_URL,
    references: {
      startFrameUrl: STALE_SEGMENT_URL,
      characterIds: [],
      sceneRefIds: [],
      objectRefIds: [],
    },
    ...overrides,
  }
}

const sceneWithLiveBeat: Record<string, unknown> = {
  beats: [
    {
      beatId: BEAT_ID,
      kind: 'action',
      storyboardImageUrl: LIVE_BEAT_URL,
    },
  ],
}

describe('resolveEffectiveStartFrameUrl', () => {
  it('prefers newer beat storyboardImageUrl over stale segment startFrameUrl', () => {
    const segment = makeSegment()
    expect(
      resolveEffectiveStartFrameUrl(segment, sceneWithLiveBeat)
    ).toBe(LIVE_BEAT_URL)
  })

  it('prefers newer production segment startFrameUrl over stale beat storyboardImageUrl', () => {
    const segment = makeSegment({
      startFrameUrl: NEWER_SEGMENT_URL,
      references: {
        startFrameUrl: NEWER_SEGMENT_URL,
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
    })
    expect(
      resolveEffectiveStartFrameUrl(segment, sceneWithLiveBeat)
    ).toBe(NEWER_SEGMENT_URL)
  })

  it('falls back to segment startFrameUrl when beat has no storyboard image', () => {
    const segment = makeSegment()
    const scene = {
      beats: [{ beatId: BEAT_ID, kind: 'action' }],
    }
    expect(resolveEffectiveStartFrameUrl(segment, scene)).toBe(STALE_SEGMENT_URL)
  })

  it('uses scene master frame for first segment when no beat or segment frame', () => {
    const segment = makeSegment({
      beatId: undefined,
      startFrameUrl: undefined,
      references: {
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
    })
    expect(
      resolveEffectiveStartFrameUrl(segment, null, 'https://example.com/scene.jpg')
    ).toBe('https://example.com/scene.jpg')
  })
})

describe('resolveSegmentFrameUrls', () => {
  it('returns live beat start frame when scene is provided', () => {
    const segment = makeSegment()
    const { startFrameUrl } = resolveSegmentFrameUrls(
      segment,
      undefined,
      sceneWithLiveBeat
    )
    expect(startFrameUrl).toBe(LIVE_BEAT_URL)
  })
})

describe('applyStartFrameUrlToProductionSegments', () => {
  it('updates all segments matching beatId', () => {
    const segments = [
      makeSegment({ segmentId: 'seg_a', dialoguePortion: { lineId: 'l1', partIndex: 0, partCount: 2, excerpt: 'a' } }),
      makeSegment({ segmentId: 'seg_b', dialoguePortion: { lineId: 'l1', partIndex: 1, partCount: 2, excerpt: 'b' } }),
      makeSegment({ segmentId: 'seg_other', beatId: 'other-beat' }),
    ]

    const updated = applyStartFrameUrlToProductionSegments(
      segments,
      BEAT_ID,
      LIVE_BEAT_URL
    )

    expect(updated[0].startFrameUrl).toBe(LIVE_BEAT_URL)
    expect(updated[0].references?.startFrameUrl).toBe(LIVE_BEAT_URL)
    expect(updated[1].startFrameUrl).toBe(LIVE_BEAT_URL)
    expect(updated[2].startFrameUrl).toBe(STALE_SEGMENT_URL)
    expect(updated[0].endFrameUrl).toBe(segments[0].endFrameUrl)
  })
})
