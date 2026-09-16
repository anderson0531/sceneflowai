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
    expect(rewritten).toContain("person [1]'s side")
    expect(rewritten).not.toMatch(/trapped against/i)
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
})
