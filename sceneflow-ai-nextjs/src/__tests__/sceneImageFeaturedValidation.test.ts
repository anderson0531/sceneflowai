import { describe, it, expect } from 'vitest'
import {
  resolveFeaturedCharactersForValidation,
  isGenuineLikenessFailure,
  shouldFailExpressBeatLikeness,
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

  it('validates every subject the composition places, not just the first', () => {
    // A two-hander validated on one subject shipped frames with the right woman
    // and the wrong man, with nothing in the log to show it.
    const featured = resolveFeaturedCharactersForValidation({
      characterObjects: [mia, rafael],
      characterReferences,
      optimizedPrompt: 'Action/Framing: person [1] hands the file to person [2].',
      fullSceneContext: 'Mia and Rafael in the studio',
      usedAIIntelligence: false,
      aiResult: null,
    })

    expect(featured.map((f) => f.name)).toEqual(['Mia', 'Rafael'])
    expect(featured.map((f) => f.referenceImageUrl)).toEqual([
      'https://example.com/mia-identity.jpg',
      'https://example.com/rafael-identity.jpg',
    ])
  })

  it('prefers the subject the prompt places over one the scene merely names', () => {
    const featured = resolveFeaturedCharactersForValidation({
      characterObjects: [mia, rafael],
      characterReferences,
      optimizedPrompt: 'Rafael reacts to the news',
      fullSceneContext: 'Rafael sits at the desk while Mia listens',
      usedAIIntelligence: false,
      aiResult: null,
    })

    expect(featured).toHaveLength(1)
    expect(featured[0].name).toBe('Rafael')
    expect(featured[0].referenceImageUrl).toBe('https://example.com/rafael-identity.jpg')
  })

  it('falls back to first characterObjects entry whose name appears in scene when the prompt places nobody', () => {
    const featured = resolveFeaturedCharactersForValidation({
      characterObjects: [mia, rafael],
      characterReferences,
      optimizedPrompt: 'A close-up of the desk lamp, nobody in frame.',
      fullSceneContext: 'Rafael sits at the desk while Mia listens',
      usedAIIntelligence: false,
      aiResult: null,
    })

    expect(featured).toHaveLength(1)
    expect(featured[0].name).toBe('Mia')
    expect(featured[0].referenceImageUrl).toBe('https://example.com/mia-identity.jpg')
  })

  it('scores the identity headshot, not a stored PiP composite', () => {
    const featured = resolveFeaturedCharactersForValidation({
      characterObjects: [mia],
      characterReferences: [
        {
          name: 'Mia',
          promptToken: 'person [1]',
          wardrobeDiptychImageUrl: 'https://example.com/mia-pip.jpg',
        },
      ],
      optimizedPrompt: 'Action/Framing: person [1] waits at the vault door.',
      fullSceneContext: 'Mia in the vault',
      usedAIIntelligence: false,
      aiResult: null,
    })

    expect(featured).toEqual([
      { name: 'Mia', referenceImageUrl: 'https://example.com/mia-legacy.jpg' },
    ])
  })

  it('prefers an explicit identity headshot URL even when a PiP card is attached', () => {
    const featured = resolveFeaturedCharactersForValidation({
      characterObjects: [mia],
      characterReferences: [
        {
          name: 'Mia',
          promptToken: 'person [1]',
          identityImageUrl: 'https://example.com/mia-identity.jpg',
          wardrobeDiptychImageUrl: 'https://example.com/mia-pip.jpg',
        },
      ],
      optimizedPrompt: 'Action/Framing: person [1] waits at the vault door.',
      fullSceneContext: 'Mia in the vault',
      usedAIIntelligence: false,
      aiResult: null,
    })

    expect(featured).toEqual([
      { name: 'Mia', referenceImageUrl: 'https://example.com/mia-identity.jpg' },
    ])
  })
})

describe('isGenuineLikenessFailure', () => {
  it('fires on a reported identity mismatch', () => {
    expect(
      isGenuineLikenessFailure({ matches: false, confidence: 30, mismatchKind: 'identity' })
    ).toBe(true)
  })

  it('does not spend a regeneration on surface drift or an unassessable face', () => {
    expect(
      isGenuineLikenessFailure({ matches: false, confidence: 70, mismatchKind: 'surface' })
    ).toBe(false)
    expect(
      isGenuineLikenessFailure({ matches: false, confidence: 0, mismatchKind: 'indeterminate' })
    ).toBe(false)
    expect(isGenuineLikenessFailure({ matches: true, confidence: 50, mismatchKind: 'none' })).toBe(
      false
    )
    expect(isGenuineLikenessFailure(null)).toBe(false)
  })

  it('reads confidence when no kind was reported', () => {
    expect(isGenuineLikenessFailure({ matches: false, confidence: 30 })).toBe(true)
    expect(isGenuineLikenessFailure({ matches: false, confidence: 70 })).toBe(false)
    expect(isGenuineLikenessFailure({ matches: true, confidence: 50 })).toBe(false)
  })
})

describe('shouldFailExpressBeatLikeness', () => {
  it('fails an Express talent beat when primary likeness times out or throws', () => {
    expect(
      shouldFailExpressBeatLikeness({
        eligible: true,
        validation: null,
        primaryValidationError: true,
      })
    ).toBe(true)
  })

  it('fails an Express talent beat on a hard identity mismatch', () => {
    expect(
      shouldFailExpressBeatLikeness({
        eligible: true,
        validation: { matches: false, confidence: 30, mismatchKind: 'identity' },
      })
    ).toBe(true)
  })

  it('does not treat a null score as a fail unless the primary call errored', () => {
    expect(
      shouldFailExpressBeatLikeness({
        eligible: true,
        validation: null,
      })
    ).toBe(false)
  })

  it('ignores extra-subject timeouts on ineligible (non-Express) frames', () => {
    expect(
      shouldFailExpressBeatLikeness({
        eligible: false,
        validation: null,
        primaryValidationError: true,
      })
    ).toBe(false)
  })
})
