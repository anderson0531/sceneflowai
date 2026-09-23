import { describe, expect, it } from 'vitest'
import {
  filterMixerIncludedSegments,
  isMixerBeatIncluded,
  listIncludedBeatVideos,
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
})
