import { describe, it, expect } from 'vitest'
import {
  calculateOverallFromDeductions,
  applyCategoryHysteresis,
  clamp,
  finalizeBlueprintScore,
  mapDeductions,
  mapRecommendations,
  normalizePriority,
  pointsForPriority,
} from '@/lib/treatment/blueprintAudienceScorer'

describe('blueprintAudienceScorer', () => {
  it('calculateOverallFromDeductions subtracts from 100 and clamps', () => {
    expect(
      calculateOverallFromDeductions([
        { reason: 'Weak hook', points: 12, category: 'Concept' },
        { reason: 'Tone mismatch', points: 8, category: 'Tone' },
      ])
    ).toBe(80)
    expect(
      calculateOverallFromDeductions([
        { reason: 'Severe', points: 120, category: 'General' },
      ])
    ).toBe(0)
  })

  it('applyCategoryHysteresis anchors toward previous scores', () => {
    const prev = [{ name: 'Audience Appeal', score: 70, weight: 25 }]
    const next = [{ name: 'Audience Appeal', score: 90, weight: 25 }]
    const smoothed = applyCategoryHysteresis(next, prev, 0.2, 15)
    expect(smoothed[0].score).toBeGreaterThan(70)
    expect(smoothed[0].score).toBeLessThan(90)
  })

  it('finalizeBlueprintScore uses deductions as primary signal', () => {
    const deductions = [{ reason: 'Gap', points: 15, category: 'Story' }]
    const categories = [
      { name: 'Audience Appeal', score: 85, weight: 25 },
      { name: 'Concept Hook', score: 80, weight: 20 },
    ]
    const { overallScore } = finalizeBlueprintScore(deductions, categories)
    expect(overallScore).toBeGreaterThanOrEqual(85)
  })

  it('mapRecommendations assigns points from priority bands', () => {
    const recs = mapRecommendations([
      { text: 'Fix logline', priority: 'high', fixSection: 'core' },
    ])
    expect(recs[0].pointsDeducted).toBeGreaterThanOrEqual(10)
    expect(recs[0].fixSection).toBe('core')
  })

  it('normalizePriority and pointsForPriority align', () => {
    expect(normalizePriority('HIGH')).toBe('high')
    expect(pointsForPriority('low')).toBeLessThan(pointsForPriority('critical'))
  })

  it('mapDeductions clamps point values', () => {
    const d = mapDeductions([{ reason: 'x', points: 99, category: 'Y' }])
    expect(d[0].points).toBe(40)
  })

  it('clamp utility', () => {
    expect(clamp(150, 0, 100)).toBe(100)
    expect(clamp(-5, 0, 100)).toBe(0)
  })
})
