import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'

const generateText = vi.hoisted(() => vi.fn())
vi.mock('@/lib/vertexai/gemini', () => ({ generateText }))

const {
  buildGuidedRevisePayload,
  finalizeGuidedRevise,
  GuidedReviseTruncatedError,
  modelForRewriteStep,
  resolveInitialPlan,
  runConsolidatedRewrite,
  runSequentialSectionRewrites,
  shouldRunPlanner,
  tokensForConsolidatedRewrite,
  REWRITE_TOKENS_CONSOLIDATED,
} = await import('@/lib/treatment/runGuidedRevise')
const { capPatchSize, mergeRevisionIntoVariant } = await import(
  '@/lib/treatment/blueprintRevisionDiff'
)

const baseVariant = {
  title: 'Test Film',
  logline: 'A logline.',
  genre: 'Thriller',
  synopsis: 'A short synopsis.',
  beats: [{ title: 'Beat 1', synopsis: 'Opening', minutes: 2 }],
}

describe('runGuidedRevise', () => {
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

  it('infers sections from the English copy of non-English direction', () => {
    // Section keywords are English, so Spanish direction on its own collapsed to
    // a story-only plan and quietly ignored the beats the creator asked about.
    const spanish = 'Ajusta el ritmo de la segunda mitad'
    const withoutRouting = buildGuidedRevisePayload({
      incomingVariant: baseVariant,
      userIntent: spanish,
      storyLocale: 'es',
    })
    expect(
      resolveInitialPlan(undefined, withoutRouting.intentText, withoutRouting.selectedRecs)
        .sectionsToUpdate
    ).toEqual(['story'])

    const withRouting = buildGuidedRevisePayload({
      incomingVariant: baseVariant,
      userIntent: spanish,
      storyLocale: 'es',
      intentTextForRouting: 'Adjust the pacing of the second half',
    })
    // The prompts still receive the creator's own words.
    expect(withRouting.intentText).toBe(spanish)
    expect(
      resolveInitialPlan(undefined, withRouting.intentTextForRouting!, withRouting.selectedRecs)
        .sectionsToUpdate
    ).toContain('beats')
  })

  it('modelForRewriteStep uses the Flash workhorse for every rewrite', () => {
    // The `pro` tier resolved to an older preview model that the step then ran
    // with reasoning off, so it was slower with nothing to show for it.
    expect(modelForRewriteStep(4, 'all')).toBe('gemini-3.8-flash')
    expect(modelForRewriteStep(1, 'story')).toBe('gemini-3.8-flash')
  })

  it('tokensForConsolidatedRewrite budgets a whole beat sheet for multi-section plans', () => {
    const single = tokensForConsolidatedRewrite(['story'])
    const consolidated = tokensForConsolidatedRewrite(['characters', 'story', 'beats'])
    expect(consolidated).toBeGreaterThanOrEqual(REWRITE_TOKENS_CONSOLIDATED)
    expect(consolidated).toBeGreaterThan(single)
    expect(consolidated).toBeLessThan(65536)
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

describe('the rewrite stage', () => {
  const payload = buildGuidedRevisePayload({
    incomingVariant: baseVariant,
    userIntent: 'Give the characters more depth',
  })
  // "More character depth" fans out to three beat-emitting sections, which is
  // exactly the plan shape that used to cost three full beat-sheet rewrites.
  const plan = {
    primaryGoal: 'Deepen characters',
    sectionsToUpdate: ['characters', 'story', 'beats'] as BlueprintFixSection[],
    crossSectionDependencies: [],
    preserveConstraints: [],
    coherenceActions: [],
  }

  beforeEach(() => {
    generateText.mockReset()
  })

  it('issues one call for a multi-section plan', async () => {
    generateText.mockResolvedValue({
      text: JSON.stringify({ beats: [{ title: 'Beat 1', synopsis: 'x', minutes: 3 }] }),
      finishReason: 'STOP',
    })

    const patch = await runConsolidatedRewrite(payload, plan)

    expect(generateText).toHaveBeenCalledTimes(1)
    expect(patch.beats).toHaveLength(1)
  })

  it('reasons at high effort on the Flash workhorse', async () => {
    generateText.mockResolvedValue({ text: '{}', finishReason: 'STOP' })

    await runConsolidatedRewrite(payload, plan)

    const options = generateText.mock.calls[0][1]
    expect(options.model).toBe('gemini-3.8-flash')
    expect(options.thinkingLevel).toBe('high')
    expect(options.maxOutputTokens).toBeGreaterThanOrEqual(REWRITE_TOKENS_CONSOLIDATED)
  })

  it('reports truncation so the caller can fall back per section', async () => {
    generateText.mockResolvedValue({ text: '{"beats": [', finishReason: 'MAX_TOKENS' })

    await expect(runConsolidatedRewrite(payload, plan)).rejects.toThrow(
      GuidedReviseTruncatedError
    )
  })

  it('propagates non-truncation failures untouched', async () => {
    generateText.mockRejectedValue(new Error('Vertex AI quota exhausted'))

    await expect(runConsolidatedRewrite(payload, plan)).rejects.toThrow('quota exhausted')
    expect(generateText).toHaveBeenCalledTimes(1)
  })

  it('splits into one narrower call per section on the fallback path', async () => {
    generateText.mockResolvedValue({
      text: JSON.stringify({ synopsis: 'Rewritten' }),
      finishReason: 'STOP',
    })

    const patch = await runSequentialSectionRewrites(payload, plan)

    expect(generateText).toHaveBeenCalledTimes(plan.sectionsToUpdate.length)
    expect(patch.synopsis).toBe('Rewritten')
    for (const [, options] of generateText.mock.calls) {
      expect(options.maxOutputTokens).toBeLessThan(REWRITE_TOKENS_CONSOLIDATED)
    }
  })
})
