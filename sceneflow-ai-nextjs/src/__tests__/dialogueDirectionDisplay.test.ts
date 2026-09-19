import { describe, expect, it } from 'vitest'
import { dialogueDirectionDisplay } from '@/lib/scene/dialogueDirectionDisplay'

describe('dialogueDirectionDisplay', () => {
  it('uses the compact tag as the chip and the brief separately', () => {
    const display = dialogueDirectionDisplay(
      '[obsessive, breathless] The differential holds... it has to hold this time.',
      'Close-mic, private, strained. Land the last clause as a plea.'
    )
    expect(display.chip).toBe('obsessive, breathless')
    expect(display.spokenDisplay).toBe(
      'The differential holds... it has to hold this time.'
    )
    expect(display.brief).toContain('Close-mic')
  })

  it('falls back to a parenthetical chip when there is no bracket tag', () => {
    const display = dialogueDirectionDisplay('(quietly) Leave it.', '')
    expect(display.chip).toBe('quietly')
    expect(display.spokenDisplay).toBe('Leave it.')
    expect(display.brief).toBe('')
  })
})
