import { describe, expect, it } from 'vitest'
import {
  MEDIA_VERSION_CAP,
  appendSegmentTake,
  applyVideoTakeSelection,
  chronologicalPlayableTakes,
  clipVersionSelectionValue,
  deriveClipQueueStatus,
  healMissingVideoPointer,
  listClipVersionOptions,
  listPlayableTakes,
  resolveBeatStillTier,
  resolveLiveTake,
  resolveSegmentClipTier,
} from '@/lib/storyboard/mediaVersions'
import { mergeSceneProductionData } from '@/lib/storyboard/mergeProductionMedia'
import { hydratePromoSceneWithSharedShots } from '@/lib/publish/buildPromoScene'
import {
  appendLanguageClipTake,
  presentSegmentForStream,
  withSelectedLanguageClip,
} from '@/lib/scene/languageClipVersions'
import { buildBeatVideoClips } from '@/lib/scene/buildBeatVideoClips'
import { videoRailStatus } from '@/lib/vision/videoClipFilters'

const CLIP_A = 'https://blob.example/segments/a.mp4'
const CLIP_B = 'https://blob.example/segments/b.mp4'
const STILL = 'https://blob.example/frames/start.jpeg'

describe('listPlayableTakes / resolveLiveTake', () => {
  it('prefers currentTakeId, then the active URL, then the latest complete take', () => {
    const takes = [
      { id: 'new', createdAt: '2026-03-01T00:00:00.000Z', assetUrl: CLIP_B, status: 'COMPLETE' },
      { id: 'old', createdAt: '2026-01-01T00:00:00.000Z', assetUrl: CLIP_A, status: 'COMPLETE' },
    ]
    expect(resolveLiveTake(takes, 'old', CLIP_B)?.id).toBe('old')
    expect(resolveLiveTake(takes, undefined, CLIP_A)?.url).toBe(CLIP_A)
    expect(resolveLiveTake(takes, undefined, undefined)?.id).toBe('new')
  })

  it('backfills a video URL that is not already stored on a take', () => {
    const listed = listPlayableTakes([], CLIP_A)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.url).toBe(CLIP_A)
    expect(listed[0]?.backfill).toBe(true)
    expect(resolveLiveTake([], undefined, CLIP_A)?.url).toBe(CLIP_A)
  })

  it('does not treat a still URL as a video version', () => {
    expect(listPlayableTakes([], STILL)).toEqual([])
    expect(
      listPlayableTakes([{ id: 'still', assetUrl: STILL, status: 'COMPLETE' }], undefined)
    ).toEqual([])
  })

  it('keeps every stored take on read, including more than the append cap', () => {
    const takes = Array.from({ length: 12 }, (_, index) => ({
      id: `t${index}`,
      createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      videoUrl: `https://blob.example/segments/${index}.mp4`,
      status: 'COMPLETE',
    }))
    expect(listPlayableTakes(takes, undefined)).toHaveLength(12)
  })

  it('uses videoUrl when assetUrl is a still', () => {
    const live = resolveLiveTake(
      [{ id: 't1', assetUrl: STILL, videoUrl: CLIP_A, status: 'COMPLETE' }],
      't1',
      undefined
    )
    expect(live?.url).toBe(CLIP_A)
  })
})

describe('appendSegmentTake', () => {
  it('prepends the newest take and caps at 10', () => {
    let takes = Array.from({ length: MEDIA_VERSION_CAP }, (_, index) => ({
      id: `t${index}`,
      assetUrl: `https://blob.example/${index}.mp4`,
    }))
    takes = appendSegmentTake(takes, { id: 'newest', assetUrl: CLIP_B })
    expect(takes).toHaveLength(MEDIA_VERSION_CAP)
    expect(takes[0]?.id).toBe('newest')
    expect(takes.some((take) => take.id === 't0')).toBe(true)
    expect(takes.some((take) => take.id === 't9')).toBe(false)
  })
})

describe('healMissingVideoPointer', () => {
  it('restores an empty pointer from a stored complete take', () => {
    const healed = healMissingVideoPointer({
      status: 'DRAFT',
      activeAssetUrl: null,
      takes: [{ id: 't1', createdAt: '2026-01-01T00:00:00.000Z', assetUrl: CLIP_A, status: 'COMPLETE' }],
    })
    expect(healed.activeAssetUrl).toBe(CLIP_A)
    expect(healed.currentTakeId).toBe('t1')
    expect(healed.assetType).toBe('video')
    expect(healed.status).toBe('COMPLETE')
  })

  it('does not overwrite a different existing video URL', () => {
    const segment = {
      status: 'COMPLETE',
      assetType: 'video' as const,
      activeAssetUrl: CLIP_B,
      currentTakeId: 't2',
      takes: [
        { id: 't1', assetUrl: CLIP_A, status: 'COMPLETE', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 't2', assetUrl: CLIP_B, status: 'COMPLETE', createdAt: '2026-02-01T00:00:00.000Z' },
      ],
    }
    expect(healMissingVideoPointer(segment)).toBe(segment)
  })

  it('does not replace a non-empty still pointer', () => {
    const segment = {
      status: 'DRAFT',
      activeAssetUrl: STILL,
      takes: [{ id: 't1', assetUrl: CLIP_A, status: 'COMPLETE' }],
    }
    expect(healMissingVideoPointer(segment)).toBe(segment)
  })

  it('leaves an in-progress segment alone', () => {
    const segment = {
      status: 'GENERATING',
      activeAssetUrl: '',
      takes: [{ id: 't1', assetUrl: CLIP_A, status: 'COMPLETE' }],
    }
    expect(healMissingVideoPointer(segment)).toBe(segment)
  })

  it('heals status to COMPLETE when activeAssetUrl is already a video URL but status is DRAFT', () => {
    const healed = healMissingVideoPointer({
      status: 'DRAFT',
      assetType: null,
      activeAssetUrl: CLIP_A,
      takes: [{ id: 't1', assetUrl: CLIP_A, status: 'COMPLETE' }],
    })
    expect(healed.status).toBe('COMPLETE')
    expect(healed.assetType).toBe('video')
    expect(healed.activeAssetUrl).toBe(CLIP_A)
  })
})

describe('applyVideoTakeSelection', () => {
  it('persists a backfilled URL into takes and makes it current', () => {
    const next = applyVideoTakeSelection(
      { activeAssetUrl: CLIP_A, takes: [], status: 'DRAFT' },
      listPlayableTakes([], CLIP_A)[0]!.id
    )
    expect(next.activeAssetUrl).toBe(CLIP_A)
    expect(next.assetType).toBe('video')
    expect(next.status).toBe('COMPLETE')
    expect(next.takes?.[0]?.assetUrl).toBe(CLIP_A)
  })
})

describe('applyVideoTakeSelection stills', () => {
  it('still points at a non-video take from history', () => {
    const next = applyVideoTakeSelection(
      {
        activeAssetUrl: CLIP_A,
        assetType: 'video',
        status: 'COMPLETE',
        takes: [
          { id: 'still', assetUrl: STILL, status: 'COMPLETE' },
          { id: 'clip', assetUrl: CLIP_A, status: 'COMPLETE' },
        ],
      },
      'still'
    )
    expect(next.activeAssetUrl).toBe(STILL)
    expect(next.currentTakeId).toBe('still')
    expect(next.assetType).toBe('video')
  })
})

describe('deriveClipQueueStatus', () => {
  it('marks a stored take complete even when segment status was cleared', () => {
    expect(
      deriveClipQueueStatus({
        status: 'DRAFT',
        activeAssetUrl: null,
        takes: [{ id: 't1', assetUrl: CLIP_A, status: 'COMPLETE' }],
      })
    ).toBe('complete')
  })

  it('keeps an in-progress generate as rendering', () => {
    expect(
      deriveClipQueueStatus({
        status: 'GENERATING',
        takes: [{ id: 't1', assetUrl: CLIP_A, status: 'COMPLETE' }],
      })
    ).toBe('rendering')
  })
})

describe('resolveSegmentClipTier and Final 1080p clip status', () => {
  it('ignores extracted video last_frame URLs in segment.references.endFrameUrl', () => {
    const beat = {
      beatId: 'bt_1',
      sequenceIndex: 0,
      kind: 'narration' as const,
      line: 'Beneath an empire built on steel and shadow...',
    }
    const segment = {
      segmentId: 'seg_1',
      beatId: 'bt_1',
      sequenceIndex: 0,
      startTime: 0,
      endTime: 10,
      status: 'COMPLETE' as const,
      assetType: 'video' as const,
      activeAssetUrl: CLIP_A,
      takes: [
        {
          id: 'take_1',
          createdAt: '2026-11-06T06:22:43.000Z',
          assetUrl: CLIP_A,
          thumbnailUrl: 'https://storage.googleapis.com/bucket/segments-seg_1-last_frame.jpg-123.jpg',
          status: 'COMPLETE' as const,
        },
      ],
      references: {
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
        endFrameUrl: 'https://storage.googleapis.com/bucket/segments-seg_1-last_frame.jpg-123.jpg',
      },
    }

    expect(resolveBeatStillTier(beat, segment)).toBeUndefined()
    expect(resolveSegmentClipTier(beat, segment)).toBeUndefined()

    const clips = buildBeatVideoClips({
      scene: { beats: [beat] },
      segments: [segment as any],
      queue: [],
    })
    expect(clips[0]?.imageTier).toBeUndefined()
    expect(
      videoRailStatus({
        key: clips[0]!.key,
        status: 'complete',
        promptChanged: false,
        imageTier: clips[0]!.imageTier,
      })
    ).toEqual({ status: 'ready', label: 'Final' })
  })

  it('resolves Final (1080p / premium) clip takes as final even when the beat has a Draft Pre-Vis still', () => {
    const beatWithDraftStill = {
      beatId: 'bt_2',
      sequenceIndex: 0,
      kind: 'narration' as const,
      line: 'Beneath an empire built on steel and shadow...',
      storyboardImageUrl: STILL,
      storyboardImageTier: 'draft' as const,
    }
    const segmentWith1080pTake = {
      segmentId: 'seg_2',
      beatId: 'bt_2',
      sequenceIndex: 0,
      startTime: 0,
      endTime: 10,
      status: 'COMPLETE' as const,
      assetType: 'video' as const,
      activeAssetUrl: CLIP_A,
      resolution: '1080p' as const,
      qualityTier: 'premium' as const,
      takes: [
        {
          id: 'take_final',
          createdAt: '2026-11-06T06:22:43.000Z',
          assetUrl: CLIP_A,
          status: 'COMPLETE' as const,
          resolution: '1080p' as const,
          qualityTier: 'premium' as const,
        },
      ],
      references: {
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
    }

    expect(resolveSegmentClipTier(beatWithDraftStill, segmentWith1080pTake)).toBe('final')

    const clips = buildBeatVideoClips({
      scene: { beats: [beatWithDraftStill] },
      segments: [segmentWith1080pTake as any],
      queue: [],
    })
    expect(clips[0]?.imageTier).toBe('final')
    expect(
      videoRailStatus({
        key: clips[0]!.key,
        status: 'complete',
        promptChanged: false,
        imageTier: clips[0]!.imageTier,
      })
    ).toEqual({ status: 'ready', label: 'Final' })
  })

  it('resolves Standard REF clips without beat start frame as final even when legacy take resolution is absent', () => {
    const beatWithDraftStill = {
      beatId: 'bt_3',
      sequenceIndex: 0,
      kind: 'narration' as const,
      storyboardImageUrl: STILL,
      storyboardImageTier: 'draft' as const,
    }
    const legacyRefSegment = {
      segmentId: 'seg_3',
      beatId: 'bt_3',
      sequenceIndex: 0,
      status: 'COMPLETE' as const,
      assetType: 'video' as const,
      activeAssetUrl: CLIP_A,
      generationProvider: 'vertex' as const,
      takes: [
        {
          id: 'take_legacy',
          createdAt: '2026-11-06T06:22:43.000Z',
          assetUrl: CLIP_A,
          status: 'COMPLETE' as const,
        },
      ],
    }

    expect(
      resolveSegmentClipTier(beatWithDraftStill, legacyRefSegment, {
        mode: 'REF',
        useBeatFrameAsStart: false,
      })
    ).toBe('final')
  })
})

describe('master and promo clip version selection (dropdown + button strip)', () => {
  it('orders master clip versions oldest-first (v1..vN) with equal-timestamp tie-breaking and pins older selections', () => {
    const sameTs = '2026-04-01T10:00:00.000Z'
    let takes = appendSegmentTake(undefined, {
      id: 'take_1',
      createdAt: sameTs,
      assetUrl: CLIP_A,
      status: 'COMPLETE' as const,
    })
    takes = appendSegmentTake(takes, {
      id: 'take_2',
      createdAt: sameTs,
      assetUrl: CLIP_B,
      status: 'COMPLETE' as const,
    })

    const chrono = chronologicalPlayableTakes(takes, CLIP_B)
    expect(chrono.map((t) => t.id)).toEqual(['take_1', 'take_2'])

    const initialOptions = listClipVersionOptions(takes, 'take_2', CLIP_B)
    expect(initialOptions.map((o) => `${o.label}:${o.id}:${o.isCurrent}`)).toEqual([
      'v1:take_1:false',
      'v2:take_2:true',
    ])
    expect(clipVersionSelectionValue(initialOptions)).toBe('latest')

    const restored = applyVideoTakeSelection(
      {
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: CLIP_B,
        currentTakeId: 'take_2',
        takes,
      },
      'take_1'
    )
    expect(restored.currentTakeId).toBe('take_1')
    expect(restored.activeAssetUrl).toBe(CLIP_A)
    expect(restored.currentTakeSelectedAt).toBeTruthy()

    const restoredOptions = listClipVersionOptions(
      restored.takes,
      restored.currentTakeId,
      restored.activeAssetUrl
    )
    expect(restoredOptions.map((o) => `${o.label}:${o.id}:${o.isCurrent}`)).toEqual([
      'v1:take_1:true',
      'v2:take_2:false',
    ])
    expect(clipVersionSelectionValue(restoredOptions)).toBe('take_1')
  })

  it('persists restored older clip versions across server merge even when legacy takes lacked an id', () => {
    const legacyTakes = [
      { createdAt: '2026-04-02T00:00:00.000Z', assetUrl: CLIP_B, status: 'COMPLETE' as const },
      { createdAt: '2026-04-01T00:00:00.000Z', assetUrl: CLIP_A, status: 'COMPLETE' as const },
    ]
    const options = listClipVersionOptions(legacyTakes as any, undefined, CLIP_B)
    expect(options).toHaveLength(2)
    const v1 = options[0]!

    const selectedSeg = applyVideoTakeSelection(
      {
        segmentId: 'seg_1',
        sequenceIndex: 0,
        startTime: 0,
        endTime: 8,
        status: 'COMPLETE' as const,
        assetType: 'video' as const,
        activeAssetUrl: CLIP_B,
        takes: legacyTakes as any,
        references: { characterIds: [], sceneRefIds: [], objectRefIds: [] },
      },
      v1.id
    )

    const merged = mergeSceneProductionData(
      {
        isSegmented: true,
        targetSegmentDuration: 8,
        segments: [
          {
            ...selectedSeg,
            activeAssetUrl: CLIP_B,
            currentTakeId: options[1]!.id,
            currentTakeSelectedAt: '2026-04-02T00:00:00.000Z',
          } as any,
        ],
      },
      {
        isSegmented: true,
        targetSegmentDuration: 8,
        segments: [selectedSeg as any],
      }
    )!

    expect(merged.segments[0]?.currentTakeId).toBe(v1.id)
    expect(merged.segments[0]?.activeAssetUrl).toBe(CLIP_A)
  })

  it('does not snap back to the newest take during Promo shared-shot hydration when an older v1 take is selected', () => {
    const v1Url = 'https://blob.vercel-storage.com/segments/seg-1790001000000.mp4'
    const v2Url = 'https://blob.vercel-storage.com/segments/seg-1790002000000.mp4'
    const sharedTakes = [
      {
        id: 'take_v2',
        createdAt: '2026-04-01T12:00:00.000Z',
        assetUrl: v2Url,
        status: 'COMPLETE' as const,
        resolution: '1080p' as const,
      },
      {
        id: 'take_v1',
        createdAt: '2026-04-01T10:00:00.000Z',
        assetUrl: v1Url,
        status: 'COMPLETE' as const,
        resolution: '720p' as const,
      },
    ]

    const promoScene = {
      id: 'promo-main',
      cinematicType: 'promo',
      beats: [
        {
          beatId: 'bt_promo_0',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Hero turns toward the door.',
          sourceSceneIndex: 0,
          sourceSceneId: 'scene-1',
          sourceBeatId: 'bt_src_0',
          durationSeconds: 6,
        },
      ],
    }
    const scenes = [
      {
        id: 'scene-1',
        beats: [
          {
            beatId: 'bt_src_0',
            sequenceIndex: 0,
            kind: 'action',
            actionDescription: 'Hero turns toward the door.',
          },
        ],
      },
      promoScene,
    ]

    const baseSourceSeg = {
      segmentId: 'seg_src_0',
      beatId: 'bt_src_0',
      sequenceIndex: 0,
      startTime: 0,
      endTime: 6,
      status: 'COMPLETE' as const,
      assetType: 'video' as const,
      activeAssetUrl: v2Url,
      currentTakeId: 'take_v2',
      currentTakeSelectedAt: '2026-04-01T12:00:00.000Z',
      resolution: '1080p' as const,
      takes: sharedTakes,
      references: { characterIds: [], sceneRefIds: [], objectRefIds: [] },
    }
    const basePromoSeg = {
      ...baseSourceSeg,
      segmentId: 'promo-main-seg-0',
      beatId: 'bt_promo_0',
    }

    // 1. Selecting older v1 from Promo scene keeps v1 active even before/after source sync
    const promoPickedV1 = applyVideoTakeSelection(basePromoSeg, 'take_v1')
    const hydratedFromPromoPick = hydratePromoSceneWithSharedShots(promoScene, scenes, {
      'scene-1': { isSegmented: true, targetSegmentDuration: 6, segments: [baseSourceSeg] },
      'promo-main': { isSegmented: true, targetSegmentDuration: 6, segments: [promoPickedV1] },
    } as never)
    expect(hydratedFromPromoPick.productionData.segments[0]?.currentTakeId).toBe('take_v1')
    expect(hydratedFromPromoPick.productionData.segments[0]?.activeAssetUrl).toBe(v1Url)
    expect(hydratedFromPromoPick.productionData.segments[0]?.resolution).toBe('720p')

    // 2. Selecting older v1 from Source scene keeps v1 active even when Promo held newer v2 blob URL
    const sourcePickedV1 = applyVideoTakeSelection(baseSourceSeg, 'take_v1')
    const hydratedFromSourcePick = hydratePromoSceneWithSharedShots(promoScene, scenes, {
      'scene-1': { isSegmented: true, targetSegmentDuration: 6, segments: [sourcePickedV1] },
      'promo-main': { isSegmented: true, targetSegmentDuration: 6, segments: [basePromoSeg] },
    } as never)
    expect(hydratedFromSourcePick.productionData.segments[0]?.currentTakeId).toBe('take_v1')
    expect(hydratedFromSourcePick.productionData.segments[0]?.activeAssetUrl).toBe(v1Url)
    expect(hydratedFromSourcePick.productionData.segments[0]?.resolution).toBe('720p')

    // 3. Selecting older localized v1 on a language stream also stays pinned across Promo hydration
    let langVersions = appendLanguageClipTake(undefined, 'es', {
      id: 'es_v1',
      createdAt: '2026-04-01T10:00:00.000Z',
      assetUrl: 'https://cdn.example/es-v1.mp4',
      status: 'COMPLETE',
    })
    langVersions = appendLanguageClipTake(langVersions, 'es', {
      id: 'es_v2',
      createdAt: '2026-04-01T12:00:00.000Z',
      assetUrl: 'https://cdn.example/es-v2.mp4',
      status: 'COMPLETE',
    })
    const promoWithLang = { ...basePromoSeg, languageVersions: langVersions }
    const sourcePinnedLangV1 = withSelectedLanguageClip(
      { ...baseSourceSeg, languageVersions: langVersions },
      'es',
      'es_v1'
    )
    const hydratedLangPick = hydratePromoSceneWithSharedShots(promoScene, scenes, {
      'scene-1': { isSegmented: true, targetSegmentDuration: 6, segments: [sourcePinnedLangV1] },
      'promo-main': { isSegmented: true, targetSegmentDuration: 6, segments: [promoWithLang] },
    } as never)
    const hydratedLangSeg = hydratedLangPick.productionData.segments[0]!
    expect(hydratedLangSeg.languageVersions?.es.currentTakeId).toBe('es_v1')
    expect(presentSegmentForStream(hydratedLangSeg, 'es').activeAssetUrl).toBe(
      'https://cdn.example/es-v1.mp4'
    )
  })
})
