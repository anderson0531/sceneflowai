import { describe, expect, it } from 'vitest'
import {
  findSceneSplitIndex,
  getBlueprintBeatGroup,
  planSceneDecomposition,
  splitOversizedScenes,
  MAX_BEATS_PER_SCENE,
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
  it('plans 6/6/6/5 scenes for the 42-minute four-beat outline', () => {
    const plan = planSceneDecomposition(FARADAY_BEATS)
    expect(plan.entries.map((e) => e.targetScenes)).toEqual([6, 6, 6, 5])
    expect(plan.totalTargetScenes).toBe(23)
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
  it('splits a 66-beat scene into 5 scenes each at or under 15 beats', () => {
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
    expect(scenes.length).toBe(5)
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
