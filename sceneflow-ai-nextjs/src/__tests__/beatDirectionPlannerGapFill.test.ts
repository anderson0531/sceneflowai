import { describe, expect, it } from 'vitest'
import {
  applyBeatKeyframePlansToScene,
  type BeatKeyframePlan,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const plan: BeatKeyframePlan = {
  beatIndex: 0,
  beatRole: 'action',
  shotType: 'Wide Establishing',
  frozenMoment: 'Elara faces the dormant console.',
  prompt: 'Wide establishing frame of Elara approaching the console.',
  allowTypography: false,
}

describe('applyBeatKeyframePlansToScene persists planner direction', () => {
  it('adds beatDirection when the beat had none, marked as planner-authored', () => {
    const beat: SceneBeat = {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara enters the control room.',
    }
    const scene = { beats: [beat] }
    const updated = applyBeatKeyframePlansToScene(scene, [plan])
    const [nextBeat] = getSceneBeats(updated)
    expect(nextBeat.beatDirection?.shotType).toBe('Wide Establishing')
    expect(nextBeat.beatDirection?.frozenMoment).toBe('Elara faces the dormant console.')
    expect(nextBeat.beatDirection?.generatedBy).toBe('planner')
  })

  it('does not overwrite LLM-authored shotType or frozenMoment', () => {
    const beat: SceneBeat = {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara enters the control room.',
      beatDirection: {
        shotType: 'Custom Insert Shot',
        frozenMoment: 'Custom moment.',
        generatedBy: 'llm',
      },
    }
    const scene = { beats: [beat] }
    const updated = applyBeatKeyframePlansToScene(scene, [plan])
    const [nextBeat] = getSceneBeats(updated)
    expect(nextBeat.beatDirection?.shotType).toBe('Custom Insert Shot')
    expect(nextBeat.beatDirection?.frozenMoment).toBe('Custom moment.')
    expect(nextBeat.beatDirection?.generatedBy).toBe('llm')
  })

  it('does not overwrite user-authored fields', () => {
    const beat: SceneBeat = {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara enters the control room.',
      beatDirection: {
        shotType: 'User Choice Wide',
        generatedBy: 'user',
      },
    }
    const scene = { beats: [beat] }
    const updated = applyBeatKeyframePlansToScene(scene, [plan])
    const [nextBeat] = getSceneBeats(updated)
    expect(nextBeat.beatDirection?.shotType).toBe('User Choice Wide')
    expect(nextBeat.beatDirection?.frozenMoment).toBe('Elara faces the dormant console.')
    expect(nextBeat.beatDirection?.generatedBy).toBe('user')
  })

  it('fills only gaps when direction is derived (planner may extend derived beats)', () => {
    const beat: SceneBeat = {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara enters the control room.',
      beatDirection: {
        emotion: 'wary',
        generatedBy: 'derived',
      },
    }
    const scene = { beats: [beat] }
    const updated = applyBeatKeyframePlansToScene(scene, [plan])
    const [nextBeat] = getSceneBeats(updated)
    expect(nextBeat.beatDirection?.emotion).toBe('wary')
    expect(nextBeat.beatDirection?.shotType).toBe('Wide Establishing')
    expect(nextBeat.beatDirection?.frozenMoment).toBe('Elara faces the dormant console.')
  })

  it('fills lightingAccent from the planner’s per-beat key-light', () => {
    const beat: SceneBeat = {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara enters the control room.',
    }
    const scene = { beats: [beat] }
    const updated = applyBeatKeyframePlansToScene(scene, [
      { ...plan, lighting: 'Console glow from below, no fill' },
    ])
    const [nextBeat] = getSceneBeats(updated)
    expect(nextBeat.beatDirection?.lightingAccent).toBe('Console glow from below, no fill')
  })

  it('leaves the stored still prompt alone — the planner speaks in fields, not prose', () => {
    const beat: SceneBeat = {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara enters the control room.',
      storyboardImagePrompt: 'LAST SENT: Elara in the doorway.',
      storyboardImagePromptDirectionKey: 'whatever-shipped-with-it',
    }
    const scene = { beats: [beat] }
    const [nextBeat] = getSceneBeats(applyBeatKeyframePlansToScene(scene, [plan]))

    // Writing plan.prompt here stamped a hallucinated sentence as a current,
    // direction-keyed prompt before any frame existed to justify it.
    expect(nextBeat.storyboardImagePrompt).toBe('LAST SENT: Elara in the doorway.')
    expect(nextBeat.storyboardImagePromptDirectionKey).toBe('whatever-shipped-with-it')
  })

  it('does not overwrite an authored lightingAccent', () => {
    const beat: SceneBeat = {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara enters the control room.',
      beatDirection: {
        lightingAccent: 'Hard practical from the doorway',
        generatedBy: 'llm',
      },
    }
    const scene = { beats: [beat] }
    const updated = applyBeatKeyframePlansToScene(scene, [
      { ...plan, lighting: 'Console glow from below, no fill' },
    ])
    const [nextBeat] = getSceneBeats(updated)
    expect(nextBeat.beatDirection?.lightingAccent).toBe('Hard practical from the doorway')
    expect(nextBeat.beatDirection?.generatedBy).toBe('llm')
  })
})
