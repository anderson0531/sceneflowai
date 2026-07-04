import { describe, expect, it } from 'vitest'
import { buildOmniVideoReferencePrompt } from '@/lib/gemini/buildOmniVideoReferencePrompt'

describe('buildOmniVideoReferencePrompt', () => {
  const refs = [
    {
      imageUrl: 'https://example.com/id.png',
      name: 'Identity reference 1: Elara Vance',
      role: 'identity' as const,
    },
    {
      imageUrl: 'https://example.com/loc.png',
      name: 'Location reference 5: POLICE STATION',
      role: 'location' as const,
    },
  ]

  it('emits a clean minimal payload without scaffolding headers', () => {
    const text = buildOmniVideoReferencePrompt({
      scenePrompt:
        'Slow dolly push-in on Elara Vance in an interrogation room. High-contrast clinical lighting.',
      refs,
      guidePrompt:
        'ELARA VANCE speaks: "I\'m telling you, it wasn\'t me!"',
    })

    expect(text).toContain(
      'Slow dolly push-in on Elara Vance in an interrogation room'
    )
    expect(text).toContain(
      'References: keep the subject, wardrobe, and location consistent with the provided images.'
    )
    expect(text).toContain('ELARA VANCE speaks')

    expect(text).not.toContain('SCENE ACTION:')
    expect(text).not.toContain('AUDIO / DIALOGUE GUIDE:')
    expect(text).not.toContain('Use the provided reference images for identity')
    expect(text).not.toContain('When characters speak, match lip sync')
    expect(text).not.toContain('Include native synchronized audio')
    expect(text).not.toContain('Negative prompt')
    expect(text).not.toContain('Match face, hair, and skin tone exactly')
    expect(text).not.toContain('REFERENCE IMAGES (use each as specified)')
  })

  it('omits reference instruction when no refs', () => {
    const text = buildOmniVideoReferencePrompt({
      scenePrompt: 'Wide establishing shot of the city.',
      refs: [],
    })

    expect(text).toBe('Wide establishing shot of the city.')
    expect(text).not.toContain('References:')
  })

  it('does not embed negative prompt in reference prompt text', () => {
    const text = buildOmniVideoReferencePrompt({
      scenePrompt: 'Action beat.',
      refs,
      guidePrompt: 'Background music: tense strings.',
    })

    expect(text).not.toContain('Do not include')
    expect(text).not.toContain('Negative prompt')
  })
})
