import { afterEach, describe, expect, it } from 'vitest'
import {
  GEMINI_TTS_HARM_CATEGORIES,
  buildGeminiTtsAdvancedVoiceOptions,
  getGeminiTtsSafetyThreshold,
} from '@/lib/tts/geminiTtsSafety'

describe('geminiTtsSafety', () => {
  const originalEnv = process.env.GEMINI_TTS_SAFETY_THRESHOLD

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.GEMINI_TTS_SAFETY_THRESHOLD
    } else {
      process.env.GEMINI_TTS_SAFETY_THRESHOLD = originalEnv
    }
  })

  it('defaults to GOOGLE_DEFAULT when env is unset', () => {
    delete process.env.GEMINI_TTS_SAFETY_THRESHOLD
    expect(getGeminiTtsSafetyThreshold()).toBe('GOOGLE_DEFAULT')
  })

  it('returns GOOGLE_DEFAULT for empty or explicit GOOGLE_DEFAULT', () => {
    expect(getGeminiTtsSafetyThreshold('')).toBe('GOOGLE_DEFAULT')
    expect(getGeminiTtsSafetyThreshold('   ')).toBe('GOOGLE_DEFAULT')
    expect(getGeminiTtsSafetyThreshold('GOOGLE_DEFAULT')).toBe('GOOGLE_DEFAULT')
    expect(getGeminiTtsSafetyThreshold('google_default')).toBe('GOOGLE_DEFAULT')
  })

  it('respects valid override thresholds', () => {
    expect(getGeminiTtsSafetyThreshold('BLOCK_ONLY_HIGH')).toBe('BLOCK_ONLY_HIGH')
    expect(getGeminiTtsSafetyThreshold('block_only_high')).toBe('BLOCK_ONLY_HIGH')
    expect(getGeminiTtsSafetyThreshold('OFF')).toBe('OFF')
  })

  it('falls back to GOOGLE_DEFAULT for invalid values', () => {
    expect(getGeminiTtsSafetyThreshold('BLOCK_EVERYTHING')).toBe('GOOGLE_DEFAULT')
  })

  it('buildGeminiTtsAdvancedVoiceOptions omits advancedVoiceOptions by default', () => {
    delete process.env.GEMINI_TTS_SAFETY_THRESHOLD
    expect(buildGeminiTtsAdvancedVoiceOptions()).toBeUndefined()
  })

  it('buildGeminiTtsAdvancedVoiceOptions returns a 4-category payload for an explicit threshold', () => {
    const opts = buildGeminiTtsAdvancedVoiceOptions('BLOCK_NONE')
    expect(opts).toBeDefined()
    expect(opts?.safetySettings.settings).toHaveLength(4)
    expect(opts?.safetySettings.settings.map((s) => s.category)).toEqual([
      ...GEMINI_TTS_HARM_CATEGORIES,
    ])
    expect(opts?.safetySettings.settings.every((s) => s.threshold === 'BLOCK_NONE')).toBe(true)
  })

  it('buildGeminiTtsAdvancedVoiceOptions returns undefined for GOOGLE_DEFAULT', () => {
    expect(buildGeminiTtsAdvancedVoiceOptions('GOOGLE_DEFAULT')).toBeUndefined()
    expect(buildGeminiTtsAdvancedVoiceOptions('')).toBeUndefined()
  })

  it('buildGeminiTtsAdvancedVoiceOptions applies valid override', () => {
    const opts = buildGeminiTtsAdvancedVoiceOptions('BLOCK_ONLY_HIGH')
    expect(opts?.safetySettings.settings.every((s) => s.threshold === 'BLOCK_ONLY_HIGH')).toBe(true)
  })
})
