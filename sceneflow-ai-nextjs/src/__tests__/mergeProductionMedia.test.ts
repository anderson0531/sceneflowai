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
})
