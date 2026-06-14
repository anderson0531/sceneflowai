import { describe, expect, it } from 'vitest'
import {
  isExpressImageCanaryAbortError,
  isExpressImageRateLimitError,
  isTransientExpressImageError,
  resolveExpressImageErrorStatus,
} from '@/lib/sceneGeneration/expressImageErrors'

function err(message: string, status?: number) {
  const e = new Error(message) as Error & { status?: number }
  if (status !== undefined) e.status = status
  return e
}

describe('resolveExpressImageErrorStatus', () => {
  it('reads status property', () => {
    expect(resolveExpressImageErrorStatus(err('x', 504))).toBe(504)
  })

  it('parses HTTP status from message', () => {
    expect(
      resolveExpressImageErrorStatus(
        err('Scene image generation failed (HTTP 504)')
      )
    ).toBe(504)
  })
})

describe('isTransientExpressImageError', () => {
  it.each([
    [429],
    [502],
    [503],
    [504],
  ])('returns true for HTTP %i', (status) => {
    expect(isTransientExpressImageError(err(`HTTP ${status}`, status))).toBe(true)
  })

  it('returns true for 504 message without status property', () => {
    expect(
      isTransientExpressImageError(err('Scene image generation failed (HTTP 504)'))
    ).toBe(true)
  })

  it('returns true for rate limit messages', () => {
    expect(isTransientExpressImageError(err('HTTP 429: RESOURCE_EXHAUSTED'))).toBe(
      true
    )
  })

  it('returns false for auth errors', () => {
    expect(isTransientExpressImageError(err('HTTP 403: forbidden', 403))).toBe(false)
  })
})

describe('isExpressImageCanaryAbortError', () => {
  it.each([
    [400],
    [401],
    [403],
  ])('returns true for HTTP %i', (status) => {
    expect(isExpressImageCanaryAbortError(err(`HTTP ${status}`, status))).toBe(true)
  })

  it('returns false for transient gateway errors', () => {
    expect(
      isExpressImageCanaryAbortError(err('Scene image generation failed (HTTP 504)', 504))
    ).toBe(false)
    expect(isExpressImageCanaryAbortError(err('HTTP 429', 429))).toBe(false)
  })

  it('returns true for content policy messages', () => {
    expect(isExpressImageCanaryAbortError(err('blocked by content policy'))).toBe(true)
  })
})

describe('isExpressImageRateLimitError', () => {
  it('returns true only for rate limit errors', () => {
    expect(isExpressImageRateLimitError(err('HTTP 429', 429))).toBe(true)
    expect(isExpressImageRateLimitError(err('HTTP 504', 504))).toBe(false)
  })
})
