/**
 * Feedback API for Screenings
 * 
 * POST /api/screening/[id]/feedback - Submit feedback (comment, reaction, biometrics)
 * GET /api/screening/[id]/feedback - Get all feedback for a screening (creator only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import '@/models'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

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

// =============================================================================
// POST - Submit feedback (public - for audience)
// =============================================================================

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

    // Check if feedback is enabled
    if (!screening.feedbackEnabled) {
      return NextResponse.json({ error: 'Feedback is not enabled for this screening' }, { status: 403 })
    }

    const {
      sessionId,
      type, // 'comment' | 'reaction' | 'biometric' | 'emotion'
      timestamp,
      content,
      emoji,
      emotionData,
      viewerName,
    } = body

    if (!type) {
      return NextResponse.json({ error: 'Feedback type is required' }, { status: 400 })
    }

    // Build feedback entry
    const feedbackEntry = {
      id: uuidv4(),
      screeningId,
      sessionId: sessionId || uuidv4(),
      type,
      timestamp: timestamp || 0,
      createdAt: new Date().toISOString(),
      viewerName: viewerName || 'Anonymous',
      ...(type === 'comment' && { content }),
      ...(type === 'reaction' && { emoji }),
      ...(type === 'emotion' && { emotionData }),
    }

    // Update screening with new feedback
    const metadata = (project.metadata as Record<string, any>) || {}
    const screenings = [...(metadata.screenings || [])]
    const updatedScreening = { ...screenings[index] }

    // Initialize feedback arrays if they don't exist
    if (type === 'comment') {
      updatedScreening.comments = [...(updatedScreening.comments || []), feedbackEntry]
    } else if (type === 'reaction') {
      updatedScreening.reactions = [...(updatedScreening.reactions || []), feedbackEntry]
    } else {
      // Store other feedback types in a generic array
      updatedScreening.feedback = [...(updatedScreening.feedback || []), feedbackEntry]
    }

    screenings[index] = updatedScreening

    await project.update({ 
      metadata: { ...metadata, screenings } 
    })

    return NextResponse.json({
      success: true,
      feedbackId: feedbackEntry.id,
    })
  } catch (error: any) {
    console.error('[POST /api/screening/[id]/feedback] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// GET - Get all feedback (creator only)
// =============================================================================

export async function GET(
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

    const { project, screening } = result

    // Verify ownership
    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      feedback: {
        comments: screening.comments || [],
        reactions: screening.reactions || [],
        biometrics: (screening.feedback || []).filter((f: any) => f.type === 'biometric' || f.type === 'emotion'),
      },
      summary: {
        totalComments: (screening.comments || []).length,
        totalReactions: (screening.reactions || []).length,
        viewerCount: screening.viewerCount || 0,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/screening/[id]/feedback] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
