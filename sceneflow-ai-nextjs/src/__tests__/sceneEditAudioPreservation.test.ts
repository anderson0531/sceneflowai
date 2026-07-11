import { describe, it, expect } from 'vitest'
import {
  applySceneEditAudioPolicy,
  copyPreservedSceneAudioFields,
  formatMusicForPrompt,
  formatSfxForPrompt,
  normalizeMusicSpec,
  normalizePreserveElements,
} from '@/lib/audio/cleanupAudio'
import {
  applyScenePreservation,
  shouldRegenerateSceneDirection,
  shouldSkipBeatRederivation,
} from '@/lib/script/scenePreservation'
import {
  applyDeselectedSceneChanges,
  diffSceneChanges,
} from '@/lib/script/sceneDiffChanges'

const MUSIC_URL = 'https://blob.example/music.mp3'
const SFX_URL = 'https://blob.example/sfx.mp3'
const SFX2_URL = 'https://blob.example/sfx2.mp3'
const NARRATION_URL = 'https://blob.example/narration.mp3'
const DIALOGUE_URL = 'https://blob.example/dialogue.mp3'
const END_FRAME_URL = 'https://blob.example/end-frame.jpg'
const START_FRAME_URL = 'https://blob.example/start-frame.jpg'

function baseScene(overrides: Record<string, unknown> = {}) {
  return {
    heading: 'INT. ROOM - DAY',
    action: 'Alex enters.',
    narration: 'The room feels tense.',
    dialogue: [{ character: 'ALEX', line: '[neutral] Hello.', lineId: 'line-1' }],
    music: 'Soft piano, slow tempo',
    sfx: ['Door creak', 'Wind howling'],
    narrationAudioUrl: NARRATION_URL,
    dialogueAudio: {
      en: [{ character: 'ALEX', line: '[neutral] Hello.', dialogueIndex: 0, audioUrl: DIALOGUE_URL }],
    },
    musicAudio: MUSIC_URL,
    sfxAudio: [SFX_URL, SFX2_URL],
    sfxSourceMeta: [{ source: 'veo' }, null],
    sceneDirection: { shots: [{ description: 'Wide on Alex' }] },
    beats: [
      {
        beatId: 'beat-action',
        kind: 'action',
        actionDescription: 'Alex enters.',
        storyboardImageUrl: START_FRAME_URL,
        storyboardEndImageUrl: END_FRAME_URL,
      },
      {
        beatId: 'beat-dialogue',
        kind: 'dialogue',
        character: 'ALEX',
        line: '[neutral] Hello.',
        lineId: 'line-1',
        audioUrl: DIALOGUE_URL,
      },
    ],
    ...overrides,
  }
}

describe('sceneEditAudioPreservation', () => {
  it('clears music audio but keeps SFX when music changes and actionBeats is preserved', () => {
    const original = baseScene()
    const revised = {
      ...original,
      music: 'Upbeat jazz, fast tempo',
    }

    const { cleanedScene, deletedUrls } = applySceneEditAudioPolicy(original, revised, ['actionBeats'])

    expect(cleanedScene.music).toBe('Upbeat jazz, fast tempo')
    expect(cleanedScene.sfx).toEqual(['Door creak', 'Wind howling'])
    expect(cleanedScene.musicAudio).toBeUndefined()
    expect(cleanedScene.sfxAudio).toEqual([SFX_URL, SFX2_URL])
    expect(cleanedScene.sfxSourceMeta).toEqual([{ source: 'veo' }, null])
    expect(deletedUrls).toContain(MUSIC_URL)
    expect(deletedUrls).not.toContain(SFX_URL)
  })

  it('maps legacy sfx flag to actionBeats via normalizePreserveElements', () => {
    expect(normalizePreserveElements(['sfx'])).toEqual(['actionBeats'])
    expect(normalizePreserveElements(['dialogue'])).toEqual(['dialogueBeats'])
  })

  it('keeps all audio when specs are unchanged and no preserve flags are set', () => {
    const original = baseScene()
    const revised = { ...original, action: 'Alex paces nervously.' }

    const { cleanedScene, deletedUrls } = applySceneEditAudioPolicy(original, revised)

    expect(cleanedScene.musicAudio).toBe(MUSIC_URL)
    expect(cleanedScene.sfxAudio).toEqual([SFX_URL, SFX2_URL])
    expect(cleanedScene.narrationAudioUrl).toBe(NARRATION_URL)
    expect(cleanedScene.dialogueAudio.en[0].audioUrl).toBe(DIALOGUE_URL)
    expect(deletedUrls).toEqual([])
  })

  it('restores music spec and audio when preserve music is set', () => {
    const original = baseScene()
    const revised = {
      ...original,
      music: 'Completely different score',
      musicAudio: undefined,
    }

    const { cleanedScene } = applySceneEditAudioPolicy(original, revised, ['music'])

    expect(cleanedScene.music).toBe('Soft piano, slow tempo')
    expect(cleanedScene.musicAudio).toBe(MUSIC_URL)
  })

  it('removes only stale dialogue audio when one line changes', () => {
    const original = baseScene({
      dialogue: [
        { character: 'ALEX', line: '[neutral] Hello.' },
        { character: 'MARY', line: '[calm] Hi there.' },
      ],
      dialogueAudio: {
        en: [
          { character: 'ALEX', line: '[neutral] Hello.', dialogueIndex: 0, audioUrl: DIALOGUE_URL },
          { character: 'MARY', line: '[calm] Hi there.', dialogueIndex: 1, audioUrl: 'https://blob.example/mary.mp3' },
        ],
      },
    })
    const revised = {
      ...original,
      dialogue: [
        { character: 'ALEX', line: '[neutral] Hello.' },
        { character: 'MARY', line: '[excited] Hi there!' },
      ],
    }

    const { cleanedScene, deletedUrls } = applySceneEditAudioPolicy(original, revised)

    expect(cleanedScene.dialogueAudio.en).toHaveLength(1)
    expect(cleanedScene.dialogueAudio.en[0].audioUrl).toBe(DIALOGUE_URL)
    expect(deletedUrls).toContain('https://blob.example/mary.mp3')
    expect(cleanedScene.narrationAudioUrl).toBe(NARRATION_URL)
    expect(cleanedScene.sfxAudio).toEqual([SFX_URL, SFX2_URL])
  })

  it('remaps SFX audio by description when cues are reordered but unchanged', () => {
    const original = baseScene()
    const revised = {
      ...original,
      sfx: ['Wind howling', 'Door creak'],
    }

    const { cleanedScene, deletedUrls } = applySceneEditAudioPolicy(original, revised)

    expect(cleanedScene.sfxAudio).toEqual([SFX2_URL, SFX_URL])
    expect(deletedUrls).toEqual([])
  })

  it('formats music and sfx for revise-scene prompts', () => {
    expect(formatMusicForPrompt({ description: 'Ambient synth pad' })).toBe('Ambient synth pad')
    expect(formatSfxForPrompt([{ description: 'Thunder' }, 'Rain'])).toBe('Thunder, Rain')
    expect(normalizeMusicSpec('  Jazz  ')).toBe('Jazz')
  })

  it('copyPreservedSceneAudioFields restores audio for preserved types only', () => {
    const original = baseScene()
    const revised = { heading: 'Updated heading' }

    const next = copyPreservedSceneAudioFields(original, revised, ['music', 'actionBeats'])

    expect(next.musicAudio).toBe(MUSIC_URL)
    expect(next.sfxAudio).toEqual([SFX_URL, SFX2_URL])
    expect(next.narrationAudioUrl).toBeUndefined()
  })

  it('applyScenePreservation restores scene direction and beat end frames', () => {
    const original = baseScene()
    const revised = {
      ...original,
      action: 'Alex storms in.',
      sceneDirection: { shots: [{ description: 'Close-up' }] },
      beats: [
        {
          beatId: 'beat-action',
          kind: 'action',
          actionDescription: 'Alex storms in.',
          storyboardImageUrl: 'https://blob.example/new-start.jpg',
          storyboardEndImageUrl: 'https://blob.example/new-end.jpg',
        },
        {
          beatId: 'beat-dialogue',
          kind: 'dialogue',
          character: 'ALEX',
          line: '[angry] What happened?',
          lineId: 'line-1',
        },
      ],
    }

    const audioCleaned = applySceneEditAudioPolicy(original, revised).cleanedScene
    const preserved = applyScenePreservation(original, audioCleaned, [
      'sceneDirection',
      'beatFrames',
    ])

    expect(preserved.sceneDirection).toEqual(original.sceneDirection)
    const actionBeat = preserved.beats.find((b: { beatId: string }) => b.beatId === 'beat-action')
    expect(actionBeat.storyboardImageUrl).toBe(START_FRAME_URL)
    expect(actionBeat.storyboardEndImageUrl).toBe(END_FRAME_URL)
    expect(actionBeat.actionDescription).toBe('Alex storms in.')
  })

  it('applyScenePreservation restores dialogue beats when dialogueBeats is preserved', () => {
    const original = baseScene()
    const revised = {
      ...original,
      dialogue: [{ character: 'ALEX', line: '[angry] What happened?', lineId: 'line-1' }],
      beats: [
        {
          beatId: 'beat-dialogue',
          kind: 'dialogue',
          character: 'ALEX',
          line: '[angry] What happened?',
          lineId: 'line-1',
        },
      ],
    }

    const audioCleaned = applySceneEditAudioPolicy(original, revised, ['dialogueBeats']).cleanedScene
    const preserved = applyScenePreservation(original, audioCleaned, ['dialogueBeats'])

    expect(preserved.dialogue[0].line).toBe('[neutral] Hello.')
    expect(preserved.dialogueAudio.en[0].audioUrl).toBe(DIALOGUE_URL)
    const dialogueBeat = preserved.beats.find((b: { beatId: string }) => b.beatId === 'beat-dialogue')
    expect(dialogueBeat.line).toBe('[neutral] Hello.')
    expect(dialogueBeat.audioUrl).toBe(DIALOGUE_URL)
  })

  it('shouldSkipBeatRederivation when beats or frames are preserved', () => {
    expect(shouldSkipBeatRederivation(['dialogueBeats'])).toBe(true)
    expect(shouldSkipBeatRederivation(['beatFrames'])).toBe(true)
    expect(shouldSkipBeatRederivation(['music'])).toBe(false)
    expect(shouldRegenerateSceneDirection(['sceneDirection'])).toBe(false)
    expect(shouldRegenerateSceneDirection(['music'])).toBe(true)
  })

  it('diffSceneChanges and applyDeselectedSceneChanges revert unchecked preview items', () => {
    const original = baseScene()
    const candidate = {
      ...original,
      action: 'Alex paces.',
      dialogue: [
        { character: 'ALEX', line: '[neutral] Hello.' },
        { character: 'MARY', line: '[calm] Hi.' },
      ],
      beats: [
        {
          ...original.beats[0],
          actionDescription: 'Alex paces.',
        },
        {
          beatId: 'beat-mary',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'MARY',
          line: '[calm] Hi.',
          lineId: 'line-2',
        },
      ],
    }

    const changes = diffSceneChanges(original, candidate)
    expect(changes).toContain('beat:beat-action')
    expect(changes).toContain('beat-added:beat-mary')
    expect(changes).toContain('beat-removed:beat-dialogue')

    const reverted = applyDeselectedSceneChanges(
      original,
      candidate,
      new Set(['beat:beat-action'])
    )
    expect(reverted.action).toBe('Alex enters.')
    expect(reverted.dialogue.some((line: { character: string }) => line.character === 'MARY')).toBe(
      true
    )
  })
})
