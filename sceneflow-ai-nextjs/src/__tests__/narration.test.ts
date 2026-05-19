import { describe, it, expect } from 'vitest'
import {
  getBatchNarrationTtsText,
  isLikelyNarration,
  hasStandaloneNarrationAudio,
  resolveNarrationTextForAudioTimeline,
} from '@/lib/script/narration'

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

  it('hasStandaloneNarrationAudio true for narrationUrl', () => {
    expect(hasStandaloneNarrationAudio({ narrationUrl: 'https://a/n.mp3' })).toBe(true)
    expect(hasStandaloneNarrationAudio({ narration: 'x' })).toBe(false)
  })
})
