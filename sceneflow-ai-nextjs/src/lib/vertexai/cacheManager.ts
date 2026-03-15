/**
 * Vertex AI Context Caching Manager
 * 
 * Manages the full lifecycle of Explicit Caching for Gemini on Vertex AI.
 * Reduces input-token costs by 75%+ for iterative editing sessions where
 * the prompt prefix (system instruction, master script, style guide, etc.)
 * stays ≥90% identical across sequential requests.
 * 
 * Lifecycle:
 *   1. getOrCreateCache()  — create a CachedContent resource (or reuse existing)
 *   2. generateWithCache() — send only the user delta; heavy context served from cache
 *   3. heartbeat()         — PATCH the TTL to keep cache alive while user is active
 *   4. invalidate()        — explicitly delete when prefix content changes substantially
 *   5. cleanup()           — delete all caches for a project on session end
 * 
 * Token Minimums (March 2026):
 *   - Gemini Flash models: 2,048 tokens minimum for cached content
 *   - Gemini Pro models:   4,096 tokens minimum for cached content
 * 
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/context-caching/context-cache-overview
 */

import { getVertexAIAuthToken } from './client'
import { fetchWithRetry } from '../utils/retry'
import { getDefaultGeminiSafetySettings, type SafetySetting } from './safety'
import { getGeminiTextModel, getModelFamily, buildThinkingConfig, type GeminiThinkingLevel } from '../config/modelConfig'
import { createHash } from 'crypto'

// =============================================================================
// Feature Flag
// =============================================================================

/**
 * Check if Vertex AI context caching is enabled.
 * Defaults to false — enable with ENABLE_VERTEX_CACHING=true in env.
 */
export function isVertexCachingEnabled(): boolean {
  return process.env.ENABLE_VERTEX_CACHING === 'true'
}

// =============================================================================
// Types
// =============================================================================

/** Zones that can independently hold cached content */
export type CacheZone = 
  | 'script_doctor'        // Zone A: iterative script edits
  | 'style_consistency'    // Zone B: batch animatic/image generation
  | 'multilingual_dubbing' // Zone C: transcript fan-out for translations
  | 'batch_brief'          // Zone C: batch director's brief generation
  | 'batch_script'         // Zone C: batch scene script generation
  | 'scene_direction'      // Scene direction generation
  | 'cue_assistant'        // Cue AI assistant with project context

/** A single content part for caching (text or inline image data) */
export interface CacheContentPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string // base64
  }
}

/** Metadata about an active cache entry */
export interface CacheEntry {
  /** Short ID extracted from resource name */
  cacheId: string
  /** Full Vertex AI resource name: projects/.../cachedContents/... */
  resourceName: string
  /** SHA-256 hash of the cached content for change detection */
  contentHash: string
  /** Which zone this cache belongs to */
  zone: CacheZone
  /** Model used when creating this cache */
  model: string
  /** Vertex AI project ID this cache is bound to */
  projectId: string
  /** Vertex AI location/region this cache is bound to */
  location: string
  /** When this cache expires (ISO 8601) */
  expiresAt: string
  /** Timestamp when cache was created */
  createdAt: string
}

export interface CacheAwareGenerationOptions {
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  responseMimeType?: 'text/plain' | 'application/json'
  thinkingLevel?: GeminiThinkingLevel
  thinkingBudget?: number
  safetySettings?: SafetySetting[]
  maxRetries?: number
  initialDelayMs?: number
  timeoutMs?: number
  seed?: number
}

export interface CacheAwareGenerationResult {
  text: string
  finishReason?: string
  safetyRatings?: Array<{ category: string; probability: string }>
  /** Token usage metadata including cached token breakdown */
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
    cachedContentTokenCount?: number
  }
  /** Whether the response used a cached context */
  usedCache: boolean
  /** The cache entry used (if any) */
  cacheEntry?: CacheEntry
}

// =============================================================================
// Configuration
// =============================================================================

/** Default cache TTL in minutes */
const DEFAULT_TTL_MINUTES = 60

/** Token minimums by model family for caching eligibility */
const TOKEN_MINIMUMS: Record<string, number> = {
  flash: 2048,
  pro: 4096,
  lite: 2048,
}

/** Get the minimum token count for a model to be eligible for caching */
function getTokenMinimum(model: string): number {
  const modelLower = model.toLowerCase()
  if (modelLower.includes('pro')) return TOKEN_MINIMUMS.pro
  if (modelLower.includes('lite')) return TOKEN_MINIMUMS.lite
  return TOKEN_MINIMUMS.flash
}

// =============================================================================
// Content Hashing
// =============================================================================

/**
 * Generate a SHA-256 hash of content parts for change detection.
 * Used to determine if the cached prefix has changed and needs recreation.
 */
function hashContent(systemInstruction: string, parts: CacheContentPart[]): string {
  const hash = createHash('sha256')
  hash.update(systemInstruction)
  for (const part of parts) {
    if (part.text) {
      hash.update(part.text)
    }
    if (part.inlineData) {
      hash.update(part.inlineData.mimeType)
      hash.update(part.inlineData.data)
    }
  }
  return hash.digest('hex')
}

// =============================================================================
// Cache Manager
// =============================================================================

/**
 * In-memory cache registry.
 * 
 * Keys: `${vertexProjectId}:${location}:${sceneflowProjectId}:${zone}`
 * 
 * In serverless (Vercel), this map persists only within a single invocation/
 * warm container. That's acceptable because:
 * - The Zustand store on the client holds the cache_id across requests
 * - The API routes receive cache_id from the client and validate against Vertex AI
 * - This map serves as a fast-path optimization to skip validation on warm containers
 */
const activeCaches = new Map<string, CacheEntry>()

/**
 * Build the composite key for the cache map.
 * Scoped per Vertex project + region + SceneFlow project + zone to prevent
 * cross-region and cross-project cache misses.
 */
function cacheKey(
  vertexProjectId: string,
  location: string, 
  sceneflowProjectId: string,
  zone: CacheZone
): string {
  return `${vertexProjectId}:${location}:${sceneflowProjectId}:${zone}`
}

/**
 * Get Vertex AI configuration (reuses pattern from gemini.ts)
 */
function getVertexConfig(): { projectId: string; location: string } {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID must be configured for Vertex AI')
  }
  
  return { projectId, location }
}

// =============================================================================
// HOOK 1 — Create or Reuse Cache
// =============================================================================

/**
 * Create a new CachedContent resource on Vertex AI, or return an existing
 * cache if the content hash matches (preventing duplicate cache creation).
 * 
 * @param sceneflowProjectId - The SceneFlow project ID (for scoping)
 * @param zone - Which cache zone (script_doctor, style_consistency, etc.)
 * @param systemInstruction - The system instruction to cache
 * @param contextParts - Content parts to cache (text and/or images)
 * @param options - Model, TTL, and other configuration
 * @returns The cache entry, or null if caching is not eligible/enabled
 */
export async function getOrCreateCache(
  sceneflowProjectId: string,
  zone: CacheZone,
  systemInstruction: string,
  contextParts: CacheContentPart[],
  options: {
    model?: string
    ttlMinutes?: number
    displayName?: string
  } = {}
): Promise<CacheEntry | null> {
  // Guard: feature flag
  if (!isVertexCachingEnabled()) {
    console.log('[VertexCache] Caching disabled (ENABLE_VERTEX_CACHING != true)')
    return null
  }

  const { projectId: vertexProjectId, location: defaultLocation } = getVertexConfig()
  const model = options.model || getGeminiTextModel()
  const ttlMinutes = options.ttlMinutes || DEFAULT_TTL_MINUTES
  
  // Gemini 3.x models require global endpoint
  const isGemini3 = model.startsWith('gemini-3')
  const location = isGemini3 ? 'global' : defaultLocation

  // Compute content hash for change detection
  const contentHash = hashContent(systemInstruction, contextParts)
  const key = cacheKey(vertexProjectId, location, sceneflowProjectId, zone)

  // Check for existing valid cache with same content
  const existing = activeCaches.get(key)
  if (existing && existing.contentHash === contentHash) {
    const expiresAt = new Date(existing.expiresAt)
    if (expiresAt > new Date()) {
      console.log(`[VertexCache] HIT zone=${zone} project=${sceneflowProjectId} resource=${existing.resourceName}`)
      return existing
    }
    console.log(`[VertexCache] EXPIRED zone=${zone}, recreating`)
    activeCaches.delete(key)
  } else if (existing && existing.contentHash !== contentHash) {
    // Content changed — invalidate old cache and create new
    console.log(`[VertexCache] STALE zone=${zone} (content hash changed), invalidating old cache`)
    try {
      await deleteCacheResource(existing.resourceName)
    } catch (e) {
      console.warn(`[VertexCache] Failed to delete stale cache: ${e}`)
    }
    activeCaches.delete(key)
  }

  // Build the Vertex AI CachedContent.create request
  const accessToken = await getVertexAIAuthToken()
  
  // Build contents array
  const vertexParts = contextParts.map(part => {
    if (part.text) return { text: part.text }
    if (part.inlineData) return { inlineData: part.inlineData }
    return part
  })

  const createEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${vertexProjectId}/locations/${location}/cachedContents`

  const requestBody: any = {
    model: `projects/${vertexProjectId}/locations/${location}/publishers/google/models/${model}`,
    displayName: options.displayName || `sceneflow-${sceneflowProjectId}-${zone}`,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        role: 'user',
        parts: vertexParts
      }
    ],
    ttl: `${ttlMinutes * 60}s`,
  }

  console.log(`[VertexCache] Creating cache: zone=${zone} model=${model} location=${location} ttl=${ttlMinutes}m parts=${contextParts.length}`)

  try {
    const response = await fetchWithRetry(
      createEndpoint,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      },
      {
        maxRetries: 2,
        initialDelayMs: 1000,
        operationName: `VertexCache Create (${zone})`,
        timeoutMs: 30000,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[VertexCache] Create failed (${response.status}): ${errorText}`)
      
      // Common failure modes:
      // 400 = content below token minimum
      // 404 = model doesn't support caching
      // 429 = rate limited
      if (response.status === 400 && errorText.includes('too few tokens')) {
        console.warn(`[VertexCache] Content below token minimum for ${model} (need ${getTokenMinimum(model)} tokens). Falling back to uncached path.`)
      }
      return null
    }

    const data = await response.json()
    const resourceName = data.name as string
    const cacheId = resourceName.split('/').pop() || resourceName

    // Calculate expiry from TTL
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()

    const entry: CacheEntry = {
      cacheId,
      resourceName,
      contentHash,
      zone,
      model,
      projectId: vertexProjectId,
      location,
      expiresAt,
      createdAt: new Date().toISOString(),
    }

    activeCaches.set(key, entry)

    console.log(`[VertexCache] CREATED zone=${zone} resource=${resourceName} expires=${expiresAt}`)
    return entry

  } catch (error: any) {
    console.error(`[VertexCache] Create error: ${error.message}`)
    // Don't throw — fall back to uncached path
    return null
  }
}

// =============================================================================
// HOOK 2 — Generate Content Referencing Cache
// =============================================================================

/**
 * Generate text using an existing cached context.
 * Sends ONLY the user's delta/edit prompt — the heavy prefix (system
 * instruction, script, style guide, etc.) is served from cache at
 * reduced input-token pricing.
 * 
 * Automatically sends a heartbeat to extend the cache TTL.
 * 
 * @param cacheEntry - The cache entry to reference (from getOrCreateCache)
 * @param userPrompt - The user's edit instruction / delta prompt
 * @param options - Generation config
 * @returns Generation result with usage metadata
 */
export async function generateWithCache(
  cacheEntry: CacheEntry,
  userPrompt: string,
  options: CacheAwareGenerationOptions = {}
): Promise<CacheAwareGenerationResult> {
  const accessToken = await getVertexAIAuthToken()
  const { location, model, projectId: vertexProjectId } = cacheEntry

  // Extend TTL on every generation (heartbeat)
  heartbeat(cacheEntry).catch(err => 
    console.warn(`[VertexCache] Heartbeat failed (non-fatal): ${err.message}`)
  )

  // Build the generateContent request referencing the cached content
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${vertexProjectId}/locations/${location}/publishers/google/models/${model}:generateContent`

  const requestBody: any = {
    cachedContent: cacheEntry.resourceName,
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      topP: options.topP ?? 0.9,
      topK: options.topK,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
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

  // Add safety settings
  requestBody.safetySettings = options.safetySettings || getDefaultGeminiSafetySettings()

  // Add thinking config
  const thinkingConfig = buildThinkingConfig(model, {
    thinkingBudget: options.thinkingBudget,
    thinkingLevel: options.thinkingLevel,
  })
  if (thinkingConfig) {
    requestBody.generationConfig.thinkingConfig = thinkingConfig
  }

  console.log(`[VertexCache] Generating with cache=${cacheEntry.cacheId} model=${model}`)

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
      operationName: `VertexCache Generate (${cacheEntry.zone})`,
      timeoutMs: options.timeoutMs ?? 90000,
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[VertexCache] Generate failed (${response.status}): ${errorText}`)
    
    // If cache was deleted/expired, clear our local reference
    if (response.status === 404 || response.status === 400) {
      console.warn(`[VertexCache] Cache ${cacheEntry.cacheId} no longer valid, clearing local reference`)
      const key = cacheKey(cacheEntry.projectId, cacheEntry.location, '', cacheEntry.zone)
      // Can't reconstruct full key without sceneflowProjectId — iterate to find
      for (const [k, v] of activeCaches.entries()) {
        if (v.cacheId === cacheEntry.cacheId) {
          activeCaches.delete(k)
          break
        }
      }
    }
    
    throw new Error(`Vertex AI cached generation error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]
  
  if (!candidate) {
    throw new Error('No candidates in Vertex AI cached response')
  }

  const text = candidate.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('No text content in Vertex AI cached response')
  }

  // Extract usage metadata (includes cachedContentTokenCount)
  const usageMetadata = data.usageMetadata || {}

  console.log(
    `[VertexCache] Generated: prompt_tokens=${usageMetadata.promptTokenCount || '?'} ` +
    `cached_tokens=${usageMetadata.cachedContentTokenCount || '?'} ` +
    `output_tokens=${usageMetadata.candidatesTokenCount || '?'}`
  )

  return {
    text,
    finishReason: candidate.finishReason,
    safetyRatings: candidate.safetyRatings,
    usageMetadata,
    usedCache: true,
    cacheEntry,
  }
}

// =============================================================================
// HOOK 3 — Heartbeat: Extend TTL
// =============================================================================

/**
 * Send a PATCH request to Vertex AI to extend the cache TTL.
 * Called automatically on every generateWithCache, and can also be
 * called from a frontend keep-alive endpoint.
 * 
 * @param cacheEntry - The cache entry to extend
 * @param extendMinutes - How many minutes to extend (default: 60)
 */
export async function heartbeat(
  cacheEntry: CacheEntry,
  extendMinutes: number = DEFAULT_TTL_MINUTES
): Promise<void> {
  const accessToken = await getVertexAIAuthToken()

  // PATCH the cached content to update TTL
  const patchEndpoint = `https://${cacheEntry.location}-aiplatform.googleapis.com/v1/${cacheEntry.resourceName}`

  const response = await fetch(patchEndpoint, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ttl: `${extendMinutes * 60}s`
    })
  })

  if (response.ok) {
    // Update local entry
    const newExpiry = new Date(Date.now() + extendMinutes * 60 * 1000).toISOString()
    cacheEntry.expiresAt = newExpiry
    console.log(`[VertexCache] Heartbeat OK: cache=${cacheEntry.cacheId} newExpiry=${newExpiry}`)
  } else {
    const errorText = await response.text()
    console.warn(`[VertexCache] Heartbeat failed (${response.status}): ${errorText}`)
    
    // If 404, cache was deleted — clear local reference
    if (response.status === 404) {
      for (const [k, v] of activeCaches.entries()) {
        if (v.cacheId === cacheEntry.cacheId) {
          activeCaches.delete(k)
          break
        }
      }
    }
  }
}

// =============================================================================
// HOOK 4 — Invalidate (Content Changed)
// =============================================================================

/**
 * Explicitly delete a cache when the underlying content has changed
 * substantially (e.g., user uploaded a brand new script draft).
 * 
 * @param sceneflowProjectId - SceneFlow project ID
 * @param zone - Which zone to invalidate
 */
export async function invalidateCache(
  sceneflowProjectId: string,
  zone: CacheZone
): Promise<void> {
  const { projectId: vertexProjectId, location: defaultLocation } = getVertexConfig()
  
  // Check both global and regional locations
  const locations = ['global', defaultLocation]
  
  for (const loc of locations) {
    const key = cacheKey(vertexProjectId, loc, sceneflowProjectId, zone)
    const entry = activeCaches.get(key)
    
    if (entry) {
      activeCaches.delete(key)
      try {
        await deleteCacheResource(entry.resourceName)
        console.log(`[VertexCache] INVALIDATED zone=${zone} resource=${entry.resourceName}`)
      } catch (error: any) {
        console.warn(`[VertexCache] Failed to delete cache: ${error.message}`)
      }
    }
  }
}

/**
 * Invalidate a cache by its resource name (for client-initiated invalidation).
 */
export async function invalidateCacheByResourceName(resourceName: string): Promise<void> {
  // Remove from local map
  for (const [k, v] of activeCaches.entries()) {
    if (v.resourceName === resourceName) {
      activeCaches.delete(k)
      break
    }
  }
  
  try {
    await deleteCacheResource(resourceName)
    console.log(`[VertexCache] INVALIDATED resource=${resourceName}`)
  } catch (error: any) {
    console.warn(`[VertexCache] Failed to delete cache: ${error.message}`)
  }
}

// =============================================================================
// HOOK 5 — Cleanup: Delete All Caches for a Project
// =============================================================================

/**
 * Delete all active caches for a SceneFlow project.
 * Called on session end / browser close.
 * 
 * Note: even if this isn't called, TTL ensures automatic cleanup.
 */
export async function cleanupProjectCaches(sceneflowProjectId: string): Promise<void> {
  const keysToRemove: string[] = []
  
  for (const [k, v] of activeCaches.entries()) {
    if (k.includes(`:${sceneflowProjectId}:`)) {
      keysToRemove.push(k)
    }
  }

  console.log(`[VertexCache] Cleaning up ${keysToRemove.length} cache(s) for project=${sceneflowProjectId}`)

  for (const key of keysToRemove) {
    const entry = activeCaches.get(key)!
    activeCaches.delete(key)
    try {
      await deleteCacheResource(entry.resourceName)
      console.log(`[VertexCache] Cleanup DELETED: ${entry.resourceName}`)
    } catch (error: any) {
      // Non-fatal: TTL will handle cleanup even if delete fails
      console.warn(`[VertexCache] Cleanup failed for ${entry.resourceName}: ${error.message}`)
    }
  }
}

// =============================================================================
// Lookup — Retrieve a Cache Entry by Resource Name
// =============================================================================

/**
 * Find a cache entry by its resource name (for API routes that receive
 * the cache reference from the frontend).
 * 
 * Returns the local entry if found, or constructs a minimal entry by
 * querying Vertex AI (for cross-container scenarios in serverless).
 */
export async function getCacheEntryByResourceName(
  resourceName: string
): Promise<CacheEntry | null> {
  // Check local map first
  for (const [, entry] of activeCaches.entries()) {
    if (entry.resourceName === resourceName) {
      // Validate not expired
      if (new Date(entry.expiresAt) > new Date()) {
        return entry
      }
    }
  }

  // Not in local map — validate against Vertex AI (cross-container scenario)
  try {
    const accessToken = await getVertexAIAuthToken()
    
    // Extract location from resource name: projects/{p}/locations/{l}/cachedContents/{id}
    const parts = resourceName.split('/')
    const locationIndex = parts.indexOf('locations')
    const location = locationIndex >= 0 ? parts[locationIndex + 1] : 'global'
    
    const getEndpoint = `https://${location}-aiplatform.googleapis.com/v1/${resourceName}`
    
    const response = await fetch(getEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    })

    if (!response.ok) {
      console.warn(`[VertexCache] Cache ${resourceName} not found on Vertex AI (${response.status})`)
      return null
    }

    const data = await response.json()
    
    // Reconstruct cache entry from Vertex AI response
    const cacheId = resourceName.split('/').pop() || resourceName
    const model = data.model?.split('/').pop() || ''
    const projectId = parts[1] || ''
    
    const entry: CacheEntry = {
      cacheId,
      resourceName,
      contentHash: '', // Unknown for cross-container lookups
      zone: (data.displayName?.split('-').pop() || 'script_doctor') as CacheZone,
      model,
      projectId,
      location,
      expiresAt: data.expireTime || new Date(Date.now() + DEFAULT_TTL_MINUTES * 60 * 1000).toISOString(),
      createdAt: data.createTime || new Date().toISOString(),
    }

    console.log(`[VertexCache] Reconstructed entry from Vertex AI: cache=${cacheId}`)
    return entry

  } catch (error: any) {
    console.warn(`[VertexCache] Lookup failed: ${error.message}`)
    return null
  }
}

// =============================================================================
// Token Count Estimation (for pre-validation)
// =============================================================================

/**
 * Estimate token count for content parts using Vertex AI's countTokens API.
 * Use before creating a cache to verify content exceeds the minimum threshold.
 * 
 * @returns Token count, or -1 if estimation fails
 */
export async function estimateTokenCount(
  systemInstruction: string,
  contextParts: CacheContentPart[],
  model?: string
): Promise<number> {
  try {
    const { projectId, location: defaultLocation } = getVertexConfig()
    const modelName = model || getGeminiTextModel()
    const isGemini3 = modelName.startsWith('gemini-3')
    const location = isGemini3 ? 'global' : defaultLocation

    const accessToken = await getVertexAIAuthToken()

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}:countTokens`

    const vertexParts = contextParts.map(part => {
      if (part.text) return { text: part.text }
      if (part.inlineData) return { inlineData: part.inlineData }
      return part
    })

    const requestBody = {
      contents: [{ role: 'user', parts: vertexParts }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      console.warn(`[VertexCache] countTokens failed: ${response.status}`)
      return -1
    }

    const data = await response.json()
    const totalTokens = data.totalTokens || 0
    console.log(`[VertexCache] Token count: ${totalTokens} (minimum for ${modelName}: ${getTokenMinimum(modelName)})`)
    return totalTokens

  } catch (error: any) {
    console.warn(`[VertexCache] Token estimation failed: ${error.message}`)
    return -1
  }
}

/**
 * Check if content meets the minimum token threshold for caching.
 * If estimateTokenCount returns -1 (failed), assumes eligible to avoid
 * blocking the user flow — the create call will fail gracefully if not.
 */
export async function isCachingEligible(
  systemInstruction: string,
  contextParts: CacheContentPart[],
  model?: string
): Promise<{ eligible: boolean; tokenCount: number; minimum: number }> {
  const modelName = model || getGeminiTextModel()
  const minimum = getTokenMinimum(modelName)
  const tokenCount = await estimateTokenCount(systemInstruction, contextParts, modelName)

  if (tokenCount === -1) {
    // Estimation failed — optimistically assume eligible
    return { eligible: true, tokenCount: -1, minimum }
  }

  return {
    eligible: tokenCount >= minimum,
    tokenCount,
    minimum,
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Delete a CachedContent resource on Vertex AI.
 */
async function deleteCacheResource(resourceName: string): Promise<void> {
  const accessToken = await getVertexAIAuthToken()
  
  // Extract location from resource name
  const parts = resourceName.split('/')
  const locationIndex = parts.indexOf('locations')
  const location = locationIndex >= 0 ? parts[locationIndex + 1] : 'global'
  
  const deleteEndpoint = `https://${location}-aiplatform.googleapis.com/v1/${resourceName}`

  const response = await fetch(deleteEndpoint, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  })

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text()
    throw new Error(`Delete failed (${response.status}): ${errorText}`)
  }
}

// =============================================================================
// Cache Statistics (for observability)
// =============================================================================

/**
 * Get a snapshot of all active caches in the local registry.
 * Useful for diagnostics and the admin dashboard.
 */
export function getActiveCacheStats(): {
  totalCaches: number
  caches: Array<{
    zone: CacheZone
    model: string
    location: string
    cacheId: string
    expiresAt: string
    createdAt: string
  }>
} {
  const caches = Array.from(activeCaches.values()).map(entry => ({
    zone: entry.zone,
    model: entry.model,
    location: entry.location,
    cacheId: entry.cacheId,
    expiresAt: entry.expiresAt,
    createdAt: entry.createdAt,
  }))

  return {
    totalCaches: caches.length,
    caches,
  }
}
