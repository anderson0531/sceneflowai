import { describe, expect, it } from 'vitest'
import { buildNarrativeReasoningNarrationText } from '@/lib/blueprint/buildNarrativeReasoningNarrationText'

const sampleReasoning = {
  character_focus: 'The story centers on a reluctant hero forced into leadership.',
  key_decisions: [
    {
      decision: 'Merge two supporting characters into one mentor figure.',
      why: 'It tightens the emotional through-line.',
      impact: 'The second act now pivots on a single betrayal.',
    },
  ],
  story_strengths: 'The conspiracy escalates cleanly from personal to global stakes.',
  user_adjustments: 'Shift more emphasis toward the historical mystery if you regenerate.',
}

describe('buildNarrativeReasoningNarrationText', () => {
  it('includes all four reasoning sections in speakable order', () => {
    const text = buildNarrativeReasoningNarrationText(sampleReasoning)

    expect(text).toContain('Character Focus.')
    expect(text).toContain('reluctant hero')
    expect(text).toContain('Key Creative Decisions.')
    expect(text).toContain('Merge two supporting characters')
    expect(text).toContain('Why: It tightens the emotional through-line.')
    expect(text).toContain('Impact: The second act now pivots on a single betrayal.')
    expect(text).toContain('Story Strengths.')
    expect(text).toContain('conspiracy escalates cleanly')
    expect(text).toContain('Want Different Emphasis.')
    expect(text).toContain('historical mystery')
  })

  it('omits missing sections from partial reasoning', () => {
    const text = buildNarrativeReasoningNarrationText({
      character_focus: 'Focus on the duo.',
      story_strengths: 'Strong opening hook.',
    })

    expect(text).toContain('Character Focus.')
    expect(text).toContain('Story Strengths.')
    expect(text).not.toContain('Key Creative Decisions.')
    expect(text).not.toContain('Want Different Emphasis.')
  })

  it('returns empty text for null, empty, or placeholder-only reasoning', () => {
    expect(buildNarrativeReasoningNarrationText(null)).toBe('')
    expect(buildNarrativeReasoningNarrationText(undefined)).toBe('')
    expect(buildNarrativeReasoningNarrationText({})).toBe('')
    expect(
      buildNarrativeReasoningNarrationText({
        character_focus: 'Not provided by AI',
        story_strengths: 'Not provided by AI',
        user_adjustments: 'Regenerate the treatment to see AI reasoning',
      })
    ).toBe('')
  })

  it('does not include blueprint logline or synopsis fields', () => {
    const text = buildNarrativeReasoningNarrationText(sampleReasoning)

    expect(text).not.toContain('logline')
    expect(text).not.toContain('synopsis')
  })
})
