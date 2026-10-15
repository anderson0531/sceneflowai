import { describe, expect, it } from 'vitest'
import { buildContinuityContext } from '@/lib/series/continuityContext'
import { bindTreatmentToLibrary } from '@/lib/series/bindLibraryAssets'
import {
  buildEpisodeBlueprintBrief,
  resolveSeriesTone,
} from '@/lib/series/episodeBlueprintBrief'
import { resolveFeaturedCharacter } from '@/lib/series/featuredCharacter'
import {
  DEFAULT_BLUEPRINT_TONE,
  resolveRequiredBlueprintFields,
} from '@/lib/blueprint/regenerateDefaults'
import { buildTreatmentPrompt } from '@/lib/treatment/prompts'
import type { SeriesEpisodeBlueprint, SeriesProductionBible } from '@/types/series'

const longDescription =
  'Ada keeps the city archive and refuses to let a rewritten history replace the people already in it.'

function bible(): SeriesProductionBible {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    logline: 'A city remembers.',
    synopsis: 'The series follows Ada as the archive fights a rewritten history.',
    setting: 'Near-future Tokyo',
    protagonist: { characterId: 'c1', name: 'Ada Voss', goal: 'Keep the record true' },
    antagonistConflict: { type: 'society', description: 'The rewrite bureau' },
    aesthetic: {},
    toneGuidelines: 'Wry and tense',
    consistencyRules: ['Ada never abandons the archive.'],
    storyThreads: [
      {
        id: 'thread-1',
        name: 'The rewritten census',
        type: 'main',
        status: 'developing',
        description: 'Names keep disappearing from the public record.',
      },
    ],
    characters: [
      {
        id: 'c1',
        name: 'Ada Voss',
        role: 'protagonist',
        description: longDescription,
        appearance: 'Silver coat',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'c2',
        name: 'Nico Pell',
        role: 'supporting',
        description: 'Runs the night market.',
        appearance: '',
        createdAt: '',
        updatedAt: '',
      },
    ],
    locations: [
      {
        id: 'l1',
        name: 'Archive Hall',
        description: 'A stone hall of index drawers.',
        createdAt: '',
        updatedAt: '',
      },
    ],
    props: [
      {
        id: 'p1',
        name: 'Census Key',
        description: 'Opens a sealed drawer.',
        createdAt: '',
        updatedAt: '',
      },
    ],
  }
}

function episode(characterIds: string[]): SeriesEpisodeBlueprint {
  return {
    id: 'ep-2',
    episodeNumber: 2,
    title: 'The Missing Name',
    logline: 'Ada finds her own name gone.',
    synopsis: 'Ada searches the hall for the missing entry.',
    beats: [],
    characters: characterIds.map((characterId) => ({
      characterId,
      role: characterId === 'c1' ? 'protagonist' : 'supporting',
    })),
    status: 'blueprint',
  }
}

describe('series start blueprint continuity', () => {
  it('passes the series synopsis, consistency rules, story threads, and full library text', () => {
    const ctx = buildContinuityContext(bible(), [episode(['c1'])], 'Archive', 'A city remembers.', 2, 8)
    const prompt = ctx.continuityPromptBlock

    expect(prompt).toContain('Series synopsis: The series follows Ada')
    expect(prompt).toContain('Ada never abandons the archive.')
    expect(prompt).toContain('The rewritten census')
    expect(prompt).toContain('Do not contradict them.')
    expect(prompt).toContain('Ada Voss')
    expect(prompt).toContain('role="protagonist"')
    expect(prompt).toContain(longDescription)
    expect(prompt).toContain('Archive Hall')
    expect(prompt).toContain('Census Key')
    expect(prompt).not.toContain('Nico Pell')
    expect(ctx.lockedLibrary.characters.map((character) => character.name)).toEqual(['Ada Voss'])
  })

  it('tells Blueprint generation to reuse the library and follow storyline tracking', () => {
    const ctx = buildContinuityContext(bible(), [episode(['c1'])], 'Archive', 'A city remembers.', 2, 8)
    const prompt = buildTreatmentPrompt({
      input: 'Episode 2',
      coreConcept: {
        input_title: 'The Missing Name',
        input_synopsis: 'Ada searches the hall.',
        core_themes: ['memory'],
        narrative_structure: 'three_act',
      },
      format: 'narrative',
      targetMinutes: 40,
      seriesContinuityBlock: ctx.continuityPromptBlock,
    })

    expect(prompt).toContain('Do not invent a parallel cast')
    expect(prompt).toContain('Do not contradict them.')
    expect(prompt).toContain(longDescription)
  })
})

describe('episode blueprint brief', () => {
  it('keeps the series synopsis and episode hook, and leaves continuity to the other block', () => {
    const brief = buildEpisodeBlueprintBrief(
      {
        episodeNumber: 2,
        title: 'The Missing Name',
        logline: 'Ada finds her own name gone.',
        synopsis: 'Ada searches the hall for the missing entry.',
        episodeHook: 'The drawer opens on its own.',
        beats: [{ act: 1, beatNumber: 1, title: 'The search', description: 'Ada climbs the stacks.' }],
      },
      bible(),
      { title: 'Archive', logline: 'A city remembers.' }
    )

    expect(brief).toContain('Series synopsis: The series follows Ada')
    expect(brief).toContain('Episode hook: The drawer opens on its own.')
    expect(brief).toContain('Ada climbs the stacks.')
    expect(brief).not.toContain('consistency')
    expect(brief).not.toContain('story threads')
    expect(resolveSeriesTone(bible())).toBe('Wry and tense')
    expect(resolveSeriesTone({ aesthetic: { mood: 'cool and spare' } })).toBe('cool and spare')
  })
})

describe('library binding', () => {
  it('replaces invented characters with the library record and keeps a marked-new asset', () => {
    const bound = bindTreatmentToLibrary(
      {
        character_descriptions: [
          { name: 'Elara Vance', role: 'protagonist', description: 'An invented lead' },
          { name: 'Ada Voss', description: 'The model rewrote her.', externalGoal: 'Find the key' },
          { name: 'Witness', description: 'New: a clerk who saw the rewrite.', isNew: true },
        ],
        scene_descriptions: [
          { name: 'Random Alley', location: 'A street', atmosphere: 'wet' },
          { name: 'Archive Hall', atmosphere: 'lamp light' },
          { name: 'Dock', description: 'New: a pier that is not in the library.', isNew: true },
        ],
      },
      {
        characters: [
          { id: 'c1', name: 'Ada Voss', role: 'protagonist', description: longDescription },
        ],
        locations: [{ id: 'l1', name: 'Archive Hall', description: 'A stone hall of index drawers.' }],
        props: [],
      }
    )

    expect(bound.character_descriptions?.map((character) => character.name)).toEqual([
      'Ada Voss',
      'Witness',
    ])
    const ada = bound.character_descriptions?.[0]
    expect(ada?.role).toBe('protagonist')
    expect(ada?.description).toBe(longDescription)
    expect(ada?.externalGoal).toBe('Find the key')
    expect(bound.scene_descriptions?.map((scene) => scene.name)).toEqual(['Archive Hall', 'Dock'])
  })
})

describe('featured characters', () => {
  it('resolves a library id to the name, role, and description', () => {
    const featured = resolveFeaturedCharacter(
      { characterId: 'c1', role: 'guest' },
      bible().characters
    )
    expect(featured).toEqual({
      name: 'Ada Voss',
      role: 'protagonist',
      description: longDescription,
    })

    const missing = resolveFeaturedCharacter({ characterId: 'missing', role: 'guest' }, [])
    expect(missing.name).toBe('missing')
    expect(missing.role).toBe('guest')
    expect(missing.description).toBe('')
  })
})

describe('regenerate blueprint defaults', () => {
  it('fills a blank tone and keeps a stored series tone ahead of the default', () => {
    expect(
      resolveRequiredBlueprintFields({
        synopsis: '',
        logline: 'Ada finds her own name gone.',
        genre: '',
        tone: '',
        toneDescription: '',
      })
    ).toMatchObject({
      synopsis: 'Ada finds her own name gone.',
      genre: 'Drama',
      tone: DEFAULT_BLUEPRINT_TONE,
      contentIntent: 'fiction',
    })

    expect(
      resolveRequiredBlueprintFields({
        synopsis: 'Ada searches the hall.',
        genre: 'thriller',
        toneDescription: '',
        fallbackTone: 'Wry and tense',
      }).tone
    ).toBe('Wry and tense')
  })
})
