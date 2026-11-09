import { describe, expect, it } from 'vitest'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import {
  applyEndFrameUrlToProductionSegments,
  applyStartFrameUrlToProductionSegments,
  buildDraftVideoGenerationConfig,
  detectRecommendedMethod,
  f2vStartFromPreviousEnd,
  resolveEffectiveStartFrameUrl,
  resolveExpressGenerationMethod,
  resolveF2VFrameUrls,
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

describe('resolveF2VFrameUrls', () => {
  it('ignores a start URL that is the beat still', () => {
    const segment = makeSegment({
      startFrameUrl: LIVE_BEAT_URL,
      endFrameUrl: LIVE_BEAT_URL,
      references: {
        startFrameUrl: LIVE_BEAT_URL,
        endFrameUrl: LIVE_BEAT_URL,
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
    })
    expect(resolveF2VFrameUrls(segment, sceneWithLiveBeat)).toEqual({
      startFrameUrl: null,
      endFrameUrl: null,
    })
  })

  it('keeps dedicated start and end frames', () => {
    const segment = makeSegment({
      startFrameUrl: NEWER_SEGMENT_URL,
      endFrameUrl: 'https://example.com/end-frame.jpg',
      references: {
        startFrameUrl: NEWER_SEGMENT_URL,
        endFrameUrl: 'https://example.com/end-frame.jpg',
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
    })
    expect(resolveF2VFrameUrls(segment, sceneWithLiveBeat)).toEqual({
      startFrameUrl: NEWER_SEGMENT_URL,
      endFrameUrl: 'https://example.com/end-frame.jpg',
    })
  })

  it('uses the previous beat end frame as this beat start frame', () => {
    const previousEnd = 'https://example.com/previous-end.jpg'
    expect(f2vStartFromPreviousEnd(previousEnd)).toBe(previousEnd)
    expect(f2vStartFromPreviousEnd('  ')).toBeNull()
  })

  it('resolves beat storyboardImageUrl and distinct storyboardEndImageUrl for 2-keyframe F2V', () => {
    const segment = makeSegment({
      startFrameUrl: undefined,
      endFrameUrl: undefined,
      references: { characterIds: [], sceneRefIds: [], objectRefIds: [] },
    })
    const sceneWithBeatPair = {
      beats: [
        {
          beatId: BEAT_ID,
          kind: 'action',
          storyboardImageUrl: 'https://example.com/beat-start.jpg',
          storyboardEndImageUrl: 'https://example.com/beat-end.jpg',
        },
      ],
    }
    expect(resolveF2VFrameUrls(segment, sceneWithBeatPair)).toEqual({
      startFrameUrl: 'https://example.com/beat-start.jpg',
      endFrameUrl: 'https://example.com/beat-end.jpg',
    })
  })

  it('prioritizes dedicated storyboardStartImageUrl (Start Frame) over storyboardImageUrl (Shot Still) for F2V', () => {
    const segment = makeSegment({
      startFrameUrl: undefined,
      endFrameUrl: undefined,
      references: { characterIds: [], sceneRefIds: [], objectRefIds: [] },
    })
    const sceneWithThreeFrames = {
      beats: [
        {
          beatId: BEAT_ID,
          kind: 'action',
          storyboardImageUrl: 'https://example.com/shot-still.jpg',
          storyboardStartImageUrl: 'https://example.com/action-start-frame.jpg',
          storyboardEndImageUrl: 'https://example.com/action-end-frame.jpg',
        },
      ],
    }
    expect(resolveEffectiveStartFrameUrl(segment, sceneWithThreeFrames)).toBe(
      'https://example.com/action-start-frame.jpg'
    )
    expect(resolveF2VFrameUrls(segment, sceneWithThreeFrames)).toEqual({
      startFrameUrl: 'https://example.com/action-start-frame.jpg',
      endFrameUrl: 'https://example.com/action-end-frame.jpg',
    })
  })

  it('prefers a newly regenerated Shot Still (storyboardImageUrl) over an older Start Frame (storyboardStartImageUrl)', () => {
    const oldActionStart = 'https://example.com/action-start-1779527367000.jpeg'
    const newShotStill = 'https://example.com/shot-still-1779527369000.jpeg'
    const segment = makeSegment({
      startFrameUrl: oldActionStart,
      references: {
        startFrameUrl: oldActionStart,
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
    })
    const sceneWithNewerShotStill = {
      beats: [
        {
          beatId: BEAT_ID,
          kind: 'action',
          storyboardImageUrl: newShotStill,
          storyboardImageVersions: [
            { id: 'v_new', url: newShotStill, createdAt: '2026-06-02T00:00:00.000Z', source: 'generate' },
          ],
          storyboardStartImageUrl: oldActionStart,
          storyboardStartImageVersions: [
            { id: 'v_old', url: oldActionStart, createdAt: '2026-06-01T00:00:00.000Z', source: 'edit' },
          ],
        },
      ],
    }
    expect(resolveEffectiveStartFrameUrl(segment, sceneWithNewerShotStill)).toBe(newShotStill)
  })

  it('prefers a restored earlier Start Frame version over an older Shot Still or stale segment startFrameUrl', () => {
    const startV1 = 'https://example.com/action-start-v1-1779527366000.jpeg'
    const shotStill = 'https://example.com/shot-still-1779527367000.jpeg'
    const startV2 = 'https://example.com/action-start-v2-1779527368000.jpeg'
    const segment = makeSegment({
      startFrameUrl: startV2,
      references: {
        startFrameUrl: startV2,
        startFrameVersions: [
          { id: 'sv_1', url: startV1, createdAt: '2026-06-01T00:00:00.000Z', source: 'generate' },
          { id: 'sv_2', url: startV2, createdAt: '2026-06-03T00:00:00.000Z', source: 'generate' },
        ],
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
    })
    const sceneWithRestoredStartV1 = {
      beats: [
        {
          beatId: BEAT_ID,
          kind: 'action',
          storyboardImageUrl: shotStill,
          storyboardImageVersions: [
            { id: 'still_1', url: shotStill, createdAt: '2026-06-02T00:00:00.000Z', source: 'generate' },
          ],
          storyboardStartImageUrl: startV1,
          storyboardStartImageVersionId: 'sv_1',
          storyboardStartImageVersions: [
            {
              id: 'sv_1',
              url: startV1,
              createdAt: '2026-06-01T00:00:00.000Z',
              selectedAt: '2026-06-04T00:00:00.000Z',
              source: 'generate',
            },
            { id: 'sv_2', url: startV2, createdAt: '2026-06-03T00:00:00.000Z', source: 'generate' },
          ],
        },
      ],
    }
    expect(resolveEffectiveStartFrameUrl(segment, sceneWithRestoredStartV1)).toBe(startV1)
  })

  it('prefers a restored or newer beat End Frame over a stale segment endFrameUrl', () => {
    const endV1 = 'https://example.com/action-end-v1-1779527366000.jpeg'
    const endV2 = 'https://example.com/action-end-v2-1779527368000.jpeg'
    const segment = makeSegment({
      startFrameUrl: 'https://example.com/action-start.jpeg',
      endFrameUrl: endV2,
      references: {
        startFrameUrl: 'https://example.com/action-start.jpeg',
        endFrameUrl: endV2,
        endFrameVersions: [
          { id: 'ev_1', url: endV1, createdAt: '2026-06-01T00:00:00.000Z', source: 'generate' },
          { id: 'ev_2', url: endV2, createdAt: '2026-06-03T00:00:00.000Z', source: 'generate' },
        ],
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
    })
    const sceneWithRestoredEndV1 = {
      beats: [
        {
          beatId: BEAT_ID,
          kind: 'action',
          storyboardStartImageUrl: 'https://example.com/action-start.jpeg',
          storyboardEndImageUrl: endV1,
          storyboardEndImageVersionId: 'ev_1',
          storyboardEndImageVersions: [
            {
              id: 'ev_1',
              url: endV1,
              createdAt: '2026-06-01T00:00:00.000Z',
              selectedAt: '2026-06-04T00:00:00.000Z',
              source: 'generate',
            },
            { id: 'ev_2', url: endV2, createdAt: '2026-06-03T00:00:00.000Z', source: 'generate' },
          ],
        },
      ],
    }
    expect(resolveSegmentFrameUrls(segment, undefined, sceneWithRestoredEndV1).endFrameUrl).toBe(
      endV1
    )
    expect(resolveF2VFrameUrls(segment, sceneWithRestoredEndV1).endFrameUrl).toBe(endV1)
  })
})

describe('applyEndFrameUrlToProductionSegments', () => {
  it('updates endFrameUrl on all segments matching beatId', () => {
    const segments = [
      makeSegment({ segmentId: 'seg_a' }),
      makeSegment({ segmentId: 'seg_other', beatId: 'other-beat' }),
    ]
    const updated = applyEndFrameUrlToProductionSegments(
      segments,
      BEAT_ID,
      'https://example.com/end-new.jpg'
    )
    expect(updated[0].endFrameUrl).toBe('https://example.com/end-new.jpg')
    expect(updated[0].references?.endFrameUrl).toBe('https://example.com/end-new.jpg')
    expect(updated[1].endFrameUrl).toBeUndefined()
  })
})

describe('resolveExpressGenerationMethod', () => {
  it('respects preferredSourceMethod reference vs frame', () => {
    expect(resolveExpressGenerationMethod(true, true, true, 'reference')).toBe('REF')
    expect(resolveExpressGenerationMethod(true, true, true, 'frame')).toBe('FTV')
    expect(resolveExpressGenerationMethod(true, true, false, 'frame')).toBe('I2V')
    expect(resolveExpressGenerationMethod(false, true, true)).toBe('FTV')
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
