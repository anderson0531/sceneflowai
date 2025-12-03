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
    
    console.log('[Projects PUT] Request received:', {
      projectId: id,
      hasMetadata: !!body.metadata,
      hasVisionPhase: !!body.metadata?.visionPhase,
      hasCharacters: !!body.metadata?.visionPhase?.characters,
      charactersCount: body.metadata?.visionPhase?.characters?.length || 0
    })
    
    // Log character reference images if present
    if (body.metadata?.visionPhase?.characters) {
      body.metadata.visionPhase.characters.forEach((char: any, idx: number) => {
        console.log(`[Projects PUT] Character ${idx + 1}: ${char.name}, hasReferenceImage: ${!!char.referenceImage}`)
      })
    }
    
    await sequelize.authenticate()
    
    const project = await Project.findByPk(id)
    if (!project) {
      console.error('[Projects PUT] Project not found:', id)
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
          const incomingScript = body.metadata.visionPhase.script
          const existingScript = existingMetadata.visionPhase.script
          
          mergedMetadata.visionPhase.script = {
            ...existingScript,
            ...incomingScript
          }
          
          // Deep merge script.script if it exists in both
          if (incomingScript.script && existingScript.script) {
            mergedMetadata.visionPhase.script.script = {
              ...existingScript.script,
              ...incomingScript.script
            }
            
            // Deep merge scenes array - preserve fields like sceneDirection from existing scenes
            if (incomingScript.script.scenes && existingScript.script.scenes) {
              const existingScenes = existingScript.script.scenes
              const incomingScenes = incomingScript.script.scenes
              
              mergedMetadata.visionPhase.script.script.scenes = incomingScenes.map((incomingScene: any, idx: number) => {
                const existingScene = existingScenes[idx]
                if (!existingScene) return incomingScene
                
                // Merge scene data, preserving sceneDirection if not explicitly being updated
                return {
                  ...existingScene,
                  ...incomingScene,
                  // Preserve sceneDirection from either source (incoming takes precedence)
                  sceneDirection: incomingScene.sceneDirection || existingScene.sceneDirection
                }
              })
              
              console.log('[Projects PUT] Deep merged scenes:', {
                existingScenesCount: existingScenes.length,
                incomingScenesCount: incomingScenes.length,
                mergedScenesWithDirection: mergedMetadata.visionPhase.script.script.scenes.filter((s: any) => !!s.sceneDirection).length
              })
            }
          }
        }
      }
    }
    
    await project.update({
      ...body,
      metadata: mergedMetadata
    })
    
    console.log('[Projects PUT] Project updated successfully:', {
      projectId: id,
      charactersInDb: mergedMetadata?.visionPhase?.characters?.length || 0
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

