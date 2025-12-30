/**
 * Moderation Sampling Configuration
 * 
 * Hybrid Smart Sampling strategy for Hive AI content moderation.
 * Balances cost efficiency with comprehensive coverage.
 * 
 * Strategy:
 * - 100% prompt pre-screening (text is nearly free)
 * - 100% user uploads (external content is highest risk)
 * - 100% first generation per scene (catches intent early)
 * - 100% export/download (final safety gate)
 * - Random sampling for subsequent generations (tier-based)
 * - Elevated sampling for risky keywords and violation history
 * 
 * @version 2.36
 * @see SCENEFLOW_AI_DESIGN_DOCUMENT.md
 */

import type { PlanTier } from '../credits/creditCosts';

// =============================================================================
// CONTENT TYPES
// =============================================================================

export type ModerationContentType = 
  | 'prompt'           // Text prompt before generation
  | 'image_upload'     // User-uploaded reference image
  | 'audio_upload'     // User-uploaded audio file
  | 'image_generated'  // AI-generated image
  | 'video_generated'  // AI-generated video clip
  | 'audio_generated'  // AI-generated voiceover
  | 'export_video'     // Final video export
  | 'export_audio';    // Final audio export

export type ModerationCheckReason =
  | 'always_check'          // Prompts, uploads, exports
  | 'first_in_scene'        // First generation in a scene
  | 'repeat_offender'       // User has 3+ violations
  | 'risk_keyword_match'    // Prompt contains risky keywords
  | 'violation_history'     // User has 1-2 violations
  | 'random_sample'         // Random sampling based on tier
  | 'deferred_to_export';   // Skipped, will check at export

export interface ModerationDecision {
  shouldCheck: boolean;
  reason: ModerationCheckReason;
  samplingRate: number;  // For analytics
}

// =============================================================================
// SAMPLING CONFIGURATION
// =============================================================================

export const MODERATION_SAMPLING = {
  /**
   * Content types that are ALWAYS checked (100%)
   */
  alwaysCheck: {
    prompts: true,              // Text is nearly free ($0.0005/1K chars)
    userUploads: true,          // External content is highest risk
    firstGenerationPerScene: true, // Catch intent early
    exportFinalRender: true,    // Last line of defense - MUST check
    usersWithViolations: true,  // Prior offenders get 100%
  },

  /**
   * Random sampling rates by tier
   * Higher sampling for trial (less trust), lower for enterprise (contractual trust)
   */
  randomSamplingRate: {
    trial: 0.50,      // 50% - new users, higher risk
    starter: 0.30,    // 30% - some trust established
    pro: 0.20,        // 20% - paying customers
    studio: 0.15,     // 15% - high-value customers
    enterprise: 0.10, // 10% - contractual trust + SLA
  } as Record<PlanTier, number>,

  /**
   * Keywords that trigger elevated sampling (80%)
   * These aren't always blocked, but increase scrutiny
   */
  riskKeywords: [
    // NSFW / Sexual
    'nude', 'naked', 'explicit', 'sexual', 'erotic', 'porn',
    'undress', 'revealing', 'provocative', 'seductive',
    // Violence
    'violence', 'violent', 'blood', 'gore', 'weapon', 'gun',
    'kill', 'murder', 'attack', 'assault', 'torture', 'abuse',
    'stab', 'shoot', 'execute', 'decapitate',
    // Minors (always high alert)
    'child', 'minor', 'teen', 'teenager', 'young girl', 'young boy',
    'underage', 'juvenile', 'kid',
    // Hate / Discrimination
    'hate', 'racist', 'nazi', 'supremacist', 'slur',
    // Drugs / Illegal
    'drug', 'cocaine', 'heroin', 'meth', 'overdose',
    // Self-harm
    'suicide', 'self-harm', 'cutting',
    // Fraud (especially for voice cloning)
    'scam', 'fraud', 'impersonate', 'steal identity',
  ],

  /**
   * Sampling rate when risk keywords detected
   */
  riskKeywordSamplingBoost: 0.80, // 80% sampling for risky prompts

  /**
   * Sampling boost based on user violation history
   */
  violationSamplingBoost: {
    1: 0.50,  // 1 prior violation → 50% sampling
    2: 0.75,  // 2 prior violations → 75% sampling
    3: 1.00,  // 3+ violations → 100% sampling (always check)
  } as Record<number, number>,

  /**
   * Violation thresholds
   */
  violations: {
    /** Number of violations before account suspension */
    suspensionThreshold: 5,
    /** Suspension duration in hours */
    suspensionDurationHours: 24,
    /** Window for counting recent violations (hours) */
    recentWindowHours: 24,
    /** Violations in window to trigger immediate review */
    immediateReviewThreshold: 3,
  },
} as const;

// =============================================================================
// DECISION FUNCTIONS
// =============================================================================

/**
 * Determine if a generation should be moderated
 * 
 * Decision tree:
 * 1. Always check prompts, uploads, exports
 * 2. Always check first generation per scene
 * 3. Always check users with 3+ violations
 * 4. Boost sampling for risky keywords
 * 5. Boost sampling based on violation history
 * 6. Random sample based on tier
 */
export function shouldModerateGeneration(params: {
  contentType: ModerationContentType;
  tier: PlanTier;
  prompt?: string;
  isFirstInScene: boolean;
  priorViolations: number;
  sceneId?: string;
  segmentIndex?: number;
}): ModerationDecision {
  const { contentType, tier, prompt, isFirstInScene, priorViolations } = params;

  // 1. Always check prompts, uploads, exports
  if (
    contentType === 'prompt' ||
    contentType === 'image_upload' ||
    contentType === 'audio_upload' ||
    contentType === 'export_video' ||
    contentType === 'export_audio'
  ) {
    return {
      shouldCheck: true,
      reason: 'always_check',
      samplingRate: 1.0,
    };
  }

  // 2. Always check first generation per scene
  if (isFirstInScene) {
    return {
      shouldCheck: true,
      reason: 'first_in_scene',
      samplingRate: 1.0,
    };
  }

  // 3. Always check users with 3+ violations
  if (priorViolations >= 3) {
    return {
      shouldCheck: true,
      reason: 'repeat_offender',
      samplingRate: 1.0,
    };
  }

  // 4. Check for risky keywords in prompt
  if (prompt) {
    const hasRiskKeywords = checkForRiskKeywords(prompt);
    if (hasRiskKeywords) {
      const shouldCheck = Math.random() < MODERATION_SAMPLING.riskKeywordSamplingBoost;
      if (shouldCheck) {
        return {
          shouldCheck: true,
          reason: 'risk_keyword_match',
          samplingRate: MODERATION_SAMPLING.riskKeywordSamplingBoost,
        };
      }
    }
  }

  // 5. Boost sampling based on violation history
  if (priorViolations > 0 && priorViolations < 3) {
    const boostRate = MODERATION_SAMPLING.violationSamplingBoost[
      Math.min(priorViolations, 2) as 1 | 2
    ];
    if (Math.random() < boostRate) {
      return {
        shouldCheck: true,
        reason: 'violation_history',
        samplingRate: boostRate,
      };
    }
  }

  // 6. Random sampling based on tier
  const tierRate = MODERATION_SAMPLING.randomSamplingRate[tier] ?? 0.25;
  if (Math.random() < tierRate) {
    return {
      shouldCheck: true,
      reason: 'random_sample',
      samplingRate: tierRate,
    };
  }

  // Default: defer to export check
  return {
    shouldCheck: false,
    reason: 'deferred_to_export',
    samplingRate: 0,
  };
}

/**
 * Check if prompt contains risky keywords
 */
export function checkForRiskKeywords(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  return MODERATION_SAMPLING.riskKeywords.some(keyword => 
    lowerPrompt.includes(keyword.toLowerCase())
  );
}

/**
 * Get matched risk keywords for logging/analysis
 */
export function getMatchedRiskKeywords(prompt: string): string[] {
  const lowerPrompt = prompt.toLowerCase();
  return MODERATION_SAMPLING.riskKeywords.filter(keyword =>
    lowerPrompt.includes(keyword.toLowerCase())
  );
}

/**
 * Check if user should be suspended based on violation count
 */
export function shouldSuspendUser(violationCount: number): boolean {
  return violationCount >= MODERATION_SAMPLING.violations.suspensionThreshold;
}

/**
 * Get suspension end time
 */
export function getSuspensionEndTime(): Date {
  const now = new Date();
  now.setHours(now.getHours() + MODERATION_SAMPLING.violations.suspensionDurationHours);
  return now;
}

// =============================================================================
// REFUND POLICY
// =============================================================================

export const MODERATION_REFUND_POLICY = {
  /**
   * Auto-refund credits on first offense when content is blocked post-generation
   * This minimizes unfunded generations the platform has to absorb
   */
  autoRefundFirstOffense: true,

  /**
   * Require manual review for repeat offenders (2+ violations)
   * They've already gotten one freebie
   */
  manualReviewThreshold: 2,

  /**
   * Refund percentage based on violation history
   * First offense: 100% refund (absorb cost to maintain goodwill)
   * Second offense: 50% refund (partial responsibility)
   * Third+: 0% refund (user responsibility, clear pattern)
   */
  refundPercentage: {
    0: 1.00,  // First offense: 100% refund
    1: 0.50,  // Second offense: 50% refund
    2: 0.00,  // Third+ offense: no refund
  } as Record<number, number>,

  /**
   * Get refund percentage for a user
   */
  getRefundPercentage(priorViolations: number): number {
    if (priorViolations === 0) return 1.00;
    if (priorViolations === 1) return 0.50;
    return 0.00;
  },
} as const;

// =============================================================================
// FALLBACK POLICY
// =============================================================================

export const MODERATION_FALLBACK = {
  /**
   * When Hive AI is unavailable, what should we do?
   * Options: 'block_all' | 'openai_only' | 'allow_with_logging'
   * 
   * Recommended: 'openai_only' - degrade gracefully but maintain some protection
   */
  fallbackBehavior: 'openai_only' as const,

  /**
   * Elevated sampling when in fallback mode
   * Since we have reduced protection, sample more frequently
   */
  fallbackSamplingMultiplier: 2.0,

  /**
   * Alert ops team when in fallback mode
   */
  alertOnFallback: true,

  /**
   * Maximum duration in fallback before blocking all (minutes)
   * If Hive is down for >30 min, something is wrong
   */
  maxFallbackDurationMinutes: 30,
} as const;

// =============================================================================
// ADMIN REVIEW QUEUE
// =============================================================================

export const ADMIN_REVIEW = {
  /**
   * Confidence thresholds for Hive AI responses
   * 
   * HIGH (>0.9): Auto-delete, no review needed
   * MEDIUM (0.7-0.9): Flag for admin review, hold content
   * LOW (<0.7): Allow with logging for later audit
   */
  thresholds: {
    autoDelete: 0.90,    // Very confident violation
    adminReview: 0.70,   // Borderline, needs human review
    allowWithLog: 0.00,  // Below this = allow
  },

  /**
   * Categories that bypass normal thresholds (always block if detected)
   */
  alwaysBlockCategories: [
    'child_exploitation',
    'csam',
    'terrorism',
    'self_harm_intent',
    'violence_extreme',
  ],

  /**
   * Review SLA (hours to review flagged content)
   */
  reviewSlaHours: 24,

  /**
   * Auto-release if not reviewed within SLA?
   * false = keep held until reviewed
   */
  autoReleaseAfterSla: false,
} as const;

export default {
  MODERATION_SAMPLING,
  shouldModerateGeneration,
  checkForRiskKeywords,
  getMatchedRiskKeywords,
  shouldSuspendUser,
  getSuspensionEndTime,
  MODERATION_REFUND_POLICY,
  MODERATION_FALLBACK,
  ADMIN_REVIEW,
};
