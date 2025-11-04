import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await sequelize.authenticate()
    
    const project = await Project.findByPk(id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // Return project with formatted fields (matching /api/projects route format)
    const response = NextResponse.json({ 
      success: true, 
      project: {
        id: project.id,
        title: project.title,
        description: project.description || '',
        currentStep: project.current_step || 'ideation',
        progress: project.step_progress?.overall || 0,
        status: project.status || 'draft',
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        completedSteps: Object.entries(project.step_progress || {})
          .filter(([_, v]) => v === 100)
          .map(([k]) => k),
        metadata: project.metadata || {}
      }
    })
    
    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
  } catch (error) {
    console.error('[Projects GET by ID] Error:', error)
    return NextResponse.json({ error: 'Failed to load project' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    await sequelize.authenticate()
    
    const project = await Project.findByPk(id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // Update project fields - deep merge metadata to preserve existing nested data
    const existingMetadata = project.metadata || {}
    let mergedMetadata = body.metadata ? { ...existingMetadata } : existingMetadata
    
    if (body.metadata) {
      // Shallow merge all top-level properties
      mergedMetadata = { ...existingMetadata, ...body.metadata }
      
      // Deep merge visionPhase if it exists in both
      if (body.metadata.visionPhase && existingMetadata.visionPhase) {
        mergedMetadata.visionPhase = {
          ...existingMetadata.visionPhase,
          ...body.metadata.visionPhase
        }
        
        // Deep merge script if it exists in both
        if (body.metadata.visionPhase.script && existingMetadata.visionPhase.script) {
          mergedMetadata.visionPhase.script = {
            ...existingMetadata.visionPhase.script,
            ...body.metadata.visionPhase.script
          }
        }
      }
    }
    
    await project.update({
      ...body,
      metadata: mergedMetadata
    })
    
    return NextResponse.json({ success: true, project })
  } catch (error) {
    console.error('[Projects PUT] Error:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Request received`)
    
    // Await params in Next.js 15
    const { id } = await params
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Params:`, { id })
    
    if (!id) {
      console.log(`[${timestamp}] [DELETE /api/projects/[id]] Missing project ID`)
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    // Ensure database connection
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Authenticating database connection...`)
    await sequelize.authenticate()
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Database authenticated`)
    
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Attempting to delete project:`, id)

    const deleted = await Project.destroy({ where: { id } })
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Deleted count:`, deleted)
    
    if (deleted === 0) {
      console.log(`[${timestamp}] [DELETE /api/projects/[id]] Project not found:`, id)
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found' 
      }, { status: 404 })
    }
    
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Project deleted successfully:`, id)
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Sending success response`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[${timestamp}] [DELETE /api/projects/[id]] Error:`, error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Delete failed' 
    }, { status: 500 })
  }
}

