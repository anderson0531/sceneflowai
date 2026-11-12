import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/models', () => ({}))
vi.mock('@/models/Project', () => ({ Project: { findByPk: vi.fn() } }))

import {
  buildFamilialVisualContinuityClause,
  enforceEnsembleFamilyConsistency,
  inferFamilyRelationshipsForEnsemble,
  normalizeKinshipRelation,
  parseApproximateAge,
  resolveBiologicalChildEthnicity,
  sortCharactersFamilyAnchorsFirst,
} from '@/lib/character/characterFamily'
import {
  buildCharacterLocalizationPromptBlock,
  characterNeedsBaselineEnrichment,
  composeStandingAppearanceFromAttributes,
  enrichEnsembleCastFallback,
  inferLocaleDefaultEthnicityHint,
  isPoisonedPlaceholderImagePrompt,
} from '@/lib/character/characterIntelligence'
import { buildAppearanceDescriptionFromAttributes } from '@/lib/character/characterReferencePrompts'
import { resolveCastIdentityGenerationPrompt } from '@/lib/intelligence/reference-still-director-fallback'
import { buildVisionPhaseContinuityFromVariant } from '@/lib/blueprint/blueprintContinuity'
import { planReferenceExpressItems } from '@/lib/vision/referenceExpress/planItems'

describe('Character Family, Kinship & Genetic Continuity Engine', () => {
  it('propagates exact ethnicity and reconciles generational age for same-ethnicity biological parents', () => {
    const rawCast = [
      {
        id: 'p1',
        name: 'Ji-hoon Park',
        role: 'supporting',
        gender: 'male',
        age: '48',
        ethnicity: 'East Asian (Korean)',
        description: 'Father of Min-seo Park and Jun-seo Park.',
      },
      {
        id: 'p2',
        name: 'Soo-jin Park',
        role: 'supporting',
        gender: 'female',
        age: '46',
        ethnicity: 'East Asian (Korean)',
        description: 'Mother of Min-seo Park and wife of Ji-hoon Park.',
      },
      {
        id: 'c1',
        name: 'Min-seo Park',
        role: 'protagonist',
        gender: 'female',
        age: '',
        ethnicity: '',
        description: 'Ambitious cellist confronting family expectations.',
      },
      {
        id: 'c2',
        name: 'Jun-seo Park',
        role: 'supporting',
        gender: 'male',
        age: '52', // Impossible biological child age (> parent age) — should be reconciled
        ethnicity: 'Caucasian', // Contradicts same-ethnicity biological parents — should be reconciled
        description: 'Younger brother of Min-seo Park.',
      },
    ]

    const reconciled = enforceEnsembleFamilyConsistency(rawCast)
    const jihoon = reconciled.find((c) => c.name === 'Ji-hoon Park')!
    const soojin = reconciled.find((c) => c.name === 'Soo-jin Park')!
    const minseo = reconciled.find((c) => c.name === 'Min-seo Park')!
    const junseo = reconciled.find((c) => c.name === 'Jun-seo Park')!

    expect(minseo.ethnicity).toBe('East Asian (Korean)')
    expect(junseo.ethnicity).toBe('East Asian (Korean)')

    const parentMinAge = Math.min(
      parseApproximateAge(jihoon.age)!,
      parseApproximateAge(soojin.age)!
    )
    const minseoAge = parseApproximateAge(minseo.age)!
    const junseoAge = parseApproximateAge(junseo.age)!

    expect(parentMinAge - minseoAge).toBeGreaterThanOrEqual(18)
    expect(parentMinAge - junseoAge).toBeGreaterThanOrEqual(18)

    // Transitive sibling & spouse links should be present
    expect(
      minseo.familyRelationships?.some(
        (r) => r.relatedCharacterName === 'Jun-seo Park' && r.relation === 'sibling_of' && r.biological
      )
    ).toBe(true)
    expect(
      jihoon.familyRelationships?.some(
        (r) => r.relatedCharacterName === 'Soo-jin Park' && r.relation === 'spouse_of' && !r.biological
      )
    ).toBe(true)
  })

  it('produces explicit Mixed [Parent A] and [Parent B] heritage when biological parents have different ethnicities', () => {
    const mixedEth = resolveBiologicalChildEthnicity([
      'Southeast Asian (Thai)',
      'White (Irish-American)',
    ])
    expect(mixedEth).toBe('Mixed Southeast Asian (Thai) and White (Irish-American) heritage')

    const rawCast = [
      {
        id: 'mom',
        name: 'Maliwan O-Connor',
        role: 'supporting',
        gender: 'female',
        age: '44',
        ethnicity: 'Southeast Asian (Thai)',
        eyeColor: 'dark brown',
        hairColor: 'jet black',
        familyRelationships: [
          { relatedCharacterName: 'Liam O-Connor', relation: 'spouse_of' as const, biological: false },
          { relatedCharacterName: 'Kiran O-Connor', relation: 'parent_of' as const, biological: true },
          { relatedCharacterName: 'Nora O-Connor', relation: 'parent_of' as const, biological: true },
        ],
      },
      {
        id: 'dad',
        name: 'Liam O-Connor',
        role: 'supporting',
        gender: 'male',
        age: '46',
        ethnicity: 'White (Irish-American)',
        eyeColor: 'hazel-green',
        hairColor: 'auburn-brown',
        familyRelationships: [
          { relatedCharacterName: 'Kiran O-Connor', relation: 'parent_of' as const, biological: true },
          { relatedCharacterName: 'Nora O-Connor', relation: 'parent_of' as const, biological: true },
        ],
      },
      {
        id: 'kid1',
        name: 'Kiran O-Connor',
        role: 'protagonist',
        gender: 'male',
        age: '17',
        ethnicity: 'Caucasian', // Drifted single-side ethnicity should be fixed to Mixed heritage
      },
      {
        id: 'kid2',
        name: 'Nora O-Connor',
        role: 'supporting',
        gender: 'female',
        age: '15',
        ethnicity: '', // Empty ethnicity should also get identical Mixed heritage
      },
    ]

    const reconciled = enforceEnsembleFamilyConsistency(rawCast)
    const maliwan = reconciled.find((c) => c.name === 'Maliwan O-Connor')!
    const liam = reconciled.find((c) => c.name === 'Liam O-Connor')!
    const kiran = reconciled.find((c) => c.name === 'Kiran O-Connor')!
    const nora = reconciled.find((c) => c.name === 'Nora O-Connor')!

    // Spouses keep their individual ethnicities
    expect(maliwan.ethnicity).toBe('Southeast Asian (Thai)')
    expect(liam.ethnicity).toBe('White (Irish-American)')

    // Both biological siblings get identical mixed heritage
    expect(kiran.ethnicity).toBe('Mixed Southeast Asian (Thai) and White (Irish-American) heritage')
    expect(nora.ethnicity).toBe('Mixed Southeast Asian (Thai) and White (Irish-American) heritage')

    // Familial visual continuity clause includes both parents & genetic traits
    const clause = buildFamilialVisualContinuityClause(kiran, reconciled)
    expect(clause).toContain('Maliwan O-Connor')
    expect(clause).toContain('Liam O-Connor')
    expect(clause).toContain('Mixed Southeast Asian (Thai) and White (Irish-American) heritage')
  })

  it('does not overwrite an adopted or step-child ethnicity when biological is false', () => {
    const parsed = normalizeKinshipRelation('adoptive mother', undefined, 'Adoptive mother of Leo')
    expect(parsed).toEqual({ relation: 'parent_of', biological: false })

    const cast = enforceEnsembleFamilyConsistency([
      {
        id: 'p1',
        name: 'Claire Dubois',
        age: '45',
        ethnicity: 'White (French)',
        familyRelationships: [
          {
            relatedCharacterName: 'Mateo Dubois',
            relation: 'parent_of',
            biological: false,
            label: 'Adoptive mother of Mateo',
          },
        ],
      },
      {
        id: 'c1',
        name: 'Mateo Dubois',
        age: '14',
        ethnicity: 'Latino (Colombian)',
      },
    ])

    expect(cast[1]!.ethnicity).toBe('Latino (Colombian)')
  })

  it('infers parent/child kinship from 2-speaker scene vocatives in script dialogue', () => {
    const cast = [
      { id: '1', name: 'Elena Morales', age: '47', ethnicity: 'Latina (Mexican)' },
      { id: '2', name: ' Diego Morales', age: '19', ethnicity: '' },
    ]
    const scenes = [
      {
        sceneNumber: 1,
        dialogue: [
          { character: 'DIEGO MORALES', line: 'Mom, you promised you would not sell the bakery!' },
          { character: 'ELENA MORALES', line: 'We do not have another choice right now.' },
        ],
      },
    ]

    const withKin = inferFamilyRelationshipsForEnsemble(cast, scenes)
    const diego = withKin.find((c) => c.name?.trim() === 'Diego Morales')!
    expect(
      diego.familyRelationships?.some(
        (r) => r.relatedCharacterName.trim() === 'Elena Morales' && r.relation === 'child_of'
      )
    ).toBe(true)

    const consistent = enforceEnsembleFamilyConsistency(cast, { scenes })
    expect(consistent[1]!.ethnicity).toBe('Latina (Mexican)')
  })
})

describe('Character Portrait Prompt Fixes & Poisoned Stub Prevention', () => {
  it('prioritizes structured physical attributes over plot description in buildAppearanceDescriptionFromAttributes', () => {
    const blueprintChar = {
      name: 'Arunee Wattana',
      description: 'A relentless investigative journalist risking her career to expose port corruption.',
      appearanceDescription: '',
      age: '34',
      gender: 'female',
      ethnicity: 'Southeast Asian (Thai)',
      build: "5'5\" slender athletic",
      hairColor: 'jet black',
      hairStyle: 'collarbone-length straight cut',
      eyeColor: 'dark brown',
      keyFeature: 'defined high cheekbones',
      expression: 'observant, composed gaze',
    }

    const built = buildAppearanceDescriptionFromAttributes(blueprintChar)
    expect(built).toContain('Southeast Asian (Thai)')
    expect(built.toLowerCase()).toContain('jet black')
    expect(built).toContain('dark brown')
    expect(built).not.toContain('investigative journalist')
    expect(built).not.toContain('port corruption')
  })

  it('preserves anti-likeness fallback when a character has no physical attributes at all', () => {
    const built = buildAppearanceDescriptionFromAttributes({ name: 'Winston Churchill' })
    expect(built).toBe('an original adult with a unique, unrecognizable face')
  })

  it('rejects poisoned "Character from script" imagePrompt stubs in resolveCastIdentityGenerationPrompt', () => {
    const poisoned =
      'Professional character portrait: Somchai, Character from script, photorealistic, high detail, studio lighting, neutral background, character design, 8K quality'
    expect(isPoisonedPlaceholderImagePrompt(poisoned)).toBe(true)

    const resolved = resolveCastIdentityGenerationPrompt(
      {
        name: 'Somchai',
        description: 'Character from script',
        ethnicity: 'Southeast Asian (Thai)',
        age: '41',
        gender: 'male',
        hairColor: 'black',
        hairStyle: 'short tapered',
        eyeColor: 'dark brown',
        imagePrompt: poisoned,
      },
      'realistic'
    )

    expect(resolved.rawMode).toBe(false)
    expect(resolved.prompt).toContain('Southeast Asian (Thai)')
    expect(resolved.prompt).not.toContain('Character from script')
  })
})

describe('Localization, Blueprint Handoff & Reference Express Ordering', () => {
  it('infers geographic ethnicity hints and builds rich localization prompt blocks', () => {
    expect(inferLocaleDefaultEthnicityHint({ setting: 'Contemporary Bangkok, Thailand' })).toBe(
      'Southeast Asian (Thai)'
    )
    expect(inferLocaleDefaultEthnicityHint({ setting: '1990s Seoul neighborhood' })).toBe(
      'East Asian (Korean)'
    )
    expect(inferLocaleDefaultEthnicityHint({ setting: 'Bustling tech hub in Lagos, Nigeria' })).toBe(
      'Black (West African / Nigerian)'
    )

    const block = buildCharacterLocalizationPromptBlock({
      setting: 'Chiang Mai, Thailand',
      targetAudience: 'Thai & Southeast Asian drama viewers',
      locations: [{ name: 'Night Bazaar Tea House', description: 'Lantern-lit wooden shophouse' }],
      props: [{ name: 'Heirloom Celadon Teapot', description: 'Cracked green glaze' }],
    })
    expect(block).toContain('MIXED-ETHNICITY PARENTS')
    expect(block).toContain('SAME-ETHNICITY PARENTS')
    expect(block).toContain('Chiang Mai, Thailand')
    expect(block).toContain('Night Bazaar Tea House')
    expect(block).toContain('Heirloom Celadon Teapot')
  })

  it('populates non-empty appearanceDescription and mixed-heritage family consistency during Blueprint -> Vision handoff', () => {
    const variant = {
      setting: 'Bangkok and Dublin',
      character_descriptions: [
        {
          name: 'Niran Murphy',
          role: 'protagonist',
          gender: 'male',
          age: '20',
          ethnicity: '',
          build: 'lean runner build',
          hairColor: 'dark brown',
          hairStyle: 'wavy textured crop',
          eyeColor: 'warm hazel',
          description: 'Torn between two continents.',
          familyRelationships: [
            { relatedCharacterName: 'Dao Murphy', relation: 'child_of', biological: true },
            { relatedCharacterName: 'Sean Murphy', relation: 'child_of', biological: true },
          ],
        },
        {
          name: 'Dao Murphy',
          role: 'supporting',
          gender: 'female',
          age: '48',
          ethnicity: 'Southeast Asian (Thai)',
          hairColor: 'black',
          eyeColor: 'dark brown',
          description: 'Niran’s mother, a classical lutist.',
        },
        {
          name: 'Sean Murphy',
          role: 'supporting',
          gender: 'male',
          age: '50',
          ethnicity: 'White (Irish)',
          hairColor: 'chestnut',
          eyeColor: 'green',
          description: 'Niran’s father, a marine architect.',
        },
      ],
    }

    const handoff = buildVisionPhaseContinuityFromVariant(variant, null)
    const niran = handoff.characters.find((c) => c.name === 'Niran Murphy')!
    expect(niran.ethnicity).toBe('Mixed Southeast Asian (Thai) and White (Irish) heritage')
    expect(niran.appearanceDescription).toBeTruthy()
    expect(niran.appearanceDescription).toContain('Mixed Southeast Asian (Thai) and White (Irish) heritage')
  })

  it('orders biological parents/grandparents ahead of children in Reference Express while keeping unrelated cast order intact', () => {
    const unrelated = [
      { id: 'c1', name: 'Mira', role: 'supporting' },
      { id: 'c2', name: 'Bo', role: 'protagonist' },
    ]
    expect(sortCharactersFamilyAnchorsFirst(unrelated).map((c) => c.id)).toEqual(['c1', 'c2'])

    const familyPlan = planReferenceExpressItems({
      characters: [
        {
          id: 'child-1',
          name: 'Leo',
          familyRelationships: [
            { relatedCharacterName: 'Rosa', relation: 'child_of', biological: true },
            { relatedCharacterName: 'Abuela Carmen', relation: 'grandchild_of', biological: true },
          ],
        },
        {
          id: 'parent-1',
          name: 'Rosa',
          familyRelationships: [
            { relatedCharacterName: 'Leo', relation: 'parent_of', biological: true },
            { relatedCharacterName: 'Abuela Carmen', relation: 'child_of', biological: true },
          ],
        },
        {
          id: 'grandparent-1',
          name: 'Abuela Carmen',
          familyRelationships: [
            { relatedCharacterName: 'Rosa', relation: 'parent_of', biological: true },
            { relatedCharacterName: 'Leo', relation: 'grandparent_of', biological: true },
          ],
        },
      ],
      locations: [],
      props: [],
    })

    expect(familyPlan.map((i) => i.targetId)).toEqual([
      'grandparent-1',
      'parent-1',
      'child-1',
    ])
  })

  it('enriches minimal script stubs deterministically via enrichEnsembleCastFallback', () => {
    const fallback = enrichEnsembleCastFallback({
      characters: [
        {
          id: 'char-1',
          name: 'Anong',
          role: 'supporting',
          description: 'Character from script',
          imagePrompt:
            'Professional character portrait: Anong, Character from script, photorealistic, high detail',
        },
      ],
      localization: {
        setting: 'Chiang Mai, Thailand',
      },
    })

    const anong = fallback.characters[0]!
    expect(characterNeedsBaselineEnrichment(anong)).toBe(false)
    expect(anong.ethnicity).toBe('Southeast Asian (Thai)')
    expect(anong.imagePrompt).toBeUndefined()
    expect(anong.appearanceDescription).toContain('Southeast Asian (Thai)')
  })

  it('keeps client-imported character modules 100% free of static or dynamic server-only imports for Turbopack', () => {
    const clientSafeModules = [
      'src/lib/character/characterIntelligence.ts',
      'src/lib/character/characterFamily.ts',
      'src/lib/blueprint/blueprintContinuity.ts',
      'src/lib/character/characterReferencePrompts.ts',
      'src/lib/intelligence/reference-still-director-fallback.ts',
    ]
    const forbiddenImportPattern =
      /(?:from\s+['"]|import\s*\(\s*['"])(?:@\/lib\/vertexai\/|@\/models|@\/config\/database|server-only|@\/lib\/character\/characterIntelligence\.server|@\/lib\/vision\/referenceExpress\/castCatalogSync|fs|child_process|net|tls)/

    for (const relPath of clientSafeModules) {
      const fullPath = join(process.cwd(), relPath)
      const source = readFileSync(fullPath, 'utf8')
      expect(source, `${relPath} must not import server-only modules`).not.toMatch(
        forbiddenImportPattern
      )
    }

    const serverModule = readFileSync(
      join(process.cwd(), 'src/lib/character/characterIntelligence.server.ts'),
      'utf8'
    )
    expect(serverModule).toContain("import 'server-only'")
  })
})
