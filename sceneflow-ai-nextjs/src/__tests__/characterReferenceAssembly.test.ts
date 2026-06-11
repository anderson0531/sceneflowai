import { describe, it, expect } from 'vitest'
import {
  buildDualReferenceLabels,
  buildIdentityReferencePromptLine,
  buildWardrobeReferencePromptLine,
  CHARACTER_IDENTITY_REFERENCE_INSTRUCTION,
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

  it('returns dual references when portrait and wardrobe turnaround exist', () => {
    const pair = resolveCharacterReferencePair({ character: characterWithPortrait })
    expect(pair.identityUrl).toBe('https://example.com/portrait.jpg')
    expect(pair.wardrobeUrl).toBe('https://example.com/turnaround.jpg')
    expect(pair.hasDualReferences).toBe(true)
    expect(pair.hasWardrobeOnlyReference).toBe(false)
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

  it('returns wardrobe-only when portrait is missing', () => {
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
    expect(pair.wardrobeUrl).toBe('https://example.com/alex-turnaround.jpg')
    expect(pair.hasWardrobeOnlyReference).toBe(true)
    expect(pair.hasDualReferences).toBe(false)
  })

  it('uses scene wardrobe override via characterWardrobes', () => {
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
    expect(pair.wardrobeUrl).toBe('https://example.com/scene-outfit.jpg')
    expect(pair.hasDualReferences).toBe(true)
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
})
