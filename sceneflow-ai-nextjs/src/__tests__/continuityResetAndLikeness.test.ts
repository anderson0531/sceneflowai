import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  buildAgeVariantCharacter,
  extractSamePersonAgeStage,
} from '@/lib/character/ageStageContinuity'
import {
  extractCharactersFromScenes,
  normalizeCharacterName,
} from '@/lib/character/detection'
import {
  findMatchingCharacter,
  findSceneCharacters,
} from '@/lib/character/matching'
import { generateAliases, matchCharacterRecord } from '@/lib/character/canonical'
import { getCharacterDialogueCounts } from '@/components/vision/AddCharacterModal'
import {
  buildLikenessGuidedIdentityPrompt,
  resolveCharacterLikenessInput,
} from '@/lib/character/characterReferencePrompts'
import { planReferenceExpressItems } from '@/lib/vision/referenceExpress/planItems'
import { cleanAndRebindContinuityCrossLinks } from '@/lib/vision/resetContinuityCleanCrossLinks'
import { resolveSceneRequiredReferences } from '@/lib/vision/sceneReferenceRequirements'

const mockFindByPk = vi.fn()
vi.mock('@/models', () => ({
  Project: {
    findByPk: (...args: unknown[]) => mockFindByPk(...args),
  },
}))
vi.mock('@/models/Project', () => ({
  default: {
    findByPk: (...args: unknown[]) => mockFindByPk(...args),
  },
}))

describe('Multi-age character isolation & cascade-deletion fix', () => {
  beforeEach(() => {
    mockFindByPk.mockReset()
  })

  it('recognizes bare trailing age names like "John 17" while ignoring generic numbered roles like "Guard 2"', () => {
    expect(extractSamePersonAgeStage('John 17')).toEqual({
      isAgeVariant: true,
      baseName: 'John',
      ageStageLabel: 'Age 17',
      numericAge: 17,
    })
    expect(extractSamePersonAgeStage('John Miller 17')).toEqual({
      isAgeVariant: true,
      baseName: 'John Miller',
      ageStageLabel: 'Age 17',
      numericAge: 17,
    })
    expect(extractSamePersonAgeStage('Guard 2').isAgeVariant).toBe(false)
    expect(extractSamePersonAgeStage('Soldier 4').isAgeVariant).toBe(false)
  })

  it('preserves age qualifiers in normalizeCharacterName while stripping screenplay delivery tags', () => {
    expect(normalizeCharacterName('Brian Eric Anderson Sr. (Age 17) (V.O.)')).toBe(
      'BRIAN ERIC ANDERSON SR. (AGE 17)'
    )
    expect(normalizeCharacterName('Brian Eric Anderson Sr.')).toBe(
      'BRIAN ERIC ANDERSON SR.'
    )
    expect(normalizeCharacterName('John 17 (O.S.)')).toBe('JOHN 17')
    expect(normalizeCharacterName('John')).toBe('JOHN')
  })

  it('DELETE /api/vision/characters removes ONLY the targeted age character and preserves base + sibling characters', async () => {
    const savedMetadataHolder: { value: any } = { value: null }
    const mockProject = {
      id: 'proj-1',
      metadata: {
        visionPhase: {
          characters: [
            {
              id: 'char-base',
              name: 'Brian Eric Anderson Sr.',
              referenceImage: 'https://blob.example/brian-adult.png',
            },
            {
              id: 'char-17',
              name: 'Brian Eric Anderson Sr. (Age 17)',
              likenessSourceType: 'character',
              likenessCharacterId: 'char-base',
            },
            {
              id: 'char-32',
              name: 'Brian Eric Anderson Sr. (Age 32)',
              likenessSourceType: 'character',
              likenessCharacterId: 'char-17',
            },
          ],
        },
      },
      update: vi.fn(async (patch: any) => {
        if (patch?.metadata) savedMetadataHolder.value = patch.metadata
      }),
    }
    mockFindByPk.mockResolvedValue(mockProject)

    const { DELETE } = await import('@/app/api/vision/characters/route')
    const req = {
      url: 'https://sceneflowai.studio/api/vision/characters?projectId=proj-1&characterId=char-17&characterName=Brian%20Eric%20Anderson%20Sr.%20(Age%2017)',
    } as any

    const res = await DELETE(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    const remaining = savedMetadataHolder.value.visionPhase.characters
    expect(remaining).toHaveLength(2)
    expect(remaining.map((c: any) => c.id)).toEqual(['char-base', 'char-32'])
    // Dependent character pointing to deleted char-17 has likenessCharacterId cleanly detached without cascade delete
    const char32 = remaining.find((c: any) => c.id === 'char-32')
    expect(char32.likenessCharacterId).toBeUndefined()
    expect(char32.likenessSourceType).toBe('none')
  })

  it('keeps age variants isolated from bare base-name matching and alias generation', () => {
    const baseChar = {
      id: 'char-john',
      name: 'John Miller',
      aliases: generateAliases('John Miller'),
    }
    const teenVariant = buildAgeVariantCharacter(baseChar, {
      targetAge: 17,
      lookTransformNote: '17 year old version of the reference with medium afro and not facial hair',
      likenessCharacterId: 'char-john',
    })

    expect(teenVariant.aliases).toBeUndefined()
    expect(teenVariant.likenessSourceType).toBe('character')
    expect(teenVariant.likenessCharacterId).toBe('char-john')

    const cast = [teenVariant, baseChar]
    expect(findMatchingCharacter('John', cast)?.id).toBe('char-john')
    expect(findMatchingCharacter('John Miller', cast)?.id).toBe('char-john')
    expect(findMatchingCharacter('John Miller (Age 17)', cast)?.id).toBe(teenVariant.id)
    expect(matchCharacterRecord(cast, { characterName: 'John' })?.id).toBe('char-john')

    const adultSceneFound = findSceneCharacters(
      'INT. OFFICE - DAY. John sits at his desk reviewing blueprints.',
      [
        { id: 'char-john-17', name: 'John 17' },
        { id: 'char-john', name: 'John' },
      ]
    )
    expect(adultSceneFound.map((c) => c.id)).toEqual(['char-john'])

    const teenSceneFound = findSceneCharacters(
      'INT. HIGH SCHOOL GYM - 1976. John 17 laces up his worn canvas sneakers.',
      [
        { id: 'char-john-17', name: 'John 17' },
        { id: 'char-john', name: 'John' },
      ]
    )
    expect(teenSceneFound.map((c) => c.id)).toEqual(['char-john-17'])
  })

  it('counts silent/narrated scene.characters and beat.characters so flashback characters are not marked orphaned', () => {
    const scenes = [
      {
        heading: 'INT. ROWHOUSE KITCHEN - NIGHT (1976)',
        characters: ['John 17'],
        dialogue: [],
        beats: [
          {
            beatId: 'b1',
            characters: ['John 17'],
            beatDirection: { castInFrame: ['John 17'] },
            actionDescription: 'John 17 studies calculus under a bare bulb.',
          },
        ],
      },
    ]

    const extracted = extractCharactersFromScenes(scenes)
    expect(extracted.map((c) => c.name)).toContain('John 17')

    const counts = getCharacterDialogueCounts(scenes, [{ name: 'John 17' }])
    expect(counts.get('JOHN 17')).toBeGreaterThan(0)
  })
})

describe('Likeness-guided character portrait generation & ordering', () => {
  it('builds a clean-shaven, age-transformed likeness prompt without triggering minor-age RAI refusals', () => {
    const built = buildLikenessGuidedIdentityPrompt({
      characterName: 'John 17',
      appearanceDescription: 'Athletic young man in a vintage grey sweatshirt.',
      likenessTransformNote:
        'a 17 year old version of the reference with medium afro and not facial hair',
      targetAge: 17,
      artStyle: 'realistic',
    })

    expect(built.prompt).toContain('Reference Image [1]')
    expect(built.prompt).toContain('medium afro')
    expect(built.prompt.toLowerCase()).toContain('clean-shaven')
    // Must sanitize raw "17-year-old" token when inline human reference photo is attached
    expect(built.prompt.toLowerCase()).not.toContain('17-year-old')
    expect(built.prompt.toLowerCase()).not.toContain('17 year old')
    expect(built.negativeTerms).toContain('beard')
    expect(built.negativeTerms).toContain('mustache')
    expect(built.negativeTerms).toContain('stubble')
  })

  it('resolves cast donor likeness and orders donor before dependent in Reference Express planning', () => {
    const characters = [
      {
        id: 'char-john-17',
        name: 'John 17',
        age: '17',
        likenessSourceType: 'character' as const,
        likenessCharacterId: 'char-john',
        likenessTransformNote: '17-year-old version with medium afro and no facial hair',
      },
      {
        id: 'char-john',
        name: 'John',
        age: '45',
        referenceImage: 'https://blob.example/john-45.png',
      },
    ]

    const resolved = resolveCharacterLikenessInput(
      characters[0]!,
      characters,
      'char-john-17'
    )
    expect(resolved).toEqual({
      likenessReferenceImageUrl: 'https://blob.example/john-45.png',
      likenessTransformNote: '17-year-old version with medium afro and no facial hair',
      donorCharacterId: 'char-john',
      donorCharacterName: 'John',
    })

    // When neither has an image yet, Reference Express plans the donor (char-john) BEFORE char-john-17
    const undrawnCast = [
      { ...characters[0]!, referenceImage: '' },
      { ...characters[1]!, referenceImage: '' },
    ]
    const planned = planReferenceExpressItems(
      { characters: undrawnCast, locations: [], props: [] },
      ['cast'],
      { includeNestedStills: false }
    )
    expect(planned.map((item) => item.targetId)).toEqual(['char-john', 'char-john-17'])
  })
})

describe('Reset Continuity from Script cross-link scrubbing & re-binding', () => {
  it('scrubs stale Continuity IDs from scenes, beats, and production segments and re-binds to rebuilt catalog', () => {
    const staleScenes = [
      {
        id: 'scene-1',
        sceneNumber: 1,
        heading: 'INT. ROWHOUSE KITCHEN - NIGHT',
        action: 'John 17 studies his battered calculus textbook at the table.',
        characters: ['John 17'],
        referenceOverrides: {
          excludedIds: ['cast:stale-old-char'],
          addedLocationIds: ['loc-deleted-old'],
        },
        characterWardrobes: [
          { characterId: 'stale-old-char', wardrobeId: 'wardrobe-deleted' },
        ],
        dialogue: [
          {
            character: 'John 17',
            characterId: 'stale-old-char',
            line: 'One more page.',
          },
        ],
        beats: [
          {
            beatId: 'beat-1',
            character: 'John 17',
            characterId: 'stale-old-char',
            actionDescription: 'John 17 writes equations in his calculus textbook.',
            beatDirection: {
              castInFrame: ['John 17'],
              keyProps: ['Calculus Textbook'],
            },
            referenceSelection: {
              characterIds: ['stale-old-char'],
              locationRefId: 'loc-deleted-old',
              objectRefIds: ['obj-deleted-old'],
              resolvedAt: '2025-01-01T00:00:00.000Z',
            },
          },
        ],
      },
    ]

    const staleProduction = {
      scenes: {
        'scene-1': {
          segments: [
            {
              segmentId: 'seg-1',
              references: {
                characterIds: ['stale-old-char'],
                sceneRefIds: ['loc-deleted-old'],
                objectRefIds: ['obj-deleted-old'],
                characterRefs: ['https://old/ref.png'],
                sceneRefs: [],
                objectRefs: [],
              },
            },
          ],
        },
      },
    }

    const rebuiltCharacters = [
      {
        id: 'char-new-john17',
        name: 'John 17',
        defaultWardrobe: 'Faded grey sweatshirt',
        wardrobes: [
          {
            id: 'default-char-new-john17',
            name: 'Default Look',
            description: 'Faded grey sweatshirt',
            sceneNumbers: [1],
            isDefault: true,
          },
        ],
      },
    ]
    const rebuiltLocations = [
      {
        id: 'loc-new-kitchen',
        location: 'ROWHOUSE KITCHEN',
        locationDisplay: 'INT. ROWHOUSE KITCHEN - NIGHT',
        imageUrl: '',
        sceneNumbers: [1],
        versions: [],
      },
    ]
    const rebuiltObjects = [
      {
        id: 'obj-new-textbook',
        type: 'object' as const,
        name: 'Calculus Textbook',
        description: 'Battered college calculus textbook',
        imageUrl: '',
        sceneNumbers: [1],
      },
    ]

    const cleaned = cleanAndRebindContinuityCrossLinks({
      scenes: staleScenes,
      production: staleProduction,
      characters: rebuiltCharacters,
      locationReferences: rebuiltLocations,
      objectReferences: rebuiltObjects,
      preservePortraitsAndVoices: false,
      resolvedAt: '2026-11-14T06:00:00.000Z',
    })

    const scene0 = cleaned.scenes[0]!
    expect(scene0.referenceOverrides).toBeUndefined()
    expect(scene0.characterWardrobes).toBeUndefined()
    expect(scene0.dialogue[0].characterId).toBe('char-new-john17')

    const beat0 = scene0.beats[0]!
    expect(beat0.characterId).toBe('char-new-john17')
    expect(beat0.referenceSelection.characterIds).toEqual(['char-new-john17'])
    expect(beat0.referenceSelection.locationRefId).toBe('loc-new-kitchen')
    expect(beat0.referenceSelection.objectRefIds).toContain('obj-new-textbook')

    const seg0 = cleaned.production?.scenes?.['scene-1']?.segments?.[0]
    expect(seg0.references.characterIds).toEqual([])
    expect(seg0.references.sceneRefIds).toEqual([])
    expect(seg0.references.objectRefIds).toEqual([])

    // Verify scene requirement resolution cleanly finds the rebuilt Cast, Location, and Prop!
    const reqs = resolveSceneRequiredReferences({
      scene: scene0,
      sceneIndex: 0,
      characters: cleaned.characters as any,
      locationReferences: cleaned.locationReferences,
      objectReferences: cleaned.objectReferences,
      overrides: null,
    })
    const reqIds = reqs.map((r) => `${r.kind}:${r.id}`)
    expect(reqIds).toContain('cast:char-new-john17')
    expect(reqIds).toContain('location:loc-new-kitchen')
    expect(reqIds).toContain('prop:obj-new-textbook')
  })
})
