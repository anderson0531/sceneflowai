import { describe, expect, it } from 'vitest'
import {
  filterMixerIncludedSegments,
  isMixerBeatIncluded,
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
})
