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

  it('asks for dialogue and ambience but leaves the score to the mixer', () => {
    const { enhancedPrompt } = buildSegmentEnhancedPrompt({
      prompt: 'Slow dolly on Elara in an office.',
      guidePrompt: "ELARA says: 'Hello there.'",
      method: 'T2V',
    })
    expect(enhancedPrompt).toContain('dialogue and ambience')
    expect(enhancedPrompt).toContain('Do not generate music or score')
  })

  it('builds REF multimodal preamble and reference fallback', () => {
    const { enhancedPrompt, referenceFallbackPrompt } = buildSegmentEnhancedPrompt({
      prompt: 'Elara Vance leans forward during an interview.',
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
    expect(enhancedPrompt).toContain('Use the images above.')
    expect(enhancedPrompt).toContain(
      'person [1] (Elara Vance) is the person in the identity image of person [1].'
    )
    expect(enhancedPrompt).toContain('person [1] leans forward')
    expect(enhancedPrompt).toContain("ELARA says: 'It was not me.'")
    expect(enhancedPrompt).not.toContain('keep the subject, wardrobe, and location consistent')
    expect(referenceFallbackPrompt).toBeDefined()
    expect(referenceFallbackPrompt).not.toContain('Use the images above.')
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

  it('preserves camera/blocking motion alongside spoken dialogue in FTV mode and appends 2-keyframe interpolation tokens when hasEndFrame is true', () => {
    const { enhancedPrompt } = buildSegmentEnhancedPrompt({
      prompt:
        'Coverage: Close-Up. Elara turns from the window and sets the folder on the desk. Camera: Slow dolly in. Elara speaks, "Read the last page."',
      method: 'FTV',
      hasEndFrame: true,
    })
    expect(enhancedPrompt).not.toContain('Coverage:')
    expect(enhancedPrompt).toContain('Elara turns from the window and sets the folder on the desk.')
    expect(enhancedPrompt).toContain('Camera: Slow dolly in.')
    expect(enhancedPrompt).toContain('Elara speaks, "Read the last page."')
    expect(enhancedPrompt).toContain(
      'Transition smoothly from the start frame composition and pose to the end frame state'
    )
  })
})
