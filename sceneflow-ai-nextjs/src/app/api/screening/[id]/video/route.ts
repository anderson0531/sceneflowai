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
    
    // Determine screening type from the screening settings or default to storyboard
    const screeningType = screening.screeningType || 'storyboard'
    
    // Look for video URL in various locations (for premiere/final cut screenings)
    let videoUrl = screening.videoUrl 
      || metadata.videoUrl 
      || metadata.streamUrl
      || metadata.exportedVideoUrl
    
    // For premiere screenings with video, return AudiencePlayer format
    if (screeningType === 'premiere' && videoUrl) {
      return NextResponse.json({
        success: true,
        screeningType: 'premiere',
        videoUrl,
        projectId: project.id,
        projectTitle: project.title,
        title: screening.title,
        description: screening.description,
        feedbackEnabled: screening.feedbackEnabled ?? true,
        collectBiometrics: screening.collectBiometrics ?? false,
      })
    }
    
    // For storyboard/animatic screenings, get scenes from visionPhase
    const visionPhase = metadata.visionPhase || {}
    
    // Try multiple paths to find scenes (based on ScreeningRoomV2's normalizeScenes logic)
    const scenes = visionPhase.script?.script?.scenes 
      || visionPhase.scenes 
      || metadata.scenes 
      || []
    
    // Get characters for the script
    const characters = visionPhase.characters || metadata.characters || []
    
    // Get production data (for keyframe segments)
    const productionScenes = visionPhase.production?.scenes || {}
    
    // Build script object for ScreeningRoomV2
    const script = visionPhase.script || { 
      title: project.title,
      script: { scenes } 
    }
    
    // Check if we have any content
    if (scenes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No scenes available for this screening',
        screeningType,
        projectId: project.id,
      }, { status: 404 })
    }
    
    // Return storyboard data for ScreeningRoomV2
    return NextResponse.json({
      success: true,
      screeningType: 'storyboard',
      projectId: project.id,
      projectTitle: project.title,
      title: screening.title,
      description: screening.description,
      feedbackEnabled: screening.feedbackEnabled ?? true,
      collectBiometrics: screening.collectBiometrics ?? false,
      collectDemographics: screening.collectDemographics ?? false,
      // Full script object for ScreeningRoomV2
      script,
      characters,
      // Production data for keyframe playback
      sceneProductionState: productionScenes,
      // Simplified scenes list for fallback
      scenes: scenes.map((scene: any, index: number) => ({
        id: scene.id || scene.sceneId || `scene-${index}`,
        sceneNumber: scene.sceneNumber || index + 1,
        title: scene.title || `Scene ${index + 1}`,
        description: scene.description,
        thumbnailUrl: scene.thumbnailUrl || scene.imageUrl,
        audioUrl: scene.audioUrl,
        duration: scene.duration || 5,
      })),
      totalScenes: scenes.length,
      totalDuration: scenes.reduce((sum: number, s: any) => sum + (s.duration || 5), 0),
    })
  } catch (error: any) {
    console.error('[GET /api/screening/[id]/video] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
