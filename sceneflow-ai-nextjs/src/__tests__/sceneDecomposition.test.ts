import { describe, expect, it } from 'vitest'
import {
  findSceneSplitIndex,
  getBlueprintBeatGroup,
  getNeighboringChapterSceneIndices,
  chapterHeading,
  formatDecompositionPromptBlock,
  planSceneDecomposition,
  resolveChapterBeatLine,
  replaceSceneWithSplit,
  splitOversizedScenes,
  splitRevisedScene,
  treatmentBeatsFromMetadata,
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
    expect(block).toContain(`${MAX_BEATS_PER_SCENE} beats`)
    expect(block).toContain(`~${TARGET_BEATS_PER_SCENE} beats per scene`)
    expect(block).toMatch(/creatively unbound/i)
    expect(block).not.toContain(`at most ${MAX_BEATS_PER_SCENE} beats`)
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

describe('split continuity', () => {
  it('carries cast, location, time of day, and environment onto the next scene', () => {
    const beats: SceneBeat[] = []
    for (let i = 0; i < 40; i++) {
      beats.push({
        ...makeBeat(i < 20 || i >= 28 ? 'action' : 'dialogue', i),
        movementIndex: i < 20 ? 0 : 1,
      })
    }

    const scene = {
      id: 'scene-1',
      sceneId: 'scene-1',
      heading: 'INT. BUNKER - NIGHT',
      characters: ['Piper', 'Gideon'],
      sceneCharacters: [{ name: 'Piper', libraryAssetId: 'p1' }],
      locationAssetId: 'loc-bunker',
      timeOfDay: 'NIGHT',
      sceneDirection: {
        lighting: { timeOfDay: 'Night' },
        environment: 'sealed concrete vault',
      },
      imageUrl: 'https://stills.example/a.jpg',
      musicUrl: 'https://audio.example/scene.mp3',
      segments: [{ id: 'seg-1' }],
      musicCues: [
        {
          cueId: 'cue-24-31',
          beatStart: 24,
          beatEnd: 31,
          intent: 'rising dread',
          description: 'low strings',
          url: 'https://audio.example/cue.mp3',
          duration: 40,
        },
      ],
      sceneMovements: [
        { index: 0, summary: 'They enter the vault.', beatStart: 0, beatEnd: 19 },
        { index: 1, summary: 'The alarm trips.', beatStart: 20, beatEnd: 39 },
      ],
      beats,
    }

    const { scenes } = splitOversizedScenes([scene])
    expect(scenes.length).toBeGreaterThan(1)

    const [partA, partB] = scenes
    expect(partA.id).toBe('scene-1')
    expect(partA.scenePartIndex).toBe(0)
    expect(partA.heading).toBe('INT. BUNKER - NIGHT')
    expect(partA.imageUrl).toBe(scene.imageUrl)
    expect(partA.segments).toEqual(scene.segments)

    expect(partB.id).not.toBe('scene-1')
    expect(partB.sceneId).toBe(partB.id)
    expect(partB.scenePartIndex).toBe(1)
    expect(partB.heading).toBe('INT. BUNKER - NIGHT (Part B)')
    expect(partB.characters).toEqual(scene.characters)
    expect(partB.sceneCharacters).toEqual(scene.sceneCharacters)
    expect(partB.locationAssetId).toBe('loc-bunker')
    expect(partB.timeOfDay).toBe('NIGHT')
    expect(partB.sceneDirection).toEqual(scene.sceneDirection)
    expect(partB.imageUrl).toBeUndefined()
    expect(partB.musicUrl).toBeUndefined()
    expect(partB.segments).toBeUndefined()

    const beatsA = (partA.beats as SceneBeat[]).length
    const cueA = (partA.musicCues as Array<Record<string, unknown>>)[0]
    const cueB = (partB.musicCues as Array<Record<string, unknown>>)[0]
    expect(cueA.beatStart).toBe(24)
    expect(cueA.beatEnd).toBe(beatsA - 1)
    expect(cueA.url).toBeUndefined()
    expect(cueB.beatStart).toBe(0)
    expect(cueB.url).toBeUndefined()
    expect(cueB.intent).toBe('rising dread')

    const movementsB = partB.sceneMovements as Array<{ index: number; beatStart: number; summary: string }>
    expect(movementsB).toHaveLength(1)
    expect(movementsB[0].index).toBe(0)
    expect(movementsB[0].beatStart).toBe(0)
    expect(movementsB[0].summary).toBe('The alarm trips.')
    expect((partB.beats as SceneBeat[]).every((beat) => beat.movementIndex === 0)).toBe(true)

    const total = scenes.reduce(
      (sum, part) => sum + ((part.beats as SceneBeat[] | undefined)?.length ?? 0),
      0
    )
    expect(total).toBe(40)
  })

  it('inserts continuation scenes after the edited scene and renumbers', () => {
    const beats: SceneBeat[] = []
    for (let i = 0; i < MAX_BEATS_PER_SCENE + 10; i++) {
      beats.push(makeBeat('action', i))
    }
    const { revisedScene, continuationScenes } = splitRevisedScene({
      id: 'scene-b',
      sceneId: 'scene-b',
      heading: 'INT. LAB - NIGHT',
      beats,
    })
    expect(continuationScenes.length).toBeGreaterThan(0)

    const script = [
      { id: 'scene-a', heading: 'INT. HALL - DAY' },
      { id: 'scene-b', heading: 'INT. LAB - NIGHT' },
      { id: 'scene-c', heading: 'EXT. DOCK - DAWN' },
    ]
    const next = replaceSceneWithSplit(script, 1, revisedScene, continuationScenes)
    expect(next.map((scene) => scene.id)).toEqual([
      'scene-a',
      'scene-b',
      continuationScenes[0].id,
      'scene-c',
    ])
    expect(next.map((scene) => scene.sceneNumber)).toEqual([1, 2, 3, 4])
    expect(next[1].id).toBe('scene-b')
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

describe('chapter headings', () => {
  it('spells chapter numbers from the beat index', () => {
    expect(chapterHeading(0)).toBe('Chapter One')
    expect(chapterHeading(1)).toBe('Chapter Two')
    expect(chapterHeading(2)).toBe('Chapter Three')
    expect(chapterHeading(11)).toBe('Chapter Twelve')
    expect(chapterHeading(20)).toBe('Chapter Twenty-One')
    expect(chapterHeading(98)).toBe('Chapter Ninety-Nine')
    expect(chapterHeading(99)).toBe('Chapter 100')
  })

  it('joins the beat name and description', () => {
    expect(
      resolveChapterBeatLine(
        {
          title: 'Subterranean Isolation',
          synopsis:
            "Establish Gideon's defensive isolation, his obsession with rationalizing Clara's murder as personal failure, and Piper's disruptive intrusion.",
        },
        'Ignored fallback'
      )
    ).toBe(
      "Subterranean Isolation - Establish Gideon's defensive isolation, his obsession with rationalizing Clara's murder as personal failure, and Piper's disruptive intrusion."
    )
  })

  it('falls back to the scene beat title when the treatment beat is missing', () => {
    expect(resolveChapterBeatLine(undefined, 'Descent')).toBe('Descent')
  })

  it('prefers synopsis, then description, then intent', () => {
    expect(
      resolveChapterBeatLine({ title: 'Arrival', description: 'The dock at dusk', synopsis: 'They land.' })
    ).toBe('Arrival - They land.')
    expect(resolveChapterBeatLine({ title: 'Arrival', intent: 'Raise the stakes' })).toBe(
      'Arrival - Raise the stakes'
    )
  })

  it('reads beats from the selected treatment variant', () => {
    const beats = treatmentBeatsFromMetadata({
      filmTreatment: { beats: [{ title: 'Older' }] },
      filmTreatmentVariant: { beats: [{ title: 'Current', synopsis: 'Now' }] },
    })
    expect(beats).toEqual([{ title: 'Current', synopsis: 'Now' }])
    expect(
      treatmentBeatsFromMetadata({ filmTreatment: { storyBeats: [{ title: 'Legacy' }] } })
    ).toEqual([{ title: 'Legacy' }])
  })

  it('jumps to the first scene of the neighboring chapter', () => {
    const scenes = [
      { blueprintBeatIndex: 0 },
      { blueprintBeatIndex: 0 },
      { blueprintBeatIndex: 1 },
      { blueprintBeatIndex: 2 },
      { blueprintBeatIndex: 2 },
    ]
    expect(getNeighboringChapterSceneIndices(scenes, 1)).toEqual({ nextSceneIndex: 2 })
    expect(getNeighboringChapterSceneIndices(scenes, 2)).toEqual({
      prevSceneIndex: 0,
      nextSceneIndex: 3,
    })
    expect(getNeighboringChapterSceneIndices(scenes, 4)).toEqual({ prevSceneIndex: 2 })
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
