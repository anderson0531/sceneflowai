import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import {
  calculateOverallFromDeductions,
  applyCategoryHysteresis,
  blueprintRecommendationId,
  clamp,
  deductionsFromRecommendations,
  finalizeBlueprintScore,
  gapTextForRecommendation,
  mapRecommendations,
  normalizeLegacyAnalysis,
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

  it('clamp utility', () => {
    expect(clamp(150, 0, 100)).toBe(100)
    expect(clamp(-5, 0, 100)).toBe(0)
  })
})

describe('a recommendation carrying its own gap', () => {
  it('reads the gap off the model response under any casing', () => {
    const [withReason] = mapRecommendations([
      { reason: 'Act two sags', text: 'Add a midpoint reversal', priority: 'high' },
    ])
    const [withSnakeCase] = mapRecommendations([
      { deduction_reason: 'Act two sags', text: 'Add a midpoint reversal' },
    ])
    expect(withReason.reason).toBe('Act two sags')
    expect(withSnakeCase.reason).toBe('Act two sags')
  })

  it('falls back to the fix text when the model omits the gap', () => {
    const [rec] = mapRecommendations([{ text: 'Add a midpoint reversal' }])
    expect(gapTextForRecommendation(rec)).toBe('Add a midpoint reversal')
  })

  it('derives ids from the fix so applying one does not suppress the next', () => {
    const first = mapRecommendations([{ text: 'Add a midpoint reversal' }])
    const laterRun = mapRecommendations([{ text: 'Deepen the antagonist' }])
    expect(first[0].id).not.toBe(laterRun[0].id)
    expect(mapRecommendations([{ text: 'Add a midpoint reversal' }])[0].id).toBe(
      first[0].id
    )
  })

  it('keeps an explicit id from the model', () => {
    expect(mapRecommendations([{ id: 'rec-abc', text: 'Fix it' }])[0].id).toBe('rec-abc')
  })

  it('falls back to the index when the fix text is empty', () => {
    expect(blueprintRecommendationId('', 3)).toBe('rec-3')
  })
})

describe('deductionsFromRecommendations', () => {
  const recs = mapRecommendations([
    { reason: 'Act two sags', text: 'Add a midpoint reversal', priority: 'medium', category: 'Pacing' },
    { reason: 'Antagonist is thin', text: 'Give the rival a want', priority: 'critical', category: 'Character' },
  ])

  it('projects every recommendation with matching points, highest first', () => {
    const deductions = deductionsFromRecommendations(recs)
    expect(deductions).toHaveLength(recs.length)
    expect(deductions[0].reason).toBe('Antagonist is thin')
    expect(deductions.map((d) => d.points)).toEqual(
      [...recs].sort((a, b) => b.pointsDeducted - a.pointsDeducted).map((r) => r.pointsDeducted)
    )
  })

  it('totals the same points as the recommendations, so the lists cannot drift', () => {
    const total = (n: number[]) => n.reduce((s, v) => s + v, 0)
    expect(total(deductionsFromRecommendations(recs).map((d) => d.points))).toBe(
      total(recs.map((r) => r.pointsDeducted))
    )
  })

  it('links each gap back to the fix that closes it', () => {
    for (const deduction of deductionsFromRecommendations(recs)) {
      expect(recs.some((r) => r.id === deduction.recommendationId)).toBe(true)
    }
  })
})

describe('normalizeLegacyAnalysis', () => {
  // The two-list shape every project stored before gaps and fixes merged.
  const stored = {
    deductions: [
      { reason: 'Antagonist is thin', points: 14, category: 'Character' },
      { reason: 'Act two sags', points: 7, category: 'Pacing' },
    ],
    recommendations: [
      { id: 'rec-0', text: 'Add a midpoint reversal', priority: 'medium' as const, pointsDeducted: 7, fixSection: 'beats' as const },
      { id: 'rec-1', text: 'Give the rival a want', priority: 'critical' as const, pointsDeducted: 14, fixSection: 'characters' as const },
    ],
  }

  it('back-fills the gap by pairing on points', () => {
    const recs = normalizeLegacyAnalysis(stored)!.recommendations
    expect(recs[0].reason).toBe('Act two sags')
    expect(recs[1].reason).toBe('Antagonist is thin')
  })

  it('claims each deduction once when several share a point value', () => {
    const recs = normalizeLegacyAnalysis({
      deductions: [
        { reason: 'First gap', points: 5, category: 'A' },
        { reason: 'Second gap', points: 5, category: 'B' },
      ],
      recommendations: [
        { id: 'a', text: 'Fix A', priority: 'medium' as const, pointsDeducted: 5, fixSection: 'story' as const },
        { id: 'b', text: 'Fix B', priority: 'medium' as const, pointsDeducted: 5, fixSection: 'story' as const },
      ],
    })!.recommendations
    expect(recs.map((r) => r.reason)).toEqual(['First gap', 'Second gap'])
  })

  it('prefers an explicit recommendationId over the points guess', () => {
    const recs = normalizeLegacyAnalysis({
      deductions: [
        { reason: 'Belongs to b', points: 9, category: 'A', recommendationId: 'b' },
        { reason: 'Belongs to a', points: 9, category: 'B', recommendationId: 'a' },
      ],
      recommendations: [
        { id: 'a', text: 'Fix A', priority: 'medium' as const, pointsDeducted: 9, fixSection: 'story' as const },
        { id: 'b', text: 'Fix B', priority: 'medium' as const, pointsDeducted: 9, fixSection: 'story' as const },
      ],
    })!.recommendations
    expect(recs.find((r) => r.id === 'a')?.reason).toBe('Belongs to a')
    expect(recs.find((r) => r.id === 'b')?.reason).toBe('Belongs to b')
  })

  it('leaves an already-merged analysis untouched', () => {
    const merged = {
      deductions: [],
      recommendations: [
        { id: 'a', text: 'Fix A', reason: 'Gap A', priority: 'medium' as const, pointsDeducted: 5, fixSection: 'story' as const },
      ],
    }
    expect(normalizeLegacyAnalysis(merged)).toBe(merged)
  })

  it('survives a stored analysis with no deductions to pair against', () => {
    const recs = normalizeLegacyAnalysis({
      deductions: [],
      recommendations: [
        { id: 'a', text: 'Fix A', priority: 'medium' as const, pointsDeducted: 5, fixSection: 'story' as const },
      ],
    })!.recommendations
    expect(recs[0].reason).toBeUndefined()
    expect(gapTextForRecommendation(recs[0])).toBe('Fix A')
  })

  it('passes null through', () => {
    expect(normalizeLegacyAnalysis(null)).toBeNull()
  })
})

describe('blueprint AR prompt backlog guidance', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src/app/api/treatment/audience-resonance/route.ts'),
    'utf8'
  )

  it('asks for a complete backlog and drops the old 75–88 soft ceiling', () => {
    expect(source).toContain('COMPLETE resonance backlog')
    expect(source).toContain('85–95 AFTER server scoring')
    expect(source).not.toContain('should score 75–88')
    expect(source).toContain('Do NOT invent new high or critical issues')
  })

  it('asks for one list where the gap and its fix are the same object', () => {
    expect(source).toContain('There is no separate deductions list')
    expect(source).toContain('"reason" and "text" must describe the SAME issue')
    expect(source).not.toContain('Typical solid treatments have up to ~8 gaps')
    expect(source).toContain('do NOT stop at an arbitrary count')
  })

  it('derives the score breakdown from the pending recommendations', () => {
    expect(source).toContain('deductionsFromRecommendations(recommendations)')
    expect(source).not.toContain('mapDeductions(')
    // A fix the creator already applied must not keep costing points.
    expect(source).toContain('.filter((r) => !appliedIds.includes(r.id))')
  })

  it('sends the whole blueprint to the analyzer', () => {
    expect(source).toContain('treatment.beats?.slice(0, MAX_BEATS)')
    expect(source).not.toContain('treatment.beats?.slice(0, 8)')
    expect(source).not.toContain('character_descriptions?.slice(0, 5)')
  })

  it('reasons at the same effort as the Script AR reference', () => {
    expect(source).toContain("thinkingLevel: 'high'")
    expect(source).not.toContain("thinkingLevel: needsCulturalReasoning ? 'medium' : 'low'")
    expect(source).toContain('export const maxDuration = 300')
  })

  it('panel shows balanced-score hint and ready polish framing', () => {
    const panel = readFileSync(
      path.join(process.cwd(), 'src/components/blueprint/AudienceResonancePanelV3.tsx'),
      'utf8'
    )
    expect(panel).toContain('scoreBreakdownBalancedHint')
    expect(panel).toContain('readyOptionalPolish')
    expect(panel).not.toContain('sortedRecs.slice(')
  })

  it('makes the score breakdown selectable and fixable in one action', () => {
    const panel = readFileSync(
      path.join(process.cwd(), 'src/components/blueprint/AudienceResonancePanelV3.tsx'),
      'utf8'
    )
    expect(panel).toContain('fixSelectedWith')
    expect(panel).toContain('openEditor(selectedGaps)')
    expect(panel).toContain('setSelectedGapIds(new Set(sortedRecs.map((r) => r.id)))')
    // The breakdown reads the merged list, not the derived legacy one.
    expect(panel).not.toContain('analysis.deductions.map')
  })

  it('badges polish by priority instead of by crossing the ready threshold', () => {
    const panel = readFileSync(
      path.join(process.cwd(), 'src/components/blueprint/AudienceResonancePanelV3.tsx'),
      'utf8'
    )
    expect(panel).toContain(
      "rec.priority === 'low' || rec.priority === 'optional'"
    )
    expect(panel).not.toContain('analysis.isReadyForProduction ||\n                      rec.priority')
    expect(panel).toContain('allPendingArePolish')
  })
})

describe('the retired v2 resonance route', () => {
  it('is gone along with its hard iteration cap', () => {
    expect(
      existsSync(path.join(process.cwd(), 'src/app/api/treatment/analyze-resonance/route.ts'))
    ).toBe(false)
    expect(existsSync(path.join(process.cwd(), 'src/store/useResonanceStore.ts'))).toBe(false)
    expect(
      readFileSync(path.join(process.cwd(), 'src/lib/treatment/scoringChecklist.ts'), 'utf8')
    ).not.toContain('MAX_ITERATIONS')
  })
})
