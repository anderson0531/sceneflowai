import { describe, expect, it } from 'vitest'
import type { SceneProductionData, SceneSegment } from '@/components/vision/scene-production/types'
import { mergeSceneProductionData } from '@/lib/storyboard/mergeProductionMedia'

function segment(overrides: Partial<SceneSegment> = {}): SceneSegment {
  return {
    segmentId: 'seg_1',
    sequenceIndex: 0,
    startTime: 0,
    endTime: 8,
    status: 'COMPLETE',
    assetType: 'video',
    references: { characterIds: [], sceneRefIds: [], objectRefIds: [] },
    takes: [],
    ...overrides,
  }
}

describe('mergeSceneProductionData', () => {
  it('unions takes by id and does not wipe history when incoming takes are empty', () => {
    const existing: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [
        segment({
          takes: [{ id: 't1', createdAt: '2026-01-01T00:00:00.000Z', assetUrl: 'a.mp4', status: 'COMPLETE' }],
          currentTakeId: 't1',
          activeAssetUrl: 'a.mp4',
        }),
      ],
    }
    const incoming: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [segment({ takes: [], activeAssetUrl: 'a.mp4' })],
    }

    const merged = mergeSceneProductionData(existing, incoming)!
    expect(merged.segments[0].takes.map((take) => take.id)).toEqual(['t1'])
    expect(merged.segments[0].currentTakeId).toBe('t1')
  })

  it('unions production streams by id', () => {
    const existing: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [],
      productionStreams: [
        {
          id: 's1',
          streamType: 'video',
          language: 'en',
          languageLabel: 'English',
          status: 'complete',
          streamVersion: 1,
        },
      ],
    }
    const incoming: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [],
      productionStreams: [
        {
          id: 's2',
          streamType: 'video',
          language: 'en',
          languageLabel: 'English',
          status: 'complete',
          streamVersion: 2,
        },
      ],
      currentStreamId: 's2',
    }

    const merged = mergeSceneProductionData(existing, incoming)!
    expect(merged.productionStreams?.map((stream) => stream.id)).toEqual(['s1', 's2'])
    expect(merged.currentStreamId).toBe('s2')
  })

  it('drops segment ids missing from the incoming list and keeps takes on the survivor', () => {
    const existing: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [
        segment({
          segmentId: 'seg_keep',
          beatId: 'bt_1',
          takes: [{ id: 't1', createdAt: '2026-01-01T00:00:00.000Z', assetUrl: 'a.mp4', status: 'COMPLETE' }],
        }),
        segment({ segmentId: 'seg_orphan', beatId: 'bt_1' }),
      ],
    }
    const incoming: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [segment({ segmentId: 'seg_keep', beatId: 'bt_1', takes: [] })],
    }
    const merged = mergeSceneProductionData(existing, incoming)!
    expect(merged.segments.map((row) => row.segmentId)).toEqual(['seg_keep'])
    expect(merged.segments[0].takes.map((take) => take.id)).toEqual(['t1'])
  })

  it('drops trim and a mixer exclusion when the incoming segment sends null', () => {
    const existing: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [
        segment({
          videoTrimInSec: 1.5,
          videoTrimOutSec: 6,
          mixerBeatIncluded: false,
        }),
      ],
    }
    const incoming: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [
        segment({
          videoTrimInSec: null,
          videoTrimOutSec: null,
          mixerBeatIncluded: null,
        }),
      ],
    }
    const merged = mergeSceneProductionData(existing, incoming)!
    expect(merged.segments[0].videoTrimInSec).toBeUndefined()
    expect(merged.segments[0].videoTrimOutSec).toBeUndefined()
    expect(merged.segments[0].mixerBeatIncluded).toBeUndefined()
  })

  it('keeps an excluded beat segment when the incoming list omits it', () => {
    const existing: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [
        segment({ segmentId: 'seg_1', beatId: 'bt_1' }),
        segment({
          segmentId: 'seg_6',
          beatId: 'bt_6',
          activeAssetUrl: 'https://cdn.example/upload.mp4',
          takes: [{ id: 'up_1', createdAt: '2026-01-01T00:00:00.000Z', assetUrl: 'https://cdn.example/upload.mp4', status: 'COMPLETE' }],
        }),
      ],
    }
    const incoming: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [segment({ segmentId: 'seg_1', beatId: 'bt_1' })],
    }
    const merged = mergeSceneProductionData(existing, incoming, { preserveBeatIds: ['bt_6'] })!
    expect(merged.segments.map((row) => row.segmentId)).toEqual(['seg_1', 'seg_6'])
    expect(merged.segments[1].activeAssetUrl).toBe('https://cdn.example/upload.mp4')
  })

  it('keeps the stored clip when a re-derive mints a new id for the same beat', () => {
    const existing: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [
        segment({
          segmentId: 'seg_stored',
          beatId: 'bt_1',
          takes: [{ id: 't1', createdAt: '2026-01-01T00:00:00.000Z', assetUrl: 'a.mp4', status: 'COMPLETE' }],
          currentTakeId: 't1',
          activeAssetUrl: 'a.mp4',
        }),
      ],
    }
    const incoming: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [
        segment({
          segmentId: 'seg_fresh',
          beatId: 'bt_1',
          status: 'DRAFT',
          assetType: null,
          takes: [],
          activeAssetUrl: undefined,
        }),
      ],
    }
    const merged = mergeSceneProductionData(existing, incoming)!
    expect(merged.segments).toHaveLength(1)
    expect(merged.segments[0].segmentId).toBe('seg_stored')
    expect(merged.segments[0].activeAssetUrl).toBe('a.mp4')
    expect(merged.segments[0].takes.map((take) => take.id)).toEqual(['t1'])
  })
})
