import { describe, it, expect } from 'vitest'
import {
  buildCharacterIdentityReferencePrompt,
  buildCharacterIdentityReferencePromptFromCharacter,
  buildFullBodyWardrobePrompt,
  CHARACTER_IDENTITY_REFERENCE_ANCHOR,
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
    expect(prompt.toLowerCase()).not.toContain('full body')
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
  })
})
