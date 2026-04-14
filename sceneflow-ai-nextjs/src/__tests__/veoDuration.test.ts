import { describe, expect, it } from 'vitest'
import { allocateVeoSplitDurations, snapToVeoDuration } from '@/lib/scene/veoDuration'

describe('veoDuration helpers', () => {
  it('snaps durations to valid veo values', () => {
    expect(snapToVeoDuration(4.2)).toBe(4)
    expect(snapToVeoDuration(6.4)).toBe(6)
    expect(snapToVeoDuration(7.9)).toBe(8)
  })

  it('uses minimum split count while staying within duration limits', () => {
    const out = allocateVeoSplitDurations(16.2, 8)
    expect(out.length).toBe(3)
    expect(out.every((d) => [4, 6, 8].includes(d))).toBe(true)
    expect(out.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(16.2)
  })

  it('prefers 12s when feasible and avoids unnecessary 4s', () => {
    expect(allocateVeoSplitDurations(15.1, 8)).toEqual([8, 8])
    expect(allocateVeoSplitDurations(17.1, 8)).toEqual([8, 6, 4])
  })

  it('chooses exact-fit combinations when possible', () => {
    expect(allocateVeoSplitDurations(10, 8)).toEqual([6, 4])
    expect(allocateVeoSplitDurations(14, 8)).toEqual([8, 6])
  })
})
