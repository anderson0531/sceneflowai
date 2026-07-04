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

  it('uses concise reference instruction without per-role duplication', () => {
    const text = buildOmniVideoReferencePrompt({
      scenePrompt: 'CLOSE UP: the subject hands tremble on the table.',
      refs,
    })

    expect(text).toContain(
      'Use the provided reference images for identity, wardrobe, and location'
    )
    expect(text).not.toContain('Match face, hair, and skin tone exactly')
    expect(text).not.toContain('REFERENCE IMAGES (use each as specified)')
    expect(text).not.toContain('Reference image 1:')
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

  it('includes scene action and audio guide sections', () => {
    const text = buildOmniVideoReferencePrompt({
      scenePrompt: 'Slow dolly in on the subject.',
      refs,
      guidePrompt: 'Background music: soft piano.',
    })

    expect(text).toContain('SCENE ACTION:')
    expect(text).toContain('Slow dolly in on the subject.')
    expect(text).toContain('AUDIO / DIALOGUE GUIDE:')
    expect(text).toContain('Include native synchronized audio')
  })
})
