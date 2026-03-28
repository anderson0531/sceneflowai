/**
 * Vertex AI Gemini Client
 * 
 * Unified client for all Gemini model access via Vertex AI.
 * Replaces direct Gemini API calls (generativelanguage.googleapis.com) with
 * Vertex AI endpoints (aiplatform.googleapis.com) for pay-as-you-go billing.
 * 
 * Supports:
 * - Text generation (Gemini 2.0/3.0 Flash, Pro)
 * - Vision analysis (multimodal with images)
 * - Image generation (Gemini 3 Pro Image Preview → Imagen 4)
 * 
 * @see GEMINI_MIGRATION.md for migration details
 */

import { getVertexAIAuthToken } from './client'
import { fetchWithRetry } from '../utils/retry'
import { 
  getDefaultGeminiSafetySettings, 
  getImagenSafetyFilterLevel, 
  getImagenPersonGeneration,
  type SafetySetting 
} from './safety'
import { 
  getGeminiTextModel, 
  buildThinkingConfig,
  GEMINI_TEXT_MODELS_PREVIOUS,
  type GeminiThinkingLevel 
} from '../config/modelConfig'

// =============================================================================
// Configuration
// =============================================================================

export interface VertexGeminiConfig {
  projectId?: string
  location?: string
}

function getConfig(): { projectId: string; location: string } {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID must be configured for Vertex AI')
  }
  
  return { projectId, location }
}

// =============================================================================
// Text Generation (LLM)
// =============================================================================

export interface TextGenerationOptions {
  model?: string
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  responseMimeType?: 'text/plain' | 'application/json'
  systemInstruction?: string
  /** Safety settings for content filtering (default: BLOCK_ONLY_HIGH for all categories) */
  safetySettings?: SafetySetting[]
  /** Maximum retry attempts for 429/transient errors (default: 3) */
  maxRetries?: number
  /** Initial retry delay in ms (default: 1000) */
  initialDelayMs?: number
  /** Timeout in ms for the entire request including retries (default: 90000) */
  timeoutMs?: number
  /** 
   * Thinking budget for Gemini 2.5 models (numeric: 0-24576, 0 disables).
   * For Gemini 3.0+ models, use thinkingLevel instead. If both are set,
   * thinkingLevel takes precedence on 3.0+ models.
   * Default: undefined (auto/dynamic thinking)
   */
  thinkingBudget?: number
  /**
   * Thinking level for Gemini 3.0+ models.
   * 'minimal' = fastest (replaces thinkingBudget: 0)
   * 'low' | 'medium' | 'high' = increasing reasoning depth
   * Ignored on Gemini 2.5 models (use thinkingBudget instead).
   */
  thinkingLevel?: GeminiThinkingLevel
  /**
   * Seed for deterministic output. Same seed + same input = same output.
   * Useful for scoring consistency across repeated analysis runs.
   */
  seed?: number
  /**
   * Vertex AI location/region. Gemini 3 models automatically use 'global'.
   * Default: VERTEX_LOCATION env var or 'us-central1'
   */
  location?: string
}

export interface TextGenerationResult {
  text: string
  finishReason?: string
  safetyRatings?: Array<{ category: string; probability: string }>
}

/**
 * Generate text using Gemini via Vertex AI
 * Replaces direct calls to generativelanguage.googleapis.com
 */
export async function generateText(
  prompt: string,
  options: TextGenerationOptions = {}
): Promise<TextGenerationResult> {
  const { projectId, location: defaultLocation } = getConfig()
  // Trim the model name to remove any leading/trailing whitespace, including newlines
  const model = (options.model || getGeminiTextModel()).trim()
  
  // ALWAYS use the regional endpoint. The "global" endpoint is not reliable for Gemini 3.
  const isGemini3Model = model.startsWith('gemini-3')
  const location = options.location || defaultLocation // ALWAYS use regional endpoint
  
  // Vertex AI endpoint for Gemini models
  // Format: https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
  
  const accessToken = await getVertexAIAuthToken()
  
  // Build request body
  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      topP: options.topP ?? 0.9,
      topK: options.topK,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      // Enforce JSON mode by default if not specified
      responseMimeType: options.responseMimeType ?? "application/json",
    }
  }
  
  // Add seed for deterministic output
  if (options.seed !== undefined) {
    requestBody.generationConfig.seed = options.seed
  }

  // Add response mime type if specified
  if (options.responseMimeType) {
    requestBody.generationConfig.responseMimeType = options.responseMimeType
  }
  
  // Add system instruction if provided
  if (options.systemInstruction) {
    requestBody.systemInstruction = {
      role: 'system',
      parts: [{ text: options.systemInstruction }],
    }
  }

  // Handle thinking configuration based on model generation.
  // This is now correctly nested inside generationConfig.
  const thinkingConfig: any = {
    includeThoughts: true, // Always include for better debugging
  };

  const isGemini3Model = model.startsWith('gemini-3');
  if (isGemini3Model) {
    if (options.thinkingLevel) {
      thinkingConfig.thinkingLevel = options.thinkingLevel.toUpperCase();
    }
  } else {
    // Handle legacy thinking budget for older models (e.g., Gemini 2.5)
    if (options.thinkingBudget !== undefined) {
      thinkingConfig.thinkingBudget = options.thinkingBudget;
    }
  }

  if (Object.keys(thinkingConfig).length > 1) { // More than just includeThoughts
    requestBody.generationConfig.thinkingConfig = thinkingConfig;
  }
  
  // Safety settings
  requestBody.safetySettings = options.safetySettings || getDefaultGeminiSafetySettings()
  console.log(`[Vertex Gemini] Safety settings: ${requestBody.safetySettings.map((s: SafetySetting) => `${s.category}=${s.threshold}`).join(', ')}`)
  
  console.log(`[Vertex Gemini] Generating text with ${model}...`)
  
  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    },
    {
      maxRetries: options.maxRetries ?? 3,
      initialDelayMs: options.initialDelayMs ?? 1000,
      operationName: `Vertex Gemini ${model}`,
      timeoutMs: options.timeoutMs ?? 90000, // Default 90s timeout per request
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    
    // Model fallback: if 404 (model not found) and using a Gemini 3 model,
    // retry with the previous-generation model (gemini-2.5-flash)
    if (response.status === 404 && isGemini3Model && !options._isFallbackAttempt) {
      const fallbackModel = GEMINI_TEXT_MODELS_PREVIOUS['2.5-flash']; // Correctly reference the fallback model
      console.warn(`[Vertex Gemini] Model "${model}" returned 404, falling back to "${fallbackModel}"`)
      
      // Translate 3.0 thinkingLevel → 2.5 thinkingBudget to prevent unrestricted thinking OOM
      const thinkingLevelToBudget: Record<GeminiThinkingLevel, number> = {
        minimal: 0,
        low: 1024,
        medium: 8192,
        high: 24576,
      }
      const fallbackOptions = { ...options }
      if (fallbackOptions.thinkingLevel) {
        fallbackOptions.thinkingBudget = thinkingLevelToBudget[fallbackOptions.thinkingLevel]
        delete fallbackOptions.thinkingLevel
        console.warn(`[Vertex Gemini] Translated thinkingLevel "${options.thinkingLevel}" → thinkingBudget ${fallbackOptions.thinkingBudget} for ${fallbackModel}`)
      }
      
      return generateText(prompt, {
        ...fallbackOptions,
        model: fallbackModel,
        _isFallbackAttempt: true,
      } as TextGenerationOptions & { _isFallbackAttempt?: boolean })
    }
    
    console.error('[Vertex Gemini] Error:', errorText)
    throw new Error(`Vertex AI Gemini error ${response.status}: ${errorText}`)
  }
  
  const data = await response.json()
  
  const candidate = data.candidates?.[0]
  if (!candidate) {
    throw new Error('No candidates in Vertex AI response')
  }
  
  // 🔥 "Thought Pollution" Fix: Filter out thought parts before joining.
  const text = candidate.content?.parts
    ?.filter((part: any) => !part.thought)
    .map((part: any) => part.text)
    .join('')
    .trim()

  if (!text) {
    // If text is empty after filtering, check for thoughts to provide better debugging
    const thoughts = candidate.content?.parts?.filter((part: any) => part.thought).map((part: any) => part.text).join('\n');
    if (thoughts) {
      console.error('[Vertex Gemini] Response contained only thoughts, no text output:', thoughts);
      throw new Error('LLM response contained only thoughts, resulting in empty output.');
    }
    throw new Error('No text content in Vertex AI response after filtering thoughts')
  }
  
  return {
    text,
    finishReason: candidate.finishReason,
    safetyRatings: candidate.safetyRatings
  }
}

// =============================================================================
// Vision Analysis (Multimodal)
// =============================================================================

export interface VisionPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string  // base64
  }
}

export interface VisionGenerationOptions extends TextGenerationOptions {
  // Vision-specific options can be added here
}

/**
 * Generate content with vision (image + text) using Gemini via Vertex AI
 * Replaces @google/generative-ai SDK for vision tasks
 */
export async function generateWithVision(
  parts: VisionPart[],
  options: VisionGenerationOptions = {}
): Promise<TextGenerationResult> {
  const { projectId, location } = getConfig()
  // Use central model constant for vision by default
  const model = options.model || getGeminiTextModel()
  
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
  
  const accessToken = await getVertexAIAuthToken()
  
  // Convert parts to Vertex AI format
  const vertexParts = parts.map(part => {
    if (part.text) {
      return { text: part.text }
    }
    if (part.inlineData) {
      return {
        inlineData: {
          mimeType: part.inlineData.mimeType,
          data: part.inlineData.data
        }
      }
    }
    return part
  })
  
  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: vertexParts
      }
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      topP: options.topP ?? 0.9,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
    },
    // Add safety settings for vision (default: BLOCK_ONLY_HIGH for creative content)
    safetySettings: options.safetySettings || getDefaultGeminiSafetySettings()
  }
  
  if (options.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: options.systemInstruction }]
    }
  }
  
  console.log(`[Vertex Gemini Vision] Generating with ${model}...`)
  console.log(`[Vertex Gemini Vision] Safety settings applied: ${requestBody.safetySettings.map((s: SafetySetting) => s.threshold).join(', ')}`)
  
  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    },
    {
      maxRetries: options.maxRetries ?? 3,
      initialDelayMs: options.initialDelayMs ?? 1000,
      operationName: `Vertex Gemini Vision ${model}`,
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Vertex Gemini Vision] Error:', errorText)
    throw new Error(`Vertex AI Vision error ${response.status}: ${errorText}`)
  }
  
  const data = await response.json()
  
  const candidate = data.candidates?.[0]
  if (!candidate) {
    throw new Error('No candidates in Vertex AI vision response')
  }
  
  const text = candidate.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('No text content in Vertex AI vision response')
  }
  
  return {
    text,
    finishReason: candidate.finishReason,
    safetyRatings: candidate.safetyRatings
  }
}

// =============================================================================
// Image Generation (Imagen 4 via Vertex AI)
// =============================================================================

export interface ImageGenerationOptions {
  aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4' | '2:3' | '3:2' | '4:5' | '5:4' | '21:9'
  numberOfImages?: number
  negativePrompt?: string
  personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
  referenceImages?: Array<{
    referenceId: number
    base64Image?: string
    imageUrl?: string
    subjectDescription?: string
    referenceType?: 'REFERENCE_TYPE_SUBJECT'
    subjectType?: 'SUBJECT_TYPE_PERSON' | 'SUBJECT_TYPE_PRODUCT'
  }>
}

/**
 * Generate image using Imagen 4 via Vertex AI
 * Replaces Gemini 3 Pro Image Preview calls to generativelanguage.googleapis.com
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  const { projectId, location } = getConfig()
  
  // Use Imagen 4 for image generation
  // - imagen-3.0-capability-001 for subject customization (with reference images)
  // - imagen-3.0-generate-001 for standard generation
  const hasReferenceImages = options.referenceImages && options.referenceImages.length > 0
  const model = hasReferenceImages 
    ? 'imagen-3.0-capability-001'
    : 'imagen-3.0-generate-001'
  
  console.log(`[Vertex Imagen] Generating image with ${model}...`)
  console.log('[Vertex Imagen] Prompt:', prompt.substring(0, 200))
  console.log('[Vertex Imagen] Has references:', hasReferenceImages)
  
  const accessToken = await getVertexAIAuthToken()
  
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`
  
  // Build request body
  // Use configurable safety settings from environment (default: block_few for creative content)
  const safetySetting = getImagenSafetyFilterLevel()
  const personGeneration = options.personGeneration || getImagenPersonGeneration()
  
  console.log('[Vertex Imagen] Safety settings:', { safetySetting, personGeneration })
  
  const requestBody: any = {
    instances: [{
      prompt: prompt
    }],
    parameters: {
      sampleCount: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || '16:9',
      safetySetting: safetySetting,
      personGeneration: personGeneration
    }
  }
  
  // Add negative prompt (only for non-capability models)
  if (!hasReferenceImages && options.negativePrompt) {
    requestBody.parameters.negativePrompt = options.negativePrompt
  }
  
  // Add reference images for subject customization
  if (hasReferenceImages) {
    const referenceImagesArray = []
    
    for (const ref of options.referenceImages!) {
      let base64Data = ref.base64Image
      
      // Download from URL if needed
      if (!base64Data && ref.imageUrl) {
        console.log(`[Vertex Imagen] Downloading reference from: ${ref.imageUrl.substring(0, 50)}...`)
        const imageResponse = await fetch(ref.imageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to download reference image: ${imageResponse.status}`)
        }
        const imageBuffer = await imageResponse.arrayBuffer()
        base64Data = Buffer.from(imageBuffer).toString('base64')
      }
      
      if (!base64Data) {
        console.warn(`[Vertex Imagen] Reference ${ref.referenceId}: No image data, skipping`)
        continue
      }
      
      referenceImagesArray.push({
        referenceType: ref.referenceType || 'REFERENCE_TYPE_SUBJECT',
        referenceId: ref.referenceId,
        referenceImage: {
          bytesBase64Encoded: base64Data
        },
        subjectImageConfig: {
          subjectType: ref.subjectType || 'SUBJECT_TYPE_PERSON',
          subjectDescription: ref.subjectDescription || 'a person'
        }
      })
      
      console.log(`[Vertex Imagen] Added reference ${ref.referenceId}: ${ref.subjectDescription || 'person'}`)
    }
    
    if (referenceImagesArray.length > 0) {
      requestBody.instances[0].referenceImages = referenceImagesArray
    }
  }
  
  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      operationName: `Vertex Imagen ${model}`,
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Vertex Imagen] Error:', errorText)
    
    let hint = ''
    if (response.status === 403) {
      hint = 'IAM permission denied. Ensure service account has roles/aiplatform.user.'
    } else if (response.status === 404) {
      hint = `Model ${model} not found in region ${location}.`
    }
    
    throw new Error(`Vertex AI Imagen error ${response.status}: ${errorText}. ${hint}`)
  }
  
  const data = await response.json()
  
  const predictions = data?.predictions
  if (!predictions || predictions.length === 0) {
    throw new Error('Image generation was filtered due to content policies. Try adjusting the prompt.')
  }
  
  const imageBytes = predictions[0]?.bytesBase64Encoded
  if (!imageBytes) {
    throw new Error('Unexpected response format from Vertex AI Imagen')
  }
  
  console.log('[Vertex Imagen] Image generated successfully')
  return `data:image/png;base64,${imageBytes}`
}

// =============================================================================
// Convenience exports
// =============================================================================

export { getVertexAIAuthToken } from './client'

// =============================================================================
// Cache-Aware Text Generation
// =============================================================================

import {
  isVertexCachingEnabled,
  getOrCreateCache,
  generateWithCache,
  getCacheEntryByResourceName,
  type CacheZone,
  type CacheContentPart,
  type CacheEntry,
  type CacheAwareGenerationResult,
} from './cacheManager'

import { logCacheEvent } from './cacheObservability'

export type { CacheZone, CacheContentPart, CacheEntry, CacheAwareGenerationResult }

export interface CacheAwareTextGenerationOptions extends TextGenerationOptions {
  /**
   * Enable cache-aware generation. When true and ENABLE_VERTEX_CACHING=true,
   * the system instruction + contextParts will be cached on Vertex AI,
   * and only the userPrompt will be sent as uncached input.
   */
  cacheZone?: CacheZone
  /**
   * SceneFlow project ID for cache scoping.
   * Required when cacheZone is set.
   */
  sceneflowProjectId?: string
  /**
   * Content parts to cache alongside the system instruction.
   * These are the "heavy" parts (master script, style guide, transcript, etc.)
   * that remain identical across sequential requests.
   */
  cacheContextParts?: CacheContentPart[]
  /**
   * Existing cache resource name from a previous call.
   * When provided, skips cache creation and references the existing cache directly.
   * This is used when the frontend passes a cache_id from its Zustand store.
   */
  cacheResourceName?: string
  /**
   * Cache TTL in minutes (default: 60).
   */
  cacheTtlMinutes?: number
  /**
   * Skip caching entirely (e.g., for BYOK users who bypass platform auth).
   * When true, falls back to standard generateText() even if caching is enabled.
   */
  skipCache?: boolean
}

/**
 * Cache-aware text generation.
 * 
 * When caching conditions are met (feature flag on, zone specified, context parts
 * exceed token minimum), this function:
 *   1. Creates or reuses a CachedContent resource on Vertex AI
 *   2. Sends only the user's prompt as uncached input
 *   3. Returns the result with cache metadata
 * 
 * When caching conditions are NOT met, falls back seamlessly to the standard
 * generateText() function — zero behavior change for existing callers.
 * 
 * @example
 * ```typescript
 * // Cache-aware call (Script Doctor zone)
 * const result = await generateTextCacheAware(
 *   editInstruction,
 *   {
 *     cacheZone: 'script_doctor',
 *     sceneflowProjectId: projectId,
 *     systemInstruction: SCENEFLOW_CREATIVE_SYSTEM_INSTRUCTION,
 *     cacheContextParts: [
 *       { text: `<master_script>${fullScript}</master_script>` },
 *       { text: `<characters>${characterBreakdown}</characters>` },
 *     ],
 *     temperature: 0.7,
 *     maxOutputTokens: 16384,
 *   }
 * )
 * 
 * // result.cacheEntry contains the cache reference for follow-up calls
 * ```
 */
export async function generateTextCacheAware(
  prompt: string,
  options: CacheAwareTextGenerationOptions = {}
): Promise<TextGenerationResult & { cacheEntry?: CacheEntry; usedCache?: boolean; usageMetadata?: any }> {
  const {
    cacheZone,
    sceneflowProjectId,
    cacheContextParts,
    cacheResourceName,
    cacheTtlMinutes,
    ...standardOptions
  } = options

    const _cacheStartTime = Date.now()

  // Build full prompt by prepending cache context parts when falling back to uncached generation.
  // This ensures scene data, formatting rules, and JSON schemas aren't lost when caching is disabled.
  const buildFullPrompt = (): string => {
    if (!cacheContextParts || cacheContextParts.length === 0) return prompt
    const contextPrefix = cacheContextParts
      .map(p => p.text || '')
      .filter(Boolean)
      .join('\n\n')
    return contextPrefix ? `${contextPrefix}\n\n${prompt}` : prompt
  }

  // ── Fast path: caching disabled or not requested ──
  if (!cacheZone || !isVertexCachingEnabled() || options.skipCache) {
    const result = await generateText(buildFullPrompt(), standardOptions)
    return { ...result, usedCache: false }
  }

  // ── Path A: Existing cache reference from frontend ──
  if (cacheResourceName) {
    try {
      const cacheEntry = await getCacheEntryByResourceName(cacheResourceName)
      if (cacheEntry) {
        console.log(`[Vertex Gemini] Using existing cache: ${cacheEntry.cacheId}`)
        const cachedResult = await generateWithCache(cacheEntry, prompt, {
          temperature: standardOptions.temperature,
          maxOutputTokens: standardOptions.maxOutputTokens,
          topP: standardOptions.topP,
          topK: standardOptions.topK,
          responseMimeType: standardOptions.responseMimeType,
          thinkingLevel: standardOptions.thinkingLevel,
          thinkingBudget: standardOptions.thinkingBudget,
          safetySettings: standardOptions.safetySettings,
          maxRetries: standardOptions.maxRetries,
          initialDelayMs: standardOptions.initialDelayMs,
          timeoutMs: standardOptions.timeoutMs,
          seed: standardOptions.seed,
        })
        return {
          text: cachedResult.text,
          finishReason: cachedResult.finishReason,
          safetyRatings: cachedResult.safetyRatings,
          usedCache: true,
          cacheEntry: cachedResult.cacheEntry,
          usageMetadata: cachedResult.usageMetadata,
        }
      }
      console.warn(`[Vertex Gemini] Cache ${cacheResourceName} not found, falling back to uncached`)
    } catch (error: any) {
      console.warn(`[Vertex Gemini] Cached generation failed, falling back: ${error.message}`)
    }
    
    // Fall through to uncached path (include context parts in prompt)
    const result = await generateText(buildFullPrompt(), standardOptions)
    return { ...result, usedCache: false }
  }

  // ── Path B: Create-or-reuse cache, then generate ──
  if (sceneflowProjectId && cacheContextParts && cacheContextParts.length > 0 && standardOptions.systemInstruction) {
    try {
      const cacheEntry = await getOrCreateCache(
        sceneflowProjectId,
        cacheZone,
        standardOptions.systemInstruction,
        cacheContextParts,
        {
          model: standardOptions.model,
          ttlMinutes: cacheTtlMinutes,
        }
      )

      if (cacheEntry) {
        console.log(`[Vertex Gemini] Cache ready (${cacheEntry.cacheId}), generating with cache`)
        const cachedResult = await generateWithCache(cacheEntry, prompt, {
          temperature: standardOptions.temperature,
          maxOutputTokens: standardOptions.maxOutputTokens,
          topP: standardOptions.topP,
          topK: standardOptions.topK,
          responseMimeType: standardOptions.responseMimeType,
          thinkingLevel: standardOptions.thinkingLevel,
          thinkingBudget: standardOptions.thinkingBudget,
          safetySettings: standardOptions.safetySettings,
          maxRetries: standardOptions.maxRetries,
          initialDelayMs: standardOptions.initialDelayMs,
          timeoutMs: standardOptions.timeoutMs,
          seed: standardOptions.seed,
        })
        return {
          text: cachedResult.text,
          finishReason: cachedResult.finishReason,
          safetyRatings: cachedResult.safetyRatings,
          usedCache: true,
          cacheEntry: cachedResult.cacheEntry,
          usageMetadata: cachedResult.usageMetadata,
        }
      }
    } catch (error: any) {
      console.warn(`[Vertex Gemini] Cache-aware generation failed, falling back: ${error.message}`)
    }
  }

  // ── Fallback: standard uncached generation (include context parts in prompt) ──
  const result = await generateText(buildFullPrompt(), standardOptions)
  return { ...result, usedCache: false }
}
