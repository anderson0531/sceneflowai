import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  classifyField,
  CONTENT_FIELDS,
  isMachineField,
  normalizeFieldPath,
  partitionTranslatable,
} from '@/i18n/content/fieldRegistry'

const ROOT = join(__dirname, '..', '..')

describe('normalizeFieldPath', () => {
  it('collapses both array index notations to the registry form', () => {
    expect(normalizeFieldPath('beatSheet[3].summary')).toBe('beatSheet[].summary')
    expect(normalizeFieldPath('beatSheet.3.summary')).toBe('beatSheet[].summary')
    expect(normalizeFieldPath('scenes.0.segments.12.videoPrompt')).toBe(
      'scenes[].segments[].videoPrompt'
    )
  })

  it('collapses stable entity ids so override keys survive reordering', () => {
    expect(normalizeFieldPath('treatmentVariants[A].logline')).toBe(
      'treatmentVariants[].logline'
    )
    expect(normalizeFieldPath('beatSheet[beat_9f2].summary')).toBe('beatSheet[].summary')
  })
})

describe('classifyField', () => {
  it('classifies human-readable creative prose as display', () => {
    expect(classifyField('treatmentVariants[0].logline')).toBe('display')
    expect(classifyField('beatSheet.2.summary')).toBe('display')
    expect(classifyField('characters[1].motivation')).toBe('display')
    expect(classifyField('production_bible.synopsis')).toBe('display')
    expect(classifyField('episode_blueprints[0].beats[3].description')).toBe('display')
  })

  it('classifies performed lines as spoken so they follow the delivery language', () => {
    expect(classifyField('scenes[0].segments[1].dialogue[2].line')).toBe('spoken')
    expect(classifyField('scenes[0].narration')).toBe('spoken')
    expect(classifyField('scenes[0].beats[1].overlayText')).toBe('spoken')
  })

  it('protects generation prompts', () => {
    expect(classifyField('scenes[0].segments[1].videoPrompt')).toBe('machine')
    expect(classifyField('scenes[0].segments[1].startFramePrompt')).toBe('machine')
    expect(classifyField('scenes[0].segments[1].endFramePrompt')).toBe('machine')
    expect(classifyField('production_bible.locations[0].visualDescription')).toBe('machine')
  })

  it('resolves paths nested under arbitrary metadata prefixes', () => {
    expect(
      classifyField('metadata.visionPhase.script.script.scenes[4].segments[0].videoPrompt')
    ).toBe('machine')
    expect(classifyField('metadata.blueprint.treatmentVariants[0].synopsis')).toBe('display')
  })

  it('protects prompt fields that are not enumerated', () => {
    expect(isMachineField('scenes[0].segments[0].someNewFramePrompt')).toBe(true)
    expect(isMachineField('a.b.thumbnailPrompt')).toBe(true)
    expect(isMachineField('production_bible.characters[0].lockedPromptTokens')).toBe(true)
  })

  it('treats structural fields as opaque', () => {
    expect(classifyField('treatmentVariants[0].id')).toBe('opaque')
    expect(classifyField('scenes[0].imageUrl')).toBe('opaque')
    expect(classifyField('scenes[0].beats[0].storyboardImageGcsPath')).toBe('opaque')
    expect(classifyField('anything.createdAt')).toBe('opaque')
  })

  it('never translates proper nouns that anchor continuity', () => {
    expect(classifyField('characters[0].name')).toBe('opaque')
    expect(classifyField('production_bible.characters[0].name')).toBe('opaque')
    expect(classifyField('production_bible.locations[0].name')).toBe('opaque')
    expect(classifyField('scenes[0].segments[0].dialogue[0].character')).toBe('opaque')
  })

  it('fails closed on unknown paths', () => {
    expect(classifyField('someBrandNewField')).toBe('opaque')
    expect(classifyField('deeply.nested.unheardOfThing')).toBe('opaque')
  })
})

describe('partitionTranslatable', () => {
  it('keeps only display fields and reports why the rest were dropped', () => {
    const { translatable, skipped } = partitionTranslatable([
      { path: 'treatmentVariants[0].logline', text: 'A hook' },
      { path: 'scenes[0].segments[0].videoPrompt', text: 'wide shot, golden hour' },
      { path: 'scenes[0].segments[0].dialogue[0].line', text: 'Hello.' },
      { path: 'treatmentVariants[0].id', text: 'var_1' },
    ])

    expect(translatable.map((item) => item.path)).toEqual(['treatmentVariants[0].logline'])
    expect(skipped.map((item) => [item.path, item.kind])).toEqual([
      ['scenes[0].segments[0].videoPrompt', 'machine'],
      ['scenes[0].segments[0].dialogue[0].line', 'spoken'],
      ['treatmentVariants[0].id', 'opaque'],
    ])
  })
})

/**
 * Guards against a prose field being added to a content type without anyone
 * deciding how localization should treat it. Unclassified fields fail closed to
 * `opaque`, which is safe but means the field silently never gets translated —
 * this test is what surfaces that.
 */
describe('registry completeness', () => {
  const PROSE_FIELD_NAMES = [
    'logline',
    'synopsis',
    'summary',
    'description',
    'motivation',
    'internalConflict',
    'externalConflict',
    'structuralPurpose',
    'personality',
    'backstory',
    'appearance',
    'episodeHook',
    'episodeArc',
    'themes',
    'toneAndStyle',
    'visualLanguage',
    'keyCharacters',
    'archetype',
    'setting',
    'toneGuidelines',
    'visualGuidelines',
    'audioGuidelines',
  ]

  const TYPE_FILES = [
    'src/types/productionGuide.ts',
    'src/types/series.ts',
    'src/types/vision.ts',
    'src/lib/script/segmentTypes.ts',
  ]

  const classifiedLeaves = new Set(
    Object.keys(CONTENT_FIELDS).map((path) => path.split('.').pop()!.replace('[]', ''))
  )

  it.each(TYPE_FILES)('every prose field in %s is classified', (relativePath) => {
    const source = readFileSync(join(ROOT, relativePath), 'utf8')

    const declared = new Set<string>()
    for (const match of source.matchAll(/^\s{2}(\w+)\??:\s*(string|string\[\])/gm)) {
      declared.add(match[1])
    }

    const unclassified = [...declared].filter(
      (field) => PROSE_FIELD_NAMES.includes(field) && !classifiedLeaves.has(field)
    )

    expect(unclassified).toEqual([])
  })
})
