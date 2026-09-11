/**
 * Beat reorder: the beat's own media travels with its id, and everything keyed
 * by position — sequenceIndex, the legacy dialogue mirror, movementIndex, and
 * music cue coverage — is reconciled to the new running order.
 */

import { describe, expect, it } from 'vitest'
import {
  findBrokenContinuityBeats,
  getSceneBeats,
  reorderSceneBeats,
} from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

function baseBeats(): SceneBeat[] {
  return [
    {
      beatId: 'bt_a1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Rain hammers the empty alley.',
      storyboardImageUrl: 'https://cdn.test/a1.png',
    },
    {
      beatId: 'bt_a2',
      sequenceIndex: 1,
      kind: 'dialogue',
      character: 'MAYA',
      line: 'We should not be here.',
      lineId: 'ln_a2',
      storyboardImageUrl: 'https://cdn.test/a2.png',
      audioUrl: 'https://cdn.test/a2.mp3',
      durationSeconds: 3,
    },
    {
      beatId: 'bt_a3',
      sequenceIndex: 2,
      kind: 'dialogue',
      character: 'DEV',
      line: 'Then leave.',
      lineId: 'ln_a3',
      storyboardImageUrl: 'https://cdn.test/a3.png',
      audioUrl: 'https://cdn.test/a3.mp3',
      durationSeconds: 2,
    },
    {
      beatId: 'bt_a4',
      sequenceIndex: 3,
      kind: 'action',
      actionDescription: 'A steel door slams shut behind them.',
      storyboardImageUrl: 'https://cdn.test/a4.png',
    },
  ]
}

function baseScene(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'sc_1',
    heading: 'EXT. RAINY ALLEY - NIGHT',
    storyboardStatus: 'approved',
    beats: baseBeats(),
    ...overrides,
  }
}

/** Two movements, the first over beats 0-1 and the second over beats 2-3. */
function movements() {
  return [
    {
      index: 0,
      summary: 'Two figures take shelter from the downpour.',
      beatStart: 0,
      beatEnd: 1,
      generatedBy: 'llm' as const,
    },
    {
      index: 1,
      summary: 'The argument turns and the way out closes.',
      beatStart: 2,
      beatEnd: 3,
      generatedBy: 'llm' as const,
    },
  ]
}

/** One scored cue over beats 0-1, with the flags a fresh apply would leave. */
function scoredScene(): Record<string, unknown> {
  const beats = baseBeats().map((beat, index) => ({
    ...beat,
    musicEnabled: index <= 1,
  }))
  return baseScene({
    beats,
    sceneMusicCues: [
      {
        cueId: 'cue-0-1',
        beatStart: 0,
        beatEnd: 1,
        description: 'Ambient electronic score, uneasy mood, slow tempo',
        intent: 'unease the audience cannot place',
        url: 'https://cdn.test/unease.mp3',
        generatedBy: 'derived',
      },
    ],
    musicCueCoverage: '0-1',
  })
}

function ids(scene: Record<string, unknown>): string[] {
  return getSceneBeats(scene).map((beat) => beat.beatId)
}

describe('reorderSceneBeats', () => {
  it('moves the beat and renumbers the beats around it', () => {
    const next = reorderSceneBeats(baseScene(), 3, 1)
    const beats = getSceneBeats(next)

    expect(beats.map((beat) => beat.beatId)).toEqual(['bt_a1', 'bt_a4', 'bt_a2', 'bt_a3'])
    expect(beats.map((beat) => beat.sequenceIndex)).toEqual([0, 1, 2, 3])
  })

  it('carries the moved beat frames and audio with it', () => {
    const next = reorderSceneBeats(baseScene(), 1, 3)
    const moved = getSceneBeats(next).find((beat) => beat.beatId === 'bt_a2')

    expect(moved?.sequenceIndex).toBe(3)
    expect(moved?.storyboardImageUrl).toBe('https://cdn.test/a2.png')
    expect(moved?.audioUrl).toBe('https://cdn.test/a2.mp3')
  })

  it('rewrites the legacy dialogue mirror in the new order', () => {
    const next = reorderSceneBeats(baseScene(), 2, 1)
    const dialogue = next.dialogue as Array<Record<string, unknown>>

    expect(dialogue.map((line) => line.lineId)).toEqual(['ln_a3', 'ln_a2'])
    expect(next.action).toBe(
      'Rain hammers the empty alley.\n\nA steel door slams shut behind them.'
    )
  })

  it('survives a second move once the legacy mirror has been rewritten', () => {
    const once = reorderSceneBeats(baseScene(), 3, 0)
    const twice = reorderSceneBeats(once, 3, 1)

    expect(ids(twice)).toEqual(['bt_a4', 'bt_a3', 'bt_a1', 'bt_a2'])
    const moved = getSceneBeats(twice).find((beat) => beat.beatId === 'bt_a3')
    expect(moved?.audioUrl).toBe('https://cdn.test/a3.mp3')
  })

  it('leaves the scene untouched for a no-op or out-of-range move', () => {
    const scene = baseScene()
    expect(reorderSceneBeats(scene, 2, 2)).toBe(scene)
    expect(reorderSceneBeats(scene, -1, 0)).toBe(scene)
    expect(reorderSceneBeats(scene, 0, 9)).toBe(scene)
    expect(reorderSceneBeats(scene, 1.5, 0)).toBe(scene)
  })

  it('retags movementIndex from each beat new position', () => {
    const next = reorderSceneBeats(baseScene({ sceneMovements: movements() }), 3, 0)
    const beats = getSceneBeats(next)

    expect(beats.map((beat) => beat.beatId)).toEqual(['bt_a4', 'bt_a1', 'bt_a2', 'bt_a3'])
    expect(beats.map((beat) => beat.movementIndex)).toEqual([0, 0, 1, 1])
  })

  it('keeps the authored movement ranges where they are', () => {
    const next = reorderSceneBeats(baseScene({ sceneMovements: movements() }), 0, 3)

    expect(next.sceneMovements).toEqual(movements())
  })

  it('switches music on for a beat dragged into a scored stretch', () => {
    const next = reorderSceneBeats(scoredScene(), 3, 0)
    const enabled = getSceneBeats(next).map((beat) => [beat.beatId, beat.musicEnabled])

    expect(enabled).toEqual([
      ['bt_a4', true],
      ['bt_a1', true],
      ['bt_a2', false],
      ['bt_a3', false],
    ])
  })

  it('keeps a per-beat music override when the move crosses no cue boundary', () => {
    const scene = scoredScene()
    const beats = (scene.beats as SceneBeat[]).map((beat) =>
      beat.beatId === 'bt_a1' ? { ...beat, musicEnabled: false } : beat
    )

    // bt_a3 and bt_a4 swap, and both sit outside the cue either way.
    const next = reorderSceneBeats({ ...scene, beats }, 2, 3)
    const enabled = getSceneBeats(next).map((beat) => [beat.beatId, beat.musicEnabled])

    expect(enabled).toEqual([
      ['bt_a1', false],
      ['bt_a2', true],
      ['bt_a4', false],
      ['bt_a3', false],
    ])
  })

  it('leaves music flags alone on a scene with no cues', () => {
    const beats = baseBeats().map((beat) => ({ ...beat, musicEnabled: true }))
    const next = reorderSceneBeats(baseScene({ beats }), 0, 3)

    expect(getSceneBeats(next).every((beat) => beat.musicEnabled === true)).toBe(true)
  })
})

describe('findBrokenContinuityBeats', () => {
  function withTransition(beats: SceneBeat[], beatId: string): SceneBeat[] {
    return beats.map((beat) =>
      beat.beatId === beatId
        ? { ...beat, beatDirection: { transition: 'CONTINUE' as const } }
        : beat
    )
  }

  it('flags a CONTINUE beat whose predecessor changed', () => {
    // bt_a2 moves to the end, so bt_a3 now continues from bt_a1 instead.
    const before = withTransition(baseBeats(), 'bt_a3')
    const after = reorderSceneBeats(baseScene({ beats: before }), 1, 3)

    expect(findBrokenContinuityBeats(before, getSceneBeats(after))).toEqual(['bt_a3'])
  })

  it('does not flag a CONTINUE beat that kept its predecessor', () => {
    // bt_a4 moves above bt_a3, leaving bt_a2 still directly below bt_a1.
    const before = withTransition(baseBeats(), 'bt_a2')
    const after = reorderSceneBeats(baseScene({ beats: before }), 3, 2)

    expect(findBrokenContinuityBeats(before, getSceneBeats(after))).toEqual([])
  })

  it('flags a CONTINUE beat that was itself dragged away from its predecessor', () => {
    const before = withTransition(baseBeats(), 'bt_a2')
    const after = reorderSceneBeats(baseScene({ beats: before }), 1, 2)

    expect(findBrokenContinuityBeats(before, getSceneBeats(after))).toEqual(['bt_a2'])
  })

  it('flags a CONTINUE beat moved to the top, where there is nothing to continue from', () => {
    const before = withTransition(baseBeats(), 'bt_a4')
    const after = reorderSceneBeats(baseScene({ beats: before }), 3, 0)

    expect(findBrokenContinuityBeats(before, getSceneBeats(after))).toEqual(['bt_a4'])
  })

  it('ignores beats with any other transition', () => {
    const before = baseBeats().map((beat) =>
      beat.beatId === 'bt_a3'
        ? { ...beat, beatDirection: { transition: 'DISSOLVE' as const } }
        : beat
    )
    const after = reorderSceneBeats(baseScene({ beats: before }), 3, 1)

    expect(findBrokenContinuityBeats(before, getSceneBeats(after))).toEqual([])
  })
})
