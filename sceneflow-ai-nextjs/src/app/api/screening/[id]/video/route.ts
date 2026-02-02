/**
 * Video Access API for Screenings
 * 
 * GET /api/screening/[id]/video - Get video URL for authenticated screening access
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: screeningId } = await params
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('token')

    const result = await findScreeningById(screeningId)
    
    if (!result) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }

    const { project, screening } = result

    // Check if expired
    if (new Date(screening.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Screening has expired' }, { status: 410 })
    }

    // Validate access for password-protected screenings
    if (screening.accessType === 'password') {
      if (!accessToken) {
        return NextResponse.json({ error: 'Access token required' }, { status: 401 })
      }

      try {
        const tokenData = JSON.parse(Buffer.from(accessToken, 'base64').toString())
        if (tokenData.screeningId !== screeningId || tokenData.validUntil < Date.now()) {
          return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 401 })
        }
      } catch {
        return NextResponse.json({ error: 'Invalid access token' }, { status: 401 })
      }
    }

    // Get video URL from project metadata
    // This could be a specific stream URL or the project's video
    const metadata = (project.metadata as Record<string, any>) || {}
    
    // Look for video URL in various locations
    let videoUrl = screening.videoUrl 
      || metadata.videoUrl 
      || metadata.streamUrl
      || metadata.exportedVideoUrl
    
    // If no direct video URL, the screening might be for a storyboard
    // Return project scenes for the ScreeningRoomV2 player
    if (!videoUrl) {
      const scenes = metadata.scenes || []
      
      return NextResponse.json({
        success: true,
        type: 'storyboard',
        projectId: project.id,
        projectTitle: project.title,
        scenes: scenes.map((scene: any) => ({
          id: scene.id,
          sceneNumber: scene.sceneNumber,
          title: scene.title,
          description: scene.description,
          thumbnailUrl: scene.thumbnailUrl || scene.imageUrl,
          audioUrl: scene.audioUrl,
          duration: scene.duration || 5,
        })),
        totalDuration: scenes.reduce((sum: number, s: any) => sum + (s.duration || 5), 0),
      })
    }

    // Return video URL for the AudiencePlayer
    return NextResponse.json({
      success: true,
      type: 'video',
      videoUrl,
      projectId: project.id,
      projectTitle: project.title,
    })
  } catch (error: any) {
    console.error('[GET /api/screening/[id]/video] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
