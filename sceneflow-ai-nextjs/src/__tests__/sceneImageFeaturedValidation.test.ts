import { describe, it, expect } from 'vitest'
import {
  resolveFeaturedCharactersForValidation,
  isGenuineLikenessFailure,
} from '@/lib/scene/sceneImageFeaturedValidation'

describe('resolveFeaturedCharactersForValidation', () => {
  const mia = { name: 'Mia', referenceImage: 'https://example.com/mia-legacy.jpg' }
  const rafael = { name: 'Rafael', referenceImage: 'https://example.com/rafael-legacy.jpg' }

  const characterReferences = [
    {
      name: 'Mia',
      promptToken: 'person [1]',
      identityReferenceId: 1,
      identityImageUrl: 'https://example.com/mia-identity.jpg',
    },
    {
      name: 'Rafael',
      promptToken: 'person [2]',
      identityReferenceId: 2,
      identityImageUrl: 'https://example.com/rafael-identity.jpg',
    },
  ]

  it('validates AI-featured character from selectedCharacterNames', () => {
    const featured = resolveFeaturedCharactersForValidation({
      characterObjects: [mia, rafael],
      characterReferences,
      optimizedPrompt:
        'Cinematic film still. person [2] performing the following moment in-scene: close-up of Rafael',
      fullSceneContext: 'Mia and Rafael in the studio',
      usedAIIntelligence: true,
      aiResult: {
        prompt: 'close-up of Rafael',
        usedAI: true,
        selectedCharacterNames: ['Rafael'],
      },
    })

    expect(featured).toHaveLength(1)
    expect(featured[0].name).toBe('Rafael')
    expect(featured[0].referenceImageUrl).toBe('https://example.com/rafael-identity.jpg')
  })

  it('falls back to first characterObjects entry whose name appears in scene when AI unused', () => {
    const featured = resolveFeaturedCharactersForValidation({
      characterObjects: [mia, rafael],
      characterReferences,
      optimizedPrompt: 'Rafael reacts to the news',
      fullSceneContext: 'Rafael sits at the desk while Mia listens',
      usedAIIntelligence: false,
      aiResult: null,
    })

    expect(featured).toHaveLength(1)
    expect(featured[0].name).toBe('Mia')
    expect(featured[0].referenceImageUrl).toBe('https://example.com/mia-identity.jpg')
  })
})

describe('isGenuineLikenessFailure', () => {
  it('detects low-confidence mismatch', () => {
    expect(isGenuineLikenessFailure({ matches: false, confidence: 0 })).toBe(true)
    expect(isGenuineLikenessFailure({ matches: false, confidence: 79 })).toBe(true)
    expect(isGenuineLikenessFailure({ matches: false, confidence: 80 })).toBe(false)
    expect(isGenuineLikenessFailure({ matches: true, confidence: 50 })).toBe(false)
    expect(isGenuineLikenessFailure(null)).toBe(false)
  })
})
