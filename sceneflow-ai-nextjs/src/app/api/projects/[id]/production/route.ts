import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

// Increase timeout for production updates
export const maxDuration = 30

/**
 * PATCH endpoint for updating only scene production data
 * This is a lightweight endpoint that only updates the production.scenes portion
 * of the project metadata, avoiding the 413 payload size error from sending
 * the entire project metadata.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { sceneId, productionData } = body
    
    if (!sceneId || !productionData) {
      return NextResponse.json(
        { error: 'Missing required fields: sceneId and productionData' },
        { status: 400 }
      )
    }

    console.log('[Projects PATCH Production] Request:', {
      projectId: id,
      sceneId,
      segmentsCount: productionData.segments?.length || 0,
      timestamp: new Date().toISOString()
    })

    await sequelize.authenticate()

    const project = await Project.findByPk(id)
    if (!project) {
      console.error('[Projects PATCH Production] Project not found:', id)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get existing metadata
    const existingMetadata = project.metadata || {}
    const existingVisionPhase = existingMetadata.visionPhase || {}
    const existingProduction = existingVisionPhase.production || {}
    const existingProductionScenes = existingProduction.scenes || {}

    // Update only the specific scene's production data
    const updatedProductionScenes = {
      ...existingProductionScenes,
      [sceneId]: productionData
    }

    // Build minimal update - only touch production.scenes
    const updatedMetadata = {
      ...existingMetadata,
      visionPhase: {
        ...existingVisionPhase,
        production: {
          ...existingProduction,
          lastUpdated: new Date().toISOString(),
          scenes: updatedProductionScenes
        }
      }
    }

    // Update the project
    await project.update({ metadata: updatedMetadata })

    console.log('[Projects PATCH Production] Updated successfully:', {
      projectId: id,
      sceneId,
      totalProductionScenes: Object.keys(updatedProductionScenes).length,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      projectId: id,
      sceneId,
      updatedAt: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Projects PATCH Production] Error:', {
      message: error?.message,
      stack: error?.stack?.substring(0, 500)
    })

    return NextResponse.json(
      { error: error?.message || 'Failed to update production data' },
      { status: 500 }
    )
  }
}
