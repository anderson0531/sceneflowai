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
  buildCharacterIdentityReferencePrompt,
  buildLikenessGuidedIdentityPrompt,
  detectTraitDonorCandidatesFromProse,
  extractWardrobeFromIdentityPrompt,
  resolveCharacterLikenessInput,
} from '@/lib/character/characterReferencePrompts'
import { inferFamilyRelationshipsForEnsemble } from '@/lib/character/characterFamily'
import {
  planReferenceExpressItems,
  planSceneReferenceExpressItems,
} from '@/lib/vision/referenceExpress/planItems'
import {
  buildLikenessDonorReferencePartCaption,
  LIKENESS_DONOR_REFERENCE_PART_CAPTION,
} from '@/lib/vision/referenceExpress/generateReferenceImage'
import { isIdentityReferencePartName } from '@/lib/vertexai/identityReferencePartName'
import { updateCharacterAttributesInList } from '@/lib/vision/updateCharacterReference'
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
    expect(resolved).toMatchObject({
      likenessReferenceImageUrl: 'https://blob.example/john-45.png',
      likenessTransformNote: '17-year-old version with medium afro and no facial hair',
      donorCharacterId: 'char-john',
      donorCharacterName: 'John',
      likenessMode: 'same_person',
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

  it('handles Arthur 26 from Arthur 78 de-aging with rejuvenation overrides, warm smile fidelity, donor-age scrubbing, and wardrobe lock', () => {
    const baseWrappedPrompt = buildCharacterIdentityReferencePrompt({
      appearanceDescription:
        'Young man in his mid-20s with thick tousled chestnut-brown hair and hazel-green eyes.',
      wardrobeDescription: 'vintage cream cable-knit sweater under tan corduroy jacket',
      artStyle: 'photorealistic',
    })
    const extractedWardrobe = extractWardrobeFromIdentityPrompt(baseWrappedPrompt)
    expect(extractedWardrobe).toBe(
      'vintage cream cable-knit sweater under tan corduroy jacket'
    )

    const built = buildLikenessGuidedIdentityPrompt({
      characterName: 'Arthur 26',
      donorCharacterName: 'Arthur 78',
      appearanceDescription:
        'Young man in his mid-20s with thick tousled chestnut-brown hair and hazel-green eyes.',
      likenessTransformNote:
        '26-year-old 1974 version of Arthur 78 with thick tousled chestnut-brown hair, clean-shaven jawline, identical hazel-green eyes and warm smile, vintage cream cable-knit sweater under tan corduroy jacket.',
      wardrobeDescription: extractedWardrobe,
      artStyle: 'photorealistic',
    })

    // Extracts biological age 26 (NOT 78!) and scrubs "Arthur 78" from prompt text
    expect(built.prompt).toContain('biological age 26')
    expect(built.prompt).toContain('DE-AGING & REJUVENATION OVERRIDE')
    expect(built.prompt).not.toContain('Arthur 78')
    expect(built.prompt).toContain('of the person in Reference Image [1]')

    // Preserves warm smile instead of forcing "mouth closed, neutral relaxed expression"
    expect(built.prompt).toContain('warm smile')
    expect(built.prompt).not.toContain('mouth closed')

    // Preserves wardrobe override
    expect(built.prompt).toContain(
      'Wardrobe / Attire (OVERRIDES Reference Image [1]): Do NOT copy clothing from Reference Image [1]. Dress the subject in: vintage cream cable-knit sweater under tan corduroy jacket.'
    )

    // Includes comprehensive anti-aging & clean-shaven negative terms for age 26
    expect(built.negativeTerms).toEqual(
      expect.arrayContaining([
        'beard',
        'mustache',
        'stubble',
        'elderly',
        'senior',
        'deep wrinkles',
        'jowls',
        'age spots',
        'silver hair',
        'white hair',
        'gray hair',
        'receding hairline',
      ])
    )

    // Multimodal part caption binds Reference Image [1] without triggering identity face-crop warnings
    expect(LIKENESS_DONOR_REFERENCE_PART_CAPTION).toContain('Reference Image [1]')
    expect(isIdentityReferencePartName(LIKENESS_DONOR_REFERENCE_PART_CAPTION)).toBe(false)
  })

  it('resolves ID-less Blueprint cast donors ("0") and name fallbacks, clears likeness attributes cleanly, and pulls undrawn donors into Scene Ref Agent', () => {
    const idlessCast = [
      {
        name: 'Arthur 78',
        age: '78',
        referenceImage: 'https://blob.example/arthur-78.png',
      },
      {
        name: 'Arthur 26',
        age: '26',
        // Stored numeric string index "0" from resolveCharacterId(char, 0) + name fallback
        likenessCharacterId: '0',
        likenessCharacterName: 'Arthur 78',
        likenessTransformNote: '26-year-old 1974 version of Arthur 78',
      },
    ]

    const resolvedByIndexId = resolveCharacterLikenessInput(idlessCast[1]!, idlessCast, '1')
    expect(resolvedByIndexId).toMatchObject({
      likenessReferenceImageUrl: 'https://blob.example/arthur-78.png',
      likenessTransformNote: '26-year-old 1974 version of Arthur 78',
      donorCharacterId: '0',
      donorCharacterName: 'Arthur 78',
      likenessMode: 'same_person',
    })
    expect(resolvedByIndexId.donors).toHaveLength(1)

    // Reorder cast so index "0" is now Arthur 26 — name fallback still finds Arthur 78!
    const reorderedCast = [idlessCast[1]!, idlessCast[0]!]
    const resolvedAfterReorder = resolveCharacterLikenessInput(
      { ...reorderedCast[0]!, likenessCharacterId: 'stale-id' },
      reorderedCast,
      '0'
    )
    expect(resolvedAfterReorder.likenessReferenceImageUrl).toBe(
      'https://blob.example/arthur-78.png'
    )
    expect(resolvedAfterReorder.donorCharacterName).toBe('Arthur 78')

    // Clearing likeness fields via empty string deletes the keys instead of ignoring undefined
    const cleared = updateCharacterAttributesInList(
      [
        {
          id: 'char-arthur-26',
          name: 'Arthur 26',
          likenessSourceType: 'upload',
          likenessImageUrl: 'https://blob.example/selfie.jpg',
        },
      ],
      'char-arthur-26',
      {
        likenessSourceType: 'none',
        likenessImageUrl: '',
      }
    )
    expect(cleared[0]!.likenessSourceType).toBe('none')
    expect('likenessImageUrl' in cleared[0]!).toBe(false)

    // Scene 1 features ONLY Arthur 26, while both Arthur 78 and Arthur 26 are undrawn:
    // Scene Ref Agent pulls in Arthur 78 FIRST so Arthur 26 has its likeness donor!
    const scenePlanned = planSceneReferenceExpressItems(
      {
        characters: [
          { id: 'char-arthur-26', name: 'Arthur 26', likenessSourceType: 'character', likenessCharacterId: 'char-arthur-78' },
          { id: 'char-arthur-78', name: 'Arthur 78' },
        ],
        locations: [],
        props: [],
        scenes: [
          {
            sceneNumber: 1,
            heading: 'EXT. COASTAL OVERLOOK - DAY (1974)',
            action: 'Arthur 26 leans against the vintage station wagon.',
            characters: ['Arthur 26'],
            dialogue: [{ character: 'Arthur 26', line: 'Look at that horizon.' }],
            beats: [
              {
                beatId: 'b1',
                characters: ['Arthur 26'],
                beatDirection: { generatedBy: 'director' },
              },
            ],
          },
        ],
      },
      { sceneIndices: [0], kinds: ['cast'] }
    )
    expect(scenePlanned.map((i) => i.targetId)).toEqual([
      'char-arthur-78',
      'char-arthur-26',
    ])
  })

  it('supports blended 2-parent family trait inheritance ("Claire 44: Warm 44-year-old adult daughter inheriting Arthur’s hazel eyes and Eleanor’s cheekbones, chestnut shoulder-length hair, sage knit sweater")', () => {
    const claireNote =
      'Warm 44-year-old adult daughter inheriting Arthur’s hazel eyes and Eleanor’s cheekbones, chestnut shoulder-length hair, sage knit sweater.'

    const familyCast = [
      {
        id: 'char-arthur-26',
        name: 'Arthur 26',
        age: '26',
        gender: 'male',
      },
      {
        id: 'char-arthur-78',
        name: 'Arthur 78',
        age: '78',
        gender: 'male',
        referenceImage: 'https://blob.example/arthur-78.png',
      },
      {
        id: 'char-eleanor-75',
        name: 'Eleanor 75',
        age: '75',
        gender: 'female',
        referenceImage: 'https://blob.example/eleanor-75.png',
      },
      {
        id: 'char-claire-44',
        name: 'Claire 44',
        age: '44',
        gender: 'female',
        description: claireNote,
      },
    ]

    // 1. Kinship inference links Claire 44 to BOTH Arthur 78 and Eleanor 75 even when Arthur 26 is also in the cast
    const withKinship = inferFamilyRelationshipsForEnsemble(familyCast)
    const claireRels = withKinship[3]!.familyRelationships || []
    expect(claireRels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relatedCharacterName: 'Arthur 78',
          relation: 'child_of',
          biological: true,
        }),
        expect.objectContaining({
          relatedCharacterName: 'Eleanor 75',
          relation: 'child_of',
          biological: true,
        }),
      ])
    )
    // Does not duplicate Arthur 26 as a third biological parent
    expect(claireRels.filter((r) => r.relation === 'child_of')).toHaveLength(2)

    // 2. Prose trait-donor detection & automatic likeness resolution resolve BOTH parents in mention order ([1] Arthur, [2] Eleanor)
    const detected = detectTraitDonorCandidatesFromProse(
      familyCast[3],
      familyCast,
      'char-claire-44'
    )
    expect(detected.map((d) => d.characterId)).toEqual([
      'char-arthur-78',
      'char-eleanor-75',
    ])

    const autoResolved = resolveCharacterLikenessInput(
      familyCast[3],
      familyCast,
      'char-claire-44'
    )
    expect(autoResolved.likenessMode).toBe('family_blend')
    expect(autoResolved.donors).toEqual([
      expect.objectContaining({
        imageUrl: 'https://blob.example/arthur-78.png',
        characterId: 'char-arthur-78',
        cleanLabel: 'Arthur',
      }),
      expect.objectContaining({
        imageUrl: 'https://blob.example/eleanor-75.png',
        characterId: 'char-eleanor-75',
        cleanLabel: 'Eleanor',
      }),
    ])

    // Explicit UI 2-donor selection also resolves identically
    const explicitResolved = resolveCharacterLikenessInput(
      {
        ...familyCast[3],
        likenessSourceType: 'character',
        likenessMode: 'family_blend',
        likenessCharacterId: 'char-arthur-78',
        secondaryLikenessCharacterId: 'char-eleanor-75',
        likenessTransformNote: claireNote,
      },
      familyCast,
      'char-claire-44'
    )
    expect(explicitResolved.likenessMode).toBe('family_blend')
    expect(explicitResolved.donors).toHaveLength(2)

    // 3. Prompt builder generates distinct-offspring inheritance prompt with [1]/[2] bindings, single-subject lock, and female facial harmony
    const built = buildLikenessGuidedIdentityPrompt({
      characterName: 'Claire 44',
      donors: autoResolved.donors,
      likenessMode: autoResolved.likenessMode,
      targetGender: 'female',
      appearanceDescription: claireNote,
      likenessTransformNote: claireNote,
      targetAge: '44',
      wardrobeDescription: 'sage knit sweater',
    })

    expect(built.prompt).toContain(
      'Familial Genetic Inheritance (Reference Image [1]: Arthur + Reference Image [2]: Eleanor)'
    )
    expect(built.prompt).toContain('ORIGINAL, DISTINCT individual')
    expect(built.prompt).toContain('SINGLE-SUBJECT PORTRAIT LOCK')
    expect(built.prompt).toContain('GENDER & FACIAL HARMONY LOCK: Subject is female')
    expect(built.prompt).toContain('Arthur’s (Reference Image [1]) hazel eyes')
    expect(built.prompt).toContain('Eleanor’s (Reference Image [2]) cheekbones')
    expect(built.prompt).toContain('biological age 44')
    expect(built.prompt).not.toContain('78')
    expect(built.prompt).not.toContain('75')
    expect(built.prompt).not.toContain('mouth closed')
    expect(built.negativeTerms).toEqual(
      expect.arrayContaining([
        'beard',
        'mustache',
        'stubble',
        'multiple people',
        'split screen',
        'collage',
        'elderly',
        'heavy jowls',
      ])
    )

    // 4. Multimodal captions label Reference Image [1] (Arthur) & Reference Image [2] (Eleanor) cleanly
    const cap1 = buildLikenessDonorReferencePartCaption(1, 'family_blend', 'Arthur 78')
    const cap2 = buildLikenessDonorReferencePartCaption(2, 'family_blend', 'Eleanor 75')
    expect(cap1).toContain('Reference Image [1] (Arthur)')
    expect(cap1).not.toContain('78')
    expect(cap2).toContain('Reference Image [2] (Eleanor)')
    expect(cap2).not.toContain('75')
    expect(isIdentityReferencePartName(cap1)).toBe(false)
    expect(isIdentityReferencePartName(cap2)).toBe(false)

    // 5. Reference Express orders BOTH undrawn parents (Arthur 78 & Eleanor 75) BEFORE Claire 44
    const undrawnFamilyPlan = planSceneReferenceExpressItems(
      {
        characters: [
          {
            id: 'char-claire-44',
            name: 'Claire 44',
            description: claireNote,
          },
          {
            id: 'char-arthur-78',
            name: 'Arthur 78',
          },
          {
            id: 'char-eleanor-75',
            name: 'Eleanor 75',
          },
        ],
        locations: [],
        props: [],
        scenes: [
          {
            sceneNumber: 1,
            heading: 'INT. LIVING ROOM - DAY',
            action: 'Claire 44 opens the family photo album.',
            characters: ['Claire 44'],
            dialogue: [{ character: 'Claire 44', line: 'Mom and Dad looked so happy.' }],
            beats: [
              {
                beatId: 'b-claire',
                characters: ['Claire 44'],
                beatDirection: { generatedBy: 'director' },
              },
            ],
          },
        ],
      },
      { sceneIndices: [0], kinds: ['cast'] }
    )
    expect(undrawnFamilyPlan.map((i) => i.targetId)).toEqual([
      'char-arthur-78',
      'char-eleanor-75',
      'char-claire-44',
    ])
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
