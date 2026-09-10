import { describe, it, expect } from 'vitest'
import {
  buildCharacterIdentityReferencePrompt,
  buildCharacterIdentityReferencePromptFromCharacter,
  buildAppearanceDescriptionFromAttributes,
  buildEnhanceIdentityReferencePrompt,
  buildFullBodyWardrobePrompt,
  CHARACTER_IDENTITY_REFERENCE_ANCHOR,
  IDENTITY_ANTI_LIKENESS_DIRECTIVES,
  IDENTITY_PHOTO_REALISM_DIRECTIVES,
  resolveDefaultWardrobeDescription,
} from '@/lib/character/characterReferencePrompts'

describe('buildCharacterIdentityReferencePrompt', () => {
  it('uses photorealistic headshot anchor, appearance body, and realism directives', () => {
    const prompt = buildCharacterIdentityReferencePrompt({
      appearanceDescription:
        'Caucasian female in her late 20s with long wavy dark brown hair and almond-shaped eyes.',
    })

    expect(prompt.startsWith(CHARACTER_IDENTITY_REFERENCE_ANCHOR)).toBe(true)
    expect(prompt).toContain('Caucasian female in her late 20s')
    expect(prompt).toContain(IDENTITY_PHOTO_REALISM_DIRECTIVES)
    expect(prompt).toContain(IDENTITY_ANTI_LIKENESS_DIRECTIVES)
    expect(prompt.toLowerCase()).not.toContain('full body')
    expect(prompt).toContain('vertical 9:16 portrait')
  })

  it('appends default wardrobe line when provided', () => {
    const prompt = buildCharacterIdentityReferencePrompt({
      appearanceDescription: 'Defined jawline, clean-shaven.',
      wardrobeDescription: 'Sleek, futuristic athletic wear with a subtle metallic sheen',
    })

    expect(prompt).toContain('Wearing Sleek, futuristic athletic wear with a subtle metallic sheen.')
  })

  it('omits wardrobe paragraph when absent', () => {
    const prompt = buildCharacterIdentityReferencePrompt({
      appearanceDescription: 'Short black hair, brown eyes.',
    })

    expect(prompt).not.toContain('Wearing')
  })
})

describe('buildFullBodyWardrobePrompt', () => {
  it('builds head-to-toe wardrobe prompt anchored to identity reference', () => {
    const prompt = buildFullBodyWardrobePrompt({
      characterName: 'Elara',
      wardrobeDescription: 'Navy blazer and charcoal trousers',
      hairAnchor: 'dark auburn swept back hair matching identity reference',
    })

    expect(prompt).toContain('Elara')
    expect(prompt).toContain('attached identity reference')
    expect(prompt).toContain('Navy blazer and charcoal trousers')
    expect(prompt).toContain('head to feet')
  })

  it('bakes appearanceNotes bruises into the full-body wardrobe prompt', () => {
    const prompt = buildFullBodyWardrobePrompt({
      characterName: 'Piper',
      wardrobeDescription: 'Torn grey hoodie and jeans',
      appearanceNotes: 'Bruised hands, contusion on knuckles',
    })

    expect(prompt).toMatch(/Bruised hands/i)
    expect(prompt).toMatch(/Scene appearance \/ continuity marks/i)
    expect(prompt).toMatch(/visible scene marks/i)
  })

  it('requires empty hands so held props do not become costume', () => {
    const prompt = buildFullBodyWardrobePrompt({
      characterName: 'Gideon',
      wardrobeDescription: 'Oil-stained coveralls and steel-toe boots',
    })

    expect(prompt).toMatch(/Hands: empty and visible at the sides/i)
    expect(prompt).toMatch(/holds, carries, or wears NO props/i)
    expect(prompt).toMatch(/no tools, weapons, bags/i)
  })
})

describe('resolveDefaultWardrobeDescription', () => {
  it('prefers isDefault wardrobe from collection', () => {
    const desc = resolveDefaultWardrobeDescription({
      wardrobes: [
        { id: 'w1', description: 'Casual jeans', isDefault: false },
        { id: 'w2', description: 'Navy blazer', isDefault: true },
      ],
    })
    expect(desc).toBe('Navy blazer')
  })

  it('falls back to legacy defaultWardrobe', () => {
    const desc = resolveDefaultWardrobeDescription({
      defaultWardrobe: 'White lab coat',
      wardrobeAccessories: 'Safety goggles',
    })
    expect(desc).toBe('White lab coat. Safety goggles')
  })
})

describe('buildCharacterIdentityReferencePromptFromCharacter', () => {
  it('builds full prompt from character record', () => {
    const prompt = buildCharacterIdentityReferencePromptFromCharacter({
      appearanceDescription: 'Oval face, prominent cheekbones.',
      defaultWardrobe: 'Dark tailored suit',
    })

    expect(prompt).toContain(CHARACTER_IDENTITY_REFERENCE_ANCHOR)
    expect(prompt).toContain('Oval face')
    expect(prompt).toContain('Wearing Dark tailored suit.')
    expect(prompt).toContain(IDENTITY_PHOTO_REALISM_DIRECTIVES)
    expect(prompt).toContain(IDENTITY_ANTI_LIKENESS_DIRECTIVES)
  })

  it('does not put the display name into AUTO appearance fallback', () => {
    const prompt = buildCharacterIdentityReferencePromptFromCharacter({
      name: 'Winston Churchill',
    })
    expect(prompt).not.toContain('Winston Churchill')
    expect(prompt).toContain(IDENTITY_ANTI_LIKENESS_DIRECTIVES)
    expect(buildAppearanceDescriptionFromAttributes({ name: 'Winston Churchill' })).toBe(
      'an original adult with a unique, unrecognizable face'
    )
  })
})

describe('buildEnhanceIdentityReferencePrompt', () => {
  it('keeps anti-likeness and does not default Subject to the display name', () => {
    const prompt = buildEnhanceIdentityReferencePrompt({
      characterName: 'Winston',
      appearanceDescription: 'Oval face, prominent cheekbones.',
    })
    expect(prompt).toContain(IDENTITY_ANTI_LIKENESS_DIRECTIVES)
    expect(prompt).toContain('the exact person shown in the reference photo')
    expect(prompt).not.toMatch(/Subject:\s*Winston/)
  })
})
