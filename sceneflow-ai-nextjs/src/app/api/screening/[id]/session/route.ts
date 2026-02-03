/**
 * Session API for Screenings
 * 
 * POST /api/screening/[id]/session - Initialize a new viewing session
 * 
 * This endpoint:
 * 1. Creates a new session in Vercel Blob storage (via BehavioralAnalyticsService)
 * 2. Increments the viewerCount in project metadata
 * 3. Returns session configuration for the audience player
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import '@/models'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { initializeSession } from '@/services/BehavioralAnalyticsService'
import type { SessionInitPayload } from '@/lib/types/behavioralAnalytics'

export const dynamic = 'force-dynamic'

// Helper to find screening across all projects
async function findScreeningById(screeningId: string): Promise<{ project: any; screening: any; index: number } | null> {
  await sequelize.authenticate()
  
  const projects: any[] = await Project.findAll()
  
  for (const project of projects) {
    const metadata = (project.metadata as Record<string, any>) || {}
    const screenings = metadata.screenings || []
    const index = screenings.findIndex((s: any) => s.id === screeningId)
    if (index !== -1) {
      return { project, screening: screenings[index], index }
    }
  }
  
  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: screeningId } = await params
    const body = await request.json()

    const result = await findScreeningById(screeningId)
    
    if (!result) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }

    const { project, screening, index } = result

    // Check if expired
    if (new Date(screening.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Screening has expired' }, { status: 410 })
    }

    // Check max viewers limit
    const currentViewerCount = screening.viewerCount || 0
    if (screening.maxViewers && currentViewerCount >= screening.maxViewers) {
      return NextResponse.json({ 
        error: 'Maximum viewer limit reached for this screening' 
      }, { status: 403 })
    }

    // Initialize session in Vercel Blob storage
    const sessionPayload: SessionInitPayload = {
      screeningId,
      demographics: body.demographics,
      cameraConsentGranted: body.cameraConsentGranted ?? false,
      deviceInfo: body.deviceInfo || {
        userAgent: request.headers.get('user-agent') || 'unknown',
        screenWidth: body.deviceInfo?.screenWidth || 0,
        screenHeight: body.deviceInfo?.screenHeight || 0,
      },
    }

    let sessionResponse
    try {
      sessionResponse = await initializeSession(sessionPayload)
    } catch (err) {
      console.error('[Session Init] Failed to initialize session:', err)
      // Create a fallback session ID if Vercel Blob storage fails
      sessionResponse = {
        sessionId: `session-${uuidv4()}`,
        assignedVariant: null,
        variantStreamId: undefined,
        videoUrl: '',
        videoDuration: 0,
        calibrationDurationSeconds: 300,
      }
    }

    // Increment viewerCount in project metadata
    const metadata = (project.metadata as Record<string, any>) || {}
    const screenings = [...(metadata.screenings || [])]
    const updatedScreening = { 
      ...screenings[index],
      viewerCount: (screenings[index].viewerCount || 0) + 1,
      lastViewedAt: new Date().toISOString(),
    }
    
    // Track viewer info (anonymized)
    const viewers = updatedScreening.viewers || []
    viewers.push({
      sessionId: sessionResponse.sessionId,
      startedAt: new Date().toISOString(),
      deviceType: body.deviceInfo?.isMobile ? 'mobile' : 'desktop',
      variant: sessionResponse.assignedVariant,
    })
    updatedScreening.viewers = viewers

    screenings[index] = updatedScreening

    await project.update({ 
      metadata: { ...metadata, screenings } 
    })

    console.log(
      `[Session] Initialized session ${sessionResponse.sessionId} for screening ${screeningId}, ` +
      `viewer count now: ${updatedScreening.viewerCount}`
    )

    return NextResponse.json({
      success: true,
      sessionId: sessionResponse.sessionId,
      calibrationDurationSeconds: sessionResponse.calibrationDurationSeconds,
      assignedVariant: sessionResponse.assignedVariant,
      feedbackEnabled: screening.feedbackEnabled ?? true,
      collectBiometrics: screening.collectBiometrics ?? false,
      collectDemographics: screening.collectDemographics ?? true,
    })
  } catch (error: any) {
    console.error('[POST /api/screening/[id]/session] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
