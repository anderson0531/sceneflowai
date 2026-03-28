/**
 * AI Model Configuration
 * 
 * Centralized configuration for all AI model versions used in SceneFlow.
 * Allows easy switching between cost tiers and quality levels.
 * 
 * Pricing Reference (Jan 2026):
 * 
 * Veo Video Generation:
 * - veo-3.0-fast-generate-preview: ~$0.15-0.25/sec (Fast, 1080p)
 * - veo-3.1-generate-preview: ~$0.75/sec (Premium, 4K capable)
 * 
 * Imagen Image Generation:
 * - imagen-3.0-fast-generate-001: ~$0.02/image (Fast)
 * - imagen-3.0-generate-001: ~$0.04/image (Standard)
 * - imagen-3.0-capability-001: ~$0.05/image (With reference images)
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

/** Unified quality type for video/image clients */
export type ModelQuality = 'fast' | 'standard';

// =============================================================================
// VIDEO GENERATION MODELS (Veo)
// =============================================================================

export type VeoQualityTier = 'fast' | 'premium';

export const VEO_MODELS = {
  /** Veo 3.1 Fast - ~$0.20/sec, 1080p, faster generation, supports FTV (lastFrame) */
  fast: 'veo-3.1-fast-generate-preview',
  
  /** Veo 3.1 Premium - ~$0.75/sec, 4K capable, best quality, supports FTV (lastFrame) */
  premium: 'veo-3.1-generate-preview',
} as const;

/** Default Veo quality tier (cost-optimized) */
export const DEFAULT_VEO_QUALITY: VeoQualityTier = 'fast';

/**
 * Default quality tier for FTV (Frame-to-Video) interpolation
 * Fast tier is more stable for FTV interpolation (March 2026)
 * Premium tier has better "motion reasoning" but may crash due to VRAM limits
 * Set FTV_USE_PREMIUM=true to use premium tier for FTV (higher quality, less stable)
 */
export const DEFAULT_FTV_QUALITY: VeoQualityTier = 
  process.env.FTV_USE_PREMIUM === 'true' ? 'premium' : 'fast';

/** Get Veo model name for quality tier */
export function getVeoModel(quality: VeoQualityTier | ModelQuality = DEFAULT_VEO_QUALITY): string {
  // Map 'standard' to 'premium' for backward compatibility
  const tier = quality === 'standard' ? 'premium' : (quality as VeoQualityTier);
  return VEO_MODELS[tier] || VEO_MODELS.fast;
}

/**
 * Get the appropriate quality tier for a generation method
 * FTV uses premium by default for better interpolation quality
 */
export function getQualityForMethod(method: string, requestedQuality?: VeoQualityTier | ModelQuality): VeoQualityTier {
  // If quality explicitly requested, use it
  if (requestedQuality) {
    return requestedQuality === 'standard' ? 'premium' : (requestedQuality as VeoQualityTier);
  }
  // FTV (Frame-to-Video) benefits significantly from premium tier's motion reasoning
  if (method === 'FTV') {
    return DEFAULT_FTV_QUALITY;
  }
  // All other methods use default (fast)
  return DEFAULT_VEO_QUALITY;
}

/** Estimated cost per second for each Veo tier */
export const VEO_COST_PER_SECOND = {
  fast: 0.20,     // ~$0.15-0.25/sec average
  premium: 0.75,  // ~$0.75/sec
} as const;

/** Estimated cost for 8-second video */
export function getVeoCostEstimate(quality: VeoQualityTier = DEFAULT_VEO_QUALITY, durationSeconds: number = 8): number {
  return VEO_COST_PER_SECOND[quality] * durationSeconds;
}

// =============================================================================
// IMAGE GENERATION MODELS (Imagen)
// =============================================================================

export type ImagenQualityTier = 'fast' | 'standard' | 'capability';

export const IMAGEN_MODELS = {
  /** Imagen 3 Fast - ~$0.02/image, faster generation */
  fast: 'imagen-3.0-fast-generate-001',
  
  /** Imagen 3 Standard - ~$0.04/image, balanced quality/speed */
  standard: 'imagen-3.0-generate-001',
  
  /** Imagen 3 Capability - ~$0.05/image, required for reference images (character consistency) */
  capability: 'imagen-3.0-capability-001',
} as const;

/** Default Imagen quality tier (cost-optimized) */
export const DEFAULT_IMAGEN_QUALITY: ImagenQualityTier = 'fast';

/** 
 * Get Imagen model name for quality tier
 * Note: If reference images are provided, always uses 'capability' model
 */
export function getImagenModel(
  quality: ImagenQualityTier | ModelQuality = DEFAULT_IMAGEN_QUALITY,
  hasReferenceImages: boolean = false
): string {
  // Reference images require capability model regardless of quality setting
  if (hasReferenceImages) {
    return IMAGEN_MODELS.capability;
  }
  // Handle ModelQuality type (fast/standard)
  const tier = quality as ImagenQualityTier;
  return IMAGEN_MODELS[tier] || IMAGEN_MODELS.fast;
}

/** Estimated cost per image for each Imagen tier */
export const IMAGEN_COST_PER_IMAGE = {
  fast: 0.02,
  standard: 0.04,
  capability: 0.05,
} as const;

// =============================================================================
// ENVIRONMENT OVERRIDES
// =============================================================================

/**
 * Get Veo quality from environment variable or default
 * Set VEO_QUALITY=premium in environment to use premium tier
 */
export function getEnvVeoQuality(): VeoQualityTier {
  const envQuality = process.env.VEO_QUALITY?.toLowerCase();
  if (envQuality === 'premium' || envQuality === 'max' || envQuality === 'quality') {
    return 'premium';
  }
  return DEFAULT_VEO_QUALITY;
}

/**
 * Get Imagen quality from environment variable or default
 * Set IMAGEN_QUALITY=standard in environment to use standard tier
 */
export function getEnvImagenQuality(): ImagenQualityTier {
  const envQuality = process.env.IMAGEN_QUALITY?.toLowerCase();
  if (envQuality === 'standard') {
    return 'standard';
  }
  if (envQuality === 'capability' || envQuality === 'reference') {
    return 'capability';
  }
  return DEFAULT_IMAGEN_QUALITY;
}

// =============================================================================
// TEXT GENERATION MODELS (Gemini)
// =============================================================================

/**
 * Model Configuration for 2026 Vertex AI Environment
 */

export type GeminiThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

// 1. PRIMARY PREVIEW MODELS
export const GEMINI_TEXT_MODELS = {
  '3-flash': 'gemini-3-flash-preview', 
  '3-pro': 'gemini-3-pro-preview',
} as const;

/** Previous models, kept for fallback reference */
export const GEMINI_TEXT_MODELS_PREVIOUS = {
  '2.5-flash': 'gemini-2.5-flash',
} as const;

/**
 * Resolves the correct model ID based on desired tier and depth.
 * This is the function called by your Route.ts and Gemini.ts.
 */
export function getGeminiTextModel(
  tier: 'flash' | 'pro' = 'flash'
): string {
  // Use the major version alias for maximum compatibility with the preview registry
  if (tier === 'pro') return 'gemini-3-pro-preview';
  return 'gemini-3-flash-preview';
}

/**
 * Configuration for the 'thinking' parameter in Gemini.
 * Translates abstract levels to concrete budget numbers for older models.
 * 
 * - Gemini 2.5: numeric thinkingBudget (0 = disabled, up to 24576)
 * - Gemini 3.0+: string thinkingLevel ('minimal' | 'low' | 'medium' | 'high')
 * 
 * Returns undefined if no thinking config should be sent.
 */
export function buildThinkingConfig(
  model: string,
  options: { thinkingBudget?: number; thinkingLevel?: GeminiThinkingLevel }
): Record<string, any> | undefined {
  const family = getModelFamily(model);

  if (family === '3.0') {
    // Gemini 3.0+: string-based thinking levels
    if (options.thinkingLevel) {
      return { thinkingBudget: options.thinkingLevel };
    }
    // Map legacy numeric 0 → 'minimal' for backward compat
    if (options.thinkingBudget === 0) {
      return { thinkingBudget: 'minimal' };
    }
    return undefined; // Let model use its default
  }

  // Gemini 2.5: numeric thinking budget
  if (options.thinkingBudget !== undefined) {
    return { thinkingBudget: options.thinkingBudget };
  }
  return undefined;
}

// =============================================================================
// BACKWARD COMPATIBILITY ALIASES
// =============================================================================

/** Alias for backward compatibility with video clients */
export const DEFAULT_VIDEO_QUALITY: ModelQuality = 'fast';

/** Alias for backward compatibility with image clients */
export const DEFAULT_IMAGE_QUALITY: ModelQuality = 'fast';
