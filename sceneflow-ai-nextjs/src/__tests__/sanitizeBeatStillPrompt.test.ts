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

  it('strips picture-in-picture tokens from persisted still copy', () => {
    const dirty =
      'Render one seamless cinematic scene with picture-in-picture, pip, inset frame, ' +
      'floating portrait, circular frame, sub-frame, and photo-in-photo overlays.'
    const clean = sanitizeBeatStillPrompt(dirty)
    expect(clean.toLowerCase()).not.toMatch(/picture-in-picture/)
    expect(clean.toLowerCase()).not.toMatch(/\bpip\b/)
    expect(clean.toLowerCase()).not.toMatch(/inset frame/)
    expect(clean.toLowerCase()).not.toMatch(/floating portrait/)
    expect(clean.toLowerCase()).not.toMatch(/circular frame/)
    expect(clean.toLowerCase()).not.toMatch(/sub-frame/)
    expect(clean.toLowerCase()).not.toMatch(/photo-in-photo/)
    expect(clean).toMatch(/Render one seamless cinematic scene/i)
  })

  it('leaves PiP reproduction terms under [EXCLUSIONS]', () => {
    const dirty =
      '[STILL]\nRender a picture-in-picture overlay.\n[EXCLUSIONS]\n' +
      'Strictly Avoid: picture-in-picture, pip, inset frame, circular frame, collage.'
    const clean = sanitizeBeatStillPrompt(dirty)
    const stillBody = clean.split('[EXCLUSIONS]')[0] ?? clean
    expect(stillBody.toLowerCase()).not.toMatch(/picture-in-picture/)
    expect(clean).toMatch(/\[EXCLUSIONS\][\s\S]*picture-in-picture/)
    expect(clean).toMatch(/\[EXCLUSIONS\][\s\S]*\bpip\b/)
    expect(clean).toMatch(/\[EXCLUSIONS\][\s\S]*collage/)
  })
})
