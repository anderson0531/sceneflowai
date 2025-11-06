import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import archiver from 'archiver'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const scenes = project.metadata?.visionPhase?.script?.script?.scenes || []

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    // Add manifest file
    const manifest = {
      projectId,
      projectTitle: project.title,
      exportedAt: new Date().toISOString(),
      scenes: scenes.map((s: any, idx: number) => {
        // Handle both old array format and new object format (keyed by language)
        let dialogueAudioArray: any[] = []
        if (Array.isArray(s.dialogueAudio)) {
          // Old format: array
          dialogueAudioArray = s.dialogueAudio
        } else if (s.dialogueAudio && typeof s.dialogueAudio === 'object') {
          // New format: object keyed by language, use 'en' by default
          dialogueAudioArray = s.dialogueAudio['en'] || []
        }
        
        return {
          sceneNumber: idx + 1,
          heading: s.heading,
          narrationFile: s.narrationAudioUrl ? `scene-${idx + 1}-narration.mp3` : null,
          dialogueFiles: dialogueAudioArray.map((d: any) => ({
            character: d.character,
            file: `scene-${idx + 1}-${d.character.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
          }))
        }
      })
    }
    
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

    // Download and add all audio files
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]
      
      if (scene.narrationAudioUrl) {
        try {
          const response = await fetch(scene.narrationAudioUrl)
          if (response.ok) {
            const buffer = await response.arrayBuffer()
            archive.append(Buffer.from(buffer), { name: `scene-${i + 1}-narration.mp3` })
          }
        } catch (error) {
          console.warn(`[Export Audio] Failed to download narration for scene ${i + 1}:`, error)
        }
      }

      // Handle both old array format and new object format (keyed by language)
      let dialogueAudioArray: any[] = []
      if (Array.isArray(scene.dialogueAudio)) {
        // Old format: array
        dialogueAudioArray = scene.dialogueAudio
      } else if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object') {
        // New format: object keyed by language, use 'en' by default
        dialogueAudioArray = scene.dialogueAudio['en'] || []
      }
      
      if (dialogueAudioArray.length > 0) {
        for (const dialogue of dialogueAudioArray) {
          try {
            const response = await fetch(dialogue.audioUrl)
            if (response.ok) {
              const buffer = await response.arrayBuffer()
              const safeCharacterName = dialogue.character.replace(/[^a-zA-Z0-9]/g, '_')
              archive.append(Buffer.from(buffer), { name: `scene-${i + 1}-${safeCharacterName}.mp3` })
            }
          } catch (error) {
            console.warn(`[Export Audio] Failed to download dialogue for ${dialogue.character} in scene ${i + 1}:`, error)
          }
        }
      }
    }

    await archive.finalize()

    return new Response(archive as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.title}-audio.zip"`
      }
    })
  } catch (error: any) {
    console.error('[Export Audio] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
