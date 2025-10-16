import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { projectId, sceneNumber, customPrompt, scene, visualStyle, characters } = await request.json()

    if (!projectId || !sceneNumber || !customPrompt) {
      return NextResponse.json(
        { success: false, error: 'projectId, sceneNumber, and customPrompt are required' },
        { status: 400 }
      )
    }

    console.log(`[Regenerate Scene] Regenerating image for scene ${sceneNumber}`)

    // Ensure database connection
    await sequelize.authenticate()

    // Generate image with Vertex AI Imagen 3
    const base64Image = await callVertexAIImagen(customPrompt, {
      aspectRatio: '16:9',
      numberOfImages: 1
    })

    // Upload to Vercel Blob
    const blobUrl = await uploadImageToBlob(
      base64Image,
      `scenes/${projectId}-scene-${sceneNumber}-${Date.now()}.png`
    )

    console.log(`[Regenerate Scene] Image uploaded to Blob:`, blobUrl)

    // Update scene in project metadata
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const script = visionPhase.script || {}
    const scenes = script.script?.scenes || script.scenes || []

    // Update the specific scene
    const updatedScenes = scenes.map((s: any) =>
      s.sceneNumber === sceneNumber
        ? {
            ...s,
            imageUrl: blobUrl,
            imagePrompt: customPrompt,
            imageGeneratedAt: new Date().toISOString()
          }
        : s
    )

    // Update metadata
    const updatedMetadata = {
      ...metadata,
      visionPhase: {
        ...visionPhase,
        script: {
          ...script,
          script: {
            ...script.script,
            scenes: updatedScenes
          },
          scenes: updatedScenes // Also update top-level scenes array if it exists
        }
      }
    }

    await project.update({ metadata: updatedMetadata })

    console.log(`[Regenerate Scene] Scene ${sceneNumber} image updated successfully`)

    return NextResponse.json({
      success: true,
      imageUrl: blobUrl,
      promptUsed: customPrompt,
      model: 'imagen-3.0-generate-001',
      provider: 'vertex-ai-imagen-3',
      storageType: 'vercel-blob'
    })
  } catch (error: any) {
    console.error('[Regenerate Scene] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to regenerate scene image' },
      { status: 500 }
    )
  }
}

