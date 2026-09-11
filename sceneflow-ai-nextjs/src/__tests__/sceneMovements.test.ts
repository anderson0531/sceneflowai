import { describe, it, expect } from 'vitest'
import {
  MAX_SCENE_MOVEMENTS,
  applySceneMovements,
  buildSceneSynopsis,
  deriveSceneMovements,
  ensureSceneMovements,
  formatSceneArcBlock,
  getSceneMovements,
  normalizeSceneMovements,
  parsePersistedSceneMovements,
  resolveBeatMovement,
} from '@/lib/script/sceneMovements'
import type { SceneBeat } from '@/lib/script/segmentTypes'

function beats(count: number, kinds?: Array<SceneBeat['kind']>): SceneBeat[] {
  return Array.from({ length: count }, (_, i) => ({
    beatId: `b${i + 1}`,
    sequenceIndex: i,
    kind: kinds?.[i] ?? 'action',
    actionDescription: `Beat ${i + 1}`,
  }))
}

// The scene from the request: three sentences that should land on three
// contiguous runs of beats rather than being re-read whole by every beat.
const PIPER_SCENE = {
  sceneDirection: {
    sceneDescription:
      'Piper tumbles out of the pneumatic access tube and lands hard on the gantry floor. ' +
      'Gideon steps from the shadows and levels the brass core at her chest. ' +
      "Piper unfolds Clara's schematics and holds them up between them.",
  },
}

describe('deriveSceneMovements', () => {
  it('cuts the description into one movement per sentence', () => {
    const movements = deriveSceneMovements(PIPER_SCENE, beats(14))
    expect(movements).toHaveLength(3)
    expect(movements[0].summary).toMatch(/pneumatic access tube/)
    expect(movements[1].summary).toMatch(/brass core/)
    expect(movements[2].summary).toMatch(/schematics/)
  })

  it('covers every beat exactly once, in order', () => {
    const movements = deriveSceneMovements(PIPER_SCENE, beats(14))
    expect(movements[0].beatStart).toBe(0)
    expect(movements[movements.length - 1].beatEnd).toBe(13)
    for (let i = 1; i < movements.length; i++) {
      expect(movements[i].beatStart).toBe(movements[i - 1].beatEnd + 1)
    }
  })

  it('gives the remainder to the earliest movements', () => {
    const movements = deriveSceneMovements(PIPER_SCENE, beats(14))
    const sizes = movements.map((m) => m.beatEnd - m.beatStart + 1)
    expect(sizes).toEqual([5, 5, 4])
  })

  it('marks a derived arc as derived so a richer description can replace it', () => {
    expect(deriveSceneMovements(PIPER_SCENE, beats(9))[0].generatedBy).toBe('derived')
  })

  it('never exceeds the movement cap, however many sentences there are', () => {
    const wordy = {
      action: Array.from({ length: 12 }, (_, i) => `Something specific happens number ${i}.`).join(
        ' '
      ),
    }
    expect(deriveSceneMovements(wordy, beats(15)).length).toBe(MAX_SCENE_MOVEMENTS)
  })

  it('never creates more movements than there are beats', () => {
    expect(deriveSceneMovements(PIPER_SCENE, beats(2))).toHaveLength(2)
  })

  it('falls back through the description fields it is given', () => {
    expect(deriveSceneMovements({ summary: 'A long enough single sentence here.' }, beats(4))).
      toHaveLength(1)
    expect(deriveSceneMovements({}, beats(4))).toEqual([])
    expect(deriveSceneMovements(PIPER_SCENE, [])).toEqual([])
  })

  it('ignores sceneSynopsis, which is written from the arc rather than into it', () => {
    const synopsisOnly = { sceneSynopsis: 'One. Two. Three sentences of synopsis here.' }
    expect(deriveSceneMovements(synopsisOnly, beats(6))).toEqual([])
  })
})

describe('normalizeSceneMovements', () => {
  const authored = [
    { summary: 'Piper crashes onto the gantry floor.', intent: 'establish the fall' },
    { summary: 'Gideon corners her at gunpoint.' },
    { summary: 'Piper plays the schematics as her last card.' },
  ]

  it('honours the beat tags the model wrote', () => {
    const tagged = beats(6).map((beat, i) => ({ ...beat, movementIndex: [0, 0, 1, 1, 1, 2][i] }))
    const movements = normalizeSceneMovements(authored, tagged)
    expect(movements.map((m) => [m.beatStart, m.beatEnd])).toEqual([
      [0, 1],
      [2, 4],
      [5, 5],
    ])
    expect(movements[0].generatedBy).toBe('llm')
    expect(movements[0].intent).toBe('establish the fall')
  })

  it('spreads the beats itself when the tags are not an ordered partition', () => {
    const scrambled = beats(6).map((beat, i) => ({ ...beat, movementIndex: [2, 0, 1, 0, 1, 2][i] }))
    const movements = normalizeSceneMovements(authored, scrambled)
    expect(movements.map((m) => [m.beatStart, m.beatEnd])).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ])
  })

  it('spreads the beats when a movement was written but never dramatized', () => {
    const missingMiddle = beats(4).map((beat, i) => ({ ...beat, movementIndex: [0, 0, 2, 2][i] }))
    const movements = normalizeSceneMovements(authored, missingMiddle)
    expect(movements.map((m) => m.beatStart)).toEqual([0, 2, 3])
  })

  it('accepts plain strings as summaries', () => {
    expect(normalizeSceneMovements(['A first movement here.'], beats(3))).toHaveLength(1)
  })

  it('returns nothing for input it cannot read', () => {
    expect(normalizeSceneMovements(undefined, beats(3))).toEqual([])
    expect(normalizeSceneMovements([{ summary: '   ' }], beats(3))).toEqual([])
    expect(normalizeSceneMovements(authored, [])).toEqual([])
  })
})

describe('parsePersistedSceneMovements', () => {
  const persisted = [
    { summary: 'Piper crashes onto the gantry floor.', beatStart: 0, beatEnd: 2, generatedBy: 'llm' },
    { summary: 'Gideon corners her at gunpoint.', beatStart: 3, beatEnd: 5, generatedBy: 'llm' },
  ]

  it('reads back an arc that still fits the beats', () => {
    const movements = parsePersistedSceneMovements(persisted, beats(6))
    expect(movements.map((m) => [m.beatStart, m.beatEnd])).toEqual([
      [0, 2],
      [3, 5],
    ])
    expect(movements[0].generatedBy).toBe('llm')
  })

  it('re-spreads the authored summaries when beats were added or removed', () => {
    const movements = parsePersistedSceneMovements(persisted, beats(10))
    expect(movements.map((m) => m.summary)).toEqual(persisted.map((m) => m.summary))
    expect(movements[0].beatStart).toBe(0)
    expect(movements[1].beatEnd).toBe(9)
  })
})

describe('getSceneMovements', () => {
  it('never recomputes an authored arc', () => {
    const scene = {
      ...PIPER_SCENE,
      sceneMovements: [
        { summary: 'A single authored movement.', beatStart: 0, beatEnd: 5, generatedBy: 'user' },
      ],
    }
    const movements = getSceneMovements(scene, beats(6))
    expect(movements).toHaveLength(1)
    expect(movements[0].generatedBy).toBe('user')
  })

  it('recuts a derived arc once a richer description exists', () => {
    const scene = {
      ...PIPER_SCENE,
      sceneMovements: [
        { summary: 'An older, thinner read.', beatStart: 0, beatEnd: 5, generatedBy: 'derived' },
      ],
    }
    expect(getSceneMovements(scene, beats(6))).toHaveLength(3)
  })

  it('prefers the arc the script model wrote over one cut from prose', () => {
    const scene = { ...PIPER_SCENE, movements: [{ summary: 'The one movement the model wrote.' }] }
    const movements = getSceneMovements(scene, beats(6))
    expect(movements).toHaveLength(1)
    expect(movements[0].generatedBy).toBe('llm')
  })

  it('returns nothing when there is no scene or no beats', () => {
    expect(getSceneMovements(null, beats(3))).toEqual([])
    expect(getSceneMovements(PIPER_SCENE, [])).toEqual([])
  })
})

describe('resolveBeatMovement', () => {
  const movements = deriveSceneMovements(PIPER_SCENE, beats(14))

  it('places a beat inside its movement', () => {
    const resolved = resolveBeatMovement(movements, 6)
    expect(resolved?.movement.index).toBe(1)
    expect(resolved?.positionInMovement).toBe(2)
    expect(resolved?.movementBeatCount).toBe(5)
    expect(resolved?.totalMovements).toBe(3)
  })

  it('returns nothing for a beat outside the arc', () => {
    expect(resolveBeatMovement(movements, 99)).toBeUndefined()
  })
})

describe('applySceneMovements', () => {
  it('tags every beat and writes the arc and synopsis onto the scene', () => {
    const result = ensureSceneMovements({ ...PIPER_SCENE }, beats(6))
    expect(result.beats.map((b) => b.movementIndex)).toEqual([0, 0, 1, 1, 2, 2])
    expect(Array.isArray(result.scene.sceneMovements)).toBe(true)
    expect(result.scene.sceneSynopsis).toMatch(/pneumatic access tube.*brass core.*schematics/s)
  })

  it('drops the raw model field once the arc is normalized', () => {
    const scene = { ...PIPER_SCENE, movements: [{ summary: 'The one movement written.' }] }
    const result = applySceneMovements(scene, getSceneMovements(scene, beats(4)), beats(4))
    expect(result.scene.movements).toBeUndefined()
    expect(result.scene.sceneMovements).toBeDefined()
  })

  it('is idempotent', () => {
    const once = ensureSceneMovements({ ...PIPER_SCENE }, beats(9))
    const twice = ensureSceneMovements(once.scene, once.beats)
    expect(twice.scene.sceneMovements).toEqual(once.scene.sceneMovements)
    expect(twice.beats).toEqual(once.beats)
  })

  it('leaves a scene alone when it has no arc', () => {
    const scene = { id: 's1' }
    const result = applySceneMovements(scene, [], beats(3))
    expect(result.scene).toBe(scene)
  })
})

describe('formatSceneArcBlock', () => {
  const movements = deriveSceneMovements(PIPER_SCENE, beats(14))

  it('shows the whole arc with the current movement marked', () => {
    const block = formatSceneArcBlock(movements, 1)
    expect(block).toContain('SCENE ARC')
    expect(block).toMatch(/^> 2\. \(beats 6-10\)/m)
    expect(block).toMatch(/^ {2}1\. \(beats 1-5\)/m)
  })

  it('names a single-beat movement in the singular', () => {
    const single = deriveSceneMovements(PIPER_SCENE, beats(3))
    expect(formatSceneArcBlock(single)).toContain('(beat 1)')
  })

  it('is empty when there is no arc', () => {
    expect(formatSceneArcBlock([])).toBe('')
  })
})

describe('buildSceneSynopsis', () => {
  it('joins the movement summaries into one paragraph', () => {
    expect(buildSceneSynopsis(deriveSceneMovements(PIPER_SCENE, beats(6)))).toBe(
      PIPER_SCENE.sceneDirection.sceneDescription.trim()
    )
  })
})
