import { NextRequest } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { findSceneCharacters } from '../../../../lib/character/matching'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { projectId, imageQuality } = await request.json()
        
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
        const characters = visionPhase?.characters || []
        const scenes = visionPhase?.script?.script?.scenes || []
        
        let generatedCount = 0
        let skippedScenes: any[] = []
        
        // Generate image for each scene
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i]
          
          // Send progress update
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            scene: i + 1,
            total: scenes.length,
            status: 'generating',
            sceneHeading: scene.heading
          })}\n\n`))
          
          // Detect characters in scene using smart matching
          const sceneText = [
            scene.heading || '',
            scene.action || '',
            scene.visualDescription || '',
            ...(scene.dialogue || []).map((d: any) => d.character || '')
          ].join(' ')
          
          const detectedChars = findSceneCharacters(sceneText, characters)
          
          if (detectedChars.length === 0) {
            console.log(`[Batch Images] Scene ${i + 1}: No characters detected, skipping`)
            skippedScenes.push({
              scene: i + 1,
              heading: scene.heading,
              reason: 'No characters detected'
            })
            continue
          }
          
          // Check if characters have reference images
          const charsWithoutImages = detectedChars.filter((c: any) => !c.referenceImage)
          if (charsWithoutImages.length > 0) {
            console.log(`[Batch Images] Scene ${i + 1}: ${charsWithoutImages.length} characters missing reference images`)
            skippedScenes.push({
              scene: i + 1,
              heading: scene.heading,
              reason: `Characters missing reference images: ${charsWithoutImages.map((c: any) => c.name).join(', ')}`
            })
            continue
          }
          
          // Generate scene image via internal API call
          const baseUrl = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
          
          try {
            const imageResult = await fetch(`${baseUrl}/api/scene/generate-image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                sceneIndex: i,
                scenePrompt: scene.visualDescription || scene.action || scene.heading,
                selectedCharacters: detectedChars.map((c: any) => c.id), // Use character IDs
                quality: imageQuality || 'auto'
              })
            })
            
            const imageData = await imageResult.json()
            
            if (imageData.success) {
              generatedCount++
              console.log(`[Batch Images] Scene ${i + 1}: SUCCESS`)
            } else {
              console.error(`[Batch Images] Scene ${i + 1}: FAILED - ${imageData.error}`)
              skippedScenes.push({
                scene: i + 1,
                heading: scene.heading,
                reason: imageData.error || 'Generation failed'
              })
            }
          } catch (error: any) {
            console.error(`[Batch Images] Scene ${i + 1}: ERROR - ${error.message}`)
            skippedScenes.push({
              scene: i + 1,
              heading: scene.heading,
              reason: error.message
            })
          }
        }
        
        // Send completion
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          generatedCount,
          totalScenes: scenes.length,
          skipped: skippedScenes
        })}\n\n`))
        
        controller.close()
        
      } catch (error: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error.message
        })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
