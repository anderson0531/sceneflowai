import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { callVertexAIImagen } from '@/lib/vertexai/client'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { projectId, description, title, genre, userApiKey } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Project description is required' },
        { status: 400 }
      )
    }

    // TODO: BYOK - Use user's service account credentials when BYOK is implemented
    // For now, use platform Vertex AI service account
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || !process.env.GCP_PROJECT_ID) {
      return NextResponse.json({
        success: false,
        error: 'Vertex AI not configured. Please set GOOGLE_APPLICATION_CREDENTIALS_JSON and GCP_PROJECT_ID.',
        requiresBYOK: true
      }, { status: 400 })
    }

    // Build a cinematic billboard prompt
    const projectInfo = [
      title ? `Film Title: ${title}` : '',
      genre ? `Genre: ${genre}` : '',
      `Concept: ${description}`
    ].filter(Boolean).join('\n')

    const enhancedPrompt = `Create a cinematic billboard image for a film with the following details:

${projectInfo}

Style Requirements:
- Professional film poster quality, suitable for billboard display
- Cinematic lighting with high contrast and dramatic shadows
- Visually striking composition with strong focal point
- Film marketing quality, eye-catching and memorable
- Wide angle cinematic framing
- Professional studio lighting with dramatic highlights
- 16:9 landscape aspect ratio
- No text, titles, or watermarks on the image
- Photorealistic or stylized based on genre appropriateness`

    console.log('[Thumbnail] Generating with Vertex AI Imagen...')

    // Generate image using Vertex AI Imagen
    const base64Image = await callVertexAIImagen(enhancedPrompt, {
      aspectRatio: '16:9',
      numberOfImages: 1
    })
    
    console.log('[Thumbnail] Image generated, uploading to Vercel Blob...')
    
    // Upload to Vercel Blob storage
    const blobUrl = await uploadImageToBlob(base64Image, `thumbnails/${projectId}-${Date.now()}.png`)
    console.log('[Thumbnail] Uploaded to Blob:', blobUrl)
    
    // Update project metadata with the thumbnail
    await sequelize.authenticate()
    
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 })
    }

    // Update the metadata with Blob URL, not base64
    const updatedMetadata = {
      ...project.metadata,
      thumbnail: blobUrl, // URL instead of base64
      thumbnailGeneratedAt: new Date().toISOString()
    }

    await project.update({ metadata: updatedMetadata })

    console.log('[Thumbnail] Successfully generated and saved thumbnail for project:', projectId)

    return NextResponse.json({ 
      success: true, 
      imageUrl: blobUrl, // Return Blob URL, not base64
      model: 'imagen-3.0-generate-001',
      provider: 'vertex-ai-imagen-3',
      usedBYOK: !!userApiKey,
      storageType: 'vercel-blob'
    })

  } catch (error) {
    console.error('[Thumbnail] Generation error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

