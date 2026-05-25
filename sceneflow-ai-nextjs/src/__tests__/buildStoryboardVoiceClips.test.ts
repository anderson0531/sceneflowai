import { describe, it, expect } from 'vitest'
import {
  buildStoryboardVoiceClips,
  buildStoryboardVisualTimeline,
  getDialogueFrameUrl,
} from '@/lib/storyboard/types'

const NARRATION_URL = 'https://example.com/narration.mp3'
const SARAH_URL = 'https://example.com/sarah.mp3'
const BOB_URL = 'https://example.com/bob.mp3'

describe('buildStoryboardVoiceClips', () => {
  it('uses script dialogueIndex for clip ids when narrator occupies array index 0', () => {
    const scene = {
      narration: 'Opening voiceover for the scene.',
      action: 'INT. ROOM - DAY',
      narrationAudioUrl: NARRATION_URL,
      narrationAudio: { en: { url: NARRATION_URL, duration: 4 } },
      dialogue: [
        { character: 'Sarah', line: 'Hello there.' },
        { character: 'Bob', line: 'Hi Sarah.' },
      ],
      dialogueAudio: {
        en: [
          {
            kind: 'narration',
            characterId: 'narrator',
            audioUrl: NARRATION_URL,
          },
          {
            character: 'Sarah',
            dialogueIndex: 0,
            audioUrl: SARAH_URL,
            duration: 2.5,
          },
        ],
      },
    }

    const clips = buildStoryboardVoiceClips(scene, 'en', {
      [NARRATION_URL]: 4,
      [SARAH_URL]: 2.5,
    })

    const narrationClip = clips.find((c) => c.id === 'narration')
    expect(narrationClip?.url).toBe(NARRATION_URL)

    const dialogueClips = clips.filter((c) => c.type === 'dialogue')
    expect(dialogueClips).toHaveLength(1)
    expect(dialogueClips[0].id).toBe('dialogue-0')
    expect(dialogueClips[0].dialogueIndex).toBe(0)
    expect(dialogueClips[0].url).toBe(SARAH_URL)
    expect(dialogueClips[0].label).toBe('Sarah')

    const visualFrames = buildStoryboardVisualTimeline(scene, clips)
    const sarahFrame = visualFrames.find((f) => f.dialogueIndex === 0)
    expect(sarahFrame?.character).toBe('Sarah')
    expect(sarahFrame?.line).toBe('Hello there.')
  })

  it('does not schedule ghost narration when narration duplicates visualDescription', () => {
    const scene = {
      narration: 'The rainy street.',
      visualDescription: 'The rainy street.',
      narrationAudio: { en: { url: NARRATION_URL, duration: 4 } },
      dialogue: [{ character: 'Sarah', line: 'Hello there.' }],
      dialogueAudio: {
        en: [
          {
            character: 'Sarah',
            dialogueIndex: 0,
            audioUrl: SARAH_URL,
            duration: 2.5,
          },
        ],
      },
    }

    const clips = buildStoryboardVoiceClips(scene, 'en')
    expect(clips.find((c) => c.id === 'narration')).toBeUndefined()
    expect(clips.filter((c) => c.type === 'dialogue')).toHaveLength(1)
  })

  it('sorts dialogue clips by dialogueIndex when array order differs', () => {
    const scene = {
      dialogue: [
        { character: 'Sarah', line: 'First.' },
        { character: 'Bob', line: 'Second.' },
      ],
      dialogueAudio: {
        en: [
          {
            character: 'Bob',
            dialogueIndex: 1,
            audioUrl: 'https://example.com/bob.mp3',
            duration: 2,
          },
          {
            character: 'Sarah',
            dialogueIndex: 0,
            audioUrl: SARAH_URL,
            duration: 2,
          },
        ],
      },
    }

    const clips = buildStoryboardVoiceClips(scene, 'en')
    const dialogueClips = clips.filter((c) => c.type === 'dialogue')

    expect(dialogueClips.map((c) => c.id)).toEqual(['dialogue-0', 'dialogue-1'])
    expect(dialogueClips[0].startTime).toBeLessThan(dialogueClips[1].startTime)
  })

  it('resolves first character via lineId when stored dialogueIndex is wrong', () => {
    const scene = {
      dialogue: [
        { lineId: 'line-sarah', character: 'Sarah', line: 'Hello there.' },
        { lineId: 'line-bob', character: 'Bob', line: 'Hi Sarah.' },
      ],
      dialogueAudio: {
        en: [
          {
            kind: 'narration',
            characterId: 'narrator',
            audioUrl: NARRATION_URL,
          },
          {
            lineId: 'line-sarah',
            character: 'Sarah',
            dialogueIndex: 1,
            audioUrl: SARAH_URL,
            duration: 2.5,
          },
          {
            lineId: 'line-bob',
            character: 'Bob',
            dialogueIndex: 1,
            audioUrl: BOB_URL,
            duration: 2,
          },
        ],
      },
    }

    const clips = buildStoryboardVoiceClips(scene, 'en', {
      [SARAH_URL]: 2.5,
      [BOB_URL]: 2,
    })
    const dialogueClips = clips.filter((c) => c.type === 'dialogue')

    expect(dialogueClips.map((c) => c.id)).toEqual(['dialogue-0', 'dialogue-1'])
    expect(dialogueClips[0].url).toBe(SARAH_URL)
    expect(dialogueClips[1].url).toBe(BOB_URL)

    const visualFrames = buildStoryboardVisualTimeline(scene, clips)
    expect(visualFrames.find((f) => f.dialogueIndex === 0)?.character).toBe('Sarah')
    expect(visualFrames.find((f) => f.dialogueIndex === 1)?.character).toBe('Bob')
  })

  it('uses stored dialogue duration when dynamic metadata is a poisoned 404 placeholder', () => {
    const andersonUrl = 'https://example.com/anderson-broken.mp3'
    const scene = {
      dialogue: [
        { character: 'Sarah', line: 'First.' },
        { character: 'Bob', line: 'Second.' },
      ],
      dialogueAudio: {
        en: [
          {
            character: 'Sarah',
            dialogueIndex: 0,
            audioUrl: SARAH_URL,
            duration: 2,
          },
          {
            character: 'Bob',
            dialogueIndex: 1,
            audioUrl: andersonUrl,
            duration: 10.5,
          },
        ],
      },
    }

    const clips = buildStoryboardVoiceClips(scene, 'en', {
      [SARAH_URL]: 2,
      [andersonUrl]: 0.1,
    })
    const bobClip = clips.find((c) => c.id === 'dialogue-1')
    expect(bobClip?.duration).toBe(10.5)
  })

  it('schedules both dialogue lines when they share the same stale URL', () => {
    const sharedUrl = 'https://example.com/shared-stale.mp3'
    const scene = {
      dialogue: [
        { character: 'Sarah', line: 'First.' },
        { character: 'Bob', line: 'Second.' },
      ],
      dialogueAudio: {
        en: [
          {
            character: 'Sarah',
            dialogueIndex: 0,
            audioUrl: sharedUrl,
            duration: 2,
          },
          {
            character: 'Bob',
            dialogueIndex: 1,
            audioUrl: sharedUrl,
            duration: 3,
          },
        ],
      },
    }

    const clips = buildStoryboardVoiceClips(scene, 'en')
    const dialogueClips = clips.filter((c) => c.type === 'dialogue')
    expect(dialogueClips).toHaveLength(2)
    expect(dialogueClips.map((c) => c.id)).toEqual(['dialogue-0', 'dialogue-1'])
  })

  it('plays dialogue in script order when manual uploads were pushed out of order', () => {
    const scene = {
      dialogue: [
        { lineId: 'line-sarah', character: 'Sarah', line: 'First.' },
        { lineId: 'line-bob', character: 'Bob', line: 'Second.' },
      ],
      dialogueAudio: {
        en: [
          {
            lineId: 'line-bob',
            character: 'Bob',
            dialogueIndex: 99,
            audioUrl: BOB_URL,
            duration: 2,
          },
          {
            lineId: 'line-sarah',
            character: 'Sarah',
            dialogueIndex: 99,
            audioUrl: SARAH_URL,
            duration: 2,
          },
        ],
      },
    }

    const clips = buildStoryboardVoiceClips(scene, 'en')
    const dialogueClips = clips.filter((c) => c.type === 'dialogue')

    expect(dialogueClips.map((c) => ({ id: c.id, url: c.url }))).toEqual([
      { id: 'dialogue-0', url: SARAH_URL },
      { id: 'dialogue-1', url: BOB_URL },
    ])
  })

  it('aligns narrator-as-dialogue beat frame to first voice clip when action beat exists', () => {
    const NARRATOR_BEAT_URL = 'https://example.com/narrator-frame.jpg'
    const ACTION_URL = 'https://example.com/establishing.jpg'
    const scene = {
      imageUrl: ACTION_URL,
      dialogue: [
        {
          lineId: 'ln_narr',
          kind: 'narration',
          character: 'NARRATOR',
          characterId: 'narrator',
          line: 'Opening voiceover.',
          audioUrl: NARRATION_URL,
        },
        {
          lineId: 'ln_sarah',
          character: 'Sarah',
          line: 'Hello there.',
          audioUrl: SARAH_URL,
        },
      ],
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide shot',
          storyboardImageUrl: ACTION_URL,
        },
        {
          beatId: 'bt_narr',
          sequenceIndex: 1,
          kind: 'narration',
          character: 'NARRATOR',
          characterId: 'narrator',
          line: 'Opening voiceover.',
          lineId: 'ln_narr',
          storyboardImageUrl: NARRATOR_BEAT_URL,
          audioUrl: NARRATION_URL,
          durationSeconds: 4,
        },
        {
          beatId: 'bt_sarah',
          sequenceIndex: 2,
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Hello there.',
          lineId: 'ln_sarah',
          storyboardImageUrl: 'https://example.com/sarah-frame.jpg',
          audioUrl: SARAH_URL,
          durationSeconds: 2.5,
        },
      ],
    }

    const clips = buildStoryboardVoiceClips(scene, 'en', {
      [NARRATION_URL]: 4,
      [SARAH_URL]: 2.5,
    })
    expect(clips).toHaveLength(2)
    expect(clips[0].dialogueIndex).toBe(0)
    expect(clips[0].startTime).toBe(0)

    const visualFrames = buildStoryboardVisualTimeline(scene, clips)
    expect(visualFrames[0].startTime).toBe(0)
    expect(visualFrames[0].imageUrl).toBe(NARRATOR_BEAT_URL)
    expect(visualFrames[0].dialogueIndex).toBe(0)
    expect(visualFrames[1].imageUrl).toBe('https://example.com/sarah-frame.jpg')
  })

  it('schedules narrator beat when audio is on dialogue line but missing from beat.audioUrl', () => {
    const scene = {
      imageUrl: 'https://example.com/establishing.jpg',
      dialogue: [
        {
          lineId: 'ln_narr',
          kind: 'narration',
          character: 'NARRATOR',
          characterId: 'narrator',
          line: 'Opening voiceover.',
          audioUrl: NARRATION_URL,
          duration: 4,
        },
        {
          lineId: 'ln_sarah',
          character: 'Sarah',
          line: 'Hello there.',
          audioUrl: SARAH_URL,
          duration: 2.5,
        },
      ],
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide shot',
          storyboardImageUrl: 'https://example.com/establishing.jpg',
        },
        {
          beatId: 'bt_narr',
          sequenceIndex: 1,
          kind: 'narration',
          character: 'NARRATOR',
          characterId: 'narrator',
          line: 'Opening voiceover.',
          lineId: 'ln_narr',
          storyboardImageUrl: 'https://example.com/narrator-frame.jpg',
        },
        {
          beatId: 'bt_sarah',
          sequenceIndex: 2,
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Hello there.',
          lineId: 'ln_sarah',
          storyboardImageUrl: 'https://example.com/sarah-frame.jpg',
          audioUrl: SARAH_URL,
          durationSeconds: 2.5,
        },
      ],
    }

    const clips = buildStoryboardVoiceClips(scene, 'en', {
      [NARRATION_URL]: 4,
      [SARAH_URL]: 2.5,
    })

    expect(clips).toHaveLength(2)
    expect(clips[0].url).toBe(NARRATION_URL)
    expect(clips[0].dialogueIndex).toBe(0)
    expect(clips[0].startTime).toBe(0)

    const visualFrames = buildStoryboardVisualTimeline(scene, clips)
    expect(visualFrames[0].imageUrl).toBe('https://example.com/narrator-frame.jpg')
    expect(visualFrames[0].dialogueIndex).toBe(0)
  })
})

describe('getDialogueFrameUrl', () => {
  it('reads storyboardImageUrl from segments when flat dialogue lacks it', () => {
    const scene = {
      imageUrl: 'https://example.com/establishing.png',
      dialogue: [{ lineId: 'ln-1', character: 'Sarah', line: 'Hello.' }],
      segments: [
        {
          segmentId: 'seg-1',
          dialogue: [
            {
              lineId: 'ln-1',
              character: 'Sarah',
              line: 'Hello.',
              kind: 'dialogue',
              storyboardImageUrl: 'https://example.com/segment-frame.png',
            },
          ],
        },
      ],
    }

    expect(getDialogueFrameUrl(scene, 0)).toBe('https://example.com/segment-frame.png')
  })

  it('rejects deferred placeholder for establishing frame', () => {
    const scene = { imageUrl: 'deferred', dialogue: [] }
    expect(getDialogueFrameUrl(scene, 0)).toBeUndefined()
  })
})
