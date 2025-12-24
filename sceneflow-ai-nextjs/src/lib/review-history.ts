/**
 * Review History Management Service
 * 
 * Manages the persistence of scene review history within project metadata.
 * Uses the project's JSONB metadata field for cross-session continuity.
 */

import { RecommendationPriority } from '@/types/story'

// Review history entry for a single scene analysis iteration
export interface ReviewHistoryEntry {
  id: string
  timestamp: string
  sceneIndex: number
  directorScore: number
  audienceScore: number
  overallScore: number
  appliedRecommendationIds: string[]
  appliedRecommendationPriorities: Record<string, RecommendationPriority>
  iterationCount: number
}

// Complete review history for a project
export interface ReviewHistory {
  projectId: string
  entries: ReviewHistoryEntry[]
  lastResetAt?: string
  totalIterations: number
  sceneStates: Record<number, SceneReviewState>
}

// Current state of a scene's review progress
export interface SceneReviewState {
  sceneIndex: number
  currentDirectorScore: number
  currentAudienceScore: number
  currentOverallScore: number
  scoreFloor: number
  appliedRecommendationIds: string[]
  appliedRecommendationPriorities: Record<string, RecommendationPriority>
  iterationCount: number
  isConverged: boolean
  lastUpdated: string
}

// Default empty state for a new scene
export function createEmptySceneState(sceneIndex: number): SceneReviewState {
  return {
    sceneIndex,
    currentDirectorScore: 0,
    currentAudienceScore: 0,
    currentOverallScore: 0,
    scoreFloor: 0,
    appliedRecommendationIds: [],
    appliedRecommendationPriorities: {},
    iterationCount: 0,
    isConverged: false,
    lastUpdated: new Date().toISOString()
  }
}

// Default empty history for a new project
export function createEmptyReviewHistory(projectId: string): ReviewHistory {
  return {
    projectId,
    entries: [],
    totalIterations: 0,
    sceneStates: {}
  }
}

// Extract review history from project metadata
export function getReviewHistoryFromMetadata(metadata: Record<string, any>, projectId: string): ReviewHistory {
  if (metadata?.reviewHistory) {
    return metadata.reviewHistory as ReviewHistory
  }
  return createEmptyReviewHistory(projectId)
}

// Get the current state for a specific scene
export function getSceneReviewState(history: ReviewHistory, sceneIndex: number): SceneReviewState {
  return history.sceneStates[sceneIndex] || createEmptySceneState(sceneIndex)
}

// Update a scene's review state after applying recommendations
export function updateSceneReviewState(
  history: ReviewHistory,
  sceneIndex: number,
  update: {
    directorScore?: number
    audienceScore?: number
    appliedRecommendationId?: string
    appliedRecommendationPriority?: RecommendationPriority
    isConverged?: boolean
  }
): ReviewHistory {
  const currentState = getSceneReviewState(history, sceneIndex)
  
  const newAppliedIds = update.appliedRecommendationId 
    ? [...currentState.appliedRecommendationIds, update.appliedRecommendationId]
    : currentState.appliedRecommendationIds
    
  const newPriorities = update.appliedRecommendationId && update.appliedRecommendationPriority
    ? { ...currentState.appliedRecommendationPriorities, [update.appliedRecommendationId]: update.appliedRecommendationPriority }
    : currentState.appliedRecommendationPriorities

  const directorScore = update.directorScore ?? currentState.currentDirectorScore
  const audienceScore = update.audienceScore ?? currentState.currentAudienceScore
  const overallScore = Math.round((directorScore + audienceScore) / 2)

  const updatedState: SceneReviewState = {
    ...currentState,
    currentDirectorScore: directorScore,
    currentAudienceScore: audienceScore,
    currentOverallScore: overallScore,
    appliedRecommendationIds: newAppliedIds,
    appliedRecommendationPriorities: newPriorities,
    iterationCount: currentState.iterationCount + (update.appliedRecommendationId ? 1 : 0),
    isConverged: update.isConverged ?? currentState.isConverged,
    lastUpdated: new Date().toISOString()
  }

  // Create history entry if this is a score update
  const entry: ReviewHistoryEntry = {
    id: `review-${sceneIndex}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    sceneIndex,
    directorScore,
    audienceScore,
    overallScore,
    appliedRecommendationIds: newAppliedIds,
    appliedRecommendationPriorities: newPriorities,
    iterationCount: updatedState.iterationCount
  }

  return {
    ...history,
    entries: [...history.entries, entry],
    totalIterations: history.totalIterations + (update.appliedRecommendationId ? 1 : 0),
    sceneStates: {
      ...history.sceneStates,
      [sceneIndex]: updatedState
    }
  }
}

// Reset all scene review states (for major script changes)
export function resetAllSceneStates(history: ReviewHistory): ReviewHistory {
  return {
    ...history,
    entries: [],
    totalIterations: 0,
    sceneStates: {},
    lastResetAt: new Date().toISOString()
  }
}

// Reset a single scene's review state
export function resetSceneState(history: ReviewHistory, sceneIndex: number): ReviewHistory {
  const { [sceneIndex]: removed, ...remainingStates } = history.sceneStates
  
  return {
    ...history,
    sceneStates: remainingStates
  }
}

// Prepare metadata update with review history
export function prepareMetadataUpdate(
  existingMetadata: Record<string, any>,
  reviewHistory: ReviewHistory
): Record<string, any> {
  return {
    ...existingMetadata,
    reviewHistory
  }
}

// Get summary statistics for review history
export function getReviewHistorySummary(history: ReviewHistory): {
  totalScenes: number
  averageScore: number
  convergedScenes: number
  totalIterations: number
  lastResetAt?: string
} {
  const sceneStates = Object.values(history.sceneStates)
  const totalScenes = sceneStates.length
  const convergedScenes = sceneStates.filter(s => s.isConverged).length
  const averageScore = totalScenes > 0
    ? Math.round(sceneStates.reduce((sum, s) => sum + s.currentOverallScore, 0) / totalScenes)
    : 0

  return {
    totalScenes,
    averageScore,
    convergedScenes,
    totalIterations: history.totalIterations,
    lastResetAt: history.lastResetAt
  }
}
