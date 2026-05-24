import { describe, it, expect } from 'vitest'
import {
  flatSceneToBeats,
  beatsToLegacyFields,
  normalizeBeatsForProduction,
  isStoryboardApproved,
  ensureSceneBeats,
} from '@/lib/script/beatMigration'
import { VEO_DIALOGUE_CLIP_MAX_SEC } from '@/lib/scene/dialogueSegmentSplit'

describe('beatMigration', () => {
  it('flatSceneToBeats creates action, narration, and dialogue beats', () => {
    const scene = {
      action: 'INT. WAREHOUSE - NIGHT',
      imageUrl: 'https://example.com/establishing.jpg',
      narration: 'Something is wrong.',
      dialogue: [{ character: 'Sarah', line: 'We need to leave.' }],
    }
    const beats = flatSceneToBeats(scene)
    expect(beats.length).toBeGreaterThanOrEqual(3)
    expect(beats[0].kind).toBe('action')
    expect(beats.some((b) => b.kind === 'narration')).toBe(true)
    expect(beats.some((b) => b.kind === 'dialogue')).toBe(true)
  })

  it('beatsToLegacyFields syncs dialogue and narration', () => {
    const beats = normalizeBeatsForProduction([
      {
        beatId: 'bt_a',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Wide shot',
      },
      {
        beatId: 'bt_b',
        sequenceIndex: 1,
        kind: 'narration',
        character: 'NARRATOR',
        line: 'Voiceover line.',
        lineId: 'ln_1',
      },
      {
        beatId: 'bt_c',
        sequenceIndex: 2,
        kind: 'dialogue',
        character: 'BOB',
        line: 'Hello.',
        lineId: 'ln_2',
      },
    ])
    const legacy = beatsToLegacyFields(beats)
    expect(legacy.narration).toBe('Voiceover line.')
    expect(legacy.dialogue).toHaveLength(2)
    expect(legacy.action).toContain('Wide shot')
  })

  it('normalizeBeatsForProduction flags long dialogue for split', () => {
    const longLine =
      'This is a very long line that should exceed the spoken duration budget when read aloud at a natural pace. '.repeat(
        4
      )
    const beats = normalizeBeatsForProduction([
      {
        beatId: 'bt_long',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Sarah',
        line: longLine,
        lineId: 'ln_long',
      },
    ])
    expect(beats[0].needsSplit).toBe(true)
    expect(beats[0].splitRecommendation?.partCount).toBeGreaterThan(1)
    expect(beats[0].splitRecommendation?.excerpts.length).toBeGreaterThan(1)
    for (const excerpt of beats[0].splitRecommendation?.excerpts ?? []) {
      expect(excerpt.length).toBeGreaterThan(0)
    }
    expect(VEO_DIALOGUE_CLIP_MAX_SEC).toBeGreaterThan(0)
  })

  it('isStoryboardApproved returns true only when status is approved', () => {
    expect(isStoryboardApproved({ storyboardStatus: 'approved' })).toBe(true)
    expect(isStoryboardApproved({ storyboardStatus: 'pending_review' })).toBe(false)
    expect(isStoryboardApproved({})).toBe(false)
  })

  it('ensureSceneBeats preserves LLM beats with kind field', () => {
    const scene = {
      beats: [
        { kind: 'action', actionDescription: 'Cut to close-up' },
        { kind: 'dialogue', character: 'ALICE', line: 'Run!' },
      ],
    }
    const updated = ensureSceneBeats(scene)
    const beats = updated.beats as Array<{ kind: string }>
    expect(beats).toHaveLength(2)
    expect(beats[0].kind).toBe('action')
    expect(Array.isArray(updated.dialogue)).toBe(true)
  })
})
