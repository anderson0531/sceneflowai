import { describe, expect, it } from 'vitest'
import { deriveRuntimeFieldsFromBeats } from '@/lib/treatment/duration'
import { finalizeGuidedRevise, type GuidedRevisePayload } from '@/lib/treatment/runGuidedRevise'
import { formatBlueprintRuntime } from '@/lib/blueprint/formatBlueprintCore'
import type { BlueprintChangePlan } from '@/lib/treatment/blueprintRevisionTypes'

const plan: BlueprintChangePlan = {
  primaryGoal: 'Increase the duration to 40 minutes',
  sectionsToUpdate: ['beats'],
  crossSectionDependencies: [],
  preserveConstraints: [],
  coherenceActions: [],
}

/** A 10 minute blueprint, the state before the user asked for 40. */
function tenMinutePayload(): GuidedRevisePayload {
  const rawVariant: Record<string, unknown> = {
    title: 'The Unseen Archive',
    format_length: '600 seconds',
    total_duration_seconds: 600,
    estimatedDurationMinutes: 10,
    beats: [{ title: 'Old', intent: 'x', synopsis: 'y', minutes: 10 }],
  }
  return {
    rawVariant,
    preservedCharacterAssets: {},
    variant: rawVariant,
    intentText: 'Increase the duration to 40 minutes',
    selectedRecs: [],
    focusScope: 'beats',
    contentIntent: 'fiction',
  }
}

/** The sheet the user actually got back: 3+4+4+3+5+5+5+5+4+2 = 40 minutes. */
const fortyMinuteBeats = [3, 4, 4, 3, 5, 5, 5, 5, 4, 2].map((minutes, i) => ({
  title: `Beat ${i + 1}`,
  intent: 'Advance the story',
  synopsis: `Beat ${i + 1} plays out.`,
  minutes,
}))

describe('deriveRuntimeFieldsFromBeats', () => {
  it('derives all three runtime views from one beat sheet', () => {
    expect(deriveRuntimeFieldsFromBeats(fortyMinuteBeats)).toEqual({
      total_duration_seconds: 2400,
      estimatedDurationMinutes: 40,
      format_length: '2400 seconds',
    })
  })

  it('keeps the "N seconds" shape that downstream parsers expect', () => {
    const derived = deriveRuntimeFieldsFromBeats([{ minutes: 1.5 }])
    expect(derived?.format_length).toBe('90 seconds')
    // projects/from-variant parses seconds straight back out of this string.
    expect(derived?.format_length.match(/(\d+)/)?.[1]).toBe('90')
  })

  it('rounds fractional totals to whole seconds', () => {
    expect(deriveRuntimeFieldsFromBeats([{ minutes: 0.25 }])).toEqual({
      total_duration_seconds: 15,
      estimatedDurationMinutes: 1,
      format_length: '15 seconds',
    })
  })

  it('returns null when there is nothing to derive from', () => {
    expect(deriveRuntimeFieldsFromBeats([])).toBeNull()
    expect(deriveRuntimeFieldsFromBeats(undefined)).toBeNull()
    expect(deriveRuntimeFieldsFromBeats('not an array')).toBeNull()
    expect(deriveRuntimeFieldsFromBeats([{ minutes: 0 }])).toBeNull()
    expect(deriveRuntimeFieldsFromBeats([{ title: 'no minutes' }])).toBeNull()
  })
})

describe('Format chip after a beats revision', () => {
  it('REGRESSION: the Format chip follows the revised beat total', () => {
    const result = finalizeGuidedRevise(tenMinutePayload(), plan, { beats: fortyMinuteBeats })
    const merged = { ...tenMinutePayload().rawVariant, ...result.patch }

    // What the Format badge in TreatmentCard actually renders.
    expect(formatBlueprintRuntime(String(merged.format_length)).display).toBe('40 min')
  })

  it('restates every runtime field together', () => {
    const result = finalizeGuidedRevise(tenMinutePayload(), plan, { beats: fortyMinuteBeats })
    expect(result.patch.total_duration_seconds).toBe(2400)
    expect(result.patch.estimatedDurationMinutes).toBe(40)
    expect(result.patch.format_length).toBe('2400 seconds')
  })

  it('overrides runtime the model reported inconsistently', () => {
    const result = finalizeGuidedRevise(tenMinutePayload(), plan, {
      beats: fortyMinuteBeats,
      format_length: '600 seconds',
      total_duration_seconds: 600,
      estimatedDurationMinutes: 10,
    })
    expect(result.patch.format_length).toBe('2400 seconds')
    expect(result.patch.total_duration_seconds).toBe(2400)
  })

  it('leaves runtime untouched when the revision does not change beats', () => {
    const result = finalizeGuidedRevise(tenMinutePayload(), plan, {
      synopsis: 'A tighter synopsis.',
    })
    expect(result.patch.format_length).toBeUndefined()
    expect(result.patch.total_duration_seconds).toBeUndefined()
  })
})
