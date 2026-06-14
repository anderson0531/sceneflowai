import { describe, expect, it } from 'vitest'
import {
  buildSceneCharacterHeadshotPrompt,
  buildSimplifiedBeatFramePrompt,
  DIPTYCH_REPRODUCTION_NEGATIVE_PROMPT,
  extractSceneAppearanceDirectives,
  mergeBeatFrameNegativePrompt,
  mergePhysicsNegativePrompt,
  pickSceneHeadshotUrl,
  SCENE_CHARACTER_HEADSHOT_ASPECT_RATIO,
  SCENE_CHARACTER_HEADSHOT_IMAGE_SIZE,
  SCENE_CHARACTER_HEADSHOT_MODEL_TIER,
  shouldGenerateSceneHeadshot,
  WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION,
} from '@/lib/character/sceneCharacterHeadshot'

describe('extractSceneAppearanceDirectives', () => {
  it('detects bruises and makeup in beat action', () => {
    const result = extractSceneAppearanceDirectives(
      'Close-up of her face with a purplish bruise forming on her left temple and smudged makeup.',
      ''
    )
    expect(result.hasSceneSpecificChanges).toBe(true)
    expect(result.injuries).toMatch(/bruise/i)
    expect(result.makeup).toMatch(/smudged makeup/i)
  })

  it('returns no changes for neutral beats', () => {
    expect(extractSceneAppearanceDirectives('She smiles warmly at the detective.', '')).toEqual({
      hasSceneSpecificChanges: false,
    })
  })
})

describe('buildSceneCharacterHeadshotPrompt', () => {
  it('includes diptych layout with close-up and full-body panels', () => {
    const prompt = buildSceneCharacterHeadshotPrompt({
      characterName: 'Sarah',
      identityReferenceUrl: 'https://example.com/sarah.jpg',
      wardrobeDescription: 'Charcoal blazer over white blouse',
      beatAction: 'purplish bruise forming on her left temple',
      emotion: 'exhausted',
      hairStyle: 'swept back ponytail',
      hairColor: 'dark auburn',
    })
    expect(prompt).toContain('Sarah')
    expect(prompt).toContain('Charcoal blazer')
    expect(prompt).toContain('bruise')
    expect(prompt).toContain('do not restyle hair')
    expect(prompt).toContain('exhausted')
    expect(prompt).toContain('16:9')
    expect(prompt).toMatch(/diptych/i)
    expect(prompt).toMatch(/LEFT panel/i)
    expect(prompt).toMatch(/RIGHT panel/i)
    expect(prompt).toMatch(/close-up/i)
    expect(prompt).toMatch(/full-length/i)
  })
})

describe('scene character headshot generation settings', () => {
  it('uses 16:9 4K designer tier for highest-quality reference images', () => {
    expect(SCENE_CHARACTER_HEADSHOT_ASPECT_RATIO).toBe('16:9')
    expect(SCENE_CHARACTER_HEADSHOT_IMAGE_SIZE).toBe('4K')
    expect(SCENE_CHARACTER_HEADSHOT_MODEL_TIER).toBe('designer')
  })
})

describe('buildSimplifiedBeatFramePrompt', () => {
  it('uses person tokens, diptych consumption, and emotion without wardrobe text', () => {
    const prompt = buildSimplifiedBeatFramePrompt({
      beatAction: 'Sarah leans against the counter, arms crossed.',
      characters: [{ name: 'Sarah', referenceIndex: 1, emotion: 'defiant' }],
      artStyleSuffix: 'photorealistic cinematic',
    })
    expect(prompt).toContain('person [1]')
    expect(prompt).toContain('defiant')
    expect(prompt).toMatch(/LEFT panel/i)
    expect(prompt).toMatch(/RIGHT panel/i)
    expect(prompt).not.toMatch(/wearing/i)
  })
})

describe('WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION', () => {
  it('is exported with left/right panel guidance', () => {
    expect(WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION).toMatch(/LEFT panel/i)
    expect(WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION).toMatch(/RIGHT panel/i)
    expect(WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION).toMatch(/diptych/i)
  })
})

describe('scene headshot reuse vs generation', () => {
  it('reuses existing wardrobe headshot when no scene-specific changes', () => {
    const input = {
      characterName: 'Sarah',
      identityReferenceUrl: 'https://example.com/sarah.jpg',
      wardrobeDescription: 'Navy suit',
      existingWardrobeHeadshotUrl: 'https://example.com/wardrobe-headshot.jpg',
      beatAction: 'She enters the room calmly.',
    }
    expect(shouldGenerateSceneHeadshot(input)).toBe(false)
    expect(pickSceneHeadshotUrl(input)).toBe('https://example.com/wardrobe-headshot.jpg')
  })

  it('generates when beat describes injuries', () => {
    const input = {
      characterName: 'Sarah',
      identityReferenceUrl: 'https://example.com/sarah.jpg',
      existingWardrobeHeadshotUrl: 'https://example.com/wardrobe-headshot.jpg',
      beatAction: 'Bruise visible on her left temple.',
    }
    expect(shouldGenerateSceneHeadshot(input)).toBe(true)
    expect(pickSceneHeadshotUrl(input)).toBeUndefined()
  })

  it('forceRegenerate bypasses cached wardrobe headshot', () => {
    const input = {
      characterName: 'Sarah',
      identityReferenceUrl: 'https://example.com/sarah.jpg',
      wardrobeDescription: 'Navy suit',
      existingWardrobeHeadshotUrl: 'https://example.com/wardrobe-headshot.jpg',
      beatAction: 'She enters the room calmly.',
      forceRegenerate: true,
    }
    expect(pickSceneHeadshotUrl(input)).toBeUndefined()
  })
})

describe('makeup from wardrobe description via sceneAction', () => {
  it('includes makeup from outfit text passed as sceneAction', () => {
    const prompt = buildSceneCharacterHeadshotPrompt({
      characterName: 'Sarah',
      identityReferenceUrl: 'https://example.com/sarah.jpg',
      wardrobeDescription: 'Charcoal blazer, white blouse',
      sceneAction: 'Natural makeup with subtle red lipstick and light contour.',
    })
    expect(prompt).toMatch(/Makeup:/i)
    expect(prompt).toMatch(/lipstick/i)
  })
})

describe('mergePhysicsNegativePrompt', () => {
  it('always includes physics terms and merges custom negatives', () => {
    const merged = mergePhysicsNegativePrompt('blurry, low quality')
    expect(merged).toMatch(/floating chairs/i)
    expect(merged).toMatch(/blurry/i)
  })
})

describe('mergeBeatFrameNegativePrompt', () => {
  it('includes diptych reproduction terms alongside physics negatives', () => {
    const merged = mergeBeatFrameNegativePrompt('blurry')
    expect(merged).toMatch(/floating chairs/i)
    expect(merged).toMatch(/diptych/i)
    expect(merged).toMatch(/blurry/i)
    expect(DIPTYCH_REPRODUCTION_NEGATIVE_PROMPT).toMatch(/split-screen output/i)
  })
})
