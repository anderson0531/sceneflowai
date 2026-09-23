import { describe, expect, it } from 'vitest'
import {
  VERTEX_INTERACTIONS_TOO_MANY_REQUESTS,
  classifyVertexRateLimitHttp,
  isVertexBurstRateLimitMessage,
  isVertexQuotaExhaustedMessage,
  isVertexRateLimitMessage,
  parseVertexRetryAfterSeconds,
  shouldReplayInternalGenerateAsset,
} from '@/lib/gemini/vertexRateLimit'

describe('classifyVertexRateLimitHttp', () => {
  it('keeps the Interactions too_many_requests body as HTTP 429', () => {
    const classified = classifyVertexRateLimitHttp(VERTEX_INTERACTIONS_TOO_MANY_REQUESTS)

    expect(classified).toEqual({
      status: 429,
      error: VERTEX_INTERACTIONS_TOO_MANY_REQUESTS,
      retryAfter: 60,
      isRateLimited: true,
      headers: { 'Retry-After': '60' },
    })
    expect(classified?.error).toContain('too_many_requests')
    expect(classified?.error).not.toMatch(/^Rate limit reached/)
    expect(classified?.error).not.toMatch(/^Rate limit exceeded/)
  })

  it('treats quota text without a 429 as exhaustion, and 429-plus-quota as a burst', () => {
    expect(isVertexRateLimitMessage('RESOURCE_EXHAUSTED: quota')).toBe(true)
    expect(isVertexQuotaExhaustedMessage('RESOURCE_EXHAUSTED: quota')).toBe(true)
    expect(isVertexBurstRateLimitMessage(VERTEX_INTERACTIONS_TOO_MANY_REQUESTS)).toBe(true)
    expect(isVertexQuotaExhaustedMessage(VERTEX_INTERACTIONS_TOO_MANY_REQUESTS)).toBe(false)
    expect(classifyVertexRateLimitHttp('content policy blocked this prompt')).toBeNull()
  })
})

describe('parseVertexRetryAfterSeconds', () => {
  it('prefers the Retry-After header, then a body field, then 60 seconds', () => {
    expect(
      parseVertexRetryAfterSeconds(
        '45',
        JSON.stringify({ error: { code: 'too_many_requests', retryAfter: 15 } })
      )
    ).toBe(45)
    expect(
      parseVertexRetryAfterSeconds(
        null,
        JSON.stringify({ error: { code: 'too_many_requests', retryAfter: 30 } })
      )
    ).toBe(30)
    expect(parseVertexRetryAfterSeconds(null, '{"error":{"code":"too_many_requests"}}')).toBe(60)
  })
})

describe('shouldReplayInternalGenerateAsset', () => {
  it('does not replay a generate-asset 429', () => {
    expect(
      shouldReplayInternalGenerateAsset('/api/segments/seg_1/generate-asset', 429)
    ).toBe(false)
    expect(
      shouldReplayInternalGenerateAsset('/api/segments/seg_1/generate-asset', 500)
    ).toBe(true)
    expect(shouldReplayInternalGenerateAsset('/api/vision/generate-scene-audio', 429)).toBe(true)
  })
})
