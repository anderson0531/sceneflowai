import { describe, expect, it } from 'vitest'
import {
  formatTrimTimeSec,
  parseTrimTimeInput,
  resolveSegmentSourceDurationSec,
  resolveVideoTrimWindow,
} from '@/lib/video/segmentVideoTrim'

describe('segmentVideoTrim', () => {
  it('resolveVideoTrimWindow defaults to full source when unset', () => {
    const w = resolveVideoTrimWindow({}, 8)
    expect(w.inSec).toBe(0)
    expect(w.outSec).toBe(8)
    expect(w.playableSec).toBe(8)
    expect(w.isTrimmed).toBe(false)
  })

  it('resolveVideoTrimWindow applies in and out points', () => {
    const w = resolveVideoTrimWindow({ videoTrimInSec: 3, videoTrimOutSec: 7 }, 8)
    expect(w.inSec).toBe(3)
    expect(w.outSec).toBe(7)
    expect(w.playableSec).toBe(4)
    expect(w.isTrimmed).toBe(true)
  })

  it('resolveVideoTrimWindow clamps invalid ranges', () => {
    const w = resolveVideoTrimWindow({ videoTrimInSec: 10, videoTrimOutSec: 2 }, 8)
    expect(w.playableSec).toBeGreaterThanOrEqual(0.5)
    expect(w.outSec).toBeLessThanOrEqual(8)
  })

  it('resolveSegmentSourceDurationSec prefers measured duration', () => {
    expect(
      resolveSegmentSourceDurationSec({ actualVideoDuration: 6, startTime: 0, endTime: 4 }, 9)
    ).toBe(9)
  })

  it('formatTrimTimeSec and parseTrimTimeInput round-trip', () => {
    expect(formatTrimTimeSec(65.2)).toBe('1:05.2')
    expect(parseTrimTimeInput('1:05.2')).toBeCloseTo(65.2)
    expect(parseTrimTimeInput('3.5')).toBe(3.5)
  })
})
