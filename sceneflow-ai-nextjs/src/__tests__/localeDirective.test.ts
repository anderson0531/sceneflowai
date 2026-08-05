import { describe, expect, it } from 'vitest'
import {
  buildProperNounGlossary,
  localeDirective,
  VISUAL_PROMPT_FIELDS,
} from '@/lib/prompts/localeDirective'
import { buildEpisodeBatchPrompt } from '@/lib/series/episodeBatchPrompt'

describe('localeDirective', () => {
  it('returns nothing for English so existing prompts are byte-identical', () => {
    expect(localeDirective('en')).toBe('')
    expect(localeDirective(undefined)).toBe('')
    expect(localeDirective(null)).toBe('')
  })

  it('names the target language in both English and its endonym', () => {
    const block = localeDirective('ja')
    expect(block).toContain('Japanese')
    expect(block).toContain('日本語')
    expect(block).toContain('"ja"')
  })

  it('protects every visual prompt field', () => {
    const block = localeDirective('es')
    for (const field of VISUAL_PROMPT_FIELDS) {
      expect(block).toContain(field)
    }
    expect(block).toContain('KEEP IN ENGLISH')
    expect(block).toMatch(/ends in "Prompt"/)
  })

  it('asks the model to author narrative reasoning in the story language', () => {
    const block = localeDirective('es')
    expect(block).toContain('narrative reasoning')
    expect(block).toContain('character_focus')
    expect(block).toContain('key_decisions')
    expect(block).toContain('story_strengths')
    expect(block).toContain('user_adjustments')
  })

  it('keeps JSON keys and schema enums in English', () => {
    const block = localeDirective('ar')
    expect(block).toContain('Every JSON key')
    expect(block).toContain('"INT"')
    expect(block).toContain('"protagonist"')
  })

  it('lists proper nouns to reproduce verbatim', () => {
    const block = localeDirective('hi', { properNouns: ['Ashley Chen', 'Kowloon Bay'] })
    expect(block).toContain('REPRODUCE THESE NAMES EXACTLY')
    expect(block).toContain('Ashley Chen, Kowloon Bay')
  })

  it('omits the proper-noun section when there is nothing to protect', () => {
    expect(localeDirective('hi')).not.toContain('REPRODUCE THESE NAMES')
  })

  it('accepts extra fields that must stay English', () => {
    expect(localeDirective('de', { keepEnglishFields: ['format_length'] })).toContain(
      'format_length'
    )
  })
})

describe('buildProperNounGlossary', () => {
  it('collects character, location, and prop names', () => {
    expect(
      buildProperNounGlossary({
        characters: [{ name: 'Mira' }, { name: 'Otto' }],
        locations: [{ name: 'The Vault' }],
        props: [{ name: 'Brass Key' }],
      })
    ).toEqual(['Mira', 'Otto', 'The Vault', 'Brass Key'])
  })

  it('deduplicates case-insensitively and drops empty values', () => {
    expect(
      buildProperNounGlossary(
        { characters: [{ name: 'Mira' }, { name: 'mira' }, { name: '' }, null] },
        ['MIRA', undefined, 'X']
      )
    ).toEqual(['Mira'])
  })

  it('caps the list so it cannot crowd out the rest of the prompt', () => {
    const characters = Array.from({ length: 100 }, (_, i) => ({ name: `Name${i}` }))
    expect(buildProperNounGlossary({ characters }, [], 5)).toHaveLength(5)
  })
})

describe('buildEpisodeBatchPrompt language handling', () => {
  const base = {
    seriesTitle: 'Harbour Lights',
    characters: [{ name: 'Nadia', role: 'protagonist', description: 'A dock inspector' }],
    episodeSummaries: '',
    activeThreads: [],
    totalPlannedEpisodes: 6,
    startEpisodeNumber: 1,
    count: 2,
  }

  it('leaves English prompts unchanged', () => {
    expect(buildEpisodeBatchPrompt(base)).not.toContain('OUTPUT LANGUAGE')
  })

  it('adds the directive and protects bible names for other languages', () => {
    const prompt = buildEpisodeBatchPrompt({
      ...base,
      storyLocale: 'pt',
      locations: [{ name: 'Cais Velho' }],
    })
    expect(prompt).toContain('OUTPUT LANGUAGE')
    expect(prompt).toContain('Portuguese')
    expect(prompt).toContain('Nadia')
    expect(prompt).toContain('Cais Velho')
    expect(prompt).toContain('Harbour Lights')
    // Schema enums must survive.
    expect(prompt).toContain('"status": "blueprint"')
  })
})
