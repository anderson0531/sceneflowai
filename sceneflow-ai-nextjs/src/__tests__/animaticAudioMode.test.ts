import { describe, expect, it } from 'vitest'
import { applyHifiClipAudio } from '@/lib/storyboard/animaticAudioMode'
import { buildProjectAnimaticTimeline } from '@/lib/storyboard/types'
import type { StoryboardAudioClip, StoryboardVisualFrame } from '@/lib/storyboard/types'
import type { BeatAlignedSfxClip } from '@/lib/storyboard/sfxPlayback'

const frames: StoryboardVisualFrame[] = [
  {
    clipId: 'dialogue-bt_d',
    frameType: 'dialogue',
    beatId: 'bt_d',
    beatKind: 'dialogue',
    startTime: 0,
    duration: 4,
    imageUrl: 'https://cdn.test/d.png',
  },
  {
    clipId: 'narration-bt_n',
    frameType: 'dialogue',
    beatId: 'bt_n',
    beatKind: 'narration',
    startTime: 5,
    duration: 3,
    imageUrl: 'https://cdn.test/n.png',
  },
  {
    clipId: 'action-bt_a',
    frameType: 'establishing',
    beatId: 'bt_a',
    beatKind: 'action',
    startTime: 9,
    duration: 6,
    imageUrl: 'https://cdn.test/a.png',
  },
]

const voice: StoryboardAudioClip[] = [
  {
    id: 'voice-d',
    url: 'https://cdn.test/tts-d.mp3',
    startTime: 0,
    duration: 4,
    type: 'dialogue',
    beatId: 'bt_d',
  },
  {
    id: 'voice-n',
    url: 'https://cdn.test/tts-n.mp3',
    startTime: 5,
    duration: 3,
    type: 'dialogue',
    beatId: 'bt_n',
    label: 'Narrator',
  },
]

const sfx: BeatAlignedSfxClip[] = [
  {
    id: 'sfx-beat-bt_a',
    url: 'https://cdn.test/sfx.mp3',
    startTime: 9,
    duration: 3,
    trackType: 'sfx',
    beatId: 'bt_a',
  },
]

const beats = [
  { beatId: 'bt_d', kind: 'dialogue' },
  { beatId: 'bt_n', kind: 'narration' },
  { beatId: 'bt_a', kind: 'action' },
]

describe('applyHifiClipAudio', () => {
  it('replaces dialogue and effects with shot audio and keeps narration', () => {
    const mixed = applyHifiClipAudio({
      voiceClips: voice,
      sfxClips: sfx,
      visualFrames: frames,
      beats,
      clipAudioByBeatId: {
        bt_d: 'https://cdn.test/clip-d.mp3',
        bt_a: 'https://cdn.test/clip-a.mp3',
      },
    })

    expect(mixed.voiceClips.map((clip) => clip.url)).toEqual([
      'https://cdn.test/clip-d.mp3',
      'https://cdn.test/tts-n.mp3',
    ])
    expect(mixed.sfxClips.map((clip) => clip.url)).toEqual(['https://cdn.test/clip-a.mp3'])
    expect(mixed.voiceClips.find((clip) => clip.beatId === 'bt_d')?.startTime).toBe(0)
    expect(mixed.sfxClips[0]?.beatId).toBe('bt_a')
  })

  it('keeps the preview bed when a shot has no clip', () => {
    const mixed = applyHifiClipAudio({
      voiceClips: voice,
      sfxClips: sfx,
      visualFrames: frames,
      beats,
      clipAudioByBeatId: {},
    })
    expect(mixed.voiceClips.map((clip) => clip.id)).toEqual(['voice-d', 'voice-n'])
    expect(mixed.sfxClips.map((clip) => clip.id)).toEqual(['sfx-beat-bt_a'])
  })
})

describe('buildProjectAnimaticTimeline audio mode', () => {
  const scene = {
    beats: [
      {
        beatId: 'bt_d',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Alex',
        line: 'Move.',
        storyboardImageUrl: 'https://cdn.test/d.png',
        musicEnabled: true,
      },
      {
        beatId: 'bt_n',
        sequenceIndex: 1,
        kind: 'narration',
        character: 'NARRATOR',
        line: 'The city waits.',
        storyboardImageUrl: 'https://cdn.test/n.png',
        musicEnabled: true,
      },
      {
        beatId: 'bt_a',
        sequenceIndex: 2,
        kind: 'action',
        actionDescription: 'A door slams.',
        storyboardImageUrl: 'https://cdn.test/a.png',
        musicEnabled: true,
        beatDirection: { audioCue: 'A door slams' },
      },
    ],
    dialogue: [
      { character: 'Alex', line: 'Move.', lineId: 'ln_d' },
      { character: 'NARRATOR', line: 'The city waits.', lineId: 'ln_n', kind: 'narration' },
    ],
    dialogueAudio: {
      en: [
        { lineId: 'ln_d', dialogueIndex: 0, audioUrl: 'https://cdn.test/tts-d.mp3', duration: 2 },
        { lineId: 'ln_n', dialogueIndex: 1, audioUrl: 'https://cdn.test/tts-n.mp3', duration: 2 },
      ],
    },
    music: { description: 'Low strings' },
    musicAudio: 'https://cdn.test/score.mp3',
    musicFileDuration: 20,
    sfx: [{ description: 'A door slams', sourceBeatId: 'bt_a' }],
    sfxAudio: ['https://cdn.test/sfx.mp3'],
  }

  it('keeps TTS, narration, score, and effects in LOFI', () => {
    const timeline = buildProjectAnimaticTimeline([scene], 'en', {}, { audioMode: 'lofi' })
    const urls = timeline.audioClips.map((clip) => clip.url)
    expect(urls).toContain('https://cdn.test/tts-d.mp3')
    expect(urls).toContain('https://cdn.test/tts-n.mp3')
    expect(urls).toContain('https://cdn.test/score.mp3')
    expect(urls).toContain('https://cdn.test/sfx.mp3')
  })

  it('swaps clip audio for dialogue and effects in HIFI and keeps narration and score', () => {
    const timeline = buildProjectAnimaticTimeline([scene], 'en', {}, {
      audioMode: 'hifi',
      clipAudioByBeatId: {
        '0:bt_d': 'https://cdn.test/clip-d.mp3',
        '0:bt_a': 'https://cdn.test/clip-a.mp3',
      },
    })
    const urls = timeline.audioClips.map((clip) => clip.url)
    expect(urls).toContain('https://cdn.test/clip-d.mp3')
    expect(urls).toContain('https://cdn.test/clip-a.mp3')
    expect(urls).not.toContain('https://cdn.test/tts-d.mp3')
    expect(urls).not.toContain('https://cdn.test/sfx.mp3')
    expect(urls).toContain('https://cdn.test/tts-n.mp3')
    expect(urls).toContain('https://cdn.test/score.mp3')
  })
})
