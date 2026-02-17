import { NextRequest } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { projectId } = await request.json()
        
        await sequelize.authenticate()
        const project = await Project.findByPk(projectId)
        
        if (!project) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'Project not found' 
          })}\n\n`))
          controller.close()
          return
        }

        const visionPhase = project.metadata?.visionPhase
        // Check both possible scene locations (nested and flat)
        const hasNestedStructure = !!visionPhase?.script?.script?.scenes?.length
        const scenes = visionPhase?.script?.script?.scenes || visionPhase?.script?.scenes || []
        
        if (!scenes.length) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'No scenes found in project' 
          })}\n\n`))
          controller.close()
          return
        }
        
        let generatedCount = 0
        let skippedScenes: { scene: number; heading: string; reason: string }[] = []
        let failedScenes: { scene: number; heading: string; error: string }[] = []
        
        // Generate direction for each scene
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i]
          const sceneHeading = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text || `Scene ${i + 1}`
          
          // Send progress update
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            scene: i + 1,
            total: scenes.length,
            status: 'generating',
            sceneHeading
          })}\n\n`))
          
          // Skip if scene already has direction
          if (scene.sceneDirection && Object.keys(scene.sceneDirection).length > 0) {
            console.log(`[Batch Direction] Scene ${i + 1}: Already has direction, skipping`)
            skippedScenes.push({
              scene: i + 1,
              heading: sceneHeading,
              reason: 'Already has direction generated'
            })
            continue
          }
          
          // Prepare scene data for direction generation
          const sceneData = {
            heading: scene.heading,
            action: scene.action,
            visualDescription: scene.visualDescription,
            narration: scene.narration,
            dialogue: scene.dialogue,
            characters: scene.characters
          }
          
          // Generate direction via internal API call
          const baseUrl = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
          
          try {
            const directionResult = await fetch(`${baseUrl}/api/scene/generate-direction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                sceneIndex: i,
                scene: sceneData
              })
            })
            
            const directionData = await directionResult.json()
            
            if (directionData.success) {
              generatedCount++
              console.log(`[Batch Direction] Scene ${i + 1}: SUCCESS`)
              
              // Send success update
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'scene-complete',
                scene: i + 1,
                total: scenes.length,
                success: true,
                sceneHeading
              })}\n\n`))
            } else {
              console.log(`[Batch Direction] Scene ${i + 1}: FAILED - ${directionData.error}`)
              failedScenes.push({
                scene: i + 1,
                heading: sceneHeading,
                error: directionData.error || 'Unknown error'
              })
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'scene-complete',
                scene: i + 1,
                total: scenes.length,
                success: false,
                error: directionData.error,
                sceneHeading
              })}\n\n`))
            }
          } catch (fetchError: any) {
            console.error(`[Batch Direction] Scene ${i + 1}: Fetch error -`, fetchError.message)
            failedScenes.push({
              scene: i + 1,
              heading: sceneHeading,
              error: fetchError.message || 'Network error'
            })
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'scene-complete',
              scene: i + 1,
              total: scenes.length,
              success: false,
              error: fetchError.message,
              sceneHeading
            })}\n\n`))
          }
        }
        
        // Send completion message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          generated: generatedCount,
          skipped: skippedScenes.length,
          failed: failedScenes.length,
          total: scenes.length,
          skippedScenes,
          failedScenes
        })}\n\n`))
        
        controller.close()
      } catch (error: any) {
        console.error('[Batch Direction] Error:', error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error.message || 'Failed to generate directions'
        })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
