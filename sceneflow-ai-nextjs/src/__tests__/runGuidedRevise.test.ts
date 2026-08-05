import { describe, expect, it } from 'vitest'
import {
  buildGuidedRevisePayload,
  finalizeGuidedRevise,
  modelForRewriteStep,
  resolveInitialPlan,
  shouldRunPlanner,
} from '@/lib/treatment/runGuidedRevise'
import { capPatchSize, mergeRevisionIntoVariant } from '@/lib/treatment/blueprintRevisionDiff'

describe('runGuidedRevise', () => {
  const baseVariant = {
    title: 'Test Film',
    logline: 'A logline.',
    genre: 'Thriller',
    synopsis: 'A short synopsis.',
    beats: [{ title: 'Beat 1', synopsis: 'Opening', minutes: 2 }],
  }

  it('buildGuidedRevisePayload strips and trims variant', () => {
    const payload = buildGuidedRevisePayload({
      incomingVariant: baseVariant,
      userIntent: 'Tighten act two pacing',
    })
    expect(payload.intentText).toContain('Tighten act two')
    expect(payload.variant.synopsis).toBeTruthy()
    expect(payload.rawVariant.title).toBe('Test Film')
  })

  it('resolveInitialPlan infers story from user intent', () => {
    const payload = buildGuidedRevisePayload({
      incomingVariant: baseVariant,
      userIntent: 'Improve the synopsis opening',
    })
    const plan = resolveInitialPlan(undefined, payload.intentText, payload.selectedRecs)
    expect(plan.sectionsToUpdate).toContain('story')
    expect(shouldRunPlanner(undefined, payload.selectedRecs, payload.intentText)).toBe(false)
  })

  it('modelForRewriteStep uses pro for full balance', () => {
    expect(modelForRewriteStep(4, 'all')).toContain('pro')
    expect(modelForRewriteStep(1, 'story')).toContain('flash')
  })

  it('finalizeGuidedRevise returns patch and diff without full variant', () => {
    const payload = buildGuidedRevisePayload({
      incomingVariant: baseVariant,
      userIntent: 'Sharpen synopsis',
    })
    const plan = resolveInitialPlan(undefined, payload.intentText, payload.selectedRecs)
    const patch = { synopsis: 'A sharper synopsis.' }
    const result = finalizeGuidedRevise(payload, plan, patch)
    expect(result.patch.synopsis).toBe('A sharper synopsis.')
    expect(result.diff.some((d) => d.field === 'synopsis')).toBe(true)
    expect(result.changePlan.primaryGoal).toBeTruthy()
  })

  it('capPatchSize truncates oversized synopsis', () => {
    const huge = 'x'.repeat(9000)
    const capped = capPatchSize({ synopsis: huge })
    expect(String(capped.synopsis).length).toBeLessThan(9000)
  })

  it('mergeRevisionIntoVariant applies patch fields', () => {
    const merged = mergeRevisionIntoVariant(baseVariant, { logline: 'New logline.' })
    expect(merged.logline).toBe('New logline.')
    expect(merged.title).toBe('Test Film')
  })
})
