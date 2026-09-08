import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  AUDIENCE_RESONANCE_VOICE_KEY,
  DIRECTOR_ASSISTANTS,
  getAssistantByVoiceId,
  loadPersistedAssistantVoice,
  persistAssistantVoice,
  resolveAssistant,
  resolveAssistantGeminiVoiceId,
} from '@/lib/tts/productionAssistants'

const memory = new Map<string, string>()
const mockStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value)
  },
  removeItem: (key: string) => {
    memory.delete(key)
  },
}

describe('Production assistants', () => {
  beforeEach(() => {
    memory.clear()
    Object.assign(globalThis, { window: { localStorage: mockStorage }, localStorage: mockStorage })
  })

  afterEach(() => {
    memory.clear()
    Reflect.deleteProperty(globalThis, 'window')
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('maps every assistant to a unique Gemini voice id', () => {
    const ids = DIRECTOR_ASSISTANTS.map((assistant) => assistant.voiceId)
    expect(ids.every((id) => id.startsWith('gemini-'))).toBe(true)
    expect(new Set(ids).size).toBe(DIRECTOR_ASSISTANTS.length)
  })

  it('resolves current and legacy Cloud TTS ids to the same assistant', () => {
    const marcus = DIRECTOR_ASSISTANTS.find((a) => a.id === 'senior-script-consultant')
    expect(marcus).toBeDefined()
    expect(getAssistantByVoiceId('gemini-Algenib')?.id).toBe('senior-script-consultant')
    expect(getAssistantByVoiceId('en-US-Journey-D')?.id).toBe('senior-script-consultant')
    expect(resolveAssistantGeminiVoiceId('en-US-Journey-D')).toBe('gemini-Algenib')
    expect(resolveAssistantGeminiVoiceId('gemini-Algenib')).toBe('gemini-Algenib')
    expect(resolveAssistant('senior-script-consultant').voiceId).toBe(marcus!.voiceId)
  })

  it('persists the Gemini voice and restores it after a legacy Cloud id', () => {
    const elena = DIRECTOR_ASSISTANTS.find((a) => a.id === 'head-of-editorial')!
    persistAssistantVoice(elena)

    const stored = JSON.parse(localStorage.getItem(AUDIENCE_RESONANCE_VOICE_KEY) || '{}')
    expect(stored.assistantId).toBe('head-of-editorial')
    expect(stored.voiceId).toBe('gemini-Achernar')

    localStorage.setItem(
      AUDIENCE_RESONANCE_VOICE_KEY,
      JSON.stringify({ voiceId: 'en-US-Neural2-E', voiceName: 'Head of Editorial' })
    )
    const restored = loadPersistedAssistantVoice()
    expect(restored?.assistantId).toBe('head-of-editorial')
    expect(restored?.voiceId).toBe('gemini-Achernar')
  })

  it('falls back to the first assistant when nothing is stored', () => {
    expect(loadPersistedAssistantVoice()).toBeNull()
    expect(resolveAssistant(null).id).toBe(DIRECTOR_ASSISTANTS[0].id)
  })
})
