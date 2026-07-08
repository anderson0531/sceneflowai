import { describe, expect, it } from 'vitest'
import {
  buildExpressAudioItems,
  defaultExpressAudioSelection,
  parseExpressAudioSelectedIds,
} from '@/lib/audio/buildExpressAudioItems'

describe('buildExpressAudioItems', () => {
  it('returns music first, then timeline beats with correct audio status', () => {
    const scene = {
      music: { prompt: 'Tense underscore' },
      musicAudio: { url: 'https://example.com/music.mp3' },
      beats: [
        {
          beatId: 'bt_dialogue_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alex',
          line: 'We need to move now.',
          lineId: 'ln_1',
        },
        {
          beatId: 'bt_action_1',
          sequenceIndex: 1,
          kind: 'action',
          actionDescription: 'Wind howls through the alley.',
        },
      ],
      dialogue: [
        {
          lineId: 'ln_1',
          character: 'Alex',
          line: 'We need to move now.',
        },
      ],
      dialogueAudio: {
        en: [],
      },
      sfx: [],
      sfxAudio: [],
    } as Record<string, unknown>

    const items = buildExpressAudioItems(scene, 'en')

    expect(items.map((item) => item.id)).toEqual([
      'music',
      'dialogue-0',
      'sfx-bt_action_1',
    ])
    expect(items[0]).toMatchObject({
      kind: 'music',
      hasAudio: true,
      typeLabel: 'Music (Lyria)',
    })
    expect(items[1]).toMatchObject({
      kind: 'dialogue',
      hasAudio: false,
      label: 'Alex: We need to move now.',
    })
    expect(items[2]).toMatchObject({
      kind: 'sfx',
      beatId: 'bt_action_1',
      hasAudio: false,
    })
  })

  it('adds legacy scene narration when it is not represented in beats', () => {
    const scene = {
      narration: 'The city never sleeps.',
      beats: [
        {
          beatId: 'bt_action_1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Neon signs flicker.',
        },
      ],
      dialogue: [],
      sfx: [],
      sfxAudio: [],
    } as Record<string, unknown>

    const items = buildExpressAudioItems(scene, 'en')

    expect(items.map((item) => item.id)).toEqual(['narration', 'sfx-bt_action_1'])
    expect(items[0]).toMatchObject({
      kind: 'narration',
      hasAudio: false,
      label: 'The city never sleeps.',
    })
  })

  it('detects ready dialogue and sfx audio', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_dialogue_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Sam',
          line: 'Copy that.',
          lineId: 'ln_2',
        },
        {
          beatId: 'bt_action_1',
          sequenceIndex: 1,
          kind: 'action',
          actionDescription: 'Radio static crackles.',
        },
      ],
      dialogue: [
        {
          lineId: 'ln_2',
          character: 'Sam',
          line: 'Copy that.',
        },
      ],
      dialogueAudio: {
        en: [{ dialogueIndex: 0, audioUrl: 'https://example.com/dialogue.mp3' }],
      },
      sfx: [{ description: 'Radio static crackles.', sourceBeatId: 'bt_action_1' }],
      sfxAudio: ['https://example.com/sfx.mp3'],
    } as Record<string, unknown>

    const items = buildExpressAudioItems(scene, 'en')

    expect(items.find((item) => item.id === 'dialogue-0')?.hasAudio).toBe(true)
    expect(items.find((item) => item.id === 'sfx-bt_action_1')?.hasAudio).toBe(true)
  })
})

describe('defaultExpressAudioSelection', () => {
  const items = [
    { id: 'music', kind: 'music' as const, label: 'Background music', typeLabel: 'Music (Lyria)', hasAudio: true },
    { id: 'dialogue-0', kind: 'dialogue' as const, label: 'Alex: Hi', typeLabel: 'Dialogue (TTS)', hasAudio: false },
    { id: 'sfx-bt_1', kind: 'sfx' as const, label: 'Wind', typeLabel: 'Action SFX (Veo)', hasAudio: false, beatId: 'bt_1' },
  ]

  it('preselects only missing items for missing scope', () => {
    expect(defaultExpressAudioSelection(items, 'missing')).toEqual([
      'dialogue-0',
      'sfx-bt_1',
    ])
  })

  it('preselects all items for all scope', () => {
    expect(defaultExpressAudioSelection(items, 'all')).toEqual([
      'music',
      'dialogue-0',
      'sfx-bt_1',
    ])
  })
})

describe('parseExpressAudioSelectedIds', () => {
  it('parses selected ids into generation lanes', () => {
    expect(
      parseExpressAudioSelectedIds([
        'narration',
        'dialogue-0',
        'dialogue-2',
        'music',
        'sfx-bt_action_1',
      ])
    ).toEqual({
      includeNarration: true,
      dialogueIndices: [0, 2],
      includeMusic: true,
      sfxBeatIds: ['bt_action_1'],
    })
  })
})
