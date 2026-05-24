import { describe, expect, it } from 'vitest'
import {
  resolveEdgeVoice,
  resolveEdgeVoiceForCharacter,
  resolveEdgeVoiceConfigForCharacter,
  listEdgeVoices,
  EDGE_VOICE_BY_LANG,
} from '@/lib/tts/edgeTtsVoices'
import { isEdgeTtsFallbackEnabled, isQuotaOrRateLimitError } from '@/lib/tts/edgeTtsFallback'
import { GoogleTtsRateLimitedError } from '@/lib/tts/googleTtsRetry'

describe('edgeTtsVoices', () => {
  it('resolves Hindi male voice by default', () => {
    expect(resolveEdgeVoice('hi')).toBe(EDGE_VOICE_BY_LANG.hi.male)
  })

  it('resolves Spanish female voice from gender hint', () => {
    expect(resolveEdgeVoice('es', 'female')).toBe(EDGE_VOICE_BY_LANG.es.female)
  })

  it('resolves female voice from exact gender string', () => {
    expect(resolveEdgeVoice('en', 'Female')).toBe(EDGE_VOICE_BY_LANG.en.female)
  })

  it('prefers explicit edgeVoiceConfig over gender auto', () => {
    expect(
      resolveEdgeVoiceForCharacter({
        edgeVoiceConfig: {
          voiceId: 'en-US-AriaNeural',
          voiceName: 'Aria (US)',
        },
        gender: 'male',
        lang: 'en',
      })
    ).toBe('en-US-AriaNeural')
  })

  it('falls back to gender auto when no explicit config', () => {
    expect(
      resolveEdgeVoiceForCharacter({
        gender: 'female',
        lang: 'en',
      })
    ).toBe(EDGE_VOICE_BY_LANG.en.female)
  })

  it('resolveEdgeVoiceConfigForCharacter returns name from catalog', () => {
    const config = resolveEdgeVoiceConfigForCharacter({
      gender: 'female',
      lang: 'en',
    })
    expect(config.voiceId).toBe(EDGE_VOICE_BY_LANG.en.female)
    expect(config.voiceName).toBeTruthy()
  })

  it('listEdgeVoices filters by language', () => {
    const enVoices = listEdgeVoices({ lang: 'en' })
    expect(enVoices.length).toBeGreaterThan(0)
    expect(enVoices.every((v) => v.language === 'en')).toBe(true)
  })

  it('listEdgeVoices filters by gender', () => {
    const femaleVoices = listEdgeVoices({ lang: 'en', gender: 'female' })
    expect(femaleVoices.length).toBeGreaterThan(0)
    expect(femaleVoices.every((v) => v.gender === 'female')).toBe(true)
  })
})

describe('edgeTtsFallback', () => {
  it('is enabled by default', () => {
    const prev = process.env.EDGE_TTS_FALLBACK
    delete process.env.EDGE_TTS_FALLBACK
    expect(isEdgeTtsFallbackEnabled()).toBe(true)
    process.env.EDGE_TTS_FALLBACK = prev
  })

  it('detects ElevenLabs quota errors', () => {
    expect(isQuotaOrRateLimitError(new Error('quota_exceeded'))).toBe(true)
  })

  it('detects Google rate limit errors', () => {
    expect(
      isQuotaOrRateLimitError(
        new GoogleTtsRateLimitedError({
          userMessage: 'Rate limited',
          tips: [],
        })
      )
    ).toBe(true)
  })
})
