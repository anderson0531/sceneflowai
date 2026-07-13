import { describe, it, expect } from 'vitest'
import { buildGeminiTtsPrompt } from '@/lib/tts/geminiTtsPrompt'

const VOICE_PROFILE = 'Gravelly baritone, measured cadence, British academic.'
const DELIVERY_CUES = ['grave nod', 'imperceptible pause']

describe('buildGeminiTtsPrompt', () => {
  it('level 0 includes delivery cues and voice profile', () => {
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: VOICE_PROFILE,
      deliveryCues: DELIVERY_CUES,
      promptLevel: 0,
    })
    expect(prompt).toContain('Acting direction for this performance')
    expect(prompt).toContain('grave nod')
    expect(prompt).toContain('Character voice profile')
    expect(prompt).toContain(VOICE_PROFILE)
    expect(prompt).toContain('Speak only the words in the text field')
  })

  it('level 1 drops delivery cues but keeps voice profile', () => {
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: VOICE_PROFILE,
      deliveryCues: DELIVERY_CUES,
      promptLevel: 1,
    })
    expect(prompt).not.toContain('Acting direction for this performance')
    expect(prompt).not.toContain('grave nod')
    expect(prompt).toContain('Character voice profile')
    expect(prompt).toContain(VOICE_PROFILE)
  })

  it('level 2 keeps only prosody and guard', () => {
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: VOICE_PROFILE,
      deliveryCues: DELIVERY_CUES,
      promptLevel: 2,
    })
    expect(prompt).not.toContain('Acting direction for this performance')
    expect(prompt).not.toContain('Character voice profile')
    expect(prompt).not.toContain(VOICE_PROFILE)
    expect(prompt).toContain('natural human prosody')
    expect(prompt).toContain('Speak only the words in the text field')
  })

  it('does not embed spoken dialogue text in the prompt', () => {
    const spokenLine =
      'Professor Croft offers a grave, almost imperceptible nod, his eyes holding hers.'
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: VOICE_PROFILE,
      deliveryCues: DELIVERY_CUES,
      promptLevel: 0,
    })
    expect(prompt).not.toContain(spokenLine)
  })
})
