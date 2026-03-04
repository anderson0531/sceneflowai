/**
 * Cost Tracking & Reconciliation Service
 * 
 * This service provides:
 * 1. Logging of actual provider costs alongside credit charges
 * 2. Margin analysis for individual operations
 * 3. Reconciliation reports for financial analysis
 * 4. Alert thresholds for margin violations
 * 
 * Usage: Call logProviderCost() after every AI API call to track actual costs
 */

import { CreditLedger, AIUsage } from '@/models'
import { CREDIT_EXCHANGE_RATE, PROVIDER_COSTS_USD } from './creditCosts'

// =============================================================================
// TYPES
// =============================================================================

export interface ProviderCostLog {
  userId: string
  operation: string
  provider: string
  model: string
  
  // Cost tracking
  creditsCharged: number
  providerCostUsd: number
  marginPercent: number
  
  // Usage metrics
  inputTokens?: number
  outputTokens?: number
  imageCount?: number
  videoDurationSec?: number
  audioChars?: number
  
  // Context
  projectId?: string
  sceneId?: string
  segmentId?: string
  
  // Metadata
  timestamp: Date
  requestId?: string
}

export interface MarginAlert {
  operation: string
  currentMargin: number
  targetMargin: number
  creditsCharged: number
  providerCostUsd: number
  message: string
}

export interface ReconciliationReport {
  period: { start: Date; end: Date }
  totalCreditsCharged: number
  totalProviderCostUsd: number
  totalRevenueUsd: number
  overallMargin: number
  operationBreakdown: {
    operation: string
    count: number
    creditsCharged: number
    providerCostUsd: number
    revenueUsd: number
    marginPercent: number
  }[]
  marginAlerts: MarginAlert[]
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Target margins by operation category
 * Used for margin alerts
 */
export const TARGET_MARGINS = {
  image_generation: 60,
  video_generation: 50,
  audio_tts: 55,
  audio_sfx: 65,
  audio_music: 60,
  text_generation: 70,
  render: 60,
} as const

/**
 * Margin alert threshold - trigger alert if margin drops below this
 */
export const MARGIN_ALERT_THRESHOLD = 30

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate margin percentage
 */
export function calculateMargin(creditsCharged: number, providerCostUsd: number): number {
  const revenueUsd = creditsCharged / CREDIT_EXCHANGE_RATE // 100 credits = $1.00
  if (providerCostUsd === 0) return 100
  if (revenueUsd === 0) return 0
  return ((revenueUsd - providerCostUsd) / revenueUsd) * 100
}

/**
 * Get estimated provider cost for an operation
 * Uses PROVIDER_COSTS_USD constants
 */
export function getEstimatedProviderCost(
  operation: string,
  metrics?: {
    imageCount?: number
    videoDurationSec?: number
    audioChars?: number
    tokens?: number
  }
): number {
  // Map operations to provider costs using the existing constants
  switch (operation) {
    case 'imagen_4':
    case 'imagen_generate':
    case 'frame_generation':
    case 'end_frame_generation':
      return (metrics?.imageCount ?? 1) * PROVIDER_COSTS_USD.imagen_4
    
    case 'veo_fast':
      return Math.ceil((metrics?.videoDurationSec ?? 8) / 8) * PROVIDER_COSTS_USD.veo_fast_8s
    
    case 'veo_quality':
      return Math.ceil((metrics?.videoDurationSec ?? 8) / 8) * PROVIDER_COSTS_USD.veo_quality_4k_8s
    
    case 'elevenlabs_tts':
      return ((metrics?.audioChars ?? 1000) / 1000) * PROVIDER_COSTS_USD.elevenlabs_1k_chars
    
    case 'elevenlabs_sfx':
      // SFX is a flat rate per generation - estimate based on average generation
      return 0.05 // ~$0.05 per SFX generation
    
    case 'elevenlabs_music':
      // Music is a flat rate per generation
      return 0.10 // ~$0.10 per music generation (30 seconds)
    
    case 'gemini_flash':
      // Gemini Flash: ~$0.0375 per 1M input tokens, ~$0.15 per 1M output tokens
      return ((metrics?.tokens ?? 1000) / 1000000) * 0.10 // Blended rate
    
    case 'gemini_pro':
      // Gemini Pro: ~$1.25 per 1M input tokens, ~$5.00 per 1M output tokens  
      return ((metrics?.tokens ?? 1000) / 1000000) * 3.00 // Blended rate
    
    case 'mp4_export':
    case 'render':
      return PROVIDER_COSTS_USD.ffmpeg_render
    
    case 'topaz_upscale':
      return ((metrics?.videoDurationSec ?? 60) / 60) * PROVIDER_COSTS_USD.topaz_upscale_min
    
    default:
      console.warn(`[CostTracking] Unknown operation for cost estimation: ${operation}`)
      return 0
  }
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Log provider cost for reconciliation
 * Call this after every successful AI API call
 */
export async function logProviderCost(log: ProviderCostLog): Promise<void> {
  try {
    // Calculate margin
    log.marginPercent = calculateMargin(log.creditsCharged, log.providerCostUsd)
    
    // Log to AIUsage table (existing table, add cost fields to meta)
    await AIUsage.create({
      user_id: log.userId,
      provider: log.provider as any,
      category: mapOperationToCategory(log.operation),
      model: log.model,
      input_tokens: log.inputTokens || 0,
      output_tokens: log.outputTokens || 0,
      total_tokens: (log.inputTokens || 0) + (log.outputTokens || 0),
      cost_usd: log.providerCostUsd,
      latency_ms: 0,
      meta: {
        operation: log.operation,
        creditsCharged: log.creditsCharged,
        marginPercent: log.marginPercent,
        imageCount: log.imageCount,
        videoDurationSec: log.videoDurationSec,
        audioChars: log.audioChars,
        projectId: log.projectId,
        sceneId: log.sceneId,
        segmentId: log.segmentId,
        requestId: log.requestId,
      },
    } as any)
    
    // Check for margin alert
    if (log.marginPercent < MARGIN_ALERT_THRESHOLD) {
      console.warn(`[CostTracking] LOW MARGIN ALERT: ${log.operation} at ${log.marginPercent.toFixed(1)}%`, {
        creditsCharged: log.creditsCharged,
        providerCostUsd: log.providerCostUsd,
        userId: log.userId,
      })
    }
    
    console.log(`[CostTracking] ${log.operation}: ${log.creditsCharged} credits, $${log.providerCostUsd.toFixed(4)} cost, ${log.marginPercent.toFixed(1)}% margin`)
    
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error('[CostTracking] Failed to log provider cost:', error)
  }
}

/**
 * Map operation names to AIUsage categories
 */
function mapOperationToCategory(operation: string): 'text' | 'images' | 'tts' | 'video' | 'other' {
  if (operation.includes('imagen') || operation.includes('frame')) return 'images'
  if (operation.includes('veo') || operation.includes('video')) return 'video'
  if (operation.includes('tts') || operation.includes('sfx') || operation.includes('music')) return 'tts'
  if (operation.includes('gemini') || operation.includes('script')) return 'text'
  return 'other'
}

/**
 * Generate reconciliation report for a time period
 */
export async function generateReconciliationReport(
  startDate: Date,
  endDate: Date
): Promise<ReconciliationReport> {
  // Query AIUsage for the period
  const usageRecords = await AIUsage.findAll({
    where: {
      created_at: {
        [require('sequelize').Op.between]: [startDate, endDate],
      },
    },
    raw: true,
  })
  
  // Aggregate by operation
  const operationMap = new Map<string, {
    count: number
    creditsCharged: number
    providerCostUsd: number
  }>()
  
  let totalCreditsCharged = 0
  let totalProviderCostUsd = 0
  
  for (const record of usageRecords) {
    const meta = (record as any).meta || {}
    const operation = meta.operation || 'unknown'
    const creditsCharged = meta.creditsCharged || 0
    const providerCostUsd = Number((record as any).cost_usd) || 0
    
    totalCreditsCharged += creditsCharged
    totalProviderCostUsd += providerCostUsd
    
    const existing = operationMap.get(operation) || { count: 0, creditsCharged: 0, providerCostUsd: 0 }
    operationMap.set(operation, {
      count: existing.count + 1,
      creditsCharged: existing.creditsCharged + creditsCharged,
      providerCostUsd: existing.providerCostUsd + providerCostUsd,
    })
  }
  
  // Build operation breakdown
  const operationBreakdown = Array.from(operationMap.entries()).map(([operation, data]) => {
    const revenueUsd = data.creditsCharged / CREDIT_EXCHANGE_RATE
    const marginPercent = calculateMargin(data.creditsCharged, data.providerCostUsd)
    
    return {
      operation,
      count: data.count,
      creditsCharged: data.creditsCharged,
      providerCostUsd: data.providerCostUsd,
      revenueUsd,
      marginPercent,
    }
  }).sort((a, b) => b.creditsCharged - a.creditsCharged)
  
  // Identify margin alerts
  const marginAlerts: MarginAlert[] = operationBreakdown
    .filter(op => op.marginPercent < MARGIN_ALERT_THRESHOLD)
    .map(op => ({
      operation: op.operation,
      currentMargin: op.marginPercent,
      targetMargin: TARGET_MARGINS[mapOperationToCategory(op.operation) as keyof typeof TARGET_MARGINS] || 50,
      creditsCharged: op.creditsCharged,
      providerCostUsd: op.providerCostUsd,
      message: `${op.operation} margin (${op.marginPercent.toFixed(1)}%) below threshold (${MARGIN_ALERT_THRESHOLD}%)`,
    }))
  
  const totalRevenueUsd = totalCreditsCharged / CREDIT_EXCHANGE_RATE
  const overallMargin = calculateMargin(totalCreditsCharged, totalProviderCostUsd)
  
  return {
    period: { start: startDate, end: endDate },
    totalCreditsCharged,
    totalProviderCostUsd,
    totalRevenueUsd,
    overallMargin,
    operationBreakdown,
    marginAlerts,
  }
}

/**
 * Quick helper to log cost after a credit charge
 * Use this pattern in API routes:
 * 
 * ```ts
 * await CreditService.charge(userId, credits, 'ai_usage', null, { operation })
 * await trackCost(userId, operation, credits, { imageCount: 1 })
 * ```
 */
export async function trackCost(
  userId: string,
  operation: string,
  creditsCharged: number,
  metrics?: {
    imageCount?: number
    videoDurationSec?: number
    audioChars?: number
    tokens?: number
    projectId?: string
    sceneId?: string
    segmentId?: string
  }
): Promise<void> {
  const providerCostUsd = getEstimatedProviderCost(operation, metrics)
  
  await logProviderCost({
    userId,
    operation,
    provider: mapOperationToProvider(operation),
    model: mapOperationToModel(operation),
    creditsCharged,
    providerCostUsd,
    marginPercent: 0, // Will be calculated in logProviderCost
    imageCount: metrics?.imageCount,
    videoDurationSec: metrics?.videoDurationSec,
    audioChars: metrics?.audioChars,
    projectId: metrics?.projectId,
    sceneId: metrics?.sceneId,
    segmentId: metrics?.segmentId,
    timestamp: new Date(),
  })
}

function mapOperationToProvider(operation: string): string {
  if (operation.includes('elevenlabs')) return 'elevenlabs'
  if (operation.includes('openai') || operation.includes('dall')) return 'openai'
  return 'google_vertex'
}

function mapOperationToModel(operation: string): string {
  if (operation.includes('imagen')) return 'imagen-3.0-generate-001'
  if (operation.includes('veo_fast')) return 'veo-3.1-fast'
  if (operation.includes('veo_quality')) return 'veo-3.1-quality'
  if (operation.includes('gemini_flash')) return 'gemini-2.5-flash'
  if (operation.includes('gemini_pro')) return 'gemini-2.5-pro'
  if (operation.includes('elevenlabs_tts')) return 'eleven_turbo_v2_5'
  if (operation.includes('sfx')) return 'sound_generation_v1'
  if (operation.includes('music')) return 'music_v1'
  return 'unknown'
}

export default {
  logProviderCost,
  trackCost,
  calculateMargin,
  getEstimatedProviderCost,
  generateReconciliationReport,
}
