/**
 * Credit Costs Configuration
 * 
 * Defines the credit costs for all AI operations in SceneFlow AI.
 * Based on real-world provider costs with ~30% gross margin built in.
 * 
 * Provider Cost Reference (2025):
 * - Imagen 3.0: $0.04/image
 * - Veo 3.1 Fast: $1.20/8s video
 * - Veo 3.1 Max: $6.00/8s video
 * - ElevenLabs: ~$0.20/1k chars
 * - FFMPEG/GCP Render: ~$0.05/render
 */

// =============================================================================
// CREDIT VALUE
// =============================================================================

/**
 * Base credit value in USD
 * Studio Plan ($599 / 75,000 credits) = ~$0.008/credit
 * Top-Up average (~$0.01/credit)
 */
export const CREDIT_VALUE_USD = 0.008;

// =============================================================================
// IMAGE GENERATION
// =============================================================================

export const IMAGE_CREDITS = {
  /** Imagen 3.0 - $0.04/image → 5 credits */
  IMAGEN_3: 5,
  
  /** Imagen 4 (future) */
  IMAGEN_4: 5,
  
  /** Gemini image edit */
  GEMINI_EDIT: 3,
} as const;

// =============================================================================
// VIDEO GENERATION
// =============================================================================

export const VIDEO_CREDITS = {
  /** Veo 3.1 Fast - $1.20/8s video → 150 credits */
  VEO_FAST: 150,
  
  /** Veo 3.1 Max (Production Quality) - $6.00/8s video → 750 credits */
  VEO_MAX: 750,
  
  /** Fast revision of existing scene (cheaper) */
  VEO_REVISION: 100,
} as const;

// =============================================================================
// AUDIO / VOICEOVER
// =============================================================================

export const AUDIO_CREDITS = {
  /** ElevenLabs TTS - ~$0.20/1k chars → 30 credits per 1k chars */
  ELEVENLABS_PER_1K_CHARS: 30,
  
  /** ElevenLabs sound effects */
  ELEVENLABS_SFX: 15,
  
  /** ElevenLabs music generation */
  ELEVENLABS_MUSIC: 25,
  
  /** Voice preview (cheaper preview before full generation) */
  VOICE_PREVIEW: 5,
} as const;

// =============================================================================
// TEXT GENERATION
// =============================================================================

export const TEXT_CREDITS = {
  /** Gemini 2.5 Flash - minimal cost */
  GEMINI_FLASH: 1,
  
  /** Gemini 2.5 Pro */
  GEMINI_PRO: 2,
  
  /** Story/treatment generation */
  STORY_GENERATION: 25,
  
  /** Script generation per scene */
  SCRIPT_PER_SCENE: 2,
} as const;

// =============================================================================
// RENDERING / EXPORT
// =============================================================================

export const RENDER_CREDITS = {
  /** MP4 Export - $0.05/render → 10 credits */
  MP4_EXPORT: 10,
  
  /** Ken Burns animatic (minimal cost) */
  ANIMATIC: 5,
  
  /** Per minute of final render */
  PER_MINUTE: 5,
} as const;

// =============================================================================
// STORAGE
// =============================================================================

export const STORAGE_CREDITS = {
  /** Restore archived file from cold storage */
  ARCHIVE_RESTORE: 50,
} as const;

// =============================================================================
// QUALITY TIERS
// =============================================================================

export type VideoQuality = 'fast' | 'max';

export function getVideoCredits(quality: VideoQuality): number {
  return quality === 'max' ? VIDEO_CREDITS.VEO_MAX : VIDEO_CREDITS.VEO_FAST;
}

// =============================================================================
// PLAN RESTRICTIONS
// =============================================================================

export type PlanTier = 'coffee_break' | 'starter' | 'pro' | 'studio';

/**
 * Plans that allow Veo 3.1 Max quality
 */
export const VEO_MAX_ALLOWED_PLANS: PlanTier[] = ['pro', 'studio'];

/**
 * Check if a plan allows Veo Max quality
 */
export function canUseVeoMax(plan: PlanTier): boolean {
  return VEO_MAX_ALLOWED_PLANS.includes(plan);
}

/**
 * Get default video quality for a plan
 * Pro defaults to 'fast' with option to upgrade
 * Studio can default to 'max'
 */
export function getDefaultVideoQuality(plan: PlanTier): VideoQuality {
  return plan === 'studio' ? 'max' : 'fast';
}

// =============================================================================
// SUBSCRIPTION PLANS
// =============================================================================

export const SUBSCRIPTION_PLANS = {
  coffee_break: {
    name: 'Trial Plan',
    price: 15,
    credits: 1200,
    isOneTime: true,
    storage: '10 GB',
    veoMaxAllowed: false,
    collaborationSeats: 0,
  },
  starter: {
    name: 'Starter',
    price: 49,
    credits: 4500,
    isOneTime: false,
    storage: '25 GB',
    veoMaxAllowed: false,
    collaborationSeats: 0,
  },
  pro: {
    name: 'Pro',
    price: 149,
    credits: 15000,
    isOneTime: false,
    storage: '500 GB',
    veoMaxAllowed: true,
    collaborationSeats: 3,
  },
  studio: {
    name: 'Studio',
    price: 599,
    credits: 75000,
    isOneTime: false,
    storage: '2 TB',
    veoMaxAllowed: true,
    collaborationSeats: 10,
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
    description: '1-2 Veo Max finals or ~12 Fast drafts',
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
    description: 'Completing a major movie sequence',
  },
} as const;

// =============================================================================
// COST ESTIMATION
// =============================================================================

export interface ProjectCostEstimate {
  images: number;
  videoFast: number;
  videoMax: number;
  voiceover: number;
  render: number;
  totalCredits: number;
}

/**
 * Estimate total credits needed for a project
 */
export function estimateProjectCredits(params: {
  sceneCount: number;
  imagesPerScene?: number;
  videoQuality?: VideoQuality;
  hasVoiceover?: boolean;
  averageCharsPerScene?: number;
}): ProjectCostEstimate {
  const {
    sceneCount,
    imagesPerScene = 3,
    videoQuality = 'fast',
    hasVoiceover = true,
    averageCharsPerScene = 500,
  } = params;

  const images = sceneCount * imagesPerScene * IMAGE_CREDITS.IMAGEN_3;
  
  const videoCredits = getVideoCredits(videoQuality);
  const videoFast = videoQuality === 'fast' ? sceneCount * videoCredits : 0;
  const videoMax = videoQuality === 'max' ? sceneCount * videoCredits : 0;
  
  const totalChars = sceneCount * averageCharsPerScene;
  const voiceover = hasVoiceover 
    ? Math.ceil(totalChars / 1000) * AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS 
    : 0;
  
  const estimatedMinutes = Math.ceil(sceneCount * 0.5); // ~30s per scene
  const render = estimatedMinutes * RENDER_CREDITS.PER_MINUTE;

  return {
    images,
    videoFast,
    videoMax,
    voiceover,
    render,
    totalCredits: images + videoFast + videoMax + voiceover + render,
  };
}

// =============================================================================
// PROVIDER COST TRACKING (for margin analysis)
// =============================================================================

export const PROVIDER_COSTS_USD = {
  imagen_3: 0.04,
  veo_fast_8s: 1.20,
  veo_max_8s: 6.00,
  elevenlabs_1k_chars: 0.20,
  ffmpeg_render: 0.05,
} as const;

/**
 * Calculate actual margin for a credit charge
 */
export function calculateMargin(operation: keyof typeof PROVIDER_COSTS_USD, creditsCharged: number): number {
  const providerCost = PROVIDER_COSTS_USD[operation];
  const revenueAtStudioRate = creditsCharged * CREDIT_VALUE_USD;
  return (revenueAtStudioRate - providerCost) / revenueAtStudioRate;
}
