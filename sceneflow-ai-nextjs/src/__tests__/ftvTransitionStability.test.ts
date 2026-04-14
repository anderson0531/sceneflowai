import { describe, expect, it } from 'vitest'
import { appendFtvTransitionStabilityTokens } from '@/lib/vision/ftvTransitionStability'

describe('appendFtvTransitionStabilityTokens', () => {
  const basePrompt = 'Medium shot. Controlled camera move.'

  it('does not modify non-FTV prompts', () => {
    const out = appendFtvTransitionStabilityTokens(basePrompt, 'T2V', 3)
    expect(out).toBe(basePrompt)
  })

  it('does not modify FTV prompt for segment 1', () => {
    const out = appendFtvTransitionStabilityTokens(basePrompt, 'FTV', 0)
    expect(out).toBe(basePrompt)
  })

  it('appends stability tokens for FTV prompts after segment 1', () => {
    const out = appendFtvTransitionStabilityTokens(basePrompt, 'FTV', 2)
    expect(out).toContain('Maintain pixel-perfect consistency with the start frame.')
    expect(out).toContain('Ensure lighting and shadows remain static.')
    expect(out).toContain('Smooth facial muscle transitions; prioritize natural lip movement.')
  })
})
