import { describe, expect, it } from 'vitest'
import { resolveEdgeVoice, EDGE_VOICE_BY_LANG } from '@/lib/tts/edgeTtsVoices'
import { isEdgeTtsFallbackEnabled, isQuotaOrRateLimitError } from '@/lib/tts/edgeTtsFallback'
import { GoogleTtsRateLimitedError } from '@/lib/tts/googleTtsRetry'

describe('edgeTtsVoices', () => {
  it('resolves Hindi male voice by default', () => {
    expect(resolveEdgeVoice('hi')).toBe(EDGE_VOICE_BY_LANG.hi.male)
  })

  it('resolves Spanish female voice from gender hint', () => {
    expect(resolveEdgeVoice('es', 'female')).toBe(EDGE_VOICE_BY_LANG.es.female)
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
