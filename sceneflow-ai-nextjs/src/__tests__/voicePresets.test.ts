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
  it('prepends bracket tag on its own line before narration', () => {
    expect(applyStorytellingDeliveryTag('Title: Example.')).toBe(
      `${STORYTELLING_DELIVERY_TAG}\n\nTitle: Example.`
    )
  })

  it('does not duplicate the tag', () => {
    const tagged = `${STORYTELLING_DELIVERY_TAG} Title: Example.`
    expect(applyStorytellingDeliveryTag(tagged)).toBe(tagged)
  })

  it('replaces other leading bracket tags', () => {
    expect(applyStorytellingDeliveryTag('[warm, dramatic narrator] Logline: test.')).toBe(
      `${STORYTELLING_DELIVERY_TAG}\n\nLogline: test.`
    )
  })
})

describe('resolveStorytellingModelId', () => {
  it('defaults to eleven_v3 for bracket audio tags', async () => {
    const { resolveStorytellingModelId } = await import('@/lib/elevenlabs/voicePresets')
    const prev = process.env.ELEVENLABS_STORYTELLING_MODEL
    const prevTts = process.env.ELEVENLABS_TTS_MODEL
    delete process.env.ELEVENLABS_STORYTELLING_MODEL
    delete process.env.ELEVENLABS_TTS_MODEL
    expect(resolveStorytellingModelId()).toBe('eleven_v3')
    if (prev !== undefined) process.env.ELEVENLABS_STORYTELLING_MODEL = prev
    if (prevTts !== undefined) process.env.ELEVENLABS_TTS_MODEL = prevTts
  })
})
