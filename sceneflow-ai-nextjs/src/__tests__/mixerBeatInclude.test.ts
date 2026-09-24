import { describe, expect, it } from 'vitest'
import {
  filterMixerIncludedSegments,
  isMixerBeatIncluded,
  listIncludedBeatVideos,
  listMixerBeatRows,
  restoreIncludedMixerBeats,
} from '@/lib/scene/mixerBeatInclude'

describe('mixerBeatInclude', () => {
  it('isMixerBeatIncluded treats undefined and true as included', () => {
    expect(isMixerBeatIncluded({})).toBe(true)
    expect(isMixerBeatIncluded({ mixerBeatIncluded: true })).toBe(true)
  })

  it('isMixerBeatIncluded treats false as excluded', () => {
    expect(isMixerBeatIncluded({ mixerBeatIncluded: false })).toBe(false)
  })

  it('filterMixerIncludedSegments keeps included segments only', () => {
    const segments = [
      { segmentId: 'a', mixerBeatIncluded: true },
      { segmentId: 'b' },
      { segmentId: 'c', mixerBeatIncluded: false },
    ]
    expect(filterMixerIncludedSegments(segments).map((s) => s.segmentId)).toEqual([
      'a',
      'b',
    ])
  })

  it('listIncludedBeatVideos keeps completed included beat videos', () => {
    const segments = [
      { segmentId: 'video', status: 'COMPLETE', activeAssetUrl: 'https://cdn.example/a.mp4', assetType: 'video' },
      { segmentId: 'still', status: 'COMPLETE', activeAssetUrl: 'https://cdn.example/a.png', assetType: 'image' },
      { segmentId: 'excluded', status: 'COMPLETE', activeAssetUrl: 'https://cdn.example/b.mp4', assetType: 'video', mixerBeatIncluded: false },
      { segmentId: 'upload', status: 'COMPLETE', activeAssetUrl: 'https://cdn.example/c.webm' },
    ] as Parameters<typeof listIncludedBeatVideos>[0]
    expect(listIncludedBeatVideos(segments).map((segment) => segment.segmentId)).toEqual([
      'video',
      'upload',
    ])
  })

  it('lists a direction-included beat that only has an uploaded take', () => {
    const scene = {
      beats: [
        { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'One' },
        { beatId: 'bt_6', sequenceIndex: 5, kind: 'action', actionDescription: 'Six', excluded: false },
        { beatId: 'bt_hidden', sequenceIndex: 6, kind: 'action', actionDescription: 'Hidden', excluded: true },
      ],
    }
    const segments = [
      {
        segmentId: 'seg_1',
        beatId: 'bt_1',
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: 'https://cdn.example/one.mp4',
      },
      {
        segmentId: 'seg_6',
        beatId: 'bt_6',
        status: 'DRAFT',
        assetType: null,
        activeAssetUrl: null,
        takes: [{ assetUrl: 'https://cdn.example/upload.mp4', status: 'COMPLETE' }],
      },
      {
        segmentId: 'seg_hidden',
        beatId: 'bt_hidden',
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: 'https://cdn.example/hidden.mp4',
      },
    ] as Parameters<typeof listMixerBeatRows>[1]
    const rows = listMixerBeatRows(scene, segments)
    expect(rows.map((row) => row.beatId)).toEqual(['bt_1', 'bt_6'])
    expect(listIncludedBeatVideos(rows.map((row) => row.segment).filter(Boolean) as NonNullable<(typeof rows)[number]['segment']>[]).map((segment) => segment.segmentId)).toEqual([
      'seg_1',
      'seg_6',
    ])
  })

  it('restores a stale mixer exclusion when the beat is included', () => {
    const segments = [
      { segmentId: 'kept', beatId: 'bt_1', mixerBeatIncluded: false },
      { segmentId: 'still-out', beatId: 'bt_2', mixerBeatIncluded: false },
    ]
    const restored = restoreIncludedMixerBeats(segments, ['bt_1'])
    expect(restored.changed).toBe(true)
    expect(restored.segments[0].mixerBeatIncluded).toBe(true)
    expect(restored.segments[1].mixerBeatIncluded).toBe(false)
    expect(filterMixerIncludedSegments(restored.segments).map((segment) => segment.segmentId)).toEqual([
      'kept',
    ])
  })
})
