import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  calculateOverallFromDeductions,
  applyCategoryHysteresis,
  clamp,
  finalizeBlueprintScore,
  mapDeductions,
  mapRecommendations,
  normalizePriority,
  pointsForPriority,
  weightedDeductionPoints,
} from '@/lib/treatment/blueprintAudienceScorer'

describe('blueprintAudienceScorer', () => {
  it('calculateOverallFromDeductions uses diminishing weights and clamps', () => {
    expect(
      calculateOverallFromDeductions([
        { reason: 'Weak hook', points: 12, category: 'Concept' },
        { reason: 'Tone mismatch', points: 8, category: 'Tone' },
      ])
    ).toBe(Math.round(100 - weightedDeductionPoints([{ points: 12 }, { points: 8 }])))
    expect(
      calculateOverallFromDeductions([
        { reason: 'Severe', points: 120, category: 'General' },
      ])
    ).toBe(0)
  })

  it('keeps a two-gap polish stack in the high 80s / 90', () => {
    const score = calculateOverallFromDeductions([
      { reason: 'Tech transition credibility', points: 7, category: 'Clarity' },
      { reason: 'Secondary motivation depth', points: 4, category: 'Character' },
    ])
    // 7 + 4*0.65 = 9.6 → 90
    expect(score).toBe(90)
    expect(score).toBeGreaterThanOrEqual(85)
  })

  it('keeps a six-gap medium/low backlog Ready without linear cratering', () => {
    const deductions = [
      { reason: 'a', points: 7, category: 'A' },
      { reason: 'b', points: 7, category: 'B' },
      { reason: 'c', points: 5, category: 'C' },
      { reason: 'd', points: 5, category: 'D' },
      { reason: 'e', points: 4, category: 'E' },
      { reason: 'f', points: 4, category: 'F' },
    ]
    const linear = 100 - deductions.reduce((s, d) => s + d.points, 0)
    const score = calculateOverallFromDeductions(deductions)
    expect(linear).toBe(68)
    expect(score).toBeGreaterThan(linear)
    expect(score).toBeGreaterThanOrEqual(80)
  })

  it('still drops below Ready for a critical-heavy stack', () => {
    const score = calculateOverallFromDeductions([
      { reason: 'Audience mismatch', points: 18, category: 'Appeal' },
      { reason: 'Tone failure', points: 15, category: 'Tone' },
      { reason: 'No hook', points: 14, category: 'Hook' },
    ])
    expect(score).toBeLessThan(80)
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

describe('blueprint AR prompt backlog guidance', () => {
  it('asks for a complete backlog and drops the old 75–88 soft ceiling', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/app/api/treatment/audience-resonance/route.ts'),
      'utf8'
    )
    expect(source).toContain('COMPLETE resonance backlog')
    expect(source).toContain('85–95 AFTER server scoring')
    expect(source).not.toContain('should score 75–88')
    expect(source).toContain('Do NOT invent new high or critical issues')
  })

  it('panel shows balanced-score hint and ready polish framing', () => {
    const panel = readFileSync(
      path.join(process.cwd(), 'src/components/blueprint/AudienceResonancePanelV3.tsx'),
      'utf8'
    )
    expect(panel).toContain('scoreBreakdownBalancedHint')
    expect(panel).toContain('readyOptionalPolish')
    expect(panel).toContain('BLUEPRINT_AR_MAX_VISIBLE_RECS')
    expect(panel).not.toContain('sortedRecs.slice(0, 5)')
  })
})
