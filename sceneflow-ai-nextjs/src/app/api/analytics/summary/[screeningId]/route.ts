/**
 * Analytics Summary API
 * 
 * GET /api/analytics/summary/[screeningId]
 * 
 * Returns aggregated behavioral analytics for a screening.
 * Used by the Creator Dashboard to display insights.
 * 
 * Query Parameters:
 * - force: boolean - Force regeneration of summary (default: false)
 * 
 * Response:
 * BehavioralAnalyticsSummary
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  generateAnalyticsSummary,
} from '@/services/BehavioralAnalyticsService'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ screeningId: string }> }
) {
  try {
    const { screeningId } = await params
    
    if (!screeningId) {
      return NextResponse.json(
        { error: 'Missing required parameter: screeningId' },
        { status: 400 }
      )
    }
    
    // Generate analytics summary
    const summary = await generateAnalyticsSummary(screeningId)
    
    console.log(
      `[Analytics] Summary generated: screening=${screeningId}, ` +
      `sessions=${summary.totalSessions}, completed=${summary.completedSessions}`
    )
    
    return NextResponse.json(summary)
    
  } catch (error: any) {
    console.error('[Analytics] Summary generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate analytics summary' },
      { status: 500 }
    )
  }
}
