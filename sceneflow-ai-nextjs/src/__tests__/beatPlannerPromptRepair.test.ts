import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateText = vi.fn()

vi.mock('@/lib/vertexai/gemini', () => ({
  generateText: (...args: unknown[]) => generateText(...args),
  generateTextCacheAware: (...args: unknown[]) => generateText(...args),
}))

import { buildFallbackBeatPlans } from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  detectBeatIndexOffset,
  planBeatSequence,
  requiredShotSetups,
  type BeatSequencePlanRequest,
} from '@/lib/intelligence/beat-sequence-planner'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const vaultDirection = {
  sceneDescription:
    'Piper crosses the mezzanine toward the vault. Gideon waits with the drill. The door gives.',
  camera: { shots: ['Medium Shot', 'Close-Up', 'Wide Shot'] },
  scene: {
    location: 'Vault antechamber',
    atmosphere: 'Cold sodium light',
    keyProps: ['Core drill', 'Brass keyring'],
  },
  lighting: { overallMood: 'Hard raking key', colorTemperature: 'Sodium amber' },
}

/**
 * Beats as `deriveActionBeatsFromDirection` writes them: the shot the direction
 * assigned to each index is already baked into `actionDescription`.
 */
function buildPrefixedBeats(): SceneBeat[] {
  return [
    {
      beatId: 'b0',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Medium Shot: Piper steps through the antechamber.',
    },
    {
      beatId: 'b1',
      sequenceIndex: 1,
      kind: 'action',
      actionDescription: 'Close-Up: Gideon turns from the vault.',
    },
    {
      beatId: 'b2',
      sequenceIndex: 2,
      kind: 'action',
      actionDescription: 'Wide Shot: the door gives and light floods out.',
    },
  ]
}

function buildFallbackRequest(): BeatSequencePlanRequest {
  return {
    scene: {
      heading: 'INT. VAULT ANTECHAMBER - NIGHT',
      action: 'Piper and Gideon open the vault while the alarm cycles overhead.',
      sceneDirection: vaultDirection,
      duration: 24,
    },
    beats: buildPrefixedBeats(),
    sceneNumber: 2,
    totalScenes: 4,
    forceFallback: true,
  }
}

describe('the fallback beat planner composes one shot and one period', () => {
  it('does not restate a shot the beat action already carries', () => {
    const plans = buildFallbackBeatPlans(buildFallbackRequest())

    expect(plans).toHaveLength(3)
    expect(plans[0].shotType).toBe('Medium Shot')
    expect(plans[0].prompt.match(/Medium Shot:/gi) ?? []).toHaveLength(1)
    expect(plans[1].prompt.match(/Close-Up:/gi) ?? []).toHaveLength(1)
    expect(plans[2].prompt.match(/Wide Shot:/gi) ?? []).toHaveLength(1)
  })

  it('leaves the framing out of the frozen moment it persists on the beat', () => {
    const plans = buildFallbackBeatPlans(buildFallbackRequest())

    // `mergePlannerDirectionIntoBeat` writes this onto `beat.beatDirection`,
    // which carries `shotType` in its own field.
    expect(plans[0].frozenMoment).toMatch(/^Piper steps through the antechamber/)
    expect(plans[1].frozenMoment).toMatch(/^Gideon turns from the vault\./)
    expect(plans[2].frozenMoment).toMatch(/^the door gives and light floods out/)
    for (const plan of plans) {
      expect(plan.frozenMoment).not.toMatch(/^(Medium Shot|Close-Up|Wide Shot):/i)
    }
  })

  it('never doubles a sentence terminator in the composed prompt', () => {
    const plans = buildFallbackBeatPlans(buildFallbackRequest())

    // Clauses arrive with and without their own terminator, and the composed
    // prompt is written back onto the beat and read again next generation.
    expect(plans[1].prompt).toContain('Cold sodium light. No on-screen text')
    for (const plan of plans) {
      expect(plan.prompt).not.toMatch(/\.\s*\./)
      expect(plan.frozenMoment).not.toMatch(/\.\s*\./)
    }
  })

  it('states the set on every beat, once', () => {
    const plans = buildFallbackBeatPlans(buildFallbackRequest())

    for (const plan of plans) {
      expect(plan.frozenMoment).toContain('Vault antechamber')
      expect(plan.frozenMoment).toContain('Cold sodium light')
      expect(plan.frozenMoment.match(/Vault antechamber/g)).toHaveLength(1)
      expect(plan.frozenMoment.match(/Cold sodium light/g)).toHaveLength(1)
    }
  })

  // The scene's prop catalog and the film's look are not this beat's staging.
  // Persisted onto `beatDirection.frozenMoment`, they asked the first and last
  // frames of a scene for objects staged in other beats.
  it('keeps the scene prop catalog and the lighting grammar out of the beat', () => {
    const plans = buildFallbackBeatPlans(buildFallbackRequest())

    for (const plan of plans) {
      expect(plan.frozenMoment).not.toContain('Core drill')
      expect(plan.frozenMoment).not.toContain('Brass keyring')
      expect(plan.frozenMoment).not.toContain('Hard raking key')
      expect(plan.frozenMoment).not.toContain('Sodium amber')
    }
  })

  it('keeps a colon the writer put in the action text', () => {
    const plans = buildFallbackBeatPlans({
      ...buildFallbackRequest(),
      beats: [
        {
          beatId: 'b0',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Stencilled on the door: PROPERTY OF THE CROWN.',
        },
        {
          beatId: 'b1',
          sequenceIndex: 1,
          kind: 'action',
          actionDescription: 'Gideon reads it twice.',
        },
      ],
    })

    expect(plans[0].frozenMoment).toMatch(/^Stencilled on the door: PROPERTY OF THE CROWN/)
  })
})

describe('detectBeatIndexOffset', () => {
  it('shifts a one-based run down', () => {
    expect(detectBeatIndexOffset([1, 2, 3], 3)).toBe(-1)
  })

  it('leaves a zero-based run alone', () => {
    expect(detectBeatIndexOffset([0, 1, 2], 3)).toBe(0)
  })

  it('leaves a partial run alone rather than guessing', () => {
    expect(detectBeatIndexOffset([1, 2], 3)).toBe(0)
  })

  it('leaves an out-of-range run alone', () => {
    expect(detectBeatIndexOffset([1, 2, 9], 3)).toBe(0)
    expect(detectBeatIndexOffset([], 3)).toBe(0)
  })
})

describe('requiredShotSetups', () => {
  it('scales with the length of the scene', () => {
    expect(requiredShotSetups(2)).toBe(2)
    expect(requiredShotSetups(3)).toBe(2)
    expect(requiredShotSetups(15)).toBe(5)
  })
})

function buildAiRequest(
  beatCount: number,
  projectId: string
): BeatSequencePlanRequest {
  return {
    scene: {
      heading: 'INT. VAULT ANTECHAMBER - NIGHT',
      action: 'Piper and Gideon open the vault while the alarm cycles overhead.',
      sceneDirection: vaultDirection,
    },
    beats: Array.from({ length: beatCount }, (_, index) => ({
      beatId: `b${index}`,
      sequenceIndex: index,
      kind: 'action' as const,
      actionDescription: `Beat ${index + 1}: the drill bites deeper.`,
    })),
    sceneNumber: 2,
    totalScenes: 4,
    projectId,
  }
}

function respondWith(beats: Array<Record<string, unknown>>) {
  generateText.mockResolvedValue({ text: JSON.stringify({ reasoning: 'arc', beats }) })
}

function plannedBeat(beatIndex: number, shot: string, moment: string) {
  return {
    beatIndex,
    shotType: shot,
    frozenMoment: moment,
    prompt: `${shot}: ${moment} — the antechamber holds its cold sodium key.`,
  }
}

describe('a recoverable plan is repaired rather than thrown away', () => {
  beforeEach(() => {
    generateText.mockReset()
  })

  it('renumbers a one-based response so no beat is left unplanned', async () => {
    respondWith([
      plannedBeat(1, 'Wide Shot', 'Piper crosses the mezzanine'),
      plannedBeat(2, 'Close-Up', 'Gideon seats the drill bit'),
      plannedBeat(3, 'Medium Shot', 'the door gives'),
    ])

    const result = await planBeatSequence(buildAiRequest(3, 'one-based-project'))

    expect(result.usedAI).toBe(true)
    expect(result.fallbackReason).toBeUndefined()
    expect(result.plans.map((plan) => plan.beatIndex)).toEqual([0, 1, 2])
    expect(result.plans[0].frozenMoment).toBe('Piper crosses the mezzanine')
    expect(result.plans[2].frozenMoment).toBe('the door gives')
  })

  it('keeps the first plan for a repeated beat and fills what is left', async () => {
    respondWith([
      plannedBeat(0, 'Wide Shot', 'Piper crosses the mezzanine'),
      plannedBeat(1, 'Close-Up', 'Gideon seats the drill bit'),
      plannedBeat(1, 'Close-Up', 'Gideon seats the drill bit again'),
    ])

    const result = await planBeatSequence(buildAiRequest(3, 'repeat-project'))

    expect(result.usedAI).toBe(true)
    expect(result.plans).toHaveLength(3)
    expect(result.plans[1].frozenMoment).toBe('Gideon seats the drill bit')
    expect(result.plans[2].frozenMoment).toContain('the drill bites deeper')
    expect(result.fallbackReason).toContain('beat 3 filled deterministically')
    expect(result.fallbackReason).toContain('beat 2 was planned twice')
  })

  it('fills a beat the planner skipped instead of losing the scene', async () => {
    respondWith([
      plannedBeat(0, 'Wide Shot', 'Piper crosses the mezzanine'),
      plannedBeat(2, 'Medium Shot', 'the door gives'),
    ])

    const result = await planBeatSequence(buildAiRequest(3, 'gap-project'))

    expect(result.usedAI).toBe(true)
    expect(result.plans).toHaveLength(3)
    expect(result.plans[0].frozenMoment).toBe('Piper crosses the mezzanine')
    expect(result.plans[2].frozenMoment).toBe('the door gives')
    expect(result.plans[1].frozenMoment).toContain('the drill bites deeper')
    expect(result.fallbackReason).toContain('beat 2 filled deterministically')
  })

  it('fills a beat whose prompt came back empty', async () => {
    respondWith([
      plannedBeat(0, 'Wide Shot', 'Piper crosses the mezzanine'),
      { beatIndex: 1, shotType: 'Close-Up', frozenMoment: 'Gideon seats the bit', prompt: '' },
      plannedBeat(2, 'Medium Shot', 'the door gives'),
    ])

    const result = await planBeatSequence(buildAiRequest(3, 'empty-prompt-project'))

    expect(result.usedAI).toBe(true)
    expect(result.plans).toHaveLength(3)
    expect(result.fallbackReason).toContain('beat 2 has no usable prompt')
  })

  it('drops a beat numbered past the end of the scene', async () => {
    respondWith([
      plannedBeat(0, 'Wide Shot', 'Piper crosses the mezzanine'),
      plannedBeat(1, 'Close-Up', 'Gideon seats the drill bit'),
      plannedBeat(7, 'Medium Shot', 'a beat this scene does not have'),
    ])

    const result = await planBeatSequence(buildAiRequest(3, 'overrun-project'))

    expect(result.usedAI).toBe(true)
    expect(result.plans).toHaveLength(3)
    expect(result.fallbackReason).toContain('outside the scene')
  })
})

describe('the variety gate scales with scene length', () => {
  beforeEach(() => {
    generateText.mockReset()
  })

  it('rejects fifteen beats that hold one setup but for a single frame', async () => {
    respondWith([
      ...Array.from({ length: 14 }, (_, index) =>
        plannedBeat(index, 'Medium Shot', 'Piper and Gideon face the vault')
      ),
      plannedBeat(14, 'Wide Shot', 'the door gives'),
    ])

    const result = await planBeatSequence(buildAiRequest(15, 'monotone-project'))

    expect(result.usedAI).toBe(false)
    expect(result.plans).toHaveLength(15)
    expect(result.fallbackReason).toContain('2 distinct setup(s) across 15 beats')
    expect(result.fallbackReason).toContain('needs 5')
  })

  it('accepts fifteen beats that actually change setup', async () => {
    respondWith(
      Array.from({ length: 15 }, (_, index) =>
        plannedBeat(index, `Setup ${index} shot`, `Moment ${index} on the vault floor`)
      )
    )

    const result = await planBeatSequence(buildAiRequest(15, 'varied-project'))

    expect(result.usedAI).toBe(true)
    expect(result.fallbackReason).toBeUndefined()
  })

  it('still rejects two identical beats', async () => {
    respondWith([
      plannedBeat(0, 'Wide Shot', 'Piper crosses the mezzanine'),
      plannedBeat(1, 'Wide Shot', 'Piper crosses the mezzanine'),
    ])

    const result = await planBeatSequence(buildAiRequest(2, 'twin-project'))

    expect(result.usedAI).toBe(false)
  })
})

describe('a fallback says why it happened', () => {
  beforeEach(() => {
    generateText.mockReset()
  })

  it('names an empty planner response', async () => {
    respondWith([])

    const result = await planBeatSequence(buildAiRequest(3, 'empty-project'))

    expect(result.usedAI).toBe(false)
    expect(result.fallbackReason).toBe('planner response carried no beats')
  })

  it('names a thrown planner error', async () => {
    generateText.mockRejectedValue(new Error('quota exhausted'))

    const result = await planBeatSequence(buildAiRequest(3, 'thrown-project'))

    expect(result.usedAI).toBe(false)
    expect(result.fallbackReason).toBe('quota exhausted')
  })

  it('says nothing when the planner was never asked', async () => {
    const result = await planBeatSequence({
      ...buildAiRequest(3, 'forced-project'),
      forceFallback: true,
    })

    expect(result.usedAI).toBe(false)
    expect(result.fallbackReason).toBeUndefined()
    expect(generateText).not.toHaveBeenCalled()
  })
})
