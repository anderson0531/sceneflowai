import { describe, expect, it } from 'vitest'
import {
  applyOptimisticScoreDelta,
  buildSeriesAnalysisNarration,
  calibrateEstimatedImpact,
  enrichSeriesInsight,
  fingerprintsMatch,
  insightFingerprint,
  mergeSeriesInsights,
  prioritizeSeriesInsights,
  stableSeriesInsightId,
} from '@/lib/series/resonanceScoring'
import {
  getSeriesGreenlightTier,
  type SeriesResonanceAnalysis,
  type SeriesResonanceAxis,
  type SeriesResonanceInsight,
} from '@/types/series'

function axes(overrides: Partial<Record<SeriesResonanceAxis['id'], number>> = {}): SeriesResonanceAxis[] {
  const scores: Record<SeriesResonanceAxis['id'], number> = {
    'concept-originality': 72,
    'character-depth': 70,
    'episode-engagement': 70,
    'story-arc-coherence': 74,
    'commercial-viability': 71,
    ...overrides,
  }
  return (Object.entries(scores) as Array<[SeriesResonanceAxis['id'], number]>).map(([id, score]) => ({
    id,
    label: id,
    score,
    weight: 1,
    description: '',
  }))
}

function weakness(partial: Partial<SeriesResonanceInsight> & Pick<SeriesResonanceInsight, 'title'>): SeriesResonanceInsight {
  return {
    id: partial.id || '',
    category: partial.category || 'episodes',
    status: 'weakness',
    title: partial.title,
    insight: partial.insight || partial.title,
    targetSection: partial.targetSection || 'episode',
    targetId: partial.targetId,
    actionable: partial.actionable ?? true,
    fixSuggestion: partial.fixSuggestion ?? 'Tighten the ending.',
    axisId: partial.axisId,
    severity: partial.severity,
  }
}

describe('calibrateEstimatedImpact', () => {
  it('maps a High episode-axis fix to about 2–4 overall points, not +8', () => {
    const delta = calibrateEstimatedImpact(
      {
        category: 'episodes',
        axisId: 'episode-engagement',
        severity: 'high',
        title: 'Weak episode 5 cliffhanger',
        insight: 'Episode 5 ends without tension',
      },
      axes({ 'episode-engagement': 70 })
    )
    expect(delta).toBeGreaterThanOrEqual(2)
    expect(delta).toBeLessThanOrEqual(4)
    expect(delta).toBeLessThan(8)
  })

  it('clamps Low-impact commercial notes to 1–2', () => {
    const delta = calibrateEstimatedImpact(
      {
        category: 'commercial',
        axisId: 'commercial-viability',
        severity: 'low',
        title: 'Minor polish on market positioning',
        insight: 'Optional tweak',
      },
      axes({ 'commercial-viability': 60 })
    )
    expect(delta).toBeGreaterThanOrEqual(1)
    expect(delta).toBeLessThanOrEqual(2)
  })
})

describe('prioritizeSeriesInsights', () => {
  it('sorts High before Low and caps actionable weaknesses at 5', () => {
    const incoming = Array.from({ length: 8 }, (_, i) =>
      weakness({
        title: i < 2 ? `Critical missing hook ${i}` : `Polish note ${i}`,
        category: i < 2 ? 'episodes' : 'commercial',
        severity: i < 2 ? 'high' : 'low',
        targetId: String(i),
        axisId: i < 2 ? 'episode-engagement' : 'commercial-viability',
      })
    )
    const ranked = prioritizeSeriesInsights(incoming, axes())
    const weak = ranked.filter((i) => i.status === 'weakness' && i.actionable)
    expect(weak).toHaveLength(5)
    expect(weak[0].impactLabel).toBe('High')
    expect(weak[0].estimatedImpact).toBeGreaterThan(0)
  })
})

describe('mergeSeriesInsights', () => {
  it('drops resolved and title-paraphrase nits', () => {
    const previous = [
      weakness({
        id: 'insight_episodes-episode-5-episode-engagement',
        title: 'Weak episode 5 cliffhanger',
        category: 'episodes',
        targetSection: 'episode',
        targetId: '5',
        axisId: 'episode-engagement',
        severity: 'high',
      }),
    ]
    const incoming = [
      weakness({
        title: 'Episode 5 still lacks a cliffhanger',
        category: 'episodes',
        targetSection: 'episode',
        targetId: '5',
        axisId: 'episode-engagement',
        severity: 'high',
      }),
      weakness({
        title: 'Protagonist needs a clearer want',
        category: 'characters',
        targetSection: 'character',
        targetId: 'maya',
        axisId: 'character-depth',
        severity: 'high',
      }),
    ]

    const merged = mergeSeriesInsights({
      incoming,
      previous,
      appliedIds: [previous[0].id],
      appliedDetails: [
        {
          insightId: previous[0].id,
          fixSuggestion: 'Add a reveal',
          targetSection: 'episode',
          targetId: '5',
          appliedAt: '2026-09-05T00:00:00.000Z',
          category: 'episodes',
          title: 'Weak episode 5 cliffhanger',
          axisId: 'episode-engagement',
          estimatedImpact: 3,
        },
      ],
      axes: axes(),
      iteration: 2,
      scoreTrend: 'improving',
    })

    const titles = merged.filter((i) => i.status === 'weakness').map((i) => i.title)
    expect(titles).toContain(previous[0].title)
    expect(titles.some((t) => t === 'Episode 5 still lacks a cliffhanger')).toBe(false)
    expect(titles.some((t) => /protagonist/i.test(t))).toBe(true)
  })

  it('caps new High-impact issues after the first iteration', () => {
    const incoming = [1, 2, 3, 4].map((n) =>
      weakness({
        title: `Critical missing arc beat ${n}`,
        category: 'story-arc',
        targetSection: 'bible',
        targetId: `arc-${n}`,
        axisId: 'story-arc-coherence',
        severity: 'high',
      })
    )
    const merged = mergeSeriesInsights({
      incoming,
      previous: [],
      appliedIds: [],
      appliedDetails: [],
      axes: axes({ 'story-arc-coherence': 60 }),
      iteration: 3,
      scoreTrend: 'improving',
    })
    const high = merged.filter((i) => i.status === 'weakness' && i.impactLabel === 'High')
    expect(high.length).toBeLessThanOrEqual(2)
  })
})

describe('fingerprints and stable ids', () => {
  it('matches same target even when the title is rephrased', () => {
    const a = insightFingerprint({
      category: 'episodes',
      targetSection: 'episode',
      targetId: '5',
      title: 'Weak episode 5 cliffhanger',
    })
    const b = insightFingerprint({
      category: 'episodes',
      targetSection: 'episode',
      targetId: '5',
      title: 'Episode 5 needs a stronger ending hook',
    })
    expect(fingerprintsMatch(a, b)).toBe(true)
  })

  it('uses category-target-axis, not title, for stable ids', () => {
    const id = stableSeriesInsightId({
      category: 'episodes',
      targetSection: 'episode',
      targetId: '5',
      axisId: 'episode-engagement',
    })
    expect(id).toBe('insight_episodes-episode-5-episode-engagement')
    expect(id).not.toContain('cliffhanger')
  })
})

describe('buildSeriesAnalysisNarration', () => {
  it('includes score, assessment, and next action', () => {
    const analysis: SeriesResonanceAnalysis = {
      seriesId: 's1',
      greenlightScore: getSeriesGreenlightTier(78),
      axes: axes(),
      episodeEngagement: [],
      characterAnalysis: [],
      locationAnalysis: [],
      insights: [
        enrichSeriesInsight(
          weakness({
            title: 'Weak mid-season hook',
            category: 'episodes',
            targetId: '6',
            axisId: 'episode-engagement',
            severity: 'high',
          }),
          axes()
        ),
      ],
      summary: {
        overallAssessment: 'A promising thriller with a soft middle.',
        bingeWorthiness: 'Medium — hooks fade after episode 4.',
        targetAudience: 'Adult drama viewers',
        comparableSeries: ['Dark'],
        keyStrengths: ['Distinct protagonist'],
        criticalWeaknesses: ['Soft mid-season'],
      },
      analysisVersion: '1.2',
      generatedAt: '2026-09-05T00:00:00.000Z',
      creditsUsed: 1,
      suggestedAction: 'apply-fixes',
      scoreTrend: 'improving',
      previousScore: 74,
    }

    const narration = buildSeriesAnalysisNarration(analysis)
    expect(narration).toContain('78')
    expect(narration).toContain('A promising thriller with a soft middle.')
    expect(narration).toContain('Binge-worthiness')
    expect(narration).toContain('apply the remaining high-impact fixes')
    expect(narration).toContain('Weak mid-season hook')
  })
})

describe('applyOptimisticScoreDelta', () => {
  it('adds calibrated points without exceeding 100', () => {
    const analysis: SeriesResonanceAnalysis = {
      seriesId: 's1',
      greenlightScore: getSeriesGreenlightTier(82),
      axes: axes(),
      episodeEngagement: [],
      characterAnalysis: [],
      locationAnalysis: [],
      insights: [],
      summary: {
        overallAssessment: 'Close.',
        bingeWorthiness: 'High',
        targetAudience: 'General',
        comparableSeries: [],
        keyStrengths: [],
        criticalWeaknesses: [],
      },
      analysisVersion: '1.2',
      generatedAt: '2026-09-05T00:00:00.000Z',
      creditsUsed: 1,
    }
    const next = applyOptimisticScoreDelta(analysis, 3, 'insight_x')
    expect(next.greenlightScore.score).toBe(85)
    expect(next.appliedFixes).toContain('insight_x')
    expect(next.isProductionReady).toBe(true)
  })
})
