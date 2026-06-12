import { describe, expect, it } from 'vitest'
import { resolveStartFrameGenerationPlan } from '@/app/api/production/generate-segment-frames/route'

const PREVIZ_URL = 'https://example.com/previz-beat-1.jpg'

describe('resolveStartFrameGenerationPlan', () => {
  it('skips start regeneration for both when Pre-Vis URL is provided', () => {
    const plan = resolveStartFrameGenerationPlan({
      frameType: 'both',
      providedStartFrameUrl: PREVIZ_URL,
    })
    expect(plan.skipStartGeneration).toBe(true)
    expect(plan.preservedStartUrl).toBe(PREVIZ_URL)
  })

  it('skips start regeneration for start-only when Pre-Vis URL is provided', () => {
    const plan = resolveStartFrameGenerationPlan({
      frameType: 'start',
      providedStartFrameUrl: PREVIZ_URL,
    })
    expect(plan.skipStartGeneration).toBe(true)
  })

  it('regenerates start when forceRegenerateStart is true', () => {
    const plan = resolveStartFrameGenerationPlan({
      frameType: 'start',
      providedStartFrameUrl: PREVIZ_URL,
      forceRegenerateStart: true,
    })
    expect(plan.skipStartGeneration).toBe(false)
  })

  it('does not skip when generating end-only', () => {
    const plan = resolveStartFrameGenerationPlan({
      frameType: 'end',
      providedStartFrameUrl: PREVIZ_URL,
    })
    expect(plan.skipStartGeneration).toBe(false)
    expect(plan.preservedStartUrl).toBe(PREVIZ_URL)
  })

  it('does not skip when no Pre-Vis URL exists', () => {
    const plan = resolveStartFrameGenerationPlan({
      frameType: 'both',
    })
    expect(plan.skipStartGeneration).toBe(false)
    expect(plan.preservedStartUrl).toBeUndefined()
  })
})
