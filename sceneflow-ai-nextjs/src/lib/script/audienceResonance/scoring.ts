import type { PreviousScores, SceneAnalysis, ScoreCategory } from './types'

/** Dimension weights, summing to 100. */
export const DIMENSION_WEIGHTS: Record<string, number> = {
  'Dialogue Subtext': 20,
  'Structural Integrity': 20,
  'Emotional Arc': 20,
  'Visual Storytelling': 15,
  'Pacing & Rhythm': 15,
  'Show vs Tell Ratio': 10,
}

export const DEFAULT_CATEGORIES: ScoreCategory[] = [
  { name: 'Dialogue Subtext', score: 70, weight: 20 },
  { name: 'Structural Integrity', score: 70, weight: 20 },
  { name: 'Emotional Arc', score: 70, weight: 20 },
  { name: 'Visual Storytelling', score: 70, weight: 15 },
  { name: 'Pacing & Rhythm', score: 70, weight: 15 },
  { name: 'Show vs Tell Ratio', score: 70, weight: 10 },
]

const ANCHOR_STRENGTH = 0.2
const MAX_DELTA = 15

/**
 * Anchors new dimensional scores toward the previous run so repeat analysis of
 * an unchanged script does not swing (the "slot machine" effect).
 * 20% previous + 80% new, clamped to +/-15 points per dimension.
 */
export function applyHysteresis(
  categories: ScoreCategory[],
  previousScores?: PreviousScores
): ScoreCategory[] {
  if (!previousScores?.categories?.length || !categories.length) return categories

  const previousByName = new Map(previousScores.categories.map((c) => [c.name, c.score]))

  return categories.map((cat) => {
    const prevScore = previousByName.get(cat.name)
    if (prevScore === undefined) return cat

    let anchored = Math.round(prevScore * ANCHOR_STRENGTH + cat.score * (1 - ANCHOR_STRENGTH))
    const delta = anchored - prevScore
    if (Math.abs(delta) > MAX_DELTA) {
      anchored = prevScore + (delta > 0 ? MAX_DELTA : -MAX_DELTA)
    }
    return { ...cat, score: anchored }
  })
}

/** Story-weighted average of scene scores, or null when weights are unusable. */
export function sceneWeightedScore(sceneAnalysis: SceneAnalysis[]): number | null {
  if (!sceneAnalysis?.length) return null

  let weightedTotal = 0
  let weightTotal = 0
  let allWeightsValid = true

  for (const scene of sceneAnalysis) {
    if (typeof scene.score === 'number' && typeof scene.storyWeight === 'number' && scene.storyWeight > 0) {
      weightedTotal += scene.score * scene.storyWeight
      weightTotal += scene.storyWeight
    } else {
      allWeightsValid = false
      break
    }
  }

  if (allWeightsValid && weightTotal > 0) {
    return Math.round(weightedTotal / weightTotal)
  }

  const scored = sceneAnalysis.filter((s) => typeof s.score === 'number')
  if (!scored.length) return null
  return Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length)
}

/** Weighted average of dimensional scores, used when scene scores are absent. */
export function dimensionalScore(categories: ScoreCategory[]): number | null {
  if (!categories?.length) return null
  let weightedSum = 0
  let totalWeight = 0
  for (const cat of categories) {
    const weight = DIMENSION_WEIGHTS[cat.name] || cat.weight || 0
    weightedSum += (cat.score ?? 70) * weight
    totalWeight += weight
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null
}

/**
 * Final overall score: scene-weighted average preferred, dimensional average as
 * fallback, then the narration auto-cap applied.
 */
export function resolveOverallScore(input: {
  sceneAnalysis: SceneAnalysis[]
  categories: ScoreCategory[]
  autoScoreCap: number
}): { score: number; basis: 'scene' | 'dimensional' | 'default' } {
  const fromScenes = sceneWeightedScore(input.sceneAnalysis)
  if (fromScenes !== null) {
    return { score: Math.min(fromScenes, input.autoScoreCap), basis: 'scene' }
  }
  const fromDimensions = dimensionalScore(input.categories)
  if (fromDimensions !== null) {
    return { score: Math.min(fromDimensions, input.autoScoreCap), basis: 'dimensional' }
  }
  return { score: Math.min(70, input.autoScoreCap), basis: 'default' }
}
