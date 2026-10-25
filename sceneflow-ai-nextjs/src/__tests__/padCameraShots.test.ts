import { describe, expect, it } from 'vitest'
import {
  applyDirectionCoverageToBeats,
  deriveBeatDirection,
} from '@/lib/script/beatDirectionDerive'
import type { SceneBeat } from '@/lib/script/segmentTypes'

describe('deriveBeatDirection shot coverage', () => {
  it('does not cycle a short camera.shots list onto later beats', () => {
    const beat: SceneBeat = {
      beatId: 'bt_3',
      sequenceIndex: 2,
      kind: 'dialogue',
      character: 'Gideon',
      line: 'Hold still in this close-up.',
    }
    const direction = deriveBeatDirection(beat, 2, {
      sceneDirection: { camera: { shots: ['Wide Shot'] } },
    })
    expect(direction?.shotType).toMatch(/close/i)
  })
})

describe('applyDirectionCoverageToBeats', () => {
  it('replaces a recycled derived scale and leaves a user scale', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'He looks at the photograph.',
        beatDirection: { shotType: 'Wide Shot', generatedBy: 'derived' },
      },
      {
        beatId: 'bt_2',
        sequenceIndex: 1,
        kind: 'action',
        actionDescription: 'The photograph fills the frame.',
        beatDirection: { shotType: 'Wide Shot', generatedBy: 'user' },
      },
    ]
    const next = applyDirectionCoverageToBeats(
      {
        sceneDirection: {
          beatCoverage: [
            {
              coveragePurpose: 'pay off the photograph',
              lensEnergy: 'lock-off',
              spatialRelationship: 'photograph beside his cheek',
            },
            {
              coveragePurpose: 'should not replace the user',
              lensEnergy: 'push-in',
              spatialRelationship: 'face only',
            },
          ],
        },
      },
      beats
    )
    expect(next[0].beatDirection?.coveragePurpose).toBe('pay off the photograph')
    expect(next[0].beatDirection?.shotType).toBeUndefined()
    expect(next[1].beatDirection?.shotType).toBe('Wide Shot')
    expect(next[1].beatDirection?.coveragePurpose).toBeUndefined()
  })

  it('preserves LLM shotType when beatCoverage omits shotType and applies rich per-beat direction fields', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Gideon',
        line: 'Open the ledger.',
        beatDirection: {
          shotType: 'Medium Two-Shot',
          frozenMoment: 'Gideon taps the table.',
          generatedBy: 'llm',
        },
      },
      {
        beatId: 'bt_2',
        sequenceIndex: 1,
        kind: 'action',
        actionDescription: 'Piper slides the brass key into her pocket.',
        beatDirection: {
          shotType: 'Medium Shot',
          generatedBy: 'llm',
        },
      },
    ]
    const next = applyDirectionCoverageToBeats(
      {
        sceneDirection: {
          beatCoverage: [
            {
              coveragePurpose: 'establish table tension',
              lensEnergy: 'lock-off',
              spatialRelationship: 'Gideon screen-left, Piper screen-right',
              cameraAngle: 'Eye-level',
              blocking: 'Gideon leans across the oak table toward Piper',
              gaze: 'locked on Piper',
              emotion: 'controlled menace',
            },
            {
              coveragePurpose: 'reveal hidden key',
              lensEnergy: 'push-in',
              spatialRelationship: 'Piper hand in foreground, Gideon blurred in background',
              shotType: 'Insert',
              cameraAngle: 'High Angle',
              cameraMovement: 'Slow push-in',
              frozenMoment: 'Piper thumb presses the brass key into her coat pocket',
              lightingAccent: 'Warm amber glint on brass key',
            },
          ],
        },
      },
      beats
    )
    expect(next[0].beatDirection?.shotType).toBe('Medium Two-Shot')
    expect(next[0].beatDirection?.cameraAngle).toBe('Eye-level')
    expect(next[0].beatDirection?.blocking).toBe('Gideon leans across the oak table toward Piper')
    expect(next[0].beatDirection?.gaze).toBe('locked on Piper')
    expect(next[0].beatDirection?.emotion).toBe('controlled menace')

    expect(next[1].beatDirection?.shotType).toBe('Insert')
    expect(next[1].beatDirection?.cameraAngle).toBe('High Angle')
    expect(next[1].beatDirection?.cameraMovement).toBe('Slow push-in')
    expect(next[1].beatDirection?.frozenMoment).toBe(
      'Piper thumb presses the brass key into her coat pocket'
    )
    expect(next[1].beatDirection?.lightingAccent).toBe('Warm amber glint on brass key')
  })
})
