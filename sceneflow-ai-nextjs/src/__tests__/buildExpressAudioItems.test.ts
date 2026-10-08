import { readFileSync } from 'fs'
import path from 'path'
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
        {
          beatId: 'bt_action_2',
          sequenceIndex: 2,
          kind: 'action',
          actionDescription: 'Alex watches the alley.',
          beatDirection: { audioCue: 'A metal door slams' },
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
      'sfx-bt_action_2',
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
      beatId: 'bt_action_2',
      recommended: true,
      label: 'A metal door slams',
    })
    expect(defaultExpressAudioSelection(items, 'missing')).toEqual([
      'dialogue-0',
      'sfx-bt_action_2',
    ])
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

    expect(items.map((item) => item.id)).toEqual(['narration'])
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
          beatDirection: { audioCue: 'Radio static crackles' },
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
    expect(items.find((item) => item.id === 'sfx-bt_action_1')).toMatchObject({
      hasAudio: true,
      recommended: true,
    })
  })
})

describe('defaultExpressAudioSelection', () => {
  const items = [
    { id: 'music', kind: 'music' as const, label: 'Background music', typeLabel: 'Music (Lyria)', hasAudio: true },
    { id: 'dialogue-0', kind: 'dialogue' as const, label: 'Alex: Hi', typeLabel: 'Dialogue (TTS)', hasAudio: false },
    { id: 'sfx-bt_1', kind: 'sfx' as const, label: 'Door slam', typeLabel: 'SFX', hasAudio: false, beatId: 'bt_1', recommended: true },
    { id: 'sfx-bt_2', kind: 'sfx' as const, label: 'Looks around', typeLabel: 'SFX', hasAudio: false, beatId: 'bt_2', recommended: false },
  ]

  it('preselects only missing items for missing scope', () => {
    expect(defaultExpressAudioSelection(items, 'missing')).toEqual([
      'dialogue-0',
      'sfx-bt_1',
    ])
  })

  it('preselects recommended sound effects and leaves filler to the music bed', () => {
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

describe('audio quality labels', () => {
  it('does not name the video model in the audio-agent copy', () => {
    const catalog = JSON.parse(
      readFileSync(path.join(process.cwd(), 'messages/app/en/production.json'), 'utf8')
    ) as { expressAudio: Record<string, string>; expressGenerateAll: Record<string, string> }
    const leaks = ['expressAudio', 'expressGenerateAll'].flatMap((section) =>
      Object.entries(catalog[section as 'expressAudio']).flatMap(([key, value]) =>
        typeof value === 'string' && /\bVeo\b/.test(value) ? [`${section}.${key}`] : []
      )
    )
    expect(leaks).toEqual([])
  })
})
