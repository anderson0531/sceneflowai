import { describe, it, expect } from 'vitest'
import {
  detectCharactersInText,
  resolveBeatSpeaker,
} from '@/lib/scene/characterDetection'

const characters = [
  { id: 'c1', name: 'Elara Vance' },
  { id: 'c2', name: 'Marcus Thorne' },
  { id: 'c3', name: 'Dr. Benjamin Reed' },
  { id: 'n1', name: 'Narrator', type: 'narrator' },
]

describe('detectCharactersInText', () => {
  it('detects Elara Vance from action text mentioning first name', () => {
    const text =
      'Elara leans intensely toward a multi-monitor high-tech computer setup'
    const detected = detectCharactersInText(text, characters)
    expect(detected.map((c) => c.name)).toEqual(['Elara Vance'])
  })

  it('does not false-positive on partial name fragments', () => {
    const text = 'They agreed on the plan and moved forward'
    const detected = detectCharactersInText(text, characters)
    expect(detected).toEqual([])
  })

  it('returns empty array for empty action text', () => {
    expect(detectCharactersInText('', characters)).toEqual([])
    expect(detectCharactersInText('   ', characters)).toEqual([])
  })

  it('matches full name and word-boundary name parts', () => {
    const byFullName = detectCharactersInText('Marcus Thorne enters', characters)
    expect(byFullName.map((c) => c.name)).toEqual(['Marcus Thorne'])

    const byLastName = detectCharactersInText('Reed examines the evidence', characters)
    expect(byLastName.map((c) => c.name)).toEqual(['Dr. Benjamin Reed'])
  })

  it('does not match character name embedded in film title AURA\'S ECHO', () => {
    const aura = { id: '1', name: 'Aura' }
    const text =
      "A fully CGI title sequence. The title 'AURA'S ECHO' is revealed in a digital realm."
    const matches = detectCharactersInText(text, [aura], {
      excludeTexts: ["AURA'S ECHO"],
    })
    expect(matches).toHaveLength(0)
  })

  it('still matches character when name appears outside excluded phrase', () => {
    const aura = { id: '1', name: 'Aura' }
    const text = 'Aura enters the neural network tunnel.'
    const matches = detectCharactersInText(text, [aura], {
      excludeTexts: ["AURA'S ECHO"],
    })
    expect(matches).toHaveLength(1)
    expect(matches[0].name).toBe('Aura')
  })
})

describe('resolveBeatSpeaker', () => {
  it('resolves speaker by characterId first', () => {
    const speaker = resolveBeatSpeaker(
      { characterId: 'c1', character: 'WRONG NAME' },
      characters
    )
    expect(speaker?.name).toBe('Elara Vance')
  })

  it('falls back to character name when characterId is missing', () => {
    const speaker = resolveBeatSpeaker({ character: 'Elara Vance' }, characters)
    expect(speaker?.name).toBe('Elara Vance')
  })

  it('skips narrator type when resolving by name', () => {
    const speaker = resolveBeatSpeaker({ character: 'Narrator' }, characters)
    expect(speaker).toBeUndefined()
  })
})
