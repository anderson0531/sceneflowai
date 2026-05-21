import { describe, it, expect } from 'vitest'
import {
  applyStorytellingDeliveryTag,
  resolveVoiceSettings,
  STORYTELLING_DELIVERY_TAG,
  STORYTELLING_VOICE_SETTINGS,
  NEUTRAL_VOICE_SETTINGS,
} from '@/lib/elevenlabs/voicePresets'

describe('resolveVoiceSettings', () => {
  it('returns lower stability and higher style for storytelling', () => {
    const s = resolveVoiceSettings('storytelling')
    expect(s.stability).toBeLessThan(NEUTRAL_VOICE_SETTINGS.stability)
    expect(s.style).toBeGreaterThan(NEUTRAL_VOICE_SETTINGS.style)
    expect(s.stability).toBe(STORYTELLING_VOICE_SETTINGS.stability)
  })

  it('allows overrides', () => {
    const s = resolveVoiceSettings('neutral', { stability: 0.9 })
    expect(s.stability).toBe(0.9)
  })
})

describe('applyStorytellingDeliveryTag', () => {
  it('prepends the intelligent and engaging tag', () => {
    expect(applyStorytellingDeliveryTag('Title: Example.')).toBe(
      `${STORYTELLING_DELIVERY_TAG} Title: Example.`
    )
  })

  it('does not duplicate the tag', () => {
    const tagged = `${STORYTELLING_DELIVERY_TAG} Title: Example.`
    expect(applyStorytellingDeliveryTag(tagged)).toBe(tagged)
  })

  it('replaces other leading bracket tags', () => {
    expect(applyStorytellingDeliveryTag('[warm, dramatic narrator] Logline: test.')).toBe(
      `${STORYTELLING_DELIVERY_TAG} Logline: test.`
    )
  })
})
