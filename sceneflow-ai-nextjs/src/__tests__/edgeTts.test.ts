import { describe, expect, it } from 'vitest'
import {
  resolveEdgeVoice,
  resolveEdgeVoiceForCharacter,
  resolveEdgeVoiceConfigForCharacter,
  listEdgeVoices,
  getEdgeVoiceLanguageFromId,
  getEdgeVoiceConfigForLang,
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

  it('parses language from Edge voice id', () => {
    expect(getEdgeVoiceLanguageFromId('hi-IN-SwaraNeural')).toBe('hi')
    expect(getEdgeVoiceLanguageFromId('en-US-JennyNeural')).toBe('en')
  })

  it('uses explicit edgeVoiceConfig when locale matches', () => {
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

  it('uses explicit Hindi voice for Hindi generation', () => {
    expect(
      resolveEdgeVoiceForCharacter({
        edgeVoiceConfig: {
          voiceId: 'hi-IN-SwaraNeural',
          voiceName: 'Swara (Hindi)',
        },
        lang: 'hi',
      })
    ).toBe('hi-IN-SwaraNeural')
  })

  it('swaps English stored voice to Hindi when generation lang is hi', () => {
    expect(
      resolveEdgeVoiceForCharacter({
        edgeVoiceConfig: {
          voiceId: 'en-US-JennyNeural',
          voiceName: 'Jenny (US)',
        },
        gender: 'female',
        lang: 'hi',
      })
    ).toBe(EDGE_VOICE_BY_LANG.hi.female)
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

  it('getEdgeVoiceConfigForLang prefers per-lang map', () => {
    const config = getEdgeVoiceConfigForLang(
      {
        edgeVoiceConfigByLang: {
          hi: { voiceId: 'hi-IN-SwaraNeural', voiceName: 'Swara (Hindi)' },
          en: { voiceId: 'en-US-GuyNeural', voiceName: 'Guy (US)' },
        },
      },
      'hi'
    )
    expect(config?.voiceId).toBe('hi-IN-SwaraNeural')
  })

  it('getEdgeVoiceConfigForLang falls back to legacy en config', () => {
    const config = getEdgeVoiceConfigForLang(
      {
        edgeVoiceConfig: {
          voiceId: 'en-US-JennyNeural',
          voiceName: 'Jenny (US)',
        },
      },
      'en'
    )
    expect(config?.voiceId).toBe('en-US-JennyNeural')
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
