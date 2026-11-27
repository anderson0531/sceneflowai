/**
 * SceneFlow Studio - Project Cost Calculator
 * 
 * Comprehensive calculator for estimating project costs across all production parameters.
 * Provides strategy comparisons between subscription + top-ups vs pay-as-you-go.
 * 
 * @version 2.32
 * @see SCENEFLOW_AI_DESIGN_DOCUMENT.md Section 2.1.1
 */

import {
  CREDIT_EXCHANGE_RATE,
  IMAGE_CREDITS,
  VIDEO_CREDITS,
  AUDIO_CREDITS,
  TEXT_CREDITS,
  BLUEPRINT_CREDITS,
  SUBSCRIPTION_TIERS,
  TOPUP_PACKS,
  PROVIDER_COSTS_USD,
  calculateProjectCost as baseCostCalculation,
  estimateStorageSize,
  PLATFORM_OVERHEAD_COSTS,
  calculateModerationCost,
  byokMediaCredits,
} from './creditCosts';

import {
  GEMINI_PRO_STILL_MODEL_ID,
  GEMINI_STILL_MODEL_ID,
  quoteGenerationCredits,
  quoteOperationFromRateCard,
  type RateCardMap,
} from './quoteGenerationCredits';

import {
  SCENEFLOW_ENGINE_ID,
  estimateVideoClipQuote,
  normalizeVideoParameters,
  type SceneFlowQualityTierId,
  type VideoEngineId,
} from './videoEnginePricing';

import { TIER_CATALOG } from '@/lib/billing/tierCatalog';

import {
  VOICE_LIMITS,
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

export type { VideoEngineId, SceneFlowQualityTierId } from './videoEnginePricing';

export interface VideoParameters {
  /** @deprecated Legacy Veo model — mapped to natural-dialogue on read */
  model?: 'veo_fast' | 'veo_quality_4k';
  /** Video engine selection (mirrors production) */
  engine?: VideoEngineId;
  /** SceneFlow quality tier when engine is sceneflow */
  qualityTier?: SceneFlowQualityTierId;
  /** Duration per segment in seconds */
  segmentDuration?: number;
  /** Total minutes of final output expected */
  totalMinutes: number;
  /**
   * Fraction of segments rendered as AI video vs archival/Ken Burns stills (0..1, default 1).
   * Enables Hybrid Documentary Memoirs (e.g. 0.30 = 30% AI re-enactment clips + 70% family photos).
   */
  hybridVideoShare?: number;
  /** Optional average continuity reference images per clip (default 0) */
  avgReferenceImages?: number;
  /** Alias for avgReferenceImages */
  referenceImageCount?: number;
  /** Optional native audio flag (default true) */
  audio?: boolean;
  /** Optional Kling voice control flag */
  voiceControl?: boolean;
}

export interface ImageParameters {
  /** Draft / Beat frames billed at FRAME_GENERATION */
  keyFrames: number;
  /** Retakes/edits per draft frame */
  retakesPerFrame: number;
  /** Final storyboard / scene images billed at FAL_KLING_IMAGE */
  finalImages?: number;
  /** Character reference headshots billed at SCENE_CHARACTER_HEADSHOT */
  characterHeadshots?: number;
  /** @deprecated Kept for merge compat; pricing uses role rates above */
  model?: 'imagen4' | 'imagen4_ultra';
}

export interface IntelligenceParameters {
  /** Audience Resonance analyses (default 1) */
  audienceResonanceAnalyses?: number;
  /** Blueprint optimize passes (default 1) */
  blueprintOptimizations?: number;
  /** Blueprint refine passes (default 1) */
  blueprintRefines?: number;
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
  /** Optional TTS provider ('gemini' | 'elevenlabs', defaults to 'elevenlabs') */
  ttsProvider?: 'gemini' | 'elevenlabs';
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
  /** Use instant processing (2x cost) */
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
  intelligence?: IntelligenceParameters;
}

export interface ProjectCostOptions {
  /** When true, image and video credits are the 20% BYOK platform fee. */
  byokExcludeMedia?: boolean;
  /** Optional live published Admin Rate Card map */
  rateCard?: RateCardMap;
  /** Optional average continuity reference images per clip */
  avgReferenceImages?: number;
  /** Optional TTS provider override ('gemini' | 'elevenlabs') */
  ttsProvider?: 'gemini' | 'elevenlabs';
}

// =============================================================================
// COST BREAKDOWN TYPES
// =============================================================================

export interface CategoryCost {
  credits: number;
  usdCost: number;
  /** True when category was zeroed for BYOK budgeting */
  excluded?: boolean;
  /** Credits before BYOK exclusion (for UI strikethrough) */
  preExclusionCredits?: number;
  items: {
    name: string;
    quantity: number;
    creditsEach: number;
    totalCredits: number;
  }[];
}

export interface DetailedCostBreakdown {
  intelligence: CategoryCost;
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
  byokExcludeMedia?: boolean;
  
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
    /** Payment processor fees (Whop) */
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

export type SubscriptionTierName =
  | 'explorer'
  | 'hobbyist'
  | 'starter'
  | 'pro'
  | 'studio'
  | 'enterprise'
  | 'trial';

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
export function calculateDetailedProjectCost(
  params: FullProjectParameters,
  options: ProjectCostOptions = {}
): DetailedCostBreakdown {
  const byokExcludeMedia = Boolean(options.byokExcludeMedia)
  const rateCard = options.rateCard
  const referenceImageCount = Math.max(
    0,
    Math.round(
      Number(
        options.avgReferenceImages ??
          params.video?.avgReferenceImages ??
          params.video?.referenceImageCount ??
          0
      ) || 0
    )
  )

  const rawAudioMinutes =
    params.audio?.totalMinutes !== undefined
      ? Math.max(0, Number(params.audio.totalMinutes) || 0)
      : 4

  // Ensure all params have valid numeric values to prevent NaN
  const safeParams = {
    scenes: {
      count: Math.max(1, Number(params.scenes?.count) || 10),
      segmentsPerScene: Math.max(1, Number(params.scenes?.segmentsPerScene) || 3),
      takesPerSegment: Math.max(1, Number(params.scenes?.takesPerSegment) || 2),
    },
    video: normalizeVideoParameters(params.video),
    images: {
      keyFrames:
        params.images?.keyFrames !== undefined
          ? Math.max(0, Number(params.images.keyFrames))
          : 30,
      retakesPerFrame:
        params.images?.retakesPerFrame !== undefined
          ? Math.max(0, Number(params.images.retakesPerFrame))
          : 1,
      finalImages: Math.max(
        0,
        Number(
          params.images?.finalImages ??
            Math.max(1, Math.ceil((Number(params.images?.keyFrames) || 30) / 3))
        )
      ),
      characterHeadshots: Math.max(
        0,
        Number(params.images?.characterHeadshots ?? Math.min(8, Number(params.scenes?.count) || 10))
      ),
      model: params.images?.model || 'imagen4',
    },
    audio: {
      totalMinutes: rawAudioMinutes,
      dialogueLines: Math.max(0, Number(params.audio?.dialogueLines) || 0),
      soundEffects: Math.max(0, Number(params.audio?.soundEffects) || 0),
      musicTracks: Math.max(0, Number(params.audio?.musicTracks) || 0),
      ttsProvider: options.ttsProvider ?? params.audio?.ttsProvider ?? 'elevenlabs',
    },
    voice: {
      voiceClones: Math.max(0, Number(params.voice?.voiceClones) || 0),
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
    intelligence: {
      audienceResonanceAnalyses: Math.max(
        0,
        Number(params.intelligence?.audienceResonanceAnalyses ?? 1)
      ),
      blueprintOptimizations: Math.max(
        0,
        Number(params.intelligence?.blueprintOptimizations ?? 1)
      ),
      blueprintRefines: Math.max(0, Number(params.intelligence?.blueprintRefines ?? 1)),
    },
  };

  // Intelligence (Blueprint / script / resonance) — always on SceneFlow credits
  const resonanceQty = safeParams.intelligence.audienceResonanceAnalyses;
  const resonanceCredits =
    resonanceQty * BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS;
  const scriptQty = safeParams.scenes.count;
  const scriptCredits = scriptQty * TEXT_CREDITS.SCRIPT_PER_SCENE;
  const optimizeQty = safeParams.intelligence.blueprintOptimizations;
  const optimizeCredits = optimizeQty * BLUEPRINT_CREDITS.BLUEPRINT_OPTIMIZE;
  const refineQty = safeParams.intelligence.blueprintRefines;
  const refineCredits = refineQty * BLUEPRINT_CREDITS.BLUEPRINT_REFINE;
  const intelligenceCredits =
    resonanceCredits + scriptCredits + optimizeCredits + refineCredits;

  const intelligence: CategoryCost = {
    credits: intelligenceCredits,
    usdCost: intelligenceCredits / CREDIT_EXCHANGE_RATE,
    items: [
      {
        name: 'Audience Resonance analysis',
        quantity: resonanceQty,
        creditsEach: BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS,
        totalCredits: resonanceCredits,
      },
      {
        name: 'Script generation (per scene)',
        quantity: scriptQty,
        creditsEach: TEXT_CREDITS.SCRIPT_PER_SCENE,
        totalCredits: scriptCredits,
      },
      {
        name: 'Blueprint optimize',
        quantity: optimizeQty,
        creditsEach: BLUEPRINT_CREDITS.BLUEPRINT_OPTIMIZE,
        totalCredits: optimizeCredits,
      },
      {
        name: 'Blueprint refine',
        quantity: refineQty,
        creditsEach: BLUEPRINT_CREDITS.BLUEPRINT_REFINE,
        totalCredits: refineCredits,
      },
    ].filter((item) => item.quantity > 0),
  };

  // Video costs — engine-aware (Kling, Vertex Omni, Veo, Aggregator) + live rateCard + refs
  const clipEstimate = estimateVideoClipQuote(safeParams.video, {
    rateCard,
    referenceImageCount,
    audio: params.video?.audio,
    voiceControl: params.video?.voiceControl,
  });
  const totalSegments = safeParams.scenes.count * safeParams.scenes.segmentsPerScene;
  const rawHybridShare = params.video?.hybridVideoShare;
  const hybridVideoShare =
    typeof rawHybridShare === 'number' && Number.isFinite(rawHybridShare)
      ? Math.max(0, Math.min(1, rawHybridShare))
      : 1;
  const activeVideoSegments =
    hybridVideoShare >= 1 ? totalSegments : Math.round(totalSegments * hybridVideoShare);
  const totalTakes = activeVideoSegments * safeParams.scenes.takesPerSegment;
  const videoCreditsRaw = totalTakes * clipEstimate.creditsEach;

  const billedVideoCredits = byokExcludeMedia ? byokMediaCredits(videoCreditsRaw) : videoCreditsRaw
  const video: CategoryCost = {
    credits: billedVideoCredits,
    usdCost: billedVideoCredits / CREDIT_EXCHANGE_RATE,
    excluded: false,
    preExclusionCredits: videoCreditsRaw,
    items: [
      {
        name: clipEstimate.label,
        quantity: totalTakes,
        creditsEach: clipEstimate.creditsEach,
        totalCredits: videoCreditsRaw,
      },
    ],
  };

  // Image costs — production role rates (live rateCard override when published/passed)
  const draftStillQuote = quoteGenerationCredits({
    kind: 'still',
    model: GEMINI_STILL_MODEL_ID,
    rateCard,
    floorCredits: IMAGE_CREDITS.FRAME_GENERATION,
  });
  const finalStillQuote = quoteGenerationCredits({
    kind: 'still',
    model: GEMINI_PRO_STILL_MODEL_ID,
    rateCard,
    floorCredits: IMAGE_CREDITS.FAL_KLING_IMAGE,
  });
  const headshotQuote = quoteGenerationCredits({
    kind: 'reference',
    model: GEMINI_PRO_STILL_MODEL_ID,
    rateCard,
    floorCredits: IMAGE_CREDITS.SCENE_CHARACTER_HEADSHOT,
  });

  const draftUnitCredits =
    rateCard && rateCard.gemini_still
      ? draftStillQuote.credits
      : IMAGE_CREDITS.FRAME_GENERATION;
  const finalUnitCredits =
    rateCard && rateCard.gemini_pro_still_2k
      ? finalStillQuote.credits
      : IMAGE_CREDITS.FAL_KLING_IMAGE;
  const headshotUnitCredits =
    rateCard && rateCard.gemini_pro_still_2k
      ? headshotQuote.credits
      : IMAGE_CREDITS.SCENE_CHARACTER_HEADSHOT;

  const draftFrameQty =
    safeParams.images.keyFrames * (1 + safeParams.images.retakesPerFrame);
  const draftCredits = draftFrameQty * draftUnitCredits;
  const finalQty = safeParams.images.finalImages;
  const finalCredits = finalQty * finalUnitCredits;
  const headshotQty = safeParams.images.characterHeadshots;
  const headshotCredits = headshotQty * headshotUnitCredits;
  const imageCreditsRaw = draftCredits + finalCredits + headshotCredits;
  const totalImages = draftFrameQty + finalQty + headshotQty;

  const billedImageCredits = byokExcludeMedia ? byokMediaCredits(imageCreditsRaw) : imageCreditsRaw
  const images: CategoryCost = {
    credits: billedImageCredits,
    usdCost: billedImageCredits / CREDIT_EXCHANGE_RATE,
    excluded: false,
    preExclusionCredits: imageCreditsRaw,
    items: [
      {
        name: 'Draft / Beat frames',
        quantity: draftFrameQty,
        creditsEach: draftUnitCredits,
        totalCredits: draftCredits,
      },
      {
        name: 'Final storyboard / scene images',
        quantity: finalQty,
        creditsEach: finalUnitCredits,
        totalCredits: finalCredits,
      },
      {
        name: 'Character reference headshots',
        quantity: headshotQty,
        creditsEach: headshotUnitCredits,
        totalCredits: headshotCredits,
      },
    ].filter((item) => item.quantity > 0),
  };

  // Audio costs — TTS counted ONCE (deduplicating audio.totalMinutes, voice.voiceMinutes, and dialogueLines)
  const dialogueEstimatedMinutes =
    safeParams.audio.dialogueLines > 0
      ? Math.ceil((safeParams.audio.dialogueLines * 80) / 1000)
      : 0;
  const totalTtsMinutes = Math.ceil(
    Math.max(safeParams.audio.totalMinutes, safeParams.voice.voiceMinutes) ||
      dialogueEstimatedMinutes
  );
  const ttsOperation =
    safeParams.audio.ttsProvider === 'gemini' ? 'gemini_tts' : 'elevenlabs_tts';
  const ttsFloorPerMin =
    safeParams.audio.ttsProvider === 'gemini'
      ? 10
      : AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS;
  const ttsUnitQuote = quoteOperationFromRateCard({
    operation: ttsOperation,
    units: 1,
    rateCard,
    floorCredits: ttsFloorPerMin,
  });
  const ttsCredits = totalTtsMinutes * ttsUnitQuote.credits;
  const ttsProviderUsd = totalTtsMinutes * ttsUnitQuote.providerUsd;

  // SFX quoted at live Veo Lite SFX rate (>= 75 cr floor, fixing 5x under-estimate)
  const sfxUnitQuote = quoteOperationFromRateCard({
    operation: 'veo_lite_sfx',
    units: 1,
    rateCard,
    floorCredits: VIDEO_CREDITS.VEO_LITE,
  });
  const sfxCredits = safeParams.audio.soundEffects * sfxUnitQuote.credits;
  const sfxProviderUsd = safeParams.audio.soundEffects * sfxUnitQuote.providerUsd;

  // Background music quoted at live Lyria Music rate (>= 25 cr floor)
  const musicUnitQuote = quoteOperationFromRateCard({
    operation: 'lyria_music',
    units: 1,
    rateCard,
    floorCredits: AUDIO_CREDITS.MUSIC_TRACK,
  });
  const musicCredits = safeParams.audio.musicTracks * musicUnitQuote.credits;
  const musicProviderUsd = safeParams.audio.musicTracks * musicUnitQuote.providerUsd;

  const audioCredits = ttsCredits + sfxCredits + musicCredits;

  const audio: CategoryCost = {
    credits: audioCredits,
    usdCost: audioCredits / CREDIT_EXCHANGE_RATE,
    items: [
      {
        name:
          safeParams.audio.ttsProvider === 'gemini'
            ? 'TTS narration & dialogue (Gemini)'
            : 'TTS narration & dialogue (ElevenLabs)',
        quantity: totalTtsMinutes,
        creditsEach: ttsUnitQuote.credits,
        totalCredits: ttsCredits,
      },
      {
        name: 'Sound effects (Veo Lite SFX)',
        quantity: safeParams.audio.soundEffects,
        creditsEach: sfxUnitQuote.credits,
        totalCredits: sfxCredits,
      },
      {
        name: 'Music tracks (Lyria)',
        quantity: safeParams.audio.musicTracks,
        creditsEach: musicUnitQuote.credits,
        totalCredits: musicCredits,
      },
    ].filter((item) => item.quantity > 0),
  };

  // Voice clone setup costs (TTS minutes already counted once in audio above)
  const voiceCloneCredits = safeParams.voice.voiceClones * VOICE_LIMITS.CLONE_CREATION_CREDITS;
  const voiceTotalCredits = voiceCloneCredits;

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
    ].filter((item) => item.quantity > 0),
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

  // Upscale costs (Topaz 50 cr/min, 2x instant multiplier)
  const upscaleCreditsPerMinute = VIDEO_CREDITS.TOPAZ_UPSCALE_PER_MIN;
  const upscaleMultiplier = safeParams.upscale.useInstant
    ? VIDEO_CREDITS.TOPAZ_UPSCALE_INSTANT_MULTIPLIER
    : 1;
  const upscaleCredits = Math.ceil(
    safeParams.upscale.upscaleMinutes * upscaleCreditsPerMinute * upscaleMultiplier
  );
  
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

  // Total — media may be excluded under BYOK
  const billedVideo = video.credits;
  const billedImages = images.credits;
  const totalCredits =
    intelligenceCredits +
    billedVideo +
    billedImages +
    audioCredits +
    voiceTotalCredits +
    storageEquivalentCredits +
    upscaleCredits;
  const totalUsdCost = totalCredits / CREDIT_EXCHANGE_RATE;

  // Estimated storage (actual bytes)
  const estimatedStorageBytes = estimateStorageSize(
    totalTakes * safeParams.video.segmentDuration,
    totalImages,
    totalTtsMinutes
  );

  // Calculate platform overhead costs (moderation, payment, etc.)
  const moderationCost = calculateModerationCost({
    scenes: safeParams.scenes.count,
    segmentsPerScene: safeParams.scenes.segmentsPerScene,
    takesPerSegment: safeParams.scenes.takesPerSegment,
    framesPerScene: Math.ceil(
      Math.max(1, safeParams.images.keyFrames) / safeParams.scenes.count
    ),
    voiceoverMinutes: totalTtsMinutes,
    uploadedImages: 0, // Estimate; actual uploads tracked separately
    exportMinutes: safeParams.video.totalMinutes,
  });

  // Calculate payment processing fees (Whop: 2.7% + $0.30 domestic cards)
  const paymentPercentFee = totalUsdCost * PLATFORM_OVERHEAD_COSTS.payment.WHOP_FEE_PERCENT;
  const paymentFixedFee = PLATFORM_OVERHEAD_COSTS.payment.WHOP_FIXED_FEE;
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

  // Dynamic margin analysis — real provider COGS from live rate card / engine selection
  const videoProviderUsd = byokExcludeMedia ? 0 : totalTakes * clipEstimate.providerUsd;
  const imageProviderUsd = byokExcludeMedia
    ? 0
    : draftFrameQty * draftStillQuote.providerUsd +
      finalQty * finalStillQuote.providerUsd +
      headshotQty * headshotQuote.providerUsd;
  const audioProviderUsd = ttsProviderUsd + sfxProviderUsd + musicProviderUsd;
  const upscaleProviderUsd =
    safeParams.upscale.upscaleMinutes * PROVIDER_COSTS_USD.topaz_upscale_min;
  const renderProviderUsd = PROVIDER_COSTS_USD.ffmpeg_render;
  const providerCosts =
    videoProviderUsd +
    imageProviderUsd +
    audioProviderUsd +
    upscaleProviderUsd +
    renderProviderUsd;

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
    intelligence,
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
    byokExcludeMedia,
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

const CANONICAL_STRATEGY_TIERS = [
  'explorer',
  'hobbyist',
  'starter',
  'pro',
  'studio',
] as const;

/**
 * Compare different payment strategies for a project
 */
export function compareStrategies(
  params: FullProjectParameters,
  options: ProjectCostOptions = {}
): StrategyComparison {
  const projectCost = calculateDetailedProjectCost(params, options);
  const totalCreditsNeeded = projectCost.total.credits;
  
  // Pay-as-you-go strategy
  const payAsYouGoPacks = calculateOptimalTopUps(totalCreditsNeeded);
  const payAsYouGoTotalCost = payAsYouGoPacks.reduce((sum, pack) => sum + pack.price, 0);
  const payAsYouGoTotalCredits = payAsYouGoPacks.reduce((sum, pack) => sum + pack.credits, 0);
  
  const payAsYouGo: PayAsYouGoStrategy = {
    totalCreditsNeeded,
    packs: payAsYouGoPacks,
    totalCost: payAsYouGoTotalCost,
    effectiveCreditsPerDollar:
      payAsYouGoTotalCost > 0 ? payAsYouGoTotalCredits / payAsYouGoTotalCost : 0,
  };
  
  // Subscription strategies using canonical TIER_CATALOG / SUBSCRIPTION_TIERS
  const subscriptions: SubscriptionStrategy[] = [];
  let bestSubscription: SubscriptionStrategy | null = null;
  
  for (const tierKey of CANONICAL_STRATEGY_TIERS) {
    const tier = SUBSCRIPTION_TIERS[tierKey];
    const catalogTier = TIER_CATALOG[tierKey];
    if (!tier || !catalogTier || tier.price <= 0) continue;
    
    const tierName: SubscriptionTierName = tierKey;
    const additionalCreditsNeeded = Math.max(0, totalCreditsNeeded - tier.credits);
    const topUpPacks = additionalCreditsNeeded > 0 
      ? calculateOptimalTopUps(additionalCreditsNeeded) 
      : [];
    const topUpCost = topUpPacks.reduce((sum, pack) => sum + pack.price, 0);
    const totalMonthlyCost = tier.price + topUpCost;
    const totalCreditsAvailable = tier.credits + topUpPacks.reduce((sum, pack) => sum + pack.credits, 0);
    
    // Generate warnings from canonical TIER_CATALOG limits (never undefined)
    const warnings: string[] = [];
    
    // Check scene limits
    const maxScenes = catalogTier.maxScenesPerProject;
    if (params.scenes.count > maxScenes) {
      warnings.push(`Exceeds scene limit (${maxScenes} max)`);
    }
    
    // Check voice clone limits
    const maxVoiceClones = catalogTier.voiceCloneSlots;
    if (params.voice.voiceClones > maxVoiceClones) {
      warnings.push(`Exceeds voice clone limit (${maxVoiceClones} max)`);
    }
    
    // Check storage limits
    const tierStorageGB = catalogTier.storageGb;
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
      effectiveCreditsPerDollar:
        totalMonthlyCost > 0 ? totalCreditsAvailable / totalMonthlyCost : 0,
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
export function recommendPlan(
  params: FullProjectParameters,
  options: ProjectCostOptions = {}
): {
  recommendedTier: SubscriptionTierName;
  name: string;
  price: number;
  reason: string;
  monthlyCost: number;
  includesTopUps: boolean;
} {
  const comparison = compareStrategies(params, options);
  
  // Find recommended strategy
  const recommended = comparison.subscriptions.find(s => s.recommended);
  
  if (!recommended) {
    return {
      recommendedTier: 'starter',
      name: SUBSCRIPTION_TIERS.starter.name,
      price: SUBSCRIPTION_TIERS.starter.price,
      reason: 'Best value for most users',
      monthlyCost: SUBSCRIPTION_TIERS.starter.price,
      includesTopUps: false,
    };
  }
  
  return {
    recommendedTier: recommended.tier,
    name: recommended.tierName,
    price: recommended.monthlyPrice,
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
      engine: SCENEFLOW_ENGINE_ID,
      qualityTier: 'cinematic',
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
      engine: SCENEFLOW_ENGINE_ID,
      qualityTier: 'cinematic',
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
      engine: SCENEFLOW_ENGINE_ID,
      qualityTier: 'cinematic',
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

export const DEFAULT_PROJECT_PARAMS: FullProjectParameters = {
  scenes: {
    count: 10,
    segmentsPerScene: 3,
    takesPerSegment: 2,
  },
  video: {
    engine: SCENEFLOW_ENGINE_ID,
    qualityTier: 'cinematic',
    segmentDuration: 8,
    totalMinutes: 4,
  },
  images: {
    keyFrames: 30,
    retakesPerFrame: 1,
    finalImages: 10,
    characterHeadshots: 4,
    model: 'imagen4',
  },
  intelligence: {
    audienceResonanceAnalyses: 1,
    blueprintOptimizations: 1,
    blueprintRefines: 1,
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

/** Deep-merge partial script-derived params with calculator defaults. */
export function mergeProjectParameters(
  initial?: Partial<FullProjectParameters> | null
): FullProjectParameters {
  return {
    scenes: {
      ...DEFAULT_PROJECT_PARAMS.scenes,
      ...(initial?.scenes || {}),
    },
    video: {
      ...DEFAULT_PROJECT_PARAMS.video,
      ...(initial?.video || {}),
    },
    images: {
      ...DEFAULT_PROJECT_PARAMS.images,
      ...(initial?.images || {}),
    },
    intelligence: {
      ...DEFAULT_PROJECT_PARAMS.intelligence,
      ...(initial?.intelligence || {}),
    },
    audio: {
      ...DEFAULT_PROJECT_PARAMS.audio,
      ...(initial?.audio || {}),
    },
    voice: {
      ...DEFAULT_PROJECT_PARAMS.voice,
      ...(initial?.voice || {}),
    },
    storage: {
      ...DEFAULT_PROJECT_PARAMS.storage,
      ...(initial?.storage || {}),
    },
    upscale: {
      ...DEFAULT_PROJECT_PARAMS.upscale,
      ...(initial?.upscale || {}),
    },
  };
}

// =============================================================================
// B2B2C SERVICE PROVIDER PRESETS & CLIENT MARGIN CALCULATOR
// =============================================================================

export type ServiceVerticalPresetId =
  | 'hybrid_memoir_15m'
  | 'hybrid_memoir_10m'
  | 'real_estate_tour_90s'
  | 'education_module_5m'
  | 'brand_story_2m';

export interface ServiceVerticalPresetSpec {
  id: ServiceVerticalPresetId;
  suggestedRetailUsd: number;
  defaultRevisionRounds: number;
  hybridVideoShare: number;
  params: FullProjectParameters;
}

export const SERVICE_PROVIDER_PRESETS: Record<
  ServiceVerticalPresetId,
  ServiceVerticalPresetSpec
> = {
  hybrid_memoir_15m: {
    id: 'hybrid_memoir_15m',
    suggestedRetailUsd: 300,
    defaultRevisionRounds: 2,
    hybridVideoShare: 0.25,
    params: {
      scenes: { count: 10, segmentsPerScene: 6, takesPerSegment: 1 },
      video: {
        engine: 'lowest-cost',
        segmentDuration: 5,
        totalMinutes: 15,
        hybridVideoShare: 0.25,
      },
      images: {
        keyFrames: 18,
        retakesPerFrame: 0,
        finalImages: 6,
        characterHeadshots: 3,
        model: 'imagen4',
      },
      intelligence: {
        audienceResonanceAnalyses: 1,
        blueprintOptimizations: 1,
        blueprintRefines: 2,
      },
      audio: {
        totalMinutes: 14,
        dialogueLines: 0,
        soundEffects: 6,
        musicTracks: 2,
      },
      voice: {
        voiceClones: 0,
        voiceMinutes: 0,
      },
      storage: {
        expectedStorageGB: 8,
        activeMonths: 1,
      },
      upscale: {
        upscaleMinutes: 0,
        useInstant: false,
      },
    },
  },
  hybrid_memoir_10m: {
    id: 'hybrid_memoir_10m',
    suggestedRetailUsd: 249,
    defaultRevisionRounds: 2,
    hybridVideoShare: 0.25,
    params: {
      scenes: { count: 8, segmentsPerScene: 5, takesPerSegment: 1 },
      video: {
        engine: 'lowest-cost',
        segmentDuration: 5,
        totalMinutes: 10,
        hybridVideoShare: 0.25,
      },
      images: {
        keyFrames: 12,
        retakesPerFrame: 0,
        finalImages: 4,
        characterHeadshots: 2,
        model: 'imagen4',
      },
      intelligence: {
        audienceResonanceAnalyses: 1,
        blueprintOptimizations: 1,
        blueprintRefines: 2,
      },
      audio: {
        totalMinutes: 10,
        dialogueLines: 0,
        soundEffects: 4,
        musicTracks: 2,
      },
      voice: {
        voiceClones: 0,
        voiceMinutes: 0,
      },
      storage: {
        expectedStorageGB: 6,
        activeMonths: 1,
      },
      upscale: {
        upscaleMinutes: 0,
        useInstant: false,
      },
    },
  },
  real_estate_tour_90s: {
    id: 'real_estate_tour_90s',
    suggestedRetailUsd: 199,
    defaultRevisionRounds: 1,
    hybridVideoShare: 0.5,
    params: {
      scenes: { count: 6, segmentsPerScene: 2, takesPerSegment: 1 },
      video: {
        engine: SCENEFLOW_ENGINE_ID,
        qualityTier: 'standard',
        segmentDuration: 8,
        totalMinutes: 1.5,
        hybridVideoShare: 0.5,
      },
      images: {
        keyFrames: 12,
        retakesPerFrame: 0,
        finalImages: 6,
        characterHeadshots: 1,
        model: 'imagen4',
      },
      intelligence: {
        audienceResonanceAnalyses: 1,
        blueprintOptimizations: 1,
        blueprintRefines: 1,
      },
      audio: {
        totalMinutes: 1.5,
        dialogueLines: 10,
        soundEffects: 4,
        musicTracks: 1,
      },
      voice: {
        voiceClones: 0,
        voiceMinutes: 1.5,
      },
      storage: {
        expectedStorageGB: 5,
        activeMonths: 1,
      },
      upscale: {
        upscaleMinutes: 0,
        useInstant: false,
      },
    },
  },
  education_module_5m: {
    id: 'education_module_5m',
    suggestedRetailUsd: 399,
    defaultRevisionRounds: 2,
    hybridVideoShare: 0.35,
    params: {
      scenes: { count: 8, segmentsPerScene: 5, takesPerSegment: 1 },
      video: {
        engine: 'fast-economical',
        segmentDuration: 8,
        totalMinutes: 5,
        hybridVideoShare: 0.35,
      },
      images: {
        keyFrames: 24,
        retakesPerFrame: 0,
        finalImages: 8,
        characterHeadshots: 2,
        model: 'imagen4',
      },
      intelligence: {
        audienceResonanceAnalyses: 1,
        blueprintOptimizations: 1,
        blueprintRefines: 2,
      },
      audio: {
        totalMinutes: 5,
        dialogueLines: 30,
        soundEffects: 6,
        musicTracks: 1,
      },
      voice: {
        voiceClones: 0,
        voiceMinutes: 5,
      },
      storage: {
        expectedStorageGB: 5,
        activeMonths: 1,
      },
      upscale: {
        upscaleMinutes: 0,
        useInstant: false,
      },
    },
  },
  brand_story_2m: {
    id: 'brand_story_2m',
    suggestedRetailUsd: 450,
    defaultRevisionRounds: 2,
    hybridVideoShare: 0.6,
    params: {
      scenes: { count: 5, segmentsPerScene: 3, takesPerSegment: 1 },
      video: {
        engine: SCENEFLOW_ENGINE_ID,
        qualityTier: 'cinematic',
        segmentDuration: 8,
        totalMinutes: 2,
        hybridVideoShare: 0.6,
      },
      images: {
        keyFrames: 15,
        retakesPerFrame: 1,
        finalImages: 5,
        characterHeadshots: 2,
        model: 'imagen4',
      },
      intelligence: {
        audienceResonanceAnalyses: 1,
        blueprintOptimizations: 1,
        blueprintRefines: 2,
      },
      audio: {
        totalMinutes: 2,
        dialogueLines: 16,
        soundEffects: 8,
        musicTracks: 1,
      },
      voice: {
        voiceClones: 0,
        voiceMinutes: 2,
      },
      storage: {
        expectedStorageGB: 5,
        activeMonths: 1,
      },
      upscale: {
        upscaleMinutes: 0,
        useInstant: false,
      },
    },
  },
};

export interface ClientQuoteMarginAnalysis {
  baseProjectCredits: number;
  intakeAndFeedbackCredits: number;
  revisionBufferCredits: number;
  recommendedCreditCeiling: number;
  sceneFlowCogsUsd: number;
  clientPriceUsd: number;
  providerGrossProfitUsd: number;
  providerGrossMarginPercent: number;
  suggestedRetailFloorUsd: number;
  healthyMargin: boolean;
}

/**
 * Calculates Provider unit economics, recommended per-project credit ceiling,
 * and net profit margin for a Customer order.
 */
export function calculateClientQuoteMargin(input: {
  baseProjectCredits: number;
  clientPriceUsd: number;
  includedRevisionRounds?: number;
  perExtraRoundBufferRatio?: number;
}): ClientQuoteMarginAnalysis {
  const baseProjectCredits = Math.max(0, Math.round(Number(input.baseProjectCredits) || 0));
  const clientPriceUsd = Math.max(0, Number(input.clientPriceUsd) || 0);
  const rounds = Math.max(0, Math.min(10, Math.round(input.includedRevisionRounds ?? 2)));
  const ratio =
    typeof input.perExtraRoundBufferRatio === 'number'
      ? Math.max(0, Math.min(0.5, input.perExtraRoundBufferRatio))
      : 0.08;

  // Onboarding AI interview (~20 cr) + synthesis passes (~15 cr/round)
  const intakeAndFeedbackCredits = 20 + rounds * 15;
  const revisionBufferCredits = Math.round(baseProjectCredits * (rounds * ratio));
  const recommendedCreditCeiling =
    baseProjectCredits + intakeAndFeedbackCredits + revisionBufferCredits;
  const sceneFlowCogsUsd = Number(
    (recommendedCreditCeiling / CREDIT_EXCHANGE_RATE).toFixed(2)
  );
  const providerGrossProfitUsd = Number((clientPriceUsd - sceneFlowCogsUsd).toFixed(2));
  const providerGrossMarginPercent =
    clientPriceUsd > 0
      ? Number(((providerGrossProfitUsd / clientPriceUsd) * 100).toFixed(1))
      : 0;
  // Price required to achieve a 65% gross margin
  const suggestedRetailFloorUsd = Math.ceil(sceneFlowCogsUsd / 0.35);

  return {
    baseProjectCredits,
    intakeAndFeedbackCredits,
    revisionBufferCredits,
    recommendedCreditCeiling,
    sceneFlowCogsUsd,
    clientPriceUsd,
    providerGrossProfitUsd,
    providerGrossMarginPercent,
    suggestedRetailFloorUsd,
    healthyMargin: providerGrossMarginPercent >= 50 && providerGrossProfitUsd > 0,
  };
}
