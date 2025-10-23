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

    // Generate audio for all scenes
    const results = []
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]
      
      // Generate narration audio
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
        results.push(narrationData)
      }

      // Generate dialogue audio for each character
      if (scene.dialogue && scene.dialogue.length > 0) {
        for (const dialogueLine of scene.dialogue) {
          const character = characters.find((c: any) => c.name === dialogueLine.character)
          if (!character?.voiceConfig) {
            console.warn(`[Batch Audio] No voice config for ${dialogueLine.character}`)
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
          results.push(dialogueData)
        }
      }
    }

    console.log(`[Batch Audio] Generated ${results.length} audio files`)
    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('[Batch Audio] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
