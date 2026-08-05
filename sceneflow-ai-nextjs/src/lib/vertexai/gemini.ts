/**
 * Vertex AI Gemini Client
 */

import { getVertexAIAuthToken } from './client'
import { fetchWithRetry } from '../utils/retry'
import {
  getNextGeminiFallbackModel,
  isGeminiQuotaError,
} from './geminiTextFallback'
import { recordModelDowngrade } from './modelTelemetry'
import { 
  getDefaultGeminiSafetySettings, 
  getImagenPersonGeneration,
  getImagenSafetyFilterLevel,
  type SafetySetting 
} from './safety'
import {
  getGeminiTextModel,
  GEMINI_TEXT_MODELS_PREVIOUS,
  type GeminiThinkingLevel,
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
  /**
   * Surface 404/429 as errors instead of silently retrying on an older model.
   * Used by the model preflight probe, which needs the true per-model result.
   */
  disableModelFallback?: boolean
}

export interface TextGenerationResult {
  text: string
  finishReason?: string
  safetyRatings?: Array<{ category: string; probability: string }>
  /** Resolved model id that produced the response (after any fallback). */
  modelId?: string
  /** Model originally asked for, which differs from modelId after a fallback. */
  requestedModelId?: string
  /** True when a fallback ran, i.e. output did not come from the asked-for model. */
  downgraded?: boolean
}

type InternalTextGenerationOptions = TextGenerationOptions & {
  _is404FallbackAttempt?: boolean
  /** Preserved across fallbacks so the result can report the original ask. */
  _requestedModel?: string
}

/**
 * Generate text using Gemini via Vertex AI
 * Replaces direct calls to generativelanguage.googleapis.com
 */
export async function generateText(
  prompt: string,
  options: TextGenerationOptions = {}
): Promise<TextGenerationResult> {
  const model = (options.model || 'gemini-3.1-pro-preview').trim()
  const requestedModel = (options as InternalTextGenerationOptions)._requestedModel || model

  try {
    return await generateTextWithModel(prompt, options, model)
  } catch (err) {
    if (isGeminiQuotaError(err) && !options.disableModelFallback) {
      const nextModel = getNextGeminiFallbackModel(model)
      if (nextModel) {
        recordModelDowngrade({
          requestedModel,
          resolvedModel: nextModel,
          reason: 'quota_exhausted',
          httpStatus: 429,
        })
        const fallbackOptions: InternalTextGenerationOptions = {
          ...options,
          model: nextModel,
          _requestedModel: requestedModel,
        }
        if (nextModel.includes('2.5')) {
          fallbackOptions.thinkingLevel = 'low'
        }
        return generateText(prompt, fallbackOptions)
      }
    }
    throw err
  }
}

async function generateTextWithModel(
  prompt: string,
  options: InternalTextGenerationOptions,
  resolvedModel: string
): Promise<TextGenerationResult> {
  const { projectId, location: defaultLocation } = getConfig();

  const model = resolvedModel;
  const isGemini3 = model.includes('gemini-3');
  const isPreview = model.includes('preview');

  const location = isGemini3 ? 'global' : (options.location || defaultLocation);
  const apiVersion = isPreview ? 'v1beta1' : 'v1';

  const baseUrl = location === 'global' 
    ? 'https://aiplatform.googleapis.com' 
    : `https://${location}-aiplatform.googleapis.com`;

  const endpoint = `${baseUrl}/${apiVersion}/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
  
  const accessToken = await getVertexAIAuthToken();
  
  // 2. CONSTRUCT CLEAN THINKING CONFIG
  const isThinkingModel = model.includes('gemini-3') || model.includes('gemini-2.5');
  const isMinimal = options.thinkingLevel === 'minimal' || options.thinkingBudget === 0;
  const thinking_config: any = { include_thoughts: !isMinimal };

  if (isThinkingModel) {
    if (isGemini3) {
      if (!isMinimal) {
        const validLevels = ['LOW', 'MEDIUM', 'HIGH'];
        const level = (options.thinkingLevel || 'MEDIUM').toUpperCase();
        thinking_config.thinking_level = validLevels.includes(level) ? level : 'LOW';
      }
    } else {
      const budgets = { minimal: 0, low: 1024, medium: 4096, high: 8192 };
      const budget = options.thinkingBudget ?? budgets[options.thinkingLevel as keyof typeof budgets] ?? 1024;
      thinking_config.thinking_budget = budget;
      
      // If budget is 0, we shouldn't send thinking_config at all
      if (budget === 0) {
        thinking_config.include_thoughts = false;
      }
    }
  }

  // 3. ASSEMBLE REQUEST
  const requestBody: any = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generation_config: {
      temperature: options.temperature ?? 0.7,
      top_p: 0.95,
      max_output_tokens: options.maxOutputTokens ?? 8192,
      response_mime_type: options.responseMimeType ?? 'application/json',
      ...(isThinkingModel && !isMinimal ? { thinking_config } : {})
    },
    safety_settings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" }
    ]
  };

  if (options.systemInstruction) {
    requestBody.system_instruction = {
      role: 'system',
      parts: [{ text: options.systemInstruction }],
    };
  }

  console.log(`[Vertex Gemini] Requesting ${model} via ${location} (${apiVersion})`);
  
  const timeoutToUse = options.timeoutMs || 90000
  const maxRetries = options.maxRetries ?? 3

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
    { maxRetries, timeoutMs: timeoutToUse }
  );

  const isOk = response.ok;
  const status = response.status;

  if (!isOk) {
    const errorText = await response.text(); 
    
    if (
      status === 404 &&
      isGemini3 &&
      !options._is404FallbackAttempt &&
      !options.disableModelFallback
    ) {
      const fallbackModel = GEMINI_TEXT_MODELS_PREVIOUS['2.5-flash'];
      recordModelDowngrade({
        requestedModel: options._requestedModel || model,
        resolvedModel: fallbackModel,
        reason: 'model_not_found',
        httpStatus: 404,
      });
      return generateText(prompt, {
        ...options,
        model: fallbackModel,
        thinkingLevel: 'low',
        _is404FallbackAttempt: true,
        _requestedModel: options._requestedModel || model,
      } as InternalTextGenerationOptions);
    }
    
    throw new Error(`Vertex AI error ${status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((part: any) => !part.thought)
    .map((part: any) => part.text).join('').trim();

  const requestedModelId = options._requestedModel || model;

  return {
    text,
    safetyRatings: data.candidates?.[0]?.safetyRatings,
    finishReason: data.candidates?.[0]?.finishReason,
    modelId: model,
    requestedModelId,
    downgraded: requestedModelId !== model,
  };
}

export async function streamText(
  prompt: string,
  options: TextGenerationOptions = {}
): Promise<Response> {
  const { projectId, location: defaultLocation } = getConfig();

  // 1. RESOLVE MODEL & DYNAMIC LOCATION
  const rawModel = options.model || 'gemini-3.1-pro-preview';
  const model = rawModel.trim();
  const isGemini3 = model.includes('gemini-3');
  const isPreview = model.includes('preview');

  const location = isGemini3 ? 'global' : (options.location || defaultLocation);
  const apiVersion = isPreview ? 'v1beta1' : 'v1';

  const baseUrl = location === 'global' 
    ? 'https://aiplatform.googleapis.com' 
    : `https://${location}-aiplatform.googleapis.com`;

  const endpoint = `${baseUrl}/${apiVersion}/projects/${projectId}/locations/${location}/publishers/google/models/${model}:streamGenerateContent`;

  const accessToken = await getVertexAIAuthToken();

  // 2. CONSTRUCT CLEAN THINKING CONFIG
  const isThinkingModel = model.includes('gemini-3') || model.includes('gemini-2.5');
  const isMinimal = options.thinkingLevel === 'minimal' || options.thinkingBudget === 0;
  const thinking_config: any = { include_thoughts: !isMinimal };

  if (isThinkingModel) {
    if (isGemini3) {
      if (!isMinimal) {
        const validLevels = ['LOW', 'MEDIUM', 'HIGH'];
        const level = (options.thinkingLevel || 'MEDIUM').toUpperCase();
        thinking_config.thinking_level = validLevels.includes(level) ? level : 'LOW';
      }
    } else {
      const budgets = { minimal: 0, low: 1024, medium: 4096, high: 8192 };
      const budget = options.thinkingBudget ?? budgets[options.thinkingLevel as keyof typeof budgets] ?? 1024;
      thinking_config.thinking_budget = budget;
      
      // If budget is 0, we shouldn't send thinking_config at all
      if (budget === 0) {
        thinking_config.include_thoughts = false;
      }
    }
  }

  // 3. ASSEMBLE REQUEST
  const requestBody: any = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generation_config: {
      temperature: options.temperature ?? 0.7,
      top_p: 0.95,
      max_output_tokens: 8192,
      response_mime_type: "text/plain", // Change to text/plain for streaming raw markdown
      ...(isThinkingModel && !isMinimal ? { thinking_config } : {})
    },
    safety_settings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" }
    ]
  };

  if (options.systemInstruction) {
    requestBody.system_instruction = {
      role: 'system',
      parts: [{ text: options.systemInstruction }],
    };
  }

  console.log(`[Vertex Gemini Streaming] Requesting ${model} via ${location} (${apiVersion})`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vertex AI Streaming error ${response.status}: ${errorText}`);
  }

  // Return the raw stream directly
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
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
  const { projectId, location: defaultLocation } = getConfig()
  // Use central model constant for vision by default
  const model = options.model || getGeminiTextModel()

  const isGemini3 = model.includes('gemini-3')
  const isPreview = model.includes('preview')
  const location = isGemini3 ? 'global' : (options.location || defaultLocation)
  const apiVersion = isPreview ? 'v1beta1' : 'v1'
  const baseUrl =
    location === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${location}-aiplatform.googleapis.com`
  const endpoint = `${baseUrl}/${apiVersion}/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
  
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
  
  const isThinkingModel = model.includes('gemini-3') || model.includes('gemini-2.5')

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.2,
    topP: options.topP ?? 0.9,
    maxOutputTokens: options.maxOutputTokens ?? 8192,
  }

  const thinkingExplicit =
    options.thinkingLevel !== undefined || options.thinkingBudget !== undefined
  if (thinkingExplicit) {
    const isMinimal = options.thinkingLevel === 'minimal' || options.thinkingBudget === 0
    const thinkingConfig: Record<string, unknown> = { includeThoughts: !isMinimal }

    if (isThinkingModel) {
      if (isGemini3) {
        if (!isMinimal) {
          const validLevels = ['LOW', 'MEDIUM', 'HIGH']
          const level = (options.thinkingLevel || 'MEDIUM').toUpperCase()
          thinkingConfig.thinkingLevel = validLevels.includes(level) ? level : 'LOW'
        }
      } else {
        const budgets = { minimal: 0, low: 1024, medium: 4096, high: 8192 }
        const budget =
          options.thinkingBudget ??
          budgets[options.thinkingLevel as keyof typeof budgets] ??
          1024
        thinkingConfig.thinkingBudget = budget

        if (budget === 0) {
          thinkingConfig.includeThoughts = false
        }
      }
    }

    if (isThinkingModel && !isMinimal) {
      generationConfig.thinkingConfig = thinkingConfig
    }
  }

  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: vertexParts
      }
    ],
    generationConfig,
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
    const isGemini3 = model.includes('3.0') || model.includes('3.1') || model.startsWith('gemini-3')
    if (
      response.status === 404 &&
      isGemini3 &&
      model !== 'gemini-2.5-flash' &&
      !(options as { _isFallbackAttempt?: boolean })._isFallbackAttempt
    ) {
      console.warn(`[Vertex Gemini Vision] 404 for ${model}. Falling back to gemini-2.5-flash.`)
      return generateWithVision(parts, {
        ...options,
        model: 'gemini-2.5-flash',
        _isFallbackAttempt: true,
      } as VisionGenerationOptions & { _isFallbackAttempt?: boolean })
    }
    console.error('[Vertex Gemini Vision] Error:', errorText)
    throw new Error(`Vertex AI Vision error ${response.status}: ${errorText}`)
  }
  
  const data = await response.json()
  
  const candidate = data.candidates?.[0]
  if (!candidate) {
    throw new Error('No candidates in Vertex AI vision response')
  }
  
  const responseParts = candidate.content?.parts ?? []
  const text = responseParts
    .map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join('')
    .trim()
  if (!text) {
    throw new Error(
      `No text content in Vertex AI vision response (finishReason: ${candidate.finishReason ?? 'unknown'})`
    )
  }
  
  return {
    text,
    finishReason: candidate.finishReason,
    safetyRatings: candidate.safetyRatings
  }
}

// =============================================================================
// Image Generation (Gemini Image via Vertex AI)
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
 * Generate image using Gemini Image via Vertex AI.
 *
 * Imagen `:predict` endpoints were retired 2026-06-30, so this delegates to the
 * shared Gemini Image client, which handles reference images, tier fallback, and retries.
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  const { generateImageWithGemini } = await import('@/lib/gemini/imageClient.vertex')

  return generateImageWithGemini(prompt, {
    ...(options.aspectRatio ? { aspectRatio: options.aspectRatio } : {}),
    ...(options.numberOfImages ? { numberOfImages: options.numberOfImages } : {}),
    ...(options.negativePrompt ? { negativePrompt: options.negativePrompt } : {}),
    ...(options.personGeneration ? { personGeneration: options.personGeneration } : {}),
    ...(options.referenceImages?.length
      ? {
          referenceImages: options.referenceImages.map((ref) => ({
            referenceId: ref.referenceId,
            ...(ref.imageUrl ? { imageUrl: ref.imageUrl } : {}),
            ...(ref.base64Image ? { base64Image: ref.base64Image } : {}),
            ...(ref.subjectDescription
              ? { subjectDescription: ref.subjectDescription }
              : {}),
          })),
        }
      : {}),
  })
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
