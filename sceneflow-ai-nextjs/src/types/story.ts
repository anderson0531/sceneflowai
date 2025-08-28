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
