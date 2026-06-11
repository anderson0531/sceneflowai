import { describe, it, expect } from 'vitest'
import {
  applySceneEditAudioPolicy,
  copyPreservedSceneAudioFields,
  formatMusicForPrompt,
  formatSfxForPrompt,
  normalizeMusicSpec,
} from '@/lib/audio/cleanupAudio'

const MUSIC_URL = 'https://blob.example/music.mp3'
const SFX_URL = 'https://blob.example/sfx.mp3'
const SFX2_URL = 'https://blob.example/sfx2.mp3'
const NARRATION_URL = 'https://blob.example/narration.mp3'
const DIALOGUE_URL = 'https://blob.example/dialogue.mp3'

function baseScene(overrides: Record<string, unknown> = {}) {
  return {
    heading: 'INT. ROOM - DAY',
    action: 'Alex enters.',
    narration: 'The room feels tense.',
    dialogue: [{ character: 'ALEX', line: '[neutral] Hello.' }],
    music: 'Soft piano, slow tempo',
    sfx: ['Door creak', 'Wind howling'],
    narrationAudioUrl: NARRATION_URL,
    dialogueAudio: {
      en: [{ character: 'ALEX', line: '[neutral] Hello.', dialogueIndex: 0, audioUrl: DIALOGUE_URL }],
    },
    musicAudio: MUSIC_URL,
    sfxAudio: [SFX_URL, SFX2_URL],
    sfxSourceMeta: [{ source: 'veo' }, null],
    ...overrides,
  }
}

describe('sceneEditAudioPreservation', () => {
  it('clears music audio but keeps SFX when music changes and sfx is preserved', () => {
    const original = baseScene()
    const revised = {
      ...original,
      music: 'Upbeat jazz, fast tempo',
    }

    const { cleanedScene, deletedUrls } = applySceneEditAudioPolicy(original, revised, ['sfx'])

    expect(cleanedScene.music).toBe('Upbeat jazz, fast tempo')
    expect(cleanedScene.sfx).toEqual(['Door creak', 'Wind howling'])
    expect(cleanedScene.musicAudio).toBeUndefined()
    expect(cleanedScene.sfxAudio).toEqual([SFX_URL, SFX2_URL])
    expect(cleanedScene.sfxSourceMeta).toEqual([{ source: 'veo' }, null])
    expect(deletedUrls).toContain(MUSIC_URL)
    expect(deletedUrls).not.toContain(SFX_URL)
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

  it('restores music spec and audio when preserveMusic is set', () => {
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

    const next = copyPreservedSceneAudioFields(original, revised, ['music', 'sfx'])

    expect(next.musicAudio).toBe(MUSIC_URL)
    expect(next.sfxAudio).toEqual([SFX_URL, SFX2_URL])
    expect(next.narrationAudioUrl).toBeUndefined()
  })
})
