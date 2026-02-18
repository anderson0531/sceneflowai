import { NextRequest } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { findSceneCharacters } from '../../../../lib/character/matching'
import { 
  processWithConcurrency, 
  ConcurrentTask,
  CONCURRENCY_DEFAULTS 
} from '../../../../lib/utils/concurrent-processor'

export const runtime = 'nodejs'
export const maxDuration = 300

interface SceneGenerationResult {
  sceneIndex: number
  success: boolean
  imageUrl?: string
  error?: string
  errorType?: 'quota' | 'validation' | 'generation'
  skipped?: boolean
  skipReason?: string
}

interface SceneStatus {
  sceneIndex: number
  status: 'pending' | 'generating' | 'complete' | 'failed' | 'skipped'
  heading?: string
  imageUrl?: string
  error?: string
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { projectId, imageQuality, forceRegenerate = false } = await request.json()
        
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
        const baseUrl = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
        
        console.log(`[Batch Images] forceRegenerate: ${forceRegenerate}, scenes: ${scenes.length}`)
        
        // Track status for all scenes
        const sceneStatuses: SceneStatus[] = scenes.map((scene: any, i: number) => ({
          sceneIndex: i,
          status: 'pending' as const,
          heading: scene.heading
        }))
        
        let generatedCount = 0
        let skippedScenes: any[] = []
        let failedScenes: any[] = []
        let quotaErrorDetected = false

        // Helper to send SSE progress updates
        const sendProgress = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        // Pre-validate scenes and identify which ones can be generated
        const validScenes: { index: number; scene: any; detectedChars: any[]; scenePrompt: string }[] = []
        
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i]
          
          // Skip scenes that already have images (unless forceRegenerate is true)
          if (!forceRegenerate && scene.imageUrl) {
            console.log(`[Batch Images] Scene ${i + 1}: Already has image, skipping`)
            sceneStatuses[i].status = 'skipped'
            skippedScenes.push({
              scene: i + 1,
              heading: scene.heading,
              reason: 'Already has image (use Regenerate All to overwrite)'
            })
            continue
          }
          
          // Detect characters in scene using smart matching
          // Include sceneDirectionText for better nickname detection (e.g., "Ben" -> "Dr. Benjamin Anderson")
          const sceneText = [
            scene.heading || '',
            scene.action || '',
            scene.visualDescription || '',
            scene.sceneDirectionText || '',  // Include scene direction for character detection
            ...(scene.dialogue || []).map((d: any) => d.character || '')
          ].join(' ')
          
          const detectedChars = findSceneCharacters(sceneText, characters)
          
          // Build prompt like ScenePromptBuilder does - prefer sceneDirectionText if available
          const scenePrompt = scene.sceneDirectionText || scene.visualDescription || scene.action || scene.heading || ''
          
          if (detectedChars.length === 0) {
            console.log(`[Batch Images] Scene ${i + 1}: No characters detected, skipping`)
            sceneStatuses[i].status = 'skipped'
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
            sceneStatuses[i].status = 'skipped'
            skippedScenes.push({
              scene: i + 1,
              heading: scene.heading,
              reason: `Characters missing reference images: ${charsWithoutImages.map((c: any) => c.name).join(', ')}`
            })
            continue
          }
          
          validScenes.push({ index: i, scene, detectedChars, scenePrompt })
        }

        // Send initial progress with validation results
        sendProgress({
          type: 'validation-complete',
          totalScenes: scenes.length,
          validScenes: validScenes.length,
          skippedCount: skippedScenes.length,
          sceneStatuses: sceneStatuses.map(s => ({ 
            sceneIndex: s.sceneIndex, 
            status: s.status,
            heading: s.heading 
          }))
        })

        if (validScenes.length === 0) {
          sendProgress({
            type: 'complete',
            generatedCount: 0,
            totalScenes: scenes.length,
            skipped: skippedScenes,
            failed: [],
            quotaErrorDetected: false,
            quotaErrorCount: 0
          })
          controller.close()
          return
        }

        // Create concurrent tasks for valid scenes
        const tasks: ConcurrentTask<SceneGenerationResult>[] = validScenes.map(({ index, scene, detectedChars, scenePrompt }) => ({
          id: index,
          execute: async (): Promise<SceneGenerationResult> => {
            try {
              const imageResult = await fetch(`${baseUrl}/api/scene/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  sceneIndex: index,
                  scenePrompt,  // Use pre-built prompt (prefers sceneDirectionText)
                  selectedCharacters: detectedChars.map((c: any) => c.id),
                  quality: imageQuality || 'auto',
                  skipObjectAutoDetection: true  // Batch mode: don't auto-detect props
                })
              })
              
              const imageData = await imageResult.json()
              
              if (imageData.success) {
                // ATOMIC UPDATE: Save image URL to database
                await saveSceneImage(projectId, index, imageData)
                
                return {
                  sceneIndex: index,
                  success: true,
                  imageUrl: imageData.imageUrl
                }
              } else {
                const isQuotaError = imageData.error?.includes('quota') || 
                                   imageData.error?.includes('Quota exceeded') ||
                                   imageData.error?.includes('RESOURCE_EXHAUSTED') ||
                                   imageData.error?.includes('429')
                
                return {
                  sceneIndex: index,
                  success: false,
                  error: imageData.error,
                  errorType: isQuotaError ? 'quota' : 'generation'
                }
              }
            } catch (error: any) {
              const isQuotaError = error.message?.includes('quota') || 
                                 error.message?.includes('Quota exceeded') ||
                                 error.message?.includes('RESOURCE_EXHAUSTED') ||
                                 error.message?.includes('429')
              
              return {
                sceneIndex: index,
                success: false,
                error: error.message,
                errorType: isQuotaError ? 'quota' : 'generation'
              }
            }
          }
        }))

        // Process with concurrency, sending progress updates
        const results = await processWithConcurrency(
          tasks,
          CONCURRENCY_DEFAULTS.IMAGE_GENERATION, // 3 concurrent
          (event) => {
            const sceneIndex = event.taskId as number
            const scene = scenes[sceneIndex]
            
            switch (event.type) {
              case 'start':
                sceneStatuses[sceneIndex].status = 'generating'
                sendProgress({
                  type: 'progress',
                  scene: sceneIndex + 1,
                  total: scenes.length,
                  status: 'generating',
                  sceneHeading: scene.heading,
                  // New concurrent progress fields
                  completed: event.completed,
                  inProgress: event.inProgress,
                  pending: event.pending,
                  inProgressScenes: Array.from(
                    { length: scenes.length }, 
                    (_, i) => sceneStatuses[i].status === 'generating' ? i + 1 : null
                  ).filter(Boolean)
                })
                break
                
              case 'complete':
                const result = event.result as SceneGenerationResult
                if (result.success) {
                  generatedCount++
                  sceneStatuses[sceneIndex].status = 'complete'
                  sceneStatuses[sceneIndex].imageUrl = result.imageUrl
                  
                  sendProgress({
                    type: 'progress',
                    scene: sceneIndex + 1,
                    total: scenes.length,
                    status: 'complete',
                    sceneHeading: scene.heading,
                    imageUrl: result.imageUrl,
                    completed: event.completed,
                    inProgress: event.inProgress,
                    pending: event.pending
                  })
                }
                break
                
              case 'error':
                sceneStatuses[sceneIndex].status = 'failed'
                sceneStatuses[sceneIndex].error = event.error?.message
                
                sendProgress({
                  type: 'progress',
                  scene: sceneIndex + 1,
                  total: scenes.length,
                  status: 'failed',
                  sceneHeading: scene.heading,
                  error: event.error?.message,
                  completed: event.completed,
                  inProgress: event.inProgress,
                  pending: event.pending
                })
                break
            }
          },
          true // retry failures once
        )

        // Process final results
        for (const result of results) {
          if (result.status === 'rejected' || (result.value && !result.value.success)) {
            const sceneResult = result.value
            const sceneIndex = result.id as number
            const scene = scenes[sceneIndex]
            
            if (sceneResult?.errorType === 'quota') {
              quotaErrorDetected = true
              failedScenes.push({
                scene: sceneIndex + 1,
                heading: scene.heading,
                reason: 'Google Cloud quota limit reached',
                errorType: 'quota',
                googleError: sceneResult.error,
                retryable: true
              })
            } else {
              skippedScenes.push({
                scene: sceneIndex + 1,
                heading: scene.heading,
                reason: sceneResult?.error || result.error?.message || 'Generation failed'
              })
            }
          }
        }
        
        // Send completion
        sendProgress({
          type: 'complete',
          generatedCount,
          totalScenes: scenes.length,
          skipped: skippedScenes,
          failed: failedScenes,
          quotaErrorDetected,
          quotaErrorCount: failedScenes.filter((f: any) => f.errorType === 'quota').length,
          concurrencyUsed: CONCURRENCY_DEFAULTS.IMAGE_GENERATION
        })
        
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

/**
 * Atomically save scene image URL to database.
 * Uses fresh project reload to prevent race conditions.
 */
async function saveSceneImage(
  projectId: string, 
  sceneIndex: number, 
  imageData: { imageUrl: string; basedOnDirectionHash?: string; basedOnReferencesHash?: string }
): Promise<void> {
  try {
    const freshProject = await Project.findByPk(projectId)
    if (!freshProject) return
    
    const freshMetadata = freshProject.metadata || {}
    const freshVisionPhase = freshMetadata.visionPhase || {}
    
    // Check both possible scene locations (script.script.scenes OR script.scenes)
    const hasNestedStructure = !!freshVisionPhase.script?.script?.scenes?.length
    const freshScenes = [...(freshVisionPhase.script?.script?.scenes || freshVisionPhase.script?.scenes || [])]
    
    if (freshScenes[sceneIndex]) {
      freshScenes[sceneIndex] = {
        ...freshScenes[sceneIndex],
        imageUrl: imageData.imageUrl,
        imageGeneratedAt: new Date().toISOString(),
        ...(imageData.basedOnDirectionHash && { basedOnDirectionHash: imageData.basedOnDirectionHash }),
        ...(imageData.basedOnReferencesHash && { basedOnReferencesHash: imageData.basedOnReferencesHash })
      }
      
      await freshProject.update({
        metadata: {
          ...freshMetadata,
          visionPhase: {
            ...freshVisionPhase,
            script: hasNestedStructure
              ? {
                  ...freshVisionPhase.script,
                  script: {
                    ...freshVisionPhase.script?.script,
                    scenes: freshScenes
                  }
                }
              : {
                  ...freshVisionPhase.script,
                  scenes: freshScenes
                }
          }
        }
      })
      
      console.log(`[Batch Images] Scene ${sceneIndex + 1}: Saved imageUrl to database`)
    }
  } catch (saveError) {
    console.error(`[Batch Images] Failed to save image for scene ${sceneIndex + 1}:`, saveError)
    // Don't fail the overall generation, just log the error
  }
}
