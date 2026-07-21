import { describe, expect, it } from 'vitest'
import {
  getScoreTier,
  getScoreChipClassName,
  SCORE_READY_THRESHOLD,
  SCORE_WARNING_THRESHOLD,
} from '@/lib/product/scoreThresholds'

describe('scoreThresholds', () => {
  it('uses unified tiers', () => {
    expect(SCORE_READY_THRESHOLD).toBe(80)
    expect(SCORE_WARNING_THRESHOLD).toBe(60)
    expect(getScoreTier(85)).toBe('ready')
    expect(getScoreTier(70)).toBe('warning')
    expect(getScoreTier(40)).toBe('critical')
  })

  it('returns chip classes for each tier', () => {
    expect(getScoreChipClassName(90)).toContain('emerald')
    expect(getScoreChipClassName(65)).toContain('amber')
    expect(getScoreChipClassName(30)).toContain('red')
  })
})
