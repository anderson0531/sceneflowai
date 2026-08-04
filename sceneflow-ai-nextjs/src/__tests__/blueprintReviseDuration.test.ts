import { describe, expect, it } from 'vitest'
import { finalizeGuidedRevise, type GuidedRevisePayload } from '@/lib/treatment/runGuidedRevise'
import type { BlueprintChangePlan } from '@/lib/treatment/blueprintRevisionTypes'

const plan: BlueprintChangePlan = {
  primaryGoal: 'Increase the duration to 40 minutes',
  sectionsToUpdate: ['beats', 'story'],
  crossSectionDependencies: [],
  preserveConstraints: [],
  coherenceActions: [],
}

function payload(): GuidedRevisePayload {
  const rawVariant: Record<string, unknown> = {
    title: 'The Mud Flood',
    synopsis: 'A buried city surfaces.',
    genre: 'Documentary Thriller',
    // The original 10 minute sheet the user started from.
    beats: [
      { title: 'Intro', intent: 'Set up', synopsis: 'Croft welcomes us.', minutes: 1.5 },
      { title: 'Obsession', intent: 'Raise stakes', synopsis: 'Pendelton digs in.', minutes: 3 },
    ],
    total_duration_seconds: 270,
    estimatedDurationMinutes: 5,
  }
  return {
    rawVariant,
    preservedCharacterAssets: {},
    variant: rawVariant,
    intentText: 'Increase the duration to 40 minutes',
    selectedRecs: [],
    focusScope: 'all',
    contentIntent: 'fiction',
  }
}

function beatsSummingTo(totalMinutes: number, count: number) {
  const per = totalMinutes / count
  return Array.from({ length: count }, (_, i) => ({
    title: `Beat ${i + 1}`,
    intent: 'Advance the story',
    synopsis: `Beat ${i + 1} plays out.`,
    minutes: per,
  }))
}

describe('finalizeGuidedRevise duration coherence', () => {
  it('derives runtime from the revised beat minutes', () => {
    const result = finalizeGuidedRevise(payload(), plan, {
      beats: beatsSummingTo(40, 16),
    })

    expect(result.patch.total_duration_seconds).toBe(40 * 60)
    expect(result.patch.estimatedDurationMinutes).toBe(40)
  })

  it('overrides a duration the model reported inconsistently', () => {
    const result = finalizeGuidedRevise(payload(), plan, {
      beats: beatsSummingTo(40, 16),
      total_duration_seconds: 600,
      estimatedDurationMinutes: 10,
    })

    expect(result.patch.total_duration_seconds).toBe(40 * 60)
    expect(result.patch.estimatedDurationMinutes).toBe(40)
  })

  it('carries all revised beats through instead of clipping at 8', () => {
    const result = finalizeGuidedRevise(payload(), plan, {
      beats: beatsSummingTo(40, 16),
    })
    expect((result.patch.beats as unknown[]).length).toBe(16)
  })

  it('leaves duration untouched when the patch has no beats', () => {
    const result = finalizeGuidedRevise(payload(), plan, {
      synopsis: 'A tighter synopsis.',
    })
    expect(result.patch.total_duration_seconds).toBeUndefined()
    expect(result.patch.estimatedDurationMinutes).toBeUndefined()
  })

  it('reports a beats diff so the preview can show the new sheet', () => {
    const result = finalizeGuidedRevise(payload(), plan, {
      beats: beatsSummingTo(40, 16),
    })
    const beatsDiff = result.diff.find((d) => d.field === 'beats')
    expect(beatsDiff).toBeTruthy()
    expect(beatsDiff?.after).toContain('Beat 16')
  })
})
