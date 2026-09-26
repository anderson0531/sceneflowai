import { describe, expect, it } from 'vitest'
import { defaultPlayerWatermarkVisible } from '@/lib/scene/screeningReviewModes'

describe('screening review watermark defaults', () => {
  it('shows the player mark on Pre-Vis and beat Video review', () => {
    expect(defaultPlayerWatermarkVisible('animatic')).toBe(true)
    expect(defaultPlayerWatermarkVisible('beats')).toBe(true)
  })

  it('hides the player mark on rendered review so a burned-in watermark is not doubled', () => {
    expect(defaultPlayerWatermarkVisible('video')).toBe(false)
    expect(defaultPlayerWatermarkVisible('chapter')).toBe(false)
    expect(defaultPlayerWatermarkVisible('stream')).toBe(false)
    expect(defaultPlayerWatermarkVisible('promo')).toBe(false)
  })
})
