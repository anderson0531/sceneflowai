/**
 * Heatmap Data API
 * 
 * GET /api/analytics/heatmap/[screeningId]
 * 
 * Returns heatmap data for timeline visualization.
 * Supports demographic filtering for segmentation analysis.
 * 
 * Query Parameters:
 * - ageRange: string - Filter by age range
 * - gender: string - Filter by gender
 * - locale: string - Filter by locale
 * - variant: 'A' | 'B' - Filter by A/B test variant
 * - cameraOnly: boolean - Only include biometric sessions
 * 
 * Response:
 * TimelineHeatmapData
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  generateHeatmapData,
} from '@/services/BehavioralAnalyticsService'
import type { HeatmapFilters, SessionDemographics } from '@/lib/types/behavioralAnalytics'

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
    
    // Parse filter parameters
    const searchParams = req.nextUrl.searchParams
    
    const filters: HeatmapFilters = {}
    
    const ageRange = searchParams.get('ageRange')
    if (ageRange) {
      filters.ageRange = ageRange as SessionDemographics['ageRange']
    }
    
    const gender = searchParams.get('gender')
    if (gender) {
      filters.gender = gender as SessionDemographics['gender']
    }
    
    const locale = searchParams.get('locale')
    if (locale) {
      filters.locale = locale
    }
    
    const variant = searchParams.get('variant')
    if (variant === 'A' || variant === 'B') {
      filters.variant = variant
    }
    
    const cameraOnly = searchParams.get('cameraOnly')
    if (cameraOnly === 'true') {
      filters.cameraConsentOnly = true
    }
    
    // Generate heatmap data
    const heatmapData = await generateHeatmapData(screeningId, filters)
    
    console.log(
      `[Analytics] Heatmap generated: screening=${screeningId}, ` +
      `buckets=${heatmapData.buckets.length}, filters=${JSON.stringify(filters)}`
    )
    
    return NextResponse.json(heatmapData)
    
  } catch (error: any) {
    console.error('[Analytics] Heatmap generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate heatmap data' },
      { status: 500 }
    )
  }
}
