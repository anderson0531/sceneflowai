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
  /** Veo 3 Fast - ~$0.15-0.25/sec, 1080p, faster generation */
  fast: 'veo-3.0-fast-generate-preview',
  
  /** Veo 3.1 Premium - ~$0.75/sec, 4K capable, best quality */
  premium: 'veo-3.1-generate-preview',
} as const;

/** Default Veo quality tier (cost-optimized) */
export const DEFAULT_VEO_QUALITY: VeoQualityTier = 'fast';

/** Get Veo model name for quality tier */
export function getVeoModel(quality: VeoQualityTier | ModelQuality = DEFAULT_VEO_QUALITY): string {
  // Map 'standard' to 'premium' for backward compatibility
  const tier = quality === 'standard' ? 'premium' : (quality as VeoQualityTier);
  return VEO_MODELS[tier] || VEO_MODELS.fast;
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
// BACKWARD COMPATIBILITY ALIASES
// =============================================================================

/** Alias for backward compatibility with video clients */
export const DEFAULT_VIDEO_QUALITY: ModelQuality = 'fast';

/** Alias for backward compatibility with image clients */
export const DEFAULT_IMAGE_QUALITY: ModelQuality = 'fast';
