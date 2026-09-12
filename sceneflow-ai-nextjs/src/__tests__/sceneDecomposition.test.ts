import { describe, expect, it } from 'vitest'
import {
  findSceneSplitIndex,
  getBlueprintBeatGroup,
  formatDecompositionPromptBlock,
  planSceneDecomposition,
  splitOversizedScenes,
  MAX_BEATS_PER_SCENE,
  TARGET_BEATS_PER_SCENE,
  AVG_BEAT_SECONDS,
} from '@/lib/script/sceneDecomposition'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const FARADAY_BEATS = [
  { title: 'Intro & Objectives: Subterranean Isolation', minutes: 10.5 },
  { title: 'Module 1: Unlocking the Faraday Protocol', minutes: 11.0 },
  { title: 'Module 2: The Claustrophobic Counter-Offensive', minutes: 12.0 },
  { title: 'Recap & Assessment: The Aether Broadcast', minutes: 8.5 },
]

describe('planSceneDecomposition', () => {
  it('derives scene counts from the per-scene target, not the ceiling', () => {
    const plan = planSceneDecomposition(FARADAY_BEATS)
    const expected = FARADAY_BEATS.map((beat) => {
      const targetBeats = Math.max(1, Math.round((beat.minutes * 60) / AVG_BEAT_SECONDS))
      return Math.max(1, Math.ceil(targetBeats / TARGET_BEATS_PER_SCENE))
    })
    expect(plan.entries.map((e) => e.targetScenes)).toEqual(expected)
    expect(plan.totalTargetScenes).toBe(expected.reduce((sum, n) => sum + n, 0))
    expect(TARGET_BEATS_PER_SCENE).toBeLessThan(MAX_BEATS_PER_SCENE)
  })

  it('tells the model both the target and the ceiling', () => {
    const plan = planSceneDecomposition(FARADAY_BEATS)
    const block = formatDecompositionPromptBlock(plan)
    expect(block).toContain(`at most ${MAX_BEATS_PER_SCENE} beats`)
    expect(block).toContain(`~${TARGET_BEATS_PER_SCENE} beats per scene`)
  })

  it('derives beat counts from minutes at ~8s per beat', () => {
    const plan = planSceneDecomposition(FARADAY_BEATS)
    expect(plan.entries[0].targetBeats).toBe(Math.round((10.5 * 60) / AVG_BEAT_SECONDS))
    expect(plan.entries[1].targetBeats).toBe(Math.round((11.0 * 60) / AVG_BEAT_SECONDS))
  })
})

function makeBeat(kind: SceneBeat['kind'], index: number): SceneBeat {
  return {
    beatId: `beat-${index}`,
    sequenceIndex: index,
    kind,
    ...(kind === 'action'
      ? { actionDescription: `Action beat ${index}` }
      : { character: 'GIDEON', line: `[calm] Line ${index}` }),
    durationSeconds: 8,
  }
}

describe('splitOversizedScenes', () => {
  it('splits a 66-beat scene into scenes each at or under the ceiling', () => {
    const beats: SceneBeat[] = []
    for (let i = 0; i < 66; i++) {
      // Alternate dialogue/action so splits can land on action boundaries
      beats.push(makeBeat(i % 3 === 0 ? 'action' : 'dialogue', i))
    }

    const scene = {
      id: 'scene-1',
      sceneId: 'scene-1',
      heading: 'INT. BUNKER - NIGHT',
      blueprintBeatIndex: 1,
      blueprintBeatTitle: 'Module 1',
      beats,
      duration: 66 * 8,
    }

    const { scenes, splitCount } = splitOversizedScenes([scene])
    expect(scenes.length).toBe(Math.ceil(66 / MAX_BEATS_PER_SCENE))
    expect(splitCount).toBeGreaterThan(0)

    for (const s of scenes) {
      const sceneBeats = (s as { beats?: SceneBeat[] }).beats ?? []
      expect(sceneBeats.length).toBeLessThanOrEqual(MAX_BEATS_PER_SCENE)
    }

    const totalBeats = scenes.reduce(
      (sum, s) => sum + ((s as { beats?: SceneBeat[] }).beats?.length ?? 0),
      0
    )
    expect(totalBeats).toBe(66)

    const totalDuration = scenes.reduce(
      (sum, s) => sum + (typeof s.duration === 'number' ? s.duration : 0),
      0
    )
    expect(totalDuration).toBe(66 * 8)
  })

  it('does not split mid-dialogue when an action beat is nearby', () => {
    const beats: SceneBeat[] = [
      makeBeat('dialogue', 0),
      makeBeat('dialogue', 1),
      makeBeat('action', 2),
      makeBeat('dialogue', 3),
    ]
    // With max 3, target split at index 3; should prefer split after action at index 2
    const splitAt = findSceneSplitIndex(beats, 0, 3)
    expect(splitAt).toBe(3)
    expect(beats[splitAt - 1].kind).toBe('action')
  })
})

describe('getBlueprintBeatGroup', () => {
  it('groups scenes by blueprintBeatIndex', () => {
    const scenes = [
      { blueprintBeatIndex: 0, blueprintBeatTitle: 'Intro' },
      { blueprintBeatIndex: 0, blueprintBeatTitle: 'Intro' },
      { blueprintBeatIndex: 1, blueprintBeatTitle: 'Module 1' },
    ]
    const group = getBlueprintBeatGroup(scenes, 1)
    expect(group).not.toBeNull()
    expect(group!.beatTitle).toBe('Intro')
    expect(group!.sceneIndices).toEqual([0, 1])
    expect(group!.positionInGroup).toBe(2)
  })
})

describe('cap versus target', () => {
  it('lets a scene grow to the ceiling without splitting, while planning never aims above the target', () => {
    const atCeiling: SceneBeat[] = []
    for (let i = 0; i < MAX_BEATS_PER_SCENE; i++) {
      atCeiling.push(makeBeat(i % 2 === 0 ? 'action' : 'dialogue', i))
    }
    const { scenes, splitCount } = splitOversizedScenes([
      { heading: 'INT. LAB - NIGHT', beats: atCeiling },
    ])
    expect(splitCount).toBe(0)
    expect(scenes).toHaveLength(1)
    expect((scenes[0] as { beats: SceneBeat[] }).beats).toHaveLength(MAX_BEATS_PER_SCENE)

    const justOver = [...atCeiling, makeBeat('action', MAX_BEATS_PER_SCENE)]
    const oversized = splitOversizedScenes([{ heading: 'INT. LAB - NIGHT', beats: justOver }])
    expect(oversized.splitCount).toBeGreaterThan(0)
    expect(oversized.scenes.length).toBeGreaterThan(1)

    const plan = planSceneDecomposition([{ title: 'A long beat', minutes: 20 }])
    const beatsPerScene = plan.entries[0].targetBeats / plan.entries[0].targetScenes
    expect(beatsPerScene).toBeLessThanOrEqual(TARGET_BEATS_PER_SCENE)
  })
})
