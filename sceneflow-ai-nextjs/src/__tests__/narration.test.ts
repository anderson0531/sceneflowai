import { describe, it, expect } from 'vitest'
import {
  getBatchNarrationTtsText,
  isLikelyNarration,
  hasStandaloneNarrationAudio,
  resolveNarrationTextForAudioTimeline,
  shouldScheduleStandaloneNarration,
  sceneHasNarratorInDialogue,
  stripGhostStandaloneNarration,
} from '@/lib/script/narration'
import { validateAndCleanSceneAudio } from '@/lib/audio/cleanupAudio'

describe('narration helpers', () => {
  it('isLikelyNarration false when narration duplicates visual description (normalized)', () => {
    const scene = {
      narration: 'The  rainy street.',
      visualDescription: 'the rainy street.',
    }
    expect(isLikelyNarration(scene)).toBe(false)
  })

  it('isLikelyNarration true when narration differs from action', () => {
    const scene = {
      narration: 'Years later, nothing felt the same.',
      action: 'INT. OFFICE - DAY\nBob sits.',
    }
    expect(isLikelyNarration(scene)).toBe(true)
  })

  it('getBatchNarrationTtsText uses stored translation over scene filter', () => {
    const scene = { narration: 'dup', visualDescription: 'dup' }
    expect(getBatchNarrationTtsText(scene, 'Translated VO')).toBe('Translated VO')
  })

  it('getBatchNarrationTtsText returns null when narration only duplicates visual', () => {
    const scene = { narration: 'Same text', action: 'Same text' }
    expect(getBatchNarrationTtsText(scene, undefined)).toBe(null)
  })

  it('resolveNarrationTextForAudioTimeline does not fall back when narrationText key is null', () => {
    const scene = { narration: 'Old VO block still on scene.', action: 'INT. ROOM' }
    expect(
      resolveNarrationTextForAudioTimeline(scene, {
        narrationText: null,
        narrationTextKeyProvided: true,
      })
    ).toBe('')
  })

  it('resolveNarrationTextForAudioTimeline uses scene narration when key omitted and standalone audio exists', () => {
    const scene = {
      narration: 'Voiceover here.',
      narrationAudio: { en: { url: 'https://x/blob/narr.mp3' } },
    }
    expect(resolveNarrationTextForAudioTimeline(scene, {})).toBe('Voiceover here.')
  })

  it('resolveNarrationTextForAudioTimeline skips scene narration when no audio and not narration-driven', () => {
    const scene = { narration: 'Voiceover here.', action: 'INT. ROOM' }
    expect(resolveNarrationTextForAudioTimeline(scene, { narrationDriven: false })).toBe('')
  })

  it('resolveNarrationTextForAudioTimeline keeps scene narration when narrationDriven', () => {
    const scene = { narration: 'Beat one. Beat two.', action: 'INT. ROOM' }
    expect(
      resolveNarrationTextForAudioTimeline(scene, { narrationDriven: true })
    ).toBe('Beat one. Beat two.')
  })

  it('resolveNarrationTextForAudioTimeline skips ghost duplicate-visual narration even with audio', () => {
    const scene = {
      narration: 'Same text',
      visualDescription: 'Same text',
      narrationAudio: { en: { url: 'https://x/blob/ghost.mp3' } },
    }
    expect(resolveNarrationTextForAudioTimeline(scene, {})).toBe('')
  })

  it('shouldScheduleStandaloneNarration false when narration duplicates visual with audio', () => {
    const scene = {
      narration: 'Same text',
      visualDescription: 'Same text',
      narrationAudio: { en: { url: 'https://x/blob/ghost.mp3' } },
    }
    expect(shouldScheduleStandaloneNarration(scene)).toBe(false)
  })

  it('shouldScheduleStandaloneNarration false when narrator lives in dialogue', () => {
    const scene = {
      narration: 'Real voiceover.',
      action: 'INT. ROOM',
      dialogue: [{ kind: 'narration', characterId: 'narrator', line: 'Real voiceover.' }],
    }
    expect(sceneHasNarratorInDialogue(scene)).toBe(true)
    expect(shouldScheduleStandaloneNarration(scene)).toBe(false)
  })

  it('stripGhostStandaloneNarration removes orphan narrationAudio URLs and fields', () => {
    const scene = {
      narration: 'dup',
      visualDescription: 'dup',
      narrationAudio: { en: { url: 'https://x/blob/ghost.mp3' } },
      narrationAudioUrl: 'https://x/blob/ghost.mp3',
    }
    const { cleanedScene, deletedUrls } = stripGhostStandaloneNarration(scene)
    expect(deletedUrls).toContain('https://x/blob/ghost.mp3')
    expect(cleanedScene.narrationAudio).toBeUndefined()
    expect(cleanedScene.narrationAudioUrl).toBeUndefined()
  })

  it('validateAndCleanSceneAudio strips duplicate-visual ghost narration', () => {
    const scene = {
      narration: 'Same text',
      action: 'Same text',
      narrationAudio: { en: { url: 'https://x/blob/ghost.mp3' } },
    }
    const { cleanedScene, deletedUrls } = validateAndCleanSceneAudio(scene)
    expect(deletedUrls).toContain('https://x/blob/ghost.mp3')
    expect(cleanedScene.narrationAudio).toBeUndefined()
  })

  it('hasStandaloneNarrationAudio true for narrationUrl', () => {
    expect(hasStandaloneNarrationAudio({ narrationUrl: 'https://a/n.mp3' })).toBe(true)
    expect(hasStandaloneNarrationAudio({ narration: 'x' })).toBe(false)
  })
})
