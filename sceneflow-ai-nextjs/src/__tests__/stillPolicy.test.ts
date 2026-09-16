import { describe, expect, it } from 'vitest'
import {
  IMAGE_SAFETY_BOARD_MESSAGE,
  IMAGE_SAFETY_CODE,
  IMAGE_SAFETY_USER_MESSAGE,
  isImageSafetyError,
  isStillPolicyImageError,
  parseStillPolicyMode,
  resolveVertexStillPolicyAttempts,
  shouldRejectIgnoredIdentityStill,
} from '@/lib/generation/stillPolicy'
import { escalateImagePromptForRetry } from '@/lib/generation/imagePolicyEscalation'

/** Refused by Vertex IMAGE_SAFETY after Director Safety rewrite, 2026-09-16. */
const PRODUCTION_INTIMIDATION_STILL = `Action/Framing: Two-Shot, low angle: both Piper Hayes and Gideon Croft fully in frame. Gideon leans his weight onto the heavy iron spanner planted against the brick wall beside Piper's shoulder, while she sits trapped on the floor cradling the dispatch cylinder. Body position: Piper sits on the floor screen-right, knees pulled up, back pressed flat against the brick wall; Gideon stands screen-left, leaning his torso forward, his weight planted through his extended right arm to hold the spanner against the wall beside her. Hands and props: Gideon's right hand grips the shaft of the Thirty-Inch Iron Rail Spanner, its head resting flush against the brick wall; Piper's hands tightly cradle An olive-drab dispatch cylinder with a cracked wax seal against her chest. Gaze: Gideon stares directly down at Piper; Piper looks up, meeting his gaze. Cast in frame: Piper Hayes, Gideon Croft — and no other people. Facial expression (Piper Hayes): eyes wide, lips slightly parted, shoulders hunched defensively. Facial expression (Gideon Croft): wide, alert eyes, jaw firmly set, chest inflated in a rigid posture.

[STYLE]
Palette & Grade: Stylized shift from Warm (Tungsten/Amber) to Cool/Toxic (Teal)`

describe('still policy helpers', () => {
  it('parses Safety and Creative only', () => {
    expect(parseStillPolicyMode('safety')).toBe('safety')
    expect(parseStillPolicyMode('creative')).toBe('creative')
    expect(parseStillPolicyMode('auto')).toBeUndefined()
    expect(parseStillPolicyMode(undefined)).toBeUndefined()
  })

  it('rejects a recovered frame that ignored identity refs', () => {
    expect(
      shouldRejectIgnoredIdentityStill({
        policyRefusalRecovered: true,
        hasIdentityRefs: true,
        likenessFailed: true,
      })
    ).toBe(true)
  })

  it('keeps a recovered frame when likeness holds', () => {
    expect(
      shouldRejectIgnoredIdentityStill({
        policyRefusalRecovered: true,
        hasIdentityRefs: true,
        likenessFailed: false,
      })
    ).toBe(false)
  })

  it('rejects a Director Safety frame that ignored identity refs', () => {
    expect(
      shouldRejectIgnoredIdentityStill({
        policyRefusalRecovered: false,
        stillPolicyMode: 'safety',
        hasIdentityRefs: true,
        likenessFailed: true,
      })
    ).toBe(true)
  })

  it('keeps a Director Safety frame when likeness holds', () => {
    expect(
      shouldRejectIgnoredIdentityStill({
        policyRefusalRecovered: false,
        stillPolicyMode: 'safety',
        hasIdentityRefs: true,
        likenessFailed: false,
      })
    ).toBe(false)
  })

  it('keeps an auto frame with likeness failure when policy did not recover', () => {
    expect(
      shouldRejectIgnoredIdentityStill({
        policyRefusalRecovered: false,
        hasIdentityRefs: true,
        likenessFailed: true,
      })
    ).toBe(false)
  })

  it('Safety pre-rewrites then retries at level 2; auto exhausts first try plus rewritten pro', () => {
    expect(resolveVertexStillPolicyAttempts('safety')).toBe(2)
    expect(resolveVertexStillPolicyAttempts(undefined)).toBe(2)
    expect(resolveVertexStillPolicyAttempts('creative')).toBe(2)
  })

  it('recognizes the user toast and board overlay copy', () => {
    expect(isImageSafetyError(new Error(IMAGE_SAFETY_USER_MESSAGE))).toBe(true)
    expect(isStillPolicyImageError(IMAGE_SAFETY_BOARD_MESSAGE)).toBe(true)
    expect(isImageSafetyError({ code: IMAGE_SAFETY_CODE })).toBe(true)
  })
})

describe('Safety rewrite vs Creative original', () => {
  it('Safety rewrite keeps the prop noun and settles pinning', () => {
    const original =
      'person [1] sits trapped against the wall; person [2] plants the steel spanner beside person [1]\'s shoulder to block her path.'
    const rewritten = escalateImagePromptForRetry(original, 1, {
      skipProductionStillFraming: true,
    })
    expect(rewritten).toContain('spanner')
    expect(rewritten).toContain('seated against')
    expect(rewritten).toContain('occupying the passage')
    expect(rewritten).toMatch(/embedded in cracked brick beside person \[1\]'s open hand/i)
    expect(rewritten).not.toMatch(/trapped against/i)
    expect(rewritten).not.toMatch(/beside person \[1\]'s shoulder/i)
  })

  it('IMAGE_SAFETY escalation may turn steel into stage prop, which Creative must not send', () => {
    const original = 'person [1] holds the steel spanner at her side.'
    const rewritten = escalateImagePromptForRetry(original, 1, {
      skipProductionStillFraming: true,
    })
    expect(rewritten.toLowerCase()).toContain('stage prop')
    expect(original.toLowerCase()).not.toContain('stage prop')
    expect(original).toContain('spanner')
  })

  it('Safety rewrite levels the refused Piper/Gideon intimidation still without renaming props', () => {
    const original = PRODUCTION_INTIMIDATION_STILL
    const rewritten = escalateImagePromptForRetry(original, 1, {
      skipProductionStillFraming: true,
    })
    expect(rewritten).not.toMatch(/\btrapped\b/i)
    expect(rewritten).not.toMatch(/hunched defensively/i)
    expect(rewritten).not.toMatch(/beside Piper's shoulder/i)
    expect(rewritten).not.toMatch(/\blow angle\b/i)
    expect(rewritten).not.toMatch(/stares directly down/i)
    expect(rewritten).not.toMatch(/Cool\/Toxic/i)
    expect(rewritten).toContain('spanner')
    expect(rewritten).toContain('dispatch cylinder')
    expect(rewritten).toContain('Piper Hayes')
    expect(rewritten).toContain('Gideon Croft')
    expect(rewritten).toMatch(/eye-level angle/i)
    expect(rewritten).toMatch(/kneels near the wall|stands braced beside|stands beside/i)
    expect(rewritten).toMatch(/resting upright on the floor/i)
    expect(rewritten).toMatch(/Cool\/Industrial/i)
  })
})
