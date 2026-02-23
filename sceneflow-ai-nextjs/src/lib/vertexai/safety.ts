/**
 * Vertex AI Safety Configuration
 * 
 * Centralized safety settings for all Vertex AI services (Gemini, Imagen, Veo).
 * These settings allow SceneFlow to reduce overly restrictive guardrails while
 * maintaining appropriate content filtering for professional film production.
 * 
 * Key differences from consumer Gemini:
 * - Adjustable thresholds per harm category
 * - Configurable via environment variables
 * - Creative context system instructions
 * 
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-attributes
 */

// =============================================================================
// Harm Categories (Gemini text/vision)
// =============================================================================

/**
 * Vertex AI Gemini harm categories
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-attributes#harm-categories
 */
export const HarmCategory = {
  HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
  HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
  HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  // Gemini 2.x+ categories
  HARM_CATEGORY_CIVIC_INTEGRITY: 'HARM_CATEGORY_CIVIC_INTEGRITY',
} as const

export type HarmCategoryType = typeof HarmCategory[keyof typeof HarmCategory]

/**
 * Harm block thresholds - controls what probability level triggers blocking
 * BLOCK_NONE: Don't block any content (enterprise/regional restrictions may apply)
 * BLOCK_ONLY_HIGH: Only block high probability harmful content (most permissive public)
 * BLOCK_MEDIUM_AND_ABOVE: Block medium and high probability (moderate)
 * BLOCK_LOW_AND_ABOVE: Block low, medium, and high probability (strictest)
 */
export const HarmBlockThreshold = {
  BLOCK_NONE: 'BLOCK_NONE',
  BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
  BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_LOW_AND_ABOVE: 'BLOCK_LOW_AND_ABOVE',
} as const

export type HarmBlockThresholdType = typeof HarmBlockThreshold[keyof typeof HarmBlockThreshold]

export interface SafetySetting {
  category: HarmCategoryType
  threshold: HarmBlockThresholdType
}

// =============================================================================
// Default Safety Settings (Gemini)
// =============================================================================

/**
 * Get the configured Gemini safety threshold from environment
 * Default: BLOCK_ONLY_HIGH (most permissive public setting)
 */
export function getGeminiSafetyThreshold(): HarmBlockThresholdType {
  const envThreshold = process.env.VERTEX_SAFETY_THRESHOLD
  
  if (envThreshold && Object.values(HarmBlockThreshold).includes(envThreshold as HarmBlockThresholdType)) {
    return envThreshold as HarmBlockThresholdType
  }
  
  // Default to BLOCK_ONLY_HIGH for creative content flexibility
  return HarmBlockThreshold.BLOCK_ONLY_HIGH
}

/**
 * Default safety settings for Gemini text/vision generation
 * Uses BLOCK_ONLY_HIGH by default for creative content flexibility
 * Can be overridden via VERTEX_SAFETY_THRESHOLD environment variable
 */
export function getDefaultGeminiSafetySettings(): SafetySetting[] {
  const threshold = getGeminiSafetyThreshold()
  
  return [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold },
  ]
}

// =============================================================================
// Imagen Safety Settings
// =============================================================================

/**
 * Imagen safety filter levels
 * block_few: Least restrictive (recommended for creative/artistic content)
 * block_some: Moderate filtering (current default in most code)
 * block_most: Strict filtering
 */
export type ImagenSafetyFilterLevel = 'block_few' | 'block_some' | 'block_most'

/**
 * Imagen person generation settings
 * allow_all: Allow all person generation including public figures (T2V)
 * allow_adult: Allow adult person generation (I2V, standard generation)
 * dont_allow: Disable person generation entirely
 */
export type ImagenPersonGeneration = 'allow_all' | 'allow_adult' | 'dont_allow'

/**
 * Get the configured Imagen safety filter level from environment
 * Default: block_few (least restrictive for creative content)
 */
export function getImagenSafetyFilterLevel(): ImagenSafetyFilterLevel {
  const envLevel = process.env.IMAGEN_SAFETY_FILTER_LEVEL
  
  if (envLevel && ['block_few', 'block_some', 'block_most'].includes(envLevel)) {
    return envLevel as ImagenSafetyFilterLevel
  }
  
  // Default to block_few for creative content flexibility
  return 'block_few'
}

/**
 * Get the configured Imagen person generation setting from environment
 * Default: allow_adult
 */
export function getImagenPersonGeneration(): ImagenPersonGeneration {
  const envSetting = process.env.IMAGEN_PERSON_GENERATION
  
  if (envSetting && ['allow_all', 'allow_adult', 'dont_allow'].includes(envSetting)) {
    return envSetting as ImagenPersonGeneration
  }
  
  return 'allow_adult'
}

// =============================================================================
// Veo Safety Settings
// =============================================================================

/**
 * Veo safety settings
 * block_only_high: Least restrictive (recommended for cinematic content)
 * block_few: Low filtering
 * block_some: Moderate filtering
 * block_most: Strict filtering (default if not configured)
 */
export type VeoSafetySetting = 'block_only_high' | 'block_few' | 'block_some' | 'block_most'

/**
 * Get the configured Veo safety setting from environment
 * Default: block_only_high (least restrictive for cinematic content)
 */
export function getVeoSafetySetting(): VeoSafetySetting {
  const envSetting = process.env.VEO_SAFETY_SETTING
  
  if (envSetting && ['block_only_high', 'block_few', 'block_some', 'block_most'].includes(envSetting)) {
    return envSetting as VeoSafetySetting
  }
  
  return 'block_only_high'
}

// =============================================================================
// Creative System Instructions
// =============================================================================

/**
 * Default creative context system instruction for SceneFlow
 * Provides context that this is a professional film production tool
 * to help reduce false positives on dramatic/cinematic content
 */
export const SCENEFLOW_CREATIVE_SYSTEM_INSTRUCTION = `You are a creative assistant for SceneFlow, a professional film and video production platform.

Context: You assist screenwriters, directors, and filmmakers with:
- Screenplay development and dialogue writing
- Visual storyboarding and shot descriptions
- Character development and narrative arcs
- Cinematic scene descriptions and action sequences

Guidelines:
- Prioritize artistic expression and cinematic storytelling
- Support dramatic tension, conflict, and emotional depth appropriate for film
- Assist with genre-appropriate content (drama, thriller, action, comedy, etc.)
- Provide professional, production-ready creative output
- Focus on narrative quality and visual storytelling craft`

/**
 * System instruction for JSON-only responses (e.g., blueprint generation)
 */
export const JSON_RESPONSE_SYSTEM_INSTRUCTION = `${SCENEFLOW_CREATIVE_SYSTEM_INSTRUCTION}

Output Format: Return ONLY valid JSON that matches the requested schema. No prose, no markdown, no explanations.`

/**
 * System instruction for visual/cinematography tasks
 */
export const CINEMATOGRAPHY_SYSTEM_INSTRUCTION = `${SCENEFLOW_CREATIVE_SYSTEM_INSTRUCTION}

You are specifically a visual director and cinematographer assistant. Focus on:
- Camera angles, movements, and shot composition
- Lighting design and color grading descriptions
- Visual mood, atmosphere, and aesthetic choices
- Scene blocking and spatial relationships
- Cinematic techniques and visual storytelling`

/**
 * System instruction for image prompt generation
 * Helps generate prompts that work well with Imagen while maintaining creative freedom
 */
export const IMAGE_PROMPT_SYSTEM_INSTRUCTION = `${SCENEFLOW_CREATIVE_SYSTEM_INSTRUCTION}

You generate detailed image prompts for professional film production stills and concept art.
Focus on:
- Specific visual details: lighting, composition, color palette
- Character positioning, expressions, and wardrobe
- Environmental details and atmosphere
- Cinematic framing and professional photography techniques
- Clear, specific descriptions that translate well to image generation

Avoid vague language. Be specific and visually descriptive.`

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Log current safety configuration for debugging
 */
export function logSafetyConfiguration(): void {
  console.log('[Vertex AI Safety] Current configuration:')
  console.log('  Gemini threshold:', getGeminiSafetyThreshold())
  console.log('  Imagen filter level:', getImagenSafetyFilterLevel())
  console.log('  Imagen person generation:', getImagenPersonGeneration())
  console.log('  Veo safety setting:', getVeoSafetySetting())
}

/**
 * Check if a safety-related error indicates content was blocked
 */
export function isContentBlockedError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('safety') ||
      msg.includes('blocked') ||
      msg.includes('filtered') ||
      msg.includes('policy') ||
      msg.includes('content') ||
      msg.includes('harmful')
    )
  }
  return false
}

/**
 * Get a user-friendly message for content blocked errors
 */
export function getContentBlockedMessage(error: unknown): string {
  if (isContentBlockedError(error)) {
    return 'Content was filtered by AI safety systems. Try adjusting the prompt to be less ambiguous or remove potentially sensitive terms. For dramatic scenes, consider using more specific cinematic language.'
  }
  return error instanceof Error ? error.message : 'Unknown error occurred'
}
