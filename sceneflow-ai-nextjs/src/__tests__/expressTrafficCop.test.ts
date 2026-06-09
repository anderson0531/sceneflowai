import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ExpressTrafficCop } from '@/lib/sceneGeneration/expressTrafficCop'

describe('ExpressTrafficCop', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('never exceeds lane max in-flight', async () => {
    const cop = new ExpressTrafficCop({
      laneMax: { image: 2 },
      cooldownMs: 100,
    })

    let peakInFlight = 0
    const tasks = Array.from({ length: 6 }, (_, i) =>
      cop.runInLane('image', async () => {
        const snap = cop.getSnapshot().image.inFlight
        peakInFlight = Math.max(peakInFlight, snap)
        await new Promise((r) => setTimeout(r, 10))
        return i
      })
    )

    await vi.runAllTimersAsync()
    await Promise.all(tasks)
    expect(peakInFlight).toBeLessThanOrEqual(2)
  })

  it('reportRateLimit halves max and invokes onThrottle', () => {
    const onThrottle = vi.fn()
    const cop = new ExpressTrafficCop({
      laneMax: { text: 6 },
      cooldownMs: 5000,
      onThrottle,
    })

    cop.reportRateLimit('text')

    expect(cop.getSnapshot().text.max).toBe(3)
    expect(onThrottle).toHaveBeenCalledWith('text', 3, 5000)
  })

  it('blocks acquires during cooldown then resumes', async () => {
    const cop = new ExpressTrafficCop({
      laneMax: { audio: 1 },
      cooldownMs: 2000,
    })

    cop.reportRateLimit('audio')
    expect(cop.getSnapshot().audio.max).toBe(1)

    let resolved = false
    const pending = cop.runInLane('audio', async () => {
      resolved = true
      return 'ok'
    })

    await vi.advanceTimersByTimeAsync(500)
    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(2000)
    await pending
    expect(resolved).toBe(true)
  })

  it('reportRateLimit on retryable errors from runInLane', async () => {
    const onThrottle = vi.fn()
    const cop = new ExpressTrafficCop({
      laneMax: { image: 4 },
      cooldownMs: 1000,
      onThrottle,
    })

    await expect(
      cop.runInLane('image', async () => {
        throw new Error('HTTP 429: RESOURCE_EXHAUSTED')
      })
    ).rejects.toThrow('429')

    expect(cop.getSnapshot().image.max).toBe(2)
    expect(onThrottle).toHaveBeenCalledWith('image', 2, 1000)
  })
})
