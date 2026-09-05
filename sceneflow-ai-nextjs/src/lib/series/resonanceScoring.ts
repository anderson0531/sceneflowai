/**
 * Deterministic Series Resonance scoring: calibrated +N, impact ranking,
 * closed-issue fingerprints, and analysis narration.
 */

import {
  SERIES_RESONANCE_WEIGHTS,
  getSeriesGreenlightTier,
  type SeriesAppliedFixDetail,
  type SeriesInsightCategory,
  type SeriesInsightImpactLabel,
  type SeriesInsightSeverity,
  type SeriesResonanceAnalysis,
  type SeriesResonanceAxis,
  type SeriesResonanceInsight,
} from '@/types/series'

export const SERIES_READY_SCORE = 85
export const MAX_ACTIONABLE_WEAKNESSES = 5
export const MAX_NEW_HIGH_IMPACT_ON_REANALYZE = 2

export const AXIS_PRIORITY: Record<SeriesResonanceAxis['id'], number> = {
  'character-depth': 0,
  'episode-engagement': 1,
  'story-arc-coherence': 2,
  'concept-originality': 3,
  'commercial-viability': 4,
}

export const SEVERITY_FACTOR: Record<SeriesInsightSeverity, number> = {
  high: 1,
  medium: 0.55,
  low: 0.25,
}

const IMPACT_CLAMP: Record<SeriesInsightSeverity, { min: number; max: number }> = {
  high: { min: 2, max: 5 },
  medium: { min: 1, max: 3 },
  low: { min: 1, max: 2 },
}

const TOTAL_WEIGHT = Object.values(SERIES_RESONANCE_WEIGHTS).reduce((sum, w) => sum + w, 0)

const CATEGORY_TO_AXIS: Record<SeriesInsightCategory, SeriesResonanceAxis['id']> = {
  concept: 'concept-originality',
  characters: 'character-depth',
  episodes: 'episode-engagement',
  engagement: 'episode-engagement',
  pacing: 'episode-engagement',
  'story-arc': 'story-arc-coherence',
  commercial: 'commercial-viability',
}

const AXIS_LABELS: Record<SeriesResonanceAxis['id'], string> = {
  'concept-originality': 'Concept Originality',
  'character-depth': 'Character Depth',
  'episode-engagement': 'Episode Engagement',
  'story-arc-coherence': 'Story Arc Coherence',
  'commercial-viability': 'Commercial Viability',
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'with', 'is',
  'needs', 'need', 'still', 'give', 'make', 'more', 'lacks', 'lack',
])

export function normalizeSeriesText(value: string | undefined | null): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function insightTokens(value: string | undefined | null): string[] {
  return normalizeSeriesText(value)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

export function tokenOverlap(a: string, b: string): number {
  const ta = new Set(insightTokens(a))
  const tb = new Set(insightTokens(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) {
    if (tb.has(t)) inter += 1
  }
  return inter / Math.min(ta.size, tb.size)
}

export function inferAxisId(
  insight: Pick<SeriesResonanceInsight, 'axisId' | 'category'>
): SeriesResonanceAxis['id'] {
  if (insight.axisId && insight.axisId in SERIES_RESONANCE_WEIGHTS) {
    return insight.axisId
  }
  return CATEGORY_TO_AXIS[insight.category] ?? 'story-arc-coherence'
}

const HIGH_HINTS = [
  'critical', 'missing', 'broken', 'incoherent', 'unrelatable', 'no cliffhanger',
  'no hook', 'fails', 'collapse', 'unwatchable', 'confusing',
]
const LOW_HINTS = ['polish', 'minor', 'consider', 'optional', 'slight', 'tweak', 'nice']

export function inferSeriesInsightSeverity(
  insight: Pick<SeriesResonanceInsight, 'severity' | 'title' | 'insight' | 'category'>
): SeriesInsightSeverity {
  const raw = String(insight.severity || '').toLowerCase()
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw

  const hay = `${insight.title || ''} ${insight.insight || ''}`.toLowerCase()
  if (HIGH_HINTS.some((h) => hay.includes(h))) return 'high'
  if (LOW_HINTS.some((h) => hay.includes(h))) return 'low'
  if (insight.category === 'characters' || insight.category === 'episodes') return 'high'
  if (insight.category === 'commercial') return 'low'
  return 'medium'
}

export function seriesImpactLabel(severity: SeriesInsightSeverity): SeriesInsightImpactLabel {
  if (severity === 'high') return 'High'
  if (severity === 'medium') return 'Medium'
  return 'Low'
}

export function axisGap(axisScore: number, ready = SERIES_READY_SCORE): number {
  return Math.max(0, ready - axisScore)
}

export function calibrateEstimatedImpact(
  insight: Pick<SeriesResonanceInsight, 'axisId' | 'category' | 'severity' | 'title' | 'insight'>,
  axes: SeriesResonanceAxis[]
): number {
  const severity = inferSeriesInsightSeverity(insight)
  const axisId = inferAxisId(insight)
  const axis = axes.find((a) => a.id === axisId)
  const score = axis?.score ?? 70
  const weight = SERIES_RESONANCE_WEIGHTS[axisId]
  const raw = (weight / TOTAL_WEIGHT) * axisGap(score) * SEVERITY_FACTOR[severity]
  const rounded = Math.round(raw)
  const clamp = IMPACT_CLAMP[severity]
  return Math.min(clamp.max, Math.max(clamp.min, rounded))
}

export function computeImpactScore(
  insight: Pick<SeriesResonanceInsight, 'axisId' | 'category' | 'severity' | 'title' | 'insight'>,
  axes: SeriesResonanceAxis[]
): number {
  const severity = inferSeriesInsightSeverity(insight)
  const axisId = inferAxisId(insight)
  const axis = axes.find((a) => a.id === axisId)
  const score = axis?.score ?? 70
  const weight = SERIES_RESONANCE_WEIGHTS[axisId]
  return Math.round(weight * SEVERITY_FACTOR[severity] * axisGap(score))
}

export function stableSeriesInsightId(
  insight: Pick<SeriesResonanceInsight, 'category' | 'targetSection' | 'targetId' | 'axisId'>
): string {
  const axisId = inferAxisId(insight as SeriesResonanceInsight)
  const parts = [
    insight.category || 'concept',
    insight.targetSection || 'bible',
    insight.targetId || 'none',
    axisId,
  ]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '_')
  return `insight_${parts}`
}

export interface SeriesInsightFingerprint {
  category: string
  targetSection: string
  targetId: string
  title: string
}

export function insightFingerprint(
  insight: Pick<SeriesResonanceInsight, 'category' | 'targetSection' | 'targetId' | 'title'>
): SeriesInsightFingerprint {
  return {
    category: normalizeSeriesText(insight.category),
    targetSection: normalizeSeriesText(insight.targetSection),
    targetId: normalizeSeriesText(insight.targetId),
    title: normalizeSeriesText(insight.title),
  }
}

export function fingerprintsMatch(a: SeriesInsightFingerprint, b: SeriesInsightFingerprint): boolean {
  if (a.category && b.category && a.category !== b.category) return false
  if (a.targetSection && b.targetSection && a.targetSection !== b.targetSection) return false
  if (a.targetId && b.targetId && a.targetId === b.targetId) return true
  return tokenOverlap(a.title, b.title) >= 0.45
}

export function enrichSeriesInsight(
  insight: SeriesResonanceInsight,
  axes: SeriesResonanceAxis[]
): SeriesResonanceInsight {
  const axisId = inferAxisId(insight)
  const severity = inferSeriesInsightSeverity(insight)
  return {
    ...insight,
    id: insight.id || stableSeriesInsightId({ ...insight, axisId }),
    axisId,
    severity,
    impactLabel: seriesImpactLabel(severity),
    impactScore: computeImpactScore({ ...insight, axisId, severity }, axes),
    estimatedImpact: calibrateEstimatedImpact({ ...insight, axisId, severity }, axes),
  }
}

function sortWeaknesses(a: SeriesResonanceInsight, b: SeriesResonanceInsight): number {
  const scoreDiff = (b.impactScore ?? 0) - (a.impactScore ?? 0)
  if (scoreDiff !== 0) return scoreDiff
  const axisA = a.axisId ? AXIS_PRIORITY[a.axisId] : 9
  const axisB = b.axisId ? AXIS_PRIORITY[b.axisId] : 9
  return axisA - axisB
}

export function prioritizeSeriesInsights(
  insights: SeriesResonanceInsight[],
  axes: SeriesResonanceAxis[],
  options?: { capActionable?: number; skipCapForIds?: Set<string> }
): SeriesResonanceInsight[] {
  const cap = options?.capActionable ?? MAX_ACTIONABLE_WEAKNESSES
  const skip = options?.skipCapForIds ?? new Set<string>()
  const enriched = insights.map((i) => enrichSeriesInsight(i, axes))

  const strengths = enriched.filter((i) => i.status === 'strength')
  const neutrals = enriched.filter((i) => i.status === 'neutral')
  const weaknesses = enriched.filter((i) => i.status === 'weakness').sort(sortWeaknesses)

  const appliedOrKept = weaknesses.filter((w) => skip.has(w.id))
  const actionable = weaknesses.filter(
    (w) => w.actionable && w.fixSuggestion && !skip.has(w.id)
  )
  const otherWeak = weaknesses.filter(
    (w) => !skip.has(w.id) && !(w.actionable && w.fixSuggestion)
  )

  return [...strengths, ...appliedOrKept, ...actionable.slice(0, cap), ...otherWeak, ...neutrals]
}

export function isResolvedInsight(
  insight: SeriesResonanceInsight,
  appliedIds: string[],
  appliedDetails: SeriesAppliedFixDetail[]
): boolean {
  if (appliedIds.includes(insight.id)) return true
  const fp = insightFingerprint(insight)
  return appliedDetails.some((d) =>
    fingerprintsMatch(
      fp,
      insightFingerprint({
        category: d.category || insight.category,
        targetSection: d.targetSection,
        targetId: d.targetId,
        title: d.title || '',
      })
    )
  )
}

export function wasPreviousInsight(
  insight: SeriesResonanceInsight,
  previous: SeriesResonanceInsight[]
): boolean {
  const fp = insightFingerprint(insight)
  return previous.some(
    (p) => p.id === insight.id || fingerprintsMatch(fp, insightFingerprint(p))
  )
}

export function mergeSeriesInsights(input: {
  incoming: SeriesResonanceInsight[]
  previous?: SeriesResonanceInsight[]
  appliedIds?: string[]
  appliedDetails?: SeriesAppliedFixDetail[]
  axes: SeriesResonanceAxis[]
  iteration?: number
  scoreTrend?: SeriesResonanceAnalysis['scoreTrend']
}): SeriesResonanceInsight[] {
  const previous = input.previous ?? []
  const appliedIds = input.appliedIds ?? []
  const appliedDetails = input.appliedDetails ?? []
  const iteration = input.iteration ?? 1
  const { axes, scoreTrend } = input

  const incoming = input.incoming.map((i) =>
    enrichSeriesInsight(
      { ...i, id: stableSeriesInsightId(i) },
      axes
    )
  )

  let weaknesses = incoming.filter((i) => i.status === 'weakness')
  const strengths = incoming.filter((i) => i.status === 'strength')
  const neutrals = incoming.filter((i) => i.status === 'neutral')

  weaknesses = weaknesses.filter((w) => !isResolvedInsight(w, appliedIds, appliedDetails))

  const newWeaknesses = weaknesses.filter((w) => !wasPreviousInsight(w, previous))
  const returning = weaknesses.filter((w) => wasPreviousInsight(w, previous))

  let acceptedNew = newWeaknesses
  if (iteration > 1) {
    const newHigh = newWeaknesses.filter((w) => w.impactLabel === 'High')
    const newRest = newWeaknesses.filter((w) => w.impactLabel !== 'High')
    acceptedNew = [...newHigh.slice(0, MAX_NEW_HIGH_IMPACT_ON_REANALYZE), ...newRest]
  }
  if (iteration >= 2 && scoreTrend === 'improving') {
    acceptedNew = acceptedNew.filter((w) => w.impactLabel !== 'Low')
  }

  const appliedPrevious = previous
    .filter((p) => p.status === 'weakness' && isResolvedInsight(p, appliedIds, appliedDetails))
    .map((p) => enrichSeriesInsight(p, axes))

  const seen = new Set<string>()
  const mergedWeak: SeriesResonanceInsight[] = []
  for (const w of [...appliedPrevious, ...returning, ...acceptedNew]) {
    const key = w.id
    if (seen.has(key)) continue
    seen.add(key)
    mergedWeak.push(w)
  }

  return prioritizeSeriesInsights([...strengths, ...mergedWeak, ...neutrals], axes, {
    skipCapForIds: new Set(appliedPrevious.map((p) => p.id)),
  })
}

export function applyOptimisticScoreDelta(
  analysis: SeriesResonanceAnalysis,
  delta: number,
  insightId?: string
): SeriesResonanceAnalysis {
  const nextScore = Math.min(100, Math.max(0, analysis.greenlightScore.score + Math.max(0, Math.round(delta))))
  const appliedFixes = insightId
    ? Array.from(new Set([...(analysis.appliedFixes || []), insightId]))
    : analysis.appliedFixes

  return {
    ...analysis,
    greenlightScore: getSeriesGreenlightTier(nextScore),
    appliedFixes,
    isProductionReady: nextScore >= SERIES_READY_SCORE,
    suggestedAction:
      nextScore >= SERIES_READY_SCORE
        ? 'proceed-to-production'
        : analysis.insights?.some(
            (i) =>
              i.status === 'weakness' &&
              i.actionable &&
              i.fixSuggestion &&
              !appliedFixes?.includes(i.id)
          )
          ? 'apply-fixes'
          : analysis.suggestedAction,
  }
}

export function formatClosedIssuesForPrompt(
  previous: SeriesResonanceInsight[] | undefined,
  appliedDetails: SeriesAppliedFixDetail[]
): string {
  const lines: string[] = []
  if (previous?.length) {
    lines.push('PREVIOUS INSIGHTS (do not re-open resolved or paraphrased versions):')
    for (const p of previous.filter((i) => i.status === 'weakness').slice(0, 12)) {
      lines.push(`- [${p.category}] ${p.title}${p.targetId ? ` (target ${p.targetId})` : ''}`)
    }
  }
  if (appliedDetails.length) {
    lines.push('CLOSED / APPLIED FIXES:')
    for (const d of appliedDetails.slice(0, 12)) {
      lines.push(
        `- ${d.title || d.insightId} → ${d.targetSection}${d.targetId ? `/${d.targetId}` : ''}`
      )
    }
  }
  return lines.join('\n')
}

export function buildSeriesAnalysisNarration(analysis: SeriesResonanceAnalysis): string {
  const score = analysis.greenlightScore.score
  const tier = analysis.greenlightScore.label
  const parts: string[] = []

  let headline = `Series resonance score: ${score} out of 100, ${tier}.`
  if (analysis.scoreTrend && analysis.scoreTrend !== 'stable' && analysis.previousScore != null) {
    headline += ` Trend is ${analysis.scoreTrend} from ${analysis.previousScore}.`
  } else if (analysis.scoreTrend === 'stable') {
    headline += ' The score is stable versus the last analysis.'
  }
  parts.push(headline)

  if (analysis.summary.overallAssessment) {
    parts.push(analysis.summary.overallAssessment)
  }
  if (analysis.summary.bingeWorthiness) {
    parts.push(`Binge-worthiness: ${analysis.summary.bingeWorthiness}`)
  }

  const strengths = analysis.summary.keyStrengths?.filter(Boolean) ?? []
  if (strengths.length) {
    parts.push(`Key strengths: ${strengths.join('. ')}.`)
  }

  const highWeak = (analysis.insights || []).filter(
    (i) =>
      i.status === 'weakness' &&
      i.impactLabel === 'High' &&
      !(analysis.appliedFixes || []).includes(i.id)
  )
  if (highWeak.length) {
    parts.push(
      `Highest-impact remaining issues: ${highWeak.map((w) => w.title).join('; ')}.`
    )
  } else if (analysis.summary.criticalWeaknesses?.length) {
    parts.push(`Areas to watch: ${analysis.summary.criticalWeaknesses.slice(0, 3).join('; ')}.`)
  }

  if (analysis.suggestedAction) {
    const actionCopy: Record<NonNullable<SeriesResonanceAnalysis['suggestedAction']>, string> = {
      'proceed-to-production': 'Suggested next action: proceed to production.',
      'apply-fixes': 'Suggested next action: apply the remaining high-impact fixes.',
      'major-rework': 'Suggested next action: a major rework of the storyline.',
      'continue-iterating': 'Suggested next action: continue iterating on the series bible.',
    }
    parts.push(actionCopy[analysis.suggestedAction])
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function axisDisplayLabel(axisId: SeriesResonanceAxis['id'] | undefined): string {
  if (!axisId) return ''
  return AXIS_LABELS[axisId] || axisId
}
