/**
 * Vertex AI Gemini Client
 */

import { GoogleAuth } from 'google-auth-library'
import { getVertexAIAuthToken } from './client'
import { fetchWithRetry, fullJitterDelayMs, parseRetryAfterMs } from '../utils/retry'
import {
  ByokRateLimitError,
  parseGoogleServiceAccountJson,
  type ResolvedVertexCredential,
} from '@/lib/byok/resolveProviderCredential'
import {
  getNextGeminiFallbackModel,
  isGeminiQuotaError,
} from './geminiTextFallback'
import { recordModelDowngrade } from './modelTelemetry'
import { recordLlmTelemetry } from './llmTelemetry'
import { priorityPaygoHeaders } from './priorityPaygo'
import { 
  getDefaultGeminiSafetySettings, 
  getImagenPersonGeneration,
  getImagenSafetyFilterLevel,
  type SafetySetting 
} from './safety'
import {
  getGeminiTextModel,
  normalizeGeminiTextModel,
  type GeminiThinkingLevel,
} from '../config/modelConfig'

// =============================================================================
// Configuration
// =============================================================================

export interface VertexGeminiConfig {
  projectId?: string
  location?: string
}

const byokGeminiAuthClientCache = new Map<string, Promise<any>>()

async function getByokGeminiAccessToken(serviceAccountJson: string): Promise<{
  accessToken: string
  projectId: string
}> {
  const parsed = parseGoogleServiceAccountJson(serviceAccountJson)
  if (!parsed) {
    throw new Error('Invalid BYOK Google Service Account JSON for Gemini text generation')
  }
  const cacheKey = `${parsed.project_id}:${parsed.client_email}`
  let clientPromise = byokGeminiAuthClientCache.get(cacheKey)
  if (!clientPromise) {
    const auth = new GoogleAuth({
      credentials: parsed,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })
    clientPromise = auth.getClient().catch((err) => {
      byokGeminiAuthClientCache.delete(cacheKey)
      throw err
    })
    byokGeminiAuthClientCache.set(cacheKey, clientPromise)
  }
  const client = await clientPromise
  const tokenResponse = await client.getAccessToken()
  if (!tokenResponse?.token) {
    throw new Error('Failed to mint OAuth2 access token for BYOK service account')
  }
  return { accessToken: tokenResponse.token, projectId: parsed.project_id }
}

function getPlatformProjectIds(): string[] {
  const fromList = (process.env.VERTEX_PROJECT_IDS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (fromList.length > 0) return fromList
  const fallback = (process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID || '').trim()
  return fallback ? [fallback] : []
}

function getConfig(): { projectId: string; projectIds: string[]; location: string } {
  const projectIds = getPlatformProjectIds()
  const projectId = projectIds[0]
  const location = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID must be configured for Vertex AI')
  }
  
  return { projectId, projectIds, location }
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
  /** Optional AbortSignal to cancel the Vertex request and any retry sleeps. */
  signal?: AbortSignal
  /** Logical workflow surface for LLM telemetry (e.g. 'blueprint', 'script_chunk', 'audience_resonance'). */
  surface?: string
  /** Optional project ID for unit-economics telemetry attribution. */
  projectId?: string
  /** Optional user ID for unit-economics telemetry attribution. */
  userId?: string
  /** Optional resolved BYOK Google credential (API key or Service Account JSON). */
  byokCredential?: ResolvedVertexCredential
}

export type GenerateTextOptions = TextGenerationOptions

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
  usageMetadata?: {
    promptTokenCount?: number
    cachedContentTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
    thoughtsTokenCount?: number
  }
}

/**
 * Resolve Gemini 3 thinking_level from explicit thinkingLevel or legacy numeric thinkingBudget.
 * Prevents callers passing thinkingBudget (e.g. 1024 for thorough rigor) from silently
 * collapsing to 'LOW' on Gemini 3 models.
 */
export function resolveGemini3ThinkingLevel(
  thinkingLevel?: GeminiThinkingLevel,
  thinkingBudget?: number
): 'LOW' | 'MEDIUM' | 'HIGH' {
  const validLevels = ['LOW', 'MEDIUM', 'HIGH'] as const
  if (thinkingLevel) {
    if (thinkingLevel === 'minimal') return 'LOW'
    const upper = thinkingLevel.toUpperCase()
    return (validLevels as readonly string[]).includes(upper)
      ? (upper as 'LOW' | 'MEDIUM' | 'HIGH')
      : 'LOW'
  }
  if (typeof thinkingBudget === 'number') {
    if (thinkingBudget <= 0) return 'LOW'
    if (thinkingBudget >= 1024) return 'HIGH'
    if (thinkingBudget >= 256) return 'MEDIUM'
  }
  return 'LOW'
}

type InternalTextGenerationOptions = TextGenerationOptions & {
  /** Preserved across fallbacks so the result can report the original ask. */
  _requestedModel?: string
  /** Internal: platform project IDs already tried on 429 for the current model. */
  _triedProjectIds?: ReadonlySet<string>
}

/**
 * Generate text using Gemini via Vertex AI
 * Replaces direct calls to generativelanguage.googleapis.com
 */
export async function generateText(
  prompt: string,
  options: TextGenerationOptions = {}
): Promise<TextGenerationResult> {
  const callerModel = (options.model || getGeminiTextModel('flash')).trim()
  const model = normalizeGeminiTextModel(callerModel)
  const requestedModel = (options as InternalTextGenerationOptions)._requestedModel || callerModel

  try {
    return await generateTextWithModel(prompt, { ...options, model }, model)
  } catch (err) {
    if (err instanceof ByokRateLimitError) {
      // Never fall back to platform credentials when BYOK hits 429
      throw err
    }
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
          _triedProjectIds: undefined,
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
  const byokCred = options.byokCredential?.source === 'byok' ? options.byokCredential : undefined
  const isByok = Boolean(byokCred)

  const model = normalizeGeminiTextModel(resolvedModel);
  const isGemini3 = model.includes('gemini-3');
  const isPreview = model.includes('preview');
  const apiVersion = isPreview ? 'v1beta1' : 'v1';

  const requestStartTime = Date.now();

  // 2. CONSTRUCT CLEAN THINKING CONFIG
  const isThinkingModel = model.includes('gemini-3') || model.includes('gemini-2.5');
  const thinking_config: any = { include_thoughts: false };

  if (isThinkingModel) {
    if (isGemini3) {
      thinking_config.thinking_level = resolveGemini3ThinkingLevel(
        options.thinkingLevel,
        options.thinkingBudget
      );
    } else {
      const budgets = { minimal: 0, low: 1024, medium: 4096, high: 8192 };
      const budget = options.thinkingBudget ?? budgets[options.thinkingLevel as keyof typeof budgets] ?? 1024;
      thinking_config.thinking_budget = budget;
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
      top_p: options.topP ?? 0.95,
      ...(typeof options.topK === 'number' ? { top_k: options.topK } : {}),
      ...(typeof options.seed === 'number' ? { seed: options.seed } : {}),
      max_output_tokens: options.maxOutputTokens ?? 8192,
      response_mime_type: options.responseMimeType ?? 'application/json',
      ...(isThinkingModel ? { thinking_config } : {})
    },
    safety_settings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" }
    ]
  };

  if (options.systemInstruction) {
    requestBody.system_instruction =
      byokCred?.mode === 'byok_api_key'
        ? { parts: [{ text: options.systemInstruction }] }
        : {
            role: 'system',
            parts: [{ text: options.systemInstruction }],
          };
  }

  const timeoutToUse = options.timeoutMs || 90000
  const maxRetries = options.maxRetries ?? 3

  // Resolve target execution list: BYOK (single credential, zero fallback to platform)
  // vs platform (rotates across VERTEX_PROJECT_IDS on 429 before model downgrade).
  let response: Response | undefined
  if (byokCred?.mode === 'byok_api_key' && byokCred.apiKey) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      byokCred.apiKey
    )}`
    console.log(`[Vertex Gemini] Requesting ${model} via BYOK Gemini Developer API`)
    try {
      response = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          ...(options.signal ? { signal: options.signal } : {}),
        },
        { maxRetries, timeoutMs: timeoutToUse, signal: options.signal }
      )
    } catch (err: any) {
      if (err?.status === 429 || isGeminiQuotaError(err)) {
        throw new ByokRateLimitError(
          `BYOK Gemini API rate limited (429) on ${model}: ${err?.message || 'quota exceeded'}`,
          {
            provider: 'vertex',
            status: 429,
            retryAfterMs: typeof err?.retryAfterMs === 'number' ? err.retryAfterMs : undefined,
            bucketNamespace: byokCred.bucketNamespace,
          }
        )
      }
      throw err
    }
  } else if (byokCred?.mode === 'byok_service_account' && byokCred.serviceAccountJson) {
    const minted = await getByokGeminiAccessToken(byokCred.serviceAccountJson)
    const projectId = byokCred.projectId || minted.projectId
    const defaultLocation = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1'
    const location = isGemini3 ? 'global' : (options.location || defaultLocation)
    const baseUrl =
      location === 'global'
        ? 'https://aiplatform.googleapis.com'
        : `https://${location}-aiplatform.googleapis.com`
    const endpoint = `${baseUrl}/${apiVersion}/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
    console.log(`[Vertex Gemini] Requesting ${model} via BYOK Vertex SA (${projectId}/${location})`)
    try {
      response = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${minted.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          ...(options.signal ? { signal: options.signal } : {}),
        },
        { maxRetries, timeoutMs: timeoutToUse, signal: options.signal }
      )
    } catch (err: any) {
      if (err?.status === 429 || isGeminiQuotaError(err)) {
        throw new ByokRateLimitError(
          `BYOK Vertex AI rate limited (429) on ${model}: ${err?.message || 'quota exceeded'}`,
          {
            provider: 'vertex',
            status: 429,
            retryAfterMs: typeof err?.retryAfterMs === 'number' ? err.retryAfterMs : undefined,
            bucketNamespace: byokCred.bucketNamespace,
          }
        )
      }
      throw err
    }
  } else {
    const { projectIds, location: defaultLocation } = getConfig()
    const location = isGemini3 ? 'global' : (options.location || defaultLocation)
    const baseUrl =
      location === 'global'
        ? 'https://aiplatform.googleapis.com'
        : `https://${location}-aiplatform.googleapis.com`
    const accessToken = await getVertexAIAuthToken()

    const tried = new Set(options._triedProjectIds ?? [])
    const orderedProjects = projectIds.filter((id) => !tried.has(id))
    const candidates = orderedProjects.length > 0 ? orderedProjects : projectIds

    let lastErr: unknown
    for (let pIdx = 0; pIdx < candidates.length; pIdx++) {
      const projectId = candidates[pIdx]
      const endpoint = `${baseUrl}/${apiVersion}/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
      console.log(`[Vertex Gemini] Requesting ${model} via ${location} (${apiVersion})`)
      try {
        response = await fetchWithRetry(
          endpoint,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              ...priorityPaygoHeaders(),
            },
            body: JSON.stringify(requestBody),
            ...(options.signal ? { signal: options.signal } : {}),
          },
          { maxRetries, timeoutMs: timeoutToUse, signal: options.signal }
        )
        break
      } catch (err: any) {
        lastErr = err
        const is429 = err?.status === 429 || isGeminiQuotaError(err)
        if (is429 && pIdx + 1 < candidates.length) {
          console.warn(
            `[Vertex Gemini] 429 on project ${projectId} for ${model}; rotating to next project in VERTEX_PROJECT_IDS`
          )
          continue
        }
        throw err
      }
    }
    if (!response) {
      throw lastErr || new Error(`Vertex AI request failed for ${model}`)
    }
  }

  const isOk = response.ok;
  const status = response.status;

  if (!isOk) {
    const errorText = await response.text();
    if (status === 429 && isByok && byokCred) {
      throw new ByokRateLimitError(
        `BYOK Gemini rate limited (429) on ${model}: ${errorText.slice(0, 200)}`,
        {
          provider: 'vertex',
          status: 429,
          retryAfterMs: parseRetryAfterMs(response.headers?.get?.('retry-after')) ?? undefined,
          bucketNamespace: byokCred.bucketNamespace,
        }
      )
    }

    if (status === 404 && isGemini3 && !options.disableModelFallback) {
      // Chain 3.5 → 3.1-lite → 2.5 instead of leaping straight to 2.5.
      const fallbackModel = getNextGeminiFallbackModel(model)
      if (fallbackModel) {
        recordModelDowngrade({
          requestedModel: options._requestedModel || model,
          resolvedModel: fallbackModel,
          reason: 'model_not_found',
          httpStatus: 404,
        });
        return generateText(prompt, {
          ...options,
          model: fallbackModel,
          thinkingLevel: fallbackModel.includes('2.5') ? 'low' : options.thinkingLevel,
          _requestedModel: options._requestedModel || model,
        } as InternalTextGenerationOptions);
      }
    }
    
    throw new Error(`Vertex AI error ${status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((part: any) => !part.thought)
    .map((part: any) => part.text).join('').trim();

  const requestedModelId = options._requestedModel || model;
  const finishReason = data.candidates?.[0]?.finishReason;

  recordLlmTelemetry({
    surface: options.surface || 'general',
    providerBackend: 'vertex',
    requestedModel: requestedModelId,
    servedModel: model,
    downgraded: requestedModelId !== model,
    usedCache: Boolean(data.usageMetadata?.cachedContentTokenCount),
    usageMetadata: data.usageMetadata,
    latencyMs: Date.now() - requestStartTime,
    finishReason,
    status: 'success',
    projectId: options.projectId,
    userId: options.userId,
  });

  return {
    text,
    safetyRatings: data.candidates?.[0]?.safetyRatings,
    finishReason,
    modelId: model,
    requestedModelId,
    downgraded: requestedModelId !== model,
    usageMetadata: data.usageMetadata,
  };
}

export async function streamText(
  prompt: string,
  options: TextGenerationOptions = {}
): Promise<Response> {
  const byokCred = options.byokCredential?.source === 'byok' ? options.byokCredential : undefined
  const isByok = Boolean(byokCred)

  // 1. RESOLVE MODEL & DYNAMIC LOCATION
  const model = normalizeGeminiTextModel(
    (options.model || getGeminiTextModel('flash')).trim()
  );
  const isGemini3 = model.includes('gemini-3');
  const isPreview = model.includes('preview');
  const apiVersion = isPreview ? 'v1beta1' : 'v1';

  // 2. CONSTRUCT CLEAN THINKING CONFIG
  const isThinkingModel = model.includes('gemini-3') || model.includes('gemini-2.5');
  const isMinimal = options.thinkingLevel === 'minimal' || options.thinkingBudget === 0;
  const thinking_config: any = { include_thoughts: false };

  if (isThinkingModel) {
    if (isGemini3) {
      const validLevels = ['LOW', 'MEDIUM', 'HIGH'];
      const level = isMinimal ? 'LOW' : (options.thinkingLevel || 'LOW').toUpperCase();
      thinking_config.thinking_level = validLevels.includes(level) ? level : 'LOW';
    } else {
      const budgets = { minimal: 0, low: 1024, medium: 4096, high: 8192 };
      const budget = options.thinkingBudget ?? budgets[options.thinkingLevel as keyof typeof budgets] ?? 1024;
      thinking_config.thinking_budget = budget;
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
      ...(isThinkingModel ? { thinking_config } : {})
    },
    safety_settings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" }
    ]
  };

  if (options.systemInstruction) {
    requestBody.system_instruction =
      byokCred?.mode === 'byok_api_key'
        ? { parts: [{ text: options.systemInstruction }] }
        : {
            role: 'system',
            parts: [{ text: options.systemInstruction }],
          };
  }

  // Resolve target endpoints + auth headers
  let targets: Array<{ endpoint: string; headers: Record<string, string>; label: string }> = []
  if (byokCred?.mode === 'byok_api_key' && byokCred.apiKey) {
    targets = [
      {
        endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${encodeURIComponent(
          byokCred.apiKey
        )}`,
        headers: { 'Content-Type': 'application/json' },
        label: 'BYOK Gemini Developer API',
      },
    ]
  } else if (byokCred?.mode === 'byok_service_account' && byokCred.serviceAccountJson) {
    const minted = await getByokGeminiAccessToken(byokCred.serviceAccountJson)
    const projectId = byokCred.projectId || minted.projectId
    const defaultLocation = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1'
    const location = isGemini3 ? 'global' : (options.location || defaultLocation)
    const baseUrl =
      location === 'global'
        ? 'https://aiplatform.googleapis.com'
        : `https://${location}-aiplatform.googleapis.com`
    targets = [
      {
        endpoint: `${baseUrl}/${apiVersion}/projects/${projectId}/locations/${location}/publishers/google/models/${model}:streamGenerateContent`,
        headers: {
          Authorization: `Bearer ${minted.accessToken}`,
          'Content-Type': 'application/json',
        },
        label: `BYOK Vertex SA (${projectId}/${location})`,
      },
    ]
  } else {
    const { projectIds, location: defaultLocation } = getConfig()
    const location = isGemini3 ? 'global' : (options.location || defaultLocation)
    const baseUrl =
      location === 'global'
        ? 'https://aiplatform.googleapis.com'
        : `https://${location}-aiplatform.googleapis.com`
    const accessToken = await getVertexAIAuthToken()
    targets = projectIds.map((projectId) => ({
      endpoint: `${baseUrl}/${apiVersion}/projects/${projectId}/locations/${location}/publishers/google/models/${model}:streamGenerateContent`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...priorityPaygoHeaders(),
      },
      label: `${location} (${apiVersion})`,
    }))
  }

  // Initial HTTP handshake with jittered 429 Retry-After handling (up to 2 retries)
  const MAX_STREAM_429_RETRIES = 2
  let response: Response | undefined
  let lastErrorText = ''
  let lastRetryAfterMs: number | null = null

  for (let attempt = 0; attempt <= MAX_STREAM_429_RETRIES; attempt++) {
    const target = targets[attempt % targets.length]
    console.log(`[Vertex Gemini Streaming] Requesting ${model} via ${target.label}`)
    response = await fetch(target.endpoint, {
      method: 'POST',
      headers: target.headers,
      body: JSON.stringify(requestBody),
      ...(options.signal ? { signal: options.signal } : {}),
    })

    if (response.status !== 429) {
      break
    }

    lastRetryAfterMs = parseRetryAfterMs(response.headers?.get?.('retry-after'))
    lastErrorText = await response.text().catch(() => '')

    if (attempt < MAX_STREAM_429_RETRIES) {
      const delayMs = fullJitterDelayMs({
        attempt,
        baseMs: 2_000,
        capMs: 15_000,
        retryAfterMs: lastRetryAfterMs ?? 0,
      })
      console.warn(
        `[Vertex Gemini Streaming] 429 on handshake (attempt ${attempt + 1}/${MAX_STREAM_429_RETRIES + 1}); retrying in ${delayMs}ms`
      )
      await new Promise<void>((resolve, reject) => {
        if (options.signal?.aborted) {
          const aborted = new Error('Operation aborted')
          aborted.name = 'AbortError'
          reject(aborted)
          return
        }
        const timer = setTimeout(() => {
          options.signal?.removeEventListener('abort', onAbort)
          resolve()
        }, delayMs)
        const onAbort = () => {
          clearTimeout(timer)
          const aborted = new Error('Operation aborted')
          aborted.name = 'AbortError'
          reject(aborted)
        }
        options.signal?.addEventListener('abort', onAbort, { once: true })
      })
    }
  }

  if (!response || !response.ok) {
    const status = response?.status ?? 500
    const errorText = status === 429 && lastErrorText ? lastErrorText : await response?.text().catch(() => '') ?? ''
    if (status === 429 && isByok && byokCred) {
      throw new ByokRateLimitError(
        `BYOK Gemini Streaming rate limited (429) on ${model}: ${errorText.slice(0, 200)}`,
        {
          provider: 'vertex',
          status: 429,
          retryAfterMs: lastRetryAfterMs ?? undefined,
          bucketNamespace: byokCred.bucketNamespace,
        }
      )
    }
    throw new Error(`Vertex AI Streaming error ${status}: ${errorText}`);
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
  fileData?: {
    mimeType: string
    fileUri: string
  }
  videoMetadata?: {
    startOffset?: string
    endOffset?: string
  }
}

export interface VisionGenerationOptions extends TextGenerationOptions {
  // Vision-specific options can be added here
}

/** Default wall clock for a vision generateContent call, matching generateText. */
export const DEFAULT_GEMINI_VISION_TIMEOUT_MS = 90_000

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
  const model = normalizeGeminiTextModel(
    (options.model || getGeminiTextModel('flash')).trim()
  )

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
      const built: Record<string, unknown> = {
        inlineData: {
          mimeType: part.inlineData.mimeType,
          data: part.inlineData.data
        }
      }
      if (part.videoMetadata) {
        built.videoMetadata = part.videoMetadata
      }
      return built
    }
    if (part.fileData) {
      const built: Record<string, unknown> = {
        fileData: {
          mimeType: part.fileData.mimeType,
          fileUri: part.fileData.fileUri
        }
      }
      if (part.videoMetadata) {
        built.videoMetadata = part.videoMetadata
      }
      return built
    }
    return part
  })
  
  const isThinkingModel = model.includes('gemini-3') || model.includes('gemini-2.5')

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.2,
    topP: options.topP ?? 0.9,
    maxOutputTokens: options.maxOutputTokens ?? 8192,
  }
  if (options.responseMimeType) {
    generationConfig.responseMimeType = options.responseMimeType
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
    } else if (isThinkingModel && isMinimal && isGemini3) {
      // Omitting thinkingConfig leaves Gemini 3 on dynamic HIGH thinking, which
      // spends maxOutputTokens and latency budgets before JSON output finishes.
      generationConfig.thinkingConfig = { includeThoughts: false, thinkingLevel: 'LOW' }
    } else if (isThinkingModel && isMinimal && !isGemini3) {
      // Omitting the config leaves Gemini 2.5 on dynamic thinking, which spends
      // the output budget before the answer is finished.
      generationConfig.thinkingConfig = { thinkingBudget: 0 }
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
  
  const timeoutToUse = options.timeoutMs || DEFAULT_GEMINI_VISION_TIMEOUT_MS
  const maxRetries = options.maxRetries ?? 3

  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...priorityPaygoHeaders()
      },
      body: JSON.stringify(requestBody)
    },
    {
      maxRetries,
      timeoutMs: timeoutToUse,
      initialDelayMs: options.initialDelayMs ?? 1000,
      operationName: `Vertex Gemini Vision ${model}`,
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    const isGemini3 = model.includes('gemini-3')
    const fallbackModel = getNextGeminiFallbackModel(model)
    if (
      response.status === 404 &&
      isGemini3 &&
      fallbackModel &&
      !options.disableModelFallback
    ) {
      console.warn(
        `[Vertex Gemini Vision] 404 for ${model}. Falling back to ${fallbackModel}.`
      )
      recordModelDowngrade({
        requestedModel: model,
        resolvedModel: fallbackModel,
        reason: 'model_not_found',
        httpStatus: 404,
      })
      return generateWithVision(parts, {
        ...options,
        model: fallbackModel,
      })
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
    .filter((part: { thought?: boolean }) => !part.thought)
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
    safetyRatings: candidate.safetyRatings,
    modelId: model,
    requestedModelId: model,
    downgraded: false,
    usageMetadata: data.usageMetadata,
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

  // ── Fast path: caching disabled, BYOK, or not requested ──
  if (
    !cacheZone ||
    !isVertexCachingEnabled() ||
    options.skipCache ||
    options.byokCredential?.source === 'byok'
  ) {
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
        const servedModel = standardOptions.model || getGeminiTextModel('flash')
        recordLlmTelemetry({
          surface: standardOptions.surface || cacheZone || 'cached_general',
          providerBackend: 'vertex',
          requestedModel: servedModel,
          servedModel,
          downgraded: false,
          usedCache: true,
          usageMetadata: cachedResult.usageMetadata,
          latencyMs: Date.now() - _cacheStartTime,
          finishReason: cachedResult.finishReason,
          status: 'success',
          projectId: standardOptions.projectId || sceneflowProjectId,
          userId: standardOptions.userId,
        })
        return {
          text: cachedResult.text,
          finishReason: cachedResult.finishReason,
          safetyRatings: cachedResult.safetyRatings,
          modelId: servedModel,
          requestedModelId: servedModel,
          downgraded: false,
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
        const servedModel = standardOptions.model || getGeminiTextModel('flash')
        recordLlmTelemetry({
          surface: standardOptions.surface || cacheZone || 'cached_general',
          providerBackend: 'vertex',
          requestedModel: servedModel,
          servedModel,
          downgraded: false,
          usedCache: true,
          usageMetadata: cachedResult.usageMetadata,
          latencyMs: Date.now() - _cacheStartTime,
          finishReason: cachedResult.finishReason,
          status: 'success',
          projectId: standardOptions.projectId || sceneflowProjectId,
          userId: standardOptions.userId,
        })
        return {
          text: cachedResult.text,
          finishReason: cachedResult.finishReason,
          safetyRatings: cachedResult.safetyRatings,
          modelId: servedModel,
          requestedModelId: servedModel,
          downgraded: false,
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
