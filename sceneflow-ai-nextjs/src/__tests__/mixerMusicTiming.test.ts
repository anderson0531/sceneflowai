import { describe, it, expect } from 'vitest'
import {
  getMusicTrackTiming,
  isMusicActiveInBeatWindow,
} from '@/lib/scene/mixerMusicTiming'
import type { AudioTrackConfig } from '@/components/vision/scene-production/types'
import type { SceneSegment } from '@/components/vision/scene-production/types'

const baseMusicConfig = (): AudioTrackConfig => ({
  enabled: true,
  volume: 0.4,
  startOffset: 0,
  startSegment: 0,
  endSegment: -1,
  loop: true,
  fadeInSec: 0,
  fadeOutSec: 0,
  playbackRate: 1,
})

const seg = (id: string, duration: number): SceneSegment =>
  ({
    segmentId: id,
    sequenceIndex: 0,
    startTime: 0,
    endTime: duration,
    status: 'COMPLETE',
    assetType: 'video',
    takes: [],
    segmentDirection: null,
    transitionType: 'CUT',
    generationMethod: 'REF',
    references: {},
    action: '',
    beatId: id,
  }) as SceneSegment

describe('getMusicTrackTiming', () => {
  const getDur = (s: SceneSegment) => s.endTime - s.startTime

  it('returns full scene span when endSegment is -1', () => {
    const segments = [seg('a', 5), seg('b', 8), seg('c', 4)]
    const timing = getMusicTrackTiming(baseMusicConfig(), segments, getDur)
    expect(timing.startTime).toBe(0)
    expect(timing.duration).toBe(17)
    expect(timing.endTime).toBe(17)
  })

  it('returns timing for a single selected beat in the middle', () => {
    const segments = [seg('a', 5), seg('b', 8), seg('c', 4)]
    const cfg = { ...baseMusicConfig(), startSegment: 1, endSegment: 1 }
    const timing = getMusicTrackTiming(cfg, segments, getDur)
    expect(timing.startTime).toBe(5)
    expect(timing.duration).toBe(8)
    expect(timing.endTime).toBe(13)
  })

  it('returns timing for beats 1 through 3', () => {
    const segments = [seg('a', 5), seg('b', 8), seg('c', 4)]
    const cfg = { ...baseMusicConfig(), startSegment: 0, endSegment: 2 }
    const timing = getMusicTrackTiming(cfg, segments, getDur)
    expect(timing.startTime).toBe(0)
    expect(timing.duration).toBe(17)
    expect(timing.endTime).toBe(17)
  })
})

describe('isMusicActiveInBeatWindow', () => {
  const start = 5
  const end = 13

  it('is false before the window', () => {
    expect(isMusicActiveInBeatWindow(4.9, start, end, true)).toBe(false)
    expect(isMusicActiveInBeatWindow(0, start, end, true)).toBe(false)
  })

  it('is true inside the window', () => {
    expect(isMusicActiveInBeatWindow(5, start, end, true)).toBe(true)
    expect(isMusicActiveInBeatWindow(10, start, end, true)).toBe(true)
    expect(isMusicActiveInBeatWindow(12.99, start, end, true)).toBe(true)
  })

  it('is false at and after musicEndTime even when loop would have kept playing (regression)', () => {
    expect(isMusicActiveInBeatWindow(13, start, end, true)).toBe(false)
    expect(isMusicActiveInBeatWindow(20, start, end, true)).toBe(false)
  })

  it('is false when not playing', () => {
    expect(isMusicActiveInBeatWindow(10, start, end, false)).toBe(false)
  })
})
