import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const { planBeatSequence, applyBeatKeyframePlansToScene } = vi.hoisted(() => ({
  planBeatSequence: vi.fn(),
  applyBeatKeyframePlansToScene: vi.fn(
    (scene: Record<string, unknown>, plans: Array<{ beatIndex: number; prompt: string }>) => {
      const beats = [...((scene.beats as Array<Record<string, unknown>>) || [])]
      for (const plan of plans) {
        beats[plan.beatIndex] = {
          ...beats[plan.beatIndex],
          storyboardImagePrompt: plan.prompt,
          storyboardImagePromptDirectionKey: 'planner-wrote-this',
        }
      }
      return { ...scene, beats }
    }
  ),
}))

vi.mock('@/lib/intelligence/project-lookbook', () => ({
  ensureProjectLookbook: vi.fn(async () => undefined),
  summarizeScenesForLookbook: vi.fn(() => []),
}))

vi.mock('@/lib/intelligence/beat-sequence-planner', async () => {
  const fallback = await import('@/lib/intelligence/beat-sequence-planner-fallback')
  return {
    planBeatSequence,
    applyBeatKeyframePlansToScene,
    ensureSceneMusicFromDirection: vi.fn((scene: Record<string, unknown>) => scene),
    isTitleOrCinematicScene: () => false,
    asBeatRole: fallback.asBeatRole,
    composeBeatActionFraming: fallback.composeBeatActionFraming,
    roleAllowsTypography: fallback.roleAllowsTypography,
    storedPromptMatchesDirection: fallback.storedPromptMatchesDirection,
  }
})

vi.mock('@/lib/sceneGeneration/generateDirection', () => ({
  generateSceneDirection: vi.fn(),
}))

vi.mock('@/lib/sceneGeneration/generateAudio', () => ({
  generateSceneAudio: vi.fn(),
  applyAudioAssetsToScene: vi.fn(),
}))

vi.mock('@/lib/sceneGeneration/generateImage', () => ({
  generateSceneImage: vi.fn(),
}))

import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  buildExpressReferenceCatalog,
  planSceneBeatKeyframes,
} from '@/lib/sceneGeneration/expressOrchestrator'
import { ExpressTrafficCop } from '@/lib/sceneGeneration/expressTrafficCop'
import type { ExpressEvent, ExpressPhaseEvent } from '@/lib/sceneGeneration/types'
import { beatStillDirectionFingerprint } from '@/lib/script/beatDirectionFingerprint'

/**
 * Two beats whose stored prompts are both current, so neither needs re-planning
 * on its own account. That isolates scoping from staleness.
 */
function buildBeats(): SceneBeat[] {
  const direction = (frozenMoment: string) => ({
    shotType: 'Medium Shot',
    frozenMoment,
    lightingAccent: 'Low-key practicals',
  })

  return [
    {
      beatId: 'bt_one',
      kind: 'action',
      sequenceIndex: 0,
      actionDescription: 'ALICE lifts the lantern.',
      beatDirection: direction('ALICE at the gate'),
      storyboardImagePrompt: 'LAST SENT: Alice lifts the lantern, close.',
      storyboardImagePromptDirectionKey: beatStillDirectionFingerprint(direction('ALICE at the gate')),
    },
    {
      beatId: 'bt_two',
      kind: 'action',
      sequenceIndex: 1,
      actionDescription: 'BOB steps out of the rain.',
      beatDirection: direction('BOB under the awning'),
      storyboardImagePrompt: 'LAST SENT: Bob steps out of the rain, wide.',
      storyboardImagePromptDirectionKey: beatStillDirectionFingerprint(direction('BOB under the awning')),
    },
  ]
}

function runPlanner(
  beats: SceneBeat[],
  options: { selectedFrameKeys?: string[] } = {},
  emit: (event: ExpressEvent) => void = () => {}
): ReturnType<typeof planSceneBeatKeyframes> {
  const scene = { heading: 'INT. GATE - NIGHT', beats }
  return planSceneBeatKeyframes(
    { sceneIndex: 0, sceneNumber: 1, scene },
    { projectId: 'proj-1', ...options },
    { metadata: { title: 'Test Film', visionPhase: {} }, title: 'Test Film' },
    emit,
    new ExpressTrafficCop(),
    beats,
    'photorealistic'
  )
}

function imagePlanDone(events: ExpressEvent[]): ExpressPhaseEvent | undefined {
  return events.find(
    (event): event is ExpressPhaseEvent =>
      event.type === 'phase-done' && event.phase === 'image-plan'
  )
}

beforeEach(() => {
  planBeatSequence.mockReset()
  applyBeatKeyframePlansToScene.mockClear()
  planBeatSequence.mockResolvedValue({ plans: [], usedAI: false })
})

describe('a scoped run plans only the frame it was asked to render', () => {
  it('skips the planner for a beat whose direction has not moved', async () => {
    const beats = buildBeats()

    const plans = await runPlanner(beats, { selectedFrameKeys: ['bt_one'] })

    expect(planBeatSequence).not.toHaveBeenCalled()
    expect(applyBeatKeyframePlansToScene).not.toHaveBeenCalled()
    expect([...plans.keys()]).toEqual([0])
    // Composed from the direction, not read back from the last prompt sent —
    // the reused plan feeds reference matching, and matching against wording
    // the frame is no longer built from is how uninvolved cast got attached.
    expect(plans.get(0)!.prompt).toBe('Medium Shot. ALICE at the gate. ALICE lifts the lantern.')
  })

  it('leaves a sibling beat byte-identical', async () => {
    const beats = buildBeats()
    const before = JSON.stringify(beats[1])

    await runPlanner(beats, { selectedFrameKeys: ['bt_one'] })

    expect(JSON.stringify(beats[1])).toBe(before)
  })

  it('sends only the selected beat to the planner when its prompt is stale', async () => {
    const beats = buildBeats()
    beats[0].storyboardImagePromptDirectionKey = 'stale-fingerprint'
    planBeatSequence.mockResolvedValue({
      plans: [{ beatIndex: 0, beatRole: 'progression', prompt: 'FRESH: Alice at the gate.' }],
      usedAI: true,
    })

    const plans = await runPlanner(beats, { selectedFrameKeys: ['bt_one'] })

    expect(planBeatSequence).toHaveBeenCalledTimes(1)
    const planned = planBeatSequence.mock.calls[0][0].beats as SceneBeat[]
    expect(planned.map((b) => b.beatId)).toEqual(['bt_one'])

    // Only the selected beat is written, so a single-frame regen cannot
    // re-plan a sibling's direction out from under it.
    expect(applyBeatKeyframePlansToScene).toHaveBeenCalledTimes(1)
    const written = applyBeatKeyframePlansToScene.mock.calls[0][1] as Array<{ beatIndex: number }>
    expect(written.map((p) => p.beatIndex)).toEqual([0])
    expect(plans.get(0)!.prompt).toBe('FRESH: Alice at the gate.')
  })

  it('remaps the planner index back onto the real beat index', async () => {
    const beats = buildBeats()
    beats[1].storyboardImagePromptDirectionKey = 'stale-fingerprint'
    // The planner only saw one beat, so it numbered it 0.
    planBeatSequence.mockResolvedValue({
      plans: [{ beatIndex: 0, beatRole: 'progression', prompt: 'FRESH: Bob in the rain.' }],
      usedAI: true,
    })

    const plans = await runPlanner(beats, { selectedFrameKeys: ['bt_two'] })

    expect([...plans.keys()]).toEqual([1])
    expect(plans.get(1)!.prompt).toBe('FRESH: Bob in the rain.')
  })

  it('treats an end-frame key as selecting that beat', async () => {
    const beats = buildBeats()

    const plans = await runPlanner(beats, { selectedFrameKeys: ['bt_two-end'] })

    expect([...plans.keys()]).toEqual([1])
    expect(plans.get(1)!.prompt).toBe(
      'Medium Shot. BOB under the awning. BOB steps out of the rain.'
    )
  })
})

describe('an unscoped run still re-plans the whole scene', () => {
  it('plans every active beat even when their stored prompts are current', async () => {
    const beats = buildBeats()
    planBeatSequence.mockResolvedValue({
      plans: [
        { beatIndex: 0, beatRole: 'progression', prompt: 'FRESH one.' },
        { beatIndex: 1, beatRole: 'progression', prompt: 'FRESH two.' },
      ],
      usedAI: true,
    })

    const plans = await runPlanner(beats)

    expect(planBeatSequence).toHaveBeenCalledTimes(1)
    const planned = planBeatSequence.mock.calls[0][0].beats as SceneBeat[]
    expect(planned.map((b) => b.beatId)).toEqual(['bt_one', 'bt_two'])
    expect([...plans.keys()]).toEqual([0, 1])
  })

  it('skips excluded beats', async () => {
    const beats = buildBeats()
    beats[0].excluded = true

    await runPlanner(beats)

    const planned = planBeatSequence.mock.calls[0][0].beats as SceneBeat[]
    expect(planned.map((b) => b.beatId)).toEqual(['bt_two'])
  })
})

describe('the reused plan carries what the orchestrator reads off it', () => {
  it('forbids typography on a beat that is not a title or credit', async () => {
    const beats = buildBeats()

    const plans = await runPlanner(beats, { selectedFrameKeys: ['bt_one'] })

    expect(plans.get(0)!.allowTypography).toBe(false)
  })

  it('allows typography on a title reveal', async () => {
    const beats = buildBeats()
    beats[0].beatRole = 'title_reveal'

    const plans = await runPlanner(beats, { selectedFrameKeys: ['bt_one'] })

    expect(plans.get(0)!.allowTypography).toBe(true)
  })
})

describe('a degraded plan is reported rather than buried', () => {
  function staleBeats(): SceneBeat[] {
    const beats = buildBeats()
    beats[0].storyboardImagePromptDirectionKey = 'stale-fingerprint'
    beats[1].storyboardImagePromptDirectionKey = 'stale-fingerprint'
    return beats
  }

  const plans = [
    { beatIndex: 0, beatRole: 'progression', prompt: 'FRESH one.' },
    { beatIndex: 1, beatRole: 'progression', prompt: 'FRESH two.' },
  ]

  it('carries the planner’s reason onto the image-plan phase event', async () => {
    planBeatSequence.mockResolvedValue({
      plans,
      usedAI: true,
      fallbackReason: 'beat 2 filled deterministically (beat 2 has no usable prompt)',
    })
    const events: ExpressEvent[] = []

    await runPlanner(staleBeats(), {}, (event) => events.push(event))

    expect(imagePlanDone(events)?.ok).toBe(true)
    expect(imagePlanDone(events)?.degraded).toBe(
      'Beat direction fell back: beat 2 filled deterministically (beat 2 has no usable prompt)'
    )
  })

  it('stays quiet when the plan came back whole', async () => {
    planBeatSequence.mockResolvedValue({ plans, usedAI: true })
    const events: ExpressEvent[] = []

    await runPlanner(staleBeats(), {}, (event) => events.push(event))

    const done = imagePlanDone(events)
    expect(done?.ok).toBe(true)
    expect(done && 'degraded' in done).toBe(false)
  })
})

describe('the planner is only shown references it can actually attach', () => {
  function buildProject() {
    return {
      metadata: {
        visionPhase: {
          characters: [
            { name: 'Piper Hayes', referenceImage: 'https://blob.example/piper.jpg' },
            { name: 'Professor Gideon Croft' },
          ],
          references: {
            objectReferences: [
              { name: 'Thirty-Inch Iron Rail Spanner', imageUrl: 'https://blob.example/spanner.jpg' },
              { name: 'Violet Ink Drafting Vellum' },
              { name: 'Olive-Drab Aluminum Cylinder', imageUrl: '   ' },
            ],
            locationReferences: [
              { location: 'SUBMERSIBLE HATCH', imageUrl: 'https://blob.example/hatch.jpg' },
              { location: 'CLANDESTINE STUDIO' },
            ],
          },
        },
      },
    }
  }

  // The catalog tells the planner these labels "have reference images", so a
  // row with no image is a licence to name a prop nothing can be attached to —
  // and the image model then invents a different appearance in every frame.
  it('lists only references that have a generated image', () => {
    const catalog = buildExpressReferenceCatalog(buildProject())

    expect(catalog.characterNames).toEqual(['Piper Hayes'])
    expect(catalog.propNames).toEqual(['Thirty-Inch Iron Rail Spanner'])
    expect(catalog.locationNames).toEqual(['SUBMERSIBLE HATCH'])
  })

  it('returns empty lists for a project with no references at all', () => {
    expect(buildExpressReferenceCatalog({})).toEqual({
      characterNames: [],
      propNames: [],
      locationNames: [],
    })
  })
})

describe('one definition of the frame selection key', () => {
  it('nothing but the helper spells the -end suffix', () => {
    // Client selection and server filtering have to agree on this string, so it
    // gets one definition rather than a copy per call site.
    const callers = [
      'src/lib/sceneGeneration/expressOrchestrator.ts',
      'src/lib/storyboard/expressBeatFrameProgress.ts',
      'src/app/dashboard/workflow/vision/[projectId]/page.tsx',
    ]

    for (const file of callers) {
      const src = readFileSync(join(process.cwd(), file), 'utf8')
      expect(src, file).not.toMatch(/`\$\{beat(\.beatId)?(Id)?\}-end`/)
      expect(src, file).toContain('beatFrameSlotKey')
    }

    const types = readFileSync(join(process.cwd(), 'src/lib/storyboard/types.ts'), 'utf8')
    expect(types).toContain(
      "return frameRole === 'end' ? `${beatId}-end` : beatId"
    )
  })

  it('round-trips both slots of a beat', async () => {
    const { beatFrameSlotKey } = await import('@/lib/storyboard/types')
    expect(beatFrameSlotKey('bt_one')).toBe('bt_one')
    expect(beatFrameSlotKey('bt_one', 'start')).toBe('bt_one')
    expect(beatFrameSlotKey('bt_one', 'end')).toBe('bt_one-end')
  })
})
