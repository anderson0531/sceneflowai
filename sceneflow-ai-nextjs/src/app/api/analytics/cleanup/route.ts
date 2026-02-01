/**
 * Analytics Cleanup API
 * 
 * POST /api/analytics/cleanup
 * 
 * Runs cleanup of old analytics data based on retention policies.
 * This is designed to be called by a cron job or manual trigger.
 * 
 * Request Body (optional):
 * {
 *   rawMetricsRetentionDays?: number (default: 30)
 *   sessionRetentionDays?: number (default: 90)
 *   reportRetentionDays?: number (default: 365)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   deleted: number
 *   errors: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  runAnalyticsCleanup,
} from '@/services/BehavioralAnalyticsService'
import type { AnalyticsCleanupConfig } from '@/lib/types/behavioralAnalytics'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    // Parse optional config from body
    let config: Partial<AnalyticsCleanupConfig> = {}
    
    try {
      const body = await req.json()
      config = {
        rawMetricsRetentionDays: body.rawMetricsRetentionDays,
        sessionRetentionDays: body.sessionRetentionDays,
        reportRetentionDays: body.reportRetentionDays,
      }
    } catch {
      // No body provided, use defaults
    }
    
    // Run cleanup
    const result = await runAnalyticsCleanup({
      rawMetricsRetentionDays: config.rawMetricsRetentionDays ?? 30,
      sessionRetentionDays: config.sessionRetentionDays ?? 90,
      reportRetentionDays: config.reportRetentionDays ?? 365,
      cleanupSchedule: 'manual',
    })
    
    console.log(
      `[Analytics] Cleanup completed: deleted=${result.deleted}, errors=${result.errors}`
    )
    
    return NextResponse.json({
      success: true,
      ...result,
    })
    
  } catch (error: any) {
    console.error('[Analytics] Cleanup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run cleanup' },
      { status: 500 }
    )
  }
}
