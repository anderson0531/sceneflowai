import { describe, it, expect } from 'vitest'
import {
  buildBeatArcContext,
  formatBeatArcContextLines,
} from '@/lib/vision/beatArcContext'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const SCENE_DESCRIPTION =
  'Piper tumbles out of the pneumatic access tube and lands hard on the gantry floor. ' +
  'Gideon steps from the shadows and levels the brass core at her chest. ' +
  "Piper unfolds Clara's schematics and holds them up between them."

function sceneBeats(count: number): SceneBeat[] {
  return Array.from({ length: count }, (_, i) => ({
    beatId: `b${i + 1}`,
    sequenceIndex: i,
    kind: 'action' as const,
    actionDescription: `Action of beat ${i + 1}`,
    beatDirection: { frozenMoment: `Frozen moment ${i + 1}` },
  }))
}

const scene = {
  sceneDirection: {
    sceneDescription: SCENE_DESCRIPTION,
    talent: {
      blocking: 'Piper low on the deck, Gideon upstage right.',
      emotionalBeat: 'cornered defiance',
      keyActions: ['lands hard', 'raises the core', 'unfolds the schematics'],
    },
  },
}

describe('buildBeatArcContext', () => {
  const beats = sceneBeats(9)

  it('gives a beat only the movement it belongs to', () => {
    expect(buildBeatArcContext(scene, 0, beats).movementSummary).toMatch(/pneumatic access tube/)
    expect(buildBeatArcContext(scene, 4, beats).movementSummary).toMatch(/brass core/)
    expect(buildBeatArcContext(scene, 8, beats).movementSummary).toMatch(/schematics/)
  })

  it('states where the beat sits in its movement and in the scene', () => {
    expect(buildBeatArcContext(scene, 4, beats).movementPosition).toBe(
      'beat 2 of 3 in movement 2 of 3'
    )
  })

  it('anchors the beat to the frames on either side of it', () => {
    const context = buildBeatArcContext(scene, 4, beats)
    expect(context.previousBeatMoment).toBe('Frozen moment 4')
    expect(context.nextBeatMoment).toBe('Frozen moment 6')
  })

  it('has no previous frame for the first beat and no next for the last', () => {
    expect(buildBeatArcContext(scene, 0, beats).previousBeatMoment).toBeUndefined()
    expect(buildBeatArcContext(scene, 8, beats).nextBeatMoment).toBeUndefined()
  })

  it('shows every beat the whole arc, marking the one it owns', () => {
    const context = buildBeatArcContext(scene, 4, beats)
    expect(context.sceneArc).toContain('SCENE ARC')
    expect(context.sceneArc).toMatch(/^> 2\./m)
  })

  it('stops repeating the scene description in staging once an arc exists', () => {
    const staging = buildBeatArcContext(scene, 4, beats).stagingText
    expect(staging).not.toContain('pneumatic access tube')
    expect(staging).toContain('Piper low on the deck')
  })

  it('falls back to whole-scene staging when no arc can be resolved', () => {
    const bare = { sceneDirection: { talent: { blocking: 'Two figures face off.' } } }
    const context = buildBeatArcContext(bare, 0, sceneBeats(3))
    expect(context.movementSummary).toBeUndefined()
    expect(context.sceneArc).toBeUndefined()
    expect(context.stagingText).toContain('Two figures face off.')
  })

  it('returns empty context for a missing scene', () => {
    expect(buildBeatArcContext(null, 0, sceneBeats(3))).toEqual({ stagingText: '' })
  })

  it('truncates an overlong neighbouring moment', () => {
    const long = sceneBeats(4)
    long[0].beatDirection = { frozenMoment: 'x'.repeat(400) }
    const context = buildBeatArcContext(scene, 1, long)
    expect(context.previousBeatMoment!.length).toBeLessThanOrEqual(220)
    expect(context.previousBeatMoment!.endsWith('…')).toBe(true)
  })
})

describe('formatBeatArcContextLines', () => {
  it('leads with the beat’s own moment, then its neighbours, then the arc', () => {
    const lines = formatBeatArcContextLines(buildBeatArcContext(scene, 4, sceneBeats(9)))
    expect(lines[0]).toMatch(/^This beat tells ONE moment of: .*brass core/)
    expect(lines[0]).toContain('(beat 2 of 3 in movement 2 of 3)')
    expect(lines[1]).toMatch(/^Previous frame held: Frozen moment 4/)
    expect(lines[1]).toMatch(/show a different moment\.$/)
    expect(lines[2]).toMatch(/^Next frame will hold: Frozen moment 6/)
    expect(lines[3]).toContain('SCENE ARC')
  })

  it('emits nothing when there is no arc to describe', () => {
    expect(formatBeatArcContextLines({ stagingText: 'just staging' })).toEqual([])
  })
})
