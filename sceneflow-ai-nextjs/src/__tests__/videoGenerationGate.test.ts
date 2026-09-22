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

  it('never runs more than two video generations at once', async () => {
    expect(CONCURRENCY_DEFAULTS.VIDEO_GENERATION).toBe(2)
    let inFlight = 0
    let peak = 0
    let release: (() => void) | undefined
    const hold = new Promise<void>((resolve) => {
      release = resolve
    })

    const first = runInVideoGenerationGate(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await hold
      inFlight -= 1
    })
    const second = runInVideoGenerationGate(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await hold
      inFlight -= 1
    })
    const third = runInVideoGenerationGate(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      inFlight -= 1
    })

    await Promise.resolve()
    expect(getVideoGenerationGateInFlight()).toBe(2)
    release?.()
    await Promise.all([first, second, third])
    expect(peak).toBe(2)
    expect(getVideoGenerationGateInFlight()).toBe(0)
  })
})