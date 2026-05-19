import { describe, it, expect } from 'vitest'
import { getBatchNarrationTtsText, isLikelyNarration } from '@/lib/script/narration'

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
})
