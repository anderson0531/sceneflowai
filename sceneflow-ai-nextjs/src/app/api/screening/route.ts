/**
 * Screening API - Create and List Screenings
 * 
 * POST /api/screening - Create a new screening session
 * GET /api/screening - List screenings for a project
 * 
 * @see /src/lib/types/finalCut.ts for ScreeningSession type
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import '@/models' // Import models to register with Sequelize
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'
import type { ScreeningSession, ScreeningAccessType } from '@/lib/types/finalCut'

export const dynamic = 'force-dynamic'

// =============================================================================
// POST - Create a new screening
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await sequelize.authenticate()
    
    // Resolve user ID (handles email to UUID conversion)
    let userId: string
    try {
      const resolvedUser = await resolveUser(session.user.id)
      userId = resolvedUser.id
    } catch (err) {
      console.error('[POST /api/screening] Failed to resolve user:', err)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      projectId,
      streamId,
      title,
      description,
      accessType = 'public',
      password,
      maxViewers,
      expiresInDays = 7,
      feedbackEnabled = true,
      collectBiometrics = false,
      collectDemographics = true,
    } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // Verify project ownership
    const project: any = await Project.findOne({
      where: { id: projectId, user_id: userId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate unique screening ID and share token
    const screeningId = uuidv4()
    const shareToken = uuidv4().replace(/-/g, '').slice(0, 12) // Short token for URL

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Build screening session
    const screening: ScreeningSession & { shareToken: string; collectBiometrics: boolean; collectDemographics: boolean; createdBy: string } = {
      id: screeningId,
      projectId,
      streamId: streamId || projectId, // Default to project if no specific stream
      title,
      description,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      accessType: accessType as ScreeningAccessType,
      password: accessType === 'password' ? password : undefined,
      maxViewers,
      shareUrl: `/s/${screeningId}`,
      viewerCount: 0,
      viewers: [],
      feedbackEnabled,
      comments: [],
      reactions: [],
      status: 'active',
      shareToken,
      collectBiometrics,
      collectDemographics,
      createdBy: userId,
    }

    // Store screening in project metadata
    const existingMetadata = (project.metadata as Record<string, any>) || {}
    const existingScreenings = existingMetadata.screenings || []
    const updatedMetadata = {
      ...existingMetadata,
      screenings: [...existingScreenings, screening],
    }

    await project.update({ metadata: updatedMetadata })

    // Return success with share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'
    const fullShareUrl = `${baseUrl}/s/${screeningId}`

    return NextResponse.json({
      success: true,
      screening: {
        id: screeningId,
        title,
        description,
        accessType,
        expiresAt: expiresAt.toISOString(),
        shareUrl: fullShareUrl,
        feedbackEnabled,
        collectBiometrics,
      },
    })
  } catch (error: any) {
    console.error('[POST /api/screening] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// GET - List screenings for a project
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await sequelize.authenticate()
    
    // Resolve user ID (handles email to UUID conversion)
    let userId: string
    try {
      const resolvedUser = await resolveUser(session.user.id)
      userId = resolvedUser.id
    } catch (err) {
      console.error('[GET /api/screening] Failed to resolve user:', err)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Verify project ownership
    const project: any = await Project.findOne({
      where: { id: projectId, user_id: userId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get screenings from metadata
    const metadata = (project.metadata as Record<string, any>) || {}
    const screenings = metadata.screenings || []

    // Filter expired screenings and hide passwords
    const activeScreenings = screenings
      .filter((s: any) => new Date(s.expiresAt) > new Date())
      .map((s: any) => ({
        ...s,
        password: undefined, // Never expose passwords
      }))

    return NextResponse.json({
      success: true,
      screenings: activeScreenings,
    })
  } catch (error: any) {
    console.error('[GET /api/screening] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
