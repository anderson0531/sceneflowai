import { describe, expect, it } from 'vitest'
import { DIALOGUE_PERFORMANCE_DIRECTION_RULES } from '@/lib/prompts/dialoguePerformanceDirection'

describe('DIALOGUE_PERFORMANCE_DIRECTION_RULES', () => {
  it('asks for a Gemini TTS acting brief on voiceDirection', () => {
    expect(DIALOGUE_PERFORMANCE_DIRECTION_RULES).toContain('GEMINI TTS')
    expect(DIALOGUE_PERFORMANCE_DIRECTION_RULES).toContain('voiceDirection')
    expect(DIALOGUE_PERFORMANCE_DIRECTION_RULES).toMatch(/1–2 sentences|1-2 sentences/)
    expect(DIALOGUE_PERFORMANCE_DIRECTION_RULES).toMatch(/catch a breath/i)
  })

  it('keeps compact leading tags and rejects ElevenLabs 1-3 word rules', () => {
    expect(DIALOGUE_PERFORMANCE_DIRECTION_RULES).toContain('[emotion, delivery]')
    expect(DIALOGUE_PERFORMANCE_DIRECTION_RULES).not.toMatch(/ELEVENLABS/i)
    expect(DIALOGUE_PERFORMANCE_DIRECTION_RULES).not.toContain('1-3 words')
  })
})
