/**
 * Shared scoring + insight prioritization for Blueprint Audience Resonance.
 */

import type {
  CheckpointResults,
  ResonanceAxis,
  ResonanceInsight,
} from '@/lib/types/audienceResonance'
import {
  ALL_SCORING_AXES,
  SCORING_WEIGHTS,
  calculateAxisScoreGradient,
  getCheckpointFailPenalty,
  CHECKPOINT_PENALTY_SCALE,
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

export { CHECKPOINT_PENALTY_SCALE }
