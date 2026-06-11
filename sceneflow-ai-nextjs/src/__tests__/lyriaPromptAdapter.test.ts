import { describe, it, expect } from 'vitest'
import {
  adaptPromptForLyria,
  buildLyriaFallbackPrompts,
  extractFirstSentence,
  isLyriaRecitationError,
  LYRIA_RECITATION_ERROR_CODE,
  stripInlineVisualSync,
} from '@/lib/audio/lyriaPromptAdapter'

const AURA_PROMPT =
  "A deep, resonant synth pad begins, slowly building with ethereal, shimmering arpeggios as the digital landscape is revealed. As the golden tendril appears, a subtle, hopeful high-frequency synth melody emerges, contrasting with the cold. When biometric data is scanned and deconstructed, a rhythmic, pulsing digital beat joins, increasing in tempo and intensity, giving a sense of relentless, invasive processing. During the neural network tracking shot, the music swells with a driving, slightly ominous electronic beat, layered with high-frequency digital chirps and sweeps, creating an overwhelming, accelerating information flow, punctuated by the struggling, rising golden melody. The music peaks as the title 'AURA'S ECHO' appears, hitting a powerful, sustained, yet cold, orchestral and synth chord, which then resolves into a warm, harmonious, and hopeful crescendo as the golden light takes over, slowly fading into the transition."

const ROCK_PROMPT =
  "An UPBEAT, ENERGIZING ROCK track immediately kicks in with driving drums and a powerful, distorted guitar riff. As the digital maelstrom intensifies, the music builds with rapid-fire guitar solos and a thumping bass line, maintaining a high-energy, almost rebellious feel. When the gold/amber flares appear, a soaring, melodic guitar lead emerges, cutting through the heavy rock, suggesting a resilient human spirit. During the biometric data flashes, the drum beat becomes more intricate and aggressive, punctuated by quick, sharp guitar stabs. As the camera plunges through neural networks, the music reaches a frenetic, almost chaotic climax with blistering guitar work and a relentless rhythm section, driving forward with unstoppable force. The music hits a full, impactful power chord as 'AURA'S ECHO' appears, holding the powerful, sustained rock energy. It then resolves into a final, triumphant, and hopeful guitar riff and drum beat as the golden light takes over, slowly fading into the transition."

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

describe('extractFirstSentence', () => {
  it('returns only the opening sentence', () => {
    expect(extractFirstSentence(ROCK_PROMPT)).toBe(
      'An UPBEAT, ENERGIZING ROCK track immediately kicks in with driving drums and a powerful, distorted guitar riff'
    )
  })
})

describe('stripInlineVisualSync', () => {
  it('removes trailing as-the clauses within one sentence', () => {
    const first = extractFirstSentence(AURA_PROMPT)
    expect(stripInlineVisualSync(first)).toBe(
      'A deep, resonant synth pad begins, slowly building with ethereal, shimmering arpeggios'
    )
  })
})

describe('adaptPromptForLyria', () => {
  it('preserves the rock spotting sheet opening sentence', () => {
    const adapted = adaptPromptForLyria(ROCK_PROMPT)
    expect(wordCount(adapted)).toBeLessThanOrEqual(30)
    expect(adapted.toLowerCase()).toContain('distorted guitar riff')
    expect(adapted.toLowerCase()).not.toMatch(/\bwhen\b/)
    expect(adapted.toLowerCase()).not.toMatch(/\bas the\b/)
    expect(adapted.toLowerCase()).toContain('instrumental')
  })

  it('shortens the AURA spotting sheet using the first music sentence', () => {
    const adapted = adaptPromptForLyria(AURA_PROMPT)
    expect(wordCount(adapted)).toBeLessThanOrEqual(30)
    expect(adapted.toLowerCase()).not.toContain("aura's echo")
    expect(adapted.toLowerCase()).toContain('synth')
    expect(adapted.toLowerCase()).toContain('arpeggio')
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

  it('falls back when the first sentence is pure visual sync', () => {
    const visualOnly =
      'As the camera plunges through neural networks, the scene intensifies. When gold flares appear, music swells with guitars.'
    const adapted = adaptPromptForLyria(visualOnly)
    expect(adapted.toLowerCase()).toContain('cinematic')
    expect(adapted.toLowerCase()).toContain('instrumental')
    expect(adapted.toLowerCase()).not.toMatch(/\bas the camera\b/)
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
