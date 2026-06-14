import { describe, it, expect } from 'vitest'
import {
  buildCharacterHairDescription,
  buildDualReferenceLabels,
  buildDualReferenceNegativeTerms,
  buildFramingAwareIdentityBlock,
  buildIdentityReferencePromptLine,
  buildWardrobeReferencePromptLine,
  CHARACTER_IDENTITY_REFERENCE_INSTRUCTION,
  DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK,
  resolveCharacterReferencePair,
  WARDROBE_ONLY_REFERENCE_INSTRUCTION,
} from '@/lib/character/characterReferenceAssembly'

describe('characterReferenceAssembly', () => {
  const characterWithPortrait = {
    id: 'char-1',
    name: 'Marcus',
    referenceImage: 'https://example.com/portrait.jpg',
    wardrobes: [
      {
        id: 'w1',
        name: 'Office suit',
        description: 'Navy suit',
        isDefault: true,
        fullBodyUrl: 'https://example.com/turnaround.jpg',
      },
    ],
  }

  it('returns identity only and never attaches wardrobe image URLs', () => {
    const pair = resolveCharacterReferencePair({ character: characterWithPortrait })
    expect(pair.identityUrl).toBe('https://example.com/portrait.jpg')
    expect(pair.wardrobeUrl).toBeUndefined()
    expect(pair.wardrobeDiptychUrl).toBeUndefined()
    expect(pair.hasWardrobeDiptych).toBe(false)
    expect(pair.hasDualReferences).toBe(false)
    expect(pair.hasWardrobeOnlyReference).toBe(false)
    expect(pair.resolvedWardrobe?.description).toBe('Navy suit')
  })

  it('returns scene-matched wardrobe diptych when includeWardrobeDiptych is set', () => {
    const pair = resolveCharacterReferencePair({
      character: {
        id: 'char-1',
        name: 'Elara',
        referenceImage: 'https://example.com/portrait.jpg',
        wardrobes: [
          {
            id: 'w-scene',
            name: 'Scene 4 look',
            description: 'Hospital gown',
            sceneNumbers: [4],
            headshotUrl: 'https://example.com/elara-diptych-scene4.jpg',
            fullBodyUrl: 'https://example.com/elara-turnaround.jpg',
            isDefault: false,
          },
          {
            id: 'w-default',
            name: 'Default',
            description: 'Casual',
            headshotUrl: 'https://example.com/elara-diptych-default.jpg',
            isDefault: true,
          },
        ],
      },
      sceneIndex: 3,
      includeWardrobeDiptych: true,
    })
    expect(pair.wardrobeDiptychUrl).toBe('https://example.com/elara-diptych-scene4.jpg')
    expect(pair.hasWardrobeDiptych).toBe(true)
    expect(pair.resolvedWardrobe?.id).toBe('w-scene')
  })

  it('does not attach diptych for wrong scene when sceneNumbers do not match', () => {
    const pair = resolveCharacterReferencePair({
      character: {
        id: 'char-1',
        name: 'Elara',
        referenceImage: 'https://example.com/portrait.jpg',
        wardrobes: [
          {
            id: 'w-scene',
            name: 'Scene 4 look',
            sceneNumbers: [4],
            headshotUrl: 'https://example.com/elara-diptych-scene4.jpg',
            isDefault: false,
          },
        ],
      },
      sceneIndex: 1,
      includeWardrobeDiptych: true,
    })
    expect(pair.wardrobeDiptychUrl).toBeUndefined()
    expect(pair.hasWardrobeDiptych).toBe(false)
  })

  it('prefers characterWardrobes override for diptych selection', () => {
    const pair = resolveCharacterReferencePair({
      character: {
        id: 'char-1',
        name: 'Elara',
        referenceImage: 'https://example.com/portrait.jpg',
        wardrobes: [
          {
            id: 'w-scene',
            name: 'Scene 4 look',
            sceneNumbers: [4],
            headshotUrl: 'https://example.com/elara-diptych-scene4.jpg',
            isDefault: false,
          },
          {
            id: 'w-picked',
            name: 'User picked',
            headshotUrl: 'https://example.com/elara-diptych-picked.jpg',
            isDefault: false,
          },
        ],
      },
      sceneIndex: 3,
      characterWardrobes: [{ characterId: 'char-1', wardrobeId: 'w-picked' }],
      includeWardrobeDiptych: true,
    })
    expect(pair.wardrobeDiptychUrl).toBe('https://example.com/elara-diptych-picked.jpg')
    expect(pair.resolvedWardrobe?.id).toBe('w-picked')
  })

  it('returns portrait-only when no wardrobe turnaround', () => {
    const pair = resolveCharacterReferencePair({
      character: {
        name: 'Sarah',
        referenceImage: 'https://example.com/sarah.jpg',
        wardrobes: [{ id: 'w1', name: 'Casual', description: 'Jeans', isDefault: true }],
      },
    })
    expect(pair.identityUrl).toBe('https://example.com/sarah.jpg')
    expect(pair.wardrobeUrl).toBeUndefined()
    expect(pair.hasDualReferences).toBe(false)
  })

  it('returns no wardrobe image when portrait is missing (text-only wardrobe)', () => {
    const pair = resolveCharacterReferencePair({
      character: {
        name: 'Alex',
        wardrobes: [
          {
            id: 'w1',
            isDefault: true,
            fullBodyUrl: 'https://example.com/alex-turnaround.jpg',
          },
        ],
      },
    })
    expect(pair.identityUrl).toBeUndefined()
    expect(pair.wardrobeUrl).toBeUndefined()
    expect(pair.hasWardrobeOnlyReference).toBe(false)
    expect(pair.hasDualReferences).toBe(false)
  })

  it('resolves wardrobe text via characterWardrobes without attaching image', () => {
    const pair = resolveCharacterReferencePair({
      character: {
        id: 'char-1',
        name: 'Marcus',
        referenceImage: 'https://example.com/portrait.jpg',
        wardrobes: [
          { id: 'w1', isDefault: true, fullBodyUrl: 'https://example.com/default.jpg' },
          { id: 'w2', fullBodyUrl: 'https://example.com/scene-outfit.jpg' },
        ],
      },
      characterWardrobes: [{ characterId: 'char-1', wardrobeId: 'w2' }],
    })
    expect(pair.wardrobeUrl).toBeUndefined()
    expect(pair.hasDualReferences).toBe(false)
    expect(pair.resolvedWardrobe?.id).toBe('w2')
  })

  it('buildCharacterHairDescription formats bald and colored styles', () => {
    expect(buildCharacterHairDescription({ hairStyle: 'bald' })).toBe('bald head')
    expect(
      buildCharacterHairDescription({ hairStyle: 'swept back', hairColor: 'dark auburn' })
    ).toBe('dark auburn swept back hair')
  })

  it('buildDualReferenceLabels distinguishes identity and wardrobe slots', () => {
    const labels = buildDualReferenceLabels('Marcus', 1, 2)
    expect(labels.identityLabel).toContain('Identity reference 1')
    expect(labels.identityLabel).toContain('Marcus')
    expect(labels.wardrobeLabel).toContain('Wardrobe reference 2')
  })

  it('prompt lines use split identity vs wardrobe instructions', () => {
    const identityLine = buildIdentityReferencePromptLine('Marcus', 1)
    const wardrobeLine = buildWardrobeReferencePromptLine('Marcus', 2)
    expect(identityLine).toContain(CHARACTER_IDENTITY_REFERENCE_INSTRUCTION)
    expect(wardrobeLine).toContain(WARDROBE_ONLY_REFERENCE_INSTRUCTION)
    expect(identityLine).not.toContain('BOTTOM ROW')
    expect(wardrobeLine).not.toContain('2-row')
    expect(wardrobeLine.toLowerCase()).toContain('mannequin')
  })

  it('DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK establishes identity PRIMARY and wardrobe SECONDARY', () => {
    expect(DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK).toContain('PRIMARY')
    expect(DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK).toContain('SECONDARY')
    expect(DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK).toContain('photorealistic')
    expect(DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK.toLowerCase()).toContain('mannequin')
  })

  it('buildFramingAwareIdentityBlock adds wide-shot reinforcement', () => {
    expect(buildFramingAwareIdentityBlock('wide shot')).toContain('WIDE/ESTABLISHING')
    expect(buildFramingAwareIdentityBlock('medium close-up')).toBe('')
  })

  it('buildDualReferenceNegativeTerms includes anti-mannequin and anti-cartoon terms', () => {
    const terms = buildDualReferenceNegativeTerms()
    expect(terms).toContain('mannequin')
    expect(terms).toContain('cartoon')
    expect(terms).toContain('turnaround sheet')
  })

  it('identity instruction marks PRIMARY and wardrobe instruction marks SECONDARY', () => {
    expect(CHARACTER_IDENTITY_REFERENCE_INSTRUCTION).toContain('PRIMARY')
    expect(WARDROBE_ONLY_REFERENCE_INSTRUCTION).toContain('SECONDARY')
  })
})
