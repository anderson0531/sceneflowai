import { describe, it, expect } from 'vitest'
import {
  dedupeRedundantActionBeats,
  findRedundantActionBeatIndices,
  isRedundantActionDescription,
} from '@/lib/script/actionBeatDedupe'
import type { SceneBeat } from '@/lib/script/segmentTypes'

describe('actionBeatDedupe', () => {
  it('flags action that restates adjacent dialogue staging', () => {
    expect(
      isRedundantActionDescription(
        'Close-up: Piper clenches her bruised trembling hands',
        'PIPER [scared] Look at my bruised trembling hands'
      )
    ).toBe(true)
  })

  it('keeps distinct insert/cutaway action next to dialogue', () => {
    expect(
      isRedundantActionDescription(
        'Insert: cracked phone screen flashing unanswered calls on the desk',
        'PIPER [scared] I cannot go back there tonight.'
      )
    ).toBe(false)
  })

  it('drops clone action between dialogue, keeps distinct reaction insert', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'd1',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'PIPER',
        line: '[scared] My hands are still bruised and trembling.',
      },
      {
        beatId: 'a-clone',
        sequenceIndex: 1,
        kind: 'action',
        actionDescription: 'Piper shows her bruised trembling hands',
      },
      {
        beatId: 'd2',
        sequenceIndex: 2,
        kind: 'dialogue',
        character: 'PIPER',
        line: '[angry] I will not hide this anymore.',
      },
      {
        beatId: 'a-insert',
        sequenceIndex: 3,
        kind: 'action',
        actionDescription: 'Insert: bloodied bandage on the bathroom counter under harsh light',
      },
    ]

    const redundant = findRedundantActionBeatIndices(beats)
    expect(redundant).toContain(1)
    expect(redundant).not.toContain(3)

    const cleaned = dedupeRedundantActionBeats(beats)
    expect(cleaned.map((b) => b.beatId)).toEqual(['d1', 'd2', 'a-insert'])
  })
})
