import { describe, it, expect } from 'vitest'
import {
  GEMINI_QUOTA_FALLBACK_CHAIN,
  getNextGeminiFallbackModel,
  isGeminiQuotaError,
} from '@/lib/vertexai/geminiTextFallback'

describe('geminiTextFallback', () => {
  it('chains pro → workhorse → prior → lite → 2.5-flash on quota errors', () => {
    const [pro, workhorse, prior, lite, flash25] = GEMINI_QUOTA_FALLBACK_CHAIN
    expect(pro).toBe('gemini-3.1-pro-preview')
    expect(workhorse).toBe('gemini-3.6-flash')
    expect(prior).toBe('gemini-3.5-flash')
    expect(lite).toBe('gemini-3.5-flash-lite')
    expect(flash25).toBe('gemini-2.5-flash')
    expect(getNextGeminiFallbackModel(pro)).toBe(workhorse)
    expect(getNextGeminiFallbackModel(workhorse)).toBe(prior)
    expect(getNextGeminiFallbackModel(prior)).toBe(lite)
    expect(getNextGeminiFallbackModel(lite)).toBe(flash25)
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
