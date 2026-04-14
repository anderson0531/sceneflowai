import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/vertexai/gemini', () => ({
  generateText: vi.fn(),
}))

import { generateText } from '@/lib/vertexai/gemini'
import { adaptScriptForTranslationTiming, estimateSyllables } from '@/lib/translation/scriptAdaptation'

describe('estimateSyllables', () => {
  it('returns a reasonable count for english text', () => {
    const count = estimateSyllables('This is a simple sentence for timing checks.')
    expect(count).toBeGreaterThanOrEqual(8)
    expect(count).toBeLessThanOrEqual(14)
  })

  it('supports cjk fallback estimation', () => {
    const count = estimateSyllables('こんにちは世界', 'ja')
    expect(count).toBeGreaterThan(0)
  })
})

describe('adaptScriptForTranslationTiming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ENABLE_PRETRANSLATION_ADAPTATION = 'true'
  })

  it('passes through when already within target budget', async () => {
    const sourceText = 'Keep this short and clear.'
    const result = await adaptScriptForTranslationTiming({
      sourceText,
      targetLanguage: 'de',
      targetSyllableBudget: estimateSyllables(sourceText, 'en'),
    })

    expect(result.adaptedText).toBe(sourceText)
    expect(result.diagnostics.strategy).toBe('passthrough')
    expect(generateText).not.toHaveBeenCalled()
  })

  it('rewrites using llm when out of tolerance', async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: 'Shorter phrasing keeps the meaning.',
    } as any)

    const result = await adaptScriptForTranslationTiming({
      sourceText:
        'This line is intentionally very long and descriptive so it exceeds a strict syllable budget before translation.',
      targetLanguage: 'de',
      targetSyllableBudget: 6,
      tolerancePercent: 0.1,
    })

    expect(generateText).toHaveBeenCalledOnce()
    expect(result.diagnostics.strategy).toBe('llm-rewrite')
    expect(result.adaptedText).toBe('Shorter phrasing keeps the meaning.')
  })

  it('falls back to source text when rewrite fails', async () => {
    vi.mocked(generateText).mockRejectedValue(new Error('model unavailable'))
    const sourceText = 'A long sentence that should trigger adaptation logic before translation.'

    const result = await adaptScriptForTranslationTiming({
      sourceText,
      targetLanguage: 'de',
      targetSyllableBudget: 5,
      tolerancePercent: 0.05,
    })

    expect(result.adaptedText).toBe(sourceText)
    expect(result.diagnostics.usedFallback).toBe(true)
    expect(result.diagnostics.strategy).toBe('fallback')
  })
})
