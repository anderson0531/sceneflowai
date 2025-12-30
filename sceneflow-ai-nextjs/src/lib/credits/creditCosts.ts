/**
 * Credit Costs Configuration
 * 
 * SceneFlow AI SceneCredit Currency System
 * 
 * Exchange Rate: $1.00 USD = 100 Credits
 * Credit Value: 1 Credit = $0.01 (1 cent)
 * 
 * All pricing targets 40-60% profit margin based on provider costs.
 * 
 * Provider Cost Reference (2025):
 * - Imagen 4: $0.04/image
 * - Veo 3.1 Fast (1080p): ~$0.75/8s video
 * - Veo 3.1 Quality (4K): ~$1.30/8s video
 * - Topaz Upscale: ~$0.20/min
 * - ElevenLabs TTS: ~$0.35/1k chars
 * - FFMPEG/GCP Render: ~$0.05/render
 */

// =============================================================================
// SCENECREDIT CURRENCY
// =============================================================================

/**
 * SceneCredit exchange rate: $1.00 USD = 100 Credits
 * Makes pricing intuitive: 150 credits = $1.50
 */
export const CREDIT_EXCHANGE_RATE = 100;

/**
 * Base credit value in USD
 * 1 credit = $0.01 (1 cent)
 */
export const CREDIT_VALUE_USD = 0.01;

/**
 * Convert USD to credits
 */
export function usdToCredits(usd: number): number {
  return Math.ceil(usd * CREDIT_EXCHANGE_RATE);
}

/**
 * Convert credits to USD
 */
export function creditsToUsd(credits: number): number {
  return credits / CREDIT_EXCHANGE_RATE;
}

// =============================================================================
// PROFIT GUARDRAILS
// =============================================================================

/**
 * Minimum credits per 8-second video generation
 * Never discount video below this to maintain profitability
 * 120 credits = $1.20 (60% margin floor vs ~$0.75 provider cost)
 */
export const VIDEO_GUARDRAIL_MIN_CREDITS_PER_8S = 120;

// =============================================================================
// IMAGE GENERATION
// =============================================================================

export const IMAGE_CREDITS = {
  /** Imagen 4 - $0.04/image → 10 credits ($0.10, 60% margin) */
  IMAGEN_3: 10,
  IMAGEN_4: 10,
  
  /** Gemini image edit - minimal cost */
  GEMINI_EDIT: 5,
  
  /** Scene reference / backdrop generation */
  SCENE_REFERENCE: 10,
  
  /** Frame generation (start/end frames) */
  FRAME_GENERATION: 10,
} as const;

// =============================================================================
// VIDEO GENERATION
// =============================================================================

export const VIDEO_CREDITS = {
  /** 
   * Veo 3.1 Fast (1080p) - ~$0.75/8s → 150 credits ($1.50, ~50% margin)
   * Per 8-second clip
   */
  VEO_FAST: 150,
  
  /** 
   * Veo 3.1 Quality (4K) - ~$1.30/8s → 250 credits ($2.50, ~48% margin)
   * Per 8-second clip. Pro/Studio only.
   */
  VEO_QUALITY_4K: 250,
  
  /** 
   * Fast revision of existing scene (cheaper, uses caching)
   */
  VEO_REVISION: 100,
  
  /** 
   * Topaz AI Upscale - ~$0.20/min → 50 credits/min ($0.50, ~60% margin)
   * Per minute of video upscaled
   */
  TOPAZ_UPSCALE_PER_MIN: 50,
  
  /**
   * Instant upscale premium (2x normal cost)
   * Skips queue for immediate processing
   */
  TOPAZ_UPSCALE_INSTANT_MULTIPLIER: 2,
} as const;

// =============================================================================
// AUDIO / VOICEOVER
// =============================================================================

export const AUDIO_CREDITS = {
  /** 
   * ElevenLabs TTS - ~$0.35/1k chars → 80 credits/1k chars ($0.80, ~56% margin)
   */
  ELEVENLABS_PER_1K_CHARS: 80,
  
  /** ElevenLabs sound effects */
  ELEVENLABS_SFX: 15,
  
  /** ElevenLabs music generation */
  ELEVENLABS_MUSIC: 25,
  
  /** Voice preview (cheaper preview before full generation) */
  VOICE_PREVIEW: 5,
  
  /**
   * Voice clone setup (one-time per voice)
   * Covers processing and storage of voice model
   */
  VOICE_CLONE_SETUP: 500,

  /** 
   * Dialogue per line (~80 chars average per line)
   * Estimated at 80 chars * 80 credits/1k chars = ~6.4, rounded to 5 credits
   */
  DIALOGUE_PER_LINE: 5,

  /**
   * Sound effect generation (same as ELEVENLABS_SFX)
   */
  SOUND_EFFECT: 15,

  /**
   * Music track generation (same as ELEVENLABS_MUSIC)
   */
  MUSIC_TRACK: 25,

  /**
   * TTS per minute (~4000 chars per minute at 80 credits/1k)
   * 4 * 80 = 320 credits per minute
   */
  TTS_PER_MINUTE: 320,
} as const;

// =============================================================================
// TEXT GENERATION / INTELLIGENCE
// =============================================================================

export const TEXT_CREDITS = {
  /** Gemini 2.5 Flash - minimal cost (smart request) */
  GEMINI_FLASH: 5,
  
  /** Gemini 2.5 Pro - script analysis */
  GEMINI_PRO: 10,
  
  /** Story/treatment generation */
  STORY_GENERATION: 25,
  
  /** Script generation per scene */
  SCRIPT_PER_SCENE: 5,
  
  /**
   * Context window overage (exceeding 10k tokens)
   * Pro Analysis charge for large requests
   */
  CONTEXT_OVERAGE: 50,
} as const;

/**
 * Context window limit in tokens
 * Requests exceeding this trigger overage charge
 */
export const CONTEXT_TOKEN_LIMIT = 10000;

// =============================================================================
// RENDERING / EXPORT
// =============================================================================

export const RENDER_CREDITS = {
  /** MP4 Export - $0.05/render → 10 credits */
  MP4_EXPORT: 10,
  
  /** Ken Burns animatic (minimal cost) */
  ANIMATIC: 5,
  
  /** Per minute of final render */
  PER_MINUTE: 10,
} as const;

// =============================================================================
// STORAGE
// =============================================================================

export const STORAGE_CREDITS = {
  /** Restore archived file from GCS Coldline storage */
  ARCHIVE_RESTORE: 50,
  
  /** Download overage (after free limit exceeded) */
  DOWNLOAD_OVERAGE: 5,
} as const;

/**
 * Storage policy constants
 */
export const STORAGE_POLICY = {
  /** Free retention period before auto-archive */
  FREE_RETENTION_DAYS: 30,
  
  /** Free downloads per file before overage charge */
  FREE_DOWNLOADS_PER_FILE: 3,
  
  /** Cold storage cost per GB per month (for internal tracking) */
  COLD_STORAGE_COST_PER_GB_MONTH: 0.01,
} as const;

// =============================================================================
// STORAGE ADD-ONS
// =============================================================================

export const STORAGE_ADDONS = {
  EXTRA_25GB: {
    name: 'Extra 25 GB',
    gb: 25,
    priceMonthly: 5,
  },
  EXTRA_100GB: {
    name: 'Extra 100 GB',
    gb: 100,
    priceMonthly: 15,
  },
  EXTRA_500GB: {
    name: 'Extra 500 GB',
    gb: 500,
    priceMonthly: 50,
  },
} as const;

export type StorageAddonType = keyof typeof STORAGE_ADDONS;

// =============================================================================
// QUALITY TIERS
// =============================================================================

export type VideoQuality = 'fast' | 'max';

export function getVideoCredits(quality: VideoQuality): number {
  return quality === 'max' ? VIDEO_CREDITS.VEO_QUALITY_4K : VIDEO_CREDITS.VEO_FAST;
}

// =============================================================================
// PLAN RESTRICTIONS
// =============================================================================

export type PlanTier = 'trial' | 'starter' | 'pro' | 'studio' | 'enterprise';

/**
 * Plans that allow Veo 3.1 Quality (4K)
 */
export const VEO_QUALITY_4K_ALLOWED_PLANS: PlanTier[] = ['pro', 'studio', 'enterprise'];

/**
 * Check if a plan allows Veo Quality (4K)
 * @deprecated Use canUseVeoQuality4K instead
 */
export function canUseVeoMax(plan: PlanTier): boolean {
  return VEO_QUALITY_4K_ALLOWED_PLANS.includes(plan);
}

/**
 * Check if a plan allows Veo Quality (4K)
 */
export function canUseVeoQuality4K(plan: PlanTier): boolean {
  return VEO_QUALITY_4K_ALLOWED_PLANS.includes(plan);
}

/**
 * Get default video quality for a plan
 * Pro defaults to 'fast' with option to upgrade
 * Studio can default to 'max'
 */
export function getDefaultVideoQuality(plan: PlanTier): VideoQuality {
  return plan === 'studio' || plan === 'enterprise' ? 'max' : 'fast';
}

/**
 * Voice clone slot limits by plan
 */
export const VOICE_CLONE_LIMITS: Record<PlanTier, number> = {
  trial: 0,
  starter: 0,
  pro: 3,
  studio: 10,
  enterprise: 999,
};

// =============================================================================
// SUBSCRIPTION PLANS
// =============================================================================

export const SUBSCRIPTION_PLANS = {
  trial: {
    name: 'Trial',
    price: 4.99,
    credits: 1500,
    isOneTime: true,
    storageGb: 10,
    storage: '10 GB',
    veoMaxAllowed: false,
    collaborationSeats: 0,
    voiceCloneSlots: 0,
    maxProjects: 3,
    breakageTarget: 0.30, // 30% expected unused
  },
  starter: {
    name: 'Starter',
    price: 49,
    credits: 4500,
    isOneTime: false,
    storageGb: 25,
    storage: '25 GB',
    veoMaxAllowed: false,
    collaborationSeats: 0,
    voiceCloneSlots: 0,
    maxProjects: 10,
    breakageTarget: 0.25, // 25% expected unused
  },
  pro: {
    name: 'Pro',
    price: 149,
    credits: 15000,
    isOneTime: false,
    storageGb: 500,
    storage: '500 GB',
    veoMaxAllowed: true,
    collaborationSeats: 3,
    voiceCloneSlots: 3,
    maxProjects: null, // Unlimited
    breakageTarget: 0.20, // 20% expected unused
  },
  studio: {
    name: 'Studio',
    price: 599,
    credits: 75000,
    isOneTime: false,
    storageGb: 2000,
    storage: '2 TB',
    veoMaxAllowed: true,
    collaborationSeats: 10,
    voiceCloneSlots: 10,
    maxProjects: null,
    breakageTarget: 0.15, // 15% expected unused
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // Custom pricing
    credits: 200000,
    isOneTime: false,
    storageGb: 5000,
    storage: '5 TB+',
    veoMaxAllowed: true,
    collaborationSeats: 50,
    voiceCloneSlots: 999,
    maxProjects: null,
    breakageTarget: 0.10, // 10% expected unused
  },
} as const;

// =============================================================================
// TOP-UP PACKS
// =============================================================================

export const TOP_UP_PACKS = {
  quick_fix: {
    name: 'Quick Fix',
    price: 25,
    credits: 2000,
    costPerCredit: 0.0125,
    profitMargin: 0.40,
    dailyLimit: 3, // Max purchases per day
    description: '1-2 Quality (4K) finals or ~12 Fast drafts',
  },
  scene_pack: {
    name: 'Scene Pack',
    price: 60,
    credits: 6000,
    costPerCredit: 0.01,
    profitMargin: 0.35,
    dailyLimit: 5,
    description: '~40 Veo Fast scenes + revisions',
  },
  feature_boost: {
    name: 'Feature Boost',
    price: 180,
    credits: 20000,
    costPerCredit: 0.009,
    profitMargin: 0.30,
    dailyLimit: 10,
    description: 'Complete a major movie sequence',
  },
} as const;

export type TopUpPackType = keyof typeof TOP_UP_PACKS;

// =============================================================================
// COST ESTIMATION
// =============================================================================

export interface ProjectCostEstimate {
  images: number;
  videoFast: number;
  videoMax: number;
  voiceover: number;
  render: number;
  upscale: number;
  totalCredits: number;
}

/**
 * Estimate total credits needed for a project
 */
export function estimateProjectCredits(params: {
  sceneCount: number;
  segmentsPerScene?: number;
  takesPerSegment?: number;
  imagesPerScene?: number;
  imageRetakes?: number;
  videoQuality?: VideoQuality;
  hasVoiceover?: boolean;
  averageCharsPerScene?: number;
  upscaleMinutes?: number;
}): ProjectCostEstimate {
  const {
    sceneCount,
    segmentsPerScene = 3,
    takesPerSegment = 2,
    imagesPerScene = 3,
    imageRetakes = 1,
    videoQuality = 'fast',
    hasVoiceover = true,
    averageCharsPerScene = 500,
    upscaleMinutes = 0,
  } = params;

  // Images: frames per scene + retakes
  const totalImages = sceneCount * (imagesPerScene + imageRetakes);
  const images = totalImages * IMAGE_CREDITS.IMAGEN_4;
  
  // Video: segments × takes × cost per quality
  const totalGenerations = sceneCount * segmentsPerScene * takesPerSegment;
  const videoCredits = getVideoCredits(videoQuality);
  const videoFast = videoQuality === 'fast' ? totalGenerations * videoCredits : 0;
  const videoMax = videoQuality === 'max' ? totalGenerations * videoCredits : 0;
  
  // Voiceover
  const totalChars = sceneCount * averageCharsPerScene;
  const voiceover = hasVoiceover 
    ? Math.ceil(totalChars / 1000) * AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS 
    : 0;
  
  // Upscale
  const upscale = upscaleMinutes * VIDEO_CREDITS.TOPAZ_UPSCALE_PER_MIN;
  
  // Render: estimate based on scene count (~30s per scene average)
  const estimatedMinutes = Math.ceil(sceneCount * 0.5);
  const render = estimatedMinutes * RENDER_CREDITS.PER_MINUTE + RENDER_CREDITS.MP4_EXPORT;

  return {
    images,
    videoFast,
    videoMax,
    voiceover,
    render,
    upscale,
    totalCredits: images + videoFast + videoMax + voiceover + render + upscale,
  };
}

// =============================================================================
// PROVIDER COST TRACKING (for margin analysis)
// =============================================================================

export const PROVIDER_COSTS_USD = {
  imagen_4: 0.04,
  veo_fast_8s: 0.75,
  veo_quality_4k_8s: 1.30,
  topaz_upscale_min: 0.20,
  elevenlabs_1k_chars: 0.35,
  ffmpeg_render: 0.05,
} as const;

// =============================================================================
// PLATFORM OVERHEAD COSTS (not charged to users, tracked for margin analysis)
// =============================================================================

/**
 * Hive AI Moderation Costs (Platform Overhead)
 * 
 * These costs are absorbed into our margin, not charged separately to users.
 * Rationale: Moderation is a trust/safety requirement, not a feature users "buy"
 * 
 * Hybrid Smart Sampling Strategy reduces costs while maintaining 95%+ coverage:
 * - 100% prompt pre-screening (text is nearly free)
 * - 100% user uploads (external content is highest risk)
 * - 100% first generation per scene (catches intent early)
 * - 100% export/download (final safety gate)
 * - 25% random sampling for subsequent generations (tier-based)
 * 
 * @see src/lib/moderation/moderationSampling.ts
 */
export const PLATFORM_OVERHEAD_COSTS = {
  moderation: {
    /** Text moderation per 1K characters (prompts) - $0.0005 */
    HIVE_TEXT_PER_1K_CHARS: 0.0005,
    
    /** Image moderation per image - $0.001 */
    HIVE_IMAGE_PER_UNIT: 0.001,
    
    /** Video moderation per minute - $0.03 */
    HIVE_VIDEO_PER_MINUTE: 0.03,
    
    /** Audio moderation per minute - $0.02 */
    HIVE_AUDIO_PER_MINUTE: 0.02,
  },
  
  /** Payment processor fees (Paddle MoR) */
  payment: {
    /** Paddle fee percentage */
    PADDLE_FEE_PERCENT: 0.05, // 5% of transaction
    /** Paddle fixed fee per transaction */
    PADDLE_FIXED_FEE: 0.50,
  },
  
  /** Infrastructure overhead */
  infrastructure: {
    /** Vercel hosting per request (estimate) */
    VERCEL_PER_REQUEST: 0.0001,
    /** GCS storage per GB-month */
    GCS_STORAGE_PER_GB_MONTH: 0.02,
    /** Vercel Blob storage per GB-month */
    VERCEL_BLOB_PER_GB_MONTH: 0.03,
  },
} as const;

/**
 * Moderation sampling rates by content type
 * Used for cost estimation
 */
export const MODERATION_SAMPLING_RATES = {
  prompts: 1.0,           // 100% - always check
  userUploads: 1.0,       // 100% - always check
  firstPerScene: 1.0,     // 100% - always check first
  randomVideo: 0.25,      // 25% of non-first videos
  randomImage: 0.25,      // 25% of non-first images
  voiceover: 0.30,        // 30% of voiceovers
  exports: 1.0,           // 100% - always check
} as const;

/**
 * Calculate moderation cost for a project (platform overhead)
 * Used for internal cost tracking and margin analysis
 */
export function calculateModerationCost(params: {
  scenes: number;
  segmentsPerScene: number;
  takesPerSegment: number;
  framesPerScene: number;
  voiceoverMinutes: number;
  uploadedImages: number;
  exportMinutes: number;
}): {
  promptCost: number;
  imageCost: number;
  videoCost: number;
  audioCost: number;
  exportCost: number;
  totalCost: number;
} {
  const {
    scenes,
    segmentsPerScene,
    takesPerSegment,
    framesPerScene,
    voiceoverMinutes,
    uploadedImages,
    exportMinutes,
  } = params;
  
  const totalSegments = scenes * segmentsPerScene * takesPerSegment;
  const totalFrames = scenes * framesPerScene;
  const firstPerScene = scenes * segmentsPerScene; // First take per segment per scene
  
  const costs = PLATFORM_OVERHEAD_COSTS.moderation;
  const rates = MODERATION_SAMPLING_RATES;
  
  // Prompts (100% checked, ~100 chars each)
  const promptCost = (totalSegments * 100 / 1000) * costs.HIVE_TEXT_PER_1K_CHARS;
  
  // Video - first per scene (100%) + random sample (25% of remaining)
  const firstVideoCost = (firstPerScene * 8 / 60) * costs.HIVE_VIDEO_PER_MINUTE;
  const remainingSegments = totalSegments - firstPerScene;
  const sampledVideoCost = (remainingSegments * rates.randomVideo * 8 / 60) * costs.HIVE_VIDEO_PER_MINUTE;
  const videoCost = firstVideoCost + sampledVideoCost;
  
  // Images - first per scene (100%) + random sample (25% of remaining) + uploads (100%)
  const firstImageCost = scenes * costs.HIVE_IMAGE_PER_UNIT;
  const remainingFrames = totalFrames - scenes;
  const sampledImageCost = remainingFrames * rates.randomImage * costs.HIVE_IMAGE_PER_UNIT;
  const uploadCost = uploadedImages * costs.HIVE_IMAGE_PER_UNIT;
  const imageCost = firstImageCost + sampledImageCost + uploadCost;
  
  // Audio - voiceover sampling (30%)
  const audioCost = voiceoverMinutes * rates.voiceover * costs.HIVE_AUDIO_PER_MINUTE;
  
  // Export (100% - video + audio)
  const exportVideoCost = exportMinutes * costs.HIVE_VIDEO_PER_MINUTE;
  const exportAudioCost = exportMinutes * costs.HIVE_AUDIO_PER_MINUTE;
  const exportCost = exportVideoCost + exportAudioCost;
  
  return {
    promptCost,
    imageCost,
    videoCost,
    audioCost,
    exportCost,
    totalCost: promptCost + imageCost + videoCost + audioCost + exportCost,
  };
}

/**
 * Annual moderation budget by year (for monitoring)
 */
export const MODERATION_ANNUAL_BUDGET = {
  year1: 4000,   // $4K buffer over $3.4K estimate
  year2: 15000,  // Scales with 3.5x volume
  year3: 40000,  // Scales with 10x volume
} as const;

/**
 * Calculate actual margin for a credit charge
 */
export function calculateMargin(operation: keyof typeof PROVIDER_COSTS_USD, creditsCharged: number): number {
  const providerCost = PROVIDER_COSTS_USD[operation];
  const revenue = creditsCharged * CREDIT_VALUE_USD;
  return revenue > 0 ? (revenue - providerCost) / revenue : 0;
}

// =============================================================================
// CONSOLIDATED CREDIT COSTS (for easy access)
// =============================================================================

export const CREDIT_COSTS = {
  IMAGE_GENERATION: IMAGE_CREDITS.IMAGEN_4,
  VEO_FAST: VIDEO_CREDITS.VEO_FAST,
  VEO_QUALITY_4K: VIDEO_CREDITS.VEO_QUALITY_4K,
  TOPAZ_UPSCALE: VIDEO_CREDITS.TOPAZ_UPSCALE_PER_MIN,
  ELEVENLABS: AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS,
  VOICE_CLONE: AUDIO_CREDITS.VOICE_CLONE_SETUP,
  RENDER: RENDER_CREDITS.MP4_EXPORT,
  ARCHIVE_RESTORE: STORAGE_CREDITS.ARCHIVE_RESTORE,
} as const;

export type CreditOperation = keyof typeof CREDIT_COSTS;

/**
 * Get credit cost for an operation
 */
export function getCreditCost(operation: CreditOperation): number {
  return CREDIT_COSTS[operation];
}

/**
 * Get Veo credit cost based on quality
 */
export function getVeoCost(quality: VideoQuality): number {
  return quality === 'max' ? CREDIT_COSTS.VEO_QUALITY_4K : CREDIT_COSTS.VEO_FAST;
}

/**
 * Check if a plan allows Veo Quality (4K)
 */
export function isVeoQuality4KAllowed(plan: PlanTier): boolean {
  return canUseVeoQuality4K(plan);
}

// =============================================================================
// PRODUCTION STRATEGY HELPERS
// =============================================================================

export type ProductionStrategy = 'fast_only' | 'fast_plus_upscale' | 'quality_native';

export interface StrategyInfo {
  name: string;
  description: string;
  qualityLevel: string;
  costMultiplier: number;
  recommended: boolean;
}

export const PRODUCTION_STRATEGIES: Record<ProductionStrategy, StrategyInfo> = {
  fast_only: {
    name: 'Fast Only',
    description: 'Veo Fast (1080p) for all clips',
    qualityLevel: '1080p',
    costMultiplier: 1.0,
    recommended: false,
  },
  fast_plus_upscale: {
    name: 'Fast + Topaz Upscale',
    description: 'Veo Fast (1080p) + AI upscale to 4K',
    qualityLevel: '4K (upscaled)',
    costMultiplier: 1.33, // ~33% more than Fast only
    recommended: true, // Best value for 4K output
  },
  quality_native: {
    name: 'Quality (4K) Native',
    description: 'Veo Quality (4K) for all clips',
    qualityLevel: '4K native',
    costMultiplier: 1.67, // ~67% more than Fast only
    recommended: false,
  },
};

/**
 * Get recommended production strategy based on budget and quality needs
 */
export function getRecommendedStrategy(
  budget: number,
  requiresNative4K: boolean = false
): ProductionStrategy {
  if (requiresNative4K) {
    return 'quality_native';
  }
  // Default recommendation: Fast + Upscale for best value
  return 'fast_plus_upscale';
}

// =============================================================================
// MISSING EXPORTS (STUBS FOR v2.32 COMPATIBILITY)
// =============================================================================

export const UPSCALE_CREDITS = {
  PER_MINUTE: 20, // Topaz AI upscale cost per minute
} as const;

export const SUBSCRIPTION_TIERS = {
  TRIAL: { credits: 1500, price: 4.99 },
  STARTER: { credits: 4500, price: 49 },
  PRO: { credits: 15000, price: 149 },
  STUDIO: { credits: 75000, price: 599 },
} as const;

export const TOPUP_PACKS = [
  { credits: 1000, price: 10 },
  { credits: 5000, price: 45 },
  { credits: 15000, price: 120 },
] as const;

export const GUARDRAILS = {
  DOWNLOAD_FREE_LIMIT: 3,
  STORAGE_DECAY_DAYS: 30,
  CONTEXT_TOKEN_LIMIT: 10000,
} as const;

export function calculateProjectCost(params: any): number {
  // Stub - returns 0 for now
  return 0;
}

export function estimateStorageSize(params: any): number {
  // Stub - returns 0 for now
  return 0;
}
