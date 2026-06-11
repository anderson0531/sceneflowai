import { describe, it, expect } from 'vitest'
import {
  GEMINI_QUOTA_FALLBACK_CHAIN,
  getNextGeminiFallbackModel,
  isGeminiQuotaError,
} from '@/lib/vertexai/geminiTextFallback'

describe('geminiTextFallback', () => {
  it('chains pro → flash-lite → 2.5-flash on quota errors', () => {
    const [pro, flashLite, flash25] = GEMINI_QUOTA_FALLBACK_CHAIN
    expect(getNextGeminiFallbackModel(pro)).toBe(flashLite)
    expect(getNextGeminiFallbackModel(flashLite)).toBe(flash25)
    expect(getNextGeminiFallbackModel(flash25)).toBeNull()
  })

  it('detects 429 and RESOURCE_EXHAUSTED as quota errors', () => {
    expect(isGeminiQuotaError(new Error('HTTP 429: RESOURCE_EXHAUSTED'))).toBe(true)
    expect(isGeminiQuotaError(Object.assign(new Error('quota exceeded'), { status: 429 }))).toBe(
      true
    )
    expect(isGeminiQuotaError(new Error('HTTP 404: not found'))).toBe(false)
    expect(isGeminiQuotaError(new Error('invalid JSON'))).toBe(false)
  })

  it('returns null for unknown models', () => {
    expect(getNextGeminiFallbackModel('gemini-unknown')).toBeNull()
  })
})
