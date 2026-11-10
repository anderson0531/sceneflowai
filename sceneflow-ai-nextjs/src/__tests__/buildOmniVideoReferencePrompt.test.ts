import { describe, expect, it } from 'vitest'
import { buildOmniVideoReferencePrompt } from '@/lib/gemini/buildOmniVideoReferencePrompt'
import { prioritizeAndCapOmniVideoReferences } from '@/lib/video/normalizeReferenceImages'

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

    expect(text).toContain('Use the images above.')
    expect(text).toContain(
      'person [1] (Elara Vance) is the person in the identity image of person [1].'
    )
    expect(text).toContain(
      'location [1] (POLICE STATION) is the place in the location image of location [1].'
    )
    expect(text).toContain(
      'Slow dolly push-in on person [1] in an interrogation room'
    )
    expect(text).not.toContain('keep the subject, wardrobe, and location consistent')
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
    expect(text).not.toContain('Use the images above.')
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

  it('binds consistent wardrobe description to person [N] when only identity image is attached', () => {
    const text = buildOmniVideoReferencePrompt({
      scenePrompt: 'Gideon Croft hunches over the drafting table.',
      refs: [
        {
          imageUrl: 'https://example.com/gideon-id.jpg',
          name: 'The next image is the identity of person [1]. Match exact facial identity, bone structure, hair, and skin tone from this portrait; ignore studio backdrop and portrait clothing. Scale: 6-foot-7 tall.',
          role: 'identity' as const,
          refRole: 'identity' as const,
          characterName: 'Gideon Croft',
          wardrobeDescription:
            'A dust-covered, rugged dark charcoal/slate canvas archivist smock and utilitarian work trousers over thermal underlayers',
        },
      ],
    })

    expect(text).toContain(
      'person [1] (Gideon Croft) is the person in the identity image of person [1]. Clothes of person [1]: A dust-covered, rugged dark charcoal/slate canvas archivist smock and utilitarian work trousers over thermal underlayers.'
    )
    expect(text).toContain('person [1] hunches over the drafting table.')
  })

  it('orders both Omni reference payloads and the Use-the-images-above legend as character -> wardrobe -> location -> props and caps at 8', () => {
    const unsorted = [
      { url: 'https://example.com/prop-minor-1.jpg', type: 'style' as const, role: 'prop-other', propName: 'Chalk', promptToken: 'prop [1]', name: 'The next image is prop [1].' },
      { url: 'https://example.com/prop-minor-2.jpg', type: 'style' as const, role: 'prop-other', propName: 'Rag', promptToken: 'prop [2]', name: 'The next image is prop [2].' },
      { url: 'https://example.com/prop-minor-3.jpg', type: 'style' as const, role: 'prop-other', propName: 'Bucket', promptToken: 'prop [3]', name: 'The next image is prop [3].' },
      { url: 'https://example.com/prop-minor-4.jpg', type: 'style' as const, role: 'prop-other', propName: 'Clipboard', promptToken: 'prop [4]', name: 'The next image is prop [4].' },
      { url: 'https://example.com/prop-minor-5.jpg', type: 'style' as const, role: 'prop-other', propName: 'Cup', promptToken: 'prop [5]', name: 'The next image is prop [5].' },
      { url: 'https://example.com/prop-minor-6.jpg', type: 'style' as const, role: 'prop-other', propName: 'Tape', promptToken: 'prop [6]', name: 'The next image is prop [6].' },
      { url: 'https://example.com/vault.jpg', type: 'style' as const, role: 'location', locationName: 'VAULT', promptToken: 'location [1]', name: 'The next image is location [1].' },
      { url: 'https://example.com/gideon-wardrobe.jpg', type: 'character' as const, role: 'wardrobe', refRole: 'wardrobe', characterName: 'Gideon Croft', name: 'The next image is the wardrobe of person [1].' },
      { url: 'https://example.com/prop-hero.jpg', type: 'style' as const, role: 'prop-critical', propName: 'Core', promptToken: 'prop [7]', name: 'The next image is prop [7].' },
      { url: 'https://example.com/gideon-face.jpg', type: 'character' as const, role: 'identity', refRole: 'identity', characterName: 'Gideon Croft', name: 'The next image is the identity of person [1].' },
    ]

    const prioritized = prioritizeAndCapOmniVideoReferences(unsorted)!
    expect(prioritized).toHaveLength(8)
    expect(prioritized[0].url).toBe('https://example.com/gideon-face.jpg')
    expect(prioritized[1].url).toBe('https://example.com/gideon-wardrobe.jpg')
    expect(prioritized[2].url).toBe('https://example.com/vault.jpg')
    expect(prioritized[3].url).toBe('https://example.com/prop-hero.jpg')
    expect(prioritized[3].promptToken).toBe('prop [1]')
    expect(prioritized.some((r) => r.url === 'https://example.com/prop-minor-6.jpg')).toBe(false)

    const omniText = buildOmniVideoReferencePrompt({
      scenePrompt: 'Gideon Croft inspects the Core inside the VAULT.',
      refs: prioritized.map((r) => ({
        imageUrl: r.url,
        name: r.name,
        role: (r.role as any) || 'identity',
        refRole: r.refRole as any,
        characterName: r.characterName,
        propName: r.propName,
        locationName: r.locationName,
        promptToken: r.promptToken,
      })),
    })

    const personIdx = omniText.indexOf('person [1] (Gideon Croft)')
    const locIdx = omniText.indexOf('location [1] (VAULT)')
    const propIdx = omniText.indexOf('prop [1] (Core)')
    expect(personIdx).toBeGreaterThan(-1)
    expect(locIdx).toBeGreaterThan(personIdx)
    expect(propIdx).toBeGreaterThan(locIdx)
  })
})
