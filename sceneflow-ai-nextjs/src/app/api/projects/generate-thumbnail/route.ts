import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

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

    // BYOK: Use user-provided key if available, fallback to server key for development
    const geminiApiKey = userApiKey || process.env.GOOGLE_GEMINI_API_KEY

    if (!geminiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Google Gemini API key required. Please configure BYOK settings.',
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

    console.log('[Thumbnail] Generating billboard image for project:', projectId)

    // Call Gemini Imagen 3
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: enhancedPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
            safetyFilterLevel: 'block_few',
            personGeneration: 'allow_adult'
          }
        })
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('[Thumbnail] Gemini error:', response.status, error)
      
      return NextResponse.json({ 
        success: false,
        error: error?.error?.message || 'Thumbnail generation failed' 
      }, { status: response.status })
    }

    const data = await response.json()
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded
    
    if (!b64) {
      return NextResponse.json({ 
        success: false,
        error: 'No image data returned from Gemini' 
      }, { status: 500 })
    }

    const imageUrl = `data:image/png;base64,${b64}`
    
    // Update project metadata with the thumbnail
    await sequelize.authenticate()
    
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 })
    }

    // Update the metadata with the thumbnail
    const updatedMetadata = {
      ...project.metadata,
      thumbnail: imageUrl,
      thumbnailGeneratedAt: new Date().toISOString()
    }

    await project.update({ metadata: updatedMetadata })

    console.log('[Thumbnail] Successfully generated and saved thumbnail for project:', projectId)

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      model: 'imagen-3.0-generate-001',
      provider: 'google-gemini',
      usedBYOK: !!userApiKey
    })

  } catch (error) {
    console.error('[Thumbnail] Generation error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

