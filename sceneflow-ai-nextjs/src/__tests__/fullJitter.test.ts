import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateBackoffDelay, fullJitterDelayMs } from '@/lib/utils/retry'

describe('fullJitterDelayMs', () => {
  it('stays inside the floor and the exponential cap', () => {
    const low = fullJitterDelayMs({
      attempt: 0,
      baseMs: 2_000,
      capMs: 10_000,
      retryAfterMs: 5_000,
      random: () => 0,
    })
    const high = fullJitterDelayMs({
      attempt: 0,
      baseMs: 2_000,
      capMs: 10_000,
      retryAfterMs: 5_000,
      random: () => 1,
    })
    expect(low).toBe(5_000)
    expect(high).toBe(7_000)
    expect(high).toBeGreaterThan(low)
  })

  it('caps the random window and still honors a Retry-After floor above that cap', () => {
    const delay = fullJitterDelayMs({
      attempt: 8,
      baseMs: 2_000,
      capMs: 10_000,
      retryAfterMs: 60_000,
      random: () => 1,
    })
    expect(delay).toBe(70_000)
  })

  it('calculateBackoffDelay draws from the full window instead of adding a few hundred milliseconds', () => {
    const random = vi.spyOn(Math, 'random')
    random.mockReturnValue(0)
    expect(calculateBackoffDelay(1, 1_000, 30_000)).toBe(0)
    random.mockReturnValue(1)
    expect(calculateBackoffDelay(1, 1_000, 30_000)).toBe(2_000)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
