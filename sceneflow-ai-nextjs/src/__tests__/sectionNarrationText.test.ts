import { describe, it, expect } from 'vitest'
import {
  buildBlueprintSectionNarrationText,
  chunkNarrationText,
  hashSectionNarrationText,
  getAllSectionNarrationTexts,
} from '@/lib/blueprint/sectionNarrationText'

const fixture: Record<string, unknown> = {
  title: 'Midnight Run',
  logline: 'A courier races dawn to save a city.',
  genre: 'Thriller',
  format_length: 'Feature, 90 min',
  synopsis: 'Every hour the grid fails further.',
  protagonist: 'Alex Chen',
  antagonist: 'The Syndicate',
  setting: 'Neo-Tokyo',
  beats: [
    { title: 'Opening', synopsis: 'Alex discovers the first blackout.', minutes: 8 },
    { title: 'Midpoint', synopsis: 'Betrayal at the hub.', minutes: 12 },
  ],
  character_descriptions: [
    { name: 'Alex', role: 'Protagonist', description: 'Ex-military courier.' },
  ],
  tone: 'Tense',
  themes: ['survival', 'trust'],
}

describe('buildBlueprintSectionNarrationText', () => {
  it('uses factual field labels for core section', () => {
    const core = buildBlueprintSectionNarrationText(fixture, 'core')
    expect(core).toContain('Title: Midnight Run')
    expect(core).toContain('Logline:')
    expect(core).not.toContain('Let me pull you into this story')
  })

  it('builds story section with synopsis and setting', () => {
    const text = buildBlueprintSectionNarrationText(fixture, 'story')
    expect(text).toContain('Synopsis:')
    expect(text).toContain('Alex Chen')
    expect(text).toContain('Neo-Tokyo')
  })

  it('builds numbered beats list', () => {
    const text = buildBlueprintSectionNarrationText(fixture, 'beats')
    expect(text).toContain('1. Opening')
    expect(text).toContain('2. Midpoint')
  })

  it('builds characters section', () => {
    const text = buildBlueprintSectionNarrationText(fixture, 'characters')
    expect(text).toContain('Alex')
    expect(text).toContain('Protagonist')
  })

  it('returns empty for missing beats', () => {
    expect(buildBlueprintSectionNarrationText({ title: 'X' }, 'beats')).toBe('')
  })

  it('getAllSectionNarrationTexts skips empty sections', () => {
    const all = getAllSectionNarrationTexts({ title: 'Only' })
    expect(all.core).toBeTruthy()
    expect(all.beats).toBeUndefined()
  })
})

describe('chunkNarrationText', () => {
  it('returns single chunk for short text', () => {
    expect(chunkNarrationText('hello')).toEqual(['hello'])
  })

  it('splits long text', () => {
    const long = 'a'.repeat(2500)
    const chunks = chunkNarrationText(long, 1200)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join('').length).toBe(2500)
  })

  it('prefers sentence boundaries when possible', () => {
    const text =
      'Title: Midnight Run. ' +
      'Logline: A courier races dawn. '.repeat(80) +
      'The end.'
    const chunks = chunkNarrationText(text, 400)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((c) => {
      expect(c.endsWith('.') || c.length <= 400).toBe(true)
    })
  })
})

describe('hashSectionNarrationText', () => {
  it('is stable for same input', () => {
    expect(hashSectionNarrationText('foo')).toBe(hashSectionNarrationText('foo'))
    expect(hashSectionNarrationText('foo')).not.toBe(hashSectionNarrationText('bar'))
  })
})
