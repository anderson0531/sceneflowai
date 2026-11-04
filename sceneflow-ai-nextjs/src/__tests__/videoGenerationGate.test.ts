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
    const releases: Array<() => void> = []
    const holds = Array.from({ length: 3 }, (_, idx) =>
      new Promise<void>((resolve) => {
        releases[idx] = resolve
      })
    )

    const track = (hold: Promise<void>) =>
      runInVideoGenerationGate(async () => {
        started += 1
        inFlight += 1
        peak = Math.max(peak, inFlight)
        await hold
        inFlight -= 1
      })

    const jobs = holds.map((hold) => track(hold))

    expect(started).toBe(2)
    expect(inFlight).toBe(2)
    expect(getVideoGenerationGateInFlight()).toBe(2)
    expect(peak).toBe(2)

    releases[0]?.()
    await jobs[0]
    expect(started).toBe(3)
    expect(peak).toBe(2)
    expect(getVideoGenerationGateInFlight()).toBe(2)

    for (let i = 1; i < 3; i++) releases[i]?.()
    await Promise.all(jobs.slice(1))
    expect(peak).toBe(2)
    expect(getVideoGenerationGateInFlight()).toBe(0)
  })
})