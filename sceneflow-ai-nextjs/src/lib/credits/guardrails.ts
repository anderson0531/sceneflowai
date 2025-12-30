/**
 * SceneFlow AI - Profit Guardrails Configuration
 * 
 * This file defines the guardrails that protect profit margins and encourage upgrades.
 * All limits are designed to achieve 40-60% profit margins.
 * 
 * Guardrail Philosophy:
 * - Soft limits: Encourage upgrades via UI messaging
 * - Hard limits: Block actions that would break profit model
 * - Tier limits: Different capabilities per subscription level
 * 
 * @version 2.32
 * @see SCENEFLOW_AI_DESIGN_DOCUMENT.md Section 2.1.1
 */

import { SUBSCRIPTION_TIERS, GUARDRAILS as CREDIT_GUARDRAILS } from './creditCosts';

// =============================================================================
// DOWNLOAD GUARDRAILS
// =============================================================================

/**
 * Download limits per billing period
 * - Free downloads per period to reduce bandwidth costs
 * - Additional downloads require credit payment
 */
export const DOWNLOAD_LIMITS = {
  /** Number of free downloads per billing period */
  FREE_DOWNLOADS_PER_PERIOD: CREDIT_GUARDRAILS.DOWNLOAD_FREE_LIMIT,
  
  /** Credits charged per download after free limit */
  CREDITS_PER_DOWNLOAD: 10, // $0.10 per download
  
  /** Trial tier: unlimited downloads on their own content while active */
  TRIAL_DOWNLOADS_UNLIMITED: false,
  
  /** Download limits by tier (per billing period) */
  TIER_LIMITS: {
    trial: 3,
    starter: 10,
    pro: 50,
    studio: Infinity,
    enterprise: Infinity,
  } as const,
  
  /** File size limits for downloads (bytes) */
  MAX_DOWNLOAD_SIZE: {
    trial: 500 * 1024 * 1024,       // 500MB
    starter: 2 * 1024 * 1024 * 1024, // 2GB
    pro: 10 * 1024 * 1024 * 1024,    // 10GB
    studio: Infinity,
    enterprise: Infinity,
  } as const,
} as const;

// =============================================================================
// STORAGE GUARDRAILS
// =============================================================================

/**
 * Storage lifecycle and decay configuration
 * - Active storage: instant access, counts against quota
 * - Archived storage: GCS Nearline, reduced cost, restore fee
 * - Deleted: Removed from storage after retention period
 */
export const STORAGE_LIMITS = {
  /** Days before content is auto-archived (moved to cold storage) */
  DAYS_UNTIL_ARCHIVE: 30,
  
  /** Days in archive before permanent deletion */
  DAYS_UNTIL_DELETE: 90,
  
  /** Credits to restore from cold storage */
  RESTORE_CREDITS: 50, // $0.50 per restore
  
  /** Base storage per tier (bytes) */
  TIER_STORAGE: {
    trial: 1 * 1024 * 1024 * 1024,    // 1GB
    starter: 5 * 1024 * 1024 * 1024,  // 5GB
    pro: 25 * 1024 * 1024 * 1024,     // 25GB
    studio: 100 * 1024 * 1024 * 1024, // 100GB
    enterprise: Infinity,
  } as const,
  
  /** Storage warning thresholds */
  WARNING_THRESHOLDS: {
    /** Show warning at 80% usage */
    SOFT_WARNING: 0.8,
    /** Show urgent warning at 95% usage */
    HARD_WARNING: 0.95,
    /** Block new uploads at 100% */
    BLOCK_THRESHOLD: 1.0,
  } as const,
  
  /** File types and their archive eligibility */
  ARCHIVE_ELIGIBLE: ['video', 'audio', 'image'] as const,
  
  /** Files excluded from auto-archive */
  ARCHIVE_EXCLUDED: ['thumbnail', 'preview', 'metadata'] as const,
} as const;

// =============================================================================
// CONTEXT WINDOW GUARDRAILS
// =============================================================================

/**
 * AI context token limits by tier
 * - Protects against expensive long-context API calls
 * - Encourages efficient prompting
 */
export const CONTEXT_LIMITS = {
  /** Maximum tokens in AI context window by tier */
  MAX_TOKENS: {
    trial: CREDIT_GUARDRAILS.CONTEXT_TOKEN_LIMIT,      // 10,000
    starter: 15000,
    pro: 25000,
    studio: 50000,
    enterprise: 100000,
  } as const,
  
  /** Warning threshold (percentage of max) */
  WARNING_THRESHOLD: 0.8,
  
  /** Characters per token estimate */
  CHARS_PER_TOKEN: 4,
} as const;

// =============================================================================
// GENERATION RATE GUARDRAILS
// =============================================================================

/**
 * Rate limits for generation requests
 * - Prevents abuse and runaway costs
 * - Ensures fair resource allocation
 */
export const RATE_LIMITS = {
  /** Maximum concurrent video generations per tier */
  CONCURRENT_VIDEO_GENERATIONS: {
    trial: 1,
    starter: 2,
    pro: 5,
    studio: 10,
    enterprise: 25,
  } as const,
  
  /** Maximum video generations per hour per tier */
  VIDEO_GENERATIONS_PER_HOUR: {
    trial: 3,
    starter: 10,
    pro: 30,
    studio: 100,
    enterprise: Infinity,
  } as const,
  
  /** Maximum image generations per hour per tier */
  IMAGE_GENERATIONS_PER_HOUR: {
    trial: 10,
    starter: 50,
    pro: 150,
    studio: 500,
    enterprise: Infinity,
  } as const,
  
  /** Cooldown between video generation requests (seconds) */
  VIDEO_GENERATION_COOLDOWN: {
    trial: 60,
    starter: 30,
    pro: 10,
    studio: 5,
    enterprise: 0,
  } as const,
} as const;

// =============================================================================
// UPSCALE QUEUE GUARDRAILS
// =============================================================================

/**
 * Topaz upscaling priority queue by tier
 * - Higher tiers get priority processing
 * - Instant upscale available for premium payment
 */
export const UPSCALE_QUEUE = {
  /** Queue priority (lower = higher priority) */
  QUEUE_PRIORITY: {
    trial: 5,
    starter: 4,
    pro: 3,
    studio: 2,
    enterprise: 1,
  } as const,
  
  /** Instant upscale credit multiplier (skip queue) */
  INSTANT_MULTIPLIER: 1.5, // 50% premium for instant processing
  
  /** Maximum queue depth before rejecting new requests */
  MAX_QUEUE_DEPTH: 100,
  
  /** Estimated processing time per minute of video (seconds) */
  PROCESSING_TIME_PER_MINUTE: 180, // 3 minutes to upscale 1 minute of video
} as const;

// =============================================================================
// VOICE CLONE GUARDRAILS
// =============================================================================

/**
 * Voice cloning limits and costs
 * - Custom voice creation is expensive
 * - Limited slots per tier
 */
export const VOICE_LIMITS = {
  /** Maximum custom voice clones per tier */
  MAX_VOICE_CLONES: {
    trial: 0,     // No voice clones on trial
    starter: 1,
    pro: 5,
    studio: 25,
    enterprise: Infinity,
  } as const,
  
  /** Credits per voice clone creation */
  CLONE_CREATION_CREDITS: 500, // $5.00 per clone
  
  /** Minimum audio duration for clone training (seconds) */
  MIN_TRAINING_AUDIO: 30,
  
  /** Maximum audio duration for clone training (seconds) */
  MAX_TRAINING_AUDIO: 300,
} as const;

// =============================================================================
// PROJECT GUARDRAILS
// =============================================================================

/**
 * Project and scene limits by tier
 */
export const PROJECT_LIMITS = {
  /** Maximum active projects per tier */
  MAX_PROJECTS: {
    trial: 1,
    starter: 5,
    pro: 20,
    studio: 100,
    enterprise: Infinity,
  } as const,
  
  /** Maximum scenes per project per tier */
  MAX_SCENES_PER_PROJECT: {
    trial: 5,
    starter: 15,
    pro: 50,
    studio: 200,
    enterprise: Infinity,
  } as const,
  
  /** Maximum collaborators per project */
  MAX_COLLABORATORS: {
    trial: 0,
    starter: 2,
    pro: 10,
    studio: 50,
    enterprise: Infinity,
  } as const,
} as const;

// =============================================================================
// GUARDRAIL HELPER FUNCTIONS
// =============================================================================

export type SubscriptionTier = 'trial' | 'starter' | 'pro' | 'studio' | 'enterprise';

/**
 * Check if a user can perform a download
 */
export function canDownload(
  tier: SubscriptionTier,
  downloadsThisPeriod: number,
  availableCredits: number
): { allowed: boolean; reason?: string; creditCost: number } {
  const freeLimit = DOWNLOAD_LIMITS.TIER_LIMITS[tier];
  
  if (downloadsThisPeriod < freeLimit) {
    return { allowed: true, creditCost: 0 };
  }
  
  const creditCost = DOWNLOAD_LIMITS.CREDITS_PER_DOWNLOAD;
  if (availableCredits >= creditCost) {
    return { allowed: true, creditCost };
  }
  
  return {
    allowed: false,
    reason: `Download limit reached. ${tier === 'studio' || tier === 'enterprise' ? 'Contact support.' : 'Upgrade or purchase credits.'}`,
    creditCost,
  };
}

/**
 * Check if storage is available for new uploads
 */
export function canUpload(
  tier: SubscriptionTier,
  currentStorageBytes: number,
  addonStorageBytes: number,
  uploadSizeBytes: number
): { allowed: boolean; reason?: string; usagePercent: number } {
  const baseStorage = STORAGE_LIMITS.TIER_STORAGE[tier];
  const totalStorage = baseStorage === Infinity ? Infinity : baseStorage + addonStorageBytes;
  const newTotal = currentStorageBytes + uploadSizeBytes;
  
  if (totalStorage === Infinity) {
    return { allowed: true, usagePercent: 0 };
  }
  
  const usagePercent = newTotal / totalStorage;
  
  if (usagePercent > STORAGE_LIMITS.WARNING_THRESHOLDS.BLOCK_THRESHOLD) {
    return {
      allowed: false,
      reason: 'Storage limit reached. Delete old files, archive content, or purchase additional storage.',
      usagePercent,
    };
  }
  
  return { allowed: true, usagePercent };
}

/**
 * Check if context window is within limits
 */
export function canUseContext(
  tier: SubscriptionTier,
  tokenCount: number
): { allowed: boolean; reason?: string; percentUsed: number } {
  const limit = CONTEXT_LIMITS.MAX_TOKENS[tier];
  const percentUsed = tokenCount / limit;
  
  if (percentUsed > 1) {
    return {
      allowed: false,
      reason: `Context limit exceeded (${tokenCount.toLocaleString()} / ${limit.toLocaleString()} tokens). Reduce context or upgrade plan.`,
      percentUsed,
    };
  }
  
  return { allowed: true, percentUsed };
}

/**
 * Check rate limit for video generations
 */
export function canGenerateVideo(
  tier: SubscriptionTier,
  currentConcurrent: number,
  generationsThisHour: number
): { allowed: boolean; reason?: string; waitTimeSeconds?: number } {
  const concurrentLimit = RATE_LIMITS.CONCURRENT_VIDEO_GENERATIONS[tier];
  const hourlyLimit = RATE_LIMITS.VIDEO_GENERATIONS_PER_HOUR[tier];
  
  if (currentConcurrent >= concurrentLimit) {
    return {
      allowed: false,
      reason: `Maximum concurrent generations reached (${concurrentLimit}). Wait for current jobs to complete.`,
    };
  }
  
  if (generationsThisHour >= hourlyLimit && hourlyLimit !== Infinity) {
    return {
      allowed: false,
      reason: `Hourly generation limit reached (${hourlyLimit}/hour). Try again later or upgrade.`,
      waitTimeSeconds: 3600, // Wait until next hour
    };
  }
  
  return { allowed: true };
}

/**
 * Calculate upscale queue position and estimated wait time
 */
export function getUpscaleQueueInfo(
  tier: SubscriptionTier,
  queueDepth: number,
  videoMinutes: number
): { priority: number; estimatedWaitSeconds: number; instantCreditCost: number } {
  const priority = UPSCALE_QUEUE.QUEUE_PRIORITY[tier];
  const baseCredits = videoMinutes * 50; // 50 credits per minute base
  
  // Estimate wait time based on queue depth and priority
  const estimatedWaitSeconds = (queueDepth * UPSCALE_QUEUE.PROCESSING_TIME_PER_MINUTE * priority) / 5;
  
  return {
    priority,
    estimatedWaitSeconds,
    instantCreditCost: Math.ceil(baseCredits * UPSCALE_QUEUE.INSTANT_MULTIPLIER),
  };
}

/**
 * Check if user can create a voice clone
 */
export function canCreateVoiceClone(
  tier: SubscriptionTier,
  existingClones: number,
  availableCredits: number
): { allowed: boolean; reason?: string; creditCost: number } {
  const maxClones = VOICE_LIMITS.MAX_VOICE_CLONES[tier];
  const creditCost = VOICE_LIMITS.CLONE_CREATION_CREDITS;
  
  if (maxClones === 0) {
    return {
      allowed: false,
      reason: 'Voice cloning is not available on the Trial plan. Upgrade to Starter or higher.',
      creditCost,
    };
  }
  
  if (existingClones >= maxClones) {
    return {
      allowed: false,
      reason: `Voice clone limit reached (${maxClones}). Delete an existing clone or upgrade.`,
      creditCost,
    };
  }
  
  if (availableCredits < creditCost) {
    return {
      allowed: false,
      reason: `Insufficient credits for voice clone (${creditCost} required).`,
      creditCost,
    };
  }
  
  return { allowed: true, creditCost };
}

/**
 * Check project creation limits
 */
export function canCreateProject(
  tier: SubscriptionTier,
  existingProjects: number
): { allowed: boolean; reason?: string } {
  const limit = PROJECT_LIMITS.MAX_PROJECTS[tier];
  
  if (existingProjects >= limit) {
    return {
      allowed: false,
      reason: `Project limit reached (${limit}). Delete a project or upgrade.`,
    };
  }
  
  return { allowed: true };
}

/**
 * Get all tier limits in a summary object
 */
export function getTierLimitsSummary(tier: SubscriptionTier) {
  return {
    downloads: {
      freePerPeriod: DOWNLOAD_LIMITS.TIER_LIMITS[tier],
      maxFileSize: DOWNLOAD_LIMITS.MAX_DOWNLOAD_SIZE[tier],
    },
    storage: {
      baseBytes: STORAGE_LIMITS.TIER_STORAGE[tier],
      daysUntilArchive: STORAGE_LIMITS.DAYS_UNTIL_ARCHIVE,
      daysUntilDelete: STORAGE_LIMITS.DAYS_UNTIL_DELETE,
    },
    context: {
      maxTokens: CONTEXT_LIMITS.MAX_TOKENS[tier],
    },
    generation: {
      concurrentVideo: RATE_LIMITS.CONCURRENT_VIDEO_GENERATIONS[tier],
      videoPerHour: RATE_LIMITS.VIDEO_GENERATIONS_PER_HOUR[tier],
      imagePerHour: RATE_LIMITS.IMAGE_GENERATIONS_PER_HOUR[tier],
    },
    upscale: {
      queuePriority: UPSCALE_QUEUE.QUEUE_PRIORITY[tier],
    },
    voice: {
      maxClones: VOICE_LIMITS.MAX_VOICE_CLONES[tier],
    },
    projects: {
      maxProjects: PROJECT_LIMITS.MAX_PROJECTS[tier],
      maxScenesPerProject: PROJECT_LIMITS.MAX_SCENES_PER_PROJECT[tier],
      maxCollaborators: PROJECT_LIMITS.MAX_COLLABORATORS[tier],
    },
  };
}

/**
 * Get upgrade recommendation based on limit being hit
 */
export function getUpgradeRecommendation(
  currentTier: SubscriptionTier,
  limitType: 'download' | 'storage' | 'context' | 'generation' | 'voice' | 'project'
): { recommendedTier: SubscriptionTier; benefit: string } | null {
  const tierOrder: SubscriptionTier[] = ['trial', 'starter', 'pro', 'studio', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex >= tierOrder.length - 1) {
    return null; // Already at highest tier
  }
  
  const nextTier = tierOrder[currentIndex + 1];
  
  const benefits: Record<typeof limitType, Record<SubscriptionTier, string>> = {
    download: {
      trial: '10 free downloads/month with Starter',
      starter: '50 free downloads/month with Pro',
      pro: 'Unlimited downloads with Studio',
      studio: 'Contact us for Enterprise',
      enterprise: '',
    },
    storage: {
      trial: '5GB storage with Starter',
      starter: '25GB storage with Pro',
      pro: '100GB storage with Studio',
      studio: 'Unlimited storage with Enterprise',
      enterprise: '',
    },
    context: {
      trial: '15,000 token context with Starter',
      starter: '25,000 token context with Pro',
      pro: '50,000 token context with Studio',
      studio: '100,000 token context with Enterprise',
      enterprise: '',
    },
    generation: {
      trial: '10 video generations/hour with Starter',
      starter: '30 video generations/hour with Pro',
      pro: '100 video generations/hour with Studio',
      studio: 'Unlimited generations with Enterprise',
      enterprise: '',
    },
    voice: {
      trial: '1 voice clone with Starter',
      starter: '5 voice clones with Pro',
      pro: '25 voice clones with Studio',
      studio: 'Unlimited voice clones with Enterprise',
      enterprise: '',
    },
    project: {
      trial: '5 projects with Starter',
      starter: '20 projects with Pro',
      pro: '100 projects with Studio',
      studio: 'Unlimited projects with Enterprise',
      enterprise: '',
    },
  };
  
  return {
    recommendedTier: nextTier,
    benefit: benefits[limitType][currentTier],
  };
}
