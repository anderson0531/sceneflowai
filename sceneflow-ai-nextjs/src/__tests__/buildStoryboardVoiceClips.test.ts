import { describe, it, expect } from 'vitest'
import { flatSceneToBeats } from '@/lib/script/beatMigration'
import {
  buildBeatFirstPlaybackTimeline,
  buildStoryboardVoiceClips,
  buildStoryboardVisualTimeline,
  getCurrentStoryboardVisualFrame,
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
    expect(clips[0].startTime).toBe(4.3)

    expect(visualFrames).toHaveLength(3)
    expect(visualFrames[0].startTime).toBe(0)
    expect(visualFrames[0].imageUrl).toBe(ACTION_URL)
    expect(visualFrames[0].beatId).toBe('bt_action')
    expect(visualFrames[1].imageUrl).toBe(NARRATOR_BEAT_URL)
    expect(visualFrames[1].startTime).toBe(4.3)
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
    expect(clips[0].startTime).toBe(4.3)

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
    expect(clips[0].startTime).toBe(0)
    expect(clips[0].dialogueIndex).toBe(0)
    expect(clips[1].beatId).toBe('bt_b2')

    expect(visualFrames).toHaveLength(2)
    expect(visualFrames[0].imageUrl).toBe(B1_FRAME)
    expect(visualFrames[0].beatId).toBe('bt_b1')
    expect(visualFrames[0].startTime).toBe(0)
    expect(visualFrames[0].clipId).toBe(clips[0].id)
    expect(visualFrames[1].imageUrl).toBe(B2_FRAME)
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
    expect(visualFrames).toHaveLength(6)
    expect(voiceClips[0].startTime).toBe(0)
    expect(voiceClips[0].url).toBe(urls[0])
    expect(voiceClips[0].dialogueIndex).toBe(0)
    expect(voiceClips[2].url).toBe(urls[2])
    expect(voiceClips[2].dialogueIndex).toBe(2)
    expect(visualFrames[0].beatId).toBe('bt_0')
    expect(visualFrames[0].imageUrl).toBe('https://example.com/f1.jpg')
    expect(visualFrames[2].imageUrl).toBe('https://example.com/f3.jpg')
    expect(voiceClips[1].startTime).toBeCloseTo(6.4 + 0.3, 1)
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
