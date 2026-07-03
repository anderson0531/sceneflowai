import { describe, expect, it } from 'vitest'
import {
  buildSceneCharacterHeadshotPrompt,
  buildSimplifiedBeatFramePrompt,
  buildWardrobeDiptychCharacterConsumptionLine,
  buildWardrobeDiptychReferenceLabel,
  DIPTYCH_GENERATION_NEGATIVE_PROMPT,
  DIPTYCH_REPRODUCTION_NEGATIVE_PROMPT,
  extractSceneAppearanceDirectives,
  mergeBeatFrameNegativePrompt,
  mergePhysicsNegativePrompt,
  pickSceneHeadshotUrl,
  resolveWardrobeTextForCharacter,
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
  it('includes diptych layout with strict LEFT=identity and RIGHT=wardrobe sections', () => {
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
    expect(prompt).toMatch(/LEFT panel.*IDENTITY/i)
    expect(prompt).toMatch(/RIGHT panel.*WARDROBE/i)
    expect(prompt).toMatch(/NO clothing/i)
    expect(prompt).toMatch(/close-up/i)
    expect(prompt).toMatch(/full-length/i)

    const leftIdx = prompt.indexOf('LEFT panel')
    const rightIdx = prompt.indexOf('RIGHT panel')
    const wearingIdx = prompt.indexOf('Wearing:')
    expect(leftIdx).toBeGreaterThan(-1)
    expect(rightIdx).toBeGreaterThan(leftIdx)
    expect(wearingIdx).toBeGreaterThan(rightIdx)
  })
})

describe('scene character headshot generation settings', () => {
  it('uses 16:9 2K designer tier for high-quality reference images', () => {
    expect(SCENE_CHARACTER_HEADSHOT_ASPECT_RATIO).toBe('16:9')
    expect(SCENE_CHARACTER_HEADSHOT_IMAGE_SIZE).toBe('2K')
    expect(SCENE_CHARACTER_HEADSHOT_MODEL_TIER).toBe('designer')
  })
})

describe('buildSimplifiedBeatFramePrompt', () => {
  it('uses person tokens, strict diptych panel roles, and emotion without wardrobe text', () => {
    const prompt = buildSimplifiedBeatFramePrompt({
      beatAction: 'Sarah leans against the counter, arms crossed.',
      characters: [{ name: 'Sarah', referenceIndex: 1, emotion: 'defiant' }],
      artStyleSuffix: 'photorealistic cinematic',
    })
    expect(prompt).toContain('person [1]')
    expect(prompt).toContain('defiant')
    expect(prompt).toMatch(/LEFT panel/i)
    expect(prompt).toMatch(/RIGHT panel/i)
    expect(prompt).toMatch(/copy outfit from the RIGHT panel/i)
    expect(prompt).toMatch(/NEVER derive face/i)
    expect(prompt).not.toMatch(/wearing/i)
  })
})

describe('WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION', () => {
  it('is exported with strict left/right panel guidance', () => {
    expect(WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION).toMatch(/CRITICAL/i)
    expect(WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION).toMatch(/LEFT half.*identity/i)
    expect(WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION).toMatch(/RIGHT half.*wardrobe/i)
    expect(WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION).toMatch(/NEVER derive face/i)
    expect(WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION).toMatch(/NEVER derive clothing/i)
  })
})

describe('buildWardrobeDiptychReferenceLabel', () => {
  it('labels diptych refs with LEFT=identity and RIGHT=wardrobe', () => {
    expect(buildWardrobeDiptychReferenceLabel('Elara')).toBe(
      'Diptych ref: Elara — LEFT=identity face, RIGHT=wardrobe outfit'
    )
  })
})

describe('buildWardrobeDiptychCharacterConsumptionLine', () => {
  it('returns per-character panel consumption guidance', () => {
    expect(buildWardrobeDiptychCharacterConsumptionLine('Elara')).toMatch(
      /LEFT panel for face\/identity only/
    )
    expect(buildWardrobeDiptychCharacterConsumptionLine('Elara')).toMatch(
      /RIGHT panel for outfit/i
    )
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

  it('skips diptych generation when a dedicated full-body wardrobe ref exists', () => {
    const input = {
      characterName: 'Sarah',
      identityReferenceUrl: 'https://example.com/sarah.jpg',
      wardrobeDescription: 'Navy suit',
      existingFullBodyWardrobeUrl: 'https://example.com/full-body.jpg',
      beatAction: 'Bruise visible on her left temple.',
    }
    expect(shouldGenerateSceneHeadshot(input)).toBe(false)
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

describe('appearanceNotes on wardrobe reference generation', () => {
  it('includes bruise from appearanceNotes without beatAction', () => {
    const prompt = buildSceneCharacterHeadshotPrompt({
      characterName: 'Elara',
      identityReferenceUrl: 'https://example.com/elara.jpg',
      wardrobeDescription: 'Dark grey sweater, black trousers',
      appearanceNotes: 'Bloodshot eyes, faint bruise forming on left temple',
    })
    expect(prompt).toMatch(/bruise/i)
    expect(prompt).toMatch(/bloodshot/i)
    expect(prompt).toMatch(/Scene appearance/i)
  })

  it('resolveWardrobeTextForCharacter returns appearanceNotes from wardrobe', () => {
    const resolved = resolveWardrobeTextForCharacter(
      {
        wardrobes: [
          {
            id: 'w1',
            isDefault: true,
            description: 'Dark grey sweater',
            appearanceNotes: 'Bloodshot eyes, bruise on temple',
            sceneNumbers: [4],
          },
        ],
      },
      null,
      3
    )
    expect(resolved.appearanceNotes).toMatch(/bruise/i)
  })
})

describe('mergePhysicsNegativePrompt', () => {
  it('always includes physics terms and merges custom negatives', () => {
    const merged = mergePhysicsNegativePrompt('blurry, low quality')
    expect(merged).toMatch(/floating chairs/i)
    expect(merged).toMatch(/blurry/i)
  })

  it('includes diptych generation negatives when provided', () => {
    const merged = mergePhysicsNegativePrompt(DIPTYCH_GENERATION_NEGATIVE_PROMPT)
    expect(merged).toMatch(/clothing in close-up/i)
    expect(merged).toMatch(/identity mismatch between panels/i)
  })
})

describe('mergeBeatFrameNegativePrompt', () => {
  it('includes diptych reproduction terms alongside physics negatives', () => {
    const merged = mergeBeatFrameNegativePrompt('blurry')
    expect(merged).toMatch(/floating chairs/i)
    expect(merged).toMatch(/diptych/i)
    expect(merged).toMatch(/outfit in close-up/i)
    expect(merged).toMatch(/blurry/i)
    expect(DIPTYCH_REPRODUCTION_NEGATIVE_PROMPT).toMatch(/split-screen output/i)
    expect(DIPTYCH_REPRODUCTION_NEGATIVE_PROMPT).toMatch(/mismatched identity between panels/i)
  })
})
