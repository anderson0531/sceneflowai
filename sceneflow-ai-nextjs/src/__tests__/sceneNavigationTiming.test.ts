import { describe, expect, it } from 'vitest'
import {
  buildSceneNavigationTimeline,
  formatNavigationClock,
  NAVIGATION_SECONDS_PER_BEAT,
  sceneNavigationDurationSeconds,
} from '@/lib/script/sceneNavigationTiming'

function sceneWithBeats(count: number, excludedFrom = count) {
  return {
    beats: Array.from({ length: count }, (_, index) => ({
      beatId: `b${index}`,
      sequenceIndex: index,
      kind: 'action' as const,
      excluded: index >= excludedFrom,
    })),
  }
}

describe('sceneNavigationTiming', () => {
  it('counts active beats at 10 seconds each', () => {
    expect(NAVIGATION_SECONDS_PER_BEAT).toBe(10)
    expect(sceneNavigationDurationSeconds(sceneWithBeats(4))).toBe(40)
  })

  it('skips excluded beats', () => {
    expect(sceneNavigationDurationSeconds(sceneWithBeats(3, 2))).toBe(20)
  })

  it('is zero when a scene has no active beats', () => {
    expect(sceneNavigationDurationSeconds({})).toBe(0)
    expect(sceneNavigationDurationSeconds(sceneWithBeats(2, 0))).toBe(0)
  })

  it('accumulates start, end, and total across scenes', () => {
    const { marks, totalSeconds } = buildSceneNavigationTimeline([
      sceneWithBeats(2),
      sceneWithBeats(1),
      {},
    ])
    expect(marks.map((mark) => mark.startSeconds)).toEqual([0, 20, 30])
    expect(marks.map((mark) => mark.endSeconds)).toEqual([20, 30, 30])
    expect(marks.map((mark) => mark.durationSeconds)).toEqual([20, 10, 0])
    expect(totalSeconds).toBe(30)
  })

  it('formats floored clocks', () => {
    expect(formatNavigationClock(0)).toBe('0:00')
    expect(formatNavigationClock(200)).toBe('3:20')
    expect(formatNavigationClock(2890)).toBe('48:10')
    expect(formatNavigationClock(10.9)).toBe('0:10')
  })
})
