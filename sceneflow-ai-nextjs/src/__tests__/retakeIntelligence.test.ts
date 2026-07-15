import { describe, it, expect } from 'vitest'
import { mergeNegativePrompt, parseRetakePlan } from '@/lib/video/retakeIntelligence'

const BASE_PROMPT =
  'Wide shot of a cafe. <<<char_01>>> sits at the table. Maya speaks, "Good morning."'

describe('parseRetakePlan', () => {
  it('parses valid JSON retake plan', () => {
    const json = JSON.stringify({
      anomalyOrigin: 'frame',
      revisedPrompt: 'Wide shot of a cafe. <<<char_01>>> sits at an empty table. Maya speaks, "Good morning."',
      negativePromptAdditions: 'coffee cup, mug on table',
      frameEditRecommended: true,
      frameEditInstruction: 'Remove the coffee cup on the table, keep everything else identical.',
      changesSummary: [
        {
          category: 'Frame',
          change: 'Remove coffee cup from start frame',
          rationale: 'Object is baked into the frame-locked image.',
        },
      ],
      retakeSummary: 'Remove the coffee cup from the starting frame and prompt.',
    })

    const plan = parseRetakePlan(json, BASE_PROMPT)

    expect(plan.anomalyOrigin).toBe('frame')
    expect(plan.frameEditRecommended).toBe(true)
    expect(plan.frameEditInstruction).toContain('coffee cup')
    expect(plan.negativePromptAdditions).toContain('coffee cup')
    expect(plan.changesSummary).toHaveLength(1)
    expect(plan.retakeSummary).toContain('coffee cup')
    expect(plan.revisedPrompt).toContain('<<<char_01>>>')
    expect(plan.revisedPrompt).toContain('Maya speaks')
  })

  it('preserves <<<element>>> tags in revised prompt', () => {
    const json = JSON.stringify({
      anomalyOrigin: 'motion',
      revisedPrompt:
        '<<<prop_12>>> on the counter. <<<char_02>>> waves. Alex speaks, "Hello."',
      negativePromptAdditions: 'extra pedestrians',
      frameEditRecommended: false,
      changesSummary: [],
      retakeSummary: 'Tighten motion and block stray pedestrians.',
    })

    const plan = parseRetakePlan(json)
    expect(plan.revisedPrompt).toContain('<<<prop_12>>>')
    expect(plan.revisedPrompt).toContain('<<<char_02>>>')
    expect(plan.revisedPrompt).toContain('Alex speaks')
  })

  it('falls back to prompt-only when JSON is malformed', () => {
    const malformed = 'Remove the coffee cup and keep <<<char_01>>> unchanged.'
    const plan = parseRetakePlan(malformed, BASE_PROMPT)

    expect(plan.anomalyOrigin).toBe('unknown')
    expect(plan.frameEditRecommended).toBe(false)
    expect(plan.negativePromptAdditions).toBe('')
    expect(plan.changesSummary).toEqual([])
    expect(plan.revisedPrompt).toBe(malformed)
    expect(plan.retakeSummary).toContain('Prompt-only')
  })
})

describe('mergeNegativePrompt', () => {
  it('joins existing and additions without duplicates', () => {
    const merged = mergeNegativePrompt(
      'blurry, low quality, coffee cup',
      'coffee cup, extra limbs, watermark'
    )

    expect(merged).toBe('blurry, low quality, coffee cup, extra limbs, watermark')
  })

  it('dedupes case-insensitively', () => {
    const merged = mergeNegativePrompt('Coffee Cup, blur', 'coffee cup, BLUR')
    expect(merged).toBe('Coffee Cup, blur')
  })

  it('returns additions when existing is empty', () => {
    expect(mergeNegativePrompt('', 'text, logo')).toBe('text, logo')
  })

  it('returns existing when additions are empty', () => {
    expect(mergeNegativePrompt('grain, noise', '')).toBe('grain, noise')
  })
})
