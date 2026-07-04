import { describe, expect, it } from 'vitest'
import { autoSanitizePrompt } from '@/utils/promptModerator'

describe('promptModerator distress phrasing', () => {
  it('sanitizes temple mark and escalating panic phrases', () => {
    const raw =
      "CLOSE UP: faint shadowed mark visible on her temple. Background builds with escalating panic and crushing weight of the evidence."

    const { sanitizedPrompt, wasModified, changes } = autoSanitizePrompt(raw, {
      logChanges: false,
    })

    expect(wasModified).toBe(true)
    expect(changes.length).toBeGreaterThan(0)
    expect(sanitizedPrompt.toLowerCase()).not.toContain('escalating panic')
    expect(sanitizedPrompt.toLowerCase()).not.toContain('shadowed mark visible on her temple')
    expect(sanitizedPrompt.toLowerCase()).toContain('rising tension')
  })

  it('sanitizes distressed and desperate denial wording', () => {
    const raw = 'Elara Vance — Tech-Savvy Casual — Distressed. Desperate denial collapsing into realization.'

    const { sanitizedPrompt, wasModified } = autoSanitizePrompt(raw, { logChanges: false })

    expect(wasModified).toBe(true)
    expect(sanitizedPrompt.toLowerCase()).not.toContain('distressed')
    expect(sanitizedPrompt.toLowerCase()).not.toContain('desperate denial')
  })
})
