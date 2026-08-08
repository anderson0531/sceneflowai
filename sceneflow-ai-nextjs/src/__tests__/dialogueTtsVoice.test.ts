import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  isNarratorDialogueSpeaker,
  resolveDialogueTtsVoice,
  dialogueSpeakerNeedsAssignment,
} from '@/lib/character/dialogueTtsVoice'

describe('dialogueTtsVoice', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const cast = [
    {
      id: 'narrator-1',
      name: 'Narrator',
      type: 'narrator',
      voiceConfig: { voiceId: 'gemini-Algenib', prompt: 'warm narrator' },
    },
    {
      id: 'char-piper',
      name: 'Piper Hayes',
      voiceConfig: { voiceId: 'gemini-Aoede', prompt: 'young woman' },
    },
  ]

  it('detects NARRATOR / narration kind / reserved id as narrator speakers', () => {
    expect(isNarratorDialogueSpeaker({ characterName: 'NARRATOR' })).toBe(true)
    expect(isNarratorDialogueSpeaker({ characterName: 'Narration' })).toBe(true)
    expect(isNarratorDialogueSpeaker({ characterId: 'narrator' })).toBe(true)
    expect(isNarratorDialogueSpeaker({ kind: 'narration' })).toBe(true)
    expect(isNarratorDialogueSpeaker({ characterName: 'Piper Hayes' })).toBe(false)
  })

  it('resolves script NARRATOR to cast Narrator by name/type', () => {
    const resolved = resolveDialogueTtsVoice({
      characters: cast,
      characterId: 'narrator',
      characterName: 'NARRATOR',
      kind: 'narration',
    })
    expect(resolved.character?.id).toBe('narrator-1')
    expect(resolved.voiceConfig).toEqual(cast[0].voiceConfig)
    expect(resolved.usedNarrationVoiceFallback).toBe(false)
  })

  it('falls back to narrationVoice when cast narrator has no voice', () => {
    const narrationVoice = { voiceId: 'project-narration', prompt: 'project VO' }
    const resolved = resolveDialogueTtsVoice({
      characters: [
        { id: 'narrator-1', name: 'Narrator', type: 'narrator' },
        cast[1],
      ],
      characterName: 'NARRATOR',
      kind: 'narration',
      narrationVoice,
    })
    expect(resolved.voiceConfig).toEqual(narrationVoice)
    expect(resolved.usedNarrationVoiceFallback).toBe(true)
    expect(resolved.resolvedName).toBe('Narrator')
    expect(resolved.character?.id).toBe('narrator-1')
  })

  it('falls back to narrationVoice when no cast narrator exists', () => {
    const narrationVoice = { voiceId: 'project-narration', prompt: 'project VO' }
    const resolved = resolveDialogueTtsVoice({
      characters: [cast[1]],
      characterId: 'narrator',
      characterName: 'NARRATOR',
      kind: 'narration',
      narrationVoice,
    })
    expect(resolved.character).toBeNull()
    expect(resolved.voiceConfig).toEqual(narrationVoice)
    expect(resolved.usedNarrationVoiceFallback).toBe(true)
  })

  it('marks unknown speakers without voice as needing assignment', () => {
    expect(
      dialogueSpeakerNeedsAssignment({
        characters: cast,
        characterName: 'Unknown Extra',
        kind: 'dialogue',
        narrationVoice: { voiceId: 'x' },
      })
    ).toBe(true)

    expect(
      dialogueSpeakerNeedsAssignment({
        characters: cast,
        characterName: 'NARRATOR',
        kind: 'narration',
      })
    ).toBe(false)
  })
})
