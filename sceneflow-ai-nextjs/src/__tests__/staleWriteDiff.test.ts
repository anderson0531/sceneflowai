import { describe, it, expect } from 'vitest'
import { describeStaleScriptWrite } from '@/lib/storyboard/staleWriteDiff'

const DIRECTION = {
  shotType: 'medium',
  cameraAngle: 'low angle',
  castInFrame: ['DR. CHEN'],
}

function beat(overrides: Record<string, unknown> = {}) {
  return {
    beatId: 'bt_1',
    kind: 'action',
    actionDescription: 'A scientist tilts the glowing sample toward the light.',
    beatDirection: DIRECTION,
    ...overrides,
  }
}

describe('describeStaleScriptWrite', () => {
  it('names the beats a rejected write would have changed', () => {
    const existing = [
      {
        action: 'Same prose.',
        beats: [
          beat({ storyboardImagePrompt: 'Fresh prompt' }),
          { ...beat({ beatId: 'bt_2' }), storyboardImagePrompt: 'Untouched' },
        ],
      },
    ]
    const incoming = [
      {
        action: 'Same prose.',
        beats: [
          beat({ storyboardImagePrompt: 'Stale prompt' }),
          { ...beat({ beatId: 'bt_2' }), storyboardImagePrompt: 'Untouched' },
        ],
      },
    ]

    const diff = describeStaleScriptWrite(existing, incoming)

    expect(diff.scenesChanged).toBe(1)
    expect(diff.beatsChanged).toBe(1)
    expect(diff.promptsChanged).toBe(1)
    expect(diff.scenes[0]).toEqual({
      sceneIndex: 0,
      beats: [{ beatId: 'bt_1', changed: ['prompt'] }],
    })
  })

  it('reports scene prose separately from its beats', () => {
    const diff = describeStaleScriptWrite(
      [{ action: 'Original prose.', beats: [beat()] }],
      [{ action: 'Edited prose.', beats: [beat()] }]
    )

    expect(diff.scenes[0].sceneFieldsChanged).toEqual(['action'])
    expect(diff.scenes[0].beats).toEqual([])
  })

  it('matches beats by id so a reorder is not reported as a rewrite', () => {
    const a = beat({ beatId: 'bt_1', storyboardImagePrompt: 'One' })
    const b = {
      ...beat({ beatId: 'bt_2', storyboardImagePrompt: 'Two' }),
      actionDescription: 'Something else entirely.',
    }

    const diff = describeStaleScriptWrite(
      [{ action: 'Same.', beats: [a, b] }],
      [{ action: 'Same.', beats: [b, a] }]
    )

    expect(diff.beatsChanged).toBe(0)
    expect(diff.scenesChanged).toBe(0)
  })

  it('caps the report rather than logging a line nobody will read', () => {
    const scenes = (prompt: string) =>
      Array.from({ length: 30 }, (_, i) => ({
        action: 'Same.',
        beats: Array.from({ length: 20 }, (_, j) => ({
          ...beat({ beatId: `s${i}-b${j}` }),
          storyboardImagePrompt: `${prompt}-${i}-${j}`,
        })),
      }))

    const diff = describeStaleScriptWrite(scenes('existing'), scenes('incoming'))

    expect(diff.scenesChanged).toBe(30)
    expect(diff.beatsChanged).toBe(600)
    expect(diff.scenes).toHaveLength(8)
    expect(diff.scenesOmitted).toBe(22)
    expect(diff.scenes[0].beats).toHaveLength(6)
    expect(diff.scenes[0].beatsOmitted).toBe(14)
  })

  it('reports nothing when the rejected write changed nothing', () => {
    const scenes = [{ action: 'Same.', beats: [beat()] }]
    const diff = describeStaleScriptWrite(scenes, scenes)

    expect(diff).toEqual({
      sceneCount: 1,
      scenesChanged: 0,
      beatsChanged: 0,
      promptsChanged: 0,
      scenes: [],
    })
  })
})
