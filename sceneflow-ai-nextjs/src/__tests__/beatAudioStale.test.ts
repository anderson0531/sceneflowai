import { describe, expect, it } from 'vitest'
import {
  audioSourceFingerprintForSpoken,
  isBeatAudioStale,
  stampStaleBeatAudioOnScene,
} from '@/lib/audio/beatAudioStale'
import { mergeScenesForScriptSave } from '@/lib/audio/cleanupAudio'
import {
  buildExpressAudioItems,
  defaultExpressAudioSelection,
} from '@/lib/audio/buildExpressAudioItems'

describe('beat audio stale detection', () => {
  it('treats exact fingerprint match as in sync', () => {
    const fingerprint = audioSourceFingerprintForSpoken({
      kind: 'dialogue',
      character: 'Alex',
      line: 'We need to move now.',
    })
    expect(
      isBeatAudioStale({
        hasAudio: true,
        sourceFingerprint: fingerprint,
        currentFingerprint: fingerprint,
      })
    ).toBe(false)
  })

  it('marks stale when spoken line text changes', () => {
    const generated = audioSourceFingerprintForSpoken({
      kind: 'dialogue',
      character: 'Alex',
      line: 'We need to move now.',
    })
    const current = audioSourceFingerprintForSpoken({
      kind: 'dialogue',
      character: 'Alex',
      line: 'We should wait here.',
    })
    expect(
      isBeatAudioStale({
        hasAudio: true,
        sourceFingerprint: generated,
        currentFingerprint: current,
      })
    ).toBe(true)
  })

  it('uses audioStale flag when fingerprint is missing', () => {
    expect(
      isBeatAudioStale({
        hasAudio: true,
        currentFingerprint: 'dialogue|ALEX|hello',
      })
    ).toBe(false)
    expect(
      isBeatAudioStale({
        hasAudio: true,
        audioStale: true,
        currentFingerprint: 'dialogue|ALEX|hello',
      })
    ).toBe(true)
  })

  it('stamps audioStale on script merge without clearing the URL', () => {
    const canonical = [
      {
        id: 's1',
        beats: [
          {
            beatId: 'bt_1',
            sequenceIndex: 0,
            kind: 'dialogue',
            character: 'Alex',
            line: 'We need to move now.',
            lineId: 'ln_1',
          },
        ],
        dialogue: [{ lineId: 'ln_1', character: 'Alex', line: 'We need to move now.' }],
        dialogueAudio: {
          en: [
            {
              lineId: 'ln_1',
              dialogueIndex: 0,
              character: 'Alex',
              audioUrl: 'https://blob.example/alex.mp3',
            },
          ],
        },
      },
    ]
    const incoming = [
      {
        id: 's1',
        beats: [
          {
            beatId: 'bt_1',
            sequenceIndex: 0,
            kind: 'dialogue',
            character: 'Alex',
            line: 'We should wait here.',
            lineId: 'ln_1',
          },
        ],
        dialogue: [{ lineId: 'ln_1', character: 'Alex', line: 'We should wait here.' }],
      },
    ]

    const merged = mergeScenesForScriptSave(canonical, incoming)
    const entry = merged[0].dialogueAudio.en[0]
    expect(entry.audioUrl).toBe('https://blob.example/alex.mp3')
    expect(entry.audioStale).toBe(true)
  })

  it('compares stored fingerprint on the scene without deleting audio', () => {
    const scene = stampStaleBeatAudioOnScene(undefined, {
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alex',
          line: 'Changed line.',
          lineId: 'ln_1',
        },
      ],
      dialogue: [{ lineId: 'ln_1', character: 'Alex', line: 'Changed line.' }],
      dialogueAudio: {
        en: [
          {
            lineId: 'ln_1',
            dialogueIndex: 0,
            character: 'Alex',
            audioUrl: 'https://blob.example/alex.mp3',
            sourceFingerprint: audioSourceFingerprintForSpoken({
              kind: 'dialogue',
              character: 'Alex',
              line: 'Original line.',
            }),
          },
        ],
      },
    })
    expect((scene.dialogueAudio as any).en[0].audioUrl).toBe('https://blob.example/alex.mp3')
    expect((scene.dialogueAudio as any).en[0].audioStale).toBe(true)
  })
})

describe('Express missing-scope includes stale clips', () => {
  it('treats prompt-changed dialogue as not hasAudio', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_dialogue_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alex',
          line: 'We should wait here.',
          lineId: 'ln_1',
        },
      ],
      dialogue: [
        {
          lineId: 'ln_1',
          character: 'Alex',
          line: 'We should wait here.',
        },
      ],
      dialogueAudio: {
        en: [
          {
            lineId: 'ln_1',
            dialogueIndex: 0,
            character: 'Alex',
            audioUrl: 'https://example.com/alex.mp3',
            sourceFingerprint: audioSourceFingerprintForSpoken({
              kind: 'dialogue',
              character: 'Alex',
              line: 'We need to move now.',
            }),
          },
        ],
      },
    } as Record<string, unknown>

    const items = buildExpressAudioItems(scene, 'en')
    expect(items).toHaveLength(1)
    expect(items[0].stale).toBe(true)
    expect(items[0].hasAudio).toBe(false)
    expect(defaultExpressAudioSelection(items, 'missing')).toEqual(['dialogue-0'])
  })

  it('treats prompt-changed SFX as not hasAudio', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_action_1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Glass shatters on the floor.',
        },
      ],
      dialogue: [],
      sfx: [
        {
          sourceBeatId: 'bt_action_1',
          description: 'Wind howls',
          audioUrl: 'https://example.com/wind.mp3',
          sourceFingerprint: 'Wind howls through the alley.',
        },
      ],
      sfxAudio: ['https://example.com/wind.mp3'],
    } as Record<string, unknown>

    const items = buildExpressAudioItems(scene, 'en')
    const sfx = items.find((item) => item.id === 'sfx-bt_action_1')
    expect(sfx?.stale).toBe(true)
    expect(sfx?.hasAudio).toBe(false)
    expect(defaultExpressAudioSelection(items, 'missing')).toContain('sfx-bt_action_1')
  })
})
