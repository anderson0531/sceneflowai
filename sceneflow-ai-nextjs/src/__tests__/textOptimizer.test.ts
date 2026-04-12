import { describe, it, expect } from 'vitest'
import {
  optimizeTextForTTS,
  finalizeTextForGoogleTts,
  trimEchoedPrefixTail,
} from '@/lib/tts/textOptimizer'

describe('optimizeTextForTTS', () => {
  it('removes multiline square-bracket delivery notes', () => {
    const input = `[\nsmoothly confident,\na tremor\n] Welcome back to the show.`
    const { text, isSpeakable } = optimizeTextForTTS(input)
    expect(isSpeakable).toBe(true)
    expect(text).toContain('Welcome back')
    expect(text).not.toMatch(/smoothly confident/i)
    expect(text).not.toContain('[')
  })

  it('normalizes fullwidth brackets then strips', () => {
    const input =
      '\uFF3Binviting, warm\uFF3D Please sit down.'
    const { text } = optimizeTextForTTS(input)
    expect(text.trim()).toBe('Please sit down.')
  })

  it('unwraps markdown emphasis and strips stray asterisks', () => {
    const { text } = optimizeTextForTTS('We are *forging* the future.')
    expect(text).toContain('forging')
    expect(text).not.toContain('*')
  })

  it('trims exact echoed prefix at tail (model stutter)', () => {
    const long =
      'The world often misinterprets progress as chaos. Middle content here. The world often misinterprets progress as chaos.'
    const { text } = optimizeTextForTTS(long)
    expect(text.endsWith('Middle content here.')).toBe(true)
    expect(text).not.toMatch(/The world often misinterprets progress as chaos\.$/)
  })
})

describe('finalizeTextForGoogleTts', () => {
  it('strips brackets after translation-style passthrough', () => {
    const s = finalizeTextForGoogleTts('[cold] It is done.')
    expect(s).toBe('It is done.')
  })
})

describe('trimEchoedPrefixTail', () => {
  it('is no-op when no echo', () => {
    expect(trimEchoedPrefixTail('Short line.')).toBe('Short line.')
  })
})
