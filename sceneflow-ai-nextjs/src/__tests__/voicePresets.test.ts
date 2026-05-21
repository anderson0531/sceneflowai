import { describe, it, expect } from 'vitest'
import {
  applyStorytellingDeliveryTag,
  formatStorytellingTtsText,
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

describe('formatStorytellingTtsText', () => {
  it('wraps narration in double quotes after bracket tag', () => {
    expect(formatStorytellingTtsText('Title: Example.')).toBe(
      `${STORYTELLING_DELIVERY_TAG} "Title: Example."`
    )
  })

  it('does not duplicate when already formatted', () => {
    const formatted = `${STORYTELLING_DELIVERY_TAG} "Title: Example."`
    expect(formatStorytellingTtsText(formatted)).toBe(formatted)
  })

  it('replaces other leading bracket tags and quotes body', () => {
    expect(formatStorytellingTtsText('[Intelligent and Confident] Logline: test.')).toBe(
      '[Intelligent and Confident] "Logline: test."'
    )
  })

  it('strips existing outer quotes before re-wrapping', () => {
    expect(formatStorytellingTtsText('"Already quoted."')).toBe(
      `${STORYTELLING_DELIVERY_TAG} "Already quoted."`
    )
  })
})

describe('applyStorytellingDeliveryTag', () => {
  it('aliases formatStorytellingTtsText', () => {
    expect(applyStorytellingDeliveryTag('Hello world.')).toBe(
      formatStorytellingTtsText('Hello world.')
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
    if (prev) process.env.ELEVENLABS_STORYTELLING_MODEL = prev
    if (prevTts) process.env.ELEVENLABS_TTS_MODEL = prevTts
  })
})
