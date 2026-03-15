/**
 * Cache Observability Module
 * 
 * Provides structured logging and metrics for Vertex AI context caching.
 * Integrates with existing APIUsageLog model to track cache hit/miss rates,
 * token savings, and cost impact.
 * 
 * Usage:
 *   import { logCacheEvent } from '@/lib/vertexai/cacheObservability'
 *   
 *   const result = await generateTextCacheAware(prompt, options)
 *   await logCacheEvent({
 *     zone: 'script_doctor',
 *     projectId: 'proj_123',
 *     cacheHit: result.usedCache ?? false,
 *     cacheId: result.cacheEntry?.cacheId,
 *     model: 'gemini-2.5-flash',
 *     usageMetadata: result.usageMetadata,
 *     taskType: 'scene_revision',
 *     duration: elapsedMs,
 *   })
 */

import type { CacheZone } from './cacheManager'

// ── Types ──

export interface CacheEventLog {
  /** The cache zone (script_doctor, style_consistency, etc.) */
  zone: CacheZone
  /** SceneFlow project ID */
  projectId: string
  /** Whether the cache was hit (reused existing CachedContent) */
  cacheHit: boolean
  /** The Vertex AI cache resource name, if available */
  cacheId?: string
  /** Model used for generation */
  model: string
  /** Vertex AI usage metadata from the response */
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    cachedContentTokenCount?: number
    totalTokenCount?: number
  }
  /** Task type for APIUsageLog categorization */
  taskType: string
  /** Duration of the generation call in ms */
  duration?: number
  /** Whether the call succeeded */
  success?: boolean
  /** Error message if failed */
  errorMessage?: string
}

// ── In-Memory Metrics (per container) ──

interface CacheMetrics {
  totalCalls: number
  cacheHits: number
  cacheMisses: number
  totalTokensSaved: number
  totalPromptTokens: number
  byZone: Record<string, { hits: number; misses: number; tokensSaved: number }>
}

const metrics: CacheMetrics = {
  totalCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalTokensSaved: 0,
  totalPromptTokens: 0,
  byZone: {},
}

// ── Public API ──

/**
 * Log a cache event for observability.
 * 
 * This function:
 * 1. Updates in-memory metrics counters
 * 2. Logs structured data to console (for log aggregation services)
 * 3. Optionally writes to APIUsageLog database (non-blocking, fire-and-forget)
 */
export async function logCacheEvent(event: CacheEventLog): Promise<void> {
  try {
    // Update in-memory metrics
    metrics.totalCalls++
    const zoneMetrics = metrics.byZone[event.zone] || { hits: 0, misses: 0, tokensSaved: 0 }
    
    if (event.cacheHit) {
      metrics.cacheHits++
      zoneMetrics.hits++
    } else {
      metrics.cacheMisses++
      zoneMetrics.misses++
    }
    
    const cachedTokens = event.usageMetadata?.cachedContentTokenCount || 0
    const promptTokens = event.usageMetadata?.promptTokenCount || 0
    
    if (cachedTokens > 0) {
      metrics.totalTokensSaved += cachedTokens
      zoneMetrics.tokensSaved += cachedTokens
    }
    metrics.totalPromptTokens += promptTokens
    metrics.byZone[event.zone] = zoneMetrics
    
    // Structured console log for log aggregation (Vercel logs, Datadog, etc.)
    const logEntry = {
      type: 'vertex_cache_event',
      zone: event.zone,
      projectId: event.projectId,
      cacheHit: event.cacheHit,
      cacheId: event.cacheId,
      model: event.model,
      promptTokens,
      cachedTokens,
      candidateTokens: event.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: event.usageMetadata?.totalTokenCount || 0,
      duration: event.duration,
      success: event.success ?? true,
      // Cost estimate: cached tokens cost 75% less than regular input tokens
      // Flash: $0.10/1M input, $0.025/1M cached  → $0.075/1M savings
      estimatedSavings: cachedTokens > 0 
        ? `$${((cachedTokens / 1_000_000) * 0.075).toFixed(6)}`
        : '$0',
    }
    
    console.log('[Cache Observability]', JSON.stringify(logEntry))
    
    // Fire-and-forget database logging (don't await, don't block the response)
    logToDatabaseAsync(event).catch(err => {
      console.warn('[Cache Observability] DB log failed (non-blocking):', err.message)
    })
    
  } catch (error) {
    // Never let observability crash the main flow
    console.warn('[Cache Observability] Error:', error)
  }
}

/**
 * Get current in-memory cache metrics snapshot.
 * Note: These are per-container and reset on cold starts.
 */
export function getCacheMetrics(): CacheMetrics & { hitRate: string } {
  const hitRate = metrics.totalCalls > 0 
    ? `${((metrics.cacheHits / metrics.totalCalls) * 100).toFixed(1)}%`
    : '0%'
  return { ...metrics, hitRate }
}

/**
 * Reset in-memory metrics (useful for testing).
 */
export function resetCacheMetrics(): void {
  metrics.totalCalls = 0
  metrics.cacheHits = 0
  metrics.cacheMisses = 0
  metrics.totalTokensSaved = 0
  metrics.totalPromptTokens = 0
  metrics.byZone = {}
}

// ── Private Helpers ──

async function logToDatabaseAsync(event: CacheEventLog): Promise<void> {
  try {
    // Dynamic import to avoid circular dependencies and handle cases
    // where the database isn't configured (e.g., local dev without DB)
    const { APIUsageLog } = await import('@/models')
    
    await APIUsageLog.create({
      task_type: event.taskType,
      complexity: event.cacheHit ? 'cached' : 'standard',
      model_id: event.model,
      platform_id: 'vertex_ai',
      prompt: `[${event.zone}] cache_${event.cacheHit ? 'hit' : 'miss'}`,
      parameters: JSON.stringify({
        cacheZone: event.zone,
        cacheHit: event.cacheHit,
        cacheId: event.cacheId,
      }),
      cost: estimateCost(event),
      duration: event.duration || 0,
      success: event.success ?? true,
      error_message: event.errorMessage,
      metadata: JSON.stringify({
        cachedContentTokenCount: event.usageMetadata?.cachedContentTokenCount || 0,
        promptTokenCount: event.usageMetadata?.promptTokenCount || 0,
        candidatesTokenCount: event.usageMetadata?.candidatesTokenCount || 0,
        totalTokenCount: event.usageMetadata?.totalTokenCount || 0,
        cacheHit: event.cacheHit,
        cacheZone: event.zone,
        projectId: event.projectId,
      }),
      timestamp: new Date(),
    })
  } catch {
    // Silently fail — DB might not be available (local dev, etc.)
  }
}

function estimateCost(event: CacheEventLog): number {
  // Gemini Flash pricing (approximate):
  // Input: $0.10/1M tokens, Cached input: $0.025/1M tokens
  // Output: $0.40/1M tokens
  const promptTokens = event.usageMetadata?.promptTokenCount || 0
  const cachedTokens = event.usageMetadata?.cachedContentTokenCount || 0
  const outputTokens = event.usageMetadata?.candidatesTokenCount || 0
  const uncachedInput = promptTokens - cachedTokens
  
  const inputCost = (uncachedInput / 1_000_000) * 0.10
  const cachedCost = (cachedTokens / 1_000_000) * 0.025
  const outputCost = (outputTokens / 1_000_000) * 0.40
  
  return Math.max(0, inputCost + cachedCost + outputCost)
}
