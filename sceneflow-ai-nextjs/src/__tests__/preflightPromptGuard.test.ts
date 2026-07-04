import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  scorePromptRisk,
  neutralizePromptForVeo,
  clearPreflightRewriteCache,
} from '@/lib/generation/preflightPromptGuard'

vi.mock('@/lib/vertexai/gemini', () => ({
  generateText: vi.fn(),
  generateWithVision: vi.fn(),
}))

import { generateText } from '@/lib/vertexai/gemini'

describe('preflightPromptGuard', () => {
  beforeEach(() => {
    clearPreflightRewriteCache()
    vi.clearAllMocks()
    process.env.PREFLIGHT_REWRITE_ENABLED = 'true'
    process.env.PREFLIGHT_IMAGE_CHECK_ENABLED = 'false'
  })

  afterEach(() => {
    delete process.env.PREFLIGHT_REWRITE_ENABLED
    delete process.env.PREFLIGHT_IMAGE_CHECK_ENABLED
  })

  it('scores interrogation dialogue as borderline or high', () => {
    const score = scorePromptRisk(
      "Elara leans forward defensively, desperate defiance as she pleads her innocence. ELARA VANCE says: 'Someone framed me.'"
    )
    expect(['borderline', 'high']).toContain(score.level)
    expect(score.triggers.length).toBeGreaterThan(0)
  })

  it('scores benign prompts as low risk', () => {
    const score = scorePromptRisk('Slow dolly push-in on a character walking through a sunlit garden.')
    expect(score.level).toBe('low')
  })

  it('skips Flash rewrite for low-risk prompts', async () => {
    const result = await neutralizePromptForVeo({
      prompt: 'A calm walk through a park at golden hour.',
    })
    expect(result.wasRewritten).toBe(false)
    expect(generateText).not.toHaveBeenCalled()
  })

  it('rewrites borderline prompts via Flash', async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify({
        prompt: 'Leaning forward earnestly during a formal interview.',
      }),
      model: 'gemini-3.1-flash-lite-preview',
    })

    const original =
      "Desperate defiance as she pleads her innocence in the interrogation room. ELARA says: 'It wasn't me.'"
    const result = await neutralizePromptForVeo({ prompt: original })

    expect(generateText).toHaveBeenCalledTimes(1)
    expect(result.wasRewritten).toBe(true)
    expect(result.prompt).toContain('formal interview')
  })

  it('falls through to original prompt when Flash rewrite fails', async () => {
    vi.mocked(generateText).mockRejectedValue(new Error('timeout'))

    const original = 'Desperate defiance during interrogation.'
    const result = await neutralizePromptForVeo({ prompt: original })

    expect(result.prompt).toBe(original)
    expect(result.wasRewritten).toBe(false)
  })
})
