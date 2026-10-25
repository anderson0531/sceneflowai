import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  applyOptimizedShotPatches,
  chunkShotDirectionTargets,
  DEFAULT_SHOT_DIRECTION_TEXT_CONCURRENCY,
  getShotDirectionTextConcurrency,
  runShotDirectionChunks,
  SHOT_DIRECTION_BEAT_CHUNK,
  shotDirectionTargets,
} from '@/lib/vision/shotDirectionBatch'

function read(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), 'utf8')
}

function beat(beatId: string, sequenceIndex: number, overrides: Partial<SceneBeat> = {}): SceneBeat {
  return {
    beatId,
    sequenceIndex,
    kind: 'action',
    actionDescription: `Elara stands at the window in shot ${sequenceIndex + 1}.`,
    beatDirection: { shotType: 'Medium Shot', frozenMoment: 'Elara at the window' },
    ...overrides,
  }
}

describe('shot direction batches', () => {
  it('uses a wider text concurrency than the two-wide still and clip cap', () => {
    const previous = process.env.SHOT_DIRECTION_TEXT_CONCURRENCY
    delete process.env.SHOT_DIRECTION_TEXT_CONCURRENCY
    try {
      expect(SHOT_DIRECTION_BEAT_CHUNK).toBe(6)
      expect(DEFAULT_SHOT_DIRECTION_TEXT_CONCURRENCY).toBe(4)
      expect(DEFAULT_SHOT_DIRECTION_TEXT_CONCURRENCY).toBeGreaterThan(2)
      expect(getShotDirectionTextConcurrency()).toBe(4)
      process.env.SHOT_DIRECTION_TEXT_CONCURRENCY = '6'
      expect(getShotDirectionTextConcurrency()).toBe(6)
    } finally {
      if (previous === undefined) delete process.env.SHOT_DIRECTION_TEXT_CONCURRENCY
      else process.env.SHOT_DIRECTION_TEXT_CONCURRENCY = previous
    }
    expect(read('src/app/api/vision/direct-scene-shots/route.ts')).toContain(
      'getShotDirectionTextConcurrency()'
    )
  })

  it('chunks shootable shots and skips protected direction unless forced', () => {
    const scene = {
      beats: [
        beat('s1', 0),
        beat('s2', 1, { excluded: true }),
        beat('s3', 2, {
          beatDirection: {
            shotType: 'Close-Up',
            frozenMoment: 'locked',
            generatedBy: 'director',
          },
        }),
        beat('s4', 3, {
          beatDirection: { shotType: 'Wide Shot', frozenMoment: 'user', generatedBy: 'user' },
        }),
        ...Array.from({ length: 6 }, (_, index) => beat(`s${index + 5}`, index + 4)),
      ],
    }
    const targets = shotDirectionTargets(scene)
    expect(targets.map((target) => target.beat.beatId)).toEqual([
      's1',
      's5',
      's6',
      's7',
      's8',
      's9',
      's10',
    ])
    expect(chunkShotDirectionTargets(targets).map((chunk) => chunk.length)).toEqual([6, 1])
    expect(shotDirectionTargets(scene, { force: true }).map((target) => target.beat.beatId)).toEqual([
      's1',
      's3',
      's4',
      's5',
      's6',
      's7',
      's8',
      's9',
      's10',
    ])
  })

  it('keeps at most the concurrency in flight and drops a failed chunk', async () => {
    const scene = {
      beats: Array.from({ length: 8 }, (_, index) => beat(`s${index + 1}`, index)),
    }
    const pending: Array<() => void> = []
    const started: string[] = []
    const running = runShotDirectionChunks({
      scene,
      chunkSize: 1,
      concurrency: 4,
      direct: (request) =>
        new Promise((resolve) => {
          started.push(request.beats[0].beat.beatId || '')
          pending.push(() =>
            resolve({
              usedAI: true,
              patches: request.beats.map((entry) => ({
                beatIndex: entry.beatIndex,
                beatId: entry.beat.beatId,
                patch: { frozenMoment: `${entry.beat.beatId} held` },
              })),
            })
          )
        }),
    })
    await viWaitUntil(() => pending.length === 4)
    expect(started).toHaveLength(4)
    pending.splice(0, 4).forEach((release) => release())
    await viWaitUntil(() => pending.length === 4)
    pending.splice(0, 4).forEach((release) => release())
    const result = await running
    expect(result.requested).toBe(8)
    expect(result.failed).toBe(0)
    expect(result.patches).toHaveLength(8)

    let calls = 0
    const failed = await runShotDirectionChunks({
      scene: { beats: [beat('a', 0), beat('b', 1), beat('c', 2)] },
      chunkSize: 2,
      concurrency: 1,
      direct: async (request) => {
        calls += 1
        if (calls === 1) throw new Error('quota')
        return {
          usedAI: true,
          patches: request.beats.map((entry) => ({
            beatIndex: entry.beatIndex,
            beatId: entry.beat.beatId,
            patch: { frozenMoment: 'kept' },
          })),
        }
      },
    })
    expect(failed.failed).toBe(2)
    expect(failed.patches.map((patch) => patch.beatId)).toEqual(['c'])
  })

  it('stamps director and leaves a protected shot unchanged unless forced', () => {
    const scenes = [
      {
        id: 'scene-a',
        beats: [
          beat('a1', 0),
          beat('a2', 1, {
            beatDirection: {
              shotType: 'Close-Up',
              frozenMoment: 'already directed',
              generatedBy: 'director',
            },
          }),
        ],
      },
    ]
    const held = applyOptimizedShotPatches({
      scenes,
      sceneIdx: 0,
      patches: [
        { beatId: 'a1', beatIndex: 0, patch: { frozenMoment: 'Elara grips the sill' } },
        { beatId: 'a2', beatIndex: 1, patch: { frozenMoment: 'should not land' } },
      ],
      characters: [],
      locationReferences: [],
      objectReferences: [],
    })
    const [first, second] = getSceneBeats(held.scenes[0])
    expect(held.optimized).toBe(1)
    expect(held.skipped).toBe(1)
    expect(first.beatDirection).toMatchObject({
      frozenMoment: 'Elara grips the sill',
      generatedBy: 'director',
    })
    expect(first.storyboardImagePrompt).toContain('grips the sill')
    expect(second.beatDirection?.frozenMoment).toBe('already directed')
    expect(scenes[0].beats[0].beatDirection?.frozenMoment).toBe('Elara at the window')

    const forced = applyOptimizedShotPatches({
      scenes,
      sceneIdx: 0,
      force: true,
      patches: [{ beatId: 'a2', beatIndex: 1, patch: { frozenMoment: 'rewrite the lock' } }],
      characters: [],
      locationReferences: [],
      objectReferences: [],
    })
    expect(getSceneBeats(forced.scenes[0])[1].beatDirection?.frozenMoment).toBe('rewrite the lock')
  })

  it('passes full sceneContext and shot sequence outline into every Shot Director chunk and surfaces Shot Direction Agent in Direction workbench', async () => {
    const scene = {
      heading: 'INT. ARCHIVE VAULT - NIGHT',
      sceneDirection: {
        sceneDescription: 'Cold subterranean vault lined with brass filing cabinets.',
        scene: {
          location: 'Subterranean Archive Vault',
          atmosphere: 'Claustrophobic and damp',
          sceneArc: 'Routine audit escalates into a standoff over the missing ledger',
        },
        camera: {
          coveragePhilosophy: 'Start wide on the table axis, tighten to single close-ups on the lie',
        },
        movements: [
          {
            id: 'mov_1',
            index: 1,
            title: 'The Audit Begins',
            turn: 'Piper spots the torn page',
            emotionalEndState: 'Suspicion',
          },
        ],
      },
      beats: [
        beat('s1', 0, { movementId: 'mov_1' }),
        beat('s2', 1, { movementId: 'mov_1' }),
      ],
    }

    let capturedSceneContext: any = null
    await runShotDirectionChunks({
      scene,
      chunkSize: 1,
      concurrency: 1,
      direct: async (request) => {
        capturedSceneContext = request.sceneContext
        return {
          usedAI: true,
          patches: request.beats.map((entry) => ({
            beatIndex: entry.beatIndex,
            beatId: entry.beat.beatId,
            patch: { frozenMoment: `${entry.beat.beatId} directed` },
          })),
        }
      },
    })

    expect(capturedSceneContext).toBeDefined()
    expect(capturedSceneContext.heading).toBe('INT. ARCHIVE VAULT - NIGHT')
    expect(capturedSceneContext.location).toBe('Subterranean Archive Vault')
    expect(capturedSceneContext.atmosphere).toBe('Claustrophobic and damp')
    expect(capturedSceneContext.coveragePhilosophy).toContain('Start wide on the table axis')
    expect(capturedSceneContext.movements).toHaveLength(1)
    expect(capturedSceneContext.beatOutline).toHaveLength(2)

    const workbenchSource = read('src/components/vision/scene-production/SceneDirectionWorkbench.tsx')
    expect(workbenchSource).toContain('Shot Direction Agent')
    expect(workbenchSource).toContain('onRunShotDirector')
    expect(workbenchSource).toContain('shots directed')
  })
})

async function viWaitUntil(predicate: () => boolean): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > 1000) throw new Error('timed out waiting for shot-direction workers')
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}
