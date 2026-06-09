import { describe, it, expect } from 'vitest'
import {
  adaptPromptForLyria,
  buildLyriaFallbackPrompts,
  isLyriaRecitationError,
  LYRIA_RECITATION_ERROR_CODE,
} from '@/lib/audio/lyriaPromptAdapter'

const AURA_PROMPT =
  "A deep, resonant synth pad begins, slowly building with ethereal, shimmering arpeggios as the digital landscape is revealed. As the golden tendril appears, a subtle, hopeful high-frequency synth melody emerges, contrasting with the cold. When biometric data is scanned and deconstructed, a rhythmic, pulsing digital beat joins, increasing in tempo and intensity, giving a sense of relentless, invasive processing. During the neural network tracking shot, the music swells with a driving, slightly ominous electronic beat, layered with high-frequency digital chirps and sweeps, creating an overwhelming, accelerating information flow, punctuated by the struggling, rising golden melody. The music peaks as the title 'AURA'S ECHO' appears, hitting a powerful, sustained, yet cold, orchestral and synth chord, which then resolves into a warm, harmonious, and hopeful crescendo as the golden light takes over, slowly fading into the transition."

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

describe('adaptPromptForLyria', () => {
  it('shortens the AURA spotting sheet and removes the title', () => {
    const adapted = adaptPromptForLyria(AURA_PROMPT)
    expect(wordCount(adapted)).toBeLessThanOrEqual(30)
    expect(adapted.toLowerCase()).not.toContain("aura's echo")
    expect(adapted.toLowerCase()).toContain('instrumental')
    expect(adapted.toLowerCase()).not.toMatch(/\bas the\b/)
    expect(adapted.toLowerCase()).not.toMatch(/\bwhen\b/)
  })

  it('passes through short non-narrative prompts with minimal change', () => {
    const short = 'Soft upbeat piano melody with warm inviting tones'
    const adapted = adaptPromptForLyria(short)
    expect(adapted.toLowerCase()).toContain('piano')
    expect(adapted.toLowerCase()).toContain('instrumental')
    expect(wordCount(adapted)).toBeLessThanOrEqual(35)
  })

  it('handles empty input with a safe default', () => {
    const adapted = adaptPromptForLyria('')
    expect(adapted.length).toBeGreaterThan(10)
    expect(adapted.toLowerCase()).toContain('instrumental')
  })
})

describe('buildLyriaFallbackPrompts', () => {
  it('returns progressively simpler fallback prompts', () => {
    const fallbacks = buildLyriaFallbackPrompts(AURA_PROMPT)
    expect(fallbacks.length).toBeGreaterThanOrEqual(1)
    for (const prompt of fallbacks) {
      expect(wordCount(prompt)).toBeLessThanOrEqual(30)
      expect(prompt.toLowerCase()).toContain('instrumental')
    }
  })
})

describe('isLyriaRecitationError', () => {
  it('detects recitation block messages', () => {
    const body = JSON.stringify({
      error: {
        message:
          'Audio generation failed with the following error: All responses were blocked by recitation checks. Please modify your prompt and try again.',
      },
    })
    expect(isLyriaRecitationError(body)).toBe(true)
  })

  it('returns false for other errors', () => {
    expect(isLyriaRecitationError('{"error":{"message":"quota exceeded"}}')).toBe(false)
  })
})

describe('LYRIA_RECITATION_ERROR_CODE', () => {
  it('exports a stable client-facing code', () => {
    expect(LYRIA_RECITATION_ERROR_CODE).toBe('LYRIA_RECITATION_BLOCKED')
  })
})
