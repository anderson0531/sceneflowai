import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  backoffMsFor429Attempt,
  backoffMsForPolicyAttempt,
  getGoogleTtsPolicyMaxRetries,
  parseRetryAfterMs,
  parseVertexTtsRateLimit,
  sleep,
} from '@/lib/tts/googleTtsRetry'

describe('googleTtsRetry', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.GOOGLE_TTS_POLICY_MAX_RETRIES
  })

  it('parseRetryAfterMs parses delta seconds', () => {
    expect(parseRetryAfterMs('15')).toBe(15000)
  })

  it('backoff respects attempt index bounds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(backoffMsFor429Attempt(0, null)).toBe(1250)
    expect(backoffMsFor429Attempt(2, null)).toBe(5000)
  })

  it('backoffMsForPolicyAttempt grows and caps', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(backoffMsForPolicyAttempt(0)).toBe(400)
    expect(backoffMsForPolicyAttempt(1)).toBe(800)
    expect(backoffMsForPolicyAttempt(10)).toBe(3000)
  })

  it('getGoogleTtsPolicyMaxRetries defaults to 2 and caps env override', () => {
    expect(getGoogleTtsPolicyMaxRetries()).toBe(2)
    process.env.GOOGLE_TTS_POLICY_MAX_RETRIES = '6'
    expect(getGoogleTtsPolicyMaxRetries()).toBe(4)
    process.env.GOOGLE_TTS_POLICY_MAX_RETRIES = 'invalid'
    expect(getGoogleTtsPolicyMaxRetries()).toBe(2)
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
