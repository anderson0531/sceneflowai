import { describe, it, expect } from 'vitest'
import { isNarratorBeat } from '@/lib/script/beatMigration'
import { NARRATOR_CHARACTER, NARRATOR_CHARACTER_ID } from '@/lib/script/segmentTypes'

describe('isNarratorBeat', () => {
  it('returns true for narration kind', () => {
    expect(
      isNarratorBeat({
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'narration',
        character: NARRATOR_CHARACTER,
        line: 'Voiceover text',
      })
    ).toBe(true)
  })

  it('returns true for narrator characterId', () => {
    expect(
      isNarratorBeat({
        beatId: 'bt_2',
        sequenceIndex: 0,
        kind: 'dialogue',
        characterId: NARRATOR_CHARACTER_ID,
        line: 'Voiceover',
      })
    ).toBe(true)
  })

  it('returns false for regular dialogue', () => {
    expect(
      isNarratorBeat({
        beatId: 'bt_3',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Sarah',
        line: '[calm] Hello.',
      })
    ).toBe(false)
  })

  it('returns false for action beats', () => {
    expect(
      isNarratorBeat({
        beatId: 'bt_4',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Wide shot of the city.',
      })
    ).toBe(false)
  })
})
