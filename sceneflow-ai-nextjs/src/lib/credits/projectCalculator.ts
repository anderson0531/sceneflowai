/**
 * SceneFlow AI - Project Cost Calculator
 * 
 * Comprehensive calculator for estimating project costs across all production parameters.
 * Provides strategy comparisons between subscription + top-ups vs pay-as-you-go.
 * 
 * @version 2.32
 * @see SCENEFLOW_AI_DESIGN_DOCUMENT.md Section 2.1.1
 */

import {
  CREDIT_EXCHANGE_RATE,
  VIDEO_CREDITS,
  IMAGE_CREDITS,
  AUDIO_CREDITS,
  UPSCALE_CREDITS,
  SUBSCRIPTION_TIERS,
  TOPUP_PACKS,
  calculateProjectCost as baseCostCalculation,
  estimateStorageSize,
  PLATFORM_OVERHEAD_COSTS,
  calculateModerationCost,
} from './creditCosts';

import {
  STORAGE_LIMITS,
  VOICE_LIMITS,
  PROJECT_LIMITS,
} from './guardrails';

// =============================================================================
// PROJECT PARAMETER TYPES
// =============================================================================

export interface SceneParameters {
  /** Number of scenes in the project */
  count: number;
  /** Average segments per scene */
  segmentsPerScene: number;
  /** Average takes per segment (regenerations) */
  takesPerSegment: number;
}

export interface VideoParameters {
  /** Video model to use */
  model: 'veo_fast' | 'veo_quality_4k';
  /** Duration per segment in seconds (Veo generates 8s clips) */
  segmentDuration: 8;
  /** Total minutes of final output expected */
  totalMinutes: number;
}

export interface ImageParameters {
  /** Number of key frames to generate */
  keyFrames: number;
  /** Retakes/edits per frame */
  retakesPerFrame: number;
  /** Image model */
  model: 'imagen4' | 'imagen4_ultra';
}

export interface AudioParameters {
  /** Total audio minutes to generate */
  totalMinutes: number;
  /** Dialogue lines */
  dialogueLines: number;
  /** Sound effects */
  soundEffects: number;
  /** Background music tracks */
  musicTracks: number;
}

export interface VoiceParameters {
  /** Custom voice clones to create */
  voiceClones: number;
  /** Minutes of voice audio to generate */
  voiceMinutes: number;
}

export interface StorageParameters {
  /** Expected total storage in GB */
  expectedStorageGB: number;
  /** Months to keep content active */
  activeMonths: number;
}

export interface UpscaleParameters {
  /** Minutes of video to upscale */
  upscaleMinutes: number;
  /** Use instant processing (1.5x cost) */
  useInstant: boolean;
}

export interface FullProjectParameters {
  scenes: SceneParameters;
  video: VideoParameters;
  images: ImageParameters;
  audio: AudioParameters;
  voice: VoiceParameters;
  storage: StorageParameters;
  upscale: UpscaleParameters;
}

// =============================================================================
// COST BREAKDOWN TYPES
// =============================================================================

export interface CategoryCost {
  credits: number;
  usdCost: number;
  items: {
    name: string;
    quantity: number;
    creditsEach: number;
    totalCredits: number;
  }[];
}

export interface DetailedCostBreakdown {
  video: CategoryCost;
  images: CategoryCost;
  audio: CategoryCost;
  voiceClones: CategoryCost;
  storage: CategoryCost;
  upscale: CategoryCost;
  total: {
    credits: number;
    usdCost: number;
  };
  estimatedStorageBytes: number;
  
  /**
   * Platform overhead costs (not charged to users, tracked for margin analysis)
   * These costs are absorbed into our margin
   */
  platformCosts?: {
    /** Hive AI content moderation costs */
    moderation: {
      promptCost: number;
      imageCost: number;
      videoCost: number;
      audioCost: number;
      exportCost: number;
      totalCost: number;
    };
    /** Payment processor fees (Paddle) */
    payment: {
      percentFee: number;
      fixedFee: number;
      totalFee: number;
    };
    /** Total platform overhead */
    totalOverhead: number;
  };
  
  /**
   * Margin analysis (revenue - all costs)
   */
  marginAnalysis?: {
    /** What user pays (credits converted to USD) */
    grossRevenue: number;
    /** AI provider costs (Veo, Imagen, ElevenLabs, etc.) */
    providerCosts: number;
    /** Platform overhead (moderation, payment, infra) */
    platformOverhead: number;
    /** Total costs */
    totalCosts: number;
    /** Gross profit */
    grossProfit: number;
    /** Margin percentage */
    marginPercent: number;
  };
}

// =============================================================================
// STRATEGY COMPARISON TYPES
// =============================================================================

export type SubscriptionTierName = 'trial' | 'starter' | 'pro' | 'studio' | 'enterprise';

export interface SubscriptionStrategy {
  tier: SubscriptionTierName;
  tierName: string;
  monthlyPrice: number;
  includedCredits: number;
  additionalCreditsNeeded: number;
  topUpPacks: {
    name: string;
    quantity: number;
    price: number;
    credits: number;
  }[];
  topUpCost: number;
  totalMonthlyCost: number;
  effectiveCreditsPerDollar: number;
  savings: number; // vs pay-as-you-go
  recommended: boolean;
  warnings: string[];
}

export interface PayAsYouGoStrategy {
  totalCreditsNeeded: number;
  packs: {
    name: string;
    quantity: number;
    price: number;
    credits: number;
  }[];
  totalCost: number;
  effectiveCreditsPerDollar: number;
}

export interface StrategyComparison {
  projectCost: DetailedCostBreakdown;
  payAsYouGo: PayAsYouGoStrategy;
  subscriptions: SubscriptionStrategy[];
  bestValue: {
    strategy: 'subscription' | 'payAsYouGo';
    tierName?: string;
    totalCost: number;
    monthlySavings: number;
  };
}

// =============================================================================
// CALCULATOR FUNCTIONS
// =============================================================================

/**
 * Calculate detailed cost breakdown for a project
 */
export function calculateDetailedProjectCost(params: FullProjectParameters): DetailedCostBreakdown {
  console.log('[calculateDetailedProjectCost] Raw input params:', JSON.stringify(params, null, 2));
  
  // Ensure all params have valid numeric values to prevent NaN
  const safeParams = {
    scenes: {
      count: Math.max(1, Number(params.scenes?.count) || 10),
      segmentsPerScene: Math.max(1, Number(params.scenes?.segmentsPerScene) || 3),
      takesPerSegment: Math.max(1, Number(params.scenes?.takesPerSegment) || 2),
    },
    video: {
      model: params.video?.model || 'veo_fast',
      segmentDuration: Number(params.video?.segmentDuration) || 8,
      totalMinutes: Math.max(1, Number(params.video?.totalMinutes) || 4),
    },
    images: {
      keyFrames: Math.max(1, Number(params.images?.keyFrames) || 30),
      retakesPerFrame: Number(params.images?.retakesPerFrame) || 1,
      model: params.images?.model || 'imagen4',
    },
    audio: {
      totalMinutes: Math.max(1, Number(params.audio?.totalMinutes) || 4),
      dialogueLines: Number(params.audio?.dialogueLines) || 0,
      soundEffects: Number(params.audio?.soundEffects) || 0,
      musicTracks: Number(params.audio?.musicTracks) || 0,
    },
    voice: {
      voiceClones: Number(params.voice?.voiceClones) || 0,
      voiceMinutes: Math.max(0, Number(params.voice?.voiceMinutes) || 0),
    },
    storage: {
      expectedStorageGB: Number(params.storage?.expectedStorageGB) || 20,
      activeMonths: Math.max(1, Number(params.storage?.activeMonths) || 1),
    },
    upscale: {
      upscaleMinutes: Math.max(0, Number(params.upscale?.upscaleMinutes) || 0),
      useInstant: Boolean(params.upscale?.useInstant),
    },
  };

  console.log('[calculateDetailedProjectCost] Safe params:', JSON.stringify(safeParams, null, 2));

  // Video costs
  const videoCreditsPerSegment = safeParams.video.model === 'veo_fast' 
    ? VIDEO_CREDITS.VEO_FAST 
    : VIDEO_CREDITS.VEO_QUALITY_4K;
  
  const totalSegments = safeParams.scenes.count * safeParams.scenes.segmentsPerScene;
  const totalTakes = totalSegments * safeParams.scenes.takesPerSegment;
  const videoCredits = totalTakes * videoCreditsPerSegment;
  
  const video: CategoryCost = {
    credits: videoCredits,
    usdCost: videoCredits / CREDIT_EXCHANGE_RATE,
    items: [
      {
        name: `${safeParams.video.model === 'veo_fast' ? 'Veo Fast' : 'Veo 4K'} 8s clips`,
        quantity: totalTakes,
        creditsEach: videoCreditsPerSegment,
        totalCredits: videoCredits,
      },
    ],
  };

  // Image costs
  // Note: Using IMAGEN_4 for both models as IMAGEN_4_ULTRA pricing not yet defined
  const imageCreditsPerFrame = safeParams.images.model === 'imagen4' 
    ? IMAGE_CREDITS.IMAGEN_4 
    : IMAGE_CREDITS.IMAGEN_4;
  
  const totalImages = safeParams.images.keyFrames * (1 + safeParams.images.retakesPerFrame);
  const imageCredits = totalImages * imageCreditsPerFrame;
  
  const images: CategoryCost = {
    credits: imageCredits,
    usdCost: imageCredits / CREDIT_EXCHANGE_RATE,
    items: [
      {
        name: `${safeParams.images.model === 'imagen4' ? 'Imagen 4' : 'Imagen 4 Ultra'} frames`,
        quantity: totalImages,
        creditsEach: imageCreditsPerFrame,
        totalCredits: imageCredits,
      },
    ],
  };

  // Audio costs
  const dialogueCredits = safeParams.audio.dialogueLines * AUDIO_CREDITS.DIALOGUE_PER_LINE;
  const sfxCredits = safeParams.audio.soundEffects * AUDIO_CREDITS.SOUND_EFFECT;
  const musicCredits = safeParams.audio.musicTracks * AUDIO_CREDITS.MUSIC_TRACK;
  const ttsMinutes = Math.ceil(safeParams.audio.totalMinutes);
  const ttsCredits = ttsMinutes * AUDIO_CREDITS.TTS_PER_MINUTE;
  const audioCredits = dialogueCredits + sfxCredits + musicCredits + ttsCredits;
  
  const audio: CategoryCost = {
    credits: audioCredits,
    usdCost: audioCredits / CREDIT_EXCHANGE_RATE,
    items: [
      {
        name: 'Dialogue lines',
        quantity: safeParams.audio.dialogueLines,
        creditsEach: AUDIO_CREDITS.DIALOGUE_PER_LINE,
        totalCredits: dialogueCredits,
      },
      {
        name: 'Sound effects',
        quantity: safeParams.audio.soundEffects,
        creditsEach: AUDIO_CREDITS.SOUND_EFFECT,
        totalCredits: sfxCredits,
      },
      {
        name: 'Music tracks',
        quantity: safeParams.audio.musicTracks,
        creditsEach: AUDIO_CREDITS.MUSIC_TRACK,
        totalCredits: musicCredits,
      },
      {
        name: 'TTS minutes',
        quantity: ttsMinutes,
        creditsEach: AUDIO_CREDITS.TTS_PER_MINUTE,
        totalCredits: ttsCredits,
      },
    ],
  };

  // Voice clone costs
  const voiceCloneCredits = safeParams.voice.voiceClones * VOICE_LIMITS.CLONE_CREATION_CREDITS;
  const voiceAudioCredits = Math.ceil(safeParams.voice.voiceMinutes) * AUDIO_CREDITS.TTS_PER_MINUTE;
  const voiceTotalCredits = voiceCloneCredits + voiceAudioCredits;
  
  const voiceClones: CategoryCost = {
    credits: voiceTotalCredits,
    usdCost: voiceTotalCredits / CREDIT_EXCHANGE_RATE,
    items: [
      {
        name: 'Voice clone creation',
        quantity: safeParams.voice.voiceClones,
        creditsEach: VOICE_LIMITS.CLONE_CREATION_CREDITS,
        totalCredits: voiceCloneCredits,
      },
      {
        name: 'Voice audio minutes',
        quantity: Math.ceil(safeParams.voice.voiceMinutes),
        creditsEach: AUDIO_CREDITS.TTS_PER_MINUTE,
        totalCredits: voiceAudioCredits,
      },
    ],
  };

  // Storage costs (addon-based, recurring)
  const storageCostPerMonth = calculateStorageAddonCost(safeParams.storage.expectedStorageGB);
  const totalStorageCost = storageCostPerMonth * safeParams.storage.activeMonths;
  // Convert storage cost to "equivalent credits" for comparison
  const storageEquivalentCredits = totalStorageCost * CREDIT_EXCHANGE_RATE;
  
  const storage: CategoryCost = {
    credits: storageEquivalentCredits,
    usdCost: totalStorageCost,
    items: [
      {
        name: `${safeParams.storage.expectedStorageGB}GB storage (${safeParams.storage.activeMonths} months)`,
        quantity: safeParams.storage.activeMonths,
        creditsEach: storageCostPerMonth * CREDIT_EXCHANGE_RATE,
        totalCredits: storageEquivalentCredits,
      },
    ],
  };

  // Upscale costs
  const upscaleCreditsPerMinute = UPSCALE_CREDITS.PER_MINUTE;
  const upscaleMultiplier = safeParams.upscale.useInstant ? 1.5 : 1;
  const upscaleCredits = Math.ceil(safeParams.upscale.upscaleMinutes * upscaleCreditsPerMinute * upscaleMultiplier);
  
  const upscale: CategoryCost = {
    credits: upscaleCredits,
    usdCost: upscaleCredits / CREDIT_EXCHANGE_RATE,
    items: [
      {
        name: `Topaz upscale${safeParams.upscale.useInstant ? ' (instant)' : ''}`,
        quantity: Math.ceil(safeParams.upscale.upscaleMinutes),
        creditsEach: Math.ceil(upscaleCreditsPerMinute * upscaleMultiplier),
        totalCredits: upscaleCredits,
      },
    ],
  };

  // Total
  const totalCredits = videoCredits + imageCredits + audioCredits + voiceTotalCredits + storageEquivalentCredits + upscaleCredits;
  const totalUsdCost = totalCredits / CREDIT_EXCHANGE_RATE;

  // Estimated storage (actual bytes)
  const estimatedStorageBytes = estimateStorageSize(
    totalTakes * 8, // 8 seconds per segment
    totalImages,
    Math.ceil(safeParams.audio.totalMinutes + safeParams.voice.voiceMinutes)
  );

  // Calculate platform overhead costs (moderation, payment, etc.)
  const moderationCost = calculateModerationCost({
    scenes: safeParams.scenes.count,
    segmentsPerScene: safeParams.scenes.segmentsPerScene,
    takesPerSegment: safeParams.scenes.takesPerSegment,
    framesPerScene: Math.ceil(safeParams.images.keyFrames / safeParams.scenes.count),
    voiceoverMinutes: safeParams.voice.voiceMinutes,
    uploadedImages: 0, // Estimate; actual uploads tracked separately
    exportMinutes: safeParams.video.totalMinutes,
  });

  // Calculate payment processing fees (Paddle: 5% + $0.50)
  const paymentPercentFee = totalUsdCost * PLATFORM_OVERHEAD_COSTS.payment.PADDLE_FEE_PERCENT;
  const paymentFixedFee = PLATFORM_OVERHEAD_COSTS.payment.PADDLE_FIXED_FEE;
  const paymentTotalFee = paymentPercentFee + paymentFixedFee;

  const platformCosts = {
    moderation: moderationCost,
    payment: {
      percentFee: paymentPercentFee,
      fixedFee: paymentFixedFee,
      totalFee: paymentTotalFee,
    },
    totalOverhead: moderationCost.totalCost + paymentTotalFee,
  };

  // Calculate margin analysis
  // Provider costs are approximated based on our known rates
  const providerCosts = 
    (totalTakes * 0.75) + // Veo Fast at ~$0.75/8s (approximate)
    (totalImages * 0.04) + // Imagen 4 at $0.04/image
    (Math.ceil(safeParams.audio.totalMinutes + safeParams.voice.voiceMinutes) * 0.35) + // ElevenLabs ~$0.35/min
    (safeParams.upscale.upscaleMinutes * 0.20); // Topaz ~$0.20/min

  const marginAnalysis = {
    grossRevenue: totalUsdCost,
    providerCosts,
    platformOverhead: platformCosts.totalOverhead,
    totalCosts: providerCosts + platformCosts.totalOverhead,
    grossProfit: totalUsdCost - (providerCosts + platformCosts.totalOverhead),
    marginPercent: totalUsdCost > 0 
      ? ((totalUsdCost - (providerCosts + platformCosts.totalOverhead)) / totalUsdCost) * 100 
      : 0,
  };

  return {
    video,
    images,
    audio,
    voiceClones,
    storage,
    upscale,
    total: {
      credits: totalCredits,
      usdCost: totalUsdCost,
    },
    estimatedStorageBytes,
    platformCosts,
    marginAnalysis,
  };
}

/**
 * Calculate storage addon cost per month
 */
function calculateStorageAddonCost(storageGB: number): number {
  // Base tiers include storage:
  // trial: 1GB, starter: 5GB, pro: 25GB, studio: 100GB
  // Addons: 25GB/$5, 100GB/$15, 500GB/$50
  
  // For cost estimation, assume user is on appropriate tier
  // and calculate addon cost for excess storage
  if (storageGB <= 5) return 0;
  if (storageGB <= 25) return 0; // Covered by Pro
  if (storageGB <= 100) return 0; // Covered by Studio
  
  // Calculate addons needed
  const excessGB = storageGB - 100;
  
  // Use most cost-effective addon combination
  const addon500Count = Math.floor(excessGB / 500);
  const remainingAfter500 = excessGB % 500;
  
  const addon100Count = Math.floor(remainingAfter500 / 100);
  const remainingAfter100 = remainingAfter500 % 100;
  
  const addon25Count = Math.ceil(remainingAfter100 / 25);
  
  return addon500Count * 50 + addon100Count * 15 + addon25Count * 5;
}

/**
 * Calculate optimal top-up packs for a credit amount
 */
function calculateOptimalTopUps(creditsNeeded: number): { name: string; quantity: number; price: number; credits: number }[] {
  const packs: { name: string; quantity: number; price: number; credits: number }[] = [];
  let remaining = creditsNeeded;
  
  // Sort packs by value (credits per dollar, descending)
  const sortedPacks = Object.entries(TOPUP_PACKS)
    .map(([key, pack]) => ({
      key,
      ...pack,
      valueRatio: pack.credits / pack.price,
    }))
    .sort((a, b) => b.valueRatio - a.valueRatio);
  
  // Greedy algorithm: use highest value packs first
  for (const pack of sortedPacks) {
    if (remaining <= 0) break;
    
    const quantity = Math.floor(remaining / pack.credits);
    if (quantity > 0) {
      packs.push({
        name: pack.name,
        quantity,
        price: pack.price * quantity,
        credits: pack.credits * quantity,
      });
      remaining -= pack.credits * quantity;
    }
  }
  
  // If still have remaining, add smallest pack
  if (remaining > 0) {
    const smallestPack = sortedPacks[sortedPacks.length - 1];
    packs.push({
      name: smallestPack.name,
      quantity: 1,
      price: smallestPack.price,
      credits: smallestPack.credits,
    });
  }
  
  return packs;
}

/**
 * Compare different payment strategies for a project
 */
export function compareStrategies(params: FullProjectParameters): StrategyComparison {
  const projectCost = calculateDetailedProjectCost(params);
  const totalCreditsNeeded = projectCost.total.credits;
  
  // Pay-as-you-go strategy
  const payAsYouGoPacks = calculateOptimalTopUps(totalCreditsNeeded);
  const payAsYouGoTotalCost = payAsYouGoPacks.reduce((sum, pack) => sum + pack.price, 0);
  const payAsYouGoTotalCredits = payAsYouGoPacks.reduce((sum, pack) => sum + pack.credits, 0);
  
  const payAsYouGo: PayAsYouGoStrategy = {
    totalCreditsNeeded,
    packs: payAsYouGoPacks,
    totalCost: payAsYouGoTotalCost,
    effectiveCreditsPerDollar: payAsYouGoTotalCredits / payAsYouGoTotalCost,
  };
  
  // Subscription strategies
  const subscriptions: SubscriptionStrategy[] = [];
  let bestSubscription: SubscriptionStrategy | null = null;
  
  for (const [tierKey, tier] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (tier.price === 0) continue; // Skip enterprise for now
    
    const tierName = tierKey as SubscriptionTierName;
    const additionalCreditsNeeded = Math.max(0, totalCreditsNeeded - tier.credits);
    const topUpPacks = additionalCreditsNeeded > 0 
      ? calculateOptimalTopUps(additionalCreditsNeeded) 
      : [];
    const topUpCost = topUpPacks.reduce((sum, pack) => sum + pack.price, 0);
    const totalMonthlyCost = tier.price + topUpCost;
    const totalCreditsAvailable = tier.credits + topUpPacks.reduce((sum, pack) => sum + pack.credits, 0);
    
    // Generate warnings
    const warnings: string[] = [];
    
    // Check scene limits
    if (params.scenes.count > PROJECT_LIMITS.MAX_SCENES_PER_PROJECT[tierName]) {
      warnings.push(`Exceeds scene limit (${PROJECT_LIMITS.MAX_SCENES_PER_PROJECT[tierName]} max)`);
    }
    
    // Check voice clone limits
    if (params.voice.voiceClones > VOICE_LIMITS.MAX_VOICE_CLONES[tierName]) {
      warnings.push(`Exceeds voice clone limit (${VOICE_LIMITS.MAX_VOICE_CLONES[tierName]} max)`);
    }
    
    // Check storage limits
    const tierStorageGB = STORAGE_LIMITS.TIER_STORAGE[tierName] / (1024 * 1024 * 1024);
    if (params.storage.expectedStorageGB > tierStorageGB) {
      warnings.push(`Needs additional storage (${tierStorageGB}GB included)`);
    }
    
    const strategy: SubscriptionStrategy = {
      tier: tierName,
      tierName: tier.name,
      monthlyPrice: tier.price,
      includedCredits: tier.credits,
      additionalCreditsNeeded,
      topUpPacks,
      topUpCost,
      totalMonthlyCost,
      effectiveCreditsPerDollar: totalCreditsAvailable / totalMonthlyCost,
      savings: payAsYouGoTotalCost - totalMonthlyCost,
      recommended: false,
      warnings,
    };
    
    subscriptions.push(strategy);
    
    // Track best subscription (lowest cost with no blocking warnings)
    const hasBlockingWarnings = warnings.some(w => 
      w.includes('scene limit') || w.includes('voice clone limit')
    );
    
    if (!hasBlockingWarnings && (!bestSubscription || strategy.totalMonthlyCost < bestSubscription.totalMonthlyCost)) {
      bestSubscription = strategy;
    }
  }
  
  // Mark best subscription as recommended
  if (bestSubscription) {
    bestSubscription.recommended = true;
  }
  
  // Determine overall best value
  const bestValue = {
    strategy: 'payAsYouGo' as 'subscription' | 'payAsYouGo',
    tierName: undefined as string | undefined,
    totalCost: payAsYouGoTotalCost,
    monthlySavings: 0,
  };
  
  if (bestSubscription && bestSubscription.totalMonthlyCost < payAsYouGoTotalCost) {
    bestValue.strategy = 'subscription';
    bestValue.tierName = bestSubscription.tierName;
    bestValue.totalCost = bestSubscription.totalMonthlyCost;
    bestValue.monthlySavings = payAsYouGoTotalCost - bestSubscription.totalMonthlyCost;
  }
  
  return {
    projectCost,
    payAsYouGo,
    subscriptions,
    bestValue,
  };
}

/**
 * Recommend the best plan for given usage patterns
 */
export function recommendPlan(params: FullProjectParameters): {
  recommendedTier: SubscriptionTierName;
  reason: string;
  monthlyCost: number;
  includesTopUps: boolean;
} {
  const comparison = compareStrategies(params);
  
  // Find recommended strategy
  const recommended = comparison.subscriptions.find(s => s.recommended);
  
  if (!recommended) {
    return {
      recommendedTier: 'starter',
      reason: 'Best value for most users',
      monthlyCost: SUBSCRIPTION_TIERS.starter.price,
      includesTopUps: false,
    };
  }
  
  return {
    recommendedTier: recommended.tier,
    reason: recommended.savings > 0 
      ? `Save $${recommended.savings.toFixed(2)}/month vs pay-as-you-go`
      : 'Best fit for your project size',
    monthlyCost: recommended.totalMonthlyCost,
    includesTopUps: recommended.topUpPacks.length > 0,
  };
}

// =============================================================================
// QUICK ESTIMATE FUNCTIONS
// =============================================================================

/**
 * Quick estimate for a short film project
 */
export function estimateShortFilm(scenes: number, minutesPerScene: number): StrategyComparison {
  const params: FullProjectParameters = {
    scenes: {
      count: scenes,
      segmentsPerScene: Math.ceil(minutesPerScene * 60 / 8), // 8s per segment
      takesPerSegment: 2, // Average 2 takes per segment
    },
    video: {
      model: 'veo_quality_4k',
      segmentDuration: 8,
      totalMinutes: scenes * minutesPerScene,
    },
    images: {
      keyFrames: scenes * 3, // 3 key frames per scene
      retakesPerFrame: 1,
      model: 'imagen4',
    },
    audio: {
      totalMinutes: scenes * minutesPerScene,
      dialogueLines: scenes * 10, // 10 lines per scene
      soundEffects: scenes * 5,
      musicTracks: Math.ceil(scenes / 3), // 1 track per 3 scenes
    },
    voice: {
      voiceClones: 0,
      voiceMinutes: scenes * minutesPerScene,
    },
    storage: {
      expectedStorageGB: scenes * 2, // ~2GB per scene
      activeMonths: 3,
    },
    upscale: {
      upscaleMinutes: scenes * minutesPerScene,
      useInstant: false,
    },
  };
  
  return compareStrategies(params);
}

/**
 * Quick estimate for a commercial/ad project
 */
export function estimateCommercial(durationSeconds: number, takes: number = 3): StrategyComparison {
  const segments = Math.ceil(durationSeconds / 8);
  
  const params: FullProjectParameters = {
    scenes: {
      count: 1,
      segmentsPerScene: segments,
      takesPerSegment: takes,
    },
    video: {
      model: 'veo_quality_4k',
      segmentDuration: 8,
      totalMinutes: durationSeconds / 60,
    },
    images: {
      keyFrames: segments,
      retakesPerFrame: 2,
      model: 'imagen4_ultra',
    },
    audio: {
      totalMinutes: durationSeconds / 60,
      dialogueLines: 5,
      soundEffects: 10,
      musicTracks: 1,
    },
    voice: {
      voiceClones: 1, // Brand voice
      voiceMinutes: durationSeconds / 60,
    },
    storage: {
      expectedStorageGB: 5,
      activeMonths: 1,
    },
    upscale: {
      upscaleMinutes: durationSeconds / 60,
      useInstant: true, // Commercial needs fast turnaround
    },
  };
  
  return compareStrategies(params);
}

/**
 * Quick estimate for a music video
 */
export function estimateMusicVideo(durationMinutes: number): StrategyComparison {
  const params: FullProjectParameters = {
    scenes: {
      count: Math.ceil(durationMinutes * 4), // ~4 scene changes per minute
      segmentsPerScene: 2,
      takesPerSegment: 3, // More takes for visual variety
    },
    video: {
      model: 'veo_quality_4k',
      segmentDuration: 8,
      totalMinutes: durationMinutes,
    },
    images: {
      keyFrames: Math.ceil(durationMinutes * 8), // 8 key frames per minute
      retakesPerFrame: 2,
      model: 'imagen4_ultra',
    },
    audio: {
      totalMinutes: durationMinutes,
      dialogueLines: 0,
      soundEffects: Math.ceil(durationMinutes * 3),
      musicTracks: 1,
    },
    voice: {
      voiceClones: 0,
      voiceMinutes: 0,
    },
    storage: {
      expectedStorageGB: Math.ceil(durationMinutes * 3),
      activeMonths: 6,
    },
    upscale: {
      upscaleMinutes: durationMinutes,
      useInstant: false,
    },
  };
  
  return compareStrategies(params);
}

// =============================================================================
// EXPORT DEFAULT PARAMETERS FOR UI
// =============================================================================

export const DEFAULT_PROJECT_PARAMS: FullProjectParameters = {
  scenes: {
    count: 10,
    segmentsPerScene: 3,
    takesPerSegment: 2,
  },
  video: {
    model: 'veo_fast',
    segmentDuration: 8,
    totalMinutes: 4,
  },
  images: {
    keyFrames: 30,
    retakesPerFrame: 1,
    model: 'imagen4',
  },
  audio: {
    totalMinutes: 4,
    dialogueLines: 50,
    soundEffects: 20,
    musicTracks: 2,
  },
  voice: {
    voiceClones: 0,
    voiceMinutes: 4,
  },
  storage: {
    expectedStorageGB: 20,
    activeMonths: 1,
  },
  upscale: {
    upscaleMinutes: 0,
    useInstant: false,
  },
};
