import { describe, expect, it } from 'vitest'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import {
  applyStartFrameUrlToProductionSegments,
  buildDraftVideoGenerationConfig,
  detectRecommendedMethod,
  resolveEffectiveStartFrameUrl,
  resolveSegmentFrameUrls,
  shouldAttachBeatStartFrame,
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

describe('detectRecommendedMethod', () => {
  it('does not pick I2V just because a storyboard start frame exists', () => {
    const segment = makeSegment()
    expect(detectRecommendedMethod(segment, undefined, [segment], {
      scene: { beats: [] } as never,
      fullScene: sceneWithLiveBeat,
      projectCharacters: [],
    })).toBe('T2V')
  })

  it('picks REF when library character images resolve', () => {
    const segment = makeSegment({
      references: {
        startFrameUrl: STALE_SEGMENT_URL,
        characterIds: ['c1'],
        sceneRefIds: [],
        objectRefIds: [],
      },
    })
    const beat = {
      beatId: BEAT_ID,
      kind: 'dialogue',
      character: 'Elara Vance',
      line: 'Hello.',
      referenceSelection: { characterIds: ['c1'] },
    }
    const method = detectRecommendedMethod(segment, undefined, [segment], {
      scene: { beats: [beat] } as never,
      fullScene: { beats: [beat] },
      projectCharacters: [
        {
          id: 'c1',
          name: 'Elara Vance',
          referenceImage: 'https://example.com/elara.jpg',
        },
      ],
    })
    expect(method).toBe('REF')
  })
})

describe('shouldAttachBeatStartFrame', () => {
  it('is false for REF unless the user opts in', () => {
    expect(shouldAttachBeatStartFrame({ mode: 'REF' })).toBe(false)
    expect(shouldAttachBeatStartFrame({ mode: 'T2V' })).toBe(false)
    expect(shouldAttachBeatStartFrame({ mode: 'REF', useBeatFrameAsStart: true })).toBe(true)
    expect(shouldAttachBeatStartFrame({ mode: 'I2V' })).toBe(true)
  })
})

describe('buildDraftVideoGenerationConfig', () => {
  it('defaults unsaved takes to Omni Standard without a start frame', () => {
    const segment = makeSegment()
    const beat = {
      beatId: BEAT_ID,
      kind: 'dialogue',
      character: 'Elara Vance',
      line: 'Hello.',
      referenceSelection: { characterIds: ['c1'] },
    }
    const { config, method } = buildDraftVideoGenerationConfig(
      segment,
      undefined,
      [segment],
      {
        scene: { beats: [beat] } as never,
        fullScene: { beats: [beat] },
        projectCharacters: [
          {
            id: 'c1',
            name: 'Elara Vance',
            referenceImage: 'https://example.com/elara.jpg',
          },
        ],
      }
    )
    expect(method).toBe('REF')
    expect(config.videoProvider).toBe('vertex')
    expect(config.duration).toBe(10)
    expect(config.startFrameUrl).toBeNull()
    expect(config.useBeatFrameAsStart).toBe(false)
    expect(config.mode).toBe('REF')
  })
})
