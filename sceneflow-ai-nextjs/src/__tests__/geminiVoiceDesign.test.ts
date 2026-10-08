import { describe, expect, it } from 'vitest'
import {
  buildDesignedVoiceSynthesisBody,
  buildVoiceDesignCreateBody,
  composeVoiceDesignDescription,
  designedVoiceStyle,
  prepareDesignedVoiceLine,
  shortenVoiceDesignDescription,
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
    expect(description).toBe(
      'A late 40s male defense attorney with a resonant baritone voice and a neutral American accent, speaking at a measured pace with quiet authority.'
    )
    expect(description.length).toBeLessThanOrEqual(220)
    expect(description).not.toContain('Baseline delivery')
    expect(description).not.toContain('wardrobe')
  })

  it('uses An before a vowel and keeps only the role before a slash', () => {
    const description = composeVoiceDesignDescription({
      role: 'primary guide / narrator who uncovers the whole conspiracy',
      gender: 'male',
      apparentAge: 'early 60s',
      timbre: 'resonant baritone',
    })
    expect(description.startsWith('An early 60s male primary guide')).toBe(true)
    expect(description).toContain('resonant baritone')
    expect(description).not.toContain('/')
    expect(description).not.toContain('conspiracy')
  })

  it('falls back to the first vocal clause and drops the attribute tail', () => {
    const description = composeVoiceDesignDescription({
      voiceDescription:
        'Intelligent male voice with a measured pace. Vocal qualities: resonant baritone timbre, low-mid pitch.',
    })
    expect(description).toBe('Intelligent male voice with a measured pace.')
    expect(description).not.toContain('Vocal qualities')
  })

  it('drops the speaking clause for a rephrase retry', () => {
    const full = composeVoiceDesignDescription({
      role: 'guide',
      gender: 'male',
      apparentAge: 'late 50s',
      timbre: 'resonant baritone',
      accent: 'neutral American',
      pace: 'measured',
    })
    const shorter = shortenVoiceDesignDescription(full)
    expect(shorter).toBe(
      'A late 50s male guide with a resonant baritone voice and a neutral American accent.'
    )
    expect(shortenVoiceDesignDescription(shorter)).toBe(shorter)
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
      type: string
      prompted: { input: string }
    }
    expect(voice).not.toHaveProperty('model')
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

  it('speaks the words and keeps whisper with the line cues in style', () => {
    const prepared = prepareDesignedVoiceLine({
      text: "[whispering] I can't hold the baseline, Sarah. The cold is getting in.",
      cues: ['fragile', 'intimate'],
    })
    const body = buildDesignedVoiceSynthesisBody({
      text: prepared.text,
      voiceId: 'voice_8f84d642-7a0f-4094-806d-bf1e7de1bf19',
      style: prepared.style,
    })
    const part = (
      body.contents as Array<{ parts: Array<{ text: string; speechMetadata?: { style: string } }> }>
    )[0].parts[0]
    expect(part.text).toBe("I can't hold the baseline, Sarah. The cold is getting in.")
    expect(part.text).not.toContain('[')
    expect(part.speechMetadata?.style).toBe('whispering, fragile and intimate')
  })

  it('moves pauses and sighs to angle brackets and drops a director paragraph', () => {
    const prepared = prepareDesignedVoiceLine({
      text: '[sigh] Fine. [short pause] Have it your way.',
      cues: [
        'Close-mic, private, strained. Argue with the numbers on leftover air and do not smooth this into a composed read.',
      ],
    })
    expect(prepared.text).toBe('<sigh> Fine. <short pause> Have it your way.')
    expect(prepared.text).not.toContain('[')
    expect(prepared.style).toBeUndefined()
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
