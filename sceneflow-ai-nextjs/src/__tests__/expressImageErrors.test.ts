import { describe, expect, it } from 'vitest'
import {
  CHARACTER_LIKENESS_MISMATCH_CODE,
  CHARACTER_LIKENESS_MISMATCH_MESSAGE,
  isCharacterLikenessMismatchError,
  isExpressBeatPoolRetryable,
  isExpressImageCanaryAbortError,
  isExpressImageRateLimitError,
  isIdentityRefLadderExhausted,
  isIdentityRefRateLimitExhausted,
  isTransientExpressImageError,
  formatExpressImageErrorForUser,
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
    [401],
    [403],
  ])('returns true for HTTP %i', (status) => {
    expect(isExpressImageCanaryAbortError(err(`HTTP ${status}`, status))).toBe(true)
  })

  it('returns false for HTTP 400 so one bad prompt does not cancel siblings', () => {
    expect(isExpressImageCanaryAbortError(err('HTTP 400', 400))).toBe(false)
  })

  it('returns false for transient gateway errors', () => {
    expect(
      isExpressImageCanaryAbortError(err('Scene image generation failed (HTTP 504)', 504))
    ).toBe(false)
    expect(isExpressImageCanaryAbortError(err('HTTP 429', 429))).toBe(false)
  })

  it('returns false for content policy so siblings can finish', () => {
    expect(isExpressImageCanaryAbortError(err('blocked by content policy'))).toBe(false)
    expect(isExpressImageCanaryAbortError(err('blocked by safety'))).toBe(false)
  })

  it('does not abort the beat pool for missing character reference images', () => {
    expect(
      isExpressImageCanaryAbortError(
        err(
          'Talent beat is missing character reference images: Elara Vance — add in Reference Library before Frame Agent.',
          422
        )
      )
    ).toBe(false)
  })
})

describe('isExpressImageRateLimitError', () => {
  it('returns true only for rate limit errors', () => {
    expect(isExpressImageRateLimitError(err('HTTP 429', 429))).toBe(true)
    expect(isExpressImageRateLimitError(err('HTTP 504', 504))).toBe(false)
  })
})

describe('isIdentityRefRateLimitExhausted', () => {
  it('detects exhausted identity-ref 429 ladder', () => {
    expect(
      isIdentityRefRateLimitExhausted(
        err(
          'Vertex Gemini Image error 429: identity-ref rate limit exhausted after 3 retries: RESOURCE_EXHAUSTED'
        )
      )
    ).toBe(true)
    expect(isIdentityRefRateLimitExhausted(err('HTTP 429: RESOURCE_EXHAUSTED'))).toBe(
      false
    )
  })

  it('parses Vertex Gemini Image error 429 status', () => {
    expect(
      resolveExpressImageErrorStatus(
        err('Vertex Gemini Image error 429: identity-ref rate limit exhausted')
      )
    ).toBe(429)
  })
})

describe('isIdentityRefLadderExhausted', () => {
  it('is fatal only after the 3-retry ladder, not a fail-fast 1-attempt 429', () => {
    expect(
      isIdentityRefLadderExhausted(
        err(
          'Vertex Gemini Image error 429: identity-ref rate limit exhausted after 3 retries: RESOURCE_EXHAUSTED'
        )
      )
    ).toBe(true)
    expect(
      isIdentityRefLadderExhausted(
        err('Vertex Gemini Image error 429: identity-ref rate limit exhausted after 1 attempt(s)')
      )
    ).toBe(false)
  })
})

describe('isExpressBeatPoolRetryable', () => {
  it('retries gateway timeouts but not identity-ref exhaustion', () => {
    expect(isExpressBeatPoolRetryable(err('Scene image generation failed (HTTP 504)', 504))).toBe(
      true
    )
    expect(isExpressBeatPoolRetryable(err('HTTP 429: RESOURCE_EXHAUSTED', 429))).toBe(true)
    expect(
      isExpressBeatPoolRetryable(
        err(
          'Vertex Gemini Image error 429: identity-ref rate limit exhausted after 3 retries: RESOURCE_EXHAUSTED'
        )
      )
    ).toBe(false)
    expect(
      isExpressBeatPoolRetryable(
        err('Vertex Gemini Image error 429: identity-ref rate limit exhausted after 1 attempt(s)')
      )
    ).toBe(true)
  })
})

describe('character likeness mismatch', () => {
  it('is neither transient nor canary', () => {
    const likenessErr = err(CHARACTER_LIKENESS_MISMATCH_MESSAGE, 422)
    ;(likenessErr as Error & { code?: string }).code = CHARACTER_LIKENESS_MISMATCH_CODE

    expect(isCharacterLikenessMismatchError(likenessErr)).toBe(true)
    expect(isTransientExpressImageError(likenessErr)).toBe(false)
    expect(isExpressImageCanaryAbortError(likenessErr)).toBe(false)
    expect(isExpressBeatPoolRetryable(likenessErr)).toBe(false)
  })

  it('maps to a regenerable user message', () => {
    expect(
      formatExpressImageErrorForUser(
        err(CHARACTER_LIKENESS_MISMATCH_MESSAGE, 422)
      )
    ).toBe(CHARACTER_LIKENESS_MISMATCH_MESSAGE)
  })
})

describe('formatExpressImageErrorForUser', () => {
  it('maps rate limits to a short retry hint', () => {
    expect(formatExpressImageErrorForUser(err('HTTP 429: RESOURCE_EXHAUSTED', 429))).toBe(
      'Rate limited — retry this frame'
    )
    expect(
      formatExpressImageErrorForUser(
        err('Vertex Gemini Image error 429: identity-ref rate limit exhausted after 1 attempt(s)')
      )
    ).toBe('Rate limited — retry this frame')
  })

  it('maps missing reference downloads', () => {
    expect(
      formatExpressImageErrorForUser(err('Failed to download reference image: Piper Hayes'))
    ).toBe('Reference image could not be loaded — retry this frame')
  })
})
