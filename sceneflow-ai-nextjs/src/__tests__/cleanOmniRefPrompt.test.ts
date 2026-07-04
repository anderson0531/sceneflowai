import { describe, expect, it } from 'vitest'
import {
  cleanOmniRefScenePrompt,
  sanitizeOmniRefGuide,
  sanitizeOmniRefLabel,
} from '@/lib/gemini/cleanOmniRefPrompt'

const BLOATED_SCENE =
  "Elara leans forward defensively, The subject's face tight with desperate defiance as she pleads her innocence.. Slow dolly push-in on Elara Vance in an interrogation room. She leans forward aggressively, hands clasped tight, speaking with desperate, hoarse intensity. High-contrast clinical lighting, cinematic 85mm lens, shallow depth of field.. Slow, creeping Dolly In during dialogue, Static on inserts, Close-Up, Hard & Dramatic, High-contrast, firm denial collapsing into horrifying realization and quiet resignation. photorealistic, professional photography, 8K resolution, studio lighting, sharp focus"

describe('cleanOmniRefScenePrompt', () => {
  it('dedupes action, strips style/motion salad, and collapses double periods', () => {
    const cleaned = cleanOmniRefScenePrompt(BLOATED_SCENE)

    expect(cleaned).not.toContain('..')
    expect(cleaned).not.toContain('horrifying')
    expect(cleaned).not.toContain('photorealistic')
    expect(cleaned).not.toContain('8K resolution')
    expect(cleaned).not.toContain('Static on inserts')
    expect(cleaned).not.toContain('quiet resignation')
    expect(cleaned.match(/leans forward/gi)?.length ?? 0).toBeLessThanOrEqual(1)
    expect(cleaned.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(2)
  })

  it('preserves core scene action and camera hint', () => {
    const cleaned = cleanOmniRefScenePrompt(BLOATED_SCENE)

    expect(cleaned.toLowerCase()).toMatch(/interrogation room|dolly/)
    expect(cleaned.length).toBeLessThan(BLOATED_SCENE.length / 2)
  })
})

describe('sanitizeOmniRefGuide', () => {
  it('strips delivery parentheticals and simplifies speak phrase', () => {
    const guide =
      "ELARA VANCE speaks the following line (with hoarse delivery; with desperate delivery): 'I'm telling you, it wasn't me! Someone framed me.'"
    const sanitized = sanitizeOmniRefGuide(guide)

    expect(sanitized).not.toContain('hoarse delivery')
    expect(sanitized).not.toContain('desperate delivery')
    expect(sanitized).toContain('says:')
    expect(sanitized).toContain("I'm telling you")
  })
})

describe('sanitizeOmniRefLabel', () => {
  it('strips emotional wardrobe suffix', () => {
    expect(sanitizeOmniRefLabel('Elara Vance — Tech-Savvy Casual — tensioned')).toBe(
      'Elara Vance — Tech-Savvy Casual'
    )
  })

  it('trims location shot parenthetical', () => {
    expect(
      sanitizeOmniRefLabel(
        'Location reference 5: POLICE STATION - INTERROGATION ROOM (extreme-wide establishing shot)'
      )
    ).toBe('Location reference 5: POLICE STATION - INTERROGATION ROOM')
  })

  it('leaves identity labels unchanged', () => {
    expect(sanitizeOmniRefLabel('Identity reference 1: Elara Vance')).toBe(
      'Identity reference 1: Elara Vance'
    )
  })
})

describe('REF prompt pipeline smoke (seg_425d369e-7c9 shape)', () => {
  it('produces a concise neutral final REF prompt from bloated stored inputs', async () => {
    const { buildOmniVideoReferencePrompt } = await import(
      '@/lib/gemini/buildOmniVideoReferencePrompt'
    )
    const { neutralizeReferenceConflictPrompt } = await import(
      '@/lib/gemini/neutralizeReferenceConflictPrompt'
    )

    const guide =
      "ELARA VANCE speaks the following line (with hoarse delivery; with desperate delivery): 'I'm telling you, it wasn't me! Someone framed me.'"
    const scene = neutralizeReferenceConflictPrompt(cleanOmniRefScenePrompt(BLOATED_SCENE))
    const sanitizedGuide = sanitizeOmniRefGuide(guide)
    const final = buildOmniVideoReferencePrompt({
      scenePrompt: scene,
      refs: [{ imageUrl: 'https://example.com/elara.png', name: 'Identity reference 1: Elara Vance', role: 'identity' }],
      guidePrompt: sanitizedGuide,
    })

    expect(final).not.toContain('horrifying')
    expect(final).not.toContain('photorealistic')
    expect(final).not.toContain('hoarse delivery')
    expect(final).not.toContain('..')
    expect(final).toContain('References:')
    expect(final).toContain("says:")
    expect(final.split('\n\n').length).toBeLessThanOrEqual(3)
  })
})
