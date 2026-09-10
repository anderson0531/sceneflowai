import { describe, it, expect } from 'vitest'
import { toCanonicalName } from '@/lib/character/canonical'
import {
  buildReferenceCatalog,
  formatReferenceCatalogForPrompt,
  libraryAssetToCharacter,
  libraryAssetToLocation,
  characterToLibraryAttributes,
  projectVisionFromLibraryAssets,
  MAX_ROSTER_ENTRIES,
} from '@/lib/referenceLibrary/projection'
import { isUndefinedTableError, PG_UNDEFINED_TABLE } from '@/lib/database/pgErrors'
import type { ReferenceAssetRecord } from '@/types/referenceLibrary'
import { buildContinuityContext } from '@/lib/series/continuityContext'
import type { SeriesProductionBible } from '@/types/series'

function makeAsset(
  overrides: Partial<ReferenceAssetRecord> & Pick<ReferenceAssetRecord, 'id' | 'kind' | 'name'>
): ReferenceAssetRecord {
  return {
    userId: 'user-1',
    canonicalName: toCanonicalName(overrides.name),
    description: null,
    referenceImageUrl: null,
    attributes: {},
    tags: [],
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('referenceLibrary projection', () => {
  it('round-trips character through library asset', () => {
    const asset = makeAsset({
      id: 'lib-char-1',
      kind: 'character',
      name: 'Dr. Ben Anderson',
      description: 'Lead researcher',
      referenceImageUrl: 'https://example.com/ben.png',
      attributes: {
        appearance: 'Tall, grey hair',
        voiceId: 'voice-1',
        klingElementId: 'kling-abc',
        role: 'protagonist',
      },
    })

    const char = libraryAssetToCharacter(asset)
    expect(char.libraryAssetId).toBe('lib-char-1')
    expect(char.name).toBe('Dr. Ben Anderson')
    expect(char.klingElementId).toBe('kling-abc')
    expect(char.referenceImage).toBe('https://example.com/ben.png')

    const attrs = characterToLibraryAttributes(char)
    expect(attrs.klingElementId).toBe('kling-abc')
    expect(attrs.voiceId).toBe('voice-1')
  })

  it('builds capped catalog prompt block', () => {
    const assets = Array.from({ length: 50 }, (_, i) =>
      makeAsset({
        id: `c-${i}`,
        kind: 'character',
        name: `Character ${i}`,
        description: `Desc ${i}`,
      })
    )
    const catalog = buildReferenceCatalog(assets)
    expect(catalog.characters).toHaveLength(50)

    const block = formatReferenceCatalogForPrompt(catalog, 10)
    expect(block).toContain('REFERENCE ASSET CATALOG')
    expect(block).toContain('omitted')
  })

  it('projects linked assets into visionPhase shape', () => {
    const assets = [
      makeAsset({ id: 'loc-1', kind: 'location', name: 'Lab', description: 'Science lab' }),
      makeAsset({ id: 'prop-1', kind: 'prop', name: 'Microscope', description: 'Brass scope' }),
    ]
    const { locationReferences, objectReferences } = projectVisionFromLibraryAssets(assets)
    expect(locationReferences).toHaveLength(1)
    expect(locationReferences[0].libraryAssetId).toBe('loc-1')
    expect(objectReferences[0].name).toBe('Microscope')
  })
})

describe('referenceLibrary reconcile matching', () => {
  it('canonical name dedupe uses toCanonicalName', () => {
    expect(toCanonicalName("DR. BEN ANDERSON")).toBe(toCanonicalName('Dr. Ben Anderson'))
  })
})

describe('continuity reference roster', () => {
  it('includes bible assets in continuity prompt block', () => {
    const bible: SeriesProductionBible = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      logline: 'Test',
      synopsis: 'Test synopsis',
      setting: 'Near-future Tokyo',
      protagonist: { characterId: 'c1', name: 'Hero', goal: 'Save the city' },
      antagonistConflict: { type: 'technology', description: 'AI takeover' },
      aesthetic: {},
      characters: [
        {
          id: 'c1',
          name: 'Hero',
          role: 'protagonist',
          description: 'Brave lead',
          appearance: 'Athletic',
          createdAt: '',
          updatedAt: '',
        },
      ],
      locations: [
        {
          id: 'l1',
          name: 'Rooftop',
          description: 'City skyline view',
          createdAt: '',
          updatedAt: '',
        },
      ],
      props: [],
    }

    const ctx = buildContinuityContext(
      bible,
      [],
      'Test Series',
      'Logline',
      2,
      10
    )

    expect(ctx.continuityPromptBlock).toContain('REFERENCE ROSTER')
    expect(ctx.continuityPromptBlock).toContain('Hero')
    expect(ctx.continuityPromptBlock).toContain('Rooftop')
    expect(ctx.continuityPromptBlock).toContain('Near-future Tokyo')
  })
})

describe('film-treatment prompt contract', () => {
  it('buildTreatmentPrompt accepts reference catalog block', async () => {
    const { buildTreatmentPrompt } = await import('@/lib/treatment/prompts')
    const prompt = buildTreatmentPrompt({
      input: 'A scientist discovers a breakthrough.',
      coreConcept: {
        input_title: 'Breakthrough',
        input_synopsis: 'Science story',
        core_themes: ['discovery'],
        narrative_structure: 'three_act',
      },
      format: 'short_film',
      targetMinutes: 30,
      referenceCatalogBlock: '=== REFERENCE ASSET CATALOG ===\n  [CHARACTER] id=c1 name="Hero"',
      seriesContinuityBlock: '=== SERIES CONTINUITY ===',
    })

    expect(prompt).toContain('REFERENCE ASSET CATALOG')
    expect(prompt).toContain('SERIES CONTINUITY')
    expect(prompt).toContain('REFERENCE ASSET RULES')
  })
})

describe('generate-script-v2 prompt contract', () => {
  it('schema mentions libraryAssetId and newAssets', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/vision/generate-script-v2/route.ts'),
      'utf8'
    )
    expect(src).toContain('libraryAssetId')
    expect(src).toContain('locationAssetId')
    expect(src).toContain('propAssetIds')
    expect(src).toContain('newAssets')
  })
})

describe('missing reference library tables', () => {
  it('recognizes 42P01 on the error, its parent, and its original', () => {
    expect(isUndefinedTableError({ code: PG_UNDEFINED_TABLE })).toBe(true)
    // Sequelize shape for `relation "reference_asset_links" does not exist`.
    expect(
      isUndefinedTableError({
        name: 'SequelizeDatabaseError',
        message: 'relation "reference_asset_links" does not exist',
        parent: { code: PG_UNDEFINED_TABLE },
      })
    ).toBe(true)
    expect(isUndefinedTableError({ original: { code: PG_UNDEFINED_TABLE } })).toBe(true)
  })

  it('does not swallow unrelated database failures', () => {
    expect(isUndefinedTableError(null)).toBe(false)
    expect(isUndefinedTableError(new Error('connection terminated'))).toBe(false)
    expect(isUndefinedTableError({ parent: { code: '23505' } })).toBe(false)
    // A missing column is a schema bug to surface, not an absent library.
    expect(isUndefinedTableError({ parent: { code: '42703' } })).toBe(false)
  })

  it('link scoping tolerates the missing table instead of failing the query', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/referenceLibrary/assetRepository.ts'),
      'utf8'
    )
    expect(src).toContain('ensureReferenceLibraryTablesOnce')
    expect(src).toMatch(/if \(!isUndefinedTableError\(error\)\) throw error/)
  })
})
