import { describe, expect, it } from 'vitest'
import { sanitizeBeatStillPrompt } from '@/lib/imagen/sanitizeBeatStillPrompt'

describe('sanitizeBeatStillPrompt', () => {
  it('strips panel-routing and diptych language from persisted still copy', () => {
    const dirty =
      'CRITICAL — WARDROBE CHARACTER REFERENCE (diptych): LEFT half = identity source of truth (face). ' +
      'RIGHT half = wardrobe source of truth (garments). NEVER derive face or identity from the RIGHT panel. ' +
      'NEVER derive clothing from the LEFT panel. Render one seamless cinematic scene.'

    const clean = sanitizeBeatStillPrompt(dirty)
    expect(clean).not.toMatch(/LEFT/i)
    expect(clean).not.toMatch(/RIGHT/i)
    expect(clean).not.toMatch(/diptych/i)
    expect(clean).not.toMatch(/NEVER derive/i)
    expect(clean).not.toMatch(/source of truth/i)
    expect(clean).toMatch(/Render one seamless cinematic scene/i)
  })

  it('does not invent inset or badge language', () => {
    const clean = sanitizeBeatStillPrompt(
      'person [1] (Piper Hayes) stands at the table. copy outfit from the RIGHT panel of their wardrobe diptych reference only.'
    )
    expect(clean).not.toMatch(/\b(circle|inset|badge)\b/i)
    expect(clean).not.toMatch(/RIGHT/i)
    expect(clean).toContain('person [1] (Piper Hayes) stands at the table.')
  })
})
