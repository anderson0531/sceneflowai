import { describe, expect, it } from 'vitest'
import { neutralizeReferenceConflictPrompt } from '@/lib/gemini/neutralizeReferenceConflictPrompt'

describe('neutralizeReferenceConflictPrompt', () => {
  it('softens temple mark and possessive character re-description', () => {
    const raw =
      "CLOSE UP: Elara's hands, now visibly trembling. Her eyes are heavy with emotion, a faint shadowed mark visible on her temple."

    const neutral = neutralizeReferenceConflictPrompt(raw)

    expect(neutral).toContain("the subject's hands")
    expect(neutral).toContain('expression shows deep emotion')
    expect(neutral).not.toContain('Elara')
    expect(neutral).not.toContain('shadowed mark visible on her temple')
    expect(neutral).toContain('quiet emotional tension')
  })

  it('softens distress phrasing in audio-adjacent scene text', () => {
    const raw =
      'Desperate denial collapsing into intense realization and emotional exhaustion with escalating panic.'

    const neutral = neutralizeReferenceConflictPrompt(raw)

    expect(neutral).not.toContain('Desperate denial')
    expect(neutral).not.toContain('escalating panic')
    expect(neutral.toLowerCase()).toContain('rising tension')
  })
})
