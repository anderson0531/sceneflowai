import { describe, it, expect } from 'vitest'
import {
  resolveVoiceSettings,
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
