import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  MAX_SCENES_PER_CHUNK,
  buildFallbackSceneChunks,
  buildSceneChunks,
  halveChunk,
  splitSceneCount,
  summarizeChunkYield,
  type SceneChunk,
} from '@/lib/script/sceneChunkPlan'
import {
  MAX_BEATS_PER_SCENE,
  planSceneDecomposition,
  splitOversizedScenes,
} from '@/lib/script/sceneDecomposition'
import {
  areNearDuplicateScenes,
  consolidateFragmentedScenes,
  mergeScenes,
} from '@/lib/script/sceneConsolidation'

const ROOT = join(__dirname, '..', '..')

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8')
}

/** The reported failure: 4 Blueprint beats of 10 minutes each. */
function fourTenMinuteBeats() {
  return [
    { title: 'Arrival', minutes: 10, synopsis: 'The crew reaches the station.' },
    { title: 'Descent', minutes: 10, synopsis: 'They go below the ice.' },
    { title: 'Contact', minutes: 10, synopsis: 'Something answers back.' },
    { title: 'Ascent', minutes: 10, synopsis: 'Only two make it out.' },
  ]
}

function sceneWithBeats(
  overrides: Record<string, unknown>,
  beatCount: number
): Record<string, unknown> {
  return {
    heading: 'INT. STATION - NIGHT',
    duration: 120,
    dialogue: [],
    beats: Array.from({ length: beatCount }, (_, i) => ({
      id: `beat-${overrides.sceneNumber}-${i}`,
      kind: i % 2 === 0 ? 'action' : 'dialogue',
      sequenceIndex: i,
      durationSeconds: 8,
      ...(i % 2 === 0
        ? { actionDescription: `Shot ${i} of scene ${overrides.sceneNumber}` }
        : { character: 'PIPER', line: `[flat] Line ${i} of scene ${overrides.sceneNumber}` }),
    })),
    ...overrides,
  }
}

describe('splitSceneCount', () => {
  it('keeps a beat in one chunk when it fits the cap', () => {
    expect(splitSceneCount(5)).toEqual([5])
    expect(splitSceneCount(MAX_SCENES_PER_CHUNK)).toEqual([MAX_SCENES_PER_CHUNK])
  })

  it('spreads an oversized beat evenly rather than leaving a one-scene call', () => {
    expect(splitSceneCount(7)).toEqual([4, 3])
    expect(splitSceneCount(13)).toEqual([5, 4, 4])
    for (const total of [7, 8, 11, 13, 19, 25]) {
      const sizes = splitSceneCount(total)
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(total)
      expect(Math.min(...sizes)).toBeGreaterThan(1)
      expect(Math.max(...sizes)).toBeLessThanOrEqual(MAX_SCENES_PER_CHUNK)
    }
  })

  it('never returns an empty plan', () => {
    expect(splitSceneCount(0)).toEqual([1])
    expect(splitSceneCount(-3)).toEqual([1])
  })
})

describe('buildSceneChunks', () => {
  it('gives each 10-minute Blueprint beat its own five-scene chunk', () => {
    const beats = fourTenMinuteBeats()
    const plan = planSceneDecomposition(beats)
    const { chunks, totalScenes } = buildSceneChunks(plan, beats)

    expect(chunks).toHaveLength(4)
    expect(chunks.map((c) => c.sceneCount)).toEqual([5, 5, 5, 5])
    expect(totalScenes).toBe(20)
  })

  it('numbers scenes contiguously across chunks', () => {
    const beats = fourTenMinuteBeats()
    const plan = planSceneDecomposition(beats)
    const { chunks, totalScenes } = buildSceneChunks(plan, beats)

    const covered = chunks.flatMap((c) =>
      Array.from({ length: c.sceneCount }, (_, i) => c.sceneNumberStart + i)
    )
    expect(covered).toEqual(Array.from({ length: totalScenes }, (_, i) => i + 1))
  })

  it('carries the beat identity and synopsis onto every chunk', () => {
    const beats = fourTenMinuteBeats()
    const plan = planSceneDecomposition(beats)
    const { chunks } = buildSceneChunks(plan, beats)

    expect(chunks.map((c) => c.blueprintBeatIndex)).toEqual([0, 1, 2, 3])
    expect(chunks[2].blueprintBeatTitle).toBe('Contact')
    expect(chunks[2].beatSynopsis).toBe('Something answers back.')
    for (const chunk of chunks) {
      expect(chunk.targetBeatsPerScene).toBeLessThanOrEqual(MAX_BEATS_PER_SCENE)
      expect(chunk.targetBeatsPerScene).toBeGreaterThan(0)
    }
  })

  it('splits a beat that needs more scenes than one call can carry', () => {
    const beats = [{ title: 'The Long Night', minutes: 60, synopsis: 'It goes on.' }]
    const plan = planSceneDecomposition(beats)
    const { chunks, totalScenes } = buildSceneChunks(plan, beats)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c) => c.blueprintBeatIndex === 0)).toBe(true)
    expect(chunks.every((c) => c.sceneCount <= MAX_SCENES_PER_CHUNK)).toBe(true)
    expect(chunks.map((c) => c.partIndex)).toEqual(chunks.map((_, i) => i))
    expect(chunks.every((c) => c.partCount === chunks.length)).toBe(true)
    expect(chunks.reduce((sum, c) => sum + c.sceneCount, 0)).toBe(totalScenes)
  })

  it('falls back to a format target when the treatment has no beats', () => {
    const { chunks, totalScenes } = buildFallbackSceneChunks(14)

    expect(totalScenes).toBe(14)
    expect(chunks.every((c) => c.blueprintBeatIndex === null)).toBe(true)
    expect(chunks.every((c) => c.sceneCount <= MAX_SCENES_PER_CHUNK)).toBe(true)
    expect(chunks[0].sceneNumberStart).toBe(1)
  })
})

describe('halveChunk', () => {
  const chunk: SceneChunk = {
    blueprintBeatIndex: 1,
    blueprintBeatTitle: 'Descent',
    sceneNumberStart: 6,
    sceneCount: 5,
    targetBeatsPerScene: 15,
    partIndex: 0,
    partCount: 1,
  }

  it('splits a truncated chunk into two contiguous halves', () => {
    const halves = halveChunk(chunk)
    expect(halves).not.toBeNull()
    const [first, second] = halves!

    expect(first.sceneNumberStart).toBe(6)
    expect(first.sceneCount).toBe(3)
    expect(second.sceneNumberStart).toBe(9)
    expect(second.sceneCount).toBe(2)
    expect(first.sceneCount + second.sceneCount).toBe(chunk.sceneCount)
    expect(second.blueprintBeatIndex).toBe(1)
  })

  it('cannot halve a single-scene chunk', () => {
    expect(halveChunk({ ...chunk, sceneCount: 1 })).toBeNull()
  })
})

describe('summarizeChunkYield', () => {
  it('aggregates produced-vs-planned per Blueprint beat', () => {
    const beats = [{ title: 'The Long Night', minutes: 60, synopsis: 'It goes on.' }]
    const plan = planSceneDecomposition(beats)
    const { chunks } = buildSceneChunks(plan, beats)

    const produced = chunks.map((c) => c.sceneCount - 1)
    const summary = summarizeChunkYield(chunks, produced)

    expect(summary).toHaveLength(1)
    expect(summary[0].blueprintBeatIndex).toBe(0)
    expect(summary[0].planned).toBe(chunks.reduce((s, c) => s + c.sceneCount, 0))
    expect(summary[0].produced).toBe(produced.reduce((s, n) => s + n, 0))
  })
})

describe('consolidation preserves decomposed scenes', () => {
  it('keeps every scene and beat when a beat decomposes into similar scenes', () => {
    // What one Blueprint beat looks like after decomposition: same location,
    // same speaker. The old `sameSpeakers || overlap` rule merged these.
    const scenes = [1, 2, 3, 4, 5].map((sceneNumber) =>
      sceneWithBeats(
        {
          sceneNumber,
          blueprintBeatIndex: 0,
          action: `The crew works the ice shaft, section ${sceneNumber}.`,
          dialogue: [{ character: 'PIPER', line: `[flat] Line ${sceneNumber}` }],
        },
        10
      )
    )

    const result = consolidateFragmentedScenes(scenes)

    expect(result).toHaveLength(5)
    expect(result.map((s) => s.sceneNumber)).toEqual([1, 2, 3, 4, 5])
  })

  it('never merges across Blueprint beats even when the scenes look identical', () => {
    const a = sceneWithBeats(
      {
        sceneNumber: 1,
        blueprintBeatIndex: 0,
        action: 'Identical action text in both scenes.',
        dialogue: [{ character: 'PIPER', line: '[flat] Same.' }],
      },
      6
    )
    const b = sceneWithBeats(
      {
        sceneNumber: 2,
        blueprintBeatIndex: 1,
        action: 'Identical action text in both scenes.',
        dialogue: [{ character: 'PIPER', line: '[flat] Same.' }],
      },
      6
    )

    expect(areNearDuplicateScenes(a, b)).toBe(false)
    expect(consolidateFragmentedScenes([a, b])).toHaveLength(2)
  })

  it('does not undo a deliberate split of an oversized scene', () => {
    const oversized = sceneWithBeats(
      {
        sceneNumber: 1,
        blueprintBeatIndex: 0,
        action: 'One very long scene that has to be split.',
        dialogue: [{ character: 'PIPER', line: '[flat] Same.' }],
      },
      MAX_BEATS_PER_SCENE * 2
    )

    const split = splitOversizedScenes([oversized])
    expect(split.scenes.length).toBe(2)

    const consolidated = consolidateFragmentedScenes(split.scenes)
    expect(consolidated).toHaveLength(2)

    const beatsAfter = consolidated.reduce(
      (sum: number, s) => sum + (Array.isArray(s.beats) ? s.beats.length : 0),
      0
    )
    expect(beatsAfter).toBe(MAX_BEATS_PER_SCENE * 2)
  })

  it('gives split continuations distinguishable headings', () => {
    const oversized = sceneWithBeats(
      { sceneNumber: 1, heading: 'INT. ICE SHAFT - NIGHT' },
      MAX_BEATS_PER_SCENE * 3
    )
    const headings = splitOversizedScenes([oversized]).scenes.map((s) => s.heading)

    expect(new Set(headings).size).toBe(headings.length)
    expect(headings[0]).toBe('INT. ICE SHAFT - NIGHT')
    expect(headings[1]).toBe('INT. ICE SHAFT - NIGHT (cont. 2)')
    expect(headings[2]).toBe('INT. ICE SHAFT - NIGHT (cont. 3)')
  })

  it('still merges a genuine duplicate scene', () => {
    const action = 'Piper braces the hatch as the pressure alarm climbs.'
    const a = sceneWithBeats(
      {
        sceneNumber: 1,
        blueprintBeatIndex: 0,
        action,
        dialogue: [{ character: 'PIPER', line: '[tense] Hold it.' }],
      },
      4
    )
    const b = sceneWithBeats(
      {
        sceneNumber: 2,
        blueprintBeatIndex: 0,
        action,
        dialogue: [{ character: 'PIPER', line: '[tense] Hold it.' }],
      },
      4
    )

    expect(areNearDuplicateScenes(a, b)).toBe(true)
    expect(consolidateFragmentedScenes([a, b])).toHaveLength(1)
  })

  it('absorbs an empty parse stub into the next scene', () => {
    const stub = { sceneNumber: 1, heading: 'INT. NOWHERE - DAY', duration: 2, dialogue: [] }
    const real = sceneWithBeats({ sceneNumber: 2, action: 'A real scene.' }, 6)

    const result = consolidateFragmentedScenes([stub, real])
    expect(result).toHaveLength(1)
    expect(result[0].beats).toHaveLength(6)
  })
})

describe('mergeScenes', () => {
  it('preserves beats and scene identity', () => {
    const a = sceneWithBeats(
      {
        sceneNumber: 3,
        id: 'scene-a',
        sceneId: 'scene-a',
        blueprintBeatIndex: 2,
        blueprintBeatTitle: 'Contact',
        cinematicType: 'main',
        locationAssetId: 'loc-1',
        sceneCharacters: [{ name: 'Piper' }],
        action: 'First half.',
        characters: ['Piper'],
      },
      4
    )
    const b = sceneWithBeats(
      { sceneNumber: 4, id: 'scene-b', action: 'Second half.', characters: ['Gideon'] },
      3
    )

    const merged = mergeScenes(a, b)

    expect(merged.id).toBe('scene-a')
    expect(merged.sceneId).toBe('scene-a')
    expect(merged.blueprintBeatIndex).toBe(2)
    expect(merged.blueprintBeatTitle).toBe('Contact')
    expect(merged.cinematicType).toBe('main')
    expect(merged.locationAssetId).toBe('loc-1')
    expect(merged.sceneCharacters).toEqual([{ name: 'Piper' }])
    expect(merged.beats).toHaveLength(7)
    expect(merged.beats.map((beat: { sequenceIndex: number }) => beat.sequenceIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ])
    expect(merged.characters).toEqual(['Piper', 'Gideon'])
    expect(merged.action).toBe('First half.\n\nSecond half.')
    expect(merged.duration).toBe(240)
  })

  it('does not leave a literal newline escape in merged action', () => {
    const merged = mergeScenes(
      { action: 'A.', duration: 10 },
      { action: 'B.', duration: 10 }
    )
    expect(merged.action).not.toContain('\\n')
  })
})

describe('generate-script-v2 chunked generation', () => {
  const source = readSource('src/app/api/vision/generate-script-v2/route.ts')

  it('generates per Blueprint beat chunk instead of one call for the whole script', () => {
    expect(source).toContain('buildSceneChunks')
    expect(source).toContain('buildSceneChunkPrompt')
    expect(source).toContain('runWithConcurrencyLimit')
    expect(source).not.toContain('buildSinglePassPrompt')
  })

  it('reacts to a truncated response instead of discarding finishReason', () => {
    expect(source).toContain("result.finishReason === 'MAX_TOKENS'")
    expect(source).toContain('halveChunk')
  })

  it('drops the dead legacy batch helpers', () => {
    for (const dead of [
      'buildBatch1Prompt',
      'buildBatch2Prompt',
      'parseBatch1',
      'streamParseScenes',
      'extractSFXFromDialogue',
    ]) {
      expect(source).not.toContain(dead)
    }
  })

  it('consolidates before splitting so a split is never undone', () => {
    const consolidateAt = source.indexOf('consolidateFragmentedScenes(allScenes)')
    const splitAt = source.indexOf('splitOversizedScenes(allScenes')
    expect(consolidateAt).toBeGreaterThan(-1)
    expect(splitAt).toBeGreaterThan(consolidateAt)
  })

  it('reports real scene progress rather than the Blueprint beat count', () => {
    expect(source).toContain('expectedTotalScenes')
    expect(source).not.toContain('totalScenes: beatCount')
  })
})

describe('scene chunk prompt', () => {
  const source = readSource('src/app/api/vision/generate-script-v2/route.ts')
  const promptStart = source.indexOf('function buildSceneChunkPrompt(')
  const promptEnd = source.indexOf('/** Concurrent chunk calls', promptStart)
  const promptSource = source.slice(promptStart, promptEnd)

  it('states the exact scene count, range, and Blueprint beat index', () => {
    expect(promptStart).toBeGreaterThan(-1)
    expect(promptEnd).toBeGreaterThan(promptStart)
    expect(promptSource).toContain('Return EXACTLY ${chunk.sceneCount} scene')
    expect(promptSource).toContain('numbered ${sceneNumbers.join(\', \')}')
    expect(promptSource).toContain('"blueprintBeatIndex": ${beatIndex}')
  })

  it('names the shortfall on a retry and forbids the bookends', () => {
    expect(promptSource).toContain('opts.shortfallNote')
    expect(promptSource).toMatch(/Do NOT write a title sequence or closing credits/)
  })

  it('asks for beats only, without the legacy field mirroring', () => {
    expect(promptSource).toContain('"beats" is the ONLY place story content goes')
    expect(promptSource).toMatch(/Do NOT emit "action", "dialogue", or "narration" fields/)
  })

  it('hands off to the adjacent Blueprint beats so chunks stay continuous', () => {
    expect(promptSource).toContain('ADJACENT CONTEXT')
    expect(source).toContain('formatNeighborBeat')
  })
})
