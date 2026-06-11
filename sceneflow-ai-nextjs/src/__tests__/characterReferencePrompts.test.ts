import { describe, it, expect } from 'vitest'
import {
  buildCharacterIdentityReferencePrompt,
  buildCharacterIdentityReferencePromptFromCharacter,
  CHARACTER_IDENTITY_REFERENCE_ANCHOR,
  resolveDefaultWardrobeDescription,
} from '@/lib/character/characterReferencePrompts'

describe('buildCharacterIdentityReferencePrompt', () => {
  it('uses photorealistic headshot anchor and appearance body', () => {
    const prompt = buildCharacterIdentityReferencePrompt({
      appearanceDescription:
        'Caucasian female in her late 20s with long wavy dark brown hair and almond-shaped eyes.',
    })

    expect(prompt.startsWith(CHARACTER_IDENTITY_REFERENCE_ANCHOR)).toBe(true)
    expect(prompt).toContain('Caucasian female in her late 20s')
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
  })
})
