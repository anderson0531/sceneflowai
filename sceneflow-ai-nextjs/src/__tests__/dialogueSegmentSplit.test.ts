import { describe, it, expect } from 'vitest'
import {
  estimateSpokenDurationSeconds,
  planDialogueLineSplits,
  splitSpokenTextAtBoundaries,
  VEO_DIALOGUE_CLIP_MAX_SEC,
} from '@/lib/scene/dialogueSegmentSplit'

describe('dialogueSegmentSplit', () => {
  it('estimates duration from word count', () => {
    const dur = estimateSpokenDurationSeconds('one two three four five six seven eight nine ten')
    expect(dur).toBeGreaterThanOrEqual(3)
    expect(dur).toBeLessThanOrEqual(5)
  })

  it('does not split short lines', () => {
    const parts = splitSpokenTextAtBoundaries('Hello there.', VEO_DIALOGUE_CLIP_MAX_SEC)
    expect(parts).toHaveLength(1)
    expect(parts[0]).toContain('Hello')
  })

  it('splits long dialogue into multiple parts under the cap', () => {
    const long =
      'I need to tell you something important about what happened last night at the warehouse. ' +
      'When the alarms went off we ran toward the loading dock but the doors were already sealed. ' +
      'Nobody could get out until morning and by then the evidence was gone.'
    const parts = splitSpokenTextAtBoundaries(long, VEO_DIALOGUE_CLIP_MAX_SEC)
    expect(parts.length).toBeGreaterThan(1)
    for (const p of parts) {
      expect(estimateSpokenDurationSeconds(p)).toBeLessThanOrEqual(VEO_DIALOGUE_CLIP_MAX_SEC + 2)
    }
  })

  it('plans veo durations per part', () => {
    const long =
      'This is the first sentence of a very long speech. ' +
      'Here is another sentence that continues the same thought for quite a while. ' +
      'And a third sentence to push us past the dialogue clip limit for Veo generation.'
    const plan = planDialogueLineSplits(long, VEO_DIALOGUE_CLIP_MAX_SEC)
    expect(plan.length).toBeGreaterThan(1)
    expect(plan[0].veoDuration).toBeGreaterThanOrEqual(4)
    expect(plan.every((p) => p.partCount === plan.length)).toBe(true)
  })
})
