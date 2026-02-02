/**
 * Password Validation API for Protected Screenings
 * 
 * POST /api/screening/[id]/validate-password
 */

import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: screeningId } = await params
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const result = await findScreeningById(screeningId)
    
    if (!result) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }

    const { screening } = result

    // Check if expired
    if (new Date(screening.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Screening has expired' }, { status: 410 })
    }

    // Validate password
    if (screening.password !== password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid password' 
      }, { status: 401 })
    }

    // Generate a simple access token (valid for 24 hours)
    // In production, use proper JWT
    const accessToken = Buffer.from(
      JSON.stringify({
        screeningId,
        validUntil: Date.now() + 24 * 60 * 60 * 1000,
      })
    ).toString('base64')

    return NextResponse.json({
      success: true,
      accessToken,
    })
  } catch (error: any) {
    console.error('[POST /api/screening/[id]/validate-password] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
