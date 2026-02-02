/**
 * Screening API - Get, Update, Delete by ID
 * 
 * GET /api/screening/[id] - Get screening details
 * PATCH /api/screening/[id] - Update screening settings  
 * DELETE /api/screening/[id] - Delete a screening
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import '@/models'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { Op } from 'sequelize'

export const dynamic = 'force-dynamic'

// Helper to find screening across all projects
async function findScreeningById(screeningId: string): Promise<{ project: any; screening: any; index: number } | null> {
  await sequelize.authenticate()
  
  // Search all projects for this screening ID
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

// =============================================================================
// GET - Get screening by ID (public - for audience access)
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: screeningId } = await params
    
    const result = await findScreeningById(screeningId)
    
    if (!result) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }
    
    const { screening, project } = result
    
    // Check if expired
    if (new Date(screening.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Screening has expired' }, { status: 410 })
    }
    
    // Return public screening info (hide sensitive data)
    return NextResponse.json({
      success: true,
      screening: {
        id: screening.id,
        title: screening.title,
        description: screening.description,
        projectId: screening.projectId,
        accessType: screening.accessType,
        requiresPassword: screening.accessType === 'password',
        expiresAt: screening.expiresAt,
        feedbackEnabled: screening.feedbackEnabled,
        collectBiometrics: screening.collectBiometrics,
        collectDemographics: screening.collectDemographics,
        status: screening.status,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/screening/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// PATCH - Update screening (creator only)
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: screeningId } = await params
    const body = await request.json()
    
    const result = await findScreeningById(screeningId)
    
    if (!result) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }
    
    const { project, screening, index } = result
    
    // Verify ownership
    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'status', 'feedbackEnabled', 'maxViewers']
    const updatedScreening = { ...screening }
    
    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        updatedScreening[field] = body[field]
      }
    }
    
    // Update password if changing access type
    if (body.accessType) {
      updatedScreening.accessType = body.accessType
      if (body.accessType === 'password' && body.password) {
        updatedScreening.password = body.password
      }
    }
    
    // Update in metadata
    const metadata = (project.metadata as Record<string, any>) || {}
    const screenings = [...(metadata.screenings || [])]
    screenings[index] = updatedScreening
    
    await project.update({ 
      metadata: { ...metadata, screenings } 
    })
    
    return NextResponse.json({
      success: true,
      screening: {
        ...updatedScreening,
        password: undefined, // Never expose password
      },
    })
  } catch (error: any) {
    console.error('[PATCH /api/screening/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Delete screening (creator only)
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: screeningId } = await params
    
    const result = await findScreeningById(screeningId)
    
    if (!result) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }
    
    const { project, index } = result
    
    // Verify ownership
    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Remove from metadata
    const metadata = (project.metadata as Record<string, any>) || {}
    const screenings = [...(metadata.screenings || [])]
    screenings.splice(index, 1)
    
    await project.update({ 
      metadata: { ...metadata, screenings } 
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/screening/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
