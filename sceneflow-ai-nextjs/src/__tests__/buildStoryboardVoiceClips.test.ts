import { describe, it, expect } from 'vitest'
import { flatSceneToBeats, resolveRawBeatIndex } from '@/lib/script/beatMigration'
import {
  buildBeatFirstPlaybackTimeline,
  buildProjectAnimaticTimeline,
  buildStoryboardVoiceClips,
  buildStoryboardVisualTimeline,
  enumerateStoryboardFrameSlots,
  getCurrentStoryboardVisualFrame,
  getDialogueFrameUrl,
  getScenePlayableThumbnailUrl,
  SCENE_FADE_TO_BLACK_SEC,
} from '@/lib/storyboard/types'
import {
  migrateProjectBeatsToStartFrameOnly,
  migrateSceneBeatsToStartFrameOnly,
} from '@/lib/script/beatMigration'

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
      action: 'Wide shot',
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

    const { voiceClips: clips, visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [NARRATION_URL]: 4,
      [SARAH_URL]: 2.5,
    })
    expect(clips).toHaveLength(2)
    expect(clips[0].dialogueIndex).toBe(0)
    expect(clips[0].startTime).toBeCloseTo(4.3, 1)

    expect(visualFrames).toHaveLength(3)
    expect(visualFrames[0].startTime).toBe(0)
    expect(visualFrames[0].imageUrl).toBe(ACTION_URL)
    expect(visualFrames[0].beatId).toBe('bt_action')
    expect(visualFrames[1].startTime).toBeCloseTo(4.3, 1)
    expect(visualFrames[1].imageUrl).toBe(NARRATOR_BEAT_URL)
    expect(visualFrames[1].beatId).toBe('bt_narr')
    expect(visualFrames[1].dialogueIndex).toBe(0)
    expect(visualFrames[2].imageUrl).toBe('https://example.com/sarah-frame.jpg')
  })

  it('schedules narrator beat when audio is on dialogue line but missing from beat.audioUrl', () => {
    const scene = {
      action: 'Wide shot',
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

    const { voiceClips: clips, visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [NARRATION_URL]: 4,
      [SARAH_URL]: 2.5,
    })

    expect(clips).toHaveLength(2)
    expect(clips[0].url).toBe(NARRATION_URL)
    expect(clips[0].dialogueIndex).toBe(0)
    expect(clips[0].startTime).toBeCloseTo(4.3, 1)

    expect(visualFrames[0].beatId).toBe('bt_action')
    expect(visualFrames[1].imageUrl).toBe('https://example.com/narrator-frame.jpg')
    expect(visualFrames[1].dialogueIndex).toBe(0)
  })

  it('aligns spoken beat images when narrator beat is not in dialogue array', () => {
    const NARRATOR_FRAME = 'https://example.com/narrator-frame.jpg'
    const ALICE_FRAME = 'https://example.com/alice-frame.jpg'
    const BOB_FRAME = 'https://example.com/bob-frame.jpg'
    const scene = {
      action: 'Wide shot',
      imageUrl: 'https://example.com/establishing.jpg',
      dialogue: [
        { lineId: 'ln_alice', character: 'Alice', line: 'Hello.', audioUrl: SARAH_URL, duration: 2 },
        { lineId: 'ln_bob', character: 'Bob', line: 'Hi.', audioUrl: BOB_URL, duration: 2 },
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
          line: 'Opening voiceover.',
          lineId: 'ln_narr',
          storyboardImageUrl: NARRATOR_FRAME,
          audioUrl: NARRATION_URL,
          durationSeconds: 4,
        },
        {
          beatId: 'bt_alice',
          sequenceIndex: 2,
          kind: 'dialogue',
          character: 'Alice',
          line: 'Hello.',
          lineId: 'ln_alice',
          storyboardImageUrl: ALICE_FRAME,
          audioUrl: SARAH_URL,
          durationSeconds: 2,
        },
        {
          beatId: 'bt_bob',
          sequenceIndex: 3,
          kind: 'dialogue',
          character: 'Bob',
          line: 'Hi.',
          lineId: 'ln_bob',
          storyboardImageUrl: BOB_FRAME,
          audioUrl: BOB_URL,
          durationSeconds: 2,
        },
      ],
    }

    const { voiceClips: clips, visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [NARRATION_URL]: 4,
      [SARAH_URL]: 2,
      [BOB_URL]: 2,
    })

    expect(clips).toHaveLength(3)
    expect(clips[0].url).toBe(NARRATION_URL)
    expect(clips[0].id).toBe('beat-bt_narr')
    expect(clips[0].dialogueIndex).toBeUndefined()
    expect(clips[0].startTime).toBeCloseTo(4.3, 1)
    expect(clips[1].dialogueIndex).toBe(0)
    expect(clips[2].dialogueIndex).toBe(1)

    expect(visualFrames).toHaveLength(4)
    expect(visualFrames.map((f) => f.imageUrl)).toEqual([
      'https://example.com/establishing.jpg',
      NARRATOR_FRAME,
      ALICE_FRAME,
      BOB_FRAME,
    ])
  })

  it('starts dialogue on frame 1 when scene has no leading action beat', () => {
    const scene = {
      dialogue: [{ character: 'Sarah Chen', line: 'Hello.', audioUrl: SARAH_URL, duration: 3 }],
      beats: [
        {
          beatId: 'bt_b1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Sarah Chen',
          line: 'Hello.',
          storyboardImageUrl: 'https://example.com/sarah.jpg',
          audioUrl: SARAH_URL,
          durationSeconds: 3,
        },
      ],
    }

    const { voiceClips, visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    expect(voiceClips[0].startTime).toBe(0)
    expect(visualFrames).toHaveLength(1)
    expect(visualFrames[0].startTime).toBe(0)
    expect(visualFrames[0].imageUrl).toBe('https://example.com/sarah.jpg')
  })

  it('plays narrator as first clip when audio lives only in dialogueAudio on a 7-slot scene', () => {
    const EST_URL = 'https://example.com/establishing.jpg'
    const B1_URL = 'https://example.com/b1-narrator.mp3'
    const B2_URL = 'https://example.com/b2-sarah.mp3'
    const B1_FRAME = 'https://example.com/b1-frame.jpg'
    const B2_FRAME = 'https://example.com/b2-frame.jpg'
    const scene = {
      imageUrl: EST_URL,
      dialogue: [
        {
          lineId: 'ln_b1',
          kind: 'narration',
          character: 'NARRATOR',
          characterId: 'narrator',
          line: 'Welcome to The Signal Stream.',
          storyboardImageUrl: B1_FRAME,
        },
        {
          lineId: 'ln_b2',
          character: 'Sarah Chen',
          line: 'Dr. Anderson, the news cycle is practically euphoric.',
          storyboardImageUrl: B2_FRAME,
        },
      ],
      dialogueAudio: {
        en: [
          {
            lineId: 'ln_b1',
            kind: 'narration',
            characterId: 'narrator',
            dialogueIndex: 0,
            audioUrl: B1_URL,
            duration: 8,
          },
          {
            lineId: 'ln_b2',
            character: 'Sarah Chen',
            dialogueIndex: 1,
            audioUrl: B2_URL,
            duration: 6,
          },
        ],
      },
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Establishing',
          storyboardImageUrl: EST_URL,
        },
        {
          beatId: 'bt_b1',
          sequenceIndex: 1,
          kind: 'narration',
          character: 'NARRATOR',
          characterId: 'narrator',
          line: 'Welcome to The Signal Stream.',
          lineId: 'ln_b1',
          storyboardImageUrl: B1_FRAME,
        },
        {
          beatId: 'bt_b2',
          sequenceIndex: 2,
          kind: 'dialogue',
          character: 'Sarah Chen',
          line: 'Dr. Anderson, the news cycle is practically euphoric.',
          lineId: 'ln_b2',
          storyboardImageUrl: B2_FRAME,
        },
      ],
    }

    const { voiceClips: clips, visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [B1_URL]: 8,
      [B2_URL]: 6,
    })
    expect(clips).toHaveLength(2)
    expect(clips[0].beatId).toBe('bt_b1')
    expect(clips[0].url).toBe(B1_URL)
    expect(clips[0].startTime).toBeCloseTo(4.3, 1)
    expect(clips[0].dialogueIndex).toBe(0)
    expect(clips[1].beatId).toBe('bt_b2')

    expect(visualFrames).toHaveLength(3)
    expect(visualFrames[0].beatId).toBe('bt_action')
    expect(visualFrames[0].startTime).toBe(0)
    expect(visualFrames[1].imageUrl).toBe(B1_FRAME)
    expect(visualFrames[1].beatId).toBe('bt_b1')
    expect(visualFrames[1].startTime).toBeCloseTo(4.3, 1)
    expect(visualFrames[1].clipId).toBe(clips[0].id)
    expect(visualFrames[2].imageUrl).toBe(B2_FRAME)
  })

  it('starts narrator on frame 1 at t=0 when scene has imageUrl but no explicit action', () => {
    const B1_URL = 'https://example.com/b1-narrator.mp3'
    const B1_FRAME = 'https://example.com/b1-frame.jpg'
    const scene = {
      imageUrl: 'https://example.com/establishing.jpg',
      dialogue: [
        {
          lineId: 'ln_b1',
          kind: 'narration',
          character: 'NARRATOR',
          characterId: 'narrator',
          line: 'Welcome to The Signal Stream.',
          storyboardImageUrl: B1_FRAME,
          audioUrl: B1_URL,
          duration: 8,
        },
      ],
    }

    const beats = flatSceneToBeats(scene)
    expect(beats.some((b) => b.kind === 'action')).toBe(false)
    expect(beats[0].kind).toBe('narration')

    const { voiceClips, visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [B1_URL]: 8,
    })
    expect(voiceClips[0].startTime).toBe(0)
    expect(visualFrames).toHaveLength(1)
    expect(visualFrames[0].startTime).toBe(0)
    expect(visualFrames[0].imageUrl).toBe(B1_FRAME)
  })

  it('plays all six dialogue lines when leading action mirrors synced scene.action fallback', () => {
    const BLOCKING =
      'INT. NEWS STUDIO - NIGHT. Two hosts at the desk, monitors glow behind them.'
    const lines = [
      {
        lineId: 'ln_narr',
        kind: 'narration',
        character: 'NARRATOR',
        characterId: 'narrator',
        line: 'Welcome to The Signal Stream.',
        storyboardImageUrl: 'https://example.com/f1.jpg',
      },
      {
        lineId: 'ln_sarah1',
        character: 'Sarah Chen',
        line: 'Dr. Anderson, the news cycle is practically euphoric.',
        storyboardImageUrl: 'https://example.com/f2.jpg',
      },
      {
        lineId: 'ln_ben1',
        character: 'Dr. Benjamin Anderson',
        line: 'Indeed, Sarah. For the public, it is a narrative of diplomatic success.',
        storyboardImageUrl: 'https://example.com/f3.jpg',
      },
      {
        lineId: 'ln_sarah2',
        character: 'Sarah Chen',
        line: 'Pacified? Or managed?',
        storyboardImageUrl: 'https://example.com/f4.jpg',
      },
      {
        lineId: 'ln_ben2',
        character: 'Dr. Benjamin Anderson',
        line: 'A performance. Yes.',
        storyboardImageUrl: 'https://example.com/f5.jpg',
      },
      {
        lineId: 'ln_sarah3',
        character: 'Sarah Chen',
        line: "You're familiar with the term, then.",
        storyboardImageUrl: 'https://example.com/f6.jpg',
      },
    ]
    const durations = [6.4, 7.2, 5.3, 6.9, 7.0, 4.1]
    const urls = durations.map((_, i) => `https://example.com/line-${i}.mp3`)
    const scene = {
      imageUrl: 'https://example.com/establishing.jpg',
      action: BLOCKING,
      visualDescription: BLOCKING,
      dialogue: lines,
      dialogueAudio: {
        en: lines.map((line, dialogueIndex) => ({
          lineId: line.lineId,
          character: line.character,
          characterId: (line as { characterId?: string }).characterId,
          kind: (line as { kind?: string }).kind,
          dialogueIndex,
          audioUrl: urls[dialogueIndex],
          duration: durations[dialogueIndex],
        })),
      },
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: BLOCKING,
          storyboardImageUrl: 'https://example.com/establishing.jpg',
        },
        ...lines.map((line, i) => ({
          beatId: `bt_${i}`,
          sequenceIndex: i + 1,
          kind: line.kind === 'narration' ? 'narration' : 'dialogue',
          character: line.character,
          characterId: (line as { characterId?: string }).characterId,
          line: line.line,
          lineId: line.lineId,
          storyboardImageUrl: line.storyboardImageUrl,
        })),
      ],
    }

    const { voiceClips, visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', Object.fromEntries(urls.map((u, i) => [u, durations[i]])))

    expect(voiceClips).toHaveLength(6)
    expect(visualFrames).toHaveLength(7)
    expect(voiceClips[0].startTime).toBeCloseTo(4.3, 1)
    expect(voiceClips[0].url).toBe(urls[0])
    expect(voiceClips[0].dialogueIndex).toBe(0)
    expect(voiceClips[2].url).toBe(urls[2])
    expect(voiceClips[2].dialogueIndex).toBe(2)
    expect(visualFrames[0].beatId).toBe('bt_action')
    expect(visualFrames[1].beatId).toBe('bt_0')
    expect(visualFrames[1].imageUrl).toBe('https://example.com/f1.jpg')
    expect(visualFrames[3].imageUrl).toBe('https://example.com/f3.jpg')
    expect(voiceClips[1].startTime).toBeCloseTo(6.4 + 4.3 + 0.3, 1)
  })

  it('shows action frame at t=0 and starts voice after action hold when action precedes narrator', () => {
    const scene = {
      action: 'Wide shot',
      imageUrl: 'https://example.com/establishing.jpg',
      dialogue: [
        {
          lineId: 'ln_narr',
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Welcome.',
          audioUrl: NARRATION_URL,
          duration: 6.4,
        },
        {
          lineId: 'ln_sarah',
          character: 'Sarah Chen',
          line: 'Hello.',
          audioUrl: SARAH_URL,
          duration: 3,
        },
      ],
      beats: [
        {
          beatId: 'bt_action',
          kind: 'action',
          actionDescription: 'Wide shot',
          storyboardImageUrl: 'https://example.com/establishing.jpg',
        },
        {
          beatId: 'bt_narr',
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Welcome.',
          lineId: 'ln_narr',
          storyboardImageUrl: 'https://example.com/narrator.jpg',
          audioUrl: NARRATION_URL,
          durationSeconds: 6.4,
        },
        {
          beatId: 'bt_sarah',
          kind: 'dialogue',
          character: 'Sarah Chen',
          line: 'Hello.',
          lineId: 'ln_sarah',
          storyboardImageUrl: 'https://example.com/sarah.jpg',
          audioUrl: SARAH_URL,
          durationSeconds: 3,
        },
      ],
    }

    const { voiceClips, visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [NARRATION_URL]: 6.4,
      [SARAH_URL]: 3,
    })

    expect(voiceClips[0].startTime).toBeCloseTo(4.3, 1)
    expect(voiceClips[0].beatId).toBe('bt_narr')
    expect(visualFrames[0].startTime).toBe(0)
    expect(visualFrames[0].beatId).toBe('bt_action')
    expect(visualFrames[1].beatId).toBe('bt_narr')
    expect(visualFrames[1].imageUrl).toBe('https://example.com/narrator.jpg')
    expect(visualFrames).toHaveLength(3)
  })

  it('uses unique beat clip ids when multiple beats share a dialogue index', () => {
    const scene = {
      dialogue: [
        { lineId: 'ln_a', character: 'Alice', line: 'First.' },
        { lineId: 'ln_b', character: 'Bob', line: 'Second.' },
      ],
      dialogueAudio: {
        en: [
          { lineId: 'ln_a', dialogueIndex: 0, audioUrl: 'https://example.com/a.mp3', duration: 2 },
          { lineId: 'ln_b', dialogueIndex: 1, audioUrl: 'https://example.com/b.mp3', duration: 2 },
        ],
      },
      beats: [
        {
          beatId: 'bt_a1',
          kind: 'dialogue',
          character: 'Alice',
          line: 'First.',
          lineId: 'ln_a',
          audioUrl: 'https://example.com/stale-a.mp3',
        },
        {
          beatId: 'bt_b',
          kind: 'dialogue',
          character: 'Bob',
          line: 'Second.',
          lineId: 'ln_b',
        },
        {
          beatId: 'bt_a2',
          kind: 'dialogue',
          character: 'Alice',
          line: 'First again.',
          lineId: 'ln_a',
        },
      ],
    }

    const { voiceClips } = buildBeatFirstPlaybackTimeline(scene, 'en')

    expect(voiceClips.map((clip) => clip.id)).toEqual([
      'beat-bt_a1',
      'beat-bt_b',
      'beat-bt_a2',
    ])
    expect(new Set(voiceClips.map((clip) => clip.id)).size).toBe(3)
    expect(voiceClips.every((clip) => !!clip.url)).toBe(true)
  })

  it('prefers the latest dialogueAudio entry when stale empty duplicates exist', () => {
    const scene = {
      dialogue: [
        { lineId: 'ln_a', character: 'Alice', line: 'Hello.' },
        { lineId: 'ln_b', character: 'Bob', line: 'Hi.' },
      ],
      dialogueAudio: {
        en: [
          { lineId: 'ln_a', dialogueIndex: 0 },
          { lineId: 'ln_b', dialogueIndex: 1 },
          {
            lineId: 'ln_a',
            dialogueIndex: 0,
            audioUrl: 'https://example.com/a-new.mp3',
            duration: 2,
          },
          {
            lineId: 'ln_b',
            dialogueIndex: 1,
            audioUrl: 'https://example.com/b-new.mp3',
            duration: 2,
          },
        ],
      },
      beats: [
        {
          beatId: 'bt_a',
          kind: 'dialogue',
          character: 'Alice',
          line: 'Hello.',
          lineId: 'ln_a',
        },
        {
          beatId: 'bt_b',
          kind: 'dialogue',
          character: 'Bob',
          line: 'Hi.',
          lineId: 'ln_b',
        },
      ],
    }

    const { voiceClips } = buildBeatFirstPlaybackTimeline(scene, 'en')

    expect(voiceClips.map((clip) => clip.url)).toEqual([
      'https://example.com/a-new.mp3',
      'https://example.com/b-new.mp3',
    ])
  })

  it('prefers dialogueAudio over stale beat.audioUrl after script audio regen', () => {
    const OLD_URL = 'https://example.com/old-narrator.mp3'
    const NEW_URL = 'https://example.com/new-narrator.mp3'
    const scene = {
      dialogue: [
        {
          lineId: 'ln_narr',
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Welcome.',
        },
      ],
      dialogueAudio: {
        en: [
          {
            lineId: 'ln_narr',
            kind: 'narration',
            characterId: 'narrator',
            dialogueIndex: 0,
            audioUrl: NEW_URL,
            duration: 5,
          },
        ],
      },
      beats: [
        {
          beatId: 'bt_narr',
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Welcome.',
          lineId: 'ln_narr',
          audioUrl: OLD_URL,
          durationSeconds: 2,
        },
      ],
    }

    const { voiceClips } = buildBeatFirstPlaybackTimeline(scene, 'en')

    expect(voiceClips).toHaveLength(1)
    expect(voiceClips[0].url).toBe(NEW_URL)
    expect(voiceClips[0].duration).toBe(5)
  })

  it('matches storyboard frame slot count to playback visual frames', () => {
    const scene = {
      action: 'Wide shot',
      imageUrl: 'https://example.com/establishing.jpg',
      dialogue: [
        {
          lineId: 'ln_narr',
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Welcome.',
          audioUrl: NARRATION_URL,
          duration: 6,
        },
        {
          lineId: 'ln_sarah',
          character: 'Sarah Chen',
          line: 'Hello.',
          audioUrl: SARAH_URL,
          duration: 3,
        },
      ],
      beats: [
        {
          beatId: 'bt_action',
          kind: 'action',
          actionDescription: 'Wide shot',
          storyboardImageUrl: 'https://example.com/establishing.jpg',
        },
        {
          beatId: 'bt_narr',
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Welcome.',
          lineId: 'ln_narr',
          storyboardImageUrl: 'https://example.com/narrator.jpg',
          audioUrl: NARRATION_URL,
          durationSeconds: 6,
        },
        {
          beatId: 'bt_sarah',
          kind: 'dialogue',
          character: 'Sarah Chen',
          line: 'Hello.',
          lineId: 'ln_sarah',
          storyboardImageUrl: 'https://example.com/sarah.jpg',
          audioUrl: SARAH_URL,
          durationSeconds: 3,
        },
      ],
    }

    const slots = enumerateStoryboardFrameSlots(scene)
    const { voiceClips, visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [NARRATION_URL]: 6,
      [SARAH_URL]: 3,
    })

    expect(slots.filter((s) => s.kind !== 'custom')).toHaveLength(visualFrames.length)
    expect(voiceClips).toHaveLength(2)
    expect(visualFrames[0].beatId).toBe(slots[0].beatId)
    expect(visualFrames[0].beatId).toBe('bt_action')
    expect(voiceClips[0].beatId).toBe('bt_narr')
  })

  it('resolves narrator and Anderson audio when beat lineIds differ from dialogue', () => {
    const NARR_URL = 'https://example.com/narrator.mp3'
    const SARAH1_URL = 'https://example.com/sarah1.mp3'
    const BEN1_URL = 'https://example.com/ben1.mp3'
    const scene = {
      dialogue: [
        {
          lineId: 'ln_narr',
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Welcome to The Signal Stream.',
        },
        {
          lineId: 'ln_sarah1',
          character: 'Sarah Chen',
          line: 'Dr. Anderson, the news cycle is practically euphoric.',
        },
        {
          lineId: 'ln_ben1',
          character: 'Dr. Benjamin Anderson',
          line: 'Indeed, Sarah.',
        },
      ],
      dialogueAudio: {
        en: [
          {
            character: 'NARRATOR',
            dialogueIndex: 0,
            audioUrl: NARR_URL,
            duration: 6.4,
          },
          {
            character: 'Sarah Chen',
            dialogueIndex: 1,
            audioUrl: SARAH1_URL,
            duration: 7.2,
          },
          {
            character: 'Dr. Anderson',
            dialogueIndex: 2,
            audioUrl: BEN1_URL,
            duration: 5.3,
          },
        ],
      },
      beats: [
        {
          beatId: 'bt_narr',
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Welcome to The Signal Stream.',
          lineId: 'wrong-narrator-line-id',
        },
        {
          beatId: 'bt_sarah1',
          kind: 'dialogue',
          character: 'Sarah Chen',
          line: 'Dr. Anderson, the news cycle is practically euphoric.',
          lineId: 'ln_sarah1',
        },
        {
          beatId: 'bt_ben1',
          kind: 'dialogue',
          character: 'Dr. Benjamin Anderson',
          line: 'Indeed, Sarah.',
          lineId: 'wrong-ben-line-id',
        },
      ],
    }

    const { voiceClips } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [NARR_URL]: 1,
      [SARAH1_URL]: 1,
      [BEN1_URL]: 1,
    })

    expect(voiceClips).toHaveLength(3)
    expect(voiceClips[0].url).toBe(NARR_URL)
    expect(voiceClips[0].duration).toBeCloseTo(6.7, 1)
    expect(voiceClips[1].url).toBe(SARAH1_URL)
    expect(voiceClips[1].duration).toBeCloseTo(7.5, 1)
    expect(voiceClips[2].url).toBe(BEN1_URL)
    expect(voiceClips[2].duration).toBeCloseTo(5.3, 1)
  })

  it('uses max of stored and measured duration when blob is longer than metadata', () => {
    const url = 'https://example.com/long.mp3'
    const scene = {
      dialogue: [{ lineId: 'ln_a', character: 'Alice', line: 'Hello.' }],
      dialogueAudio: {
        en: [{ lineId: 'ln_a', dialogueIndex: 0, audioUrl: url, duration: 6.4 }],
      },
      beats: [
        {
          beatId: 'bt_a',
          kind: 'dialogue',
          character: 'Alice',
          line: 'Hello.',
          lineId: 'ln_a',
        },
      ],
    }

    const { voiceClips } = buildBeatFirstPlaybackTimeline(scene, 'en', { [url]: 8.0 })
    expect(voiceClips[0].duration).toBe(8)
  })

  it('extends voice clip window through visual frame span to prevent early cutoff', () => {
    const url = 'https://example.com/line.mp3'
    const scene = {
      dialogue: [
        { lineId: 'ln_a', character: 'Alice', line: 'One.' },
        { lineId: 'ln_b', character: 'Bob', line: 'Two.' },
      ],
      dialogueAudio: {
        en: [
          { lineId: 'ln_a', dialogueIndex: 0, audioUrl: url, duration: 4 },
          { lineId: 'ln_b', dialogueIndex: 1, audioUrl: 'https://example.com/b.mp3', duration: 3 },
        ],
      },
      beats: [
        { beatId: 'bt_a', kind: 'dialogue', character: 'Alice', line: 'One.', lineId: 'ln_a' },
        { beatId: 'bt_b', kind: 'dialogue', character: 'Bob', line: 'Two.', lineId: 'ln_b' },
      ],
    }

    const { voiceClips, visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', { [url]: 4 })
    const frame = visualFrames.find((f) => f.clipId === voiceClips[0].id)
    expect(frame).toBeDefined()
    expect(voiceClips[0].duration).toBe(frame!.duration)
    expect(voiceClips[0].duration).toBeGreaterThan(4)
  })

  it('shows pre-voice action beats at t=0 instead of skipping to first dialogue', () => {
    const scene = {
      dialogue: [{ character: 'Sarah', line: 'Hello.' }],
      beats: [
        {
          beatId: 'bt_a1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Sarah enters the room',
          storyboardImageUrl: 'https://example.com/a1.jpg',
        },
        {
          beatId: 'bt_a2',
          sequenceIndex: 1,
          kind: 'action',
          actionDescription: 'Sarah looks around',
          storyboardImageUrl: 'https://example.com/a2.jpg',
        },
        {
          beatId: 'bt_d1',
          sequenceIndex: 2,
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Hello.',
          storyboardImageUrl: 'https://example.com/d1.jpg',
          audioUrl: SARAH_URL,
          durationSeconds: 3,
        },
      ],
    }

    const { voiceClips, visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    expect(visualFrames).toHaveLength(3)
    expect(getCurrentStoryboardVisualFrame(visualFrames, 0)?.beatId).toBe('bt_a1')
    expect(getCurrentStoryboardVisualFrame(visualFrames, 4.35)?.beatId).toBe('bt_a2')
    expect(voiceClips[0].startTime).toBeGreaterThan(7)
    expect(getCurrentStoryboardVisualFrame(visualFrames, voiceClips[0].startTime)?.beatId).toBe(
      'bt_d1'
    )
  })
})

describe('resolveRawBeatIndex', () => {
  it('maps timeline beatId to raw beat index for full beat timeline', () => {
    const scene = {
      imageUrl: 'https://example.com/est.jpg',
      beats: [
        {
          beatId: 'bt_est',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Establishing shot',
          storyboardImageUrl: 'https://example.com/est.jpg',
        },
        {
          beatId: 'bt_narr',
          sequenceIndex: 1,
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Welcome.',
        },
      ],
    }

    expect(resolveRawBeatIndex(scene, { beatId: 'bt_narr' })).toBe(1)
    expect(resolveRawBeatIndex(scene, { timelineBeatIndex: 0 })).toBe(0)
    expect(resolveRawBeatIndex(scene, { timelineBeatIndex: 1 })).toBe(1)
  })
})

describe('getCurrentStoryboardVisualFrame', () => {
  it('holds the current beat frame through inter-clip buffer gaps', () => {
    const { visualFrames: frames } = buildBeatFirstPlaybackTimeline(
      {
        dialogue: [{ character: 'Alice', line: 'One' }, { character: 'Bob', line: 'Two' }],
        beats: [
          {
            beatId: 'bt_1',
            sequenceIndex: 0,
            kind: 'dialogue',
            character: 'Alice',
            line: 'One',
            storyboardImageUrl: 'https://example.com/one.jpg',
            audioUrl: SARAH_URL,
            durationSeconds: 4,
          },
          {
            beatId: 'bt_2',
            sequenceIndex: 1,
            kind: 'dialogue',
            character: 'Bob',
            line: 'Two',
            storyboardImageUrl: 'https://example.com/two.jpg',
            audioUrl: BOB_URL,
            durationSeconds: 2,
          },
        ],
      },
      'en',
      { [SARAH_URL]: 4, [BOB_URL]: 2 }
    )

    expect(getCurrentStoryboardVisualFrame(frames, 3.9)?.imageUrl).toBe(
      'https://example.com/one.jpg'
    )
    expect(getCurrentStoryboardVisualFrame(frames, 4.2)?.imageUrl).toBe(
      'https://example.com/one.jpg'
    )
    expect(getCurrentStoryboardVisualFrame(frames, 4.35)?.imageUrl).toBe(
      'https://example.com/two.jpg'
    )
  })
})

describe('buildBeatFirstPlaybackTimeline preVisAnimatic', () => {
  it('strips endImageUrl when preVisAnimatic is enabled', () => {
    const scene = {
      dialogue: [{ character: 'Alice', line: 'Hello' }],
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alice',
          line: 'Hello',
          storyboardImageUrl: 'https://example.com/start.jpg',
          storyboardEndImageUrl: 'https://example.com/end.jpg',
          audioUrl: SARAH_URL,
          durationSeconds: 4,
        },
      ],
    }

    const defaultResult = buildBeatFirstPlaybackTimeline(scene, 'en', { [SARAH_URL]: 4 })
    expect(defaultResult.visualFrames[0]?.endImageUrl).toBe('https://example.com/end.jpg')

    const preVisResult = buildBeatFirstPlaybackTimeline(scene, 'en', { [SARAH_URL]: 4 }, {
      preVisAnimatic: true,
    })
    expect(preVisResult.visualFrames[0]?.endImageUrl).toBeUndefined()
    expect(preVisResult.visualFrames[0]?.imageUrl).toBe('https://example.com/start.jpg')
  })

  it('uses 10s hold for silent dialogue beats without voice URL', () => {
    const scene = {
      dialogue: [{ character: 'Alice', line: 'Hello' }],
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alice',
          line: 'Hello',
          storyboardImageUrl: 'https://example.com/start.jpg',
        },
      ],
    }

    const { visualFrames: preVis } = buildBeatFirstPlaybackTimeline(scene, 'en', {}, {
      preVisAnimatic: true,
    })
    expect(preVis[0]?.duration).toBe(11)

    const { visualFrames: defaultFrames } = buildBeatFirstPlaybackTimeline(scene, 'en')
    expect(defaultFrames[0]?.duration).toBe(4)
  })

  it('uses 10s hold for action beats without durationSeconds', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Walk in',
          storyboardImageUrl: 'https://example.com/action.jpg',
        },
      ],
    }

    const { visualFrames: preVis } = buildBeatFirstPlaybackTimeline(scene, 'en', {}, {
      preVisAnimatic: true,
    })
    expect(preVis[0]?.duration).toBe(11)

    const { visualFrames: defaultFrames } = buildBeatFirstPlaybackTimeline(scene, 'en')
    expect(defaultFrames[0]?.duration).toBe(5)
  })

  it('keeps measured dialogue duration for spoken beats with voice URL', () => {
    const scene = {
      dialogue: [{ character: 'Alice', line: 'Hello' }],
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alice',
          line: 'Hello',
          storyboardImageUrl: 'https://example.com/start.jpg',
          audioUrl: SARAH_URL,
          durationSeconds: 4,
        },
      ],
    }

    const { voiceClips, visualFrames } = buildBeatFirstPlaybackTimeline(
      scene,
      'en',
      { [SARAH_URL]: 6.2 },
      { preVisAnimatic: true }
    )

    expect(voiceClips[0]?.duration).toBe(7.2)
    expect(visualFrames[0]?.duration).toBe(7.2)
  })

  it('sets isSceneStart only on the first frame', () => {
    const scene = {
      dialogue: [
        { character: 'Alice', line: 'One' },
        { character: 'Bob', line: 'Two' },
      ],
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alice',
          line: 'One',
          storyboardImageUrl: 'https://example.com/one.jpg',
          audioUrl: SARAH_URL,
          durationSeconds: 4,
        },
        {
          beatId: 'bt_2',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'Bob',
          line: 'Two',
          storyboardImageUrl: 'https://example.com/two.jpg',
          audioUrl: BOB_URL,
          durationSeconds: 2,
        },
      ],
    }

    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 4,
      [BOB_URL]: 2,
    })

    expect(visualFrames[0]?.isSceneStart).toBe(true)
    expect(visualFrames[0]?.isSceneEnd).toBe(false)
    expect(visualFrames[1]?.isSceneStart).toBe(false)
    expect(visualFrames[1]?.isSceneEnd).toBe(true)
  })
})

describe('buildProjectAnimaticTimeline', () => {
  const beatScene = (beatId: string, imageUrl: string, endUrl?: string) => ({
    dialogue: [{ character: 'Alice', line: 'Hello' }],
    beats: [
      {
        beatId,
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Alice',
        line: 'Hello',
        storyboardImageUrl: imageUrl,
        storyboardEndImageUrl: endUrl,
        audioUrl: SARAH_URL,
        durationSeconds: 4,
      },
    ],
  })

  it('preVisAnimatic never uses end URL when start frame is missing', () => {
    const scene = {
      dialogue: [{ character: 'Alice', line: 'Hello' }],
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alice',
          line: 'Hello',
          storyboardEndImageUrl: 'https://example.com/end-only.jpg',
          audioUrl: SARAH_URL,
          durationSeconds: 4,
        },
      ],
    }

    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', { [SARAH_URL]: 4 }, {
      preVisAnimatic: true,
    })
    expect(visualFrames[0]?.imageUrl).toBeUndefined()
    expect(visualFrames[0]?.endImageUrl).toBeUndefined()
  })

  it('enumerateStoryboardFrameSlots startFramesOnly emits one slot per beat', () => {
    const scene = {
      beats: [
        { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Wide' },
        { beatId: 'bt_2', sequenceIndex: 1, kind: 'dialogue', character: 'A', line: 'Hi' },
      ],
    }

    const startOnly = enumerateStoryboardFrameSlots(scene, undefined, { startFramesOnly: true })
    const withEnd = enumerateStoryboardFrameSlots(scene, undefined, { startFramesOnly: false })

    expect(startOnly).toHaveLength(2)
    expect(withEnd).toHaveLength(4)
    expect(startOnly.every((s) => s.frameRole !== 'end')).toBe(true)
  })

  it('getScenePlayableThumbnailUrl ignores end frames when start is missing', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alice',
          line: 'Hello',
          storyboardEndImageUrl: 'https://example.com/end.jpg',
        },
      ],
    }

    expect(getScenePlayableThumbnailUrl(scene)).toBeUndefined()
  })

  it('getScenePlayableThumbnailUrl prefers start frame over end when both exist', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alice',
          line: 'Hello',
          storyboardImageUrl: 'https://example.com/start.jpg',
          storyboardEndImageUrl: 'https://example.com/end.jpg',
        },
      ],
    }

    expect(getScenePlayableThumbnailUrl(scene)).toBe('https://example.com/start.jpg')
  })

  it('preVisAnimatic produces no -end segments when end frame exists', () => {
    const scenes = [
      beatScene('bt_1', 'https://example.com/start.jpg', 'https://example.com/end.jpg'),
    ]

    const defaultTimeline = buildProjectAnimaticTimeline(scenes, 'en', { [SARAH_URL]: 4 })
    expect(defaultTimeline.segments.some((s) => s.segmentId.endsWith('-end'))).toBe(true)

    const preVisTimeline = buildProjectAnimaticTimeline(scenes, 'en', { [SARAH_URL]: 4 }, {
      preVisAnimatic: true,
    })
    expect(preVisTimeline.segments.some((s) => s.segmentId.endsWith('-end'))).toBe(false)
    expect(preVisTimeline.segments.every((s) => s.imageUrl !== 'https://example.com/end.jpg')).toBe(
      true
    )
  })

  it('inserts black segments between scenes when interSceneFadeUrl is set', () => {
    const blackUrl = 'https://example.com/black-frame.png'
    const scenes = [
      beatScene('bt_1', 'https://example.com/s1.jpg'),
      beatScene('bt_2', 'https://example.com/s2.jpg'),
    ]

    const withoutFade = buildProjectAnimaticTimeline(scenes, 'en', { [SARAH_URL]: 4 }, {
      preVisAnimatic: true,
    })
    const withFade = buildProjectAnimaticTimeline(scenes, 'en', { [SARAH_URL]: 4 }, {
      preVisAnimatic: true,
      interSceneFadeUrl: blackUrl,
    })

    expect(withFade.segments.filter((s) => s.imageUrl === blackUrl)).toHaveLength(1)
    expect(withFade.totalDuration).toBe(withoutFade.totalDuration + SCENE_FADE_TO_BLACK_SEC)
    expect(withFade.segments.find((s) => s.segmentId === 's0-fade')?.duration).toBe(
      SCENE_FADE_TO_BLACK_SEC
    )
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
