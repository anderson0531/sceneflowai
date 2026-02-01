/**
 * Metrics Batch API
 * 
 * POST /api/analytics/metrics/batch
 * 
 * Receives batched metric points from the AudiencePlayer.
 * Batches are sent every 30 seconds during playback.
 * 
 * Request Body (MetricsBatchPayload):
 * {
 *   sessionId: string
 *   screeningId: string
 *   metrics: MetricPoint[]
 *   currentWatchTime: number
 *   isPlaying: boolean
 *   batchTimestamp: string
 *   batchSequence: number
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   metricsReceived: number
 *   storageUrl: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  storeMetricsBatch,
  updateSessionProgress,
  getSession,
} from '@/services/BehavioralAnalyticsService'
import type { MetricsBatchPayload } from '@/lib/types/behavioralAnalytics'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as MetricsBatchPayload
    
    // Validate required fields
    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      )
    }
    
    if (!body.screeningId) {
      return NextResponse.json(
        { error: 'Missing required field: screeningId' },
        { status: 400 }
      )
    }
    
    if (!body.metrics || !Array.isArray(body.metrics)) {
      return NextResponse.json(
        { error: 'Missing or invalid field: metrics (must be an array)' },
        { status: 400 }
      )
    }
    
    // Store the metrics batch
    const storageUrl = await storeMetricsBatch(body)
    
    // Update session progress
    const session = await getSession(body.screeningId, body.sessionId)
    if (session) {
      await updateSessionProgress(body.screeningId, body.sessionId, {
        durationWatched: body.currentWatchTime,
        totalVideoDuration: session.totalVideoDuration || body.currentWatchTime,
        didFinish: false,
      })
    }
    
    console.log(
      `[Analytics] Batch received: session=${body.sessionId}, ` +
      `metrics=${body.metrics.length}, sequence=${body.batchSequence}`
    )
    
    return NextResponse.json({
      success: true,
      metricsReceived: body.metrics.length,
      storageUrl,
    })
    
  } catch (error: any) {
    console.error('[Analytics] Batch storage error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to store metrics batch' },
      { status: 500 }
    )
  }
}
