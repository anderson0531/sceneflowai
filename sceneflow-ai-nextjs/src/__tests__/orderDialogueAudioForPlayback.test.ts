import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  orderDialogueAudioForPlayback,
  sortDialogueAudioByDialogueIndex,
} from '@/lib/audio/orderDialogueAudioForPlayback'

describe('sortDialogueAudioByDialogueIndex', () => {
  it('orders by dialogueIndex even when array order differs', () => {
    const entries = [
      { dialogueIndex: 2, audioUrl: 'https://cdn.example/line-2-999.mp3' },
      { dialogueIndex: 0, audioUrl: 'https://cdn.example/line-0-111.mp3' },
      { dialogueIndex: 1, audioUrl: 'https://cdn.example/line-1-222.mp3' },
    ]
    expect(sortDialogueAudioByDialogueIndex(entries).map((e) => e.dialogueIndex)).toEqual([
      0, 1, 2,
    ])
  })
})

describe('orderDialogueAudioForPlayback', () => {
  it('follows beat sequence even when regenerated early line has a newer URL timestamp', () => {
    const scene = {
      dialogue: [
        { lineId: 'line-0', character: 'Piper', line: 'First.' },
        { lineId: 'line-1', character: 'Piper', line: 'Second.' },
        { lineId: 'line-2', character: 'Piper', line: 'Third.' },
      ],
      beats: [
        {
          beatId: 'b0',
          sequenceIndex: 0,
          kind: 'dialogue',
          lineId: 'line-0',
          character: 'Piper',
          line: 'First.',
        },
        {
          beatId: 'b1',
          sequenceIndex: 1,
          kind: 'action',
          actionDescription: 'She turns the vault wheel.',
        },
        {
          beatId: 'b2',
          sequenceIndex: 2,
          kind: 'dialogue',
          lineId: 'line-1',
          character: 'Piper',
          line: 'Second.',
        },
        {
          beatId: 'b3',
          sequenceIndex: 3,
          kind: 'dialogue',
          lineId: 'line-2',
          character: 'Piper',
          line: 'Third.',
        },
      ],
      dialogueAudio: {
        en: [
          // Array deliberately out of order; beat 0 regenerated with newest timestamp.
          {
            lineId: 'line-2',
            dialogueIndex: 2,
            audioUrl: 'https://cdn.example/dialogue-1786000000002.mp3',
          },
          {
            lineId: 'line-1',
            dialogueIndex: 1,
            audioUrl: 'https://cdn.example/dialogue-1786000000001.mp3',
          },
          {
            lineId: 'line-0',
            dialogueIndex: 0,
            audioUrl: 'https://cdn.example/dialogue-1786999999999.mp3',
          },
        ],
      },
    }

    const dialogueArray = scene.dialogueAudio.en
    const ordered = orderDialogueAudioForPlayback(scene, 'en', dialogueArray)

    expect(ordered.map((e) => e.dialogueIndex)).toEqual([0, 1, 2])
    expect(ordered.map((e) => e.lineId)).toEqual(['line-0', 'line-1', 'line-2'])
    // Newest timestamp is still first in beat order (not last).
    expect(String(ordered[0].audioUrl)).toContain('1786999999999')
  })

  it('falls back to dialogueIndex sort when the scene has no spoken beats', () => {
    const scene = {
      beats: [
        {
          beatId: 'a0',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Silent establishing shot only.',
        },
      ],
    }
    const dialogueArray = [
      {
        dialogueIndex: 1,
        audioUrl: 'https://cdn.example/b-1786000000099.mp3',
      },
      {
        dialogueIndex: 0,
        audioUrl: 'https://cdn.example/a-1786000000001.mp3',
      },
    ]

    const ordered = orderDialogueAudioForPlayback(scene, 'en', dialogueArray)
    expect(ordered.map((e) => e.dialogueIndex)).toEqual([0, 1])
  })

  it('skips action beats and keeps spoken beat order', () => {
    const scene = {
      dialogue: [
        { lineId: 'd0', character: 'A', line: 'Hi' },
        { lineId: 'd1', character: 'B', line: 'Hello' },
      ],
      beats: [
        {
          beatId: 'a0',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide establishing.',
        },
        {
          beatId: 'd0',
          sequenceIndex: 1,
          kind: 'dialogue',
          lineId: 'd0',
          character: 'A',
          line: 'Hi',
        },
        {
          beatId: 'd1',
          sequenceIndex: 2,
          kind: 'dialogue',
          lineId: 'd1',
          character: 'B',
          line: 'Hello',
        },
      ],
    }
    const dialogueArray = [
      { lineId: 'd1', dialogueIndex: 1, audioUrl: 'https://cdn.example/b.mp3' },
      { lineId: 'd0', dialogueIndex: 0, audioUrl: 'https://cdn.example/a.mp3' },
    ]

    expect(
      orderDialogueAudioForPlayback(scene, 'en', dialogueArray).map((e) => e.lineId)
    ).toEqual(['d0', 'd1'])
  })
})

describe('ScriptPanel calculateAudioTimeline uses beat-order helper', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src/components/vision/ScriptPanel.tsx'),
    'utf8'
  )

  it('does not sort dialogue by URL timestamp', () => {
    expect(source).toContain('orderDialogueAudioForPlayback')
    expect(source).not.toMatch(/TIMESTAMP SORTING ACTIVE/)
    expect(source).not.toMatch(/Sort dialogue by URL timestamp/)
    expect(source).not.toMatch(/getUrlTimestamp/)
  })
})
