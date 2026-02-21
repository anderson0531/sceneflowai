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

/** Check if Gemini API fallback is available */
function isGeminiFallbackAvailable(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY)
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
function markRegionRateLimited(projectId: string, region: string): void {
  const state = getQuotaState(projectId, region)
  state.isRateLimited = true
  state.rateLimitedUntil = Date.now() + RATE_LIMIT_CONFIG.RATE_LIMIT_COOLDOWN_MS
  console.log(`[Production Video] Region ${region} (${projectId}) rate limited until ${new Date(state.rateLimitedUntil).toISOString()}`)
}

/** Mark a region as quota exhausted */
function markRegionQuotaExhausted(projectId: string, region: string): void {
  const state = getQuotaState(projectId, region)
  state.isQuotaExhausted = true
  
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

/** Select the best available project/region combination */
function selectBestEndpoint(): SelectedEndpoint | null {
  const projectIds = getConfiguredProjectIds()
  const regions = getConfiguredRegions()
  
  if (projectIds.length === 0) {
    console.error('[Production Video] No project IDs configured')
    return null
  }
  
  // First pass: find a fully available endpoint
  for (const projectId of projectIds) {
    for (const region of regions) {
      if (isRegionAvailable(projectId, region)) {
        return { projectId, region, isLastResort: false }
      }
    }
  }
  
  // Second pass: find a rate-limited but not quota-exhausted endpoint
  // (We'll wait for rate limit to clear)
  for (const projectId of projectIds) {
    for (const region of regions) {
      const state = getQuotaState(projectId, region)
      if (!state.isQuotaExhausted) {
        return { projectId, region, isLastResort: true }
      }
    }
  }
  
  // All endpoints exhausted
  return null
}

/** Get status summary for all endpoints */
export function getEndpointStatus(): Record<string, Record<string, { available: boolean; rateLimited: boolean; quotaExhausted: boolean }>> {
  const projectIds = getConfiguredProjectIds()
  const regions = getConfiguredRegions()
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
 * Gemini API is now the DEFAULT because:
 * 1. More permissive content classifier (consumer vs enterprise)
 * 2. Supports video extension (EXT mode) with sourceVideo parameter
 * 3. Better for creative/cinematic prompts
 * 
 * Set USE_GEMINI_PRIMARY=false to use Vertex AI instead.
 */
function useGeminiAsPrimary(): boolean {
  // Default to Gemini API unless explicitly disabled
  return process.env.USE_GEMINI_PRIMARY !== 'false'
}

/**
 * Generate video using the production configuration
 * 
 * Provider selection order:
 * 1. If USE_GEMINI_PRIMARY=true: Gemini API first, then Vertex AI fallback
 * 2. Otherwise: Vertex AI first (multi-region), then Gemini API fallback
 * 
 * Gemini API uses the more permissive consumer classifier, which is better
 * for creative/cinematic content that may trigger Vertex AI's stricter Enterprise classifier.
 */
export async function generateProductionVideo(
  prompt: string,
  options: ProductionVideoOptions = {}
): Promise<ProductionVideoResult> {
  const { forceProvider, forceRegion, forceProjectId, ...videoOptions } = options
  
  console.log('[Production Video] Starting video generation...')
  console.log('[Production Video] Configured regions:', getConfiguredRegions())
  console.log('[Production Video] Configured projects:', getConfiguredProjectIds().length)
  console.log('[Production Video] Gemini fallback available:', isGeminiFallbackAvailable())
  console.log('[Production Video] Use Gemini as primary:', useGeminiAsPrimary())
  
  // If forcing Gemini, skip Vertex AI
  if (forceProvider === 'gemini') {
    return generateWithGemini(prompt, videoOptions)
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
    
    if (forceProjectId && forceRegion) {
      selectedEndpoint = { projectId: forceProjectId, region: forceRegion, isLastResort: false }
    } else {
      selectedEndpoint = selectBestEndpoint()
    }
    
    if (selectedEndpoint) {
      const { projectId, region, isLastResort } = selectedEndpoint
      
      // If this is last resort (rate limited but not quota exhausted), wait for cooldown
      if (isLastResort) {
        const state = getQuotaState(projectId, region)
        if (state.rateLimitedUntil) {
          const waitMs = state.rateLimitedUntil - Date.now()
          if (waitMs > 0 && waitMs < 120000) { // Wait up to 2 minutes
            console.log(`[Production Video] Waiting ${Math.ceil(waitMs / 1000)}s for rate limit cooldown...`)
            await new Promise(resolve => setTimeout(resolve, waitMs))
          }
        }
      }
      
      console.log(`[Production Video] Using Vertex AI: ${region} (${projectId})`)
      
      // Set environment variables for the Vertex client
      const originalProjectId = process.env.VERTEX_PROJECT_ID
      const originalLocation = process.env.VEO_LOCATION
      
      try {
        process.env.VERTEX_PROJECT_ID = projectId
        process.env.VEO_LOCATION = region
        
        incrementRequestCount(projectId, region)
        
        const result = await generateVideoWithVeo(prompt, videoOptions)
        
        if (result.status === 'FAILED') {
          // Check for rate limit error
          if (result.error?.includes('429') || result.error?.toLowerCase().includes('rate limit')) {
            markRegionRateLimited(projectId, region)
            // Try next endpoint
            return generateProductionVideo(prompt, { ...options, forceProjectId: undefined, forceRegion: undefined })
          }
          
          // Check for quota exhaustion
          if (result.error?.includes('quota') || result.error?.includes('RESOURCE_EXHAUSTED')) {
            markRegionQuotaExhausted(projectId, region)
            // Try next endpoint
            return generateProductionVideo(prompt, { ...options, forceProjectId: undefined, forceRegion: undefined })
          }
          
          // Check for content policy violation - fallback to Gemini API (more permissive classifier)
          // Vertex AI Enterprise has stricter classifiers than consumer Gemini Chat
          const errorLower = result.error?.toLowerCase() || ''
          const isContentPolicyError = 
            errorLower.includes('usage guidelines') ||
            errorLower.includes('content policy') ||
            errorLower.includes('safety') ||
            errorLower.includes('policy violation') ||
            errorLower.includes('blocked') ||
            errorLower.includes('prohibited') ||
            result.error?.includes('Code 3') // Vertex AI content policy error code
          
          if (isContentPolicyError && isGeminiFallbackAvailable()) {
            console.log('[Production Video] Content policy rejection from Vertex AI, falling back to Gemini API')
            console.log('[Production Video] Original error:', result.error)
            return generateWithGemini(prompt, videoOptions, true, true) // wasFailover=true, wasContentPolicyFallback=true
          }
        }
        
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
    durationSeconds: options.durationSeconds as 4 | 6 | 8,
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
