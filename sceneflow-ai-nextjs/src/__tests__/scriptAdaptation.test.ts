import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/vertexai/gemini', () => ({
  generateText: vi.fn(),
}))

vi.mock('@/lib/vertexai/translate', () => ({
  translateWithVertexAI: vi.fn(),
}))

import { generateText } from '@/lib/vertexai/gemini'
import { translateWithVertexAI } from '@/lib/vertexai/translate'
import {
  adaptScriptForTranslationTiming,
  computeTargetSyllableWindow,
  estimateSyllables,
  isStoredTranslationTimedForShot,
  TIMED_DIALOGUE_ADAPTATION_SYSTEM_INSTRUCTION,
  translateAndAdaptTimedDialogue,
} from '@/lib/translation/scriptAdaptation'

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

describe('Timed Dialogue Adaptation & Translation', () => {
  const sourceWeepingLine =
    "[fragile, weeping] She knew I would run... She knew I'd invent a thousand mathematical excuses just to stay alive down in the dark."
  const literalSpanishLine =
    '[fragile, weeping] Ella sabía que yo correría... Sabía que inventaría mil excusas matemáticas solo para seguir con vida en la oscuridad.'
  const adaptedSpanishLine =
    '[fragile, weeping] Ella sabía que yo huiría... que inventaría mil cálculos solo para sobrevivir en la oscuridad.'
  const truncatedSpanishLine = 'Ella sabía que yo huiría...'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ENABLE_PRETRANSLATION_ADAPTATION = 'true'
  })

  it('computes the slow weeping syllable budget (~22-26 syllables for 10.0s)', () => {
    const window = computeTargetSyllableWindow(sourceWeepingLine, 10)
    expect(window.minSyllables).toBe(22)
    expect(window.maxSyllables).toBe(26)
    expect(window.cadenceDescription).toContain('slow, weeping cadence')
    expect(window.formattedTargetConstraint).toBe(
      '10.0s (requires slow, weeping cadence; ~22–26 syllables maximum)'
    )
  })

  it('counts Spanish accented vowels accurately and strips bracketed performance cues', () => {
    const literalSyllables = estimateSyllables(literalSpanishLine, 'es')
    const adaptedSyllables = estimateSyllables(adaptedSpanishLine, 'es')
    expect(literalSyllables).toBeGreaterThanOrEqual(32)
    expect(adaptedSyllables).toBeLessThanOrEqual(26)
    expect(adaptedSyllables).toBeLessThan(literalSyllables)
  })

  it('translates and adapts timed dialogue with TIMED_DIALOGUE_ADAPTATION_SYSTEM_INSTRUCTION and preserves [fragile, weeping]', async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: adaptedSpanishLine,
    } as any)

    const result = await translateAndAdaptTimedDialogue({
      sourceText: sourceWeepingLine,
      targetLanguage: 'es',
      targetDurationSeconds: 10,
    })

    expect(generateText).toHaveBeenCalledOnce()
    const [userPrompt, options] = vi.mocked(generateText).mock.calls[0]
    expect(options?.systemInstruction).toBe(TIMED_DIALOGUE_ADAPTATION_SYSTEM_INSTRUCTION)
    expect(userPrompt).toContain(sourceWeepingLine)
    expect(userPrompt).toContain('Target Language: Spanish')
    expect(userPrompt).toContain('10.0s (requires slow, weeping cadence; ~22–26 syllables maximum)')
    expect(result.translatedText).toBe(adaptedSpanishLine)
    expect(result.diagnostics.strategy).toBe('llm-rewrite')
    expect(result.diagnostics.usedFallback).toBe(false)
  })

  it('validates stored translations against truncation and syllable overflow via isStoredTranslationTimedForShot', () => {
    expect(
      isStoredTranslationTimedForShot(sourceWeepingLine, truncatedSpanishLine, 'es', 10)
    ).toBe(false)
    expect(
      isStoredTranslationTimedForShot(sourceWeepingLine, literalSpanishLine, 'es', 10)
    ).toBe(false)
    expect(
      isStoredTranslationTimedForShot(sourceWeepingLine, adaptedSpanishLine, 'es', 10)
    ).toBe(true)
  })

  it('falls back to Vertex NMT while preserving leading performance cues if LLM fails', async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error('LLM offline'))
    vi.mocked(translateWithVertexAI).mockResolvedValueOnce({
      translatedText: 'Ella sabía que yo huiría.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
    })

    const result = await translateAndAdaptTimedDialogue({
      sourceText: '[fragile, weeping] She knew I would run.',
      targetLanguage: 'es',
      targetDurationSeconds: 10,
    })

    expect(result.translatedText).toBe('[fragile, weeping] Ella sabía que yo huiría.')
    expect(result.diagnostics.usedFallback).toBe(true)
  })
})

