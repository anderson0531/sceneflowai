import { describe, expect, it, beforeEach } from 'vitest'
import {
  getVideoGenerationGateInFlight,
  resetVideoGenerationGateForTests,
  runInVideoGenerationGate,
} from '@/lib/video/videoGenerationGate'
import { CONCURRENCY_DEFAULTS } from '@/lib/utils/concurrent-processor'

describe('videoGenerationGate', () => {
  beforeEach(() => {
    resetVideoGenerationGateForTests()
  })

  it('admits two video generations and holds the third', async () => {
    expect(CONCURRENCY_DEFAULTS.VIDEO_GENERATION).toBe(2)
    let started = 0
    let inFlight = 0
    let peak = 0
    let releaseFirst: (() => void) | undefined
    let releaseSecond: (() => void) | undefined
    let releaseThird: (() => void) | undefined
    const holdFirst = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const holdSecond = new Promise<void>((resolve) => {
      releaseSecond = resolve
    })
    const holdThird = new Promise<void>((resolve) => {
      releaseThird = resolve
    })

    const track = (hold: Promise<void>) =>
      runInVideoGenerationGate(async () => {
        started += 1
        inFlight += 1
        peak = Math.max(peak, inFlight)
        await hold
        inFlight -= 1
      })

    const first = track(holdFirst)
    const second = track(holdSecond)
    const third = track(holdThird)

    expect(started).toBe(2)
    expect(inFlight).toBe(2)
    expect(getVideoGenerationGateInFlight()).toBe(2)
    expect(peak).toBe(2)

    releaseFirst?.()
    await first
    expect(started).toBe(3)
    expect(peak).toBe(2)
    expect(getVideoGenerationGateInFlight()).toBe(2)

    releaseSecond?.()
    releaseThird?.()
    await Promise.all([second, third])
    expect(peak).toBe(2)
    expect(getVideoGenerationGateInFlight()).toBe(0)
  })
})