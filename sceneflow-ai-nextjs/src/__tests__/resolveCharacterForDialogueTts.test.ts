import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveCharacterForDialogueTts } from '@/lib/character/canonical'

describe('resolveCharacterForDialogueTts', () => {
  const characters = [
    {
      id: 'char-prof',
      name: 'Professor Gideon Croft',
      voiceConfig: { voiceId: 'gemini-Algenib', prompt: 'late-50s male' },
    },
    {
      id: 'char-piper',
      name: 'Piper Hayes',
      voiceConfig: { voiceId: 'gemini-Aoede', prompt: 'young woman' },
    },
  ]

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('trusts characterId when it matches the speaker name', () => {
    const resolved = resolveCharacterForDialogueTts(characters, {
      characterId: 'char-piper',
      characterName: 'PIPER HAYES',
    })
    expect(resolved?.id).toBe('char-piper')
  })

  it('falls back to name match when characterId points at a different speaker', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const resolved = resolveCharacterForDialogueTts(characters, {
      characterId: 'char-prof',
      characterName: 'PIPER HAYES',
      logContext: 'scene 1 dialogueIndex 2',
    })
    expect(resolved?.id).toBe('char-piper')
    expect(resolved?.voiceConfig?.voiceId).toBe('gemini-Aoede')
    expect(warn).toHaveBeenCalled()
    expect(String(warn.mock.calls[0]?.[0])).toContain('characterId/name mismatch')
  })

  it('resolves by name when characterId is missing', () => {
    const resolved = resolveCharacterForDialogueTts(characters, {
      characterName: 'Professor Gideon Croft',
    })
    expect(resolved?.id).toBe('char-prof')
  })
})
