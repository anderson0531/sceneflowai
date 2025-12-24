/**
 * Review Criteria Library
 * 
 * Defines consistent scoring rubrics, category weights, and tier descriptors
 * for Director and Audience review perspectives.
 */

import { ReviewCategory, CategoryScore, RecommendationPriority, PRIORITY_SCORE_WEIGHTS } from '@/types/story';

// ============================================================================
// DIRECTOR REVIEW CRITERIA
// ============================================================================

export interface ReviewCriterion {
  category: ReviewCategory;
  label: string;
  weight: number; // 0-1, all weights in a perspective should sum to 1.0
  description: string;
  scoringTiers: {
    tier: string;
    range: [number, number];
    descriptors: string[];
  }[];
}

export const DIRECTOR_CRITERIA: ReviewCriterion[] = [
  {
    category: 'story-structure',
    label: 'Story Structure',
    weight: 0.25,
    description: 'Scene setup, conflict, resolution, and narrative arc progression',
    scoringTiers: [
      { tier: 'Exceptional', range: [95, 100], descriptors: ['Perfect three-act structure within scene', 'Clear setup-conflict-resolution', 'Seamless transitions'] },
      { tier: 'Very Good', range: [90, 94], descriptors: ['Strong structure with minor refinement opportunities', 'Clear narrative purpose', 'Effective scene beats'] },
      { tier: 'Good', range: [85, 89], descriptors: ['Solid structure', 'Some beats could be tightened', 'Purpose is clear'] },
      { tier: 'Needs Work', range: [80, 84], descriptors: ['Structure is present but uneven', 'Missing clear turning points', 'Purpose unclear'] },
      { tier: 'Significant Issues', range: [70, 79], descriptors: ['Weak or missing structure', 'Scene meanders', 'No clear purpose'] },
      { tier: 'Major Revision', range: [0, 69], descriptors: ['Fundamental structural problems', 'Complete restructure needed'] },
    ],
  },
  {
    category: 'character-development',
    label: 'Character Development',
    weight: 0.20,
    description: 'Character arc progression, motivation clarity, and depth',
    scoringTiers: [
      { tier: 'Exceptional', range: [95, 100], descriptors: ['Profound character moments', 'Clear growth visible', 'Authentic reactions'] },
      { tier: 'Very Good', range: [90, 94], descriptors: ['Strong characterization', 'Motivations clear', 'Consistent behavior'] },
      { tier: 'Good', range: [85, 89], descriptors: ['Characters feel real', 'Some depth shown', 'Generally consistent'] },
      { tier: 'Needs Work', range: [80, 84], descriptors: ['Characters present but flat', 'Motivations vague', 'Inconsistent actions'] },
      { tier: 'Significant Issues', range: [70, 79], descriptors: ['Thin characterization', 'Unclear motivations', 'Unrealistic behavior'] },
      { tier: 'Major Revision', range: [0, 69], descriptors: ['No character development', 'Completely unmotivated'] },
    ],
  },
  {
    category: 'pacing',
    label: 'Pacing & Flow',
    weight: 0.20,
    description: 'Scene rhythm, timing, momentum, and flow',
    scoringTiers: [
      { tier: 'Exceptional', range: [95, 100], descriptors: ['Perfect rhythm', 'Natural flow', 'Ideal scene length'] },
      { tier: 'Very Good', range: [90, 94], descriptors: ['Strong pacing', 'Good momentum', 'Minor timing tweaks possible'] },
      { tier: 'Good', range: [85, 89], descriptors: ['Generally good rhythm', 'Slight drag or rush in places'] },
      { tier: 'Needs Work', range: [80, 84], descriptors: ['Uneven pacing', 'Scene feels too long or short', 'Momentum issues'] },
      { tier: 'Significant Issues', range: [70, 79], descriptors: ['Poor pacing', 'Scene drags or rushes significantly'] },
      { tier: 'Major Revision', range: [0, 69], descriptors: ['No sense of rhythm', 'Complete pacing overhaul needed'] },
    ],
  },
  {
    category: 'visual-storytelling',
    label: 'Visual Storytelling',
    weight: 0.20,
    description: 'Cinematic potential, shot opportunities, visual elements',
    scoringTiers: [
      { tier: 'Exceptional', range: [95, 100], descriptors: ['Highly cinematic', 'Clear visual beats', 'Production-ready descriptions'] },
      { tier: 'Very Good', range: [90, 94], descriptors: ['Strong visual elements', 'Good shot opportunities', 'Clear staging'] },
      { tier: 'Good', range: [85, 89], descriptors: ['Adequate visual descriptions', 'Some opportunities missed'] },
      { tier: 'Needs Work', range: [80, 84], descriptors: ['Thin visual descriptions', 'Missed cinematic opportunities'] },
      { tier: 'Significant Issues', range: [70, 79], descriptors: ['Mostly talking heads', 'No visual storytelling'] },
      { tier: 'Major Revision', range: [0, 69], descriptors: ['No visual elements', 'Impossible to visualize'] },
    ],
  },
  {
    category: 'dialogue-quality',
    label: 'Dialogue Quality',
    weight: 0.15,
    description: 'Natural flow, character voice, subtext, and purpose',
    scoringTiers: [
      { tier: 'Exceptional', range: [95, 100], descriptors: ['Brilliant dialogue', 'Each line reveals character', 'Rich subtext'] },
      { tier: 'Very Good', range: [90, 94], descriptors: ['Strong dialogue', 'Distinct voices', 'Good subtext'] },
      { tier: 'Good', range: [85, 89], descriptors: ['Serviceable dialogue', 'Characters distinguishable', 'Purpose clear'] },
      { tier: 'Needs Work', range: [80, 84], descriptors: ['Generic dialogue', 'Similar voices', 'On-the-nose'] },
      { tier: 'Significant Issues', range: [70, 79], descriptors: ['Weak dialogue', 'All characters sound same', 'Expository'] },
      { tier: 'Major Revision', range: [0, 69], descriptors: ['Dialogue fails to serve story', 'Complete rewrite needed'] },
    ],
  },
];

// ============================================================================
// AUDIENCE REVIEW CRITERIA
// ============================================================================

export const AUDIENCE_CRITERIA: ReviewCriterion[] = [
  {
    category: 'entertainment-value',
    label: 'Entertainment Value',
    weight: 0.25,
    description: 'How engaging, compelling, and attention-holding the scene is',
    scoringTiers: [
      { tier: 'Exceptional', range: [95, 100], descriptors: ['Utterly compelling', "Can't look away", 'Perfect entertainment'] },
      { tier: 'Very Good', range: [90, 94], descriptors: ['Highly engaging', 'Keeps attention throughout', 'Fun to watch'] },
      { tier: 'Good', range: [85, 89], descriptors: ['Entertaining', 'Holds interest', 'Enjoyable'] },
      { tier: 'Needs Work', range: [80, 84], descriptors: ['Somewhat engaging', 'Attention wanders at times'] },
      { tier: 'Significant Issues', range: [70, 79], descriptors: ['Boring in places', 'Struggles to engage'] },
      { tier: 'Major Revision', range: [0, 69], descriptors: ['Not entertaining', 'Audience will skip'] },
    ],
  },
  {
    category: 'emotional-impact',
    label: 'Emotional Impact',
    weight: 0.25,
    description: 'Emotional resonance, connection, and journey',
    scoringTiers: [
      { tier: 'Exceptional', range: [95, 100], descriptors: ['Deeply moving', 'Powerful emotional beats', 'Memorable'] },
      { tier: 'Very Good', range: [90, 94], descriptors: ['Strong emotions', 'Audience will feel something', 'Resonant'] },
      { tier: 'Good', range: [85, 89], descriptors: ['Some emotional moments', 'Connection possible'] },
      { tier: 'Needs Work', range: [80, 84], descriptors: ['Flat emotionally', 'Misses emotional beats'] },
      { tier: 'Significant Issues', range: [70, 79], descriptors: ['No emotional engagement', 'Cold or distant'] },
      { tier: 'Major Revision', range: [0, 69], descriptors: ['Emotionally dead', 'No connection possible'] },
    ],
  },
  {
    category: 'clarity',
    label: 'Clarity & Accessibility',
    weight: 0.20,
    description: 'Easy to follow, understandable stakes, clear story',
    scoringTiers: [
      { tier: 'Exceptional', range: [95, 100], descriptors: ['Crystal clear', 'Stakes perfectly understood', 'Effortless to follow'] },
      { tier: 'Very Good', range: [90, 94], descriptors: ['Very clear', 'Easy to understand', 'No confusion'] },
      { tier: 'Good', range: [85, 89], descriptors: ['Generally clear', 'Minor confusion possible'] },
      { tier: 'Needs Work', range: [80, 84], descriptors: ['Some confusion', 'Stakes unclear', 'Hard to follow at times'] },
      { tier: 'Significant Issues', range: [70, 79], descriptors: ['Confusing', 'Audience will be lost', 'Unclear purpose'] },
      { tier: 'Major Revision', range: [0, 69], descriptors: ['Incomprehensible', 'Complete clarity overhaul needed'] },
    ],
  },
  {
    category: 'character-relatability',
    label: 'Character Relatability',
    weight: 0.15,
    description: 'Audience connection, likable characters, emotional investment',
    scoringTiers: [
      { tier: 'Exceptional', range: [95, 100], descriptors: ['Deeply relatable', 'Audience will root for them', 'Universal appeal'] },
      { tier: 'Very Good', range: [90, 94], descriptors: ['Likable characters', 'Easy to connect with', 'Investable'] },
      { tier: 'Good', range: [85, 89], descriptors: ['Relatable enough', 'Some connection possible'] },
      { tier: 'Needs Work', range: [80, 84], descriptors: ['Hard to connect with', 'Characters feel distant'] },
      { tier: 'Significant Issues', range: [70, 79], descriptors: ['Unlikable without intention', 'No connection'] },
      { tier: 'Major Revision', range: [0, 69], descriptors: ['Completely unrelatable', 'Audience will reject'] },
    ],
  },
  {
    category: 'satisfying-payoff',
    label: 'Satisfying Payoff',
    weight: 0.15,
    description: 'Fulfilling conclusion, resolution, closure within the scene',
    scoringTiers: [
      { tier: 'Exceptional', range: [95, 100], descriptors: ['Perfect payoff', 'Deeply satisfying', 'Worth the journey'] },
      { tier: 'Very Good', range: [90, 94], descriptors: ['Strong payoff', 'Satisfying conclusion', 'Good closure'] },
      { tier: 'Good', range: [85, 89], descriptors: ['Adequate payoff', 'Scene ends well'] },
      { tier: 'Needs Work', range: [80, 84], descriptors: ['Weak payoff', 'Ending feels rushed or flat'] },
      { tier: 'Significant Issues', range: [70, 79], descriptors: ['No payoff', 'Scene ends without resolution'] },
      { tier: 'Major Revision', range: [0, 69], descriptors: ['Frustrating ending', 'Anti-climactic'] },
    ],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate weighted overall score from category scores
 */
export function calculateWeightedScore(categoryScores: CategoryScore[]): number {
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const cs of categoryScores) {
    weightedSum += cs.score * cs.weight;
    totalWeight += cs.weight;
  }
  
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * Calculate score floor based on applied recommendations with priority weighting
 * Critical: +5, High: +3, Medium: +2, Optional: +1
 * Capped at 92 to leave room for genuine excellence
 */
export function calculateScoreFloor(
  previousScore: number,
  appliedRecommendations: Array<{ priority: RecommendationPriority }>
): number {
  if (appliedRecommendations.length === 0) return 0;
  
  let increment = 0;
  for (const rec of appliedRecommendations) {
    increment += PRIORITY_SCORE_WEIGHTS[rec.priority] || 2;
  }
  
  return Math.min(92, previousScore + increment);
}

/**
 * Get the tier label for a given score
 */
export function getScoreTier(score: number): string {
  if (score >= 95) return 'Exceptional';
  if (score >= 90) return 'Very Good';
  if (score >= 85) return 'Good';
  if (score >= 80) return 'Needs Work';
  if (score >= 70) return 'Significant Issues';
  return 'Major Revision';
}

/**
 * Get CSS color class for score display
 */
export function getScoreColorClass(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 80) return 'text-yellow-500';
  if (score >= 70) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get priority badge styling
 */
export function getPriorityBadgeClass(priority: RecommendationPriority): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'optional':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

/**
 * Get priority label for display
 */
export function getPriorityLabel(priority: RecommendationPriority): string {
  switch (priority) {
    case 'critical':
      return '🔴 Critical';
    case 'high':
      return '🟠 High';
    case 'medium':
      return '🟡 Medium';
    case 'optional':
      return '🔵 Optional';
    default:
      return priority;
  }
}

/**
 * Generate the criteria prompt section for AI analysis
 */
export function generateDirectorCriteriaPrompt(): string {
  return DIRECTOR_CRITERIA.map(c => 
    `${c.label} (${Math.round(c.weight * 100)}%): ${c.description}`
  ).join('\n');
}

export function generateAudienceCriteriaPrompt(): string {
  return AUDIENCE_CRITERIA.map(c => 
    `${c.label} (${Math.round(c.weight * 100)}%): ${c.description}`
  ).join('\n');
}
