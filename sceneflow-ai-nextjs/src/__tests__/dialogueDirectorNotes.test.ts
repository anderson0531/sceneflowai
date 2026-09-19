import { describe, expect, it } from 'vitest'
import {
  expandShortDeliveryCues,
  formatDirectorNotes,
  resolveLineVoiceDirection,
} from '@/lib/tts/dialogueDirectorNotes'
import { buildSceneDirection } from '@/lib/tts/characterSystemInstruction'
import { buildGeminiTtsPrompt } from '@/lib/tts/geminiTtsPrompt'

describe('expandShortDeliveryCues', () => {
  it('turns legacy short tags into Style / Pace / Breath notes', () => {
    const brief = expandShortDeliveryCues(['obsessive', 'breathless'])
    expect(brief).toContain('Style:')
    expect(brief).toMatch(/obsessive/i)
    expect(brief).toContain('Pace:')
    expect(brief).toMatch(/air is running out/i)
    expect(brief).toContain('Breath:')
    expect(brief).not.toMatch(/^obsessive; breathless$/)
  })

  it('falls back to a usable brief for unknown labels', () => {
    const brief = expandShortDeliveryCues(['grave nod'])
    expect(brief).toMatch(/Style:/)
    expect(brief).toMatch(/grave nod/i)
    expect(brief).toMatch(/composed read/i)
  })
})

describe('formatDirectorNotes', () => {
  it('prefers the authored voiceDirection prose over cue lists', () => {
    const notes = formatDirectorNotes({
      voiceDirection:
        'Close-mic, private, strained. Land "has to hold this time" as an unoverheard plea.',
      cues: ['obsessive', 'breathless'],
    })
    expect(notes).toContain("DIRECTOR'S NOTES:")
    expect(notes).toContain('unoverheard plea')
    expect(notes).not.toContain('Delivery cues:')
  })
})

describe('buildSceneDirection director notes', () => {
  it('emits director notes from a voiceDirection brief', () => {
    const direction = buildSceneDirection({
      voiceDirection: 'Rush the first clause, then land the last as a plea.',
    })
    expect(direction).toContain("DIRECTOR'S NOTES:")
    expect(direction).toContain('land the last as a plea')
    expect(direction).not.toContain('Delivery cues:')
  })
})

describe('buildGeminiTtsPrompt director notes', () => {
  it('uses director notes instead of a cue list on the structured path', () => {
    const persona = `ROLE: Elena.\nDELIVERY RULES:\n- Cadence: Natural conversational pace (~150-160 WPM).`
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: persona,
      deliveryCues: ['obsessive', 'breathless'],
    })
    expect(prompt).toContain("DIRECTOR'S NOTES:")
    expect(prompt).toMatch(/obsessive/i)
    expect(prompt).not.toContain('Delivery cues:')
  })
})

describe('resolveLineVoiceDirection', () => {
  it('prefers the line brief, then the matching beat', () => {
    expect(
      resolveLineVoiceDirection({ voiceDirection: '  from line  ', lineId: 'ln_1' }, {
        beats: [{ lineId: 'ln_1', voiceDirection: 'from beat' }],
      })
    ).toBe('from line')
    expect(
      resolveLineVoiceDirection({ lineId: 'ln_1' }, {
        beats: [{ lineId: 'ln_1', voiceDirection: 'from beat' }],
      })
    ).toBe('from beat')
  })
})
