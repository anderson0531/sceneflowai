import { describe, expect, it } from 'vitest'
import {
  DESIGNED_VOICE_TTS_MODEL,
  buildDesignedVoiceSynthesisBody,
  buildVoiceDesignCreateBody,
  composeVoiceDesignDescription,
  designedVoiceStyle,
  isDesignedGeminiVoiceId,
  voicesToEvict,
} from '@/lib/tts/geminiVoiceDesign'

describe('composeVoiceDesignDescription', () => {
  it('builds a short persona from the portrait traits and role', () => {
    const description = composeVoiceDesignDescription({
      role: 'defense attorney',
      gender: 'male',
      apparentAge: 'late 40s',
      timbre: 'resonant baritone',
      accent: 'neutral American',
      pace: 'measured',
      emotionalDefault: 'quiet authority',
    })
    expect(description).toContain('late 40s male defense attorney')
    expect(description).toContain('resonant baritone')
    expect(description).toContain('neutral American accent')
    expect(description).toContain('quiet authority')
    expect(description.length).toBeLessThan(400)
    expect(description).not.toContain('wardrobe')
  })
})

describe('voice design payloads', () => {
  it('creates a prompted voice with no base voice', () => {
    const body = buildVoiceDesignCreateBody({
      description: 'A late 40s male attorney with a resonant baritone.',
      displayName: 'Julian',
    })
    expect(body.store).toBe(true)
    expect(body).not.toHaveProperty('type')
    expect(body).not.toHaveProperty('prompted')
    expect(body).not.toHaveProperty('name')
    const voice = body.voice as {
      model: string
      type: string
      prompted: { input: string }
    }
    expect(voice.model).toBe(DESIGNED_VOICE_TTS_MODEL)
    expect(voice.type).toBe('prompted')
    expect(voice.prompted.input).toContain('resonant baritone')
  })

  it('puts delivery only in style and cites the designed voice id', () => {
    const body = buildDesignedVoiceSynthesisBody({
      text: 'We need to move now.',
      voiceId: 'voice_abc123',
      style: designedVoiceStyle(['whispered', 'urgent']),
    })
    const part = (
      body.contents as Array<{ parts: Array<{ text: string; speechMetadata?: { style: string } }> }>
    )[0].parts[0]
    expect(part.text).toBe('We need to move now.')
    expect(part.speechMetadata?.style).toBe('whispered, urgent')
    expect(JSON.stringify(body)).not.toContain('Kore')
    expect(JSON.stringify(body)).toContain('voice_abc123')
    expect(isDesignedGeminiVoiceId('voice_abc123')).toBe(true)
    expect(isDesignedGeminiVoiceId('gemini-Kore')).toBe(false)
  })

  it('omits style when the line has no performance cue', () => {
    const body = buildDesignedVoiceSynthesisBody({
      text: 'Hello.',
      voiceId: 'voice_abc123',
      style: designedVoiceStyle([]),
    })
    const part = (body.contents as Array<{ parts: Array<Record<string, unknown>> }>)[0].parts[0]
    expect(part.speechMetadata).toBeUndefined()
  })
})

describe('voicesToEvict', () => {
  it('drops the oldest unassigned voices before the cap', () => {
    const voices = Array.from({ length: 181 }, (_, index) => ({
      id: `voice_${index}`,
      createTime: `2026-01-${String((index % 28) + 1).padStart(2, '0')}T00:00:${String(index % 60).padStart(2, '0')}Z`,
    }))
    const dropped = voicesToEvict(voices, ['voice_180'], 180)
    expect(dropped).toHaveLength(1)
    expect(dropped).not.toContain('voice_180')
  })
})
