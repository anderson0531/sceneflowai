/**
 * Local Score Calculator for Audience Resonance
 * 
 * This module enables client-side score recalculation when fixes are applied,
 * eliminating the need for expensive API calls for each iteration.
 * 
 * The scoring formula:
 * - Each axis starts at baseScore (85)
 * - Failed checkpoints subtract their penalty from the axis score
 * - Overall score = weighted sum of axis scores
 * 
 * Weights:
 * - Concept Originality: 25%
 * - Character Depth: 25%
 * - Pacing & Structure: 20%
 * - Genre Fidelity: 15%
 * - Commercial Viability: 15%
 */

import type { 
  CheckpointResults, 
  AxisCheckpointResults,
  ResonanceAxis,
  GreenlightScore,
  GreenlightTier 
} from '@/lib/types/audienceResonance'
import { 
  SCORING_WEIGHTS, 
  ALL_SCORING_AXES,
  READY_FOR_PRODUCTION_THRESHOLD 
} from './scoringChecklist'

// =============================================================================
// TYPES
// =============================================================================

export interface CheckpointOverride {
  checkpointId: string
  axisId: keyof CheckpointResults
  overridePassed: boolean // User marked this as "fixed"
}

export interface LocalScoreResult {
  overallScore: number
  axes: ResonanceAxis[]
  greenlightScore: GreenlightScore
  isEstimated: boolean // True if overrides applied (not verified by API)
  checkpointResults: CheckpointResults
}

// =============================================================================
// AXIS ID MAPPING
// =============================================================================

const AXIS_ID_TO_WEIGHT_KEY: Record<string, keyof typeof SCORING_WEIGHTS> = {
  'concept-originality': 'concept-originality',
  'character-depth': 'character-depth',
  'pacing-structure': 'pacing-structure',
  'genre-fidelity': 'genre-fidelity',
  'commercial-viability': 'commercial-viability'
}

// Map from checkpoint axis IDs to ResonanceAxisId values used in the UI
const AXIS_ID_TO_RESONANCE_ID: Record<string, string> = {
  'concept-originality': 'originality',
  'character-depth': 'character-depth',
  'pacing-structure': 'pacing',
  'genre-fidelity': 'genre-fidelity',
  'commercial-viability': 'commercial-viability'
}

const AXIS_ID_TO_LABEL: Record<string, string> = {
  'concept-originality': 'Concept Originality',
  'character-depth': 'Character Depth',
  'pacing-structure': 'Pacing & Structure',
  'genre-fidelity': 'Genre Fidelity',
  'commercial-viability': 'Commercial Viability'
}

const AXIS_ID_TO_DESCRIPTION: Record<string, string> = {
  'concept-originality': 'How unique is the concept?',
  'character-depth': 'Are characters well-defined?',
  'pacing-structure': 'Is the structure clear?',
  'genre-fidelity': 'Does it match genre conventions?',
  'commercial-viability': 'Is this marketable?'
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getGreenlightTier(score: number): { tier: GreenlightTier; label: string } {
  if (score >= 80) return { tier: 'market-ready', label: 'Market Ready' }
  if (score >= 60) return { tier: 'strong-potential', label: 'Strong Potential' }
  return { tier: 'needs-refinement', label: 'Needs Refinement' }
}

/**
 * Get penalty for a checkpoint from axis definitions
 */
function getCheckpointPenalty(axisId: string, checkpointId: string): number {
  const axis = ALL_SCORING_AXES.find(a => a.id === axisId)
  if (!axis) return 0
  
  const checkpoint = axis.checkpoints.find(c => c.id === checkpointId)
  return checkpoint?.failPenalty ?? 0
}

// =============================================================================
// MAIN SCORING FUNCTION
// =============================================================================

/**
 * Calculate score locally using checkpoint results and optional overrides
 * 
 * @param serverResults - Original checkpoint results from API
 * @param overrides - User-applied fixes that override checkpoint status
 * @returns Complete score breakdown with estimated flag
 */
export function calculateLocalScore(
  serverResults: CheckpointResults,
  overrides: CheckpointOverride[] = []
): LocalScoreResult {
  // Apply overrides to create effective checkpoint results
  const effectiveResults = applyOverrides(serverResults, overrides)
  
  // Calculate axis scores
  const axes = calculateAxisScores(effectiveResults)
  
  // Calculate weighted overall score
  const overallScore = calculateWeightedScore(axes)
  
  // Determine tier
  const tierInfo = getGreenlightTier(overallScore)
  
  const greenlightScore: GreenlightScore = {
    score: overallScore,
    tier: tierInfo.tier,
    label: tierInfo.label,
    confidence: overrides.length > 0 ? 0.7 : 0.85, // Lower confidence for estimated scores
    analysisDate: new Date().toISOString()
  }
  
  return {
    overallScore,
    axes,
    greenlightScore,
    isEstimated: overrides.length > 0,
    checkpointResults: effectiveResults
  }
}

/**
 * Apply user overrides to checkpoint results
 */
function applyOverrides(
  serverResults: CheckpointResults,
  overrides: CheckpointOverride[]
): CheckpointResults {
  // Deep clone the server results
  const results: CheckpointResults = {
    'concept-originality': { ...serverResults['concept-originality'] },
    'character-depth': { ...serverResults['character-depth'] },
    'pacing-structure': { ...serverResults['pacing-structure'] },
    'genre-fidelity': { ...serverResults['genre-fidelity'] },
    'commercial-viability': { ...serverResults['commercial-viability'] }
  }
  
  // Apply each override
  for (const override of overrides) {
    const axisResults = results[override.axisId]
    if (!axisResults) continue
    
    const penalty = getCheckpointPenalty(override.axisId, override.checkpointId)
    
    axisResults[override.checkpointId] = {
      passed: override.overridePassed,
      penalty: override.overridePassed ? 0 : penalty
    }
  }
  
  return results
}

/**
 * Calculate individual axis scores from checkpoint results
 */
function calculateAxisScores(checkpointResults: CheckpointResults): ResonanceAxis[] {
  const axes: ResonanceAxis[] = []
  
  for (const axisConfig of ALL_SCORING_AXES) {
    const axisId = axisConfig.id as keyof CheckpointResults
    const axisCheckpoints = checkpointResults[axisId] || {}
    
    // Start with base score (85) and subtract penalties
    let score = axisConfig.baseScore
    
    for (const [checkpointId, result] of Object.entries(axisCheckpoints)) {
      if (!result.passed) {
        score -= result.penalty
      }
    }
    
    // Clamp to 0-100
    score = clamp(score, 0, 100)
    
    const weightKey = AXIS_ID_TO_WEIGHT_KEY[axisId]
    const resonanceId = AXIS_ID_TO_RESONANCE_ID[axisId] || axisId
    
    axes.push({
      id: resonanceId as any, // Map to ResonanceAxisId format
      label: AXIS_ID_TO_LABEL[axisId] || axisConfig.label,
      description: AXIS_ID_TO_DESCRIPTION[axisId] || axisConfig.description,
      score,
      weight: SCORING_WEIGHTS[weightKey]
    })
  }
  
  return axes
}

/**
 * Calculate weighted overall score from axis scores
 */
function calculateWeightedScore(axes: ResonanceAxis[]): number {
  let weightedSum = 0
  let totalWeight = 0
  
  for (const axis of axes) {
    weightedSum += axis.score * axis.weight
    totalWeight += axis.weight
  }
  
  // Handle edge case where total weight is 0
  if (totalWeight === 0) return 0
  
  return Math.round(weightedSum / totalWeight)
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the expected score improvement from fixing a specific checkpoint
 */
export function getCheckpointImpact(
  axisId: keyof CheckpointResults,
  checkpointId: string
): number {
  const penalty = getCheckpointPenalty(axisId, checkpointId)
  const weight = SCORING_WEIGHTS[axisId]
  
  // Impact on overall score is penalty * weight
  return Math.round(penalty * weight)
}

/**
 * Check if a score is ready for production
 */
export function isReadyForProduction(score: number): boolean {
  return score >= READY_FOR_PRODUCTION_THRESHOLD
}

/**
 * Get a list of all failed checkpoints with their impact
 */
export function getFailedCheckpoints(
  checkpointResults: CheckpointResults
): Array<{ axisId: string; checkpointId: string; penalty: number; impact: number }> {
  const failed: Array<{ axisId: string; checkpointId: string; penalty: number; impact: number }> = []
  
  for (const [axisId, axisResults] of Object.entries(checkpointResults)) {
    const weight = SCORING_WEIGHTS[axisId as keyof typeof SCORING_WEIGHTS]
    
    for (const [checkpointId, result] of Object.entries(axisResults as AxisCheckpointResults)) {
      if (!result.passed && result.penalty > 0) {
        failed.push({
          axisId,
          checkpointId,
          penalty: result.penalty,
          impact: Math.round(result.penalty * weight)
        })
      }
    }
  }
  
  // Sort by impact descending
  return failed.sort((a, b) => b.impact - a.impact)
}

/**
 * Create empty checkpoint results (for fallback)
 */
export function createEmptyCheckpointResults(): CheckpointResults {
  return {
    'concept-originality': {},
    'character-depth': {},
    'pacing-structure': {},
    'genre-fidelity': {},
    'commercial-viability': {}
  }
}
