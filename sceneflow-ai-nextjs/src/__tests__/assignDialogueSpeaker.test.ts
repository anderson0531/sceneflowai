import { describe, it, expect } from 'vitest'
import {
  assignDialogueSpeakerToScene,
  resolveSpeakerFields,
} from '@/lib/script/assignDialogueSpeaker'
import { NARRATOR_CHARACTER, NARRATOR_CHARACTER_ID } from '@/lib/script/segmentTypes'

describe('assignDialogueSpeakerToScene', () => {
  it('maps narrator option to reserved NARRATOR fields', () => {
    expect(resolveSpeakerFields({ kind: 'narrator' })).toEqual({
      character: NARRATOR_CHARACTER,
      characterId: NARRATOR_CHARACTER_ID,
      kind: 'narration',
    })
  })

  it('rewrites matching beat + dialogue and clears line audio', () => {
    const scene = {
      beats: [
        {
          beatId: 'b-action',
          kind: 'action',
          action: 'She enters.',
        },
        {
          beatId: 'b-1',
          kind: 'narration',
          character: NARRATOR_CHARACTER,
          characterId: NARRATOR_CHARACTER_ID,
          line: 'Rain taps the glass.',
          lineId: 'line-1',
        },
        {
          beatId: 'b-2',
          kind: 'dialogue',
          character: 'Piper Hayes',
          characterId: 'char-piper',
          line: 'Hello?',
          lineId: 'line-2',
        },
      ],
      dialogue: [
        {
          character: NARRATOR_CHARACTER,
          characterId: NARRATOR_CHARACTER_ID,
          line: 'Rain taps the glass.',
          lineId: 'line-1',
          kind: 'narration',
        },
        {
          character: 'Piper Hayes',
          characterId: 'char-piper',
          line: 'Hello?',
          lineId: 'line-2',
          kind: 'dialogue',
        },
      ],
      dialogueAudio: {
        en: [
          {
            dialogueIndex: 0,
            lineId: 'line-1',
            audioUrl: 'https://example.com/old.mp3',
            url: 'https://example.com/old.mp3',
          },
        ],
      },
    }

    const next = assignDialogueSpeakerToScene(scene, {
      beatId: 'b-1',
      dialogueIndex: 0,
      lineId: 'line-1',
      speaker: { kind: 'character', id: 'char-vesper', name: 'Vesper Thorne' },
    })

    const beats = next.beats as Array<Record<string, unknown>>
    const dialogue = next.dialogue as Array<Record<string, unknown>>
    const narrationBeat = beats.find((b) => b.beatId === 'b-1')
    expect(narrationBeat?.character).toBe('Vesper Thorne')
    expect(narrationBeat?.characterId).toBe('char-vesper')
    expect(narrationBeat?.kind).toBe('dialogue')

    expect(dialogue[0].character).toBe('Vesper Thorne')
    expect(dialogue[0].characterId).toBe('char-vesper')
    expect(dialogue[0].kind).toBe('dialogue')

    const audio = (next.dialogueAudio as { en: Array<Record<string, unknown>> }).en[0]
    expect(audio.audioUrl).toBeUndefined()
    expect(audio.url).toBeUndefined()

    // Other spoken beat unchanged
    expect(beats.find((b) => b.beatId === 'b-2')?.character).toBe('Piper Hayes')
  })

  it('can reassign a dialogue line to Narrator', () => {
    const scene = {
      beats: [
        {
          beatId: 'b-2',
          kind: 'dialogue',
          character: 'Piper Hayes',
          characterId: 'char-piper',
          line: 'Hello?',
          lineId: 'line-2',
        },
      ],
      dialogue: [
        {
          character: 'Piper Hayes',
          characterId: 'char-piper',
          line: 'Hello?',
          lineId: 'line-2',
          kind: 'dialogue',
        },
      ],
    }

    const next = assignDialogueSpeakerToScene(scene, {
      beatId: 'b-2',
      dialogueIndex: 0,
      lineId: 'line-2',
      speaker: { kind: 'narrator' },
    })

    const beat = (next.beats as Array<Record<string, unknown>>)[0]
    expect(beat.character).toBe(NARRATOR_CHARACTER)
    expect(beat.characterId).toBe(NARRATOR_CHARACTER_ID)
    expect(beat.kind).toBe('narration')
    expect((next.dialogue as Array<Record<string, unknown>>)[0].kind).toBe('narration')
  })
})
