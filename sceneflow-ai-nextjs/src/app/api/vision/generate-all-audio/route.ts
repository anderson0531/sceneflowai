import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

export const maxDuration = 300 // 5 minutes for batch generation
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get the base URL from the request headers
    const protocol = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    console.log(`[Batch Audio] Using base URL: ${baseUrl}`)

    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const narrationVoice = visionPhase.narrationVoice
    const characters = visionPhase.characters || []
    const scenes = visionPhase.script?.script?.scenes || []

    if (!narrationVoice) {
      return NextResponse.json({ error: 'Narration voice not configured' }, { status: 400 })
    }

    console.log(`[Batch Audio] Generating audio for ${scenes.length} scenes`)

    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }
        
        try {
          const results = []
          let narrationCount = 0
          let dialogueCount = 0
          const skippedDialogue = []
          
          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i]
            
            // Send progress update
            sendProgress({
              type: 'progress',
              scene: i + 1,
              total: scenes.length,
              status: 'generating_narration'
            })
            
            // Generate narration
            if (scene.narration) {
              console.log(`[Batch Audio] Generating narration for scene ${i + 1}`)
              const narrationResult = await fetch(`${baseUrl}/api/vision/generate-scene-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  sceneIndex: i,
                  audioType: 'narration',
                  text: scene.narration,
                  voiceConfig: narrationVoice,
                }),
              })
              const narrationData = await narrationResult.json()
              if (narrationData.success) narrationCount++
              results.push(narrationData)
            }
            
            // Generate dialogue
            if (scene.dialogue && scene.dialogue.length > 0) {
              sendProgress({
                type: 'progress',
                scene: i + 1,
                total: scenes.length,
                status: 'generating_dialogue',
                dialogueCount: scene.dialogue.length
              })
              
              for (const dialogueLine of scene.dialogue) {
                const character = characters.find((c: any) => c.name === dialogueLine.character)
                if (!character?.voiceConfig) {
                  console.warn(`[Batch Audio] No voice for ${dialogueLine.character}`)
                  skippedDialogue.push({
                    scene: i + 1,
                    character: dialogueLine.character,
                    reason: 'No voice assigned'
                  })
                  continue
                }
                
                console.log(`[Batch Audio] Generating dialogue for ${dialogueLine.character} in scene ${i + 1}`)
                const dialogueResult = await fetch(`${baseUrl}/api/vision/generate-scene-audio`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId,
                    sceneIndex: i,
                    audioType: 'dialogue',
                    text: dialogueLine.line,
                    voiceConfig: character.voiceConfig,
                    characterName: dialogueLine.character,
                  }),
                })
                const dialogueData = await dialogueResult.json()
                if (dialogueData.success) dialogueCount++
                results.push(dialogueData)
              }
            }
          }
          
          // Send completion
          sendProgress({
            type: 'complete',
            narrationCount,
            dialogueCount,
            totalScenes: scenes.length,
            skipped: skippedDialogue
          })
          
          controller.close()
        } catch (error: any) {
          console.error('[Batch Audio] Error:', error)
          sendProgress({
            type: 'error',
            message: error.message
          })
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
  } catch (error: any) {
    console.error('[Batch Audio] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
