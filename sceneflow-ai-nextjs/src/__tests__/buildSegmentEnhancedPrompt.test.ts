import { describe, expect, it } from 'vitest'
import { buildSegmentEnhancedPrompt } from '@/lib/video/buildSegmentEnhancedPrompt'

describe('buildSegmentEnhancedPrompt', () => {
  it('returns base prompt for simple T2V', () => {
    const { enhancedPrompt } = buildSegmentEnhancedPrompt({
      prompt: 'A character walks through a sunlit garden.',
      method: 'T2V',
    })
    expect(enhancedPrompt).toContain('sunlit garden')
  })

  it('appends guide prompt and audio hint for T2V with guide', () => {
    const { enhancedPrompt } = buildSegmentEnhancedPrompt({
      prompt: 'Slow dolly on Elara in an office.',
      guidePrompt: "ELARA says: 'Hello there.'",
      method: 'T2V',
    })
    expect(enhancedPrompt).toContain('Slow dolly on Elara')
    expect(enhancedPrompt).toContain("ELARA says: 'Hello there.'")
    expect(enhancedPrompt).toContain('native synchronized audio')
  })

  it('builds REF multimodal preamble and reference fallback', () => {
    const { enhancedPrompt, referenceFallbackPrompt } = buildSegmentEnhancedPrompt({
      prompt: 'Elara leans forward during an interview.',
      guidePrompt: "ELARA says: 'It was not me.'",
      method: 'REF',
      referenceImages: [
        {
          url: 'https://example.com/id.png',
          type: 'character',
          name: 'Identity reference 1: Elara Vance',
          role: 'identity',
        },
      ],
    })
    expect(enhancedPrompt).toContain('References: keep the subject')
    expect(enhancedPrompt).toContain('Elara leans forward')
    expect(enhancedPrompt).toContain("ELARA says: 'It was not me.'")
    expect(referenceFallbackPrompt).toBeDefined()
    expect(referenceFallbackPrompt).not.toContain('References: keep the subject')
  })

  it('adds audio-visual sync context when provided', () => {
    const { enhancedPrompt } = buildSegmentEnhancedPrompt({
      prompt: 'Interview scene.',
      method: 'I2V',
      audioContext: {
        emotionalTone: 'tense',
        dialogueBeat: 'accusation denied',
      },
    })
    expect(enhancedPrompt).toContain('[Audio-Visual Sync Context]')
    expect(enhancedPrompt).toContain('tense')
  })
})
