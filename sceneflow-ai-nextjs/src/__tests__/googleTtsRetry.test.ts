import { describe, it, expect, vi } from 'vitest'
import {
  backoffMsFor429Attempt,
  parseRetryAfterMs,
  parseVertexTtsRateLimit,
  sleep,
} from '@/lib/tts/googleTtsRetry'

describe('googleTtsRetry', () => {
  it('parseRetryAfterMs parses delta seconds', () => {
    expect(parseRetryAfterMs('15')).toBe(15000)
  })

  it('backoff respects attempt index bounds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(backoffMsFor429Attempt(0, null)).toBe(1250)
    expect(backoffMsFor429Attempt(2, null)).toBe(5000)
    vi.restoreAllMocks()
  })

  it('parseVertexTtsRateLimit returns payload only for 429', () => {
    expect(parseVertexTtsRateLimit(429, '{}')).not.toBeNull()
    expect(parseVertexTtsRateLimit(400, '{}')).toBeNull()
  })

  it('sleep resolves after timer', async () => {
    vi.useFakeTimers()
    const p = sleep(1000)
    vi.advanceTimersByTime(1000)
    await p
    vi.useRealTimers()
  })
})
