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

  it('does not treat a framed photograph as criminal framing', () => {
    const score = scorePromptRisk(
      'Beside his cheek, a cracked framed silver gelatin photograph of Sarah lies flat against the masonry.'
    )
    expect(score.triggers).not.toContain('framed')
    expect(score.level).toBe('low')
  })

  it('still flags criminal framed-me dialogue', () => {
    const score = scorePromptRisk("ELARA VANCE says: 'Someone framed me for the theft.'")
    expect(score.triggers).toContain('framed')
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
      model: 'gemini-3.1-flash-lite',
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
    expect(generateText).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ maxRetries: 0 })
    )
  })

  it('keeps the original prompt when the flash rewrite is rate limited', async () => {
    vi.mocked(generateText).mockRejectedValue(
      new Error('HTTP 429: Resource exhausted. Please try again later.')
    )

    const original = 'Desperate defiance during interrogation.'
    const result = await neutralizePromptForVeo({ prompt: original })

    expect(generateText).toHaveBeenCalledTimes(1)
    expect(generateText).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ maxRetries: 0, maxOutputTokens: 4096 })
    )
    expect(result.prompt).toBe(original)
    expect(result.wasRewritten).toBe(false)
  })

  it('deterministically scrubs explicit blood/violence/shock triggers when Flash rewrite fails', async () => {
    vi.mocked(generateText).mockRejectedValue(
      new Error('Unterminated string in JSON at position 968 (line 1 column 969)')
    )

    const original =
      'person [2] sags in her blood-stained torn canvas parka as a violent surge erupts; acute pain and hypothermic shock during brutal exposure to the lethal elements.'
    const result = await neutralizePromptForVeo({ prompt: original })

    expect(result.wasRewritten).toBe(true)
    expect(result.prompt).not.toContain('blood-stained')
    expect(result.prompt).not.toContain('violent')
    expect(result.prompt).not.toContain('brutal exposure')
    expect(result.prompt).not.toContain('lethal elements')
    expect(result.prompt).not.toContain('acute pain')
    expect(result.prompt).not.toContain('hypothermic shock')
    expect(result.prompt).toContain('person [2]')
  })
})
