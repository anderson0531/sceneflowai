/**
 * Production Video Client - Scalable Veo 3.1 Video Generation
 * 
 * Features:
 * - Multi-region support with automatic failover
 * - Quota pool management across multiple GCP projects
 * - Distributed rate limiting (in-memory for now, Redis-ready)
 * - Fallback to Gemini API when Vertex AI is exhausted
 * - Intelligent region selection based on quota status
 * 
 * Environment Variables:
 * - VEO_REGIONS: Comma-separated list of regions (default: us-central1)
 * - VERTEX_PROJECT_IDS: Comma-separated list of project IDs for quota distribution
 * - VERTEX_PROJECT_ID: Primary project ID (fallback)
 * - GOOGLE_APPLICATION_CREDENTIALS_JSON: Service account with access to all projects
 * - GEMINI_API_KEY: Fallback to Gemini API when Vertex exhausted
 * 
 * @see videoClient.ts for Vertex AI implementation details
 * @see geminiStudioVideoClient.ts for Gemini API implementation details
 */

import { 
  generateVideoWithVeo, 
  waitForVideoCompletion, 
  downloadVideoFile,
  type VideoGenerationOptions,
  type VideoGenerationResult 
} from './videoClient'

import {
  generateVideoWithGeminiStudio,
  waitForGeminiVideoCompletion,
  downloadGeminiVideoFile,
  type GeminiVideoOptions,
  type GeminiVideoResult
} from './geminiStudioVideoClient'

import {
  DEFAULT_VIDEO_QUALITY,
  getVertexLocation,
  isOmniVideoModel,
  resolveVideoModel,
  type VeoClipDuration,
} from '@/lib/config/modelConfig'
import {
  isVertexBurstRateLimitMessage,
  isVertexRateLimitMessage,
} from '@/lib/gemini/vertexRateLimit'
import {
  acquireVertexDispatchSlot,
  VertexDispatchDeferredError,
} from '@/lib/vertexai/vertexDispatchBucket'

// ============================================================================
// Types
// ============================================================================

export interface ProductionVideoOptions extends VideoGenerationOptions {
  /** Force a specific provider (vertex or gemini) */
  forceProvider?: 'vertex' | 'gemini'
  /** Force a specific region (overrides automatic selection) */
  forceRegion?: string
  /** Force a specific project ID (overrides automatic selection) */
  forceProjectId?: string
  /**
   * Endpoints already attempted in this generation (`projectId:region`).
   * Failover will not call the same endpoint again.
   */
  triedEndpoints?: ReadonlySet<string>
}

export interface ProductionVideoResult extends VideoGenerationResult {
  /** Which provider was used */
  provider: 'vertex' | 'gemini'
  /** Which region was used (vertex only) */
  region?: string
  /** Which project was used (vertex only) */
  projectId?: string
  /** Whether this was a failover from another provider/region */
  wasFailover?: boolean
  /** Whether this was a fallback due to content policy rejection */
  wasContentPolicyFallback?: boolean
}

interface RegionQuotaState {
  /** Number of requests made in current period */
  requestCount: number
  /** Timestamp when quota was last reset */
  lastReset: number
  /** Whether this region is currently rate limited */
  isRateLimited: boolean
  /** Timestamp when rate limit expires */
  rateLimitedUntil: number | null
  /** Whether daily quota is exhausted */
  isQuotaExhausted: boolean
  /** Timestamp when quota resets (midnight) */
  quotaResetsAt: number | null
  /** Last Vertex quota/429 body, returned while this location stays unavailable */
  lastLimitError: string | null
}

interface ProjectQuotaState {
  /** Per-region quota state */
  regions: Record<string, RegionQuotaState>
}

// ============================================================================
// Configuration
// ============================================================================

/** Parse comma-separated environment variable */
function parseEnvList(envVar: string | undefined, defaultValue: string[]): string[] {
  if (!envVar) return defaultValue
  return envVar.split(',').map(s => s.trim()).filter(Boolean)
}

/** Get configured regions */
function getConfiguredRegions(): string[] {
  return parseEnvList(process.env.VEO_REGIONS, ['us-central1'])
}

/** Get configured project IDs */
function getConfiguredProjectIds(): string[] {
  const projectIds = parseEnvList(process.env.VERTEX_PROJECT_IDS, [])
  // Fallback to single project ID
  if (projectIds.length === 0 && process.env.VERTEX_PROJECT_ID) {
    return [process.env.VERTEX_PROJECT_ID]
  }
  return projectIds
}

/** Check if Gemini API fallback is available
 * NOTE: Gemini API does NOT support video generation models (Veo)
 * Video generation is ONLY available through Vertex AI
 * This returns false to prevent attempting the broken fallback
 */
function isGeminiFallbackAvailable(): boolean {
  // Gemini API (generativelanguage.googleapis.com) does NOT support Veo video models
  // Attempting to use it results in 404 errors
  // Video generation is ONLY available through Vertex AI
  return false
}

// ============================================================================
// Quota State Management (In-Memory - Replace with Redis for production)
// ============================================================================

/**
 * In-memory quota state - shared across requests in the same serverless instance
 * For true distributed state, replace with Upstash Redis or similar
 */
const quotaState: Record<string, ProjectQuotaState> = {}

/** Rate limit configuration */
const RATE_LIMIT_CONFIG = {
  /** Requests per minute per region */
  RPM_LIMIT: 10,
  /** Cooldown duration when rate limited (ms) */
  RATE_LIMIT_COOLDOWN_MS: 60000,
  /** Daily quota per project (estimate - actual varies by tier) */
  DAILY_QUOTA_PER_PROJECT: 100,
}

/** Initialize quota state for a project/region */
function initQuotaState(projectId: string, region: string): RegionQuotaState {
  if (!quotaState[projectId]) {
    quotaState[projectId] = { regions: {} }
  }
  if (!quotaState[projectId].regions[region]) {
    quotaState[projectId].regions[region] = {
      requestCount: 0,
      lastReset: Date.now(),
      isRateLimited: false,
      rateLimitedUntil: null,
      isQuotaExhausted: false,
      quotaResetsAt: null,
      lastLimitError: null,
    }
  }
  return quotaState[projectId].regions[region]
}

/** Get quota state for a project/region */
function getQuotaState(projectId: string, region: string): RegionQuotaState {
  return initQuotaState(projectId, region)
}

/** Check if a region is available (not rate limited and not quota exhausted) */
function isRegionAvailable(projectId: string, region: string): boolean {
  const state = getQuotaState(projectId, region)
  const now = Date.now()
  
  // Check rate limit cooldown
  if (state.isRateLimited && state.rateLimitedUntil) {
    if (now < state.rateLimitedUntil) {
      return false
    }
    // Cooldown expired, reset rate limit
    state.isRateLimited = false
    state.rateLimitedUntil = null
  }
  
  // Check quota exhaustion
  if (state.isQuotaExhausted && state.quotaResetsAt) {
    if (now < state.quotaResetsAt) {
      return false
    }
    // Quota reset, clear exhaustion
    state.isQuotaExhausted = false
    state.quotaResetsAt = null
    state.requestCount = 0
    state.lastReset = now
  }
  
  return true
}

/** Mark a region as rate limited */
function markRegionRateLimited(projectId: string, region: string, error?: string): void {
  const state = getQuotaState(projectId, region)
  state.isRateLimited = true
  state.rateLimitedUntil = Date.now() + RATE_LIMIT_CONFIG.RATE_LIMIT_COOLDOWN_MS
  if (error) state.lastLimitError = error
  console.log(`[Production Video] Region ${region} (${projectId}) rate limited until ${new Date(state.rateLimitedUntil).toISOString()}`)
}

/** Mark a region as quota exhausted */
function markRegionQuotaExhausted(projectId: string, region: string, error?: string): void {
  const state = getQuotaState(projectId, region)
  state.isQuotaExhausted = true
  if (error) state.lastLimitError = error
  
  // Reset at midnight PT (UTC-8)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  state.quotaResetsAt = tomorrow.getTime()
  
  console.log(`[Production Video] Region ${region} (${projectId}) quota exhausted until ${tomorrow.toISOString()}`)
}

/** Increment request count for a region */
function incrementRequestCount(projectId: string, region: string): void {
  const state = getQuotaState(projectId, region)
  state.requestCount++
  
  // Reset count every minute
  const now = Date.now()
  if (now - state.lastReset > 60000) {
    state.requestCount = 1
    state.lastReset = now
  }
}

// ============================================================================
// Region Selection
// ============================================================================

interface SelectedEndpoint {
  projectId: string
  region: string
  isLastResort: boolean
}

function endpointKey(projectId: string, region: string): string {
  return `${projectId}:${region}`
}

/** Clear in-memory quota bookkeeping. Tests only. */
export function resetProductionVideoQuotaStateForTests(): void {
  for (const key of Object.keys(quotaState)) {
    delete quotaState[key]
  }
}

/**
 * Locations this request will actually call.
 * Gemini Omni Interactions always uses the global endpoint, ignoring VEO_REGIONS.
 */
function quotaLocationsForRequest(options: VideoGenerationOptions): string[] {
  const quality = options.quality === 'standard' ? 'premium' : (options.quality || DEFAULT_VIDEO_QUALITY)
  const hasReferenceImages =
    !options.startFrame && (options.referenceImages?.length ?? 0) > 0
  const model = resolveVideoModel(quality, {
    durationSeconds: options.durationSeconds,
    sourceVideo: options.sourceVideo,
    hasReferenceImages,
    preferOmni: options.preferOmni,
  })
  if (isOmniVideoModel(model)) return [getVertexLocation(model)]
  return getConfiguredRegions()
}

/**
 * Select a free project/location. Rate-limited endpoints are skipped.
 * This request does not wait out a cooldown and call the same endpoint again.
 */
function selectBestEndpoint(
  exclude: ReadonlySet<string> = new Set(),
  locations: string[] = getConfiguredRegions()
): SelectedEndpoint | null {
  const projectIds = getConfiguredProjectIds()
  const regions = locations.length > 0 ? locations : getConfiguredRegions()
  
  if (projectIds.length === 0) {
    console.error('[Production Video] No project IDs configured')
    return null
  }
  
  for (const projectId of projectIds) {
    for (const region of regions) {
      if (exclude.has(endpointKey(projectId, region))) continue
      if (isRegionAvailable(projectId, region)) {
        return { projectId, region, isLastResort: false }
      }
    }
  }

  return null
}

/** Previous quota error for a location that is still unavailable. */
function rememberedLimitError(locations: string[]): string | undefined {
  for (const projectId of getConfiguredProjectIds()) {
    for (const region of locations) {
      const state = quotaState[projectId]?.regions[region]
      if (!state?.lastLimitError) continue
      if (!isRegionAvailable(projectId, region)) return state.lastLimitError
    }
  }
  return undefined
}

/** Get status summary for all endpoints. Pass Omni's `['global']` when that is the call. */
export function getEndpointStatus(
  locations?: string[]
): Record<string, Record<string, { available: boolean; rateLimited: boolean; quotaExhausted: boolean }>> {
  const projectIds = getConfiguredProjectIds()
  const regions = locations?.length ? locations : getConfiguredRegions()
  const status: Record<string, Record<string, { available: boolean; rateLimited: boolean; quotaExhausted: boolean }>> = {}
  
  for (const projectId of projectIds) {
    status[projectId] = {}
    for (const region of regions) {
      const state = getQuotaState(projectId, region)
      status[projectId][region] = {
        available: isRegionAvailable(projectId, region),
        rateLimited: state.isRateLimited,
        quotaExhausted: state.isQuotaExhausted,
      }
    }
  }
  
  return status
}

// ============================================================================
// Main Video Generation Function
// ============================================================================

/**
 * Check if Gemini should be used as the primary video generation provider.
 * 
 * Vertex AI is the DEFAULT provider because:
 * 1. Stable API with predictLongRunning support
 * 2. Multi-region failover support
 * 3. Gemini API video models not yet fully available
 * 
 * Set USE_GEMINI_PRIMARY=true to use Gemini API instead.
 */
function useGeminiAsPrimary(): boolean {
  // Default to Vertex AI unless explicitly enabled
  return process.env.USE_GEMINI_PRIMARY === 'true'
}

/**
 * Generate video using the production configuration
 * 
 * Provider selection order:
 * 1. If USE_GEMINI_PRIMARY=true: Gemini API first, then Vertex AI fallback
 * 2. Otherwise: Vertex AI first (multi-region), then Gemini API fallback
 * 
 * Vertex AI is the default for stability. Gemini API can be enabled for
 * testing or when video extension (V2V) features become available.
 */
function failoverVideoResult(
  error: string | undefined,
  projectId: string,
  region: string
): ProductionVideoResult {
  return {
    status: 'FAILED',
    error: error || 'All video generation endpoints exhausted. Please try again later.',
    provider: 'vertex',
    region,
    projectId,
    wasFailover: true,
  }
}

export async function generateProductionVideo(
  prompt: string,
  options: ProductionVideoOptions = {}
): Promise<ProductionVideoResult> {
  const { forceProvider, forceRegion, forceProjectId, triedEndpoints, ...videoOptions } = options
  const tried = triedEndpoints ?? new Set<string>()
  const quotaLocations = quotaLocationsForRequest(videoOptions)
  
  console.log('[Production Video] Starting video generation...')
  console.log('[Production Video] Configured regions:', getConfiguredRegions())
  console.log('[Production Video] Quota locations:', quotaLocations)
  console.log('[Production Video] Configured projects:', getConfiguredProjectIds().length)
  console.log('[Production Video] Note: Gemini API does not support video - Vertex AI only')
  
  // Studio/Gemini API path retired — always Vertex for Veo (incl. EXT)
  if (forceProvider === 'gemini') {
    console.warn(
      '[Production Video] forceProvider=gemini is deprecated; using Vertex AI (see VERTEX_MEDIA_MIGRATION.md)'
    )
  }
  
  // If USE_GEMINI_PRIMARY is true and Gemini is available, use it first
  // This avoids Vertex AI's stricter content classifier for creative prompts
  if (useGeminiAsPrimary() && isGeminiFallbackAvailable() && forceProvider !== 'vertex') {
    console.log('[Production Video] Using Gemini API as primary provider (USE_GEMINI_PRIMARY=true)')
    const geminiResult = await generateWithGemini(prompt, videoOptions)
    
    // If Gemini fails with a non-content-policy error, try Vertex AI
    if (geminiResult.status === 'FAILED' && geminiResult.error) {
      const errorLower = geminiResult.error.toLowerCase()
      const isContentPolicyError = 
        errorLower.includes('safety') ||
        errorLower.includes('blocked') ||
        errorLower.includes('policy')
      
      // Only fall back to Vertex for non-content issues (rate limits, etc.)
      // If it's a content policy error from Gemini too, don't bother trying Vertex (stricter)
      if (!isContentPolicyError) {
        console.log('[Production Video] Gemini failed with non-content error, trying Vertex AI')
        // Continue to Vertex AI below
      } else {
        // Content policy error from Gemini - Vertex won't help, return error
        return geminiResult
      }
    } else {
      // Gemini succeeded or is processing
      return geminiResult
    }
  }
  
  // Try Vertex AI first (default) or as fallback when Gemini primary fails
  if (forceProvider !== 'gemini') {
    // Select endpoint
    let selectedEndpoint: SelectedEndpoint | null = null
    
    const omniQuotaLocation = quotaLocations.length === 1 && quotaLocations[0] === 'global'
      ? 'global'
      : null

    if (forceProjectId && (forceRegion || omniQuotaLocation)) {
      const forcedRegion = omniQuotaLocation ?? forceRegion!
      const forcedKey = endpointKey(forceProjectId, forcedRegion)
      selectedEndpoint = tried.has(forcedKey)
        ? null
        : { projectId: forceProjectId, region: forcedRegion, isLastResort: false }
    } else {
      selectedEndpoint = selectBestEndpoint(tried, quotaLocations)
    }
    
    if (selectedEndpoint) {
      const { projectId, region, isLastResort } = selectedEndpoint
      
      console.log(`[Production Video] Using Vertex AI: ${region} (${projectId})`)
      
      // Set environment variables for the Vertex client
      const originalProjectId = process.env.VERTEX_PROJECT_ID
      const originalLocation = process.env.VEO_LOCATION
      
      try {
        process.env.VERTEX_PROJECT_ID = projectId
        process.env.VEO_LOCATION = region

        try {
          await acquireVertexDispatchSlot('video')
        } catch (err) {
          if (err instanceof VertexDispatchDeferredError) {
            const retryAfterSeconds = Math.max(1, Math.ceil(err.retryAfterMs / 1000))
            console.warn(
              `[Production Video] Dispatch bucket deferred ${region} for ${retryAfterSeconds}s without calling Vertex`
            )
            return {
              status: 'FAILED',
              error: `Vertex AI error 429: rate limit — retry after ${retryAfterSeconds} seconds`,
              provider: 'vertex',
              region,
              projectId,
            }
          }
          throw err
        }

        incrementRequestCount(projectId, region)
        
        const result = await generateVideoWithVeo(prompt, videoOptions)
        
        if (result.status === 'FAILED' && isVertexRateLimitMessage(result.error)) {
          // 429 / too_many_requests is a short cooldown even when the body says "quota".
          if (isVertexBurstRateLimitMessage(result.error)) {
            markRegionRateLimited(projectId, region, result.error)
          } else {
            markRegionQuotaExhausted(projectId, region, result.error)
          }

          const nextTried = new Set(tried)
          nextTried.add(endpointKey(projectId, region))
          const nextEndpoint = selectBestEndpoint(nextTried, quotaLocations)
          if (!nextEndpoint) {
            return failoverVideoResult(result.error, projectId, region)
          }

          return generateProductionVideo(prompt, {
            ...options,
            forceProjectId: undefined,
            forceRegion: undefined,
            triedEndpoints: nextTried,
          })
        }

        // Content policy and other failures return as-is. Veo is Vertex-only,
        // so a policy block is not retried against another region here.
        return {
          ...result,
          provider: 'vertex',
          region,
          projectId,
          wasFailover: isLastResort,
        }
      } finally {
        // Restore original environment variables
        if (originalProjectId) process.env.VERTEX_PROJECT_ID = originalProjectId
        if (originalLocation) process.env.VEO_LOCATION = originalLocation
      }
    }
    
    const remembered = rememberedLimitError(quotaLocations)
    if (remembered) {
      console.log('[Production Video] Quota cooldown active; not sending another video request')
      const projectId = getConfiguredProjectIds()[0] || ''
      return failoverVideoResult(remembered, projectId, quotaLocations[0] || 'global')
    }

    console.log('[Production Video] No Vertex AI endpoints available')
  }
  
  // Fall back to Gemini API
  if (isGeminiFallbackAvailable()) {
    console.log('[Production Video] Falling back to Gemini API')
    return generateWithGemini(prompt, videoOptions, true)
  }
  
  // No providers available
  return {
    status: 'FAILED',
    error: 'All video generation endpoints exhausted. Please try again later.',
    provider: 'vertex',
    wasFailover: true,
  }
}

/** Generate video using Gemini API */
async function generateWithGemini(
  prompt: string,
  options: VideoGenerationOptions,
  wasFailover: boolean = false,
  wasContentPolicyFallback: boolean = false
): Promise<ProductionVideoResult> {
  // Convert options to Gemini format
  const geminiOptions: GeminiVideoOptions = {
    aspectRatio: options.aspectRatio,
    resolution: options.resolution,
    durationSeconds: options.durationSeconds as VeoClipDuration,
    negativePrompt: options.negativePrompt,
    personGeneration: options.startFrame ? 'allow_adult' : 'allow_all',
    startFrame: options.startFrame,
    lastFrame: options.lastFrame,
    referenceImages: options.referenceImages,
    // Video Extension (EXT mode) - pass the Gemini Files API reference for video continuation
    // VideoGenerationOptions uses sourceVideo, maps to Gemini's sourceVideo parameter
    sourceVideo: options.sourceVideo,
  }
  
  if (options.sourceVideo) {
    console.log('[Production Video] Gemini EXT mode with sourceVideo:', options.sourceVideo)
  }
  
  const result = await generateVideoWithGeminiStudio(prompt, geminiOptions)
  
  return {
    status: result.status,
    videoUrl: result.videoUrl,
    operationName: result.operationName,
    error: result.error,
    provider: 'gemini',
    wasFailover,
    wasContentPolicyFallback,
    veoVideoRef: result.veoVideoRef,
    veoVideoRefExpiry: result.veoVideoRefExpiry,
  }
}

// ============================================================================
// Polling & Download Functions
// ============================================================================

/**
 * Wait for video completion - routes to correct provider
 */
export async function waitForProductionVideoCompletion(
  operationName: string,
  provider: 'vertex' | 'gemini',
  maxWaitSeconds: number = 240,
  pollIntervalSeconds: number = 10
): Promise<ProductionVideoResult> {
  if (provider === 'gemini') {
    const result = await waitForGeminiVideoCompletion(operationName, maxWaitSeconds, pollIntervalSeconds)
    return { ...result, provider: 'gemini' }
  } else {
    const result = await waitForVideoCompletion(operationName, maxWaitSeconds, pollIntervalSeconds)
    return { ...result, provider: 'vertex' }
  }
}

/**
 * Download video file - routes to correct provider
 */
export async function downloadProductionVideo(
  videoUrl: string,
  provider: 'vertex' | 'gemini'
): Promise<Buffer | null> {
  if (provider === 'gemini') {
    return downloadGeminiVideoFile(videoUrl)
  } else {
    return downloadVideoFile(videoUrl)
  }
}

// ============================================================================
// Exports
// ============================================================================

export type { VideoGenerationOptions } from './videoClient'
export type { GeminiVideoOptions } from './geminiStudioVideoClient'
