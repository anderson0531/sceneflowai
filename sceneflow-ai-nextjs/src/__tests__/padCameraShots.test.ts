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
})
