import { describe, expect, it } from 'vitest'
import {
  buildSuggestedAudioFilename,
  inferExtensionFromUrl,
  sanitizeDownloadFilename,
} from '@/lib/download/saveFile'

describe('saveFile helpers', () => {
  it('builds dialogue filenames with scene, character, and line index', () => {
    expect(
      buildSuggestedAudioFilename({
        url: 'https://example.com/audio.mp3',
        sceneNumber: 2,
        track: 'dialogue',
        character: 'Sarah Chen',
        index: 0,
      })
    ).toBe('scene-2-Sarah_Chen-line-1.mp3')
  })

  it('infers extension from blob URLs', () => {
    expect(inferExtensionFromUrl('https://blob.vercel-storage.com/foo/bar.wav?download=1')).toBe(
      '.wav'
    )
  })

  it('sanitizes unsafe filename characters', () => {
    expect(sanitizeDownloadFilename('Dr. Benjamin Anderson / take 1')).toBe(
      'Dr._Benjamin_Anderson_take_1'
    )
  })
})
