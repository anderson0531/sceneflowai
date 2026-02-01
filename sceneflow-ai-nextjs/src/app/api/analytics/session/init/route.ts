/**
 * Analytics Session Initialization API
 * 
 * POST /api/analytics/session/init
 * 
 * Initializes a new behavioral analytics session for a screening viewer.
 * Creates session record and returns session ID + video URL.
 * 
 * Request Body:
 * {
 *   screeningId: string
 *   cameraConsentGranted: boolean
 *   demographics?: SessionDemographics
 *   deviceInfo: DeviceInfo
 *   requestedVariant?: 'A' | 'B'
 * }
 * 
 * Response:
 * {
 *   sessionId: string
 *   assignedVariant: 'A' | 'B' | null
 *   variantStreamId?: string
 *   videoUrl: string
 *   videoDuration: number
 *   calibrationDurationSeconds: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  initializeSession,
} from '@/services/BehavioralAnalyticsService'
import type { SessionInitPayload } from '@/lib/types/behavioralAnalytics'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate required fields
    if (!body.screeningId) {
      return NextResponse.json(
        { error: 'Missing required field: screeningId' },
        { status: 400 }
      )
    }
    
    if (body.deviceInfo === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: deviceInfo' },
        { status: 400 }
      )
    }
    
    const payload: SessionInitPayload = {
      screeningId: body.screeningId,
      cameraConsentGranted: body.cameraConsentGranted ?? false,
      demographics: body.demographics,
      deviceInfo: body.deviceInfo,
      requestedVariant: body.requestedVariant,
    }
    
    // Initialize session
    const response = await initializeSession(payload)
    
    // TODO: Fetch actual video URL from screening data
    // For now, return placeholder
    const enrichedResponse = {
      ...response,
      // These would come from the screening/project lookup
      videoUrl: response.videoUrl || '/api/placeholder-video',
      videoDuration: response.videoDuration || 0,
    }
    
    console.log(`[Analytics] Session initialized: ${response.sessionId}`)
    
    return NextResponse.json(enrichedResponse)
    
  } catch (error: any) {
    console.error('[Analytics] Session init error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize session' },
      { status: 500 }
    )
  }
}
