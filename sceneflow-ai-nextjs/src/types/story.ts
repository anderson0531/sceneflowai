/**
 * Define the TypeScript interfaces for the Story Insights feature.
 * The crucial part is the ActionableMutation, which the backend AI must return.
 * We use discriminated unions for robust type safety.
 */

export type InteractionMode = 'CoPilot' | 'Guidance';

// Define specific mutations the AI can perform
export type ActionableMutation =
  | { type: 'UPDATE_TREATMENT_TEXT'; field: string; newValue: string; oldValue: string; }
  | { type: 'ADJUST_BEAT_DURATION'; beatId: string; newDuration: number; oldDuration: number; }
  | { type: 'UPDATE_CHARACTER_MOTIVATION'; characterId: string; newValue: string; oldValue: string; }
  | { type: 'MERGE_BEATS'; beatIds: string[]; newBeatDescription: string; };

// ============================================================================
// REVIEW SYSTEM TYPES
// ============================================================================

/** Priority levels for recommendations with weighted score floor increments */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'optional';

/** Score floor increment per priority level when recommendation is applied */
export const PRIORITY_SCORE_WEIGHTS: Record<RecommendationPriority, number> = {
  critical: 5,
  high: 3,
  medium: 2,
  optional: 1,
};

/** Review category for Director/Audience analysis */
export type ReviewCategory = 
  // Director categories
  | 'story-structure' 
  | 'character-development' 
  | 'pacing' 
  | 'visual-storytelling' 
  | 'dialogue-quality'
  // Audience categories
  | 'entertainment-value'
  | 'emotional-impact'
  | 'clarity'
  | 'character-relatability'
  | 'satisfying-payoff';

/** A single scored category within a review */
export interface CategoryScore {
  category: ReviewCategory;
  score: number; // 0-100
  weight: number; // 0-1 (e.g., 0.25 = 25% of total)
  notes?: string;
}

/** Enhanced recommendation with priority weighting */
export interface WeightedRecommendation {
  id: string;
  category: ReviewCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  before: string;
  after: string;
  rationale: string;
  impact: string;
  appliedAt?: string; // ISO timestamp when applied
  dismissedAt?: string; // ISO timestamp when dismissed
}

/** A single review snapshot for a scene */
export interface SceneReviewSnapshot {
  sceneIndex: number;
  directorScore: number;
  audienceScore: number;
  overallScore: number;
  categoryScores: CategoryScore[];
  recommendations: WeightedRecommendation[];
  appliedRecommendationIds: string[];
  timestamp: string;
  iteration: number;
}

/** Review history for the entire project */
export interface ProjectReviewHistory {
  projectId: string;
  sceneSnapshots: Record<number, SceneReviewSnapshot[]>; // keyed by sceneIndex
  lastReviewAt: string;
  totalIterations: number;
  resetAt?: string; // timestamp if review was reset
}

/** Context passed to review APIs for score stabilization */
export interface ReviewContext {
  previousScores: {
    director: number;
    audience: number;
    overall: number;
  };
  appliedRecommendationIds: string[];
  iteration: number;
  scoreFloor: number;
  isConverged: boolean;
}

// ============================================================================
// ORIGINAL STORY RECOMMENDATION TYPES
// ============================================================================

export interface StoryRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidenceScore: number; // AI confidence (0 to 1). Used for auto-apply logic.
  status: 'pending_review' | 'applied' | 'dismissed';
  isAutoApplied: boolean;
  proposedMutation: ActionableMutation;
}

