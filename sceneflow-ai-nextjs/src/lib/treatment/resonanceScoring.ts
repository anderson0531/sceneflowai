/**
 * Shared scoring + insight prioritization for Blueprint Audience Resonance.
 */

import type {
  CheckpointResults,
  ResonanceAxis,
  ResonanceInsight,
  ScoreImprovementPath,
  ScoreImprovementStep,
} from '@/lib/types/audienceResonance'
import {
  ALL_SCORING_AXES,
  SCORING_WEIGHTS,
  calculateAxisScoreGradient,
  getCheckpointFailPenalty,
  CHECKPOINT_PENALTY_SCALE,
  READY_FOR_PRODUCTION_THRESHOLD,
  enforceScoreFloor,
} from '@/lib/treatment/scoringChecklist'

const AXIS_TO_RESONANCE_ID: Record<string, ResonanceAxis['id']> = {
  'concept-originality': 'originality',
  'character-depth': 'character-depth',
  'pacing-structure': 'pacing',
  'genre-fidelity': 'genre-fidelity',
  'commercial-viability': 'commercial-viability',
}

/** Normalize treatment variant for /api/treatment/refine */
export function treatmentToRefineVariant(treatment: Record<string, unknown>) {
  return {
    title: (treatment.label as string) || (treatment.title as string) || '',
    logline: (treatment.logline as string) || '',
    synopsis: treatment.synopsis,
    genre: treatment.genre,
    format_length: treatment.format_length,
    target_audience: treatment.target_audience,
    protagonist: treatment.protagonist || '',
    antagonist: treatment.antagonist || '',
    setting: treatment.setting || '',
    act_breakdown: treatment.act_breakdown,
    tone: treatment.tone,
    tone_description: treatment.tone_description || treatment.tone,
    style: treatment.style,
    visual_style: treatment.visual_style,
    artStyle: treatment.artStyle,
    aspectRatio: treatment.aspectRatio,
    themes: treatment.themes,
    mood_references: treatment.mood_references,
    beats: treatment.beats || [],
    character_descriptions: treatment.character_descriptions || [],
    total_duration_seconds: treatment.total_duration_seconds,
    estimatedDurationMinutes: treatment.estimatedDurationMinutes,
  }
}

export function deriveAxisScoresFromCheckpoints(
  checkpointResults: CheckpointResults
): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const axis of ALL_SCORING_AXES) {
    const axisKey = axis.id as keyof CheckpointResults
    const axisResults = checkpointResults[axisKey] || {}
    const gradientInput: Record<string, number> = {}
    for (const cp of axis.checkpoints) {
      const entry = axisResults[cp.id]
      gradientInput[cp.id] = entry?.score ?? (entry?.passed ? 8 : 5)
    }
    scores[axis.id] = calculateAxisScoreGradient(gradientInput, axis)
  }
  return scores
}

export function blendAxisScores(
  aiAxes: ResonanceAxis[],
  checkpointResults: CheckpointResults,
  checkpointWeight = 0.7
): ResonanceAxis[] {
  const derived = deriveAxisScoresFromCheckpoints(checkpointResults)
  const aiWeight = 1 - checkpointWeight

  return aiAxes.map((axis) => {
    const axisConfigId =
      axis.id === 'originality'
        ? 'concept-originality'
        : axis.id === 'pacing'
          ? 'pacing-structure'
          : axis.id
    const derivedScore = derived[axisConfigId] ?? axis.score
    const blended = Math.round(derivedScore * checkpointWeight + axis.score * aiWeight)
    return { ...axis, score: Math.min(100, Math.max(0, blended)) }
  })
}

export function calculateWeightedOverallScore(axes: ResonanceAxis[]): number {
  let total = 0
  let weightSum = 0
  for (const axis of axes) {
    const axisConfigId =
      axis.id === 'originality'
        ? 'concept-originality'
        : axis.id === 'pacing'
          ? 'pacing-structure'
          : axis.id
    const w = SCORING_WEIGHTS[axisConfigId as keyof typeof SCORING_WEIGHTS] ?? axis.weight
    total += axis.score * w
    weightSum += w
  }
  return weightSum > 0 ? Math.round(total / weightSum) : 50
}

export function getInsightImpactScore(
  insight: ResonanceInsight,
  checkpointResults?: CheckpointResults | null
): number {
  if (insight.status !== 'weakness') return 0
  if (insight.checkpointId) {
    const penalty = getCheckpointFailPenalty(insight.checkpointId)
    const axisResults =
      insight.axisId && checkpointResults
        ? checkpointResults[insight.axisId as keyof CheckpointResults]
        : undefined
    const entry = axisResults?.[insight.checkpointId]
    if (entry?.score !== undefined) {
      const penaltyFraction = (10 - entry.score) / 10
      return Math.round(penalty * penaltyFraction * CHECKPOINT_PENALTY_SCALE)
    }
    return penalty
  }
  return 12
}

export function enrichAndPrioritizeInsights(
  insights: ResonanceInsight[],
  checkpointResults?: CheckpointResults | null
): ResonanceInsight[] {
  const withImpact = insights.map((i) => ({
    ...i,
    impactScore: getInsightImpactScore(i, checkpointResults),
  }))

  const strengths = withImpact.filter((i) => i.status === 'strength')
  const neutrals = withImpact.filter((i) => i.status === 'neutral')
  const weaknesses = withImpact
    .filter((i) => i.status === 'weakness')
    .sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0))
    .slice(0, 8)

  return [...strengths, ...weaknesses, ...neutrals]
}

export function impactLabel(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 18) return 'High'
  if (score >= 10) return 'Medium'
  return 'Low'
}

const INSIGHT_AXIS_TO_RESONANCE: Record<string, ResonanceAxis['id']> = {
  'concept-originality': 'originality',
  'character-depth': 'character-depth',
  'pacing-structure': 'pacing',
  'genre-fidelity': 'genre-fidelity',
  'commercial-viability': 'commercial-viability',
}

const AXIS_DISPLAY_LABELS: Record<ResonanceAxis['id'], string> = {
  originality: 'Concept originality',
  'character-depth': 'Character depth',
  pacing: 'Pacing & structure',
  'genre-fidelity': 'Genre fidelity',
  'commercial-viability': 'Commercial viability',
}

export function getResonanceAxisIdForInsight(
  insight: ResonanceInsight
): ResonanceAxis['id'] | null {
  if (!insight.axisId) return null
  return INSIGHT_AXIS_TO_RESONANCE[insight.axisId] ?? null
}

/**
 * Axis scores should reflect surfaced weaknesses only — hidden checkpoint gaps
 * on axes without a listed issue should not drag the overall score down.
 */
export function applyWeaknessAwareAxisFloors(
  axes: ResonanceAxis[],
  weaknesses: ResonanceInsight[]
): ResonanceAxis[] {
  const maxImpactByAxis = new Map<ResonanceAxis['id'], number>()

  for (const w of weaknesses) {
    const axisId = getResonanceAxisIdForInsight(w)
    if (!axisId) continue
    const impact = w.impactScore ?? getInsightImpactScore(w)
    maxImpactByAxis.set(axisId, Math.max(maxImpactByAxis.get(axisId) ?? 0, impact))
  }

  return axes.map((axis) => {
    const impact = maxImpactByAxis.get(axis.id)
    if (impact === undefined) {
      return { ...axis, score: Math.max(axis.score, 76) }
    }
    if (impact < 10) {
      return { ...axis, score: Math.max(axis.score, 72) }
    }
    if (impact < 18) {
      return { ...axis, score: Math.max(axis.score, 65) }
    }
    return axis
  })
}

function estimateGainForStep(
  impact: 'High' | 'Medium' | 'Low',
  axisScore?: number
): number {
  const gap = axisScore != null ? Math.max(0, 78 - axisScore) : 8
  if (impact === 'High') return Math.min(12, Math.max(4, Math.round(gap * 0.55)))
  if (impact === 'Medium') return Math.min(8, Math.max(2, Math.round(gap * 0.35)))
  return Math.min(5, Math.max(1, Math.round(gap * 0.2)))
}

export function buildScoreImprovementPath(
  currentScore: number,
  axes: ResonanceAxis[],
  weaknesses: ResonanceInsight[],
  threshold = READY_FOR_PRODUCTION_THRESHOLD
): ScoreImprovementPath {
  const sorted = [...weaknesses]
    .filter((w) => w.status === 'weakness' && w.fixSuggestion && w.fixSection)
    .sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0))

  const steps: ScoreImprovementStep[] = sorted.map((w) => {
    const axisId = getResonanceAxisIdForInsight(w)
    const axis = axisId ? axes.find((a) => a.id === axisId) : undefined
    const impact = impactLabel(w.impactScore ?? getInsightImpactScore(w))
    return {
      id: w.id,
      title: w.title,
      insight: w.insight,
      axisLabel: axisId ? AXIS_DISPLAY_LABELS[axisId] : 'Blueprint',
      section: w.fixSection || 'story',
      estimatedGain: estimateGainForStep(impact, axis?.score),
      impact,
      fixSuggestion: w.fixSuggestion,
    }
  })

  const topGains = steps.slice(0, 3).reduce((sum, s) => sum + s.estimatedGain, 0)

  return {
    pointsToReady: Math.max(0, threshold - currentScore),
    steps,
    projectedScoreIfTopSteps: Math.min(100, currentScore + topGains),
  }
}

/**
 * Finalize axes + overall: weakness-aware floors and low-issue score sanity.
 */
export function finalizeResonanceScore(
  blendedAxes: ResonanceAxis[],
  weaknesses: ResonanceInsight[],
  previousOverall?: number | null,
  iteration = 1
): { axes: ResonanceAxis[]; overall: number; scorePath: ScoreImprovementPath } {
  const actionable = weaknesses.filter((w) => w.status === 'weakness')
  const flooredAxes = applyWeaknessAwareAxisFloors(blendedAxes, actionable)
  let overall = calculateWeightedOverallScore(flooredAxes)

  if (
    actionable.length > 0 &&
    actionable.length <= 4 &&
    actionable.every((w) => impactLabel(w.impactScore ?? 0) === 'Low')
  ) {
    const floor = 74 - Math.max(0, 4 - actionable.length) * 2
    overall = Math.max(overall, floor)
  }

  if (previousOverall != null) {
    overall = enforceScoreFloor(overall, previousOverall, iteration)
  }

  const scorePath = buildScoreImprovementPath(overall, flooredAxes, actionable)

  return { axes: flooredAxes, overall, scorePath }
}

export { CHECKPOINT_PENALTY_SCALE }
